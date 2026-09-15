import {TextWidthMeasurement} from '../TextWidthMeasurement.js';
import {NativeSlidesAppearance} from './NativeSlidesAppearance.js';
import {NativeTextContent} from './NativeTextContent.js';

const points=value=>NativeSlidesAppearance.points(value);

/** Native text styling and browser measurement shared by the draft preview and text fitting. */
export class NativeSlidesText {
  /** @param {NativeSlidesDocument} model Current presentation and placeholder hierarchy. */
  constructor(model,overrides=new Map(),page=0){
    this.appearance=new NativeSlidesAppearance(model,page);this.contexts=new Map([[page,this.appearance]]);this.pageFor=new Map();this.model=model;this.overrides=overrides;this.objects=new Map();this.inheritedCache=new WeakMap();
    const collect=elements=>{for(const e of elements||[]){this.objects.set(e.objectId,e);collect(e.elementGroup?.children);}};
    for(const page of [...model.original.masters||[],...model.original.layouts||[],...model.original.slides])collect(page.pageElements);
    const index=(elements,page)=>{for(const e of elements||[]){this.pageFor.set(e.objectId,page);index(e.elementGroup?.children,page);}};
    model.original.slides.forEach((slide,page)=>index(slide.pageElements,page));
  }
  /** @param {object} element Native element. Resolve its owning slide theme for cross-slide measurement. */
  appearanceFor(element){const page=this.pageFor.get(element.objectId);if(page===undefined)return this.appearance;if(!this.contexts.has(page))this.contexts.set(page,new NativeSlidesAppearance(this.model,page));return this.contexts.get(page);}
  /** @param {object} element Native shape. @param {number} level Nesting level. Return inherited paragraph defaults. */
  paragraphStyle(element,level){
    const chain=[],seen=new Set();let parent=this.objects.get(element.shape?.placeholder?.parentObjectId);
    while(parent&&!seen.has(parent.objectId)){seen.add(parent.objectId);chain.unshift(parent);parent=this.objects.get(parent.shape?.placeholder?.parentObjectId);}
    return Object.assign({},...chain.map(e=>e.shape?.text?.textElements?.find(t=>t.paragraphMarker&&(t.paragraphMarker.style?.nestingLevel||0)===level)?.paragraphMarker.style));
  }
  /** @param {object} element Native shape. @param {number} level Paragraph nesting level. Return inherited placeholder run defaults. */
  inherited(element,level=0,includeOwn=true){
    const key=`${level}:${includeOwn}`,cached=this.inheritedCache.get(element);if(cached?.has(key))return cached.get(key);
    const seen=new Set();let current=element;const chain=[];
    while(current&&!seen.has(current.objectId)){seen.add(current.objectId);chain.unshift(current);current=this.objects.get(current.shape?.placeholder?.parentObjectId);}
    const style={fontFamily:'Arial',fontSize:{magnitude:18,unit:'PT'}};
    for(const shape of includeOwn?chain:chain.slice(0,-1)){
      let active=0;
      for(const part of shape.shape?.text?.textElements||[]){
        if(part.paragraphMarker)active=part.paragraphMarker.style?.nestingLevel||0;
        if(active===level&&part.textRun){Object.assign(style,part.textRun.style);break;}
      }
    }
    const levels=cached||new Map();levels.set(key,style);this.inheritedCache.set(element,levels);return style;
  }
  /** @param {HTMLElement} host Empty measurement/preview host. @param {object} element Native shape. @param {number} width Content width in slide points. */
  render(host,element,width){
    host.replaceChildren();const autofit=this.appearanceFor(element).property(element,'autofit')||{};
    Object.assign(host.style,{width:`${Math.max(1,width)}px`,boxSizing:'border-box',padding:'3.6px 7.2px',overflowWrap:'break-word',whiteSpace:'pre-wrap',fontFamily:'Arial',fontSize:'18px',lineHeight:'1.2',color:'#222'});
    let paragraph=null,level=0;const paragraphs=[];
    const create=(style,bullet)=>{
      style={...this.paragraphStyle(element,level),...style};
      paragraph=host.ownerDocument.createElement('div');
      Object.assign(paragraph.style,{minHeight:'1em',margin:'0',fontSize:`${points(this.inherited(element,level,false).fontSize)||18}px`,textAlign:({START:'start',CENTER:'center',END:'end',JUSTIFIED:'justify'})[style?.alignment]||'start',
        direction:style?.direction==='RIGHT_TO_LEFT'?'rtl':'ltr',lineHeight:style?.lineSpacing?String(Math.max(.1,(style.lineSpacing-(autofit.lineSpacingReduction||0))/100)):'1.2',paddingLeft:`${points(style?.indentStart)||0}px`,paddingRight:`${points(style?.indentEnd)||0}px`,textIndent:`${(points(style?.indentFirstLine)??points(style?.indentStart)??0)-(points(style?.indentStart)||0)}px`,
        marginTop:`${points(style?.spaceAbove)||0}px`,marginBottom:`${points(style?.spaceBelow)||0}px`});
      host.append(paragraph);paragraphs.push(paragraph);
      if(bullet){const mark=host.ownerDocument.createElement('span');mark.textContent=bullet.glyph||'•';mark.style.marginRight='0.4em';paragraph.append(mark);}
    };
    for(const part of element.shape?.text?.textElements||[]){
      if(part.paragraphMarker){level=part.paragraphMarker.style?.nestingLevel||0;create(part.paragraphMarker.style,part.paragraphMarker.bullet);}
      if(!part.textRun&&!part.autoText)continue;
      if(!paragraph)create();
      const run=part.textRun||part.autoText,style={...this.inherited(element,level,false),...run.style},span=host.ownerDocument.createElement('span');
      // Use textContent: presentation text and links must never become executable HTML.
      span.textContent=NativeTextContent.normalize(run.content);
      span.dataset.paragraphTerminator=String(NativeTextContent.endsParagraph(run.content));
      const color=style.foregroundColor?this.appearanceFor(element).color(style.foregroundColor.opaqueColor,'transparent'):null,highlight=style.backgroundColor?this.appearanceFor(element).color(style.backgroundColor.opaqueColor,'transparent'):null;
      const family=run.style?.weightedFontFamily?.fontFamily||run.style?.fontFamily||style.weightedFontFamily?.fontFamily||style.fontFamily||'Arial';
      Object.assign(span.style,{fontFamily:`${JSON.stringify(this.overrides.get(family)||family)}, Arial, sans-serif`,fontSize:`${(points(style.fontSize)||18)*(autofit.fontScale||1)}px`,fontWeight:style.bold?'700':String(style.weightedFontFamily?.weight||400),fontStyle:style.italic?'italic':'normal',textDecoration:[style.underline?'underline':'',style.strikethrough?'line-through':''].filter(Boolean).join(' '),
        ...(color?{color}:{}),...(highlight?{backgroundColor:highlight}:{}),verticalAlign:style.baselineOffset==='SUPERSCRIPT'?'super':style.baselineOffset==='SUBSCRIPT'?'sub':'baseline'});
      if(!paragraph.dataset.hasTextRun){paragraph.style.fontSize=span.style.fontSize;paragraph.dataset.hasTextRun='true';}
      paragraph.append(span);
    }
    for(const p of paragraphs){const last=p.lastElementChild;if(last?.dataset.paragraphTerminator==='true'&&last.textContent.endsWith('\n'))last.textContent=last.textContent.slice(0,-1);}
  }
  /** @param {object} element Text shape. Filter white/transparent fills without altering any fill. */
  plainBackground(element){
    const seen=new Set();let current=element;
    while(current&&!seen.has(current.objectId)){
      seen.add(current.objectId);const fill=current.shape?.shapeProperties?.shapeBackgroundFill;
      if(fill?.propertyState==='NOT_RENDERED'||fill?.solidFill?.alpha===0)return true;
      if(fill&&fill.propertyState!=='INHERIT')return this.appearanceFor(element).fill(fill).color==='rgb(255,255,255)';
      current=this.objects.get(current.shape?.placeholder?.parentObjectId);
    }
    return element.shape?.shapeType==='TEXT_BOX';
  }
  /** @param {object[]} elements Top-level text shapes. @param {'width'|'height'} axis Fit dimension. @param {object} options unwrap and background. Return one atomic resize plan, after loading used fonts. */
  async measure(elements,axis,{unwrap=false,background=false}={}){
    const host=document.createElement('div');Object.assign(host.style,{position:'fixed',left:'-100000px',top:'0',visibility:'hidden',pointerEvents:'none',contain:'layout style'});document.body.append(host);
    try{
      const entries=elements.filter(e=>e.native.shape?.text&&e.box&&(!background||this.plainBackground(e.native))).map(e=>{
        const native=e.native,t=native.transform||{scaleX:1,scaleY:1},w=points(native.size.width)*Math.hypot(t.scaleX??0,t.shearY||0),h=points(native.size.height)*Math.hypot(t.scaleY??0,t.shearX||0),node=document.createElement('div');
        this.render(node,native,w);host.append(node);return {e,node,w,h};
      });
      const fonts=new Set(entries.flatMap(({node})=>[...node.querySelectorAll('span')].map(span=>`${span.style.fontWeight} ${span.style.fontSize} ${span.style.fontFamily}`)));
      await Promise.all([...fonts].map(font=>document.fonts.load(font).catch(()=>[])));
      return entries.map(({e,node,w,h})=>({id:e.id,width:axis==='width'?Math.max(1,TextWidthMeasurement.measure(node,unwrap)+1):w,height:axis==='height'?Math.max(1,node.getBoundingClientRect().height+1):h,background}));
    }finally{host.remove();}
  }
}
