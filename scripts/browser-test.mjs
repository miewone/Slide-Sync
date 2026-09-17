import {checkResizeXml} from './element-resize-checks.mjs';
import {checkDownloadOptions} from './download-options-checks.mjs';
import {checkDriveLoading} from './drive-loading-checks.mjs';
import {checkAnalyticsConsent} from './analytics-consent-checks.mjs';
import {checkPolicyPages} from './policy-pages-checks.mjs';
import {checkGoogleSettings} from './google-settings-checks.mjs';
import {checkFileOpen} from './file-open-checks.mjs';
import {checkGoogleDrive} from './google-drive-checks.mjs';
import {checkTextFormat} from './text-format-checks.mjs';
import {checkPreviewFormatFiles} from './preview-format-files-checks.mjs';
import {checkPreviewCache} from './preview-cache-checks.mjs';
import {checkBackgroundPersistence} from './background-persistence-checks.mjs';
import {checkPreviewFormat} from './preview-format-checks.mjs';
import {checkPanelLayout} from './panel-layout-checks.mjs';
import {checkPreviewGrid} from './preview-grid-checks.mjs';
import {checkSelectionVisibility} from './selection-visibility-checks.mjs';
import {checkLocalization} from './localization-checks.mjs';
import {measureWorkflows,workflowMarkdown} from './workflow-performance.mjs';
import {checkDeletion} from './deletion-checks.mjs';
import {checkCorePerformance} from './core-performance-checks.mjs';
import {checkPreviewFit} from './preview-fit-checks.mjs';
import {checkStaticMedia} from './media-checks.mjs';
import {checkMissingDefaultTextStyle} from './default-text-style-checks.mjs';
import {checkXmlErrors} from './xml-error-checks.mjs';
import {checkXmlCompatibility} from './xml-compatibility-checks.mjs';
import {checkPreviewFonts} from './font-checks.mjs';
import {checkActivityLog} from './activity-log-checks.mjs';
import {checkRepeatedEdits} from './repeated-edit-checks.mjs';
import {checkRecentFiles} from './recent-files-checks.mjs';
import {checkPreviewHover} from './preview-hover-checks.mjs';
import {checkPreviewActivation} from './activation-checks.mjs';
import {checkInspector} from './inspector-checks.mjs';
import {checkSlideSearch} from './slide-search-checks.mjs';
import {checkRangeSelection} from './range-selection-checks.mjs';
import {checkChartLoading,checkLargeDecks} from './optimization-checks.mjs';
import {build, createServer, preview} from 'vite';
import {spawn} from 'node:child_process';
import {mkdtemp, readFile, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Minimal Chrome DevTools client; uses Node's WebSocket without test dependencies. */
class Browser {
  /** @param {WebSocket} socket Open page-level DevTools connection. */
  constructor(socket) {
    this.socket = socket;this.pending = new Map();this.nextId = 1;this.errors = [];this.loadedDocuments = new Set();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        message.error ? pending.reject(Error(`${pending.method}: ${JSON.stringify(message.error)}`)) : pending.resolve(message.result);
      }
      if(message.method==='Page.lifecycleEvent' && message.params.name==='DOMContentLoaded')this.loadedDocuments.add(message.params.loaderId);
      if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails);
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') this.errors.push(message.params.entry);
    });
  }
  /** @param {string} method DevTools method. @param {object} params Command arguments. */
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;this.pending.set(id, {resolve, reject, method});
      this.socket.send(JSON.stringify({id, method, params}));
    });
  }
  /** @param {string} url Wait for the new document before inspecting app readiness. */
  async navigate(url) {
    const {loaderId,errorText}=await this.send('Page.navigate',{url});
    if(errorText)throw Error(errorText);
    if(!loaderId)return;
    for(let attempt=0;attempt<400;attempt++){
      if(this.loadedDocuments.has(loaderId))return;
      await pause(25);
    }
    throw Error(`Document did not load: ${url}`);
  }
  /** @param {string} expression Browser JavaScript expression, awaited by Chrome. */
  async evaluate(expression) {
    let response;
    try{response=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});}
    catch(error){throw Error(`${error.message}\nExpression: ${expression.slice(0,250)}`,{cause:error});}
    if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  }
  /** @param {string} expression Boolean browser predicate. @param {string} label Failure context. */
  async until(expression, label) {
    for (let i = 0; i < 200; i++) {
      if (await this.evaluate(expression)) return;
      await pause(100);
    }
    throw Error(`Timed out: ${label}\n${JSON.stringify(this.errors)}`);
  }
}

const artifacts = 'artifacts';
await mkdir(artifacts, {recursive:true});
const profile = await mkdtemp(join(tmpdir(), 'slide-sync-chrome-'));
let dev, prod, subpath, baseline, chrome, browser;
const timeout = setTimeout(() => { console.error('Browser tests exceeded 240 seconds');process.exit(1); }, 240000);
try {
  const previousNodeEnv=process.env.NODE_ENV;
  await build({base:'/slides/',build:{outDir:'artifacts/subpath'}});
  if(previousNodeEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previousNodeEnv;
  dev = await createServer({server:{port:5179, strictPort:true}});await dev.listen();
  prod = await preview({preview:{port:4179, strictPort:true}});
  subpath = await preview({base:'/slides/',build:{outDir:'artifacts/subpath'},preview:{port:4189,strictPort:true}});
  if(process.argv.includes('--benchmark-baseline'))baseline=await preview({build:{outDir:'artifacts/baseline'},preview:{port:4190,strictPort:true}});
  chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-features=BackForwardCache', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], {stdio:'ignore'});
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0];break; }
    catch { await pause(100); }
  }
  assert.ok(port, 'Chrome must start');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {socket.addEventListener('open', resolve, {once:true});socket.addEventListener('error', reject, {once:true});});
  browser = new Browser(socket);
  await browser.send('Page.enable');await browser.send('Page.setLifecycleEventsEnabled',{enabled:true});await browser.send('Runtime.enable');await browser.send('Log.enable');
  await browser.send('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await browser.send('Network.setUserAgentOverride',{userAgent:(await browser.send('Browser.getVersion')).userAgent,acceptLanguage:'ko-KR,ko;q=0.9,en;q=0.8'});

  if(process.argv.includes('--check-analytics-consent')) {
    await checkAnalyticsConsent(browser);
  } else if(process.argv.includes('--check-policy-pages')) {
    for(const origin of ['http://127.0.0.1:5179','http://127.0.0.1:4179','http://127.0.0.1:4189/slides/'])await checkPolicyPages(browser,origin);
  } else if(process.argv.includes('--check-file-open')) {
    for(const origin of ['http://127.0.0.1:5179','http://127.0.0.1:4179','http://127.0.0.1:4189/slides/'])await checkFileOpen(browser,origin);
    await checkGoogleSettings(browser,'http://127.0.0.1:5179');
    await checkGoogleDrive(browser,'http://127.0.0.1:5179');
    await checkDriveLoading(browser,'http://127.0.0.1:5179');
  } else if(process.argv.includes('--check-download-options')) {
    await checkDownloadOptions(browser,'http://127.0.0.1:5179');
  } else if(process.argv.includes('--check-recent-files')) {
    for(const origin of ['http://127.0.0.1:5179','http://127.0.0.1:4179','http://127.0.0.1:4189/slides/'])await checkRecentFiles(browser,origin);
  } else if(process.argv.includes('--check-drive-loading')) {
    await checkDriveLoading(browser,'http://127.0.0.1:5179');
  } else if(process.argv.includes('--check-google-drive')) {
    await checkGoogleDrive(browser,'http://127.0.0.1:5179');
    await checkDriveLoading(browser,'http://127.0.0.1:5179');
  } else if(process.argv.includes('--check-activity-log')) {
    for(const origin of ['http://127.0.0.1:5179','http://127.0.0.1:4179','http://127.0.0.1:4189/slides/'])await checkActivityLog(browser,origin);
  } else if(process.argv.includes('--check-background-persistence')) {
    await checkBackgroundPersistence(browser,'http://127.0.0.1:5179');
  } else if(process.argv.includes('--check-zoom')) {
    browser.checkZoom=true;
    await checkRangeSelection(browser,'http://127.0.0.1:4179',12);
    await checkGoogleDrive(browser,'http://127.0.0.1:5179');
  } else if(process.argv.includes('--check-resize')) {
    await checkResizeXml(browser,'http://127.0.0.1:5179');
    await checkRangeSelection(browser,'http://127.0.0.1:4179',12);
  } else if(process.argv.includes('--check-similar-selection')) {
    await checkRangeSelection(browser,'http://127.0.0.1:4179',12);
  } else if(process.argv.includes('--check-appearance')) {
    for(const origin of ['http://127.0.0.1:5179','http://127.0.0.1:4179','http://127.0.0.1:4189/slides/'])await checkRangeSelection(browser,origin,3);
    await browser.evaluate('document.querySelector("#appearance-settings").click()');
    await browser.until('document.querySelector("#appearance-panel").matches(":popover-open")','appearance screenshot');
    const screenshot=await browser.send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(artifacts,'appearance-panel.png'),Buffer.from(screenshot.data,'base64'));
  } else if(process.argv.includes('--check-fonts')) {
    for(const origin of ['http://127.0.0.1:5179','http://127.0.0.1:4179','http://127.0.0.1:4189/slides/'])await checkPreviewFonts(browser,origin);
  } else if(process.argv.includes('--benchmark-workflows')) {
    const report=await measureWorkflows(browser,'http://127.0.0.1:4179');
    await writeFile(join(artifacts,'workflow-performance.json'),JSON.stringify(report,null,2)+'\n');
    await writeFile(join(artifacts,'workflow-performance.md'),workflowMarkdown(report));
    console.log('PASS workflow benchmark: 10/100 slides, three repeats, edited PPTX validation');
  } else if(process.argv.includes('--check-preview-format-files')) {
    await checkPreviewFormatFiles(browser,'http://127.0.0.1:5179');
  } else if(process.argv.includes('--check-preview-format')) {
    await checkPreviewFormat(browser,'http://127.0.0.1:5179');
    if(process.env.PREVIEW_FORMAT_SOURCE){
      await checkPreviewFormat(browser,'http://127.0.0.1:5179',process.env.PREVIEW_FORMAT_SOURCE);
      const screenshot=await browser.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
      await writeFile(join(artifacts,'preview-format.png'),Buffer.from(screenshot.data,'base64'));
    }
  } else if(process.argv.includes('--check-preview-cache')) {
    for(const origin of ['http://127.0.0.1:5179','http://127.0.0.1:4179','http://127.0.0.1:4189/slides/'])await checkPreviewCache(browser,origin);
  } else if(process.argv.includes('--check-text-format')) {
    await checkTextFormat(browser,'http://127.0.0.1:5179');
    await checkPreviewFit(browser,'http://127.0.0.1:5179');
    await checkInspector(browser,'http://127.0.0.1:5179');
  } else if(process.argv.includes('--check-preview-grid')) {
    for(const origin of ['http://127.0.0.1:5179','http://127.0.0.1:4179','http://127.0.0.1:4189/slides/'])await checkPreviewGrid(browser,origin);
  } else {
  for (const [mode, origin] of [['development','http://127.0.0.1:5179'], ['production','http://127.0.0.1:4179'], ['subpath','http://127.0.0.1:4189/slides/']]) {
    browser.errors = [];
    await browser.navigate(origin);
    await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled', `${mode} ready`);
    assert.equal(await browser.evaluate('performance.getEntriesByType("resource").filter(e => e.name.includes("/vendor/")).length'), 0, 'no initial vendor loads');
    await browser.evaluate('document.querySelector("#demo").click()');
    await browser.until('document.querySelectorAll("#stage iframe").length > 0 && !document.querySelector("#download").disabled', `${mode} sample open`);
    await browser.until('[...document.querySelectorAll("#stage iframe")].every(f => f.contentDocument?.querySelector("[data-pptx-mover]"))', 'preview documents loaded');
    assert.equal(await browser.evaluate('document.querySelectorAll(".foot-note").length'), 0, 'no fallback');
    const count = await browser.evaluate('document.querySelectorAll("#stage iframe").length');
    assert.ok(count > 1);
    await browser.evaluate(`window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));`);
    await browser.evaluate(`globalThis.framesBefore = [...document.querySelectorAll('#stage iframe')].map(frame => ({frame,doc:frame.contentDocument}));
      globalThis.initialResources = performance.getEntriesByType('resource').filter(e => e.name.includes("/vendor/")).length;
      globalThis.zipEncodes=0;const originalEncode=JSZip.prototype.generateAsync;JSZip.prototype.generateAsync=function(...args){zipEncodes++;return originalEncode.apply(this,args)};
      globalThis.srcdocWrites=0;const srcdoc=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'srcdoc');Object.defineProperty(HTMLIFrameElement.prototype,'srcdoc',{...srcdoc,set(value){srcdocWrites++;return srcdoc.set.call(this,value)}});
      document.querySelector('.slide-surface').dispatchEvent(new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true}));`);
    await browser.until('Number(document.querySelector(".selection-number").textContent)>0', 'select all');
    await browser.evaluate(`document.querySelector('#move-mode').value='relative';document.querySelector('#move-mode').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#x').value='1';document.querySelector('#y').value='0';document.querySelector('#move').click();`);
    await browser.until('!document.querySelector("#undo").disabled', 'move');
    assert.ok(await browser.evaluate('framesBefore[0].doc.querySelector("[data-pptx-mover]").style.transform.includes("translate")'), 'preview moves');
    await browser.evaluate('document.querySelector("#undo").click()');
    await browser.until('document.querySelector("#undo").disabled', 'undo');
    assert.equal(await browser.evaluate('framesBefore[0].doc.querySelector("[data-pptx-mover]").style.transform'), '', 'undo coordinates');
    await browser.evaluate('document.querySelector("#select-none").click()');
    await browser.until('[...document.querySelectorAll(".slide-item input")].every(e => !e.checked)', 'React scope list');
    await browser.evaluate('document.querySelector("#select-all").click()');
    await browser.until('[...document.querySelectorAll(".slide-item input")].every(e => e.checked)', 'restore scope');
    await browser.evaluate('document.querySelector("#guide-horizontal").click()');
    await browser.until('document.querySelectorAll(".guide-line").length > 0', 'add guides');
    await browser.evaluate('document.querySelector("#undo").click()');
    assert.equal(await browser.evaluate('framesBefore.every(({frame,doc})=>frame.isConnected && frame.contentDocument===doc)'), true, 'iframe documents preserved');
    assert.equal(await browser.evaluate('srcdocWrites'), 0, 'no frame reload during edits');
    assert.equal(await browser.evaluate('zipEncodes'), 0, 'no ZIP encoding during edits');
    assert.equal(await browser.evaluate('performance.getEntriesByType("resource").filter(e=>e.name.includes("/vendor/")).length===initialResources'), true, 'vendor resources reused');
    // Export the edited XML and re-open it through React's file input.
    await browser.evaluate(`globalThis.originalX=Number(framesBefore[0].doc.querySelector('[data-pptx-mover]').dataset.originX);
      const createURL=URL.createObjectURL;URL.createObjectURL=function(blob){globalThis.exportedBlob=blob;return createURL.call(this,blob)};
      const anchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)anchorClick.call(this)};
      document.querySelector('#move').click();document.querySelector('#download').click();`);
    await browser.until('!!globalThis.exportedBlob && !document.querySelector("#download").disabled', 'PPTX export');
    assert.equal(await browser.evaluate('zipEncodes'), 1, 'encode only on download');
    await browser.evaluate(`const transfer=new DataTransfer();transfer.items.add(new File([exportedBlob],'roundtrip.pptx'));
      const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));`);
    await browser.until('document.querySelector("#filename").textContent==="roundtrip.pptx" && !document.querySelector("#download").disabled', 'reimport');
    await browser.until('!!document.querySelector("#stage iframe")?.contentDocument?.querySelector("[data-pptx-mover]")', 'reimport frame ready');
    assert.ok(await browser.evaluate('(()=>{const mover=document.querySelector("#stage iframe").contentDocument.querySelector("[data-pptx-mover]");const x=Number(mover.dataset.originX)+new DOMMatrix(mover.style.transform).m41*Number(mover.dataset.unitsPerPixel);return Math.abs(x-originalX-360000)<1;})()'), 'export/reimport preserves 1 cm movement within CSS rounding (1 EMU)');
    assert.equal(await browser.evaluate('document.querySelectorAll(".foot-note").length'), 0, 'reimport no fallback');
    const screenshot = await browser.send('Page.captureScreenshot', {format:'png'});
    await writeFile(join(artifacts, `${mode}.png`), Buffer.from(screenshot.data, 'base64'));
    assert.deepEqual(browser.errors, [], `${mode} browser errors`);
    console.log(`PASS ${mode}: ${count} previews, lazy loading, selection, move/undo, scope, guides, frame/ZIP reuse, export/reimport, no browser errors`);
  }
  for(const origin of ['http://127.0.0.1:5179','http://127.0.0.1:4179','http://127.0.0.1:4189/slides/'])await checkPreviewCache(browser,origin);
  browser.errors = [];
  await checkPreviewFormatFiles(browser,'http://127.0.0.1:5179');
  await checkPreviewFormat(browser,'http://127.0.0.1:5179');
  await browser.navigate('http://127.0.0.1:5179/tests/preview-theme.html');
  await browser.until('document.querySelector("#result")?.textContent !== "RUNNING" && !!document.querySelector("#result")', 'theme fixture');
  const theme = await browser.evaluate('document.querySelector("#result").textContent');
  assert.ok(theme.startsWith('PASS'), theme);console.log(theme);
  browser.errors = [];
  await browser.navigate('http://127.0.0.1:5179/tests/editor-lifecycle.html');
  await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled', 'lifecycle ready');
  await browser.evaluate('pauseZip();document.querySelector("#demo").click()');
  await browser.until('!!document.querySelector(".topbar.busy")', 'async ZIP suspended');
  await browser.evaluate('unmountEditor();releaseZip();');
  await pause(200);
  await browser.evaluate('mountEditor()');
  await browser.until('!!document.querySelector("#demo") && !document.querySelector("#demo").disabled', 'remount ready');
  assert.equal(await browser.evaluate('document.querySelectorAll("#stage iframe").length'), 0, 'disposed load cannot attach previews');
  await browser.evaluate('document.querySelector("#demo").click()');
  await browser.until('!document.querySelector("#download").disabled', 'remounted editor loads sample');
  assert.equal(await browser.evaluate('document.querySelectorAll("#stage iframe").length'), 8, 'single runtime after remount');
  assert.deepEqual(browser.errors, [], 'lifecycle has no async unmount exceptions');
  console.log('PASS lifecycle: StrictMode, unmount during async loading, remount and reopen');
  await checkAnalyticsConsent(browser);
  await checkPolicyPages(browser,'http://127.0.0.1:4179');
  await checkPreviewHover(browser,'http://127.0.0.1:5179');
  await checkPreviewHover(browser,'http://127.0.0.1:4179');
  await checkPreviewHover(browser,'http://127.0.0.1:4189/slides/');
  await checkPreviewActivation(browser,'http://127.0.0.1:5179');
  await checkPreviewActivation(browser,'http://127.0.0.1:4179');
  await checkPreviewActivation(browser,'http://127.0.0.1:4189/slides/');
  await checkDeletion(browser,'http://127.0.0.1:5179');
  await checkDeletion(browser,'http://127.0.0.1:4179');
  await checkDeletion(browser,'http://127.0.0.1:4189/slides/');
  await checkPreviewGrid(browser,'http://127.0.0.1:5179');
  await checkPreviewGrid(browser,'http://127.0.0.1:4179');
  await checkPreviewGrid(browser,'http://127.0.0.1:4189/slides/');
  await checkLocalization(browser,'http://127.0.0.1:5179');
  await checkLocalization(browser,'http://127.0.0.1:4179');
  await checkLocalization(browser,'http://127.0.0.1:4189/slides/');
  await checkSelectionVisibility(browser,'http://127.0.0.1:5179');
  await checkSelectionVisibility(browser,'http://127.0.0.1:4179');
  await checkSelectionVisibility(browser,'http://127.0.0.1:4189/slides/');
  await checkPanelLayout(browser,'http://127.0.0.1:5179');
  await checkPanelLayout(browser,'http://127.0.0.1:4179');
  await checkPanelLayout(browser,'http://127.0.0.1:4189/slides/');
  await checkGoogleDrive(browser,'http://127.0.0.1:5179');
  await checkDriveLoading(browser,'http://127.0.0.1:5179');
  await checkGoogleSettings(browser,'http://127.0.0.1:5179');
  await checkDownloadOptions(browser,'http://127.0.0.1:5179');
  await checkFileOpen(browser,'http://127.0.0.1:5179');
  await checkRecentFiles(browser,'http://127.0.0.1:5179');
  await checkRecentFiles(browser,'http://127.0.0.1:4179');
  await checkRecentFiles(browser,'http://127.0.0.1:4189/slides/');
  await checkBackgroundPersistence(browser,'http://127.0.0.1:5179');
  await checkRangeSelection(browser,'http://127.0.0.1:5179',3);
  await checkRangeSelection(browser,'http://127.0.0.1:4179',12);
  await checkRangeSelection(browser,'http://127.0.0.1:4189/slides/',3);
  await checkSlideSearch(browser,'http://127.0.0.1:5179');
  await checkSlideSearch(browser,'http://127.0.0.1:4179');
  await checkSlideSearch(browser,'http://127.0.0.1:4189/slides/');
  await checkInspector(browser,'http://127.0.0.1:5179');
  await checkInspector(browser,'http://127.0.0.1:4179');
  await checkInspector(browser,'http://127.0.0.1:4189/slides/');
  await checkCorePerformance(browser,'http://127.0.0.1:5179');
  await checkPreviewFit(browser,'http://127.0.0.1:5179');
  await checkRepeatedEdits(browser,'http://127.0.0.1:5179');
  await checkRepeatedEdits(browser,'http://127.0.0.1:4179');
  await checkRepeatedEdits(browser,'http://127.0.0.1:4189/slides/');
  await checkStaticMedia(browser,'http://127.0.0.1:4179');
  await checkTextFormat(browser,'http://127.0.0.1:5179');
  await checkMissingDefaultTextStyle(browser,'http://127.0.0.1:4179');
  await checkXmlErrors(browser,'http://127.0.0.1:4179');
  await checkXmlCompatibility(browser,'http://127.0.0.1:5179');
  await checkPreviewFonts(browser,'http://127.0.0.1:4179');
  await checkActivityLog(browser,'http://127.0.0.1:4179');
  await checkStaticMedia(browser,'http://127.0.0.1:4189/slides/');
  await checkChartLoading(browser,'http://127.0.0.1:4179');
  const measurements=[];
  if(baseline)measurements.push(...await checkLargeDecks(browser,'http://127.0.0.1:4190',{baseline:true}));
  measurements.push(...await checkLargeDecks(browser,'http://127.0.0.1:4179'));
  await writeFile(join(artifacts,'optimization-metrics.json'),JSON.stringify(measurements,null,2));
  console.log('PASS large decks: 30/60/120 slides, progressive display, limited initial frames, offscreen move/fit/undo');
  }
} finally {
  clearTimeout(timeout);
  browser?.socket.close();
  chrome?.kill('SIGTERM');
  await dev?.close();
  await new Promise(resolve => prod ? prod.httpServer.close(resolve) : resolve());
  await new Promise(resolve => subpath ? subpath.httpServer.close(resolve) : resolve());
  await new Promise(resolve => baseline ? baseline.httpServer.close(resolve) : resolve());
  if(chrome) await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
  await rm(profile, {recursive:true, force:true, maxRetries:5, retryDelay:200});
}
