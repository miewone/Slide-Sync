import {test} from 'node:test';
import assert from 'node:assert/strict';
import {XmlPartCodec} from '../src/services/XmlPartCodec.js';

/** @param {string} text XML text. @param {boolean} bigEndian Byte order. @param {boolean} bom Include BOM. */
function utf16(text,bigEndian=false,bom=true) {
  const bytes=new Uint8Array(text.length*2+(bom?2:0));
  if(bom)bytes.set(bigEndian?[0xFE,0xFF]:[0xFF,0xFE]);
  for(let i=0;i<text.length;i++){
    const code=text.charCodeAt(i),offset=i*2+(bom?2:0);
    bytes[offset]=bigEndian?code>>8:code&255;bytes[offset+1]=bigEndian?code&255:code>>8;
  }
  return bytes;
}

test('UTF-8 BOM variants leave content and source bytes intact',()=>{
  const xml='<root>한글 😀 \uFEFF ï»¿</root>';
  for(const prefix of ['', '\uFEFF', 'ï»¿', '\uFEFFï»¿', '\uFEFF\uFEFF']) {
    const bytes=new TextEncoder().encode(prefix+xml),original=bytes.slice();
    assert.equal(XmlPartCodec.decode(bytes,'test.xml'),xml);
    assert.deepEqual(bytes,original);
  }
});

test('UTF-16 byte orders, generic declarations and signatures preserve multilingual text',()=>{
  for(const bigEndian of [false,true])for(const bom of [false,true]) {
    const xml='<?xml version="1.0" encoding="UTF-16"?><root>한글 é 😀</root>';
    assert.equal(XmlPartCodec.decode(utf16(xml,bigEndian,bom),'utf16.xml'),xml);
  }
});

test('declared browser-supported encoding is decoded instead of replaced with corrupt characters',()=>{
  const xml='<?xml version="1.0" encoding="windows-1252"?><root>Café</root>';
  const bytes=Uint8Array.from(xml,c=>c.charCodeAt(0));
  assert.equal(XmlPartCodec.decode(bytes,'legacy.xml'),xml);
});

test('invalid UTF-8 and UTF-16 fail with package path instead of silently replacing characters',()=>{
  for(const bytes of [new Uint8Array([0x3C,0x72,0x3E,0xFF]),new Uint8Array([0xFF,0xFE,0x3C])]) {
    assert.throws(()=>XmlPartCodec.decode(bytes,'ppt/slides/slide1.xml'),/ppt\/slides\/slide1.xml/);
  }
});

test('conflicting declarations and unsupported encodings have explicit diagnostics',()=>{
  for(const bytes of [
    new TextEncoder().encode('\uFEFF<?xml version="1.0" encoding="UTF-16"?><root/>'),
    utf16('<?xml version="1.0" encoding="UTF-8"?><root/>'),
    new TextEncoder().encode('<?xml version="1.0" encoding="not-an-encoding"?><root/>'),
    new Uint8Array([0xFF,0xFE,0,0,0x3C,0,0,0]),
  ])assert.throws(()=>XmlPartCodec.decode(bytes,'bad.xml'),/bad.xml/);
});

test('normalization never discards unrelated text, embedded BOMs or XML content',()=>{
  for(const source of ['garbage<root/>','<root>ï»¿\uFEFF</root>','\uFEFFgarbage<root/>'])assert.equal(XmlPartCodec.normalize(source),source);
});

test('edited XML declares UTF-8 without changing body attributes or text',()=>{
  const xml='<?xml version="1.0" encoding="UTF-16" standalone="yes"?><root encoding="UTF-16">한글</root>';
  assert.equal(XmlPartCodec.forUtf8(xml),'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><root encoding="UTF-16">한글</root>');
  assert.equal(XmlPartCodec.forUtf8('<root/>'),'<root/>');
});
