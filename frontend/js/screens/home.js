import { icon, sourceRow, dreamCard, escapeHTML } from '../components/ui.js';
import { motifs } from '../data/fixtures.js';
import { state } from '../state.js';

export function evidence(motif = 'house',model=null,records=[]) {
  const m = (model?.motifs && Object.hasOwn(model.motifs,motif)?model.motifs[motif]:null) || motifs[motif] || motifs.house;
  const sources = {
    '01': { id:'01', title:'The house in the forest', date:'Oct 26, 2026', image:'house' },
    '04': { id:'04', title:'A knock at the front door', date:'Sep 30, 2026', image:'door' },
    '09': { id:'09', title:'Rooms that keep changing', date:'Aug 18, 2026', image:'stranger' },
    '02': { id:'02', title:'An ocean without edges', date:'Oct 21, 2026', image:'ocean' },
    '06': { id:'06', title:'A bright, quiet house', date:'Aug 30, 2026', image:'ocean' },
    '03': { id:'03', title:'The familiar stranger', date:'Oct 14, 2026', image:'stranger' },
    '05': { id:'05', title:'Paths between the pines', date:'Sep 12, 2026', image:'forest' },
  };
  for(const d of records.filter(d=>d.local))sources[d.id]={id:d.id,title:d.title,date:'Oct 30, 2026',image:d.art};
  const ids=[...m.ids.filter(id=>id.startsWith('local-')),...m.ids.filter(id=>!id.startsWith('local-'))].slice(0,3);
  const summary=m.count!==motifs[motif]?.count?`${m.label} appears in ${m.count} dreams.`:m.summary;
  return `<h3>${escapeHTML(m.heading)}</h3><p>${escapeHTML(summary)}</p>${ids.filter(id=>sources[id]).map(id=>sourceRow(sources[id])).join('')}<a class="button full" href="#/journal?motif=${motif}">View sources ${icon('7c658')}</a>`;
}

export function home(dreams,model=null) {
  const nodes=model?.motifs || motifs;
  return `<section class="home-top" aria-label="Capture and connections"><div class="record-card panel"><h2>Record a dream</h2><p>Capture what you remember.</p><a class="mic-halo" href="#/capture?mode=voice" aria-label="Record a dream">${icon('5d171')}</a><a href="#/capture?mode=voice" class="record-label">Tap to record</a><p class="or">or</p><a class="button full" href="#/capture?mode=text">${icon('c50b4')}Write instead</a></div>
    <div class="home-constellation panel"><h2>Your dream constellation</h2><div class="mini-network"><img class="connectors" src="assets/figma/91992.svg" alt="">${Object.entries(nodes).map(([key,m])=>`<button class="mini-node ${state.motif===key?'selected':''}" data-motif="${key}" aria-pressed="${state.motif===key}" aria-label="${m.label}, ${m.count} dreams"><span class="motif-image" data-art="${key}"></span><span class="node-name">${m.label}</span><span class="node-count">${m.count} dreams</span></button>`).join('')}</div><section class="home-evidence" aria-label="Selected motif sources">${evidence(state.motif,model,dreams)}</section></div></section>
    <div class="section-heading"><h2>Recent dreams</h2><a class="text-link" href="#/journal">View all</a></div><section class="dream-grid recent-grid" aria-label="Recent dreams">${dreams.slice(0,3).map(d=>dreamCard(d,state.saved.has(d.id))).join('')}</section>`;
}
