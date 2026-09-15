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
    const fresh=slide.elements.find(e=>e.id===element.id),before=core.serialize(slide.doc),geometry={...fresh.g};
    const other=core.serialize(deck.slides[1].doc);
    text.innerHTML='<p style="margin:0"><span>Alpha beta gamma delta epsilon zeta eta theta</span><br><span>Short</span></p>';
    text.style.width='100%';text.style.whiteSpace='normal';
    const widthCandidates=fit.fitCandidates(deck,checked,selected,'selected');
    const kept=await fit.measureTextBoxes(widthCandidates,new Map([[0,root]]),document,'width',false);
    const wide=await fit.measureTextBoxes(widthCandidates,new Map([[0,root]]),document,'width',true);
    if(!wide.changes[0]?.width||kept.changes[0].width>geometry.w+12700)throw Error('width measurement');
    const widthSnapshots=fit.fitTextBoxes(deck,wide.changes,'width',true);
    if(fresh.g.h!==geometry.h||fresh.g.x!==geometry.x||fresh.g.y!==geometry.y)throw Error('width changes other geometry');
    if(fit.textBoxInfo(fresh).props.getAttribute('wrap')!=='none')throw Error('unwrap not applied');
    preview.syncPreviewPositions(root,slide);
    if(parseFloat(shape.style.width)!==fresh.g.w/12700||text.style.whiteSpace!=='pre')throw Error('width preview');
    const again=await fit.measureTextBoxes(widthCandidates,new Map([[0,root]]),document,'width',true);
    if(again.changes[0].width!==wide.changes[0].width)throw Error('repeated width fit drifts');
    const exported=await zip.loadAsync(await core.exportDeck(deck));
    const xml=await exported.file(slide.path).async('string');
    if(!xml.includes('wrap="none"')||!xml.includes('cx="'+fresh.g.w+'"'))throw Error('width export');
    if(core.serialize(deck.slides[1].doc)!==other)throw Error('unchecked slide changed');
    core.restore(deck,widthSnapshots);preview.syncPreviewPositions(root,slide);
    if(core.serialize(slide.doc)!==before||parseFloat(shape.style.width)!==geometry.w/12700)throw Error('width undo');
    const {TextBoxBackground}=await import('/src/editor/TextBoxBackground.js');
    const backgrounds=new TextBoxBackground(deck);
    const makeBox=fill=>({node:core.parseXml('<p:sp xmlns:p="'+core.NS.p+'" xmlns:a="'+core.NS.a+'"><p:spPr>'+fill+'</p:spPr></p:sp>').documentElement});
    for(const [fill,expected] of [
      ['<a:noFill/>',true],['<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>',true],
      ['<a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>',false],
      ['<a:solidFill><a:srgbClr val="FF0000"><a:alpha val="0"/></a:srgbClr></a:solidFill>',true],
      ['<a:gradFill/>',false],['<a:blipFill/>',false]]){
      if(backgrounds.matches(makeBox(fill),slide,null)!==expected)throw Error('background filter: '+fill);
    }
    const theme=core.parseXml('<a:theme xmlns:a="'+core.NS.a+'"><a:themeElements><a:clrScheme><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1></a:clrScheme></a:themeElements></a:theme>');
    if(!backgrounds.matches(makeBox('<a:solidFill><a:schemeClr val="bg1"/></a:solidFill>'),{},theme))throw Error('theme background');
    const inherited=makeBox('');inherited.inherited=[makeBox('<a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>').node];
    if(backgrounds.matches(inherited,slide,null))throw Error('inherited fill ignored');
    const noSelection=new Map();
    if(fit.fitCandidates(deck,checked,noSelection,'selected').length!==0||fit.fitCandidates(deck,checked,noSelection,'all').length===0)throw Error('width scope');
    const {TextWidthMeasurement}=await import('/src/editor/TextWidthMeasurement.js');
    const probe=document.createElement('div');probe.style.cssText='position:absolute;width:180px;font:20px Arial;padding:8px;box-sizing:border-box';
    probe.innerHTML='<p style="margin:0">Alpha beta gamma delta epsilon zeta eta theta<br>Short</p>';document.body.append(probe);
    const height=probe.getBoundingClientRect().height;
    const wrapped=TextWidthMeasurement.measure(probe,false);
    if(probe.getBoundingClientRect().height!==height)throw Error('automatic line breaks changed');
    const unwrapped=TextWidthMeasurement.measure(probe,true);
    if(unwrapped<=wrapped||probe.getBoundingClientRect().height>=height)throw Error('unwrap option has no effect');
    probe.remove();
    return {skipped:stale.skipped,fitCount:measured.changes.length,undo:true};
  })()`);
  assert.deepEqual(result,{skipped:1,fitCount:1,undo:true});
  console.log('PASS preview fit: fresh bodyPr, detached fit, late document and full undo synchronization');
}
