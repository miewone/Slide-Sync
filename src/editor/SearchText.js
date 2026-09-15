const DRAWING_NS='http://schemas.openxmlformats.org/drawingml/2006/main';

/** Shared text extraction and literal-query normalization for slide and element search. */
export class SearchText {
  /** @param {string} text Normalize Unicode, case and whitespace, without regex query evaluation. */
  static normalize(text) {
    return String(text ?? '').normalize('NFKC').toLowerCase().replace(/\s+/gu,' ').trim();
  }

  /** @param {Document|Element} root XML root. Return full paragraphs with adjacent runs joined. */
  static paragraphs(root) {
    const read=node=>{
      if(node.namespaceURI===DRAWING_NS && node.localName==='t')return node.textContent || '';
      if(node.namespaceURI===DRAWING_NS && ['br','tab'].includes(node.localName))return ' ';
      return Array.from(node.children || []).map(read).join('');
    };
    return Array.from(root?.getElementsByTagNameNS(DRAWING_NS,'p') || []).map(read);
  }
}
