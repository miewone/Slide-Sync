import {useEffect,useId,useRef} from 'react';
import {NativeSlidesAppearance as Appearance} from '../editor/google/NativeSlidesAppearance.js';
import {NativeSlidesTableLayout} from '../editor/google/NativeSlidesTableLayout.js';
import {NativeSlidesImage} from './NativeSlidesImage.jsx';

/** @param {object} props Shape/text renderer, dimensions and optional cell insets. */
function NativeText({element,renderer,width,height,padding,clip=false}){
  const host=useRef(null),alignment=element.shape?.shapeProperties?.contentAlignment;
  useEffect(()=>{renderer.render(host.current,element,width);if(padding)Object.assign(host.current.style,padding);},[renderer,element,width,padding]);
  return <foreignObject width={width} height={height} style={{pointerEvents:'none',overflow:clip?'hidden':'visible'}}><div style={{height:'100%',display:'flex',flexDirection:'column',justifyContent:alignment==='MIDDLE'?'center':alignment==='BOTTOM'?'flex-end':'flex-start'}}><div ref={host} style={{flexShrink:0}}/></div></foreignObject>;
}

/** @param {object} props Native table, dimensions and shared text/theme resolvers. */
function NativeTable({element,width,height,renderer,appearance}){
  const layout=new NativeSlidesTableLayout(element.table,width,height);
  return <g data-native-table={element.objectId}>{layout.cells.map(({key,cell,x,y,width:w,height:h,textBox})=>{
    const props=cell.tableCellProperties||{},fill=appearance.fill(props.tableCellBackgroundFill);
    const text={objectId:`${element.objectId}:${key}`,shape:{text:cell.text,shapeProperties:{contentAlignment:props.contentAlignment}}};
    return <g key={key} data-native-cell={key} transform={`translate(${x} ${y})`}><rect width={w} height={h} fill={fill.color} fillOpacity={fill.opacity}/>
      {textBox.width>0&&textBox.height>0&&<g transform={`translate(${textBox.x} ${textBox.y})`}><NativeText element={text} renderer={renderer} width={textBox.width} height={textBox.height} clip padding={{padding:'0'}}/></g>}
    </g>;
  })}{layout.borders().map(({key,properties:p,...line})=>{
    if(!p)return null;const paint=appearance.fill(p.tableBorderFill);
    return <line key={key} {...line} stroke={paint.color} strokeOpacity={paint.opacity} strokeWidth={Appearance.points(p.weight)??1} strokeDasharray={Appearance.dash(p.dashStyle)}/>;
  })}</g>;
}

/** Native artwork primitives. Never replace unrecognized content with invented colored boxes. @param {object} props Element and shared text/appearance resolvers. */
export function NativeSlidesArtwork({element:n,renderer,appearance}){
  const marker=useId().replace(/:/g,''),t=n.transform||{scaleX:1,scaleY:1},w=Appearance.points(n.size?.width)||0,h=Appearance.points(n.size?.height)||0;
  const transform=`matrix(${t.scaleX??0} ${t.shearY||0} ${t.shearX||0} ${t.scaleY??0} ${t.unit==='EMU'?(t.translateX||0)/12700:t.translateX||0} ${t.unit==='EMU'?(t.translateY||0)/12700:t.translateY||0})`;
  const sx=Math.hypot(t.scaleX??0,t.shearY||0)||1,sy=Math.hypot(t.scaleY??0,t.shearX||0)||1;
  const geometry=Appearance.geometry(n.shape?.shapeType,w*sx,h*sy),Tag=geometry?.tag,image=appearance.image(n);
  const line=n.line?.lineProperties,stroke=appearance.fill(line?.lineFill);
  const shape=n.shape?{...n,shape:{...n.shape,shapeProperties:{...n.shape.shapeProperties,contentAlignment:appearance.property(n,'contentAlignment')}}}:n;
  return <g transform={transform} pointerEvents="none" data-native-artwork={n.objectId}>
    {n.elementGroup?(n.elementGroup.children||[]).map(child=><NativeSlidesArtwork key={child.objectId} element={child} renderer={renderer} appearance={appearance}/>):<>
      {Tag&&<g transform={`scale(${1/sx} ${1/sy})`}><Tag {...appearance.shape(n)} {...geometry.props}/></g>}
      {(n.image||n.sheetsChart)&&<NativeSlidesImage objectId={n.objectId} url={image.url} width={w} height={h} properties={image.properties}/>}
      {n.line&&<><defs><marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0 0 8 4 0 8Z" fill={stroke.color}/></marker></defs><path d={Appearance.linePath(n.line,w,h)} fill="none" stroke={line?.propertyState==='NOT_RENDERED'?'none':stroke.color} strokeOpacity={stroke.opacity} strokeWidth={Appearance.points(line?.weight)??1} strokeDasharray={Appearance.dash(line?.dashStyle)} markerStart={line?.startArrow&&line.startArrow!=='NONE'?`url(#${marker})`:undefined} markerEnd={line?.endArrow&&line.endArrow!=='NONE'?`url(#${marker})`:undefined}/></>}
      {n.table&&<NativeTable element={n} width={w} height={h} renderer={renderer} appearance={appearance}/>}
      {n.shape?.text&&<g transform={`scale(${1/sx} ${1/sy})`}><NativeText element={shape} renderer={renderer} width={w*sx} height={h*sy}/></g>}
    </>}
  </g>;
}
