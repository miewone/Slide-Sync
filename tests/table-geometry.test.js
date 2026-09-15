import assert from 'node:assert/strict';
import {test} from 'node:test';
import {TableGeometry} from '../src/editor/TableGeometry.js';

test('table dimensions support a single cell and reject invalid grid sizes', () => {
  assert.deepEqual(TableGeometry.fromDimensions([100], [20]), {w:100, h:20});
  assert.deepEqual(TableGeometry.fromDimensions([100, 200], [20, 30]), {w:300, h:50});
  for (const widths of [[], [0], [-1], [NaN], [Infinity], [Number.MAX_VALUE, Number.MAX_VALUE]]) {
    assert.equal(TableGeometry.fromDimensions(widths, [20]), null);
    assert.equal(TableGeometry.fromDimensions([20], widths), null);
  }
});
