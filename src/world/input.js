import {state} from '../core/state.js';
import {vec,nodeCell,DEG} from '../core/grid.js';
import {cv,PX,view,resize,project,unproject,pose} from './renderer.js';
import {KEYV} from './navigation.js';
import {wikiLink} from '../ui/results.js';
export function bindInput(navigation,keys) {
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = (e.clientX - drag.x) / PX, dy = (e.clientY - drag.y) / PX;
    drag.x = e.clientX; drag.y = e.clientY;
    view.lon = view.tLon = view.lon - dx / view.R * DEG;
    view.lat = view.tLat = Math.max(-85, Math.min(85, view.lat + dy / view.R * DEG));
    state.dirty = true;
  });
  cv.addEventListener('pointerup', e => {
    // a click (not a drag) on a drawn tile → walk there
    if (drag && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5 && state.here >= 0 && !state.revealing) {
      let c = unproject(e.clientX, e.clientY);
      // a building stands above its tile, so a click on the sprite counts too
      for (const n of state.nodes) {
        const p = project(vec(n.lat, n.lon)); if (!p) continue;
        const f = pose(p, n), mx = f.bx + f.ux * f.h / 2, my = f.by + f.uy * f.h / 2;
        if (Math.hypot(e.clientX / PX - mx, e.clientY / PX - my) < f.h * 0.6) c = nodeCell(n);
      }
      navigation.walkTo(c);
    }
    drag = null;
  });
  cv.addEventListener('pointercancel', () => { drag = null; });
  addEventListener('wheel', e => {
    // Scrolling the route panel must not also zoom the globe.
    if (e.target.closest?.('#side, #resultActions')) return;
    e.preventDefault();
    view.tR = Math.max(25, Math.min(1400, view.tR * Math.exp(-e.deltaY * 0.0015)));
  }, { passive: false });
  addEventListener('resize', resize);
  addEventListener('keydown', e => {
    // Let links/buttons keep native Enter/Space behavior, especially the image link.
    if (e.target.closest?.('input, textarea, select, button, a, [contenteditable="true"]')) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (KEYV[k]) { keys.add(k); e.preventDefault(); }
    if (k === 'Enter' && !wikiLink.closest('[hidden]')) wikiLink.click();
  });
  addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
  addEventListener('blur', () => keys.clear());
}
