import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorStore} from '../src/editor/EditorStore.js';
import {PreviewViewport} from '../src/editor/PreviewViewport.js';
import {deckHasCharts} from '../src/editor/chart-dependencies.js';
import {init} from '../src/vendor/echarts-adapter.js';

test('unchanged display rows neither notify nor replace stable row identities', () => {
  const store=new EditorStore();let notifications=0;
  store.subscribe(()=>notifications++);
  store.updateSlides([{index:0,title:'A',checked:true},{index:1,title:'B',checked:true}]);
  const previous=store.getSnapshot().slides;
  store.updateSlides(previous.map(row=>({...row})));
  assert.equal(store.getSnapshot().slides,previous);assert.equal(notifications,1);
  store.updateSlides([{...previous[0],checked:false},{...previous[1]}]);
  assert.equal(store.getSnapshot().slides[1],previous[1]);assert.equal(notifications,2);
  const selection={count:1,slides:1,size:'1 cm',rows:[{index:0,label:'A'}]};
  store.updateSelection(selection);const snapshot=store.getSnapshot();
  store.updateSelection({...selection,rows:selection.rows.map(row=>({...row}))});
  assert.equal(store.getSnapshot(),snapshot);
});

test('viewport ignores obsolete records and intersects dirty indices with nearby visible surfaces', () => {
  const Original=globalThis.IntersectionObserver;
  let notify;
  globalThis.IntersectionObserver=class {constructor(callback){notify=callback;}observe(){}disconnect(){}};
  try {
    const entered=[];
    const viewport=new PreviewViewport({root:{},onEnter:index=>entered.push(index)});
    const a={card:{hidden:false},surface:{dataset:{slide:'0'}}};
    const b={card:{hidden:true},surface:{dataset:{slide:'1'}}};
    viewport.register(0,a);viewport.register(1,b);
    notify([{target:a.surface,isIntersecting:true},{target:b.surface,isIntersecting:true}]);
    assert.deepEqual([...viewport.surfaces([0,1,2])],[a.surface]);
    assert.deepEqual(entered,[0,1]);
    viewport.reset();
    notify([{target:a.surface,isIntersecting:true}]);
    assert.deepEqual(viewport.indices(),[]);
  } finally {globalThis.IntersectionObserver=Original;}
});

test('focused viewport excludes other slides even when stale observer records arrive',()=>{
  const Original=globalThis.IntersectionObserver;let notify;
  globalThis.IntersectionObserver=class{constructor(callback){notify=callback;}observe(){}disconnect(){}};
  try{
    const entered=[],viewport=new PreviewViewport({root:{},onEnter:i=>entered.push(i)});
    const entries=[0,1,2].map(i=>({card:{hidden:false},surface:{dataset:{slide:String(i)}}}));
    entries.forEach((entry,i)=>viewport.register(i,entry));
    notify(entries.map(e=>({target:e.surface,isIntersecting:true})));entered.length=0;
    viewport.focus(1);notify(entries.map(e=>({target:e.surface,isIntersecting:true})));
    assert.deepEqual(entered,[1]);assert.deepEqual(viewport.indices(),[1]);assert.deepEqual([...viewport.surfaces([0,1,2])],[entries[1].surface]);
    assert.equal(viewport.isNearby(0),false);
    viewport.focus(null);notify(entries.map(e=>({target:e.surface,isIntersecting:true})));
    assert.deepEqual(viewport.indices(),[0,1,2]);viewport.reset();
  }finally{globalThis.IntersectionObserver=Original;}
});

test('chart references in inherited parts are detected and shared documents scanned once', () => {
  let scans=0;
  const plain={getElementsByTagNameNS(){scans++;return [];}};
  const chart={getElementsByTagNameNS(ns,name){assert.equal(name,'chart');assert.ok(ns.endsWith('/chart'));return [{}];}};
  assert.equal(deckHasCharts({slides:[{doc:plain,layout:plain,master:plain},{doc:plain}]}),false);
  assert.equal(scans,1);
  assert.equal(deckHasCharts({slides:[{doc:plain,layout:chart}]}),true);
});

test('chart adapter supports a chart-free module load followed by a chart deck', () => {
  const original=globalThis.echarts;delete globalThis.echarts;
  try {
    assert.throws(()=>init('host'),/차트 렌더러/);
    globalThis.echarts={init:host=>({host})};
    assert.deepEqual(init('later-chart'),{host:'later-chart'});
  } finally {if(original===undefined)delete globalThis.echarts;else globalThis.echarts=original;}
});
