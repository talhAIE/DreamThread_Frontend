import { dreamCard, icon, emptyResults, escapeHTML } from '../components/ui.js';
import { state } from '../state.js';

export function journal(dreams, motif = '') {
  const filtered = state.query || state.days || state.emotion || motif;
  return `<div class="journal-toolbar"><nav class="journal-tabs" aria-label="Journal views"><a class="${!state.memory?'active':''}" href="#/journal" ${!state.memory?'aria-current="page"':''}>All dreams</a><a href="#/storyline/house">Storylines</a><a class="${state.memory?'active':''}" href="#/journal?tab=memory" ${state.memory?'aria-current="page"':''}>Personal memory</a></nav>
    <div class="filters"><details class="date-filter"><summary class="filter-control" aria-label="Filter dreams by date">${escapeHTML(state.dateLabel)} ▾</summary><div class="filter-options"><button data-days="all">All dates</button><button data-days="30">Last 30 days</button><button data-days="90">Last 90 days</button></div></details><label class="sr-only" for="emotion">Filter by emotion</label><select id="emotion"><option value="">Emotion ▾</option>${['Fear','Calm','Curious','Uneasy'].map(e=>`<option ${state.emotion===e?'selected':''}>${e}</option>`).join('')}</select><a class="button primary compact" href="#/capture">${icon('37bc7')}New dream</a></div></div>
    ${filtered?`<div class="filter-summary"><span>${dreams.length} ${dreams.length===1?'dream':'dreams'}${motif?' · '+escapeHTML(motif):''}</span><button class="text-link" data-action="clear-filters">Clear filters</button></div>`:''}
    <section class="dream-grid journal-grid" aria-label="${state.memory?'Personal memory':'Dream journal'}">${dreams.length?dreams.map(d=>dreamCard(d,state.saved.has(d.id))).join(''):emptyResults(state.memory)}</section>`;
}
