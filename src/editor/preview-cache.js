import {textBoxInfo,captureTextStyles,scaleTextPreview} from './text-fit.js';
import {serialize} from './core.js';
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
    const id = sourceId(node);
    if (element && id !== null) element.dataset.pptxElement = id;
    return element;
  };
}

export function cachePreview(root, slide, unitsPerPixel = 12700) {
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
    const info=textBoxInfo(element),text=child.querySelector('.text-wrapper');
    if(info&&text){
      mover.dataset.originalFontScale=String(info.fontScale);
      mover.dataset.originalLineScale=String(info.lineScale);
      mover.dataset.originalTextTop=text.style.top;
      mover.dataset.originalTextPadding=text.style.padding;
      mover.dataset.originalTextWhiteSpace=text.style.whiteSpace;
      mover.dataset.originalBodyPr=info.props?serialize(info.props):'';
      captureTextStyles(text);
      // Resizing the background must not scale the text itself.
      const svg=Array.from(child.children).find(n=>n.tagName.toLowerCase()==='svg');
      if(svg){svg.setAttribute('viewBox',`0 0 ${element.g.w/unitsPerPixel} ${element.g.h/unitsPerPixel}`);svg.setAttribute('preserveAspectRatio','none');for(const n of svg.querySelectorAll('*'))n.setAttribute('vector-effect','non-scaling-stroke');}
    }
  }
  return root;
}

export function syncPreviewPositions(root, slide) {
  if (!root) return 0;
  const elements = new Map(slide.elements.map(e => [e.id, e]));
  let changed = 0;
  for (const mover of root.querySelectorAll('[data-pptx-mover]')) {
    const element=elements.get(mover.dataset.pptxMover),g = element?.g;
    if (!g) continue;
    const units = Number(mover.dataset.unitsPerPixel);
    const dx = (g.x - Number(mover.dataset.originX)) / units;
    const dy = (g.y - Number(mover.dataset.originY)) / units;
    const transform = dx || dy ? `translate(${dx}px, ${dy}px)` : '';
    if (mover.style.transform !== transform) {
      mover.style.transform = transform;
      changed++;
    }
    const info=textBoxInfo(element),shape=mover.firstElementChild;
    if(info&&shape){
      shape.style.height=`${g.h/units}px`;
      const text=shape.querySelector('.text-wrapper');
      if(text){
        scaleTextPreview(text,info.fontScale/Number(mover.dataset.originalFontScale||1),info.lineScale/Number(mover.dataset.originalLineScale||1));
        if(text.style.transform.includes('translateY(-50%)'))text.style.top=g.h===Number(mover.dataset.originH)?mover.dataset.originalTextTop:`${parseFloat(mover.dataset.originalTextTop||'0')+(g.h-Number(mover.dataset.originH))/(2*units)}px`;
        const fitted=g.h!==Number(mover.dataset.originH)||(info.props?serialize(info.props):'')!==mover.dataset.originalBodyPr;
        if(fitted&&info.props?.getAttribute('wrap')==='square'){
          const inset=(key,def)=>Number(info.props?.getAttribute(key)||def)/units;
          text.style.padding=`${inset('tIns',45720)}px ${inset('rIns',91440)}px ${inset('bIns',45720)}px ${inset('lIns',91440)}px`;
          text.style.whiteSpace='normal';
        }else{text.style.padding=mover.dataset.originalTextPadding||'';text.style.whiteSpace=mover.dataset.originalTextWhiteSpace||'';}
      }
    }
  }
  return changed;
}
