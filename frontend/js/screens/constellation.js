import { art } from '../data/fixtures.js';
import { tag, escapeHTML, dateText } from '../components/ui.js';

export const graphNodes=[
  {id:'house',category:'Places',x:334,y:296,size:108},
  {id:'ocean',category:'Places',x:566,y:136,size:68},
  {id:'stranger',category:'People',x:90,y:156,size:68},
  {id:'forest',category:'Places',x:130,y:496,size:68},
  {id:'door',category:'Places',x:570,y:496,size:68},
  {id:'fear',label:'Fear',category:'Emotions',x:334,y:116,color:'rose'},
  {id:'calm',label:'Calm',category:'Emotions',x:334,y:588,color:'teal'},
  {id:'grandmother',label:'Grandmother',category:'People',x:10,y:358,color:'lavender'},
];

export function graphEvidence(selected,model,dreams) {
  const motif=model.motifs[selected];
  const base=selected==='house';
  const special={fear:{label:'Fear',text:'Fear is named in these sample entries.',ids:['01','04','09']},calm:{label:'Calm',text:'Calm is named in these sample entries.',ids:['02','05','06']},grandmother:{label:'Grandmother',text:'This person is shown in the reference universe. No entry about Grandmother was supplied.',ids:[]}}[selected];
  const ids=base?['09','04','01',...motif.ids.filter(id=>id.startsWith('local-'))]:motif?.ids || model.emotionIds?.[selected] || special?.ids || [];
  const selectedDreams=ids.map(id=>dreams.find(d=>d.id===id)).filter(Boolean);
  const slots={ '09':{art:'door',quote:'A house with no stairs.'},'04':{art:'forest',quote:'Somebody was calling my name.'},'01':{art:'house',quote:'This time the windows were lit.'} };
  const image=motif?art[selected]:null;
  return `${image?`<img class="graph-evidence-image" src="${image}" alt="">`:''}<div><h2>${escapeHTML(motif?.heading || special?.label || 'Dream connections')}</h2><p class="small muted">${base?`The house appears in ${motif.count} dreams.`:escapeHTML(motif?.summary || special?.text || '')}</p></div>
    ${base?`<div class="emotion-arc row">${tag('Fear')}<span class="muted">→</span>${tag('Uneasy')}<span class="muted">→</span>${tag('Calm')}</div><p class="small muted tone-note">Tone changes across the dreams. The cause is unknown.</p>`:''}
      ${selectedDreams.length?`<h3>Evidence</h3><div class="graph-sources">${selectedDreams.map(d=>{const slot=base&&slots[d.id];return `<a class="source graph-source" href="#/dream/${d.id}"><img class="source-thumb" src="${art[slot?.art || d.art]}" alt=""><span class="source-copy"><time>${dateText(d.date,false)} · ${d.local?'Local entry':'#'+d.id}</time><span>${base&&d.id==='04'?'“Somebody was calling my<br>name.”':`“${escapeHTML(slot?.quote || d.excerpt)}”`}</span></span></a>`;}).join('')}</div>`:''}
    <div class="graph-evidence-actions">${selectedDreams.length?`<a class="button primary full" href="#/journal?${motif?'motif='+selected:'emotion='+special.label}">View all sources</a>`:''}<a class="button full" href="#/detective?motif=${motif?selected:base?'house':selected}">Ask Dream Detective</a></div>`;
}

export function constellation(g,model,dreams) {
  return `<section class="constellation-layout">
    <section class="graph-panel panel" aria-label="Interactive dream constellation">
      <div class="graph-viewport" tabindex="0" aria-label="Dream graph. Select nodes, drag to pan, use plus or minus to zoom, arrow keys to pan, and zero to reset."><div class="graph-plane">
        <img class="graph-connectors" src="assets/figma/d5413.svg" alt="">
        <svg class="graph-filtered-lines" width="788" height="704" aria-hidden="true">${g.filter==='Places'?graphNodes.filter(n=>n.category==='Places'&&n.id!=='house').map(n=>`<line x1="394" y1="350" x2="${n.x+60}" y2="${n.y+n.size/2}" stroke="#ae95f6" stroke-width="1.5"/>`).join(''):''}</svg>
        ${graphNodes.map(node=>{const m=model.motifs[node.id];const visible=g.filter==='All'||node.category===g.filter;return `<button class="graph-node ${g.selected===node.id?'selected':''} ${node.size?'image-node':'dot-node'}" style="left:${node.x}px;top:${node.y}px;--node-size:${node.size || 24}px" data-graph-node="${node.id}" data-category="${node.category}" ${!visible?'hidden':''} aria-label="${m?.label || node.label}${m?', '+m.count+' dreams':''}" aria-pressed="${g.selected===node.id}">${node.size?`<span class="graph-node-image motif-image" data-art="${node.id}">${['house','forest','door'].includes(node.id)?`<img src="${art[node.id]}" alt="">`:''}</span>`:`<span class="graph-dot ${node.color}"></span>`}<span class="graph-label">${m?.label || node.label}</span>${m?`<span class="graph-count">${m.count} dreams</span>`:''}</button>`;}).join('')}
      </div></div>
      <header class="graph-header"><h3>Your dream universe</h3><div class="row" aria-label="Filter graph nodes">${['All','Places','People','Emotions'].map(label=>`<button class="chip ${g.filter===label?'selected':''}" data-graph-filter="${label}" aria-pressed="${g.filter===label}">${label}</button>`).join('')}</div></header>
      <div class="graph-legend"><span><i class="lavender"></i>Place or person</span><span><i class="rose"></i>Emotion</span><span><i class="teal"></i>Feeling shift</span></div>
      <div class="graph-zoom"><button data-zoom="in" aria-label="Zoom in">+</button><button data-zoom="out" aria-label="Zoom out">−</button></div>
      <button class="graph-reset text-link" data-action="graph-reset" title="Reset graph view">Reset view</button>
    </section>
    <aside class="panel graph-evidence" aria-label="Selected graph evidence" tabindex="-1">${graphEvidence(g.selected,model,dreams)}</aside>
  </section><p class="small muted graph-demo-note">Demo universe · ${model.availableDreams} available entries${model.localDreams?' · '+model.localDreams+' saved locally':''}. The overview totals show the reference design.</p>`;
}

// The source SVG keeps its own natural 788 × 704 dimensions. Transform its
// containing plane so nodes, stars, and connectors pan/zoom together.
export function mountGraph(g,onSelect) {
  const viewport=document.querySelector('.graph-viewport');
  const plane=viewport?.querySelector('.graph-plane');
  if (!viewport || !plane) return {dispose(){},update(){}};
  let drag=null;
  let moved=false;
  const fit=()=>Math.min(viewport.clientWidth/788,viewport.clientHeight/704);
  const update=()=>{
    plane.style.setProperty('--graph-fit',String(fit()));
    plane.style.transform=`translate(${g.panX}px,${g.panY}px) scale(${fit()*g.zoom})`;
    plane.classList.toggle('filtered',g.filter!=='All');
    document.querySelectorAll('[data-graph-node]').forEach(el=>{
      el.hidden=g.filter!=='All' && el.dataset.category!==g.filter;
      el.classList.toggle('selected',el.dataset.graphNode===g.selected);
      el.setAttribute('aria-pressed',String(el.dataset.graphNode===g.selected));
    });
    document.querySelectorAll('[data-graph-filter]').forEach(el=>{
      const selected=el.dataset.graphFilter===g.filter;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));
    });
  };
  const zoom=direction=>{
    const old=g.zoom,next=Math.max(.65,Math.min(2.8,old*(direction==='in'?1.2:1/1.2)));
    const cx=viewport.clientWidth/2,cy=viewport.clientHeight/2;
    g.panX=cx-(cx-g.panX)*next/old;g.panY=cy-(cy-g.panY)*next/old;g.zoom=next;update();
  };
  const down=e=>{moved=false;if (e.button!==0 || e.target.closest('button')) return;drag={x:e.clientX,y:e.clientY,panX:g.panX,panY:g.panY};viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');};
  const move=e=>{if(!drag)return;const x=e.clientX-drag.x,y=e.clientY-drag.y;moved ||= Math.abs(x)+Math.abs(y)>4;g.panX=drag.panX+x;g.panY=drag.panY+y;update();};
  const up=e=>{drag=null;viewport.classList.remove('dragging');if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);};
  const click=e=>{const node=e.target.closest('[data-graph-node]');if(node && !moved)onSelect(node.dataset.graphNode);};
  const key=e=>{
    if(e.target.closest('button'))return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();g.panX+=e.key==='ArrowLeft'?30:e.key==='ArrowRight'?-30:0;g.panY+=e.key==='ArrowUp'?30:e.key==='ArrowDown'?-30:0;update();}
    if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0'){g.zoom=1;g.panX=g.panY=0;update();}else zoom(e.key==='-'?'out':'in');}
  };
  viewport.addEventListener('pointerdown',down);viewport.addEventListener('pointermove',move);viewport.addEventListener('pointerup',up);viewport.addEventListener('pointercancel',up);viewport.addEventListener('click',click);viewport.addEventListener('keydown',key);
  const observer=new ResizeObserver(update);observer.observe(viewport);update();
  return {update,zoom,dispose(){observer.disconnect();}};
}
