import assert from 'node:assert/strict';

/** Verify that invalid package XML reports its location and preserves the open deck.
 * @param {object} browser Chrome DevTools client.
 * @param {string} origin Application URL.
 */
export async function checkXmlErrors(browser,origin) {
  browser.errors=[];
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled','XML diagnostics ready');
  await browser.evaluate('document.querySelector("#demo").click()');
  await browser.until('!document.querySelector("#download").disabled','baseline loaded');
  const filename=await browser.evaluate('document.querySelector("#filename").textContent');
  for(const path of ['ppt/slides/slide1.xml','ppt/_rels/presentation.xml.rels','ppt/viewProps.xml']) {
    await browser.evaluate(`(async()=>{
      const zip=await JSZip.loadAsync(await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer());
      zip.file(${JSON.stringify(path)},'<broken><child></broken>');
      const transfer=new DataTransfer();transfer.items.add(new File([await zip.generateAsync({type:'arraybuffer'})],'invalid-xml.pptx'));
      const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    await browser.until(`!document.querySelector('#demo').disabled && document.body.innerText.includes(${JSON.stringify(path)})`,'failed XML part reported');
    const message=await browser.evaluate('document.body.innerText');
    assert.match(message,/line 1|줄 1|1행/i,'browser parser location is visible');
    assert.equal(await browser.evaluate('document.querySelector("#filename").textContent'),filename,'previous deck retained');
    assert.equal(await browser.evaluate('document.querySelector("#download").disabled'),false,'previous deck remains downloadable');
  }
  // Model the affected browser: DOMParser rejects an actual U+FEFF in string input.
  // Our local Chrome accepts it, so using only its native parser would miss this regression.
  await browser.evaluate(`globalThis.nativeXmlParser=DOMParser.prototype.parseFromString;DOMParser.prototype.parseFromString=function(source,type){return nativeXmlParser.call(this,type==='application/xml' && source.startsWith(String.fromCharCode(0xFEFF))?'invalid-prefix<root/>':source,type);};`);
  for(const [index,prefix] of ['\uFEFF','\u00EF\u00BB\u00BF','\uFEFF\u00EF\u00BB\u00BF'].entries()) {
    await browser.evaluate(`(async()=>{
      const zip=await JSZip.loadAsync(await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer());
      globalThis.bomParts={};
      for(const path of ['ppt/presentation.xml','ppt/slides/slide1.xml','ppt/_rels/presentation.xml.rels','ppt/viewProps.xml']){
        const source=await zip.file(path).async('string');
        bomParts[path]=${JSON.stringify(prefix)}+source.replace(/^\uFEFF/,'');zip.file(path,bomParts[path]);
      }
      const transfer=new DataTransfer();transfer.items.add(new File([await zip.generateAsync({type:'arraybuffer'})],${JSON.stringify(`bom-${index}.pptx`)}));
      const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    await browser.until(`document.querySelector('#filename').textContent===${JSON.stringify(`bom-${index}.pptx`)} && !document.querySelector('#download').disabled`,'BOM presentation loaded');
    await browser.until(`document.querySelectorAll('#stage iframe').length===8 && [...document.querySelectorAll('#stage iframe')].every(frame=>frame.contentDocument?.querySelector('.slide-wrapper'))`,'BOM slides rendered');
  }
  await browser.evaluate('DOMParser.prototype.parseFromString=nativeXmlParser;');
  await browser.evaluate(`const generate=JSZip.prototype.generateAsync;JSZip.prototype.generateAsync=async function(...args){const result=await generate.apply(this,args);if(result instanceof Blob)globalThis.bomExport=result;return result;};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)click.call(this);};document.querySelector('#download').click();`);
  await browser.until('!!globalThis.bomExport && !document.querySelector("#download").disabled','BOM export');
  assert.equal(await browser.evaluate(`(async()=>{const zip=await JSZip.loadAsync(await bomExport.arrayBuffer());for(const [path,source] of Object.entries(bomParts)){if(await zip.file(path).async('string')!==source)return false;}return true;})()`),true,'BOM normalization must not alter original package parts');
  assert.deepEqual(browser.errors,[]);
  console.log('PASS XML: invalid parts report location and retain previous deck; BOM variants render and preserve exported parts');
}
