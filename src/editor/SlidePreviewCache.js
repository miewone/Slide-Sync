import {PackageReader} from './PackageReader.js';
import {parseXml,resolvePath,serialize} from './core.js';

const cacheVersion=typeof __PREVIEW_CACHE_VERSION__==='undefined'?'preview-v1':__PREVIEW_CACHE_VERSION__;

/** Content-addressed slide previews; ZIP timestamps and filenames do not identify a rendering. */
export class SlidePreviewCache {
  /** @param {object} repository Browser-local preview storage. @param {object} options Hash API/version overrides for tests. */
  constructor(repository,{crypto=globalThis.crypto,version=cacheVersion}={}) {
    this.repository=repository;this.crypto=crypto;this.version=version;
  }

  /** @param {string|Uint8Array} value Content to fingerprint using SHA-256. */
  async digest(value) {
    const bytes=typeof value==='string'?new TextEncoder().encode(value):value;
    const hash=await this.crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
  }

  /**
   * Hash current slide XML plus transitive rendering dependencies and presentation defaults.
   * Shared parts are decoded and hashed once per call; relationship cycles terminate.
   * @param {object} deck Parsed deck, including its unchanged package and current slide documents.
   * @returns {Promise<string[]>} Hashes in editor slide order.
   */
  async keys(deck) {
    const reader=new PackageReader(deck.zip,{parseXml,resolvePath}),hashes=new Map();
    const partHash=path=>{
      if(!hashes.has(path))hashes.set(path,reader.readBytes(path).then(bytes=>bytes===null?'missing':this.digest(bytes)));
      return hashes.get(path);
    };
    const relPath=path=>path.slice(0,path.lastIndexOf('/')+1)+'_rels/'+path.slice(path.lastIndexOf('/')+1)+'.rels';
    const visit=async(path,parts,root)=>{
      if(!path||parts.has(path))return;
      parts.set(path,await partHash(path));
      parts.set(relPath(path),await partHash(relPath(path)));
      for(const rel of (await reader.readRelationships(path)).values()){
        if(rel.external||/\/(slide|notesSlide|notesMaster|hyperlink)$/.test(rel.type))continue;
        // Master-to-layout links list sibling layouts, not inherited artwork.
        if(rel.type.endsWith('/slideLayout')&&path!==root)continue;
        await visit(rel.path,parts,root);
      }
    };
    const common=new Map();
    common.set('[Content_Types].xml',await partHash('[Content_Types].xml'));
    // The vendor reads producer-specific behavior and default styles outside slide relationships.
    common.set('docProps/app.xml',await partHash('docProps/app.xml'));
    const types=await reader.readDoc('[Content_Types].xml');
    for(const type of types?.getElementsByTagNameNS('*','Override')||[]){
      if(/(?:theme|tableStyles)\+xml$/.test(type.getAttribute('ContentType')||'')){
        await visit(type.getAttribute('PartName')?.replace(/^\//,''),common,null);
      }
    }
    await visit('ppt/presentation.xml',common,null);
    const keys=[];
    for(const slide of deck.slides){
      const parts=new Map(common);
      await visit(slide.path,parts,slide.path);
      // The editor may have moved, fitted or deleted objects since loading the ZIP.
      parts.set(slide.path,await this.digest(serialize(slide.doc)));
      keys.push(await this.digest(JSON.stringify([this.version,globalThis.navigator?.userAgent||'',960,deck.width,deck.height,[...parts].sort(([a],[b])=>a<b?-1:a>b?1:0)])));
    }
    return keys;
  }

  /** @param {object} deck Current deck. Cache/storage failures are ordinary misses. */
  async read(deck) {
    try{const keys=await this.keys(deck);return {keys,html:await this.repository.getPreviews(keys)};}
    catch{return {keys:[],html:new Map()};}
  }

  /** @param {string[]} keys Slide hashes. @param {Map<number,Element>} previews Detached, sanitized previews. @param {Set<number>} failed Fallbacks must be retried. */
  async write(keys,previews,failed) {
    try{
      const entries=[];let bytes=0;
      for(const [index,root] of previews){
        if(!keys[index]||failed.has(index))continue;
        const html=root.outerHTML;
        // Object URLs expire when the browser closes; never persist them as reusable output.
        const size=html.length*2;
        if(size>4*1024*1024||bytes+size>32*1024*1024||/blob:/i.test(html))continue;
        entries.push({id:keys[index],html});bytes+=size;
      }
      if(entries.length)await this.repository.savePreviews(entries);
    }catch{/* Storage is optional; the live preview and export remain available. */}
  }
}
