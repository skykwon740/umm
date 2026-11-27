import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {state,load} from '../src/core/state.js';
import {CELL_COUNT} from '../src/core/grid.js';
import {createJourney} from '../src/journey.js';
import {NOT_FOUND_MESSAGE} from '../src/core/messages.js';
import {inputRetryLine} from '../src/ui/tutorial-lines.js';

const data=new Map();
globalThis.localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
data.set('webglobe3',JSON.stringify({c:'0'.repeat(CELL_COUNT),n:[],r:[],t:[],h:-1,g:[]}));
assert.equal(load(),true);

// 1) 위키백과에 없는 단어: 팀이 정한 문구가 그대로 나가고, 튜토리얼 1/4가 그것을 '없음'으로 알아본다
const TEAM='해당 외계인은 이 행성에 없다. 다른 이름을 입력하라.';
assert.equal(NOT_FOUND_MESSAGE,TEAM);
const messages=[];
const journey=createJourney({wiki:{search:async()=>undefined,describe:async()=>''},
  onStart(){},onChange(){},onFocus(){},onArrive(){},onMessage:m=>messages.push(m),onFinish(){}});
await journey.run('없는문서','ko');
assert.deepEqual(messages,[TEAM],'journey reports the team phrase when Wikipedia has no such document');
assert.equal(inputRetryLine(messages[0]),TEAM,'tutorial reads it as "no such alien"');
assert.equal(inputRetryLine(''),TEAM);
assert.match(inputRetryLine('경로를 불러오지 못했습니다. 연결을 확인하고 다시 출발해 주세요.'),/통신 장애/,'network failure keeps its own branch');

// 2) 승인된 삭제 목록: 화면에 나오는 코드에 남아 있지 않다
const root=fileURLToPath(new URL('..',import.meta.url));
const files=['index.html',...fs.readdirSync(root+'src',{recursive:true}).filter(f=>f.endsWith('.js')).map(f=>'src/'+String(f).replaceAll('\\','/'))];
const source=Object.fromEntries(files.map(f=>[f,fs.readFileSync(root+f,'utf8')]));
const all=Object.values(source).join('\n');
const removed=[
  '명뿐이에요','가족 후보를 새로 뽑았어요','에게 가는 길이 열렸어요','파란 길을 따라','새 외계인 발견','가족 후보를 고르면',
  '외계인을 눌러 이야기 듣기','길이나 외계인으로 이동','선택한 목적지로 이동합니다','밝혀진 길이나 건물을 클릭해 주세요',
  'id="searchHelp"','searchHelp','원문이나 창 안에서 보기로 읽어 보세요','원문 링크로 확인해 보세요',
  '다른 외계인에게 가 보거나 새 관심사로 출발해 보세요','떠돌이 외계인이 나타난다','이야기 닫기','Esc 이야기',
];
for(const phrase of removed)assert.equal(all.includes(phrase),false,`removed phrase is back: ${phrase}`);
assert.equal(/가족 후보/.test(source['index.html']+source['src/ui/story.js'].replace(/^\s*\/\/.*$/gm,'')),false,'visible "가족 후보" is now "가족"');

// 3) 남기는 것
assert.ok(source['src/ui/story.js'].includes('이 문서에서는 이어질 가족을 찾지 못했어요.'));
assert.ok(source['src/ui/story.js'].includes('가족을 불러오지 못했어요.'));
assert.ok(source['src/ui/story.js'].includes('요약이 없는 문서예요.'));
for(const phrase of ['떠돌이 외계인 포착','보따리를 멘'])assert.equal(all.includes(phrase),false,`wanderer guide text is back: ${phrase}`);
assert.ok(source['src/ui/panel.js'].includes("['Esc', '닫기']")&&source['src/ui/panel.js'].includes('관심사를 1~100자로 입력해 주세요.'));
assert.ok(source['index.html'].includes('aria-label="정보창 닫기"')&&source['index.html'].includes('id="searchCount"'));
assert.equal(/aria-describedby="searchCount"/.test(source['index.html']),true);

// 4) 임무 브리핑 창 없이 바로 시작 (briefing.js 파일은 남아 있고 쓰이지 않는다)
assert.equal(/briefing/i.test(source['src/ui/mission.js'].replace(/\/\/.*$/gm,'')),false,'mission no longer opens the briefing');
assert.ok(fs.existsSync(root+'src/ui/briefing.js'));
assert.equal(Object.entries(source).some(([f,s])=>f!=='src/ui/briefing.js'&&/from '.\/briefing.js'/.test(s)),false);

// 5) 튜토리얼 대사: 자동 열림·조작·가족 안내가 있고, 떠돌이 대사·'이야기 듣기'는 없다
const tutorial=source['src/ui/tutorial.js'];
assert.ok(tutorial.includes('도착하면 정보창이 뜬다. 닫은 뒤에는 외계인을 클릭하면 다시 뜬다.'));
assert.ok(tutorial.includes('클릭은 이동, 드래그는 회전, 휠은 확대'));
assert.ok(tutorial.includes('랜덤')&&tutorial.includes('↻'));
assert.ok(tutorial.includes('state.walkPath.length===0'),'waits for the walk to end at the new alien');
assert.equal(/이야기 듣기|이야기를 들은|떠돌이/.test(tutorial.replace(/\/\/.*$/gm,'')),false);
console.log('PASS: team not-found phrase and tutorial recognition, approved removals absent and kept texts present, tutorial starts without briefing, tutorial lines cover auto-open, controls and family reroll.');
