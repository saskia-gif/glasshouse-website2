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
        {key:'ledePhone', label:'Intro sentence — mobile', type:'area'}
      ]},
      {key:'proof', label:'Numbers section', type:'group', fields:[
        {key:'label', label:'Label', type:'text'},
        {key:'sublabel', label:'Sub-label', type:'text'}
      ]},
      {key:'work', label:'Selected work section', type:'group', fields:[
        {key:'label', label:'Label', type:'text'},
        {key:'sublabel', label:'Sub-label', type:'text'}
      ]},
      {key:'testimonials', label:'Testimonials', type:'group', fields:[
        {key:'label', label:'Label', type:'text'},
        {key:'quote1', label:'Quote', type:'area'}
      ]},
      {key:'cta', label:'Closing invitation', type:'group', fields:[
        {key:'heading', label:'Heading', type:'text'}
      ]},
      {key:'phone', label:'Mobile-only block', type:'group', fields:[
        {key:'workLine', label:'Line above the button', type:'text'},
        {key:'statement', label:'Closing statement', type:'area'}
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
      {key:'slug', label:'URL slug', type:'text'}
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
      {key:'excerpt', label:'Excerpt', type:'area'},
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
    id:'images', file:'content/images.json', title:'Pictures & video',
    hint:'Which file each name points at. Upload a new picture to replace one.',
    shape:'map'
  }
];
