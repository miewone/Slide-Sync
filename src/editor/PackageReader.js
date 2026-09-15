import {XmlPartCodec} from '../services/XmlPartCodec.js';

/** Caches immutable package reads for one deck-loading operation. */
export class PackageReader {
  /** @param {object} zip Loaded ZIP. @param {object} parsers XML parser and relationship path resolver. */
  constructor(zip, {parseXml, resolvePath}) {
    this.zip=zip;this.parseXml=parseXml;this.resolvePath=resolvePath;
    this.bytes=new Map();this.texts=new Map();this.documents=new Map();this.relationships=new Map();
  }
  /** @param {string} path Package part path. Retain original bytes for lossless export. */
  async readBytes(path) {
    if(!path)return null;
    if(!this.bytes.has(path))this.bytes.set(path,this.zip.file(path)?.async('uint8array')??Promise.resolve(null));
    return this.bytes.get(path);
  }
  /** @param {string} path Package part path. Return its original text, or null when absent. */
  async readText(path) {
    if(!path)return null;
    if(!this.texts.has(path))this.texts.set(path,this.readBytes(path).then(bytes=>bytes===null?null:XmlPartCodec.decode(bytes,path)));
    return this.texts.get(path);
  }
  /** @param {string} path Package part path. Return its parsed XML document, or null. */
  async readDoc(path) {
    if(!this.documents.has(path))this.documents.set(path,this.readText(path).then(text=>text===null?null:this.parseXml(text,path)));
    return this.documents.get(path);
  }
  /** @param {string} path Owning part path. Return its shared, read-only relationship map. */
  async readRelationships(path) {
    if(!this.relationships.has(path))this.relationships.set(path,(async()=>{
      const slash=path.lastIndexOf('/');
      const doc=await this.readDoc(path.slice(0,slash+1)+'_rels/'+path.slice(slash+1)+'.rels');
      return new Map(Array.from(doc?.getElementsByTagNameNS('*','Relationship')||[],e=>[e.getAttribute('Id'),{
        type:e.getAttribute('Type'),external:e.getAttribute('TargetMode')==='External',path:this.resolvePath(path,e.getAttribute('Target')),
      }]));
    })());
    return this.relationships.get(path);
  }
}
