import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EditorStore} from '../src/editor/EditorStore.js';
import {EventScope} from '../src/editor/EventScope.js';

test('UI updates preserve unrelated snapshot identities and suppress no-op notifications', () => {
  const store = new EditorStore();
  let notifications = 0;
  const dispose = store.subscribe(() => notifications++);
  const before = store.getSnapshot();
  store.update({status:'rendering'});
  const after = store.getSnapshot();
  assert.equal(after.slides, before.slides);
  assert.equal(after.selection, before.selection);
  assert.equal(before.status, 'PPTX 파일을 열어 시작하세요.');
  store.update({status:'rendering'});
  assert.equal(store.getSnapshot(), after);
  assert.equal(notifications, 1);
  dispose();store.update({busy:true});
  assert.equal(notifications, 1);
});

test('unmount removes listeners, remount does not duplicate keyboard commands', () => {
  const target = new EventTarget();
  let calls = 0;
  const first = new EventScope();
  first.on(target, 'keydown', () => calls++);
  first.dispose();first.dispose();
  const second = new EventScope();
  second.on(target, 'keydown', () => calls++);
  target.dispatchEvent(new Event('keydown'));
  assert.equal(calls, 1);
  second.dispose();
  target.dispatchEvent(new Event('keydown'));
  assert.equal(calls, 1);
});

test('runtime replacement clears stale deck metadata without changing store subscriptions', () => {
  const store = new EditorStore();
  let notifications = 0;
  store.subscribe(() => notifications++);
  store.update({hasDeck:true, slides:[{index:0}], ready:true, busy:true});
  store.reset();
  assert.equal(store.getSnapshot().hasDeck, false);
  assert.equal(store.getSnapshot().ready, false);
  assert.equal(store.getSnapshot().busy, false);
  assert.deepEqual(store.getSnapshot().slides, []);
  assert.equal(notifications, 2);
  store.reset();
  assert.equal(notifications, 2);
});
