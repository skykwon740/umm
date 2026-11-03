import {state,load,save} from './core/state.js';
import {vec,ll,cellVec,nodeCell} from './core/grid.js';
import {view,resize,walkR,render,project} from './world/renderer.js';
import {createNavigation} from './world/navigation.js';
import {bindInput} from './world/input.js';
import {createJourney} from './journey.js';
import {createResults,drawLabels} from './ui/results.js';
import {describe} from './content/wikipedia.js';
import {showChain} from './ui/panel.js';

load();
const keys=new Set();
const results=createResults((title,lang)=>journey.run(title,lang));
const journey=createJourney(results.arrive);
const navigation=createNavigation({project,onArrive:results.arrive,keys});
bindInput(navigation,keys);
const qEl=document.getElementById('q');
document.getElementById('bar').addEventListener('submit',e=>{e.preventDefault();qEl.blur();journey.run(qEl.value);});
function frame(t) {
  const on = Math.floor(t / 450) % 2 === 0;
  if (on !== state.blinkOn) { state.blinkOn = on; if (state.route.length) state.dirty = true; }
  const k = 0.12;
  if (state.walker && state.here >= 0 && !state.revealing) {
    const target = cellVec(state.here);
    const d = Math.hypot(target[0]-state.walker[0], target[1]-state.walker[1], target[2]-state.walker[2]);
    if (d > 1e-4) {
      state.walker = state.walker.map((x, i) => x + (target[i] - x) * 0.35); const m = Math.hypot(...state.walker); state.walker = state.walker.map(x => x / m);
      const [la, lo] = ll(state.walker); view.tLat = la; view.tLon = lo; state.dirty = true;
    }
    if (t - state.lastStep > 110) {
      if (!navigation.keyStep() && state.walkPath.length) navigation.step(state.walkPath.shift());
    }
    if (t - state.lastStep < 300) state.dirty = true;
  }
  let dl = ((view.tLon - view.lon + 540) % 360) - 180;
  if (Math.abs(dl) > 0.01 || Math.abs(view.tLat - view.lat) > 0.01 || Math.abs(view.tR - view.R) > 0.1) {
    view.lon += dl * k; view.lat += (view.tLat - view.lat) * k; view.R += (view.tR - view.R) * k; state.dirty = true;
  }
  if (state.dirty) { render(t,drawLabels); state.dirty = false; }
  requestAnimationFrame(frame);
}
resize();
// always start with the character standing at the centre of the screen
const last = state.nodes[state.nodes.length - 1];
if (state.here < 0 && last) state.here = nodeCell(last);
state.walker = state.here >= 0 ? cellVec(state.here) : vec(view.lat, view.lon);
[view.lat, view.lon] = ll(state.walker); view.tLat = view.lat; view.tLon = view.lon;
if (state.nodes.length) view.R = view.tR = walkR();
results.arrive();
// trips saved before descriptions existed
state.trip.forEach(async i => { const n = state.nodes[i]; if (!n.d) { n.d = await describe(n.lang, n.t); save(); showChain(); } });
requestAnimationFrame(frame);
