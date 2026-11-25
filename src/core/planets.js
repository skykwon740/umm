// 행성계: 행성 목록, 지금 탐험 중인 행성, 행성별 저장 키, 잠금 해제 (팀 결정: 홈화면·잠금된 새로운 행성·행성마다 진행도).
// 1번 행성은 예전 저장 키를 그대로 쓴다 → 이미 하던 탐험이 그대로 1번 행성이 된다.
import {RANKS} from './ranks.js';

// ground = 아직 밝혀지지 않은 땅의 명암 4단계 (어두움 → 밝음). 1번은 원래 지구본 색
export const PLANETS=Object.freeze([
  {id:1,name:'1번 행성',ground:['#1c262e','#243039','#2c3a45','#354552']},
  {id:2,name:'2번 행성',ground:['#251c2b','#2f2338','#3a2b45','#463453']},
  {id:3,name:'3번 행성',ground:['#1f2a22','#27352b','#304034','#3a4c3e']},
].map(p=>Object.freeze({...p,ground:Object.freeze(p.ground)})));

let current=1;
export const planetById=id=>PLANETS.find(p=>p.id===id)??null;
export function setPlanet(id) { if(!planetById(id))return false; current=id; return true; }
export function currentPlanet() { return planetById(current); }
export const nextPlanet=(id=current)=>planetById(id+1);
// 행성마다 따로 저장한다. 1번 행성은 원래 키, 나머지는 '키@번호'
export function storageKey(base,id=current) { return id===1?base:`${base}@${id}`; }

// 앞 행성에서 최고 계급(행성의 지배자)이 되면 다음 행성이 열린다 (사용자 결정 2026-11-25)
export const UNLOCK_NEED=RANKS.at(-1).need;
// 그 행성에서 만난 외계인 수 (진행도 저장 'umm.mission'을 읽기만 한다)
export function metOn(storage,id) {
  try {
    const s=JSON.parse(storage?.getItem(storageKey('umm.mission',id)));
    return Array.isArray(s?.met)?new Set(s.met.filter(x=>typeof x==='string')).size:0;
  } catch { return 0; }
}
export function isUnlocked(storage,id) {
  if(!planetById(id))return false;
  return id===1||metOn(storage,id-1)>=UNLOCK_NEED;
}
