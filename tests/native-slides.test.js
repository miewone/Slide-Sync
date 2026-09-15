import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeSlidesDocument} from '../src/editor/google/NativeSlidesDocument.js';
import {nativeSlidesFixture} from './native-slides-fixture.js';
const one=new Set([0]);

test('native movement respects checked scope, preserves group/formatting and records minimal requests',()=>{
  const fixture=nativeSlidesFixture(),before=structuredClone(fixture),model=new NativeSlidesDocument(fixture);
  model.move(one,new Set(['shape_1','shape_4','group_1']),2.54,-2.54);
  assert.equal(model.changes.size,2);assert.equal(model.elements(0)[0].box.x,82);
  assert.deepEqual(model.requests()[0],{updatePageElementTransform:{objectId:'shape_1',applyMode:'RELATIVE',transform:{scaleX:1,scaleY:1,shearX:0,shearY:0,translateX:72,translateY:-72,unit:'PT'}}});
  assert.deepEqual(fixture,before);assert.deepEqual(model.original,before);
  model.acceptSave('copy_1','Copy','r2');
  assert.deepEqual(model.original.slides[0].pageElements[0].shape,before.slides[0].pageElements[0].shape);
  assert.deepEqual(model.original.slides[0].pageElements[3].elementGroup,before.slides[0].pageElements[3].elementGroup);
  assert.equal(model.original.slides[0].pageElements[3].transform.shearX,-1);
  assert.deepEqual(model.original.slides[1],before.slides[1]);assert.deepEqual(model.original.masters,before.masters);
});
test('undo/redo restores deletion and movement without creating replacement objects',()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture()),selection=new Set(['shape_1']);
  model.move(one,selection,1,0);model.remove(one,selection);
  assert.deepEqual(model.requests(),[{deleteObject:{objectId:'shape_1'}}]);
  model.undo();assert.equal(model.requests()[0].updatePageElementTransform.objectId,'shape_1');
  model.undo();assert.equal(model.dirty,false);model.redo();assert.equal(model.dirty,true);
  model.move(one,selection,-1,0);assert.equal(model.dirty,false);
});
test('alignment and distribution use per-slide visual bounds and preserve rotated groups',()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture()),selection=new Set(['shape_1','shape_2','shape_3','shape_4']);
  model.align(one,selection,'left');assert.deepEqual(model.elements(0).slice(0,3).map(e=>e.box.x),[10,10,10]);
  assert.equal(model.elements(1)[0].box.x,25);model.undo();
  model.align(one,selection,'horizontal');assert.deepEqual(model.elements(0).slice(0,3).map(e=>e.box.x),[10,180,350]);
  model.move(one,new Set(['group_1']),0,0,'absolute');assert.equal(model.elements(0)[3].box.x,0);assert.equal(model.elements(0)[3].box.y,0);
});
test('EMU coordinates and invalid inputs are handled without corrupting draft history',()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture());
  assert.deepEqual(model.elements(1)[1].box,{x:10,y:20,w:100,h:40});
  assert.throws(()=>model.move(one,new Set(['shape_1']),NaN,0));assert.equal(model.dirty,false);
  assert.throws(()=>new NativeSlidesDocument({...nativeSlidesFixture(),slides:[]}));
  for(let n=0;n<30;n++)model.move(one,new Set(['shape_1']),1,0);
  assert.equal(model.undoStack.length,25);
});
test('revision conflicts and changed native copies are rejected; transient thumbnail URLs are ignored',()=>{
  const fixture=nativeSlidesFixture(),model=new NativeSlidesDocument(fixture),copy=structuredClone(fixture);
  copy.presentationId='copy';copy.revisionId='copy-revision';copy.title='Copy';copy.slides[1].pageElements[1].image.contentUrl='https://lh3.googleusercontent.com/new';
  assert.equal(model.matches(copy),false);assert.equal(model.matches(copy,{copy:true}),true);
  copy.slides[0].pageElements[0].title='Changed';assert.equal(model.matches(copy,{copy:true}),false);
});
