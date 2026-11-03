import { FACE } from './grid.js';
export const UNKNOWN=0, PLAN=1, ROAD=2, BLDG=3, ENTERED=4, GUIDE=5, GUIDE_OFF=6;
// Shared explorer state. UI and renderer read this; journey/navigation own mutations.
export const state = {
  cells: new Uint8Array(6 * FACE), guide: new Uint8Array(6 * FACE),
  nodes: [], trip: [], route: [], here: -1, walkPath: [],
  dirty: true, walker: null, facing: 1, lastStep: -1e9, blinkOn: true,
  revealing: false, pending: false, upcoming: null, holding: false, busy: false,
};
function save() {
  try { localStorage.setItem('webglobe3', JSON.stringify({ c: Array.from(state.cells).join(''), n: state.nodes, r: state.route, t: state.trip, h: state.here, g: state.route.filter(c => state.guide[c]) })); } catch {}
}
function load() {
try {
  const s = JSON.parse(localStorage.getItem('webglobe3'));
  if (s && s.c.length === state.cells.length) {
    state.nodes = s.n || []; state.route = s.r || []; state.trip = s.t || [];
    state.here = s.h ?? state.route[s.a ?? 0] ?? -1;
    (s.g ?? state.route.filter(c => +s.c[c] === PLAN)).forEach(c => state.guide[c] = 1);
    for (let k = 0; k < s.c.length; k++) state.cells[k] = +s.c[k] === PLAN && !state.route.length ? UNKNOWN : +s.c[k];
  }
} catch {}
}

export {save, load};
