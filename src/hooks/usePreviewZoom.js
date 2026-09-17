import {useLayoutEffect,useRef,useState} from 'react';
import {ViewportZoom} from '../editor/ViewportZoom.js';

/** Shared PPTX/native preview zoom lifecycle. @param {object} ref Scrollable stage ref. @param {object} options Grid columns, rows, enabled state and document identity. */
export function usePreviewZoom(ref,{columns,rows,enabled=true,documentKey}){
  const controller=useRef(null),[view,setView]=useState({percent:100,focused:null}),[editScope,setEditScope]=useState('selection');
  useLayoutEffect(()=>{const zoom=new ViewportZoom(ref.current,(percent,focused)=>setView(previous=>previous.percent===percent&&previous.focused===focused?previous:{percent,focused}));controller.current=zoom;return ()=>{zoom.dispose();controller.current=null;};},[ref]);
  useLayoutEffect(()=>{controller.current.configure({rows,enabled});},[columns,rows,enabled]);
  useLayoutEffect(()=>{controller.current.reset();},[documentKey]);
  const changeScope=scope=>{if(!['page','selection'].includes(scope))return;setEditScope(scope);ref.current.dispatchEvent(new CustomEvent('viewporteditscope',{detail:{scope}}));};
  return {...view,enabled,editScope,setEditScope:changeScope,setPercent:value=>controller.current?.set(value),reset:()=>controller.current?.set(100)};
}
