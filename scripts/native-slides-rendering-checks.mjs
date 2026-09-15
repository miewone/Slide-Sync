import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

/** Render native theme, shapes and tables in a real browser, without changing the open document. @param {object} browser DevTools client. */
export async function checkNativeSlidesRendering(browser){
  await browser.evaluate(String.raw`(async()=>{
    const {default:React}=await import('/node_modules/.vite/deps/react.js'),{default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');const {createRoot}=ReactDOM;
    const {NativeSlidesCanvas}=await import('/src/components/NativeSlidesCanvas.jsx'),{NativeSlidesDocument}=await import('/src/editor/google/NativeSlidesDocument.js');
    const dim=(w,h)=>({width:{magnitude:w,unit:'PT'},height:{magnitude:h,unit:'PT'}}),transform=(x,y)=>({scaleX:1,scaleY:1,translateX:x,translateY:y,unit:'PT'});
    const shape=(id,type,x,y,w,h,properties,text)=>({objectId:id,size:dim(w,h),transform:transform(x,y),shape:{shapeType:type,shapeProperties:properties,text}});
    const text={textElements:[{paragraphMarker:{style:{alignment:'CENTER'}}},{textRun:{content:'Native ',style:{fontSize:{magnitude:20,unit:'PT'},bold:true,foregroundColor:{opaqueColor:{themeColor:'ACCENT1'}}}}},{textRun:{content:'text\n',style:{fontSize:{magnitude:20,unit:'PT'}}}}]};
    const presentation={presentationId:'visual-fixture',pageSize:dim(720,405),masters:[{objectId:'master',pageProperties:{colorScheme:{colors:[{type:'ACCENT1',color:{red:.1,green:.2,blue:.6}}]},pageBackgroundFill:{solidFill:{color:{rgbColor:{red:.95,green:.96,blue:1}}}}},pageElements:[]}],slides:[{objectId:'slide',slideProperties:{masterObjectId:'master'},pageElements:[
      shape('transparent','TEXT_BOX',20,20,300,65,{},text),
      shape('agenda','BRACKET_PAIR',360,20,280,70,{contentAlignment:'MIDDLE',outline:{outlineFill:{solidFill:{color:{rgbColor:{red:.83,green:.25,blue:.12}}}},weight:{magnitude:3,unit:'PT'}}},{textElements:[{paragraphMarker:{style:{alignment:'CENTER'}}},{textRun:{content:'Agenda',style:{fontSize:{magnitude:28,unit:'PT'},bold:false}}}]}),
      shape('ellipse','ELLIPSE',30,130,150,100,{shapeBackgroundFill:{solidFill:{color:{themeColor:'ACCENT1'},alpha:.6}},outline:{propertyState:'NOT_RENDERED'}}),
      shape('triangle','TRIANGLE',220,130,120,100,{shapeBackgroundFill:{solidFill:{color:{rgbColor:{red:.95,green:.6}}}}}),
      shape('rounded','ROUND_RECTANGLE',390,130,230,100,{shapeBackgroundFill:{solidFill:{color:{rgbColor:{green:.7,blue:.5}}}}}),
      shape('soft_break','TEXT_BOX',20,235,300,45,{}, {textElements:[{textRun:{content:'First line\vSecond ♂\n',style:{fontSize:{magnitude:12,unit:'PT'}}}}]}),
      shape('striped','STRIPED_RIGHT_ARROW',430,270,210,70,{shapeBackgroundFill:{solidFill:{color:{rgbColor:{red:.7,green:.82,blue:.95}}}}}),
      shape('bracket','RIGHT_BRACKET',675,250,12,120,{outline:{outlineFill:{solidFill:{color:{themeColor:'ACCENT1'}}},weight:{magnitude:2,unit:'PT'}}}),
      shape('overflow','TEXT_BOX',430,350,210,6,{}, {textElements:[{textRun:{content:'LGE Internal Use Only',style:{fontSize:{magnitude:18,unit:'PT'}}}}]}),
      {objectId:'horizontal',size:{width:{magnitude:660,unit:'PT'},height:{unit:'PT'}},transform:transform(20,100),line:{lineProperties:{lineFill:{solidFill:{color:{themeColor:'ACCENT1'}}},weight:{magnitude:2,unit:'PT'}}}},
      {objectId:'table',size:dim(360,80),transform:transform(20,285),table:{columns:2,rows:2,tableColumns:[{columnWidth:{magnitude:90,unit:'PT'}},{columnWidth:{magnitude:270,unit:'PT'}}],tableRows:[{rowHeight:{magnitude:40,unit:'PT'},tableCells:[{columnSpan:2,text:{textElements:[{textRun:{content:'Merged header',style:{bold:true}}}]},tableCellProperties:{tableCellBackgroundFill:{solidFill:{color:{rgbColor:{red:.8,green:.85,blue:1}}}}}}]},{rowHeight:{magnitude:40,unit:'PT'},tableCells:[{text:{textElements:[{textRun:{content:'Left cell'}}]}},{text:{textElements:[{textRun:{content:'Right cell'}}]}}]}]}}
    ]}]};
    presentation.slides[0].pageElements.push({objectId:'small_table',size:dim(360,20),transform:transform(20,375),table:{rows:1,columns:2,tableColumns:[{columnWidth:{magnitude:90,unit:'PT'}},{columnWidth:{magnitude:270,unit:'PT'}}],tableRows:[{rowHeight:{magnitude:20,unit:'PT'},tableCells:[{tableCellProperties:{contentAlignment:'MIDDLE'},text:{textElements:[{textRun:{content:'Small cell',style:{fontSize:{magnitude:8,unit:'PT'}}}}]}},{tableCellProperties:{contentAlignment:'BOTTOM'},text:{textElements:[{textRun:{content:'Bottom cell',style:{fontSize:{magnitude:8,unit:'PT'}}}}]}}]}]}});
    const agenda=structuredClone(presentation.slides[0].pageElements.find(e=>e.objectId==='agenda'));agenda.objectId='agenda_scaled';agenda.size=dim(100,100);agenda.transform={...agenda.transform,scaleX:2.8,scaleY:.7};presentation.slides[0].pageElements.push(agenda);
    const parent=shape('theme_parent','TEXT_BOX',0,0,300,35,{shapeBackgroundFill:{solidFill:{color:{themeColor:'ACCENT1'},alpha:.2}},autofit:{fontScale:.5}}, {textElements:[{paragraphMarker:{style:{indentStart:{magnitude:24,unit:'PT'}}}},{textRun:{content:'Template',style:{fontSize:{magnitude:14,unit:'PT'},weightedFontFamily:{fontFamily:'Courier New',weight:400}}}}]});parent.shape.placeholder={type:'BODY'};presentation.masters[0].pageElements.push(parent);
    const child=shape('inherited_text','TEXT_BOX',360,235,300,35,{shapeBackgroundFill:{propertyState:'RENDERED',solidFill:{alpha:.1}}},{textElements:[{paragraphMarker:{style:{indentStart:{magnitude:24,unit:'PT'}}}},{textRun:{content:'Indented label'}}]});child.shape.placeholder={parentObjectId:'theme_parent'};presentation.slides[0].pageElements.push(child);
    presentation.slides[0].pageElements.push({objectId:'elbow',size:dim(80,120),transform:transform(350,120),line:{lineType:'BENT_CONNECTOR_3',lineProperties:{lineFill:{solidFill:{color:{themeColor:'ACCENT1'}}},weight:{magnitude:1,unit:'PT'}}}});
    window.fidelityModel=new NativeSlidesDocument(presentation);window.fidelityOriginal=JSON.stringify(presentation);
    const host=document.createElement('div');host.id='native-fidelity-fixture';Object.assign(host.style,{position:'fixed',inset:'80px 100px',zIndex:'3000',background:'white',padding:'24px'});document.body.append(host);window.fidelityRoot=createRoot(host);
    fidelityRoot.render(React.createElement(NativeSlidesCanvas,{model:fidelityModel,page:0,checked:new Set([0]),selected:new Set(),setSelected:()=>{},perform:()=>{},busy:false,guides:{items:[]},showGuides:false,snap:false,version:0,fontOverrides:new Map()}));
  })()`);
  try{
    await browser.until('!!document.querySelector("#native-fidelity-fixture [data-native-table=table] foreignObject span")','native fidelity fixture rendered');
    await browser.evaluate('document.querySelector("#native-fidelity-fixture [data-native-artwork=agenda_scaled]").style.visibility="hidden"');
    assert.equal(await browser.evaluate(`(()=>{const a=document.querySelector('#native-fidelity-fixture [data-native-artwork=agenda] path'),b=document.querySelector('#native-fidelity-fixture [data-native-artwork=agenda_scaled] path');
      return Array.from({length:101},(_,i)=>{const p=a.getPointAtLength(a.getTotalLength()*i/100).matrixTransform(a.getScreenCTM()),q=b.getPointAtLength(b.getTotalLength()*i/100).matrixTransform(b.getScreenCTM());return Math.hypot(p.x-q.x,p.y-q.y)<.1;}).every(Boolean);})()`),true,'equivalent size/transform combinations render the same bracket geometry');
    assert.equal(await browser.evaluate('document.querySelector("#native-fidelity-fixture [data-native-artwork=transparent] rect").getAttribute("fill")'),'none','transparent text box has no fabricated gray fill');
    assert.equal(await browser.evaluate('document.querySelector("#native-fidelity-fixture [data-native-artwork=ellipse] ellipse").getAttribute("fill")'),'rgb(26,51,153)','theme color resolves from master');
    assert.equal(await browser.evaluate('document.querySelector("#native-fidelity-fixture [data-native-artwork=ellipse] ellipse").getAttribute("fill-opacity")'),'0.6');
    assert.equal(await browser.evaluate('document.querySelector("#native-fidelity-fixture [data-native-artwork=triangle] polygon").getAttribute("points")'),'60,0 120,100 0,100');
    assert.equal(await browser.evaluate('document.querySelector("#native-fidelity-fixture [data-native-artwork=rounded] rect").getAttribute("rx")'),String(100/6));
    assert.equal(await browser.evaluate('document.querySelector("#native-fidelity-fixture [data-native-background]>rect").getAttribute("fill")'),'rgb(242,245,255)');
    assert.equal(await browser.evaluate('getComputedStyle(document.querySelector("#native-fidelity-fixture [data-native-artwork=transparent] foreignObject span")).color'),'rgb(26, 51, 153)');
    assert.equal(await browser.evaluate('getComputedStyle(document.querySelectorAll("#native-fidelity-fixture [data-native-artwork=transparent] foreignObject span")[1]).fontWeight'),'400','first bold run does not bleed into later runs');
    assert.deepEqual(await browser.evaluate('Array.from(document.querySelectorAll("#native-fidelity-fixture [data-native-table=table] foreignObject"),e=>e.textContent)'),['Merged header','Left cell','Right cell']);
    assert.equal(await browser.evaluate('document.querySelector("#native-fidelity-fixture [data-native-table=table] foreignObject").getAttribute("width")'),'345.6','merged cell text width retains left and right insets');
    assert.equal(await browser.evaluate('!!document.querySelector("#native-fidelity-fixture [data-native-artwork=striped] path")&&!!document.querySelector("#native-fidelity-fixture [data-native-artwork=bracket] path")'),true,'striped arrow and bracket are drawn');
    assert.equal(await browser.evaluate('document.querySelector("#native-fidelity-fixture [data-native-artwork=horizontal]>path").getAttribute("d")'),'M0 0 L660 0','zero-height line remains visible');
    assert.equal(await browser.evaluate('getComputedStyle(document.querySelector("#native-fidelity-fixture [data-native-artwork=overflow] foreignObject")).overflow'),'visible','small text bounds do not clip overflowing glyphs');
    assert.equal(await browser.evaluate(`document.querySelector('#native-fidelity-fixture [data-native-table=table] [data-native-cell="1:1"]').getAttribute('transform')`),'translate(90 40)','actual unequal column widths position cell content');
    assert.equal(await browser.evaluate(`(()=>{const table=document.querySelector('#native-fidelity-fixture [data-native-table=small_table]'),scale=table.getScreenCTM().a;
      return [...table.querySelectorAll('[data-native-cell]')].every(cell=>{
        const bounds=cell.querySelector('rect').getBoundingClientRect(),span=cell.querySelector('span'),range=document.createRange();range.selectNodeContents(span);const text=range.getBoundingClientRect();
        const box=cell.querySelector('foreignObject').getBoundingClientRect(),paragraph=span.parentElement.getBoundingClientRect();
        return text.left-bounds.left>=7.2*scale-1&&text.top-bounds.top>=3.6*scale-1&&bounds.bottom-text.bottom>=3.6*scale-1&&paragraph.height<=box.height+1;
      });})()`),true,'small centered/bottom-aligned cell text preserves inset space without a forced 18-point line');
    assert.equal(await browser.evaluate(`(()=>{const path=document.querySelector('#native-fidelity-fixture [data-native-artwork=agenda] path'),length=path.getTotalLength();
      return Array.from({length:101},(_,i)=>path.getPointAtLength(length*i/100)).every(point=>point.x<=8.76||point.x>=271.24);})()`),true,'wide bracket pair leaves its entire middle open instead of drawing a box');
    assert.equal(await browser.evaluate('document.querySelector("#native-fidelity-fixture [data-native-artwork=soft_break] foreignObject").textContent'),'First line\nSecond ♂','soft break becomes a line feed and literal male symbol remains text');
    assert.equal(await browser.evaluate(`(()=>{const node=document.querySelector('#native-fidelity-fixture [data-native-artwork=soft_break] span').firstChild,range=document.createRange();range.setStart(node,0);range.setEnd(node,1);const top=range.getBoundingClientRect().top;const second=node.textContent.indexOf('Second');range.setStart(node,second);range.setEnd(node,second+1);return range.getBoundingClientRect().top>top+4;})()`),true,'soft break displays a second line instead of a control glyph');
    assert.equal(await browser.evaluate('document.querySelector("#native-fidelity-fixture [data-native-artwork=elbow]>path").getAttribute("d")'),'M0 0 H40 V120 H80','elbow connector follows orthogonal segments');
    assert.equal(await browser.evaluate('document.querySelector("#native-fidelity-fixture [data-native-artwork=inherited_text] rect").getAttribute("fill")'),'rgb(26,51,153)','partial child fill preserves inherited theme color');
    assert.equal(await browser.evaluate('getComputedStyle(document.querySelector("#native-fidelity-fixture [data-native-artwork=inherited_text] span")).fontSize'),'7px','inherited font size and autofit are both applied');
    assert.match(await browser.evaluate('getComputedStyle(document.querySelector("#native-fidelity-fixture [data-native-artwork=inherited_text] span")).fontFamily'),/Courier New/,'inherited weighted font family is retained');
    assert.equal(await browser.evaluate('getComputedStyle(document.querySelector("#native-fidelity-fixture [data-native-artwork=inherited_text] span").parentElement).textIndent'),'0px','missing first-line indent must not cancel icon spacing');
    assert.equal(await browser.evaluate('getComputedStyle(document.querySelector("#native-fidelity-fixture [data-native-artwork=inherited_text] span").parentElement).paddingLeft'),'24px');
    assert.equal(await browser.evaluate('JSON.stringify(fidelityModel.original)===fidelityOriginal&&fidelityModel.requests().length===0'),true,'rendering preserves the original native presentation');
    await writeFile('artifacts/native-rendering-fidelity.png',Buffer.from((await browser.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    console.log('PASS native rendering: transparent boxes, inherited theme/background, real shapes, mixed text styles and merged table cells');
  }finally{await browser.evaluate('fidelityRoot.unmount();document.querySelector("#native-fidelity-fixture").remove();delete window.fidelityRoot;delete window.fidelityModel;delete window.fidelityOriginal;');}
}
