import assert from 'node:assert/strict';
import {makeDeckFixture} from '../tests/deck-fixtures.mjs';

/** Verify real ZIP read reuse and XML undo against the dev server. @param {object} browser DevTools client. @param {string} origin Dev server URL. */
export async function checkCorePerformance(browser,origin){
  await browser.navigate(origin);
  const result=await browser.evaluate(`(async()=>{
    const {loadDeck,moveSelected,commitPositions,restore,serialize}=await import('/src/editor/core.js');
    const {previewResources}=await import('/src/services/PreviewResources.js');
    const JSZip=await previewResources.loadZip();
    const sample=await(await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer();
    const fixture=await (${makeDeckFixture.toString()})(JSZip,sample,4);
    const buffer=await fixture.arrayBuffer(),zip=await JSZip.loadAsync(buffer),reads={};
    for(const [path,file] of Object.entries(zip.files)){
      const read=file.async;
      file.async=function(...args){reads[path]=(reads[path]||0)+1;return read.apply(this,args);};
    }
    const deck=await loadDeck(buffer,{loadAsync:async()=>zip});
    const slide=deck.slides[0],e=slide.elements.find(e=>e.g&&!e.hidden);
    if(!e)throw Error('No movable fixture element');
    const xml=serialize(slide.doc),position={...e.g},selection=new Map([[0,new Set([e.id])]]),snapshots=new Map();
    const original=globalThis.XMLSerializer;let serializations=0;
    globalThis.XMLSerializer=class extends original{serializeToString(doc){serializations++;return super.serializeToString(doc);}};
    let first,second,atomic;
    try{
      first=moveSelected(deck,selection,3600,0,'relative',null,{snapshots});
      second=moveSelected(deck,selection,3600,0,'relative',null,{snapshots});
      const before=serialize(slide.doc),count=snapshots.size;
      try{commitPositions(deck,[{index:0,id:e.id,x:9000,y:0},{index:0,id:'absent',x:1,y:0}],{snapshots});}catch{}
      atomic=before===serialize(slide.doc)&&count===snapshots.size;
    }finally{globalThis.XMLSerializer=original;}
    // Two explicit assertions above serialize the document, in addition to the one snapshot.
    restore(deck,first);
    return {reads,slideCount:deck.slides.length,sharedLayout:deck.slides.every(s=>s.layout===slide.layout),
      inherited:!!slide.layout&&!!slide.master,theme:!!slide.themePath,original:slide.originalXml===await zip.file(slide.path).async('string'),
      snapshotSerializations:serializations-2,reused:first[0]===second[0],changes:second.changes,
      atomic,restored:serialize(slide.doc)===xml&&slide.elements.find(n=>n.id===e.id).g.x===position.x&&slide.dirty===false};
  })()`);
  // The original-XML comparison explicitly rereads slide1 after the instrumented load.
  result.reads['ppt/slides/slide1.xml']--;
  assert.ok(Object.values(result.reads).every(count=>count===1),JSON.stringify(result.reads));
  assert.equal(result.slideCount,4);assert.equal(result.sharedLayout,true);
  for(const key of ['inherited','theme','original','reused','atomic','restored'])assert.equal(result[key],true,key);
  assert.equal(result.snapshotSerializations,1);assert.equal(result.changes.length,1);
  console.log('PASS core: one read per package part, shared inherited XML, one nudge snapshot, atomic validation and XML undo');
}
