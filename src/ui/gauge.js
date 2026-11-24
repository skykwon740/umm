// 상단 바 게이지: 만난 외계인 수(progress().met)를 계급 구간별 색으로 채운다.
import {RANKS,rankOf,gaugeSegments} from '../core/ranks.js';
import {progress} from '../core/progress.js';

export function createGauge() {
  const meter=document.getElementById('meter'),num=document.getElementById('foundNum'),name=document.getElementById('foundRank');
  if(!meter)return {update(){}};
  const max=RANKS.at(-1).need;
  // 구간 i = RANKS[i].need ~ RANKS[i+1].need (마지막 계급은 최고 필요 수에서 끝나므로 구간 없음)
  const segs=gaugeSegments(0).map(({rank,from,to})=>{
    const seg=document.createElement('span'),fill=document.createElement('i');
    seg.className='seg';seg.style.flexGrow=to-from;seg.style.setProperty('--c',rank.visor);
    seg.append(fill);meter.append(seg);return fill;
  });
  function update() {
    const met=progress().met,r=rankOf(met);
    num.textContent=`${met}명`;name.textContent=r.rank.name;
    meter.setAttribute('role','meter');meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax',String(max));
    meter.setAttribute('aria-valuenow',String(Math.min(met,max)));meter.setAttribute('aria-label','발견한 외계인 수');
    gaugeSegments(met).forEach((s,i)=>{segs[i].style.width=`${s.fill*100}%`;});
  }
  update();
  return {update};
}
