import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';
import * as tslib from '../src/vendor/tslib.es6.js';
import {PreviewMediaResources} from '../src/services/PreviewMediaResources.js';
import {makeMediaDeckFixture} from './media-deck-fixture.mjs';

/** Build an isolated vendor environment with real ZIP parsing and tracked URL ownership. */
async function environment() {
  const created=[],revoked=[],reads=[];
  const context={console,setTimeout,clearTimeout,setImmediate,Buffer,ArrayBuffer,Uint8Array,Blob,
    URL:{createObjectURL(){const url=`blob:test-${created.length}`;created.push(url);return url;},revokeObjectURL(url){revoked.push(url);}},
    document:{createElement(){return {classList:{add(){}},style:{setProperty(){}},setAttribute(){},append(){}};}}};
  for(const file of ['jszip','lodash'])runInNewContext(await readFile(new URL(`../public/vendor/${file}.min.js`,import.meta.url),'utf8'),context);
  const JSZip=context.JSZip;
  const originalLoad=JSZip.prototype.loadAsync;
  JSZip.prototype.loadAsync=async function(...args) {
    const zip=await originalLoad.apply(this,args);
    for(const entry of Object.values(zip.files)) {
      const decode=entry.async;
      entry.async=function(type){reads.push({name:entry.name,type});return decode.call(this,type);};
    }
    return zip;
  };
  // Execute the unchanged vendor body with its normal adapter bindings supplied explicitly.
  const source=(await readFile(new URL('../src/vendor/pptx-preview.es.js',import.meta.url),'utf8'))
    .replace(/import[^;]+;/g,'').replace('export{xt as init};','globalThis.init=xt;');
  class ScopedMedia extends PreviewMediaResources {constructor(){super(context.URL);}}
  Object.assign(context,{PreviewMediaResources:ScopedMedia,t:tslib.__assign,e:tslib.__extends,a:tslib.__awaiter,r:tslib.__generator,
    n:tslib.__spreadArray,o:JSZip,c:context._.get,i:context._.omit,s:randomUUID,h:{}});
  runInNewContext(source,context);
  const {zip}=await makeMediaDeckFixture(JSZip,await readFile(new URL('../public/sample.pptx',import.meta.url)));
  const media=new Uint8Array([0,0,0,24,102,116,121,112,109,112,52,50]);
  zip.file('ppt/media/media1.mp4',media);
  const buffer=await zip.generateAsync({type:'nodebuffer'});
  reads.length=0;
  return {created,revoked,reads,JSZip,buffer,media,init:options=>context.init({append(){}},{width:960,height:540,mode:'list',...options})};
}

test('static preview repeatedly skips playable media decoding while retaining poster and original archive bytes',async()=>{
  const env=await environment();
  const preview=env.init({staticPreview:true});
  for(let iteration=0;iteration<3;iteration++) {
    const deck=await preview.load(env.buffer);
    assert.match(deck.getMedia('ppt/media/image999.png'),/^data:image\/png;base64,/);
    assert.equal(deck.getMedia('ppt/media/media1.mp4'),undefined);
    assert.equal(env.reads.some(read=>/^ppt\/media\/media/.test(read.name)),false);
    // The renderer's retained archive can still export the skipped bytes unchanged.
    const exported=await deck._zipContents.generateAsync({type:'nodebuffer'});
    const roundtrip=await env.JSZip.loadAsync(exported);
    assert.deepEqual([...await roundtrip.file('ppt/media/media1.mp4').async('uint8array')],[...env.media]);
    env.reads.length=0;
  }
  preview.destroy();
  assert.deepEqual(env.created,[]);
  assert.deepEqual(env.revoked,[]);
});

test('playable URL ownership stays isolated across instances, replacement, and destroy',async()=>{
  const env=await environment(),first=env.init(),second=env.init();
  await Promise.all([first.load(env.buffer),second.load(env.buffer)]);
  const firstURLs=Object.values(first.pptx.medias).filter(value=>value.startsWith('blob:'));
  const secondURLs=Object.values(second.pptx.medias).filter(value=>value.startsWith('blob:'));
  assert.equal(firstURLs.length,2);assert.equal(secondURLs.length,2);
  first.destroy();first.destroy();
  assert.deepEqual(env.revoked,firstURLs);
  assert.ok(secondURLs.every(url=>!env.revoked.includes(url)));
  await second.load(env.buffer);
  assert.equal(env.revoked.length,4);
  second.destroy();
  assert.equal(env.created.length,6);
  assert.equal(new Set(env.revoked).size,6);
});

test('renderer initialization failure releases decoded playable URLs',async()=>{
  const env=await environment();
  const preview=env.init();
  Object.defineProperty(preview.options,'width',{get(){throw Error('render initialization failure');}});
  await assert.rejects(preview.load(env.buffer),/render initialization failure/);
  assert.equal(env.created.length,2);
  assert.deepEqual(env.revoked,env.created);
  preview.destroy();assert.equal(env.revoked.length,2);
});

test('disposal while media decode is suspended prevents late URL creation',async()=>{
  const env=await environment(),preview=env.init();
  const originalLoad=env.JSZip.prototype.loadAsync;
  let release,started;
  const suspended=new Promise(resolve=>{started=resolve;});
  env.JSZip.prototype.loadAsync=async function(...args) {
    const zip=await originalLoad.apply(this,args),entry=zip.file('ppt/media/media1.mp4'),decode=entry.async;
    entry.async=async function(type){started();await new Promise(resolve=>{release=resolve;});return decode.call(this,type);};
    return zip;
  };
  const loading=preview.load(env.buffer);
  await suspended;
  assert.equal(env.created.length,1);
  preview.destroy();release();
  await assert.rejects(loading,/disposed/);
  assert.equal(env.created.length,1);
  assert.deepEqual(env.revoked,env.created);
});

test('a later ZIP media decoding failure releases URLs already created by the same load',async()=>{
  const env=await environment(),preview=env.init();
  const originalLoad=env.JSZip.prototype.loadAsync;
  env.JSZip.prototype.loadAsync=async function(...args) {
    const zip=await originalLoad.apply(this,args);
    zip.file('ppt/media/media1.mp4').async=async()=>{throw Error('media decode failed');};
    return zip;
  };
  await assert.rejects(preview.load(env.buffer),/media decode failed/);
  assert.equal(env.created.length,1);
  assert.deepEqual(env.revoked,env.created);
});
