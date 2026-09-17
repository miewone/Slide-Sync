import {ResizeGesture} from '../editor/ResizeGesture.js';
import {openSimilarSelection} from './SimilarSelectionMenu.jsx';
import {NativeSimilarSelection} from '../editor/google/NativeSimilarSelection.js';
import {useEffect,useMemo,useRef,useState} from 'react';
import {NativeSlidesText} from '../editor/google/NativeSlidesText.js';
import {snapToGuides} from '../editor/guides.js';
import {t} from '../i18n/I18n.js';
import {NativeSlidesAppearance} from '../editor/google/NativeSlidesAppearance.js';
import {NativeSlidesArtwork} from './NativeSlidesArtwork.jsx';
import {NativeSlidesImage} from './NativeSlidesImage.jsx';

/** Pointer drag, cross-slide box selection and guide snapping in slide coordinates. @param {object} props Current model, scope, selection, guides and edit callbacks. */
export function NativeSlidesCanvas({model,page,checked,setChecked,selected,setSelected,perform,busy,guides,showGuides,snap,version,fontOverrides,boxSelect=false}){
  const svg=useRef(null),gesture=useRef(null),[draft,setDraft]=useState(null);
  const latest=useRef(null),resize=useRef(null),[resizeDraft,setResizeDraft]=useState(null);
  latest.current={model,page,checked,selected,busy,perform};
  const renderer=useMemo(()=>new NativeSlidesText(model,fontOverrides,page),[model,version,fontOverrides,page]);
  const appearance=useMemo(()=>new NativeSlidesAppearance(model,page),[model,page,version]),background=appearance.background();
  const originalElements=model.elements(page);
  const elements=resizeDraft?originalElements.map(e=>selected.has(e.id)&&e.box?model.resizedElement(e,resizeDraft.sx,resizeDraft.sy):e):originalElements;
  const point=event=>{const p=new DOMPoint(event.clientX,event.clientY);return p.matrixTransform(svg.current.getScreenCTM().inverse());};
  const reset=()=>{resize.current?.cancel();gesture.current=null;setDraft(null);};
  useEffect(()=>{
    const controller=new ResizeGesture({surface:svg.current,point,
      source:handle=>{const s=latest.current;if(s.busy||!s.checked.has(s.page))return null;const e=s.model.elements(s.page).find(e=>e.id===handle.dataset.resizeId);return e&&s.selected.has(e.id)?{g:s.model.resizeGeometry(e)}:null;},
      onPreview:factors=>{const s=latest.current;for(const i of s.checked)for(const e of s.model.elements(i))if(s.selected.has(e.id)&&!e.deleted&&e.box)s.model.resizedElement(e,factors.sx,factors.sy);setResizeDraft(factors);},onEnd:()=>setResizeDraft(null),
      onError:error=>latest.current.perform(()=>{throw error;}),
      onCommit:({sx,sy})=>{const s=latest.current;if(!s.busy)s.perform(()=>s.model.resize(s.checked,s.selected,sx*100,sy*100));}
    });resize.current=controller;return ()=>{controller.dispose();resize.current=null;};
  },[model,page]);
  useEffect(()=>{reset();},[page,busy,version,checked]);
  useEffect(()=>{window.addEventListener('blur',reset);return ()=>window.removeEventListener('blur',reset);},[]);
  const down=event=>{
    if(busy||event.button!==0)return;event.preventDefault();svg.current.focus();
    const id=boxSelect?null:event.target.closest('[data-object-id]')?.dataset.objectId,start=point(event);
    if(id&&!checked.has(page))return;
    const selection=new Set(selected);
    if(id&&!selection.has(id)){if(!event.shiftKey&&!event.ctrlKey&&!event.metaKey)selection.clear();selection.add(id);setSelected(selection);}
    gesture.current={start,id,selection,wasSelected:selected.has(id),additive:event.shiftKey||event.ctrlKey||event.metaKey,pointerId:event.pointerId};
    svg.current.setPointerCapture(event.pointerId);
  };
  const move=event=>{
    const g=gesture.current;if(!g)return;const end=point(event);let dx=end.x-g.start.x,dy=end.y-g.start.y;
    if(event.shiftKey&&g.id){if(Math.abs(dx)>Math.abs(dy))dy=0;else dx=0;}
    if(g.id&&snap){
      const boxes=elements.filter(e=>g.selection.has(e.id)&&!e.deleted&&e.box).map(e=>e.box);
      if(boxes.length){const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),b={x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x,h:Math.max(...boxes.map(b=>b.y+b.h))-y};
        const result=snapToGuides(b,dx,dy,guides.items,6*model.width/svg.current.getBoundingClientRect().width,event.shiftKey?(dx?'x':'y'):null);dx=result.dx;dy=result.dy;}
    }
    const next={...g,dx,dy,rectangle:{x:Math.min(g.start.x,end.x),y:Math.min(g.start.y,end.y),w:Math.abs(end.x-g.start.x),h:Math.abs(end.y-g.start.y)}};g.latest=next;setDraft(next);
  };
  const up=event=>{
    const g=gesture.current;if(!g)return;const d=g.latest;
    if(svg.current.hasPointerCapture(event.pointerId))svg.current.releasePointerCapture(event.pointerId);reset();
    if(d&&Math.hypot(d.dx,d.dy)>1){
      if(g.id)perform(()=>model.move(checked,g.selection,d.dx*2.54/72,d.dy*2.54/72));
      else setSelected(model.selectRectangle(checked,selected,d.rectangle,g.additive));
    }else if(g.id&&g.additive&&g.wasSelected)setSelected(previous=>{const next=new Set(previous);next.delete(g.id);return next;});
    else if(!g.id&&!g.additive)setSelected(model.selectRectangle(checked,selected,{x:0,y:0,w:0,h:0}));
  };
  const menuBusy=useRef(busy);menuBusy.current=busy;
  const contextMenu=event=>{
    if(busy)return;
    const id=event.target.closest('[data-object-id]')?.dataset.objectId,source=elements.find(e=>e.id===id&&!e.deleted);
    if(!source)return;
    reset();
    openSimilarSelection(event,(criteria,scope)=>{
      if(menuBusy.current||!svg.current?.isConnected)return;
      setSelected(new NativeSimilarSelection(model,criteria).select(page,source,scope));
      setChecked(new Set(scope==='all'?model.original.slides.map((_,index)=>index):[page]));
    });
  };
  return <svg ref={svg} tabIndex={0} className="native-layout" viewBox={`0 0 ${model.width} ${model.height}`} aria-label={t('drive.draftLayout')}
    onContextMenu={contextMenu} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={reset} onLostPointerCapture={reset} onKeyDown={event=>{if(event.key==='Escape'&&(gesture.current||resize.current?.active)){event.stopPropagation();reset();}}}>
    <rect width={model.width} height={model.height} fill="white"/>
    <g pointerEvents="none" data-native-background="true"><rect width={model.width} height={model.height} fill={background.fill.color} fillOpacity={background.fill.opacity}/>{background.hasImage&&<NativeSlidesImage objectId={background.imageId} url={background.image} width={model.width} height={model.height}/>}{background.elements.map(e=><NativeSlidesArtwork key={e.objectId} element={e} renderer={renderer} appearance={appearance}/>)}</g>
    {elements.filter(e=>e.box&&!e.deleted).map(e=><g key={e.id} data-object-id={e.id} transform={draft?.id&&draft.selection.has(e.id)?`translate(${draft.dx} ${draft.dy})`:undefined}>
      <NativeSlidesArtwork element={e.native} renderer={renderer} appearance={appearance}/>
      <rect x={e.box.x} y={e.box.y} width={Math.max(e.box.w,2)} height={Math.max(e.box.h,2)} fill="transparent" stroke={selected.has(e.id)?'#466ce0':e.changed?'#b45309':'transparent'} strokeWidth={selected.has(e.id)?2:1} strokeDasharray={e.changed?'4 2':undefined}/>
      <title>{e.name}</title>
    </g>)}
    {checked.has(page)&&elements.filter(e=>selected.has(e.id)&&e.box&&!e.deleted).flatMap(e=>ResizeGesture.handles(model.resizeGeometry(e)).map(h=><circle key={`${e.id}-${h.index}`} className="resize-handle" data-resize-handle={h.index} data-resize-id={e.id} cx={h.x} cy={h.y} r={5*model.width/(svg.current?.getBoundingClientRect().width||600)} style={{cursor:['nwse-resize','nesw-resize','nwse-resize','nesw-resize','ns-resize','ew-resize','ns-resize','ew-resize'][h.index]}}/>))}
    {showGuides&&guides.items.map(g=><line key={g.id} x1={g.axis==='x'?g.pos:0} x2={g.axis==='x'?g.pos:model.width} y1={g.axis==='y'?g.pos:0} y2={g.axis==='y'?g.pos:model.height} stroke="#c36c32" strokeWidth="0.8" strokeDasharray="4 3" pointerEvents="none"/>)}
    {draft&&!draft.id&&<rect {...draft.rectangle} width={draft.rectangle.w} height={draft.rectangle.h} fill="#466ce022" stroke="#466ce0" pointerEvents="none"/>}
  </svg>;
}
