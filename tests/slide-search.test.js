import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SlideSearchIndex} from '../src/editor/SlideSearchIndex.js';

const ns='http://schemas.openxmlformats.org/drawingml/2006/main';
const node=(name,children=[],textContent='')=>({namespaceURI:ns,localName:name,children,textContent});
const text=value=>node('r',[node('t',[],value)]);
const paragraph=(...children)=>node('p',children);
const doc=paragraphs=>({getElementsByTagNameNS(namespace,name){assert.equal(namespace,ns);assert.equal(name,'p');return paragraphs;}});

test('full body text, adjacent format runs, fields and breaks are searchable without the label limit',()=>{
  const index=new SlideSearchIndex({slides:[{index:0,title:'Short title',doc:doc([
    paragraph(text('설명'.repeat(70)),text('BodyOnlyNeedle')),
    paragraph(text('연'),text('간'),node('br'),node('fld',[node('t',[],'매출')]))
  ])}]});
  assert.deepEqual(index.find('bodyonlyneedle'),[0]);
  assert.deepEqual(index.find('연간   매출'),[0]);
  assert.deepEqual(index.find('연간 매출'.normalize('NFD')),[0]);
  assert.deepEqual(index.find('short TITLE'),[0]);
});

test('literal symbols, case, whitespace and empty queries never become regex or select all',()=>{
  const index=new SlideSearchIndex({slides:[
    {index:0,title:'Alpha [a+b].*',doc:doc([])},
    {index:1,title:'ALPHA',doc:doc([])},
    {index:2,title:'Unrelated',doc:doc([])},
  ]});
  assert.deepEqual(index.find(' ａｌｐｈａ '),[0,1]);
  assert.deepEqual(index.find('[a+b].*'),[0]);
  assert.deepEqual(index.find('.*'),[0]);
  for(const query of ['', ' \n\t ', '\u3000', 'not present'])assert.deepEqual(index.find(query),[]);
});

test('queries reuse the index; inherited sample text is excluded and clear removes the old deck',()=>{
  let reads=0;
  const index=new SlideSearchIndex({slides:[{index:0,title:'Title',
    doc:{getElementsByTagNameNS(){reads++;return [paragraph(text('Body'))];}},
    layout:doc([paragraph(text('MasterOnly'))]),master:doc([paragraph(text('MasterOnly'))])
  }]});
  assert.deepEqual(index.find('body'),[0]);assert.deepEqual(index.find('MasterOnly'),[]);
  index.find('Title');assert.equal(reads,1);
  index.clear();assert.deepEqual(index.find('body'),[]);
});
