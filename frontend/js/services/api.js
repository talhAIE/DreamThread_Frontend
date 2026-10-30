// Real FastAPI data only. Fixtures are never a network fallback.
export class APIError extends Error {
  constructor(message,status,code,requestId) {super(message);Object.assign(this,{status,code,requestId});}
}
export function createRepository(auth,fetcher=fetch,base='/api/v1') {
  const pending=new Map();
  async function request(path,{method='GET',body,key,signal,blob=false}={}) {
    const token=await auth.token();
    if(!token)throw new APIError('Please sign in to continue.',401,'sign_in_required');
    const headers={Authorization:`Bearer ${token}`};
    if(body!==undefined)headers['Content-Type']=body instanceof Blob?body.type.split(';')[0]:'application/json';
    if(key)headers['Idempotency-Key']=key;
    const response=await fetcher(path.startsWith(base+'/')?path:base+path,{method,headers,signal:signal || AbortSignal.timeout(180000),
      body:body===undefined?undefined:body instanceof Blob?body:JSON.stringify(body)});
    if(!response.ok){
      const data=await response.json().catch(()=>({})),error=data.error || {};
      if(response.status===401)auth.clear();
      throw new APIError(error.message || `Request failed (${response.status})`,response.status,error.code,error.request_id);
    }
    if(response.status===204)return null;
    return blob?response.blob():response.json();
  }
  async function mutate(path,body,method='POST',idempotent=true){
    const signature=JSON.stringify([method,path,body]);
    if(!pending.has(signature))pending.set(signature,crypto.randomUUID());
    try {const result=await request(path,{method,body,key:idempotent?pending.get(signature):undefined});pending.delete(signature);return result;}
    catch(error){if(error.status && error.status<500)pending.delete(signature);throw error;}
  }
  const query=params=>{
    const q=new URLSearchParams();for(const [k,v] of Object.entries(params || {}))if(v!==undefined && v!==null && v!=='')
      (Array.isArray(v)?v:[v]).forEach(value=>q.append(k,value));return q.size?'?'+q:'';
  };
  async function pages(path,params={},cursor='cursor',next='next_cursor'){
    let items=[],after;do {const page=await request(path+query({...params,limit:100,[cursor]:after}));items.push(...page.items);after=page[next];}while(after);return items;
  }
  return {
    request,mutate,query,
    me:()=>request('/me'),preferences:()=>request('/me/preferences'),
    updateMe:body=>mutate('/me',body,'PATCH',false),updatePreferences:body=>mutate('/me/preferences',body,'PATCH',false),
    listDreams:params=>pages('/dreams',params),getDream:id=>request(`/dreams/${id}`),saveDream:body=>mutate('/dreams',body),
    updateDream:(id,body)=>mutate(`/dreams/${id}`,body,'PATCH',false),deleteDream:id=>request(`/dreams/${id}`,{method:'DELETE'}),
    analysis:id=>request(`/dreams/${id}/analysis`),analyze:(id,v)=>mutate(`/dreams/${id}/analyze`,{expected_version:v}),
    index:(id,v)=>mutate(`/dreams/${id}/index`,{expected_version:v}),job:id=>request(`/jobs/${id}`),
    retryJob:j=>mutate(`/jobs/${j.id}/retry`,{expected_attempts:j.attempts,expected_submission:j.submission}),
    connections:id=>request(`/dreams/${id}/connections`),analyzeConnections:id=>mutate(`/dreams/${id}/connections/analyze`,undefined),
    decideConnection:(id,body)=>mutate(`/connections/${id}`,body,'PATCH',false),
    constellation:params=>request('/constellation'+query(params)),motif:id=>request(`/motifs/${id}`),
    motifs:()=>pages('/motifs',{},'after','next_after'),memory:()=>pages('/memory',{},'after','next_after'),
    saveMemory:body=>mutate('/memory',body),updateMemory:(id,body)=>mutate(`/memory/${id}`,body,'PATCH',false),
    deleteMemory:(id,v)=>request(`/memory/${id}?expected_version=${v}`,{method:'DELETE'}),
    correctDetail:(id,body)=>mutate(`/dreams/${id}/details`,body,'PATCH'),
    followup:id=>request(`/dreams/${id}/followup`),answerFollowup:(id,body)=>mutate(`/dreams/${id}/followup`,body,'PUT'),
    storylines:()=>request('/storylines'),storyline:id=>request(`/storylines/${id}`),refreshStoryline:id=>mutate(`/storylines/${id}/refresh`,undefined,'POST',false),
    conversations:()=>request('/conversations'),conversation:id=>request(`/conversations/${id}`),
    messages:(id,offset=0)=>request(`/conversations/${id}/messages?limit=100&offset=${offset}`),
    createConversation:title=>mutate('/conversations',title?{title}:{},'POST',false),deleteConversation:id=>request(`/conversations/${id}`,{method:'DELETE'}),
    ask:(id,question,source_ids=[])=>mutate(`/conversations/${id}/messages`,{question,source_ids}),
    insights:(month,timezone)=>request('/insights'+query({month,timezone})),capsules:timezone=>request('/time-capsules'+query({timezone})),
    capsule:(month,timezone)=>request(`/time-capsules/${month}`+query({timezone})),refreshCapsule:(month,timezone)=>mutate(`/time-capsules/${month}/refresh`+query({timezone}),undefined,'POST',false),
    exportJournal:format=>mutate('/exports',{format}),exportStatus:id=>request(`/exports/${id}`),download:path=>request(path,{blob:true}),
    deleteJournal:()=>mutate('/me/journal',{confirm:true},'DELETE',false),deletionStatus:()=>request('/me/journal/deletion'),
    uploadIntent:body=>mutate('/audio/upload-intents',body),upload:(url,body)=>request(url,{method:'PUT',body}),
    completeAudio:id=>mutate(`/audio/${id}/complete`,undefined,'POST',false),audio:id=>request(`/audio/${id}`),discardAudio:id=>request(`/audio/${id}`,{method:'DELETE'}),
  };
}
