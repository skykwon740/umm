import {state, BLDG, ENTERED, save} from '../core/state.js';
import {vec, nodeCell} from '../core/grid.js';
import {cellPx, project, pose, PX, FLAG_SPRITE} from '../world/renderer.js';
import {wikiURL, imageSearchURL} from '../content/result-links.js';
import {esc, showChain} from './panel.js';
const labelsEl=document.getElementById('labels');
const resultEl=document.getElementById('resultActions'),againEl=document.getElementById('again');
export const wikiLink=document.getElementById('openWiki');
const imageLink=document.getElementById('openImages'),titleEl=document.getElementById('resultTitle');
export function hideResults(){resultEl.hidden=againEl.hidden=true;}
export function createResults(onRestart) {
  function arrive() {
    const n=state.nodes.find(m=>nodeCell(m)===state.here);
    resultEl.hidden=againEl.hidden=!n;state.dirty=true;
    if(n){
      titleEl.textContent=n.t;
      wikiLink.href=wikiURL(n);imageLink.href=imageSearchURL(n);
      wikiLink.setAttribute('aria-label',n.t+' 위키백과 열기 (새 탭)');
      imageLink.setAttribute('aria-label',n.t+' 구글 이미지 검색 (새 탭)');
      againEl.onclick=()=>onRestart(n.t,n.lang);
    }
    showChain();
  }
  function enter(){
    if(state.cells[state.here]===BLDG){state.cells[state.here]=ENTERED;save();state.dirty=true;showChain();}
  }
  for(const link of [wikiLink,imageLink]){
    link.addEventListener('click',enter);
    link.addEventListener('auxclick',event=>{if(event.button===1)enter();});
  }
  return {arrive};
}
function drawLabels() {
  const showOld = cellPx() >= 9;
  let html = '';
  resultEl.style.visibility = 'hidden';                 // shown again below if its building is in view
  state.nodes.forEach((n, idx) => {
    const inTrip = state.trip.includes(idx);
    if (!inTrip && !showOld && nodeCell(n) !== state.here) return;
    const p = project(vec(n.lat, n.lon)); if (!p) return;
    const entered = state.cells[nodeCell(n)] === ENTERED;
    const cls = !inTrip ? 'lb old' : entered ? 'lb in' : 'lb';
    const f = pose(p, n), reach = f.h + (entered ? FLAG_SPRITE.length * f.fs : 0) + 3;   // clear the roof / flag
    const lx = f.bx + f.ux * reach, ly = f.by + f.uy * reach;
    if (nodeCell(n) === state.here && !resultEl.hidden) { placeOpen(lx * PX, ly * PX); return; }   // the button takes the label's place
    html += `<span class="${cls}" style="left:${lx*PX}px;top:${ly*PX - 4}px">${esc(n.t)}</span>`;
  });
  labelsEl.innerHTML = html;
}
// the link button floats over the building, kept inside the area the panels leave free
function placeOpen(x, y) {
  const w = resultEl.offsetWidth, h = resultEl.offsetHeight, side = document.getElementById('side').offsetWidth;
  const top = document.getElementById('top').offsetHeight;
  resultEl.style.left = Math.max(w/2 + 8, Math.min(innerWidth - side - w/2 - 8, x)) + 'px';
  resultEl.style.top = Math.max(top + h + 8, Math.min(innerHeight - 8, y)) + 'px';
  resultEl.style.visibility = 'visible';
}

export {drawLabels};
