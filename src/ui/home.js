// 홈화면 = 행성계 (팀 결정: 홈화면 · 잠금된 새로운 행성 · 행성마다 진행도 · 행성계 마지막 페이지).
// 처음 들어올 때와 탐험을 마친 뒤에 같은 화면을 본다. 행성에는 지금까지 걸어온 길이 무늬로 남는다.
import {PLANETS,isUnlocked,metOn} from '../core/planets.js';
import {readPlanetMap} from '../core/planet-map.js';
import {RANKS,rankOf,gaugeSegments} from '../core/ranks.js';
import {cellOf,cellVec,ll} from '../core/grid.js';

const SIZE=64;                                    // 행성 그림 한 변(픽셀). 화면에서는 크게 늘려 픽셀이 보이게 그린다
const RAD=Math.PI/180;
const LIGHT=(()=>{const v=[-0.45,0.55,0.7],m=Math.hypot(...v);return v.map(x=>x/m);})();   // 렌더러와 같은 빛 방향
const LOCK=['..xxxx..','.x....x.','.x....x.','xxxxxxxx','xxxooxxx','xxxooxxx','xxxxxxxx'];

// 행성 하나: 아직 밝혀지지 않은 땅은 행성 색 명암, 걸어온 칸은 루트 색. 잠긴 행성은 어둡게 + 자물쇠
export function drawPlanet(canvas,planet,{paint=new Map(),here=-1}={},locked=false) {
  const g=canvas.getContext('2d'),image=g.createImageData(SIZE,SIZE),px=image.data;
  const [lat,lon]=here>=0?ll(cellVec(here)):[20,-30];
  const cl=Math.cos(lat*RAD),sl=Math.sin(lat*RAD),co=Math.cos(lon*RAD),so=Math.sin(lon*RAD);
  const shade=planet.ground.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
  const r=SIZE/2-1;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++) {
    const dx=(x+.5-SIZE/2)/r,dy=(SIZE/2-y-.5)/r,d2=dx*dx+dy*dy;
    if(d2>1)continue;
    const z=Math.sqrt(1-d2),wy=dy*cl+z*sl,z1=-dy*sl+z*cl,wx=dx*co+z1*so,wz=-dx*so+z1*co;
    const light=dx*LIGHT[0]+dy*LIGHT[1]+z*LIGHT[2],level=light>.75?3:light>.45?2:light>.1?1:0;
    const color=paint.get(cellOf(wx,wy,wz));
    let rgb=color&&!locked?[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)):shade[level];
    if(locked)rgb=rgb.map(v=>Math.round(v*.55));
    const k=(y*SIZE+x)*4;px[k]=rgb[0];px[k+1]=rgb[1];px[k+2]=rgb[2];px[k+3]=255;
  }
  g.putImageData(image,0,0);
  if(locked) {
    g.fillStyle='#9aa7ae';
    const ox=SIZE/2-4,oy=SIZE/2-4;
    LOCK.forEach((row,j)=>[...row].forEach((ch,i)=>{if(ch==='x')g.fillRect(ox+i,oy+j,1,1);}));
  }
}

// 배경 별: 매번 같은 자리에 (화면 크기만 따라간다)
function drawStars(canvas) {
  const w=Math.ceil(innerWidth/3),h=Math.ceil(innerHeight/3);
  canvas.width=w;canvas.height=h;
  const g=canvas.getContext('2d');let seed=7;
  const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let i=0;i<w*h/90;i++){g.fillStyle=rand()<.15?'#6fdcff':rand()<.5?'#f3e2b8':'#3f5560';g.fillRect(Math.floor(rand()*w),Math.floor(rand()*h),1,1);}
}

function meter(met) {
  return `<span class="home-meter" aria-hidden="true">${gaugeSegments(met).map(s=>
    `<span style="flex-grow:${s.to-s.from};--c:${s.rank.visor}"><i style="width:${(s.fill*100).toFixed(1)}%"></i></span>`).join('')}</span>
    <small>발견한 외계인 수 ${met}명</small>`;
}

export function createHome({storage,onEnter}) {
  document.body.classList.add('at-home');
  const root=document.createElement('main');
  root.id='home';root.setAttribute('aria-labelledby','homeTitle');
  root.innerHTML=`<canvas class="home-stars" aria-hidden="true"></canvas>
    <h1 id="homeTitle">행성계</h1>
    <div class="home-system"><span class="home-sun" aria-hidden="true"></span><ol class="home-planets"></ol></div>`;
  document.body.append(root);
  const list=root.querySelector('.home-planets');
  for(const planet of PLANETS) {
    const open=isUnlocked(storage,planet.id),met=metOn(storage,planet.id),rank=rankOf(met).rank;
    const item=document.createElement('li'),button=document.createElement('button');
    button.type='button';button.className='home-planet';
    const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;canvas.setAttribute('aria-hidden','true');
    button.append(canvas);
    // 잠긴 행성 안내는 AI 초안 — 워딩 담당 확인
    button.insertAdjacentHTML('beforeend',open
      ?`<b>${planet.name}</b><span class="home-rank">${rank.name}</span>${meter(met)}`
      :`<b>${planet.name}</b><span class="home-lock">잠김</span><small>앞 행성에서 ${RANKS.at(-1).name}가 되면 열린다</small>`);
    if(open)button.addEventListener('click',()=>onEnter(planet.id));
    else button.setAttribute('aria-disabled','true');
    drawPlanet(canvas,planet,open?readPlanetMap(storage,planet.id):undefined,!open);
    item.append(button);list.append(item);
  }
  const stars=root.querySelector('.home-stars');
  drawStars(stars);addEventListener('resize',()=>drawStars(stars));
  return root;
}
