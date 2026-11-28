// 상단 오른쪽 '관심·메모' 버튼 + 하트한 단어와 메모를 모아 보는 대화상자.
import {state} from '../core/state.js';
import {listInterests} from '../core/interests.js';

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const item=e=>`<li><div class="c-word"><span class="c-heart${e.heart?' on':''}" aria-label="${e.heart?'관심 표시함':'관심 표시 안 함'}">${e.heart?'♥':'♡'}</span><b>${esc(e.t)}</b></div>${e.memo.trim()?`<p class="c-memo">${esc(e.memo)}</p>`:''}</li>`;

export function createCollection() {
  const button=document.createElement('button');
  button.type='button';button.className='c-open';button.textContent='관심·메모';
  document.getElementById('top')?.append(button);

  const box=document.createElement('div');
  box.className='d-report c-box';box.hidden=true;
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','관심·메모');
  document.body.append(box);

  function open() {
    const list=listInterests(),used=new Set();
    const groups=(state.journeys??[]).map((journey,index)=>{
      const rows=[];
      for(const i of journey.trip??[]) {
        const n=state.nodes[i];if(!n)continue;
        const e=list.find(x=>x.t===n.t&&x.lang===n.lang);
        if(e&&!used.has(e)){used.add(e);rows.push(e);}
      }
      // 루트 색은 묶음 전체에 준다: 제목과 항목 왼쪽 줄이 같은 루트 색 (패널 루트 목록과 같게)
      return rows.length?`<section class="journey-group" style="--route-color:${journey.color||'var(--ui)'}"><h3>${esc(journey.start||'탐사')}</h3><ul>${rows.map(item).join('')}</ul></section>`:'';
    }).join('');
    const rest=list.filter(e=>!used.has(e));
    const other=rest.length?`<section class="journey-group" style="--route-color:var(--dim)"><h3>루트 밖</h3><ul>${rest.map(item).join('')}</ul></section>`:'';
    box.innerHTML=`<div class="d-card"><h2>관심·메모</h2>
      ${list.length?groups+other:'<p class="c-empty">아직 관심 표시나 메모가 없다.</p>'}
      <button type="button" class="d-continue c-close">닫기</button></div>`;
    box.hidden=false;box.querySelector('.c-close').focus({preventScroll:true});
    box.querySelector('.c-close').onclick=close;
  }
  function close() { box.hidden=true;button.focus({preventScroll:true}); }
  box.addEventListener('click',event=>{if(event.target===box)close();});
  addEventListener('keydown',event=>{if(event.key==='Escape'&&!box.hidden)close();});
  button.addEventListener('click',open);
  return {open,close};
}
