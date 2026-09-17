import test from 'node:test';
import assert from 'node:assert/strict';
import {SimilarElementMatcher} from '../src/editor/SimilarElementMatcher.js';
import {NativeSimilarSelection} from '../src/editor/google/NativeSimilarSelection.js';
import {NativeSlidesDocument} from '../src/editor/google/NativeSlidesDocument.js';
import {nativeSlidesFixture} from './native-slides-fixture.js';

const xml=(localName,attrs={},childNodes=[])=>({nodeType:1,localName,namespaceURI:'drawing',childNodes,attributes:Object.entries(attrs).map(([name,value])=>({name,localName:name,value}))});
const shape=(id,{x=0,w=100,rot=0,color='FFFFFF',size='1800',bold='0',font='Arial',align='l'}={})=>({id,kind:'sp',g:{x,y:0,w,h:50,rot},node:xml('sp',{},[xml('spPr',{},[xml('solidFill',{},[xml('srgbClr',{val:color})])]),xml('txBody',{},[xml('p',{},[xml('pPr',{algn:align}),xml('r',{},[xml('rPr',{sz:size,b:bold},[xml('latin',{typeface:font})]),xml('t')])])])])});

test('similar selection ignores position, scans every object and respects page/all scope',()=>{
  const a=shape('a'),b=shape('b',{x:400}),c=shape('c',{w:110}),deck={slides:[{index:0,elements:[a,b,c]},{index:1,elements:[shape('d'),{...shape('hidden'),hidden:true}]}]};
  const before=JSON.stringify(deck),criteria={layout:true};
  assert.deepEqual([...SimilarElementMatcher.select(deck,0,a,criteria,'page').get(0)],['a','b']);
  assert.deepEqual([...SimilarElementMatcher.select(deck,0,a,criteria,'all').get(1)],['d']);
  assert.equal(JSON.stringify(deck),before,'selection does not mutate the source');
});

test('criteria are independent and combined with AND, including font, size, bold and alignment',()=>{
  const a=shape('a'),slide={index:0,elements:[a]},deck={slides:[slide]};
  for(const [change,criterion] of [[{color:'FF0000'},'colors'],[{size:'2400'},'format'],[{font:'Other'},'format'],[{bold:'1'},'format'],[{align:'ctr'},'format'],[{rot:90},'layout'],[{w:90},'layout']]){
    const b=shape('b',change);
    assert.equal(new SimilarElementMatcher(deck,{[criterion]:true}).matches(a,b,slide,slide),false,JSON.stringify(change));
    const other=criterion==='format'?'colors':'format';
    assert.equal(new SimilarElementMatcher(deck,{[other]:true}).matches(a,b,slide,slide),true);
    assert.equal(new SimilarElementMatcher(deck,{[criterion]:true,[other]:true}).matches(a,b,slide,slide),false);
  }
  assert.equal(new SimilarElementMatcher(deck,{}).matches(a,a,slide,slide),false);
});

test('native selection scans all elements, ignores position and leaves the model unchanged',()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture()),[a,b]=model.elements(0),before=JSON.stringify(model.original);
  const matcher=new NativeSimilarSelection(model,{layout:true,colors:true});
  const selected=matcher.select(0,a,'page');assert.ok(selected.has(a.id));assert.ok(selected.has(b.id));
  const moved={...b,box:{...b.box,x:999,y:999}};assert.equal(matcher.signature(a,0),matcher.signature(moved,0));
  const formatted=structuredClone(b);formatted.native.shape.text.textElements.find(e=>e.textRun).textRun.style={fontSize:{magnitude:40,unit:'PT'},bold:true};
  const format=new NativeSimilarSelection(model,{format:true});assert.notEqual(format.signature(a,0),format.signature(formatted,0));
  assert.equal(JSON.stringify(model.original),before);
});
