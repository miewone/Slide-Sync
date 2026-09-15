/** Shared action labels used by the alignment UI and completion messages. */
export const alignmentGroups = [
  {label:'가로 정렬',actions:[['left','왼쪽'],['center','가운데'],['right','오른쪽']]},
  {label:'세로 정렬',actions:[['top','상단'],['middle','중단'],['bottom','하단']]},
];

/** Spacing actions preserve the two outermost elements. */
export const distributionActions = [['horizontal','가로 간격 균등'],['vertical','세로 간격 균등']];

/** @param {string} action Layout action identifier. Return a user-facing result label. */
export function layoutActionLabel(action) {
  for(const group of alignmentGroups) {
    const item=group.actions.find(([value])=>value===action);
    if(item)return `${group.label} · ${item[1]}`;
  }
  return distributionActions.find(([value])=>value===action)?.[1] || '정렬';
}
