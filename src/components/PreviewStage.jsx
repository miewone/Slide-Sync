import {memo,useLayoutEffect,useRef} from 'react';

/**
 * Stable preview host; the editor alone owns its descendants.
 * @param {object} props Grid columns and visible rows; null values preserve the responsive layout.
 */
export const PreviewStage=memo(function PreviewStage({columns,rows,hostRef}) {
  const ownRef=useRef(null),ref=hostRef||ownRef;
  useLayoutEffect(()=>{
    const stage=ref.current;
    if(rows===null){stage.style.removeProperty('--preview-row-height');return;}
    const resize=()=>{
      const style=getComputedStyle(stage);
      const available=stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
      const gap=parseFloat(style.rowGap)||0;
      stage.style.setProperty('--preview-row-height',`${Math.max(80,(available-gap*(rows-1))/rows)}px`);
    };
    const observer=new ResizeObserver(resize);
    observer.observe(stage);resize();
    return ()=>observer.disconnect();
  },[rows]);
  return <div ref={ref} id="stage" className={`stage${columns===null?'':' preview-grid'}`} style={columns===null?undefined:{'--preview-columns':columns}}/>;
});
