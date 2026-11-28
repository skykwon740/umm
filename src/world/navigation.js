import {N,CELL_COUNT,cellNeighbours,cellVec,cellOf,slerp,nodeCell,DEG,RAD} from '../core/grid.js';
import {state,queueWalk,stepTo} from '../core/state.js';
import {focusCamera,resumeTracking} from './camera.js';
const STEP=Math.PI/2/N*.9;   // 이웃 칸 사이 각도(라디안)보다 조금 작게: 칸 수 어림용
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
// p에서 q 쪽으로 향하는, p 자리 접평면 위의 단위 방향
function tangent(p,q) {
  const d=dot(p,q),t=[q[0]-p[0]*d,q[1]-p[1]*d,q[2]-p[2]*d],m=Math.hypot(...t)||1;
  return [t[0]/m,t[1]/m,t[2]/m];
}
// cur에서 이웃 n으로 가는 방향과 목적지 방향의 코사인 (1이면 정면)
const alignment=(cur,n,to)=>{const p=cellVec(cur);return dot(tangent(p,cellVec(n)),tangent(p,cellVec(to)));};
// 목적지 쪽으로 가장 잘 맞는 이웃부터
const towards=(cur,to)=>cellNeighbours(cur).slice().sort((a,b)=>alignment(cur,b,to)-alignment(cur,a,to));
// prev → cur 로 온 걸음을 꺾지 않고 이어 가는 다음 칸(들어온 변의 맞은편). 오각형이라 맞은편이 없으면 -1
function straightNext(prev,cur) {
  const p=cellVec(cur),back=tangent(p,cellVec(prev));let best=-1,low=-.85;
  for(const n of cellNeighbours(cur)){const c=dot(tangent(p,cellVec(n)),back);if(c<low){low=c;best=n;}}
  return best;
}
// cur에서 first로 한 칸 간 뒤 같은 방향으로 곧게 이어 가는 칸들 (최대 max칸)
function ray(cur,first,max) {
  const cells=[first];let prev=cur,c=first;
  while(cells.length<max){const n=straightNext(prev,c);if(n<0)break;cells.push(n);prev=c;c=n;}
  return cells;
}
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
  // 육각형 줄을 따라 곧게 가다가 각지게 꺾는 길(사용자 요청 11/28: 대원을 따라 칸을 고르면 한 칸씩 지그재그로
  // 흔들려 정신없다). 육각 격자에서는 어느 곳이든 "한 방향으로 곧장 → 한 번 꺾어 곧장" 두 구간으로 닿는다.
  // 첫 구간 길이를 하나씩 늘려 보며 두 번째 구간이 목적지를 지나가는 가장 짧은 조합을 고른다.
  // 오각형 칸 근처처럼 두 구간으로 딱 맞지 않으면 갈 수 있는 만큼 곧게 간 뒤 그 자리에서 다시 고른다.
  function hexPath(from,to) {
    const out=[];let cur=from;
    for(let leg=0;leg<40&&cur!==to;leg++) {
      if(cellNeighbours(cur).includes(to)){out.push(to);cur=to;break;}
      const p=cellVec(cur),q=cellVec(to);
      if(dot(p,q)<-.999){const n=cellNeighbours(cur)[0];out.push(n);cur=n;continue;}   // 정반대편: 방향이 안 정해진다
      const max=Math.ceil(Math.acos(Math.max(-1,Math.min(1,dot(p,q))))/STEP*1.6)+3;
      const [d1,d2]=towards(cur,to);
      let best=null;
      for(const first of [d1,d2]) {
        const a=ray(cur,first,max);
        for(let k=0;k<a.length;k++) {
          if(a[k]===to){const path=a.slice(0,k+1);if(!best||path.length<best.length)best=path;break;}
          if(best&&k+1>=best.length)break;
          const b=ray(a[k],towards(a[k],to)[0],max),hit=b.indexOf(to);
          if(hit>=0){const path=[...a.slice(0,k+1),...b.slice(0,hit+1)];if(!best||path.length<best.length)best=path;}
        }
      }
      if(best){out.push(...best);cur=to;break;}
      // 딱 맞는 두 구간이 없다: 목적지가 앞에서 60° 안쪽에 있는 동안 곧게 가고, 거기서 다시 고른다
      let prev=cur,next=d1;out.push(next);
      for(let i=0;i<max&&next!==to;i++) {
        const ahead=straightNext(prev,next);
        if(ahead<0||alignment(next,ahead,to)<Math.cos(58*RAD))break;
        out.push(ahead);prev=next;next=ahead;
      }
      cur=next;
    }
    return cur===to?out:[...out,...straightPath(cur,to)];
  }
  function walkTo(c) {
    if(state.busy||state.here<0)return false;
    if(c===state.here){queueWalk([]);return true;}
    if(!Number.isInteger(c)||c<0||c>=CELL_COUNT||!state.cells[c])return false;
    const node=state.nodes.find(n=>nodeCell(n)===c),firstVisit=node&&!node.awakened;
    const path=(!firstVisit&&paintedPath(state.here,c))||hexPath(state.here,c);
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
