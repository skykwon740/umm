// 알파 피드백 A 묶음(이동·길·카메라·사운드) 팀 결정 검사
import assert from 'node:assert/strict';
import {state,load,save,initializeWalker,nextWalkStep,tickAnimation,consumeRedraw,UNKNOWN,ROAD,PLAN,ENTERED} from '../src/core/state.js';
import {CELL_COUNT,cellNeighbours,nodeCell,ll} from '../src/core/grid.js';
import {camera,resizeCamera,initializeCamera,followWalker,rotateCamera,zoomCamera} from '../src/world/camera.js';
import {createNavigation} from '../src/world/navigation.js';
import {createJourney} from '../src/journey.js';

const data=new Map();
globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
const wiki={search:async(_lang,q)=>q,describe:async(_lang,title)=>title+' 설명'};
const events=[];
const journey=createJourney({wiki,onStart(){events.push('start');},onChange(){},onFocus(){},
  onArrive(){events.push('arrive');},onMessage(){},onFinish(){events.push('finish');}});
let arrivals=0;
const navigation=createNavigation({project:v=>({x:v[0]*100,y:-v[1]*100}),onArrive:()=>arrivals++});
const walkAll=()=>{while(state.walkPath.length)navigation.step(nextWalkStep());};
const rootsOf=root=>state.cellRootSets.flatMap((roots,c)=>roots.includes(root)?[c]:[]);
data.set('webglobe3',JSON.stringify({c:'0'.repeat(CELL_COUNT),n:[],r:[],t:[],h:-1,g:[]}));load();
resizeCamera(300,200);

// 결정 1·5: 가족을 고르면 새 외계인만 놓인다. 길을 미리 공개하거나 깜빡이는 칸이 없다.
await journey.run('춤','ko');initializeWalker();
const dance=state.nodes[0],danceCell=nodeCell(dance);
assert.deepEqual(rootsOf(0),[danceCell],'A new journey starts as a single alien');
events.length=0;
const folk=await journey.extend('민속무용','ko','설명');
assert.deepEqual(events,['start','finish','arrive'],'Family choice still sends journeyStart → journeyEnd');
assert.equal(state.guide.some(Boolean),false);assert.equal(state.cells.some(t=>t===PLAN),false);
assert.deepEqual(rootsOf(0).sort((x,y)=>x-y),[danceCell,nodeCell(folk)].sort((x,y)=>x-y));
// 깜빡임 타이머가 없다: 가만히 있으면 화면을 다시 그리지 않는다
consumeRedraw();for(let t=0;t<3000;t+=100)tickAnimation(10000+t);
assert.equal(consumeRedraw(),false,'Nothing blinks while idle');

// 결정 5: 자동 이동 켜짐 → 바로 걸어감, 칸마다 칠해짐. 도착하면 외계인 앞 '도착' 조건이 참이다.
assert.equal(navigation.approach(folk,true),true);
assert.equal(state.walkPath.at(-1),nodeCell(folk));
const path=state.walkPath.slice();
[danceCell,...path].reduce((from,to)=>{assert.ok(cellNeighbours(from).includes(to));return to;});
assert.ok(path.slice(0,-1).every(c=>state.cells[c]===UNKNOWN),'The road is blank until walked');
walkAll();
assert.ok(path.every(c=>state.cells[c]>=ROAD),'Walked cells are painted');
assert.ok(path.slice(0,-1).every(c=>state.cellRootSets[c][0]===0&&state.cellRoots[c]===0),'Painted with the route colour');
assert.ok(state.walkPath.length===0&&!state.busy&&state.here===nodeCell(folk),'Arrived at the alien');
assert.equal(path.length,arrivals,'onArrive runs on every step');

// 결정 3: 새 관심사는 이전 길과 이어지지 않은 섬으로 시작한다(예전처럼 자동 연결 칸이 생기지 않는다)
const before=state.cells.slice();
await journey.run('우주','ko');
assert.equal(state.activeRoot,1);
assert.deepEqual(rootsOf(1),[nodeCell(state.nodes.at(-1))],'Only the first alien belongs to the new route');
assert.deepEqual(state.cells.flatMap((t,c)=>t!==before[c]?[c]:[]).filter(c=>c!==nodeCell(state.nodes.at(-1))),[]);
// 저장을 다시 읽어도 섬을 이어 붙이지 않는다
const saved=data.get('webglobe3');load();assert.equal(data.get('webglobe3'),saved);assert.deepEqual(rootsOf(1),[nodeCell(state.nodes.at(-1))]);
initializeWalker();

// 결정 2: 빈 칸도 걸을 수 있다. 외계인이 목적지면 그 외계인 루트 색, 아니면 지금 루트 색. 칠해진 칸은 그대로.
const space=nodeCell(state.nodes.at(-1));
const blank=Array.from({length:CELL_COUNT},(_,c)=>c).find(c=>!state.cells[c]&&cellNeighbours(c).every(n=>!state.cells[n])&&cellNeighbours(space).every(n=>n!==c));
assert.equal(navigation.walkTo(blank),true);const toBlank=state.walkPath.slice();walkAll();
assert.ok(toBlank.every(c=>state.cellRootSets[c].includes(1)),'Blank destination → current route colour');
const painted=state.cellRootSets.slice();
assert.equal(navigation.walkTo(danceCell),true,'Another island is reachable');const toDance=state.walkPath.slice();walkAll();
assert.equal(state.here,danceCell);
toDance.forEach(c=>{
  if(painted[c].length)assert.deepEqual(state.cellRootSets[c],painted[c],'Already painted cells keep their colour');
  else assert.deepEqual(state.cellRootSets[c],[0],'Blank cells take the destination alien\'s route colour');
});
assert.equal(state.cells[danceCell]>=ROAD,true);

// 결정 5·6: 자동 이동 꺼짐 → 새 외계인을 가운데에 두고 고정. 클릭하면 걸어가며 다시 캐릭터를 추적한다.
zoomCamera(-300);const zoom=camera.tR;
assert.equal(navigation.approach(folk,false),false);assert.deepEqual(state.walkPath,[]);
assert.ok(Math.abs(camera.tLat-folk.lat)<1e-9&&Math.abs(camera.tLon-folk.lon)<1e-9,'Camera centres the new alien');
const locked=camera;followWalker(state.walker.map(x=>-x));assert.equal(camera,locked,'Camera stays fixed');
rotateCamera(30,0);   // 드래그로 추적을 끊어도
navigation.walkTo(nodeCell(folk));
const [lat,lon]=ll(state.walker);
assert.ok(Math.abs(camera.tLat-lat)<1e-9&&Math.abs(camera.tLon-lon)<1e-9,'A new walk re-centres the character');
const moving=camera;followWalker(state.walker.map(x=>-x));assert.notEqual(camera,moving,'The camera follows the walk');
assert.equal(camera.tR,zoom,'Zoom never changes by itself');
walkAll();

// 예전 저장에 남은 안내(PLAN·guide) 칸은 지우지 않는다
const a=600,b=cellNeighbours(a)[0],cells=Array(CELL_COUNT).fill(0);cells[a]=ENTERED;cells[b]=PLAN;
data.set('webglobe3',JSON.stringify({c:cells.join(''),n:[{t:'Old',lang:'en',lat:0,lon:0}],r:[a,b],t:[0],h:a,g:[b]}));load();
assert.equal(state.guide[b],1);assert.equal(state.cells[b],PLAN);save();
assert.deepEqual(JSON.parse(data.get('webglobe3')).g,[b]);

// 결정 9: 발걸음 소리는 간격을 제한하고, 끌 수 있다
const started=[];
globalThis.addEventListener=(type,fn)=>{if(type==='pointerdown')globalThis.unlockAudio=fn;};
const node=()=>({connect(next){return next;},start(t){started.push(t);},stop(){},frequency:{},Q:{},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},playbackRate:{}});
globalThis.AudioContext=class{constructor(){this.sampleRate=8000;this.currentTime=0;this.state='running';this.destination={};}
  createBuffer(_c,length){return {getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){return node();}createBiquadFilter(){return node();}createGain(){return node();}};
const {createFootsteps}=await import('../src/ui/sound.js');
const steps=createFootsteps();
assert.equal(steps.step(0),false,'Silent before the first user input');
globalThis.unlockAudio();
assert.equal(steps.step(1000),true);assert.equal(steps.step(1050),false,'Fast steps are rate limited');assert.equal(steps.step(1200),true);
steps.setEnabled(false);assert.equal(steps.step(2000),false);assert.equal(started.length,2);
console.log('PASS: family choice reveals no road and nothing blinks, auto-move walks and paints to the alien, new journeys stay islands, blank-cell shortest paths and colours, camera lock/re-track/zoom kept, old guide data kept, footstep throttle/toggle.');
