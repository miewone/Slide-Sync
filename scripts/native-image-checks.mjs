import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

/** Decode real image bytes through Chrome, exercise expired URLs and preserve adjacent text positions. @param {object} browser DevTools client. */
export async function checkNativeImages(browser){
  const png=await browser.evaluate(`(()=>{const c=document.createElement('canvas');c.width=200;c.height=100;const x=c.getContext('2d');x.fillStyle='#4285f4';x.fillRect(0,0,100,100);x.fillStyle='#fbbc04';x.fillRect(100,0,100,100);return c.toDataURL('image/png').split(',')[1];})()`);
  let suspended=true;const pending=[],failures=[];
  const fulfill=async request=>{try{await browser.send('Fetch.fulfillRequest',{requestId:request.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'},{name:'Cache-Control',value:'no-store'}],body:/-(old|broken)$/.test(request.request.url)?Buffer.from('invalid image').toString('base64'):png});}catch(error){failures.push(error.message);}};
  const listener=event=>{const data=JSON.parse(event.data);if(data.method!=='Fetch.requestPaused')return;if(suspended)pending.push(data.params);else void fulfill(data.params);};
  browser.socket.addEventListener('message',listener);
  await browser.send('Fetch.enable',{patterns:[{urlPattern:'https://lh3.googleusercontent.com/native-image-fixture-*',requestStage:'Request'}]});
  try{
    await browser.evaluate(String.raw`(async()=>{
      const {default:React}=await import('/node_modules/.vite/deps/react.js'),{default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
      const {NativeSlidesCanvas}=await import('/src/components/NativeSlidesCanvas.jsx'),{NativeSlidesDocument}=await import('/src/editor/google/NativeSlidesDocument.js'),{NativeSlidesMedia}=await import('/src/services/google/NativeSlidesMedia.js'),{NativeSlidesMediaContext}=await import('/src/components/NativeSlidesImage.jsx');
      const url=suffix=>'https://lh3.googleusercontent.com/native-image-fixture-'+suffix,dim=(w,h)=>({width:{magnitude:w,unit:'PT'},height:{magnitude:h,unit:'PT'}}),tr=(x,y)=>({scaleX:1,scaleY:1,translateX:x,translateY:y,unit:'PT'});
      const image=(id,x,y,suffix)=>({objectId:id,size:dim(120,80),transform:tr(x,y),image:{contentUrl:url(suffix)}});
      const source={presentationId:'images',revisionId:'r1',pageSize:dim(480,300),layouts:[{objectId:'layout',pageElements:[{...image('parent',0,0,'good'),image:{contentUrl:url('good'),placeholder:{type:'BODY'}}}]}],slides:[{objectId:'slide',slideProperties:{layoutObjectId:'layout'},pageElements:[
        image('photo',20,20,'old'),image('broken',20,160,'broken'),{...image('crop',200,20,'good'),image:{contentUrl:url('good'),imageProperties:{cropProperties:{leftOffset:.25,rightOffset:.25}}}},
        {objectId:'inherited',size:dim(120,80),transform:tr(200,160),image:{placeholder:{parentObjectId:'parent'}}},
        {objectId:'caption',size:dim(160,30),transform:tr(45,110),shape:{shapeType:'TEXT_BOX',text:{textElements:[{textRun:{content:'Image caption',style:{fontSize:{magnitude:14,unit:'PT'}}}}]}}}
      ]}]};
      window.imageFixtureModel=new NativeSlidesDocument(source);window.imageFixtureOriginal=JSON.stringify(source);window.imageRefreshes=0;
      window.imageFixtureMedia=new NativeSlidesMedia({presentation:async()=>{imageRefreshes++;const fresh=structuredClone(source);fresh.slides[0].pageElements[0].image.contentUrl=url('fresh');return fresh;}},imageFixtureModel,'images');
      const host=document.createElement('div');host.id='native-image-fixture';Object.assign(host.style,{position:'fixed',inset:'90px 180px',zIndex:'3000',background:'white'});document.body.append(host);window.imageFixtureRoot=ReactDOM.createRoot(host);
      imageFixtureRoot.render(React.createElement(NativeSlidesMediaContext.Provider,{value:imageFixtureMedia},React.createElement(NativeSlidesCanvas,{model:imageFixtureModel,page:0,checked:new Set([0]),selected:new Set(),setSelected:()=>{},perform:()=>{},busy:false,guides:{items:[]},showGuides:false,snap:false,version:0,fontOverrides:new Map()})));
    })()`);
    await browser.until('!!document.querySelector("#native-image-fixture [data-native-artwork=caption] span")','image fixture text rendered');
    const position=()=>browser.evaluate('(()=>{const r=document.querySelector("#native-image-fixture [data-native-artwork=caption] span").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()');
    const before=await position();suspended=false;await Promise.all(pending.splice(0).map(fulfill));
    await browser.until('document.querySelector("#native-image-fixture [data-native-image=photo]")?.dataset.imageState==="loaded"','expired image recovered');
    await browser.until('document.querySelector("#native-image-fixture [data-native-image=broken]")?.dataset.imageState==="error"','unrecoverable image retains a placeholder');
    await browser.until('document.querySelector("#native-image-fixture [data-native-image=inherited]")?.dataset.imageState==="loaded"','placeholder inherits actual image');
    await browser.until('document.querySelector("#native-image-fixture [data-native-image=crop]")?.dataset.imageState==="loaded"','cropped image decoded');
    assert.deepEqual(await position(),before,'image load/failure cannot shift adjacent text');
    assert.equal(await browser.evaluate('document.querySelector("#native-image-fixture [data-native-image=photo] img").src.endsWith("-fresh")'),true);
    assert.equal(await browser.evaluate('document.querySelector("#native-image-fixture [data-native-image=crop] foreignObject").parentElement.getAttribute("transform")'),'matrix(1.2 0 0 0.8 -60 0)');
    assert.equal(await browser.evaluate('document.querySelectorAll("#native-image-fixture [data-native-background] [data-native-image]").length'),0,'master placeholder image is not drawn a second time');
    assert.equal(await browser.evaluate('JSON.stringify(imageFixtureModel.original)===imageFixtureOriginal&&imageFixtureModel.requests().length===0'),true);
    assert.ok(await browser.evaluate('imageRefreshes<=2'),'failed image refreshes are bounded');assert.deepEqual(failures,[]);
    await writeFile('artifacts/native-image-recovery.png',Buffer.from((await browser.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    console.log('PASS native images: decoding, expired URL recovery, inherited images, crop and unchanged caption geometry');
  }finally{
    suspended=false;await Promise.all(pending.splice(0).map(fulfill));
    await browser.evaluate('window.imageFixtureMedia?.dispose();window.imageFixtureRoot?.unmount();document.querySelector("#native-image-fixture")?.remove()');
    await browser.send('Fetch.disable');browser.socket.removeEventListener('message',listener);
  }
}
