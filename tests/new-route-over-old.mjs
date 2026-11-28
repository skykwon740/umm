// 사용자 요청 11/28: 새 루트가 다른 루트가 지나간 길 위를 또 지나가면 그 칸은 새 루트 색으로 그려진다.
// 칠해진 길을 따라 되돌아가는 걸음은 옛길 색을 바꾸지 않고, 외계인이 서 있는 칸도 덮지 않는다.
import assert from 'node:assert/strict';
import {state,load,nextWalkStep,awakenCurrentNode} from '../src/core/state.js';
import {CELL_COUNT,cellOf,cellVec,vec,ll,nodeCell,cellNeighbours} from '../src/core/grid.js';
import {resizeCamera} from '../src/world/camera.js';
import {createNavigation} from '../src/world/navigation.js';

const data=new Map();
globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
const navigation=createNavigation({project:()=>null,onArrive(){}});
const walkAll=()=>{while(state.walkPath.length)navigation.step(nextWalkStep());awakenCurrentNode();};
const at=(lat,lon)=>cellOf(...vec(lat,lon));
const node=(t,c,awakened)=>{const [lat,lon]=ll(cellVec(c));return {t,lang:'ko',lat,lon,awakened};};

// 1번 루트(0): 경도 20°를 따라 남북으로 그은 길. 2번 루트(1): 적도 위 (0,0)의 외계인, (0,40)에 아직 안 만난 외계인
const north=at(25,20),south=at(-25,20),home=at(0,0),away=at(0,40);
const line=[];for(let lat=25;lat>=-25;lat-=.5){const c=at(lat,20);if(line.at(-1)!==c)line.push(c);}
for(let i=1;i<line.length;i++)assert.ok(cellNeighbours(line[i-1]).includes(line[i]),'route 1 is one connected road');
const cells=Array(CELL_COUNT).fill(0),cs=Array.from({length:CELL_COUNT},()=>[]);
line.forEach(c=>{cells[c]=2;cs[c]=[0];});cells[north]=cells[south]=4;cells[home]=4;cells[away]=3;cs[home]=[1];cs[away]=[1];
data.set('webglobe3',JSON.stringify({c:cells.join(''),cs,cr:cs.map(r=>r[0]??-1),
  n:[node('북',north,true),node('남',south,true),node('여기',home,true),node('저기',away,false)],
  r:[home,away],t:[2,3],h:home,g:[],
  j:[{start:'북',color:'#ff9d42',trip:[0,1]},{start:'여기',color:'#56c7e8',trip:[2,3]}]}));
assert.equal(load(),true);resizeCamera(300,200);

// 2번 루트가 처음 만나러 가는 길에 1번 루트를 가로지른다
assert.equal(navigation.walkTo(away),true);
const path=state.walkPath.slice(),crossed=path.filter(c=>line.includes(c)&&c!==north&&c!==south);
assert.ok(crossed.length>0,'the walk crosses route 1');
walkAll();assert.equal(state.here,away);
for(const c of crossed) {
  assert.equal(state.cellRootSets[c][0],1,'a crossed cell is drawn in the new route colour');
  assert.ok(state.cellRootSets[c].includes(0),'route 1 still passed there');
  assert.equal(state.cellRoots[c],1);
}
for(const c of line.filter(c=>!path.includes(c)))assert.deepEqual(state.cellRootSets[c],[0],'the rest of route 1 keeps its colour');

// 1번 루트로 순간이동해서 칠해진 길을 따라 남북을 오간다: 가로지른 칸 색은 바뀌지 않는다
const snapshot=state.cellRootSets.map(r=>r.join());
navigation.walkTo(north);assert.equal(state.here,north,'teleported to route 1');
navigation.walkTo(south);assert.ok(state.walkPath.every(c=>state.cells[c]),'walks the painted road');walkAll();
assert.equal(state.here,south);
assert.deepEqual(state.cellRootSets.map(r=>r.join()),snapshot,'walking back along painted roads repaints nothing');
console.log('PASS a new route is drawn over the old roads it crosses; revisits keep the colours');
