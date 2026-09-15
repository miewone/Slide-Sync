import assert from 'node:assert/strict';
import {build,preview} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';

/** Verify a production consent build with intercepted Google tags; no actual Analytics data is sent. */
export async function checkAnalyticsConsent(browser){
  const previousId=process.env.VITE_GA4_MEASUREMENT_ID,previousMode=process.env.NODE_ENV;let server;
  try{
    process.env.NODE_ENV='production';
    process.env.VITE_GA4_MEASUREMENT_ID='G-CONSENTTEST';
    await build({build:{outDir:'artifacts/analytics-consent'}});
    const file='artifacts/analytics-consent/index.html';
    const html=await readFile(file,'utf8');
    assert.match(html,/name="slide-sync-ga4"/);
    await writeFile(file,html.replace(/(<meta name="slide-sync-ga4" content=")[^"]+/, '$1G-CONSENTTEST'));
  }finally{
    if(previousId===undefined)delete process.env.VITE_GA4_MEASUREMENT_ID;else process.env.VITE_GA4_MEASUREMENT_ID=previousId;
    if(previousMode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previousMode;
  }
  const requests=[];
  const listener=event=>{
    const message=JSON.parse(event.data);if(message.method!=='Fetch.requestPaused')return;
    requests.push(message.params.request.url);
    const body=Buffer.from('window.__testAnalyticsLoaded=(window.__testAnalyticsLoaded||0)+1;if(!window["ga-disable-G-CONSENTTEST"])document.cookie="slide_sync_ga=test; Path=/";').toString('base64');
    browser.send('Fetch.fulfillRequest',{requestId:message.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/javascript'}],body}).catch(()=>{});
  };
  browser.errors=[];browser.socket.addEventListener('message',listener);
  await browser.send('Fetch.enable',{patterns:[{urlPattern:'https://www.googletagmanager.com/*'},{urlPattern:'https://*.google-analytics.com/*'}]});
  try{
    server=await preview({build:{outDir:'artifacts/analytics-consent'},preview:{port:4191,strictPort:true}});
    const origin='http://127.0.0.1:4191';const click=selector=>browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    await browser.navigate(origin);await browser.until('!!document.querySelector("#analytics-consent")','consent choices visible');
    const screenshot=await browser.send('Page.captureScreenshot',{format:'png'});
    await writeFile(new URL('../artifacts/analytics-consent.png',import.meta.url),Buffer.from(screenshot.data,'base64'));
    assert.equal(requests.length,0,'no Google tag request before consent');
    await click('#analytics-reject');assert.equal(await browser.evaluate('!!document.querySelector("#analytics-consent")'),false);
    await browser.navigate(origin);await browser.until('!!document.querySelector("#analytics-settings")','preferences persist');
    assert.equal(requests.length,0,'rejection survives reload without contacting Google');
    await browser.until('!document.querySelector("#demo").disabled','editor ready');
    await click('#demo');await browser.until('!document.querySelector("#download").disabled','refusal permits normal editing');
    await click('#analytics-settings');await click('#analytics-accept');await browser.until('window.__testAnalyticsLoaded===1','tag loads after affirmative choice');
    assert.equal(requests.length,1);assert.equal(await browser.evaluate('document.cookie.includes("slide_sync_ga=")'),true);
    await browser.evaluate('localStorage.setItem("consent-editor-sentinel","keep")');
    await click('#analytics-settings');await click('#analytics-reject');
    assert.equal(await browser.evaluate('window["ga-disable-G-CONSENTTEST"]'),true,'withdrawal stops GA collection');
    assert.equal(await browser.evaluate('document.cookie.includes("slide_sync_ga=")'),false,'withdrawal clears analytics cookies');
    assert.equal(await browser.evaluate('localStorage.getItem("consent-editor-sentinel")'),'keep');
    assert.equal(await browser.evaluate('document.querySelector("#download").disabled'),false,'withdrawal preserves the loaded deck');
    await browser.navigate(origin);await browser.until('!!document.querySelector("#analytics-settings")','withdrawal persists');assert.equal(requests.length,1);
    assert.deepEqual(browser.errors,[]);
    console.log('PASS analytics consent: zero pre-consent requests, refusal/reload, opt-in, cookie cleanup and editing preserved');
  }finally{await browser.send('Fetch.disable');browser.socket.removeEventListener('message',listener);await server?.close();}
}
