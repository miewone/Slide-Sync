import {TableGeometry} from './TableGeometry.js';

/** Preserve DrawingML column geometry instead of browser automatic table sizing. */
export class PreviewTable {
  /**
   * Apply explicit grid widths to an already rendered table, including merged cells.
   * @param {object} node Parsed renderer node with tableGrid and tr properties.
   * @param {HTMLElement} element Rendered table container.
   */
  static apply(node, element) {
    if (!node.tableGrid || !element) return;
    const table = element.querySelector('table');
    const sourceGrid = node.source?.['a:graphic']?.['a:graphicData']?.['a:tbl']?.['a:tblGrid']?.['a:gridCol'];
    const columns = sourceGrid ? (Array.isArray(sourceGrid) ? sourceGrid : [sourceGrid])
      .map(col => ({width: Number(col.attrs.w) / 12700})) : node.tableGrid.gridCol;
    const size = TableGeometry.fromDimensions(columns.map(col => col.width), node.tr.map(row => row.props.height));
    const total = columns.reduce((sum, column) => sum + column.width, 0);
    if (!table || !size) return;

    const scaleX = node.group?.chExtend.w ? node.group.extend.w / node.group.chExtend.w : 1;
    const scaleY = node.group?.chExtend.h ? node.group.extend.h / node.group.chExtend.h : 1;
    element.style.width = `${size.w * scaleX}px`;
    element.style.height = `${size.h * scaleY}px`;
    Array.from(table.rows).forEach((row, index) => {
      row.style.height = `${node.tr[index].props.height * scaleY}px`;
    });

    table.style.width = '100%';
    table.style.tableLayout = 'fixed';
    const grid = element.ownerDocument.createElement('colgroup');
    for (const column of columns) {
      const col = element.ownerDocument.createElement('col');
      col.style.width = `${column.width / total * 100}%`;
      grid.append(col);
    }
    table.prepend(grid);
    // The vendor assigns a single-column pixel width even to merged cells.
    // The colgroup is the sole source of column widths for every row.
    for (const cell of table.querySelectorAll('td')) {
      cell.style.removeProperty('width');
      cell.style.padding = '0';
    }
  }
}
