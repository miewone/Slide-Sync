import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeTextContent} from '../src/editor/google/NativeTextContent.js';
import {NativeSlidesDocument} from '../src/editor/google/NativeSlidesDocument.js';
import {nativeSlidesFixture} from './native-slides-fixture.js';

test('soft breaks become browser line feeds while printable gender symbols remain text',()=>{
  assert.equal(NativeTextContent.normalize('First\vSecond\r\nThird\rFourth\u2028Fifth\u2029Sixth'),'First\nSecond\nThird\nFourth\nFifth\nSixth');
  assert.equal(NativeTextContent.normalize('♂ male / ♀ female'),'♂ male / ♀ female');
  assert.equal(NativeTextContent.endsParagraph('Last\v'),false);assert.equal(NativeTextContent.endsParagraph('Last\n'),true);
});
test('native reading and search normalize break controls without changing source text for saving',()=>{
  const fixture=nativeSlidesFixture();fixture.slides[0].pageElements[0].shape.text={textElements:[{textRun:{content:'First\v'}},{textRun:{content:'Second\n'}}]};
  const model=new NativeSlidesDocument(fixture);assert.equal(model.elements(0)[0].text,'First\nSecond');assert.deepEqual(model.findSlides('First Second'),[0]);
  model.format(new Set([0]),new Set(['shape_1']),{bold:false});model.acceptSave('presentation_1','Saved','r2');
  assert.equal(model.original.slides[0].pageElements[0].shape.text.textElements[0].textRun.content,'First\v');
});
