// D 트랙 진입점: 튜토리얼 · 진행도/계급 · 결과 화면 · 떠돌이 외계인을 묶어 app.js에 하나로 연결한다.
import {state} from '../core/state.js';
import {on,emit} from '../core/events.js';
import {loadProgress,progress,markMet,markWanderer} from '../core/progress.js';
import {rankOf} from '../core/ranks.js';
import {createRadio} from './radio.js';
import {createTutorial} from './tutorial.js';
import {createEnding} from './ending.js';
import {createWanderer} from './wanderer.js';
import {createBriefing} from './briefing.js';
import {createGauge} from './gauge.js';
import {createCollection} from './collection.js';

export function createMission({startJourney}) {
  loadProgress();
  const demo=new URLSearchParams(location.search).has('demo');   // ?demo → 떠돌이가 자주 나타남 (발표용)
  const radio=createRadio();
  const gauge=createGauge();
  createCollection();
  const briefing=createBriefing();
  const ending=createEnding({onReplayTutorial:()=>begin()});
  const tutorial=createTutorial({radio,onFinish(first){emit('tutorialDone');announce(first?-1:undefined);}});

  let lastRank=rankOf(progress().met).index;
  function announce(prev=lastRank) {
    const r=rankOf(progress().met);gauge.update();
    if(r.index>prev&&r.index>0&&!tutorial.isRunning())
      radio.notice([`승진 통보. 새 계급: ${r.rank.name}.`,r.rank.line,
        r.next?`다음 계급 ${r.next.name}까지 외계인 ${r.left}명.`:'최고 계급 달성. 더 오를 곳이 없다.'].filter(Boolean),3200);
    lastRank=r.index;
  }
  function meet(t,lang){if(markMet(t,lang))announce();}

  // 만난 외계인 = 처음 이야기를 들은 외계인 (C 트랙의 첫 접촉, 문서당 1회)
  on('contact',node=>{if(node)meet(node.t,node.lang);});

  const wanderer=createWanderer({
    demo,
    canAppear:()=>progress().tutorial&&!tutorial.isRunning()&&!briefing.isOpen()&&!state.busy&&!radio.isBusy(),
    onSpotted:()=>radio.notice(['떠돌이 외계인 포착. 접촉은 자유다.'],2200),
    onMeet:(t,lang)=>{markWanderer(t,lang);meet(t,lang);},
    onFollow:(t,lang)=>{const q=document.getElementById('q');if(q)q.value=t;startJourney(t,lang);},
  });

  function tick(time){radio.tick();wanderer.tick(time);}
  // 브리핑(계급 설명) → 튜토리얼
  async function begin() {
    if(tutorial.isRunning()||briefing.isOpen()||state.busy)return;
    await briefing.open();tutorial.start();
  }
  if(!progress().tutorial)setTimeout(begin,400);   // 처음 접속 → 브리핑 → 튜토리얼
  return {tick,openReport:ending.open,startTutorial:begin,spawnWanderer:wanderer.appear};
}
