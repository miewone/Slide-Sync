import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeSlidesTableLayout} from '../src/editor/google/NativeSlidesTableLayout.js';
const pt=magnitude=>({magnitude,unit:'PT'});

test('native tableColumns widths and text insets remain distinct from cell bounds',()=>{
  const table={columns:2,rows:1,tableColumns:[{columnWidth:pt(60)},{columnWidth:pt(140)}],tableRows:[{rowHeight:pt(30),tableCells:[{},{}]}]},before=JSON.stringify(table);
  const layout=new NativeSlidesTableLayout(table,200,30);
  assert.deepEqual(layout.cells.map(c=>[c.x,c.width]),[[0,60],[60,140]]);
  const box=layout.cells[0].textBox;assert.equal(box.x,7.2);assert.equal(box.y,3.6);assert.ok(Math.abs(box.width-45.6)<1e-9&&Math.abs(box.height-22.8)<1e-9);
  assert.equal(JSON.stringify(table),before,'layout never writes into native table data');
});
test('horizontal and vertical merged cells do not shift following cells into reserved columns',()=>{
  const table={rows:2,columns:3,tableColumns:[{columnWidth:pt(40)},{columnWidth:pt(60)},{columnWidth:pt(100)}],tableRows:[{rowHeight:pt(25),tableCells:[{rowSpan:2,columnSpan:2},{}]},{rowHeight:pt(35),tableCells:[{}]}]};
  const layout=new NativeSlidesTableLayout(table,200,60);
  assert.deepEqual(layout.cells.map(c=>[c.row,c.column,c.x,c.y,c.width,c.height]),[[0,0,0,0,100,60],[0,2,100,0,100,25],[1,2,100,25,100,35]]);
});
test('sparse border locations preserve separate segments and omit merged interiors',()=>{
  const p={tableBorderFill:{solidFill:{color:{rgbColor:{}}}}};
  const table={rows:1,columns:3,tableColumns:[{columnWidth:pt(40)},{columnWidth:pt(60)},{columnWidth:pt(100)}],tableRows:[{rowHeight:pt(30),tableCells:[{columnSpan:2},{}]}],verticalBorderRows:[{tableBorderCells:[{location:{columnIndex:0},tableBorderProperties:p},{location:{columnIndex:1},tableBorderProperties:p},{location:{columnIndex:2},tableBorderProperties:p},{location:{columnIndex:3},tableBorderProperties:p}]}]};
  assert.deepEqual(new NativeSlidesTableLayout(table,200,30).borders().map(b=>b.x1),[0,100,200]);
});
test('explicit zero insets stay zero; undersized cells never produce negative text dimensions',()=>{
  assert.deepEqual(NativeSlidesTableLayout.textBox({width:100,height:40},{paddingLeft:pt(0),paddingRight:pt(12),paddingTop:pt(5),paddingBottom:pt(7)}),{x:0,y:5,width:88,height:28});
  const box=NativeSlidesTableLayout.textBox({width:5,height:3});assert.equal(box.width,0);assert.equal(box.height,0);
});
