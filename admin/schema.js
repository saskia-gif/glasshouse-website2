/* ============================================================
   What the editor shows, and for which file.
   Add a field here and it appears in the editor.
   type: text | area | rich | bool | image | list | group
   ============================================================ */
export const SCHEMA = [
  {
    id:'copy', file:'content/copy.json', title:'Homepage & shared text',
    hint:'Headlines, intro lines and section labels.',
    shape:'object',
    fields:[
      {key:'hero', label:'Hero', type:'group', fields:[
        {key:'line1', label:'Headline line 1', type:'text'},
        {key:'line2', label:'Headline line 2', type:'text'},
        {key:'line3', label:'Headline line 3', type:'text'},
        {key:'lede', label:'Intro sentence — desktop', type:'area'},
        {key:'ledePhone', label:'Intro sentence — mobile', type:'area'},
        {key:'filmCaption', label:'Caption above the phone', type:'text'},
        {key:'ctaWork', label:'Button — see the work', type:'text'},
        {key:'ctaWorkPhone', label:'Button — mobile hero (scrolls down)', type:'text'},
        {key:'ctaContact', label:'Button — get in touch', type:'text'}
      ]},
      {key:'proof', label:'Numbers section', type:'group', fields:[
        {key:'label', label:'Label', type:'text'},
        {key:'sublabel', label:'Sub-label', type:'text'}
      ]},
      {key:'intro', label:'Homepage introduction', type:'group', fields:[
        {key:'statement', label:'Opening statement', type:'area'},
        {key:'para1', label:'Paragraph 1', type:'area'},
        {key:'para2', label:'Paragraph 2', type:'area'},
        {key:'closing', label:'Closing line', type:'area'},
        {key:'signoff', label:'Sign-off', type:'text'}
      ]},
      {key:'work', label:'Selected work section', type:'group', fields:[
        {key:'label', label:'Label', type:'text'},
        {key:'sublabel', label:'Sub-label', type:'text'}
      ]},
      {key:'testimonials', label:'Testimonials', type:'group', fields:[
        {key:'label', label:'Label', type:'text'},
        {key:'items', label:'Quotes', type:'list', of:'group', summary:'quote', fields:[
          {key:'quote', label:'Quote', type:'area'},
          {key:'attrib', label:'Who said it', type:'text'}
        ]}
      ]},
      {key:'phone', label:'Mobile-only block', type:'group', fields:[
        {key:'workLine', label:'Line above the button', type:'text'},
        {key:'statement', label:'Closing statement', type:'area'},
        {key:'contactCta', label:'Get in touch button (mobile)', type:'text'}
      ]},
      {key:'cta', label:'Closing invitation', type:'group', fields:[
        {key:'heading', label:'Heading', type:'text'},
        {key:'button', label:'Button', type:'text'},
        {key:'mailPrefix', label:'Text before the email', type:'text'}
      ]},
      {key:'workPage', label:'Work page', type:'group', fields:[
        {key:'label', label:'Label', type:'text'},
        {key:'heading', label:'Heading', type:'text'},
        {key:'allLabel', label:'First filter button', type:'text'},
        {key:'filters', label:'Filter buttons', type:'list', of:'group', summary:'label',
         help:'Add, remove and reorder the buttons on the Work page. Leave the whole list empty to build it automatically from the case studies.', fields:[
          {key:'label', label:'Button text', type:'text'},
          {key:'match', label:'Shows case studies with this service', type:'text',
           help:'Must match the Services text on your case studies. Separate several with commas.'}
        ]},
        {key:'countSuffix', label:'Words after the count', type:'text', help:'e.g. \u201ccase studies\u201d'},
        {key:'viewLabel', label:'Link text on each card', type:'text'},
        {key:'nextLabel', label:'Lower section label', type:'text'},
        {key:'nextHeading', label:'Lower section heading', type:'area'},
        {key:'nextButton', label:'Button', type:'text'}
      ]},
      {key:'servicesPage', label:'Services page', type:'group', fields:[
        {key:'label', label:'Label', type:'text'},
        {key:'sublabel', label:'Sub-label', type:'text'},
        {key:'heading', label:'Heading', type:'text'},
        {key:'lede', label:'Intro sentence', type:'area'},
        {key:'stepsLabel', label:'How it works — label', type:'text'},
        {key:'stepsSublabel', label:'How it works — sub-label', type:'text'},
        {key:'steps', label:'The three steps', type:'list', of:'group', summary:'title', fields:[
          {key:'n', label:'Number', type:'text', help:'e.g. 01'},
          {key:'title', label:'Title', type:'text'},
          {key:'text', label:'Description', type:'area'}
        ]},
        {key:'faqLabel', label:'FAQ label', type:'text'},
        {key:'faqHeading', label:'FAQ heading', type:'text'},
        {key:'faqNote', label:'FAQ note', type:'area'},
        {key:'faqButton', label:'FAQ button', type:'text'},
        {key:'ctaHeading', label:'Closing heading', type:'text'},
        {key:'ctaButton', label:'Closing button', type:'text'}
      ]},
      {key:'aboutPage', label:'About page', type:'group', fields:[
        {key:'label', label:'Label', type:'text'},
        {key:'sublabel', label:'Sub-label', type:'text'},
        {key:'heading', label:'Heading', type:'text'},
        {key:'lead', label:'Opening paragraph', type:'area'},
        {key:'para1', label:'Paragraph 1', type:'area'},
        {key:'para2', label:'Paragraph 2', type:'area'},
        {key:'signoff', label:'Sign-off', type:'text'},
        {key:'peopleLabel', label:'Team label', type:'text'},
        {key:'peopleSublabel', label:'Team sub-label', type:'text'},
        {key:'peopleNote', label:'Note under the team', type:'rich', help:'Links are allowed here'},
        {key:'valuesLabel', label:'Values label', type:'text'},
        {key:'ctaHeading', label:'Closing heading', type:'text'},
        {key:'ctaButton', label:'Closing button', type:'text'}
      ]},
      {key:'casePage', label:'Case study pages', type:'group', fields:[
        {key:'nextLabel', label:'Label above the next project', type:'text'},
        {key:'ctaLine', label:'Line above the button', type:'text'},
        {key:'ctaButton', label:'Button', type:'text'}
      ]},
      {key:'journalPage', label:'Journal page', type:'group', fields:[
        {key:'label', label:'Label', type:'text'},
        {key:'sublabel', label:'Sub-label', type:'text'},
        {key:'featuredPrefix', label:'Word before the category', type:'text'},
        {key:'readMore', label:'Featured link text', type:'text'},
        {key:'readShort', label:'Card link text', type:'text'}
      ]},
      {key:'careersPage', label:'Careers page', type:'group', fields:[
        {key:'label', label:'Label', type:'text'},
        {key:'sublabel', label:'Sub-label', type:'text'},
        {key:'heading', label:'Heading', type:'text'},
        {key:'para1', label:'Paragraph 1', type:'area'},
        {key:'para2', label:'Paragraph 2', type:'area'},
        {key:'image', label:'Photo', type:'image'},
        {key:'rolesLabel', label:'Open roles label', type:'text'},
        {key:'freelanceHeading', label:'Freelancers heading', type:'text'},
        {key:'freelanceText', label:'Freelancers text', type:'area'},
        {key:'openHeading', label:'Open applications heading', type:'text'},
        {key:'openText', label:'Open applications text', type:'area'},
        {key:'openButton', label:'Button', type:'text'}
      ]},
      {key:'contactPage', label:'Contact page', type:'group', fields:[
        {key:'label', label:'Label', type:'text'},
        {key:'sublabel', label:'Sub-label', type:'text'},
        {key:'heading', label:'Heading', type:'text'},
        {key:'lede', label:'Intro sentence', type:'area'},
        {key:'emailLabel', label:'Email label', type:'text'},
        {key:'socialLabel', label:'Social label', type:'text'},
        {key:'socialHandle', label:'Social handle', type:'text'},
        {key:'formNote', label:'Note under the form', type:'text'},
        {key:'formButton', label:'Form button', type:'text'}
      ]},
      {key:'social', label:'Social links', type:'group', fields:[
        {key:'instagram', label:'Instagram URL', type:'text'},
        {key:'tiktok', label:'TikTok URL', type:'text'},
        {key:'linkedin', label:'LinkedIn URL', type:'text', help:'Leave blank to hide the link'}
      ]},
      {key:'contactEmail', label:'Contact email', type:'text'},
      {key:'meta', label:'Search listing', type:'group', fields:[
        {key:'title', label:'Page title', type:'text'},
        {key:'description', label:'Description', type:'area'}
      ]}
    ]
  },
  {
    id:'metrics', file:'content/home-metrics.json', title:'The three numbers',
    hint:'Shown on the homepage under the hero. They count up on first view.',
    shape:'list', summary:'fig',
    fields:[
      {key:'fig', label:'Figure', type:'text', help:'e.g. 30M+ or 0 → 200K'},
      {key:'lab', label:'What it measures', type:'area'}
    ]
  },
  {
    id:'cases', file:'content/case-studies.json', title:'Case studies',
    hint:'The Work page and every case-study page.',
    shape:'list', summary:'client',
    fields:[
      {key:'client', label:'Client name', type:'text'},
      {key:'slug', label:'URL slug', type:'text', help:'lowercase, hyphens, no spaces'},
      {key:'featured', label:'Show on the homepage', type:'bool'},
      {key:'sector', label:'Sector', type:'text'},
      {key:'period', label:'Period', type:'text'},
      {key:'platforms', label:'Platforms', type:'text'},
      {key:'territory', label:'Territory', type:'text'},
      {key:'services', label:'Services', type:'list', of:'text'},
      {key:'card', label:'Card image', type:'image', help:'Shown on the Work page and homepage'},
      {key:'gallery', label:'Vertical images', type:'list', of:'image', help:'9:16. First one appears in the phone frame.'},
      {key:'statement', label:'One-line statement', type:'text'},
      {key:'desc', label:'Short description', type:'area'},
      {key:'brief', label:'The brief', type:'rich'},
      {key:'objective', label:'The objective', type:'rich'},
      {key:'strategy', label:'The strategy', type:'rich'},
      {key:'activity', label:'What we did', type:'rich'},
      {key:'metrics', label:'Results', type:'list', of:'group', fields:[
        {key:'fig', label:'Figure', type:'text'},
        {key:'lab', label:'What it measures', type:'text'}
      ]},
      {key:'seoTitle', label:'SEO — title tag', type:'text', help:'Blank uses the name above'},
      {key:'seoDescription', label:'SEO — meta description', type:'area', help:'Blank uses the short description'},
      {key:'robots', label:'SEO — robots', type:'select', options:['index, follow','noindex, follow','index, nofollow','noindex, nofollow']},
      {key:'canonical', label:'SEO — canonical URL', type:'text', help:'Blank points at itself'},
      {key:'prev', label:'SEO — rel=prev', type:'text'},
      {key:'next', label:'SEO — rel=next', type:'text'},
      {key:'quote', label:'Client quote', type:'area'},
      {key:'quoteBy', label:'Quote attribution', type:'text'}
    ]
  },
  {
    id:'services', file:'content/services.json', title:'Services',
    hint:'The list on the Services page.',
    shape:'list', summary:'title',
    fields:[
      {key:'title', label:'Service', type:'text'},
      {key:'text', label:'Description', type:'area'},
      {key:'slug', label:'URL slug', type:'text', help:'Becomes /services/<slug>/'},
      {key:'seoTitle', label:'SEO — title tag', type:'text', help:'Blank uses the name above'},
      {key:'seoDescription', label:'SEO — meta description', type:'area', help:'Blank uses the short description'},
      {key:'robots', label:'SEO — robots', type:'select', options:['index, follow','noindex, follow','index, nofollow','noindex, nofollow']},
      {key:'canonical', label:'SEO — canonical URL', type:'text', help:'Blank points at itself'},
      {key:'prev', label:'SEO — rel=prev', type:'text'},
      {key:'next', label:'SEO — rel=next', type:'text'}
    ]
  },
  {
    id:'journal', file:'content/journal.json', title:'Journal',
    hint:'Articles. Newest first.',
    shape:'list', summary:'title',
    fields:[
      {key:'title', label:'Title', type:'text'},
      {key:'slug', label:'URL slug', type:'text'},
      {key:'category', label:'Category', type:'text'},
      {key:'date', label:'Date', type:'text', help:'e.g. 12 June 2026'},
      {key:'author', label:'Author', type:'text'},
      {key:'featured', label:'Feature at the top', type:'bool'},
      {key:'img', label:'Image', type:'image'},
      {key:'excerpt', label:'Excerpt', type:'area'},
      {key:'seoTitle', label:'SEO — title tag', type:'text', help:'Blank uses the name above'},
      {key:'seoDescription', label:'SEO — meta description', type:'area', help:'Blank uses the short description'},
      {key:'robots', label:'SEO — robots', type:'select', options:['index, follow','noindex, follow','index, nofollow','noindex, nofollow']},
      {key:'canonical', label:'SEO — canonical URL', type:'text', help:'Blank points at itself'},
      {key:'prev', label:'SEO — rel=prev', type:'text'},
      {key:'next', label:'SEO — rel=next', type:'text'},
      {key:'body', label:'Article', type:'rich'}
    ]
  },
  {
    id:'team', file:'content/team.json', title:'Team',
    hint:'Who you\'ll work with, on the About page.',
    shape:'object',
    fields:[
      {key:'people', label:'People', type:'list', of:'group', summary:'name', fields:[
        {key:'name', label:'Name', type:'text'},
        {key:'role', label:'Role', type:'text'},
        {key:'bio', label:'Bio', type:'area'},
        {key:'img', label:'Photo', type:'image'},
        {key:'note', label:'Ask her about…', type:'text'},
        {key:'leads', label:'Accounts led', type:'list', of:'text'}
      ]}
    ]
  },
  {
    id:'vacancies', file:'content/vacancies.json', title:'Open roles',
    shape:'list', summary:'role',
    fields:[
      {key:'role', label:'Role', type:'text'},
      {key:'type', label:'Type', type:'text'},
      {key:'location', label:'Location', type:'text'},
      {key:'status', label:'Status', type:'text'},
      {key:'desc', label:'Description', type:'area'}
    ]
  },
  {
    id:'values', file:'content/values.json', title:'Values',
    shape:'list', summary:'t',
    fields:[
      {key:'t', label:'Value', type:'text'},
      {key:'p', label:'Description', type:'area'}
    ]
  },
  {
    id:'faq', file:'content/faq.json', title:'FAQ',
    shape:'list', summary:'q',
    fields:[
      {key:'q', label:'Question', type:'text'},
      {key:'text', label:'Answer', type:'rich'}
    ]
  },
  {
    id:'facts', file:'content/about-facts.json', title:'About — at a glance',
    hint:'Each row is a pair: label, then value.',
    shape:'list', summary:0,
    fields:[
      {key:0, label:'Label', type:'text'},
      {key:1, label:'Value', type:'text'}
    ]
  },
  {
    id:'servicedetail', file:'content/service-detail.json', title:'Service pages',
    hint:'The detail block under each service — the line, what it covers, and which case study it points at.',
    shape:'keyed',
    fields:[
      {key:'line', label:'Opening line', type:'area'},
      {key:'caps', label:'What it covers', type:'list', of:'text'},
      {key:'proof', label:'Case study slug', type:'text', help:'e.g. gigi-clothing'},
      {key:'img', label:'Image', type:'image'}
    ]
  },
  {
    id:'seopages', file:'content/seo.json', title:'SEO — pages',
    hint:'Title, description and indexing for each main page. Case studies, services and journal posts carry their own SEO on their own records.',
    shape:'object',
    fields:[
      {key:'pages', label:'Pages', type:'list', of:'group', summary:'name', fields:[
        {key:'name', label:'Page', type:'text'},
        {key:'path', label:'URL path', type:'text', help:'e.g. /services/ — keep the slashes'},
        {key:'title', label:'Title tag', type:'text', help:'Aim for 50–60 characters'},
        {key:'description', label:'Meta description', type:'area', help:'Aim for 140–155 characters'},
        {key:'robots', label:'Robots', type:'select', options:['index, follow','noindex, follow','index, nofollow','noindex, nofollow']},
        {key:'canonical', label:'Canonical URL', type:'text', help:'Leave blank to point at itself, which is almost always right'},
        {key:'breadcrumb', label:'Breadcrumb label', type:'text'},
        {key:'prev', label:'rel=prev URL', type:'text'},
        {key:'next', label:'rel=next URL', type:'text'}
      ]}
    ]
  },
  {
    id:'seosite', file:'content/seo.json', title:'SEO — site & schema',
    hint:'Domain, folder names, business details and which structured data to output.',
    shape:'object',
    fields:[
      {key:'site', label:'Site', type:'group', fields:[
        {key:'domain', label:'Domain', type:'text', help:'e.g. https://theglasshouse.agency — no trailing slash'},
        {key:'basePath', label:'Sub-folder', type:'text', help:'Blank for a domain root; /glasshouse-website2 on github.io'},
        {key:'titleTemplate', label:'Title template', type:'text', help:'%s is the page title'},
        {key:'defaultDescription', label:'Fallback description', type:'area'},
        {key:'shareImage', label:'Share image', type:'image'}
      ]},
      {key:'folders', label:'Folder names', type:'group',
       help:'Changes the URL of a whole section. Set up redirects before changing one.', fields:[
        {key:'work', label:'Case studies live under', type:'text'},
        {key:'services', label:'Services live under', type:'text'},
        {key:'journal', label:'Journal lives under', type:'text'}
      ]},
      {key:'organisation', label:'Business details', type:'group',
       help:'Used for the organisation structured data on every page.', fields:[
        {key:'type', label:'Type', type:'select', options:['ProfessionalService','LocalBusiness','Organization','MarketingAgency']},
        {key:'name', label:'Name', type:'text'},
        {key:'legalName', label:'Registered name', type:'text'},
        {key:'description', label:'Description', type:'area'},
        {key:'email', label:'Email', type:'text'},
        {key:'telephone', label:'Telephone', type:'text'},
        {key:'street', label:'Street', type:'text'},
        {key:'city', label:'City', type:'text'},
        {key:'region', label:'Region', type:'text'},
        {key:'postcode', label:'Postcode', type:'text'},
        {key:'country', label:'Country code', type:'text', help:'e.g. GB'},
        {key:'priceRange', label:'Price range', type:'text', help:'e.g. \u00a3\u00a3'},
        {key:'foundingDate', label:'Founded', type:'text', help:'e.g. 2021'}
      ]},
      {key:'schema', label:'Structured data', type:'group', fields:[
        {key:'organisation', label:'Business schema on every page', type:'bool'},
        {key:'breadcrumbs', label:'Breadcrumb schema', type:'bool'},
        {key:'services', label:'Service schema on service pages', type:'bool'},
        {key:'caseStudies', label:'CreativeWork schema on case studies', type:'bool'},
        {key:'articles', label:'Article schema on journal posts', type:'bool'},
        {key:'faq', label:'FAQ schema on the services page', type:'bool'},
        {key:'product', label:'Also mark services as Product', type:'bool',
         help:'Off by default. You sell services, and Product markup on a non-product can be flagged as misleading.'},
        {key:'productCurrency', label:'Product currency', type:'text'}
      ]}
    ]
  },
  {
    id:'seoredirects', file:'content/seo.json', title:'SEO — redirects',
    hint:'Point an old address at a new one. On GitHub Pages these are instant client-side redirects with a canonical, not true 301s \u2014 moving to Cloudflare Pages or Netlify would make them real 301s with no other change.',
    shape:'object',
    fields:[
      {key:'redirects', label:'Redirects', type:'list', of:'group', summary:'from', fields:[
        {key:'from', label:'Old path', type:'text', help:'e.g. /old-services/'},
        {key:'to', label:'Goes to', type:'text', help:'e.g. /services/ or a full https:// address'},
        {key:'note', label:'Why', type:'text'}
      ]}
    ]
  },
  {
    id:'seoalt', file:'content/seo.json', title:'SEO — image alt text',
    hint:'What each picture shows, for screen readers and image search. Written once per file and used everywhere that picture appears.',
    shape:'object',
    fields:[
      {key:'alt', label:'Alt text by file', type:'altmap'}
    ]
  },
  {
    id:'seorobots', file:'content/seo.json', title:'SEO — robots.txt',
    hint:'Served at /robots.txt. {{SITEMAP}} is replaced with the real sitemap address when the site builds.',
    shape:'object',
    fields:[
      {key:'robotsTxt', label:'robots.txt', type:'rich'}
    ]
  },
  {
    id:'images', file:'content/images.json', title:'Pictures & film',
    hint:'Upload everything here, then pick it on whichever page you want it. Renaming a file updates every page that uses it.',
    shape:'map'
  }
];
