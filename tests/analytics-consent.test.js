import test from 'node:test';
import assert from 'node:assert/strict';
import {AnalyticsConsent} from '../src/services/AnalyticsConsent.js';

function fixture(saved){
  let value=saved||null;const scripts=[],cookies=new Map([['editor-setting','keep'],['slide_sync_ga','test']]),events={};
  const window={location:{hostname:'app.example'},addEventListener:(name,listener)=>{events[name]=listener;}};
  const document={createElement:()=>({}),head:{append:script=>scripts.push(script)},get cookie(){return [...cookies].map(([k,v])=>k+'='+v).join('; ');},set cookie(v){cookies.delete(v.split('=')[0]);}};
  const storage={getItem:()=>value,setItem:(key,v)=>{value=v;}};
  return {window,document,storage,scripts,cookies,events,service:()=>new AnalyticsConsent({window,document,storage,measurementId:'G-TEST',now:()=>1000})};
}
test('GA4 never loads before opt-in or after a remembered refusal',()=>{
  const f=fixture(),consent=f.service();consent.start();assert.equal(f.scripts.length,0);assert.equal(f.window.dataLayer,undefined);
  consent.choose(false);assert.equal(f.scripts.length,0);f.service().start();assert.equal(f.scripts.length,0);assert.equal(f.cookies.get('editor-setting'),'keep');
});
test('explicit consent loads once; withdrawal disables GA and retains editor data',()=>{
  const f=fixture(),consent=f.service();consent.start();consent.choose(true);consent.start();
  assert.equal(f.scripts.length,1);assert.equal(f.window['ga-disable-G-TEST'],false);
  const calls=f.window.dataLayer.map(args=>Array.from(args));
  assert.deepEqual(calls[0].slice(0,2),['consent','default']);assert.equal(calls[0][2].analytics_storage,'denied');
  assert.equal(calls[1][2].analytics_storage,'granted');assert.equal(calls[1][2].ad_storage,'denied');
  consent.open();assert.equal(consent.getSnapshot().open,true);consent.choose(false);
  assert.equal(f.window['ga-disable-G-TEST'],true);assert.equal(f.cookies.has('slide_sync_ga'),false);assert.equal(f.cookies.get('editor-setting'),'keep');
});
test('expired choices require consent again and other tabs can revoke it',()=>{
  const f=fixture(JSON.stringify({version:1,id:'G-TEST',choice:'accepted',expiresAt:999})),consent=f.service();consent.start();assert.equal(f.scripts.length,0);
  consent.choose(true);f.storage.setItem('',JSON.stringify({version:1,id:'G-TEST',choice:'rejected',expiresAt:5000}));f.events.storage({key:'slide-sync-analytics-consent'});
  assert.equal(consent.getSnapshot().choice,'rejected');assert.equal(f.window['ga-disable-G-TEST'],true);
});
test('storage denial does not prevent refusal and unconfigured builds do not start analytics',()=>{
  const f=fixture(),denied={getItem(){throw Error();},setItem(){throw Error();}};
  const consent=new AnalyticsConsent({...f,storage:denied,measurementId:'G-TEST'});assert.doesNotThrow(()=>consent.choose(false));assert.equal(f.scripts.length,0);
  new AnalyticsConsent({...f,measurementId:''}).start();assert.equal(f.scripts.length,0);
});
