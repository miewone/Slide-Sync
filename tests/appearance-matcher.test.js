import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AppearanceMatcher} from '../src/editor/AppearanceMatcher.js';
import {RangeSelection} from '../src/editor/RangeSelection.js';

const xml=(localName,attrs={},childNodes=[])=>({nodeType:1,localName,namespaceURI:'drawing',childNodes,
  attributes:Object.entries(attrs).map(([name,value])=>({name,localName:name,value,namespaceURI:null}))});
const shape=(id,color='FFFFFF',g={},nodes=[])=>({id,kind:'sp',g:{x:10,y:10,w:20,h:20,rot:0,...g},
  node:xml('sp',{},[xml('cNvPr',{id,name:id}),xml('solidFill',{},[xml('srgbClr',{val:color})]),...nodes])});
const slide=elements=>({elements,path:'ppt/slides/slide1.xml'});

test('appearance matches independent IDs; rejects each geometry dimension and colors',()=>{
  const source=shape('a'),same=shape('b'),s=slide([source]),t=slide([same]);
  const matcher=new AppearanceMatcher({slides:[s,t]});
  assert.equal(matcher.matches(source,same,s,t),true);
  for(const key of ['x','y','w','h','rot','flipH','flipV','chX','chY','chW','chH']) {
    assert.equal(matcher.matches(source,shape('b','FFFFFF',{[key]:99}),s,t),false,key);
  }
  assert.equal(matcher.matches(source,shape('b','FF0000'),s,t),false);
  assert.equal(matcher.matches(source,{...same,hidden:true},s,t),false);
  assert.equal(matcher.matches(source,{...same,kind:'pic'},s,t),false);
  assert.equal(matcher.matches(null,same,s,t),false);
});

test('text values are ignored but text color, group contents and inherited styles are compared',()=>{
  const text=color=>xml('txBody',{},[xml('p',{},[xml('r',{},[xml('rPr',{},[xml('solidFill',{},[xml('srgbClr',{val:color})])]),xml('t')])])]);
  const a=shape('a','FFFFFF',{},[text('000000')]),b=shape('b','FFFFFF',{},[text('000000')]),s=slide([a,b]);
  const matcher=new AppearanceMatcher({slides:[s]});
  assert.equal(matcher.matches(a,b,s,s),true);
  assert.equal(matcher.matches(a,shape('c','FFFFFF',{},[text('FF0000')]),s,s),false);
  const inherited={...b,inherited:[xml('sp',{},[xml('spPr',{},[xml('noFill')])])]};
  assert.equal(matcher.matches(a,inherited,s,s),false);
  assert.equal(matcher.matches(a,shape('c','FFFFFF',{},[text('000000'),xml('cNvPr',{hidden:'1'})]),s,s),false);
  const group=offset=>({...shape('g','FFFFFF',{},[xml('sp',{},[xml('xfrm',{},[xml('off',{x:offset})])])]),kind:'grpSp'});
  assert.equal(matcher.matches(group('10'),group('20'),s,s),false);
  assert.equal(new AppearanceMatcher({}).matches(a,b,s,{...s,themePath:'other-theme.xml'}),false);
});

test('strict ranges filter other slides and preserve additive and unchecked selections',()=>{
  const a=shape('a'),b=shape('b'),different=shape('c','FF0000');
  const deck={slides:[slide([a]),slide([b,different]),slide([shape('d')])]};
  const matcher=new AppearanceMatcher(deck),bounds={x:0,y:0,w:100,h:100};
  const accept=(element,s)=>matcher.matches(a,element,deck.slides[0],s);
  const previous=new Map([[1,new Set(['c'])],[2,new Set(['d'])]]);
  const result=RangeSelection.apply(deck,new Set([0,1]),previous,bounds,false,accept);
  assert.deepEqual([...result.get(1)],['b']);assert.deepEqual([...result.get(2)],['d']);
  assert.deepEqual([...previous.get(1)],['c']);
  assert.deepEqual([...RangeSelection.apply(deck,new Set([1]),previous,bounds,true,accept).get(1)],['c','b']);
  assert.deepEqual([...RangeSelection.apply(deck,new Set([1]),previous,bounds).get(1)],['b','c']);
  assert.equal(RangeSelection.apply(deck,new Set([1]),previous,bounds,false,()=>false).has(1),false);
});
