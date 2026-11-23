import {state,load,initializeWalker,tickAnimation,nextWalkStep,requestRedraw,consumeRedraw,updateNodeDescription} from './core/state.js';
import {nodeCell} from './core/grid.js';
import {resize,render,project} from './world/renderer.js';
import {initializeCamera,focusCamera,followWalker,tickCamera} from './world/camera.js';
import {createNavigation} from './world/navigation.js';
import {bindInput} from './world/input.js';
import {createJourney} from './journey.js';
import {createResults,drawLabels,hideResults} from './ui/results.js';
import {describe} from './content/wikipedia.js';
import {showChain,setStatus,setJourneyBusy,bindSearch} from './ui/panel.js';

load();
const keys=new Set();
let next=null;   // 가족을 고른 뒤 걸어가야 할 외계인
const results=createResults({
  onRestart:(title,lang)=>journey.run(title,lang),
  async onChoose(from,family) {
    const node=await journey.extend(family.t,from.lang,family.d);
    if(node){next=node;setStatus(node.t+'에게 가는 길이 열렸어요. 파란 길을 따라 걸어가세요.');}
  },
});
function arrive() {
  results.arrive();
  if(next&&nodeCell(next)===state.here){next=null;setStatus();}
}
const journey=createJourney({
  onStart(){hideResults();setStatus();setJourneyBusy(true);next=null;},
  onChange:showChain,onFocus:focusCamera,onArrive:arrive,onMessage:setStatus,
  onFinish(){setJourneyBusy(false);},
});
const navigation=createNavigation({project,onArrive:arrive,keys});
// 서 있는 외계인을 클릭하면 이야기 창을 연다. 다른 곳은 원래대로 걸어간다.
bindInput({walkTo:cell=>results.isAlienHere(cell)?results.openStory():navigation.walkTo(cell)},keys,results.openDefault);
bindSearch(journey.run);
function frame(time) {
  const {follow,canStep}=tickAnimation(time);
  if(follow)followWalker(follow);
  if(canStep&&!navigation.keyStep()) {
    const step=nextWalkStep();if(step!==undefined)navigation.step(step);
  }
  if(tickCamera())requestRedraw();
  if(consumeRedraw())render(time,drawLabels);
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
results.arrive();
state.trip.forEach(async index=>{
  const node=state.nodes[index];
  if(!node.d){updateNodeDescription(index,await describe(node.lang,node.t));showChain();}
});
