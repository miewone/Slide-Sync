import {t,localizedError,i18n} from '../i18n/I18n.js';
import {EMU_PER_CM} from './core.js';
import {GUIDE_UNIT,slideGuides,addGuide,changeGuide,removeGuide,snapToGuides} from './guides.js';

/** @param {object} options Editor root, state, DOM helpers and edit/drag callbacks. */
export function createGuideUI({root,getSurfaces,state,$,make,status,error,cancelDrag,setDragHandlers,recordEdit}){
  const scopeLabel=()=>({global:t('guide-ui.1'),master:t('guide-ui.2'),layout:t('guide-ui.3'),slide:t('Sidebar.2')});
  let selectedId='',draft=null;
  const reference=()=>state.reference??state.selected.keys().next().value??state.checked.keys().next().value??0;
  const current=()=>slideGuides(state.deck,reference()).find(g=>g.id===selectedId);
  function updateControls(){
    const guides=slideGuides(state.deck,reference()),select=$('guide-select'),previous=selectedId;
    const key=JSON.stringify([i18n.getLanguage(),reference(),guides.map(g=>[g.id,g.axis,g.pos,g.scope])]);
    if(select.dataset.optionsKey!==key){
      select.dataset.optionsKey=key;select.replaceChildren();
      for(const g of guides){const option=make('option','',`${scopeLabel()[g.scope]} · ${g.axis==='x'?t('guide-ui.4'):t('guide-ui.5')} ${(g.pos/EMU_PER_CM).toFixed(2)} cm`);option.value=g.id;select.append(option);}
      selectedId=guides.some(g=>g.id===previous)?previous:guides[0]?.id||'';select.value=selectedId;
    }
    const guide=current(),editable=guide?.scope==='global';
    $('guide-count').textContent=state.deck?t('guide-ui.6', {p0: reference()+1, p1: state.deck.guides.global.length, p2: (state.deck.guides.inherited.get(reference())||[]).length}):t('GuidePanel.7');
    select.disabled=state.busy||!guides.length;
    for(const id of ['guide-horizontal','guide-vertical'])$(id).disabled=state.busy||!state.deck;
    for(const id of ['guide-position','guide-apply','guide-delete'])$(id).disabled=state.busy||!editable;
    if(!$('guide-position').matches(':focus'))$('guide-position').value=guide?((draft?.id===guide.id?draft.pos:guide.pos)/EMU_PER_CM).toFixed(2):'';
    $('guide-axis').textContent=guide?.axis==='y'?t('guide-ui.7'):t('GuidePanel.9');
    $('guide-readonly').hidden=!guide||editable;
  }
  function render(indices){
    if(!state.deck)return;
    for(const surface of getSurfaces(indices)){
      const i=Number(surface.dataset.slide),svg=surface.querySelector('.guide-overlay');if(!svg)continue;
      const visible=$('guides-visible').checked,editing=$('guides-edit').checked;
      const guides=visible?slideGuides(state.deck,i).map(g=>draft?.id===g.id?{...g,pos:draft.pos}:g):[];
      const hits=state.reference===i?state.drag?.guideHits||[]:[];
      const key=JSON.stringify([editing,selectedId,guides.map(g=>[g.id,g.pos,g.color]),hits]);if(svg.dataset.guideKey===key)continue;svg.dataset.guideKey=key;
      svg.classList.toggle('editing',editing);
      const existing=new Map([...svg.querySelectorAll('[data-guide-id]')].map(n=>[n.dataset.guideId,n]));
      for(const guide of guides){
        let group=existing.get(guide.id);existing.delete(guide.id);
        if(!group){group=document.createElementNS(svg.namespaceURI,'g');group.dataset.guideId=guide.id;for(const cls of ['guide-line','guide-hit']){const line=document.createElementNS(svg.namespaceURI,'line');line.classList.add(cls);group.append(line);}svg.append(group);}
        group.dataset.editable=String(guide.scope==='global');group.classList.toggle('guide-active',hits.includes(guide.id)||(editing&&selectedId===guide.id));
        const attrs=guide.axis==='x'?{x1:guide.pos,x2:guide.pos,y1:0,y2:state.deck.height}:{x1:0,x2:state.deck.width,y1:guide.pos,y2:guide.pos};
        for(const line of group.children){for(const [key,value]of Object.entries(attrs))line.setAttribute(key,value);line.style.cursor=guide.axis==='x'?'ew-resize':'ns-resize';}
        group.firstElementChild.style.stroke=guide.color;
      }
      for(const group of existing.values())group.remove();
    }
  }
  function commit(action,message){
    if(!state.deck||state.busy)return;
    cancelDrag();
    try{const snapshots=action();recordEdit(snapshots);updateControls();render();if(snapshots.length)status(()=>(message));return snapshots.length;}
    catch(err){error(err);return 0;}
  }
  function add(axis){
    commit(()=>{
      let pos=(axis==='x'?state.deck.width:state.deck.height)/2;
      while(state.deck.guides.global.some(g=>g.axis===axis&&Math.abs(g.pos-pos)<GUIDE_UNIT))pos+=0.5*EMU_PER_CM;
      const snapshots=addGuide(state.deck,axis,pos);selectedId=state.deck.guides.global.at(-1).id;$('guides-visible').checked=true;return snapshots;
    },t('guide-ui.8', {p0: axis==='x'?t('guide-ui.4'):t('guide-ui.5')}));
  }
  function mountSurface(surface,index){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('guide-overlay');svg.setAttribute('viewBox',`0 0 ${state.deck.width} ${state.deck.height}`);svg.setAttribute('tabindex','-1');svg.setAttribute('aria-label',t('GuidePanel.1'));surface.insertBefore(svg,surface.querySelector('.hit-overlay'));
    let start=null,latest=null,scheduled=0;
    const tooltip=surface.querySelector('.drag-tooltip');
    const position=event=>Math.round((start.pos+((start.axis==='x'?event.clientX:event.clientY)-start.client)*start.scale)/GUIDE_UNIT)*GUIDE_UNIT;
    function clear(){
      const previous=start;if(scheduled)cancelAnimationFrame(scheduled);scheduled=0;start=null;latest=null;draft=null;tooltip.hidden=true;setDragHandlers(null,null);
      if(previous&&svg.hasPointerCapture?.(previous.pointerId))svg.releasePointerCapture(previous.pointerId);
      updateControls();render();
    }
    function updateDraft(){
      scheduled=0;if(!start||!latest)return;
      const pos=position(latest);draft={id:start.id,pos};
      tooltip.textContent=t('guide-ui.9', {p0: start.axis==='x'?t('guide-ui.10'):t('guide-ui.11'), p1: (pos/EMU_PER_CM).toFixed(2)});
      tooltip.style.left=`${Math.max(8,Math.min(start.rect.width-220,latest.clientX-start.rect.left+14))}px`;tooltip.style.top=`${Math.max(8,Math.min(start.rect.height-45,latest.clientY-start.rect.top+14))}px`;tooltip.hidden=false;
      $('guide-position').value=(pos/EMU_PER_CM).toFixed(2);render();
    }
    svg.addEventListener('pointerdown',event=>{
      const id=event.target.closest?.('[data-guide-id]')?.dataset.guideId,guide=state.deck.guides.global.find(g=>g.id===id);
      if(!guide||!$('guides-edit').checked||state.busy||event.button!==0||event.isPrimary===false)return;
      event.preventDefault();event.stopPropagation();cancelDrag();svg.focus({preventScroll:true});state.reference=index;selectedId=id;updateControls();$('guide-select').value=id;
      const rect=surface.getBoundingClientRect();if(!rect.width)return;
      start={id,axis:guide.axis,pos:guide.pos,pointerId:event.pointerId,client:guide.axis==='x'?event.clientX:event.clientY,scale:state.deck.width/rect.width,rect};
      setDragHandlers(clear,null);svg.setPointerCapture(event.pointerId);render();
    });
    svg.addEventListener('pointermove',event=>{if(!start||event.pointerId!==start.pointerId)return;event.stopPropagation();latest={clientX:event.clientX,clientY:event.clientY};if(!scheduled)scheduled=requestAnimationFrame(updateDraft);});
    svg.addEventListener('pointerup',event=>{
      if(!start||event.pointerId!==start.pointerId)return;event.stopPropagation();const id=start.id,pos=position(event);clear();commit(()=>changeGuide(state.deck,id,pos),t('guide-ui.12'));
    });
    for(const type of ['pointercancel','lostpointercapture'])svg.addEventListener(type,event=>{if(start&&event.pointerId===start.pointerId){event.stopPropagation();clear();}});
  }
  $('guide-horizontal').onclick=()=>add('y');$('guide-vertical').onclick=()=>add('x');
  $('guide-select').onchange=()=>{cancelDrag();selectedId=$('guide-select').value;updateControls();const g=current();$('guide-position').value=g?(g.pos/EMU_PER_CM).toFixed(2):'';render();};
  $('guide-apply').onclick=()=>{if(!$('guide-position').value.trim()){error(localizedError('guide-ui.13'));return;}const id=selectedId,pos=Number($('guide-position').value)*EMU_PER_CM;commit(()=>changeGuide(state.deck,id,pos),t('guide-ui.12'));};
  $('guide-position').onkeydown=event=>{if(event.key==='Enter')$('guide-apply').click();};
  $('guide-delete').onclick=()=>commit(()=>removeGuide(state.deck,selectedId),t('guide-ui.14'));
  for(const id of ['guides-visible','guides-edit','guides-snap'])$(id).onchange=()=>{cancelDrag();render();};
  return {mountSurface,render,updateControls,onOpen(){selectedId='';draft=null;$('guides-edit').checked=false;$('guides-visible').checked=true;$('guide-select').dataset.optionsKey='';updateControls();},
    snapDrag(bounds,delta,index,scale,alt){
      if(alt||!$('guides-visible').checked||!$('guides-snap').checked)return {...delta,guideHits:[]};
      const snapped=snapToGuides(bounds,delta.dx,delta.dy,slideGuides(state.deck,index),6*scale,delta.axis);
      return {...delta,dx:snapped.dx,dy:snapped.dy,guideHits:snapped.hits};
    }
  };
}
