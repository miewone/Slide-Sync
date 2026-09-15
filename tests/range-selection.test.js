import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RangeSelection} from '../src/editor/RangeSelection.js';
import {BoxSelectionGesture} from '../src/editor/BoxSelectionGesture.js';

const shape=(id,x,y,w,h,extra={})=>({id,kind:'sp',g:{x,y,w,h,rot:0},...extra});

test('reverse rectangles fully contain shapes and include overlapped items rather than only the topmost',()=>{
  const rectangle=RangeSelection.rectangle({x:100,y:80},{x:0,y:0});
  assert.deepEqual(rectangle,{x:0,y:0,w:100,h:80});
  const elements=[shape('back',10,10,50,40),shape('front',10,10,50,40),shape('partial',90,70,40,40),shape('hidden',10,10,10,10,{hidden:true}),{id:'unresolved'}];
  const deck={slides:[{elements}]};
  assert.deepEqual([...RangeSelection.apply(deck,new Set([0]),new Map(),rectangle).get(0)],['back','front']);
});

test('rotated bounds, thin connectors and groups remain geometrically correct',()=>{
  const rotated=shape('rotated',20,20,60,10);rotated.g.rot=45;
  assert.equal(RangeSelection.contains(rotated,{x:20,y:20,w:60,h:10}),false);
  assert.equal(RangeSelection.contains(rotated,{x:0,y:0,w:100,h:80}),true);
  const group=shape('group',20,20,60,30,{kind:'grpSp',children:[shape('child',0,0,10,10)]});
  assert.equal(RangeSelection.contains(group,{x:0,y:0,w:100,h:80}),true);
  assert.equal(RangeSelection.contains(shape('line',10,10,0,40,{kind:'cxnSp'}),{x:0,y:0,w:100,h:80}),true);
  assert.equal(RangeSelection.contains(group,{x:20,y:20,w:0,h:80}),false);
});

test('scope replacement and additive selection preserve unchecked selections and input sets',()=>{
  const deck={slides:[{elements:[shape('a',10,10,20,20),shape('b',70,70,20,20)]},{elements:[shape('c',10,10,20,20)]}]};
  const previous=new Map([[0,new Set(['b'])],[1,new Set(['c'])]]),bounds={x:0,y:0,w:50,h:50};
  const replacement=RangeSelection.apply(deck,new Set([0]),previous,bounds);
  assert.deepEqual([...replacement.get(0)],['a']);assert.equal(replacement.get(1),previous.get(1));
  const additive=RangeSelection.apply(deck,new Set([0]),previous,bounds,true);
  assert.deepEqual([...additive.get(0)],['b','a']);assert.deepEqual([...previous.get(0)],['b']);
  const empty=RangeSelection.apply(deck,new Set([0]),previous,{x:200,y:200,w:20,h:20});
  assert.equal(empty.has(0),false);assert.equal(empty.get(1),previous.get(1));
});

test('gesture commits release coordinates without waiting for RAF and cancellation cannot commit',()=>{
  const raf=globalThis.requestAnimationFrame,caf=globalThis.cancelAnimationFrame;
  let pending=null,capturing=false,commits=[],previews=[],ends=0,clicks=0;
  globalThis.requestAnimationFrame=callback=>{pending=callback;return 1;};
  globalThis.cancelAnimationFrame=()=>{pending=null;};
  const surface={addEventListener(){},classList:{add(){},remove(){}},
    getBoundingClientRect:()=>({left:10,top:20,width:100,height:100}),
    setPointerCapture(){capturing=true;},hasPointerCapture:()=>capturing,releasePointerCapture(){capturing=false;}};
  try{
    const gesture=new BoxSelectionGesture({surface,width:1000,height:1000,onPreview:value=>previews.push(value),onCommit:value=>commits.push(value),onClick:()=>clicks++,onEnd:()=>ends++});
    const event=(x,y,extra={})=>({pointerId:1,clientX:x,clientY:y,pointerType:'mouse',...extra});
    gesture.begin(event(20,30,{ctrlKey:true}));gesture.move(event(50,60));
    assert.equal(previews.length,0);assert.equal(commits.length,0);
    gesture.release(event(200,200));
    assert.deepEqual(commits[0].rectangle,{x:100,y:100,w:900,h:900});assert.equal(commits[0].additive,true);assert.equal(pending,null);
    gesture.begin(event(20,30));gesture.move(event(60,70));gesture.cancel();
    assert.equal(commits.length,1);assert.equal(ends,2);assert.equal(pending,null);
    gesture.begin(event(20,30));gesture.release(event(22,31));assert.equal(clicks,1);
  }finally{globalThis.requestAnimationFrame=raf;globalThis.cancelAnimationFrame=caf;}
});
