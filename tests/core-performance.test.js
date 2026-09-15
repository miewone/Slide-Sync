import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PackageReader} from '../src/editor/PackageReader.js';
import {commitPositions,moveSelected} from '../src/editor/core.js';

const element=id=>{
  const node=(localName,childNodes=[])=>({localName,nodeType:1,childNodes,setAttribute(){}});
  return {id,g:{x:0,y:0,w:10,h:10,rot:0},node:node('sp',[node('spPr',[node('xfrm',[node('off'),node('ext')])])])};
};

test('package reads and relationship parsing are shared, including concurrent requests',async()=>{
  const calls=new Map();let parses=0;
  const zip={file(path){return {async:async()=>{calls.set(path,(calls.get(path)||0)+1);return path;}};}};
  const reader=new PackageReader(zip,{parseXml(text){parses++;return {text,getElementsByTagNameNS:()=>[{getAttribute:key=>({Id:'rId1',Type:'layout',Target:'target.xml'}[key]??null)}]};},resolvePath:(_,target)=>target});
  const [a,b]=await Promise.all([reader.readDoc('slide.xml'),reader.readDoc('slide.xml')]);
  assert.equal(a,b);assert.equal(await reader.readText('slide.xml'),'slide.xml');
  const [r,s]=await Promise.all([reader.readRelationships('ppt/slide.xml'),reader.readRelationships('ppt/slide.xml')]);
  assert.equal(r,s);assert.deepEqual(r.get('rId1'),{type:'layout',external:false,path:'target.xml'});
  assert.deepEqual([...calls.values()],[1,1]);assert.equal(parses,2);
});

test('nudge snapshots serialize once and report changes on every call',()=>{
  const original=globalThis.XMLSerializer;let count=0;
  globalThis.XMLSerializer=class {serializeToString(){count++;return '<original/>';}};
  try{
    const deck={slides:[{elements:[element('a'),element('b')],doc:{},dirty:false}]},snapshots=new Map();
    const selection=new Map([[0,new Set(['a','b'])]]);
    const first=moveSelected(deck,selection,1,0,'relative',null,{snapshots});
    const second=moveSelected(deck,selection,1,0,'relative',null,{snapshots});
    assert.equal(count,1);assert.equal(first[0],second[0]);assert.equal(first[0].dirty,false);
    assert.deepEqual(second.changes,[{index:0,id:'a'},{index:0,id:'b'}]);
    assert.equal(deck.slides[0].elements[0].g.x,2);
    const noop=moveSelected(deck,selection,0,0,'relative',null,{snapshots});
    assert.equal(noop.length,0);assert.deepEqual(noop.changes,[]);assert.equal(count,1);
    const separate=moveSelected(deck,selection,1,0,'relative');
    assert.equal(count,2);assert.notEqual(separate[0],first[0]);
  }finally{if(original===undefined)delete globalThis.XMLSerializer;else globalThis.XMLSerializer=original;}
});

test('invalid position batches leave slides and retained snapshots untouched',()=>{
  const deck={slides:[{elements:[element('a')],doc:{},dirty:false}]};
  const prior={index:9,xml:'prior'},snapshots=new Map([[9,prior]]);
  for(const invalid of [{index:0,id:'missing',x:2,y:0},{index:0,id:'a',x:Infinity,y:0},{index:3,id:'a',x:2,y:0}]){
    assert.throws(()=>commitPositions(deck,[{index:0,id:'a',x:1,y:0},invalid],{snapshots}),/유효/);
    assert.equal(deck.slides[0].elements[0].g.x,0);assert.equal(deck.slides[0].dirty,false);
    assert.deepEqual([...snapshots],[[9,prior]]);
  }
  const empty=new Map();
  const noop=commitPositions(deck,[{index:0,id:'a',x:0,y:0}],{snapshots:empty});
  assert.equal(empty.size,0);assert.equal(noop.length,0);
});
