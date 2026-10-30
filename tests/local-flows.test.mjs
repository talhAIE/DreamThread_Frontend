import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalRepository, STORAGE_KEYS } from '../frontend/js/data/local-repository.js';

function store() {const values=new Map();return {getItem:k=>values.get(k) ?? null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}

test('save preserves whitespace, quotes, and original text independently of the demo reading',async()=>{
  const repo=createLocalRepository();
  const original='  A HOUSE by the forest.\nI stayed outside.  ';
  const d=await repo.saveDream({title:'  My dream  ',original,emotions:['Fear','Fear'],analysis:{reading:'stale'}});
  assert.equal(d.original,original);assert.equal(d.title,'My dream');assert.notEqual(d.reading,'stale');
  assert.deepEqual(d.emotions,['Fear']);assert.deepEqual(d.linkIds,['01','04','09']);assert.equal(d.analysisDemo,true);
});
test('saved entries survive a new repository instance and appear in journal, search, and graph',async()=>{
  const storage=store(),first=createLocalRepository(storage);
  const d=await first.saveDream({title:'Lantern house',original:'A house with a lantern.',emotions:['Calm']});
  const second=createLocalRepository(storage);
  assert.equal((await second.getDream(d.id)).original,'A house with a lantern.');
  assert.equal((await second.listDreams()).length,7);
  assert.equal((await second.listDreams({query:'lantern'}))[0].id,d.id);
  const graph=await second.getConstellation();assert.equal(graph.motifs.house.count,4);assert.ok(graph.motifs.house.ids.includes(d.id));assert.equal(graph.availableDreams,8);
});
test('draft restoration is independent of saved entries; saving clears the draft',async()=>{
  const storage=store(),repo=createLocalRepository(storage);
  await repo.saveDraft({original:'A draft by the ocean',title:'Not saved',emotions:[],mode:'text'});
  const restored=createLocalRepository(storage);
  assert.equal((await restored.getDraft()).original,'A draft by the ocean');assert.equal((await restored.listDreams()).length,6);
  await restored.saveDream({original:'A draft by the ocean'});assert.equal(await createLocalRepository(storage).getDraft(),null);
});
test('empty and oversized entries are rejected without mutation',async()=>{
  const repo=createLocalRepository();
  await assert.rejects(repo.saveDream({original:' \n '}));await assert.rejects(repo.saveDream({original:'a'.repeat(20001)}));
  assert.equal((await repo.listDreams()).length,6);
});
test('corrupt local records cannot replace the supplied fixture IDs',async()=>{
  const storage=store();storage.setItem(STORAGE_KEYS.entries,JSON.stringify([{id:'01',title:'Altered'},null]));
  const repo=createLocalRepository(storage);assert.equal((await repo.getDream('01')).title,'The house in the forest');
});
test('storage failure keeps working in explicitly reported session mode',async()=>{
  const storage={getItem(){return null},setItem(){throw Error('quota')},removeItem(){}};
  const repo=createLocalRepository(storage);const d=await repo.saveDream({original:'An ocean dream.'});
  assert.equal(repo.storageMode,'session');assert.ok(await repo.getDream(d.id));
});
test('reset removes locally authored records and drafts while preserving all reference sources',async()=>{
  const storage=store(),repo=createLocalRepository(storage);
  await repo.saveDream({original:'A house.'});await repo.saveDraft({original:'Draft'});storage.setItem(STORAGE_KEYS.memory,'["01"]');
  await repo.resetDemo();assert.equal((await repo.listDreams()).length,6);assert.equal(await repo.getDraft(),null);
  assert.equal(storage.getItem(STORAGE_KEYS.memory),null);assert.ok(await repo.getDream('09'));
});
test('Detective answers cite only resolvable evidence and unsupported questions have no citations',async()=>{
  const repo=createLocalRepository();
  for(const question of ['Why does the house return?','How does the ocean feel?','What connects the forest?','Who is the stranger?','What about doors?']){
    const answer=await repo.askDetective(question);assert.equal(answer.demo,true);assert.ok(answer.sources.length);
    for(const id of answer.sources)assert.ok(await repo.getDream(id));
  }
  assert.deepEqual((await repo.askDetective('How does the ocean feel?')).sources,['02']);
  assert.deepEqual((await repo.askDetective('Predict tomorrow’s weather')).sources,[]);
  await assert.rejects(repo.askDetective(' '));
});
test('unmatched captures do not invent a motif or linked evidence',async()=>{
  const result=await createLocalRepository().analyzeDream('Purple geometric shapes.');
  assert.equal(result.motif,null);assert.deepEqual(result.linkIds,[]);
});
test('storyline returns independent data and no fabricated unknown storyline',async()=>{
  const repo=createLocalRepository();const story=await repo.getStoryline();story.chapters[0].title='Changed';
  assert.notEqual((await repo.getStoryline()).chapters[0].title,'Changed');assert.equal(await repo.getStoryline('unknown'),null);
});
test('new motif summaries and emotion evidence include locally saved records',async()=>{
  const repo=createLocalRepository();const dream=await repo.saveDream({original:'I floated in the ocean.',emotions:['Calm']});
  const graph=await repo.getConstellation();assert.equal(graph.motifs.ocean.count,3);assert.match(graph.motifs.ocean.summary,/3 dreams/);
  assert.ok(graph.emotionIds.calm.includes(dream.id));assert.ok(!graph.emotionIds.fear.includes(dream.id));
});
test('a blocked browser reset reports failure rather than claiming data was removed',async()=>{
  const storage={getItem(){return null},setItem(){},removeItem(){throw Error('denied')}};
  const repo=createLocalRepository(storage);await repo.saveDream({original:'A house.'});
  await assert.rejects(repo.resetDemo(),/browser blocked/);assert.equal((await repo.listDreams()).length,7);
});
