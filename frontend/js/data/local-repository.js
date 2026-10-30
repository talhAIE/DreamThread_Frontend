import { dreams as fixtures, motifs, chapters, art } from './fixtures.js';

export const DEMO_DATE = '2026-10-30';
export const STORAGE_KEYS = Object.freeze({ entries:'dreamthread.demo.entries.v1', draft:'dreamthread.demo.draft.v1', memory:'dreamthread.demo.memory.v1' });
export const SAMPLE_TRANSCRIPT = '“I was walking through a dark forest. There was a house, and someone watched me from the window…”';
const clone = value => JSON.parse(JSON.stringify(value));
const has = (object,key) => Object.hasOwn(object,key);
const validLocal = d => d && typeof d.id==='string' && /^local-[a-z0-9-]+$/i.test(d.id) && typeof d.title==='string' && typeof d.original==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && Number.isFinite(Date.parse(d.date+'T00:00:00Z')) && ['Voice','Text'].includes(d.type) && Array.isArray(d.tags) && d.tags.every(t=>typeof t==='string') && Array.isArray(d.emotions) && d.emotions.every(t=>typeof t==='string') && has(art,d.art);
const read = (storage,key,fallback) => { try { return JSON.parse(storage?.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
const unique = values => [...new Set(values)];

export function createLocalRepository(storage = null) {
  let custom = read(storage,STORAGE_KEYS.entries,[]);
  custom = Array.isArray(custom) ? custom.filter(validLocal) : [];
  let draft = read(storage,STORAGE_KEYS.draft,null);
  let persistent = !!storage;
  const write = (key,value) => {
    if (!storage) return;
    try { storage.setItem(key,JSON.stringify(value)); } catch { persistent=false; }
  };
  const all = () => [...custom,...fixtures];
  const get = id => all().find(d=>d.id===id);
  const localMatches = key => custom.filter(d => d.motif===key || d.tags.some(tag=>tag.toLowerCase()===(key==='door'?'doors':key)));
  const api = {
    get storageMode() { return persistent ? 'device' : 'session'; },
    async listDreams({query='',emotion='',days=null,ids=null,includeSources=false} = {}) {
      const term = query.trim().toLocaleLowerCase();
      const cutoff = days ? Date.parse(DEMO_DATE+'T00:00:00Z')-days*86400000 : null;
      return clone(all().filter(d => (includeSources || !d.sourceOnly) && (!ids || ids.includes(d.id)) &&
        (!term || [d.title,d.excerpt,d.original || '',...d.tags,...d.emotions].join(' ').toLocaleLowerCase().includes(term)) &&
        (!emotion || d.emotions.includes(emotion)) && (!cutoff || Date.parse(d.date+'T00:00:00Z')>=cutoff)));
    },
    async getDream(id) { return get(id) ? clone(get(id)) : null; },
    async analyzeDream(original,emotions=[]) {
      if (typeof original!=='string' || !original.trim()) throw new Error('Write a few words about your dream first.');
      const text=original.toLowerCase();
      const motif = /house|home|room|window/.test(text)?'house':/ocean|sea\b|water/.test(text)?'ocean':/forest|pine|tree|path/.test(text)?'forest':/stranger|person|someone/.test(text)?'stranger':/door/.test(text)?'door':null;
      const themes = original===SAMPLE_TRANSCRIPT ? ['Being watched','A familiar place','Forest at night','Unanswered calls'] : motif ? [motif==='house'?'A familiar place':motifs[motif].label,...(/watch/.test(text)?['Being watched']:[]),...(/forest/.test(text)&&motif!=='forest'?[/dark|night/.test(text)?'Forest at night':'Forest']:[])] : ['A new dream','Your own associations'];
      const linkIds = motif ? motifs[motif].ids.filter(id=>get(id)) : [];
      return { demo:true, motif, themes, emotions:unique(emotions), linkIds,
        reading:motif ? `This demo groups your entry with the ${motifs[motif].label.toLowerCase()} motif because of words in the text. What that image means to you is open to your own interpretation.` : 'This demo has no matching motif. Your original words are preserved; you can decide what they mean to you.',
        question:motif==='house'?'Does this house feel familiar to you?':'What feeling stays with you from this dream?' };
    },
    async saveDream({title,original,emotions=[],type='Text',analysis=null,interview=null}) {
      if (typeof original!=='string' || !original.trim()) throw new Error('Your dream needs some text before it can be saved.');
      if (original.length>20000) throw new Error('Keep this local demo entry under 20,000 characters.');
      // Always derive the saved reading from the exact submitted text.
      const result = await api.analyzeDream(original,emotions);
      const id='local-'+(globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
      const record={id,title:String(title || '').trim().slice(0,120) || 'An untitled dream',original,
        excerpt:original.length>150?original.slice(0,147)+'…':original,date:DEMO_DATE,type:type==='Voice'?'Voice':'Text',
        art:result.motif || 'forest',motif:result.motif,tags:result.motif?[motifs[result.motif].label]:['New dream'],
        emotions:unique(emotions.filter(e=>typeof e==='string')).slice(0,10),reading:result.reading,linkIds:result.linkIds,interview,
        local:true,analysisDemo:true,recordingSimulated:type==='Voice'};
      custom.unshift(record); write(STORAGE_KEYS.entries,custom); draft=null;
      try { storage?.removeItem(STORAGE_KEYS.draft); } catch { persistent=false; }
      return clone(record);
    },
    async getDraft() {
      if (!draft || typeof draft.original!=='string') return null;
      return clone(draft);
    },
    async saveDraft(value) {
      draft=clone(value); write(STORAGE_KEYS.draft,draft);
      return {storage:api.storageMode};
    },
    async clearDraft() { draft=null; try { storage?.removeItem(STORAGE_KEYS.draft); } catch { persistent=false; } },
    async getConstellation() {
      const model=Object.fromEntries(Object.entries(motifs).map(([key,m])=>{
        const matches=localMatches(key),count=m.count+matches.length;
        return [key,{...clone(m),ids:unique([...m.ids,...matches.map(d=>d.id)]),count,summary:matches.length?`${m.label} appears in ${count} dreams.`:m.summary}];
      }));
      return { motifs:model,availableDreams:all().length,localDreams:custom.length,
        emotionIds:{fear:all().filter(d=>d.emotions.includes('Fear')).map(d=>d.id),calm:all().filter(d=>d.emotions.includes('Calm')).map(d=>d.id)},
        referenceTotals:{dreams:18,motifs:7,storylines:4} };
    },
    async getStoryline(id='house') { return id==='house' ? {id,title:'The house',chapters:clone(chapters)} : null; },
    async askDetective(question) {
      if (typeof question!=='string' || !question.trim()) throw new Error('Ask a question about the sample dreams.');
      const q=question.toLowerCase();
      if (/house|home|return|recurr/.test(q) || (/fear|calm|emotion|feel/.test(q) && !/ocean|sea\b|water|forest|pine|tree|path|stranger|person|someone|door|knock/.test(q))) return {demo:true,
        text:'Across three entries the house recurs, while your described feelings shift from fear to calm. The cause is unclear, but the change itself is notable.',
        sources:['01','04','09'],followup:'What changed in your life between August and October?'};
      if (/ocean|sea\b|water|freedom/.test(q)) return {demo:true,text:'In “An ocean without edges,” you described floating in an endless ocean, with warm water full of light. The entry is tagged Ocean and Freedom. This sample does not establish why the image appeared.',sources:['02'],followup:'What did the warmth and light feel like to you?'};
      if (/forest|pine|tree|path/.test(q)) return {demo:true,text:'The forest appears in “The house in the forest” and “Paths between the pines.” One mentions staying on a path, and the other describes a trail that keeps splitting. These are shared details, rather than an explanation of their cause.',sources:['01','05'],followup:'What feels familiar about these paths?'};
      if (/stranger|person|someone/.test(q)) return {demo:true,text:'“The familiar stranger” describes a person you do not know but feel you have always known. You walked together without speaking. The sample gives no further evidence about who that person represents.',sources:['03'],followup:'What feeling did their presence leave with you?'};
      if (/door|knock/.test(q)) return {demo:true,text:'In “A knock at the front door,” somebody called your name from behind a door that would not open. The sample tags include Doors and Fear; it does not establish the meaning of the door.',sources:['04'],followup:'What do you remember feeling at the doorway?'};
      return {demo:true,text:'I don’t have evidence in these sample entries to answer that question. Try asking about the house, ocean, forest, stranger, doors, or the shift from fear to calm.',sources:[],followup:''};
    },
    async resetDemo() {
      let cleared=true;
      for (const key of Object.values(STORAGE_KEYS)) try { storage?.removeItem(key); } catch { persistent=false;cleared=false; }
      if(!cleared)throw new Error('The browser blocked removal of local data. Clear this site’s data in browser settings to finish resetting the demo.');
      custom=[]; draft=null;
    },
  };
  return api;
}
