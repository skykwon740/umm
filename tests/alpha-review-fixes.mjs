// 알파 피드백 반영 검토(11/25)에서 나온 결함 고침의 회귀 검사
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {search,matchTitle} from '../src/content/wikipedia.js';

// 1. 위키백과에 없는 단어: 본문 검색이 엉뚱한 문서를 돌려줘도 제목이 맞닿지 않으면 '없음'
const results={'웹프개탐험':['미국','아폴로 11호','크리스토퍼 콜럼버스'],'이정은':['이정은 (1970년)','이정은','이정은 (1973년)'],
  '농구 경기':['농구','농구 코트'],'aespa':['Aespa','카리나 (가수)'],'고양이':['고양이','고양잇과'],'블랙핑크 콘서트':['본 핑크 월드 투어','리사'],'웹프개 탐험':['미국','탐험']};
const pages={'블랙핑크':{title:'블랙핑크'}};
globalThis.fetch=async url=>{
  const p=new URL(url).searchParams,q=p.get('srsearch');
  if(p.get('titles'))return {ok:true,json:async()=>({query:{pages:Object.fromEntries(p.get('titles').split('|').map((t,i)=>[pages[t]?i+1:-1-i,pages[t]??{title:t,missing:''}]))}})};
  return {ok:true,json:async()=>({query:{search:(results[q]??[]).map(title=>({title}))}})};
};
assert.equal(await search('ko','웹프개탐험'),undefined,'unrelated full-text hits mean the word is not in Wikipedia');
assert.equal(await search('ko','이정은'),'이정은 (1970년)','a title with a qualifier still matches');
assert.equal(await search('ko','농구 경기'),'농구','a title inside the input matches');
assert.equal(await search('en','aespa'),'Aespa','case is ignored');
assert.equal(await search('ko','고양이'),'고양이');
assert.equal(await search('ko','없는검색어'),undefined);
assert.equal(await search('ko','블랙핑크 콘서트'),'블랙핑크','a word of the input with its own page is used when no title matches');
assert.equal(await search('ko','웹프개 탐험'),'탐험','a title holding a word of the input matches');
assert.equal(matchTitle('  ',['미국']),undefined);

// 2. 메모: 승인된 삭제는 괄호 안내뿐이므로 보이는 라벨 '메모'는 남는다. 하트 저장 실패는 기존 하트 문구
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/<label for="memoText">메모<\/label>/);
assert.equal(html.includes('다른 장소로 이동하기 전에 저장해 주세요'),false);
const memo=fs.readFileSync(new URL('../src/ui/memo.js',import.meta.url),'utf8');
assert.match(memo,/else status\.textContent=HEART_FAILED;/);
assert.match(memo,/HEART_FAILED='저장하지 못했습니다\. 브라우저 저장 공간을 확인해 주세요\.'/);
console.log('PASS: not-in-Wikipedia words are not replaced by unrelated full-text hits, memo label kept, heart save failure keeps its own message.');
// 3. 소리 끄기 토글은 없다 (사용자 결정 11/25 「토글 빼기」). 발걸음 소리는 항상 켜져 있다
assert.equal(/id="sound"/.test(html),false);
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
assert.match(app,/createFootsteps\(\{enabled:true\}\)/);assert.equal(app.includes('umm.sound'),false);
console.log('PASS: no sound toggle; footsteps always on.');
