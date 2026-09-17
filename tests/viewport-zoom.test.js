import test from 'node:test';
import assert from 'node:assert/strict';
import {ViewportZoom} from '../src/editor/ViewportZoom.js';

test('view zoom rounds percentages and clamps invalid or excessive input',()=>{
  assert.equal(ViewportZoom.clamp(150.4),150);assert.equal(ViewportZoom.clamp(0),25);
  assert.equal(ViewportZoom.clamp(1000),400);assert.equal(ViewportZoom.clamp(NaN),100);
  assert.equal(ViewportZoom.clamp(Infinity),100);
});
