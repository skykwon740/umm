import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {state,load,save,beginJourney,completeJourney,addJourneyNode,visitCurrent,queueWalk,nextWalkStep,
  stepTo,tickAnimation,initializeWalker,updateNodeDescription,ENTERED} from '../src/core/state.js';
import {CELL_COUNT,nodeCell,vec} from '../src/core/grid.js';
import {camera,resizeCamera,initializeCamera,focusCamera,rotateCamera,zoomCamera,tickCamera,walkRadius} from '../src/world/camera.js';
import {createJourney} from '../src/journey.js';
import {inspectArchitecture,readSources} from '../scripts/architecture-wiki.mjs';

const data=new Map();
globalThis.localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
function reset(){
  data.set('webglobe3',JSON.stringify({c:'0'.repeat(CELL_COUNT),n:[],r:[],t:[],h:-1,g:[]}));
  assert.equal(load(),true);
}
reset();
// These writes succeeded before this fix. Test nested writes and stale snapshots too.
assert.throws(()=>{state.here=12;},TypeError);
assert.throws(()=>{state.cells[0]=1;},TypeError);
assert.throws(()=>{state.guide.fill(1);},TypeError);
assert.throws(()=>{state.route.push(2);},TypeError);
beginJourney();const first=addJourneyNode('춤','ko','원래 설명');completeJourney();
const snapshot=state;
assert.throws(()=>{first.t='덮어쓰기';},TypeError);
assert.throws(()=>{state.nodes[0].d='덮어쓰기';},TypeError);
assert.throws(()=>{state.walker[0]=0;},TypeError);
assert.equal(visitCurrent(),true);assert.equal(visitCurrent(),false);
assert.equal(state.cells[nodeCell(first)],ENTERED);
assert.notEqual(snapshot.cells[nodeCell(first)],ENTERED);
updateNodeDescription(0,'새 설명');assert.equal(snapshot.nodes[0].d,'원래 설명');
const queue=[state.here];queueWalk(queue);queue.push(0);
assert.equal(state.walkPath.length,1);assert.equal(nextWalkStep(),state.here);assert.equal(nextWalkStep(),undefined);
save();const saved=data.get('webglobe3');beginJourney();assert.equal(state.here,-1);assert.equal(load(),true);
assert.equal(state.nodes[0].d,'새 설명');assert.equal(state.cells[state.here],ENTERED);
const restored=state;data.set('webglobe3',JSON.stringify({c:'9'.repeat(CELL_COUNT)}));
assert.equal(load(),false);assert.equal(state,restored);data.set('webglobe3',saved);
initializeWalker();stepTo(state.here,1,100);assert.equal(tickAnimation(250).canStep,true);
assert.equal(save({setItem(){throw new Error('quota');}}),false);

resizeCamera(300,200);initializeCamera(vec(20,0),false);
assert.throws(()=>{camera.tR=0;},TypeError);
const oldCamera=camera;rotateCamera(0,1e6);assert.equal(camera.lat,85);assert.equal(oldCamera.lat,20);
zoomCamera(-1e6);assert.equal(camera.tR,1400);zoomCamera(1e6);assert.equal(camera.tR,25);
initializeCamera(vec(0,-179),true);focusCamera({lat:0,lon:179},'walk');
assert.equal(camera.tR,walkRadius);const oldLon=camera.lon;assert.equal(tickCamera(),true);
assert.ok(Math.abs(camera.lon-oldLon)<1,'Camera takes the short path across the date line');

function controller(wiki) {
  let time=0;const events=[],messages=[],languages=[];
  const journey=createJourney({wiki:{...wiki,search(lang,q){languages.push(lang);return wiki.search(lang,q);}},
    onStart(){events.push('start');},onChange(){events.push(state.pending?'pending':'ready');},
    onFocus(point,mode){assert.ok(Number.isFinite(point.lat)&&Number.isFinite(point.lon));events.push(mode);},
    onArrive(){events.push('arrive');assert.equal(state.busy,false);},
    onMessage(message){messages.push(message);},onFinish(){events.push('finish');},
    now:()=>time,wait:async()=>{},requestFrame(callback){time+=5000;queueMicrotask(()=>callback(time));},
  });
  return {journey,events,messages,languages};
}
const wiki={search:async(_lang,q)=>q,describe:async(_lang,title)=>title+' 설명'};
const tripTitles=()=>state.trip.map(i=>state.nodes[i].t);
reset();const success=controller(wiki);
assert.equal(typeof globalThis.document,'undefined','Journey tests run without browser DOM');
// C 트랙: 관심사 → 첫 외계인 하나. 캐릭터는 그 앞에서 시작한다
await success.journey.run('춤');
assert.deepEqual(tripTitles(),['춤']);
assert.equal(state.here,nodeCell(state.nodes[0]));assert.equal(state.pending,false);assert.equal(state.revealing,false);
assert.equal(success.events.at(-1),'arrive');assert.deepEqual(success.messages,[]);assert.deepEqual(success.languages,['ko']);
// 가족을 고르면 지금 외계인에서 길이 이어지고, 캐릭터와 이전 경로는 그대로다
const start=state.here,routeBefore=state.route.slice();
const added=await success.journey.extend('민속무용','ko','민속무용 설명');
assert.equal(added.t,'민속무용');assert.deepEqual(tripTitles(),['춤','민속무용']);
assert.equal(state.here,start);assert.deepEqual(state.route.slice(0,routeBefore.length),routeBefore);
assert.ok(state.route.length>routeBefore.length+1,'The revealed road leads to the new alien');assert.equal(state.route.at(-1),nodeCell(added));
assert.equal(state.nodes.at(-1).d,'민속무용 설명');
assert.equal(state.busy,false);assert.equal(state.revealing,false);assert.equal(state.holding,false);assert.equal(state.upcoming,null);
assert.equal(success.events.at(-1),'arrive');
visitCurrent();await success.journey.run('민속무용','ko');
assert.deepEqual(tripTitles(),['민속무용']);
assert.equal(state.cells[nodeCell(state.nodes.find(n=>n.t==='춤'))],ENTERED,'Restart preserves earlier visits');
assert.throws(()=>state.nodes.push({}),TypeError);
reset();const idle=controller(wiki);
assert.equal(await idle.journey.extend('민속무용','ko'),null,'Extending needs an alien under the character');
assert.equal(state.busy,false);

reset();const missing=controller({...wiki,search:async()=>undefined});await missing.journey.run('없는문서');
assert.match(missing.messages[0],/찾지 못/);assert.equal(state.busy,false);assert.equal(missing.events.at(-1),'ready');
reset();let attempts=0;
const retry=controller({...wiki,search:async(_lang,q)=>{if(!attempts++)throw new Error('offline');return q;}});
await retry.journey.run('astronomy');assert.match(retry.messages[0],/연결/);assert.equal(state.busy,false);
await retry.journey.run('astronomy');assert.equal(state.nodes[0].t,'astronomy');assert.deepEqual(retry.languages,['en','en']);
reset();const partial=controller({...wiki,describe:async()=>{throw new Error('connection lost');}});
await partial.journey.run('춤');assert.match(partial.messages[0],/연결/);assert.equal(state.trip.length,0);assert.equal(state.busy,false);
reset();let resolveSearch,searches=0;
const concurrent=controller({...wiki,search:()=>{searches++;return new Promise(resolve=>{resolveSearch=resolve;});}});
const running=concurrent.journey.run('춤');await concurrent.journey.run('여행');assert.equal(searches,1);
assert.equal(await concurrent.journey.extend('여행','ko'),null,'No extension while a search is running');
resolveSearch('춤');await running;assert.equal(state.busy,false);

const root=fileURLToPath(new URL('../src/',import.meta.url));
const sources=await readSources(root);inspectArchitecture(sources);
const wrongLayer=new Map(sources);wrongLayer.set('journey.js',"import {hideResults} from './ui/results.js';");
assert.throws(()=>inspectArchitecture(wrongLayer),/forbidden dependency/);
const domLeak=new Map(sources);domLeak.set('journey.js','document.getElementById("goBtn");');
assert.throws(()=>inspectArchitecture(domLeak),/cannot access the DOM/);
assert.throws(()=>inspectArchitecture(new Map([
  ['world/a.js',"import './b.js';"],['world/b.js',"import './a.js';"],
])),/Circular dependency/);
console.log('PASS: deeply immutable state/camera, owned actions, DOM-free journey first alien/family extension/restart/failure/retry/concurrency, forbidden imports and cycle guards.');
