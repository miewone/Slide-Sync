import assert from 'node:assert/strict';

/** Verify full text synchronization and cached eligibility against real browser DOM/XML. */
export async function checkPreviewFit(browser,origin) {
  await browser.navigate(origin);
  const result=await browser.evaluate(`(async()=>{
    const core=await import('/src/editor/core.js');
    const fit=await import('/src/editor/text-fit.js');
    const preview=await import('/src/editor/preview-cache.js');
    const {previewResources}=await import('/src/services/PreviewResources.js');
    const zip=await previewResources.loadZip();
    const deck=await core.loadDeck(await (await fetch('/sample.pptx')).arrayBuffer(),zip);
    const slide=deck.slides[0],element=slide.elements.find(e=>fit.textBoxInfo(e));
    if(!element)throw Error('fixture needs a text box');
    const root=document.createElement('div');root.className='slide-wrapper';
    const shape=document.createElement('div');shape.dataset.pptxElement=element.id;
    const text=document.createElement('div');text.className='text-wrapper';
    text.style.cssText='font-size:20px;line-height:1.2;height:10px;white-space:nowrap;padding:0px';
    text.textContent='Fit verification text';shape.append(text);root.append(shape);
    preview.cachePreview(root,slide);
    const selected=new Map([[0,new Set([element.id])]]),checked=new Set([0]);
    const candidates=fit.fitCandidates(deck,checked,selected,'selected');
    const props=fit.textBoxInfo(element).props,originalVert=props.getAttribute('vert');
    props.setAttribute('vert','vert');
    const stale=await fit.measureTextBoxes(candidates,new Map([[0,root]]),document);
    if(originalVert===null)props.removeAttribute('vert');else props.setAttribute('vert',originalVert);
    if(stale.skipped!==1||stale.changes.length)throw Error('measurement used stale cached bodyPr');
    const measured=await fit.measureTextBoxes(candidates,new Map([[0,root]]),document);
    const snapshots=fit.fitTextBoxes(deck,measured.changes);
    if(!snapshots.length)throw Error('fixture fit must change geometry');
    preview.syncPreviewPositions(root,slide);
    const fittedHeight=shape.style.height;
    const lateDocument=document.implementation.createHTMLDocument('late frame');
    lateDocument.body.append(lateDocument.importNode(root,true));
    preview.syncPreviewPositions(lateDocument,slide);
    const lateShape=lateDocument.querySelector('[data-pptx-mover]').firstElementChild;
    if(lateShape.style.height!==fittedHeight)throw Error('late frame loses fit');
    core.restore(deck,snapshots);
    preview.syncPreviewPositions(root,slide);preview.syncPreviewPositions(lateDocument,slide);
    if(shape.style.height===fittedHeight||lateShape.style.height!==shape.style.height)throw Error('full sync fails fit undo');
    if(text.style.whiteSpace!=='nowrap')throw Error('undo fails original text styles');
    return {skipped:stale.skipped,fitCount:measured.changes.length,undo:true};
  })()`);
  assert.deepEqual(result,{skipped:1,fitCount:1,undo:true});
  console.log('PASS preview fit: fresh bodyPr, detached fit, late document and full undo synchronization');
}
