const pNS = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const aNS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const rNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const namespaces = `xmlns:p="${pNS}" xmlns:a="${aNS}" xmlns:r="${rNS}"`;
const header = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const group = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const relationships = entries => `${header}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${entries.map(([id, type, target]) => `<Relationship Id="${id}" Type="${rNS}/${type}" Target="${target}"/>`).join('')}</Relationships>`;

/** Reproducible cases; expected values describe visible output rather than parser internals. */
export const previewFormatCases = [
  {id:'01-table-normal', title:'Normal table', description:'정상 기준: 표 외곽 크기와 그리드 합계가 일치합니다.', kind:'table', widths:[1000000,2000000,3000000], heights:[400000,400000]},
  {id:'02-table-stale-extents', title:'Stale table extents', description:'외곽은 3000000 정사각형이지만 실제 표는 6000000 × 800000입니다.', kind:'table', widths:[1000000,2000000,3000000], heights:[400000,400000], stale:true},
  {id:'03-table-single-cell', title:'Single row and column', description:'열·행이 하나인 표도 정상 너비로 표시합니다.', kind:'table', widths:[4000000], heights:[600000]},
  {id:'04-table-merge-one', title:'Merged cells: 1', description:'1로 표현된 가로·세로 병합을 표시합니다.', kind:'table', widths:[1000000,2000000,3000000], heights:[400000,400000], merge:'1'},
  {id:'05-table-merge-true', title:'Merged cells: true', description:'true로 표현된 병합은 1과 동일하게 표시합니다.', kind:'table', widths:[1000000,2000000,3000000], heights:[400000,400000], merge:'true'},
  {id:'06-placeholder-index', title:'Same type, different index', description:'동일 ctrTitle 유형에서 idx 3은 14pt 굵게, idx 2는 13pt 보통입니다.', kind:'placeholder'},
  {id:'07-placeholder-default-zero', title:'Omitted index means zero', description:'idx 생략과 명시적인 idx 0은 같은 11pt 서식을 상속합니다.', kind:'default-index'},
  {id:'08-text-line-breaks', title:'Explicit line breaks', description:'텍스트 상자와 표 셀 모두 First / Second / Third 세 줄입니다.', kind:'breaks', issue:'https://github.com/501351981/pptx-preview/issues/14'},
  {id:'09-text-empty-runs', title:'Empty text runs', description:'빈 a:t와 a:t 생략은 추가 문자열 없이 BeforeAfter로 표시합니다.', kind:'empty', issue:'https://github.com/501351981/pptx-preview/issues/15'},
  {id:'10-text-font-inheritance', title:'Inherited and explicit fonts', description:'상속 Arial, 명시 Courier New, 라틴 전용 Courier New를 구분합니다.', kind:'fonts'},
];

/** Builds standalone PPTX packages from local template infrastructure and synthetic content. */
export class PreviewFormatFixtureBuilder {
  /** @param {Function} JSZip Bundled ZIP constructor. @param {Uint8Array|ArrayBuffer} sample Shipped sample bytes. */
  constructor(JSZip, sample) {
    this.JSZip = JSZip;
    this.sample = sample;
  }

  /** @param {object[]} cases Ordered cases to include; one slide per case. @returns {Promise<Uint8Array>} PPTX bytes. */
  async build(cases) {
    const sample = await this.JSZip.loadAsync(this.sample);
    const zip = new this.JSZip();
    const parts = {
      '_rels/.rels':relationships([['rId1','officeDocument','ppt/presentation.xml']]),
      'ppt/presentation.xml':`${header}<p:presentation ${namespaces}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rIdMaster"/></p:sldMasterIdLst><p:sldIdLst>${cases.map((_, i) => `<p:sldId id="${256+i}" r:id="rIdSlide${i+1}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:defaultTextStyle></p:presentation>`,
      'ppt/_rels/presentation.xml.rels':relationships([['rIdMaster','slideMaster','slideMasters/slideMaster1.xml'], ['rIdTheme','theme','theme/theme1.xml'], ...cases.map((_, i) => [`rIdSlide${i+1}`,'slide',`slides/slide${i+1}.xml`])]),
      'ppt/slideMasters/slideMaster1.xml':await sample.file('ppt/slideMasters/slideMaster1.xml').async('string'),
      'ppt/slideMasters/_rels/slideMaster1.xml.rels':relationships([['rId1','slideLayout','../slideLayouts/slideLayout1.xml'],['rId2','theme','../theme/theme1.xml']]),
      'ppt/theme/theme1.xml':await sample.file('ppt/theme/theme1.xml').async('string'),
      'ppt/slideLayouts/slideLayout1.xml':`${header}<p:sldLayout ${namespaces} type="blank" preserve="1"><p:cSld name="Format regression"><p:spTree>${group}${[1,2,3,0].map((idx, i) => this.text(20+i, '', {idx, size:[18,13,14,11][i], bold:idx===1 || idx===3, layout:true})).join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
      'ppt/slideLayouts/_rels/slideLayout1.xml.rels':relationships([['rId1','slideMaster','../slideMasters/slideMaster1.xml']]),
    };
    cases.forEach((entry, i) => {
      parts[`ppt/slides/slide${i+1}.xml`] = `${header}<p:sld ${namespaces}><p:cSld name="${entry.id}"><p:spTree>${group}${this.text(2, entry.title, {y:300000, size:24, bold:true})}${this.text(3, `Case ${entry.id} | Expected: see README.md`, {y:850000, size:12})}${this.content(entry)}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
      parts[`ppt/slides/_rels/slide${i+1}.xml.rels`] = relationships([['rId1','slideLayout','../slideLayouts/slideLayout1.xml']]);
    });
    const overrides = Object.keys(parts).filter(path => !path.endsWith('.rels')).map(path => {
      const type = path.includes('/slideMasters/') ? 'presentationml.slideMaster' : path.includes('/slideLayouts/') ? 'presentationml.slideLayout' : path.includes('/slides/') ? 'presentationml.slide' : path.includes('/theme/') ? 'theme' : 'presentationml.presentation.main';
      return `<Override PartName="/${path}" ContentType="application/vnd.openxmlformats-officedocument.${type}+xml"/>`;
    });
    parts['[Content_Types].xml'] = `${header}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${overrides.join('')}</Types>`;
    for (const [path, data] of Object.entries(parts)) zip.file(path, data, {date:new Date('2020-01-01T00:00:00Z')});
    return zip.generateAsync({type:'uint8array', compression:'DEFLATE'});
  }

  /** @param {number} id Shape ID. @param {string} value Text. @param {object} options Position, font and optional placeholder properties. */
  text(id, value, {y=1700000, size=18, bold=false, idx, omitted=false, layout=false, runs, font='Arial'} = {}) {
    const placeholder = idx !== undefined || omitted;
    const style = `<a:defRPr sz="${size*100}" b="${bold ? 1 : 0}"><a:latin typeface="${font}"/><a:ea typeface="${font}"/></a:defRPr>`;
    return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Case shape ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr>${placeholder ? `<p:ph type="ctrTitle"${omitted ? '' : ` idx="${idx}"`}/>` : ''}</p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="600000" y="${y}"/><a:ext cx="10500000" cy="650000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr anchor="t" lIns="0" rIns="0" tIns="0" bIns="0"/><a:lstStyle>${layout || !placeholder ? `<a:lvl1pPr>${style}</a:lvl1pPr>` : ''}</a:lstStyle><a:p><a:pPr algn="l"/>${runs ?? `<a:r><a:rPr/><a:t>${escape(value)}</a:t></a:r>`}</a:p></p:txBody></p:sp>`;
  }

  /** @param {object} entry Case definition. @returns {string} Synthetic shape XML. */
  content(entry) {
    if (entry.kind === 'table') return this.table(entry);
    if (entry.kind === 'placeholder') return this.text(83, 'Body: 14pt bold Arial', {idx:3}) + this.text(85, 'Heading: 13pt regular Arial', {idx:2,y:2600000});
    if (entry.kind === 'default-index') return this.text(89, 'Omitted idx: 11pt', {omitted:true}) + this.text(90, 'Explicit idx=0: 11pt', {idx:0,y:2600000});
    if (entry.kind === 'fonts') return this.text(83, 'Inherited Arial', {idx:3}) + this.text(85, '', {idx:3,y:2600000,runs:'<a:r><a:rPr><a:ea typeface="Courier New"/></a:rPr><a:t>동아시아글꼴</a:t></a:r>'}) + this.text(89, '', {y:3500000,runs:'<a:r><a:rPr><a:latin typeface="Courier New"/></a:rPr><a:t>Latin-only Courier New</a:t></a:r>'});
    const run = text => `<a:r><a:rPr sz="1800"><a:latin typeface="Arial"/></a:rPr><a:t>${text}</a:t></a:r>`;
    const runs = entry.kind === 'breaks' ? `${run('First')}<a:br/>${run('Second')}<a:br/>${run('Third')}` : `${run('Before')}${run('')}<a:r><a:rPr/><a:t/></a:r><a:r><a:rPr/></a:r>${run('After')}`;
    return this.text(83, '', {runs}) + this.table({widths:[6000000],heights:[1500000],runs});
  }

  /** @param {object} options Column/row sizes, optional merge boolean and text runs. */
  table({widths, heights, stale=false, merge, runs}) {
    const cell = (row, col) => {
      const attrs = merge ? row===0 && col===0 ? 'gridSpan="2"' : row===0 && col===1 ? `hMerge="${merge}"` : row===0 && col===2 ? 'rowSpan="2"' : row===1 && col===2 ? `vMerge="${merge}"` : '' : '';
      const covered = attrs.includes('Merge=');
      const label = covered ? '' : merge && row===0 && col===0 ? 'Merged A + B' : `R${row+1} C${col+1}`;
      return `<a:tc ${attrs}><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="l"/>${runs ?? `<a:r><a:rPr sz="1400"><a:latin typeface="Arial"/></a:rPr><a:t>${label}</a:t></a:r>`}</a:p></a:txBody><a:tcPr marL="50000" marR="50000" marT="50000" marB="50000"><a:solidFill><a:srgbClr val="${row===0 ? 'D9E6FA' : 'EEF3FA'}"/></a:solidFill></a:tcPr></a:tc>`;
    };
    return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="86" name="Case table"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="600000" y="3300000"/><a:ext cx="${stale ? 3000000 : widths.reduce((a,b)=>a+b,0)}" cy="${stale ? 3000000 : heights.reduce((a,b)=>a+b,0)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr/><a:tblGrid>${widths.map(w=>`<a:gridCol w="${w}"/>`).join('')}</a:tblGrid>${heights.map((h,row)=>`<a:tr h="${h}">${widths.map((_,col)=>cell(row,col)).join('')}</a:tr>`).join('')}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
  }
}
