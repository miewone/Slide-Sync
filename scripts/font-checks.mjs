import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {FontCatalogue} from '../src/services/FontCatalogue.js';

/** Validate original-first font choices through the actual file picker and sandboxed previews.
 * @param {object} browser Chrome DevTools client.
 * @param {string} origin Development, production or subpath URL.
 */
export async function checkPreviewFonts(browser,origin) {
  browser.errors=[];
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled','font app ready');
  await browser.evaluate(`globalThis.fontRequests=[];globalThis.fetch=new Proxy(fetch,{apply(target,receiver,args){const url=String(args[0]);if(url.includes('/fonts/'))fontRequests.push(url);return Reflect.apply(target,receiver,args);}});
    globalThis.fontURLs=[];globalThis.releasedFonts=[];const create=URL.createObjectURL,revoke=URL.revokeObjectURL;
    URL.createObjectURL=function(blob){const url=create.call(this,blob);if(blob.type.startsWith('font/'))fontURLs.push(url);return url;};URL.revokeObjectURL=function(url){if(fontURLs.includes(url))releasedFonts.push(url);return revoke.call(this,url);};
    const NativeFontFace=FontFace;globalThis.FontFace=class extends NativeFontFace{constructor(name,source,options){super(name,source,options);this.testSource=source;}load(){if(typeof this.testSource==='string'&&this.testSource.includes('local(')&&(this.testSource.includes('Nanum')||this.testSource.includes('UnknownOriginalFont')))return Promise.reject(Error('simulate original font absent'));return super.load();}};`);
  assert.equal(await browser.evaluate('fontRequests.length'),0,'no catalogue download before a document needs a font');
  assert.equal(await browser.evaluate('!!document.querySelector("#font-panel-toggle")'),false,'no font warning without missing original fonts');
  await browser.evaluate(`(async()=>{
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('vendor/jszip.min.js',document.baseURI);script.onload=resolve;script.onerror=reject;document.head.append(script);});
    const zip=await JSZip.loadAsync(await(await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer());
    for(const path of Object.keys(zip.files).filter(path=>/^ppt\\/slides\\/slide\\d+\\.xml$/.test(path))){
      const doc=new DOMParser().parseFromString(await zip.file(path).async('string'),'application/xml');
      const a='http://schemas.openxmlformats.org/drawingml/2006/main';
      for(const [index,run] of [...doc.getElementsByTagNameNS(a,'r')].entries()){
        let props=[...run.children].find(n=>n.localName==='rPr');if(!props){props=doc.createElementNS(a,'a:rPr');run.prepend(props);}
        const family=index===0?'NanumGothic':'UnknownOriginalFont';
        for(const tag of ['latin','ea']){let face=[...props.children].find(n=>n.localName===tag);if(!face){face=doc.createElementNS(a,'a:'+tag);props.append(face);}face.setAttribute('typeface',family);}
        if(index===0){props.setAttribute('b','1');const text=run.getElementsByTagNameNS(a,'t')[0];if(text)text.textContent='원본 나눔고딕 ABC';}
      }
      zip.file(path,new XMLSerializer().serializeToString(doc));
    }
    globalThis.fontFixture=await zip.generateAsync({type:'arraybuffer'});
    const transfer=new DataTransfer();transfer.items.add(new File([fontFixture],'fonts.pptx'));
    const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await browser.until(`document.querySelector('#filename').textContent==='fonts.pptx' && !document.querySelector('#download').disabled`,'font document ready');
  await browser.until(`document.querySelectorAll('#stage iframe').length===8 && [...document.querySelectorAll('#stage iframe')].every(frame=>frame.style.visibility!== 'hidden' && frame.contentDocument?.querySelector('[data-preview-font-key="nanumgothic"]'))`,'font frames ready');
  assert.equal(await browser.evaluate(`fontRequests.filter(url=>url.endsWith('NanumGothicBold.otf')).length`),1,'same original bold web font is loaded once');
  assert.equal(await browser.evaluate(`fontRequests.some(url=>url.includes('Pretendard')||url.includes('Myeongjo'))`),false,'unknown originals are not replaced automatically');
  assert.equal(await browser.evaluate(`!!document.querySelector('.workspace-bar #font-panel-toggle')`),true,'compact trigger is in workspace bar');
  assert.equal(await browser.evaluate(`!!document.querySelector('#font-panel')`),false,'font controls start closed');
  const stageTop=await browser.evaluate(`document.querySelector('#stage').getBoundingClientRect().top`);
  await browser.evaluate(`document.querySelector('#font-panel-toggle').click()`);
  await browser.until(`!!document.querySelector('#font-panel')`,'floating font panel');
  assert.equal(await browser.evaluate(`getComputedStyle(document.querySelector('#font-panel')).position`),'fixed');
  assert.equal(await browser.evaluate(`document.querySelector('#stage').getBoundingClientRect().top`),stageTop,'floating controls do not shift previews');
  assert.equal(await browser.evaluate(`!!document.querySelector('[data-font-name="NanumGothic"]')`),false,'available original fonts are omitted from the problem list');
  assert.equal(await browser.evaluate(`document.querySelector('[data-font-name="UnknownOriginalFont"] select').value`),'');
  assert.match(await browser.evaluate(`document.querySelector('[data-font-name="UnknownOriginalFont"]').textContent`),/브라우저 대체|browser fallback/);
  await browser.until(`document.activeElement?.id==='font-search'`,'font dialog autofocus ready');
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await browser.until(`!document.querySelector('#font-panel') && document.activeElement.id==='font-panel-toggle'`,'Escape closes and restores focus');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:540,height:800,deviceScaleFactor:1,mobile:false});
  await browser.evaluate(`document.querySelector('#font-panel-toggle').click()`);
  await browser.until(`!!document.querySelector('#font-panel')`,'narrow font panel');
  assert.equal(await browser.evaluate(`(()=>{const r=document.querySelector('#font-panel').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})()`),true,'floating panel fits narrow viewport');
  await browser.evaluate(`document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`);
  await browser.until(`!document.querySelector('#font-panel')`,'outside click closes');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await browser.evaluate(`document.querySelector('#font-panel-toggle').click()`);
  await browser.until(`!!document.querySelector('#font-panel')`,'font panel reopened');
  await browser.evaluate(`globalThis.retainedFontFrames=[...document.querySelectorAll('#stage iframe')];globalThis.exactFamily=retainedFontFrames[0].contentDocument.querySelector('[data-preview-font-key="nanumgothic"]').style.fontFamily;
    document.querySelector('#range').value='1';document.querySelector('#apply-range').click();
    const select=document.querySelector('[data-font-name="UnknownOriginalFont"] select');select.value='nanum-myeongjo';select.dispatchEvent(new Event('change',{bubbles:true}));`);
  await browser.until(`!!document.querySelector('[data-font-name="UnknownOriginalFont"] .font-pending-choice')`,'font selection awaits Apply');
  assert.equal(await browser.evaluate(`fontRequests.some(url=>url.includes('Myeongjo'))`),false,'selecting a font does not silently apply it');
  await browser.evaluate(`document.querySelector('[data-font-name="UnknownOriginalFont"] .font-apply').click()`);
  await browser.until(`!document.querySelector('#download').disabled && document.querySelector('[data-font-name="UnknownOriginalFont"]').textContent.includes('선택한 대체')`,'explicit substitute ready');
  assert.equal(await browser.evaluate(`!![...document.querySelectorAll('#activity-log-list [data-activity-level="success"]')].find(item=>item.textContent.includes('글꼴 적용 완료: UnknownOriginalFont')&&item.textContent.includes('나눔명조'))`),true,'font completion reaches the common activity log');
  assert.equal(await browser.evaluate(`retainedFontFrames.every((frame,index)=>frame===document.querySelectorAll('#stage iframe')[index])`),true,'font changes retain frames');
  assert.equal(await browser.evaluate(`retainedFontFrames[0].contentDocument.querySelector('[data-preview-font-key="nanumgothic"]').style.fontFamily===exactFamily`),true,'other original families stay unchanged');
  assert.equal(await browser.evaluate(`document.querySelectorAll('.slide-item input:checked').length`),1,'checked scope preserved');
  assert.equal(await browser.evaluate(`document.querySelector('#undo').disabled`),true,'font choices do not enter XML edit history');
  assert.equal(await browser.evaluate(`retainedFontFrames.every(frame=>frame.getAttribute('sandbox')==='allow-same-origin' && frame.contentDocument.querySelector('#preview-font-faces').textContent.includes('blob:'))`),true,'script-disabled frames receive font rules');
  assert.match(await browser.evaluate(`document.querySelector('#font-panel-toggle').textContent`),/적용 완료|Fonts applied/,'completion replaces the unresolved count');
  assert.equal(await browser.evaluate(`!!document.querySelector('[data-font-name="UnknownOriginalFont"] .font-applied-badge')`),true,'applied font is clearly marked');
  const shot=await browser.send('Page.captureScreenshot',{format:'png'});await writeFile('artifacts/fonts.png',Buffer.from(shot.data,'base64'));
  assert.equal(await browser.evaluate(`document.querySelector('#font-panel').contains(document.activeElement)`),true,'floating font controls have keyboard focus');
  await browser.evaluate(`(async()=>{const bytes=await(await fetch(new URL('fonts/PretendardVariable.woff2',document.baseURI))).arrayBuffer();const input=document.querySelector('[data-font-name="UnknownOriginalFont"] input[type=file]');const transfer=new DataTransfer();transfer.items.add(new File([bytes],'custom-original.woff2'));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await browser.until(`!document.querySelector('#download').disabled && document.querySelector('[data-font-name="UnknownOriginalFont"] select').value==='upload'`,'font file imported');
  assert.match(await browser.evaluate(`document.querySelector('[data-font-name="UnknownOriginalFont"]').textContent`),/custom-original.woff2/);
  await browser.evaluate(`document.querySelector('#font-panel .font-panel-heading button').click()`);
  await browser.until(`!document.querySelector('#font-panel')`,'close font controls before editing a slide');
  assert.equal(await browser.evaluate(`!!document.querySelector('#font-panel-toggle')`),false,'resolved warning disappears when the panel closes');
  const titlePoint=await browser.evaluate(`(()=>{const frame=document.querySelector('#stage iframe'),span=frame.contentDocument.querySelector('[data-preview-font-key="nanumgothic"]'),outer=frame.getBoundingClientRect(),inner=span.getBoundingClientRect(),scale=outer.width/960;return {x:outer.left+(inner.left+inner.width/2)*scale,y:outer.top+(inner.top+inner.height/2)*scale};})()`);
  await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...titlePoint,button:'left',clickCount:1});
  await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',...titlePoint,button:'left',clickCount:1});
  await browser.until(`!document.querySelector('#text-format-bold').disabled`,'select original font text');
  await browser.evaluate(`document.querySelector('#text-format-bold').click()`);
  await browser.until(`document.querySelector('#stage iframe').contentDocument.querySelector('[data-preview-font-key="nanumgothic"]').dataset.previewFontVariant==='400:normal' && fontRequests.some(url=>url.endsWith('NanumGothic.otf'))`,'new original weight loaded after text edit');
  await browser.evaluate(`document.querySelector('#undo').click()`);
  await browser.until(`document.querySelector('#stage iframe').contentDocument.querySelector('[data-preview-font-key="nanumgothic"]').dataset.previewFontVariant==='700:normal'`,'font weight restored by undo');
  await browser.evaluate(`const generate=JSZip.prototype.generateAsync;JSZip.prototype.generateAsync=async function(...args){const result=await generate.apply(this,args);if(result instanceof Blob)globalThis.fontExport=result;return result;};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)click.call(this);};document.querySelector('#download').click();`);
  await browser.until('!!globalThis.fontExport && !document.querySelector("#download").disabled','font export');
  assert.equal(await browser.evaluate(`(async()=>{const original=await JSZip.loadAsync(fontFixture),exported=await JSZip.loadAsync(await fontExport.arrayBuffer());for(const path of Object.keys(original.files).filter(path=>/\\.(xml|rels)$/.test(path))){if(await original.file(path).async('string')!==await exported.file(path).async('string'))return false;}return true;})()`),true,'font mappings leave every XML and relationship unchanged');
  assert.ok(await browser.evaluate(`Number(document.querySelector('.activity-log-count')?.textContent)>0`),'activity log count is visible');
  await browser.evaluate(`document.querySelector('#activity-log-trigger').click()`);
  await browser.until(`document.querySelector('#activity-log-panel').matches(':popover-open')`,'activity log opens');
  assert.ok(await browser.evaluate(`document.querySelector('#activity-log-list').textContent.includes('UnknownOriginalFont')&&document.querySelector('#activity-log-list').textContent.includes('fonts.pptx')`),'font activity retains the original font and file context');
  assert.ok(await browser.evaluate(`!!document.querySelector('#activity-log-list [data-activity-level="success"]')`),'completed work appears in the activity log');
  const logShot=await browser.send('Page.captureScreenshot',{format:'png'});await writeFile('artifacts/activity-log.png',Buffer.from(logShot.data,'base64'));
  await browser.evaluate(`document.querySelector('#activity-log-close').click()`);
  await browser.until(`!document.querySelector('#activity-log-panel').matches(':popover-open')`,'activity log closes');
  await browser.evaluate(`globalThis.oldFontURLs=[...fontURLs];document.querySelector('#demo').click();`);
  await browser.until(`!document.querySelector('#download').disabled && document.querySelector('#filename').textContent!=='fonts.pptx'`,'font document replaced');
  assert.equal(await browser.evaluate('oldFontURLs.every(url=>releasedFonts.includes(url))'),true,'replacement releases old font URLs');
  await browser.evaluate(`(async()=>{
    const zip=await JSZip.loadAsync(fontFixture);
    for(const path of Object.keys(zip.files).filter(path=>path.endsWith('.xml'))){const xml=await zip.file(path).async('string');zip.file(path,xml.replace(/typeface="[^"]*"/g,'typeface="NanumGothic"').replace(/\\bi="1"/g,'i="0"'));}
    const transfer=new DataTransfer();transfer.items.add(new File([await zip.generateAsync({type:'arraybuffer'})],'originals-available.pptx'));
    const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await browser.until(`!document.querySelector('#download').disabled && document.querySelector('#filename').textContent==='originals-available.pptx'`,'all original fonts available');
  assert.equal(await browser.evaluate(`!!document.querySelector('#font-panel-toggle')||!!document.querySelector('#font-panel')`),false,'no font controls when original fonts are usable');
  await browser.evaluate(`(async()=>{
    const zip=await JSZip.loadAsync(fontFixture),p='http://schemas.openxmlformats.org/presentationml/2006/main',r='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    for(const path of Object.keys(zip.files).filter(path=>path.endsWith('.xml')))zip.file(path,(await zip.file(path).async('string')).replace(/\\bi="(?:1|true)"/g,'i="0"'));
    const doc=new DOMParser().parseFromString(await zip.file('ppt/presentation.xml').async('string'),'application/xml');
    const list=doc.createElementNS(p,'p:embeddedFontLst'),font=doc.createElementNS(p,'p:embeddedFont'),name=doc.createElementNS(p,'p:font');name.setAttribute('typeface','UnknownOriginalFont');font.append(name);list.append(font);doc.documentElement.insertBefore(list,doc.getElementsByTagNameNS(p,'defaultTextStyle')[0]||null);
    const rels=new DOMParser().parseFromString(await zip.file('ppt/_rels/presentation.xml.rels').async('string'),'application/xml');
    for(const [tag,file] of [['regular','NanumSquareR.otf'],['bold','NanumSquareB.otf']]){
      const id='font-'+tag,node=doc.createElementNS(p,'p:'+tag);node.setAttributeNS(r,'r:id',id);font.append(node);
      const rel=rels.createElementNS(rels.documentElement.namespaceURI,'Relationship');rel.setAttribute('Id',id);rel.setAttribute('Type',r+'/font');rel.setAttribute('Target','fonts/'+file);rels.documentElement.append(rel);
      zip.file('ppt/fonts/'+file,await(await fetch(new URL('fonts/'+file,document.baseURI))).arrayBuffer());
    }
    const types=new DOMParser().parseFromString(await zip.file('[Content_Types].xml').async('string'),'application/xml');const type=types.createElementNS(types.documentElement.namespaceURI,'Default');type.setAttribute('Extension','otf');type.setAttribute('ContentType','application/x-fontdata');types.documentElement.append(type);
    zip.file('[Content_Types].xml',new XMLSerializer().serializeToString(types));zip.file('ppt/presentation.xml',new XMLSerializer().serializeToString(doc));zip.file('ppt/_rels/presentation.xml.rels',new XMLSerializer().serializeToString(rels));
    const transfer=new DataTransfer();transfer.items.add(new File([await zip.generateAsync({type:'arraybuffer'})],'embedded-originals.pptx'));
    const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await browser.until(`!document.querySelector('#download').disabled && document.querySelector('#filename').textContent==='embedded-originals.pptx'`,'embedded originals ready');
  assert.equal(await browser.evaluate(`!!document.querySelector('#font-panel-toggle')`),false,'supported embedded original wins over missing installed font and previous substitutions');
  const files=FontCatalogue.families.flatMap(font=>font.faces);
  assert.equal(await browser.evaluate(`(async()=>{for(const [index,asset] of ${JSON.stringify(files)}.entries()){const data=await(await fetch(new URL('fonts/'+asset.file,document.baseURI))).arrayBuffer();const face=new FontFace('CatalogueCheck'+index,data,{weight:String(asset.weight)});await face.load();if(face.status!=='loaded')return false;}return true;})()`),true,'all bundled families and weights decode in the browser');
  assert.deepEqual(browser.errors,[],'font browser errors');
  console.log('PASS fonts: exact original and weight, no automatic substitutes, sandboxed frames, explicit replacement/file, unchanged XML/scope/history, disposal');
}
