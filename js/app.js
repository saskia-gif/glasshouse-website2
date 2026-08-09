/* ============================================================
   GLASSHOUSE — behaviour
   Runs once the content in /content has loaded.
   ============================================================ */
window.contentReady.then(() => {

/* ============================================================
   APP — routing, rendering, motion
   ============================================================ */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
/* On a generated page only one route's markup is present, so every render
   below is a no-op when its container is not on this page. */
const $q=sel=>{const e=document.querySelector(sel); return e|| new Proxy({},{
  get:(_,k)=> k==='addEventListener' ? ()=>{} : (k==='innerHTML'||k==='textContent') ? '' : undefined,
  set:()=>true });};
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const onPhone=window.matchMedia('(max-width:700px)');
let curtainUp=reduce;   /* true once the loading sequence has cleared */
const counted=new WeakSet();
let metricIO=null;
let io=null;  /* scroll-reveal observer — declared here because renderCards() uses it on first paint */
const brief=(cls,tag,note)=>`<div class="ph brief ${cls}" role="img" aria-label="Placeholder: ${note}"><span class="brief__in"><span class="label">${tag}</span><p>${note}</p></span></div>`;
const F=(SEO.folders||{work:'work',services:'services',journal:'journal'});
const B=window.BASE||'';
/* every internal link is a real path, so the page exists for a crawler */
const U=(...parts)=>B+'/'+parts.filter(Boolean).map(x=>String(x).replace(/^\/|\/$/g,'')).join('/')+(parts.length?'/':'');
const HOME=B+'/';
const ALT=(window.ALTTEXT||{});
/* alt text set in the editor wins; otherwise we fall back to something sensible */
const altFor=(src,fallback='')=>String(ALT[src]||fallback||'').replace(/"/g,'&quot;');
const pic=(src,cls,alt='')=>`<img class="pic ${cls}" src="${window.asset(src)}" alt="${altFor(src,alt)}" loading="lazy" decoding="async">`;
/* Every picture is chosen in the editor. These read the name stored on each
   record (e.g. "gigiA") and turn it into a real file path via images.json. */
const imgPath=v=>{
  if(!v) return '';
  return v.includes('/') ? v : (IMG[v]||'');   /* a path, or an old nickname */
};
const caseImg=slug=>{const c=CASES.find(x=>x.slug===slug)||{};
  return {card:imgPath(c.card), v:(c.gallery||[]).map(imgPath).filter(Boolean)};};
const jrnImg=a=>imgPath(a&&a.img);
const media=(slug,i,cls,alt)=>{const src=caseImg(slug).v[i];
  return src?pic(src,cls,alt):ph(cls,'Replace — '+cls.replace('r','')+' media');};
const ph=(cls,label,tone='')=>`<div class="ph ${cls}" data-ph="${label}"${tone?` data-tone="${tone}"`:''} role="img" aria-label="Placeholder: ${label.replace(/"/g,'')}"></div>`;

/* ---- loading sequence ---- */
(function(){
  const l=$('#loader'); if(!l) return;
  /* The house belongs to the front door. It plays when someone arrives at the
     homepage — including on a reload — and never anywhere else: not on the
     inner pages, and not when clicking between them. */
  const atHome = location.pathname.replace(B,'').replace(/\/index\.html$/,'').replace(/\/+$/,'') === '';
  let internal=false;
  try {
    internal = !!document.referrer &&
               new URL(document.referrer).origin === location.origin;
  } catch {}
  if(reduce || !atHome || internal){ l.classList.add('done'); curtainUp=true; return; }
  document.body.style.overflow='hidden';
  let finished=false;
  const finish=()=>{if(finished)return;finished=true;l.classList.add('out');
    setTimeout(()=>{
      l.classList.add('done');document.body.style.overflow='';
      curtainUp=true;flushMetrics();
    },600);};
  setTimeout(finish, onPhone.matches ? 1800 : 2600);   /* the phone has less to show */
  l.addEventListener('click',finish);
  document.addEventListener('keydown',finish,{once:true});
})();

/* ---- hero ---- */
$q('#heroWindows').innerHTML=`
  <div class="phone-wrap rv">
    <span class="phone-cap">${(COPY.hero&&COPY.hero.filmCaption)||'In the feed — client film'}</span>
    <div class="phone-frame">
      <span class="phone-panel" aria-hidden="true"></span>
      <div class="phone">
      <span class="phone__island"></span>
      <video src="${VIDEO}" poster="${POSTER}" autoplay muted loop playsinline
             aria-label="Glasshouse client film"></video>
      </div>
    </div>
  </div>`;

/* on a phone the film belongs under the proof, not stacked below the headline */
function placeFilm(){
  if(document.body.classList.contains('has-reel')) return;
  const film=$('.phone-wrap'), hero=$('#heroWindows'), below=$('#heroBg');
  if(!film||!hero||!below)return;
  const target=onPhone.matches?below:hero;
  if(film.parentNode!==target)target.appendChild(film);
}
onPhone.addEventListener?onPhone.addEventListener('change',placeFilm):onPhone.addListener(placeFilm);

/* the wall of work — real client stills, moving slowly */
/* The moving band and the mobile grid. Choose pictures in the editor, or leave
   the list empty and they build themselves from the case studies. */
const chosenWall=((COPY.homeWall||{}).images||[]).map(imgPath).filter(Boolean);
const WALL=chosenWall.length
  ? chosenWall
  : CASES.flatMap(c=>(c.gallery||[]).slice(0,2)).map(imgPath).filter(Boolean);
$q('#wall').innerHTML=[...WALL,...WALL].map(src=>pic(src,'r916','Client content')).join('');

const chosenGrid=((COPY.homeWall||{}).phoneImages||[]).map(imgPath).filter(Boolean);
const PH_GRID=(chosenGrid.length?chosenGrid:CASES.map(c=>(c.gallery||[])[0]).map(imgPath).filter(Boolean)).slice(0,4);
if($('#phGrid'))$q('#phGrid').innerHTML=PH_GRID.map(src=>pic(src,'r45','Client content')).join('');

/* the homepage portrait — a picture once one is chosen, a brief until then */
(function(){
  const src=imgPath((COPY.intro||{}).image);
  $q('#introMedia').innerHTML = src
    ? pic(src,'r45',(COPY.intro||{}).imageAlt || 'Glasshouse')
    : brief('r45','Placeholder — portrait 4:5',
        'A founder shot through glass, so the reflection sits over her. Daylight, no studio lighting, mid-conversation rather than posed.');
})();

/* ---- home: work rows ---- */
$q('#workRows').innerHTML=CASES.filter(c=>c.featured).map((c,i)=>`
  <a class="work-row" href="${U(F.work,c.slug)}">
    <span class="work-row__top">
      <span class="work-row__name display">${c.client}</span>
      <span class="work-row__no">${String(i+1).padStart(2,'0')} / ${c.metrics[0].fig}</span>
    </span>
    <span class="work-row__reveal"><span class="work-row__body">
      <span>
        <span class="work-row__desc">${c.desc}</span>
        <span class="work-row__tags">${c.services.slice(0,3).map(s=>`<span class="tag">${s}</span>`).join('')}</span>
      </span>
      <span class="work-row__media">
        ${media(c.slug,0,'r916',c.client)}${media(c.slug,1,'r916',c.client)}${media(c.slug,2,'r916',c.client)}
      </span>
      <span class="work-row__go"><span class="btn btn--solid"><span>View case study</span><span class="arrow" aria-hidden="true">→</span></span></span>
    </span></span>
  </a>`).join('');

/* ---- home: metrics ---- */
const metricHTML=m=>`<div class="metric rv"><span class="metric__rule"></span><span class="metric__fig" data-fig="${m.fig}">${m.fig}</span><span class="metric__lab">${m.lab}</span></div>`;
$q('#homeMetrics').innerHTML=HOME_METRICS.map(metricHTML).join('');

/* ---- services (home preview + full) ---- */
const svcHTML=(s,i,full)=>`
  <div class="svc${full&&i===0?' open':''}">
    <button class="svc__hd" aria-expanded="${full&&i===0}" aria-controls="pn-${s.slug}${full?'-f':''}">
      <span class="svc__ti">${s.title}</span>
      <span class="svc__meta">
        <span class="svc__ix">${String(i+1).padStart(2,'0')}</span><span class="svc__sign" aria-hidden="true"></span>
      </span>
    </button>
    <div class="svc__pn" id="pn-${s.slug}${full?'-f':''}"><div class="svc__pn-in"><p>${s.text}</p></div></div>
  </div>`;
$q('#svcIndex').innerHTML=SERVICES.map((s,i)=>
  `<button data-go="svc-${s.slug}"><span class="svc-index__n">${String(i+1).padStart(2,'0')}</span>${s.title}</button>`).join('');

$q('#svcBlocks').innerHTML=SERVICES.map((s,i)=>{
  const d=SERVICE_DETAIL[s.slug]||{caps:[],line:''};
  const c=d.proof&&CASES.find(x=>x.slug===d.proof);
  return `
  <article class="svc-block rv" id="svc-${s.slug}">
    <div class="svc-block__body">
      <span class="label">${String(i+1).padStart(2,'0')} — ${s.title}</span>
      <h2 class="display">${d.line}</h2>
      <p class="svc-block__note">${s.text}</p>
      <ul class="caps">${d.caps.map(c2=>`<li>${c2}</li>`).join('')}</ul>
      <p style="margin-top:1.4rem"><a class="card__cta" href="${U(F.services,s.slug)}">More on ${s.title.toLowerCase()} <span class="arrow" aria-hidden="true">→</span></a></p>
      ${c?`<a class="svc-block__proof" href="${U(F.work,c.slug)}">
            <span class="label">Seen in practice</span>
            <span class="display md">${c.client}</span>
            <span class="svc-block__fig">${c.metrics[0].fig} ${c.metrics[0].lab}</span>
          </a>`:''}
    </div>
    <div class="svc-block__media">${imgPath(d.img)?pic(imgPath(d.img),'r45',s.title):ph('r45','Replace — service image 4:5')}</div>
  </article>`;
}).join('');

/* the seal is a control, not an ornament */
function toProof(){
  const t=document.getElementById('proof'); if(!t)return;
  window.scrollTo({top:window.scrollY+t.getBoundingClientRect().top-navH(),
                   behavior:reduce?'auto':'smooth'});
}
[$('#scrollCue'),$('#heroCta')].forEach(b=>b&&b.addEventListener('click',toProof));

/* the index jumps rather than links, so the router is left alone */
$q('#svcIndex').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return;
  const t=document.getElementById(b.dataset.go);
  if(t)window.scrollTo({top:window.scrollY+t.getBoundingClientRect().top-navH()-16,behavior:reduce?'auto':'smooth'});
});
$q('#faq').innerHTML=FAQ.map((f,i)=>svcHTML({slug:'faq'+i,title:f.q,text:f.text},i,false)).join('');
document.addEventListener('click',e=>{
  const hd=e.target.closest('.svc__hd'); if(!hd) return;
  const box=hd.parentElement, group=box.parentElement;
  const willOpen=!box.classList.contains('open');
  $$('.svc.open',group).forEach(o=>{                 /* only one open at a time */
    o.classList.remove('open');
    const h=o.querySelector('.svc__hd'); if(h) h.setAttribute('aria-expanded','false');
  });
  box.classList.toggle('open',willOpen);
  hd.setAttribute('aria-expanded',willOpen);
});

/* ---- about ---- */
const person=(p,i)=>`<div class="rv">${pic(imgPath(p.img)||IMG.team1,'r45','Portrait')}
  <h3>${p.name}</h3><div class="role">${p.role}</div><p>${p.bio}</p></div>`;
/* at-a-glance facts */
$q('#aboutFacts').innerHTML=ABOUT_FACTS.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

/* the window wall — four frames at different heights, like glazing */
(function(){
  const set=((COPY.aboutPage||{}).collage||[]).slice(0,4);
  const frames=set.length?set:[{img:'studio',caption:'The studio'},{img:'team4',caption:'In the room'},
                               {img:'team2',caption:'Filming'},{img:'founder1',caption:'Founders'}];
  $q('#collage').innerHTML=frames.map((f,i)=>{
    const src=imgPath(f.img);
    const cap=f.caption||'';
    return `<figure class="c${i+1}">${src?pic(src,'',cap):ph('r45','Replace — collage image')}`
         + `${cap?`<figcaption>${cap}</figcaption>`:''}</figure>`;
  }).join('');
})();

/* three people, shown as equals — no hover mechanic to prop up a short list */
$q('#people').innerHTML=TEAM.people.map(p=>`
  <article class="person rv">
    <div class="person__img">${imgPath(p.img)?pic(imgPath(p.img),'r45',p.name):ph('r45','Replace — portrait')}</div>
    <h3 class="display">${p.name}</h3>
    <span class="label">${p.role}</span>
    <p>${p.bio}</p>
    <p class="person__note">${p.note}</p>
    <div class="person__leads"><span class="label">Leads</span> ${p.leads.join(' · ')}</div>
  </article>`).join('');

$q('#values').innerHTML=VALUES.map((v,i)=>`
  <div class="value rv"><span class="label">${String(i+1).padStart(2,'0')}</span>
  <h3 class="display">${v.t}</h3><p>${v.p}</p></div>`).join('');

/* ---- careers ---- */
$q('#vacancies').innerHTML=VACANCIES.length?VACANCIES.map(v=>`
  <div class="vac rv"><div><h3 class="display">${v.role}</h3>
  <p style="color:var(--body-2);margin:.6rem 0 0;max-width:52ch;font-size:.92rem">${v.desc}</p>
  <p class="label">${v.location} — ${v.type}</p></div>
  <a class="btn" href="${U('contact')}"><span>Apply</span><span class="arrow" aria-hidden="true">→</span></a></div>`).join('')
  :`<div class="empty"><p class="display lg">No open roles right now.</p><p style="color:var(--body-2);margin-top:.8rem">We still read every open application — tell us what you'd want to do here.</p><p style="margin-top:1.6rem"><a class="btn" href="${U('contact')}"><span>Send one anyway</span><span class="arrow" aria-hidden="true">→</span></a></p></div>`;

/* ---- work index ---- */
const WP=(COPY.workPage||{});
const allServices=[...new Set(CASES.flatMap(c=>c.services))];
const ALL_LABEL=WP.allLabel||'All';
$q('#workCount').textContent=`${CASES.length} ${WP.countSuffix||'case studies'}`;

/* The filter bar. If filters are set in the editor those are used, in that
   order; otherwise one button per service found on the case studies. Each
   filter matches a case study when any of its comma-separated terms appears
   in that study's Services. */
const FILTERS = (Array.isArray(WP.filters) && WP.filters.length)
  ? WP.filters.filter(f => f && (f.label || f.match))
              .map(f => ({label: f.label || f.match, match: (f.match || f.label || '')
                                 .split(',').map(x => x.trim()).filter(Boolean)}))
  : allServices.map(sv => ({label: sv, match: [sv]}));

$q('#filters').innerHTML = [{label:ALL_LABEL, match:null}, ...FILTERS]
  .map((f,i) => `<button aria-pressed="${i===0}" data-i="${i-1}">${f.label}</button>`).join('');
function renderCards(index){
  const f = (index==null||index<0) ? null : FILTERS[index];
  const list = !f ? CASES : CASES.filter(c => f.match.some(m => c.services.includes(m)));
  $q('#workCards').innerHTML=list.map(c=>`
    <a class="card rv" href="${U(F.work,c.slug)}">
      <span class="card__frame">
        ${caseImg(c.slug).card?pic(caseImg(c.slug).card,'r43',c.client.replace(/&amp;/g,'and')):ph('r43','Replace — hero 4:3')}
        <span class="card__tag"><b>${c.metrics[0].fig}</b><span>${c.metrics[0].lab}</span></span>
      </span>
      <span class="card__meta">
        <span class="card__name">${c.client}</span>
        <span class="label">${c.sector}</span>
      </span>
      <span class="card__desc">${c.desc}</span>
      <span class="card__tags">${c.services.slice(0,3).map(x=>`<i>${x}</i>`).join('')}</span>
      <span class="card__cta">${WP.viewLabel||'View case study'} <span class="arrow" aria-hidden="true">→</span></span>
    </a>`).join('');
  observeReveals();
}
renderCards();
$q('#filters').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  $$('#filters button').forEach(x=>x.setAttribute('aria-pressed',x===b));
  renderCards(Number(b.dataset.i));
});

/* ---- journal ---- */
const feat=JOURNAL.find(a=>a.featured)||JOURNAL[0];
$q('#jrnFeature').innerHTML=`<a class="feature rv" href="${U(F.journal,feat.slug)}">
  <span class="jrn__frame">${jrnImg(feat)?pic(jrnImg(feat),'r32',feat.title):ph('r32','Replace — journal image')}</span>
  <span><span class="label">${(COPY.journalPage&&COPY.journalPage.featuredPrefix)||'Featured'} — ${feat.category}</span>
  <h2 class="display lg" style="margin:1rem 0 .8rem">${feat.title}</h2>
  <span style="color:var(--body-2);display:block;max-width:44ch">${feat.excerpt}</span>
  <span class="label" style="display:block;margin-top:1.4rem">${feat.date}</span>
  <span class="card__cta" style="padding-top:1rem">${(COPY.journalPage&&COPY.journalPage.readMore)||'Read the piece'} <span class="arrow" aria-hidden="true">→</span></span></span></a>`;
const cats=[...new Set(JOURNAL.map(a=>a.category))];
$q('#jrnFilters').innerHTML=['All',...cats].map((f,i)=>`<button aria-pressed="${i===0}" data-f="${f}">${f}</button>`).join('');
function renderJournal(filter='All'){
  $q('#jrnGrid').innerHTML=JOURNAL.filter(a=>!a.featured&&(filter==='All'||a.category===filter)).map(a=>`
    <a class="rv" href="${U(F.journal,a.slug)}">
      <span class="jrn__frame">${jrnImg(a)?pic(jrnImg(a),'r32',a.title):ph('r32','Replace — journal image')}</span>
      <span class="jrn__meta"><span class="label">${a.category}</span><span class="label">${a.date}</span></span>
      <h3>${a.title}</h3>
      <p>${a.excerpt}</p>
      <span class="card__cta">${(COPY.journalPage&&COPY.journalPage.readShort)||'Read'} <span class="arrow" aria-hidden="true">→</span></span>
    </a>`).join('');
  observeReveals();
}
renderJournal();
$q('#jrnFilters').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  $$('#jrnFilters button').forEach(x=>x.setAttribute('aria-pressed',x===b));
  renderJournal(b.dataset.f);
});

/* ---- case study template ---- */
const CE = (COPY.casePage||{});
function renderCase(slug){
  const c=CASES.find(x=>x.slug===slug)||CASES[0];
  const next=CASES[(CASES.indexOf(c)+1)%CASES.length];
  const m=caseImg(c.slug);
  const chapter=(t,b)=>`<div class="cs-chapter rv"><h2 class="label">${t}</h2><p class="chapter-copy">${b}</p></div>`;
  /* a still in a device frame, marked for the video that replaces it */
  const inPhone=(src,cap)=>`
    <figure class="cs-phone rv">
      <span class="phone phone--static">
        <span class="phone__island"></span>
        ${src?pic(src,'',c.client.replace(/&amp;/g,'and')):ph('r916','9:16')}
        <span class="cs-phone__badge">Replace — vertical video</span>
      </span>
      ${cap?`<figcaption>${cap}</figcaption>`:''}
    </figure>`;
  const feedItem=(i,video)=>`
    <span class="cs-feed__item">
      ${m.v[i]?pic(m.v[i],'r916',c.client.replace(/&amp;/g,'and')):ph('r916','9:16 vertical')}
      ${video?'<span class="cs-feed__badge">Video</span>':''}
    </span>`;

  $q('#caseRoot').innerHTML=`
  <div class="wrap sec cs-hero">
    <div class="sill"><a class="label" href="${U(F.work)}" style="color:var(--fg)">← All work</a><span class="label">${c.period}</span></div>
    <div class="cs-top">
      <div class="rv">
        <h1 class="display xl">${c.client}</h1>
        <p class="lede" style="margin-top:1.2rem">${c.statement}</p>
        <dl class="cs-facts">
          <div><dt>Sector</dt><dd>${c.sector}</dd></div>
          <div><dt>Platforms</dt><dd>${c.platforms}</dd></div>
          <div><dt>Territory</dt><dd>${c.territory}</dd></div>
          <div><dt>Period</dt><dd>${c.period}</dd></div>
          <div class="cs-facts__wide"><dt>Services</dt><dd>${c.services.join(' · ')}</dd></div>
        </dl>
      </div>
      ${inPhone(m.v[0]||m.card,'The work, as it appeared in the feed')}
    </div>
  </div>

  <!-- results, straight after the opening -->
  <section class="room room-sage"><div class="wrap sec">
    <div class="sill"><span class="label">Results</span><span class="label">${c.period}</span></div>
    <div class="metrics" style="grid-template-columns:repeat(${Math.min(3,c.metrics.length)},1fr)">
      ${c.metrics.slice(0,3).map(metricHTML).join('')}
    </div>
    ${c.metrics.length>3?`<div class="metrics metrics--sub" style="grid-template-columns:repeat(${c.metrics.length-3},1fr)">${c.metrics.slice(3).map(metricHTML).join('')}</div>`:''}
    ${c.quote?`<blockquote class="quote quote--wide rv" style="margin:clamp(2.5rem,5vw,4rem) 0 0">"${c.quote}"<div class="attrib">${c.quoteBy}</div></blockquote>`:''}
  </div></section>

  <section class="room room-cream"><div class="wrap sec">
    <div class="sill"><span class="label">How we got there</span></div>
    ${chapter('The brief',c.brief)}
    ${chapter('The objective',c.objective)}
    ${chapter('The strategy',c.strategy)}
    ${chapter('What we did',c.activity)}
  </div>

  <div class="wrap sec--tight" style="padding-top:0">
    <div class="sill"><span class="label">The content</span><span class="label">${c.platforms}</span></div>
    <div class="cs-feed rv">
      ${feedItem(0,true)}${feedItem(1,false)}${feedItem(2,true)}
      <span class="cs-feed__item cs-feed__slot">${ph('r916','Replace — vertical video')}</span>
    </div>
  </div></section>

  <div class="case-end">
    <a class="next-project" href="${U(F.work,next.slug)}">
      <span class="label" style="color:var(--muted)">${CE.nextLabel||'Next project'}</span>
      <span class="display xl" style="display:block;margin-top:1rem">${next.client}</span>
      <span class="label" style="display:block;margin-top:1.2rem;color:var(--muted)">${next.statement}</span>
    </a>
    <div class="case-end__cta">
      <span class="label">${CE.ctaLine||'Or start one of your own'}</span>
      <a class="btn btn--solid" href="${U('contact')}"><span>${CE.ctaButton||'Get in touch'}</span><span class="arrow" aria-hidden="true">→</span></a>
    </div>
  </div>`;
  return c;
}

/* ---- article template ---- */
function renderArticle(slug){
  const a=JOURNAL.find(x=>x.slug===slug)||JOURNAL[0];
  const rel=JOURNAL.filter(x=>x.slug!==a.slug).slice(0,3);
  /* A body entry is either a line of text — plain, "H:" for a heading,
     "Q:" for a pull quote — or a picture: {img:"assets/img/x.webp", caption:"…"} */
  const body=a.body.map(p=>{
    if(p && typeof p === 'object'){
      const src=imgPath(p.img);
      if(!src) return ph('r169','Replace — article image');
      const wide = p.width === 'wide' ? ' article-fig--wide' : '';
      return `<figure class="article-fig${wide}">${pic(src,'',p.alt||a.title)}`
           + `${p.caption?`<figcaption>${p.caption}</figcaption>`:''}</figure>`;
    }
    if(typeof p !== 'string') return '';
    if(p.startsWith('Q:'))return `<blockquote>${p.slice(2)}</blockquote>`;
    if(p.startsWith('H:'))return `<h3>${p.slice(2)}</h3>`;
    return `<p>${p}</p>`;
  }).join('');
  $q('#articleRoot').innerHTML=`
  <div class="wrap sec">
    <div class="sill"><a class="label" href="${U(F.journal)}" style="color:var(--ink)">← Journal</a><span class="label">${a.category}</span></div>
    <h1 class="display xl" style="max-width:18ch">${a.title}</h1>
    <p class="label" style="margin-top:1.6rem">${a.author} — ${a.date}</p>
    <div style="margin-top:clamp(2rem,4vw,3rem)" class="rv-pane">${jrnImg(a)?pic(jrnImg(a),'r169',a.title):ph('r169','Replace — article image')}</div>
    <div class="article-body" style="margin-top:clamp(2.5rem,5vw,4rem)">
      <p class="lede" style="max-width:none">${a.excerpt}</p>${body}
    </div>
  </div>
  <section class="room room-sage"><div class="wrap sec">
    <div class="sill"><span class="label">Related reading</span></div>
    <div class="jrn">${rel.map(r=>`<a href="${U(F.journal,r.slug)}">
      <span class="jrn__frame">${jrnImg(r)?pic(jrnImg(r),'r32',r.title):ph('r32','Replace — journal image')}</span>
      <span class="jrn__meta"><span class="label">${r.category}</span><span class="label">${r.date}</span></span>
      <h3>${r.title}</h3><p>${r.excerpt}</p>
      <span class="card__cta">${(COPY.journalPage&&COPY.journalPage.readShort)||'Read'} <span class="arrow" aria-hidden="true">→</span></span></a>`).join('')}</div>
  </div></section>`;
  return a;
}

/* ---- selected work: the row you are level with is the one that is open ---- */
let rowRaf=0, openRow=null;
function activateRows(){
  const rows=$$('.route.active .work-row');
  if(!rows.length){openRow=null;return;}
  if(reduce){rows.forEach(r=>r.classList.add('open'));return;}
  const line=innerHeight*0.36;
  let best=null,bestDist=Infinity;
  rows.forEach(r=>{
    const b=r.getBoundingClientRect();
    if(b.bottom<100||b.top>innerHeight-80) return;        /* not really on screen */
    const d=Math.abs(b.top+44-line);
    if(d<bestDist){bestDist=d;best=r;}
  });
  if(!best){                                              /* section is behind us */
    if(openRow){rows.forEach(r=>r.classList.remove('open'));openRow=null;}
    return;
  }
  if(best!==openRow&&openRow){
    /* opening a row makes it taller and nudges the others, which can flip the
       choice back and forth — only switch when the new row is clearly nearer */
    const cb=openRow.getBoundingClientRect();
    if(Math.abs(cb.top+44-line)-bestDist<90) return;
  }
  if(best!==openRow){
    openRow=best;
    rows.forEach(r=>r.classList.toggle('open',r===best));
  }
}
addEventListener('scroll',()=>{
  if(rowRaf)return;
  rowRaf=requestAnimationFrame(()=>{rowRaf=0;activateRows();if(curtainUp)flushMetrics();});
},{passive:true});
addEventListener('resize',()=>{activateRows();if(curtainUp)flushMetrics();});
/* pointing at a name opens it immediately — no waiting for the scroll to agree */
function openRowNow(e){
  if(reduce)return;
  const row=e.target.closest&&e.target.closest('.work-row');
  if(!row||row===openRow)return;
  openRow=row;
  $$('.route.active .work-row').forEach(r=>r.classList.toggle('open',r===row));
}
document.addEventListener('mouseover',openRowNow);
document.addEventListener('focusin',openRowNow);

/* ---- pause the phone film when it is off screen ---- */
(function(){
  const v=document.querySelector('.phone video'); if(!v) return;
  if(reduce){v.removeAttribute('autoplay');v.pause();}
  new IntersectionObserver(es=>es.forEach(e=>{
    if(reduce)return;
    e.isIntersecting?v.play().catch(()=>{}):v.pause();
  }),{threshold:.15}).observe(v);
})();

/* ---- reveals + counters ---- */
function reveal(el){el.classList.add('in')}
function sweep(){            /* anything at or above the fold is shown, full stop */
  $$('.rv:not(.in),.rv-pane:not(.in)').forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.top<innerHeight*0.94&&r.bottom>-80)reveal(el);
  });
}
function observeReveals(){
  if(reduce){$$('.rv,.rv-pane').forEach(el=>el.classList.add('in'));return;}
  io=io||new IntersectionObserver(entries=>{
    entries.forEach(en=>{if(!en.isIntersecting)return;reveal(en.target);io.unobserve(en.target);});
  },{threshold:0,rootMargin:'0px 0px -4% 0px'});
  sweep();
  $$('.rv:not(.in),.rv-pane:not(.in)').forEach(el=>io.observe(el));
}
addEventListener('scroll',sweep,{passive:true});
addEventListener('resize',sweep);
/* counts every number in the figure, so "0 -> 200K" and "5K -> 40K+" both run */
function countUp(el){
  if(!el||reduce||el.dataset.anim)return;
  const raw=el.dataset.fig;
  const nums=raw.match(/\d[\d,.]*/g);
  if(!nums||!nums.some(n=>parseFloat(n.replace(/,/g,''))>0))return;
  const spec=nums.map(n=>({v:parseFloat(n.replace(/,/g,'')),
                           dec:(n.split('.')[1]||'').length,
                           comma:n.includes(',')}));
  el.dataset.anim=1;
  const t0=performance.now(), dur=1600;
  (function step(t){
    const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
    let i=0;
    el.textContent=raw.replace(/\d[\d,.]*/g,()=>{
      const {v,dec,comma}=spec[i++], cur=v*e;
      return comma?cur.toLocaleString('en-GB',{minimumFractionDigits:dec,maximumFractionDigits:dec})
                  :cur.toFixed(dec);
    });
    if(p<1)requestAnimationFrame(step);
    else{el.textContent=raw; delete el.dataset.anim;}
  })(t0);
}
function runMetrics(box){
  if(counted.has(box))return; counted.add(box);
  $$('.metric__fig',box).forEach((f,i)=>setTimeout(()=>countUp(f),i*110));
}
function flushMetrics(){           /* anything already on screen when the curtain lifts */
  $$('.route.active .metrics').forEach(box=>{
    const r=box.getBoundingClientRect();
    if(r.top<innerHeight*0.82&&r.bottom>innerHeight*0.06)runMetrics(box);
  });
}
function watchMetrics(){
  if(reduce)return;
  metricIO=metricIO||new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting)return;
    if(!curtainUp)return;          /* wait — the loader is still up */
    runMetrics(e.target); metricIO.unobserve(e.target);
  }),{threshold:0,rootMargin:'0px 0px -10% 0px'});
  $$('.route.active .metrics').forEach(box=>metricIO.observe(box));
}

/* after the first run they only move on hover */
document.addEventListener('mouseover',e=>{
  const m=e.target.closest('.metric'); if(!m)return;
  if(m.dataset.hover)return; m.dataset.hover=1;
  countUp(m.querySelector('.metric__fig'));
  setTimeout(()=>delete m.dataset.hover,1700);
});
document.addEventListener('mouseout',e=>{
  const m=e.target.closest('.metric');
  if(m&&!m.contains(e.relatedTarget))delete m.dataset.hover;
});

/* ---- the room you are standing in drives nav, mullion and logo ---- */
function navH(){return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navh'))||82}
function updateInside(){
  const n=navH(), rooms=$$('.route.active section.room');
  let here=null;
  for(const r of rooms){const b=r.getBoundingClientRect(); if(b.top<=n+1&&b.bottom>n) here=r;}
  if(!here) here=$('.route.active.room')||rooms[0];
  if(!here) return;
  const cs=getComputedStyle(here), root=document.documentElement.style;
  root.setProperty('--tone-bg',cs.backgroundColor);
  root.setProperty('--tone-fg',cs.color);
  root.setProperty('--tone-line',cs.getPropertyValue('--line').trim()||'rgba(20,20,15,.15)');
  document.body.classList.toggle('is-dark',here.classList.contains('room-brown'));
}
window.addEventListener('scroll',updateInside,{passive:true});
window.addEventListener('resize',updateInside);

/* ---- router ---- */
const META={
  home:['Glasshouse — Social media agency, London','We create social strategies that invite people inside — building brands by making audiences feel part of the story.'],
  work:['Work — Glasshouse social media agency','Social media case studies: TikTok and Instagram growth, content creation and creator campaigns for lifestyle brands and founders.'],
  services:['Services — social media management, strategy and content','Social media management, social strategy, content creation, creative campaigns, community management, influencer campaigns and paid social.'],
  about:['About — inside the Glasshouse','A social-first creative agency in London. Community over audience, clarity and creativity, built in the open.'],
  journal:['Journal — social media insight and trends','Social media insights, trend reports, platform updates and campaign analysis from the Glasshouse team.'],
  careers:['Careers — come inside','Roles, freelance collaboration and open applications at Glasshouse, a social media agency in London.'],
  contact:['Contact — the door\u2019s open','Tell us about your brand, your brief, or the feeling that your socials could be doing more.']
};
/* ============================================================
   ROUTING — real paths, so every page is its own URL
   ------------------------------------------------------------
   /                       home
   /work/                  work index
   /work/<slug>/           case study
   /services/              services index
   /services/<slug>/       one service
   /journal/               journal index
   /journal/<slug>/        article
   /about/ /careers/ /contact/
   The build step writes a real HTML file for each of these, so a crawler
   (and anyone landing directly) gets a complete page before JS runs.
   ============================================================ */
const SITE=(SEO.site||{});
const PAGES=(SEO.pages||[]);
const pageByKey=k=>PAGES.find(p=>p.key===k)||{};
const strip=t=>String(t==null?'':t).replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
/* search engines cut descriptions around 155 characters */
const clamp155=t=>{t=strip(t); if(t.length<=155) return t;
  const cut=t.slice(0,155); return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\u2014-]$/,'')+'\u2026';};
const applyTitle=t=>{
  const tpl=SITE.titleTemplate||'%s';
  return (tpl.includes('%s') && !t.endsWith('Glasshouse')) ? tpl.replace('%s',t) : t;
};

function head(name, attr, key, value){
  let el=document.head.querySelector(`${name}[${attr}="${key}"]`);
  if(value==null){ if(el) el.remove(); return; }
  if(!el){ el=document.createElement(name); el.setAttribute(attr,key); document.head.appendChild(el); }
  el.setAttribute(name==='link'?'href':'content', value);
}

function setSEO(o){
  document.title = o.title;
  head('meta','name','description', o.description||'');
  head('meta','name','robots', o.robots||'index, follow');
  head('link','rel','canonical', o.canonical);
  head('meta','property','og:title', o.title);
  head('meta','property','og:description', o.description||'');
  head('meta','property','og:url', o.canonical);
  head('meta','name','twitter:card','summary_large_image');
  head('link','rel','prev', o.prev||null);
  head('link','rel','next', o.next||null);
}

const absolute=path=>{
  const d=(SITE.domain||'').replace(/\/$/,'');
  return d ? d + path : path;
};

/* breadcrumbs: built from the route, editable labels come from seo.json */
function crumbs(list){
  const bar=$('#crumbs');
  if(!bar) return;
  if(!list || list.length<2){ bar.innerHTML=''; bar.hidden=true; return; }
  bar.hidden=false;
  bar.innerHTML=`<ol>${list.map((c,i)=>
    i===list.length-1
      ? `<li aria-current="page">${c.name}</li>`
      : `<li><a href="${c.path}">${c.name}</a></li>`).join('')}</ol>`;
  const ld=list.map((c,i)=>({"@type":"ListItem",position:i+1,name:strip(c.name),item:absolute(c.path)}));
  jsonld('breadcrumbs', (SEO.schema||{}).breadcrumbs===false ? null :
    {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:ld});
}

/* one <script type="application/ld+json"> per purpose, replaced on each route */
function jsonld(id, obj){
  let el=document.getElementById('ld-'+id);
  if(!obj){ if(el) el.remove(); return; }
  if(!el){ el=document.createElement('script'); el.type='application/ld+json'; el.id='ld-'+id; document.head.appendChild(el); }
  el.textContent=JSON.stringify(obj);
}

function parsePath(){
  let p=location.pathname;
  if(B && p.startsWith(B)) p=p.slice(B.length);
  p=p.replace(/^\/|\/$/g,'');
  if(!p) return {name:'home',seg:'',slug:''};
  const [seg,slug]=p.split('/');
  if(seg===F.work)     return {name: slug?'case':'work', seg, slug};
  if(seg===F.services) return {name: slug?'service':'services', seg, slug};
  if(seg===F.journal)  return {name: slug?'article':'journal', seg, slug};
  if(['about','careers','contact'].includes(seg)) return {name:seg, seg, slug:''};
  return {name:'home',seg:'',slug:''};
}

function route(){
  const {name:raw, slug}=parsePath();
  let name=raw, seo={}, trail=[{name:(pageByKey('home').breadcrumb)||'Home', path:HOME}];
  const path=location.pathname.replace(B,'')||'/';

  const fromPage=key=>{
    const pg=pageByKey(key);
    return {title:applyTitle(pg.title||document.title), description:pg.description||SITE.defaultDescription,
            robots:pg.robots||'index, follow', canonical:pg.canonical||absolute(B+ (pg.path||path)),
            prev:pg.prev, next:pg.next};
  };

  if(name==='case'){
    const c=renderCase(slug);
    if(!c){ name='work'; }
    else {
      seo={title:applyTitle(c.seoTitle||`${strip(c.client)} — case study`),
           description:c.seoDescription||clamp155(c.desc), robots:c.robots||'index, follow',
           canonical:c.canonical||absolute(U(F.work,c.slug)), prev:c.prev, next:c.next};
      trail.push({name:pageByKey('work').breadcrumb||'Work', path:U(F.work)},{name:strip(c.client), path:U(F.work,c.slug)});
      caseSchema(c);
    }
  }
  else if(name==='article'){
    const a=renderArticle(slug);
    seo={title:applyTitle(a.seoTitle||a.title), description:a.seoDescription||clamp155(a.excerpt),
         robots:a.robots||'index, follow', canonical:a.canonical||absolute(U(F.journal,a.slug)),
         prev:a.prev, next:a.next};
    trail.push({name:pageByKey('journal').breadcrumb||'Journal', path:U(F.journal)},{name:strip(a.title), path:U(F.journal,a.slug)});
    articleSchema(a);
  }
  else if(name==='service'){
    const sv=renderService(slug);
    if(!sv){ name='services'; }
    else {
      seo={title:applyTitle(sv.seoTitle||sv.title), description:sv.seoDescription||clamp155(sv.text),
           robots:sv.robots||'index, follow', canonical:sv.canonical||absolute(U(F.services,sv.slug)),
           prev:sv.prev, next:sv.next};
      trail.push({name:pageByKey('services').breadcrumb||'Services', path:U(F.services)},{name:strip(sv.title), path:U(F.services,sv.slug)});
      serviceSchema(sv);
    }
  }
  if(!seo.title){
    seo=fromPage(name);
    const pg=pageByKey(name);
    if(name!=='home') trail.push({name:pg.breadcrumb||pg.name||name, path:B+(pg.path||'/')});
    jsonld('page', null);
  }
  setSEO(seo);
  crumbs(trail);
  faqSchema(name);

  if(!$(`.route[data-route="${name}"]`))name='home';
  $$('.route').forEach(r=>r.classList.toggle('active',r.dataset.route===name));
  const here=location.pathname.replace(/\/$/,'');
  $$('.nav-links a').forEach(a=>{
    const t=a.getAttribute('href').replace(/\/$/,'');
    const on = t===here
      || (name==='case'    && t===U(F.work).replace(/\/$/,''))
      || (name==='article' && t===U(F.journal).replace(/\/$/,''))
      || (name==='service' && t===U(F.services).replace(/\/$/,''));
    on ? a.setAttribute('aria-current','page') : a.removeAttribute('aria-current');
  });
  closeMenu();
  window.scrollTo({top:0,behavior:'auto'});
  document.body.classList.remove('is-dark');
  requestAnimationFrame(()=>{observeReveals();updateInside();watchMetrics();activateRows();placeFilm();if(curtainUp)flushMetrics();});
}

/* old #/ links keep working */
(function legacy(){
  const h=location.hash;
  if(!/^#\//.test(h)) return;
  const parts=h.replace(/^#\/?/,'').split('/');
  const map={'':HOME,work:U(F.work),services:U(F.services),journal:U(F.journal),
             about:U('about'),careers:U('careers'),contact:U('contact')};
  let to = parts[0]==='case' ? U(F.work,parts[1])
        : parts[0]==='journal'&&parts[1] ? U(F.journal,parts[1])
        : map[parts[0]] || HOME;
  history.replaceState(null,'',to);
})();

/* On a generated page each file holds only its own route, so links load
   normally. In the un-built source they switch in place, as before. */
const STATIC = document.documentElement.dataset.static === '1';
if(!STATIC) document.addEventListener('click',e=>{
  const a=e.target.closest('a');
  if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0) return;
  const href=a.getAttribute('href')||'';
  if(a.target==='_blank'||/^(https?:|mailto:|tel:|#)/.test(href)) return;
  if(a.origin && a.origin!==location.origin) return;
  e.preventDefault();
  if(a.pathname===location.pathname) return;
  history.pushState(null,'',a.pathname);
  route();
});
if(!STATIC) window.addEventListener('popstate',route);

/* ---- mobile menu ---- */
const menu=$('#menu'), toggle=$('#navToggle');
function closeMenu(){menu.classList.remove('open');document.body.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false');toggle.textContent='Menu';document.body.style.overflow=''}
toggle.addEventListener('click',()=>{
  const open=!menu.classList.contains('open');
  menu.classList.toggle('open',open);
  toggle.setAttribute('aria-expanded',open);
  toggle.textContent=open?'Close':'Menu';document.body.classList.toggle('menu-open',open);
  document.body.style.overflow=open?'hidden':'';
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});

/* ---- contact form (prototype) ---- */
$q('#contactForm').addEventListener('submit',e=>{
  e.preventDefault();
  const f=e.target, msg=$('#formMsg');
  const missing=['name','email','message'].filter(n=>!f[n].value.trim());
  if(missing.length){msg.style.color='#B4544A';msg.textContent=`Add your ${missing.join(', ')} and we'll pick it up from there.`;f[missing[0]].focus();return;}
  msg.style.color='var(--sage)';
  msg.textContent='Thanks — this prototype does not send yet. Connect the form to your handler on build.';
});

/* ---- go ---- */
/* ============================================================
   Blocks that used to be hardcoded in index.html.
   They now render from content/copy.json so the editor owns them.
   ============================================================ */
(function(){
  /* testimonials — add or remove as many as you like */
  const box=$('#quotes');
  if(box && COPY.testimonials && Array.isArray(COPY.testimonials.items)){
    box.innerHTML=COPY.testimonials.items.map((q,i)=>`
      <blockquote class="quote rv${i%2?' d2':''}">${q.quote||''}
        ${q.attrib?`<div class="attrib">${q.attrib}</div>`:''}</blockquote>`).join('');
  }

  /* the three steps on the Services page */
  const steps=$('#steps');
  if(steps && COPY.servicesPage && Array.isArray(COPY.servicesPage.steps)){
    steps.innerHTML=COPY.servicesPage.steps.map((st,i)=>`
      <div class="step rv${i?` d${i+1}`:''}"><span class="step__n">${st.n||String(i+1).padStart(2,'0')}</span>
      <h3 class="display lg">${st.title||''}</h3><p>${st.text||''}</p></div>`).join('');
  }

  /* the picture on the Careers page */
  const cm=$('#careersMedia');
  if(cm){
    const src=imgPath(COPY.careersPage&&COPY.careersPage.image);
    cm.innerHTML=src?pic(src,'r32','The team at work'):ph('r32','Replace — careers image');
  }
  /* social links, editable in the editor */
  const so = COPY.social || {};
  [['soInstagram','instagram'],['soTiktok','tiktok'],['soLinkedin','linkedin']].forEach(([id,key])=>{
    const a=$('#'+id); if(!a) return;
    if(so[key]){ a.href=so[key]; a.target='_blank'; a.rel='noopener'; }
    else if(/\/contact\/?$|^#\/contact$/.test(a.getAttribute('href')||'')){ a.closest('li')?.remove(); }
  });

  observeReveals();
})();

/* ============================================================
   ONE SERVICE, ON ITS OWN PAGE  (/services/<slug>/)
   ============================================================ */
function renderService(slug){
  const sv=SERVICES.find(x=>x.slug===slug);
  if(!sv) return null;
  const d=SERVICE_DETAIL[sv.slug]||{caps:[],line:''};
  const c=d.proof&&CASES.find(x=>x.slug===d.proof);
  const others=SERVICES.filter(x=>x.slug!==sv.slug);
  $q('#serviceRoot').innerHTML=`
  <div class="wrap sec">
    <div class="sill"><span class="label">${COPY.servicesPage&&COPY.servicesPage.label||'Services'}</span><span class="label">${sv.title}</span></div>
    <h1 class="display xl rv" style="max-width:16ch">${d.line||sv.title}</h1>
    <div class="svc-top"><p class="lede rv d2">${sv.text}</p></div>
  </div>
  <div class="wrap sec--tight" style="padding-top:0">
    <div class="grid">
      <div style="grid-column:span 6" class="rv">
        <h2 class="label">What it covers</h2>
        <ul class="caps">${(d.caps||[]).map(x=>`<li>${x}</li>`).join('')}</ul>
      </div>
      <div style="grid-column:span 5/-1" class="rv d2">
        ${imgPath(d.img)?pic(imgPath(d.img),'r45',sv.title):ph('r45','Replace — service image 4:5')}
      </div>
    </div>
  </div>
  ${c?`<section class="room room-sage"><div class="wrap sec">
    <div class="sill"><span class="label">Seen in practice</span></div>
    <a class="svc-block__proof" href="${U(F.work,c.slug)}">
      <span class="display md">${c.client}</span>
      <span class="svc-block__fig">${c.metrics[0].fig} ${c.metrics[0].lab}</span>
    </a>
  </div></section>`:''}
  <div class="wrap sec">
    <div class="sill"><span class="label">Other services</span></div>
    <ul class="caps">${others.map(o=>`<li><a href="${U(F.services,o.slug)}">${o.title}</a></li>`).join('')}</ul>
  </div>
  <section class="room room-brown"><div class="wrap cta">
    <h2 class="display xl rv">${COPY.servicesPage&&COPY.servicesPage.ctaHeading||'Tell us what you’re building.'}</h2>
    <a class="btn btn--solid" href="${U('contact')}"><span>${COPY.servicesPage&&COPY.servicesPage.ctaButton||'Let’s talk'}</span><span class="arrow" aria-hidden="true">→</span></a>
  </div></section>`;
  return sv;
}

/* ============================================================
   STRUCTURED DATA
   Each block is switched on or off in the editor under SEO.
   ============================================================ */
const SCH=(SEO.schema||{});
const ORG=(SEO.organisation||{});

function orgNode(){
  const o={"@context":"https://schema.org","@type":ORG.type||"ProfessionalService",
    name:ORG.name||'Glasshouse', url:absolute(HOME)};
  if(ORG.legalName) o.legalName=ORG.legalName;
  if(ORG.description) o.description=ORG.description;
  if(ORG.email) o.email=ORG.email;
  if(ORG.telephone) o.telephone=ORG.telephone;
  if(ORG.priceRange) o.priceRange=ORG.priceRange;
  if(ORG.foundingDate) o.foundingDate=ORG.foundingDate;
  const addr={};
  if(ORG.street) addr.streetAddress=ORG.street;
  if(ORG.city) addr.addressLocality=ORG.city;
  if(ORG.region) addr.addressRegion=ORG.region;
  if(ORG.postcode) addr.postalCode=ORG.postcode;
  if(ORG.country) addr.addressCountry=ORG.country;
  if(Object.keys(addr).length){ addr["@type"]="PostalAddress"; o.address=addr; }
  const same=Object.values(COPY.social||{}).filter(v=>/^https?:/.test(v));
  if(same.length) o.sameAs=same;
  const img=imgPath((COPY.careersPage||{}).image)||'';
  if(img) o.image=absolute(B+'/'+img.replace(/^\//,''));
  return o;
}
jsonld('org', SCH.organisation===false ? null : orgNode());

function serviceSchema(sv){
  if(SCH.services===false){ jsonld('page',null); return; }
  const d=SERVICE_DETAIL[sv.slug]||{};
  const node={"@context":"https://schema.org","@type":"Service",
    name:strip(sv.title), description:strip(d.line||sv.text),
    serviceType:strip(sv.title), url:absolute(U(F.services,sv.slug)),
    provider:{"@type":ORG.type||"ProfessionalService", name:ORG.name||'Glasshouse', url:absolute(HOME)},
    areaServed:ORG.city||'London'};
  if((d.caps||[]).length) node.hasOfferCatalog={"@type":"OfferCatalog",name:strip(sv.title),
    itemListElement:d.caps.map(c=>({"@type":"Offer",itemOffered:{"@type":"Service",name:strip(c)}}))};
  if(SCH.product){
    node["@type"]=["Service","Product"];
    node.offers={"@type":"Offer",priceCurrency:SCH.productCurrency||'GBP',
                 availability:"https://schema.org/InStock",url:absolute(U(F.services,sv.slug))};
  }
  jsonld('page', node);
}

function caseSchema(c){
  if(SCH.caseStudies===false){ jsonld('page',null); return; }
  const img=caseImg(c.slug).card;
  jsonld('page',{"@context":"https://schema.org","@type":"CreativeWork",
    name:strip(c.client)+' — case study', headline:strip(c.statement||c.client),
    description:strip(c.desc), url:absolute(U(F.work,c.slug)),
    about:{"@type":"Organization",name:strip(c.client)},
    image: img?absolute(B+'/'+img.replace(/^\//,'')):undefined,
    creator:{"@type":ORG.type||"ProfessionalService",name:ORG.name||'Glasshouse',url:absolute(HOME)},
    keywords:(c.services||[]).map(strip).join(', ')});
}

function articleSchema(a){
  if(SCH.articles===false){ jsonld('page',null); return; }
  const img=jrnImg(a);
  jsonld('page',{"@context":"https://schema.org","@type":"Article",
    headline:strip(a.title), description:strip(a.excerpt),
    url:absolute(U(F.journal,a.slug)), datePublished:a.date,
    articleSection:strip(a.category),
    image: img?absolute(B+'/'+img.replace(/^\//,'')):undefined,
    author:{"@type":"Organization",name:strip(a.author||ORG.name||'Glasshouse')},
    publisher:{"@type":"Organization",name:ORG.name||'Glasshouse'}});
}

function faqSchema(name){
  const on = SCH.faq!==false && name==='services' && Array.isArray(FAQ) && FAQ.length;
  jsonld('faq', on ? {"@context":"https://schema.org","@type":"FAQPage",
    mainEntity:FAQ.map(f=>({"@type":"Question",name:strip(f.q),
      acceptedAnswer:{"@type":"Answer",text:strip(f.text)}}))} : null);
}

route();

/* ============================================================
   THE PHONE HOMEPAGE
   Seven full screens, each with one job, an arrow at the foot of every
   one and a tappable progress rail. Every word here comes from the
   editor; the panels reuse the same content the desktop page uses.
   ============================================================ */
(function phoneReel(){
  const reel = $('#phoneReel');
  if(!reel) return;
  const M = COPY.mobileHome || {};
  if(M.on === false) return;

  const svg = up => `<span aria-hidden="true"><svg width="13" height="15" viewBox="0 0 14 16"
      fill="none" stroke="currentColor" stroke-width="1.1"><path d="${
      up ? 'M7 15V2M2 6.5 7 1.5 12 6.5' : 'M7 1v13M2 9.5 7 14.5 12 9.5'}"/></svg></span>`;

  const featured = CASES.filter(c => c.featured).slice(0, 4);
  const metrics  = (HOME_METRICS || []).slice(0, 3);
  const quote    = ((COPY.testimonials || {}).items || [])[0] || null;
  const hero     = COPY.hero || {};
  const cta      = COPY.cta  || {};

  const card = c => {
    const src = caseImg(c.slug).card;
    const m = (c.metrics || [])[0] || {};
    return `<a class="pcard" href="${U(F.work, c.slug)}">
      ${src ? pic(src, '', strip(c.client)) : ph('r916','Replace — case image')}
      <span class="pcard__in">
        <span class="pcard__fig">${m.fig || ''}</span>
        <span class="pcard__lab">${m.lab || ''}</span>
        <span class="pcard__name">${c.client}</span>
      </span></a>`;
  };

  reel.innerHTML = `
  <section class="ppanel ppanel--door" data-tone="dark">
    <div class="pfilm">
      <video src="${window.asset(VIDEO)}" poster="${window.asset(POSTER)}"
             autoplay muted loop playsinline aria-hidden="true"></video>
    </div>
    <div class="ppanel__in">
      <h2 class="pdoor__h">${['line1','line2','line3'].map(k=>`<em>${hero[k]||''}</em>`).join('')}</h2>
      <p class="pdoor__lede">${hero.ledePhone || hero.lede || ''}</p>
    </div>
  </section>

  <section class="ppanel ppanel--claim">
    <div class="ppanel__in">
      <span class="label">${M.claimLabel || ''}</span>
      <p class="pclaim">${M.claim || ''}</p>
    </div>
    <svg class="pseal" viewBox="0 0 120 120" aria-hidden="true">
      <defs><path id="pring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs>
      <text><textPath href="#pring">glasshouse · glasshouse · glasshouse · glasshouse · </textPath></text>
    </svg>
  </section>

  <section class="ppanel ppanel--proof">
    <div class="ppanel__in">
      <span class="label">${(COPY.proof||{}).label||''} — ${(COPY.proof||{}).sublabel||''}</span>
      ${metrics.map(m=>`<div class="pstat"><b>${m.fig}</b><span>${m.lab}</span></div>`).join('')}
    </div>
  </section>

  <section class="ppanel ppanel--work" data-tone="dark">
    <div class="ppanel__in">
      <span class="label">${M.workLabel || ''}</span>
      <h2 class="pwork__h">${M.workHeading || ''}</h2>
    </div>
    <div class="pcards">${featured.map(card).join('')}</div>
    <div class="ppanel__in"><a class="btn pbtn--ghost" href="${U(F.work)}">
      <span>${M.workButton || 'See all work'}</span><span class="arrow" aria-hidden="true">→</span></a></div>
  </section>

  ${quote ? `<section class="ppanel ppanel--voice">
    <div class="ppanel__in">
      <span class="label">${M.voiceLabel || ''}</span>
      <blockquote class="pquote">${quote.quote || ''}</blockquote>
      ${quote.attrib ? `<p class="label pquote__who">${quote.attrib}</p>` : ''}
    </div>
  </section>` : ''}

  <section class="ppanel ppanel--does">
    <div class="ppanel__in">
      <span class="label">${M.doesLabel || ''}</span>
      <ul class="pdoes">${SERVICES.map((s,i)=>`<li><a href="${U(F.services,s.slug)}">
        <i>${String(i+1).padStart(2,'0')}</i><span>${s.title}</span><b>→</b></a></li>`).join('')}</ul>
    </div>
  </section>

  <section class="ppanel ppanel--invite" data-tone="dark">
    <div class="ppanel__in">
      <h2 class="pinvite__h">${cta.heading || ''}</h2>
      <p><a class="btn pbtn--cream" href="${U('contact')}"><span>${cta.button || ''}</span>
        <span class="arrow" aria-hidden="true">→</span></a></p>
      <p class="pmail">${cta.mailPrefix || ''}
        <a href="mailto:${COPY.contactEmail||''}">${COPY.contactEmail||''}</a></p>
    </div>
  </section>`;

  const panels = $$('.ppanel', reel);
  const labels = [M.arrowDoor, M.arrowClaim, M.arrowProof, M.arrowWork,
                  M.arrowVoice, M.arrowDoes, M.arrowInvite].filter(Boolean);

  /* one arrow at the foot of every panel, always in the same place */
  panels.forEach((p,i)=>{
    const last = i === panels.length - 1;
    const b = document.createElement('button');
    b.className = 'pnext'; b.type = 'button';
    const text = labels[i] || (last ? 'Back to top' : 'Next');
    b.setAttribute('aria-label', last ? 'Back to the top' : 'Next: ' + text);
    b.innerHTML = `<em>${text}</em>${svg(last)}`;
    b.addEventListener('click', ()=> window.scrollTo({
      top: last ? 0 : panels[i+1].offsetTop, behavior: reduce ? 'auto' : 'smooth'}));
    p.appendChild(b);
  });

  /* the rail: where you are, and a way to skip */
  const rail = document.createElement('nav');
  rail.className = 'prail'; rail.setAttribute('aria-label','Sections of this page');
  rail.innerHTML = panels.map((p,i)=>
    `<button type="button" aria-label="Go to: ${labels[i]||('section '+(i+1))}"><span><b></b></span></button>`).join('');
  reel.prepend(rail);
  const fills = $$('b', rail);
  $$('button', rail).forEach((btn,i)=> btn.addEventListener('click',
    ()=> window.scrollTo({top: panels[i].offsetTop, behavior: reduce ? 'auto' : 'smooth'})));

  let last = 0;
  const nav = document.querySelector('.mullion') || document.querySelector('header');
  const tick = ()=>{
    const y = window.scrollY, vh = window.innerHeight;
    panels.forEach((p,i)=>{
      const prog = Math.min(1, Math.max(0, (y + vh*0.55 - p.offsetTop) / p.offsetHeight));
      if(fills[i]) fills[i].style.width = (prog*100) + '%';
    });
    const here = panels.find(p=>{const r=p.getBoundingClientRect(); return r.top<=80 && r.bottom>80;});
    const dark = here && here.dataset.tone === 'dark';
    document.body.classList.toggle('reel-dark', !!dark);
    if(y > vh*0.6) document.body.classList.toggle('reel-tuck', y > last + 4);
    else document.body.classList.remove('reel-tuck');
    last = y;
  };
  window.addEventListener('scroll', tick, {passive:true});
  window.addEventListener('resize', tick);

  /* only on a phone, and only on the homepage */
  const apply = ()=>{
    const on = onPhone.matches && document.querySelector('.route[data-route="home"]').classList.contains('active');
    reel.hidden = !on;
    document.body.classList.toggle('has-reel', on);
    if(on) tick(); else document.body.classList.remove('reel-dark','reel-tuck');
  };
  apply();
  onPhone.addEventListener ? onPhone.addEventListener('change', apply) : onPhone.addListener(apply);
  window.addEventListener('popstate', ()=> setTimeout(apply, 60));
  document.addEventListener('click', ()=> setTimeout(apply, 60));
})();


});
