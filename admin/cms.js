/* ============================================================
   Glasshouse editor — forms in, JSON out, committed to GitHub.
   ============================================================ */
import {SCHEMA} from './schema.js';
import {cfg, checkAccess, getFile, putFile, putBinary, listImages, listMedia, getBinary, removeFile} from './github.js';

const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const el = (tag, cls, txt) => { const n=document.createElement(tag); if(cls)n.className=cls; if(txt!=null)n.textContent=txt; return n; };

let state = { id:null, data:null, sha:null, dirty:false, images:[], media:[] };

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
    buildNav(); openCollection(SCHEMA[0].id); startPreview();
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
  SCHEMA.forEach(c => {
    const b = el('button','nav-item',c.title);
    b.onclick = () => {
      if(state.dirty && !confirm('Discard unsaved changes?')) return;
      openCollection(c.id);
    };
    b.dataset.id = c.id;
    nav.append(b);
  });
}

async function openCollection(id){
  const c = SCHEMA.find(x => x.id === id);
  previewFollowSection(id);
  state = { id, data:null, sha:null, dirty:false, images: state.images, media: state.media, usage: state.usage };
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
  return fields.some(f => f.type === 'image' || hasImageField(f.fields));
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
    i.onchange = () => { obj[f.key] = i.checked; markDirty(); };
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
    sel.onchange = () => { obj[f.key] = sel.value; markDirty(); };
    wrap.append(sel);
    return wrap;
  }
  if(f.type === 'list'){
    wrap.append(listEditor(f, obj));
    return wrap;
  }
  const input = (f.type === 'text') ? el('input') : el('textarea');
  if(f.type === 'text') input.type = 'text';
  if(f.type === 'rich') input.rows = 6;
  if(f.type === 'area') input.rows = 3;
  input.value = val == null ? '' : val;
  input.oninput = () => { obj[f.key] = input.value; markDirty(); };
  wrap.append(input);
  return wrap;
}

function listEditor(f, obj){
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
      up.onclick = () => { if(i>0){ [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; markDirty(); draw(); } };
      dn.onclick = () => { if(i<arr.length-1){ [arr[i+1],arr[i]]=[arr[i],arr[i+1]]; markDirty(); draw(); } };
      rm.onclick = () => { if(confirm('Remove this?')){ arr.splice(i,1); markDirty(); draw(); } };
      head.append(up,dn,rm);
      row.append(head);
      if(f.of === 'group'){
        renderGroup(row, f.fields, item);
      } else if(f.of === 'image'){
        row.append(imagePicker(arr, i));
      } else {
        const i2 = el('input'); i2.type='text'; i2.value = item ?? '';
        i2.oninput = () => { arr[i] = i2.value; markDirty(); };
        row.append(i2);
      }
      box.append(row);
    });
    const add = el('button','add', f.of === 'image' ? '+ Add image' : '+ Add');
    add.onclick = () => {
      arr.push(f.of === 'group' ? Object.fromEntries(f.fields.map(x=>[x.key,''])) : '');
      markDirty(); draw();
    };
    box.append(add);
  };
  draw();
  return box;
}

/* top-level list (case studies, journal, …) */
function renderList(parent, c, arr){
  const box = el('div','records');
  const draw = () => {
    box.innerHTML = '';
    arr.forEach((item, i) => {
      const card = el('details','record');
      const sum = el('summary', null, String(item[c.summary] ?? item[0] ?? `Item ${i+1}`) || `Item ${i+1}`);
      card.append(sum);
      const body = el('div','record-body');
      if(Array.isArray(item)){
        c.fields.forEach(f => body.append(field({...f, key:Number(f.key)}, item)));
      } else {
        renderGroup(body, c.fields, item);
      }
      const tools = el('div','list-head');
      const up = el('button','mini','↑ Move up'), dn = el('button','mini','↓ Move down'), rm = el('button','mini danger','Delete');
      up.onclick=()=>{ if(i>0){[arr[i-1],arr[i]]=[arr[i],arr[i-1]];markDirty();draw();} };
      dn.onclick=()=>{ if(i<arr.length-1){[arr[i+1],arr[i]]=[arr[i],arr[i+1]];markDirty();draw();} };
      rm.onclick=()=>{ if(confirm('Delete this entry?')){arr.splice(i,1);markDirty();draw();} };
      tools.append(up,dn,rm);
      body.append(tools);
      card.append(body);
      box.append(card);
    });
    const add = el('button','add','+ Add new');
    add.onclick = () => {
      const blank = Array.isArray(arr[0]) ? ['','']
        : Object.fromEntries(c.fields.map(f=>[f.key, f.type==='bool'?false : f.type==='list'?[] : '']));
      arr.unshift(blank); markDirty(); draw();
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
        const buf = await f.arrayBuffer();
        const video = /^video\//.test(f.type) || isVideoPath(f.name);
        if(video && buf.byteLength > 3.5*1024*1024 &&
           !confirm(f.name + ' is ' + Math.round(buf.byteLength/1048576) + 'MB. Films over about 3MB make the page slow. Upload anyway?')) continue;
        const dest = (video ? 'assets/video/' : 'assets/img/') + safeName(f.name);
        await putBinary(dest, buf, `Upload ${f.name}`);
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
        markDirty();
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
        markDirty();
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
  const kind = (opts && opts.kind) || 'image';
  const box = el('div','picker');
  const preview = el('div','picker-preview');
  const sel = el('select');

  const paint = () => {
    const v = obj[key];
    const src = v && v.includes('/') ? '../' + v : '';
    preview.innerHTML = '';
    if(!src){ preview.append(el('span','picker-empty','no picture chosen')); return; }
    if(isVideoPath(src)){
      const vid = document.createElement('video');
      vid.src = src; vid.muted = true; vid.loop = true; vid.autoplay = true;
      vid.playsInline = true; vid.className = 'picker-thumb';
      preview.append(vid);
    } else {
      const im = el('img','picker-thumb'); im.src = src; im.alt = ''; im.loading = 'lazy';
      preview.append(im);
    }
    preview.append(el('span','picker-name', v.split('/').pop()));
  };

  const options = state.media
    .filter(m => kind === 'video' ? isVideoPath(m.path) : !isVideoPath(m.path))
    .map(m => m.path);
  sel.append(new Option('— none —',''));
  options.forEach(pth => sel.append(new Option(pth.split('/').pop(), pth)));

  /* keep whatever is already stored selectable, even if it is an old nickname */
  const cur = obj[key] || '';
  if(cur && !options.includes(cur)) sel.append(new Option(cur + '  (old name)', cur));
  sel.value = cur;

  sel.onchange = () => { obj[key] = sel.value; paint(); markDirty(); };

  /* upload straight from here, rather than going to the library first */
  const up = el('label','mini upload'); up.textContent = 'Upload';
  const file = el('input'); file.type = 'file'; file.hidden = true;
  file.accept = kind === 'video' ? 'video/*' : 'image/*';
  file.onchange = async () => {
    const f = file.files[0]; if(!f) return;
    const isVid = /^video\//.test(f.type) || isVideoPath(f.name);
    if(kind === 'video' && !isVid){ alertBox('That slot takes a film. Choose an .mp4.'); file.value=''; return; }
    if(kind !== 'video' && isVid){ alertBox('That slot takes a picture, not a film.'); file.value=''; return; }
    up.textContent = 'Uploading…';
    try {
      const buf = await f.arrayBuffer();
      if(isVid && buf.byteLength > 3.5*1024*1024 &&
         !confirm('That film is ' + Math.round(buf.byteLength/1048576) + 'MB. Films over about 3MB make the page slow. Use it anyway?')){
        up.textContent = 'Upload'; file.value=''; return;
      }
      const dest = (isVid ? 'assets/video/' : 'assets/img/') + safeName(f.name);
      const existed = state.media.some(m => m.path === dest);
      if(existed && !confirm('There is already a file called "' + safeName(f.name) + '". Replace it everywhere it is used?')){
        up.textContent = 'Upload'; file.value=''; return;
      }
      await putBinary(dest, buf, `Upload ${f.name}`);
      state.media = await listMedia();
      state.images = state.media.map(m => m.path);
      /* offer the new file here without losing what is on screen */
      if(![...sel.options].some(o => o.value === dest))
        sel.append(new Option(dest.split('/').pop(), dest));
      sel.value = dest;
      obj[key] = dest;
      paint();
      markDirty();
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
function markDirty(){ state.dirty = true; $('#save').disabled = false; $('#status').textContent = 'Unsaved changes'; schedulePreview(); }
function markClean(){ state.dirty = false; $('#save').disabled = true; $('#status').textContent = ''; schedulePreview(); }

$('#save').addEventListener('click', async () => {
  const c = SCHEMA.find(x => x.id === state.id);
  const btn = $('#save'); btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const text = JSON.stringify(state.data, null, 2) + '\n';
    JSON.parse(text);                       // never commit something broken
    state.sha = await putFile(c.file, text, state.sha, `Edit ${c.title} via editor`);
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
    buildNav(); openCollection(SCHEMA[0].id); startPreview();
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
