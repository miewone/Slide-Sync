import {t,localizedError} from '../i18n/I18n.js';
import {PackageReader} from './PackageReader.js';
export const NS = {p:'http://schemas.openxmlformats.org/presentationml/2006/main',a:'http://schemas.openxmlformats.org/drawingml/2006/main',r:'http://schemas.openxmlformats.org/officeDocument/2006/relationships'};
export const EMU_PER_CM=360000;
const kinds=new Set(['sp','pic','graphicFrame','cxnSp','grpSp']);
export const children=n=>Array.from(n?.childNodes||[]).filter(x=>x.nodeType===1);
export const child=(n,name)=>children(n).find(x=>x.localName===name);
export const descendants=(n,name)=>Array.from(n?.getElementsByTagNameNS?.('*',name)||[]);
export function parseXml(text){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw localizedError('core.1');const d=new DOMParser().parseFromString(text,'application/xml');if(descendants(d,'parsererror').length)throw localizedError('core.2');return d;}
export const serialize=doc=>new XMLSerializer().serializeToString(doc);
export function resolvePath(base,target){if(!target||/^[a-z]+:/i.test(target))return null;const result=target.startsWith('/')?[]:base.split('/').slice(0,-1);for(const part of target.split('/')){if(part==='..')result.pop();else if(part&&part!=='.')result.push(part);}return result.join('/');}
const relPath=p=>p.slice(0,p.lastIndexOf('/')+1)+'_rels/'+p.slice(p.lastIndexOf('/')+1)+'.rels';
export async function rels(zip,path){const f=zip.file(relPath(path));if(!f)return new Map();const d=parseXml(await f.async('string'));return new Map(descendants(d,'Relationship').map(e=>[e.getAttribute('Id'),{type:e.getAttribute('Type'),external:e.getAttribute('TargetMode')==='External',path:resolvePath(path,e.getAttribute('Target'))}]));}
const shapeTree=doc=>descendants(doc,'spTree')[0];
function shapeNodes(tree){return children(tree).flatMap(n=>kinds.has(n.localName)?[n]:n.localName==='AlternateContent'?shapeNodes(child(n,'Fallback')||child(n,'Choice')):[]);}
const ph=n=>descendants(n,'ph')[0];
function matchPlaceholder(node,nodes){const placeholder=ph(node);if(!placeholder)return null;const idx=placeholder.getAttribute('idx')||'0',type=placeholder.getAttribute('type')||'obj';return nodes.find(n=>ph(n)&&(ph(n).getAttribute('idx')||'0')===idx)||nodes.find(n=>ph(n)&&(ph(n).getAttribute('type')||'obj')===type)||null;}
function xfrm(node){return node?.localName==='graphicFrame'?child(node,'xfrm'):child(child(node,node?.localName==='grpSp'?'grpSpPr':'spPr'),'xfrm');}
const num=(n,k)=>n?.hasAttribute(k)?Number(n.getAttribute(k)):undefined;
const pick=(arr,tag,key,def)=>{for(const x of arr){const value=num(tag?child(x,tag):x,key);if(Number.isFinite(value))return value;}return def;};
export function readGeometry(node,inherited=[]){const xs=[node,...inherited].map(xfrm).filter(Boolean);if(!xs.length)return null;const g={x:pick(xs,'off','x',NaN),y:pick(xs,'off','y',NaN),w:pick(xs,'ext','cx',NaN),h:pick(xs,'ext','cy',NaN),rot:pick(xs,null,'rot',0)/60000,flipH:pick(xs,null,'flipH',0)===1,flipV:pick(xs,null,'flipV',0)===1};if(![g.x,g.y,g.w,g.h,g.rot].every(Number.isFinite))return null;g.chX=pick(xs,'chOff','x',0);g.chY=pick(xs,'chOff','y',0);g.chW=pick(xs,'chExt','cx',g.w);g.chH=pick(xs,'chExt','cy',g.h);return g;}
function descriptor(node,index,inherited=[]){const props=descendants(node,'cNvPr')[0];const g=readGeometry(node,inherited);return {node,inherited,id:props?.getAttribute('id')||String(index),name:props?.getAttribute('name')||t('core.3'),kind:node.localName,index,g,hidden:['1','true'].includes(props?.getAttribute('hidden')),text:descendants(node,'t').map(n=>n.textContent).join(' ').slice(0,80),children:node.localName==='grpSp'?shapeNodes(node).map((n,i)=>descriptor(n,i)):[]};}
export function refreshSlide(slide){const layout=shapeNodes(shapeTree(slide.layout)),master=shapeNodes(shapeTree(slide.master));slide.elements=shapeNodes(shapeTree(slide.doc)).map((node,i)=>{const l=matchPlaceholder(node,layout),m=matchPlaceholder(l||node,master);return descriptor(node,i,[l,m].filter(Boolean));});slide.title=slide.elements.find(e=>ph(e.node)&&['title','ctrTitle'].includes(ph(e.node).getAttribute('type')))?.text||slide.elements.find(e=>e.text)?.text||t('ElementNamePopover.5', {p0: slide.index+1});}
export async function loadDeck(buffer,JSZip){const zip=await JSZip.loadAsync(buffer);if(Object.keys(zip.files).length>15000)throw localizedError('core.4');let total=0;for(const f of Object.values(zip.files))total+=f._data?.uncompressedSize||0;if(total>300*1024*1024)throw localizedError('core.5');const presentation=zip.file('ppt/presentation.xml');if(!presentation)throw localizedError('core.6');const reader=new PackageReader(zip,{parseXml,resolvePath});const doc=await reader.readDoc('ppt/presentation.xml'),size=descendants(doc,'sldSz')[0];const width=num(size,'cx'),height=num(size,'cy');if(!(width>0&&height>0))throw localizedError('core.7');const relationships=await reader.readRelationships('ppt/presentation.xml');const ids=descendants(child(doc.documentElement,'sldIdLst'),'sldId');if(!ids.length)throw localizedError('core.8');if(ids.length>120)throw localizedError('core.9');
 const slides=[];for(const [index,id] of ids.entries()){const rel=relationships.get(id.getAttributeNS(NS.r,'id')||id.getAttribute('r:id'));if(!rel||rel.external)throw localizedError('core.10');const path=rel.path,doc=await reader.readDoc(path);if(!doc)throw localizedError('core.11', {p0: index+1});const slideRelationships=await reader.readRelationships(path);const lr=Array.from(slideRelationships.values()).find(r=>r.type.endsWith('/slideLayout')&&!r.external),layout=await reader.readDoc(lr?.path);const mr=lr?Array.from((await reader.readRelationships(lr.path)).values()).find(r=>r.type.endsWith('/slideMaster')&&!r.external):null;const master=await reader.readDoc(mr?.path);const themeRel=mr?Array.from((await reader.readRelationships(mr.path)).values()).find(r=>r.type.endsWith('/theme')&&!r.external):null;const slide={index,path,doc,layout,master,relationships:slideRelationships,themePath:themeRel?.path,originalXml:await reader.readText(path),dirty:false};refreshSlide(slide);slides.push(slide);}return {zip,width,height,slides,original:buffer};}
export function localPoint(g,x,y){const cx=g.x+g.w/2,cy=g.y+g.h/2,r=-g.rot*Math.PI/180,dx=x-cx,dy=y-cy;let lx=dx*Math.cos(r)-dy*Math.sin(r)+g.w/2,ly=dx*Math.sin(r)+dy*Math.cos(r)+g.h/2;if(g.flipH)lx=g.w-lx;if(g.flipV)ly=g.h-ly;return {x:lx,y:ly};}
export function contains(e,x,y,tolerance=25000){const g=e.g;if(!g||e.hidden)return false;const p=localPoint(g,x,y);if(e.kind==='grpSp'){if(!g.w||!g.h)return false;const gx=g.chX+p.x*g.chW/g.w,gy=g.chY+p.y*g.chH/g.h;return e.children.some(c=>contains(c,gx,gy,tolerance*Math.max(g.chW/g.w,g.chH/g.h)));}if(e.kind==='cxnSp'||Math.min(g.w,g.h)<1){const dx=g.w,dy=g.h,t=Math.max(0,Math.min(1,(p.x*dx+p.y*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-dx*t,p.y-dy*t)<=tolerance;}return p.x>=0&&p.y>=0&&p.x<=g.w&&p.y<=g.h;}
export function hitTest(slide,x,y){for(let i=slide.elements.length-1;i>=0;i--)if(contains(slide.elements[i],x,y))return slide.elements[i];return null;}
export function corners(g){const r=g.rot*Math.PI/180,cx=g.x+g.w/2,cy=g.y+g.h/2;return [[0,0],[g.w,0],[g.w,g.h],[0,g.h]].map(([x,y])=>{x-=g.w/2;y-=g.h/2;return {x:cx+x*Math.cos(r)-y*Math.sin(r),y:cy+x*Math.sin(r)+y*Math.cos(r)};});}
function ensureChild(parent,name,namespace=NS.a){let n=child(parent,name);if(!n){n=parent.ownerDocument.createElementNS(namespace,(namespace===NS.p?'p:':'a:')+name);parent.appendChild(n);}return n;}
export function setPosition(e,x,y){if(!e.g||![x,y].every(Number.isFinite))throw localizedError('core.12');const n=e.node,doc=n.ownerDocument;let transform=xfrm(n);if(!transform){const parent=n.localName==='graphicFrame'?n:ensureChild(n,n.localName==='grpSp'?'grpSpPr':'spPr',NS.p);transform=doc.createElementNS(n.localName==='graphicFrame'?NS.p:NS.a,n.localName==='graphicFrame'?'p:xfrm':'a:xfrm');if(n.localName==='graphicFrame'){const nv=children(parent).find(c=>c.localName==='nvGraphicFramePr');parent.insertBefore(transform,nv?.nextSibling||parent.firstChild);}else parent.insertBefore(transform,parent.firstChild);if(e.g.rot)transform.setAttribute('rot',String(Math.round(e.g.rot*60000)));if(e.g.flipH)transform.setAttribute('flipH','1');if(e.g.flipV)transform.setAttribute('flipV','1');}let off=child(transform,'off');if(!off){off=doc.createElementNS(NS.a,'a:off');transform.insertBefore(off,transform.firstChild);}off.setAttribute('x',String(Math.round(x)));off.setAttribute('y',String(Math.round(y)));if(!child(transform,'ext')){const ext=doc.createElementNS(NS.a,'a:ext');ext.setAttribute('cx',String(Math.round(e.g.w)));ext.setAttribute('cy',String(Math.round(e.g.h)));transform.insertBefore(ext,off.nextSibling);}e.g={...e.g,x:Math.round(x),y:Math.round(y)};}
export const selectedIds=value=>typeof value==='string'?[value]:Array.from(value||[]);
export function selectedInSlide(slide,value){const ids=new Set(selectedIds(value));return (slide?.elements||[]).filter(e=>ids.has(e.id)&&e.g&&!e.hidden);}
export function visualBounds(elements){
  if(!elements.length)return null;
  const points=elements.flatMap(e=>corners(e.g)),x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
  return {x,y,w:Math.max(...points.map(p=>p.x))-x,h:Math.max(...points.map(p=>p.y))-y,rot:0};
}
export const selectionBounds=elements=>elements.length===1?{...elements[0].g}:visualBounds(elements);
export function movePlans(deck,selection,x,y,mode='absolute',axis=null){
  if(!['absolute','relative'].includes(mode)||![null,'x','y'].includes(axis)||![x,y].every(Number.isFinite)||Math.abs(x)>360000000||Math.abs(y)>360000000)throw localizedError('core.13');
  const plans=[];
  for(const [index,ids]of selection){
    const elements=selectedInSlide(deck.slides[index],ids),bounds=selectionBounds(elements);if(!bounds)continue;
    const dx=axis==='y'?0:mode==='relative'?x:x-bounds.x,dy=axis==='x'?0:mode==='relative'?y:y-bounds.y;
    for(const e of elements)plans.push({index,id:e.id,x:Math.round(e.g.x+dx),y:Math.round(e.g.y+dy)});
  }
  return plans;
}
/**
 * Apply a validated position batch, capturing each changed slide before its first edit.
 * @param {object} deck Editable deck.
 * @param {Array<object>} plans Target element IDs and coordinates.
 * @param {object} options Optional snapshots Map shared by one undo gesture.
 * @returns {Array<object>} Snapshots for changed slides, with changes containing changed index/ID pairs.
 */
export function commitPositions(deck,plans,{snapshots:retained=new Map()}={}){
  const elementMaps=new Map();
  // Validate the complete batch before changing either slides or retained snapshots.
  const prepared=plans.map(p=>{
    const slide=deck.slides[p.index];
    if(slide&&!elementMaps.has(p.index)){
      const elements=new Map();
      for(const e of slide.elements)if(!elements.has(e.id))elements.set(e.id,e);
      elementMaps.set(p.index,elements);
    }
    const element=elementMaps.get(p.index)?.get(p.id);
    if(!element?.g||![p.x,p.y].every(Number.isFinite)||Math.abs(p.x)>360000000||Math.abs(p.y)>360000000)throw localizedError('core.14');
    return {...p,x:Math.round(p.x),y:Math.round(p.y),slide,element};
  });
  const snapshots=new Map(),changes=[];
  for(const {index,id,x,y,slide,element}of prepared){
    if(element.g.x===x&&element.g.y===y)continue;
    if(!retained.has(index))retained.set(index,{index,xml:serialize(slide.doc),dirty:slide.dirty});
    snapshots.set(index,retained.get(index));
    setPosition(element,x,y);slide.dirty=true;changes.push({index,id});
  }
  const result=[...snapshots.values()];result.changes=changes;
  return result;
}
/** @param {object} deck Deck. @param {Map} selection Selected IDs by slide. @param {number} x X coordinate. @param {number} y Y coordinate. @param {string} mode Absolute or relative. @param {string|null} axis Axis restriction. @param {object} options Optional gesture snapshots passed to commitPositions. */
export function moveSelected(deck,selection,x,y,mode='absolute',axis=null,options){return commitPositions(deck,movePlans(deck,selection,x,y,mode,axis),options);}
export function restore(deck,snapshots){for(const {index,xml,dirty} of snapshots){const s=deck.slides[index];s.doc=parseXml(xml);s.dirty=dirty;refreshSlide(s);}}
export async function exportDeck(deck,type='arraybuffer'){for(const s of deck.slides)deck.zip.file(s.path,s.dirty?serialize(s.doc):s.originalXml);return deck.zip.generateAsync({type,compression:'DEFLATE',compressionOptions:{level:6}});}
export function parseRange(value,count){const text=value.trim().replace(/[–—]/g,'-');if(!text)return new Set();const result=new Set();for(const token of text.split(',')){const m=token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!m)throw localizedError('core.15');const start=Number(m[1]),end=Number(m[2]||m[1]);if(start<1||end<start||end>count)throw localizedError('core.16', {p0: count});for(let i=start;i<=end;i++)result.add(i-1);}return result;}
