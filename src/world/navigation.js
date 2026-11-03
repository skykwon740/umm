import {RAD, cellVec} from '../core/grid.js';
import {state, PLAN, ROAD, save} from '../core/state.js';
export const KEYV={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};
const NEAR=Math.cos(6*RAD);
export function createNavigation({project,onArrive,keys}) {
  function neighbours(c, drawn) {
    const a = cellVec(c);
    return drawn.filter(d => { if (d === c) return false; const b = cellVec(d); return a[0]*b[0] + a[1]*b[1] + a[2]*b[2] > NEAR; });
  }
  const drawnCells = () => { const out = []; state.cells.forEach((t, c) => { if (t) out.push(c); }); return out; };
  // breadth-first from `here`, up to `depth` steps → Map(cell → previous cell)
  function explore(depth) {
    const drawn = drawnCells(), prev = new Map([[state.here, -1]]);
    let edge = [state.here];
    for (let d = 0; d < depth && edge.length; d++) {
      const next = [];
      for (const c of edge) for (const n of neighbours(c, drawn)) if (!prev.has(n)) { prev.set(n, c); next.push(n); }
      edge = next;
    }
    return { prev, edge };
  }
  // route tiles from a (exclusive) to b, forwards or backwards; a tile can appear twice if the route crosses itself
  function alongRoute(a, b) {
    let from = -1, to = -1;
    state.route.forEach((x, i) => { if (x === a) state.route.forEach((y, j) => {
      if (y === b && (from < 0 || Math.abs(i - j) < Math.abs(from - to))) { from = i; to = j; }
    }); });
    return from < to ? state.route.slice(from + 1, to + 1) : state.route.slice(to, from).reverse();
  }
  function walked(c) { state.guide[c] = 0; if (state.cells[c] === PLAN) state.cells[c] = ROAD; }
  function step(to) {
    const pa = project(cellVec(state.here)), pb = project(cellVec(to));
    if (pa && pb && Math.abs(pb.x - pa.x) > 0.5) state.facing = pb.x > pa.x ? 1 : -1;
    // a diagonal step can cut a corner of the route: count the tile it skipped as walked
    const a = state.route.indexOf(state.here), b = state.route.indexOf(to);
    if (a >= 0 && b >= 0 && Math.abs(a - b) <= 3) for (let i = Math.min(a, b); i <= Math.max(a, b); i++) walked(state.route[i]);
    state.here = to; state.lastStep = performance.now();
    walked(state.here);
    save(); onArrive();
  }
  function keyStep() {
    let kx = 0, ky = 0;
    for (const k of keys) if (KEYV[k]) { kx += KEYV[k][0]; ky += KEYV[k][1]; }
    if (!kx && !ky) return false;
    const p = project(cellVec(state.here)); if (!p) return false;
    // compare with the general heading a few tiles ahead, so diagonal zigzags still follow one key
    const { prev } = explore(4);
    let best = -1, bestDot = 0.25;
    for (const c of prev.keys()) {
      if (c === state.here) continue;
      const q = project(cellVec(c)); if (!q) continue;
      const vx = q.x - p.x, vy = q.y - p.y, m = Math.hypot(vx, vy) * Math.hypot(kx, ky) || 1;
      const d = (vx*kx + vy*ky) / m;
      if (d > bestDot) { bestDot = d; best = c; }
    }
    if (best >= 0) {
      while (prev.get(best) !== state.here) best = prev.get(best);
      state.walkPath = []; step(best);
    }
    return true;
  }

  function walkTo(c) {
    if(c<0||!state.cells[c]||c===state.here)return;
    const {prev}=explore(state.cells.length);
    if(prev.has(c)){
      const shortest=to=>{const p=[];for(let k=to;k!==state.here;k=prev.get(k))p.unshift(k);return p;};
      const entry=state.route.includes(c)?[...prev.keys()].find(k=>state.route.includes(k)):undefined;
      state.walkPath=entry===undefined?shortest(c):[...shortest(entry),...alongRoute(entry,c)];
    }else{state.walkPath=[];state.here=c;save();onArrive();}
  }
  return {step,keyStep,walkTo};
}
