import {CELL_COUNT,cellNeighbours,cellVec,nodeCell} from '../core/grid.js';
import {state,queueWalk,stepTo} from '../core/state.js';
import {focusCamera,resumeTracking} from './camera.js';
export function createNavigation({project,onArrive,onMessage=()=>{}}) {
  function step(to) {
    const pa=project(cellVec(state.here)),pb=project(cellVec(to));
    const facing=pa&&pb&&Math.abs(pb.x-pa.x)>.5?(pb.x>pa.x?1:-1):state.facing;
    if(stepTo(to,facing))onArrive();
  }
  // 행성의 모든 칸을 걸을 수 있다(최단 경로). 외계인에게 가는 길은 그 외계인의 루트 색으로,
  // 그 밖의 곳은 지금 루트 색으로 처음 밟는 빈 칸을 칠한다.
  function walkTo(c) {
    if(state.busy||state.here<0)return false;
    if(c===state.here){queueWalk([]);return true;}
    if(!Number.isInteger(c)||c<0||c>=CELL_COUNT){onMessage('밝혀진 길이나 건물을 클릭해 주세요.');return false;}
    const prev=new Map([[state.here,-1]]),queue=[state.here];
    for(let i=0;i<queue.length&&!prev.has(c);i++)for(const n of cellNeighbours(queue[i])) {
      if(!prev.has(n)){prev.set(n,queue[i]);queue.push(n);}
    }
    if(!prev.has(c))return false;
    const path=[];for(let k=c;k!==state.here;k=prev.get(k))path.push(k);
    const alien=state.nodes.some(n=>nodeCell(n)===c),roots=state.cellRootSets[c]??[];
    const root=alien?(roots.length?roots[0]:state.cellRoots[c]>=0?state.cellRoots[c]:state.activeRoot):state.activeRoot;
    queueWalk(path.reverse(),root);onMessage('선택한 목적지로 이동합니다.');
    // 걷기가 시작되면 늘 카메라가 캐릭터를 가운데에 두고 따라간다(드래그로 끊었어도). 도착하면 그 자리에 멈춘다.
    if(state.walker)resumeTracking(state.walker);
    return true;
  }
  // 가족으로 새 외계인이 놓였을 때: 자동 이동이면 바로 걸어가고,
  // 아니면 그 외계인을 화면 가운데에 두고 카메라를 고정한다(클릭하면 걸어감).
  function approach(node,autoMove) {
    if(autoMove)return walkTo(nodeCell(node));
    focusCamera(node,'lock');return false;
  }
  return {step,walkTo,approach};
}
