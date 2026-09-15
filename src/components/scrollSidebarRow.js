/**
 * Reveal a corresponding row inside sidebar scroll containers, without scrolling the preview or page.
 * @param {HTMLElement} row Sidebar row to reveal; keyboard focus is left where the user placed it.
 */
export function scrollSidebarRow(row) {
  const sidebar=row.closest('.sidebar');if(!sidebar)return;
  for(let container=row.parentElement;container;container=container.parentElement) {
    const style=getComputedStyle(container),item=row.getBoundingClientRect(),box=container.getBoundingClientRect();
    const top=box.top+container.clientTop,left=box.left+container.clientLeft;
    const bottom=top+container.clientHeight,right=left+container.clientWidth;
    if(/auto|scroll/.test(style.overflowY) && container.scrollHeight>container.clientHeight) {
      const delta=item.top<top?item.top-top:item.bottom>bottom?item.bottom-bottom:0;
      if(delta)container.scrollTop+=delta;
    }
    if(/auto|scroll/.test(style.overflowX) && container.scrollWidth>container.clientWidth) {
      const delta=item.left<left?item.left-left:item.right>right?item.right-right:0;
      if(delta)container.scrollLeft+=delta;
    }
    if(container===sidebar)break;
  }
}
