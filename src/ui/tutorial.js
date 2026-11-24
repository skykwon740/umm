// 무전 창 튜토리얼 (「튜토리얼 계획」 문서). B·C 트랙 기능에 연결되어 있다. 임무 브리핑 창 없이 바로 대사로 시작한다.
//   1/4 입력창 → 첫 외계인  2/4 외계인 앞 도착  3/4 도착하면 정보창이 자동으로 열림 (닫은 뒤엔 외계인 클릭)
//   4/4 정보창 → 가족 3칸(↻로 다시 뽑기) → 고르면 새 외계인이 놓임 → 자동 이동이면 걸어가고, 아니면 클릭해서 이동
import {state} from '../core/state.js';
import {vec,nodeCell} from '../core/grid.js';
import {on,once} from '../core/events.js';
import {setTutorialDone,progress} from '../core/progress.js';
import {project,PX} from '../world/renderer.js';
import {focusCamera} from '../world/camera.js';
import {inputRetryLine} from './tutorial-lines.js';

export const HOOKS={
  input:'#bar',            // 입력 창 + 출발
  window:'#resultActions', // 외계인 앞에 뜨는 정보창
  story:'#story',          // 열린 정보창 본문
  family:'#familyBoxes',   // 가족 3칸
  familyHead:'.family-head', // “단어”의 가족들 제목 + ↻
  familyRule:'#familyRule',  // 위키백과 문서 링크 단어 중 랜덤 3개
  familyGuide:'#familyGuide',
  autoMove:'#autoMove',    // 오른쪽 패널의 자동 이동 토글
};

const SKIP=Symbol('skip');
const $=s=>document.querySelector(s);
const visible=s=>{const e=$(s);return Boolean(e&&!e.hidden);};

export function createTutorial({radio,onFinish}) {
  let running=false,skipped=null;
  const guard=promise=>Promise.race([promise,skipped.promise]);
  const sleep=ms=>guard(new Promise(r=>setTimeout(r,ms)));
  async function until(test) { while(!test())await sleep(150); }

  const nodeHere=()=>state.nodes.find(n=>nodeCell(n)===state.here)??null;
  const screen=node=>{const p=project(vec(node.lat,node.lon));return p&&[p.x*PX,p.y*PX];};
  // a hole around the given points (+ optional element), so the alien, the path and the window are lit together
  function around(getPoints,selector) {
    return ()=>{
      const pts=getPoints().filter(Boolean),box=selector&&$(selector);
      if(box&&!box.hidden&&getComputedStyle(box).visibility!=='hidden'){
        const r=box.getBoundingClientRect();if(r.width)pts.push([r.left,r.top],[r.right,r.bottom]);
      }
      if(!pts.length)return {left:0,top:44,width:innerWidth,height:innerHeight-44};
      const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),m=40;
      const left=Math.min(...xs)-m,top=Math.min(...ys)-m-30;
      return {left,top,width:Math.max(...xs)+m-left,height:Math.max(...ys)+m-top};
    };
  }
  // 여러 요소를 한꺼번에 감싸는 구멍 (예: 가족 제목·↻·3칸)
  const areaOf=(...selectors)=>()=>{
    const rs=selectors.map($).filter(e=>e&&!e.hidden).map(e=>e.getBoundingClientRect()).filter(r=>r.width);
    if(!rs.length)return null;
    const left=Math.min(...rs.map(r=>r.left)),top=Math.min(...rs.map(r=>r.top));
    return {left,top,width:Math.max(...rs.map(r=>r.right))-left,height:Math.max(...rs.map(r=>r.bottom))-top};
  };
  const walkerPoint=()=>state.walker&&project(state.walker)?[project(state.walker).x*PX,project(state.walker).y*PX]:null;
  function showBoth(node) {
    const a=vec(node.lat,node.lon),b=state.walker??a,mid=a.map((x,i)=>x+b[i]),m=Math.hypot(...mid)||1;
    focusCamera({lat:Math.asin(mid[1]/m)*180/Math.PI,lon:Math.atan2(mid[0],mid[2])*180/Math.PI},'walk');
  }

  // waits for a 출발 that lands next to a first alien
  async function firstAlien() {
    radio.setStep('1/4');radio.spot(HOOKS.input);
    radio.line('관심사를 입력하라. 그 단어의 외계인이 나타난다.',{click:false});
    $('#q')?.focus();
    for(;;) {
      let message='';
      const off=on('journeyMessage',text=>{message=text;});
      await guard(once('journeyStart'));
      radio.spot('clear');radio.line('신호 추적 중… 대기하라.',{click:false});
      await guard(once('journeyEnd'));off();
      if(!message&&nodeHere())return nodeHere();
      radio.spot(HOOKS.input);
      radio.line(inputRetryLine(message),{click:false});
    }
  }
  // 걸어서 그 외계인 칸에 도착할 때까지 (arrive 이벤트 + 걷기 끝 + 그 칸). 이미 서 있으면 바로 끝낸다
  async function approach(node,line) {
    radio.spot(around(()=>[screen(node),walkerPoint()]));
    const there=()=>state.here===nodeCell(node)&&state.walkPath.length===0;
    if(there())return;
    if(line)radio.line(line,{click:false});
    await guard(once('arrive',there));
  }

  async function flow() {
    radio.open({step:'',skip});radio.spot(null);
    await guard(radio.line('착륙 확인. 이 행성에는 <단어 외계인>들이 살고 있다.'));
    await guard(radio.line('외계인들은 모두 가족으로 이어져 있다. 이들을 만나며 외계 인맥을 넓히고, 이 미지의 생명체들을 이해하는 것이 너의 임무다.'));
    await guard(radio.line('지금부터 훈련을 시작한다.'));

    for(;;) {
      // 1/4 입력
      const first=await firstAlien();

      // 2/4 접근 (첫 외계인 바로 앞에 착륙하면 곧바로 완료)
      radio.setStep('2/4');showBoth(first);
      radio.spot(around(()=>[screen(first),walkerPoint()]));
      await guard(radio.line('목표 외계인 발견.',{click:false}));
      await approach(first,'땅을 클릭해 외계인에게 접근하라.');
      await sleep(500);

      // 3/4 접촉: 도착하면 정보창이 저절로 열린다 (이미 열려 있으면 바로 진행). 닫은 뒤에는 외계인을 클릭하면 다시 열린다
      radio.setStep('3/4');
      radio.spot(around(()=>[screen(first)],HOOKS.window));
      const infoLine='도착하면 정보창이 뜬다. 닫은 뒤에는 외계인을 클릭하면 다시 뜬다.';
      await guard(radio.line(infoLine));
      await guard(radio.line('조작은 이렇다. 클릭은 이동, 드래그는 회전, 휠은 확대.'));
      if(!visible(HOOKS.story)){radio.line(infoLine,{click:false});await until(()=>visible(HOOKS.story));}

      // 4/4 가족 추적
      radio.setStep('4/4');radio.spot(HOOKS.window);
      await guard(radio.line('정보창 속 위키백과 문서에는 다른 단어들이 링크로 걸려 있다. 그 단어들이 이 외계인의 가족이다.'));
      radio.line('가족의 위치를 찾는 중…',{click:false});
      await until(()=>$(HOOKS.family)?.children.length||!/찾는 중/.test($(HOOKS.familyGuide)?.textContent??'찾는 중'));
      if(!$(HOOKS.family)?.children.length) {
        await guard(radio.line('이 외계인은 가족의 행방을 모른다. 다른 이름으로 다시 출발하라.'));
        continue;   // back to 1/4
      }
      radio.spot(areaOf(HOOKS.familyHead,HOOKS.familyRule,HOOKS.family));
      await guard(radio.line(`링크 단어 중 랜덤 ${$(HOOKS.family).children.length===3?'세':$(HOOKS.family).children.length+''} 명의 위치를 찾아냈다. ↻를 누르면 다시 뽑는다.`));
      radio.line('한 명을 골라 추적하라.',{click:false});
      const before=state.trip.length;
      // extend()는 거의 동기라 journeyStart·journeyEnd가 연달아 나간다. 끝 신호를 미리 걸어 둬야 놓치지 않는다
      const started=once('journeyStart'),ended=once('journeyEnd');
      await guard(started);radio.spot('clear');
      await guard(ended);
      if(state.trip.length<=before){radio.spot(HOOKS.window);await guard(radio.line('추적 실패. 다시 시도하라.'));continue;}
      const second=state.nodes[state.trip.at(-1)];
      // 새 외계인이 놓였다. 자동 이동이 켜져 있으면 캐릭터가 걸어가고(카메라는 따라간다), 꺼져 있으면 클릭해서 찾아간다
      await guard(radio.line('추적 경로 확보.',{click:false}));
      const auto=Boolean($(HOOKS.autoMove)?.checked);
      radio.spot(around(()=>[screen(second),walkerPoint()]));
      await guard(radio.line(`이렇게 가족을 따라가면 행성 곳곳의 외계인을 만날 수 있다. ${auto?'자동 이동이 켜져 있어 캐릭터가 알아서 걸어간다.':'새 외계인을 클릭해 찾아가라.'}`,{click:false}));
      await approach(second);
      await sleep(800);
      break;
    }

    // 종료
    radio.setStep('');radio.spot(false);
    await guard(radio.line('훈련 종료. 계급: 견습 우주인.'));
    await guard(radio.line('외계인을 많이 만날수록 행성 내의 지위가 높아진다. 최대한 다양한 외계인과 접촉하도록.'));
    await guard(radio.line('계급은 만난 외계인 수로 정해진다. 같은 외계인은 한 번만 센다. 현재 계급은 화면 위쪽 게이지에서 확인하라.'));
  }

  function skip() { skipped?.resolve(SKIP); }
  async function start() {
    if(running||state.busy)return false;
    running=true;const first=!progress().tutorial;let resolve;
    skipped={promise:new Promise(r=>{resolve=r;}).then(()=>{throw SKIP;})};skipped.resolve=resolve;
    skipped.promise.catch(()=>{});
    try{await flow();}catch(error){if(error!==SKIP)console.error(error);}
    finally{
      radio.close();running=false;skipped=null;
      setTutorialDone(true);onFinish?.(first);   // 건너뛰어도 완료로 저장. 새로고침하면 처음부터.
    }
    return true;
  }
  return {start,isRunning:()=>running};
}
