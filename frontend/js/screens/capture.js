import { icon, tag, escapeHTML, sourceRow } from '../components/ui.js';
import { SAMPLE_TRANSCRIPT } from '../data/local-repository.js';

export function newCapture(mode='voice',draft=null) {
  const base={mode,status:mode==='text'?'writing':'listening',elapsed:72,original:mode==='text'?'':SAMPLE_TRANSCRIPT,
    emotions:mode==='text'?[]:['Fear','Curious','Alone'],title:'',interview:null,analysis:null,error:'',busy:false,running:false};
  if (draft && typeof draft.original==='string') Object.assign(base,{original:draft.original,title:typeof draft.title==='string'?draft.title:'',
    emotions:Array.isArray(draft.emotions)?draft.emotions.filter(e=>typeof e==='string').slice(0,10):[],interview:draft.interview || null,
    status:mode==='text'?'writing':'stopped',elapsed:Number.isFinite(draft.elapsed)?Math.max(0,draft.elapsed):0});
  return base;
}
export function captureClock(c) {
  const time=String(Math.floor(c.elapsed/60)).padStart(2,'0')+':'+String(c.elapsed%60).padStart(2,'0');
  return c.status==='writing'?'Write what you remember':`${c.status==='listening'?'Listening':c.status==='idle'?'Ready to record':'Stopped'} · ${time}`;
}
export function capture(c) {
  const result=c.analysis;
  const themes=result?.themes || ['Being watched','A familiar place','Forest at night','Unanswered calls'];
  return `<section class="capture-grid">
    <section class="panel capture-editor" aria-label="Dream capture">
      <div class="capture-body">
        <button class="capture-mic ${c.running?'is-running':''}" data-action="capture-toggle" aria-label="${c.status==='listening'?'Stop simulated recording':'Start simulated recording'}" title="Simulated recording — no microphone is used">${icon('e30f3')}</button>
        <div class="waveform ${c.running?'is-running':''}" aria-hidden="true">${[10,24,16,38,22,44,28,18,40,26,14,34,20,30,12,22,36,16,26,10].map((h,i)=>`<i style="--bar-height:${h}px;--bar-delay:${i*.07}s"></i>`).join('')}</div>
        <p class="capture-clock muted" id="capture-clock">${captureClock(c)}</p>
        <label class="sr-only" for="transcript">Original dream entry</label><textarea id="transcript" class="transcript" maxlength="20000" placeholder="Write what you remember. Your original words stay yours." spellcheck="true">${escapeHTML(c.original)}</textarea>
        <div class="capture-feelings tags" aria-label="Dream feelings">${c.emotions.map(e=>`<button class="feeling" data-remove-feeling="${escapeHTML(e)}" aria-label="Remove ${escapeHTML(e)} feeling">${tag(e)}</button>`).join('')}<details class="feeling-picker"><summary class="text-link">+ Add feeling</summary><div class="filter-options">${['Fear','Curious','Alone','Calm','Uneasy','Joy','Wonder'].filter(e=>!c.emotions.includes(e)).map(e=>`<button data-add-feeling="${e}">${e}</button>`).join('')}</div></details></div>
        <button class="button primary full analyze-button" data-action="capture-analyze" ${c.busy?'disabled':''}>${c.busy?'Analyzing demo…':'Analyze dream'}</button>
        <p class="form-error" role="alert">${escapeHTML(c.error)}</p>
        ${result?`<section class="capture-save"><p class="small muted">Demo reading ready. Your original entry will be saved unedited.</p><label for="dream-title">Dream title</label><input id="dream-title" maxlength="120" value="${escapeHTML(c.title)}" placeholder="Give this dream a title"><p class="small muted">${escapeHTML(result.reading)}</p><button class="button primary full" data-action="capture-save" ${c.busy?'disabled':''}>Save dream</button></section>`:''}
      </div>
      <div class="capture-footer"><p class="small muted">Simulated recording and analysis. No audio is captured.</p><div class="row"><a class="text-link" href="#/capture?mode=${c.mode==='text'?'voice':'text'}">${c.mode==='text'?'Use voice demo':'Write instead'}</a><button class="text-link" data-action="capture-new">New draft</button><button class="text-link" data-action="capture-sample">Use sample</button></div><p class="small muted" id="draft-status" aria-live="polite"></p></div>
    </section>
    <aside class="column capture-sidebar" aria-label="Dream reflection">
      <section class="panel panel-pad interviewer"><h3>Dream Interviewer</h3><p class="interview-question">${escapeHTML(result?.question || 'Does this house feel familiar to you?')}</p><div class="row interview-choices">${['Yes, I know it','Not sure','Skip'].map(answer=>`<button class="chip ${c.interview===answer?'selected':''}" data-interview="${answer}" aria-pressed="${c.interview===answer}">${answer}</button>`).join('')}</div>${c.interview?'<p class="small muted">Noted. Your original words stay unchanged.</p>':''}</section>
      <section class="panel panel-pad possible-themes"><h3>Possible themes</h3><p class="small muted">Tentative. You decide what fits.</p><div class="tags">${themes.map(tag).join('')}</div></section>
      ${(!result || result.linkIds.length)?`<section class="panel panel-pad possible-link">${sourceRow({id:result?.linkIds[0] || '01',title:'Possible link found',date:result?'Open a matching sample entry':'Similar to “The house in the forest”, Oct 26.',image:result?.motif || 'house'})}</section>`:'<section class="panel panel-pad"><h3>A new thread</h3><p class="small muted">No matching source was found in the sample entries.</p></section>'}
    </aside>
  </section>`;
}
