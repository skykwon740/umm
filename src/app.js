import {state,load,initializeWalker,tickAnimation,nextWalkStep,requestRedraw,consumeRedraw,updateNodeDescription} from './core/state.js';
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
const results=createResults((title,lang)=>journey.run(title,lang));
const journey=createJourney({
  onStart(){hideResults();setStatus();setJourneyBusy(true);},
  onChange:showChain,onFocus:focusCamera,onArrive:results.arrive,onMessage:setStatus,
  onFinish(){setJourneyBusy(false);},
});
const navigation=createNavigation({project,onArrive:results.arrive,keys});
bindInput(navigation,keys,results.openDefault);bindSearch(journey.run);
function frame(time) {
  const {follow,canStep}=tickAnimation(time);
  if(follow)followWalker(follow);
  if(canStep&&!navigation.keyStep()) {
    const next=nextWalkStep();if(next!==undefined)navigation.step(next);
  }
  if(tickCamera())requestRedraw();
  if(consumeRedraw())render(time,drawLabels);
  requestAnimationFrame(frame);
}
resize();initializeWalker();initializeCamera(state.walker,state.nodes.length>0);
results.arrive();
state.trip.forEach(async index=>{
  const node=state.nodes[index];
  if(!node.d){updateNodeDescription(index,await describe(node.lang,node.t));showChain();}
});
requestAnimationFrame(frame);
