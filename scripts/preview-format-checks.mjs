import assert from 'node:assert/strict';

/** @param {object} browser DevTools client. @param {string} origin Development server URL. @param {string} source Optional local PPTX URL for manual reproduction. */
export async function checkPreviewFormat(browser, origin, source = '') {
  await browser.navigate(`${origin}/tests/preview-format.html${source ? `?source=${encodeURIComponent(source)}` : ''}`);
  await browser.until('!!document.querySelector("#result") && document.querySelector("#result").textContent !== "RUNNING"', 'preview format fixture');
  const result = await browser.evaluate('document.querySelector("#result").textContent');
  assert.ok(result.startsWith('PASS'), result);
  console.log(result);
}
