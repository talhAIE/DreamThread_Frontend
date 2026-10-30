import { art, chapters } from '../data/fixtures.js';
import { tags, sourceRow, icon, escapeHTML } from '../components/ui.js';

export function detail(dream,linked=[]) {
  const original = dream.original || dream.excerpt;
  const reading = dream.reading || 'No interpretation is available for this demo entry.';
  const connectedSources = dream.local?linked.map(d=>({id:d.id,title:d.title,date:d.date==='2026-10-26'?'Oct 26':d.date==='2026-09-30'?'Sep 30':'Aug 18',image:d.art})):dream.id==='01' ? [
    {id:'04',title:'Somebody was calling my name.',date:'Sep 30',image:'house',quote:true},
    {id:'09',title:'An old house at the end of the path.',date:'Aug 18',image:'forest',quote:true},
  ] : ['04','09'].includes(dream.id) ? [
    {id:'01',title:'The house in the forest',date:'Oct 26',image:'house'},
    {id:dream.id==='04'?'09':'04',title:dream.id==='04'?'Rooms that keep changing':'A knock at the front door',date:dream.id==='04'?'Aug 18':'Sep 30',image:dream.id==='04'?'forest':'door'},
  ] : [];
  const motif = dream.motif || (dream.id==='06'?'house':dream.art);
  return `<section class="detail-grid"><div class="column"><img class="detail-hero" src="${art[dream.art]}" alt="${escapeHTML(dream.title)}"><section class="panel panel-pad original"><h3>Original entry</h3><p>${escapeHTML(original)}</p>${dream.original?'':'<p class="small muted">Only this excerpt is supplied in the design.</p>'}${dream.local?'<span class="local-entry-note">Saved locally · your original words are preserved.</span>':''}</section></div>
    <div class="column"><section class="panel panel-pad reading ${dream.local?'local-reading':''}"><h3>Possible reading${dream.local?' · demo':''}</h3><p>${escapeHTML(reading)}</p>${tags([...dream.tags,...(dream.id==='01'?['Fear']:dream.emotions.slice(0,1))])}</section>
      <section class="panel panel-pad connected"><h3>Connected dreams</h3>${connectedSources.length?connectedSources.map(sourceRow).join(''):'<p class="muted small">No connected entry details were supplied for this demo dream.</p>'}<a class="button full" href="#/constellation?motif=${motif}">Open in constellation ${icon('7c658')}</a></section></div></section>`;
}

export function storyline(story=null) {
  return `<section class="chapter-grid" aria-label="The house storyline">${(story?.chapters || chapters).map(c=>`<article class="chapter"><div class="chapter-card panel"><a href="#/dream/${c.id}" class="card-image" aria-label="Read ${escapeHTML(c.title)}"><img src="${art[c.art]}" alt="" data-art="${c.art}"></a><div class="chapter-copy"><time>${c.date}</time><h3><a href="#/dream/${c.id}">${c.title}</a></h3><p>${c.text}</p>${tags([c.emotion])}</div></div></article>`).join('')}</section><section class="panel emotional-arc"><h3>Emotional arc</h3><div class="arc-slot" role="img" aria-label="Emotional arc from fear in August through unease in September to calm in October"><div class="arc-drawing"><img src="assets/figma/61ea1.svg" alt=""></div></div></section>`;
}
