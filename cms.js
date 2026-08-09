/* ============================================================
   Glasshouse editor — forms in, JSON out, committed to GitHub.
   ============================================================ */
import {SCHEMA} from './schema.js';
import {cfg, checkAccess, getFile, putFile, putBinary, listImages} from './github.js';

const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const el = (tag, cls, txt) => { const n=document.createElement(tag); if(cls)n.className=cls; if(txt!=null)n.textContent=txt; return n; };

let state = { id:null, data:null, sha:null, dirty:false, images:[] };

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
    buildNav(); openCollection(SCHEMA[0].id);
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
  state = { id, data:null, sha:null, dirty:false, images: state.images };
  $$('.nav-item').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  $('#panel').innerHTML = '<p class="muted">Loading…</p>';
  $('#save').disabled = true;
  try {
    const {text, sha} = await getFile(c.file);
    state.data = JSON.parse(text); state.sha = sha;
    if(c.shape === 'image' || c.fields?.some(f => f.type === 'image')) await ensureImages();
    render(c);
  } catch(err){
    $('#panel').innerHTML = '';
    $('#panel').append(note('Could not open this: ' + err.message, 'bad'));
  }
}

async function ensureImages(){
  if(!state.images.length) state.images = await listImages();
}

/* ---------- rendering ---------- */
function note(text, kind){ const n = el('p','note '+(kind||''),text); return n; }

function render(c){
  const p = $('#panel'); p.innerHTML = '';
  p.append(el('h2',null,c.title));
  if(c.hint) p.append(el('p','muted',c.hint));

  if(c.shape === 'map')      renderMap(p);
  else if(c.shape === 'list')renderList(p, c, listOf(state.data));
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
      } else {
        const i2 = el('input'); i2.type='text'; i2.value = item ?? '';
        i2.oninput = () => { arr[i] = i2.value; markDirty(); };
        row.append(i2);
      }
      box.append(row);
    });
    const add = el('button','add','+ Add');
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

/* images.json — name to file mapping, plus upload */
function renderMap(parent){
  const box = el('div','records');
  Object.entries(state.data).forEach(([key, path]) => {
    if(key.startsWith('_')) return;
    const row = el('div','map-row');
    row.append(el('span','map-key', key));
    const img = el('img','thumb'); img.src = '../' + path; img.loading='lazy'; img.alt='';
    row.append(img);
    const inp = el('input'); inp.type='text'; inp.value = path;
    inp.oninput = () => { state.data[key] = inp.value; markDirty(); };
    row.append(inp);
    const up = el('label','mini upload'); up.textContent = 'Replace…';
    const file = el('input'); file.type='file'; file.accept='image/*'; file.hidden = true;
    file.onchange = async () => {
      const f = file.files[0]; if(!f) return;
      up.textContent = 'Uploading…';
      try {
        const buf = await f.arrayBuffer();
        const dest = 'assets/img/' + f.name.replace(/[^\w.\-]/g,'-');
        await putBinary(dest, buf, `Upload ${f.name}`);
        state.data[key] = dest; inp.value = dest; img.src = '../' + dest + '?t=' + Date.now();
        markDirty(); up.textContent = 'Replace…';
      } catch(e){ alert(e.message); up.textContent = 'Replace…'; }
    };
    up.append(file);
    row.append(up);
    box.append(row);
  });
  parent.append(box);
}

function imagePicker(obj, key){
  const box = el('div','picker');
  const sel = el('select');
  sel.append(new Option('— none —',''));
  state.images.forEach(p => {
    const name = p.split('/').pop().replace(/\.\w+$/,'');
    sel.append(new Option(name, name));
  });
  sel.value = obj[key] || '';
  sel.onchange = () => { obj[key] = sel.value; markDirty(); };
  box.append(sel);
  return box;
}

/* ---------- saving ---------- */
function markDirty(){ state.dirty = true; $('#save').disabled = false; $('#status').textContent = 'Unsaved changes'; }
function markClean(){ state.dirty = false; $('#save').disabled = true; $('#status').textContent = ''; }

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
    buildNav(); openCollection(SCHEMA[0].id);
  } catch(err){ showSetup(err.message); }
})();
