import assert from 'node:assert/strict';

/** Exercise encoded packages across editor, renderer, export and undo.
 * @param {object} browser Chrome DevTools client.
 * @param {string} origin Development server exposing editor modules.
 */
export async function checkXmlCompatibility(browser,origin) {
  browser.errors=[];
  await browser.navigate(origin);
  const result=await browser.evaluate(`(async()=>{
    const core=await import('/src/editor/core.js');
    const guides=await import('/src/editor/guides.js');
    const {previewResources}=await import('/src/services/PreviewResources.js');
    const JSZip=await previewResources.loadZip(),{init}=await previewResources.loadRenderer();
    const sample=await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer();
    const variants=[];
    const encode=(text,bigEndian,bom)=>{
      const bytes=new Uint8Array(text.length*2+(bom?2:0));
      if(bom)bytes.set(bigEndian?[254,255]:[255,254]);
      for(let i=0;i<text.length;i++){const code=text.charCodeAt(i),offset=i*2+(bom?2:0);bytes[offset]=bigEndian?code>>8:code&255;bytes[offset+1]=bigEndian?code&255:code>>8;}
      return bytes;
    };
    const matches=async(zip,parts)=>{
      for(const [path,bytes] of parts){const actual=await zip.file(path).async('uint8array');if(actual.length!==bytes.length||actual.some((value,index)=>value!==bytes[index]))return false;}
      return true;
    };
    for(const bigEndian of [false,true])for(const bom of [false,true]){
      const zip=await JSZip.loadAsync(sample),parts=new Map();
      for(const path of Object.keys(zip.files).filter(path=>/\\.(xml|rels)$/.test(path))){
        let xml=await zip.file(path).async('string');
        xml=xml.replace(/^\\uFEFF/,'').replace(/<\\?xml[^?]*\\?>/,'');
        if(path==='ppt/slides/slide1.xml'){
          const doc=core.parseXml(xml,path);
          doc.getElementsByTagNameNS('*','t')[0].textContent='인코딩 한글 é 😀';
          const ext=doc.createElementNS('urn:slide-sync:metadata','meta:parsererror');
          ext.textContent='ordinary metadata';doc.documentElement.append(ext);xml=core.serialize(doc);
        }
        const bytes=encode('<?xml version="1.0" encoding="UTF-16"?>'+xml,bigEndian,bom);
        zip.file(path,bytes);parts.set(path,bytes);
      }
      const buffer=await zip.generateAsync({type:'arraybuffer'}),deck=await core.loadDeck(buffer,JSZip);
      await guides.loadGuides(deck);
      const host=document.createElement('div');document.body.append(host);
      const preview=init(host,{width:960,height:540,mode:'list',staticPreview:true});
      let rendered,text;
      try{
        await preview.load(buffer);
        for(let i=0;i<preview.pptx.slides.length;i++)preview.htmlRender.renderSlide(i);
        rendered=host.querySelectorAll('.slide-wrapper').length;text=host.textContent.includes('인코딩 한글 é 😀');
      }finally{preview.destroy();host.remove();}
      const plain=await matches(await JSZip.loadAsync(await core.exportDeck(deck)),parts);
      const slide=deck.slides[0],element=slide.elements.find(item=>item.g&&!item.hidden);
      const snapshots=core.moveSelected(deck,new Map([[0,new Set([element.id])]]),3600,0,'relative');
      const guideSnapshot=guides.addGuide(deck,'x',123456);
      guides.prepareGuideExport(deck);
      const edited=await core.exportDeck(deck),reopened=await core.loadDeck(edited,JSZip);
      await guides.loadGuides(reopened);
      const moved=reopened.slides[0].elements.find(item=>item.id===element.id).g.x===element.g.x;
      const guideRetained=reopened.guides.global.some(item=>item.axis==='x'&&item.pos===123825);
      core.restore(deck,snapshots);guides.restoreGuides(deck,guideSnapshot[0]);guides.prepareGuideExport(deck);
      const undo=await matches(await JSZip.loadAsync(await core.exportDeck(deck)),parts);
      variants.push({bigEndian,bom,slides:deck.slides.length,rendered,text,plain,moved,guideRetained,undo});
    }
    const custom=core.parseXml('<root xmlns:x="urn:custom"><x:parsererror/></root>').documentElement.localName==='root';
    let invalid=false,entities=false;
    try{core.parseXml('<root><child></root>','broken.xml');}catch(error){invalid=error.message.includes('broken.xml');}
    try{core.parseXml('\\uFEFF<!DOCTYPE root [<!ENTITY x "value">]><root>&x;</root>');}catch{entities=true;}
    return {variants,custom,invalid,entities};
  })().catch(error=>{throw Error(error.message);})`);
  for(const variant of result.variants){
    assert.equal(variant.slides,8);assert.equal(variant.rendered,8);
    for(const field of ['text','plain','moved','guideRetained','undo'])assert.equal(variant[field],true,`${JSON.stringify(variant)}: ${field}`);
  }
  assert.equal(result.custom,true);assert.equal(result.invalid,true);assert.equal(result.entities,true);
  assert.deepEqual(browser.errors,[]);
  console.log('PASS XML compatibility: UTF-16 LE/BE with/without BOM, multilingual rendering, byte-preserving export/undo, guide edits, parser namespaces and entity rejection');
}
