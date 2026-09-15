import {FontCatalogue} from '../services/FontCatalogue.js';
import {FontResources} from '../services/FontResources.js';
import {XmlPartCodec} from '../services/XmlPartCodec.js';
import {parseXml,descendants,rels,NS} from './core.js';

/** Keep original font choices across the renderer, detached caches and sandboxed frames. */
export class PreviewFonts {
  /** @param {object} options Resource loader and metadata-change callback. */
  constructor({base='/',resources=new FontResources({base}),onChange=()=>{}}={}) {
    Object.assign(this,{resources,onChange});this.records=new Map();this.choices=new Map();this.uploads=new Map();
    this.localFonts=[];this.disposed=false;this.ready=new Map();this.embedded=new Map();this.applied=new Set();this.applying=new Set();
  }
  /** @param {object} deck Loaded PPTX. Index embedded fonts without decoding unused binary parts. */
  async indexEmbedded(deck) {
    const part=deck.zip.file('ppt/presentation.xml');if(!part)return;
    const doc=parseXml(await XmlPartCodec.read(part)),relationships=await rels(deck.zip,'ppt/presentation.xml');
    for(const item of descendants(doc,'embeddedFont')){
      const name=descendants(item,'font')[0]?.getAttribute('typeface');if(!name)continue;
      const variants=new Map();
      for(const [tag,id] of [['regular','400:normal'],['bold','700:normal'],['italic','400:italic'],['boldItalic','700:italic']]){
        const node=descendants(item,tag)[0],rel=relationships.get(node?.getAttributeNS(NS.r,'id'));
        const entry=rel&&!rel.external?deck.zip.file(rel.path):null;
        const namedWeight=FontCatalogue.match(name)?.weight;
        const variant=namedWeight&&['regular','italic'].includes(tag)?`${namedWeight}:${tag==='italic'?'italic':'normal'}`:id;
        if(entry)variants.set(variant,entry);
      }
      this.embedded.set(FontCatalogue.match(name)?.font.id||FontCatalogue.key(name),variants);
    }
  }
  /** @param {string} value CSSOM single-family name. */
  static family(value) {
    const trimmed=String(value).trim();
    if(trimmed.startsWith('"')){try{return JSON.parse(trimmed);}catch{}}
    return trimmed.replace(/^["']|["']$/g,'');
  }
  /** @param {HTMLElement} node Rendered text, possibly detached. @param {string} property Inherited CSS property. */
  static style(node,property) {
    for(let current=node;current;current=current.parentElement)if(current.style?.[property])return current.style[property];
    return node.isConnected?node.ownerDocument.defaultView.getComputedStyle(node)[property]:'';
  }
  /** @param {string} family Original family/face. @param {string} value CSS weight; retain an explicit bold request. */
  static weight(family,value) {
    const weight=(value==='bold'?700:Number(value))||400,named=FontCatalogue.match(family)?.weight;
    return named?Math.max(named,weight>=600?weight:0):weight;
  }
  /** @param {HTMLElement} root Rendered slide. @param {number} slide Slide index. */
  async prepare(root,slide) {
    const requests=new Set();
    for(const record of this.records.values()){
      record.slides.delete(slide);for(const variant of record.variants.values())variant.slides.delete(slide);
    }
    for(const node of root.querySelectorAll('[style]')){
      if(!node.style.fontFamily||!node.textContent.trim())continue;
      const family=node.dataset.originalPreviewFont||PreviewFonts.family(node.style.fontFamily);
      if(!family||family.length>200||family.startsWith('SlideSyncFont'))continue;
      const key=FontCatalogue.key(family);
      if(!this.records.has(key)&&this.records.size>=128)continue;
      if(!this.records.has(key))this.records.set(key,{key,family,variants:new Map(),slides:new Set(),originalUnavailable:!!this.choices.get(key)});
      const record=this.records.get(key),fontWeight=PreviewFonts.style(node,'fontWeight');
      const weight=PreviewFonts.weight(family,fontWeight);
      const italic=PreviewFonts.style(node,'fontStyle')==='italic'?'italic':'normal',variant=`${weight}:${italic}`;
      record.slides.add(slide);
      if(!record.variants.has(variant))record.variants.set(variant,{weight,style:italic,result:null,status:'pending',slides:new Set()});
      record.variants.get(variant).slides.add(slide);
      node.dataset.originalPreviewFont=family;node.dataset.previewFontKey=key;node.dataset.previewFontVariant=variant;
      if(FontCatalogue.match(family)?.weight)node.style.fontWeight=String(weight);
      requests.add(record);
    }
    for(const [key,record] of this.records){
      for(const [id,variant] of record.variants)if(!variant.slides.size)record.variants.delete(id);
      if(!record.slides.size)this.records.delete(key);
    }
    for(const record of requests)await this.resolve(record);
    if(this.disposed)return;
    this.apply(root);this.publish();
  }
  /** @param {object} record Original family and styles in the presentation. */
  async resolve(record) {
    const choice=this.choices.get(record.key)||'';
    for(const [id,variant] of record.variants){
      const cacheKey=`${record.key}:${id}:${choice}:${this.uploads.has(record.key)}:${this.localFonts.length}`;
      if(!this.ready.has(cacheKey))this.ready.set(cacheKey,this.resolveVariant(record,variant,choice));
      const resolved=await this.ready.get(cacheKey);
      if(this.disposed)return;
      Object.assign(variant,{detail:'',...resolved});
    }
    if(!choice)record.originalUnavailable=[...record.variants.values()].some(item=>['unavailable','failed'].includes(item.status)||
      (item.result&&(item.result.style!==item.style||(typeof item.result.weight==='number'&&item.result.weight!==item.weight))));
  }
  /** @param {object} record Original font. @param {object} variant Weight/style. @param {string} choice Explicit replacement ID. */
  async resolveVariant(record,variant,choice) {
    const {weight,style}=variant;
    if(choice==='upload')return {result:this.uploads.get(record.key),status:'uploaded'};
    if(!choice){
      const entry=this.embedded.get(FontCatalogue.match(record.family)?.font.id||record.key)?.get(`${weight}:${style}`);
      if(entry){
        try{
          if(entry._data?.uncompressedSize>32*1024*1024)throw Error('Font too large');
          const result=await this.resources.once(`embedded:${entry.name}:${weight}:${style}`,async()=>this.resources.binary(await entry.async('arraybuffer'),{weight,style,mode:'embedded',label:record.family}));
          return {result,status:'embedded'};
        }catch{record.embeddedUnsupported=true;}
      }
      try{return {result:await this.resources.local(record.family,weight,style),status:'local'};}catch{}
      const names=FontCatalogue.names(record.family).map(FontCatalogue.key);
      const local=this.localFonts.find(font=>names.some(name=>[font.family,font.fullName,font.postscriptName].some(value=>FontCatalogue.key(value)===name))&&FontCatalogue.styleWeight(font.style)===weight&&(/italic|oblique/i.test(font.style)?'italic':'normal')===style);
      if(local){try{return {result:await this.resources.once(`system:${local.postscriptName}`,async()=>this.resources.binary(await(await local.blob()).arrayBuffer(),{weight,style,mode:'local',label:local.fullName})),status:'local'};}catch{}}
    }
    const font=choice?FontCatalogue.get(choice):FontCatalogue.match(record.family)?.font;
    if(font){
      try{return {result:await this.resources.web(font,weight),status:choice&&font.id!==FontCatalogue.match(record.family)?.font.id?'replacement':'web'};}
      catch(error){return {result:null,status:'failed',detail:String(error?.message||error).slice(0,300)};}
    }
    // No guessed substitute: the original CSS family stays in place and the browser handles fallback.
    return {result:null,status:'unavailable'};
  }
  /** @param {Element|Document} root Cache, renderer or mounted frame. */
  apply(root) {
    for(const node of root.querySelectorAll('[data-preview-font-key]')){
      const record=this.records.get(node.dataset.previewFontKey),fontWeight=PreviewFonts.style(node,'fontWeight');
      const weight=PreviewFonts.weight(node.dataset.originalPreviewFont,fontWeight);
      const key=`${weight}:${PreviewFonts.style(node,'fontStyle')==='italic'?'italic':'normal'}`;
      if(record?.variants.has(key))node.dataset.previewFontVariant=key;
      const variant=record?.variants.get(node.dataset.previewFontVariant);
      node.style.fontFamily=variant?.result?`"${variant.result.family}", ${JSON.stringify(node.dataset.originalPreviewFont)}`:JSON.stringify(node.dataset.originalPreviewFont);
    }
  }
  /** @param {Element|Document} root Include only faces used in this slide/frame. */
  css(root) {
    const used=new Set();
    for(const node of root.querySelectorAll('[data-preview-font-key]')){
      const result=this.records.get(node.dataset.previewFontKey)?.variants.get(node.dataset.previewFontVariant)?.result;
      if(result)used.add(result.css);
    }
    return [...used].join('\n');
  }
  /** @param {Document} doc Script-disabled preview document. Wait for its own FontFaceSet. */
  async updateDocument(doc) {
    if(!doc?.body||this.disposed)return;
    let style=doc.querySelector('#preview-font-faces');
    if(!style){style=doc.createElement('style');style.id='preview-font-faces';doc.head.append(style);}
    this.apply(doc);style.textContent=this.css(doc);
    // Reading layout starts the font loads before waiting for FontFaceSet.ready.
    void doc.body.offsetHeight;
    if(doc.fonts)await this.resources.bounded(doc.fonts.ready);
  }
  /** @param {string} key Original family key. @param {string} choice Empty for original-first or explicit catalogue ID. */
  async choose(key,choice) {
    const record=this.records.get(key);if(!record)return;
    if(choice&&choice!=='upload'&&!FontCatalogue.get(choice))throw Error('Unknown font');
    for(const cached of this.ready.keys())if(cached.startsWith(`${key}:`))this.ready.delete(cached);
    this.choices.set(key,choice);this.applied.delete(key);this.applying.add(key);this.publish();
    try{await this.resolve(record);}finally{this.applying.delete(key);this.publish();}
  }
  /** Mark explicit choices complete only after caches and mounted frames have been updated. */
  markApplied() {
    for(const record of this.records.values())if(this.choices.get(record.key)&&record.variants.size&&[...record.variants.values()].every(item=>item.result))this.applied.add(record.key);
    this.publish();
  }
  /** @param {string} key Original font to assign. @param {File} file User-selected font, kept in memory only. */
  async upload(key,file) {
    if(!this.records.has(key))return;
    if(!file||file.size>32*1024*1024)throw Error('Font file too large');
    const result=await this.resources.binary(await file.arrayBuffer(),{mode:'uploaded',label:file.name});
    this.uploads.set(key,result);this.ready.clear();await this.choose(key,'upload');
  }
  /** Explicit user action: obtain OS font access, then retry only exact original-family matches. */
  async accessLocal() {
    this.localFonts=await globalThis.queryLocalFonts();this.ready.clear();
    for(const record of this.records.values())await this.resolve(record);
    this.publish();
  }
  /** Publish serializable metadata without font bytes, XML or DOM references. */
  publish() {
    if(this.disposed)return;
    this.onChange([...this.records.values()].map(record=>({key:record.key,family:record.family,choice:this.choices.get(record.key)||'',slides:record.slides.size,embeddedUnsupported:!!record.embeddedUnsupported,originalUnavailable:!!record.originalUnavailable,applying:this.applying.has(record.key),applied:this.applied.has(record.key)&&[...record.variants.values()].every(item=>item.result),
      variants:[...record.variants.values()].map(item=>({weight:item.weight,style:item.style,status:item.status,available:!!item.result,detail:item.detail||'',label:item.result?.label||record.family,previewFamily:item.result?.family||record.family,
        synthetic:!!item.result&&(item.result.style!==item.style||(typeof item.result.weight==='number'&&item.result.weight!==item.weight))}))})));
  }
  /** Release the current document's faces and any pending resource operations. */
  dispose() {this.disposed=true;this.resources.dispose();this.records.clear();this.ready.clear();this.choices.clear();this.uploads.clear();this.embedded.clear();this.applied.clear();this.applying.clear();this.localFonts=[];}
}
