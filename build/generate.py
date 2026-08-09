#!/usr/bin/env python3
"""
Glasshouse — static site generator
------------------------------------------------------------
Turns the single-page site into one real HTML file per URL, so every page
has its own address, title, description, canonical, breadcrumbs and
structured data in the source — before any JavaScript runs.

It does not re-implement the site. It loads the real site in a real browser,
lets it render each route, and saves the result, so the generated pages can
never drift from what you see in the editor.

    python3 build/generate.py          ->  dist/
"""
import json, os, re, shutil, sys, threading, functools, http.server, socketserver
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT  = ROOT / "dist"
PORT = 8799

def content(name):
    return json.loads((ROOT / "content" / name).read_text(encoding="utf-8"))

SEO      = content("seo.json")
CASES    = (lambda d: d if isinstance(d, list) else d["items"])(content("case-studies.json"))
JOURNAL  = content("journal.json")["items"]
SERVICES = (lambda d: d if isinstance(d, list) else d["items"])(content("services.json"))

SITE   = SEO.get("site", {})
BASE   = (SITE.get("basePath") or "").rstrip("/")
DOMAIN = (SITE.get("domain") or "").rstrip("/")
F      = {"work": "work", "services": "services", "journal": "journal", **SEO.get("folders", {})}


def routes():
    out = [{"url": p["path"], "key": p.get("key")} for p in SEO.get("pages", [])]
    out += [{"url": f"/{F['work']}/{c['slug']}/",     "key": "case"}    for c in CASES]
    out += [{"url": f"/{F['services']}/{s['slug']}/", "key": "service"} for s in SERVICES]
    out += [{"url": f"/{F['journal']}/{a['slug']}/",  "key": "article"} for a in JOURNAL]
    return out


class Handler(http.server.SimpleHTTPRequestHandler):
    """Serves the source site, falling back to index.html like a real SPA host."""
    def translate_path(self, path):
        path = path.split("?")[0].split("#")[0]
        if BASE and path.startswith(BASE):
            path = path[len(BASE):] or "/"
        full = ROOT / path.lstrip("/")
        if full.is_file():
            return str(full)
        # only extension-less paths are routes; a missing .css must 404, not
        # quietly return the homepage
        if os.path.splitext(path)[1]:
            return str(ROOT / "__missing__")
        return str(ROOT / "index.html")

    def send_head(self):
        p = Path(self.translate_path(self.path))
        if p.name == "index.html" and p.parent == ROOT:
            html = p.read_text(encoding="utf-8").replace('data-base=""', f'data-base="{BASE}"')
            html = absolutise(html)      # so assets resolve from a nested path
            body = html.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            import io
            return io.BytesIO(body)
        return super().send_head()

    def log_message(self, *a):
        pass


def absolutise(html):
    """Relative references break at a nested path, so anchor them to the base."""
    if not BASE:
        return html
    # relative references
    html = re.sub(r'(src|href)="(?!https?:|//|mailto:|tel:|#|/|data:)', rf'\1="{BASE}/', html)
    # root-absolute ones written by hand in index.html, e.g. href="/work/"
    html = re.sub(rf'(src|href)="/(?!{re.escape(BASE.lstrip("/"))}/|{re.escape(BASE.lstrip("/"))}")',
                  rf'\1="{BASE}/', html)
    return re.sub(r'url\((["\']?)(?!https?:|//|data:|/)', rf'url(\1{BASE}/', html)


def finish(html):
    if "data-static" not in html:
        html = re.sub(r"<html([^>]*)>", lambda m: f"<html{m.group(1)} data-static=\"1\">", html, count=1)
    return "<!DOCTYPE html>\n" + absolutise(html)


def write(rel, body):
    f = OUT / rel
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(body, encoding="utf-8")


def copy_static():
    for d in ("css", "js", "assets", "content", "admin"):
        src = ROOT / d
        if src.is_dir():
            shutil.copytree(src, OUT / d, dirs_exist_ok=True)
    for f in (".nojekyll", "README.md"):
        if (ROOT / f).is_file():
            shutil.copy(ROOT / f, OUT / f)
    admin = OUT / "admin" / "index.html"
    if admin.is_file():
        h = admin.read_text(encoding="utf-8")
        if "noindex" not in h:                # the editor must never be indexed
            h = h.replace("<head>", '<head>\n<meta name="robots" content="noindex, nofollow">')
        # stamp the editor's own files with a content hash, so a browser can
        # never serve you yesterday's editor
        import hashlib
        for name in ("cms.css", "cms.js"):
            f = OUT / "admin" / name
            if f.is_file():
                v = hashlib.sha1(f.read_bytes()).hexdigest()[:8]
                h = h.replace(f'"{name}"', f'"{name}?v={v}"')
        admin.write_text(h, encoding="utf-8")


def audit(html):
    p = []
    h1 = re.findall(r"<h1[\s>]", html)
    if not h1:        p.append("no H1")
    elif len(h1) > 1: p.append(f"{len(h1)} H1s")
    t = re.search(r"<title>([^<]*)</title>", html)
    title = t.group(1) if t else ""
    if not title:            p.append("no title")
    elif len(title) > 65:    p.append(f"title {len(title)} chars")
    d = re.search(r'<meta name="description" content="([^"]*)"', html)
    desc = d.group(1) if d else ""
    if not desc:             p.append("no description")
    elif len(desc) > 160:    p.append(f"description {len(desc)} chars")
    if 'rel="canonical"' not in html: p.append("no canonical")
    imgs = re.findall(r"<img\b[^>]*>", html)
    no_alt = [i for i in imgs if not re.search(r"\salt=", i)]
    if no_alt:               p.append(f"{len(no_alt)} image(s) without alt")
    empty_alt_links = 0
    for block in re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S):
        try: json.loads(block)
        except Exception: p.append("invalid JSON-LD")
    return p


def sitemap(built):
    rows = []
    for b in built:
        if "noindex" in (b.get("robots") or "").lower():
            continue
        depth = len([x for x in b["url"].split("/") if x])
        pri = "1.0" if b["url"] == "/" else ("0.6" if depth > 1 else "0.8")
        rows.append(f"  <url>\n    <loc>{DOMAIN}{BASE}{b['url']}</loc>\n"
                    f"    <changefreq>{'weekly' if b['url'] == '/' else 'monthly'}</changefreq>\n"
                    f"    <priority>{pri}</priority>\n  </url>")
    write("sitemap.xml",
          '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(rows) + "\n</urlset>\n")
    return len(rows)


def robots():
    body = (SEO.get("robotsTxt") or "User-agent: *\nAllow: /\n").replace("{{SITEMAP}}", f"{DOMAIN}{BASE}/sitemap.xml")
    write("robots.txt", body)


def redirects():
    made = 0
    for r in SEO.get("redirects", []):
        if not r or not r.get("from") or not r.get("to"):
            continue
        to = r["to"] if re.match(r"^https?:", r["to"]) else BASE + ("" if r["to"].startswith("/") else "/") + r["to"]
        absolute = to if re.match(r"^https?:", to) else DOMAIN + to
        write(os.path.join(r["from"].strip("/"), "index.html"),
              f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>Moved</title>
<link rel="canonical" href="{absolute}">
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url={to}">
<script>location.replace({json.dumps(to)});</script>
</head><body><p>This page has moved to <a href="{to}">{to}</a>.</p></body></html>\n''')
        made += 1
    return made


def main():
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    if OUT.exists():
        shutil.rmtree(OUT)
    copy_static()

    todo = routes()
    print(f"\nBuilding {len(todo)} pages\n")
    built, warned = [], 0

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 1200})
        for r in todo:
            page.goto(f"http://127.0.0.1:{PORT}{BASE}{r['url']}", wait_until="networkidle")
            page.wait_for_function("document.querySelector('.route.active') !== null", timeout=15000)
            page.wait_for_timeout(250)
            page.evaluate("""() => {
                // only this route's markup is kept, so pages don't duplicate each other
                document.querySelectorAll('.route:not(.active)').forEach(el => el.remove());
                // the loading sequence stays in the page — it is aria-hidden and
                // carries no indexable text — but reset so it plays for a visitor
                const l = document.getElementById('loader');
                if (l) l.classList.remove('out', 'done');
                document.querySelectorAll('.rv,.rv-pane').forEach(el => el.classList.add('in'));
            }""")
            html = finish(page.content())
            rel = "index.html" if r["url"] == "/" else os.path.join(r["url"].strip("/"), "index.html")
            write(rel, html)
            m = re.search(r'<meta name="robots" content="([^"]*)"', html)
            problems = audit(html)
            warned += 1 if problems else 0
            built.append({"url": r["url"], "robots": m.group(1) if m else ""})
            print(f"  {'!' if problems else ' '} {r['url']:<34}{', '.join(problems)}")
        browser.close()

    shutil.copy(OUT / "index.html", OUT / "404.html")
    n = sitemap(built)
    robots()
    red = redirects()
    srv.shutdown()

    print(f"\n  sitemap.xml — {n} urls")
    print("  robots.txt")
    if red:
        print(f"  {red} redirect page(s)")
    print(f"\n{len(built)} pages written to dist/"
          f"{f' — {warned} with warnings' if warned else ' — no warnings'}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
