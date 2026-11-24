// 떠돌이 외계인: 탐험 중 가끔 우주인 근처에 나타나는 랜덤 이벤트.
// 클릭하면 자기 가문(위키 임의 문서)을 알려 주고, 따라가면 그 단어로 새 탐험을 시작한다.
import {state} from '../core/state.js';
import {vec,ll} from '../core/grid.js';
import {randomWord} from '../content/random-word.js';
import {project,PX} from '../world/renderer.js';
import {camera} from '../world/camera.js';

// 12×12, two walking frames. g=body, d=outline, w=eye, k=pupil, b=bundle, s=stick
const BODY=['....d.......','....d.......','...ddd......','..dgggd.....','.dgwwkgd..s.','.dgwwwgd.s..',
  '.dgggggdsbb.','..dgggggdbbb','..dgggggd.bb','...dgggd....'];
const LEGS=[['...d...d....','..dd...dd...'],['....d.d.....','...dd.dd....']];
const COLOR={d:'#0b0b10',g:'#b9a3ff',w:'#f3e2b8',k:'#16161c',b:'#c98a4b',s:'#8a6a4a'};
function paint(canvas,frame) {
  const g=canvas.getContext('2d'),s=canvas.width/12;g.clearRect(0,0,canvas.width,canvas.height);
  [...BODY,...LEGS[frame]].forEach((row,y)=>[...row].forEach((ch,x)=>{
    if(ch!=='.'){g.fillStyle=COLOR[ch];g.fillRect(x*s,y*s,s,s);}
  }));
}
const LINES=[
  w=>`나는 '${w}' 집안의 떠돌이야. 우리 가족 만나러 올래?`,
  w=>`쉿… 사실 난 '${w}' 가문에서 가출했어. 데려다줄래?`,
  w=>`길을 잃었어. '${w}' 마을이 어느 쪽인지 알아?`,
];

export function createWanderer({canAppear,onMeet,onFollow,onSpotted,demo=false}) {
  const root=document.createElement('div');root.className='d-wanderer';root.hidden=true;
  root.innerHTML=`<button type="button" class="d-wbody" aria-label="떠돌이 외계인과 접촉"><canvas width="48" height="48"></canvas></button>
    <div class="d-bubble" hidden><p></p><div><button type="button" class="d-follow">따라가기</button>
    <button type="button" class="d-bye">괜찮아</button></div></div>`;
  document.body.append(root);
  const canvas=root.querySelector('canvas'),bubble=root.querySelector('.d-bubble');
  const range=demo?[8e3,15e3]:[45e3,100e3],stay=demo?20e3:16e3;

  let at=null,drift=null,word=null,lang='ko',timer=0,leaveTimer=0,frame=0;
  const later=()=>range[0]+Math.random()*(range[1]-range[0]);
  function schedule(){clearTimeout(timer);timer=setTimeout(appear,later());}

  async function appear() {
    if(!canAppear()){schedule();return;}
    lang=state.nodes.at(-1)?.lang??'ko';
    word=await randomWord(lang);
    if(!word||!canAppear()){schedule();return;}
    // 우주인 근처, 아직 착륙 전이면 화면 가운데 근처
    const [lat,lon]=state.walker?ll(state.walker):[camera.lat,camera.lon];
    const a=Math.random()*Math.PI*2,d=state.walker?5:8;
    at={lat:lat+Math.sin(a)*d,lon:lon+Math.cos(a)*d};
    drift={lat:(Math.random()-.5)*.02,lon:(Math.random()-.5)*.03};
    bubble.hidden=true;root.hidden=false;onSpotted?.();
    clearTimeout(leaveTimer);leaveTimer=setTimeout(leave,stay);
  }
  function leave(){root.hidden=true;at=null;bubble.hidden=true;schedule();}

  root.querySelector('.d-wbody').addEventListener('click',()=>{
    clearTimeout(leaveTimer);
    bubble.querySelector('p').textContent=LINES[Math.floor(Math.random()*LINES.length)](word);
    bubble.hidden=false;onMeet(word,lang);
  });
  root.querySelector('.d-follow').addEventListener('click',()=>{const w=word,l=lang;leave();onFollow(w,l);});
  root.querySelector('.d-bye').addEventListener('click',leave);

  function tick(time) {
    if(!at)return;
    if(bubble.hidden)at={lat:Math.max(-80,Math.min(80,at.lat+drift.lat)),lon:at.lon+drift.lon};
    const p=project(vec(at.lat,at.lon));
    root.style.visibility=p?'visible':'hidden';
    if(p){root.style.left=p.x*PX+'px';root.style.top=p.y*PX+'px';}
    const f=bubble.hidden?Math.floor(time/260)%2:0;
    if(f!==frame||!canvas.dataset.drawn){frame=f;paint(canvas,f);canvas.dataset.drawn='1';}
  }
  schedule();
  return {tick,appear,leave};
}
