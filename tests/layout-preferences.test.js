import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LayoutPreferences} from '../src/services/LayoutPreferences.js';

test('saved widths are versioned, bounded and tolerant of damaged or inaccessible storage',()=>{
  let raw=null;const storage={getItem:()=>raw,setItem:(key,value)=>{assert.equal(key,'slide-sync-panel-widths');raw=value;}};
  const preferences=new LayoutPreferences({storage});assert.deepEqual(preferences.load(),{left:216,right:278});
  assert.equal(preferences.save({left:300,right:360}),true);assert.deepEqual(preferences.load(),{left:300,right:360});
  raw='broken';assert.deepEqual(preferences.load(),{left:216,right:278});
  raw=JSON.stringify({version:99,left:400,right:400});assert.deepEqual(preferences.load(),{left:216,right:278});
  assert.deepEqual(LayoutPreferences.normalize({left:-200,right:9999}),{left:160,right:480});
  assert.deepEqual(LayoutPreferences.normalize({left:'320',right:Infinity}),{left:216,right:278});
  const denied=new LayoutPreferences({storage:{getItem(){throw Error();},setItem(){throw Error();}}});
  assert.deepEqual(denied.load(),{left:216,right:278});assert.equal(denied.save({left:200,right:250}),false);
});
test('dragging either divider preserves the center minimum and does not mutate preferences',()=>{
  const widths={left:216,right:278};
  assert.deepEqual(LayoutPreferences.resize(widths,'left',100,1440),{left:316,right:278});
  assert.deepEqual(LayoutPreferences.resize(widths,'right',-100,1440),{left:216,right:378});
  for(const side of ['left','right']){
    const result=LayoutPreferences.resize(widths,side,side==='left'?10000:-10000,900);
    assert.ok(900-result.left-result.right-12>=300);
  }
  const fitted=LayoutPreferences.fit({left:480,right:480},851);
  assert.ok(fitted.left>=160&&fitted.right>=220);assert.ok(851-fitted.left-fitted.right-12>=300);
  assert.deepEqual(widths,{left:216,right:278});
});
