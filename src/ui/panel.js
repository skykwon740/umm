import {state, BLDG, ENTERED, ROAD, routeColor} from '../core/state.js';
import {nodeCell} from '../core/grid.js';
export const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const chainEl=document.getElementById('chain'),pctEl=document.getElementById('pct');
const meterEl=document.querySelector('#meter i'),hintEl=document.getElementById('hint');
export function setStatus(message='') { document.getElementById('status').textContent=message; }
export function setJourneyBusy(busy) { document.getElementById('goBtn').disabled=busy; }
export function bindSearch(onSearch) {
  const input=document.getElementById('q');
  input.addEventListener('input',()=>{document.getElementById('searchCount').textContent=`${input.value.length}/100`;});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.isComposing)event.preventDefault();});
  document.getElementById('bar').addEventListener('submit',event=>{
    event.preventDefault();if(state.busy)return;
    const query=input.value.trim();
    if(!query||query.length>100){setStatus('관심사를 1~100자로 입력해 주세요.');input.focus();return;}
    input.blur();onSearch(query);
  });
}
// 루트 목록의 단어를 누르면(마우스·키보드) 그 외계인에게 걸어간다
export function bindRouteList(onPick) {
  chainEl.addEventListener('click',event=>{
    const button=event.target.closest?.('button[data-node]');
    if(button)onPick(Number(button.dataset.node));
  });
}
function showChain() {
  const row = (n, i, cls, color) => `<li class="${cls}" style="--route-color:${color}"><button type="button" data-node="${i}">${esc(n.t)}</button>${n.d ? `<p>${esc(n.d)}</p>` : ''}</li>`;
  const groups = (state.journeys??[]).map((journey,index) => {
    const color=journey.color||routeColor(index);
    const rows=(journey.trip??[]).map(i=>{
      const n=state.nodes[i];if(!n)return '';
      const c=nodeCell(n),cls=c===state.here?'here':state.cells[c]===ENTERED?'in':'';
      return row(n,i,cls,color);
    });
    return rows.length?`<section class="journey-group"><h3 style="--route-color:${color}">${esc(journey.start||'탐사')}</h3><ol>${rows.join('')}</ol></section>`:'';
  }).join('');
  chainEl.innerHTML = groups || (state.pending ? '…' : '');
  let n = 0; for (const c of state.cells) if (c >= ROAD) n++;
  const pct = n / state.cells.length * 100;
  pctEl.textContent = pct.toFixed(2) + '%';
  meterEl.style.width = n ? `max(2px, ${pct}%)` : '0';
  showHint();
}
let storyOpen = false;
export function setStoryOpen(open) { storyOpen = open; showHint(); }
// controls for the current stage only
function showHint() {
  const onNode = state.nodes.some(n => nodeCell(n) === state.here);
  const look = [['드래그', '회전'], ['휠', '확대']];
  let items;
  if (state.holding) items = [['', '새 외계인 발견']];
  else if (state.pending) items = [['', '루트 찾는 중…']];
  else if (state.here < 0) items = [['클릭', '관심사 입력 후 출발'], ...look];
  else if (onNode && storyOpen) items = [['', '가족 후보를 고르면 그 외계인까지 길이 열림'], ['Esc', '이야기 닫기']];
  else if (onNode) items = [['클릭', '외계인을 눌러 이야기 듣기'], ['클릭', '길이나 외계인으로 이동']];
  else if (state.cells[state.route.at(-1)] === BLDG) items = [['클릭', '파란 길을 따라 다음 외계인에게'], ...look];
  else items = [['클릭', '길이나 외계인으로 이동'], ...look];
  hintEl.innerHTML = items.map(([k, t]) => `<span>${k ? `<kbd>${k}</kbd>` : ''}${t}</span>`).join('');
}

export {showChain, showHint};
