import {cellNeighbours,cellVec} from '../core/grid.js';
import {state,queueWalk,stepTo} from '../core/state.js';
export function createNavigation({project,onArrive,onMessage=()=>{}}) {
  let topology='',drawn=[],adjacency=new Map();
  function refresh() {
    const cells=[];state.cells.forEach((t,c)=>{if(t)cells.push(c);});
    const signature=cells.join(',');
    if(signature!==topology){topology=signature;drawn=cells;adjacency.clear();}
  }
  function neighbours(c) {
    if(!adjacency.has(c)) {
      const visible=new Set(drawn);adjacency.set(c,cellNeighbours(c).filter(d=>visible.has(d)));
    }
    return adjacency.get(c);
  }
  function step(to) {
    const pa=project(cellVec(state.here)),pb=project(cellVec(to));
    const facing=pa&&pb&&Math.abs(pb.x-pa.x)>.5?(pb.x>pa.x?1:-1):state.facing;
    if(stepTo(to,facing))onArrive();
  }
  function walkTo(c) {
    if(state.busy||state.here<0)return false;
    if(c===state.here){queueWalk([]);return true;}
    if(c<0||!state.cells[c]){onMessage('밝혀진 길이나 건물을 클릭해 주세요.');return false;}
    refresh();
    const prev=new Map([[state.here,-1]]),queue=[state.here];
    for(let i=0;i<queue.length&&!prev.has(c);i++)for(const n of neighbours(queue[i])) {
      if(!prev.has(n)){prev.set(n,queue[i]);queue.push(n);}
    }
    if(!prev.has(c)){onMessage('현재 위치와 연결된 길을 선택해 주세요.');return false;}
    // Preserve the drawn route order when both endpoints belong to this journey.
    let best=null;
    state.route.forEach((a,i)=>{if(a===state.here)state.route.forEach((b,j)=>{
      if(b===c&&(!best||Math.abs(j-i)<best.length))best=i<j?state.route.slice(i+1,j+1):state.route.slice(j,i).reverse();
    });});
    const path=[];for(let k=c;k!==state.here;k=prev.get(k))path.push(k);
    queueWalk(best??path.reverse());onMessage('선택한 목적지로 이동합니다.');return true;
  }
  return {step,walkTo};
}
