import { N, DEG, RAD, vec, cellOf, cellVec, nodeCell } from '../core/grid.js';
import { state, PLAN, ROAD, BLDG, ENTERED, routeColor, requestRedraw } from '../core/state.js';
import {camera as view,resizeCamera} from './camera.js';
import {progress} from '../core/progress.js';
import {rankOf} from '../core/ranks.js';
import {createTrail,advanceTrail,followerSpots,followerCount,helmetColor,tintVisor,shrinkHalf} from './followers.js';
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const fx = document.getElementById('fx'), fctx = fx.getContext('2d');
const PX = 3;
let W, H, img, buf, above;
let CX = 0, CY = 0;                             // globe centre: middle of the area the panels leave free
const cellPx = () => view.R * Math.PI / 2 / N;
function resize() {
  if (!innerWidth || !innerHeight) return;      // hidden window: wait for the resize event that gives it a size
  W = Math.ceil(innerWidth / PX); H = Math.ceil(innerHeight / PX);
  cv.width = W; cv.height = H;
  CX = (W - document.getElementById('side').offsetWidth / PX) / 2;
  CY = (H + document.getElementById('top').offsetHeight / PX) / 2;
  const k = PX * (devicePixelRatio || 1);
  fx.width = W * k; fx.height = H * k; fctx.setTransform(k, 0, 0, k, 0, 0); fctx.imageSmoothingEnabled = false;
  img = ctx.createImageData(W, H); buf = new Uint32Array(img.data.buffer); above = new Int32Array(W);
  resizeCamera(W,H);
  requestRedraw();
}
const rgb = h => { const n = parseInt(h.slice(1), 16); return 0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16); };
const BG = rgb('#16161c');
function loadSprite(path,w,h,onLoad=()=>{}) {
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const image=document.createElement('img');image.onload=()=>{const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(image,0,0,w,h);onLoad();requestRedraw();};
  image.src=new URL(path,import.meta.url);return canvas;
}
const ALIEN_IDLE=loadSprite('../../assets/alien-idle.png',16,20,()=>{followerSprite=null;});
const ALIEN_AWAKE_SOURCE=loadSprite('../../assets/alien-awake.png',16,20,()=>awakeCache.clear());
const ASTRONAUT=loadSprite('../../assets/astronaut.png',14,16,()=>helmetCache.clear());
const helmetCache=new Map();
// 계급 색 헬멧: 헬멧 유리 칸만 바꾼 우주인을 색마다 한 번씩 만든다
function astronautFor(color) {
  if(helmetCache.has(color))return helmetCache.get(color);
  const c=document.createElement('canvas');c.width=ASTRONAUT.width;c.height=ASTRONAUT.height;
  const g=c.getContext('2d');g.drawImage(ASTRONAUT,0,0);
  const pixels=g.getImageData(0,0,c.width,c.height);pixels.data.set(tintVisor(pixels.data,color));
  g.putImageData(pixels,0,0);helmetCache.set(color,c);return c;
}
// 따라다니는 작은 외계인: 가만히 있는 외계인(16×20)을 절반(8×10)으로 줄인 것
let followerSprite=null;
function smallAlien() {
  if(followerSprite)return followerSprite;
  const g=ALIEN_IDLE.getContext('2d'),src=g.getImageData(0,0,ALIEN_IDLE.width,ALIEN_IDLE.height),small=shrinkHalf(src.data,src.width,src.height);
  const c=document.createElement('canvas');c.width=small.width;c.height=small.height;
  c.getContext('2d').putImageData(new ImageData(small.data,small.width,small.height),0,0);
  return followerSprite=c;
}
const trail=createTrail();
const awakeCache=new Map();
function awakeAlien(color) {
  if(awakeCache.has(color))return awakeCache.get(color);
  const c=document.createElement('canvas');c.width=ALIEN_AWAKE_SOURCE.width;c.height=ALIEN_AWAKE_SOURCE.height;
  const g=c.getContext('2d');g.drawImage(ALIEN_AWAKE_SOURCE,0,0);const pixels=g.getImageData(0,0,c.width,c.height),n=parseInt(color.slice(1),16),t=[n>>16&255,n>>8&255,n&255];
  for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],green=pixels.data[i+1],b=pixels.data[i+2];if(r>green*1.08&&r>b*1.05&&pixels.data[i+3]){const k=(r+green+b)/(3*255);pixels.data[i]=Math.round(t[0]*k);pixels.data[i+1]=Math.round(t[1]*k);pixels.data[i+2]=Math.round(t[2]*k);}}
  g.putImageData(pixels,0,0);awakeCache.set(color,c);return c;
}
// 여러 루트가 겹친 칸은 첫 루트 색
function colorForCell(cell) {
  const roots=state.cellRootSets?.[cell]??[],root=roots.length?roots[0]:state.cellRoots[cell];
  return root>=0?(state.journeys[root]?.color||routeColor(root)):'#45acd4';
}
const routePalettes=new Map();
function colorPalette(hex) {
  if(routePalettes.has(hex))return routePalettes.get(hex);
  const n=parseInt(hex.slice(1),16),base=[n>>16&255,n>>8&255,n&255];
  const shades=[.56,.76,1,1.24].map(k=>{const c=base.map(v=>Math.round(k<1?v*k:v+(255-v)*(k-1)/.24));return rgb('#'+c.map(v=>v.toString(16).padStart(2,'0')).join(''));});
  routePalettes.set(hex,shades);return shades;
}
const PAL = [
  ['#1c262e', '#243039', '#2c3a45', '#354552'],   // unknown
  ['#2f8fb5', '#45acd4', '#6fdcff', '#9be8ff'],   // road not walked yet: UI colour
  ['#2f8fb5', '#45acd4', '#6fdcff', '#9be8ff'],   // walked road: UI colour
  ['#a4482a', '#c85f34', '#f08a4b', '#f6ad70'],   // building
  ['#2f8fb5', '#45acd4', '#6fdcff', '#9be8ff'],   // entered building (+flag): UI colour
  ['#c4c8cc', '#dcdfe2', '#f2f3f4', '#ffffff'],   // route guide, blinking over whatever is below
  ['#5a6068', '#6e747c', '#868c94', '#a0a6ae'],   // route guide, off beat
].map(p => p.map(rgb));
const L = (() => { const v = [-0.45, 0.55, 0.7], m = Math.hypot(...v); return v.map(x => x / m); })();

function makeSprite(rows, colors, ring) {
  const pad = ring ? 1 : 0, c = document.createElement('canvas');
  c.width = rows[0].length + pad * 2; c.height = rows.length + pad * 2;
  const g = c.getContext('2d');
  const each = fn => rows.forEach((row, y) => [...row].forEach((ch, x) => { if (colors[ch]) fn(x + pad, y + pad, ch); }));
  if (ring) { g.fillStyle = ring; each((x, y) => { g.fillRect(x-1, y, 3, 1); g.fillRect(x, y-1, 1, 3); }); }
  each((x, y, ch) => { const c = colors[ch]; g.fillStyle = typeof c === 'function' ? c(x, y) : c; g.fillRect(x, y, 1, 1); });
  return c;
}

function render(now, drawLabels) {
  const cx = CX, cy = CY, R = view.R;
  const cl = Math.cos(view.lat*RAD), sl = Math.sin(view.lat*RAD), co = Math.cos(view.lon*RAD), so = Math.sin(view.lon*RAD);
  const px = cellPx();
  const grid = px >= 5;
  const y0 = Math.max(0, Math.floor(cy - R)), y1e = Math.min(H, Math.ceil(cy + R));
  buf.fill(BG); above.fill(-1);
  for (let y = y0; y < y1e; y++) {
    const dy = (cy - y - 0.5) / R;
    let left = -1;
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - cx) / R, d2 = dx*dx + dy*dy;
      if (d2 > 1) { left = above[x] = -1; continue; }
      const z = Math.sqrt(1 - d2);
      const wy = dy*cl + z*sl, z1 = -dy*sl + z*cl;
      const wx = dx*co + z1*so, wz = -dx*so + z1*co;
      const c = cellOf(wx, wy, wz);
      const edge = (left >= 0 && left !== c) || (above[x] >= 0 && above[x] !== c);
      left = above[x] = c;
      // 예전 저장의 안내(guide) 칸도 깜빡이지 않고 저장된 종류 그대로 그린다
      const type = state.cells[c];
      const rootType=type===PLAN||type===ROAD||type===BLDG||type===ENTERED;
      const k = y*W + x;
      if (rootType) {
        // 루트 칸은 루트 색 한 가지로 평평하게 (명암·반짝 점·줄무늬 없음). 경계선만 한 단계 어둡게
        const pal=(state.cellRootSets?.[c]??[]).length||state.cellRoots[c]>=0?colorPalette(colorForCell(c)):PAL[type];
        buf[k] = grid && edge ? pal[1] : pal[2]; continue;
      }
      let lv = dx*L[0] + dy*L[1] + z*L[2];
      lv = lv > 0.75 ? 3 : lv > 0.45 ? 2 : lv > 0.1 ? 1 : 0;
      const pal=PAL[type];
      if (grid && edge) { buf[k] = type ? pal[Math.max(0, lv - 1)] : pal[0]; continue; }
      buf[k] = pal[lv];
    }
  }
  fctx.clearRect(0, 0, W, H);
  drawAliens(now);
  if (state.walker) drawSprite(now);
  ctx.putImageData(img, 0, 0);
  drawLabels();
}
// Aliens point out from the globe's centre, like ticks around a dial.
function pose(p, n) {
  const px=cellPx(),s=px>=28?2:1,cell=nodeCell(n),color=colorForCell(cell);
  const sprite=n.awakened?awakeAlien(color):ALIEN_IDLE;
  const sx = (p.x - CX) / view.R, sy = (p.y - CY) / view.R;
  const ax = sx, ay = sy * 0.8 - p.z * 0.6, m = Math.hypot(ax, ay);
  const ux = m < 1e-3 ? 0 : ax / m, uy = m < 1e-3 ? -1 : ay / m;
  const off = -px * 0.25;              // foot of the building sits inside its tile
  return { s, ux, uy, sprite, h: sprite.height * s, bx: p.x + ux * off, by: p.y + uy * off };
}
// sprites go on a finer layer so their pixel blocks rotate cleanly
function place(img, x, y, ux, uy, s, ax) {
  fctx.save();
  fctx.translate(x, y); fctx.rotate(Math.atan2(ux, -uy));
  fctx.drawImage(img, -ax * s, -img.height * s, img.width * s, img.height * s);
  fctx.restore();
}
function drawAliens(now) {
  const list = [];
  for (const n of state.nodes) {
    const p = project(vec(n.lat, n.lon));
    if (p && p.x > -60 && p.y > -60 && p.x < W + 60 && p.y < H + 60) list.push([p, n]);
  }
  list.sort((a, b) => a[0].z - b[0].z);   // limb first, so the ones facing the camera overlap them
  for (const [p, n] of list) {
    const { s, ux, uy, sprite, h, bx, by } = pose(p, n);
    const jumping=state.alienJumpAt&&now-state.alienJumpAt<760?Math.abs(Math.sin((now-state.alienJumpAt)/760*Math.PI))*cellPx()*.33:0;
    place(sprite,bx,by-jumping,ux,uy,s,sprite.width/2);
  }
}
function drawSprite(now) {
  const rank=rankOf(progress().met).index,s=cellPx()>=28?2:1,feet=cellPx()*0.25;
  advanceTrail(trail,state.walker,state.facing);
  const p=project(state.walker),followers=[];
  followerSpots(trail,state.walker,followerCount(rank)).forEach(v=>{const q=project(v);if(q)followers.push(q);});
  const stand=(img,q)=>{
    fctx.save();
    fctx.translate(Math.round(q.x),Math.round(q.y+feet));
    fctx.scale(state.facing,1);
    fctx.drawImage(img,-img.width*s/2,-img.height*s,img.width*s,img.height*s);
    fctx.restore();
  };
  // 화면에서 위쪽(먼 쪽)에 선 쪽을 먼저 그려 아래쪽이 위에 겹친다
  const small=followers.length?smallAlien():null;
  followers.filter(q=>!p||q.y<p.y).forEach(q=>stand(small,q));
  if(p)stand(astronautFor(helmetColor(rank)),p);
  followers.filter(q=>p&&q.y>=p.y).forEach(q=>stand(small,q));
}
function project(w) {
  const cl = Math.cos(view.lat*RAD), sl = Math.sin(view.lat*RAD), co = Math.cos(view.lon*RAD), so = Math.sin(view.lon*RAD);
  const x1 = w[0]*co - w[2]*so, z1 = w[0]*so + w[2]*co;
  const y = w[1]*cl - z1*sl, z = w[1]*sl + z1*cl;
  if (z < 0.05) return null;
  return { x: CX + x1*view.R, y: CY - y*view.R, z };
}
function unproject(sx, sy) {           // screen px → cell id (or -1)
  const dx = (sx / PX - CX) / view.R, dy = (CY - sy / PX) / view.R, d2 = dx*dx + dy*dy;
  if (d2 > 1) return -1;
  const z = Math.sqrt(1 - d2);
  const cl = Math.cos(view.lat*RAD), sl = Math.sin(view.lat*RAD), co = Math.cos(view.lon*RAD), so = Math.sin(view.lon*RAD);
  const wy = dy*cl + z*sl, z1 = -dy*sl + z*cl;
  return cellOf(dx*co + z1*so, wy, -dx*so + z1*co);
}

export { cv, PX, resize, cellPx, render, pose, project, unproject };
