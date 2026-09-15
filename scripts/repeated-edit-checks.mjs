import assert from 'node:assert/strict';

/** Verify runtime-level held-arrow transactions and the position-only preview path. */
export async function checkRepeatedEdits(browser,origin) {
  browser.errors=[];
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled','repeated edit editor');
  await browser.evaluate('document.querySelector("#demo").click()');
  await browser.until('!document.querySelector("#download").disabled && document.querySelectorAll("#stage iframe").length===8','repeated edit sample');
  await browser.until('[...document.querySelectorAll("#stage iframe")].every(f=>f.contentDocument?.querySelector("[data-pptx-mover]"))','repeated edit previews');
  await browser.evaluate(`document.querySelector('#range').value='1-3';document.querySelector('#apply-range').click();document.querySelector('.slide-surface').focus();document.querySelector('.slide-surface').dispatchEvent(new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true}));`);
  await browser.until('Number(document.querySelector(".selection-number").textContent)>0','selected editable objects');
  await browser.evaluate(`globalThis.editFrames=[...document.querySelectorAll('#stage iframe')].map(frame=>({frame,doc:frame.contentDocument}));
    globalThis.editCounts={slideXml:0,textXml:0,textQueries:0,zip:0};
    const serialize=XMLSerializer.prototype.serializeToString;
    XMLSerializer.prototype.serializeToString=function(node){
      if(node.nodeType===9 && node.documentElement?.localName==='sld')editCounts.slideXml++;
      if(node.localName==='bodyPr')editCounts.textXml++;
      return serialize.call(this,node);
    };
    const descendants=Element.prototype.getElementsByTagNameNS;
    Element.prototype.getElementsByTagNameNS=function(ns,name){if(this.ownerDocument.contentType==='application/xml' && ['t','ph'].includes(name))editCounts.textQueries++;return descendants.call(this,ns,name)};
    const encode=JSZip.prototype.generateAsync;JSZip.prototype.generateAsync=function(...args){editCounts.zip++;return encode.apply(this,args)};
    globalThis.firstMover=()=>editFrames[0].doc.querySelector('[data-pptx-mover]');
    globalThis.moveDistance=()=>new DOMMatrix(firstMover().style.transform||'none').m41*Number(firstMover().dataset.unitsPerPixel);
    globalThis.textBefore=editFrames.map(({doc})=>[...doc.querySelectorAll('.text-wrapper')].map(node=>node.outerHTML));void 0;`);
  const down=async(key,repeat=false)=>browser.send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,autoRepeat:repeat,windowsVirtualKeyCode:key==='ArrowRight'?39:37});
  const up=async key=>browser.send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:key==='ArrowRight'?39:37});
  const undo=async()=>{await browser.evaluate('document.querySelector("#undo").click()');await browser.evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');};
  for(let i=0;i<30;i++)await down('ArrowRight',i>0);
  await up('ArrowRight');
  const counts=await browser.evaluate('editCounts');
  assert.equal(counts.slideXml,3,'30 keydowns serialize each changed slide only once');
  assert.equal(counts.textXml,0,'pure movement never serializes text style');
  assert.equal(counts.textQueries,0,'pure movement reuses text eligibility');
  assert.equal(counts.zip,0,'held arrows do not encode ZIP');
  assert.ok(Math.abs(await browser.evaluate('moveDistance()')-30*36000)<1,'all repeated keydowns update preview position');
  assert.deepEqual(await browser.evaluate('editFrames.map(({doc})=>[...doc.querySelectorAll(".text-wrapper")].map(node=>node.outerHTML))'),await browser.evaluate('textBefore'),'movement does not rewrite text DOM');
  await undo();
  assert.ok(Math.abs(await browser.evaluate('moveDistance()'))<1,'one undo restores the full held-key gesture');
  assert.equal(await browser.evaluate('document.querySelector("#undo").disabled'),true,'one held-key history item');
  // Releasing the key separates transactions.
  await browser.evaluate('document.querySelector(".slide-surface").focus()');
  await down('ArrowRight');await down('ArrowRight',true);await up('ArrowRight');
  await down('ArrowRight');await down('ArrowRight',true);await down('ArrowRight',true);await up('ArrowRight');
  await undo();assert.ok(Math.abs(await browser.evaluate('moveDistance()')-2*36000)<1,'key release creates a separate history entry');
  await undo();assert.ok(Math.abs(await browser.evaluate('moveDistance()'))<1);
  // CSS serializes large pixel values at reduced precision, so boundary undo uses the native-coordinate field.
  // Force a rejected nudge at the position limit; a subsequent valid key starts a new transaction.
  await browser.evaluate('document.querySelector("#clear-selection").click()');
  const point=await browser.evaluate('(()=>{const r=document.querySelector(".slide-surface").getBoundingClientRect();return {x:r.left+r.width*.3,y:r.top+r.height*.01}})()');
  await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
  await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
  await browser.until('Number(document.querySelector(".selection-number").textContent)===3','single object per slide');
  await browser.evaluate("document.querySelector('#move-mode').value='absolute';document.querySelector('#move-mode').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#x').value='999.9';document.querySelector('#y').value='0';document.querySelector('#move').click();document.querySelector('.slide-surface').focus();");
  await down('ArrowRight');
  await down('ArrowRight',true);
  await browser.until('!document.querySelector("#notice").hidden','invalid nudge rejected');
  await down('ArrowLeft');await up('ArrowLeft');
  await undo();assert.equal(await browser.evaluate('Number(document.querySelector("#x").value)'),1000,'error terminates nudge coalescing');
  await undo();assert.equal(await browser.evaluate('Number(document.querySelector("#x").value)'),999.9,'previous valid nudge remains undoable');
  await undo();assert.ok(Math.abs(await browser.evaluate('moveDistance()'))<1,'initial numeric move remains undoable');
  assert.equal(await browser.evaluate('editFrames.every(({frame,doc})=>frame.isConnected && frame.contentDocument===doc)'),true,'repeat edits and undo preserve frames');
  assert.deepEqual(browser.errors,[],'repeated edit browser errors');
  console.log('PASS repeated edits: 30 keydowns / 3 slide snapshots, zero text reprocessing, exact undo, key-release/error boundaries and stable frames');
}
