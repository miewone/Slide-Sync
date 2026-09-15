/** Map the source image through the native crop window without changing its container geometry. */
export class NativeImageGeometry {
  /** @param {number} width Container width. @param {number} height Container height. @param {object} crop Native fractional crop offsets and angle in radians. @param {object} natural Decoded image width/height. */
  static layout(width,height,crop={},natural={}){
    const sw=natural.width||width,sh=natural.height||height,left=crop.leftOffset||0,right=crop.rightOffset||0,top=crop.topOffset||0,bottom=crop.bottomOffset||0,cw=1-left-right,ch=1-top-bottom,angle=crop.angle||0;
    if(![width,height,sw,sh,left,right,top,bottom,angle].every(Number.isFinite)||sw<=0||sh<=0||Math.abs(cw)<1e-6||Math.abs(ch)<1e-6)return {width:sw,height:sh,transform:`scale(${width/(sw||1)} ${height/(sh||1)})`};
    const sx=width/(cw*sw),sy=height/(ch*sh),cos=Math.cos(angle),sin=Math.sin(angle),cx=(left+cw/2)*sw,cy=(top+ch/2)*sh;
    const a=sx*cos,b=-sy*sin,c=sx*sin,d=sy*cos,e=width/2-a*cx-c*cy,f=height/2-b*cx-d*cy;
    return {width:sw,height:sh,transform:`matrix(${a} ${b} ${c} ${d} ${e} ${f})`};
  }
}
