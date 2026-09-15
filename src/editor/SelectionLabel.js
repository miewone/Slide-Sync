/** Render a noninteractive element-name badge anchored to the selected objects' visual bounds. */
export class SelectionLabel {
  /**
   * @param {HTMLElement} surface Preview surface owned by the editor runtime.
   * @param {object[]} elements Selected top-level elements, in presentation order.
   * @param {object|null} bounds Axis-aligned visual bounds, including current drag positions and rotation.
   * @param {number} width Slide width in native units.
   * @param {number} height Slide height in native units.
   */
  static update(surface,elements,bounds,width,height) {
    let label=surface.querySelector('.selection-name-label');
    if(!elements.length) {
      if(label)label.hidden=true;
      surface.removeAttribute('title');surface.removeAttribute('aria-describedby');
      return;
    }
    if(!label) {
      label=surface.ownerDocument.createElement('span');label.className='selection-name-label';
      label.id=`slide-${surface.dataset.slide}-selection-name`;
      surface.append(label);
    }
    const names=elements.map(element=>element.name || `요소 ${element.id}`);
    const text=names.length===1?names[0]:`${names[0]} 외 ${names.length-1}개`;
    if(label.textContent!==text)label.textContent=text;
    const description=names.join(', ');
    if(surface.title!==description)surface.title=description;
    label.setAttribute('aria-label',`선택된 요소: ${description}`);
    surface.setAttribute('aria-describedby',label.id);label.hidden=false;
    label.style.setProperty('--selection-label-x',`clamp(0px, ${bounds.x/width*100}%, calc(100% - 80px))`);
    label.style.top=`max(0px, calc(${bounds.y/height*100}% - 26px))`;
  }
}
