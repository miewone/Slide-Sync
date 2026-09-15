/** Read a table's actual size from its column grid and row heights, in EMU. */
export class TableGeometry {
  /** @param {number[]} widths Column widths. @param {number[]} heights Row heights. */
  static fromDimensions(widths, heights) {
    if (!widths.length || !heights.length ||
        ![...widths, ...heights].every(value => Number.isFinite(value) && value > 0)) return null;
    const w = widths.reduce((sum, value) => sum + value, 0);
    const h = heights.reduce((sum, value) => sum + value, 0);
    return Number.isFinite(w) && Number.isFinite(h) ? {w, h} : null;
  }

  /** @param {Element} node OOXML graphic frame; other shapes return null. */
  static fromXml(node) {
    if (node?.localName !== 'graphicFrame') return null;
    const table = node.getElementsByTagNameNS('*', 'tbl')[0];
    if (!table) return null;
    return this.fromDimensions(
      Array.from(table.getElementsByTagNameNS('*', 'gridCol'), col => Number(col.getAttribute('w'))),
      Array.from(table.children).filter(row => row.localName === 'tr').map(row => Number(row.getAttribute('h'))));
  }
}
