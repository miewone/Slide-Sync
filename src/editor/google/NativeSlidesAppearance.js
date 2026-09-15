/** Resolve page themes and inherited native appearance without inventing colored fallback boxes. */
export class NativeSlidesAppearance {
  /** @param {NativeSlidesDocument} model Native presentation. @param {number} index Active slide index. */
  constructor(model,index=0){
    const source=model.original;this.pages=new Map([...source.masters||[],...source.layouts||[],...source.slides].map(p=>[p.objectId,p]));this.objects=new Map();
    const collect=elements=>{for(const e of elements||[]){this.objects.set(e.objectId,e);collect(e.elementGroup?.children);}};
    for(const page of this.pages.values())collect(page.pageElements);
    const slide=source.slides[index],layout=this.pages.get(slide?.slideProperties?.layoutObjectId),master=this.pages.get(slide?.slideProperties?.masterObjectId||layout?.layoutProperties?.masterObjectId);
    this.layers=[slide,layout,master].filter(Boolean);
  }
  /** @param {object} color Native opaque color. @param {string} fallback Unresolved color. */
  color(color,fallback='none'){
    let rgb=color?.rgbColor;
    if(color?.themeColor)for(const page of this.layers){rgb=page.pageProperties?.colorScheme?.colors?.find(pair=>pair.type===color.themeColor)?.color;if(rgb)break;}
    return rgb?`rgb(${['red','green','blue'].map(k=>Math.round(Math.max(0,Math.min(1,rgb[k]||0))*255)).join(',')})`:fallback;
  }
  /** @param {object} fill Native solid fill. Return SVG/CSS color and opacity. */
  fill(fill){return {color:fill?.propertyState==='NOT_RENDERED'?'none':this.color(fill?.solidFill?.color),opacity:fill?.solidFill?.alpha??1};}
  /** @param {object} element Shape. @param {string} key Property to resolve through parent placeholders. */
  property(element,key){
    const chain=[],seen=new Set();let current=element;
    while(current&&!seen.has(current.objectId)){seen.add(current.objectId);chain.unshift(current.shape?.shapeProperties?.[key]);current=this.objects.get(current.shape?.placeholder?.parentObjectId);}
    const merge=(base,patch)=>{if(!patch||typeof patch!=='object')return patch;const result={...base};for(const [name,value] of Object.entries(patch))result[name]=value&&typeof value==='object'&&!Array.isArray(value)?merge(result[name],value):value;return result;};
    let result;for(const value of chain)if(value&&value.propertyState!=='INHERIT')result=merge(result,value);
    return result;
  }

  /** @param {object} element Native shape. Return actual fill and outline SVG attributes. */
  shape(element){
    const fill=this.fill(this.property(element,'shapeBackgroundFill')),outline=this.property(element,'outline'),line=outline?.propertyState==='NOT_RENDERED'?{color:'none',opacity:1}:this.fill(outline?.outlineFill);
    return {fill:fill.color,fillOpacity:fill.opacity,stroke:line.color,strokeOpacity:line.opacity,strokeWidth:NativeSlidesAppearance.points(outline?.weight)??1,strokeDasharray:NativeSlidesAppearance.dash(outline?.dashStyle)};
  }
  /** @param {object} element Image/chart, including inherited placeholder resources and crop properties. */
  image(element){
    const chain=[],seen=new Set();let current=element;
    while(current&&!seen.has(current.objectId)){seen.add(current.objectId);chain.unshift(current);current=this.objects.get(current.image?.placeholder?.parentObjectId);}
    let url=null;const properties={};
    for(const item of chain){const image=item.image||item.sheetsChart;if(!image)continue;url=NativeSlidesAppearance.imageUrl(image.contentUrl)||url;const own=image.imageProperties||image.sheetsChartProperties?.chartImageProperties||{},crop=properties.cropProperties;Object.assign(properties,own);if(own.cropProperties)properties.cropProperties={...crop,...own.cropProperties};}
    return {url,properties};
  }
  /** Return effective slide background and inherited decorative objects; placeholders remain slide-owned. */
  background(){
    let background,backgroundPage;
    for(const layer of this.layers){const fill=layer.pageProperties?.pageBackgroundFill;if(fill&&fill.propertyState!=='INHERIT'){background=fill;backgroundPage=layer.objectId;break;}}
    const decoration=e=>(e.shape?.placeholder||e.image?.placeholder)?null:e.elementGroup?{...e,elementGroup:{...e.elementGroup,children:(e.elementGroup.children||[]).map(decoration).filter(Boolean)}}:e;
    return {fill:this.fill(background),imageId:`background:${backgroundPage}`,hasImage:!!background?.stretchedPictureFill,image:NativeSlidesAppearance.imageUrl(background?.stretchedPictureFill?.contentUrl),elements:this.layers.slice(1).reverse().flatMap(layer=>(layer.pageElements||[]).map(decoration).filter(Boolean))};
  }
  /** @param {object} value Native dimension. Return points or undefined. */
  static points(value){return !value?undefined:(value.magnitude??0)===0?0:value.unit==='EMU'?value.magnitude/12700:value.unit==='PT'?value.magnitude:undefined;}
  /** @param {string} style Native dash enum. */
  static dash(style){return {DOT:'1 3',DASH:'6 4',DASH_DOT:'6 3 1 3',LONG_DASH:'10 4',LONG_DASH_DOT:'10 3 1 3'}[style];}
  /** @param {string} url Native image URL. Keep the existing Google-host allowlist. */
  static imageUrl(url){return typeof url==='string'&&/^https:\/\/([a-z0-9-]+\.)*googleusercontent\.com\//i.test(url)?url:null;}
  /** @param {object} line Native connector type/category. @param {number} w Local endpoint width. @param {number} h Local endpoint height. Return its default route. */
  static linePath(line,w,h){
    const type=line.lineType||'',bent=type.startsWith('BENT_CONNECTOR')||line.lineCategory==='BENT',curved=type.startsWith('CURVED_CONNECTOR')||line.lineCategory==='CURVED';
    if(bent){
      if(type.endsWith('_2'))return `M0 0 H${w} V${h}`;
      if(type.endsWith('_4'))return `M0 0 H${w/2} V${h/2} H${w} V${h}`;
      if(type.endsWith('_5'))return `M0 0 H${w/3} V${h/2} H${2*w/3} V${h} H${w}`;
      return `M0 0 H${w/2} V${h} H${w}`;
    }
    if(curved)return type.endsWith('_2')?`M0 0 Q${w} 0 ${w} ${h}`:`M0 0 C${w/2} 0 ${w/2} ${h} ${w} ${h}`;
    return `M0 0 L${w} ${h}`;
  }
  /** @param {string} type Native shape type. @param {number} w Width. @param {number} h Height. Return a normalized SVG primitive, or null for unsupported geometry. */
  static geometry(type,w,h){
    const polygon=points=>({tag:'polygon',props:{points:points.map(([x,y])=>`${x*w},${y*h}`).join(' ')}});
    if(['RECTANGLE','TEXT_BOX'].includes(type))return {tag:'rect',props:{width:w,height:h}};
    if(type==='ROUND_RECTANGLE')return {tag:'rect',props:{width:w,height:h,rx:Math.min(w,h)/6}};
    if(type==='ELLIPSE')return {tag:'ellipse',props:{cx:w/2,cy:h/2,rx:w/2,ry:h/2}};
    if(['RIGHT_BRACKET','LEFT_BRACKET','BRACKET_PAIR'].includes(type)){
      const cap=type==='BRACKET_PAIR'?Math.min(w/2,h/8):w,radius=Math.min(cap,h/8),right=`M${w-cap} 0 Q${w} 0 ${w} ${radius} L${w} ${h-radius} Q${w} ${h} ${w-cap} ${h}`,left=`M${cap} 0 Q0 0 0 ${radius} L0 ${h-radius} Q0 ${h} ${cap} ${h}`;
      return {tag:'path',props:{d:type==='RIGHT_BRACKET'?right:type==='LEFT_BRACKET'?left:left+' '+right,fill:'none'}};
    }
    if(['RIGHT_ARROW','STRIPED_RIGHT_ARROW','NOTCHED_RIGHT_ARROW'].includes(type)){
      const head=1-Math.min(w,h)/(2*(w||1)),tail=type==='STRIPED_RIGHT_ARROW'?.065:0;
      const shape=polygon([[tail,.25],[head,.25],[head,0],[1,.5],[head,1],[head,.75],[tail,.75],...(type==='NOTCHED_RIGHT_ARROW'?[[.15,.5]]:[])]);
      if(type!=='STRIPED_RIGHT_ARROW')return shape;
      return {tag:'path',props:{d:`M${shape.props.points.replaceAll(' ',' L')} Z M0 ${h*.25} H${w*.015} V${h*.75} H0 Z M${w*.03} ${h*.25} H${w*.05} V${h*.75} H${w*.03} Z`}};
    }
    const polygons={TRIANGLE:[[.5,0],[1,1],[0,1]],RIGHT_TRIANGLE:[[0,0],[1,1],[0,1]],DIAMOND:[[.5,0],[1,.5],[.5,1],[0,.5]],PARALLELOGRAM:[[.2,0],[1,0],[.8,1],[0,1]],TRAPEZOID:[[.2,0],[.8,0],[1,1],[0,1]],HEXAGON:[[.25,0],[.75,0],[1,.5],[.75,1],[.25,1],[0,.5]],PENTAGON:[[.5,0],[1,.38],[.81,1],[.19,1],[0,.38]],RIGHT_ARROW:[[0,.25],[.65,.25],[.65,0],[1,.5],[.65,1],[.65,.75],[0,.75]],LEFT_ARROW:[[0,.5],[.35,0],[.35,.25],[1,.25],[1,.75],[.35,.75],[.35,1]],CHEVRON:[[0,0],[.65,0],[1,.5],[.65,1],[0,1],[.35,.5]]};
    if(polygons[type])return polygon(polygons[type]);
    if(type==='STAR_5')return polygon(Array.from({length:10},(_,i)=>{const angle=-Math.PI/2+i*Math.PI/5,r=i%2?.2:.5;return [.5+Math.cos(angle)*r,.5+Math.sin(angle)*r];}));
    return null;
  }
}
