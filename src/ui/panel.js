import {state, BLDG, ENTERED, ROAD} from '../core/state.js';
import {nodeCell} from '../core/grid.js';
export const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const chainEl=document.getElementById('chain'),pctEl=document.getElementById('pct');
const meterEl=document.querySelector('#meter i'),hintEl=document.getElementById('hint');
export function setStatus(message='') { document.getElementById('status').textContent=message; }
function showChain() {
  const row = (n, cls) => `<li class="${cls}"><span>${esc(n.t)}</span>${n.d ? `<p>${esc(n.d)}</p>` : ''}</li>`;
  const rows = state.trip.map(i => {
    const c = nodeCell(state.nodes[i]);
    return row(state.nodes[i], c === state.here ? 'here' : state.cells[c] === ENTERED ? 'in' : '');
  });
  if (state.upcoming) rows.push(row(state.upcoming, 'drawing'));
  chainEl.innerHTML = rows.length || state.pending ? `<ol>${rows.join('')}</ol>${state.pending && !state.upcoming && !state.holding ? '…' : ''}` : '';
  let n = 0; for (const c of state.cells) if (c >= ROAD) n++;
  const pct = n / state.cells.length * 100;
  pctEl.textContent = pct.toFixed(2) + '%';
  meterEl.style.width = n ? `max(2px, ${pct}%)` : '0';
  showHint();
}
// controls for the current stage only
function showHint() {
  const onNode = state.nodes.some(n => nodeCell(n) === state.here);
  const look = [['드래그', '회전'], ['휠', '확대']];
  let items;
  if (state.holding) items = [['', '마지막 건물 도착']];
  else if (state.pending) items = [['', '루트 찾는 중…']];
  else if (state.here < 0) items = [['Enter', '관심사 입력 후 출발'], ...look];
  else if (onNode && state.cells[state.here] === BLDG) items = [['Enter', '위키백과 열기'], ['', '또는 구글 이미지 선택'], ['↑↓←→', '이동']];
  else if (state.here === state.route[state.route.length - 1]) items = [['', '새 관심사를 입력하거나 이 주소에서 다시 출발']];
  else items = [['↑↓←→', '이동'], ['클릭', '길 위 타일로 이동'], ...look];
  hintEl.innerHTML = items.map(([k, t]) => `<span>${k ? `<kbd>${k}</kbd>` : ''}${t}</span>`).join('');
}

export {showChain, showHint};
