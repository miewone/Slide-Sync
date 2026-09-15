import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {generatePreviewFormatFixtures} from './generate-preview-format-fixtures.mjs';

/** Generate real PPTX files and verify those exact bytes in Chrome, saving a per-file report.
 * @param {object} browser DevTools client. @param {string} origin Development server URL.
 */
export async function checkPreviewFormatFiles(browser, origin) {
  const manifest = await generatePreviewFormatFixtures();
  const reports = [];
  try {
    for (const item of manifest) {
      browser.errors = [];
      await browser.navigate(`${origin}/tests/preview-format-files.html?file=${encodeURIComponent(item.file)}`);
      await browser.until('!!document.querySelector("#result") && document.querySelector("#result").textContent !== "RUNNING"', item.file);
      const result = await browser.evaluate('document.querySelector("#result").textContent');
      const report = await browser.evaluate('globalThis.fixtureReport') || {file:item.file,status:'FAIL',error:result};
      if (browser.errors.length) Object.assign(report, {status:'FAIL', browserErrors:browser.errors});
      reports.push(report);
      assert.ok(result.startsWith('PASS'), result);
      assert.deepEqual(browser.errors, [], 'no browser errors');
      console.log(result);
      if (item.cases.length===1) {
        const screenshot = await browser.send('Page.captureScreenshot', {format:'png'});
        await writeFile(`artifacts/preview-format-fixtures/${item.file.replace('.pptx','.png')}`, Buffer.from(screenshot.data,'base64'));
      }
    }
    // Exercise the normal React file-open path with the same combined artifact.
    await browser.navigate(origin);
    await browser.until('!!document.querySelector("#file") && !document.querySelector("#demo").disabled', 'app file input ready');
    await browser.evaluate(`(async()=>{
      const bytes=await (await fetch('/artifacts/preview-format-fixtures/00-all-known-cases.pptx')).arrayBuffer();
      const transfer=new DataTransfer();transfer.items.add(new File([bytes],'00-all-known-cases.pptx'));
      const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    await browser.until(`document.querySelector('#filename').textContent==='00-all-known-cases.pptx' && !document.querySelector('#download').disabled`, 'combined PPTX app import');
    await browser.until('document.querySelectorAll("#stage iframe").length >= 8 && [...document.querySelectorAll("#stage iframe")].every(frame=>frame.contentDocument?.querySelector(".slide-wrapper"))', 'combined PPTX app previews');
    assert.equal(await browser.evaluate('document.querySelectorAll(".slide-item").length'), 10, 'all ten cases imported into app');
    assert.equal(await browser.evaluate('document.querySelectorAll(".render-fallback").length'), 0, 'no app preview fallback');
    reports.push({file:'00-all-known-cases.pptx', status:'PASS', checks:['application file-open','10 slides','initial preview frames']});
    console.log('PASS combined PPTX: normal application file-open and previews');
  } finally {
    await writeFile('artifacts/preview-format-fixtures/results.json', JSON.stringify(reports,null,2)+'\n');
  }
}
