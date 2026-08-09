/* ============================================================
   Talking to GitHub. Nothing else in the editor touches the network.
   The token lives only in this browser's localStorage.
   ============================================================ */
const API = 'https://api.github.com';

export const cfg = {
  get(){ try { return JSON.parse(localStorage.getItem('gh-cms') || '{}'); } catch { return {}; } },
  set(v){ localStorage.setItem('gh-cms', JSON.stringify({...this.get(), ...v})); },
  clear(){ localStorage.removeItem('gh-cms'); }
};

function headers(){
  const {token} = cfg.get();
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function base(){
  const {owner, repo} = cfg.get();
  return `${API}/repos/${owner}/${repo}`;
}

/* decode/encode that survives accents, em dashes and emoji */
const b64ToText = b64 => new TextDecoder().decode(
  Uint8Array.from(atob(b64.replace(/\n/g,'')), c => c.charCodeAt(0)));
const textToB64 = txt => btoa(String.fromCharCode(...new TextEncoder().encode(txt)));

export async function checkAccess(){
  const r = await fetch(base(), {headers: headers()});
  if(r.status === 401) throw new Error('That token was rejected. Check you copied all of it.');
  if(r.status === 404) throw new Error('Repository not found. Check the owner and name, and that the token can see it.');
  if(!r.ok) throw new Error(`GitHub said ${r.status}.`);
  const repo = await r.json();
  if(!repo.permissions || !repo.permissions.push)
    throw new Error('That token can read the repo but not write to it. It needs Contents: read and write.');
  return repo;
}

export async function getFile(path){
  const {branch} = cfg.get();
  const r = await fetch(`${base()}/contents/${path}?ref=${branch}`, {headers: headers()});
  if(!r.ok) throw new Error(`Could not read ${path} (${r.status})`);
  const j = await r.json();
  return {sha: j.sha, text: b64ToText(j.content)};
}

export async function putFile(path, text, sha, message){
  const {branch} = cfg.get();
  const r = await fetch(`${base()}/contents/${path}`, {
    method:'PUT', headers: {...headers(), 'Content-Type':'application/json'},
    body: JSON.stringify({message, content: textToB64(text), sha, branch})
  });
  if(r.status === 409) throw new Error('Someone else saved this file since you opened it. Reload and try again.');
  if(!r.ok) throw new Error(`Save failed (${r.status}). ${(await r.json()).message || ''}`);
  return (await r.json()).content.sha;
}

/* images: upload straight into assets/img */
export async function putBinary(path, arrayBuffer, message){
  const {branch} = cfg.get();
  let binary = ''; const bytes = new Uint8Array(arrayBuffer);
  for(let i=0; i<bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  let sha;
  try { sha = (await getFile(path)).sha; } catch { /* new file */ }
  const r = await fetch(`${base()}/contents/${path}`, {
    method:'PUT', headers:{...headers(),'Content-Type':'application/json'},
    body: JSON.stringify({message, content: btoa(binary), sha, branch})
  });
  if(!r.ok) throw new Error(`Upload failed (${r.status})`);
  return path;
}

/* every picture and film in the repository, so the pickers can offer them */
async function listFolder(folder){
  const {branch} = cfg.get();
  const r = await fetch(`${base()}/contents/${folder}?ref=${branch}`, {headers: headers()});
  if(!r.ok) return [];
  return (await r.json()).filter(f => f.type === 'file' && !f.name.startsWith('.'))
                         .map(f => ({path:f.path, name:f.name, size:f.size, sha:f.sha}));
}

export async function listImages(){
  return (await listFolder('assets/img')).map(f => f.path);
}

export async function listMedia(){
  const [img, vid] = await Promise.all([listFolder('assets/img'), listFolder('assets/video')]);
  return [...img, ...vid].sort((a,b) => a.path.localeCompare(b.path));
}

/* read a file's bytes — used when renaming, which is a copy then a remove */
export async function getBinary(path){
  const {branch} = cfg.get();
  const r = await fetch(`${base()}/contents/${path}?ref=${branch}`, {headers: headers()});
  if(!r.ok) throw new Error(`Could not read ${path} (${r.status})`);
  const j = await r.json();
  const bin = atob(j.content.replace(/\n/g,''));
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return {buffer: bytes.buffer, sha: j.sha};
}

export async function removeFile(path, sha, message){
  const {branch} = cfg.get();
  const r = await fetch(`${base()}/contents/${path}`, {
    method:'DELETE', headers:{...headers(),'Content-Type':'application/json'},
    body: JSON.stringify({message, sha, branch})
  });
  if(!r.ok) throw new Error(`Could not remove ${path} (${r.status})`);
}
