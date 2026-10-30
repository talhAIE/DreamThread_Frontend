import { art } from '../data/fixtures.js';
import { escapeHTML, icon, dateText } from '../components/ui.js';

const quotes={'01':'The windows were lit.','04':'Calling my name.','09':'A house with no stairs.'};
export function citationCard(d,highlight=false) {
  return `<a class="panel cited-entry ${highlight?'highlighted':''}" href="#/dream/${d.id}?from=detective" data-citation="${d.id}" aria-label="Open cited entry ${escapeHTML(d.title)}"><img src="${art[d.art]}" alt=""><div><p class="small muted">${dateText(d.date,false)} · ${d.local?'Local entry':'#'+d.id}</p><strong>${escapeHTML(d.title)}</strong><p class="small muted">“${escapeHTML(quotes[d.id] || d.excerpt)}”</p></div></a>`;
}
export function citedEntries(d,dreams) {
  const ids=d.sources;
  return `<h3>Cited entries</h3>${ids.length?ids.map(id=>dreams.find(x=>x.id===id)).filter(Boolean).map(entry=>citationCard(entry,d.highlight===entry.id)).join(''):'<section class="panel panel-pad"><p class="muted small">This answer has no supporting sample entries. Try a question about a motif in your journal.</p></section>'}`;
}
export function detective(d,dreams) {
  return `<section class="detective-grid"><section class="panel chat-panel" aria-label="Dream Detective conversation"><div class="chat-messages" role="log" aria-label="Conversation messages" aria-live="polite">${d.messages.map(m=>m.role==='user'?`<div class="message-user">${escapeHTML(m.text)}</div>`:`<article class="message-assistant"><p>${escapeHTML(m.text)}</p>${m.sources?.length?`<div class="chat-citations row"><span class="small muted">Sources</span>${m.sources.map(id=>`<a class="tag citation-pill" href="#/dream/${id}?from=detective" data-citation="${id}" aria-label="Read cited dream ${id}">#${id}</a>`).join('')}</div>`:''}${m.followup?`<p class="chat-followup">${escapeHTML(m.followup)}</p>`:''}</article>`).join('')}${d.busy?'<p class="muted small" role="status">Looking through the demo entries…</p>':''}</div>
    <p class="form-error" role="alert">${escapeHTML(d.error || '')}</p><form class="chat-composer" id="detective-form"><label class="sr-only" for="detective-question">Ask a question about your dream history</label><input id="detective-question" maxlength="1000" placeholder="Ask a question…" value="${escapeHTML(d.input || '')}" autocomplete="off" required><button class="chat-send" aria-label="Send question" ${d.busy?'disabled':''}>${icon('8508c')}</button></form><p class="small muted detective-demo-note">Demo conversation · replies use sample entries. No live AI service is connected.</p></section>
    <aside class="cited-entries" aria-label="Sources cited by Dream Detective">${citedEntries(d,dreams)}</aside>
  </section>`;
}
