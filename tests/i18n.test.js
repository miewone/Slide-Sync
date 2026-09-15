import {test} from 'node:test';
import assert from 'node:assert/strict';
import {I18n} from '../src/i18n/I18n.js';
import {messages} from '../src/i18n/messages.js';

test('every message has Korean and English with identical placeholders',()=>{
  const slots=text=>[...text.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
  for(const [key,value] of Object.entries(messages)){
    assert.equal(typeof value.ko,'string',key);assert.equal(typeof value.en,'string',key);
    assert.ok(value.ko&&value.en,key);assert.deepEqual(slots(value.ko),slots(value.en),key);
  }
});
test('language preference persists, invalid values are ignored and storage denial is harmless',()=>{
  let saved='en',changes=0;
  const storage={getItem:()=>saved,setItem:(key,value)=>{assert.equal(key,'slide-sync-language');saved=value;}};
  const service=new I18n({storage}),stop=service.subscribe(()=>changes++);
  assert.equal(service.getLanguage(),'en');service.setLanguage('ko');assert.equal(saved,'ko');assert.equal(changes,1);
  service.setLanguage('unsupported');service.setLanguage('ko');assert.equal(changes,1);
  stop();service.setLanguage('en');assert.equal(changes,1);
  const denied=new I18n({storage:{getItem(){throw Error();},setItem(){throw Error();}}});
  assert.equal(denied.getLanguage(),'ko');assert.doesNotThrow(()=>denied.setLanguage('en'));
  assert.equal(denied.translate('Header.5'),'Open PPTX');
});
test('substitution reorders values without interpreting uploaded strings as markup or more placeholders',()=>{
  const service=new I18n({storage:null});service.setLanguage('en');
  assert.equal(service.translate('createEditorRuntime.9',{p0:2,p1:5}),'Selected 5 elements on 2 slides.');
  assert.equal(service.translate('RecentFiles.10',{p0:'<img>{p0}한글.pptx'}),'Remove stored file: <img>{p0}한글.pptx');
});

test('browser preference chooses a supported language unless a stored selection overrides it',()=>{
  assert.equal(new I18n({storage:null,languages:['en-US','ko-KR']}).getLanguage(),'en');
  assert.equal(new I18n({storage:null,languages:['ko-KR','en-US']}).getLanguage(),'ko');
  assert.equal(new I18n({storage:null,languages:['fr-FR','en-GB']}).getLanguage(),'en');
  assert.equal(new I18n({storage:null,languages:['ja-JP']}).getLanguage(),'ko');
  assert.equal(new I18n({storage:{getItem:()=> 'ko'},languages:['en-US']}).getLanguage(),'ko');
  assert.equal(new I18n({storage:{getItem:()=> 'invalid'},languages:['en-US']}).getLanguage(),'en');
});
