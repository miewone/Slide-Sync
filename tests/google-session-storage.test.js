import test from 'node:test';
import assert from 'node:assert/strict';
import {GoogleSession,DRIVE_SCOPE} from '../src/services/google/GoogleSession.js';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};

test('reload restores an unexpired token and page teardown does not delete it',()=>{
  const store=storage(),config={clientId:'client',appId:'123',storage:store},first=new GoogleSession(config);
  first.accessToken='test-access';first.expiresAt=Date.now()+300000;first.saveStored();first.clearMemory();
  assert.equal(new GoogleSession(config).token(),'test-access');
  assert.throws(()=>new GoogleSession({...config,clientId:'another-client'}).token());
  assert.throws(()=>new GoogleSession({...config,appId:'456'}).token());
});
test('expired, corrupt and wrong-scope records are deleted; disconnect survives reload',()=>{
  const store=storage(),config={clientId:'client',appId:'123',storage:store},session=new GoogleSession(config),key=session.storageKey;
  for(const value of ['broken',JSON.stringify({accessToken:'test',expiresAt:Date.now()-1,scope:DRIVE_SCOPE}),JSON.stringify({accessToken:'test',expiresAt:Date.now()+10000,scope:'wrong'})]){
    store.setItem(key,value);assert.throws(()=>new GoogleSession(config).token());assert.equal(store.getItem(key),null);
  }
  session.accessToken='test';session.expiresAt=Date.now()+10000;session.saveStored();session.disconnect();
  assert.throws(()=>new GoogleSession(config).token());assert.equal(store.getItem(key),null);
});
test('storage denial falls back to memory without losing successful authorization',()=>{
  const denied={getItem(){throw new Error();},setItem(){throw new Error();},removeItem(){throw new Error();}};
  const session=new GoogleSession({storage:denied});session.accessToken='test';session.expiresAt=Date.now()+10000;
  assert.doesNotThrow(()=>session.saveStored());assert.equal(session.token(),'test');assert.doesNotThrow(()=>session.disconnect());
});
