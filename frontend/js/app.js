import { getRoute, navigate, listen } from './router.js';
import { repository } from './data/repository.js';
import { motifs } from './data/fixtures.js';
import { state, toggleMemory, clearFilters } from './state.js';
import { shell, dateText, escapeHTML } from './components/ui.js';
import { welcome } from './screens/welcome.js';
import { home, evidence } from './screens/home.js';
import { journal } from './screens/journal.js';
import { detail, storyline } from './screens/detail.js';
import { capture, newCapture, captureClock } from './screens/capture.js';
import { constellation, mountGraph, graphEvidence, graphNodes } from './screens/constellation.js';
import { detective } from './screens/detective.js';
import { SAMPLE_TRANSCRIPT } from './data/local-repository.js';

const app = document.querySelector('#app');
const announcer = document.querySelector('#announcer');
const dialog = document.querySelector('#info-dialog');
let renderVersion = 0;
let searchTimer;
let previousRoute = '';
let arcObserver;
let graphController;
let graphModel;
let graphDreams;
let captureTimer;
let draftTimer;
let homeModel;
let homeRecords;

function announce(text) { announcer.textContent = text; }
function info(title, message, actions='') {
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-message').textContent = message;
  document.querySelector('#dialog-actions').innerHTML = actions;
  if (!dialog.open) dialog.showModal();
}

async function persistDraft() {
  const c=state.capture;
  if(!c)return;
  const result=await repository.saveDraft({original:c.original,title:c.title,emotions:c.emotions,mode:c.mode,elapsed:c.elapsed,interview:c.interview});
  const status=document.querySelector('#draft-status');
  if(status)status.textContent=result.storage==='device'?'Draft saved on this device':'Draft kept for this session';
}

function selectGraphNode(id) {
  if(!graphNodes.some(node=>node.id===id))return;
  state.graph.selected=id;
  const target=document.querySelector('.graph-evidence');
  if(target)target.innerHTML=graphEvidence(id,graphModel,graphDreams);
  graphController?.update();
  announce(`${Object.hasOwn(graphModel.motifs,id)?graphModel.motifs[id].label:id} selected. Evidence updated.`);
}

function consumeSearchParams() {
  const route=getRoute();
  if(!route.params.has('q')&&!route.params.has('emotion'))return;
  route.params.delete('q');route.params.delete('emotion');
  const suffix=route.params.toString();
  history.replaceState(null,'',location.pathname+location.search+'#/journal'+(suffix?'?'+suffix:''));
}

async function render({ preserveSearch = false, focusId = '' } = {}) {
  const version = ++renderVersion;
  const route = getRoute();
  const routeKey = route.name + '/' + (route.id || '');
  let html;
  let title = 'DreamThread';
  if (route.name==='welcome') html = welcome();
  else if (route.name==='home') {
    const dreams = await repository.listDreams();
    const model=await repository.getConstellation();
    homeModel=model;homeRecords=dreams;
    html = shell('home','Good morning, Sarah','',home(dreams,model));
    title = 'Home · DreamThread';
  } else if (route.name==='journal') {
    state.memory = route.params.get('tab')==='memory';
    if (route.params.has('q')) state.query = route.params.get('q');
    if (route.params.has('emotion')) state.emotion=['Fear','Calm','Curious','Uneasy'].includes(route.params.get('emotion'))?route.params.get('emotion'):'';
    const motif = route.params.get('motif') || '';
    const model=await repository.getConstellation();
    const ids = motif && Object.hasOwn(model.motifs,motif) ? model.motifs[motif].ids : state.memory ? [...state.saved] : null;
    const dreams = await repository.listDreams({query:state.query,emotion:state.emotion,days:state.days,ids,includeSources:!!motif || state.memory});
    html = shell('journal','Your dream journal','Every entry, another thread.',journal(dreams,motif),{query:state.query,mainClass:'journal-view'});
    title = 'Journal · DreamThread';
    announce(`${dreams.length} matching ${dreams.length===1?'dream':'dreams'}`);
  } else if (route.name==='dream') {
    const dream = await repository.getDream(route.id);
    if (dream) {
      const subtitle = dream.id==='01'?'Oct 26, 2026 · Voice · Felt: fear, curiosity':`${dateText(dream.date)} · ${dream.type} · Felt: ${dream.emotions.join(', ').toLowerCase()}`;
      const linked=dream.local?await repository.listDreams({ids:dream.linkIds || [],includeSources:true}):[];
      html = shell('journal',dream.title,subtitle,detail(dream,linked));
      title = dream.title + ' · DreamThread';
    }
  } else if (route.name==='storyline' && (!route.id || route.id==='house')) {
    const story=await repository.getStoryline('house');
    html = shell('journal',story.title,'3 chapters · Aug – Oct 2026',storyline(story));
    title = 'The house · DreamThread';
  } else if (route.name==='capture') {
    const draft=state.capture || await repository.getDraft();
    const mode=(route.params.get('mode') || draft?.mode)==='text'?'text':'voice';
    if(!state.capture || state.capture.mode!==mode)state.capture=newCapture(mode,draft);
    html=shell('','Record a dream','Speak or type. Your original words are saved unedited.',capture(state.capture));
    title='Capture a dream · DreamThread';
  } else if (route.name==='constellation') {
    const requested=route.params.get('motif');
    if(requested && (previousRoute!=='constellation/' || requested!==state.graph.routeMotif) && graphNodes.some(n=>n.id===requested)){
      state.graph.selected=requested;state.graph.filter='All';state.graph.routeMotif=requested;
    }
    graphModel=await repository.getConstellation();
    graphDreams=await repository.listDreams({includeSources:true});
    const totals=graphModel.referenceTotals;
    html=shell('constellation','Dream constellation',`${totals.dreams+graphModel.localDreams} dreams · ${totals.motifs} motifs · ${totals.storylines} storylines`,constellation(state.graph,graphModel,graphDreams));
    title='Dream constellation · DreamThread';
  } else if (route.name==='detective') {
    const context=route.params.get('motif') || 'house';
    if(!state.detective || state.detective.context!==context){
      const question=context==='house'?'Why does the old house keep returning?':`What connects my ${Object.hasOwn(motifs,context)?motifs[context].label.toLowerCase():context==='fear'?'fear':context==='calm'?'calm':'grandmother'} dreams?`;
      const answer=await repository.askDetective(question);
      state.detective={context,messages:[{role:'user',text:question},{role:'assistant',...answer}],sources:answer.sources,input:'',busy:false,highlight:'',error:''};
    }
    const dreams=await repository.listDreams({includeSources:true});
    html=shell('detective','Dream Detective','Ask about your own dream history.',detective(state.detective,dreams));
    title='Dream Detective · DreamThread';
  }
  if (!html) html = shell('','Dream not found','',`<section class="panel destination"><h2>This page is not in the demo</h2><p>Return to your journal to explore the supplied entries.</p><a class="button" href="#/journal">Open journal</a></section>`);
  if (version!==renderVersion) return;
  arcObserver?.disconnect();
  graphController?.dispose();
  clearInterval(captureTimer);
  app.innerHTML = html;
  if(route.name==='constellation')graphController=mountGraph(state.graph,selectGraphNode);
  if(route.name==='capture' && state.capture.running){
    captureTimer=setInterval(()=>{
      if(getRoute().name!=='capture')return;
      state.capture.elapsed++;
      const clock=document.querySelector('#capture-clock');if(clock)clock.textContent=captureClock(state.capture);
      if(state.capture.elapsed%5===0)persistDraft();
    },1000);
  }
  if(route.name==='detective'){
    const messages=document.querySelector('.chat-messages');if(messages)messages.scrollTop=messages.scrollHeight;
  }
  const arc = document.querySelector('.arc-slot');
  if (arc) {
    arcObserver = new ResizeObserver(() => arc.style.setProperty('--arc-scale',String(Math.min(1,arc.clientWidth/1090.05))));
    arcObserver.observe(arc);
  }
  document.title = title;
  if (preserveSearch) {
    const search = document.querySelector('#global-search');
    search?.focus();
  } else if (focusId) {
    document.getElementById(focusId)?.focus({preventScroll:true});
  } else if (previousRoute && previousRoute!==routeKey) {
    document.querySelector('h1')?.focus({preventScroll:true});
    window.scrollTo(0,0);
  }
  previousRoute = routeKey;
  document.body.dataset.route = route.name;
}

app.addEventListener('submit', async event => {
  event.preventDefault();
  if (event.target.id==='sign-in') {
    if (!event.target.reportValidity()) return;
    // Never retain, log, or transmit the input credentials.
    event.target.reset();
    navigate('/home');
    info('You’re exploring a local demo','No account was created and no credentials were sent or stored. The dream entries are sample content from the design.');
  } else if (event.target.id==='search-form') {
    clearTimeout(searchTimer);
    const value = event.target.querySelector('input').value;
    state.query = value;
    consumeSearchParams();
    if (getRoute().name==='journal') await render({preserveSearch:true});
    else navigate('/journal?q='+encodeURIComponent(value));
  } else if(event.target.id==='detective-form') {
    const d=state.detective;
    if(d.busy)return;
    const question=event.target.querySelector('input').value.trim();
    if(!question)return;
    d.messages.push({role:'user',text:question});d.input='';d.busy=true;d.error='';
    await render();
    try {const answer=await repository.askDetective(question);d.messages.push({role:'assistant',...answer});d.sources=answer.sources;}
    catch(error){d.error=error.message || 'The demo answer could not be loaded. Please try again.';}
    finally {d.busy=false;await render({focusId:'detective-question'});}
  }
});

app.addEventListener('input', event => {
  if(['transcript','dream-title'].includes(event.target.id) && state.capture){
    if(event.target.id==='transcript'){
      state.capture.original=event.target.value;state.capture.analysis=null;state.capture.error='';
      const error=document.querySelector('.capture-body .form-error');if(error)error.textContent='';
      state.capture.status=state.capture.mode==='text'?'writing':'stopped';state.capture.running=false;
      clearInterval(captureTimer);
      document.querySelector('.capture-save')?.setAttribute('hidden','');
      const clock=document.querySelector('#capture-clock');if(clock)clock.textContent=captureClock(state.capture);
      document.querySelector('.capture-mic')?.setAttribute('aria-label','Start simulated recording');
      document.querySelector('.waveform')?.classList.remove('is-running');
    }else state.capture.title=event.target.value;
    clearTimeout(draftTimer);draftTimer=setTimeout(persistDraft,250);return;
  }
  if(event.target.id==='detective-question' && state.detective){state.detective.input=event.target.value;return;}
  if (event.target.id!=='global-search' || getRoute().name!=='journal') return;
  clearTimeout(searchTimer);
  const query = event.target.value;
  searchTimer = setTimeout(() => {
    state.query = query;
    // Consume the initial query parameter before local live filtering.
    consumeSearchParams();
    render({preserveSearch:true});
  },180);
});

app.addEventListener('change', event => {
  if (event.target.id==='emotion') { state.emotion = event.target.value; consumeSearchParams();render({focusId:'emotion'}); }
});

app.addEventListener('click', async event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  const node = event.target.closest('[data-motif]');
  const date = event.target.closest('[data-days]');
  const save = event.target.closest('[data-save]');
  if (node) {
    state.motif = node.dataset.motif;
    document.querySelectorAll('.mini-node').forEach(el => { el.classList.toggle('selected',el===node); el.setAttribute('aria-pressed',String(el===node)); });
    document.querySelector('.home-evidence').innerHTML = evidence(state.motif,homeModel,homeRecords);
    announce(motifs[state.motif].summary);
  }
  if (date) {
    state.days = date.dataset.days==='all'?null:Number(date.dataset.days);
    state.dateLabel = state.days?`Last ${state.days} days`:'All dates';
    render();
  }
  if (save) {
    const saved = toggleMemory(save.dataset.save);
    save.textContent = `${saved?'Remove from':'Save to'} personal memory`;
    save.closest('details').open = false;
    announce(saved?'Saved to personal memory':'Removed from personal memory');
    if (state.memory) render();
  }
  if (action==='clear-filters') {
    clearFilters();
    const route = getRoute();
    if (route.params.has('motif') || route.params.has('q') || route.params.has('emotion')) navigate('/journal'); else render();
  }
  if (action==='settings') info('Settings · local demo',`Dreams, drafts, and personal memory are kept ${repository.storageMode==='device'?'on this device':'for this session'}. Recording, analysis, and Detective answers are simulated. Account settings and synchronization are not connected.`,'<button class="button" data-dialog-action="request-reset">Reset local demo</button><a class="button" href="#/welcome" data-dialog-action="welcome">Welcome screen</a>');
  if (action==='profile') info('Sarah · local demo','You are exploring sample dreams from the Figma design. Authentication is not connected. Use the welcome screen to try the demo entry flow.');
  if (action==='google') info('Google sign-in is not connected','This is a frontend demo. Enter any valid email and a password of at least four characters, then choose Continue to explore. Nothing is sent or stored.');
  if (action==='create-account') info('Try DreamThread locally','Account creation is not connected. Use any valid email and a password of at least four characters in this form to enter the local demo.');
  if (action==='menu') {
    const sidebar = document.querySelector('.sidebar');
    const open = sidebar.classList.toggle('open');
    event.target.setAttribute('aria-expanded',String(open));
  }
  const graphFilter=event.target.closest('[data-graph-filter]');
  if(graphFilter){
    state.graph.filter=graphFilter.dataset.graphFilter;
    if(state.graph.filter!=='All' && graphNodes.find(n=>n.id===state.graph.selected)?.category!==state.graph.filter)state.graph.selected=graphNodes.find(n=>n.category===state.graph.filter).id;
    await render();
    document.querySelector(`[data-graph-filter="${state.graph.filter}"]`)?.focus();
    announce(`${state.graph.filter} filter selected`);
  }
  const zoom=event.target.closest('[data-zoom]');if(zoom)graphController?.zoom(zoom.dataset.zoom);
  if(action==='graph-reset'){state.graph.zoom=1;state.graph.panX=state.graph.panY=0;graphController?.update();announce('Graph view reset');}
  const citation=event.target.closest('[data-citation]');if(citation && state.detective)state.detective.highlight=citation.dataset.citation;
  const c=state.capture;
  if(action?.startsWith('capture-') && c){
    if(action==='capture-toggle'){
      if(c.mode==='text'){navigate('/capture?mode=voice');return;}
      c.running=c.status!=='listening';c.status=c.running?'listening':'stopped';
      if(c.running && !c.original.trim())c.original=SAMPLE_TRANSCRIPT;
      await persistDraft();await render();
    }
    if(action==='capture-new'){state.capture=newCapture(c.mode,{original:'',title:'',emotions:[],elapsed:0});state.capture.status=c.mode==='text'?'writing':'idle';await persistDraft();await render({focusId:'transcript'});}
    if(action==='capture-sample'){state.capture=newCapture('voice');await persistDraft();if(getRoute().params.get('mode')==='text')navigate('/capture?mode=voice');else await render();}
    if(action==='capture-analyze'){
      if(c.busy)return;c.busy=true;c.error='';c.running=false;c.status=c.mode==='text'?'writing':'stopped';await render();
      try {c.analysis=await repository.analyzeDream(c.original,c.emotions);if(!c.title)c.title=c.original===SAMPLE_TRANSCRIPT?'A house in the forest':'A dream to remember';}
      catch(error){c.error=error.message;}
      finally{c.busy=false;await persistDraft();await render({focusId:c.analysis?'dream-title':'transcript'});}
    }
    if(action==='capture-save'){
      if(c.busy)return;c.busy=true;c.error='';
      try {const saved=await repository.saveDream({title:c.title,original:c.original,emotions:c.emotions,type:c.mode==='voice'?'Voice':'Text',interview:c.interview});state.capture=null;clearFilters();navigate('/dream/'+saved.id);announce(repository.storageMode==='device'?'Dream saved on this device':'Dream saved for this session');}
      catch(error){c.busy=false;c.error=error.message;await render();}
    }
  }
  const feelingAdd=event.target.closest('[data-add-feeling]'),feelingRemove=event.target.closest('[data-remove-feeling]');
  if((feelingAdd || feelingRemove) && c){c.emotions=feelingAdd?[...new Set([...c.emotions,feelingAdd.dataset.addFeeling])]:c.emotions.filter(e=>e!==feelingRemove.dataset.removeFeeling);await persistDraft();await render();}
  const interview=event.target.closest('[data-interview]');if(interview && c){c.interview=interview.dataset.interview;await persistDraft();await render();}
});

dialog.addEventListener('click',async event=>{
  const action=event.target.closest('[data-dialog-action]')?.dataset.dialogAction;
  if(action==='request-reset')info('Reset local demo?','This removes your locally saved demo dreams, draft, and personal memory from this browser. The original sample entries will remain.','<button class="button primary" data-dialog-action="confirm-reset">Reset demo data</button>');
  if(action==='welcome')dialog.close();
  if(action==='confirm-reset'){
    clearTimeout(draftTimer);clearInterval(captureTimer);
    try {await repository.resetDemo();} catch(error){info('Reset could not finish',error.message);return;}
    state.saved.clear();state.capture=null;state.detective=null;state.motif='house';
    Object.assign(state.graph,{selected:'house',filter:'All',zoom:1,panX:0,panY:0,routeMotif:''});clearFilters();dialog.close();
    if(getRoute().name==='home')await render();else navigate('/home');announce('Local demo reset');
  }
});

document.addEventListener('click', event => {
  for (const details of document.querySelectorAll('details[open]')) if (!details.contains(event.target)) details.open=false;
  const sidebar = document.querySelector('.sidebar.open');
  if (sidebar && !sidebar.contains(event.target) && !event.target.closest('.mobile-menu')) {
    sidebar.classList.remove('open');
    document.querySelector('.mobile-menu')?.setAttribute('aria-expanded','false');
  }
});
document.addEventListener('keydown', event => {
  if (event.key==='Escape') {
    document.querySelectorAll('details[open]').forEach(d=>d.open=false);
    document.querySelector('.sidebar')?.classList.remove('open');
    document.querySelector('.mobile-menu')?.setAttribute('aria-expanded','false');
  }
});

listen(() => {
  clearTimeout(searchTimer);clearTimeout(draftTimer);
  if(previousRoute.startsWith('capture/') && state.capture){state.capture.running=false;if(state.capture.status==='listening')state.capture.status='stopped';persistDraft();}
  render();
});
window.addEventListener('pagehide',()=>{if(state.capture)persistDraft();});
render();
