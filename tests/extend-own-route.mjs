// 사용자 제보 11/28: 1·2번 루트가 있을 때 1번 루트의 외계인에게 돌아가 가족을 고르면,
// 새 외계인은 2번(가장 최근) 루트가 아니라 1번 루트에 이어지고 1번 루트 색으로 칠해진다.
import assert from 'node:assert/strict';
import {state,load,nextWalkStep,awakenCurrentNode} from '../src/core/state.js';
import {CELL_COUNT,nodeCell} from '../src/core/grid.js';
import {resizeCamera} from '../src/world/camera.js';
import {createNavigation} from '../src/world/navigation.js';
import {createJourney} from '../src/journey.js';

const data=new Map();
globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
data.set('webglobe3',JSON.stringify({c:'0'.repeat(CELL_COUNT),n:[],r:[],t:[],h:-1,g:[]}));load();resizeCamera(300,200);
const journey=createJourney({wiki:{search:async(_lang,q)=>q,describe:async()=>''},
  onStart(){},onChange(){},onFocus(){},onArrive(){},onMessage(){},onFinish(){}});
const navigation=createNavigation({project:()=>null,onArrive(){}});
const walkTo=node=>{navigation.walkTo(nodeCell(node));while(state.walkPath.length)navigation.step(nextWalkStep());awakenCurrentNode();};
const indexOf=t=>state.nodes.findIndex(n=>n.t===t);

await journey.run('고양이','ko');awakenCurrentNode();            // 1번 루트
const lion=await journey.extend('사자','ko');walkTo(lion);
await journey.run('바다','ko');awakenCurrentNode();              // 2번 루트
assert.equal(state.journeys.length,2);assert.equal(state.activeRoot,1);

walkTo(state.nodes[indexOf('사자')]);                             // 1번 루트의 사자에게 돌아간다
const tiger=await journey.extend('호랑이','ko');
assert.ok(tiger,'the family word is placed');
assert.deepEqual(state.journeys[0].trip.map(i=>state.nodes[i].t),['고양이','사자','호랑이'],'joins route 1');
assert.deepEqual(state.journeys[1].trip.map(i=>state.nodes[i].t),['바다'],'route 2 is untouched');
assert.deepEqual(state.cellRootSets[nodeCell(tiger)],[0],'the new alien takes route 1 colour');
walkTo(tiger);
const painted=new Set(state.cellRootSets.flat());
assert.ok(painted.has(0)&&painted.has(1));

// 2번 루트로 돌아가 고르면 다시 2번 루트에 붙는다
walkTo(state.nodes[indexOf('바다')]);
await journey.extend('파도','ko');
assert.deepEqual(state.journeys[1].trip.map(i=>state.nodes[i].t),['바다','파도'],'back on route 2 the word joins route 2');
assert.equal(state.journeys[0].trip.length,3);
console.log('PASS a family word joins the route of the alien it was picked from');
