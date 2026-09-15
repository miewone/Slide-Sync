import assert from 'node:assert/strict';

/**
 * Exercise visible alignment controls against the range-selection fixture.
 * @param {object} browser DevTools client.
 * @param {Function} rectangle Existing real-pointer rectangle helper.
 */
export async function checkAlignment(browser,rectangle) {
  const actions=['left','center','right','top','middle','bottom'];
  await rectangle([20,60],[360,210]);
  await browser.evaluate(`globalThis.alignmentFrames=[...document.querySelectorAll('#stage iframe')].map(frame=>({frame,doc:frame.contentDocument}));
    globalThis.readAlignmentBox=(index,id)=>{
      const frame=document.querySelector('#slide-'+index+' iframe');
      const mover=frame.contentDocument.querySelector('[data-pptx-mover="'+id+'"]');
      const transform=new DOMMatrix(mover.style.transform||'none'),units=Number(mover.dataset.unitsPerPixel);
      return {x:Number(mover.dataset.originX)+transform.m41*units,y:Number(mover.dataset.originY)+transform.m42*units,
        w:Number(mover.dataset.originW),h:Number(mover.dataset.originH)};
    };void 0;`);
  const original=await browser.evaluate('[readAlignmentBox(0,"101"),readAlignmentBox(0,"102")]');
  const untouched=await browser.evaluate('readAlignmentBox(0,"103")');
  const left=Math.min(...original.map(item=>item.x)),top=Math.min(...original.map(item=>item.y));
  const right=Math.max(...original.map(item=>item.x+item.w)),bottom=Math.max(...original.map(item=>item.y+item.h));
  const expected={left,center:(left+right)/2,right,top,middle:(top+bottom)/2,bottom};
  for(const action of actions) {
    assert.equal(await browser.evaluate(`document.querySelector('[data-layout="${action}"]').disabled`),false,'selected items enable '+action);
    await browser.evaluate(`document.querySelector('[data-layout="${action}"]').click()`);
    const boxes=await browser.evaluate('[readAlignmentBox(0,"101"),readAlignmentBox(0,"102")]');
    const horizontal=['left','center','right'].includes(action);
    boxes.forEach((item,index)=>{
      const value=action==='left'?item.x:action==='center'?item.x+item.w/2:action==='right'?item.x+item.w:action==='top'?item.y:action==='middle'?item.y+item.h/2:item.y+item.h;
      assert.ok(Math.abs(value-expected[action])<1,action+' aligns the requested edge/center');
      assert.equal(item[horizontal?'y':'x'],original[index][horizontal?'y':'x'],'other coordinate is preserved');
    });
    const other=await browser.evaluate('[readAlignmentBox(2,"101"),readAlignmentBox(2,"102")]');
    assert.deepEqual(other,boxes,'apply alignment to all checked slides');
    assert.deepEqual(await browser.evaluate('readAlignmentBox(0,"103")'),untouched,'unselected element is unchanged');
    await browser.evaluate('document.querySelector("#undo").click()');
    assert.deepEqual(await browser.evaluate('[readAlignmentBox(0,"101"),readAlignmentBox(0,"102")]'),original,'undo '+action);
  }
  // One selected item requires slide-based alignment; checked scope excludes other slides.
  await browser.evaluate("document.querySelector('#range').value='1';document.querySelector('#apply-range').click();");
  await rectangle([380,80],[520,190]);
  assert.equal(await browser.evaluate('[...document.querySelectorAll(".alignment-group button")].every(button=>button.disabled)'),true,'single item cannot align to its selection bounds');
  await browser.evaluate("document.querySelector('#layout-target').value='slide';document.querySelector('#layout-target').dispatchEvent(new Event('change',{bubbles:true}));");
  const size=await browser.evaluate('(()=>{const box=document.querySelector("#slide-0 .hit-overlay").viewBox.baseVal;return {w:box.width,h:box.height}})()');
  const slideExpected={left:0,center:size.w/2,right:size.w,top:0,middle:size.h/2,bottom:size.h};
  for(const action of actions) {
    await browser.evaluate(`document.querySelector('[data-layout="${action}"]').click()`);
    const item=await browser.evaluate('readAlignmentBox(0,"103")');
    const value=action==='left'?item.x:action==='center'?item.x+item.w/2:action==='right'?item.x+item.w:action==='top'?item.y:action==='middle'?item.y+item.h/2:item.y+item.h;
    assert.ok(Math.abs(value-slideExpected[action])<=1,'slide '+action);
    assert.deepEqual(await browser.evaluate('readAlignmentBox(2,"103")'),untouched,'unchecked slide is unchanged');
    await browser.evaluate('document.querySelector("#undo").click()');
    assert.deepEqual(await browser.evaluate('readAlignmentBox(0,"103")'),untouched,'undo single-item alignment');
  }
  assert.equal(await browser.evaluate('alignmentFrames.every(({frame,doc})=>frame.isConnected && frame.contentDocument===doc)'),true,'alignment reuses frame documents');
  assert.equal(await browser.evaluate('rangeEncodes'),0,'alignment never encodes ZIP');
  await browser.evaluate("document.querySelector('#clear-selection').click();document.querySelector('#layout-target').value='selection';document.querySelector('#layout-target').dispatchEvent(new Event('change',{bubbles:true}));");
  assert.equal(await browser.evaluate('[...document.querySelectorAll(".alignment-group button")].every(button=>button.disabled)'),true,'no selection disables alignment');
  console.log('PASS alignment: six directions, selection/slide targets, axes, scope, undo and frame/ZIP reuse');
}
