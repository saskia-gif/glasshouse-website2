/* ============================================================
   The editor, arranged the way the site is — one entry per page.

   Each page pulls its content from wherever it actually lives, so you edit
   "the About page" rather than hunting through four files. `from` is a section
   id in schema.js; `keys` narrows it to some of that section's fields.
   ============================================================ */
export const PAGES = [
  {
    id: 'p-home', name: 'Home', url: '/',
    parts: [
      {from:'copy', title:'Text on this page', keys:['hero','proof','intro','work','testimonials','phone','cta','homeWall','mobileHome']},
      {from:'metrics', title:'The three numbers'},
      {from:'cases', title:'Case studies shown here', note:'The homepage shows the ones marked “Show on the homepage”.'},
      {from:'seopages', pageKey:'home', title:'SEO — this page'}
    ]
  },
  {
    id: 'p-work', name: 'Work', url: '/work/',
    parts: [
      {from:'copy', title:'Text on this page', keys:['workPage']},
      {from:'cases', title:'Case studies'},
      {from:'seopages', pageKey:'work', title:'SEO — this page'}
    ]
  },
  {
    id: 'p-services', name: 'Services', url: '/services/',
    parts: [
      {from:'copy', title:'Text on this page', keys:['servicesPage']},
      {from:'services', title:'The services'},
      {from:'servicedetail', title:'Each service page'},
      {from:'faq', title:'FAQ'},
      {from:'seopages', pageKey:'services', title:'SEO — this page'}
    ]
  },
  {
    id: 'p-about', name: 'About', url: '/about/',
    parts: [
      {from:'copy', title:'Text on this page', keys:['aboutPage']},
      {from:'team', title:'Team'},
      {from:'values', title:'How we work'},
      {from:'facts', title:'At a glance'},
      {from:'seopages', pageKey:'about', title:'SEO — this page'}
    ]
  },
  {
    id: 'p-journal', name: 'Journal', url: '/journal/',
    parts: [
      {from:'copy', title:'Text on this page', keys:['journalPage']},
      {from:'journal', title:'Articles'},
      {from:'seopages', pageKey:'journal', title:'SEO — this page'}
    ]
  },
  {
    id: 'p-careers', name: 'Careers', url: '/careers/',
    parts: [
      {from:'copy', title:'Text on this page', keys:['careersPage']},
      {from:'vacancies', title:'Open roles'},
      {from:'seopages', pageKey:'careers', title:'SEO — this page'}
    ]
  },
  {
    id: 'p-contact', name: 'Contact', url: '/contact/',
    parts: [
      {from:'copy', title:'Text on this page', keys:['contactPage','contactEmail','social','knock']},
      {from:'seopages', pageKey:'contact', title:'SEO — this page'}
    ]
  }
];

/* Things that belong to the whole site rather than one page. */
export const SITEWIDE = [
  {id:'images',        name:'Pictures & film'},
  {id:'seosite',       name:'SEO — site & schema'},
  {id:'seoredirects',  name:'SEO — redirects'},
  {id:'seorobots',     name:'SEO — robots.txt'},
  {id:'copy',          name:'All shared text', note:'Everything above, in one list. Useful for finding a stray line.'}
];
