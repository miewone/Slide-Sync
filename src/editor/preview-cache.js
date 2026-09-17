import {textBoxInfo,captureTextStyles,scaleTextPreview} from './text-fit.js';
import {TextFormat} from './TextFormat.js';
import {serialize,child,descendants} from './core.js';
import {PreviewTable} from './PreviewTable.js';
const moverIndexes=new WeakMap(),elementIndexes=new WeakMap();

/** Index descriptors for one immutable descriptor-array generation. */
function elementsById(elements) {
  if(!elementIndexes.has(elements))elementIndexes.set(elements,new Map(elements.map(element=>[element.id,element])));
  return elementIndexes.get(elements);
}

/** Rebuild on full synchronization or replacement of the preview layer/document. */
function moversById(root,rebuild=false) {
  const layer=root.matches?.('.slide-wrapper')?root:root.querySelector('.slide-wrapper');
  let cached=moverIndexes.get(root);
  if(rebuild||!cached||cached.layer!==layer){
    cached={layer,movers:new Map([...root.querySelectorAll('[data-pptx-mover]')].map(mover=>[mover.dataset.pptxMover,mover]))};
    moverIndexes.set(root,cached);
  }
  return cached.movers;
}
/** @param {object} element Shape descriptor. Include text-bearing shapes when updating resized backgrounds. */
function previewTextInfo(element){
  const box=textBoxInfo(element);if(box)return box;
  if(element?.kind!=='sp')return null;
  const body=child(element.node,'txBody');if(!body||!descendants(body,'t').some(n=>n.textContent.trim()))return null;
  const props=child(body,'bodyPr'),normal=child(props,'normAutofit');
  return {body,props,fontScale:Number(normal?.getAttribute('fontScale')||100000)/100000,lineScale:1-Number(normal?.getAttribute('lnSpcReduction')||0)/100000};
}
// Preview geometry is captured once. Subsequent edits translate existing
// wrappers in both the detached cache and the script-disabled preview frame.
export function sourceId(node) {
  for (const value of Object.values(node.source || {})) {
    const id = value?.['p:cNvPr']?.attrs?.id;
    if (id !== undefined) return String(id);
  }
  return null;
}

export function tagRenderer(renderer) {
  const renderNode = renderer._renderNode;
  renderer._renderNode = function (node) {
    const element = renderNode.call(this, node);
    PreviewTable.apply(node, element);
    const id = sourceId(node);
    if (element && id !== null) element.dataset.pptxElement = id;
    return element;
  };
}

export function cachePreview(root, slide, unitsPerPixel = 12700) {
  moverIndexes.delete(root);
  const layer = root.matches?.('.slide-wrapper') ? root : root.querySelector('.slide-wrapper');
  if (!layer) return root;
  const elements = new Map(slide.elements.map(e => [e.id, e]));
  for (const child of Array.from(layer.children)) {
    const element = elements.get(child.dataset.pptxElement);
    if (!element?.g) continue;
    const mover = root.ownerDocument.createElement('div');
    mover.dataset.pptxMover = element.id;
    mover.dataset.originX = String(element.g.x);
    mover.dataset.originY = String(element.g.y);
    mover.dataset.originW = String(element.g.w);
    mover.dataset.originH = String(element.g.h);
    mover.dataset.unitsPerPixel = String(unitsPerPixel);
    mover.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
    // Keep the original drawing order even when only some wrappers have a transform.
    mover.style.zIndex = String(element.index);
    layer.insertBefore(mover, child);
    mover.append(child);
    const info=previewTextInfo(element),text=child.querySelector('.text-wrapper');
    mover.dataset.textBox=info?'true':'false';
    if(info&&text){
      mover.dataset.originalFontScale=String(info.fontScale);
      mover.dataset.originalLineScale=String(info.lineScale);
      mover.dataset.originalTextTop=text.style.top;
      mover.dataset.originalTextWidth=text.style.width;
      mover.dataset.originalTextPadding=text.style.padding;
      mover.dataset.originalTextWhiteSpace=text.style.whiteSpace;
      mover.dataset.originalBodyPr=info.props?serialize(info.props):'';
      captureTextStyles(text);
      TextFormat.capture(mover,info.body,text);
      // Resizing the background must not scale the text itself.
      const svg=Array.from(child.children).find(n=>n.tagName.toLowerCase()==='svg');
      if(svg){svg.setAttribute('viewBox',`0 0 ${element.g.w/unitsPerPixel} ${element.g.h/unitsPerPixel}`);svg.setAttribute('preserveAspectRatio','none');for(const n of svg.querySelectorAll('*'))n.setAttribute('vector-effect','non-scaling-stroke');}
    }
  }
  return root;
}

/**
 * Synchronize a cached or mounted preview with current geometry.
 * @param {Element|Document|null} root Preview root; replaced layers rebuild its index.
 * @param {object} slide Current slide descriptor.
 * @param {object} options positionOnly skips text work; ids optionally limits movers.
 */
export function syncPreviewPositions(root, slide, options={}) {
  if (!root) return 0;
  const elements = elementsById(slide.elements);
  const movers=moversById(root,!options.positionOnly);
  const targets=options.ids===undefined?movers.values():Array.from(new Set(options.ids),id=>movers.get(id)).filter(Boolean);
  let changed = 0;
  for (const mover of targets) {
    const element=elements.get(mover.dataset.pptxMover),g = element?.g;
    if (!g) continue;
    const units = Number(mover.dataset.unitsPerPixel);
    const dx = (g.x - Number(mover.dataset.originX)) / units;
    const dy = (g.y - Number(mover.dataset.originY)) / units;
    const info=options.positionOnly?null:previewTextInfo(element),shape=mover.firstElementChild;
    let transform = dx || dy ? `translate(${dx}px, ${dy}px)` : '';
    if(!options.positionOnly)mover.dataset.textBox=info?'true':'false';
    if(!info&&mover.dataset.textBox!=='true'&&[g.w,g.h,Number(mover.dataset.originW),Number(mover.dataset.originH)].every(Number.isFinite)){
      const ow=Number(mover.dataset.originW),oh=Number(mover.dataset.originH),sx=ow?g.w/ow:1,sy=oh?g.h/oh:1;
      // Scale along the object's local axes, about its original center, including groups and images.
      const cx=(Number(mover.dataset.originX)+ow/2)/units,cy=(Number(mover.dataset.originY)+oh/2)/units;
      mover.style.transformOrigin=`${cx}px ${cy}px`;
      if(sx!==1||sy!==1)transform=`translate(${dx+(g.w-ow)/(2*units)}px, ${dy+(g.h-oh)/(2*units)}px) rotate(${g.rot}deg) scale(${sx}, ${sy}) rotate(${-g.rot}deg)`;
    }
    if (mover.style.transform !== transform) {
      mover.style.transform = transform;
      changed++;
    }
    if(options.positionOnly)continue;
    if(info&&shape){
      shape.style.width=`${g.w/units}px`;
      shape.style.height=`${g.h/units}px`;
      const text=shape.querySelector('.text-wrapper');
      if(text){
        text.style.width=g.w===Number(mover.dataset.originW)?mover.dataset.originalTextWidth||'':`${g.w/units}px`;
        TextFormat.sync(mover,info.body,text);
        scaleTextPreview(text,info.fontScale/Number(mover.dataset.originalFontScale||1),info.lineScale/Number(mover.dataset.originalLineScale||1));
        if(text.style.transform.includes('translateY(-50%)'))text.style.top=g.h===Number(mover.dataset.originH)?mover.dataset.originalTextTop:`${parseFloat(mover.dataset.originalTextTop||'0')+(g.h-Number(mover.dataset.originH))/(2*units)}px`;
        const fitted=g.w!==Number(mover.dataset.originW)||g.h!==Number(mover.dataset.originH)||(info.props?serialize(info.props):'')!==mover.dataset.originalBodyPr;
        if(fitted&&['square','none'].includes(info.props?.getAttribute('wrap'))){
          const inset=(key,def)=>Number(info.props?.getAttribute(key)||def)/units;
          text.style.padding=`${inset('tIns',45720)}px ${inset('rIns',91440)}px ${inset('bIns',45720)}px ${inset('lIns',91440)}px`;
          text.style.whiteSpace=info.props?.getAttribute('wrap')==='none'?'pre':'normal';
        }else{text.style.padding=mover.dataset.originalTextPadding||'';text.style.whiteSpace=mover.dataset.originalTextWhiteSpace||'';}
      }
    }
  }
  return changed;
}

/**
 * Hide deleted objects in retained preview wrappers and reveal them after undo.
 * @param {Element|Document|null} root Cached preview or mounted frame document.
 * @param {object} slide Current slide descriptors; original wrappers retain drawing order and text styling.
 */
export function syncPreviewPresence(root,slide) {
  if(!root)return;
  const ids=new Set(slide.elements.map(element=>element.id));
  for(const mover of root.querySelectorAll('[data-pptx-mover]')) {
    if(!ids.has(mover.dataset.pptxMover)) {
      mover.dataset.deleted='true';mover.hidden=true;
    } else if(mover.dataset.deleted==='true') {
      delete mover.dataset.deleted;mover.hidden=false;
    }
  }
}
