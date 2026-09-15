import {localizedError} from '../../i18n/I18n.js';

const PT_PER_CM=72/2.54;
const toPt=value=>value?.unit==='EMU'?value.magnitude/12700:value?.unit==='PT'?value.magnitude:NaN;
const matrix=t=>t?{a:t.scaleX??0,b:t.shearY??0,c:t.shearX??0,d:t.scaleY??0,x:toPt({magnitude:t.translateX??0,unit:t.unit}),y:toPt({magnitude:t.translateY??0,unit:t.unit})}:{a:1,b:0,c:0,d:1,x:0,y:0};
const point=(m,x,y)=>({x:m.a*x+m.c*y+m.x,y:m.b*x+m.d*y+m.y});
const union=boxes=>({x:Math.min(...boxes.map(b=>b.x)),y:Math.min(...boxes.map(b=>b.y)),right:Math.max(...boxes.map(b=>b.x+b.w)),bottom:Math.max(...boxes.map(b=>b.y+b.h))});
const rectangle=points=>{const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));return {x,y,w:Math.max(...points.map(p=>p.x))-x,h:Math.max(...points.map(p=>p.y))-y};};
function outline(element) {
  const m=matrix(element.transform);
  const points=element.elementGroup?element.elementGroup.children.flatMap(outline):(()=>{
    const w=toPt(element.size?.width),h=toPt(element.size?.height);
    return [{x:0,y:0},{x:w,y:0},{x:0,y:h},{x:w,y:h}];
  })();
  return points.map(p=>point(m,p.x,p.y));
}
function bounds(element) {
  const points=outline(element);
  return points.length&&points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))?rectangle(points):null;
}
function textContent(element){
  if(element.elementGroup)return element.elementGroup.children.map(textContent).join(' ');
  const texts=element.shape?[element.shape.text]:element.table?.tableRows?.flatMap(r=>r.tableCells.map(c=>c.text))||[];
  return texts.flatMap(t=>t?.textElements?.map(e=>e.textRun?.content||'')||[]).join('').trim();
}
function fingerprint(presentation){
  const clean=value=>Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().filter(k=>!['contentUrl','revisionId','presentationId'].includes(k)).map(k=>[k,clean(value[k])])):value;
  return JSON.stringify(clean({pageSize:presentation.pageSize,slides:presentation.slides,layouts:presentation.layouts,masters:presentation.masters}));
}

/** Native object edits with bounded undo; original JSON is retained and never replaced through import. */
export class NativeSlidesDocument {
  /** @param {object} presentation Full Slides API presentation, including revisionId when writable. */
  constructor(presentation){
    if(!presentation.presentationId||!presentation.slides?.length||presentation.slides.length>120)throw localizedError('drive.invalidSlides');
    let count=0;
    const check=(elements,depth=0)=>{if(depth>100)throw localizedError('drive.invalidSlides');for(const e of elements||[]){if(++count>15000)throw localizedError('drive.invalidSlides');if(e.elementGroup)check(e.elementGroup.children,depth+1);}};
    for(const slide of presentation.slides)check(slide.pageElements);
    this.width=toPt(presentation.pageSize?.width);this.height=toPt(presentation.pageSize?.height);
    if(!(this.width>0&&this.height>0))throw localizedError('drive.invalidSlides');
    this.original=structuredClone(presentation);this.changes=new Map();this.undoStack=[];this.redoStack=[];
  }
  /** @param {number} index Zero-based slide index. Returns top-level native objects; groups remain intact. */
  elements(index){return (this.original.slides[index]?.pageElements||[]).map(element=>{
    const change=this.changes.get(element.objectId)||{},box=bounds(element);
    return {id:element.objectId,name:element.title||textContent(element).slice(0,80)||element.objectId,text:textContent(element),
      kind:element.elementGroup?'group':Object.keys(element).find(k=>['shape','image','video','table','line','wordArt','sheetsChart'].includes(k))||'object',
      box:box?{...box,x:box.x+(change.dx||0),y:box.y+(change.dy||0)}:null,deleted:!!change.deleted,changed:!!(change.dx||change.dy||change.deleted)};
  });}
  /** Number of objects with pending edits. */
  get dirty(){return this.changes.size>0;}
  /** @param {object} presentation Fresh original or native copy. @param {object} options copy skips source revision equality. */
  matches(presentation,{copy=false,baseline=this.original}={}){
    if(!copy&&this.original.revisionId)return presentation.revisionId===this.original.revisionId;
    return fingerprint(baseline)===fingerprint(presentation);
  }
  /** @param {Function} edit Mutates a fresh change map as one undoable user action. */
  edit(edit){
    const before=this.changes;this.changes=new Map([...before].map(([key,value])=>[key,{...value}]));
    try{edit();}catch(error){this.changes=before;throw error;}
    for(const [key,value] of this.changes)if(!value.deleted&&Math.abs(value.dx||0)<1e-8&&Math.abs(value.dy||0)<1e-8)this.changes.delete(key);
    if(JSON.stringify([...before])===JSON.stringify([...this.changes]))return;
    this.undoStack.push(before);if(this.undoStack.length>25)this.undoStack.shift();this.redoStack=[];
  }
  /** @param {string} objectId Top-level native object. @param {number} dx Horizontal points. @param {number} dy Vertical points. */
  translate(objectId,dx,dy){
    const old=this.changes.get(objectId)||{};
    this.changes.set(objectId,{...old,dx:(old.dx||0)+dx,dy:(old.dy||0)+dy});
  }
  /** @param {Set<number>} checked Scoped slides. @param {Set<string>} selected Native IDs. @param {number} x Centimeters. @param {number} y Centimeters. @param {string} mode relative or absolute bounding-box position. */
  move(checked,selected,x,y,mode='relative'){
    if(![x,y].every(Number.isFinite)||!['relative','absolute'].includes(mode))throw localizedError('drive.coordinates');
    this.edit(()=>{for(const index of checked){
      const elements=this.elements(index).filter(e=>selected.has(e.id)&&!e.deleted&&e.box);if(!elements.length)continue;
      const b=union(elements.map(e=>e.box)),dx=x*PT_PER_CM-(mode==='absolute'?b.x:0),dy=y*PT_PER_CM-(mode==='absolute'?b.y:0);
      for(const e of elements)this.translate(e.id,dx,dy);
    }});
  }
  /** @param {Set<number>} checked Scoped slides. @param {Set<string>} selected Native IDs. @param {string} action left, center, right, top, middle, bottom, horizontal or vertical. */
  align(checked,selected,action){
    if(!['left','center','right','top','middle','bottom','horizontal','vertical'].includes(action))throw localizedError('drive.invalidSave');
    this.edit(()=>{for(const index of checked){
      const elements=this.elements(index).filter(e=>selected.has(e.id)&&!e.deleted&&e.box);if(elements.length<2)continue;
      const b=union(elements.map(e=>e.box));
      if(['horizontal','vertical'].includes(action)){
        if(elements.length<3)continue;
        const axis=action==='horizontal'?'x':'y',size=axis==='x'?'w':'h';elements.sort((a,b)=>a.box[axis]-b.box[axis]);
        const first=elements[0].box,last=elements.at(-1).box,gap=(last[axis]+last[size]-first[axis]-elements.reduce((n,e)=>n+e.box[size],0))/(elements.length-1);
        let cursor=first[axis];for(const e of elements){this.translate(e.id,axis==='x'?cursor-e.box.x:0,axis==='y'?cursor-e.box.y:0);cursor+=e.box[size]+gap;}
      }else for(const e of elements){
        const g=e.box,dx=action==='left'?b.x-g.x:action==='center'?(b.x+b.right-g.w)/2-g.x:action==='right'?b.right-g.w-g.x:0;
        const dy=action==='top'?b.y-g.y:action==='middle'?(b.y+b.bottom-g.h)/2-g.y:action==='bottom'?b.bottom-g.h-g.y:0;
        this.translate(e.id,dx,dy);
      }
    }});
  }
  /** @param {Set<number>} checked Scoped slides. @param {Set<string>} selected Native IDs. Delete only explicitly selected top-level objects. */
  remove(checked,selected){this.edit(()=>{for(const index of checked)for(const e of this.elements(index))if(selected.has(e.id))this.changes.set(e.id,{deleted:true});});}
  /** Restore the last pending action without contacting Google. */
  undo(){if(this.undoStack.length){this.redoStack.push(this.changes);this.changes=this.undoStack.pop();}}
  /** Reapply the most recently undone pending action. */
  redo(){if(this.redoStack.length){this.undoStack.push(this.changes);this.changes=this.redoStack.pop();}}
  /** Return minimal Slides requests; preserve every unedited property and native object ID. */
  requests(){return [...this.changes].map(([objectId,c])=>c.deleted?{deleteObject:{objectId}}:{updatePageElementTransform:{objectId,applyMode:'RELATIVE',transform:{scaleX:1,scaleY:1,shearX:0,shearY:0,translateX:c.dx||0,translateY:c.dy||0,unit:'PT'}}});}
  /** @param {string} presentationId Saved destination. @param {string} title Destination name. @param {string|null} revisionId Server revision after atomic write. */
  acceptSave(presentationId,title,revisionId){
    for(const slide of this.original.slides)slide.pageElements=(slide.pageElements||[]).filter(e=>!this.changes.get(e.objectId)?.deleted).map(e=>{
      const c=this.changes.get(e.objectId);if(!c)return e;
      const m=matrix(e.transform);
      return {...e,transform:{scaleX:m.a,scaleY:m.d,shearX:m.c,shearY:m.b,translateX:m.x+(c.dx||0),translateY:m.y+(c.dy||0),unit:'PT'}};
    });
    Object.assign(this.original,{presentationId,title,revisionId});this.changes.clear();this.undoStack=[];this.redoStack=[];
  }
}
