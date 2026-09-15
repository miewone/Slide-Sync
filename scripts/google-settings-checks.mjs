import assert from 'node:assert/strict';

/** Check user-owned settings, atomic validation, IndexedDB restoration and explicit deletion. */
export async function checkGoogleSettings(browser,origin){
  browser.errors=[];
  const ready=()=>browser.until('!!document.querySelector("#open")&&!document.querySelector("#open").disabled','settings ready');
  const click=selector=>browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const open=async()=>{await click('#open');await click('#file-open-drive');};
  const patch=()=>browser.evaluate(`(async()=>{const {GoogleSession}=await import('/src/services/google/GoogleSession.js');GoogleSession.prototype.prepare=async function(){window.google={accounts:{oauth2:{hasGrantedAllScopes:()=>true}}};this.client={requestAccessToken:()=>this.client.callback({access_token:'test-settings-token',expires_in:3600})};};})()`);
  const set=(selector,value)=>browser.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await browser.navigate(origin);await ready();
  await browser.evaluate(`(async()=>{const {GoogleSettingsRepository}=await import('/src/services/google/GoogleSettingsRepository.js');await new GoogleSettingsRepository().clear();})()`);
  await patch();await open();await browser.until('!!document.querySelector("#drive-settings")&&!document.querySelector("#drive-settings fieldset").disabled','first use requests own credentials');
  assert.equal(await browser.evaluate('document.querySelector("#drive-client-id").value'),'','no operator client ID default');
  assert.equal(await browser.evaluate('document.querySelector("#drive-api-key").value'),'','no operator key default');
  await click('#google-setup-guide summary');
  const setup=await browser.evaluate('document.querySelector("#google-setup-commands").textContent');
  assert.ok(setup.includes(origin+'/*,https://docs.google.com/*'),'CLI referrers match the active site');
  assert.ok(setup.includes('--api-target=service=picker.googleapis.com'),'generated key has API restrictions');
  await browser.evaluate('Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async value=>{window.copiedGoogleSetup=value;}}})');
  await click('#google-setup-copy');
  await browser.until('!!window.copiedGoogleSetup','commands copied');
  assert.equal(await browser.evaluate('window.copiedGoogleSetup'),setup);
  assert.equal(await browser.evaluate('!!document.querySelector("#drive-settings")'),true,'copy does not submit settings');
  await click('#google-setup-guide summary');
  await set('#drive-client-id','123-settings.apps.googleusercontent.com');await set('#drive-api-key','AIza'+'z'.repeat(30));await set('#drive-app-id','456');await click('#drive-settings-save');
  await browser.until('document.querySelector("#drive-dialog [role=alert]")?.textContent.includes("프로젝트")','mismatched project rejected');
  await set('#drive-app-id','123');await click('#drive-settings-save');await browser.until('!document.querySelector("#drive-settings")&&!document.querySelector("#drive-connect").disabled','valid settings saved');
  await click('#drive-connect');await browser.until('!document.querySelector("#drive-select").disabled','saved configuration connects');
  await browser.navigate(origin);await ready();await patch();await open();await browser.until('!document.querySelector("#drive-select").disabled','settings and unexpired connection restore after reload');
  await click('#drive-settings-edit');assert.equal(await browser.evaluate('document.querySelector("#drive-client-id").value'),'123-settings.apps.googleusercontent.com');
  await click('#drive-settings-remove');await browser.until('document.querySelector("#drive-client-id")?.value===""&&!document.querySelector("#drive-settings fieldset").disabled','settings removal clears form');
  assert.equal(await browser.evaluate('localStorage.getItem("slide-sync-google-token:123-settings.apps.googleusercontent.com:123")'),null,'deleting settings deletes associated token');
  await browser.navigate(origin);await ready();await open();await browser.until('!!document.querySelector("#drive-settings")&&!document.querySelector("#drive-settings fieldset").disabled','removed settings stay removed');
  assert.equal(await browser.evaluate('document.querySelector("#drive-client-id").value'),'');
  assert.deepEqual(browser.errors,[]);
  console.log('PASS Google settings: no operator credentials, validation, IndexedDB reload, connection restoration and deletion');
}
