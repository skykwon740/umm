import {CELL_COUNT,cellNeighbours,cellVec,cellOf,slerp,nodeCell,DEG} from '../core/grid.js';
import {state,queueWalk,stepTo} from '../core/state.js';
import {focusCamera,resumeTracking} from './camera.js';
export function createNavigation({project,onArrive,onMessage=()=>{}}) {
  function step(to) {
    const pa=project(cellVec(state.here)),pb=project(cellVec(to));
    const facing=pa&&pb&&Math.abs(pb.x-pa.x)>.5?(pb.x>pa.x?1:-1):state.facing;
    if(stepTo(to,facing))onArrive();
  }
  // 칠해진 칸만 밟는 가장 짧은 길. 이어져 있지 않으면 null
  function paintedPath(from,to) {
    const prev=new Map([[from,-1]]),queue=[from];
    for(let i=0;i<queue.length&&!prev.has(to);i++)for(const n of cellNeighbours(queue[i])) {
      if(state.cells[n]&&!prev.has(n)){prev.set(n,queue[i]);queue.push(n);}
    }
    if(!prev.has(to))return null;
    const path=[];for(let k=to;k!==from;k=prev.get(k))path.push(k);
    return path.reverse();
  }
  // 두 칸을 잇는 대원을 따라 곧장 가는 칸들. 칠해진 길이 있는지는 보지 않는다.
  function straightPath(from,to) {
    const a=cellVec(from),b=cellVec(to),cos=a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    // 정반대 칸은 대원이 하나로 정해지지 않는다: 이웃 한 칸을 먼저 밟는다
    if(cos<-.999){const n=cellNeighbours(from)[0];return [n,...straightPath(n,to)];}
    const samples=Math.ceil(Math.acos(Math.min(1,cos))*DEG*4),path=[];
    for(let s=1,last=from;s<=samples;s++) {
      const cell=cellOf(...slerp(a,b,s/samples));
      if(cell!==last)path.push(last=cell);
    }
    return path;
  }
  // 목적지는 예전처럼 밝혀진 길이나 외계인 칸(떨어진 섬 포함). 가는 길의 빈 칸은 지나가며 칠한다.
  // 처음 만나러 가는 외계인과 길이 이어지지 않은 곳은 지금 자리에서 곧장 간다(옛길을 타다가 가지 치지 않게: 팀 피드백 11/27).
  // 가 본 곳은 칠한 길 그대로 걷는다(옆에 평행한 새 길이 생기지 않게).
  // 외계인에게 가는 길은 그 외계인의 루트 색으로, 그 밖의 곳은 지금 루트 색으로 처음 밟는 빈 칸을 칠한다.
  function walkTo(c) {
    if(state.busy||state.here<0)return false;
    if(c===state.here){queueWalk([]);return true;}
    if(!Number.isInteger(c)||c<0||c>=CELL_COUNT||!state.cells[c])return false;
    const node=state.nodes.find(n=>nodeCell(n)===c),firstVisit=node&&!node.awakened;
    const path=(!firstVisit&&paintedPath(state.here,c))||straightPath(state.here,c);
    const alien=Boolean(node),roots=state.cellRootSets[c]??[];
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
