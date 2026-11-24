import assert from 'node:assert/strict';
import {story,familyPool,family,isReferenceTitle} from '../src/content/wikipedia.js';

// 가짜 위키백과: 링크는 2묶음(이어받기 필요), 동음이의·없는 문서·넘겨주기 포함
const LINKS=[['1월 20일','1892년','3x3 농구','5초 룰 (농구)','농구 공','대한민국의 농구 목록','동음이','없는문서'],
  ['넘겨주기','슛','슛 (농구)','24','List of basketball leagues','농구']];
const PAGES={
  '3x3 농구':{extract:'3x3 농구(3x3 basketball)는 세 명씩 겨루는 농구다. 둘째 문장.'},'5초 룰 (농구)':{extract:'5초 안에 던져야 한다.'},
  '농구 공':{extract:'농구에 쓰는 공이다.'},'동음이':{disambiguation:true},'슛':{extract:'공을 던지는 동작이다.'},
  '슛 (농구)':{extract:''},'농구':{extract:'농구는 구기 종목이다.'},
};
const REDIRECTS={'넘겨주기':'슛'};
let calls=[],fail=null;
globalThis.fetch=async url=>{
  const p=new URL(url).searchParams,body=json=>({ok:true,json:async()=>json});
  calls.push(Object.fromEntries(p));
  assert.equal(p.get('origin'),'*');
  if(fail==='http')return {ok:false,status:500,json:async()=>({})};
  if(fail==='api')return body({error:{code:'ratelimited',info:'too many requests'}});
  if(p.get('prop')==='links'){
    const batch=Number(p.get('plcontinue')||0);
    return body({...(batch+1<LINKS.length?{continue:{plcontinue:String(batch+1),continue:'||'}}:{}),
      query:{pages:{1:{title:p.get('titles'),ns:0,links:LINKS[batch].map(title=>({ns:0,title}))}}}});
  }
  const titles=p.get('titles').split('|'),redirects=[],pages={};
  titles.forEach((t,i)=>{
    const to=REDIRECTS[t];if(to)redirects.push({from:t,to});
    const title=to??t,page=PAGES[title];
    pages[page?100+i:-1-i]=page?{title,ns:0,extract:page.extract,...(page.disambiguation?{pageprops:{disambiguation:''}}:{})}:{title,ns:0,missing:''};
  });
  return body({query:{...(redirects.length?{redirects}:{}),pages}});
};

// 사용자 결정(2026-11-21): 날짜·연도·숫자·목록 문서만 후보에서 뺀다
for(const t of ['1월 20일','1892년','2020년대','21세기','기원전 3세기','24','January 20','20 January 1990','1990s','20th century',
  'List of basketball leagues','대한민국의 농구 목록','한국사 연표'])assert.equal(isReferenceTitle(t),true,t);
for(const t of ['3x3 농구','5초 룰 (농구)','21 (농구)','농구','슛','Basketball','24시간 편의점'])assert.equal(isReferenceTitle(t),false,t);

const pool=await familyPool('ko','농구');
assert.equal(calls.filter(c=>c.prop==='links').length,2,'Follows link continuation past the first batch');
assert.deepEqual(pool,['3x3 농구','5초 룰 (농구)','농구 공','동음이','없는문서','넘겨주기','슛','슛 (농구)']);

// 고정된 무작위 순서: 동음이의·없는 문서는 빠지고, 넘겨주기는 실제 문서 이름으로, 같은 문서는 한 번만
const order=()=>{let i=0;return ()=>[.99,.1,.5,.3,.8,.2,.6,.4][i++%8];};
calls=[];
const picked=await family('ko',pool,{exclude:['농구'],random:order(),count:8});
assert.ok(picked.length>=5&&picked.every(c=>!['동음이','없는문서','넘겨주기'].includes(c.t)),JSON.stringify(picked));
assert.equal(new Set(picked.map(c=>c.t)).size,picked.length);
assert.equal(picked.find(c=>c.t==='3x3 농구').d,'3x3 농구는 세 명씩 겨루는 농구다.','One clean line per family box');
assert.equal(calls.length,1,'Ten candidates are checked in one request');

const three=await family('ko',pool,{exclude:['농구']});
assert.equal(three.length,3);
// 다시 만나면 새로 뽑는다: 다른 후보가 충분하면 직전 후보는 다시 나오지 않는다
const shown=three.map(c=>c.t);
for(let i=0;i<5;i++){
  const again=await family('ko',pool,{exclude:['농구'],avoid:shown,count:2});
  assert.equal(again.some(c=>shown.includes(c.t)),false);
}
// 후보가 모자라면 있는 만큼, 없으면 빈 목록
assert.deepEqual((await family('ko',['슛','동음이'])).map(c=>c.t),['슛']);
assert.deepEqual(await family('ko',['동음이','없는문서']),[]);
assert.deepEqual(await family('ko',[]),[]);
assert.deepEqual(await family('ko',['슛'],{exclude:['슛']}),[]);

// 이야기 요약: 괄호를 덜어내고, 문서가 없으면 null
assert.deepEqual(await story('ko','3x3 농구'),{t:'3x3 농구',summary:'3x3 농구는 세 명씩 겨루는 농구다. 둘째 문장.'});
assert.equal(await story('ko','없는문서'),null);
assert.equal((await story('ko','넘겨주기')).t,'슛');

// 요청 실패·API 오류는 화면이 다시 시도할 수 있게 실패로 알린다
for(fail of ['http','api']){
  await assert.rejects(()=>familyPool('ko','농구'));
  await assert.rejects(()=>family('ko',['슛']));
  await assert.rejects(()=>story('ko','슛'));
}
fail=null;
console.log('PASS: family pool continuation, date/number/list filter, disambiguation/missing/redirect handling, reroll variety, short pools, summary and request failures.');
