import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {FontCatalogue} from '../src/services/FontCatalogue.js';
import {FontResources} from '../src/services/FontResources.js';
import {PreviewFonts} from '../src/editor/PreviewFonts.js';
import {PreviewFontStyle} from '../src/editor/PreviewFontStyle.js';

test('only names of the same font family match; named weights are retained',()=>{
  for(const name of ['나눔고딕','Nanum Gothic','NanumGothic','NanumGothicOTF'])assert.equal(FontCatalogue.match(name).font.id,'nanum-gothic');
  assert.equal(FontCatalogue.match('NanumGothicBold').weight,700);
  assert.equal(FontCatalogue.match('NanumSquareEB').weight,800);
  for(const name of ['맑은 고딕','Source Han Sans KR','Noto Sans CJK KR','Arial','NanumGothicEco','NanumSquareNeo'])assert.equal(FontCatalogue.match(name),null);
  assert.equal(FontCatalogue.styleWeight('Semi Bold Italic'),600);
  assert.equal(FontCatalogue.styleWeight('ExtraBold'),800);
  assert.equal(FontCatalogue.styleWeight('Unknown style'),null);
  assert.equal(PreviewFonts.weight('NanumGothicLight','bold'),700);
  assert.equal(PreviewFonts.weight('NanumGothicLight','400'),300);
  assert.equal(PreviewFonts.weight('NanumGothicExtraBold','700'),800);
});

test('the installed original wins without fetching a similar or catalogue font',async()=>{
  let web=0;
  const fonts=new PreviewFonts({resources:{local:async()=>({family:'local-original'}),web:async()=>{web++;}}});
  const result=await fonts.resolveVariant({key:'nanumgothic',family:'나눔고딕'},{weight:700,style:'normal'},'');
  assert.equal(result.status,'local');assert.equal(web,0);
});

test('an unavailable original gets only an exact web match; substitution requires a choice',async()=>{
  const requested=[];
  const fonts=new PreviewFonts({resources:{local:async()=>{throw Error('not installed');},web:async font=>{requested.push(font.id);return {family:font.family};}}});
  const variant={weight:400,style:'normal'};
  const original={key:'companyfont',family:'Company Custom Font'};
  assert.equal((await fonts.resolveVariant(original,variant,'')).status,'unavailable');assert.deepEqual(requested,[]);
  assert.equal((await fonts.resolveVariant({key:'nanumgothic',family:'NanumGothic'},variant,'')).status,'web');
  assert.equal((await fonts.resolveVariant(original,variant,'pretendard')).status,'replacement');
  assert.deepEqual(requested,['nanum-gothic','pretendard']);
});

test('a choice is visible immediately and counts as handled only after preview application',async()=>{
  let finish;const snapshots=[];
  const fonts=new PreviewFonts({onChange:rows=>snapshots.push(rows),resources:{web:()=>new Promise(resolve=>{finish=resolve;})}});
  fonts.records.set('missing',{key:'missing',family:'Missing',slides:new Set([0]),originalUnavailable:true,variants:new Map([['400:normal',{weight:400,style:'normal',status:'unavailable',result:null}]])});
  const pending=fonts.choose('missing','nanum-gothic');
  assert.equal(snapshots.at(-1)[0].choice,'nanum-gothic');
  assert.equal(snapshots.at(-1)[0].applying,true);
  assert.equal(snapshots.at(-1)[0].applied,false);
  finish({family:'loaded',weight:400,style:'normal',label:'나눔고딕'});await pending;
  assert.equal(snapshots.at(-1)[0].applied,false);
  fonts.markApplied();assert.equal(snapshots.at(-1)[0].applied,true);
  fonts.resources.web=async()=>{throw Error('font unavailable');};
  await fonts.choose('missing','nanum-myeongjo');fonts.markApplied();
  assert.equal(snapshots.at(-1)[0].applied,false);
  assert.equal(snapshots.at(-1)[0].variants[0].status,'failed');
});

test('font theme references resolve each script and retain explicit font names',()=>{
  const props={lang:'ko-KR',fontTheme:{'a:minorFont':{'a:latin':{attrs:{typeface:'Arial'}},'a:ea':{attrs:{typeface:''}},'a:font':[{attrs:{script:'Hang',typeface:'나눔고딕'}}]}}};
  assert.equal(PreviewFontStyle.resolve('+mn-lt',props,'latin'),'Arial');
  assert.equal(PreviewFontStyle.resolve('+mn-ea',props,'ea'),'나눔고딕');
  assert.equal(PreviewFontStyle.resolve('Company Custom Font',props,'ea'),'Company Custom Font');
  const flags=PreviewFontStyle.read({}, {attrs:{b:'true',i:'true'}},null);
  assert.equal(flags.bold,true);assert.equal(flags.italic,true);
  assert.equal(PreviewFontStyle.read(flags,{attrs:{b:'false'}},null).bold,false);
});

test('mixed scripts retain their own fonts and neutral spaces stay with the preceding script',()=>{
  const node=text=>({textContent:text,children:[],style:{removeProperty(key){delete this[key];}},
    ownerDocument:{createElement:()=>node('')},replaceChildren(){this.children=[];},append(child){this.children.push(child);}});
  const mixed=node('ABC 한글 문장');
  PreviewFontStyle.apply(mixed,{fontLatin:'Arial',fontEA:'NanumGothic'});
  assert.equal(mixed.children.length,2);
  assert.equal(mixed.children[0].textContent,'ABC ');assert.match(mixed.children[0].style.fontFamily,/Arial/);
  assert.equal(mixed.children[1].textContent,'한글 문장');assert.match(mixed.children[1].style.fontFamily,/NanumGothic/);
  const korean=node('명시한 동아시아 글꼴');PreviewFontStyle.apply(korean,{fontLatin:'Arial',fontEA:'Courier New'});
  assert.equal(korean.children.length,0);assert.match(korean.style.fontFamily,/Courier New/);
});

test('late font loads cannot install fonts after disposal; successful fonts release their URLs',async()=>{
  const added=[],removed=[],revoked=[];let complete;
  class Face {constructor(family){this.family=family;}load(){return new Promise(resolve=>{complete=()=>resolve(this);});}}
  const resources=new FontResources({document:{fonts:{add:font=>added.push(font),delete:font=>removed.push(font)}},FontFace:Face,
    URL:{createObjectURL:()=> 'blob:font-test',revokeObjectURL:url=>revoked.push(url)}});
  const pending=resources.install(new Uint8Array([0,1,0,0]).buffer);resources.dispose();complete();
  await assert.rejects(pending,/disposed/);assert.equal(added.length,0);
  class ImmediateFace extends Face{async load(){return this;}}
  const second=new FontResources({document:{fonts:{add:font=>added.push(font),delete:font=>removed.push(font)}},FontFace:ImmediateFace,
    URL:{createObjectURL:()=> 'blob:font-test',revokeObjectURL:url=>revoked.push(url)}});
  await second.install(new Uint8Array([0,1,0,0]).buffer);second.dispose();second.dispose();
  assert.equal(added.length,1);assert.deepEqual(removed,added);assert.deepEqual(revoked,['blob:font-test']);
});

test('font download timeout aborts transport and can be retried',async()=>{
  let calls=0,aborted=false;
  class Face {async load(){return this;}}
  const resources=new FontResources({timeout:5,document:{fonts:{add(){},delete(){}}},FontFace:Face,
    URL:{createObjectURL:()=> 'blob:font-test',revokeObjectURL(){}},
    fetch:async(_url,{signal})=>{
      calls++;
      if(calls===1)return new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('aborted'));}));
      return {ok:true,headers:{get:()=>4},arrayBuffer:async()=>new Uint8Array([0,1,0,0]).buffer};
    }});
  await assert.rejects(resources.web(FontCatalogue.get('nanum-gothic'),400));
  assert.equal(aborted,true);
  assert.equal((await resources.web(FontCatalogue.get('nanum-gothic'),400)).mode,'web');
  assert.equal(calls,2);resources.dispose();
});

test('font downloads preserve the native fetch receiver',async()=>{
  let receiver;
  class Face {async load(){return this;}}
  const resources=new FontResources({document:{fonts:{add(){},delete(){}}},FontFace:Face,
    URL:{createObjectURL:()=> 'blob:font-test',revokeObjectURL(){}},
    fetch:async function(){receiver=this;return {ok:true,headers:{get:()=>4},arrayBuffer:async()=>new Uint8Array([0,1,0,0]).buffer};}});
  await resources.web(FontCatalogue.get('nanum-gothic'),400);
  assert.equal(receiver,globalThis,'Window.fetch must never receive the FontResources object as this');
  resources.dispose();
});

test('all catalogue files ship with their source hashes and licenses',async()=>{
  const base=new URL('../public/fonts/',import.meta.url),sources=JSON.parse(await readFile(new URL('sources.json',base),'utf8'));
  const entries=new Map(sources.map(entry=>[entry.file,entry]));
  for(const font of FontCatalogue.families)for(const face of font.faces){
    const bytes=await readFile(new URL(face.file,base));
    assert.ok(bytes.length<25*1024*1024,'fits individual static hosting asset limits');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entries.get(face.file)?.sha256,face.file);
  }
  for(const name of ['Naver','Pretendard','NotoSansKR','NotoSerifKR'])assert.match(await readFile(new URL(`licenses/${name}-OFL.txt`,base),'utf8'),/OPEN FONT LICENSE/i);
});
