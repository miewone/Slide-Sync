import {NativeSlidesAppearance as Appearance} from './NativeSlidesAppearance.js';

const positive=value=>Number.isFinite(value)&&value>0;
const offsets=values=>{const result=[0];for(const value of values)result.push(result.at(-1)+value);return result;};

/** Native table geometry, merged-cell occupancy and a separate inset text area. */
export class NativeSlidesTableLayout {
  /** @param {object} table Slides Table JSON. @param {number} width Table width in points. @param {number} height Table height in points. */
  constructor(table,width,height){
    this.table=table;const rows=table.tableRows||[];
    const count=table.columns||Math.max(1,...rows.map(row=>(row.tableCells||[]).reduce((n,cell)=>n+(cell.columnSpan||1),0)));
    const dimensions=(values,total)=>{const known=values.reduce((n,v)=>n+(positive(v)?v:0),0),missing=values.filter(v=>!positive(v)).length,fallback=missing?Math.max(0,total-known)/missing:0;return values.map(v=>positive(v)?v:fallback);};
    this.widths=dimensions(Array.from({length:count},(_,i)=>Appearance.points(table.tableColumns?.[i]?.columnWidth)),width);
    this.heights=dimensions(Array.from({length:table.rows||rows.length},(_,i)=>Appearance.points(rows[i]?.rowHeight)??Appearance.points(rows[i]?.tableRowProperties?.minRowHeight)),height);
    this.x=offsets(this.widths);this.y=offsets(this.heights);this.cells=[];this.owners=new Map();
    for(const [rowIndex,row] of rows.entries()){
      let cursor=0;
      for(const cell of row.tableCells||[]){
        const r=cell.location?.rowIndex??rowIndex,rs=cell.rowSpan??1,cs=cell.columnSpan??1;if(rs<=0||cs<=0)continue;
        while(this.owners.has(`${r}:${cursor}`))cursor++;
        const c=cell.location?(cell.location.columnIndex??0):cursor;
        if(r<0||c<0||r+rs>this.heights.length||c+cs>this.widths.length)continue;
        const key=`${r}:${c}`,box={x:this.x[c],y:this.y[r],width:this.x[c+cs]-this.x[c],height:this.y[r+rs]-this.y[r]};
        this.cells.push({key,cell,row:r,column:c,...box,textBox:NativeSlidesTableLayout.textBox(box,cell.tableCellProperties)});
        for(let y=r;y<r+rs;y++)for(let x=c;x<c+cs;x++)this.owners.set(`${y}:${x}`,key);
        cursor=c+cs;
      }
    }
  }
  /** @param {object} box Cell dimensions. @param {object} properties Optional explicit inset dimensions. Defaults use the shared preview text insets because Slides API omits custom cell padding. */
  static textBox(box,properties={}){
    const inset=(key,fallback)=>Math.max(0,Appearance.points(properties[key])??fallback);
    const left=inset('paddingLeft',7.2),right=inset('paddingRight',7.2),top=inset('paddingTop',3.6),bottom=inset('paddingBottom',3.6);
    return {x:left,y:top,width:Math.max(0,box.width-left-right),height:Math.max(0,box.height-top-bottom)};
  }
  /** Return each actual border segment once, using sparse locations and omitting merged interiors. */
  borders(){
    const result=[];
    for(const horizontal of [true,false])for(const [rowIndex,row] of (horizontal?this.table.horizontalBorderRows||[]:this.table.verticalBorderRows||[]).entries())for(const [columnIndex,cell] of (row.tableBorderCells||[]).entries()){
      const r=cell.location?.rowIndex??rowIndex,c=cell.location?(cell.location.columnIndex??0):columnIndex;
      if(r<0||c<0||r>=this.y.length||c>=this.x.length||(horizontal?c>=this.widths.length:r>=this.heights.length))continue;
      const before=this.owners.get(horizontal?`${r-1}:${c}`:`${r}:${c-1}`),after=this.owners.get(`${r}:${c}`);if(before&&before===after)continue;
      result.push({key:`${horizontal?'h':'v'}:${r}:${c}`,properties:cell.tableBorderProperties,x1:this.x[c],y1:this.y[r],x2:this.x[c+(horizontal?1:0)],y2:this.y[r+(horizontal?0:1)]});
    }
    return result;
  }
}
