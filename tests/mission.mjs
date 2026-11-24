import assert from 'node:assert/strict';
import {RANKS,rankOf,gaugeSegments} from '../src/core/ranks.js';
import {loadProgress,progress,markMet,markWanderer,setTutorialDone} from '../src/core/progress.js';
import {loadInterests,saveInterest,listInterests} from '../src/core/interests.js';
import {on,emit,once} from '../src/core/events.js';

// ranks: ascending thresholds, boundaries, top rank
assert.equal(RANKS[0].need,0);
RANKS.forEach((r,i)=>i&&assert.ok(r.need>RANKS[i-1].need));
assert.equal(rankOf(0).rank.name,'견습 우주인');
assert.deepEqual(RANKS.map(r=>r.name),['견습 우주인','베테랑 탐사대원','가문 연결책','행성의 지배자']);
assert.deepEqual(RANKS.map(r=>r.need),[0,5,15,30]);
assert.equal(RANKS[1].line,'');
[[0,0],[4,0],[5,1],[14,1],[15,2],[29,2],[30,3],[31,3]].forEach(([n,i])=>assert.equal(rankOf(n).index,i,`rank at ${n}`));
assert.equal(rankOf(4).left,1);
assert.equal(rankOf(5).rank.name,'베테랑 탐사대원');
const top=rankOf(999);assert.equal(top.rank.name,'행성의 지배자');assert.equal(top.next,null);assert.equal(top.ratio,1);

// gauge: per-rank segments, widths follow thresholds, caps at 100%
assert.deepEqual(gaugeSegments(0).map(s=>[s.from,s.to,s.fill]),[[0,5,0],[5,15,0],[15,30,0]]);
assert.deepEqual(gaugeSegments(7).map(s=>s.fill),[1,0.2,0]);
assert.deepEqual(gaugeSegments(30).map(s=>s.fill),[1,1,1]);
assert.deepEqual(gaugeSegments(500).map(s=>s.fill),[1,1,1]);

// interests list: read-only, hearts or memos only, storage key/format unchanged
const imem=new Map(),istore={getItem:k=>imem.get(k)??null,setItem:(k,v)=>imem.set(k,v)};
loadInterests(istore);assert.deepEqual(listInterests(),[]);
saveInterest({t:'자동차',lang:'ko'},{heart:true},istore);
saveInterest({t:'Car',lang:'en'},{memo:'engine'},istore);
saveInterest({t:'바퀴',lang:'ko'},{memo:'  '},istore);
assert.deepEqual(listInterests().map(e=>[e.lang,e.t,e.heart,e.memo]),[['ko','자동차',true,''],['en','Car',false,'engine']]);
assert.deepEqual(Object.keys(JSON.parse(imem.get('webglobe-interests-v1'))).sort(),[JSON.stringify(['en','Car']),JSON.stringify(['ko','바퀴']),JSON.stringify(['ko','자동차'])].sort());
loadInterests({getItem:()=>'{bad'});assert.deepEqual(listInterests(),[]);

// progress: distinct aliens only, persisted, bad saves ignored
const mem=new Map(),storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};
loadProgress(storage);assert.equal(progress().met,0);
assert.equal(markMet('자동차','ko'),true);assert.equal(markMet('자동차','ko'),false);
markMet('Car','en');markWanderer('바퀴','ko');markMet('바퀴','ko');setTutorialDone();
loadProgress(storage);const p=progress();
assert.equal(p.met,3);assert.equal(p.wanderers,1);assert.equal(p.tutorial,true);assert.deepEqual(p.recent,['바퀴','Car','자동차']);
mem.set('umm.mission','{broken');loadProgress(storage);assert.equal(progress().met,0);

// events
let n=0;const off=on('x',()=>n++);emit('x');off();emit('x');assert.equal(n,1);
const waiting=once('y',d=>d===2);emit('y',1);emit('y',2);assert.equal(await waiting,2);
console.log('PASS: 4 rank thresholds, gauge segments, interests list, distinct-alien progress, persistence, corrupt save, event bus.');
