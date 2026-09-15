import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeSlidesGuides} from '../src/editor/google/NativeSlidesGuides.js';
import {NativeSlidesSelection} from '../src/editor/google/NativeSlidesSelection.js';
import {NativeSlidesText} from '../src/editor/google/NativeSlidesText.js';
import {NativeSlidesDocument} from '../src/editor/google/NativeSlidesDocument.js';
import {nativeSlidesFixture} from './native-slides-fixture.js';

test('local guides are editable, bounded and independent of saved slide content',()=>{
  const guides=new NativeSlidesGuides();guides.add('x',72);guides.add('x',72);assert.equal(guides.items.length,1);
  const id=guides.items[0].id;guides.change(id,144);guides.remove(id);guides.undo();assert.equal(guides.items[0].pos,144);guides.undo();assert.equal(guides.items[0].pos,72);guides.redo();assert.equal(guides.items[0].pos,144);
  assert.throws(()=>guides.change(id,NaN));assert.equal(guides.items[0].pos,144);
});
test('appearance filters and inherited white background filtering do not depend on text content',()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture()),[a,b]=model.elements(0),renderer=new NativeSlidesText(model);
  assert.equal(NativeSlidesSelection.similar(a,b,{size:true,colors:true,layout:false}),true);
  assert.equal(NativeSlidesSelection.similar(a,b,{size:true,colors:true,layout:true}),false);
  assert.equal(NativeSlidesSelection.matches(a,'ＳＥＡＲＣＨ  shape_1'),true);
  assert.equal(renderer.plainBackground(a.native),false,'red fill is excluded, never removed');
  const white=structuredClone(a.native);white.shape.shapeProperties.shapeBackgroundFill.solidFill.color.rgbColor={red:1,green:1,blue:1};assert.equal(renderer.plainBackground(white),true);
});
