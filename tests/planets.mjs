// 행성계: 행성별 저장·계급, 튜토리얼은 하나, 잠금 해제(앞 행성 '행성의 지배자'), 홈화면 행성 무늬 읽기
import assert from 'node:assert/strict';
import {PLANETS,setPlanet,currentPlanet,nextPlanet,storageKey,isUnlocked,metOn,UNLOCK_NEED} from '../src/core/planets.js';
import {state,load,save,beginJourney,addJourneyNode,completeJourney,stepTo,ROAD} from '../src/core/state.js';
import {loadProgress,progress,markMet,setTutorialDone} from '../src/core/progress.js';
import {loadInterests,saveInterest,getInterest} from '../src/core/interests.js';
import {readPlanetMap} from '../src/core/planet-map.js';
import {RANKS} from '../src/core/ranks.js';
import {CELL_COUNT,cellNeighbours} from '../src/core/grid.js';

const data=new Map();
const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
globalThis.localStorage=storage;

// 행성 3개, 1번은 예전 키를 그대로 쓴다 (이미 하던 탐험이 1번 행성)
assert.deepEqual(PLANETS.map(p=>p.id),[1,2,3]);
assert.equal(currentPlanet().id,1);
assert.equal(storageKey('webglobe3'),'webglobe3');assert.equal(storageKey('umm.mission',2),'umm.mission@2');
assert.equal(setPlanet(9),false);assert.equal(currentPlanet().id,1);
assert.equal(nextPlanet(1).id,2);assert.equal(nextPlanet(3),null);
assert.equal(new Set(PLANETS.map(p=>p.ground.join())).size,3,'Each planet has its own ground colour');

// 잠금: 1번은 늘 열림, 2번은 1번에서 행성의 지배자(최고 계급 필요 수)가 되면 열림, 3번은 2번 기준
assert.equal(UNLOCK_NEED,RANKS.at(-1).need);assert.equal(UNLOCK_NEED,25);
assert.equal(isUnlocked(storage,1),true);assert.equal(isUnlocked(storage,2),false);assert.equal(isUnlocked(storage,3),false);
loadProgress(storage);
for(let i=0;i<UNLOCK_NEED-1;i++)markMet('단어'+i,'ko');
assert.equal(isUnlocked(storage,2),false,'24 aliens are not enough');
markMet('단어'+(UNLOCK_NEED-1),'ko');
assert.equal(metOn(storage,1),UNLOCK_NEED);assert.equal(isUnlocked(storage,2),true);assert.equal(isUnlocked(storage,3),false);
data.set('umm.mission','{broken');assert.equal(metOn(storage,1),0);assert.equal(isUnlocked(storage,2),false,'A broken save unlocks nothing');
data.delete('umm.mission');

// 진행도는 행성마다 따로, 튜토리얼 완료는 하나
loadProgress(storage);markMet('농구','ko');setTutorialDone();
assert.deepEqual(JSON.parse(data.get('umm.mission')).met,['ko:농구']);
setPlanet(2);loadProgress(storage);
assert.equal(progress().met,0,'A new planet starts at 0 aliens (rank per planet)');
assert.equal(progress().tutorial,true,'The tutorial is not repeated on a new planet');
markMet('우주','ko');markMet('농구','ko');
assert.deepEqual(JSON.parse(data.get('umm.mission@2')).met,['ko:우주','ko:농구']);
assert.deepEqual(JSON.parse(data.get('umm.mission')).met,['ko:농구'],'Planet 1 progress untouched');
setTutorialDone(false);assert.equal(JSON.parse(data.get('umm.mission')).tutorial,false,'Replaying the tutorial anywhere resets the one flag');
setTutorialDone(true);
setPlanet(1);loadProgress(storage);assert.equal(progress().met,1);assert.equal(progress().tutorial,true);

// 관심·메모도 행성마다 따로 (1번은 원래 키)
loadInterests(storage);saveInterest({t:'농구',lang:'ko'},{heart:true,memo:'1번 메모'});
setPlanet(2);loadInterests(storage);
assert.deepEqual(getInterest({t:'농구',lang:'ko'}),{heart:false,memo:''});
saveInterest({t:'농구',lang:'ko'},{memo:'2번 메모'});
assert.equal(JSON.parse(data.get('webglobe-interests-v1'))[JSON.stringify(['ko','농구'])].memo,'1번 메모');
assert.equal(JSON.parse(data.get('webglobe-interests-v1@2'))[JSON.stringify(['ko','농구'])].memo,'2번 메모');

// 지구본 저장도 행성마다 따로. 2번 행성 저장이 1번을 덮지 않는다
setPlanet(1);
data.set('webglobe3',JSON.stringify({c:'0'.repeat(CELL_COUNT),n:[],r:[],t:[],h:-1,g:[]}));
assert.equal(load(),true);
const one=data.get('webglobe3');
setPlanet(2);assert.equal(load(),false,'Planet 2 has no save yet');
beginJourney('우주');addJourneyNode('우주','ko','');completeJourney();
const start=state.here,next=cellNeighbours(start)[0];stepTo(next);
assert.equal(save(),true);
assert.equal(data.get('webglobe3'),one,'Planet 1 globe untouched');
assert.ok(data.get('webglobe3@2'));

// 홈화면 무늬: 2번 행성의 칠해진 칸과 루트 색, 캐릭터 위치. 1번(빈 행성)은 무늬 없음
const map=readPlanetMap(storage,2);
assert.ok(map.paint.size>=2);assert.equal(map.here,next);
assert.equal(map.paint.get(start),state.journeys[0].color);
assert.ok([...map.paint.keys()].every(c=>state.cells[c]>=1&&state.cells[c]!==5&&state.cells[c]!==6));
assert.equal(state.cells[next]>=ROAD,true);
assert.equal(readPlanetMap(storage,1).paint.size,0);
assert.equal(readPlanetMap(storage,3).paint.size,0,'No save → empty map');
data.set('webglobe3@3','{broken');assert.equal(readPlanetMap(storage,3).here,-1);
console.log('PASS: 3 planets (planet 1 keeps old saves), unlock at the previous planet\'s top rank, per-planet progress/interests/globe saves, one tutorial flag, home planet pattern read-only.');
