import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ActivityLog} from '../src/services/ActivityLog.js';

test('producers share ordered, immutable event-time snapshots',()=>{
  let now=10;const log=new ActivityLog({clock:()=>now++}),params={font:'Nanum Gothic',slides:4};
  log.record('activity.fontApplied',params,{level:'success',fileName:'first.pptx'});
  const before=log.getSnapshot();params.slides=9;
  log.write('Second module finished',{fileName:'second.pptx'});
  const after=log.getSnapshot();
  assert.equal(before.entries.length,1);assert.equal(before.entries[0].params.slides,4);
  assert.equal(after.total,2);assert.equal(after.entries[0].fileName,'first.pptx');
  assert.equal(after.entries[1].time,11);assert.equal(after.entries[1].id,2);
  assert.ok(Object.isFrozen(after.entries));assert.ok(Object.isFrozen(after.entries[0].params));
  assert.equal(log.getSnapshot(),after);
});

test('bounded retention does not stop the total counter increasing',()=>{
  const log=new ActivityLog({limit:3});
  for(let i=0;i<5;i++)log.write(String(i));
  assert.equal(log.getSnapshot().total,5);
  assert.deepEqual(log.getSnapshot().entries.map(entry=>entry.params.message),['2','3','4']);
  assert.equal(log.getSnapshot().latestId,5);
});

test('clear and subscriptions are isolated between editor instances',()=>{
  const first=new ActivityLog(),second=new ActivityLog();let calls=0;
  const stop=first.subscribe(()=>calls++);
  first.write('done');first.clear();first.clear();
  assert.equal(calls,2);assert.equal(first.getSnapshot().total,0);assert.equal(second.getSnapshot().total,0);
  stop();first.write('new');assert.equal(calls,2);assert.equal(first.getSnapshot().latestId,2);
});

test('large strings are bounded and mutable objects are not retained',()=>{
  const log=new ActivityLog();
  log.record('activity.message',{message:'a'.repeat(9000),document:{secret:'not a message'},rows:[1,2]},{level:'invalid',fileName:'b'.repeat(1000)});
  const entry=log.getSnapshot().entries[0];
  assert.equal(entry.params.message.length,2048);assert.equal(entry.fileName.length,512);
  assert.equal(entry.params.document,undefined);assert.equal(entry.params.rows,undefined);assert.equal(entry.level,'info');
});
