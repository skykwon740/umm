import assert from 'node:assert/strict';
import {RANKS,rankOf} from '../src/core/ranks.js';
import {loadProgress,progress,markMet,markWanderer,setTutorialDone} from '../src/core/progress.js';
import {on,emit,once} from '../src/core/events.js';

// ranks: ascending thresholds, boundaries, top rank
assert.equal(RANKS[0].need,0);
RANKS.forEach((r,i)=>i&&assert.ok(r.need>RANKS[i-1].need));
assert.equal(rankOf(0).rank.name,'견습 우주인');
assert.equal(rankOf(3).left,1);
assert.equal(rankOf(4).rank.name,'신입 탐사대원');
const top=rankOf(999);assert.equal(top.rank.name,'행성의 지배자');assert.equal(top.next,null);assert.equal(top.ratio,1);

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
console.log('PASS: rank thresholds, distinct-alien progress, persistence, corrupt save, event bus.');
