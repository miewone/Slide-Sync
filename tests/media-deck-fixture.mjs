/**
 * Add a valid silent WAV and a PNG poster to the shipped sample presentation.
 * @param {Function} JSZip Existing ZIP dependency.
 * @param {ArrayBuffer|Uint8Array} sample Original presentation archive.
 * @returns {Promise<object>} Archive and original media bytes for preservation checks.
 */
export async function makeMediaDeckFixture(JSZip,sample) {
  const zip=await JSZip.loadAsync(sample);
  const wav=new Uint8Array(16044),view=new DataView(wav.buffer);
  const text=(offset,value)=>{for(let i=0;i<value.length;i++)wav[offset+i]=value.charCodeAt(i);};
  text(0,'RIFF');view.setUint32(4,wav.length-8,true);text(8,'WAVE');text(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  text(36,'data');view.setUint32(40,wav.length-44,true);
  const poster='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgaPj/HwAEggJ/59habAAAAABJRU5ErkJggg==';
  zip.file('ppt/media/media1.wav',wav);
  zip.file('ppt/media/image999.png',poster,{base64:true});
  const slide='ppt/slides/slide1.xml',rels='ppt/slides/_rels/slide1.xml.rels';
  const picture='<p:pic><p:nvPicPr><p:cNvPr id="999" name="Media poster"/><p:cNvPicPr/><p:nvPr><a:audioFile r:link="rIdMediaAudio"/></p:nvPr></p:nvPicPr><p:blipFill><a:blip r:embed="rIdMediaPoster"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="720000" y="720000"/><a:ext cx="720000" cy="720000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>';
  zip.file(slide,(await zip.file(slide).async('string')).replace('</p:spTree>',picture+'</p:spTree>'));
  const ns='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  zip.file(rels,(await zip.file(rels).async('string')).replace('</Relationships>',`<Relationship Id="rIdMediaAudio" Type="${ns}/audio" Target="../media/media1.wav"/><Relationship Id="rIdMediaPoster" Type="${ns}/image" Target="../media/image999.png"/></Relationships>`));
  const types='[Content_Types].xml';
  zip.file(types,(await zip.file(types).async('string')).replace('</Types>','<Override PartName="/ppt/media/media1.wav" ContentType="audio/wav"/><Override PartName="/ppt/media/image999.png" ContentType="image/png"/></Types>'));
  return {zip,wav,poster};
}
