import {state,load,initializeWalker,tickAnimation,nextWalkStep,requestRedraw,consumeRedraw,updateNodeDescription,flushMovementSave} from './core/state.js';
import {resize,render,project} from './world/renderer.js';
import {initializeCamera,focusCamera,followWalker,tickCamera,resumeTracking} from './world/camera.js';
import {createNavigation} from './world/navigation.js';
import {bindInput} from './world/input.js';
import {nodeCell} from './core/grid.js';
import {loadInterests} from './core/interests.js';
import {createMemo} from './ui/memo.js';
import {createJourney} from './journey.js';
import {createResults,drawLabels,hideResults} from './ui/results.js';
import {describe} from './content/wikipedia.js';
import {showChain,setStatus,setJourneyBusy,bindSearch} from './ui/panel.js';
import {emit} from './core/events.js';
import {createMission} from './ui/mission.js';

load();
loadInterests();
const memo=createMemo();
let next=null;   // 가족을 고른 뒤 걸어가야 할 외계인
const results=createResults({
  onRestart:(title,lang)=>journey.run(title,lang),
  async onChoose(from,family) {
    const node=await journey.extend(family.t,from.lang,family.d);
    if(node){next=node;setStatus(node.t+'에게 가는 길이 열렸어요. 파란 길을 따라 걸어가세요.');}
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
const navigation=createNavigation({project,onArrive:arrive,onMessage:setStatus});
// 서 있는 외계인을 클릭하면 이야기 창을 연다. 다른 곳은 원래대로 걸어간다.
bindInput({walkTo:cell=>results.isAlienHere(cell)?results.openStory():navigation.walkTo(cell)});
document.getElementById('follow').addEventListener('click',()=>{if(state.walker)resumeTracking(state.walker);});
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
  if(consumeRedraw())render(time,drawLabels);
  mission.tick(time);
  requestAnimationFrame(frame);
}
// 숨겨진 창에서 열리면 크기가 0이라 지구를 그릴 수 없다. 창에 크기가 생기면 그때 시작한다.
function start() {
  resize();initializeWalker();initializeCamera(state.walker,state.nodes.length>0);requestAnimationFrame(frame);
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
