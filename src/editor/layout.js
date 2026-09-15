import {selectedInSlide,visualBounds,commitPositions} from './core.js';

export function constrainDrag(dx,dy,shift){
  if(!shift)return {dx,dy,axis:null};
  return Math.abs(dx)>=Math.abs(dy)?{dx,dy:0,axis:'x'}:{dx:0,dy,axis:'y'};
}

export function layoutPlans(deck,selection,action,target='selection'){
  if(!['left','center','right','top','middle','bottom','horizontal','vertical'].includes(action)||!['selection','slide'].includes(target))throw Error('정렬 방식을 선택하세요.');
  const plans=[],distribute=['horizontal','vertical'].includes(action);
  for(const [index,ids]of selection){
    const elements=selectedInSlide(deck.slides[index],ids);
    if(elements.length<(distribute?3:target==='slide'?1:2))continue;
    const bounds=target==='slide'?{x:0,y:0,w:deck.width,h:deck.height}:visualBounds(elements);
    const items=elements.map(e=>({e,b:visualBounds([e])}));
    if(distribute){
      const axis=action==='horizontal'?'x':'y',size=axis==='x'?'w':'h';
      items.sort((a,b)=>a.b[axis]-b.b[axis]||a.e.index-b.e.index);
      // Preserve the two outside objects; equalize the actual edge-to-edge gaps.
      const first=items[0],last=items.at(-1),start=first.b[axis],end=last.b[axis]+last.b[size];
      const gap=(end-start-items.reduce((sum,item)=>sum+item.b[size],0))/(items.length-1);
      let cursor=start;
      for(const {e,b}of items){plans.push({index,id:e.id,x:e.g.x+(axis==='x'?cursor-b.x:0),y:e.g.y+(axis==='y'?cursor-b.y:0)});cursor+=b[size]+gap;}
    }else{
      for(const {e,b}of items){
        const dx=action==='left'?bounds.x-b.x:action==='center'?bounds.x+bounds.w/2-b.x-b.w/2:action==='right'?bounds.x+bounds.w-b.x-b.w:0;
        const dy=action==='top'?bounds.y-b.y:action==='middle'?bounds.y+bounds.h/2-b.y-b.h/2:action==='bottom'?bounds.y+bounds.h-b.y-b.h:0;
        plans.push({index,id:e.id,x:e.g.x+dx,y:e.g.y+dy});
      }
    }
  }
  return plans;
}

export function alignSelected(deck,selection,action,target){return commitPositions(deck,layoutPlans(deck,selection,action,target));}
