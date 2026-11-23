import {state,ENTERED,requestRedraw,visitCurrent} from '../core/state.js';
import {vec, nodeCell} from '../core/grid.js';
import {cellPx, project, pose, PX, FLAG_SPRITE} from '../world/renderer.js';
import {wikiURL, imageSearchURL} from '../content/result-links.js';
import {esc, showChain, setStoryOpen} from './panel.js';
import {createStory} from './story.js';
const labelsEl=document.getElementById('labels');
const resultEl=document.getElementById('resultActions'),againEl=document.getElementById('again');
const wikiLink=document.getElementById('openWiki');
const imageLink=document.getElementById('openImages'),titleEl=document.getElementById('resultTitle');
const openStoryEl=document.getElementById('openStory'),closeStoryEl=document.getElementById('closeStory');
let story;
export function hideResults(){story?.close();resultEl.hidden=againEl.hidden=true;}
const nodeHere=()=>state.nodes.find(m=>nodeCell(m)===state.here);
// 외계인 앞에 도착하면 이름과 '이야기 듣기'가 뜨고, 누르면 같은 자리에서 이야기 창으로 펼쳐진다
export function createResults({onRestart,onChoose,onFirstContact}) {
  story=createStory({
    onChoose,onFirstContact(n){showChain();onFirstContact?.(n);},
    onToggle(open){
      resultEl.classList.toggle('open',open);openStoryEl.hidden=open;closeStoryEl.hidden=!open;
      setStoryOpen(open);requestRedraw();
      // 창 자체로 초점을 옮긴다. 버튼으로 옮기면 창을 연 Enter가 그 버튼까지 눌러 버린다
      if(open)document.getElementById('story').focus();
    },
  });
  function arrive() {
    const n=nodeHere();
    if(story.node&&(!n||n.t!==story.node.t||n.lang!==story.node.lang))story.close();
    resultEl.hidden=againEl.hidden=!n;requestRedraw();
    if(n){
      titleEl.textContent=n.t;
      wikiLink.href=wikiURL(n);imageLink.href=imageSearchURL(n);
      wikiLink.setAttribute('aria-label',n.t+' 위키백과 원문 열기 (새 탭)');
      imageLink.setAttribute('aria-label',n.t+' 구글 이미지 검색 (새 탭)');
      openStoryEl.setAttribute('aria-label',n.t+' 이야기 듣기');
      againEl.onclick=()=>onRestart(n.t,n.lang);
    }
    showChain();
  }
  function openStory(){const n=nodeHere();if(n&&!state.busy)story.open(n);}
  function enter(){
    if(visitCurrent())showChain();
  }
  for(const link of [wikiLink,imageLink]){
    link.addEventListener('click',enter);
    link.addEventListener('auxclick',event=>{if(event.button===1)enter();});
  }
  openStoryEl.addEventListener('click',openStory);
  closeStoryEl.addEventListener('click',()=>{story.close();openStoryEl.focus();});
  addEventListener('keydown',event=>{if(event.key==='Escape'&&story.node){story.close();openStoryEl.focus();}});
  // 요약·후보가 들어오거나 작은 화면을 접고 펴서 크기가 바뀌면 바로 자리를 다시 잡는다
  new ResizeObserver(requestRedraw).observe(resultEl);
  function openDefault(){if(!resultEl.hidden)openStory();}
  // 지금 서 있는 외계인을 클릭했는지
  const isAlienHere=cell=>cell===state.here&&Boolean(nodeHere());
  return {arrive,openDefault,openStory,isAlienHere};
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
    if (nodeCell(n) === state.here && !resultEl.hidden) { placeOpen(lx * PX, ly * PX, (p.y + cellPx() * 0.25) * PX + 8); return; }   // the button takes the label's place
    html += `<span class="${cls}" style="left:${lx*PX}px;top:${ly*PX - 4}px">${esc(n.t)}</span>`;
  });
  labelsEl.innerHTML = html;
}
// the link button floats over the building, kept inside the area the panels leave free.
// An open story goes above the label, else below the character, else beside the alien so it stays in sight.
function placeOpen(x, y, below) {
  const w = resultEl.offsetWidth, h = resultEl.offsetHeight, side = document.getElementById('side').offsetWidth;
  const top = document.getElementById('top').offsetHeight;
  resultEl.style.visibility = 'visible';
  if (resultEl.classList.contains('open') && innerWidth <= 600) { resultEl.style.left = resultEl.style.top = ''; return; }   // bottom sheet
  const right = innerWidth - side, clampX = v => Math.max(w/2 + 8, Math.min(right - w/2 - 8, v));
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
