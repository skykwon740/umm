// 진행도 칩 + 탐험 종료 시 계급 결과 화면.
import {state,ROAD} from '../core/state.js';
import {RANKS,rankOf} from '../core/ranks.js';
import {progress} from '../core/progress.js';

// 16×20 helmet badge; v=visor, c=collar, k=crown (top rank only)
const HELMET=[
  '....k..k..k.....','....kk.kk.kk....','....kkkkkkkk....','....kkkkkkkk....',
  '................','.....dddddd.....','...ddwwwwwwdd...','..dwwwwwwwwwwd..',
  '.dwwvvvvvvvvwwd.','.dwvvvvvvvvvvwd.','dwwvvhvvvvvvvwwd','dwwvvvhvvvvvvwwd',
  'dwwvvvvvvvvvvwwd','.dwvvvvvvvvvvwd.','.dwwvvvvvvvvwwd.','..dwwwwwwwwwwd..',
  '...ddwwwwwwdd...','..dddddddddddd..','..dccccccccccd..','..dddddddddddd..',
];
export function drawBadge(canvas,index) {
  const rank=RANKS[index],top=index===RANKS.length-1,s=canvas.width/16,g=canvas.getContext('2d');
  const color={d:'#0b0b10',w:'#e8e4d8',h:'#ffffff',v:rank.visor,c:rank.collar,k:'#ffe066'};
  g.clearRect(0,0,canvas.width,canvas.height);
  HELMET.forEach((row,y)=>[...row].forEach((ch,x)=>{
    if(ch==='.'||(ch==='k'&&!top))return;
    g.fillStyle=color[ch];g.fillRect(x*s,y*s,s,s);
  }));
}
export const RULES_HTML=`<section class="d-rules" aria-label="계급 안내">
  <h3>계급은 이렇게 오른다</h3>
  <ul>
    <li>외계인을 클릭해 <b>이야기를 들으면</b> 1명.</li>
    <li>같은 외계인은 다시 만나도 <b>한 번만</b> 센다.</li>
    <li>보따리를 멘 <b>떠돌이 외계인</b>을 클릭해 접촉해도 1명.</li>
    <li>정해진 숫자만큼 만나면 다음 계급. 아직 못 받은 계급 이름은 비밀이다.</li>
  </ul>
</section>`;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function discovered() {
  let n=0;for(const c of state.cells)if(c>=ROAD)n++;
  return (n/state.cells.length*100).toFixed(2);
}

export function createEnding({onReplayTutorial}={}) {
  // 오른쪽 패널 아래: 탐험 마치기 / 훈련 다시 받기
  const tools=document.createElement('div');tools.className='d-tools';
  tools.innerHTML=`<button type="button" class="d-end">탐험 마치기</button>
    <button type="button" class="d-replay">훈련 다시 받기</button>`;
  document.getElementById('side')?.append(tools);

  const report=document.createElement('div');
  report.className='d-report';report.hidden=true;
  report.setAttribute('role','dialog');report.setAttribute('aria-modal','true');report.setAttribute('aria-label','탐사 보고서');
  document.body.append(report);

  function open() {
    const p=progress(),r=rankOf(p.met),last=!r.next;
    report.innerHTML=`<div class="d-card">
      <h2>탐사 보고서</h2>
      <div class="d-hero"><canvas width="96" height="120" aria-hidden="true"></canvas>
        <div><small>최종 계급</small><strong>${esc(r.rank.name)}</strong>${r.rank.line?`<p>${esc(r.rank.line)}</p>`:''}</div></div>
      <dl class="d-stats">
        <div><dt>만난 외계인</dt><dd>${p.met}명</dd></div>
        <div><dt>떠돌이 외계인</dt><dd>${p.wanderers}명</dd></div>
        <div><dt>밝혀진 행성</dt><dd>${discovered()}%</dd></div>
      </dl>
      <p class="d-next">${last?'더 오를 계급이 없다. 행성 전체가 너의 인맥이다.'
        :`다음 계급 <b>${esc(r.next.name)}</b>까지 외계인 ${r.left}명`}</p>
      ${last?'':`<div class="d-bar"><i style="width:${(r.ratio*100).toFixed(1)}%"></i></div>`}
      ${RULES_HTML}
      <ol class="d-ladder">${RANKS.map((rank,i)=>`<li class="${i<r.index?'got':i===r.index?'now':'lock'}">
        <div><span>${i<=r.index?esc(rank.name):'???'}</span><em>${rank.need}명</em></div>
        ${i<=r.index?(rank.line?`<p>${esc(rank.line)}</p>`:''):`<p>외계인 ${rank.need}명을 만나면 공개된다.</p>`}</li>`).join('')}</ol>
      ${p.recent.length?`<p class="d-recent-h">최근 만난 외계인</p>
        <ul class="d-recent">${p.recent.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}
      <button type="button" class="d-continue">계속 탐험하기</button>
    </div>`;
    drawBadge(report.querySelector('canvas'),r.index);
    report.hidden=false;report.querySelector('.d-continue').focus({preventScroll:true});
    report.querySelector('.d-card').scrollTop=0;
    report.querySelector('.d-continue').onclick=close;
  }
  function close() { report.hidden=true; }
  report.addEventListener('click',event=>{if(event.target===report)close();});
  addEventListener('keydown',event=>{if(event.key==='Escape'&&!report.hidden)close();});

  tools.querySelector('.d-end').addEventListener('click',open);
  tools.querySelector('.d-replay').addEventListener('click',()=>onReplayTutorial?.());
  return {open,close};
}
