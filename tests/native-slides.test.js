import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeSlidesDocument} from '../src/editor/google/NativeSlidesDocument.js';
import {nativeSlidesFixture} from './native-slides-fixture.js';
const one=new Set([0]);

test('native movement respects checked scope, preserves group/formatting and records minimal requests',()=>{
  const fixture=nativeSlidesFixture(),before=structuredClone(fixture),model=new NativeSlidesDocument(fixture);
  model.move(one,new Set(['shape_1','shape_4','group_1']),2.54,-2.54);
  assert.equal(model.changes.size,2);assert.equal(model.elements(0)[0].box.x,82);
  assert.deepEqual(model.requests()[0],{updatePageElementTransform:{objectId:'shape_1',applyMode:'RELATIVE',transform:{scaleX:1,scaleY:1,shearX:0,shearY:0,translateX:72,translateY:-72,unit:'PT'}}});
  assert.deepEqual(fixture,before);assert.deepEqual(model.original,before);
  model.acceptSave('copy_1','Copy','r2');
  assert.deepEqual(model.original.slides[0].pageElements[0].shape,before.slides[0].pageElements[0].shape);
  assert.deepEqual(model.original.slides[0].pageElements[3].elementGroup,before.slides[0].pageElements[3].elementGroup);
  assert.equal(model.original.slides[0].pageElements[3].transform.shearX,-1);
  assert.deepEqual(model.original.slides[1],before.slides[1]);assert.deepEqual(model.original.masters,before.masters);
});
test('undo/redo restores deletion and movement without creating replacement objects',()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture()),selection=new Set(['shape_1']);
  model.move(one,selection,1,0);model.remove(one,selection);
  assert.deepEqual(model.requests(),[{deleteObject:{objectId:'shape_1'}}]);
  model.undo();assert.equal(model.requests()[0].updatePageElementTransform.objectId,'shape_1');
  model.undo();assert.equal(model.dirty,false);model.redo();assert.equal(model.dirty,true);
  model.move(one,selection,-1,0);assert.equal(model.dirty,false);
});
test('alignment and distribution use per-slide visual bounds and preserve rotated groups',()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture()),selection=new Set(['shape_1','shape_2','shape_3','shape_4']);
  model.align(one,selection,'left');assert.deepEqual(model.elements(0).slice(0,3).map(e=>e.box.x),[10,10,10]);
  assert.equal(model.elements(1)[0].box.x,25);model.undo();
  model.align(one,selection,'horizontal');assert.deepEqual(model.elements(0).slice(0,3).map(e=>e.box.x),[10,180,350]);
  model.move(one,new Set(['group_1']),0,0,'absolute');assert.equal(model.elements(0)[3].box.x,0);assert.equal(model.elements(0)[3].box.y,0);
});
test('EMU coordinates and invalid inputs are handled without corrupting draft history',()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture());
  assert.deepEqual(model.elements(1)[1].box,{x:10,y:20,w:100,h:40});
  assert.throws(()=>model.move(one,new Set(['shape_1']),NaN,0));assert.equal(model.dirty,false);
  assert.throws(()=>new NativeSlidesDocument({...nativeSlidesFixture(),slides:[]}));
  for(let n=0;n<30;n++)model.move(one,new Set(['shape_1']),1,0);
  assert.equal(model.undoStack.length,25);
});
test('revision conflicts and changed native copies are rejected; transient thumbnail URLs are ignored',()=>{
  const fixture=nativeSlidesFixture(),model=new NativeSlidesDocument(fixture),copy=structuredClone(fixture);
  copy.presentationId='copy';copy.revisionId='copy-revision';copy.title='Copy';copy.slides[1].pageElements[1].image.contentUrl='https://lh3.googleusercontent.com/new';
  assert.equal(model.matches(copy),false);assert.equal(model.matches(copy,{copy:true}),true);
  copy.slides[0].pageElements[0].title='Changed';assert.equal(model.matches(copy,{copy:true}),false);
});

test('native formatting is scoped, undoable and preserves grouped objects and unrelated styles on save',()=>{
  const fixture=nativeSlidesFixture(),model=new NativeSlidesDocument(fixture),selected=new Set(['shape_1','group_1','shape_4']);
  model.format(one,selected,{size:24,bold:false});
  assert.deepEqual(model.requests().map(r=>r.updateTextStyle.objectId),['shape_1','child_1']);
  assert.equal(model.elements(0)[0].native.shape.text.textElements[0].textRun.style.fontSize.magnitude,24);
  assert.equal(model.elements(0)[3].changed,true);
  model.undo();assert.equal(model.dirty,false);model.redo();
  model.remove(one,new Set(['group_1']));
  assert.deepEqual(model.requests().map(r=>Object.keys(r)[0]),['updateTextStyle','deleteObject']);
  model.undo();model.acceptSave('copy','Saved','r2');
  assert.deepEqual(model.original.slides[1],fixture.slides[1]);
  assert.deepEqual(model.original.slides[0].pageElements[3].transform,fixture.slides[0].pageElements[3].transform);
  const style=model.original.slides[0].pageElements[0].shape.text.textElements[0].textRun.style;
  assert.deepEqual(style,{fontFamily:'Arial',bold:false,fontSize:{magnitude:24,unit:'PT'}});
  assert.equal(model.dirty,false);
});

test('text resizing composes with movement, preserves text/fill and rolls back invalid batches',()=>{
  const fixture=nativeSlidesFixture(),model=new NativeSlidesDocument(fixture),ids=new Set(['shape_1']);
  model.move(one,ids,2.54,0);model.resizeText([{id:'shape_1',width:150,height:60}]);model.move(one,ids,0,2.54);
  assert.deepEqual(model.elements(0)[0].box,{x:82,y:92,w:150,h:60});
  assert.deepEqual(model.requests()[0].updatePageElementTransform,{objectId:'shape_1',applyMode:'ABSOLUTE',transform:{scaleX:1.5,shearY:0,shearX:0,scaleY:1.5,translateX:82,translateY:92,unit:'PT'}});
  const requests=model.requests(),history=model.undoStack.length;
  assert.throws(()=>model.resizeText([{id:'shape_1',width:20,height:30},{id:'shape_2',width:NaN,height:10}]));
  assert.deepEqual(model.requests(),requests);assert.equal(model.undoStack.length,history);
  model.undo();model.undo();assert.deepEqual(model.elements(0)[0].box,{x:82,y:20,w:100,h:40});
  model.redo();model.acceptSave('presentation_1','Saved','r2');
  assert.deepEqual(model.original.slides[0].pageElements[0].shape,fixture.slides[0].pageElements[0].shape);
});

test('slide target alignment works with a single object; range and literal search retain checked scope',()=>{
  const model=new NativeSlidesDocument(nativeSlidesFixture());
  model.align(one,new Set(['shape_1','shape_4']),'right','slide');assert.equal(model.elements(0)[0].box.x,620);assert.equal(model.elements(1)[0].box.x,25);model.undo();
  assert.deepEqual(model.findSlides('ＳＥＡＲＣＨ   shape_4'),[1]);assert.deepEqual(model.findSlides(''),[]);
  const selected=model.selectRectangle(one,new Set(['shape_4','shape_2']),{x:0,y:0,w:120,h:80});
  assert.deepEqual([...selected],['shape_4','shape_1']);
  model.adjustFontSize(one,new Set(['shape_1','group_1']),1,()=>18);
  assert.equal(model.undoStack.length,1);assert.equal(model.requests().length,2);model.undo();assert.equal(model.dirty,false);
});

test('omitted tableCells, empty groups and empty text runs cannot crash native opening or saving',()=>{
  const fixture=nativeSlidesFixture();
  const table={objectId:'sparse_table',size:{width:{magnitude:100,unit:'PT'},height:{magnitude:50,unit:'PT'}},transform:{scaleX:1,scaleY:1,unit:'PT'},table:{rows:3,columns:2,tableRows:[{}, {tableCells:[]}, {tableCells:[{}, {text:{textElements:[{textRun:{}},{textRun:{content:'Visible cell'}}]}}]}]}};
  const emptyGroup={objectId:'empty_group',elementGroup:{}};
  const emptyText={objectId:'empty_text',shape:{text:{textElements:[{textRun:{}}]}}};
  fixture.slides[0].pageElements.push(table,emptyGroup,emptyText);
  const model=new NativeSlidesDocument(fixture);
  assert.equal(model.elements(0).find(e=>e.id==='sparse_table').text,'Visible cell');
  assert.equal(model.elements(0).find(e=>e.id==='empty_group').box,null);
  assert.deepEqual(model.findSlides('Visible cell'),[0]);
  assert.deepEqual(model.textShapes(one,new Set(['empty_group','empty_text'])),[]);
  model.move(one,new Set(['sparse_table']),1,0);model.undo();model.redo();
  model.acceptSave('saved','Saved','r2');
  assert.deepEqual(model.original.slides[0].pageElements.find(e=>e.objectId==='sparse_table').table,table.table,'missing cells remain missing in native source');
  assert.equal(model.elements(0).find(e=>e.id==='sparse_table').text,'Visible cell');
});
