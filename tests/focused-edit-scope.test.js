import test from 'node:test';
import assert from 'node:assert/strict';
import {FocusedEditScope} from '../src/editor/FocusedEditScope.js';
import {NativeSlidesDocument} from '../src/editor/google/NativeSlidesDocument.js';
import {NativeSlidesSelection} from '../src/editor/google/NativeSlidesSelection.js';
import {nativeSlidesFixture} from './native-slides-fixture.js';

test('focused edit scope preserves checks, reuses stable scope and restores all checked pages',()=>{
  const resolver=new FocusedEditScope(),checked=new Set([0,1,3]);
  const one=resolver.resolve(checked,1,'page');assert.deepEqual([...one],[1]);assert.equal(resolver.resolve(checked,1,'page'),one);
  assert.deepEqual([...checked],[0,1,3]);assert.equal(resolver.resolve(checked,1,'selection'),checked);assert.equal(resolver.resolve(checked,null,'page'),checked);
  assert.deepEqual([...resolver.resolve(checked,2,'page')],[],'unchecked pages remain excluded');
});
test('native page-only edits and point selection preserve other page selection and content',()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture()),selected=new Set(['shape_1','shape_4']),checked=new Set([0,1]),resolver=new FocusedEditScope(),one=resolver.resolve(checked,0,'page'),other=JSON.stringify(model.elements(1));
  model.resize(one,selected,120,80);assert.equal(JSON.stringify(model.elements(1)),other);model.undo();
  model.format(one,selected,{size:30,bold:false});assert.equal(JSON.stringify(model.elements(1)),other);model.undo();
  model.move(one,selected,1,1);assert.equal(JSON.stringify(model.elements(1)),other);model.undo();
  model.remove(one,selected);assert.equal(JSON.stringify(model.elements(1)),other);model.undo();
  const next=NativeSlidesSelection.atPoint(model,selected,{x:180,y:120},0,'replace',null,one);
  assert.deepEqual([...next].sort(),['shape_2','shape_4']);assert.deepEqual([...selected],['shape_1','shape_4']);
  model.resize(resolver.resolve(checked,0,'selection'),selected,120,80);assert.notEqual(JSON.stringify(model.elements(1)),other);
});
