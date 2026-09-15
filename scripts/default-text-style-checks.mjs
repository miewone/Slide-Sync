import assert from 'node:assert/strict';

/** Verify preview and export for a presentation without package-level text defaults.
 * @param {object} browser Chrome DevTools client.
 * @param {string} origin Application URL.
 */
export async function checkMissingDefaultTextStyle(browser,origin) {
  browser.errors=[];
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled','text defaults app ready');
  await browser.evaluate(`(async()=>{
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('vendor/jszip.min.js',document.baseURI);script.onload=resolve;script.onerror=reject;document.head.append(script)});
    const zip=await JSZip.loadAsync(await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer());
    const doc=new DOMParser().parseFromString(await zip.file('ppt/presentation.xml').async('string'),'application/xml');
    const defaults=doc.getElementsByTagNameNS('*','defaultTextStyle')[0];
    if(!defaults)throw Error('Sample must contain default text style');
    defaults.remove();
    globalThis.presentationWithoutDefaults=new XMLSerializer().serializeToString(doc);
    zip.file('ppt/presentation.xml',presentationWithoutDefaults);
    const transfer=new DataTransfer();transfer.items.add(new File([await zip.generateAsync({type:'arraybuffer'})],'no-default-text-style.pptx'));
    const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await browser.until(`document.querySelector('#filename').textContent==='no-default-text-style.pptx' && !document.querySelector('#download').disabled`,'text defaults deck ready');
  await browser.until(`document.querySelectorAll('#stage iframe').length===8 && [...document.querySelectorAll('#stage iframe')].every(frame=>frame.contentDocument?.querySelector('.slide-wrapper'))`,'all slides rendered without defaults');
  assert.deepEqual(browser.errors,[],'missing defaults must not cause asynchronous master initialization errors');
  await browser.evaluate(`const generate=JSZip.prototype.generateAsync;JSZip.prototype.generateAsync=async function(...args){const result=await generate.apply(this,args);if(result instanceof Blob)globalThis.defaultsExport=result;return result;};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)click.call(this);};document.querySelector('#download').click();`);
  await browser.until('!!globalThis.defaultsExport && !document.querySelector("#download").disabled','text defaults export');
  assert.equal(await browser.evaluate(`(async()=>{const zip=await JSZip.loadAsync(await defaultsExport.arrayBuffer());return await zip.file('ppt/presentation.xml').async('string')===presentationWithoutDefaults;})()`),true,'preview must not insert defaults into the exported presentation');
  console.log('PASS missing default text style: eight rendered slides, no browser errors, unchanged presentation XML export');
}
