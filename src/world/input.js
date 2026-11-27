import {state,requestRedraw} from '../core/state.js';
import {vec,nodeCell} from '../core/grid.js';
import {cv,PX,resize,project,unproject,pose} from './renderer.js';
import {rotateCamera,zoomCamera} from './camera.js';
export function bindInput(navigation) {
  let drag = null;
  cv.addEventListener('pointerdown', e => { if(e.button!==0)return; drag = { pointerId:e.pointerId, moved:false, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!drag||drag.pointerId!==e.pointerId) return;
    if(!drag.moved) {
      if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<5)return;
      drag.moved=true;
    }
    const dx = (e.clientX - drag.x) / PX, dy = (e.clientY - drag.y) / PX;
    drag.x = e.clientX; drag.y = e.clientY;
    rotateCamera(dx,dy);requestRedraw();
  });
  cv.addEventListener('pointerup', e => {
    if(!drag||drag.pointerId!==e.pointerId)return;
    // a click (not a drag) on a drawn tile → walk there
    if (drag && !drag.moved && state.here >= 0 && !state.revealing && !document.body.classList.contains('results-open')) {
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
    if(cv.hasPointerCapture(e.pointerId))cv.releasePointerCapture(e.pointerId);
  });
  cv.addEventListener('pointercancel', () => { drag = null; });
  cv.addEventListener('wheel', e => {
    // Scrolling the route panel must not also zoom the globe.
    if (e.target.closest?.('#side, #resultActions')) return;
    e.preventDefault();
    zoomCamera(e.deltaY);
  }, { passive: false });
  addEventListener('resize', resize);
  cv.addEventListener('lostpointercapture', () => { drag = null; });
}
