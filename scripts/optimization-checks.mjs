import assert from 'node:assert/strict';
import {makeDeckFixture} from '../tests/deck-fixtures.mjs';

/** @param {object} browser DevTools client. @param {string} origin Application URL. */
async function prepare(browser,origin) {
  browser.errors=[];
  await browser.navigate(origin);
  await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled','optimization app ready');
  await browser.evaluate(`(async()=>{globalThis.makeDeckFixture=${makeDeckFixture.toString()};
    globalThis.sampleBuffer=await (await fetch(new URL('sample.pptx',document.baseURI))).arrayBuffer();
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('vendor/jszip.min.js',document.baseURI);script.onload=resolve;script.onerror=reject;document.head.append(script)});
    globalThis.openFixture=(blob,name)=>{const transfer=new DataTransfer();transfer.items.add(new File([blob],name));const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}))};})()`);
}

/** Verify actual charts after a chart-free first deck, including inherited charts. */
export async function checkChartLoading(browser,origin) {
  await prepare(browser,origin);
  await browser.evaluate("(async()=>openFixture(await makeDeckFixture(JSZip,sampleBuffer,3),'plain.pptx'))()");
  await browser.until('!document.querySelector("#download").disabled','plain fixture');
  assert.equal(await browser.evaluate('typeof globalThis.echarts'),'undefined','chart-free deck must not initialize ECharts');
  assert.equal(await browser.evaluate('performance.getEntriesByType("resource").filter(e=>e.name.includes("echarts")).length'),0,'no ECharts request for plain deck');
  for(const scope of ['group','slide','layout','master']) {
    const name=`chart-${scope}.pptx`;
    await browser.evaluate(`(async()=>openFixture(await makeDeckFixture(JSZip,sampleBuffer,1,{chart:true,chartScope:${JSON.stringify(scope)}}),${JSON.stringify(name)}))()`);
    await browser.until(`document.querySelector('#filename').textContent===${JSON.stringify(name)} && !document.querySelector('#download').disabled`,'chart '+scope);
    if(scope==='group') {
      // The bundled renderer only draws shapes/images inside groups; preserve that boundary.
      await browser.until('!!document.querySelector("#stage iframe")?.contentDocument?.querySelector(".group")','group wrapper');
      assert.equal(await browser.evaluate('typeof globalThis.echarts.init'),'function','grouped chart references also trigger dependency loading');
    } else await browser.until('!!document.querySelector("#stage iframe")?.contentDocument?.querySelector(".chart-node svg path")','chart SVG '+scope);
    assert.equal(await browser.evaluate('document.querySelectorAll(".foot-note").length'),0,'chart renders without fallback');
  }
  assert.equal(await browser.evaluate('performance.getEntriesByType("resource").filter(e=>e.name.includes("echarts.min.js")).length'),1,'all chart decks share one ECharts request');
  assert.deepEqual(browser.errors,[],'chart loading errors');
  console.log('PASS charts: no request for plain deck, group references detected, later slide/layout/master charts render, one shared ECharts load');
}

/**
 * Measure repeatable synthetic decks and validate offscreen edit/fit compatibility.
 * @param {object} browser DevTools client.
 * @param {string} origin Built application root.
 * @param {object} options baseline allows the original eager iframe behavior.
 */
export async function checkLargeDecks(browser,origin,{baseline=false}={}) {
  const results=[];
  for(const count of [30,60,120]) {
    await prepare(browser,origin);
    await browser.evaluate(`(async()=>{globalThis.fixtureBlob=await makeDeckFixture(JSZip,sampleBuffer,${count});})()`);
    await browser.send('HeapProfiler.collectGarbage');
    await browser.evaluate(`globalThis.loadTiming={start:performance.now(),firstFrameMs:null,firstFrameWhileBusy:false};
      const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){
        if(node.nodeType!==1)continue;
        const frames=node.matches('iframe')?[node]:node.querySelectorAll('iframe');
        for(const frame of frames)frame.addEventListener('load',()=>{
          if(loadTiming.firstFrameMs===null && frame.contentDocument?.querySelector('[data-pptx-mover]')){
            loadTiming.firstFrameMs=performance.now()-loadTiming.start;loadTiming.firstFrameWhileBusy=!!document.querySelector('.topbar.busy');
          }
        });
      }});observer.observe(document.querySelector('#stage'),{childList:true,subtree:true});
      openFixture(fixtureBlob,'large-${count}.pptx');`);
    await browser.until(`document.querySelector('#filename').textContent==='large-${count}.pptx' && !document.querySelector('#download').disabled`,'large deck '+count);
    const readyMs=await browser.evaluate('performance.now()-loadTiming.start');
    await browser.until('loadTiming.firstFrameMs!==null','first frame metric');
    await browser.until('[...document.querySelectorAll("#stage iframe")].every(f=>f.contentDocument?.querySelector("[data-pptx-mover]"))','visible frames complete');
    const frames=await browser.evaluate('document.querySelectorAll("#stage iframe").length');
    assert.equal(await browser.evaluate('document.querySelectorAll(".slide-card").length'),count,'every slide has an addressable shell');
    if(!baseline) {
      assert.ok(frames<count/2,`${count} slides should not mount ${frames} frames`);
      assert.equal(await browser.evaluate('typeof globalThis.echarts'),'undefined');
      assert.equal(await browser.evaluate('loadTiming.firstFrameWhileBusy'),true,'first preview appears before the full cache is prepared');
    }
    const timing=await browser.evaluate('loadTiming');
    await browser.send('HeapProfiler.collectGarbage');
    const heap=await browser.send('Runtime.getHeapUsage');
    const dom=await browser.send('Memory.getDOMCounters');
    // Use real pointer events and measure the runtime's draft RAF completion.
    await browser.evaluate(`document.querySelector('.slide-surface').dispatchEvent(new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true}));
      globalThis.dragSamples=[];document.querySelector('.slide-surface').addEventListener('pointermove',()=>{
        const start=performance.now();requestAnimationFrame(()=>dragSamples.push(performance.now()-start));
      });`);
    const point=await browser.evaluate(`(()=>{const r=document.querySelector('.slide-surface').getBoundingClientRect();return {x:r.left+30,y:r.top+2}})()`);
    await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
    for(let step=1;step<=10;step++) {
      await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+20+step*2,y:point.y+20,button:'left',buttons:1});
      await browser.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    }
    await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
    const samples=await browser.evaluate('dragSamples');
    assert.ok(samples.length>=10,'draft timings captured');
    samples.sort((a,b)=>a-b);
    const result={mode:baseline?'baseline':'optimized',slides:count,firstFrameMs:Math.round(timing.firstFrameMs),readyMs:Math.round(readyMs),frames,
      documents:dom.documents,domNodes:dom.nodes,jsHeapMiB:Number((heap.usedSize/1024/1024).toFixed(1)),dragP95Ms:Number(samples[Math.ceil(samples.length*.95)-1].toFixed(1))};
    results.push(result);console.log('MEASURE '+JSON.stringify(result));
    if(!baseline) {
      // All-slide edits must reach a slide which has never had an iframe.
      await browser.evaluate(`document.querySelector('#move-mode').value='relative';document.querySelector('#move-mode').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#x').value='1';document.querySelector('#y').value='0';document.querySelector('#move').click();`);
      await browser.until('!document.querySelector("#undo").disabled','offscreen movement');
      assert.equal(await browser.evaluate(`!!document.querySelector('#slide-${count-1} iframe')`),false,'last slide still detached');
      // Fit only the last slide while its preview DOM is detached.
      await browser.evaluate(`document.querySelector('#range').value='${count}';document.querySelector('#apply-range').click();document.querySelector('#fit-text').click();`);
      await browser.until('document.querySelector("#status").textContent.includes("높이를 내용에 맞췄습니다") && !document.querySelector("#download").disabled','offscreen text fit');
      assert.equal(await browser.evaluate('document.querySelector("#status").textContent.includes("건너뛰")'),false,'cached text is measurable offscreen');
      await browser.evaluate(`document.querySelector('#slide-${count-1}').scrollIntoView({block:'center'});`);
      await browser.until(`!!document.querySelector('#slide-${count-1} iframe')?.contentDocument?.querySelector('[data-pptx-mover]')`,'last frame mounts on scroll');
      assert.ok(await browser.evaluate(`document.querySelector('#slide-${count-1} iframe').contentDocument.querySelector('[data-pptx-mover]').style.transform.includes('translate')`),'unseen slide retains movement');
      assert.equal(await browser.evaluate(`(()=>{const d=document.querySelector('#slide-${count-1} iframe').contentDocument;return [...d.querySelectorAll('[data-pptx-mover]')].some(m=>m.dataset.originalFontScale && Math.abs(parseFloat(m.firstElementChild.style.height)-Number(m.dataset.originH)/Number(m.dataset.unitsPerPixel))>1)})()`),true,'offscreen fit changes rendered box height');
      await browser.evaluate(`globalThis.lastFrame=document.querySelector('#slide-${count-1} iframe');document.querySelector('#undo').click();`);
      assert.equal(await browser.evaluate(`lastFrame===document.querySelector('#slide-${count-1} iframe')`),true,'undo retains late-mounted frame');
      assert.deepEqual(browser.errors,[],'large deck errors');
    }
  }
  return results;
}
