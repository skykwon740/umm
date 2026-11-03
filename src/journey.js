import {state,UNKNOWN,PLAN,BLDG,ENTERED,save} from './core/state.js';
import {vec,ll,cellVec,cellOf,slerp,hash,DEG,nodeCell} from './core/grid.js';
import {view,W,H,walkR} from './world/renderer.js';
import {search,describe,pick} from './content/wikipedia.js';
import {hideResults} from './ui/results.js';
import {showChain,setStatus} from './ui/panel.js';
export function createJourney(arrive) {
  function addNode(t, lang, d) {
    let idx = state.nodes.findIndex(n => n.t === t && n.lang === lang);
    if (idx < 0) { const [lat, lon] = ll(cellVec(hash(t) % state.cells.length)); state.nodes.push({ t, lang, lat, lon }); idx = state.nodes.length - 1; }
    if (d) state.nodes[idx].d = d;
    const c = nodeCell(state.nodes[idx]);
    if (state.cells[c] !== ENTERED) state.cells[c] = BLDG;
    if (!state.route.length || state.route[state.route.length - 1] !== c) state.route.push(c);
    state.trip.push(idx); save(); state.dirty = true;
    return state.nodes[idx];
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function reveal(a, b) {
    return new Promise(done => {
      const va = vec(a.lat, a.lon), vb = vec(b.lat, b.lon);
      const ang = Math.acos(Math.max(-1, Math.min(1, va[0]*vb[0] + va[1]*vb[1] + va[2]*vb[2]))) * DEG;
      const n = Math.max(1, Math.ceil(ang * 4)), dur = 600 + ang * 10, t0 = performance.now();
      let s = 0;
      view.tR = Math.min(W, H) * 0.42;
      (function tick(now) {
        const t = Math.min(1, (now - t0) / dur);
        for (; s <= n * t; s++) {
          const p = slerp(va, vb, s / n), c = cellOf(...p);
          if (state.route[state.route.length - 1] !== c) { state.route.push(c); state.guide[c] = 1; if (!state.cells[c]) state.cells[c] = PLAN; }
          const [la, lo] = ll(p); view.tLat = la; view.tLon = lo;
        }
        state.dirty = true;
        if (t < 1) requestAnimationFrame(tick); else done();
      })(t0);
    });
  }
  async function run(q, lang) {
    if (state.busy || !q.trim()) return;
    state.busy = true; hideResults();setStatus();document.getElementById('goBtn').disabled=true;
    for (let k = 0; k < state.cells.length; k++) if (state.cells[k] === PLAN) state.cells[k] = UNKNOWN;
    state.guide.fill(0);
    state.trip = []; state.route = []; state.here = -1; state.walkPath = []; state.walker = null; state.revealing = true; state.pending = true;
    lang = lang || (/[ㄱ-ㅎ가-힣]/.test(q) ? 'ko' : 'en');
    showChain();
    try {
      const first = await search(lang, q);
      if (!first) { setStatus(q+' 문서를 찾지 못했습니다. 다른 관심사를 입력해 주세요.'); return; }
      let cur = addNode(first, lang, await describe(lang, first));
      view.tLat = cur.lat; view.tLon = cur.lon; view.tR = Math.min(W, H) * 0.42;
      showChain();
      const path = [q, first];
      for (let hop = 0; hop < 2; hop++) {
        const [w] = await Promise.all([pick(lang, cur.t, path), wait(500)]);
        if (!w) break;
        path.push(w);
        const [lat, lon] = ll(cellVec(hash(w) % state.cells.length));
        state.upcoming = { t: w, d: await describe(lang, w) };
        showChain();
        await reveal(cur, { lat, lon });
        cur = addNode(w, lang, state.upcoming.d);
        state.upcoming = null;
        showChain();
      }
      if (state.trip.length > 1) {          // stay on the last building a moment, longer for a longer word
        state.holding = true; showChain();
        view.tLat = cur.lat; view.tLon = cur.lon; view.tR = walkR();
        await wait(Math.min(3000, 1300 + cur.t.length * 120));
      }
    } catch (err) {
      console.error(err);setStatus('경로를 불러오지 못했습니다. 연결을 확인하고 다시 출발해 주세요.');
    } finally {
      document.getElementById('goBtn').disabled=false;
      state.pending = false; state.revealing = false; state.busy = false; state.upcoming = null; state.holding = false;
      if (state.route.length) {
        state.here = state.route[0]; state.walker = cellVec(state.here); state.facing = 1;
        const [la, lo] = ll(state.walker); view.tLat = la; view.tLon = lo; view.tR = walkR();
        save(); arrive();
      } else showChain();
    }
  }
  return {run};
}
