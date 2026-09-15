import assert from 'node:assert/strict';
import {makeMediaDeckFixture} from '../tests/media-deck-fixture.mjs';

/** @param {object} browser DevTools client. @param {string} origin Built or development application URL. */
export async function checkStaticMedia(browser,origin) {
  browser.errors=[];
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled','media app ready');
  await browser.evaluate(`(async()=>{
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('vendor/jszip.min.js',document.baseURI);script.onload=resolve;script.onerror=reject;document.head.append(script)});
    const sample=await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer();
    globalThis.makeMediaDeckFixture=${makeMediaDeckFixture.toString()};
    globalThis.mediaFixture=await makeMediaDeckFixture(JSZip,sample);
    globalThis.mediaBuffer=await mediaFixture.zip.generateAsync({type:'arraybuffer'});
    globalThis.mediaDecodes=0;
    const load=JSZip.prototype.loadAsync;
    JSZip.prototype.loadAsync=async function(...args){const zip=await load.apply(this,args);const entry=zip.file('ppt/media/media1.wav');if(entry){const decode=entry.async;entry.async=function(...args){mediaDecodes++;return decode.apply(this,args)}}return zip;};
    globalThis.openMediaFixture=name=>{const transfer=new DataTransfer();transfer.items.add(new File([mediaBuffer],name));const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));};
  })()`);
  for(let iteration=0;iteration<3;iteration++) {
    await browser.evaluate(`openMediaFixture('media-${iteration}.pptx')`);
    await browser.until(`document.querySelector('#filename').textContent==='media-${iteration}.pptx' && !document.querySelector('#download').disabled`,'media deck ready');
    await browser.until(`!!document.querySelector('#stage iframe')?.contentDocument?.querySelector('img[src="data:image/png;base64,'+mediaFixture.poster+'"]')?.naturalWidth`,'poster image decoded');
    assert.equal(await browser.evaluate('mediaDecodes'),0,'static preview never decodes playable media');
    assert.equal(await browser.evaluate(`[...document.querySelectorAll('#stage iframe')].some(frame=>frame.contentDocument?.querySelector('audio,video'))`),false);
  }
  await browser.evaluate(`const generate=JSZip.prototype.generateAsync;JSZip.prototype.generateAsync=async function(...args){const result=await generate.apply(this,args);if(result instanceof Blob)globalThis.mediaExport=result;return result;};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)click.call(this);};document.querySelector('#download').click();`);
  await browser.until('!!globalThis.mediaExport && !document.querySelector("#download").disabled','media export');
  assert.equal(await browser.evaluate(`(async()=>{const zip=await JSZip.loadAsync(await mediaExport.arrayBuffer());const media=await zip.file('ppt/media/media1.wav').async('uint8array');return media.length===mediaFixture.wav.length && media.every((value,index)=>value===mediaFixture.wav[index]) && await zip.file('ppt/media/image999.png').async('base64')===mediaFixture.poster;})()`),true,'export preserves WAV and poster bytes');
  assert.deepEqual(browser.errors,[],'media browser errors');
  console.log('PASS media: repeated static loads skip WAV decoding, poster decodes, export retains media bytes');
}
