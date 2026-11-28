// 사용자 요청 11/28: 다른 루트의 이미 만난 외계인을 고르면 길을 잇지 않고 그 자리로 순간이동한다.
// 같은 루트의 외계인이나 빈 땅은 예전처럼 걸어간다.
import assert from 'node:assert/strict';
import {state,load,nextWalkStep,awakenCurrentNode} from '../src/core/state.js';
import {CELL_COUNT,nodeCell,cellVec} from '../src/core/grid.js';
import {resizeCamera} from '../src/world/camera.js';
import {createNavigation} from '../src/world/navigation.js';
import {createJourney} from '../src/journey.js';

const data=new Map();
globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
data.set('webglobe3',JSON.stringify({c:'0'.repeat(CELL_COUNT),n:[],r:[],t:[],h:-1,g:[]}));load();resizeCamera(300,200);
const journey=createJourney({wiki:{search:async(_lang,q)=>q,describe:async()=>''},
  onStart(){},onChange(){},onFocus(){},onArrive(){},onMessage(){},onFinish(){}});
let arrivals=0;
const navigation=createNavigation({project:()=>null,onArrive(){arrivals++;}});
const walkAll=()=>{while(state.walkPath.length)navigation.step(nextWalkStep());awakenCurrentNode();};
const cellOfWord=t=>nodeCell(state.nodes.find(n=>n.t===t));

await journey.run('고양이','ko');awakenCurrentNode();
navigation.walkTo(nodeCell(await journey.extend('사자','ko')));walkAll();
await journey.run('바다','ko');awakenCurrentNode();
navigation.walkTo(nodeCell(await journey.extend('파도','ko')));walkAll();
assert.equal(state.here,cellOfWord('파도'));assert.equal(state.activeRoot,1);

// 2번 루트의 파도에서 1번 루트의 사자를 고른다: 순간이동, 칠해지는 칸 없음
const before=state.cells.slice(),beforeRoots=state.cellRootSets.map(r=>r.join());arrivals=0;
assert.equal(navigation.walkTo(cellOfWord('사자')),true);
assert.equal(state.here,cellOfWord('사자'),'lands on the chosen alien');
assert.deepEqual(state.walkPath,[],'no walk is queued');
assert.deepEqual(state.walker,cellVec(cellOfWord('사자')),'the character is placed there at once');
assert.deepEqual(state.cells,before,'no road is drawn between the routes');
assert.deepEqual(state.cellRootSets.map(r=>r.join()),beforeRoots,'no cell changes colour');
assert.equal(state.activeRoot,0,'now on route 1');assert.equal(arrivals,1,'arrival runs once (info window opens)');

// 같은 루트(1번)의 고양이는 칠한 길을 따라 걸어간다
assert.equal(navigation.walkTo(cellOfWord('고양이')),true);
assert.ok(state.walkPath.length>0,'same route: walks');assert.ok(state.walkPath.every(c=>state.cells[c]),'on the painted road');
walkAll();assert.equal(state.here,cellOfWord('고양이'));

// 순간이동한 뒤 고른 가족은 1번 루트에 붙는다
navigation.walkTo(cellOfWord('사자'));walkAll();
const tiger=await journey.extend('호랑이','ko');
assert.deepEqual(state.journeys[0].trip.map(i=>state.nodes[i].t),['고양이','사자','호랑이']);
assert.deepEqual(state.journeys[1].trip.map(i=>state.nodes[i].t),['바다','파도']);
navigation.walkTo(nodeCell(tiger));assert.ok(state.walkPath.length>0,'a new alien is walked to, not jumped to');walkAll();

// 다시 2번 루트의 바다로: 순간이동
assert.equal(navigation.walkTo(cellOfWord('바다')),true);
assert.equal(state.here,cellOfWord('바다'));assert.deepEqual(state.walkPath,[]);assert.equal(state.activeRoot,1);
console.log('PASS other-route aliens are reached by teleport, same-route aliens are walked to');
