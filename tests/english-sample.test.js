import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

test('English sample preserves package structure and exercise geometry with translated search targets', async()=>{
  const context={setTimeout,clearTimeout,setImmediate,Buffer,ArrayBuffer,Uint8Array};
  runInNewContext(await readFile(new URL('../public/vendor/jszip.min.js',import.meta.url),'utf8'),context);
  const decks=await Promise.all(['sample.pptx','sample-en.pptx'].map(async file=>
    context.JSZip.loadAsync(await readFile(new URL(`../public/${file}`,import.meta.url)))));
  const [original,english]=decks;
  assert.deepEqual(Object.keys(english.files),Object.keys(original.files));
  const slides=Object.keys(english.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name));
  assert.equal(slides.length,8);
  const structure=xml=>xml.replace(/>[^<>]*(?=<)/g,'>').replace(/\b(name|typeface|lang)="[^"]*"/g,'$1=""');
  for(const name of Object.keys(original.files)) {
    if(original.files[name].dir)continue;
    if(name.endsWith('.xml')) {
      const [ko,en]=await Promise.all([original.file(name).async('string'),english.file(name).async('string')]);
      assert.doesNotMatch(en,/[가-힣]/,name);
      assert.equal(structure(en),structure(ko),`Preserved geometry, styles and IDs: ${name}`);
    } else assert.deepEqual(await english.file(name).async('uint8array'),await original.file(name).async('uint8array'),name);
  }
  for(const [slide,query,count] of [[4,'RowCard',3],[4,'ColumnCard',3],[5,'HeightDemo',2],[7,'DemoGroup',1],[8,'DeleteDemo',1]]) {
    const xml=await english.file(`ppt/slides/slide${slide}.xml`).async('string');
    assert.equal([...xml.matchAll(new RegExp(`name="${query}[^" ]*(?: [^"]*)?"`,'g'))].length,count,query);
    assert.ok(!xml.includes(`>${query}<`),'Instructions split the search term to avoid selecting themselves');
  }
  assert.match(await english.file('ppt/slides/slide1.xml').async('string'),/Quarterly sales/);
});
