/* ============================================================
   Glasshouse editor — forms in, JSON out, committed to GitHub.
   ============================================================ */
import {SCHEMA} from './schema.js';
import {PAGES, SITEWIDE} from './pages.js';
import {cfg, checkAccess, getFile, putFile, putBinary, listImages, listMedia, getBinary, removeFile} from './github.js';

const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const el = (tag, cls, txt) => { const n=document.createElement(tag); if(cls)n.className=cls; if(txt!=null)n.textContent=txt; return n; };

let state = { id:null, data:null, sha:null, dirty:false, images:[], media:[], files:{}, dirtyFiles:new Set() };

/* ---------- setup screen ---------- */
function showSetup(msg){
  $('#app').hidden = true; $('#setup').hidden = false;
  const c = cfg.get();
  $('#f-owner').value = c.owner || '';
  $('#f-repo').value  = c.repo  || '';
  $('#f-branch').value= c.branch|| 'main';
  $('#f-token').value = c.token || '';
  if(msg){ $('#setup-msg').textContent = msg; $('#setup-msg').hidden = false; }
}

$('#setup-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#setup-form button[type=submit]');
  btn.disabled = true; btn.textContent = 'Checking…';
  cfg.set({
    owner: $('#f-owner').value.trim(),
    repo:  $('#f-repo').value.trim(),
    branch:$('#f-branch').value.trim() || 'main',
    token: $('#f-token').value.trim()
  });
  try {
    const repo = await checkAccess();
    $('#setup').hidden = true; $('#app').hidden = false;
    $('#repo-name').textContent = repo.full_name;
    buildNav(); openPage(PAGES[0].id); startPreview();
  } catch(err){
    showSetup(err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Connect';
  }
});

$('#sign-out').addEventListener('click', () => {
  if(state.dirty && !confirm('You have unsaved changes. Sign out anyway?')) return;
  cfg.clear(); location.reload();
});

/* ---------- navigation ---------- */
function buildNav(){
  const nav = $('#nav'); nav.innerHTML = '';

  const heading = t => { const h = el('p','nav-head', t); nav.append(h); };
  const item = (id, label, go) => {
    const b = el('button','nav-item', label);
    b.onclick = () => {
      if(state.dirty && !confirm('Discard unsaved changes?')) return;
      go();
    };
    b.dataset.id = id;
    nav.append(b);
    return b;
  };

  heading('Pages');
  PAGES.forEach(pg => item(pg.id, pg.name, () => openPage(pg.id)));

  heading('Whole site');
  SITEWIDE.forEach(sw => item(sw.id, sw.name, () => openCollection(sw.id)));
}

/* everything for one page, wherever it lives */
async function openPage(id){
  const pg = PAGES.find(p => p.id === id);
  if(!pg) return;
  state = { id, page:pg, data:null, sha:null, dirty:false,
            images:state.images, media:state.media, usage:state.usage,
            files:{}, dirtyFiles:new Set() };
  $$('.nav-item').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  $('#panel').innerHTML = '<p class="muted">Loading…</p>';
  $('#save').disabled = true;
  previewFollowPage(pg);

  const needed = [...new Set(pg.parts.map(part => sectionFile(part.from)).filter(Boolean))];
  try {
    await Promise.all(needed.map(async f => {
      const {text, sha} = await getFile(f);
      state.files[f] = { data: JSON.parse(text), sha };
    }));
    if(pg.parts.some(part => partNeedsImages(part))) await ensureImages();
    renderPage(pg);
  } catch(err){
    $('#panel').innerHTML = '';
    $('#panel').append(note('Could not open this page: ' + err.message, 'bad'));
  }
}

function partNeedsImages(part){
  const c = SCHEMA.find(x => x.id === part.from);
  if(!c) return false;
  if(c.shape === 'map' || c.shape === 'keyed') return true;
  return hasImageField(c.fields);
}

function renderPage(pg){
  const p = $('#panel'); p.innerHTML = '';
  p.append(el('h2', null, pg.name));
  const sub = el('p','muted');
  sub.textContent = 'Everything on ' + (pg.url === '/' ? 'the homepage' : pg.url);
  p.append(sub);

  pg.parts.forEach(part => {
    const c = SCHEMA.find(x => x.id === part.from);
    if(!c) return;
    const file = c.file;
    const data = (state.files[file] || {}).data;
    if(!data) return;
    renderFile = file;

    const box = el('section','part');
    if(part.title || c.title) box.append(el('h3','sub', part.title || c.title));
    if(part.note) box.append(el('p','muted', part.note));

    if(part.pageKey){
      /* one entry out of seo.json's page list */
      const entry = (data.pages || []).find(x => x.key === part.pageKey);
      if(entry){
        const seoFields = (c.fields[0] && c.fields[0].fields) || [];
        renderGroup(box, seoFields.filter(f => f.key !== 'name'), entry);
      }
    } else if(part.keys){
      /* some of the groups inside copy.json */
      const chosen = c.fields.filter(f => part.keys.includes(f.key));
      renderGroup(box, chosen, data);
    } else if(c.shape === 'list'){
      renderList(box, c, listOf(data));
    } else if(c.shape === 'keyed'){
      renderKeyedInto(box, c, data);
    } else {
      renderGroup(box, c.fields, data);
    }
    p.append(box);
  });

  renderFile = null;
  markClean();
}

function renderKeyedInto(parent, c, data){
  const box = el('div','records');
  Object.keys(data).forEach(key => {
    const card = el('details','record');
    card.append(el('summary', null, key.replace(/-/g,' ')));
    const body = el('div','record-body');
    renderGroup(body, c.fields, data[key]);
    card.append(body);
    box.append(card);
  });
  parent.append(box);
}

function previewFollowPage(pg){
  const sel = document.getElementById('preview-page');
  if(!sel || sel.dataset.pinned === '1') return;
  sel.value = pg.url;
  refreshPreview();
}

async function openCollection(id){
  const c = SCHEMA.find(x => x.id === id);
  previewFollowSection(id);
  /* files/dirtyFiles must exist here too — markClean() and markDirty() reach
     for them on every section, not just the per-page ones */
  state = { id, data:null, sha:null, dirty:false, images: state.images, media: state.media,
            usage: state.usage, files:{}, dirtyFiles:new Set() };
  $$('.nav-item').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  $('#panel').innerHTML = '<p class="muted">Loading…</p>';
  $('#save').disabled = true;
  try {
    const {text, sha} = await getFile(c.file);
    state.data = JSON.parse(text); state.sha = sha;
    if(c.shape === 'map' || c.shape === 'image' || c.shape === 'keyed' || hasImageField(c.fields)) await ensureImages();
    if(c.shape === 'map') await loadUsage();
    render(c);
  } catch(err){
    $('#panel').innerHTML = '';
    $('#panel').append(note('Could not open this: ' + err.message, 'bad'));
  }
}

function hasImageField(fields){
  if(!Array.isArray(fields)) return false;
  return fields.some(f => f.type === 'image' || f.of === 'image' || f.of === 'media'
                          || hasImageField(f.fields));
}

async function ensureImages(){
  if(!state.media.length) state.media = await listMedia();
  state.images = state.media.map(m => m.path);
}

/* count how many places each file is used, so the library can say so */
async function loadUsage(){
  const counts = {};
  const walk = v => {
    if(typeof v === 'string'){ if(v.includes('assets/')) counts[v] = (counts[v]||0)+1; }
    else if(Array.isArray(v)) v.forEach(walk);
    else if(v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  await Promise.all(SCHEMA.filter(c => c.shape !== 'map').map(async c => {
    try { walk(JSON.parse((await getFile(c.file)).text)); } catch {}
  }));
  state.usage = counts;
}
const isVideoPath = p => /\.(mp4|webm|mov|m4v)$/i.test(p||'');

const safeName = n => n.replace(/[^\w.\-]/g,'-');
const alertBox = msg => alert(msg);

/* Previews are loaded from the published site, and the site takes a couple of
   minutes to rebuild after a save. So anything uploaded in this sitting is
   held here and shown straight from memory — otherwise you get a broken
   thumbnail for something that uploaded perfectly well. */
const justUploaded = new Map();          /* assets/… path -> blob URL */
const rememberUpload = (path, blob) => {
  try { justUploaded.set(path, URL.createObjectURL(blob)); } catch(e){}
};

/* ============================================================
   Making a file web-ready, here, before it is uploaded.

   The problem this solves: an iPhone records HEVC video inside a .mov and
   HEIC photographs, at 4K. Safari can read all of that — Chrome and Firefox
   cannot read any of it, and a 90MB file has no business in a website anyway.

   Your Mac can already decode those files, or Safari could not show them to
   you. So we let the browser do the decoding, redraw the result at a sensible
   size, and record that back out as MP4 or WebP. The original never leaves
   your machine; only the small, universal version is uploaded.

   Film is re-recorded as it plays, so a ten second clip takes about ten
   seconds. There is no way round that in a browser, and it is still faster
   than any other route.
   ============================================================ */
const WEB_W = 720;              /* 9:16 comes out 720x1280 */
const WEB_IMG_EDGE = 1600;
const PASSTHROUGH_BYTES = 3.5 * 1024 * 1024;

const swapExt = (name, ext) => safeName(name.replace(/\.[^.]+$/, '')) + ext;

function recorderMime(){
  if(typeof MediaRecorder === 'undefined') return null;
  const ok = t => { try { return MediaRecorder.isTypeSupported(t); } catch(e){ return false; } };
  /* Only ever ask for MP4 with H.264 spelled out. Chrome says yes to a bare
     "video/mp4" and then puts VP9 inside it, which Safari cannot play — an
     .mp4 that is a lie. Better an honest .webm. */
  const avc = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1.4D401E',
               'video/mp4;codecs=h264'].find(ok);
  if(avc) return avc;
  return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(ok) || null;
}

async function preparePicture(file){
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error(
        `Your browser cannot open "${file.name}". If it is a HEIC, open it in Preview and File → Export as JPEG.`));
      i.src = url;
    });
    let {naturalWidth:w, naturalHeight:h} = im;
    const sc = Math.min(1, WEB_IMG_EDGE / Math.max(w, h));
    w = Math.round(w * sc); h = Math.round(h * sc);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(im, 0, 0, w, h);
    let blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.82));
    let ext = '.webp';
    if(!blob || blob.type !== 'image/webp'){          /* older Safari cannot write webp */
      blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
      ext = '.jpg';
    }
    if(!blob) throw new Error(`Could not re-save "${file.name}".`);
    return {blob, name: swapExt(file.name, ext),
            note: `${Math.round(file.size/1024)}KB → ${Math.round(blob.size/1024)}KB`};
  } finally { URL.revokeObjectURL(url); }
}

async function prepareFilm(file, say){
  /* already small and already the one codec everyone can read? leave it alone */
  if(/\.mp4$/i.test(file.name) && file.size <= PASSTHROUGH_BYTES && !(await filmProblem(file)))
    return {blob: file, name: safeName(file.name), note: 'already web-ready'};

  const mime = recorderMime();
  if(!mime) throw new Error('This browser cannot convert film. Open the editor in Safari and try again.');

  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    await new Promise((res, rej) => {
      v.onloadedmetadata = res;
      v.onerror = () => rej(new Error(
        `Your browser cannot play "${file.name}", so it cannot be converted here. `
        + `Open it in QuickTime and File → Export As → 720p, then try again.`));
    });
    if(!v.videoWidth) throw new Error(`"${file.name}" has no picture this browser can read.`);

    const sc = Math.min(1, WEB_W / Math.min(v.videoWidth, v.videoHeight));
    const w = Math.round(v.videoWidth * sc / 2) * 2;
    const h = Math.round(v.videoHeight * sc / 2) * 2;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');

    const stream = cv.captureStream(24);
    const rec = new MediaRecorder(stream, {mimeType: mime, videoBitsPerSecond: 1200000});
    const chunks = [];
    rec.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise(r => { rec.onstop = r; });

    rec.start(250);
    await v.play();
    let raf;
    const draw = () => { ctx.drawImage(v, 0, 0, w, h);
      if(say && v.duration) say(Math.min(99, Math.round(v.currentTime / v.duration * 100)));
      raf = requestAnimationFrame(draw); };
    draw();
    await new Promise(r => { v.onended = r; });
    cancelAnimationFrame(raf);
    rec.stop();
    await done;

    const ext = mime.startsWith('video/mp4') ? '.mp4' : '.webm';
    const blob = new Blob(chunks, {type: mime.split(';')[0]});
    if(!blob.size) throw new Error(`Nothing came out when converting "${file.name}".`);
    return {blob, name: swapExt(file.name, ext),
            note: `${Math.round(file.size/1048576*10)/10}MB → ${Math.round(blob.size/1048576*10)/10}MB`};
  } finally { URL.revokeObjectURL(url); }
}

const prepare = (file, say) =>
  (/^video\//.test(file.type) || isVideoPath(file.name)) ? prepareFilm(file, say) : preparePicture(file);


/* An iPhone records HEVC (H.265) inside a .mov unless you tell it not to.
   Safari plays that; Chrome and Firefox do not, so it looks fine to you and is
   a blank rectangle to a large share of everyone else. The codec is named in
   the file's header, so we can say so before it ever reaches the site. */
async function filmProblem(file, buf){
  const isVid = /^video\//.test(file.type) || isVideoPath(file.name);
  if(!isVid) return null;
  let head;
  try {
    head = new Uint8Array(buf ? buf.slice(0, 262144) : await file.slice(0, 262144).arrayBuffer());
  } catch(e){ return null; }
  let txt = '';
  for(let i = 0; i < head.length; i++) txt += String.fromCharCode(head[i]);
  if(/hvc1|hev1|dvh1|dvhe/.test(txt))
    return `"${file.name}" is HEVC (H.265) — what an iPhone records by default.\n\n`
         + `Safari can play it. Chrome and Firefox cannot, so most visitors would see nothing at all.\n\n`
         + `Two ways round it:\n`
         + `  · Export it as H.264 / MP4 first, or\n`
         + `  · iPhone → Settings → Camera → Formats → Most Compatible, then re-record.\n\n`
         + `Nothing has been uploaded.`;
  if(/\.mov$/i.test(file.name) && !/avc1/.test(txt))
    return `"${file.name}" is a QuickTime .mov and its codec is not one browsers agree on.\n\n`
         + `Export it as MP4 to be safe. Nothing has been uploaded.`;
  return null;
}

/* ---------- rendering ---------- */
function note(text, kind){ const n = el('p','note '+(kind||''),text); return n; }

function render(c){
  const p = $('#panel'); p.innerHTML = '';
  p.append(el('h2',null,c.title));
  if(c.hint) p.append(el('p','muted',c.hint));

  if(c.shape === 'map')       renderMap(p);
  else if(c.shape === 'keyed')renderKeyed(p, c);
  else if(c.shape === 'list') renderList(p, c, listOf(state.data));
  else                        renderGroup(p, c.fields, state.data);

  markClean();
}

const listOf = d => Array.isArray(d) ? d : (d.items || []);

function renderGroup(parent, fields, obj){
  fields.forEach(f => parent.append(field(f, obj)));
}

function field(f, obj){
  const owner = renderFile;
  const wrap = el('div','field');
  if(f.type !== 'group') wrap.append(el('label',null,f.label));
  if(f.help) wrap.append(el('span','help',f.help));

  const val = obj?.[f.key];

  if(f.type === 'group'){
    const box = el('fieldset','group');
    box.append(el('legend',null,f.label));
    if(!obj[f.key]) obj[f.key] = {};
    renderGroup(box, f.fields, obj[f.key]);
    return box;
  }
  if(f.type === 'bool'){
    const i = el('input'); i.type='checkbox'; i.checked = !!val;
    i.onchange = () => { obj[f.key] = i.checked; markDirty(owner); };
    const row = el('label','switch'); row.append(i, el('span',null,f.label));
    wrap.innerHTML = ''; wrap.append(row);
    return wrap;
  }
  if(f.type === 'image'){
    wrap.append(imagePicker(obj, f.key));
    return wrap;
  }
  if(f.type === 'select'){
    const sel = el('select');
    (f.options||[]).forEach(o => sel.append(new Option(o, o)));
    if(val && !(f.options||[]).includes(val)) sel.append(new Option(val, val));
    sel.value = val || (f.options||[])[0] || '';
    sel.onchange = () => { obj[f.key] = sel.value; markDirty(owner); };
    wrap.append(sel);
    return wrap;
  }
  if(f.type === 'list'){
    wrap.append(listEditor(f, obj));
    return wrap;
  }
  if(f.type === 'blocks'){
    wrap.append(blockEditor(f, obj));
    return wrap;
  }
  const input = (f.type === 'text') ? el('input') : el('textarea');
  if(f.type === 'text') input.type = 'text';
  if(f.type === 'rich') input.rows = 6;
  if(f.type === 'area') input.rows = 3;
  input.value = val == null ? '' : val;
  input.oninput = () => { obj[f.key] = input.value; markDirty(owner); };
  wrap.append(input);
  return wrap;
}

/* An article is a list of blocks: text, heading, quote or picture.
   Text blocks are stored as plain strings so older articles keep working. */
const BLOCK_KINDS = [
  ['text',    'Paragraph'],
  ['heading', 'Heading'],
  ['quote',   'Pull quote'],
  ['image',   'Picture'],
];

const blockKind = b => (b && typeof b === 'object') ? 'image'
  : (typeof b === 'string' && b.startsWith('H:')) ? 'heading'
  : (typeof b === 'string' && b.startsWith('Q:')) ? 'quote' : 'text';

const blockText = b => typeof b !== 'string' ? ''
  : (b.startsWith('H:') || b.startsWith('Q:')) ? b.slice(2) : b;

const makeBlock = (kind, text) =>
  kind === 'image'   ? {img:'', caption:'', width:'normal'} :
  kind === 'heading' ? 'H:' + text :
  kind === 'quote'   ? 'Q:' + text : text;

function blockEditor(f, obj){
  const owner = renderFile;
  const box = el('div','list blocks');
  if(!Array.isArray(obj[f.key])) obj[f.key] = [];
  const arr = obj[f.key];

  const draw = () => {
    box.innerHTML = '';
    arr.forEach((item, i) => {
      const kind = blockKind(item);
      const row = el('div','list-row block-row');

      const head = el('div','list-head');
      head.append(el('span','idx', String(i+1)));

      const kindSel = el('select','block-kind');
      BLOCK_KINDS.forEach(([v, label]) => kindSel.append(new Option(label, v)));
      kindSel.value = kind;
      kindSel.onchange = () => {
        arr[i] = makeBlock(kindSel.value, blockText(item));
        markDirty(owner); draw();
      };
      head.append(kindSel);

      const up = el('button','mini','↑'), dn = el('button','mini','↓'),
            rm = el('button','mini danger','Remove');
      up.onclick = () => { if(i>0){ [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; markDirty(owner); draw(); } };
      dn.onclick = () => { if(i<arr.length-1){ [arr[i+1],arr[i]]=[arr[i],arr[i+1]]; markDirty(owner); draw(); } };
      rm.onclick = () => { if(confirm('Remove this block?')){ arr.splice(i,1); markDirty(owner); draw(); } };
      head.append(up, dn, rm);
      row.append(head);

      if(kind === 'image'){
        if(typeof arr[i] !== 'object') arr[i] = {img:'', caption:'', width:'normal'};
        const blk = arr[i];
        row.append(imagePicker(blk, 'img'));

        const cap = el('input'); cap.type = 'text'; cap.placeholder = 'Caption (optional)';
        cap.value = blk.caption || '';
        cap.oninput = () => { blk.caption = cap.value; markDirty(owner); };
        row.append(cap);

        const alt = el('input'); alt.type = 'text';
        alt.placeholder = 'Alt text for this use (optional)';
        alt.value = blk.alt || '';
        alt.oninput = () => { blk.alt = alt.value; markDirty(owner); };
        row.append(alt);

        const wideWrap = el('label','switch');
        const wide = el('input'); wide.type = 'checkbox';
        wide.checked = blk.width === 'wide';
        wide.onchange = () => { blk.width = wide.checked ? 'wide' : 'normal'; markDirty(owner); };
        wideWrap.append(wide, el('span', null, 'Run wider than the text'));
        row.append(wideWrap);
      } else {
        const ta = el('textarea');
        ta.rows = kind === 'text' ? 4 : 2;
        ta.value = blockText(item);
        ta.oninput = () => { arr[i] = makeBlock(kind, ta.value); markDirty(owner); };
        row.append(ta);
      }
      box.append(row);
    });

    const bar = el('div','block-add');
    BLOCK_KINDS.forEach(([v, label]) => {
      const b = el('button','add','+ ' + label);
      b.onclick = () => { arr.push(makeBlock(v, '')); markDirty(owner); draw(); };
      bar.append(b);
    });
    box.append(bar);
  };
  draw();
  return box;
}

function listEditor(f, obj){
  const owner = renderFile;
  const box = el('div','list');
  if(!Array.isArray(obj[f.key])) obj[f.key] = [];
  const arr = obj[f.key];

  const draw = () => {
    box.innerHTML = '';
    arr.forEach((item, i) => {
      const row = el('div','list-row');
      const head = el('div','list-head');
      head.append(el('span','idx',String(i+1)));
      const up = el('button','mini','↑'), dn = el('button','mini','↓'), rm = el('button','mini danger','Remove');
      up.onclick = () => { if(i>0){ [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; markDirty(owner); draw(); } };
      dn.onclick = () => { if(i<arr.length-1){ [arr[i+1],arr[i]]=[arr[i],arr[i+1]]; markDirty(owner); draw(); } };
      rm.onclick = () => { if(confirm('Remove this?')){ arr.splice(i,1); markDirty(owner); draw(); } };
      head.append(up,dn,rm);
      row.append(head);
      if(f.of === 'group'){
        renderGroup(row, f.fields, item);
      } else if(f.of === 'image' || f.of === 'media'){
        row.append(imagePicker(arr, i, {kind: f.of === 'media' ? 'media' : 'image'}));
      } else {
        const i2 = el('input'); i2.type='text'; i2.value = item ?? '';
        i2.oninput = () => { arr[i] = i2.value; markDirty(owner); };
        row.append(i2);
      }
      box.append(row);
    });
    const add = el('button','add',
      f.of === 'media' ? '+ Add picture or film' : f.of === 'image' ? '+ Add image' : '+ Add');
    add.onclick = () => {
      arr.push(f.of === 'group' ? Object.fromEntries(f.fields.map(x=>[x.key,''])) : '');
      markDirty(owner); draw();
    };
    box.append(add);
  };
  draw();
  return box;
}

/* top-level list (case studies, journal, …) */
function renderList(parent, c, arr){
  /* Which file these records belong to, captured while the panel is being
     drawn — by the time a button is clicked, renderFile has been cleared.
     Every other list editor in here does this; this one did not, so Add new,
     Move up, Move down and Delete all threw the moment you pressed them. */
  const owner = renderFile;
  const box = el('div','records');
  const draw = () => {
    box.innerHTML = '';
    arr.forEach((item, i) => {
      const card = el('details','record');
      const label = String(item[c.summary] ?? item[0] ?? '').trim();
      const sum = el('summary', null, label || `New — give it a name`);
      card.append(sum);
      const body = el('div','record-body');
      if(Array.isArray(item)){
        c.fields.forEach(f => body.append(field({...f, key:Number(f.key)}, item)));
      } else {
        renderGroup(body, c.fields, item);
      }
      const tools = el('div','list-head');
      const up = el('button','mini','↑ Move up'), dn = el('button','mini','↓ Move down'), rm = el('button','mini danger','Delete');
      up.onclick=()=>{ if(i>0){[arr[i-1],arr[i]]=[arr[i],arr[i-1]];markDirty(owner);draw();} };
      dn.onclick=()=>{ if(i<arr.length-1){[arr[i+1],arr[i]]=[arr[i],arr[i+1]];markDirty(owner);draw();} };
      rm.onclick=()=>{ if(confirm('Delete this entry?')){arr.splice(i,1);markDirty(owner);draw();} };
      tools.append(up,dn,rm);
      body.append(tools);
      card.append(body);
      box.append(card);
    });
    const add = el('button','add','+ Add new');
    add.onclick = () => {
      const blank = Array.isArray(arr[0]) ? ['','']
        : Object.fromEntries(c.fields.map(f=>[f.key, f.type==='bool'?false : f.type==='list'?[] : '']));
      arr.unshift(blank); markDirty(owner); draw();
    };
    box.append(add);
  };
  draw();
  parent.append(box);
}

/* files keyed by slug — service-detail.json */
function renderKeyed(parent, c){
  const box = el('div','records');
  Object.keys(state.data).forEach(key => {
    const card = el('details','record');
    card.append(el('summary', null, key.replace(/-/g,' ')));
    const body = el('div','record-body');
    renderGroup(body, c.fields, state.data[key]);
    card.append(body);
    box.append(card);
  });
  parent.append(box);
}

/* the media library — every picture and film, plus the homepage video */
function renderMap(parent){
  /* 1. the homepage film and its still, which live in images.json */
  const film = el('div','records');
  film.append(el('h3','sub','The homepage film'));
  [['_video','Film (mp4)','video'],['_poster','Still frame shown before it plays','image']].forEach(([key,label,kind]) => {
    const row = el('div','field');
    row.append(el('label',null,label));
    row.append(imagePicker(state.data, key, {kind}));
    film.append(row);
  });
  parent.append(film);

  /* 2. everything in the library */
  const lib = el('div','records');
  const head = el('div','lib-head');
  head.append(el('h3','sub','Library'));

  const addWrap = el('label','add upload');
  addWrap.textContent = '+ Upload pictures or film';
  const addInput = el('input');
  addInput.type = 'file'; addInput.hidden = true; addInput.multiple = true;
  addInput.accept = 'image/*,video/*';
  addInput.onchange = async () => {
    const files = [...addInput.files]; if(!files.length) return;
    addWrap.textContent = 'Uploading…';
    try {
      for(const f of files){
        const video = /^video\//.test(f.type) || isVideoPath(f.name);
        let ready;
        try {
          addWrap.textContent = `Preparing ${f.name}…`;
          ready = await prepare(f, pc => { addWrap.textContent = `Converting ${f.name}… ${pc}%`; });
        } catch(err){ alertBox(err.message); continue; }
        addWrap.textContent = `Uploading ${ready.name}…`;
        const dest = (video ? 'assets/video/' : 'assets/img/') + ready.name;
        await putBinary(dest, await ready.blob.arrayBuffer(), `Upload ${ready.name}`);
        rememberUpload(dest, ready.blob);
      }
      state.media = await listMedia();
      state.images = state.media.map(m => m.path);
      addWrap.textContent = '+ Upload pictures or film';
      render(SCHEMA.find(x => x.id === state.id));
    } catch(e){ alert(e.message); addWrap.textContent = '+ Upload pictures or film'; }
  };
  addWrap.append(addInput);
  head.append(addWrap);
  lib.append(head);

  lib.append(note('Upload here, then choose the picture on the page you want it on. '
    + 'Renaming a file updates every page that uses it.', ''));

  const inUse = collectUsage();
  state.media.forEach(m => {
    const row = el('div','media-row');
    const thumb = isVideoPath(m.path) ? (() => {
      const v = document.createElement('video');
      v.src = '../' + m.path; v.muted = true; v.loop = true; v.autoplay = true;
      v.playsInline = true; v.className = 'thumb'; return v;
    })() : (() => { const i = el('img','thumb'); i.src = '../' + m.path; i.loading='lazy'; i.alt=''; return i; })();
    row.append(thumb);

    const main = el('div','media-main');

    const line1 = el('div','media-line');
    const name = el('input','media-name'); name.type = 'text'; name.value = m.path.split('/').pop();
    name.spellcheck = false;
    line1.append(name);

    const used = inUse[m.path] || 0;
    const facts = el('span','media-facts');
    facts.append(el('span','map-key', Math.round((m.size||0)/1024) + 'KB'));
    facts.append(el('span', used ? 'map-key used' : 'map-key unused',
                    used ? `used ${used}×` : 'not used yet'));
    line1.append(facts);
    main.append(line1);

    if(!isVideoPath(m.path)){
      if(!state.data._alt) state.data._alt = {};
      const alt = el('input','alt'); alt.type='text';
      alt.placeholder = 'Alt text — what the picture shows';
      alt.value = state.data._alt[m.path] || '';
      alt.oninput = () => {
        if(alt.value.trim()) state.data._alt[m.path] = alt.value.trim();
        else delete state.data._alt[m.path];
        markDirty(owner);
      };
      main.append(alt);
    }
    row.append(main);

    const tools = el('div','media-tools');

    /* swap the picture, keep the name and everything pointing at it */
    const rep = el('label','mini upload'); rep.textContent = 'Replace';
    const repFile = el('input'); repFile.type = 'file'; repFile.hidden = true;
    repFile.accept = isVideoPath(m.path) ? 'video/*' : 'image/*';
    repFile.onchange = async () => {
      const f = repFile.files[0]; if(!f) return;
      const incomingVideo = /^video\//.test(f.type) || isVideoPath(f.name);
      if(incomingVideo !== isVideoPath(m.path)){
        alertBox(`"${m.path.split('/').pop()}" is ${isVideoPath(m.path) ? 'a film' : 'a picture'}, so replace it with the same kind of file.`);
        repFile.value = ''; return;
      }
      rep.textContent = 'Replacing…';
      try {
        const buf = await f.arrayBuffer();
        if(incomingVideo && buf.byteLength > 3.5*1024*1024 &&
           !confirm(`That film is ${Math.round(buf.byteLength/1048576)}MB. Films over about 3MB make the page slow. Use it anyway?`)){
          rep.textContent = 'Replace'; repFile.value = ''; return;
        }
        await putBinary(m.path, buf, `Replace ${m.path.split('/').pop()}`);
        state.media = await listMedia();
        state.images = state.media.map(x => x.path);
        render(SCHEMA.find(x => x.id === state.id));
      } catch(e){ alertBox(e.message); rep.textContent = 'Replace'; }
    };
    rep.append(repFile);
    tools.append(rep);

    const ren = el('button','mini','Rename');
    ren.onclick = async () => {
      const next = safeName(name.value.trim());
      const oldName = m.path.split('/').pop();
      if(!next || next === oldName){ name.value = oldName; return; }
      /* Renaming copies the bytes. Changing the ending therefore does not
         change what is inside — you get an .mp4 that is still HEVC, which
         Safari plays and nothing else does. Keep the ending as it was and
         re-upload instead; the upload converts. */
      const endOf = n2 => (n2.match(/\.[^.]+$/) || [''])[0].toLowerCase();
      if(endOf(next) !== endOf(oldName)){
        alertBox(`Keep the "${endOf(oldName)}" on the end.\n\n`
          + `Renaming only changes the label — it copies the same file underneath. `
          + `An .mov renamed to .mp4 is still an .mov inside, and only Safari will play it.\n\n`
          + `To change the format, upload the original again: the editor converts it on the way in.`);
        name.value = oldName; return;
      }
      if(!confirm(`Rename "${oldName}" to "${next}"?\n\nEvery page using it will be updated.`)) { name.value = oldName; return; }
      ren.textContent = 'Renaming…';
      try {
        const folder = m.path.slice(0, m.path.lastIndexOf('/') + 1);
        const dest = folder + next;
        const {buffer, sha} = await getBinary(m.path);
        await putBinary(dest, buffer, `Rename ${oldName} to ${next}`);
        if(state.data._alt && state.data._alt[m.path]){
          state.data._alt[dest] = state.data._alt[m.path];
          delete state.data._alt[m.path];
        }
        await repointEverywhere(m.path, dest);
        await removeFile(m.path, sha, `Remove ${oldName} after rename`);
        state.media = await listMedia();
        state.images = state.media.map(x => x.path);
        render(SCHEMA.find(x => x.id === state.id));
      } catch(e){ alert(e.message); ren.textContent = 'Rename'; }
    };
    tools.append(ren);

    const del = el('button','mini danger','Delete');
    del.onclick = async () => {
      const fileName = m.path.split('/').pop();
      const warning = used
        ? `"${fileName}" is used on ${used} place${used > 1 ? 's' : ''}.\n\n`
          + `Deleting it will leave ${used > 1 ? 'those spots' : 'that spot'} empty until you choose another picture.\n\nDelete it anyway?`
        : `Delete "${fileName}"?\n\nIt is not used anywhere. This cannot be undone.`;
      if(!confirm(warning)) return;
      del.textContent = 'Deleting…';
      try {
        await removeFile(m.path, m.sha, `Delete ${fileName}`);
        if(state.data._alt) delete state.data._alt[m.path];
        state.media = await listMedia();
        state.images = state.media.map(x => x.path);
        markDirty(owner);
        render(SCHEMA.find(x => x.id === state.id));
      } catch(e){ alertBox(e.message); del.textContent = 'Delete'; }
    };
    tools.append(del);
    row.append(tools);
    lib.append(row);
  });
  parent.append(lib);
}


/* which files are referenced, and how often — shown next to each row */
function collectUsage(){ return state.usage || {}; }

/* after a rename, rewrite the old path to the new one in every content file */
async function repointEverywhere(from, to){
  for(const c of SCHEMA){
    if(c.id === state.id) continue;
    let file;
    try { file = await getFile(c.file); } catch { continue; }
    if(!file.text.includes(from)) continue;
    const next = file.text.split(from).join(to);
    await putFile(c.file, next, file.sha, `Repoint ${from} to ${to}`);
  }
  if(state.data){
    const here = JSON.stringify(state.data).split(from).join(to);
    state.data = JSON.parse(here);
  }
}

function imagePicker(obj, key, opts){
  const owner = renderFile;
  /* Every slot takes either now, so the picker offers everything unless the
     slot is explicitly film-only. */
  const kind = (opts && opts.kind) || 'media';
  const box = el('div','picker');
  const preview = el('div','picker-preview');
  const sel = el('select');

  const paint = () => {
    const v = obj[key];
    const fresh = justUploaded.get(v);
    const src = fresh || (v && v.includes('/') ? '../' + v : '');
    preview.innerHTML = '';
    if(!src){ preview.append(el('span','picker-empty',
      kind === 'media' ? 'nothing chosen' : 'no picture chosen')); return; }
    /* the site has not rebuilt yet — say so rather than showing a broken icon */
    const pending = () => {
      preview.innerHTML = '';
      const w = el('span','picker-empty', 'Uploaded — the preview appears once the site finishes rebuilding, about two minutes.');
      preview.append(w, el('span','picker-name', String(v).split('/').pop()));
    };
    if(isVideoPath(v)){
      const vid = document.createElement('video');
      vid.src = src; vid.muted = true; vid.loop = true; vid.autoplay = true;
      vid.playsInline = true; vid.className = 'picker-thumb';
      vid.onerror = pending;
      preview.append(vid);
    } else {
      /* not lazy: a deferred thumbnail never loads and so never errors, and
         then the "still rebuilding" note would never appear */
      const im = el('img','picker-thumb'); im.alt = '';
      im.onerror = pending; im.src = src;
      preview.append(im);
    }
    preview.append(el('span','picker-name', String(v).split('/').pop()));
  };

  const options = state.media
    .filter(m => kind === 'video' ? isVideoPath(m.path)
               : kind === 'image' ? !isVideoPath(m.path)
               : true)
    .map(m => m.path);
  sel.append(new Option('— none —',''));
  options.forEach(pth => sel.append(new Option(pth.split('/').pop(), pth)));

  /* keep whatever is already stored selectable, even if it is an old nickname */
  const cur = obj[key] || '';
  if(cur && !options.includes(cur)) sel.append(new Option(cur + '  (old name)', cur));
  sel.value = cur;

  sel.onchange = () => { obj[key] = sel.value; paint(); markDirty(owner); };

  /* upload straight from here, rather than going to the library first */
  const up = el('label','mini upload'); up.textContent = 'Upload';
  const file = el('input'); file.type = 'file'; file.hidden = true;
  file.accept = kind === 'video' ? 'video/*' : 'image/*,video/*';
  file.onchange = async () => {
    const f = file.files[0]; if(!f) return;
    const isVid = /^video\//.test(f.type) || isVideoPath(f.name);
    if(kind === 'video' && !isVid){ alertBox('That slot takes a film. Choose an .mp4.'); file.value=''; return; }
    up.textContent = 'Uploading…';
    try {
      let ready;
      try {
        up.textContent = 'Preparing…';
        ready = await prepare(f, pc => { up.textContent = `Converting ${pc}%`; });
      } catch(err){ alertBox(err.message); up.textContent = 'Upload'; file.value=''; return; }
      up.textContent = 'Uploading…';
      const buf = await ready.blob.arrayBuffer();
      const dest = (isVid ? 'assets/video/' : 'assets/img/') + ready.name;
      const existed = state.media.some(m => m.path === dest);
      if(existed && !confirm('There is already a file called "' + ready.name + '". Replace it everywhere it is used?')){
        up.textContent = 'Upload'; file.value=''; return;
      }
      await putBinary(dest, buf, `Upload ${ready.name}`);
      rememberUpload(dest, ready.blob);
      state.media = await listMedia();
      state.images = state.media.map(m => m.path);
      /* offer the new file here without losing what is on screen */
      if(![...sel.options].some(o => o.value === dest))
        sel.append(new Option(dest.split('/').pop(), dest));
      sel.value = dest;
      obj[key] = dest;
      paint();
      markDirty(owner);
      up.textContent = 'Upload';
      file.value = '';
    } catch(e){ alertBox(e.message); up.textContent = 'Upload'; file.value=''; }
  };
  up.append(file);

  box.append(sel, up, preview);
  paint();
  return box;
}


/* ---------- saving ---------- */
let renderFile = null;   /* which file the part being drawn belongs to */
function markDirty(file){
  if(file) state.dirtyFiles.add(file);
  else if(state.id && !state.page) state.dirtyFiles.add(sectionFile(state.id));
  state.dirty = true; $('#save').disabled = false;
  $('#status').textContent = 'Unsaved changes'; schedulePreview();
}
function markClean(){ state.dirty = false; state.dirtyFiles.clear();
  $('#save').disabled = true; $('#status').textContent = ''; schedulePreview(); }
const sectionFile = id => (SCHEMA.find(x => x.id === id) || {}).file;

$('#save').addEventListener('click', async () => {
  const btn = $('#save'); btn.disabled = true; btn.textContent = 'Saving…';
  try {
    if(state.page){
      /* a page can span several files — write only the ones that changed */
      const label = state.page.name;
      for(const file of [...state.dirtyFiles]){
        const holder = state.files[file];
        if(!holder) continue;
        const text = JSON.stringify(holder.data, null, 2) + '\n';
        JSON.parse(text);                   // never commit something broken
        holder.sha = await putFile(file, text, holder.sha, `Edit ${label} via editor`);
      }
    } else {
      const c = SCHEMA.find(x => x.id === state.id);
      const text = JSON.stringify(state.data, null, 2) + '\n';
      JSON.parse(text);
      state.sha = await putFile(c.file, text, state.sha, `Edit ${c.title} via editor`);
    }
    markClean();
    $('#status').textContent = 'Saved. The site updates in about a minute.';
  } catch(err){
    alert('Not saved: ' + err.message);
    $('#status').textContent = 'Not saved';
    btn.disabled = false;
  } finally {
    btn.textContent = 'Save';
  }
});

window.addEventListener('beforeunload', e => { if(state.dirty){ e.preventDefault(); e.returnValue=''; } });

/* ---------- start ---------- */
(async () => {
  const c = cfg.get();
  if(!c.token || !c.owner || !c.repo) return showSetup();
  try {
    const repo = await checkAccess();
    $('#setup').hidden = true; $('#app').hidden = false;
    $('#repo-name').textContent = repo.full_name;
    buildNav(); openPage(PAGES[0].id); startPreview();
  } catch(err){ showSetup(err.message); }
})();


/* ============================================================
   LIVE PREVIEW
   The panel on the right is the real site, in an iframe, reading your
   work-in-progress instead of what is saved. Every keystroke is handed
   over; the frame reloads a moment after you stop typing.
   ============================================================ */
const PREVIEW_PAGES = [
  ['/',                    'Home'],
  ['/work/',               'Work'],
  ['/services/',           'Services'],
  ['/about/',              'About'],
  ['/journal/',            'Journal'],
  ['/careers/',            'Careers'],
  ['/contact/',            'Contact'],
];

const previewEl   = () => document.getElementById('preview');
const frame       = () => document.getElementById('preview-frame');
let previewTimer  = null;
let previewOn     = localStorage.getItem('gh-preview-off') !== '1';
let previewWidth  = 1440;   /* the width the site is rendered at, not the pane width */

/* The site lays itself out from the window it is in, so a narrow frame would
   always show the phone design. Instead we render at a true device width and
   scale the whole frame down to fit the panel. */
function fitPreview(){
  const stage = document.querySelector('.preview__stage');
  const scaler = document.querySelector('.preview__scaler');
  const f = frame();
  if(!stage || !scaler || !f) return;
  const availW = Math.max(120, stage.clientWidth - 20);
  const availH = Math.max(120, stage.clientHeight - 20);
  const scale = Math.min(1, availW / previewWidth);
  f.style.width  = previewWidth + 'px';
  f.style.height = Math.round(availH / scale) + 'px';
  f.style.transform = 'scale(' + scale + ')';
  scaler.style.width  = Math.round(previewWidth * scale) + 'px';
  scaler.style.height = availH + 'px';
}

/* the base path the site is served from, worked out from this page's URL */
const SITE_BASE = location.pathname.replace(/\/admin\/?$/, '') || '';

function previewURL(){
  const sel = document.getElementById('preview-page');
  const p = (sel && sel.value) || '/';
  return SITE_BASE + p + (p.includes('?') ? '&' : '?') + 'preview=' + Date.now();
}

/* hand the current, unsaved content to the site */
function stashPreview(){
  try {
    const all = JSON.parse(sessionStorage.getItem('gh-preview') || '{}');
    const c = SCHEMA.find(x => x.id === state.id);
    if(c && state.data){
      const name = c.file.replace(/^content\//, '').replace(/\.json$/, '');
      all[name] = state.data;
    }
    sessionStorage.setItem('gh-preview', JSON.stringify(all));
  } catch { /* a very large edit can exceed the quota — the preview just lags */ }
}

function refreshPreview(){
  if(!previewOn) return;
  stashPreview();
  const f = frame();
  if(f) f.src = previewURL();
  previewEl()?.classList.remove('stale');
}

function schedulePreview(){
  if(!previewOn) return;
  previewEl()?.classList.add('stale');
  clearTimeout(previewTimer);
  previewTimer = setTimeout(refreshPreview, 700);
}

function buildPreviewPages(){
  const sel = document.getElementById('preview-page');
  if(!sel) return;
  const extra = [];
  const add = (file, folder, labelKey, prefix) => {
    try {
      const raw = state.cache && state.cache[file];
      if(!raw) return;
      const list = Array.isArray(raw) ? raw : (raw.items || []);
      list.forEach(it => it.slug && extra.push([`/${folder}/${it.slug}/`, `${prefix} — ${it[labelKey] || it.slug}`]));
    } catch {}
  };
  add('case-studies', 'work', 'client', 'Case');
  add('services', 'services', 'title', 'Service');
  add('journal', 'journal', 'title', 'Post');
  const keep = sel.value;
  sel.innerHTML = '';
  [...PREVIEW_PAGES, ...extra].forEach(([p, label]) => sel.append(new Option(label, p)));
  if(keep) sel.value = keep;
}

/* the section you are editing decides which page is most useful to show */
const PAGE_FOR_SECTION = {
  copy:'/', metrics:'/', cases:'/work/', services:'/services/', servicedetail:'/services/',
  journal:'/journal/', team:'/about/', values:'/about/', facts:'/about/',
  vacancies:'/careers/', faq:'/services/', images:'/', seopages:'/', seosite:'/',
  seoredirects:'/', seorobots:'/'
};

function previewFollowSection(id){
  const sel = document.getElementById('preview-page');
  if(!sel || !PAGE_FOR_SECTION[id]) return;
  if(sel.dataset.pinned === '1') return;
  sel.value = PAGE_FOR_SECTION[id];
}

function setPreviewOn(on){
  previewOn = on;
  if(on) requestAnimationFrame(fitPreview);
  localStorage.setItem('gh-preview-off', on ? '0' : '1');
  document.querySelector('.body')?.classList.toggle('no-preview', !on);
  const b = document.getElementById('toggle-preview');
  if(b) b.textContent = on ? 'Hide preview' : 'Show preview';
  if(on) refreshPreview();
}

async function startPreview(){
  state.cache = {};
  await Promise.all(['case-studies','services','journal'].map(async n => {
    try { state.cache[n] = JSON.parse((await getFile('content/' + n + '.json')).text); } catch {}
  }));
  initPreview();
}

function initPreview(){
  buildPreviewPages();
  const sel = document.getElementById('preview-page');
  sel?.addEventListener('change', () => { sel.dataset.pinned = '1'; refreshPreview(); });
  document.getElementById('preview-refresh')?.addEventListener('click', refreshPreview);
  document.getElementById('toggle-preview')?.addEventListener('click', () => setPreviewOn(!previewOn));
  document.querySelectorAll('.preview__sizes .mini').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.preview__sizes .mini').forEach(x => x.classList.toggle('on', x === b));
      previewWidth = Number(b.dataset.w) || 1440;
      fitPreview();
    });
  });
  window.addEventListener('resize', fitPreview);
  setPreviewOn(previewOn);
  fitPreview();
}

/* clear the preview data when the editor is closed, so the public site
   is never left showing someone's unsaved draft */
window.addEventListener('beforeunload', () => { try { sessionStorage.removeItem('gh-preview'); } catch {} });
