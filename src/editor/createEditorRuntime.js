import {ElementDeletion} from './ElementDeletion.js';
import {RecentFilesRepository} from '../services/RecentFilesRepository.js';
import {AppearanceMatcher} from './AppearanceMatcher.js';
import {ElementSearchIndex} from './ElementSearchIndex.js';
import {SlideSearchIndex} from './SlideSearchIndex.js';
import {layoutActionLabel} from './layout-options.js';
import {RangeSelection} from './RangeSelection.js';
import {BoxSelectionGesture} from './BoxSelectionGesture.js';
import {deckHasCharts} from './chart-dependencies.js';
import {PreviewViewport} from './PreviewViewport.js';
import {loadGuides,restoreGuides,prepareGuideExport} from './guides.js';
import {createGuideUI} from './guide-ui.js';
import {alignSelected,constrainDrag} from './layout.js';
import {EventScope} from './EventScope.js';
import {fitCandidates,measureTextBoxes,fitTextBoxes} from './text-fit.js';
import {tagRenderer,cachePreview,syncPreviewPositions,syncPreviewPresence} from './preview-cache.js';
import {PreviewTheme} from './preview-theme.js';
import {loadDeck,hitTest,corners,moveSelected,movePlans,selectedInSlide,selectionBounds,visualBounds,restore,exportDeck,parseRange,EMU_PER_CM} from './core.js';

/**
 * Mount the imperative preview engine inside a React-owned editor shell.
 * React owns summaries/lists; this engine owns preview descendants and uncontrolled fields.
 * @param {HTMLElement} root Editor root (queries are scoped to this instance).
 * @param {EditorStore} store Observable presentation state, without XML/DOM objects.
 * @param {PreviewResources} resources Lazy, shared renderer/ZIP loader.
 * @returns {object} Commands and an idempotent dispose method.
 */
export function createEditorRuntime(root, store, resources) {
const events = new EventScope();
const toolLifecycle = new AbortController();
let disposed = false;
const ensureActive = () => { if (disposed) throw new DOMException('Editor disposed', 'AbortError'); };
const $=id=>root.querySelector(`#${CSS.escape(id)}`),state={deck:null,name:'',checked:new Set(),selected:new Map(),allSelected:new Map(),reference:null,point:null,undo:[],busy:false,previews:new Map(),failed:new Set(),drag:null,boxSelection:null};
const recentFiles=new RecentFilesRepository();
let recentQueue=Promise.resolve(),recentPending=0;
function updateRecent(patch){if(!disposed)store.update({recentFiles:{...store.getSnapshot().recentFiles,...patch}});}
function recentError(error){return error?.name==='QuotaExceededError'
  ?'브라우저 저장 공간이 부족합니다. 최근 파일을 삭제한 뒤 다시 시도하세요.'
  :'최근 파일 보관을 사용할 수 없습니다. 브라우저 저장소 설정을 확인하거나 다시 시도하세요.';}
function recentAction(action=()=>{}) {
  if(disposed)return Promise.resolve(false);
  recentPending++;updateRecent({busy:true,error:''});
  const task=recentQueue.then(async()=>{
    ensureActive();await action();ensureActive();
    const files=await recentFiles.list();ensureActive();updateRecent({files,error:''});return true;
  }).catch(error=>{updateRecent({error:recentError(error)});return false;})
    .finally(()=>{recentPending--;updateRecent({busy:recentPending>0});});
  recentQueue=task;return task;
}
function refreshRecentFiles(){return recentAction();}
function removeRecentFile(id){if(state.busy||store.getSnapshot().recentFiles.busy)return;return recentAction(()=>recentFiles.remove(id));}
function clearRecentFiles(){if(state.busy||store.getSnapshot().recentFiles.busy)return;return recentAction(()=>recentFiles.clear());}
let guideUI=null;
let searchIndex=new SlideSearchIndex();
let elementSearchIndex=new ElementSearchIndex(),elementSearchCache=null;
const kindLabel={sp:'도형 / 텍스트',pic:'이미지',graphicFrame:'표 / 차트',cxnSp:'연결선',grpSp:'그룹'};
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function status(text){if(!disposed)store.update({status:text});}
function notice(text){if(!disposed)store.update({notice:text||''});}
function busy(value){if(disposed)return;state.busy=value;store.update({busy:value});for(const id of ['delete-selection','match-appearance','box-select-mode','move','undo','apply-range','clear-selection','fit-text','fit-scope','layout-target','guide-horizontal','guide-vertical','guide-select','guide-position','guide-apply','guide-delete','guides-visible','guides-edit','guides-snap']){const el=$(id);if(el)el.disabled=value;}for(const el of root.querySelectorAll('.card-head input,[data-layout]'))el.disabled=value;$('only-checked').disabled=value;if(!value)updateInspector();}
function error(err){notice(err?.message||String(err));status('작업을 완료하지 못했습니다.');}
function syncSelection(){state.selected=new Map([...state.allSelected].filter(([i,ids])=>state.checked.has(i)&&ids.size));}
function selectedElements(){if(!state.deck)return [];return [...state.selected].flatMap(([i,ids])=>selectedInSlide(state.deck.slides[i],ids).map(element=>({slide:state.deck.slides[i],element})));}
function referenceElements(){const i=state.selected.has(state.reference)?state.reference:state.selected.keys().next().value;return i===undefined?[]:selectedInSlide(state.deck.slides[i],state.selected.get(i));}
function updatePositionFields(){const bounds=selectionBounds(referenceElements());if(bounds&&$('move-mode').value==='absolute'){$('x').value=(bounds.x/EMU_PER_CM).toFixed(2);$('y').value=(bounds.y/EMU_PER_CM).toFixed(2);}}
function resetSelection(){cancelActiveDrag?.();nudgeHistory=null;state.allSelected.clear();syncSelection();state.point=null;updateInspector();updateOverlays();}
function selectAt(x,y,reference=null,mode='replace'){
  if(!state.deck||state.busy)return;
  const strict=$('match-appearance').checked;
  reference=reference??state.reference??[...state.checked][0]??0;
  const sourceSlide=state.deck.slides[reference],source=sourceSlide&&hitTest(sourceSlide,x,y);
  const matcher=strict?new AppearanceMatcher(state.deck):null;
  nudgeHistory=null;state.point={x,y};state.reference=reference;
  if(mode==='replace')state.allSelected.clear();
  // Remember corresponding IDs on unchecked slides so changing scope preserves
  // a multi-selection even after its checked-slide objects have moved.
  for(const slide of state.deck.slides){
    const hit=hitTest(slide,x,y);if(!hit || (matcher && !matcher.matches(source,hit,sourceSlide,slide)))continue;
    const ids=new Set(state.allSelected.get(slide.index)||[]);
    mode==='remove'?ids.delete(hit.id):ids.add(hit.id);
    ids.size?state.allSelected.set(slide.index,ids):state.allSelected.delete(slide.index);
  }
  syncSelection();updatePositionFields();updateInspector();updateOverlays();
  status(`${state.selected.size}개 슬라이드에서 ${selectedElements().length}개 요소를 선택했습니다.`);
}
function selectRange(rectangle, additive, reference) {
  if(state.busy || !state.deck)return;
  const sourceSlide=state.deck.slides[reference];
  const sources=sourceSlide?.elements.filter(element=>RangeSelection.contains(element,rectangle))||[];
  const matcher=$('match-appearance').checked?new AppearanceMatcher(state.deck):null;
  const accept=matcher?(element,slide)=>sources.some(source=>matcher.matches(source,element,sourceSlide,slide)):null;
  state.allSelected=RangeSelection.apply(state.deck,state.checked,state.allSelected,rectangle,additive,accept);
  state.reference=reference;state.point=null;syncSelection();
  updatePositionFields();updateInspector();updateOverlays();
  status(`${state.selected.size}개 슬라이드에서 ${selectedElements().length}개 요소를 영역으로 선택했습니다.`);
}

// Draft rectangles affect only nearby previews; geometry is scanned once on release.
function renderBoxSelection(indices) {
  for(const surface of viewport.surfaces(indices)) {
    const index=Number(surface.dataset.slide),svg=surface.querySelector('.hit-overlay');
    const draft=state.boxSelection;
    let rectangle=svg.querySelector('.box-selection');
    if(!draft || (!state.checked.has(index) && index!==draft.reference)) {
      if(rectangle)rectangle.style.display='none';
      continue;
    }
    if(!rectangle){rectangle=document.createElementNS(svg.namespaceURI,'rect');rectangle.classList.add('box-selection');svg.append(rectangle);}
    rectangle.style.display='';rectangle.classList.toggle('additive',draft.additive);
    for(const [key,value] of Object.entries(draft.rectangle))rectangle.setAttribute(key==='w'?'width':key==='h'?'height':key,value);
  }
}

function updateInspector(){
  const items=selectedElements(),n=items.length;
  $('delete-selection').disabled=!n||state.busy;
  $('move').disabled=!n||state.busy;$('undo').disabled=!state.undo.length||state.busy;
  const ref=referenceElements(),bounds=selectionBounds(ref);
  const size=bounds?`${ref.length>1?'선택 영역 · ':''}너비 ${(bounds.w/EMU_PER_CM).toFixed(2)} × 높이 ${(bounds.h/EMU_PER_CM).toFixed(2)} cm`:'';
  updateFitControls();updateLayoutControls();guideUI?.updateControls();
  const rows = !n&&!state.point ? [] : [...state.checked].sort((a,b)=>a-b).map(i=>{
    const elements=selectedInSlide(state.deck.slides[i],state.selected.get(i));
    return {index:i, matched:!!elements.length,
      label:elements.length?`${elements.length>1?elements.length+'개 · ':''}${elements.map(e=>e.text||e.name).join(' / ')}`:'선택된 요소 없음',
      title:elements.map(e=>`${kindLabel[e.kind]||e.kind} · ${e.name} · X ${(e.g.x/EMU_PER_CM).toFixed(2)} / Y ${(e.g.y/EMU_PER_CM).toFixed(2)} cm`).join('\n')};
  });
  store.updateSelection({count:n,slides:state.selected.size,size,rows});
  updateElementSearch();
}

function updateLayoutControls(){
  const counts=[...state.selected.values()].map(ids=>ids.size),target=$('layout-target').value;
  for(const button of root.querySelectorAll('[data-layout]')){const distribute=['horizontal','vertical'].includes(button.dataset.layout);button.disabled=state.busy||!counts.some(n=>n>=(distribute?3:target==='slide'?1:2));}
  const minimum=target==='slide'?1:2,eligible=counts.filter(count=>count>=minimum).length;
  $('layout-help').textContent=eligible?`${eligible}개 슬라이드의 선택 요소에 적용합니다. 가로는 X 위치, 세로는 Y 위치만 맞춥니다.`:target==='slide'?'슬라이드에 맞출 요소를 1개 이상 선택하세요.':'같은 슬라이드에서 요소를 2개 이상 선택하세요.';
}
function setChecked(next){cancelActiveDrag?.();nudgeHistory=null;state.checked=next;syncSelection();updatePositionFields();updateInspector();updateScope();updateSummary();updateOverlays();}
function updateElementSearch(query=store.getSnapshot().elementSearch.query) {
  if(disposed)return;
  // Scope sets are replaced by setChecked; selection/geometry changes can reuse matches.
  if(!elementSearchCache || elementSearchCache.index!==elementSearchIndex || elementSearchCache.query!==query || elementSearchCache.scope!==state.checked) {
    elementSearchCache={index:elementSearchIndex,query,scope:state.checked,matches:elementSearchIndex.find(query,state.checked)};
  }
  const matches=elementSearchCache.matches,previous=store.getSnapshot().elementSearch;
  const selected=matches.reduce((count,match)=>count+(state.selected.get(match.index)?.has(match.id)?1:0),0);
  const slides=new Set(matches.map(match=>match.index)).size;
  if(previous.query===query && previous.matches===matches && previous.selected===selected && previous.slides===slides)return;
  store.update({elementSearch:{query,matches,selected,slides}});
}
function applyElementSearch(action) {
  if(state.busy || disposed || !state.deck || !['select','remove'].includes(action))return;
  updateElementSearch();
  const {matches}=store.getSnapshot().elementSearch;if(!matches.length)return;
  const next=new Map(state.allSelected),updates=new Map();let changed=0;
  for(const {index,id} of matches) {
    if(!updates.has(index))updates.set(index,new Set(next.get(index)||[]));
    const ids=updates.get(index);
    if(action==='select' && !ids.has(id)){ids.add(id);changed++;}
    if(action==='remove' && ids.delete(id))changed++;
  }
  if(changed) {
    cancelActiveDrag?.();nudgeHistory=null;
    for(const [index,ids] of updates)if(ids.size)next.set(index,ids);else next.delete(index);
    state.allSelected=next;state.point=null;syncSelection();
    if(!state.selected.has(state.reference))state.reference=state.selected.keys().next().value??null;
    updatePositionFields();updateInspector();updateOverlays();
  }
  status(`${matches.length}개 요소 일치 · ${changed}개 요소를 ${action==='select'?'선택에 추가':'선택에서 해제'}했습니다.`);
}

function updateSlideSearch(query) {
  if(disposed)return;
  const previous=store.getSnapshot().slideSearch;
  const matches=searchIndex.find(query);
  if(previous.query===query && matches.length===previous.matches.length && matches.every((index,i)=>index===previous.matches[i]))return;
  store.update({slideSearch:{query,matches}});
}
function applySlideSearch(action) {
  if(state.busy || disposed || !state.deck || !['select','remove'].includes(action))return;
  const {matches}=store.getSnapshot().slideSearch;if(!matches.length)return;
  const next=new Set(state.checked);let changed=0;
  for(const index of matches) {
    if(action==='select' && !next.has(index)){next.add(index);changed++;}
    if(action==='remove' && next.delete(index))changed++;
  }
  if(changed)setChecked(next);
  status(`${matches.length}개 일치 · ${changed}개 슬라이드의 적용 대상을 ${action==='select'?'추가':'해제'}했습니다.`);
}

function updateSummary(){
  if(!state.deck)return;
  const changed=state.deck.slides.filter(s=>s.dirty).length;
  store.update({name:state.name,hasDeck:true,
    summary:`${state.deck.slides.length}개 슬라이드 · ${state.checked.size}개 적용 대상${changed?` · ${changed}개 수정됨`:''}${state.deck.guides?.dirty?' · 안내선 수정됨':''}`,
    size:`${(state.deck.width/EMU_PER_CM).toFixed(2)} × ${(state.deck.height/EMU_PER_CM).toFixed(2)} cm`});
}
function renderList(){
  store.updateSlides(state.deck?.slides.map(s=>({index:s.index,title:s.title,checked:state.checked.has(s.index)}))||[]);
}
const resizeObserver=new ResizeObserver(entries=>{for(const entry of entries){const frame=entry.target.querySelector('iframe');if(frame)frame.style.transform=`scale(${entry.contentRect.width/960})`;}});
const viewport=new PreviewViewport({root:$('stage'),onEnter:index=>{
  if(disposed || !state.deck)return;
  mountPreview(index);updateOverlays([index]);
}});

/** @param {number} index Preview slide to add to the scope without replacing remembered selections. */
function activatePreview(index) {
  if(disposed || state.busy || !state.deck?.slides[index] || state.checked.has(index))return false;
  cancelActiveDrag?.();state.reference=index;
  const checked=new Set(state.checked);checked.add(index);setChecked(checked);
  status(`슬라이드 ${index+1}을 적용 대상에 추가했습니다.`);
  return true;
}

/** @param {HTMLElement} surface Preview surface. @param {number} index Its slide index. */
function bindPreviewActivation(surface,index) {
  // Capture before element/guide handlers: the activation gesture must not also edit.
  surface.addEventListener('pointerdown',event=>{
    if(event.button!==0 || event.isPrimary===false || !activatePreview(index))return;
    event.preventDefault();event.stopImmediatePropagation();surface.focus({preventScroll:true});
  },{capture:true});
  surface.addEventListener('keydown',event=>{
    if(event.target!==surface || !['Enter',' '].includes(event.key) || !activatePreview(index))return;
    event.preventDefault();event.stopPropagation();
  });
}

/** @param {HTMLElement} card Preview card. @param {number} index Corresponding sidebar row. */
function bindPreviewHover(card,index) {
  card.addEventListener('pointerenter',event=>{
    if(disposed || event.pointerType==='touch' || viewport.get(index)?.card!==card)return;
    store.update({hoveredSlide:index});
  });
  card.addEventListener('pointerleave',()=>{
    if(!disposed && viewport.get(index)?.card===card && store.getSnapshot().hoveredSlide===index)store.update({hoveredSlide:null});
  });
}

// Create lightweight shells once; only nearby cards receive iframe documents.
function renderCards() {
  if(!state.deck)return;
  resizeObserver.disconnect();viewport.reset();store.update({hoveredSlide:null});
  const stage=$('stage');stage.replaceChildren();stage.scrollTop=0;
  const fragment=document.createDocumentFragment();
  const entries=[];
  for(const slide of state.deck.slides) {
    const index=slide.index,card=make('article','slide-card');card.id=`slide-${index}`;
    bindPreviewHover(card,index);
    const head=make('div','card-head'),label=make('label'),check=make('input');
    check.type='checkbox';check.checked=state.checked.has(index);check.disabled=state.busy;
    check.setAttribute('aria-label',`슬라이드 ${index+1} 적용 대상`);
    check.onchange=()=>{
      const next=new Set(state.checked);check.checked?next.add(index):next.delete(index);setChecked(next);
    };
    const badge=make('span','card-badge');
    label.append(check,document.createTextNode(`슬라이드 ${String(index+1).padStart(2,'0')}`));
    head.append(label,badge);
    const surface=make('div','slide-surface');surface.style.aspectRatio=`${state.deck.width}/${state.deck.height}`;
    surface.dataset.slide=String(index);surface.tabIndex=0;
    surface.setAttribute('aria-label',`슬라이드 ${index+1} 미리보기. 클릭 또는 빈 곳에서 드래그하여 요소 선택`);
    const content=make('div','slide-content');content.append(make('p','preview-pending','미리보기 준비 중…'));
    surface.append(content);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('hit-overlay');svg.setAttribute('viewBox',`0 0 ${state.deck.width} ${state.deck.height}`);
    svg.setAttribute('aria-hidden','true');surface.append(svg);
    const tooltip=make('div','drag-tooltip');tooltip.hidden=true;surface.append(tooltip);
    bindPreviewActivation(surface,index);guideUI.mountSurface(surface,index);bindPointer(surface,index);
    card.append(head,surface);fragment.append(card);
    entries.push([index,{card,surface,content,check,badge,frame:null}]);
  }
  const empty=make('p','muted','왼쪽에서 미리볼 슬라이드를 선택하세요.');empty.id='no-visible-slides';
  fragment.append(empty);stage.append(fragment);
  for(const [index,entry] of entries){viewport.register(index,entry);resizeObserver.observe(entry.surface);}
  updateScope();
}

// Mount each frame at most once. Edits synchronize caches even before it is mounted.
function mountPreview(index) {
  const entry=viewport.get(index),cached=state.previews.get(index),slide=state.deck?.slides[index];
  if(!entry || entry.frame || !cached || !slide || !viewport.isNearby(index) || entry.card.hidden)return;
  const frame=make('iframe');entry.frame=frame;
  frame.title=`슬라이드 ${index+1} 내용`;frame.setAttribute('sandbox','allow-same-origin');frame.tabIndex=-1;
  frame.style.cssText=`width:960px;height:${960*state.deck.height/state.deck.width}px;border:0;transform-origin:0 0;pointer-events:none;`;
  frame.style.transform=`scale(${entry.surface.getBoundingClientRect().width/960})`;
  frame.addEventListener('load',()=>{
    if(!disposed && state.deck?.slides[index]===slide)syncPreviewPositions(frame.contentDocument,slide);
  });
  frame.srcdoc=previewDoc(cached.outerHTML);entry.content.replaceChildren(frame);
  if(state.failed.has(index))entry.card.append(make('div','foot-note','간이 미리보기 · 일부 서식 또는 요소가 생략될 수 있습니다.'));
}

function updateScope() {
  if (!state.deck) return;
  const only=$('only-checked').checked;
  for (const s of state.deck.slides) {
    const checked=state.checked.has(s.index), card=viewport.get(s.index)?.card;
    if (!card) continue;
    card.hidden=only&&!checked;
    card.classList.toggle('inactive',!checked);
    const surface=viewport.get(s.index).surface;
    surface.title=checked?'':'클릭하여 이 슬라이드를 적용 대상에 추가합니다.';
    surface.setAttribute('aria-label',checked?`슬라이드 ${s.index+1} 미리보기. 클릭 또는 빈 곳에서 드래그하여 요소 선택`:`슬라이드 ${s.index+1} 비활성 미리보기. 클릭 또는 Enter, Space로 적용 대상에 추가`);
    card.querySelector('.card-head input').checked=checked;
    card.querySelector('.card-badge').textContent=s.dirty?'수정됨':checked?'적용 대상':'';
    if(!card.hidden)mountPreview(s.index);
  }
  renderList();
  if($('no-visible-slides')) $('no-visible-slides').hidden=!only||state.checked.size>0;
}

function updateMovedPreviews(indices,{positionOnly=false,idsBySlide}={}) {
  for (const i of indices) {
    const slide=state.deck.slides[i];
    const options={positionOnly,ids:idsBySlide?.get(i)};
    syncPreviewPositions(state.previews.get(i),slide,options);
    const frame=viewport.get(i)?.frame;
    if(frame) syncPreviewPositions(frame.contentDocument,slide,options);
    const badge=viewport.get(i)?.badge;
    if(badge) badge.textContent=slide.dirty?'수정됨':state.checked.has(i)?'적용 대상':'';
  }
  updateOverlays(indices);
}
function previewDoc(html){return `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'"><style>html,body{margin:0;padding:0;overflow:hidden}body{font-family:Arial,'Noto Sans KR',sans-serif}*{box-sizing:border-box}a{pointer-events:none}video,audio,iframe,script,object,embed{display:none!important}</style></head><body>${html}</body></html>`;}
function updateOverlays(indices, guideIndices=indices){
  if(!state.deck)return;
  // Materialize one-shot iterators because both selection layers may consume them.
  if(indices){const shared=guideIndices===indices;indices=[...indices];if(shared)guideIndices=indices;}
  renderBoxSelection(indices);
  for(const surface of viewport.surfaces(indices)){
    const i=Number(surface.dataset.slide),svg=surface.querySelector('svg.hit-overlay');
    const elements=selectedInSlide(state.deck.slides[i],state.selected.get(i)),point=state.point&&state.checked.has(i)?state.point:null;
    const geometries=elements.map(e=>{const p=state.drag?.positions.get(`${i}/${e.id}`);return {id:e.id,g:p?{...e.g,x:p.x,y:p.y}:e.g};});
    const key=JSON.stringify([geometries,point,state.drag?.axis,!!state.drag]);if(surface.dataset.overlayKey===key)continue;surface.dataset.overlayKey=key;
    surface.classList.toggle('selected',!!elements.length);surface.classList.toggle('dragging',!!state.drag&&!!elements.length);
    const existing=new Map([...svg.querySelectorAll('[data-selection-id]')].map(n=>[n.dataset.selectionId,n]));
    for(const {id,g}of geometries){
      let group=existing.get(id);existing.delete(id);
      if(!group){group=document.createElementNS(svg.namespaceURI,'g');group.dataset.selectionId=id;group.append(document.createElementNS(svg.namespaceURI,'polygon'));for(let j=0;j<4;j++)group.append(document.createElementNS(svg.namespaceURI,'circle'));svg.append(group);}
      const points=corners(g);group.firstElementChild.setAttribute('points',points.map(p=>`${p.x},${p.y}`).join(' '));
      for(let j=0;j<4;j++){const circle=group.children[j+1],p=points[j];circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y);circle.setAttribute('r',state.deck.width/220);}
    }
    for(const node of existing.values())node.remove();
    let outline=svg.querySelector('.selection-bounds');if(!outline){outline=document.createElementNS(svg.namespaceURI,'rect');outline.classList.add('selection-bounds');svg.append(outline);}
    outline.style.display=geometries.length>1?'':'none';
    if(geometries.length>1){const bounds=visualBounds(geometries);for(const [attr,value]of Object.entries({x:bounds.x,y:bounds.y,width:bounds.w,height:bounds.h}))outline.setAttribute(attr,value);}
    let cross=svg.querySelector('.cross');if(!cross){cross=document.createElementNS(svg.namespaceURI,'path');cross.classList.add('cross');svg.append(cross);}
    cross.style.display=point?'':'none';if(point){const {x,y}=point,d=state.deck.width/100;cross.setAttribute('d',`M${x-d},${y}H${x+d}M${x},${y-d}V${y+d}`);}
  }
  guideUI?.render(guideIndices);
}
let cancelActiveDrag=null,refreshActiveDrag=null,nudgeHistory=null;
function bindPointer(surface,index){
  let start=null,scheduled=0,latest=null;
  const tooltip=surface.querySelector('.drag-tooltip');
  const box=new BoxSelectionGesture({surface,width:state.deck.width,height:state.deck.height,
    onPreview:draft=>{state.boxSelection={...draft,reference:index};renderBoxSelection();},
    onCommit:({rectangle,additive})=>selectRange(rectangle,additive,index),
    onClick:({point,additive})=>{
      const hit=hitTest(state.deck.slides[index],point.x,point.y);
      const remove=additive && hit && state.selected.get(index)?.has(hit.id);
      selectAt(point.x,point.y,index,remove?'remove':additive?'add':'replace');
    },
    onEnd:()=>{state.boxSelection=null;cancelActiveDrag=null;refreshActiveDrag=null;renderBoxSelection();},
  });
  function clearDraft(restoreFields){
    if(scheduled)cancelAnimationFrame(scheduled);scheduled=0;
    const current=start;
    if(restoreFields&&current){$('x').value=current.inputX;$('y').value=current.inputY;}
    state.drag=null;tooltip.hidden=true;start=null;latest=null;cancelActiveDrag=null;refreshActiveDrag=null;
    if(current&&surface.hasPointerCapture?.(current.pointerId))surface.releasePointerCapture(current.pointerId);
    updateOverlays(state.selected.keys(),[state.reference]);
  }
  function draftFor(event){
    const constrained=constrainDrag((event.clientX-start.clientX)*start.scale,(event.clientY-start.clientY)*start.scale,event.shiftKey);
    const delta=guideUI.snapDrag(start.visual,constrained,index,start.scale,event.altKey);
    return {...delta,x:start.mode==='absolute'?start.x+delta.dx:delta.dx,y:start.mode==='absolute'?start.y+delta.dy:delta.dy};
  }
  function updateDraft(){
    scheduled=0;if(!start||!latest||!start.dragged)return;
    try{
      const draft=draftFor(latest),plans=movePlans(state.deck,state.selected,draft.x,draft.y,start.mode,draft.axis);
      state.drag={...draft,mode:start.mode,positions:new Map(plans.map(p=>[`${p.index}/${p.id}`,p]))};
      tooltip.textContent=`X ${((start.x+draft.dx)/EMU_PER_CM).toFixed(2)} · Y ${((start.y+draft.dy)/EMU_PER_CM).toFixed(2)} cm | ${(start.w/EMU_PER_CM).toFixed(2)} × ${(start.h/EMU_PER_CM).toFixed(2)} cm${draft.axis?draft.axis==='x'?' · 가로 고정':' · 세로 고정':''}`;
      tooltip.style.left=`${Math.max(8,Math.min(start.rect.width-265,latest.clientX-start.rect.left+14))}px`;tooltip.style.top=`${Math.max(8,Math.min(start.rect.height-60,latest.clientY-start.rect.top+16))}px`;tooltip.hidden=false;
      $('x').value=(draft.x/EMU_PER_CM).toFixed(2);$('y').value=(draft.y/EMU_PER_CM).toFixed(2);updateOverlays(state.selected.keys(),[state.reference]);
    }catch(err){clearDraft(true);error(err);}
  }
  surface.addEventListener('pointerdown',event=>{
    if(state.busy||event.button!==0||event.isPrimary===false)return;
    cancelActiveDrag?.();nudgeHistory=null;event.preventDefault();surface.focus({preventScroll:true});
    const rect=surface.getBoundingClientRect();if(!rect.width)return;
    const x=(event.clientX-rect.left)/rect.width*state.deck.width,y=(event.clientY-rect.top)/rect.height*state.deck.height;
    const hit=hitTest(state.deck.slides[index],x,y),already=hit&&state.selected.get(index)?.has(hit.id),modifier=event.shiftKey||event.ctrlKey||event.metaKey;
    if(!hit || $('box-select-mode').checked) {
      if(box.begin(event)){cancelActiveDrag=()=>box.cancel();refreshActiveDrag=null;}
      return;
    }
    if(!already)selectAt(x,y,index,modifier?'add':'replace');
    else{state.reference=index;state.point={x,y};updatePositionFields();updateInspector();updateOverlays();}
    if(!hit||!state.selected.get(index)?.has(hit.id))return;
    const bounds=selectionBounds(selectedInSlide(state.deck.slides[index],state.selected.get(index)));
    start={visual:visualBounds(selectedInSlide(state.deck.slides[index],state.selected.get(index))),pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,x:bounds.x,y:bounds.y,w:bounds.w,h:bounds.h,rect,scale:state.deck.width/rect.width,threshold:event.pointerType==='touch'?12:8,dragged:false,mode:$('move-mode').value,inputX:$('x').value,inputY:$('y').value,removeOnClick:modifier&&already,selectX:x,selectY:y};
    latest={clientX:event.clientX,clientY:event.clientY,shiftKey:event.shiftKey,altKey:event.altKey};
    cancelActiveDrag=()=>clearDraft(true);
    refreshActiveDrag=(value,key='shiftKey')=>{if(latest){latest[key]=value;if(start?.dragged&&!scheduled)scheduled=requestAnimationFrame(updateDraft);}};
    surface.setPointerCapture(event.pointerId);
  });
  surface.addEventListener('pointermove',event=>{
    if(!start||event.pointerId!==start.pointerId)return;
    latest={clientX:event.clientX,clientY:event.clientY,shiftKey:event.shiftKey,altKey:event.altKey};
    if(Math.hypot(event.clientX-start.clientX,event.clientY-start.clientY)>=start.threshold)start.dragged=true;
    if(start.dragged&&!scheduled)scheduled=requestAnimationFrame(updateDraft);
  });
  surface.addEventListener('pointerup',async event=>{
    const current=start;if(!current||event.pointerId!==current.pointerId)return;
    const draft=draftFor(event),commit=current.dragged&&!state.busy&&state.selected.size&&Math.hypot(event.clientX-current.clientX,event.clientY-current.clientY)>=current.threshold;
    clearDraft(!commit);
    if(commit)await applyMove(draft.x,draft.y,current.mode,draft.axis);
    else if(!current.dragged&&current.removeOnClick)selectAt(current.selectX,current.selectY,index,'remove');
  });
  for(const type of ['pointercancel','lostpointercapture'])surface.addEventListener(type,event=>{if(start&&event.pointerId===start.pointerId)clearDraft(true);});
}

function recordEdit(snapshots,coalesce=false,{positionOnly=false}={}) {
  if(!snapshots.length)return;
  if(snapshots[0]?.type==='guides'){nudgeHistory=null;state.undo.push(snapshots);if(state.undo.length>25)state.undo.shift();guideUI.updateControls();guideUI.render();updateSummary();updateInspector();return;}
  if(coalesce && nudgeHistory && state.undo.at(-1)===nudgeHistory.history) {
    const recorded=new Set(nudgeHistory.history.map(item=>item.index));
    for(const item of snapshots)if(!recorded.has(item.index)){
      nudgeHistory.history.push(item);recorded.add(item.index);
    }
  } else {
    state.undo.push(snapshots);if(state.undo.length>25)state.undo.shift();
    nudgeHistory=coalesce?{history:snapshots,snapshots:new Map(snapshots.map(item=>[item.index,item]))}:null;
  }
  const idsBySlide=new Map();
  for(const {index,id} of snapshots.changes || []) {
    if(!idsBySlide.has(index))idsBySlide.set(index,new Set());
    idsBySlide.get(index).add(id);
  }
  const indices=snapshots.changes?[...idsBySlide.keys()]:snapshots.map(item=>item.index);
  updateMovedPreviews(indices,{positionOnly,idsBySlide:snapshots.changes?idsBySlide:undefined});updateSummary();
}

async function applyLayout(action){
  if(state.busy||!state.selected.size)return;
  cancelActiveDrag?.();nudgeHistory=null;busy(true);notice('');
  try{const snapshots=alignSelected(state.deck,state.selected,action,$('layout-target').value);recordEdit(snapshots,false,{positionOnly:true});updatePositionFields();status(snapshots.length?`${snapshots.length}개 슬라이드의 선택 요소를 정렬했습니다. (${layoutActionLabel(action)})`:'이미 해당 위치에 정렬되어 있습니다.');}
  catch(err){error(err);}finally{busy(false);}
}
function updateFitControls() {
  const button=$('fit-text');if(!button)return;
  const candidates=fitCandidates(state.deck,state.checked,state.selected,$('fit-scope').value);
  button.disabled=state.busy||!candidates.length;
  $('fit-count').textContent=candidates.length?`${candidates.length}개 텍스트 상자`:'대상 텍스트 상자 없음';
}

async function fitText() {
  if(!state.deck||state.busy)return;
  cancelActiveDrag?.();nudgeHistory=null;
  const candidates=fitCandidates(state.deck,state.checked,state.selected,$('fit-scope').value);
  if(!candidates.length)return;
  busy(true);notice('');status('텍스트 줄바꿈과 높이를 계산하고 있습니다…');
  try {
    const result=await measureTextBoxes(candidates,state.previews,document);ensureActive();
    const snapshots=fitTextBoxes(state.deck,result.changes);
    recordEdit(snapshots);updatePositionFields();
    status(`${result.changes.length}개 텍스트 상자의 높이를 내용에 맞췄습니다.${result.skipped?` ${result.skipped}개는 측정할 수 없어 건너뛰었습니다.`:''}`);
    if(result.skipped)notice('일부 텍스트 상자는 현재 미리보기에서 높이를 측정할 수 없어 변경하지 않았습니다.');
  } catch(err){error(err);} finally {busy(false);}
}

function sanitizeRendered(root){for(const n of root.querySelectorAll('script,iframe,object,embed,video,audio,link,meta,base,foreignObject'))n.remove();for(const el of root.querySelectorAll('*')){for(const a of [...el.attributes]){const key=a.name.toLowerCase();if(key.startsWith('on')||key==='srcdoc'||key==='formaction')el.removeAttribute(a.name);if(['href','xlink:href','src'].includes(key)&&!a.value.startsWith('data:')&&!a.value.startsWith('blob:')&&!a.value.startsWith('#'))el.removeAttribute(a.name);}}return root;}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fallback(slide){const d=state.deck,k=960/d.width;const elements=slide.elements.filter(e=>e.g&&!e.hidden).map(e=>{const g=e.g;return `<div data-pptx-element="${esc(e.id)}" style="position:absolute;left:${g.x*k}px;top:${g.y*k}px;width:${g.w*k}px;height:${g.h*k}px;transform:rotate(${g.rot}deg);border:1px solid #c3cad5;overflow:hidden;background:#f4f6fa;color:#445269;font:14px Arial;padding:5px;">${esc(e.text||e.name)}</div>`;}).join('');return `<div class="slide-wrapper" style="position:relative;width:960px;height:${960*d.height/d.width}px;background:white">${elements}</div>`;}
let previewer=null,renderHost=null;
async function renderDeck() {
  const d=state.deck;
  state.previews.clear();state.failed.clear();
  status('슬라이드 미리보기를 만들고 있습니다…');
  renderCards();
  if(!renderHost){renderHost=make('div');renderHost.style.cssText='position:absolute;left:-100000px;top:0;width:960px;pointer-events:none;';renderHost.setAttribute('aria-hidden','true');document.body.append(renderHost);}
  const fallbackFor=s=>{
    state.failed.add(s.index);
    const template=make('template');template.innerHTML=fallback(s);
    state.previews.set(s.index,cachePreview(template.content.firstElementChild,s,d.width/960));
    mountPreview(s.index);
  };
  try {
    previewer?.destroy();renderHost.replaceChildren();
    const {init}=await resources.loadRenderer({charts:deckHasCharts(d)});ensureActive();
    previewer=init(renderHost,{width:960,height:960*d.height/d.width,mode:'list',staticPreview:true});
    // File loading is the only place that parses and renders the whole PPTX.
    // ZIP encoding is reserved for the download action.
    await previewer.load(d.original);ensureActive();
    new PreviewTheme(previewer.htmlRender).install();
    tagRenderer(previewer.htmlRender);
    const rendererIndices=new Map(previewer.pptx.slides.map((slide,index)=>[slide.name.replace(/^\//,''),index]));
    const pending=new Set(d.slides.map(slide=>slide.index));
    let completed=0;
    while(pending.size) {
      const index=viewport.indices().find(i=>pending.has(i))??pending.values().next().value;
      pending.delete(index);
      const s=d.slides[index],ri=rendererIndices.get(s.path);
      try {
        if(ri===undefined)throw Error('미리보기에서 슬라이드를 찾지 못했습니다.');
        previewer.htmlRender.renderSlide(ri);await tick();ensureActive();
        const node=previewer.wrapper.querySelector(`.pptx-preview-slide-wrapper-${ri}`);
        if(!node)throw Error('미리보기를 만들지 못했습니다.');
        node.style.margin='0';
        for(const canvas of node.querySelectorAll('canvas')){const image=make('img');image.src=canvas.toDataURL();image.style.cssText=canvas.style.cssText;canvas.replaceWith(image);}
        node.remove();
        state.previews.set(s.index,cachePreview(sanitizeRendered(node.cloneNode(true)),s));
        mountPreview(s.index);
      } catch(err) {ensureActive();fallbackFor(s);}
      status(`미리보기 생성 중 · ${++completed} / ${d.slides.length}`);
    }
  } catch(err) {ensureActive();for(const s of d.slides)fallbackFor(s);}
  finally {previewer?.destroy();previewer=null;renderHost.replaceChildren();}
  updateOverlays();
  if(state.failed.size)notice(`${state.failed.size}개 슬라이드는 간이 미리보기로 표시합니다. PowerPoint의 일부 도형·효과는 브라우저에서 재현되지 않을 수 있습니다.`);
  else {const unresolved=d.slides.reduce((n,s)=>n+s.elements.filter(e=>!e.g).length,0);notice(unresolved?`위치를 읽을 수 없는 요소 ${unresolved}개는 선택 대상에서 제외했습니다.`:'');}
}
async function openBuffer(buffer, name, {keepBusy=false}={}) {
  if((state.busy&&!keepBusy) || disposed)return false;
  cancelActiveDrag?.();busy(true);notice('');
  const previousSearchIndex=searchIndex,previousSearch=store.getSnapshot().slideSearch;
  const previousElementIndex=elementSearchIndex,previousElementSearch=store.getSnapshot().elementSearch;
  const previous={...state,checked:new Set(state.checked),selected:new Map(state.selected),allSelected:new Map(state.allSelected)};
  try {
    const JSZip=await resources.loadZip();ensureActive();
    const deck=await loadDeck(buffer,JSZip);ensureActive();
    await loadGuides(deck);ensureActive();
    const nextSearchIndex=new SlideSearchIndex(deck),nextElementIndex=new ElementSearchIndex(deck);
    Object.assign(state,{deck,name,checked:new Set(deck.slides.map(s=>s.index)),selected:new Map(),
      allSelected:new Map(),reference:null,point:null,undo:[],previews:new Map(),failed:new Set()});
    searchIndex=nextSearchIndex;elementSearchIndex=nextElementIndex;updateSlideSearch('');updateElementSearch('');
    nudgeHistory=null;guideUI.onOpen();$('range').value='';
    renderList();updateSummary();
    $('stage').replaceChildren(make('div','loading','슬라이드 미리보기를 만드는 중입니다…'));
    await renderDeck();
    status(`${deck.slides.length}개 슬라이드를 열었습니다. 요소를 클릭해 선택하세요.`);
    return true;
  } catch(err) {
    if(!disposed){Object.assign(state,previous);searchIndex=previousSearchIndex;elementSearchIndex=previousElementIndex;store.update({slideSearch:previousSearch,elementSearch:previousElementSearch});updateSummary();error(err);}
  } finally {
    if(!disposed){if(!keepBusy)busy(false);renderList();}
  }
}

async function openFile(file) {
  if(!file || state.busy || disposed)return;
  cancelActiveDrag?.();busy(true);
  try {
    if(!/\.pptx$/i.test(file.name))throw Error('.pptx 파일을 선택하세요.');
    if(file.size>50*1024*1024)throw Error('50MB 이하의 PPTX 파일을 선택하세요.');
    const buffer=await file.arrayBuffer();ensureActive();
    if(await openBuffer(buffer,file.name,{keepBusy:true})) {
      const saved=await recentAction(()=>recentFiles.save(file.name,buffer));
      if(!saved&&!disposed)notice('파일은 열었지만 최근 파일로 보관하지 못했습니다. '+store.getSnapshot().recentFiles.error);
    }
  } catch(err) {if(!disposed)error(err);}
  finally {if(!disposed)busy(false);}
}

async function openRecentFile(id) {
  if(state.busy||disposed||store.getSnapshot().recentFiles.busy)return false;
  cancelActiveDrag?.();busy(true);updateRecent({error:''});
  try {
    const file=await recentFiles.get(id);ensureActive();
    if(!file) {
      updateRecent({files:store.getSnapshot().recentFiles.files.filter(row=>row.id!==id),error:'보관된 파일이 없습니다. 다른 탭이나 브라우저에서 삭제되었을 수 있습니다.'});
      return false;
    }
    if(!await openBuffer(file.buffer,file.name,{keepBusy:true})) {
      updateRecent({error:'보관된 PPTX를 열지 못했습니다. 원본 파일을 다시 선택하세요.'});return false;
    }
    await recentAction(()=>recentFiles.touch(id));
    return true;
  } catch(err) {updateRecent({error:recentError(err)});return false;}
  finally {if(!disposed)busy(false);}
}

async function applyMove(x,y,mode,axis=null,nudge=false){
  if(state.busy||!state.selected.size)return 0;
  if(!nudge)nudgeHistory=null;
  busy(true);notice('');
  try {
    const snapshotsCache=nudge && nudgeHistory && state.undo.at(-1)===nudgeHistory.history?nudgeHistory.snapshots:undefined;
    const snapshots=moveSelected(state.deck,state.selected,x,y,mode,axis,{snapshots:snapshotsCache});
    recordEdit(snapshots,nudge,{positionOnly:true});updatePositionFields();
    const n=snapshots.length?selectedElements().length:0;
    if(n)status(`${state.selected.size}개 슬라이드의 ${n}개 요소를 간격을 유지하며 옮겼습니다.`);
    return n;
  } catch(err){nudgeHistory=null;error(err);return 0;}
  finally{busy(false);}
}

function refreshDeletedElements(snapshots) {
  searchIndex=new SlideSearchIndex(state.deck);elementSearchIndex=new ElementSearchIndex(state.deck);elementSearchCache=null;
  updateSlideSearch(store.getSnapshot().slideSearch.query);renderList();
  for(const {index} of snapshots) {
    const slide=state.deck.slides[index];
    syncPreviewPresence(state.previews.get(index),slide);
    syncPreviewPresence(viewport.get(index)?.frame?.contentDocument,slide);
  }
  syncSelection();updateMovedPreviews(snapshots.map(snapshot=>snapshot.index));updateInspector();
}

function deleteSelection() {
  if(disposed||state.busy||!state.deck||!state.selected.size)return;
  cancelActiveDrag?.();nudgeHistory=null;busy(true);notice('');
  try {
    const snapshots=ElementDeletion.apply(state.deck,state.selected);if(!snapshots.length)return;
    for(const snapshot of snapshots) {
      snapshot.selection=[...(state.allSelected.get(snapshot.index)||[])];
      const ids=new Set(snapshot.selection);for(const id of snapshot.ids)ids.delete(id);
      if(ids.size)state.allSelected.set(snapshot.index,ids);else state.allSelected.delete(snapshot.index);
    }
    state.undo.push(snapshots);if(state.undo.length>25)state.undo.shift();
    state.point=null;refreshDeletedElements(snapshots);updateSummary();updatePositionFields();
    status(`${snapshots.length}개 슬라이드에서 ${snapshots.reduce((count,snapshot)=>count+snapshot.ids.length,0)}개 요소를 삭제했습니다. 마지막 변경 취소로 복원할 수 있습니다.`);
  } catch(err){error(err);}finally{busy(false);}
}

async function undo() {
  if(!state.undo.length||state.busy)return;
  cancelActiveDrag?.();nudgeHistory=null;busy(true);
  try {
    const snapshots=state.undo.at(-1);
    if(snapshots[0]?.type==='guides') {
      restoreGuides(state.deck,snapshots[0]);guideUI.updateControls();guideUI.render();
    } else {
      restore(state.deck,snapshots);
      if(snapshots[0]?.type==='delete') {
        for(const snapshot of snapshots) {
          const ids=new Set(snapshot.selection);
          if(ids.size)state.allSelected.set(snapshot.index,ids);else state.allSelected.delete(snapshot.index);
        }
        state.point=null;refreshDeletedElements(snapshots);
      } else updateMovedPreviews(snapshots.map(s=>s.index));
    }
    state.undo.pop();updateSummary();updatePositionFields();status('마지막 변경을 취소했습니다.');
  } catch(err){error(err);}finally{busy(false);}
}
async function download(){if(!state.deck||state.busy)return;busy(true);try{prepareGuideExport(state.deck);const blob=await exportDeck(state.deck,'blob');ensureActive();const link=make('a');const url=URL.createObjectURL(blob);link.href=url;link.download=state.name.replace(/\.pptx$/i,'')+'-edited.pptx';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);status('수정한 PPTX를 다운로드했습니다.');}catch(err){error(err);}finally{busy(false);}}
$('match-appearance').onchange=()=>{cancelActiveDrag?.();status($('match-appearance').checked?'다음 클릭·영역 선택부터 기준 페이지와 크기·색상·레이아웃이 같은 요소만 선택합니다.':'같은 좌표·영역의 요소를 선택합니다.');};
$('box-select-mode').onchange=()=>{cancelActiveDrag?.();root.classList.toggle('box-select-mode',$('box-select-mode').checked);};
$('apply-range').onclick=()=>{if(!state.deck||state.busy)return;try{setChecked(parseRange($('range').value,state.deck.slides.length));notice('');}catch(err){error(err);}};$('range').onkeydown=event=>{if(event.key==='Enter')$('apply-range').click();};$('only-checked').onchange=updateScope;$('clear-selection').onclick=resetSelection;$('move-mode').onchange=()=>{cancelActiveDrag?.();nudgeHistory=null;const relative=$('move-mode').value==='relative';$('position-help').textContent=relative?'오른쪽·아래는 +, 왼쪽·위는 −':'선택 영역의 왼쪽 위 · 여러 요소는 간격 유지';$('x-label').textContent=relative?'가로 이동 (cm)':'X (cm)';$('y-label').textContent=relative?'세로 이동 (cm)':'Y (cm)';if(relative){$('x').value='0';$('y').value='0';}else updatePositionFields();};$('move').onclick=()=>{if(!$('x').value.trim()||!$('y').value.trim()){error(Error('X와 Y를 모두 입력하세요.'));return;}applyMove(Number($('x').value)*EMU_PER_CM,Number($('y').value)*EMU_PER_CM,$('move-mode').value);};$('undo').onclick=undo;async function openDemo(){if(state.busy||disposed)return;try{const response=await fetch(`${resources.base}sample.pptx`,{signal:events.abortController.signal});if(!response.ok)throw Error('예제 파일을 열지 못했습니다.');ensureActive();await openBuffer(await response.arrayBuffer(),'예제-슬라이드.pptx');}catch(err){if(!disposed)error(err);}}

events.on(root,'dragover',event=>{event.preventDefault();$('dropzone')?.classList.add('dragover');});events.on(root,'dragleave',event=>{if(!event.relatedTarget)$('dropzone')?.classList.remove('dragover');});events.on(root,'drop',event=>{event.preventDefault();$('dropzone')?.classList.remove('dragover');if(!state.busy)openFile(event.dataTransfer.files[0]);});events.on(root,'keydown',event=>{
  if(event.key==='Shift')refreshActiveDrag?.(true);if(event.key==='Alt')refreshActiveDrag?.(true,'altKey');
  const target=event.target,editing=target.closest?.('input,textarea,select,[contenteditable="true"]');
  if(editing||target.isContentEditable||event.isComposing)return;
  if(['Delete','Backspace'].includes(event.key)&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!target.closest?.('.guide-overlay')) {
    if(state.selected.size&&!state.busy){event.preventDefault();deleteSelection();}return;
  }
  if((event.ctrlKey||event.metaKey)&&!event.shiftKey&&event.key.toLowerCase()==='z'){event.preventDefault();undo();return;}
  if(event.key==='Escape'&&!state.busy){event.preventDefault();if(cancelActiveDrag)cancelActiveDrag();else resetSelection();return;}
  const surface=target.closest?.('.slide-surface');if(target.closest?.('.guide-overlay'))return;if(!surface||state.busy||!state.deck||cancelActiveDrag)return;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'){
    event.preventDefault();nudgeHistory=null;state.reference=Number(surface.dataset.slide);
    state.allSelected=new Map(state.deck.slides.map(s=>[s.index,new Set(s.elements.filter(e=>e.g&&!e.hidden).map(e=>e.id))]));
    syncSelection();updatePositionFields();updateInspector();updateOverlays();status(`${state.selected.size}개 슬라이드에서 ${selectedElements().length}개 요소를 선택했습니다.`);return;
  }
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},direction=directions[event.key];
  if(direction&&state.selected.size){event.preventDefault();const step=EMU_PER_CM*(event.shiftKey?1:event.ctrlKey||event.metaKey?0.01:0.1);applyMove(direction[0]*step,direction[1]*step,'relative',null,true);}
});
events.on(root,'keyup',event=>{if(event.key==='Shift')refreshActiveDrag?.(false);if(event.key==='Alt')refreshActiveDrag?.(false,'altKey');if(event.key.startsWith('Arrow'))nudgeHistory=null;});

const context=document.modelContext;if(context?.registerTool){const lifecycle=toolLifecycle;events.on(window,'pagehide',()=>lifecycle.abort(),{once:true});const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};register({name:'read_slide_selection',description:'열린 PPTX의 적용 대상과 선택 요소 좌표를 읽습니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({file:state.name,slideCount:state.deck?.slides.length||0,checked:[...state.checked].map(i=>i+1),selected:selectedElements().map(({slide,element:e})=>({slide:slide.index+1,id:e.id,name:e.name,xCm:e.g.x/EMU_PER_CM,yCm:e.g.y/EMU_PER_CM}))})});register({name:'select_elements_at_position',description:'적용 대상 슬라이드의 지정 좌표에서 가장 앞에 있는 요소를 선택합니다. 좌표 단위는 cm입니다.',inputSchema:{type:'object',properties:{xCm:{type:'number'},yCm:{type:'number'},selectionMode:{enum:['replace','add','remove']}},required:['xCm','yCm'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!state.deck||state.busy)throw Error('먼저 PPTX를 열고 처리가 끝날 때까지 기다리세요.');if(!Number.isFinite(input.xCm)||!Number.isFinite(input.yCm))throw Error('좌표가 유효하지 않습니다.');if(input.selectionMode&&!['replace','add','remove'].includes(input.selectionMode))throw Error('선택 방식이 유효하지 않습니다.');cancelActiveDrag?.();selectAt(input.xCm*EMU_PER_CM,input.yCm*EMU_PER_CM,null,input.selectionMode||'replace');return {selected:selectedElements().length,slides:state.selected.size};}});register({name:'move_selected_elements',description:'선택된 요소를 지정한 절대 위치로 옮기거나 같은 거리만큼 이동합니다. 원본 PPTX 다운로드는 별도입니다.',inputSchema:{type:'object',properties:{xCm:{type:'number'},yCm:{type:'number'},mode:{enum:['absolute','relative']}},required:['xCm','yCm','mode'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},async execute(input){if(state.busy||!state.selected.size)throw Error('먼저 요소를 선택하세요.');if(!['absolute','relative'].includes(input.mode)||![input.xCm,input.yCm].every(Number.isFinite)||Math.abs(input.xCm)>1000||Math.abs(input.yCm)>1000)throw Error('이동 방식과 좌표가 유효하지 않습니다.');cancelActiveDrag?.();const moved=await applyMove(input.xCm*EMU_PER_CM,input.yCm*EMU_PER_CM,input.mode);return {moved};}});}

$('delete-selection').onclick=deleteSelection;
$('fit-text').onclick=fitText;$('fit-scope').onchange=updateFitControls;events.on(window,'blur',()=>{cancelActiveDrag?.();nudgeHistory=null;});
$('layout-target').onchange=updateLayoutControls;for(const button of root.querySelectorAll('[data-layout]'))button.onclick=()=>applyLayout(button.dataset.layout);

guideUI=createGuideUI({root,getSurfaces:indices=>viewport.surfaces(indices),state,$,make,status,error,cancelDrag:()=>{cancelActiveDrag?.();nudgeHistory=null;},setDragHandlers:(cancel,refresh)=>{cancelActiveDrag=cancel;refreshActiveDrag=refresh;},recordEdit});
busy(false);
refreshRecentFiles();

return {
  openFile, openDemo, download, applySlideSearch, applyElementSearch,
  refreshRecentFiles, openRecentFile, removeRecentFile, clearRecentFiles,
  setElementSearchQuery(query){if(!state.busy && state.deck && !disposed)updateElementSearch(String(query));},
  setSlideSearchQuery(query){if(!state.busy && state.deck && !disposed)updateSlideSearch(String(query));},
  setSlideChecked(index, checked) {
    if(state.busy||disposed||!state.deck)return;
    const next=new Set(state.checked);checked?next.add(index):next.delete(index);setChecked(next);
  },
  selectSlides(all) {if(!state.busy&&!disposed&&state.deck)setChecked(new Set(all?state.deck.slides.map(s=>s.index):[]));},
  dispose() {
    if(disposed)return;
    cancelActiveDrag?.();disposed=true;
    events.dispose();toolLifecycle.abort();resizeObserver.disconnect();viewport.reset();store.update({hoveredSlide:null});
    previewer?.destroy();renderHost?.remove();
    for(const element of root.querySelectorAll('*')) {
      for(const property of ['onclick','onchange','onkeydown']) element[property]=null;
    }
    $('stage')?.replaceChildren();
    state.previews.clear();searchIndex.clear();elementSearchIndex.clear();elementSearchCache=null;state.deck=null;
  },
};
}
