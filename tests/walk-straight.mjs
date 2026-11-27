// 팀 피드백 11/27: 캐릭터가 그려진 길을 타고 가다 가지치기처럼 뻗어 나가지 않는다
import assert from 'node:assert/strict';
import {state,load,initializeWalker,nextWalkStep,awakenCurrentNode} from '../src/core/state.js';
import {CELL_COUNT,cellNeighbours,cellVec,cellOf,vec,slerp,nodeCell,ll,DEG,RAD} from '../src/core/grid.js';
import {resizeCamera} from '../src/world/camera.js';
import {createNavigation} from '../src/world/navigation.js';
import {createJourney} from '../src/journey.js';

const data=new Map();
globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
const reset=(save={})=>{data.set('webglobe3',JSON.stringify({c:'0'.repeat(CELL_COUNT),n:[],r:[],t:[],h:-1,g:[],...save}));load();};
const journey=createJourney({wiki:{search:async(_lang,q)=>q,describe:async()=>''},
  onStart(){},onChange(){},onFocus(){},onArrive(){},onMessage(){},onFinish(){}});
const navigation=createNavigation({project:()=>null,onArrive(){}});
const walkAll=()=>{while(state.walkPath.length)navigation.step(nextWalkStep());};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const checkSteps=(from,path,to)=>{
  assert.equal(path.at(-1),to,'the walk ends at the destination');
  [from,...path].reduce((a,b)=>{assert.ok(cellNeighbours(a).includes(b),'every step goes to a neighbour');return b;});
};
// 두 칸을 잇는 대원에서 한 칸 반(6°) 안에만 있으면 곧장 간 것이다
const assertStraight=(from,path,to,why)=>{
  checkSteps(from,path,to);
  const n=cross(cellVec(from),cellVec(to)),m=Math.hypot(...n);
  const off=Math.max(...path.map(c=>Math.asin(Math.abs(dot(cellVec(c),n))/m)*DEG));
  assert.ok(off<6,`${why}: the walk bends ${off.toFixed(1)}° away from the straight line`);
};

reset();resizeCamera(300,200);
await journey.run('농구','ko');initializeWalker();awakenCurrentNode(1);

// 1. 처음 만나러 가는 새 외계인: 옛길이 가까이 있어도 지금 자리에서 곧장 간다
for(const word of ['스포츠','올림픽','그리스','신화','제우스','번개','전기','에디슨','전구','유리','모래','사막']) {
  const from=state.here,node=await journey.extend(word,'ko',''),to=nodeCell(node);
  assert.equal(navigation.approach(node,true),true);
  assertStraight(from,state.walkPath,to,word);
  walkAll();awakenCurrentNode(1);   // 앱은 도착하면 정보창이 열리며 외계인이 깨어난다
}

// 2. 가 본 곳으로 돌아갈 때는 칠한 길 그대로 걷는다: 옆에 새 길이 생기지 않는다
const before=state.cells.slice();
for(const index of [0,5,2,state.nodes.length-1]) {
  const from=state.here,to=nodeCell(state.nodes[index]);
  assert.equal(navigation.walkTo(to),true);checkSteps(from,state.walkPath,to);
  assert.ok(state.walkPath.every(c=>state.cells[c]),'stays on the painted road');
  walkAll();
}
assert.deepEqual(state.cells,before,'Revisiting paints nothing new');

// 3. 길이 이어지지 않은 가 본 섬: 옆으로 뻗은 옛길이 있어도 지금 자리에서 곧장 간다
const at=(t,c)=>{const [lat,lon]=ll(cellVec(c));return {t,lang:'ko',lat,lon,awakened:true};};
const load2=(here,away,extra=[])=>{
  const cells=Array(CELL_COUNT).fill(0);extra.forEach(c=>{cells[c]=2;});cells[here]=4;cells[away]=4;
  reset({c:cells.join(''),n:[at('여기',here),at('저기',away)],r:[here,away],t:[0,1],h:here});initializeWalker();
};
const cellAt=(lat,lon)=>cellOf(...vec(lat,lon));
const home=cellAt(0,0),island=cellAt(0,90),side=cellAt(35,60);
const spur=Array.from({length:60},(_,s)=>cellOf(...slerp(cellVec(home),cellVec(side),s/100)));
load2(home,island,spur);
assert.equal(navigation.walkTo(island),true);
assertStraight(home,state.walkPath,island,'unconnected island');

// 4. 지구 정반대편(대원이 하나로 안 정해짐)까지도 한 칸씩 이어서 닿는다
const farFrom=c=>{let best=0;for(let k=1;k<CELL_COUNT;k++)if(dot(cellVec(k),cellVec(c))<dot(cellVec(best),cellVec(c)))best=k;return best;};
for(const here of [0,600,1200]) {
  const away=farFrom(here);
  assert.ok(dot(cellVec(here),cellVec(away))<Math.cos(179*RAD),'antipodal pair');
  load2(here,away);
  assert.equal(navigation.walkTo(away),true);checkSteps(here,state.walkPath,away);
  // 가장 짧은 칸 수는 48 이하. 선이 칸 모서리를 스치면 몇 칸 늘 수 있어 1.5배까지 본다
  assert.ok(state.walkPath.length<=72,'no wandering on the way to the far side');
}
console.log('PASS: first visits and unconnected islands are walked straight from the character, revisits stay on the painted road, antipodes are reachable.');
