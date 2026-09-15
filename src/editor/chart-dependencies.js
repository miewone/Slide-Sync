const CHART_NS = 'http://schemas.openxmlformats.org/drawingml/2006/chart';

/**
 * Check actual chart references in slide, layout and master XML, including groups.
 * Orphaned chart files in the ZIP do not force the chart runtime to load.
 * @param {object} deck Loaded editing deck with inherited XML documents.
 * @returns {boolean} Whether a referenced DrawingML chart can be rendered.
 */
export function deckHasCharts(deck) {
  const visited = new Set();
  for (const slide of deck.slides) {
    for (const doc of [slide.doc, slide.layout, slide.master]) {
      if (!doc || visited.has(doc)) continue;
      visited.add(doc);
      if (doc.getElementsByTagNameNS(CHART_NS, 'chart').length) return true;
    }
  }
  return false;
}
