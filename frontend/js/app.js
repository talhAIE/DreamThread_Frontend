import {getRoute,navigate,listen} from './router.js';
import {shell,escapeHTML as e,dateText} from './components/ui.js';
import {createRepository} from './data/repository.js';
import {createAuth} from './services/auth.js';
import * as view from './views.js';

const app=document.querySelector('#app'),dialog=document.querySelector('#info-dialog');
let config,auth,api,me,prefs,signup=false,sequence=0,pollTimer,draftTimer;
let draft=null,currentDream=null,currentFollowup=null,currentConnections=[],currentMemory=[],currentConversation=null;
let recording=null,recordStream=null,recordTimer=null,recordChunks=[],uploadBusy=false;
let actionBusy=false,lastExport=null;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const draftKey=()=>`dreamthread.draft.${me.id}`;
function announce(text){document.querySelector('#announcer').textContent=text;}
function info(title,message,actions=''){
  document.querySelector('#dialog-title').textContent=title;document.querySelector('#dialog-message').textContent=message;
  document.querySelector('#dialog-actions').innerHTML=actions;if(!dialog.open)dialog.showModal();
}
function failure(error){
  const message=(error.message || 'The request could not finish.')+(error.status===409?' Reload to get the latest version before retrying.':'')+(error.requestId?` (Request ${error.requestId})`:'');
  if(error.status===401){resetSession();navigate('/welcome');}
  info('Could not finish',message);
}
function resetSession(){
  if(me)try{sessionStorage.removeItem(draftKey());}catch{}
  stopRecording();draft=null;me=null;prefs=null;currentDream=null;currentMemory=[];currentConversation=null;lastExport=null;
}
function applyPreferences(){
  const light=prefs.theme==='light' || (prefs.theme==='system' && matchMedia('(prefers-color-scheme: light)').matches);
  document.body.dataset.theme=light?'light':'dark';document.body.dataset.reducedMotion=String(prefs.reduced_motion);
}
async function account(){
  if(!me){[me,prefs]=await Promise.all([api.me(),api.preferences()]);applyPreferences();}
}
function blankDraft(){return {title:'',dream_date:today(),text:'',reported_emotions:[],lifecycle:'draft',voiceMode:false};}
function loadDraft(){
  if(draft)return draft;try{draft=JSON.parse(sessionStorage.getItem(draftKey()));}catch{}
  return draft ||= blankDraft();
}
function readDreamForm(){
  const form=document.querySelector('#dream-form');if(!form || !draft)return;
  const data=new FormData(form);Object.assign(draft,{title:data.get('title'),dream_date:data.get('dream_date'),text:data.get('text'),reported_emotions:data.getAll('emotion')});
}
function persistDraft(){
  readDreamForm();if(!draft || !me)return;
  try{sessionStorage.setItem(draftKey(),JSON.stringify(draft));const target=document.querySelector('#draft-status');if(target)target.textContent='Draft kept for this signed-in session.';}
  catch{const target=document.querySelector('#draft-status');if(target)target.textContent='Draft is in memory only. Save it before closing this page.';}
}
function refreshSoon(){clearTimeout(pollTimer);pollTimer=setTimeout(()=>{if(!document.querySelector('input:focus,textarea:focus,select:focus') && !actionBusy)render();else refreshSoon();},6000);}
async function render(){
  const version=++sequence;clearTimeout(pollTimer);const r=getRoute();
  let html,title='DreamThread',subtitle='',active=r.name,shouldPoll=false;
  try{
    if(!await auth.token()){
      if(r.name!=='welcome'){navigate('/welcome');return;}html=view.welcome(signup);
    }else{
      await account();
      if(r.name==='welcome'){navigate('/home');return;}
      if(r.name==='home'){
        const [dreams,motifs]=await Promise.all([api.listDreams(),api.motifs()]);
        title=`Welcome${me.display_name?', '+me.display_name:''}`;subtitle='Every dream, another thread.';html=view.home(dreams,motifs,me);
      }else if(r.name==='journal'){
        const params=Object.fromEntries([...r.params].filter(([k])=>['keyword','from_date','to_date','emotion','lifecycle'].includes(k)));
        html=view.journal(await api.listDreams(params),r.params);title='Your dream journal';active='journal';
      }else if(r.name==='capture' || r.name==='edit'){
        if(r.name==='edit' && draft?.id!==r.id){const d=await api.getDream(r.id);draft={...d,voiceMode:false};}
        else {loadDraft();if(draft.id)draft=blankDraft();}
        draft.voiceMode=r.name==='capture' && r.params.get('mode')==='voice';
        html=view.capture(draft,config.voiceEnabled);title=r.name==='edit'?'Edit dream':'Record a dream';
      }else if(r.name==='dream'){
        const [d,a,c,f]=await Promise.all([api.getDream(r.id),api.analysis(r.id),api.connections(r.id),api.followup(r.id)]);
        currentDream=d;currentFollowup=f;currentConnections=c.connections;
        const job=a.analysis_job_id?await api.job(a.analysis_job_id):null;
        shouldPoll=['queued','running'].includes(job?.status);
        html=view.detail(d,a,c,f,job);title=d.title;subtitle=`${dateText(d.dream_date)} · ${d.input_mode} · ${d.lifecycle}`;active='journal';
      }else if(r.name==='constellation'){
        const graph=await api.constellation(Object.fromEntries([...r.params].filter(([k])=>['from','to','types'].includes(k))));html=view.constellation(graph);title='Dream constellation';
      }else if(r.name==='motif'){
        const m=await api.motif(r.id);html=view.motif(m);title=m.canonical_label;active='constellation';
      }else if(r.name==='storylines'){
        html=view.storylines(await api.storylines());title='Your storylines';active='journal';
      }else if(r.name==='storyline'){
        const s=await api.storyline(r.id);html=view.storyline(s);title=s.title;subtitle=`${s.entry_count} chapters · ${s.status}`;active='journal';
      }else if(r.name==='memory'){
        const [items,motifs]=await Promise.all([api.memory(),api.motifs()]);currentMemory=items;html=view.memory(items,motifs,r.params.get('motif'));title='Personal memory';
      }else if(r.name==='detective'){
        const conversations=(await api.conversations()).items;
        const id=r.id || conversations[0]?.id;let messages=[];
        if(id){currentConversation=await api.conversation(id);let offset=0,page;do{page=await api.messages(id,offset);messages.push(...page.items);offset+=page.items.length;}while(page.has_more && page.items.length);}
        else currentConversation=null;
        shouldPoll=messages.some(m=>m.status==='pending');html=view.detective(conversations,currentConversation,messages);title='Dream Detective';
      }else if(r.name==='settings'){
        [me,prefs]=await Promise.all([api.me(),api.preferences()]);html=view.settings(me,prefs);title='Settings';
      }else if(r.name==='insights'){
        const month=r.params.get('month') || today().slice(0,7);
        const [i,c]=await Promise.all([api.insights(month,me.timezone),api.capsules(me.timezone)]);html=view.insights(i,c);title='Insights & time capsules';shouldPoll=c.items.some(x=>x.status==='pending');
      }else html=view.empty('This page could not be found.');
      html=shell(active,title,subtitle,html,{query:r.params.get('keyword')||''});
    }
    if(version!==sequence)return;
    app.innerHTML=html;document.title=title+' · DreamThread';document.body.dataset.route=r.name;
    const messages=document.querySelector('.chat-messages');if(messages)messages.scrollTop=messages.scrollHeight;
    if(shouldPoll)refreshSoon();
  }catch(error){
    if(version!==sequence)return;
    if(error.status===401){resetSession();navigate('/welcome');return;}
    app.innerHTML=shell('',error.status===404?'Not found':'Unable to load this page','',view.empty(error.message)+ '<button class="button" data-action="reload">Try again</button>');
  }
}
async function runAction(button,task){
  if(actionBusy)return;actionBusy=true;if(button)button.disabled=true;
  try{await task();}catch(error){failure(error);}finally{actionBusy=false;if(button)button.disabled=false;}
}
function stopRecording(){
  clearTimeout(recordTimer);if(recording && recording.state!=='inactive')recording.stop();
  recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;
}
async function waitJob(id,status){
  const started=Date.now();while(Date.now()-started<240000){
    const j=await api.job(id);if(status)status.textContent=`${j.status} · ${j.stage}`;
    if(j.status==='succeeded')return j;
    if(['failed','cancelled'].includes(j.status))throw new Error(j.error_message || `Processing ${j.status}.`);
    await new Promise(resolve=>setTimeout(resolve,3000));
  }throw new Error('Processing is still queued. You can return later; your saved data is safe.');
}
async function uploadAudio(blob){
  if(uploadBusy)return;uploadBusy=true;readDreamForm();const owner=draft;
  const status=document.querySelector('#audio-status');let asset;
  try{
    if(blob.size>10485760)throw new Error('Choose an audio recording smaller than 10 MB.');
    if(status)status.textContent='Uploading private audio…';
    const mime=blob.type.split(';')[0];
    if(!['audio/wav','audio/webm','audio/ogg','audio/mpeg','audio/mp4'].includes(mime))throw new Error('Use WAV, WebM, OGG, MP3, or MP4 audio.');
    const granted=await api.uploadIntent({content_type:mime,size_bytes:blob.size});asset=granted.asset_id;
    await api.upload(granted.upload_url,blob);const pending=await api.completeAudio(asset);
    if(pending.job_id)await waitJob(pending.job_id,status);
    const result=await api.audio(asset);
    if(!result.transcript_draft)throw new Error(result.error_code || 'No transcript was produced.');
    if(draft!==owner)throw new Error('The capture changed. Please upload again in your current draft.');
    owner.text=result.transcript_draft;owner.audio_asset_id=asset;
    const text=document.querySelector('#transcript');if(text)text.value=owner.text;
    // Persist after updating the form, otherwise its previous contents win.
    persistDraft();if(status)status.textContent='Transcript ready. Review and edit your words before saving.';
  }catch(error){if(status)status.textContent=error.message;if(asset)await api.discardAudio(asset).catch(()=>{});}
  finally{uploadBusy=false;document.querySelector('[data-action=record-start]')?.removeAttribute('disabled');}
}
app.addEventListener('input',event=>{if(event.target.closest('#dream-form')){clearTimeout(draftTimer);draftTimer=setTimeout(persistDraft,250);}});
app.addEventListener('change',async event=>{
  if(event.target.id==='conversation-select' && event.target.value)navigate('/detective/'+event.target.value);
  if(event.target.id==='audio-file' && event.target.files[0])await uploadAudio(event.target.files[0]);
});
app.addEventListener('submit',event=>{
  event.preventDefault();const form=event.target,data=new FormData(form),button=event.submitter;
  runAction(button,async()=>{
    if(form.id==='sign-in'){
      try{
        const result=await auth[signup?'signUp':'signIn'](data.get('email'),data.get('password'));
        me=null;await account();form.reset();navigate('/home');
      }catch(error){document.querySelector('#auth-error').textContent=error.message;}
    }else if(form.id==='search-form')navigate('/journal?keyword='+encodeURIComponent(data.get('query')));
    else if(['journal-filter','graph-filter','insights-filter'].includes(form.id)){
      const params=new URLSearchParams([...data].filter(([,v])=>v));navigate('/'+({'journal-filter':'journal','graph-filter':'constellation','insights-filter':'insights'}[form.id])+'?'+params);
    }else if(form.id==='dream-form'){
      readDreamForm();const c=draft,lifecycle=button?.value || 'saved';
      if(uploadBusy || recording?.state==='recording')throw new Error('Finish recording and transcription before saving.');
      if(lifecycle==='saved' && !c.text.trim())throw new Error('Write your dream before saving.');
      const body={title:c.title || 'Untitled dream',dream_date:c.dream_date,text:c.text,reported_emotions:c.reported_emotions,lifecycle:c.lifecycle==='saved'?'saved':lifecycle};
      let saved;
      if(c.id)saved=await api.updateDream(c.id,{...body,expected_version:c.version});
      else saved=await api.saveDream({...body,input_mode:c.audio_asset_id?'voice':'text',...(c.audio_asset_id?{audio_asset_id:c.audio_asset_id}:{})});
      sessionStorage.removeItem(draftKey());draft=null;navigate('/dream/'+saved.id);announce('Dream saved to your private journal.');
    }else if(form.id==='followup-form'){
      await api.answerFollowup(currentDream.id,{expected_version:currentDream.version,question_version:currentFollowup.question_version,expected_answer_version:currentFollowup.latest_answer?.version || 0,answer:data.get('answer')});await render();
    }else if(form.id==='detective-form'){
      let c=currentConversation;if(!c)c=await api.createConversation();
      const submitted=await api.ask(c.id,data.get('question'));form.reset();
      if(getRoute().id!==c.id)navigate('/detective/'+c.id);else await render();
      announce('Question submitted. The worker is preparing your answer.');
    }else if(form.id==='memory-form'){
      const body={meaning:data.get('meaning')};
      if(data.get('motif_id'))body.motif_id=data.get('motif_id');else body.motif={label:data.get('label'),type:data.get('type')};
      await api.saveMemory(body);await render();
    }else if(form.id==='profile-form'){
      me=await api.updateMe({expected_version:me.version,display_name:data.get('display_name'),timezone:data.get('timezone')});prefs=await api.preferences();await render();announce('Profile updated.');
    }else if(form.id==='preferences-form'){
      prefs=await api.updatePreferences({expected_version:prefs.version,theme:data.get('theme'),auto_connections:data.has('auto_connections'),require_memory_confirmation:data.has('require_memory_confirmation'),reduced_motion:data.has('reduced_motion')});applyPreferences();await render();announce('Preferences updated.');
    }
  });
});
app.addEventListener('click',event=>{
  const target=event.target.closest('button');if(!target)return;const action=target.dataset.action;
  if(!action && !['connection','refreshStory','capsule','correct','memory','export'].some(k=>target.dataset[k]))return;
  if(action==='menu'){document.querySelector('.sidebar')?.classList.toggle('open');return;}
  if(action==='record-stop'){stopRecording();target.disabled=true;return;}
  runAction(target,async()=>{
    if(action==='auth-mode'){signup=!signup;await render();}
    if(action==='google')await auth.google();
    if(action==='reload')await render();
    if(action==='sign-out'){await auth.signOut();resetSession();navigate('/welcome');}
    if(action==='new-conversation'){const c=await api.createConversation();navigate('/detective/'+c.id);}
    if(action==='delete-conversation')info('Delete conversation?','This permanently removes this conversation.','<button class="button" data-confirm="conversation">Delete conversation</button>');
    if(action==='delete-dream')info('Delete this dream?','This permanently removes the original dream and its revisions.','<button class="button" data-confirm="dream">Delete dream</button>');
    if(action==='delete-journal')info('Delete your entire journal?','This permanently deletes your journal and derived personal data. This cannot be undone.','<button class="button" data-confirm="journal">Delete my entire journal</button>');
    if(action==='analyze'){await api.analyze(currentDream.id,currentDream.version);await render();}
    if(action==='connections'){const result=await api.analyzeConnections(currentDream.id);info('Connections queued','The worker is comparing your dreams. Return to this entry when processing finishes.');await render();}
    if(action==='skip-followup'){await api.answerFollowup(currentDream.id,{expected_version:currentDream.version,question_version:currentFollowup.question_version,expected_answer_version:currentFollowup.latest_answer?.version || 0,skipped:true});await render();}
    if(target.dataset.connection){const c=currentConnections.find(x=>x.id===target.dataset.connection);await api.decideConnection(c.id,{decision:target.dataset.decision,expected_version:c.decision_version || 1});await render();}
    if(target.dataset.refreshStory){const j=await api.refreshStoryline(target.dataset.refreshStory);info('Refresh queued','The worker is refreshing this storyline.');await waitJob(j.job_id);await render();}
    if(target.dataset.capsule){const j=await api.refreshCapsule(target.dataset.capsule,me.timezone);info('Time capsule queued','The worker is preparing your time capsule.');await render();}
    if(target.dataset.correct){const label=prompt('Correct this observed detail:');if(label){await api.correctDetail(currentDream.id,{expected_version:currentDream.version,detail_key:target.dataset.correct,label});await render();}}
    if(target.dataset.memory){
      const m=currentMemory.find(x=>x.id===target.dataset.memory),op=target.dataset.memoryAction;
      if(op==='delete'){info('Forget this meaning?','This removes the saved meaning and disables its future use.',`<button class="button" data-confirm="memory" data-id="${m.id}" data-version="${m.version}">Forget meaning</button>`);return;}
      const body={expected_version:m.version};if(op==='toggle')body.enabled=!m.enabled;if(op==='confirm')body.status='confirmed';
      if(op==='edit'){const meaning=prompt('Edit your personal meaning:',m.meaning);if(!meaning)return;body.meaning=meaning;}
      await api.updateMemory(m.id,body);await render();
    }
    if(target.dataset.export){
      lastExport=await api.exportJournal(target.dataset.export);const status=document.querySelector('#export-status');status.textContent='Export queued…';
      await waitJob(lastExport.job_id,status);const result=await api.exportStatus(lastExport.id);
      if(!result.download_url)throw new Error('Export is not ready to download.');
      const blob=await api.download(result.download_url),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`dreamthread.${target.dataset.export==='json'?'json':'txt'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Export downloaded.';
    }
    if(action==='record-start'){
      if(recording?.state==='recording' || uploadBusy)return;
      if(!config.voiceEnabled)throw new Error('Voice is disabled in the backend.');
      if(!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder)throw new Error('This browser does not support microphone recording. Upload an audio file instead.');
      recordStream=await navigator.mediaDevices.getUserMedia({audio:true});recordChunks=[];
      const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(x=>MediaRecorder.isTypeSupported(x));
      recording=new MediaRecorder(recordStream,mime?{mimeType:mime}:{});
      recording.ondataavailable=x=>{if(x.data.size)recordChunks.push(x.data);};
      recording.onstop=()=>{recordStream?.getTracks().forEach(t=>t.stop());uploadAudio(new Blob(recordChunks,{type:recording.mimeType}));};
      recording.start();target.disabled=true;document.querySelector('[data-action=record-stop]').disabled=false;
      document.querySelector('#audio-status').textContent='Recording… (maximum 3 minutes)';recordTimer=setTimeout(stopRecording,180000);
    }
  });
});
dialog.addEventListener('click',event=>{
  const target=event.target.closest('[data-confirm]');if(!target)return;
  runAction(target,async()=>{
    if(target.dataset.confirm==='dream'){await api.deleteDream(currentDream.id);navigate('/journal');}
    if(target.dataset.confirm==='conversation'){await api.deleteConversation(currentConversation.id);currentConversation=null;navigate('/detective');await render();}
    if(target.dataset.confirm==='memory'){await api.deleteMemory(target.dataset.id,Number(target.dataset.version));await render();}
    if(target.dataset.confirm==='journal'){const j=await api.deleteJournal();await waitJob(j.job_id);draft=null;sessionStorage.removeItem(draftKey());navigate('/journal');await render();}
    dialog.close();
  });
});
listen(()=>{clearTimeout(draftTimer);if(draft)persistDraft();stopRecording();render();});
window.addEventListener('pagehide',()=>{if(draft)persistDraft();stopRecording();});
async function boot(){
  try{
    const response=await fetch('/config.json');if(!response.ok)throw new Error('Frontend configuration is unavailable. Start scripts/serve_frontend.py.');
    config=await response.json();auth=createAuth(config);api=createRepository(auth,fetch,config.apiBase);
    await auth.callback();await render();
  }catch(error){app.innerHTML=view.welcome();info('Unable to start',error.message);}
}
boot();
