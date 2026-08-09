# Glasshouse — website

A static site: plain HTML, CSS and JavaScript. No build step, no framework,
no server to maintain. All the words and pictures live in `/content` and
`/assets`, and there is a visual editor at `/admin`.

---

## 1. Put it online (about 15 minutes, once)

1. Create a GitHub account if you don't have one, then create a **new repository**
   called `glasshouse-website`. Make it **public**.
2. Upload every file and folder from this bundle into it — GitHub's
   *Add file → Upload files* accepts a drag of the whole folder.
3. In the repo, go to **Settings → Pages**. Under *Source*, choose
   **Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
4. Wait a minute or two. Your site is live at
   `https://YOUR-USERNAME.github.io/glasshouse-website/`.

### Your own domain
In **Settings → Pages → Custom domain**, enter `theglasshouse.agency`.
Then at your domain registrar add these DNS records:

| Type  | Name | Value |
|-------|------|-------|
| A     | @    | 185.199.108.153 |
| A     | @    | 185.199.109.153 |
| A     | @    | 185.199.110.153 |
| A     | @    | 185.199.111.153 |
| CNAME | www  | YOUR-USERNAME.github.io |

Tick *Enforce HTTPS* once it becomes available.

---

## 2. Edit the site

Go to **`your-site.com/admin/`**. First time only, it asks for four things:

| | |
|---|---|
| GitHub username | e.g. `saskiagregson-williams` |
| Repository name | `glasshouse-website` |
| Branch | `main` |
| Access token | see below |

### Making your access token (2 minutes, once)

1. Go to **github.com/settings/personal-access-tokens/new**
2. Name it anything — *Glasshouse editor*
3. Expiration: 1 year
4. Repository access: **Only select repositories** → pick your site repo
5. Permissions → Repository permissions → **Contents: Read and write**
6. Generate, copy the token, paste it into the editor

That's it. The token is saved in your browser, so you only do this once per
device. **Read this before you paste it:** the token lives in that browser's
storage, so anyone with access to your computer and browser could edit the
site. Keep it limited to this one repository as above, and use *Sign out* on
a shared machine. It never travels anywhere except to GitHub.

### Using it

The left column lists everything you can change:

- **Homepage & shared text** — headlines, intro lines, section labels, closing invitation
- **The three numbers** — the figures under the hero and what each measures
- **Case studies** — all seven; add, reorder, delete, and edit every field
- **Services**, **Journal**, **Team**, **Open roles**, **Values**, **FAQ**, **About — at a glance**
- **Pictures & video** — see which file each image name points at, and upload replacements

Edit, then press **Save**. That writes the change straight to GitHub and the
live site updates within about a minute. The editor refuses to save anything
that isn't valid, so you can't break the site by mistyping, and it warns you
if you try to leave with unsaved changes.

If two people edit the same thing at once, whoever saves second is told to
reload rather than silently overwriting the other's work.

## 3. Change pictures and video

1. Put the new file in `assets/img/` (pictures) or `assets/video/` (film).
2. Point at it — either upload with the same filename to replace it, or edit
   `content/images.json` so the name points at your new file.

**Formats:** images as `.webp` or `.jpg`, ideally under 300KB each.
Vertical images should be 9:16. Video as `.mp4`, H.264, muted, under 3MB.

The hero film is `assets/video/hero.mp4` with a still at
`assets/video/hero-poster.webp` — replace both together.

---

## 4. Before you launch — four things still to do

1. **Fonts.** The design is drawn for Canela (Commercial Type) and Neue Haas
   Grotesk (Monotype). Neither can be shipped without a licence, so the site
   currently falls back to Fraunces. Buy the web licences, drop the `.woff2`
   files into a `fonts/` folder with the names listed at the top of
   `css/site.css`, and the whole site switches over.
2. **The contact form doesn't send anything yet.** It validates and shows a
   confirmation, but nothing arrives. Free options: Formspree, Netlify Forms,
   or Basin. About 20 minutes to connect.
3. **Replace the placeholder people.** `content/team.json` has
   `[Founder name]` and `[Team member]`, and the photos are stand-ins.
4. **Replace the placeholder testimonials.** Four on desktop, one on mobile,
   all currently marked "Placeholder — replace with client quote".

---

## 5. Previewing on your own computer

Double-clicking `index.html` will **not** work — browsers block a page from
loading its own content files that way. Instead, in Terminal:

```
cd path/to/this/folder
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Stop it with Ctrl-C.

---

## What's in the folder

```
index.html            the whole site (one page, several routes)
css/site.css          all styling
js/content.js         loads /content, fills the page
js/app.js             behaviour — navigation, animation, the loading sequence
content/*.json        everything editable
assets/img/           pictures and logos
assets/video/         the hero film and its poster frame
admin/                the visual editor
.nojekyll             tells GitHub Pages not to process the files
```

## A note on how it's built

Routes are hash-based (`/#/work`, `/#/case/gigi-clothing`). This is what lets
the whole site run from one file with no server. The trade-off is that Google
indexes these less well than real URLs. If search traffic matters — and for
"social media agency London" it will — the next step is moving to Astro or
Next.js with real paths. The content files here transfer across unchanged.
