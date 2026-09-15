import assert from 'node:assert/strict';
import {makeDeckFixture} from '../tests/deck-fixtures.mjs';

/** @param {object} JSZip ZIP reader. @param {ArrayBuffer} sample Source fixture. @param {number} count Slides. */
async function deletionFixture(JSZip,sample,count) {
  const zip=await JSZip.loadAsync(await globalThis.makeDeckFixture(JSZip,sample,count));
  const shape=(id,name,x)=>`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x*12700}" y="1270000"/><a:ext cx="1524000" cy="889000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="7799DD"/></a:solidFill></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${name}</a:t></a:r></a:p></p:txBody></p:sp>`;
  const group=`<p:grpSp><p:nvGrpSpPr><p:cNvPr id="200" name="GROUP"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="6350000" y="1270000"/><a:ext cx="1524000" cy="889000"/><a:chOff x="6350000" y="1270000"/><a:chExt cx="1524000" cy="889000"/></a:xfrm></p:grpSpPr>${shape(201,'CHILD',500)}</p:grpSp>`;
  for(let index=1;index<=count;index++) {
    const path=`ppt/slides/slide${index}.xml`,doc=new DOMParser().parseFromString(await zip.file(path).async('string'),'application/xml');
    const tree=doc.getElementsByTagNameNS('*','spTree')[0];
    for(const node of [...tree.children])if(!['nvGrpSpPr','grpSpPr'].includes(node.localName))node.remove();
    zip.file(path,new XMLSerializer().serializeToString(doc).replace('</p:spTree>',shape(101,'REMOVE',100)+shape(102,'KEEP',300)+group+'</p:spTree>'));
  }
  return zip.generateAsync({type:'arraybuffer'});
}

/** @param {object} browser DevTools client. @param {string} origin App origin. */
export async function checkDeletion(browser,origin) {
  browser.errors=[];await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo")&&!document.querySelector("#demo").disabled','deletion ready');
  await browser.evaluate(`(async()=>{
    globalThis.makeDeckFixture=${makeDeckFixture.toString()};globalThis.deletionFixture=${deletionFixture.toString()};
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('vendor/jszip.min.js',document.baseURI);script.onload=resolve;script.onerror=reject;document.head.append(script)});
    globalThis.deleteSource=await deletionFixture(JSZip,await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer(),12);
    const transfer=new DataTransfer();transfer.items.add(new File([deleteSource],'delete.pptx'));
    const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await browser.until('!document.querySelector("#download").disabled','deletion deck loaded');
  const count=()=>browser.evaluate('Number(document.querySelector(".selection-number").textContent)');
  const click=async(x,index=0)=>{
    const point=await browser.evaluate(`(()=>{const r=document.querySelector('#slide-${index} .slide-surface').getBoundingClientRect();return {x:r.left+${x}/960*r.width,y:r.top+135/540*r.height}})()`);
    await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
    await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
  };
  const hidden=(id,index=0)=>browser.evaluate(`document.querySelector('#slide-${index} iframe').contentDocument.querySelector('[data-pptx-mover="${id}"]').hidden`);
  await click(150);assert.equal(await count(),12);
  await browser.evaluate(`globalThis.deleteFrames=[...document.querySelectorAll('#stage iframe')].map(frame=>({frame,doc:frame.contentDocument}));
    globalThis.deleteEncodes=0;const originalGenerate=JSZip.prototype.generateAsync;JSZip.prototype.generateAsync=function(...args){deleteEncodes++;return originalGenerate.apply(this,args);};void 0;`);
  // Native text editing and composition must never delete selected elements.
  await browser.evaluate('document.querySelector("#x").focus();document.querySelector("#x").value="12"');
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
  assert.equal(await count(),12);assert.equal(await hidden('101'),false);
  await browser.evaluate('document.querySelector("#slide-0 .slide-surface").focus();document.querySelector("#slide-0 .slide-surface").dispatchEvent(new KeyboardEvent("keydown",{key:"Delete",isComposing:true,bubbles:true}))');
  assert.equal(await count(),12);
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Delete',code:'Delete',windowsVirtualKeyCode:46});
  assert.equal(await count(),0);assert.equal(await hidden('101'),true);assert.equal(await hidden('102'),false);
  assert.equal(await browser.evaluate('document.querySelector("#delete-selection").disabled'),true);
  await browser.evaluate(`const input=document.querySelector('#element-search-query');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'REMOVE');input.dispatchEvent(new Event('input',{bubbles:true}));`);
  await browser.until('document.querySelector("#element-search-count").textContent.includes("0개 요소")','deleted text leaves search index');
  await browser.evaluate('document.querySelector("#undo").click()');
  assert.equal(await count(),12);assert.equal(await hidden('101'),false);
  await browser.until('document.querySelector("#element-search-count").textContent.includes("12개 요소")','undo restores search index');
  await browser.evaluate('document.querySelector("#range").value="1,3";document.querySelector("#apply-range").click()');
  assert.equal(await count(),2);
  await browser.evaluate('document.querySelector("#delete-selection").click()');
  assert.equal(await hidden('101'),true);assert.equal(await hidden('101',1),false);assert.equal(await hidden('101',2),true);
  await browser.evaluate('document.querySelector("#select-all").click()');assert.equal(await count(),10,'unchecked selections preserved');
  await browser.evaluate('document.querySelector("#undo").click()');assert.equal(await count(),12);
  // Group deletion is atomic and Backspace behaves like the delete button.
  await browser.evaluate('document.querySelector("#clear-selection").click()');await click(550);assert.equal(await count(),12);
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
  assert.equal(await hidden('200'),true);assert.equal(await hidden('102'),false);
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'z',code:'KeyZ',modifiers:2,windowsVirtualKeyCode:90});
  assert.equal(await hidden('200'),false);assert.equal(await count(),12);
  assert.equal(await browser.evaluate('deleteEncodes'),0,'delete and undo do not encode ZIP');
  assert.equal(await browser.evaluate('deleteFrames.every(({frame,doc})=>frame.contentDocument===doc)'),true,'delete and undo retain preview documents');
  // Intercept export before navigation/download, then inspect original XML after deletion.
  await browser.evaluate(`document.querySelector('#clear-selection').click();globalThis.deletedDownload=null;
    const originalCreateURL=URL.createObjectURL;URL.createObjectURL=function(blob){globalThis.deletedDownload=blob.arrayBuffer();return originalCreateURL.call(this,blob);};
    const originalClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)originalClick.call(this);};`);
  await click(150);await browser.evaluate('document.querySelector("#delete-selection").click();document.querySelector("#download").click()');
  await browser.until('!!deletedDownload&&!document.querySelector("#download").disabled','deleted export ready');
  const exported=await browser.evaluate(`(async()=>{const zip=await JSZip.loadAsync(await deletedDownload);const results=[];for(let i=1;i<=12;i++){const xml=await zip.file('ppt/slides/slide'+i+'.xml').async('string');const doc=new DOMParser().parseFromString(xml,'application/xml');const ids=[...doc.getElementsByTagNameNS('*','cNvPr')].map(n=>n.getAttribute('id'));results.push(!ids.includes('101')&&ids.includes('102')&&ids.includes('200')&&ids.includes('201'));}return results.every(Boolean);})()`);
  assert.equal(exported,true,'all selected slides export without deleted objects, preserving other objects and group children');
  assert.deepEqual(browser.errors,[]);
  console.log('PASS deletion: click/button/Delete/Backspace, input/IME guards, checked scope, groups, undo, retained frames and export across 12 slides');
}
