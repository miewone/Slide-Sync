import {ElementResize} from '../ElementResize.js';
import {localizedError} from '../../i18n/I18n.js';
import {SearchText} from '../SearchText.js';
import {NativeTextContent} from './NativeTextContent.js';

const PT_PER_CM=72/2.54;
const toPt=value=>!value?NaN:(value.magnitude??0)===0?0:value.unit==='EMU'?value.magnitude/12700:value.unit==='PT'?value.magnitude:NaN;
const matrix=t=>t?{a:t.scaleX??0,b:t.shearY??0,c:t.shearX??0,d:t.scaleY??0,x:toPt({magnitude:t.translateX??0,unit:t.unit}),y:toPt({magnitude:t.translateY??0,unit:t.unit})}:{a:1,b:0,c:0,d:1,x:0,y:0};
const point=(m,x,y)=>({x:m.a*x+m.c*y+m.x,y:m.b*x+m.d*y+m.y});
const union=boxes=>({x:Math.min(...boxes.map(b=>b.x)),y:Math.min(...boxes.map(b=>b.y)),right:Math.max(...boxes.map(b=>b.x+b.w)),bottom:Math.max(...boxes.map(b=>b.y+b.h))});
const rectangle=points=>{const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));return {x,y,w:Math.max(...points.map(p=>p.x))-x,h:Math.max(...points.map(p=>p.y))-y};};
function outline(element) {
  const m=matrix(element.transform);
  const points=element.elementGroup?(element.elementGroup.children||[]).flatMap(outline):(()=>{
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
  if(element.elementGroup)return (element.elementGroup.children||[]).map(textContent).join(' ');
  const texts=element.shape?[element.shape.text]:element.table?.tableRows?.flatMap(row=>(row.tableCells||[]).map(cell=>cell.text))||[];
  return texts.map(text=>NativeTextContent.read(text)).join('\n').trim();
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
    this.original=structuredClone(presentation);this.objects=new Map();
    const index=elements=>{for(const e of elements||[]){this.objects.set(e.objectId,e);if(e.elementGroup)index(e.elementGroup.children);}};
    for(const slide of this.original.slides)index(slide.pageElements);
    this.changes=new Map();this.undoStack=[];this.redoStack=[];this.elementsCache=new Map();this.cachedChanges=this.changes;
  }
  /** @param {number} index Zero-based slide index. Returns top-level native objects; groups remain intact. */
  elements(index){
    if(this.cachedChanges!==this.changes){this.elementsCache.clear();this.cachedChanges=this.changes;}
    if(this.elementsCache.has(index))return this.elementsCache.get(index);
    const elements=(this.original.slides[index]?.pageElements||[]).map(element=>{
    const change=this.changes.get(element.objectId)||{},current=this.current(element),box=bounds(current);
    return {native:current,id:element.objectId,name:element.title||textContent(element).slice(0,80)||element.objectId,text:textContent(element),
      kind:element.elementGroup?'group':Object.keys(element).find(k=>['shape','image','video','table','line','wordArt','sheetsChart'].includes(k))||'object',
      box,deleted:!!change.deleted,changed:this.hasChange(element)};
  });this.elementsCache.set(index,elements);return elements;}
  /** Number of objects with pending edits. */
  get dirty(){return this.changes.size>0;}
  /** @param {object} presentation Fresh original or native copy. @param {object} options copy skips source revision equality. */
  matches(presentation,{copy=false,baseline=this.original}={}){
    if(!copy&&this.original.revisionId)return presentation.revisionId===this.original.revisionId;
    return fingerprint(baseline)===fingerprint(presentation);
  }
  /** @param {Function} edit Mutates a fresh change map as one undoable user action. */
  edit(edit){
    const before=this.changes;this.changes=new Map([...before].map(([key,value])=>[key,structuredClone(value)]));
    try{edit();}catch(error){this.changes=before;throw error;}finally{this.elementsCache.clear();}
    for(const [key,value] of this.changes)if(!value.deleted&&!value.textStyle&&!value.shapeProperties&&!value.transform&&Math.abs(value.dx||0)<1e-8&&Math.abs(value.dy||0)<1e-8)this.changes.delete(key);
    if(JSON.stringify([...before])===JSON.stringify([...this.changes]))return;
    this.undoStack.push(before);if(this.undoStack.length>25)this.undoStack.shift();this.redoStack=[];
  }
  /** @param {string} objectId Top-level native object. @param {number} dx Horizontal points. @param {number} dy Vertical points. */
  translate(objectId,dx,dy){
    this.elementsCache.clear();const old=this.changes.get(objectId)||{};
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
  align(checked,selected,action,target='selection'){
    if(!['selection','slide'].includes(target)||!['left','center','right','top','middle','bottom','horizontal','vertical'].includes(action))throw localizedError('drive.invalidSave');
    this.edit(()=>{for(const index of checked){
      const elements=this.elements(index).filter(e=>selected.has(e.id)&&!e.deleted&&e.box);if(elements.length<(target==='slide'?1:2))continue;
      const b=target==='slide'?{x:0,y:0,right:this.width,bottom:this.height}:union(elements.map(e=>e.box));
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
  /** @param {object} element Source object. Return whether it or a grouped child has edits. */
  hasChange(element){return this.changes.has(element.objectId)||!!element.elementGroup?.children?.some(e=>this.hasChange(e));}
  /** @param {object} element Source object. Materialize current properties without mutating the original. */
  current(element){
    const c=this.changes.get(element.objectId)||{},result={...element};
    if(c.transform||c.dx||c.dy){const m=matrix(c.transform||element.transform);result.transform={scaleX:m.a,scaleY:m.d,shearX:m.c,shearY:m.b,translateX:m.x+(c.dx||0),translateY:m.y+(c.dy||0),unit:'PT'};}
    if(element.elementGroup?.children)result.elementGroup={...element.elementGroup,children:(element.elementGroup.children||[]).filter(e=>!this.changes.get(e.objectId)?.deleted).map(e=>this.current(e))};
    if(element.shape&&(c.textStyle||c.shapeProperties)){
      result.shape=structuredClone(element.shape);
      if(c.textStyle)for(const e of result.shape.text?.textElements||[])if(e.textRun)e.textRun.style={...e.textRun.style,...c.textStyle};
      if(c.textStyle?.fontSize)result.shape.shapeProperties={...result.shape.shapeProperties,autofit:{autofitType:'NONE',fontScale:1,lineSpacingReduction:0}};
      if(c.shapeProperties)result.shape.shapeProperties={...result.shape.shapeProperties,...c.shapeProperties};
    }
    return result;
  }
  /** @param {Set<number>} checked Slides. @param {Set<string>} selected Top-level IDs. Return selected text shapes including grouped children. */
  textShapes(checked,selected){
    const result=[];
    const visit=e=>{if(e.elementGroup)for(const child of e.elementGroup.children||[])visit(child);else if(e.shape?.text?.textElements?.some(t=>t.textRun?.content?.trim()))result.push(e);};
    for(const index of checked)for(const e of this.elements(index))if(!e.deleted&&selected.has(e.id))visit(e.native);
    return result;
  }
  /** @param {Set<number>} checked Slides. @param {Set<string>} selected IDs. @param {object} patch size (points), bold, or fontFamily. */
  format(checked,selected,patch){
    const {size,bold,fontFamily}=patch;
    if((size!==undefined&&(!Number.isFinite(size)||size<1||size>400))||(bold!==undefined&&typeof bold!=='boolean')||(fontFamily!==undefined&&(typeof fontFamily!=='string'||!fontFamily.trim()||fontFamily.length>200)))throw localizedError('textFormat.invalid');
    const textStyle={...(size!==undefined?{fontSize:{magnitude:size,unit:'PT'}}:{}),...(bold!==undefined?{bold}:{}),...(fontFamily!==undefined?{fontFamily:fontFamily.trim()}: {})};
    if(!Object.keys(textStyle).length)return;
    this.edit(()=>{for(const e of this.textShapes(checked,selected)){const old=this.changes.get(e.objectId)||{};this.changes.set(e.objectId,{...old,textStyle:{...old.textStyle,...textStyle}});}});
  }
  /** @param {Set<number>} checked Slides. @param {Set<string>} selected IDs. @param {number} delta Points to add. @param {Function} readSize Resolve inherited point size. */
  adjustFontSize(checked,selected,delta,readSize){
    if(!Number.isFinite(delta))throw localizedError('textFormat.invalid');
    this.edit(()=>{for(const e of this.textShapes(checked,selected)){const old=this.changes.get(e.objectId)||{},size=Math.max(1,Math.min(400,readSize(e)+delta));
      if(!Number.isFinite(size))throw localizedError('textFormat.invalid');
      this.changes.set(e.objectId,{...old,textStyle:{...old.textStyle,fontSize:{magnitude:size,unit:'PT'}}});
    }});
  }
  /** @param {object[]} plans Measured top-level shape IDs and local width/height in points. Keep rotation and origin; reject invalid dimensions atomically. */
  resizeText(plans){
    this.edit(()=>{for(const {id,width,height} of plans){
      const original=this.objects.get(id);if(!original?.shape)continue;
      if(![width,height].every(n=>Number.isFinite(n)&&n>0&&n<100000))throw localizedError('drive.coordinates');
      const current=this.current(original),m=matrix(current.transform),w=toPt(current.size.width),h=toPt(current.size.height);
      const sx=Math.hypot(m.a,m.b),sy=Math.hypot(m.c,m.d);if(!sx||!sy||!w||!h)continue;
      const old=this.changes.get(id)||{};
      this.changes.set(id,{...old,dx:0,dy:0,transform:{scaleX:m.a*width/(w*sx),shearY:m.b*width/(w*sx),shearX:m.c*height/(h*sy),scaleY:m.d*height/(h*sy),translateX:m.x,translateY:m.y,unit:'PT'}});
    }});
  }
  /** @param {Set<number>} checked Scoped slides. @param {Set<string>} selected Object IDs. @param {number} widthPercent Local width %. @param {number} heightPercent Local height %. Preserve each object's visual center and rotation. */
  resize(checked,selected,widthPercent,heightPercent){
    const {sx,sy}=ElementResize.factors(widthPercent,heightPercent);
    if(sx===1&&sy===1)return;
    this.edit(()=>{for(const index of checked)for(const e of this.elements(index)){
      if(!selected.has(e.id)||e.deleted||!e.box)continue;
      const old=this.changes.get(e.id)||{},transform=this.resizedElement(e,sx,sy).native.transform;
      this.changes.set(e.id,{...old,dx:0,dy:0,transform});
    }});
  }
  /** @param {object} element Descriptor. @param {number} sx Local horizontal factor. @param {number} sy Local vertical factor. Return a preview descriptor without editing the model. */
  resizedElement(element,sx,sy){
    const e=element,m=matrix(e.native.transform);
    const transform={scaleX:m.a*sx,shearY:m.b*sx,shearX:m.c*sy,scaleY:m.d*sy,translateX:m.x,translateY:m.y,unit:'PT'};
    const resized=bounds({...e.native,transform});
    if(!resized||resized.w>100000||resized.h>100000)throw localizedError('resize.invalid');
    transform.translateX+=e.box.x+e.box.w/2-resized.x-resized.w/2;
    transform.translateY+=e.box.y+e.box.h/2-resized.y-resized.h/2;
    const native={...e.native,transform};return {...e,native,box:bounds(native)};
  }
  /** @param {object} element Descriptor. Return a local-axis handle rectangle centered on the object. */
  resizeGeometry(element){
    const m=matrix(element.native.transform),rot=Math.atan2(m.b,m.a),c=Math.cos(rot),s=Math.sin(rot),cx=element.box.x+element.box.w/2,cy=element.box.y+element.box.h/2;
    const points=outline(element.native).map(p=>({x:c*(p.x-cx)+s*(p.y-cy),y:-s*(p.x-cx)+c*(p.y-cy)})),b=rectangle(points);
    return {x:cx-b.w/2,y:cy-b.h/2,w:b.w,h:b.h,rot:rot*180/Math.PI};
  }
  /** @param {string} query Literal slide text. Return slide indices without notes/master samples. */
  findSlides(query){const q=SearchText.normalize(query);return q?this.original.slides.flatMap((_,i)=>SearchText.normalize(this.elements(i).filter(e=>!e.deleted).map(e=>e.text).join(' ')).includes(q)?[i]:[]):[];}
  /** @param {Set<number>} checked Slides. @param {Set<string>} previous IDs. @param {object} rectangle Slide-point box. @param {boolean} additive Keep current selections. */
  selectRectangle(checked,previous,rectangle,additive=false){
    const result=new Set(previous);
    for(const index of checked)for(const e of this.elements(index)){
      if(!additive)result.delete(e.id);
      const b=e.box,r=rectangle;
      if(!e.deleted&&b&&r.w>0&&r.h>0&&b.x>=r.x&&b.y>=r.y&&b.x+b.w<=r.x+r.w&&b.y+b.h<=r.y+r.h)result.add(e.id);
    }
    return result;
  }
  /** Return minimal Slides requests; preserve every unedited property and native object ID. */
  requests(){
    const deleted=new Set();
    const visit=e=>{deleted.add(e.objectId);for(const child of e.elementGroup?.children||[])visit(child);};
    for(const [id,c] of this.changes)if(c.deleted)visit(this.objects.get(id));
    return [...this.changes].flatMap(([objectId,c])=>{
      if(c.deleted)return [{deleteObject:{objectId}}];
      if(deleted.has(objectId))return [];
      const requests=[];
      if(c.transform||c.dx||c.dy)requests.push({updatePageElementTransform:{objectId,applyMode:c.transform?'ABSOLUTE':'RELATIVE',transform:c.transform?this.current(this.objects.get(objectId)).transform:{scaleX:1,scaleY:1,shearX:0,shearY:0,translateX:c.dx||0,translateY:c.dy||0,unit:'PT'}}});
      if(c.textStyle)requests.push({updateTextStyle:{objectId,textRange:{type:'ALL'},style:c.textStyle,fields:Object.keys(c.textStyle).join(',')}});
      if(c.shapeProperties)requests.push({updateShapeProperties:{objectId,shapeProperties:c.shapeProperties,fields:Object.keys(c.shapeProperties).join(',')}});
      return requests;
    });
  }
  /** @param {string} presentationId Saved destination. @param {string} title Destination name. @param {string|null} revisionId Server revision after atomic write. */
  acceptSave(presentationId,title,revisionId){
    for(const slide of this.original.slides)slide.pageElements=(slide.pageElements||[]).filter(e=>!this.changes.get(e.objectId)?.deleted).map(e=>this.current(e));
    this.objects.clear();const index=elements=>{for(const e of elements||[]){this.objects.set(e.objectId,e);if(e.elementGroup)index(e.elementGroup.children);}};
    for(const slide of this.original.slides)index(slide.pageElements);
    Object.assign(this.original,{presentationId,title,revisionId});this.changes.clear();this.elementsCache.clear();this.undoStack=[];this.redoStack=[];
  }
}
