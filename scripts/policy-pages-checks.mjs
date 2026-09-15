import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

/** Verify public legal pages, homepage discovery and subpath links without requiring page JavaScript. */
export async function checkPolicyPages(browser,origin){
  browser.errors=[];await browser.navigate(origin);
  await browser.until('!!document.querySelector("#privacy-link")','homepage policy links');
  const privacy=await browser.evaluate('document.querySelector("#privacy-link").href'),terms=await browser.evaluate('document.querySelector("#terms-link").href');
  assert.equal(privacy,new URL('privacy.html',origin.endsWith('/')?origin:origin+'/').href);
  assert.equal(terms,new URL('terms.html',origin.endsWith('/')?origin:origin+'/').href);
  assert.equal(await browser.evaluate('document.querySelector("#privacy-link").target'),'_blank','policy reading preserves unsaved editor state');
  await browser.send('Emulation.setScriptExecutionDisabled',{value:true});
  try{
    for(const [url,title] of [[privacy,'개인정보처리방침'],[terms,'서비스 이용약관']]){
      const response=await fetch(url);assert.equal(response.status,200,'direct public HTTP access');
      const html=await response.text();assert.ok(html.includes(title));assert.doesNotMatch(html,/<script\b/i,'policy pages need no scripts or analytics');
      await browser.navigate(url);
      assert.equal(await browser.evaluate('document.querySelector("h1").textContent'),title);
      assert.equal(await browser.evaluate('!!document.querySelector("section[lang=en]")'),true);
      assert.equal(await browser.evaluate('document.querySelector(".legal-brand").href'),new URL('./',privacy).href);
      assert.equal(await browser.evaluate('getComputedStyle(document.querySelector(".legal-card")).borderRadius'),'16px','relative stylesheet loads');
      assert.equal(await browser.evaluate("document.fonts.ready.then(()=>document.fonts.check('16px \"Slide Sync Legal\"','개인정보'))"),true,'bundled Korean font loads without external services');
      if(url===privacy&&origin.includes(':4179')){const screenshot=await browser.send('Page.captureScreenshot',{format:'png'});await writeFile(new URL('../artifacts/privacy-policy.png',import.meta.url),Buffer.from(screenshot.data,'base64'));}
      await browser.send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:false});
      assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'legal page fits narrow screens');
      await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    }
  }finally{await browser.send('Emulation.setScriptExecutionDisabled',{value:false});}
  assert.deepEqual(browser.errors,[],'public policies have no browser errors');
  console.log('PASS public policies: direct access, home links, Korean/English, no scripts, subpath and mobile layout');
}
