/** @param {object} left Flat display row. @param {object} right Row to compare. */
function sameRow(left, right) {
  if (!left || !right) return false;
  const keys = Object.keys(right);
  return keys.length === Object.keys(left).length && keys.every(key => Object.is(left[key], right[key]));
}

/**
 * Preserve unchanged flat row identities and reuse the entire array on a no-op.
 * @param {object[]} previous Existing display rows, in presentation order.
 * @param {object[]} next Newly calculated display rows in the same order.
 */
export function shareRows(previous, next) {
  let identical = previous.length === next.length;
  const rows = next.map((row, index) => {
    if (sameRow(previous[index], row)) return previous[index];
    identical = false;
    return row;
  });
  return identical ? previous : rows;
}
