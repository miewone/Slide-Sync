import {checkPreviewZoom} from './preview-zoom-checks.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

/** Test PPTX XML dimensions, group coordinates, table grids, export preservation and undo. @param {object} browser DevTools client. @param {string} origin Dev server. */
export async function checkResizeXml(browser,origin){
  await browser.navigate(origin);
  const result=await browser.evaluate(`(async()=>{
    const core=await import('/src/editor/core.js'),{ElementResize}=await import('/src/editor/ElementResize.js'),{previewResources}=await import('/src/services/PreviewResources.js');
    const Zip=await previewResources.loadZip(),deck=await core.loadDeck(await (await fetch('/sample.pptx')).arrayBuffer(),Zip),slide=deck.slides[0];
    const tree=core.descendants(slide.doc,'spTree')[0];
    const text='<p:sp><p:nvSpPr><p:cNvPr id="901" name="rotated"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm rot="2700000"><a:off x="1000000" y="2000000"/><a:ext cx="3000000" cy="2000000"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1800"/><a:t>Keep text</a:t></a:r></a:p></p:txBody></p:sp>';
    const group='<p:grpSp><p:nvGrpSpPr><p:cNvPr id="902" name="group"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm rot="1800000"><a:off x="2000000" y="1000000"/><a:ext cx="4000000" cy="2000000"/><a:chOff x="0" y="0"/><a:chExt cx="4000000" cy="2000000"/></a:xfrm></p:grpSpPr>'+text.replace('id="901"','id="903"')+'</p:grpSp>';
    const table='<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="904" name="table"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="1000000" y="1000000"/><a:ext cx="2000000" cy="1000000"/></p:xfrm><a:graphic><a:graphicData><a:tbl><a:tblPr/><a:tblGrid><a:gridCol w="1000000"/><a:gridCol w="1000000"/></a:tblGrid><a:tr h="1000000"/></a:tbl></a:graphicData></a:graphic></p:graphicFrame>';
    const xml=core.parseXml('<p:spTree xmlns:p="'+core.NS.p+'" xmlns:a="'+core.NS.a+'">'+text+group+table+'</p:spTree>');
    for(const n of [...xml.documentElement.children])tree.appendChild(slide.doc.importNode(n,true));core.refreshSlide(slide);
    const before=core.serialize(slide.doc),ids=new Set(['901','902','904']),selected=slide.elements.filter(e=>ids.has(e.id)),geometry=selected.map(e=>e.g),groupChildren=core.serialize(selected[1].node).split('</p:grpSpPr>')[1];
    const snapshots=ElementResize.apply(deck,new Map([[0,ids]]),120,80);
    const changed=slide.elements.filter(e=>ids.has(e.id));
    for(let i=0;i<changed.length;i++){const a=geometry[i],b=changed[i].g;if(Math.abs(a.x+a.w/2-b.x-b.w/2)>1||Math.abs(a.y+a.h/2-b.y-b.h/2)>1||b.w!==Math.round(a.w*1.2)||b.h!==Math.round(a.h*.8)||a.rot!==b.rot)throw Error('center/dimensions');}
    if(core.serialize(changed[1].node).split('</p:grpSpPr>')[1]!==groupChildren)throw Error('group children changed');
    if(core.descendants(changed[0].node,'rPr')[0].getAttribute('sz')!=='1800')throw Error('font size changed');
    const after=core.serialize(slide.doc);try{ElementResize.apply(deck,new Map([[0,ids]]),0,100);throw Error('accepted zero');}catch(e){if(e.message==='accepted zero')throw e;}if(core.serialize(slide.doc)!==after)throw Error('invalid edit mutated XML');
    const exported=await Zip.loadAsync(await core.exportDeck(deck)),source=await Zip.loadAsync(deck.original);
    for(const path of Object.keys(source.files).filter(path=>!source.files[path].dir&&path!==slide.path))if(await source.file(path).async('base64')!==await exported.file(path).async('base64'))throw Error('unrelated part changed: '+path);
    const reloaded=await core.loadDeck(await exported.generateAsync({type:'arraybuffer'}),Zip);if(reloaded.slides[0].elements.find(e=>e.id==='904').g.w!==2400000)throw Error('table export');
    core.restore(deck,snapshots);if(core.serialize(slide.doc)!==before)throw Error('undo');return true;
  })()`);
  assert.equal(result,true);
}

/** Exercise shared resize controls on the range fixture. @param {object} browser Client. @param {Function} rectangle Selection helper. */
export async function checkResizeControls(browser,rectangle){
  await rectangle([20,60],[360,210]);
  const read=()=>browser.evaluate(`[...document.querySelectorAll('#slide-0 .hit-overlay [data-selection-id] polygon')].map(p=>{const points=[...p.points];const xs=points.map(p=>p.x),ys=points.map(p=>p.y);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}})`);
  const before=await read();assert.equal(before.length,2);
  await browser.evaluate(`document.querySelector('#resize-width').value='120';document.querySelector('#resize-height').value='80';document.querySelector('#resize-apply').click()`);
  const after=await read();
  after.forEach((b,i)=>{const a=before[i];assert.equal(b.w,a.w*1.2);assert.equal(b.h,a.h*.8);assert.equal(b.x+b.w/2,a.x+a.w/2);assert.equal(b.y+b.h/2,a.y+a.h/2);});
  assert.match(await browser.evaluate(`document.querySelector('#slide-0 iframe').contentDocument.querySelector('[data-pptx-mover="101"]').style.transform`),/scale\(1.2, 0.8\)/);
  await browser.evaluate(`document.querySelector('#undo').click()`);assert.deepEqual(await read(),before);
  await browser.evaluate(`document.querySelector('#redo').click()`);assert.deepEqual(await read(),after);
  await browser.evaluate(`document.querySelector('#undo').click();document.querySelector('#resize-width').value='100';document.querySelector('#resize-height').value='100';document.querySelector('#resize-apply').click()`);
  assert.equal(await browser.evaluate(`document.querySelector('#undo').disabled`),true,'100% does not add undo history');
  const drag=async(cancel=false)=>{
    const a=await browser.evaluate(`(()=>{const handle=document.querySelector('#slide-0 [data-selection-id="101"] [data-resize-handle="5"]'),r=handle.getBoundingClientRect(),surface=document.querySelector('#slide-0 .slide-surface').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,dx:20/960*surface.width}})()`);
    await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',x:a.x,y:a.y,button:'left',clickCount:1});
    await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:a.x+a.dx,y:a.y,button:'left',buttons:1});
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const draft=await read();assert.ok(draft[0].w>before[0].w,'edge drag previews resize');
    if(cancel)await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:a.x+a.dx,y:a.y,button:'left',clickCount:1});
    return draft;
  };
  await drag(true);assert.deepEqual(await read(),before,'Escape cancels without changing geometry');
  assert.equal(await browser.evaluate(`document.querySelector('#undo').disabled`),true);
  await drag();
  const dragged=await read();dragged.forEach((b,i)=>{assert.ok(b.w>before[i].w);assert.equal(b.h,before[i].h);assert.ok(Math.abs(b.x+b.w/2-before[i].x-before[i].w/2)<2);});
  const screenshot=await browser.send('Page.captureScreenshot',{format:'png'});await writeFile('artifacts/resize-handles.png',Buffer.from(screenshot.data,'base64'));
  await browser.evaluate(`document.querySelector('#undo').click()`);assert.deepEqual(await read(),before,'one undo reverses entire gesture');
  if(browser.checkZoom)await checkPreviewZoom(browser);
  await browser.evaluate(`document.querySelector('#clear-selection').click()`);
}

/** Test native drag handles with multiple selected elements and Escape. @param {object} browser DevTools client. */
export async function checkNativeResize(browser){
  await browser.evaluate(`document.querySelector('[data-native-element="shape_1"]').click();document.querySelector('[data-native-element="shape_2"]').click()`);
  const read=()=>browser.evaluate(`['shape_1','shape_2'].map(id=>{const r=document.querySelector('[data-object-id="'+id+'"]>rect');return {x:+r.getAttribute('x'),y:+r.getAttribute('y'),w:+r.getAttribute('width'),h:+r.getAttribute('height')}})`);
  const before=await read();
  for(const cancel of [true,false]){
    const p=await browser.evaluate(`(()=>{const r=document.querySelector('[data-resize-id="shape_1"][data-resize-handle="5"]').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});
    await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x+20,y:p.y,button:'left',buttons:1});
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    assert.ok((await read())[0].w>before[0].w);
    if(cancel)await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x+20,y:p.y,button:'left',clickCount:1});
    if(cancel)assert.deepEqual(await read(),before);else (await read()).forEach((b,i)=>{assert.ok(b.w>before[i].w);assert.ok(Math.abs(b.x+b.w/2-before[i].x-before[i].w/2)<1e-6);assert.equal(b.h,before[i].h);});
  }
  await browser.evaluate(`document.querySelector('#native-undo').click()`);assert.deepEqual(await read(),before);
  if(browser.checkZoom)await checkPreviewZoom(browser,true);
  await browser.evaluate(`document.querySelector('#native-clear-selection').click()`);
}
