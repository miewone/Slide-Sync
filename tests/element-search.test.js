import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ElementSearchIndex} from '../src/editor/ElementSearchIndex.js';

const ns='http://schemas.openxmlformats.org/drawingml/2006/main';
const paragraph=(...runs)=>({namespaceURI:ns,localName:'p',children:runs.map(text=>({namespaceURI:ns,localName:'r',children:[{namespaceURI:ns,localName:'t',textContent:text}]}))});
const shape=(id,name,text='',extra={})=>({id,name,kind:'sp',g:{x:0,y:0,w:1,h:1,rot:0},node:{getElementsByTagNameNS:()=>[paragraph(text)]},...extra});

test('element search indexes complete text and names while excluding hidden/unresolved objects',()=>{
  const index=new ElementSearchIndex({slides:[{index:0,elements:[
    shape('a','Long body','설명'.repeat(70)+' BodyOnlyNeedle'),
    shape('b','Picture 9','',{kind:'pic'}),
    shape('hidden','BodyOnlyNeedle','',{hidden:true}),
    shape('missing','BodyOnlyNeedle','',{g:null}),
  ]}]});
  assert.deepEqual(index.find('bodyonlyneedle',new Set([0])),[{index:0,id:'a'}]);
  assert.deepEqual(index.find('picture 9',new Set([0])),[{index:0,id:'b'}]);
  assert.deepEqual(index.find(' ',new Set([0])),[]);
  assert.deepEqual(index.find('BodyOnlyNeedle',new Set()),[]);
});

test('groups are one selectable match; hidden child text is excluded and IDs are scoped to slides',()=>{
  const group=shape('g','Group','',{kind:'grpSp',children:[
    shape('c1','Child one','Alpha'),shape('c2','Child two','ALPHA'),shape('secret','SecretOnly','',{hidden:true})
  ]});
  const index=new ElementSearchIndex({slides:[{index:0,elements:[group]},{index:1,elements:[shape('g','Other group','Alpha')]}]});
  const scope=new Set([0]);
  assert.deepEqual(index.find('alpha',scope),[{index:0,id:'g'}]);
  assert.deepEqual(index.find('Child one',scope),[{index:0,id:'g'}]);
  assert.deepEqual(index.find('SecretOnly',scope),[]);
  scope.add(1);assert.deepEqual(index.find('alpha',scope),[{index:0,id:'g'},{index:1,id:'g'}]);
  index.clear();assert.deepEqual(index.find('alpha',scope),[]);
});

test('split runs, punctuation, Unicode and multiple table paragraphs use the common rules',()=>{
  const node={getElementsByTagNameNS:()=>[paragraph('연','간 ','매출'),paragraph('[a+b].*')]};
  const index=new ElementSearchIndex({slides:[{index:0,elements:[shape('table','Table','',{kind:'graphicFrame',node})]}]});
  assert.deepEqual(index.find('연간  매출'.normalize('NFD'),new Set([0])),[{index:0,id:'table'}]);
  assert.deepEqual(index.find('[a+b].*',new Set([0])),[{index:0,id:'table'}]);
  assert.deepEqual(index.find('missing',new Set([0])),[]);
});
