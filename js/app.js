/* ============================================================
   GLASSHOUSE — behaviour
   Runs once the content in /content has loaded.
   ============================================================ */
window.contentReady.then(() => {

/* ============================================================
   APP — routing, rendering, motion
   ============================================================ */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const onPhone=window.matchMedia('(max-width:700px)');
let curtainUp=reduce;   /* true once the loading sequence has cleared */
const counted=new WeakSet();
let metricIO=null;
let io=null;  /* scroll-reveal observer — declared here because renderCards() uses it on first paint */
const brief=(cls,tag,note)=>`<div class="ph brief ${cls}" role="img" aria-label="Placeholder: ${note}"><span class="brief__in"><span class="label">${tag}</span><p>${note}</p></span></div>`;
const pic=(src,cls,alt='')=>`<img class="pic ${cls}" src="${src}" alt="${alt}" loading="lazy" decoding="async">`;
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
  if(reduce){l.classList.add('done');return;}
  document.body.style.overflow='hidden';
  let finished=false;
  const finish=()=>{if(finished)return;finished=true;l.classList.add('out');
    setTimeout(()=>{
      l.classList.add('done');document.body.style.overflow='';
      curtainUp=true;flushMetrics();
    },600);};
  setTimeout(finish,2600);
  l.addEventListener('click',finish);
  document.addEventListener('keydown',finish,{once:true});
})();

/* ---- hero ---- */
$('#heroWindows').innerHTML=`
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
  const film=$('.phone-wrap'), hero=$('#heroWindows'), below=$('#heroBg');
  if(!film||!hero||!below)return;
  const target=onPhone.matches?below:hero;
  if(film.parentNode!==target)target.appendChild(film);
}
onPhone.addEventListener?onPhone.addEventListener('change',placeFilm):onPhone.addListener(placeFilm);

/* the wall of work — real client stills, moving slowly */
const WALL=[IMG.gigiA,IMG.caroA,IMG.graceA,IMG.hipA,IMG.simpleA,
            IMG.gigiB,IMG.caroB,IMG.graceB,IMG.hipB,IMG.simpleB].filter(Boolean);
$('#wall').innerHTML=[...WALL,...WALL].map(src=>pic(src,'r916','Client content')).join('');

const PH_GRID=[IMG.gigiA,IMG.caroA,IMG.graceA,IMG.hipA].filter(Boolean);
if($('#phGrid'))$('#phGrid').innerHTML=PH_GRID.map(src=>pic(src,'r45','Client content')).join('');

/* art-directed placeholders — what these frames should hold */
$('#introMedia').innerHTML=brief('r45','Placeholder — portrait 4:5',
  'A founder shot through glass, so the reflection sits over her. Daylight, no studio lighting, mid-conversation rather than posed.');

/* ---- home: work rows ---- */
$('#workRows').innerHTML=CASES.filter(c=>c.featured).map((c,i)=>`
  <a class="work-row" href="#/case/${c.slug}">
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
$('#homeMetrics').innerHTML=HOME_METRICS.map(metricHTML).join('');

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
$('#svcIndex').innerHTML=SERVICES.map((s,i)=>
  `<button data-go="svc-${s.slug}"><span class="svc-index__n">${String(i+1).padStart(2,'0')}</span>${s.title}</button>`).join('');

$('#svcBlocks').innerHTML=SERVICES.map((s,i)=>{
  const d=SERVICE_DETAIL[s.slug]||{caps:[],line:''};
  const c=d.proof&&CASES.find(x=>x.slug===d.proof);
  return `
  <article class="svc-block rv" id="svc-${s.slug}">
    <div class="svc-block__body">
      <span class="label">${String(i+1).padStart(2,'0')} — ${s.title}</span>
      <h2 class="display">${d.line}</h2>
      <p class="svc-block__note">${s.text}</p>
      <ul class="caps">${d.caps.map(c2=>`<li>${c2}</li>`).join('')}</ul>
      ${c?`<a class="svc-block__proof" href="#/case/${c.slug}">
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
$('#svcIndex').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return;
  const t=document.getElementById(b.dataset.go);
  if(t)window.scrollTo({top:window.scrollY+t.getBoundingClientRect().top-navH()-16,behavior:reduce?'auto':'smooth'});
});
$('#faq').innerHTML=FAQ.map((f,i)=>svcHTML({slug:'faq'+i,title:f.q,text:f.text},i,false)).join('');
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
$('#aboutFacts').innerHTML=ABOUT_FACTS.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

/* the window wall — four frames at different heights, like glazing */
$('#collage').innerHTML=[
  [IMG.studio,'c1','The studio'],[IMG.team4,'c2','In the room'],
  [IMG.team2,'c3','Filming'],[IMG.founder1,'c4','Founders']
].map(([src,cls,alt])=>`<figure class="${cls}">${pic(src,'',alt)}<figcaption>${alt}</figcaption></figure>`).join('');

/* three people, shown as equals — no hover mechanic to prop up a short list */
$('#people').innerHTML=TEAM.people.map(p=>`
  <article class="person rv">
    <div class="person__img">${imgPath(p.img)?pic(imgPath(p.img),'r45',p.name):ph('r45','Replace — portrait')}</div>
    <h3 class="display">${p.name}</h3>
    <span class="label">${p.role}</span>
    <p>${p.bio}</p>
    <p class="person__note">${p.note}</p>
    <div class="person__leads"><span class="label">Leads</span> ${p.leads.join(' · ')}</div>
  </article>`).join('');

$('#values').innerHTML=VALUES.map((v,i)=>`
  <div class="value rv"><span class="label">${String(i+1).padStart(2,'0')}</span>
  <h3 class="display">${v.t}</h3><p>${v.p}</p></div>`).join('');

/* ---- careers ---- */
$('#vacancies').innerHTML=VACANCIES.length?VACANCIES.map(v=>`
  <div class="vac rv"><div><h3 class="display">${v.role}</h3>
  <p style="color:var(--body-2);margin:.6rem 0 0;max-width:52ch;font-size:.92rem">${v.desc}</p>
  <p class="label">${v.location} — ${v.type}</p></div>
  <a class="btn" href="#/contact"><span>Apply</span><span class="arrow" aria-hidden="true">→</span></a></div>`).join('')
  :`<div class="empty"><p class="display lg">No open roles right now.</p><p style="color:var(--body-2);margin-top:.8rem">We still read every open application — tell us what you'd want to do here.</p><p style="margin-top:1.6rem"><a class="btn" href="#/contact"><span>Send one anyway</span><span class="arrow" aria-hidden="true">→</span></a></p></div>`;

/* ---- work index ---- */
const allServices=[...new Set(CASES.flatMap(c=>c.services))];
$('#workCount').textContent=`${CASES.length} case studies`;
$('#filters').innerHTML=['All',...allServices].map((f,i)=>`<button aria-pressed="${i===0}" data-f="${f}">${f}</button>`).join('');
function renderCards(filter='All'){
  const list=CASES.filter(c=>filter==='All'||c.services.includes(filter));
  $('#workCards').innerHTML=list.map(c=>`
    <a class="card rv" href="#/case/${c.slug}">
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
      <span class="card__cta">View case study <span class="arrow" aria-hidden="true">→</span></span>
    </a>`).join('');
  observeReveals();
}
renderCards();
$('#filters').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  $$('#filters button').forEach(x=>x.setAttribute('aria-pressed',x===b));
  renderCards(b.dataset.f);
});

/* ---- journal ---- */
const feat=JOURNAL.find(a=>a.featured)||JOURNAL[0];
$('#jrnFeature').innerHTML=`<a class="feature rv" href="#/journal/${feat.slug}">
  <span class="jrn__frame">${jrnImg(feat)?pic(jrnImg(feat),'r32',feat.title):ph('r32','Replace — journal image')}</span>
  <span><span class="label">${(COPY.journalPage&&COPY.journalPage.featuredPrefix)||'Featured'} — ${feat.category}</span>
  <h2 class="display lg" style="margin:1rem 0 .8rem">${feat.title}</h2>
  <span style="color:var(--body-2);display:block;max-width:44ch">${feat.excerpt}</span>
  <span class="label" style="display:block;margin-top:1.4rem">${feat.date}</span>
  <span class="card__cta" style="padding-top:1rem">${(COPY.journalPage&&COPY.journalPage.readMore)||'Read the piece'} <span class="arrow" aria-hidden="true">→</span></span></span></a>`;
const cats=[...new Set(JOURNAL.map(a=>a.category))];
$('#jrnFilters').innerHTML=['All',...cats].map((f,i)=>`<button aria-pressed="${i===0}" data-f="${f}">${f}</button>`).join('');
function renderJournal(filter='All'){
  $('#jrnGrid').innerHTML=JOURNAL.filter(a=>!a.featured&&(filter==='All'||a.category===filter)).map(a=>`
    <a class="rv" href="#/journal/${a.slug}">
      <span class="jrn__frame">${jrnImg(a)?pic(jrnImg(a),'r32',a.title):ph('r32','Replace — journal image')}</span>
      <span class="jrn__meta"><span class="label">${a.category}</span><span class="label">${a.date}</span></span>
      <h3>${a.title}</h3>
      <p>${a.excerpt}</p>
      <span class="card__cta">${(COPY.journalPage&&COPY.journalPage.readShort)||'Read'} <span class="arrow" aria-hidden="true">→</span></span>
    </a>`).join('');
  observeReveals();
}
renderJournal();
$('#jrnFilters').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  $$('#jrnFilters button').forEach(x=>x.setAttribute('aria-pressed',x===b));
  renderJournal(b.dataset.f);
});

/* ---- case study template ---- */
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

  $('#caseRoot').innerHTML=`
  <div class="wrap sec cs-hero">
    <div class="sill"><a class="label" href="#/work" style="color:var(--fg)">← All work</a><span class="label">${c.period}</span></div>
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

  <a class="next-project" href="#/case/${next.slug}">
    <span class="label" style="color:var(--muted)">Next project</span>
    <span class="display xl" style="display:block;margin-top:1rem">${next.client}</span>
    <span class="label" style="display:block;margin-top:1.2rem;color:var(--muted)">${next.statement}</span>
  </a>`;
  return c;
}

/* ---- article template ---- */
function renderArticle(slug){
  const a=JOURNAL.find(x=>x.slug===slug)||JOURNAL[0];
  const rel=JOURNAL.filter(x=>x.slug!==a.slug).slice(0,3);
  const body=a.body.map(p=>{
    if(p.startsWith('Q:'))return `<blockquote>${p.slice(2)}</blockquote>`;
    if(p.startsWith('H:'))return `<h3>${p.slice(2)}</h3>`;
    return `<p>${p}</p>`;
  }).join('');
  $('#articleRoot').innerHTML=`
  <div class="wrap sec">
    <div class="sill"><a class="label" href="#/journal" style="color:var(--ink)">← Journal</a><span class="label">${a.category}</span></div>
    <h1 class="display xl" style="max-width:18ch">${a.title}</h1>
    <p class="label" style="margin-top:1.6rem">${a.author} — ${a.date}</p>
    <div style="margin-top:clamp(2rem,4vw,3rem)" class="rv-pane">${jrnImg(a)?pic(jrnImg(a),'r169',a.title):ph('r169','Replace — article image')}</div>
    <div class="article-body" style="margin-top:clamp(2.5rem,5vw,4rem)">
      <p class="lede" style="max-width:none">${a.excerpt}</p>${body}
    </div>
  </div>
  <section class="room room-sage"><div class="wrap sec">
    <div class="sill"><span class="label">Related reading</span></div>
    <div class="jrn">${rel.map(r=>`<a href="#/journal/${r.slug}">
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
function setMeta(t,d){document.title=t;const m=document.querySelector('meta[name=description]');if(m)m.setAttribute('content',d);}

function route(){
  const h=(location.hash||'#/').replace(/^#\/?/,'');
  const [seg,slug]=h.split('/');
  let name = seg===''?'home':seg;
  if(seg==='case'){name='case';const c=renderCase(slug);setMeta(`${c.client.replace(/&amp;/g,'&')} — case study | Glasshouse`,c.desc.replace(/&amp;/g,'&'));}
  else if(seg==='journal'&&slug){name='article';const a=renderArticle(slug);setMeta(`${a.title} | Glasshouse Journal`,a.excerpt);}
  else if(META[name])setMeta(META[name][0],META[name][1]);
  if(!$(`.route[data-route="${name}"]`))name='home';
  $$('.route').forEach(r=>r.classList.toggle('active',r.dataset.route===name));
  $$('.nav-links a').forEach(a=>{
    const target=a.getAttribute('href').replace('#/','')||'home';
    (target===name||(name==='case'&&target==='work')||(name==='article'&&target==='journal'))
      ? a.setAttribute('aria-current','page') : a.removeAttribute('aria-current');
  });
  closeMenu();
  window.scrollTo({top:0,behavior:'auto'});
  document.body.classList.remove('is-dark');
  requestAnimationFrame(()=>{observeReveals();updateInside();watchMetrics();activateRows();placeFilm();if(curtainUp)flushMetrics();});
}
window.addEventListener('hashchange',route);

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
$('#contactForm').addEventListener('submit',e=>{
  e.preventDefault();
  const f=e.target, msg=$('#formMsg');
  const missing=['name','email','message'].filter(n=>!f[n].value.trim());
  if(missing.length){msg.style.color='#B4544A';msg.textContent=`Add your ${missing.join(', ')} and we'll pick it up from there.`;f[missing[0]].focus();return;}
  msg.style.color='var(--sage)';
  msg.textContent='Thanks — this prototype does not send yet. Connect the form to your handler on build.';
});

/* ---- go ---- */
route();
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
    else if(a.getAttribute('href')==='#/contact'){ a.closest('li')?.remove(); }
  });

  observeReveals();
})();

});
