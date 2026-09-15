import {NS, child, children, descendants, serialize, setPosition,selectedIds} from './core.js';
const candidateCache=new WeakMap();

export function textBoxInfo(element) {
  if(!element)return null;
  const node=element.node,body=child(node,'txBody'),props=child(body,'bodyPr');
  const nv=child(node,'nvSpPr'),cp=child(nv,'cNvSpPr');
  const spPr=child(node,'spPr'),line=child(spPr,'ln'),boxFlag=cp?.getAttribute('txBox');
  // Some PPTX generators omit txBox on plain text rectangles.
  const plainText=!boxFlag&&child(spPr,'prstGeom')?.getAttribute('prst')==='rect'&&!!child(spPr,'noFill')&&(!line||!children(line).length||!!child(line,'noFill'))&&!child(node,'style');
  const isBox=['1','true'].includes(boxFlag)||!!descendants(nv,'ph').length||plainText;
  if(element.kind!=='sp'||!element.g||!body||!isBox||!descendants(body,'t').some(t=>t.textContent.trim()))return null;
  const vertical=props?.getAttribute('vert');
  const unsupported=(vertical&&vertical!=='horz')||Number(props?.getAttribute('numCol')||1)>1||Number(props?.getAttribute('rot')||0)!==0;
  const normal=child(props,'normAutofit');
  const fontScale=Number(normal?.getAttribute('fontScale')||100000)/100000;
  const lineScale=1-Number(normal?.getAttribute('lnSpcReduction')||0)/100000;
  return {body,props,unsupported:!!unsupported,fontScale:fontScale>0?fontScale:1,lineScale:lineScale>0?lineScale:1};
}

/** Return eligible descriptors; descriptor-array replacement (including undo) invalidates eligibility. */
export function fitCandidates(deck,checked,selection,scope) {
  const result=[];
  if(!deck)return result;
  for(const i of checked){const slide=deck.slides[i];
    let candidates=candidateCache.get(slide.elements);
    if(!candidates){candidates=slide.elements.flatMap(element=>{const info=textBoxInfo(element);return info?[{element,info}]:[];});candidateCache.set(slide.elements,candidates);}
    const value=selection.get(i),ids=scope==='selected'?(value instanceof Set?value:new Set(selectedIds(value))):null;
    for(const {element,info} of candidates){
    if(ids&&!ids.has(element.id))continue;
    result.push({slide,element,info});
  }}
  return result;
}

// Capture the original preview styles once so repeated fits and undo never
// compound font-size corrections from PowerPoint's normAutofit fontScale.
export function captureTextStyles(text) {
  for(const node of [text,...text.querySelectorAll('*')]){
    for(const [style,key]of [['fontSize','fitFont'],['letterSpacing','fitSpacing'],['marginTop','fitMargin']]){
      if(node.style[style]?.endsWith('px'))node.dataset[key]=String(parseFloat(node.style[style]));
    }
    if(node.tagName==='P'&&node.style.lineHeight&&!node.style.lineHeight.endsWith('px'))node.dataset.fitLine=node.style.lineHeight;
  }
}

export function scaleTextPreview(text,fontRatio=1,lineRatio=1) {
  for(const node of [text,...text.querySelectorAll('*')]){
    for(const [style,key]of [['fontSize','fitFont'],['letterSpacing','fitSpacing'],['marginTop','fitMargin']]){
      if(node.dataset[key]!==undefined)node.style[style]=`${Number(node.dataset[key])*fontRatio}px`;
    }
    if(node.dataset.fitLine!==undefined)node.style.lineHeight=String(Number(node.dataset.fitLine)*lineRatio);
  }
}

export async function measureTextBoxes(candidates,previews,document) {
  if(document.fonts?.ready)await document.fonts.ready;
  const host=document.createElement('div');
  host.style.cssText='position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;contain:layout style;';
  document.body.append(host);
  const shadow=host.attachShadow({mode:'open'});
  const reset=document.createElement('style');
  reset.textContent=':host{font-family:Arial,"Noto Sans KR",sans-serif;font-size:16px;line-height:normal}*{box-sizing:border-box}';
  shadow.append(reset);
  const prepared=[],skipped=[];
  const moverIndexes=new Map();
  try {
    for(const candidate of candidates){
      const {element,slide}=candidate,info=textBoxInfo(element);
      if(!info||info.unsupported){skipped.push(candidate);continue;}
      if(!moverIndexes.has(slide.index))moverIndexes.set(slide.index,new Map(Array.from(previews.get(slide.index)?.querySelectorAll('[data-pptx-mover]')||[],node=>[node.dataset.pptxMover,node])));
      const mover=moverIndexes.get(slide.index).get(element.id);
      const text=mover?.firstElementChild?.querySelector('.text-wrapper');
      if(info.unsupported||!text){skipped.push(candidate);continue;}
      const clone=text.cloneNode(true);
      const originalScale=Number(mover.dataset.originalFontScale||1),originalLine=Number(mover.dataset.originalLineScale||1);
      scaleTextPreview(clone,1/originalScale,1/originalLine);
      clone.style.position='relative';clone.style.left='0';clone.style.top='0';clone.style.bottom='auto';clone.style.right='auto';
      clone.style.transform='none';clone.style.height='auto';clone.style.minHeight='0';clone.style.maxHeight='none';clone.style.overflow='visible';
      clone.style.width=`${element.g.w/12700}px`;clone.style.whiteSpace='normal';
      // Match OOXML insets rather than the renderer's rounded/default insets.
      const inset=(key,def)=>Number(info.props?.getAttribute(key)||def)/12700;
      clone.style.padding=`${inset('tIns',45720)}px ${inset('rIns',91440)}px ${inset('bIns',45720)}px ${inset('lIns',91440)}px`;
      shadow.append(clone);prepared.push({...candidate,clone});
    }
    // Batch all writes before reading layout; no slide rendering or ZIP work.
    const changes=[];
    for(const item of prepared){
      const px=Math.max(item.clone.getBoundingClientRect().height,item.clone.scrollHeight);
      if(!Number.isFinite(px)||px<=0){skipped.push(item);continue;}
      changes.push({index:item.slide.index,id:item.element.id,height:Math.ceil((px+0.5)*12700)});
    }
    return {changes,skipped:skipped.length};
  } finally {host.remove();}
}

export function fitTextBoxes(deck,changes) {
  const elementIndexes=new Map();
  const plans=changes.map(change=>{
    const slide=deck.slides[change.index];
    if(slide&&!elementIndexes.has(slide))elementIndexes.set(slide,new Map(slide.elements.map(element=>[element.id,element])));
    const element=elementIndexes.get(slide)?.get(change.id),info=element&&textBoxInfo(element);
    if(!info||info.unsupported||!Number.isFinite(change.height)||change.height<=0||change.height>360000000)throw Error('텍스트 상자 높이를 계산할 수 없습니다.');
    return {...change,height:Math.round(change.height),slide,element,info};
  });
  const snapshots=new Map();
  for(const {slide,element,info,height}of plans){
    const already=element.g.h===height&&!!child(info.props,'spAutoFit')&&info.props?.getAttribute('wrap')==='square';
    if(already)continue;
    if(!snapshots.has(slide.index))snapshots.set(slide.index,{index:slide.index,xml:serialize(slide.doc),dirty:slide.dirty});
    setPosition(element,element.g.x,element.g.y);
    const transform=child(child(element.node,'spPr'),'xfrm');
    child(transform,'ext').setAttribute('cy',String(height));
    element.g={...element.g,h:height};
    let props=info.props;
    if(!props){props=slide.doc.createElementNS(NS.a,'a:bodyPr');info.body.insertBefore(props,info.body.firstChild);}
    for(const n of children(props))if(['normAutofit','noAutofit','spAutoFit'].includes(n.localName))props.removeChild(n);
    const auto=slide.doc.createElementNS(NS.a,'a:spAutoFit');
    const next=children(props).find(n=>['scene3d','sp3d','flatTx','extLst'].includes(n.localName));
    props.insertBefore(auto,next||null);props.setAttribute('wrap','square');
    slide.dirty=true;
  }
  return [...snapshots.values()];
}
