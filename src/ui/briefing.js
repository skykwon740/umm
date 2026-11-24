// 게임 시작 전 임무 브리핑: 계급 제도를 먼저 보여 주고 [임무 수락]으로 튜토리얼을 시작한다.
import {RANKS} from '../core/ranks.js';
import {drawBadge,RULES_HTML} from './ending.js';

export function createBriefing() {
  const root=document.createElement('div');
  root.className='d-report d-briefing';root.hidden=true;
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','임무 브리핑');
  const last=RANKS.length-1;
  root.innerHTML=`<div class="d-card">
    <h2>임무 브리핑</h2>
    <p class="d-lead">우주인, 이 행성에서 너의 지위는 <b>계급</b>으로 정해진다.<br>
      외계인을 많이 만날수록 계급이 오른다.</p>
    <div class="d-path">
      <figure><canvas width="64" height="80" aria-hidden="true"></canvas><figcaption><small>지금</small>${RANKS[0].name}</figcaption></figure>
      <span class="d-arrow" aria-hidden="true">▶ ▶ ▶</span>
      <figure><canvas width="64" height="80" aria-hidden="true"></canvas><figcaption><small>최종 목표</small>${RANKS[last].name}</figcaption></figure>
    </div>
    ${RULES_HTML}
    <ol class="d-ladder">${RANKS.map((rank,i)=>`<li class="${i===0?'now':i===last?'goal':'lock'}">
      <div><span>${i===0||i===last?rank.name:'???'}</span><em>${rank.need}명</em></div>
      <p>${i===0?'여기서 시작한다.':i===last?'모든 가족이 너를 아는 자리.':`외계인 ${rank.need}명을 만나면 공개된다.`}</p></li>`).join('')}</ol>
    <p class="d-hint">현재 계급은 언제든 화면 오른쪽 위에서 확인할 수 있다.</p>
    <button type="button" class="d-continue">임무 수락 · 훈련 시작</button>
  </div>`;
  document.body.append(root);
  const [now,goal]=root.querySelectorAll('canvas');
  drawBadge(now,0);drawBadge(goal,last);

  // resolves when the player accepts
  function open() {
    root.hidden=false;root.querySelector('.d-card').scrollTop=0;
    const button=root.querySelector('.d-continue');button.focus({preventScroll:true});
    return new Promise(resolve=>{button.onclick=()=>{root.hidden=true;resolve();};});
  }
  return {open,isOpen:()=>!root.hidden};
}
