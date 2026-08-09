/* ============================================================
   GLASSHOUSE — content loader
   Everything editable lives in /content as JSON. This file fetches
   it, then hands control to app.js. Nothing here needs editing.
   ============================================================ */
/* Where the site lives. The build step rewrites this for the generated pages;
   it stays '' when you preview locally. */
window.BASE = (document.documentElement.dataset.base || '').replace(/\/$/,'');
const asset = p => (!p || /^(https?:)?\/\//.test(p) || p.startsWith(window.BASE + '/')) ? p : window.BASE + '/' + p.replace(/^\//,'');
window.asset = asset;

const CONTENT_FILES = {
  SERVICES:       'services',
  SERVICE_DETAIL: 'service-detail',
  FAQ:            'faq',
  CASES:          'case-studies',
  JOURNAL:        'journal',
  ABOUT_FACTS:    'about-facts',
  VALUES:         'values',
  TEAM:           'team',
  VACANCIES:      'vacancies',
  HOME_METRICS:   'home-metrics',
  COPY:           'copy',
  IMAGES:         'images',
  SEO:            'seo'
};

async function loadContent(){
  const entries = await Promise.all(
    Object.entries(CONTENT_FILES).map(async ([key, file]) => {
      const res = await fetch(asset(`content/${file}.json`), {cache:'no-cache'});
      if(!res.ok) throw new Error(`content/${file}.json failed (${res.status})`);
      return [key, await res.json()];
    })
  );
  const data = Object.fromEntries(entries);

  /* image keys become real file paths */
  window.IMG = {};
  for(const [key, path] of Object.entries(data.IMAGES)){
    if(!key.startsWith('_')) window.IMG[key] = path;
  }
  window.VIDEO  = data.IMAGES._video;
  window.POSTER = data.IMAGES._poster;

  /* the editor stores lists as {items:[…]} — unwrap them for the site */
  const unwrap = v => (v && !Array.isArray(v) && Array.isArray(v.items)) ? v.items : v;
  for(const key of ['SERVICES','SERVICE_DETAIL','FAQ','CASES','JOURNAL',
                    'ABOUT_FACTS','VALUES','TEAM','VACANCIES','HOME_METRICS']){
    window[key] = unwrap(data[key]);
    data[key]   = window[key];
  }
  window.COPY = data.COPY;
  window.SEO  = data.SEO || {};
  return data;
}

/* fill every element carrying data-copy="some.key" */
function applyCopy(copy){
  document.querySelectorAll('[data-copy]').forEach(el => {
    const value = el.dataset.copy.split('.').reduce((o,k)=> o && o[k], copy);
    if(typeof value === 'string') el.innerHTML = value;
  });
  if(copy.meta){
    document.title = copy.meta.title || document.title;
    const d = document.querySelector('meta[name="description"]');
    if(d && copy.meta.description) d.setAttribute('content', copy.meta.description);
  }
}

window.contentReady = loadContent()
  .then(data => { applyCopy(data.COPY); return data; })
  .catch(err => {
    console.error('Content failed to load:', err);
    document.documentElement.classList.remove('js');
    const note = document.createElement('p');
    note.style.cssText = 'padding:2rem;font:14px system-ui;color:#8a2f2f';
    note.textContent = 'Content failed to load. If you are opening this file directly, '
      + 'run a local server instead: python3 -m http.server';
    document.body.prepend(note);
  });
