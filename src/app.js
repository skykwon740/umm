import {state,load,initializeWalker,tickAnimation,nextWalkStep,requestRedraw,consumeRedraw,updateNodeDescription,flushMovementSave} from './core/state.js';
import {resize,render,project,PX} from './world/renderer.js';
import {initializeCamera,focusCamera,followWalker,tickCamera,resumeTracking} from './world/camera.js';
import {createNavigation} from './world/navigation.js';
import {bindInput} from './world/input.js';
import {nodeCell} from './core/grid.js';
import {loadInterests} from './core/interests.js';
import {createMemo} from './ui/memo.js';
import {createJourney} from './journey.js';
import {createResults,drawLabels,hideResults} from './ui/results.js';
import {describe} from './content/wikipedia.js';
import {showChain,setStatus,setJourneyBusy,bindSearch,bindRouteList} from './ui/panel.js';
import {emit} from './core/events.js';
import {createMission} from './ui/mission.js';
import {createFootsteps} from './ui/sound.js';

load();
loadInterests();
const memo=createMemo();
let next=null;   // 가족을 고른 뒤 걸어가야 할 외계인
// 오른쪽 패널의 켜기/끄기 토글. 저장이 막힌 브라우저에서도 기본값으로 동작한다
function bindToggle(id,key) {
  const input=document.getElementById(id);
  try{const saved=localStorage.getItem(key);if(saved==='on'||saved==='off')input.checked=saved==='on';}catch{}
  input.addEventListener('change',()=>{try{localStorage.setItem(key,input.checked?'on':'off');}catch{}});
  return input;
}
const autoMove=bindToggle('autoMove','umm.autoMove');
const soundToggle=bindToggle('sound','umm.sound');
const footsteps=createFootsteps({enabled:soundToggle.checked});
soundToggle.addEventListener('change',()=>footsteps.setEnabled(soundToggle.checked));
const results=createResults({
  onRestart:(title,lang)=>journey.run(title,lang),
  async onChoose(from,family) {
    const node=await journey.extend(family.t,from.lang,family.d);
    if(!node)return;
    next=node;
    navigation.approach(node,autoMove.checked);
  },
  onFirstContact:node=>emit('contact',node),
});
function arrive() {
  results.arrive();
  memo.show(state.nodes.find(n=>nodeCell(n)===state.here));
  if(next&&nodeCell(next)===state.here){next=null;setStatus();}
  emit('arrive');
}
const journey=createJourney({
  onStart(){memo.show(null);hideResults();setStatus();setJourneyBusy(true);next=null;emit('journeyStart');},
  onChange:showChain,onFocus:focusCamera,onArrive:arrive,
  onMessage(message){setStatus(message);emit('journeyMessage',message);},
  onFinish(){setJourneyBusy(false);emit('journeyEnd');},
});
const mission=createMission({startJourney:(title,lang)=>journey.run(title,lang)});
const navigation=createNavigation({project,onArrive(){footsteps.step();arrive();},onMessage:setStatus});
// 서 있는 외계인을 클릭하면 이야기 창을 연다. 다른 곳은 원래대로 걸어간다.
bindInput({walkTo:cell=>results.isAlienHere(cell)?results.openStory():navigation.walkTo(cell)});
// 루트 목록의 단어 → 그 외계인에게 걸어간다(다른 섬이어도). 여정을 만드는 중에는 무시한다.
bindRouteList(index=>{const node=state.nodes[index];if(node&&!state.busy)navigation.walkTo(nodeCell(node));});
const followEl=document.getElementById('follow'),sideEl=document.getElementById('side'),topEl=document.getElementById('top');
followEl.addEventListener('click',()=>{if(state.walker)resumeTracking(state.walker);});
// '캐릭터로 돌아가기'는 캐릭터가 지구 뒤편이거나 보이는 영역(상단 바·오른쪽 패널 제외) 밖일 때만 보인다
function updateFollow() {
  let out=false;
  if(state.walker) {
    const p=project(state.walker);
    out=!p||p.x*PX<0||p.x*PX>innerWidth-sideEl.offsetWidth||p.y*PX<topEl.offsetHeight||p.y*PX>innerHeight;
  }
  if(followEl.hidden===out)followEl.hidden=!out;
}
addEventListener('pagehide',flushMovementSave);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flushMovementSave();});
bindSearch(journey.run);
function frame(time) {
  const {follow,canStep}=tickAnimation(time);
  if(follow)followWalker(follow);
  if(canStep) {
    const step=nextWalkStep();if(step!==undefined)navigation.step(step);
  }
  if(tickCamera(time))requestRedraw();
  if(consumeRedraw()){render(time,drawLabels);updateFollow();}
  mission.tick(time);
  requestAnimationFrame(frame);
}
// 숨겨진 창에서 열리면 크기가 0이라 지구를 그릴 수 없다. 창에 크기가 생기면 그때 시작한다.
function start() {
  resize();initializeWalker();initializeCamera(state.walker);requestAnimationFrame(frame);
}
if(innerWidth&&innerHeight)start();
else addEventListener('resize',function waitForSize() {
  if(innerWidth&&innerHeight){removeEventListener('resize',waitForSize);start();}
});
arrive();
state.trip.forEach(async index=>{
  const node=state.nodes[index];
  if(!node.d){updateNodeDescription(index,await describe(node.lang,node.t));showChain();}
});
