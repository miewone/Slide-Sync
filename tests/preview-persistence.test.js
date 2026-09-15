import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SlidePreviewCache} from '../src/editor/SlidePreviewCache.js';

test('background preview saves retain captured HTML and its matching key after edits',async()=>{
  const saved=[];
  const cache=new SlidePreviewCache({savePreviews:async entries=>saved.push(...entries)});
  const root={outerHTML:'<div>original</div>'},previews=new Map([[0,root]]);
  const entries=cache.capture(previews,new Set());
  root.outerHTML='<div>edited later</div>';previews.clear();
  await cache.save(['original-key'],entries);
  assert.deepEqual(saved,[{id:'original-key',html:'<div>original</div>'}]);
});

test('background preview snapshots preserve fallback, Blob URL and storage limits',async()=>{
  const saved=[],cache=new SlidePreviewCache({savePreviews:async entries=>saved.push(...entries)});
  const previews=new Map([[0,{outerHTML:'fallback'}],[1,{outerHTML:'<img src="blob:expired">'}],
    [2,{outerHTML:'x'.repeat(2*1024*1024+1)}],
    ...Array.from({length:10},(_,i)=>[i+3,{outerHTML:'x'.repeat(2*1024*1024)}])]);
  const captured=cache.capture(previews,new Set([0]));
  assert.equal(captured.length,8);
  await cache.save(Array.from({length:13},(_,i)=>i===3?null:String(i)),captured);
  assert.deepEqual(saved.map(entry=>entry.id),['4','5','6','7','8','9','10']);
  await new SlidePreviewCache({savePreviews:async()=>{throw Error('storage unavailable');}}).save(['key'],[{index:0,html:'<div/>'}]);
});

test('export fingerprint snapshots isolate XML and package replacements from later edits',()=>{
  const original=globalThis.XMLSerializer;
  globalThis.XMLSerializer=class {serializeToString(doc){return doc.xml;}};
  try{
    const zip={files:{theme:{bytes:'original'}},clone(){return {...this,files:{...this.files}};}};
    const deck={zip,width:960,height:540,slides:[{path:'slide.xml',doc:{xml:'<original/>'}}]};
    const snapshot=new SlidePreviewCache(null).snapshot(deck);
    deck.slides[0].doc.xml='<edited/>';zip.files.theme={bytes:'changed'};deck.slides=[];
    assert.equal(snapshot.slides[0].xml,'<original/>');
    assert.equal(snapshot.zip.files.theme.bytes,'original');
  }finally{if(original===undefined)delete globalThis.XMLSerializer;else globalThis.XMLSerializer=original;}
});
