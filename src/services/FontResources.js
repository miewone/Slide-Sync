import {FontCatalogue} from './FontCatalogue.js';

let nextOwner=0;
const quote=value=>JSON.stringify(String(value)).replace(/</g,'\\3c ');

/** Own loaded FontFace objects and blob URLs for one editor document. */
export class FontResources {
  /** @param {object} options Deployment base and injectable browser dependencies. */
  constructor({base='/',document=globalThis.document,FontFace=globalThis.FontFace,fetch=globalThis.fetch,URL=globalThis.URL,timeout=10000}={}) {
    Object.assign(this,{base,document,FontFace,fetch,URL,timeout});
    // Native Window.fetch rejects a FontResources instance as its receiver.
    this.fetch=fetch.bind(globalThis);
    this.owner=++nextOwner;this.next=0;this.pending=new Map();this.loaded=[];this.disposed=false;
    this.abort=new AbortController();this.bytes=0;
  }
  /** @param {Promise} promise Bounded font operation. @param {Function} cancel Optional transport cancellation. */
  async bounded(promise,cancel=()=>{}) {
    let timer;
    try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>{cancel();reject(Error('Font loading timed out'));},this.timeout);})]);}
    finally{clearTimeout(timer);}
  }
  /** @param {string} key Shared request identity. @param {Function} action Font loading operation. */
  once(key,action) {
    if(!this.pending.has(key))this.pending.set(key,action().catch(error=>{this.pending.delete(key);throw error;}));
    return this.pending.get(key);
  }
  /** @param {string|ArrayBuffer} source Local face expression or file bytes. @param {object} options Face metadata. */
  async install(source,{weight=400,style='normal',mode='local',label='',mime='font/otf'}={}) {
    if(this.disposed)throw Error('Font resources disposed');
    const family=`SlideSyncFont${this.owner}_${++this.next}`;
    const face=new this.FontFace(family,source,{weight:String(weight),style,display:'swap'});
    await this.bounded(face.load());
    if(this.disposed)throw Error('Font resources disposed');
    let url=null,cssSource=source;
    if(typeof source!=='string'){
      url=this.URL.createObjectURL(new Blob([source],{type:mime}));cssSource=`url(${quote(url)})`;
    }
    this.document.fonts.add(face);
    const result={family,face,url,weight,style,mode,label,
      css:`@font-face{font-family:${quote(family)};src:${cssSource};font-weight:${weight};font-style:${style};font-display:swap;}`};
    this.loaded.push(result);return result;
  }
  /** @param {string} name Original family. @param {number} weight Requested weight. @param {string} style Requested style. */
  async local(name,weight,style) {
    const names=FontCatalogue.names(name),suffix=({100:'Thin',200:'ExtraLight',300:'Light',400:'',500:'Medium',600:'SemiBold',700:'Bold',800:'ExtraBold',900:'Black'})[weight]??`Weight${weight}`;
    const variants=[];
    for(const candidate of names){
      const namedWeight=FontCatalogue.match(candidate)?.weight;
      if(!suffix||namedWeight===weight)variants.push(candidate);
      if(!suffix)variants.push(`${candidate} Regular`,`${candidate}-Regular`,`${candidate}Regular`);
      if(suffix)variants.push(`${candidate} ${suffix}`,`${candidate}-${suffix}`,`${candidate}${suffix}`);
    }
    const candidates=style==='italic'?variants.flatMap(name=>[`${name} Italic`,`${name}-Italic`,`${name} Oblique`]):variants;
    const source=[...new Set(candidates)].map(name=>`local(${quote(name)})`).join(',');
    return this.once(`local:${source}:${weight}:${style}`,()=>this.install(source,{weight,style,mode:'local',label:name}));
  }
  /** @param {object} font Catalogue family. @param {number} weight Requested weight. */
  async web(font,weight) {
    const asset=FontCatalogue.face(font,weight);
    return this.once(`web:${asset.file}`,async()=>{
      const request=new AbortController(),cancel=()=>request.abort();
      if(this.disposed)throw Error('Font resources disposed');
      this.abort.signal.addEventListener('abort',cancel,{once:true});
      try{
        const bytes=await this.bounded((async()=>{
          const response=await this.fetch(`${this.base}fonts/${asset.file}`,{signal:request.signal});
          if(!response.ok)throw Error(`Font HTTP ${response.status}`);
          if(Number(response.headers.get('content-length'))>32*1024*1024)throw Error('Font file too large');
          return response.arrayBuffer();
        })(),cancel);
        return await this.binary(bytes,{weight:asset.weight,mode:'web',label:font.name});
      }catch(error){cancel();throw error;}
      finally{this.abort.signal.removeEventListener('abort',cancel);}
    });
  }
  /** @param {ArrayBuffer} bytes Font file. @param {object} options Face metadata. */
  async binary(bytes,options) {
    if(bytes.byteLength>32*1024*1024||this.bytes+bytes.byteLength>128*1024*1024)throw Error('Font memory limit exceeded');
    const signature=new Uint8Array(bytes,0,Math.min(4,bytes.byteLength));
    const tag=String.fromCharCode(...signature);
    if(!['OTTO','wOFF','wOF2','true'].includes(tag)&&!(signature[0]===0&&signature[1]===1&&signature[2]===0&&signature[3]===0))throw Error('Unsupported font file');
    this.bytes+=bytes.byteLength;
    try{return await this.install(bytes,options);}
    catch(error){this.bytes-=bytes.byteLength;throw error;}
  }
  /** Release only this runtime's loaded fonts and URLs, including during pending loads. */
  dispose() {
    if(this.disposed)return;
    this.disposed=true;this.abort.abort();
    for(const item of this.loaded){this.document.fonts.delete(item.face);if(item.url)this.URL.revokeObjectURL(item.url);}
    this.loaded=[];this.pending.clear();
  }
}
