import {ResizeGesture} from '../src/editor/ResizeGesture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {ElementResize} from '../src/editor/ElementResize.js';
import {NativeSlidesDocument} from '../src/editor/google/NativeSlidesDocument.js';
import {nativeSlidesFixture} from './native-slides-fixture.js';

const center=b=>[b.x+b.w/2,b.y+b.h/2];
const close=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-6));
test('PPTX resize geometry preserves each center and rotation with independent axes',()=>{
  const g={x:100,y:200,w:300,h:400,rot:47,flipH:true};
  const next=ElementResize.geometry(g,1.2,.8);
  assert.deepEqual(center(next),center(g));assert.equal(next.w,360);assert.equal(next.h,320);assert.equal(next.rot,47);assert.equal(next.flipH,true);
  assert.deepEqual(ElementResize.geometry(next,1,1),next);
  for(const value of [0,-1,Infinity,NaN,1001])assert.throws(()=>ElementResize.factors(value,100));
  assert.throws(()=>ElementResize.geometry(g,1e9,1));
});
test('native bulk resize preserves per-object centers, checked scope, moves and undo/redo',()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture()),selected=new Set(['shape_1','shape_2','shape_4','group_1']);
  model.move(new Set([0]),selected,1,2);
  const before=model.elements(0).map(e=>({id:e.id,box:e.box})),other=structuredClone(model.elements(1));
  model.resize(new Set([0]),selected,120,80);
  for(const previous of before){const current=model.elements(0).find(e=>e.id===previous.id);close(center(current.box),center(previous.box));if(selected.has(previous.id))assert.notDeepEqual(current.box,previous.box);else assert.deepEqual(current.box,previous.box);}
  assert.deepEqual(model.elements(1),other);
  const resized=structuredClone(model.elements(0));model.undo();assert.deepEqual(model.elements(0).map(e=>({id:e.id,box:e.box})),before);model.redo();assert.deepEqual(model.elements(0),resized);
  const history=model.undoStack.length;model.resize(new Set([0]),selected,100,100);assert.equal(model.undoStack.length,history);
  assert.throws(()=>model.resize(new Set([0]),selected,0,100));assert.deepEqual(model.elements(0),resized);
  assert.ok(model.requests().every(r=>r.updatePageElementTransform?.applyMode==='ABSOLUTE'));
});
test('native rotated, reflected shapes resize along local axes and export unchanged styles',()=>{
  const fixture=nativeSlidesFixture(),shape=fixture.slides[0].pageElements[0],r=Math.PI/4;
  shape.transform={scaleX:-Math.cos(r),shearY:-Math.sin(r),shearX:-Math.sin(r),scaleY:Math.cos(r),translateX:300,translateY:200,unit:'PT'};
  const model=new NativeSlidesDocument(fixture),before=model.elements(0)[0],style=structuredClone(shape.shape);
  model.resize(new Set([0]),new Set([before.id]),200,50);
  const after=model.elements(0)[0];close(center(before.box),center(after.box));
  assert.equal(after.native.transform.scaleX,shape.transform.scaleX*2);assert.equal(after.native.transform.shearX,shape.transform.shearX*.5);
  model.acceptSave('copy','Copy','r2');assert.deepEqual(model.original.slides[0].pageElements[0].shape,style);
});

test('drag factors follow rotated local axes, corners, Shift and minimum size',()=>{
  const g={x:0,y:0,w:100,h:50,rot:90};
  assert.deepEqual(ResizeGesture.factors(g,5,{x:0,y:10}),{sx:1.2,sy:1});
  const f=ResizeGesture.factors(g,6,{x:-10,y:0});assert.equal(f.sx,1);assert.equal(f.sy,1.4);
  assert.deepEqual(ResizeGesture.factors(g,5,{x:0,y:10},true),{sx:1.2,sy:1.2});
  assert.equal(ResizeGesture.factors(g,5,{x:0,y:-500}).sx,.01);
  assert.equal(ResizeGesture.handles(g).length,8);
});
