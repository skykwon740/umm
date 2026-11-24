import {CELL_COUNT,cellNeighbours,cellVec,nodeCell} from '../core/grid.js';
import {state,queueWalk,stepTo} from '../core/state.js';
import {focusCamera,resumeTracking} from './camera.js';
export function createNavigation({project,onArrive,onMessage=()=>{}}) {
  function step(to) {
    const pa=project(cellVec(state.here)),pb=project(cellVec(to));
    const facing=pa&&pb&&Math.abs(pb.x-pa.x)>.5?(pb.x>pa.x?1:-1):state.facing;
    if(stepTo(to,facing))onArrive();
  }
  // 빈 칸 한 칸은 칠해진 길 세 칸만큼 멀게 친다: 있는 길을 먼저 따라가고, 길이 없을 때만 빈 땅을 가로지른다
  const BLANK_COST=3;
  function route(from,to) {
    const dist=new Map([[from,0]]),prev=new Map([[from,-1]]),buckets=[[from]];
    for(let d=0;d<buckets.length;d++)for(const cell of buckets[d]??[]) {
      if(dist.get(cell)!==d)continue;
      if(cell===to){const path=[];for(let k=to;k!==from;k=prev.get(k))path.push(k);return path.reverse();}
      for(const n of cellNeighbours(cell)) {
        const next=d+(state.cells[n]?1:BLANK_COST);
        if(next<(dist.get(n)??Infinity)){dist.set(n,next);prev.set(n,cell);(buckets[next]??=[]).push(n);}
      }
    }
    return null;
  }
  // 목적지는 예전처럼 밝혀진 길이나 외계인 칸(떨어진 섬 포함). 가는 길의 빈 칸은 지나가며 칠한다.
  // 외계인에게 가는 길은 그 외계인의 루트 색으로, 그 밖의 곳은 지금 루트 색으로 처음 밟는 빈 칸을 칠한다.
  function walkTo(c) {
    if(state.busy||state.here<0)return false;
    if(c===state.here){queueWalk([]);return true;}
    if(!Number.isInteger(c)||c<0||c>=CELL_COUNT||!state.cells[c])return false;
    const path=route(state.here,c);
    if(!path)return false;
    const alien=state.nodes.some(n=>nodeCell(n)===c),roots=state.cellRootSets[c]??[];
    const root=alien?(roots.length?roots[0]:state.cellRoots[c]>=0?state.cellRoots[c]:state.activeRoot):state.activeRoot;
    queueWalk(path,root);
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
