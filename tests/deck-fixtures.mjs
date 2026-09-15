/**
 * Generate deterministic PPTX fixtures from the shipped sample inside a browser.
 * @param {Function} JSZip Existing ZIP dependency.
 * @param {ArrayBuffer} sample Original sample package.
 * @param {number} count Number of copies of its first slide.
 * @param {object} options Optional native chart, including grouped/inherited variants.
 * @returns {Promise<Blob>} A standalone PPTX used only by regression tests.
 */
export async function makeDeckFixture(JSZip,sample,count,{chart=false,chartScope='slide'}={}) {
  const zip=await JSZip.loadAsync(sample);
  const xml=await zip.file('ppt/slides/slide1.xml').async('string');
  const rels=await zip.file('ppt/slides/_rels/slide1.xml.rels').async('string');
  const parse=text=>new DOMParser().parseFromString(text,'application/xml');
  const serialize=doc=>new XMLSerializer().serializeToString(doc);
  const rNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const relNS='http://schemas.openxmlformats.org/package/2006/relationships';
  const pNS='http://schemas.openxmlformats.org/presentationml/2006/main';
  const presentation=parse(await zip.file('ppt/presentation.xml').async('string'));
  const list=presentation.getElementsByTagNameNS(pNS,'sldIdLst')[0];list.replaceChildren();
  const presentationRels=parse(await zip.file('ppt/_rels/presentation.xml.rels').async('string'));
  for(const node of [...presentationRels.documentElement.children])if(node.getAttribute('Type').endsWith('/slide'))node.remove();
  const types=parse(await zip.file('[Content_Types].xml').async('string'));
  for(const node of [...types.documentElement.children])if(node.getAttribute('ContentType')?.endsWith('presentationml.slide+xml'))node.remove();
  for(const path of Object.keys(zip.files))if(path.startsWith('ppt/slides/')&&!zip.files[path].dir)zip.remove(path);
  for(let i=1;i<=count;i++) {
    zip.file(`ppt/slides/slide${i}.xml`,xml);zip.file(`ppt/slides/_rels/slide${i}.xml.rels`,rels);
    const id=presentation.createElementNS(pNS,'p:sldId');id.setAttribute('id',String(255+i));id.setAttributeNS(rNS,'r:id',`rIdFixture${i}`);list.append(id);
    const rel=presentationRels.createElementNS(relNS,'Relationship');rel.setAttribute('Id',`rIdFixture${i}`);rel.setAttribute('Type',rNS+'/slide');rel.setAttribute('Target',`slides/slide${i}.xml`);presentationRels.documentElement.append(rel);
    const type=types.createElementNS(types.documentElement.namespaceURI,'Override');type.setAttribute('PartName',`/ppt/slides/slide${i}.xml`);type.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.presentationml.slide+xml');types.documentElement.append(type);
  }
  zip.file('ppt/presentation.xml',serialize(presentation));zip.file('ppt/_rels/presentation.xml.rels',serialize(presentationRels));
  if(chart) {
    let frame=`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="900" name="Fixture chart"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="720000" y="1000000"/><a:ext cx="4000000" cy="2500000"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rIdFixtureChart"/></a:graphicData></a:graphic></p:graphicFrame>`;
    if(chartScope==='group')frame=`<p:grpSp><p:nvGrpSpPr><p:cNvPr id="899" name="Chart group"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/><a:chOff x="0" y="0"/><a:chExt cx="12192000" cy="6858000"/></a:xfrm></p:grpSpPr>${frame}</p:grpSp>`;
    const part=chartScope==='master'?'ppt/slideMasters/slideMaster1.xml':chartScope==='layout'?'ppt/slideLayouts/slideLayout1.xml':'ppt/slides/slide1.xml';
    zip.file(part,(await zip.file(part).async('string')).replace('</p:spTree>',frame+'</p:spTree>'));
    const relPath=part.replace(/\/([^/]+)$/, '/_rels/$1.rels');
    zip.file(relPath,(await zip.file(relPath).async('string')).replace('</Relationships>',`<Relationship Id="rIdFixtureChart" Type="${rNS}/chart" Target="../charts/chart1.xml"/></Relationships>`));
    zip.file('ppt/charts/chart1.xml',`<?xml version="1.0" encoding="UTF-8"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart><c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Series</c:v></c:tx><c:cat><c:strRef><c:f>Sheet1!$A$2:$A$3</c:f><c:strCache><c:ptCount val="2"/><c:pt idx="0"><c:v>A</c:v></c:pt><c:pt idx="1"><c:v>B</c:v></c:pt></c:strCache></c:strRef></c:cat><c:val><c:numRef><c:f>Sheet1!$B$2:$B$3</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="2"/><c:pt idx="0"><c:v>4</c:v></c:pt><c:pt idx="1"><c:v>9</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser><c:axId val="1"/><c:axId val="2"/></c:barChart><c:catAx><c:axId val="1"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="2"/></c:catAx><c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:crossAx val="1"/></c:valAx></c:plotArea></c:chart></c:chartSpace>`);
    const type=types.createElementNS(types.documentElement.namespaceURI,'Override');type.setAttribute('PartName','/ppt/charts/chart1.xml');type.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.drawingml.chart+xml');types.documentElement.append(type);
  }
  zip.file('[Content_Types].xml',serialize(types));
  return zip.generateAsync({type:'blob'});
}
