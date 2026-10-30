import test from 'node:test';
import assert from 'node:assert/strict';
import {createRepository} from '../frontend/js/data/repository.js';
import {createAuth} from '../frontend/js/services/auth.js';
const response=(body,status=200)=>new Response(status===204?null:JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const auth={token:async()=> 'verified-user-token',clear(){}};
test('save keeps exact original, authenticated header and one idempotency key across network retries',async()=>{
  const calls=[];const api=createRepository(auth,async(url,options)=>{calls.push({url,...options});if(calls.length===1)throw new TypeError('network');return response({id:'dream'});});
  const body={title:'Test',dream_date:'2026-10-30',text:'  🌙\nMy original words.  ',reported_emotions:['awe'],lifecycle:'saved'};
  await assert.rejects(api.saveDream(body));await api.saveDream(body);
  assert.equal(calls[0].headers.Authorization,'Bearer verified-user-token');
  assert.equal(calls[0].headers['Idempotency-Key'],calls[1].headers['Idempotency-Key']);
  assert.deepEqual(JSON.parse(calls[1].body),body);assert.equal(calls[1].url,'/api/v1/dreams');
});
test('all server pages are fetched and filters encoded literally',async()=>{
  const calls=[];const api=createRepository(auth,async url=>{calls.push(url);return response({items:[{id:calls.length}],next_cursor:calls.length===1?'opaque+cursor':null});});
  assert.equal((await api.listDreams({keyword:'a&b %_'})).length,2);
  assert.equal(new URL(calls[1],'http://local').searchParams.get('cursor'),'opaque+cursor');
  assert.equal(new URL(calls[0],'http://local').searchParams.get('keyword'),'a&b %_');
});
test('conflicts remain visible and 401 clears session without demo fallback',async()=>{
  let cleared=false;const api=createRepository({token:auth.token,clear(){cleared=true;}},async()=>response({error:{code:'version_conflict',message:'Changed',request_id:'req'}},409));
  await assert.rejects(api.updateDream('id',{expected_version:1,text:'new'}),x=>x.status===409 && x.requestId==='req');assert.equal(cleared,false);
  const denied=createRepository({token:auth.token,clear(){cleared=true;}},async()=>response({error:{message:'Invalid identity'}},401));
  await assert.rejects(denied.me(),x=>x.status===401);assert.equal(cleared,true);
});
test('upload uses raw audio, backend URL and bearer token',async()=>{
  let received;const api=createRepository(auth,async(url,options)=>{received={url,...options};return response(null,204);});
  const blob=new Blob(['audio'],{type:'audio/webm;codecs=opus'});await api.upload('/api/v1/audio/id/upload?signature=abc',blob);
  assert.equal(received.method,'PUT');assert.equal(received.body,blob);assert.equal(received.headers['Content-Type'],'audio/webm');assert.equal(received.url,'/api/v1/audio/id/upload?signature=abc');
});
test('refreshes concurrently once and never stores passwords',async()=>{
  const values=new Map([['dreamthread.auth.v1',JSON.stringify({access_token:'expired',refresh_token:'refresh',expires_at:1})]]);
  const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};let count=0;
  const a=createAuth({supabaseUrl:'https://auth.example',supabasePublishableKey:'public'},storage,async(url,opts)=>{count++;assert.ok(url.endsWith('token?grant_type=refresh_token'));assert.equal(JSON.parse(opts.body).refresh_token,'refresh');return response({access_token:'fresh',refresh_token:'new-refresh',expires_in:3600});});
  assert.deepEqual(await Promise.all([a.token(),a.token()]),['fresh','fresh']);assert.equal(count,1);a.clear();assert.equal(await a.token(),null);
});
test('expired refresh clears identity, transient auth outage preserves session',async()=>{
  const storage={getItem:()=>JSON.stringify({access_token:'expired',refresh_token:'refresh',expires_at:1}),setItem(){},removeItem(){}};
  const a=createAuth({supabaseUrl:'https://auth.example',supabasePublishableKey:'public'},storage,async()=>response({message:'Expired'},400));
  await assert.rejects(a.token());assert.equal(await a.token(),null);
});
