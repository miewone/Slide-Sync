import {XmlPartCodec} from '../services/XmlPartCodec.js';
import {t,localizedError} from '../i18n/I18n.js';
import {NS,child,children,descendants,parseXml,serialize,rels,resolvePath} from './core.js';

export const P15='http://schemas.microsoft.com/office/powerpoint/2012/main';
// PowerPoint stores guide coordinates in master units (1/8 point).
export const GUIDE_UNIT=12700/8;
const REL='http://schemas.openxmlformats.org/package/2006/relationships';
const CT='http://schemas.openxmlformats.org/package/2006/content-types';
const VIEW_TYPE='application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml';
const RELS_PATH='ppt/_rels/presentation.xml.rels',TYPES_PATH='[Content_Types].xml';
const extendedLists=doc=>descendants(doc,'sldGuideLst').filter(n=>n.namespaceURI===P15);
const signature=guides=>JSON.stringify(guides);
const quantize=pos=>Math.round(pos/GUIDE_UNIT)*GUIDE_UNIT;
const validPosition=pos=>Number.isFinite(pos)&&Math.abs(pos)<=360000000;

function guideColor(node,fallback){
  const clr=child(node,'clr'),rgb=descendants(clr,'srgbClr')[0]?.getAttribute('val')||descendants(clr,'sysClr')[0]?.getAttribute('lastClr');
  return /^[0-9a-f]{6}$/i.test(rgb||'')?'#'+rgb:fallback;
}
function readList(list,scope,prefix){
  return children(list).filter(n=>n.localName==='guide'&&[NS.p,P15].includes(n.namespaceURI)).flatMap((node,i)=>{
    const orient=node.getAttribute('orient')||'vert',raw=Number(node.getAttribute('pos')||0);
    if(!['vert','horz'].includes(orient)||!Number.isInteger(raw)||Math.abs(raw)>2147483647)return [];
    return [{id:`${prefix}:${i}`,axis:orient==='vert'?'x':'y',pos:raw*GUIDE_UNIT,scope,color:guideColor(node,scope==='global'?'#c36c32':scope==='master'?'#ba576f':'#7662b5'),nativeXml:node.namespaceURI===P15?serialize(node):null,nativeId:node.namespaceURI===P15?node.getAttribute('id'):null,name:node.getAttribute('name')||''}];
  });
}

export async function loadGuides(deck){
  const relationships=await rels(deck.zip,'ppt/presentation.xml');
  const relationship=[...relationships.values()].find(r=>r.type.endsWith('/viewProps')&&!r.external);
  const path=relationship?.path||'ppt/viewProps.xml';
  const originals=new Map(),originalBytes=new Map();
  for(const file of [path,'ppt/presentation.xml',RELS_PATH,TYPES_PATH]){const bytes=deck.zip.file(file)?await deck.zip.file(file).async('uint8array'):null;originalBytes.set(file,bytes);originals.set(file,bytes===null?null:XmlPartCodec.decode(bytes,file));}
  const view=originals.get(path)?parseXml(originals.get(path),path):null;
  const presentation=parseXml(originals.get('ppt/presentation.xml'),'ppt/presentation.xml');
  const presentationLists=extendedLists(presentation),ext=presentationLists.length?presentationLists:extendedLists(view),classic=child(child(child(view?.documentElement,'slideViewPr'),'cSldViewPr'),'guideLst');
  const global=ext.length?ext.flatMap((list,i)=>readList(list,'global',`global:${i}`)):readList(classic,'global','global:legacy');
  const inherited=new Map(),cache=new Map();
  for(const slide of deck.slides){
    const all=[];
    for(const [scope,doc]of [['master',slide.master],['layout',slide.layout],['slide',slide.doc]]){
      if(!doc)continue;
      if(!cache.has(doc))cache.set(doc,extendedLists(doc).flatMap((list,i)=>readList(list,scope,`${scope}:${i}`)));
      for(const g of cache.get(doc))all.push({...g,id:`inherited:${slide.index}:${g.id}`});
    }
    inherited.set(slide.index,all);
  }
  deck.guides={global,inherited,path,originals,originalBytes,dirty:false,written:false,nextId:1,originalSignature:signature(global)};
  return deck.guides;
}

export function slideGuides(deck,index){return deck?.guides?[...deck.guides.global,...(deck.guides.inherited.get(index)||[])]:[];}
export function guideSnapshot(deck){return {type:'guides',global:deck.guides.global.map(g=>({...g})),dirty:deck.guides.dirty};}
export function restoreGuides(deck,snapshot){deck.guides.global=snapshot.global.map(g=>({...g}));deck.guides.dirty=snapshot.dirty;}
function finishEdit(deck,before){deck.guides.dirty=signature(deck.guides.global)!==deck.guides.originalSignature;return [before];}
export function addGuide(deck,axis,pos){
  if(!deck?.guides||!['x','y'].includes(axis)||!validPosition(pos))throw localizedError('guides.1');
  pos=quantize(pos);if(deck.guides.global.some(g=>g.axis===axis&&g.pos===pos))return [];
  const before=guideSnapshot(deck);deck.guides.global.push({id:`new:${deck.guides.nextId++}`,axis,pos,scope:'global',color:'#c36c32',nativeXml:null,nativeId:null,name:''});
  return finishEdit(deck,before);
}
export function changeGuide(deck,id,pos){
  if(!validPosition(pos))throw localizedError('guides.1');
  const guide=deck.guides.global.find(g=>g.id===id);if(!guide)throw localizedError('guides.2');
  pos=quantize(pos);if(guide.pos===pos)return [];
  const before=guideSnapshot(deck);guide.pos=pos;return finishEdit(deck,before);
}
export function removeGuide(deck,id){
  if(!deck.guides.global.some(g=>g.id===id))throw localizedError('guides.3');
  const before=guideSnapshot(deck);deck.guides.global=deck.guides.global.filter(g=>g.id!==id);return finishEdit(deck,before);
}

export function snapToGuides(bounds,dx,dy,guides,tolerance,axis=null){
  const hits=[];let sx=0,sy=0;
  for(const direction of ['x','y']){
    if((axis==='x'&&direction==='y')||(axis==='y'&&direction==='x'))continue;
    const offset=direction==='x'?dx:dy,size=direction==='x'?'w':'h',base=bounds[direction]+offset;
    const anchors=[base,base+bounds[size]/2,base+bounds[size]];
    let best=null;
    for(const guide of guides){if(guide.axis!==direction)continue;for(const anchor of anchors){const delta=guide.pos-anchor;if(Math.abs(delta)<=tolerance&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={guide,delta};}}
    if(best){direction==='x'?sx=best.delta:sy=best.delta;hits.push(best.guide.id);}
  }
  return {dx:dx+sx,dy:dy+sy,hits};
}

function ensure(parent,name,before=null,ns=NS.p){let node=children(parent).find(n=>n.localName===name&&n.namespaceURI===ns);if(!node){node=parent.ownerDocument.createElementNS(ns,(ns===NS.a?'a:':'p:')+name);parent.insertBefore(node,before);}return node;}
function commonSlideView(doc){
  const root=doc.documentElement,next=children(root).find(n=>!['normalViewPr','slideViewPr'].includes(n.localName));
  const slide=ensure(root,'slideViewPr',next||null),common=ensure(slide,'cSldViewPr',slide.firstChild);
  const view=ensure(common,'cViewPr',common.firstChild),scale=ensure(view,'scale',view.firstChild);
  for(const tag of ['sx','sy']){const n=ensure(scale,tag,null,NS.a);if(!n.hasAttribute('n'))n.setAttribute('n','100');if(!n.hasAttribute('d'))n.setAttribute('d','100');}
  const origin=ensure(view,'origin');if(!origin.hasAttribute('x'))origin.setAttribute('x','0');if(!origin.hasAttribute('y'))origin.setAttribute('y','0');
  common.setAttribute('showGuides','1');return common;
}
function rewriteList(list,guides,extended){
  for(const node of children(list))if(node.localName==='guide'&&[NS.p,P15].includes(node.namespaceURI))list.removeChild(node);
  const after=children(list).find(n=>n.localName==='extLst')||null,used=new Set();let nextId=1;
  for(const guide of guides){
    let node;
    if(extended&&guide.nativeXml)node=list.ownerDocument.importNode(parseXml(guide.nativeXml).documentElement,true);
    else node=list.ownerDocument.createElementNS(extended?P15:NS.p,extended?'p15:guide':'p:guide');
    node.setAttribute('orient',guide.axis==='x'?'vert':'horz');node.setAttribute('pos',String(Math.round(guide.pos/GUIDE_UNIT)));
    if(extended){
      let id=guide.nativeId;if(id===null||!/^\d+$/.test(id)||used.has(id)){while(used.has(String(nextId)))nextId++;id=String(nextId++);}used.add(id);node.setAttribute('id',id);
      if(!guide.nativeXml){node.setAttribute('userDrawn','1');const clr=list.ownerDocument.createElementNS(P15,'p15:clr'),rgb=list.ownerDocument.createElementNS(NS.a,'a:srgbClr');rgb.setAttribute('val',guide.color.slice(1));clr.appendChild(rgb);node.appendChild(clr);}
    }
    list.insertBefore(node,after);
  }
}

export function prepareGuideExport(deck){
  const state=deck.guides;if(!state)return;
  if(!state.dirty){
    if(state.written){for(const [path,xml]of state.originals)xml===null?deck.zip.remove(path):deck.zip.file(path,state.originalBytes.get(path));state.written=false;}
    return;
  }
  const original=state.originals.get(state.path),view=original?parseXml(original):parseXml(`<p:viewPr xmlns:p="${NS.p}" xmlns:a="${NS.a}" xmlns:r="${NS.r}"/>`);
  const common=commonSlideView(view),list=ensure(common,'guideLst');rewriteList(list,state.global,false);
  for(const extended of extendedLists(view))rewriteList(extended,state.global,true);
  const presentation=parseXml(state.originals.get('ppt/presentation.xml')),presentationLists=extendedLists(presentation);
  for(const extended of presentationLists)rewriteList(extended,state.global,true);
  const relationships=parseXml(state.originals.get(RELS_PATH)||`<Relationships xmlns="${REL}"/>`),root=relationships.documentElement;
  let rel=children(root).find(n=>n.getAttribute('Type').endsWith('/viewProps')&&n.getAttribute('TargetMode')!=='External');
  if(!rel){const used=new Set(children(root).map(n=>n.getAttribute('Id')));let i=1;while(used.has(`rId${i}`))i++;rel=relationships.createElementNS(REL,'Relationship');rel.setAttribute('Id',`rId${i}`);rel.setAttribute('Type',`${NS.r}/viewProps`);root.appendChild(rel);}
  if(resolvePath('ppt/presentation.xml',rel.getAttribute('Target'))!==state.path)rel.setAttribute('Target','/'+state.path);
  const types=parseXml(state.originals.get(TYPES_PATH)||`<Types xmlns="${CT}"/>`);
  let override=children(types.documentElement).find(n=>n.localName==='Override'&&n.getAttribute('PartName')==='/'+state.path);
  if(!override){override=types.createElementNS(CT,'Override');override.setAttribute('PartName','/'+state.path);types.documentElement.appendChild(override);}override.setAttribute('ContentType',VIEW_TYPE);
  // Preserve bytes of relationship/content-type parts when no registration changed.
  const relationshipChanged=serialize(relationships)!==serialize(parseXml(state.originals.get(RELS_PATH)||`<Relationships xmlns="${REL}"/>`));
  const typeChanged=serialize(types)!==serialize(parseXml(state.originals.get(TYPES_PATH)||`<Types xmlns="${CT}"/>`));
  deck.zip.file(state.path,serialize(view));
  if(presentationLists.length)deck.zip.file('ppt/presentation.xml',serialize(presentation));
  if(relationshipChanged)deck.zip.file(RELS_PATH,serialize(relationships));
  if(typeChanged)deck.zip.file(TYPES_PATH,serialize(types));
  state.written=true;
}
