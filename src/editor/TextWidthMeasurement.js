/** Measure rendered text width while optionally retaining the existing automatic line breaks. */
export class TextWidthMeasurement {
  /** @param {HTMLElement} text Detached, styled text box attached to a measurement host. @param {boolean} unwrap Remove automatic wrapping. @returns {number} Width in CSS pixels. */
  static measure(text,unwrap) {
    if(unwrap){
      for(const node of [text,...text.querySelectorAll('*')])node.style.whiteSpace='pre';
      text.style.width='max-content';
      return Math.max(text.getBoundingClientRect().width,text.scrollWidth);
    }
    // Text ranges exclude unused paragraph width and work with mixed fonts and alignment.
    const ranges=[],walker=text.ownerDocument.createTreeWalker(text,4);
    for(let node=walker.nextNode();node;node=walker.nextNode()){
      if(!node.textContent)continue;
      const range=text.ownerDocument.createRange();range.selectNodeContents(node);ranges.push(range);
    }
    const signature=()=>ranges.flatMap(range=>Array.from(range.getClientRects(),rect=>rect.width));
    const original=signature(),initial=text.getBoundingClientRect().width;
    if(!original.length)return initial;
    const same=()=>{const next=signature();return next.length===original.length&&next.every((width,index)=>Math.abs(width-original[index])<0.1);};
    let low=0,high=initial;
    // Find the smallest width that retains the rendered text fragments on each line.
    for(let step=0;step<18&&high-low>0.05;step++){
      const middle=(low+high)/2;text.style.width=`${middle}px`;
      if(same()&&text.scrollWidth<=middle+1)high=middle;else low=middle;
    }
    text.style.width=`${high}px`;
    return high;
  }
}
