import test from 'node:test';
import assert from 'node:assert/strict';
import {GoogleFiles} from '../src/services/google/GoogleFiles.js';
import {GoogleSession,PPTX_MIME,SLIDES_MIME} from '../src/services/google/GoogleSession.js';
import {NativeSlidesDocument} from '../src/editor/google/NativeSlidesDocument.js';
import {nativeSlidesFixture} from './native-slides-fixture.js';
const session={token:()=> 'test-token',disconnect(){}};
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers});
const metadata={id:'presentation_1',name:'Native deck',mimeType:SLIDES_MIME,version:'1',capabilities:{canEdit:true,canCopy:true}};

test('original Slides save is one revision-controlled batch and never uploads a converted package',async()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture());model.move(new Set([0]),new Set(['shape_1']),1,0);
  const calls=[],client=new GoogleFiles(session,async(url,options)=>{
    calls.push({url,options});return options.method==='POST'?json({writeControl:{requiredRevisionId:'r2'}}):json(nativeSlidesFixture());
  });
  await client.saveSlides(model,{mode:'original',name:'Native deck',source:metadata});
  assert.equal(calls.length,2);const body=JSON.parse(calls[1].options.body);
  assert.equal(body.writeControl.requiredRevisionId,'revision_1');assert.equal(body.requests.length,1);
  assert.match(calls[1].url,/presentations\/presentation_1:batchUpdate$/);assert.equal(model.dirty,false);assert.equal(model.original.revisionId,'r2');
});
test('native copy preserves IDs and applies changes only to the copy using its revision',async()=>{
  const fixture=nativeSlidesFixture(),model=new NativeSlidesDocument(fixture);model.remove(new Set([0]),new Set(['shape_1']));
  const copy={...structuredClone(fixture),presentationId:'copy_1',revisionId:'copy_revision',title:'Copy'};
  const calls=[],client=new GoogleFiles(session,async(url,options)=>{
    calls.push({url,options});if(url.includes('/copy?'))return json({...metadata,id:'copy_1',name:'Copy'});
    if(url.endsWith(':batchUpdate'))return json({writeControl:{requiredRevisionId:'saved_revision'}});
    return json(url.endsWith('/copy_1')?copy:fixture);
  });
  await client.saveSlides(model,{mode:'copy',name:'Copy',folderId:'folder_1',source:metadata});
  assert.deepEqual(JSON.parse(calls[1].options.body),{name:'Copy',parents:['folder_1']});
  assert.match(calls[3].url,/copy_1:batchUpdate$/);assert.equal(JSON.parse(calls[3].options.body).writeControl.requiredRevisionId,'copy_revision');
  assert.equal(model.original.presentationId,'copy_1');assert.equal(model.original.slides[0].pageElements.some(e=>e.objectId==='shape_1'),false);
});
test('conflict prevents original writes; failed copy reports its ID and retains pending changes',async()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture());model.move(new Set([0]),new Set(['shape_1']),1,0);
  let calls=0;
  const conflict=new GoogleFiles(session,async()=>{calls++;return json({...nativeSlidesFixture(),revisionId:'changed'});});
  await assert.rejects(conflict.saveSlides(model,{mode:'original',name:'N',source:metadata}));assert.equal(calls,1);assert.equal(model.dirty,true);
  const client=new GoogleFiles(session,async(url)=>{
    if(url.includes('/copy?'))return json({...metadata,id:'copy_1'});
    if(url.endsWith('/copy_1'))return json({...nativeSlidesFixture(),presentationId:'copy_1',revisionId:'copy'});
    if(url.endsWith(':batchUpdate'))return json({},400);
    return json(nativeSlidesFixture());
  });
  await assert.rejects(client.saveSlides(model,{mode:'copy',name:'Copy',source:metadata}),error=>error.createdFile.id==='copy_1');assert.equal(model.dirty,true);
});
test('PPTX save uses exported bytes, explicit folder and conditional replacement',async()=>{
  const source={...metadata,mimeType:PPTX_MIME},calls=[];
  const client=new GoogleFiles(session,async(url,options)=>{
    calls.push({url,options});
    if(url.includes('uploadType=resumable'))return new Response(null,{headers:{Location:'https://www.googleapis.com/upload/session'}});
    return json(source,200,{'ETag':'"v1"'});
  });
  const blob=new Blob(['original package bytes']);
  await client.savePptx(blob,{mode:'original',name:source.name,source});
  assert.equal(calls[1].options.method,'PATCH');assert.equal(calls[1].options.headers.get('If-Match'),'"v1"');assert.equal(calls[2].options.body,blob);
  calls.length=0;
  await client.savePptx(blob,{mode:'copy',name:'New deck',folderId:'folder'});
  assert.equal(calls[0].options.method,'POST');assert.deepEqual(JSON.parse(calls[0].options.body),{name:'New deck.pptx',mimeType:PPTX_MIME,parents:['folder']});
});
test('PPTX protects against missing ETags, concurrent edits, oversized streams and untrusted upload URLs',async()=>{
  const source={...metadata,mimeType:PPTX_MIME};
  for(const headers of [{}, {ETag:'"v1"'}]){
    let calls=0;const client=new GoogleFiles(session,async()=>{calls++;return json({...source,version:headers.ETag?'2':'1'},200,headers);});
    await assert.rejects(client.savePptx(new Blob(['x']),{mode:'original',name:'x',source}));assert.equal(calls,1);
  }
  const unsafe=new GoogleFiles(session,async()=>new Response(null,{headers:{Location:'https://evil.example/upload'}}));
  await assert.rejects(unsafe.savePptx(new Blob(['x']),{mode:'copy',name:'x'}));
  const big=new GoogleFiles(session,async url=>url.includes('alt=media')?new Response('x',{headers:{'Content-Length':String(51*1024*1024)}}):json(source));
  await assert.rejects(big.openPptx(source.id));
});
test('expired/denied credentials and network errors do not trigger automatic write retries',async()=>{
  let calls=0,disconnected=false;const client=new GoogleFiles({token:()=> 'token',disconnect:()=>{disconnected=true;}},async()=>{calls++;return json({},401);});
  await assert.rejects(client.metadata('x'));assert.equal(calls,1);assert.equal(disconnected,true);
  const s=new GoogleSession();assert.throws(()=>s.token());s.accessToken='token';s.expiresAt=Date.now()+10000;assert.equal(s.token(),'token');s.disconnect();assert.throws(()=>s.token());
});


test('fetch adapters are called without binding the transport as a browser receiver',async()=>{
  const client=new GoogleFiles(session,async function(){
    assert.equal(this,undefined,'native Window.fetch cannot receive a GoogleFiles instance');
    return json(metadata);
  });
  assert.equal((await client.metadata(metadata.id)).id,metadata.id);
});
