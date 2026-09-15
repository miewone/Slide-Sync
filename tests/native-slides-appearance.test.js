import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeSlidesAppearance} from '../src/editor/google/NativeSlidesAppearance.js';
import {NativeSlidesDocument} from '../src/editor/google/NativeSlidesDocument.js';
import {nativeSlidesFixture} from './native-slides-fixture.js';

test('theme colors and transparent fills resolve without fabricated default boxes',()=>{
  const fixture=nativeSlidesFixture();fixture.masters[0].pageProperties.colorScheme.colors=[{type:'ACCENT1',color:{red:.1,green:.2,blue:.6}}];
  const appearance=new NativeSlidesAppearance(new NativeSlidesDocument(fixture));
  assert.equal(appearance.fill({solidFill:{color:{themeColor:'ACCENT1'},alpha:.4}}).color,'rgb(26,51,153)');
  assert.equal(appearance.fill({solidFill:{color:{themeColor:'ACCENT1'},alpha:0}}).opacity,0);
  assert.equal(appearance.shape({shape:{shapeType:'TEXT_BOX'}}).fill,'none');assert.equal(appearance.shape({shape:{}}).stroke,'none');
  assert.equal(appearance.fill({propertyState:'NOT_RENDERED',solidFill:{color:{rgbColor:{red:1}}}}).color,'none');
});
test('placeholder fill and page background inherit without exposing master sample text',()=>{
  const fixture=nativeSlidesFixture(),parent={objectId:'parent',shape:{placeholder:{type:'BODY'},shapeProperties:{shapeBackgroundFill:{solidFill:{color:{rgbColor:{green:1}}}}}}};
  fixture.masters[0].pageElements=[parent,{objectId:'decoration',shape:{shapeType:'ELLIPSE'}}];fixture.masters[0].pageProperties.pageBackgroundFill={solidFill:{color:{rgbColor:{red:1,green:1,blue:1}}}};
  const appearance=new NativeSlidesAppearance(new NativeSlidesDocument(fixture));
  assert.equal(appearance.shape({shape:{placeholder:{parentObjectId:'parent'}}}).fill,'rgb(0,255,0)');
  assert.deepEqual(appearance.background().elements.map(e=>e.objectId),['decoration']);assert.equal(appearance.background().fill.color,'rgb(255,255,255)');
});
test('native geometry distinguishes ellipses, rounded corners and polygons; unsupported shapes do not become rectangles',()=>{
  assert.equal(NativeSlidesAppearance.geometry('ELLIPSE',100,50).tag,'ellipse');
  assert.equal(NativeSlidesAppearance.geometry('ROUND_RECTANGLE',100,60).props.rx,10);
  assert.equal(NativeSlidesAppearance.geometry('TRIANGLE',100,50).props.points,'50,0 100,50 0,50');
  assert.equal(NativeSlidesAppearance.geometry('UNKNOWN',100,50),null);
});

test('striped arrows and brackets retain their own paths instead of disappearing as unsupported shapes',()=>{
  const arrow=NativeSlidesAppearance.geometry('STRIPED_RIGHT_ARROW',200,80);
  assert.equal(arrow.tag,'path');assert.equal(arrow.props.d.split(' Z').length-1,3,'body plus two stripes');
  const bracket=NativeSlidesAppearance.geometry('RIGHT_BRACKET',10,100);assert.equal(bracket.tag,'path');assert.equal(bracket.props.fill,'none');
});
test('zero dimensions omitted by Google JSON do not hide horizontal or vertical lines',()=>{
  const fixture=nativeSlidesFixture();fixture.slides[0].pageElements.push({objectId:'horizontal',size:{width:{magnitude:500,unit:'PT'},height:{unit:'PT'}},transform:{scaleX:1,scaleY:1},line:{lineType:'STRAIGHT_LINE'}});
  const model=new NativeSlidesDocument(fixture);assert.deepEqual(model.elements(0).at(-1).box,{x:0,y:0,w:500,h:0});assert.equal(NativeSlidesAppearance.points({unit:'PT'}),0);
});


test('paired bracket caps depend on height and remain at the two edges of wide shapes',()=>{
  const wide=NativeSlidesAppearance.geometry('BRACKET_PAIR',280,70),wider=NativeSlidesAppearance.geometry('BRACKET_PAIR',560,70);
  assert.ok(wide.props.d.startsWith('M8.75 0 '));assert.ok(wide.props.d.includes('M271.25 0 '));
  assert.ok(wider.props.d.startsWith('M8.75 0 '));assert.ok(wider.props.d.includes('M551.25 0 '));
  assert.equal(wide.props.fill,'none');
});

test('partial child theme properties retain inherited colors, weights and autofit scale',()=>{
  const fixture=nativeSlidesFixture();
  const properties={
    shapeBackgroundFill:{solidFill:{color:{rgbColor:{red:1}},alpha:.8}},
    outline:{weight:{magnitude:2,unit:'PT'},outlineFill:{solidFill:{color:{rgbColor:{blue:1}}}}},
    autofit:{fontScale:.6}
  };
  fixture.layouts[0].pageElements=[{objectId:'parent',shape:{shapeProperties:properties}}];
  const a=new NativeSlidesAppearance(new NativeSlidesDocument(fixture)),child={shape:{placeholder:{parentObjectId:'parent'},shapeProperties:{shapeBackgroundFill:{propertyState:'RENDERED',solidFill:{alpha:.4}},outline:{propertyState:'RENDERED'}}}};
  assert.equal(a.shape(child).fill,'rgb(255,0,0)');assert.equal(a.shape(child).fillOpacity,.4);assert.equal(a.shape(child).strokeWidth,2);assert.equal(a.property(child,'autofit').fontScale,.6);
});
test('elbow and curved connectors retain a routed path instead of a diagonal shortcut',()=>{
  assert.equal(NativeSlidesAppearance.linePath({lineType:'BENT_CONNECTOR_3'},120,60),'M0 0 H60 V60 H120');
  assert.equal(NativeSlidesAppearance.linePath({lineType:'BENT_CONNECTOR_2'},120,60),'M0 0 H120 V60');
  assert.equal(NativeSlidesAppearance.linePath({lineCategory:'CURVED'},120,60),'M0 0 C60 0 60 60 120 60');
});
