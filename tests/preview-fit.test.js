import {test} from 'node:test';
import assert from 'node:assert/strict';
import {syncPreviewPositions} from '../src/editor/preview-cache.js';
import {fitCandidates} from '../src/editor/text-fit.js';

function preview(ids) {
  const movers=ids.map(id=>({dataset:{pptxMover:id,originX:'0',originY:'0',unitsPerPixel:'1'},style:{transform:''}}));
  const layer={};let scans=0;
  return {movers,get scans(){return scans;},layer,querySelector(){return this.layer;},querySelectorAll(){scans++;return this.movers;}};
}

test('position-only updates touch only requested transforms and never inspect text/XML',()=>{
  const root=preview(['a','b']);
  const slide={elements:['a','b'].map(id=>({id,g:{x:10,y:20},get node(){throw Error('text/XML traversal');}}))};
  assert.equal(syncPreviewPositions(root,slide,{positionOnly:true,ids:['a']}),1);
  assert.equal(root.movers[0].style.transform,'translate(10px, 20px)');
  assert.equal(root.movers[1].style.transform,'');
  slide.elements[0].g.x=15;
  syncPreviewPositions(root,slide,{positionOnly:true,ids:new Set(['a'])});
  assert.equal(root.scans,1,'reuse mover index');
  assert.equal(root.movers[0].style.transform,'translate(15px, 20px)');
  assert.throws(()=>syncPreviewPositions(root,slide),/text\/XML traversal/,'default retains full text sync');
});

test('replaced layers and late preview roots use their own mover and descriptor indexes',()=>{
  const cached=preview(['a']),slide={elements:[{id:'a',g:{x:2,y:3}}]};
  syncPreviewPositions(cached,slide,{positionOnly:true});
  const late=preview(['a']);syncPreviewPositions(late,slide);
  assert.equal(late.movers[0].style.transform,cached.movers[0].style.transform);
  const old=cached.movers[0],replacement=preview(['a']);
  cached.layer=replacement.layer;cached.movers=replacement.movers;
  slide.elements=[{id:'a',g:{x:7,y:8}}];
  syncPreviewPositions(cached,slide,{positionOnly:true,ids:['a']});
  assert.equal(cached.movers[0].style.transform,'translate(7px, 8px)');
  assert.equal(old.style.transform,'translate(2px, 3px)');
  slide.elements=[{id:'a',g:{x:0,y:0}}];syncPreviewPositions(cached,slide);
  assert.equal(cached.movers[0].style.transform,'','full undo sync uses replacement descriptors');
});

test('fit eligibility caches descriptor generations and uses Set membership',()=>{
  let reads=0;
  const makeElement=id=>({id,g:{},kind:'pic',get node(){reads++;return null;}});
  const slide={elements:[makeElement('a'),makeElement('b')]},deck={slides:[slide]};
  const ids=new Set(['a']);ids[Symbol.iterator]=()=>{throw Error('selection should not be copied');};
  assert.deepEqual(fitCandidates(deck,new Set([0]),new Map([[0,ids]]),'selected'),[]);
  const first=reads;
  fitCandidates(deck,new Set([0]),new Map([[0,ids]]),'selected');
  assert.equal(reads,first);
  slide.elements=[makeElement('c')];fitCandidates(deck,new Set([0]),new Map(),'all');
  assert.equal(reads,first+1,'undo/new descriptor array invalidates eligibility');
});


test('resize drafts reuse indexes and touch only selected IDs without rebuilding descriptor arrays',()=>{
  const root=preview(['a','b']),slide={elements:[{id:'a',kind:'pic',g:{x:0,y:0,w:10,h:10}},{id:'b',g:{x:0,y:0},get node(){throw Error('unselected XML traversal');}}]};
  const original=slide.elements;
  for(let i=1;i<=20;i++)syncPreviewPositions(root,slide,{ids:new Set(['a']),geometries:new Map([['a',{x:i,y:0,w:10,h:10}]])});
  assert.equal(root.scans,1,'full draft sync reuses the mover index');assert.equal(slide.elements,original);
  assert.equal(slide.elements[0].g.x,0,'draft leaves source geometry unchanged');
  assert.equal(root.movers[0].style.transform,'translate(20px, 0px)');assert.equal(root.movers[1].style.transform,'');
});
