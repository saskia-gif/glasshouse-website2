# Glasshouse — website

A static site with a visual editor. All the words and pictures live in
`/content` as JSON; a build step turns them into real pages.

**Live:** https://saskia-gif.github.io/glasshouse-website2/
**Editor:** https://saskia-gif.github.io/glasshouse-website2/admin/

---

## 1. Changing the site

Go to `/admin/`. First time on a device it asks for four things:

| | |
|---|---|
| GitHub username | `saskia-gif` |
| Repository name | `glasshouse-website2` |
| Branch | `main` |
| Access token | see *Making a token* below |

Edit, press **Save**. That writes to GitHub, GitHub rebuilds the site, and the
change is live in about two minutes. The panel on the right shows your unsaved
changes as you type, at either desktop or phone width.

There is nothing else to do. No files to download, no commands to run.

### Making a token (once)

1. **github.com/settings/personal-access-tokens/new**
2. Name it anything, expiry 1 year
3. Repository access: **Only select repositories** → `glasshouse-website2`
4. Permissions → Repository permissions → **Contents: Read and write**
5. Generate, copy, paste into the editor

The token lives in that browser only. Keep it limited to this one repository and
use *Sign out* on a shared machine. Add **Workflows: Read and write** as well if
you ever need to change the build itself.

### What the editor covers

Every visible word and every picture. Sixteen sections:

- **Homepage & shared text** — every page's headings, intro copy, section
  labels, buttons, testimonials, the three "How it works" steps, social links
- **The three numbers**, **Case studies**, **Services**, **Journal**, **Team**,
  **Open roles**, **Values**, **FAQ**, **About — at a glance**, **Service pages**
- **SEO — pages / site & schema / redirects / robots.txt**
- **Pictures & film** — the media library

Journal articles are built from blocks: paragraph, heading, pull quote, picture.
Pictures can go anywhere in a piece, with a caption and an option to run wider
than the text column.

---

## 2. How it is put together

```
index.html            the shell — one <section class="route"> per page type
css/site.css          all styling
js/content.js         loads /content/*.json, applies data-copy, exposes globals
js/app.js             routing, rendering, motion, structured data
content/*.json        everything editable
assets/img|video/     pictures and film
admin/                the editor (schema.js decides what it shows)
build/generate.py     the static site generator
.github/workflows/    runs the generator on every push
```

**Routing is real paths**, not hash fragments: `/work/gigi-clothing/`,
`/services/paid-social/`, `/journal/<slug>/`. Old `#/…` links redirect
automatically.

**The generator loads the real site in a real browser**, renders each route,
strips the other routes out, and saves one HTML file per URL — with its title,
description, canonical, breadcrumbs and JSON-LD already in the source. It does
not re-implement the site, so generated pages cannot drift from the editor.
It also writes `sitemap.xml`, `robots.txt`, redirect pages and `404.html`, and
audits every page for missing H1s, over-long titles and images without alt text.

To run it yourself: `python3 build/generate.py` → `dist/`

### Deployment

GitHub Pages is set to **Source: GitHub Actions**. Pushing to `main` triggers
`.github/workflows/build.yml`, which installs Chromium, runs the generator and
publishes `dist/`. Do not switch Pages back to "deploy from a branch" — that
would serve the unbuilt source and lose every real URL.

---

## 3. Conventions worth knowing

- **Image fields store a real path** (`assets/img/x.webp`). Old short nicknames
  still resolve, so nothing broke when this changed.
- **Alt text lives in `content/images.json` under `_alt`**, keyed by path —
  written once per picture, used everywhere. Edited in the media library.
- **`_video` and `_poster`** in the same file are the homepage film and its
  still frame.
- **The Work page filter bar** is defined in `copy.json → workPage.filters`.
  Each button has a label and a match term; leave the list empty and it builds
  itself from the case studies' Services.
- **Renaming a file in the library** copies it, rewrites every reference, then
  removes the old one. Deleting warns how many places use it first.
- **Anything with `data-copy="a.b"` in index.html** is filled from `copy.json`.
  Add the attribute and the key, and it becomes editable — no JS needed.

---

## 4. Still to do

1. **Fonts.** Designed for Canela (Commercial Type) and Neue Haas Grotesk
   (Monotype); neither can be shipped without a licence, so it falls back to
   Fraunces. Buy the web licences, drop the `.woff2` files into `fonts/` with
   the names at the top of `css/site.css`, and the whole site switches over.
2. **The contact form does not send anything.** It validates and confirms, but
   nothing arrives. Formspree, Netlify Forms or Basin — about 20 minutes.
3. **Placeholder team members** in `content/team.json`.
4. **Three journal titles exceed 65 characters** — the build flags them each
   time. Set a shorter *SEO — title tag* on each.
5. **Redirects are not true 301s.** GitHub Pages cannot issue one; what is
   generated is an instant client-side redirect plus a canonical. Moving to
   Cloudflare Pages or Netlify would make them real 301s with no other change.
6. **A 2.3MB PNG** (`Screenshot-2026-08-08…png`) is doing duty as the studio
   image. Everything else is 5–48KB. Convert it to WebP.

---

## 5. If you are an AI assistant picking this up

Read this file first, then `admin/schema.js` — it is the map of what is
editable and which file each thing lives in.

Three rules learned the hard way on this project:

1. **The editor is the source of truth for `/content`.** Pull the live version
   of a content file before changing it, and merge — do not push a local copy
   over it. Real edits have been lost that way.
2. **Verify by building.** `python3 build/generate.py` renders all 27 pages and
   reports problems. Screenshot before and after; most "broken" full-page
   screenshots are just scroll-reveal animations that have not fired.
3. **GitHub is not reachable from every environment.** If `git push` fails with
   a host-allowlist error, the work still has to reach the user — write the
   files to their machine and give them a one-line script to run.
