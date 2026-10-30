import test from 'node:test';
import assert from 'node:assert/strict';
import { repository } from '../frontend/js/data/repository.js';
import { motifs, chapters } from '../frontend/js/data/fixtures.js';

test('reference journal has six entries; source-only entry is accessible by citation', async () => {
  assert.equal((await repository.listDreams()).length,6);
  assert.equal((await repository.getDream('09')).title,'Rooms that keep changing');
  assert.equal(await repository.getDream('missing'),null);
});
test('search matches text, tags, and emotions without case sensitivity', async () => {
  assert.deepEqual((await repository.listDreams({query:' OCEAN '})).map(d=>d.id),['02']);
  assert.deepEqual((await repository.listDreams({query:'freedom'})).map(d=>d.id),['02']);
  assert.equal((await repository.listDreams({query:'unmatched text'})).length,0);
});
test('date filtering uses the fixed reference date, including the 30-day boundary', async () => {
  assert.deepEqual((await repository.listDreams({days:30})).map(d=>d.id),['01','02','03','04']);
});
test('combined filters intersect rather than overwrite each other', async () => {
  assert.deepEqual((await repository.listDreams({days:30,emotion:'Calm'})).map(d=>d.id),['02']);
  assert.deepEqual((await repository.listDreams({emotion:'Fear'})).map(d=>d.id),['01','04']);
});
test('motif source and chapter links resolve to stable entries', async () => {
  for (const motif of Object.values(motifs)) for (const id of motif.ids) assert.ok(await repository.getDream(id));
  for (const c of chapters) assert.ok(await repository.getDream(c.id));
  assert.deepEqual((await repository.listDreams({ids:motifs.house.ids,includeSources:true})).map(d=>d.id),['01','04','09']);
  assert.deepEqual(await repository.listDreams({ids:[]}),[]);
});
test('UI edits to returned objects cannot alter fixture content', async () => {
  const d = await repository.getDream('01');
  d.title='Changed'; d.tags.push('Changed');
  const original = await repository.getDream('01');
  assert.equal(original.title,'The house in the forest');
  assert.ok(!original.tags.includes('Changed'));
});
