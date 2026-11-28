// 독립 감사(2026-11-26)에서 재현한 결함 4가지의 회귀 검사.
// (1) 출발 실패 → 캐릭터·루트가 출발 전으로 돌아오고 빈 루트를 남기지 않는다
// (2) 서로 다른 단어가 같은 칸에 놓이지 않는다
// (3) 무전 알림이 겹치면 새 알림이 이어받고, 떠돌이는 무전이 떠 있을 때 나타나지 않는다
// (4) 개발 서버가 인코딩된 '/'(%2F)로 src·styles 밖 파일을 내주지 않는다
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {state,load,save,addJourneyNode,beginJourney,completeJourney} from '../src/core/state.js';
import {CELL_COUNT,hash,nodeCell} from '../src/core/grid.js';
import {createJourney} from '../src/journey.js';

const data=new Map();
globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
function reset(){data.set('webglobe3',JSON.stringify({c:'0'.repeat(CELL_COUNT),n:[],r:[],t:[],h:-1,g:[]}));assert.equal(load(),true);}

// ── (1) 출발 실패 ──
const calls=[];
const journeyWith=wiki=>createJourney({wiki,onStart(){calls.push('start');},onChange(){},onFocus(){},
  onArrive(){calls.push('arrive');},onMessage(m){calls.push('message:'+m);},onFinish(){calls.push('finish');}});
const ok={search:async(_l,q)=>q,describe:async()=>''};
reset();
await journeyWith(ok).run('농구');
const placed={here:state.here,walker:state.walker,trip:state.trip,route:state.route,journeys:state.journeys,cells:state.cells};
assert.ok(placed.here>=0&&placed.walker);
for(const [why,wiki] of [['not on Wikipedia',{...ok,search:async()=>undefined}],['offline',{...ok,search:async()=>{throw new Error('offline');}}]]) {
  calls.length=0;
  await journeyWith(wiki).run('웹프개탐험');
  assert.equal(state.busy,false,why);
  assert.equal(state.here,placed.here,`${why}: the character stays in front of the alien it stood at`);
  assert.deepEqual(state.walker,placed.walker,`${why}: the character is still drawn`);
  assert.deepEqual(state.trip,placed.trip,`${why}: route list is kept`);
  assert.deepEqual(state.route,placed.route,why);
  assert.deepEqual(state.cells,placed.cells,why);
  assert.equal(state.journeys.length,1,`${why}: no empty route takes a route colour`);
  assert.ok(calls.some(c=>c.startsWith('message:')),why);assert.equal(calls.at(-1),'finish',why);
}
save();assert.equal(JSON.parse(data.get('webglobe3')).j.length,1,'the empty route is not saved either');
await journeyWith(ok).run('족구');
assert.equal(state.journeys.length,2);assert.equal(state.journeys[1].color,'#56c7e8','the next real route gets the 2nd colour');
// 처음(아무 외계인도 없을 때) 실패하면 예전처럼 서 있는 자리 없음
reset();await journeyWith({...ok,search:async()=>undefined}).run('없는문서');
assert.equal(state.here,-1);assert.equal(state.journeys.length,0);

// ── (2) 같은 칸 ──
// '복싱'과 '단어35'는 hash % CELL_COUNT 가 같다 (감사 중 찾은 실제 충돌 쌍)
assert.equal(hash('복싱')%CELL_COUNT,hash('단어35')%CELL_COUNT,'collision pair still collides');
reset();beginJourney('복싱');
const a=addJourneyNode('복싱','ko'),b=addJourneyNode('단어35','ko');completeJourney();
assert.equal(nodeCell(a),hash('복싱')%CELL_COUNT,'a word on a free cell keeps its usual cell');
assert.notEqual(nodeCell(b),nodeCell(a),'a second word never lands on an occupied cell');
assert.equal(addJourneyNode('단어35','ko'),state.nodes[1],'the same word is the same alien');
// 50명을 놓아도 모두 서로 다른 칸
reset();beginJourney('x');
for(let i=0;i<50;i++)addJourneyNode('단어'+i,'ko');completeJourney();
assert.equal(new Set(state.nodes.map(nodeCell)).size,50);

// ── (3) 무전 알림 ──
class El {
  constructor(){this.hidden=false;this.style={};this.classes=new Set();this.kids=new Map();this.l={};this.offsetHeight=100;this.log=[];this._text='';
    this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),contains:c=>this.classes.has(c),
      toggle:(c,on)=>{(on??!this.classes.has(c))?this.classes.add(c):this.classes.delete(c);}};}
  set textContent(v){this._text=v;this.log.push(v);}get textContent(){return this._text;}
  set innerHTML(v){}setAttribute(){}append(){}addEventListener(t,f){(this.l[t]??=[]).push(f);}
  querySelector(s){if(!this.kids.has(s))this.kids.set(s,new El());return this.kids.get(s);}
}
globalThis.document={createElement:()=>new El(),body:new El(),getElementById:()=>null};
globalThis.innerWidth=1200;globalThis.innerHeight=800;
const {createRadio}=await import('../src/ui/radio.js');
// createRadio가 만든 무전 창(.d-text를 가진 요소)과 그 글자 칸을 붙잡는다
const made=[],realCreate=document.createElement;
document.createElement=()=>{const e=realCreate();made.push(e);return e;};
const r2=createRadio();document.createElement=realCreate;
const b2=made.find(e=>e.kids.has('.d-text')),t2=b2.kids.get('.d-text');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const first=r2.notice(['가나다','라마바','사아자'],60);
await wait(50);
assert.equal(r2.isOpen(),true);
const second=r2.notice(['포착'],60);
assert.equal(await first,false,'the earlier notice stops when a new one takes over');
assert.equal(await second,true);
assert.equal(t2.textContent,'포착','the new notice is what stays on screen');
assert.equal(t2.log.slice(t2.log.lastIndexOf('')).some(v=>/라마바|사아자/.test(v)),false,'the earlier notice does not type over the new one');
await wait(120);assert.equal(b2.hidden,true,'the new notice closes by itself');assert.equal(r2.isOpen(),false);
assert.equal(b2.classList.contains('d-notice'),false);
r2.open({step:'1/4'});assert.equal(b2.classList.contains('d-notice'),false,'a tutorial window is never styled as a notice');assert.equal(r2.isBusy(),true);
r2.close();
const mission=fs.readFileSync(new URL('../src/ui/mission.js',import.meta.url),'utf8');
assert.match(mission,/canAppear:\(\)=>[^\n]*!radio\.isOpen\(\)/,'the wanderer waits while any radio window is open');

// ── (4) 개발 서버 ──
const root=fileURLToPath(new URL('../',import.meta.url));
const port=String(20000+Math.floor(Math.random()*20000));
const server=spawn(process.execPath,['scripts/serve-wiki.mjs'],{cwd:root,env:{...process.env,WIKI_PORT:port},windowsHide:true});
try {
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',()=>reject(new Error('server exited')));});
  const status=async p=>(await fetch(`http://127.0.0.1:${port}${p}`)).status;
  assert.equal(await status('/src/app.js'),200);
  assert.equal(await status('/'),200);
  for(const p of ['/src/..%2FREADME.md','/src/..%2F.git','/styles/..%2F..%2Fsecret','/src/..%2Fsrc%2Fapp.js'])assert.equal(await status(p),404,p);
} finally { server.kill(); }

console.log('PASS: failed start keeps the character, route list and colours; aliens never share a cell; a newer radio notice takes over and the wanderer waits for the radio; dev server stays inside src/styles/assets.');
