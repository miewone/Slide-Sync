import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeSlidesMedia} from '../src/services/google/NativeSlidesMedia.js';
import {NativeSlidesDocument} from '../src/editor/google/NativeSlidesDocument.js';
import {NativeSlidesAppearance} from '../src/editor/google/NativeSlidesAppearance.js';
import {NativeImageGeometry} from '../src/editor/google/NativeImageGeometry.js';
import {nativeSlidesFixture} from './native-slides-fixture.js';

test('expired image URLs share a native read and preserve draft text and coordinates',async()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture()),fresh=nativeSlidesFixture(),old=fresh.slides[1].pageElements[1].image.contentUrl;
  fresh.slides[1].pageElements[1].image.contentUrl='https://lh3.googleusercontent.com/fresh';
  model.move(new Set([0]),new Set(['shape_1']),1,0);const before=JSON.stringify(model.original),edits=model.requests();let reads=0;
  const media=new NativeSlidesMedia({presentation:async()=>{reads++;return fresh;}},model,'presentation_1');
  assert.deepEqual(await Promise.all([media.refresh('image_1',old),media.refresh('image_1',old)]),[fresh.slides[1].pageElements[1].image.contentUrl,fresh.slides[1].pageElements[1].image.contentUrl]);
  assert.equal(reads,1);assert.equal(JSON.stringify(model.original),before);assert.deepEqual(model.requests(),edits);
});
test('changed documents, untrusted image hosts and repeated failures are rejected without retries',async()=>{
  for(const change of [fresh=>fresh.revisionId='changed',fresh=>fresh.slides[1].pageElements[1].image.contentUrl='https://evil.example/image']){
    const model=new NativeSlidesDocument(nativeSlidesFixture()),fresh=nativeSlidesFixture();change(fresh);let count=0;
    const media=new NativeSlidesMedia({presentation:async()=>{count++;return fresh;}},model,'presentation_1');
    await assert.rejects(media.refresh('image_1','old'));await assert.rejects(media.refresh('image_1','old'));assert.equal(count,1);
  }
});
test('placeholder images inherit resource URLs and crop without losing the child image identity',()=>{
  const source=nativeSlidesFixture();source.layouts[0].pageElements=[{objectId:'parent_image',image:{contentUrl:'https://lh3.googleusercontent.com/parent',imageProperties:{cropProperties:{leftOffset:.2}}}}];
  const appearance=new NativeSlidesAppearance(new NativeSlidesDocument(source));
  assert.deepEqual(appearance.image({image:{placeholder:{parentObjectId:'parent_image'}}}),{url:'https://lh3.googleusercontent.com/parent',properties:{cropProperties:{leftOffset:.2}}});
});
test('crop uses decoded image dimensions while keeping the original container and supporting reflection',()=>{
  const crop=NativeImageGeometry.layout(100,60,{leftOffset:.25,rightOffset:.25},{width:200,height:120});
  assert.equal(crop.transform,'matrix(1 0 0 0.5 -50 0)');assert.equal(crop.width,200);
  assert.equal(NativeImageGeometry.layout(100,60,{leftOffset:1,rightOffset:1},{width:200,height:120}).transform,'matrix(-0.5 0 0 0.5 100 0)');
});
test('old successful refresh cache can renew again after signed resources age',async()=>{
  let now=0,count=0;const model=new NativeSlidesDocument(nativeSlidesFixture()),old=model.original.slides[1].pageElements[1].image.contentUrl;
  const media=new NativeSlidesMedia({presentation:async()=>{const fresh=nativeSlidesFixture();fresh.slides[1].pageElements[1].image.contentUrl=`https://lh3.googleusercontent.com/fresh${++count}`;return fresh;}},model,'presentation_1',()=>now);
  await media.refresh('image_1',old);now=26*60*1000;await media.refresh('image_1',old);assert.equal(count,2);
});
