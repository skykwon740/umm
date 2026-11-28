// 팀 피드백 11/27: 캐릭터가 그려진 길을 타고 가다 가지치기처럼 뻗어 나가지 않는다
// 사용자 요청 11/28: 새 길은 육각형 줄을 따라 곧게, 꺾을 때는 각지게 (한 칸씩 지그재그로 흔들리지 않게)
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
const checkSteps=(from,path,to)=>{
  assert.equal(path.at(-1),to,'the walk ends at the destination');
  [from,...path].reduce((a,b)=>{assert.ok(cellNeighbours(a).includes(b),'every step goes to a neighbour');return b;});
};
// 곧장 간다 = 육각형 줄을 따라 곧게 가고 많아야 두 번 꺾는다(사용자 요청 11/28: 한 칸씩 지그재그 금지),
// 그리고 가장 짧은 칸 수보다 2칸 넘게 돌아가지 않는다(옛길을 타고 가지 치지 않음: 팀 피드백 11/27)
const tangent=(p,q)=>{const d=dot(p,q),t=[q[0]-p[0]*d,q[1]-p[1]*d,q[2]-p[2]*d],m=Math.hypot(...t);return t.map(v=>v/m);};
const turnsOf=cells=>{let t=0;for(let i=2;i<cells.length;i++){const b=cellVec(cells[i-1]);
  if(dot(tangent(b,cellVec(cells[i])),tangent(b,cellVec(cells[i-2])))>-.85)t++;}return t;};
const hops=(a,b)=>{const d=new Map([[a,0]]),q=[a];for(let i=0;i<q.length&&!d.has(b);i++)for(const n of cellNeighbours(q[i]))if(!d.has(n)){d.set(n,d.get(q[i])+1);q.push(n);}return d.get(b);};
const assertStraight=(from,path,to,why)=>{
  checkSteps(from,path,to);
  const turns=turnsOf([from,...path]);
  assert.ok(turns<=2,`${why}: the walk turns ${turns} times (zigzag)`);
  assert.ok(path.length<=hops(from,to)+2,`${why}: ${path.length} steps where ${hops(from,to)} would do`);
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

// 2-1. 새 색 루트: 새 외계인은 옛길 칸에 놓이지 않고, 새로 칠하는 칸은 모두 자기 루트 색이다(옛 색에 가려지지 않게)
reset();
for(const [start,words] of [['농구',['스포츠','올림픽','그리스','신화','제우스','번개','전기','에디슨']],
  ['고양이',['사자','아프리카','사하라','오아시스','대추야자','설탕','사탕수수','브라질']],
  ['음악',['악기','피아노','쇼팽','폴란드','바르샤바','비스와강','발트해','바이킹']]]) {
  let roads=state.cells.slice();
  await journey.run(start,'ko');initializeWalker();awakenCurrentNode(1);
  const root=state.activeRoot;
  assert.equal(roads[state.here],0,`${start}: the first alien stands on blank ground`);
  for(const word of words) {
    roads=state.cells.slice();
    const node=await journey.extend(word,'ko','');
    assert.equal(roads[nodeCell(node)],0,`${word}: a new alien is not placed on an old road`);
    navigation.approach(node,true);const path=state.walkPath.slice();walkAll();awakenCurrentNode(1);
    for(const c of path.filter(c=>!roads[c]))assert.equal(state.cellRootSets[c][0],root,`${word}: new ground takes the new route colour`);
  }
}

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
console.log('PASS: first visits and unconnected islands are walked along hex rows with at most two turns, revisits stay on the painted road, antipodes are reachable.');
