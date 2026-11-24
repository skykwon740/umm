import {state,ENTERED,requestRedraw,visitCurrent,awakenCurrentNode} from '../core/state.js';
import {vec, nodeCell,cellVec} from '../core/grid.js';
import {cellPx, project, pose, PX} from '../world/renderer.js';
import {esc, showChain, setStoryOpen} from './panel.js';
import {createStory} from './story.js';
import {createViewer} from './viewer.js';
import {flushMemo} from './memo.js';
const labelsEl=document.getElementById('labels');
let lastLabels='';
const resultEl=document.getElementById('resultActions'),viewerEl=document.getElementById('viewer');
const wikiButton=document.getElementById('openWiki'),imageButton=document.getElementById('openImages');
const titleEl=document.getElementById('resultTitle'),closeStoryEl=document.getElementById('closeStory');
let story,autoKey=null;
const keyOf=n=>n.lang+':'+n.t;
const nodeHere=()=>state.nodes.find(m=>nodeCell(m)===state.here);
// 새 여정이 시작되면 정보창을 닫는다. 서 있던 외계인 앞에서 저절로 다시 열리지는 않는다
export function hideResults(){story?.close();resultEl.hidden=true;const n=nodeHere();autoKey=n?keyOf(n):null;}
// 외계인 칸에 도착하면 정보창이 저절로 열린다. 닫은 뒤에는 서 있는 외계인을 클릭하면 다시 열린다
export function createResults({onChoose,onFirstContact}) {
  const viewer=createViewer({onChange(kind){
    wikiButton.setAttribute('aria-expanded',String(kind==='wiki'));
    imageButton.setAttribute('aria-expanded',String(kind==='images'));
    requestRedraw();
  }});
  story=createStory({
    onChoose,onFirstContact(n){showChain();onFirstContact?.(n);},
    onToggle(open){
      if(open)awakenCurrentNode();
      else{viewer.close();flushMemo();}
      resultEl.hidden=!open;resultEl.classList.toggle('open',open);
      setStoryOpen(open);requestRedraw();
      // 창 자체로 초점을 옮긴다. 버튼으로 옮기면 창을 연 Enter가 그 버튼까지 눌러 버린다
      if(open)document.getElementById('story').focus();
    },
  });
  function arrive() {
    const n=nodeHere(),key=n?keyOf(n):null;
    if(story.node&&key!==keyOf(story.node))story.close();
    // 걷는 도중 지나는 칸이나 여정이 진행 중일 때는 열지 않는다
    if(key!==autoKey) {
      if(n&&state.walkPath.length===0&&!state.busy){autoKey=key;story.open(n);}
      else autoKey=null;
    }
    requestRedraw();
    if(n) {
      titleEl.textContent=n.t;
      wikiButton.setAttribute('aria-label',n.t+' 위키백과 원문 보기');
      imageButton.setAttribute('aria-label',n.t+' 이미지 보기');
    }
    showChain();
  }
  function openStory(){const n=nodeHere();if(n&&!state.busy)story.open(n);}
  function enter(){
    if(visitCurrent())showChain();
  }
  for(const [button,kind] of [[wikiButton,'wiki'],[imageButton,'images']]) {
    button.addEventListener('click',()=>{
      const n=nodeHere();if(!n||!story.node)return;
      enter();viewer.toggle(kind,n,button);
    });
  }
  closeStoryEl.addEventListener('click',()=>story.close());
  addEventListener('keydown',event=>{if(event.key==='Escape'&&story.node)story.close();});
  // 요약·후보가 들어오거나 작은 화면을 접고 펴서 크기가 바뀌면 바로 자리를 다시 잡는다
  new ResizeObserver(requestRedraw).observe(resultEl);
  // 지금 서 있는 외계인을 클릭했는지
  const isAlienHere=cell=>cell===state.here&&Boolean(nodeHere());
  return {arrive,openStory,isAlienHere};
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
    const f = pose(p, n), reach = f.h + 3;
    const lx = f.bx + f.ux * reach, ly = f.by + f.uy * reach;
    if (nodeCell(n) === state.here && !resultEl.hidden) { placeOpen(lx * PX, ly * PX, (p.y + cellPx() * 0.25) * PX + 8); return; }   // the open window takes the label's place
    html += `<span class="${cls}" style="left:${lx*PX}px;top:${ly*PX - 4}px">${esc(n.t)}</span>`;
  });
  const destination=state.walkPath.at(-1);
  if(destination!==undefined) {
    const p=project(cellVec(destination));
    if(p)html+=`<span class="lb destination" style="left:${p.x*PX}px;top:${p.y*PX}px">◎ 목적지</span>`;
  }
  if(lastLabels!==html){labelsEl.innerHTML=html;lastLabels=html;}
}
// the info window floats over the building, kept inside the area the panels leave free.
// An open window goes above the label, else below the character, else beside the alien so it stays in sight.
function placeOpen(x, y, below) {
  const w = resultEl.offsetWidth, h = resultEl.offsetHeight, side = document.getElementById('side').offsetWidth;
  const top = document.getElementById('top').offsetHeight;
  resultEl.style.visibility = 'visible';
  if (resultEl.classList.contains('open') && innerWidth <= 600) { resultEl.style.left = resultEl.style.top = ''; return; }   // bottom sheet
  // the viewer overlay sits over the right edge; keep the window clear of it
  const right = innerWidth - (viewerEl.hidden ? side : Math.max(side, viewerEl.offsetWidth + 16)), clampX = v => Math.max(w/2 + 8, Math.min(right - w/2 - 8, v));
  if (!resultEl.classList.contains('open')) {
    resultEl.style.left = clampX(x) + 'px';
    resultEl.style.top = Math.max(top + h + 8, Math.min(innerHeight - 8, y)) + 'px'; return;
  }
  const minY = top + 8, maxY = innerHeight - 8, gap = 40;
  let left = x, boxTop;
  if (y - h >= minY) boxTop = y - h;
  else if (below + h <= maxY) boxTop = below;
  else {
    boxTop = Math.max(minY, Math.min(maxY - h, (y + below) / 2 - h / 2));
    if (x + gap + w <= right - 8) left = x + gap + w / 2;
    else if (x - gap - w >= 8) left = x - gap - w / 2;
  }
  resultEl.style.left = clampX(left) + 'px';
  resultEl.style.top = boxTop + 'px';
}

export {drawLabels};
