import {localizedError} from '../i18n/I18n.js';

/** Decode XML package parts without changing their retained ZIP bytes. */
export class XmlPartCodec {
  /** @param {string} text Decoded XML; remove only leading BOM signatures before markup. */
  static normalize(text) {
    return text.replace(/^(?:\uFEFF|\u00EF\u00BB\u00BF)+(?=\s*<)/,'');
  }

  /** @param {string} text Serialized XML that JSZip will encode as UTF-8; align its declaration. */
  static forUtf8(text) {
    return text.replace(/^<\?xml\s[^?]*\?>/,declaration=>declaration.replace(/\bencoding\s*=\s*(['"])[^'"]+\1/i,'encoding="UTF-8"'));
  }

  /** @param {Uint8Array} bytes XML bytes. @param {string} path Package path for diagnostics. */
  static decode(bytes,path='') {
    const [a,b,c,d]=bytes;
    if((a===0&&b===0&&c===0xFE&&d===0xFF)||(a===0xFF&&b===0xFE&&c===0&&d===0)||
      (a===0&&b===0&&c===0&&d===0x3C)||(a===0x3C&&b===0&&c===0&&d===0)) {
      throw localizedError('core.xmlEncoding',{path,encoding:'UTF-32'});
    }
    let detected=null;
    if(a===0xEF&&b===0xBB&&c===0xBF)detected='utf-8';
    else if((a===0xFF&&b===0xFE)||(a===0x3C&&b===0&&c!==0&&d===0))detected='utf-16le';
    else if((a===0xFE&&b===0xFF)||(a===0&&b===0x3C&&c===0&&d!==0))detected='utf-16be';
    // Only inspect the declaration permissively; the complete payload is decoded strictly below.
    const header=this.normalize(new TextDecoder(detected||'utf-8').decode(bytes.subarray(0,1024)));
    const declared=/^<\?xml\s[^?]*?\bencoding\s*=\s*(['"])([^'"]+)\1/i.exec(header)?.[2];
    let decoder;
    try {decoder=new TextDecoder(declared||detected||'utf-8',{fatal:true});}
    catch {throw localizedError('core.xmlEncoding',{path,encoding:declared});}
    if(detected&&declared) {
      const genericUtf16=/^utf-16$/i.test(declared)&&detected.startsWith('utf-16');
      if(!genericUtf16&&decoder.encoding!==detected)throw localizedError('core.xmlEncodingMismatch',{path,encoding:declared,detected});
    }
    if(detected)decoder=new TextDecoder(detected,{fatal:true});
    try {return this.normalize(decoder.decode(bytes));}
    catch {throw localizedError('core.xmlInvalidBytes',{path,encoding:decoder.encoding});}
  }

  /** @param {object} entry JSZip XML entry; decode its bytes with its own encoding declaration. */
  static async read(entry) {
    return this.decode(await entry.async('uint8array'),entry.name);
  }
}
