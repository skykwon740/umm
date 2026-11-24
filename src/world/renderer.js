import { N, DEG, RAD, vec, cellOf, cellVec, nodeCell } from '../core/grid.js';
import { state, PLAN, ROAD, BLDG, ENTERED, GUIDE, GUIDE_OFF, routeColor, requestRedraw } from '../core/state.js';
import {camera as view,resizeCamera} from './camera.js';
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
const ALIEN_IDLE=loadSprite('../../assets/alien-idle.png',16,20);
const ALIEN_AWAKE_SOURCE=loadSprite('../../assets/alien-awake.png',16,20,()=>awakeCache.clear());
const ASTRONAUT=loadSprite('../../assets/astronaut.png',14,16);
const awakeCache=new Map();
function awakeAlien(color) {
  if(awakeCache.has(color))return awakeCache.get(color);
  const c=document.createElement('canvas');c.width=ALIEN_AWAKE_SOURCE.width;c.height=ALIEN_AWAKE_SOURCE.height;
  const g=c.getContext('2d');g.drawImage(ALIEN_AWAKE_SOURCE,0,0);const pixels=g.getImageData(0,0,c.width,c.height),n=parseInt(color.slice(1),16),t=[n>>16&255,n>>8&255,n&255];
  for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],green=pixels.data[i+1],b=pixels.data[i+2];if(r>green*1.08&&r>b*1.05&&pixels.data[i+3]){const k=(r+green+b)/(3*255);pixels.data[i]=Math.round(t[0]*k);pixels.data[i+1]=Math.round(t[1]*k);pixels.data[i+2]=Math.round(t[2]*k);}}
  g.putImageData(pixels,0,0);awakeCache.set(color,c);return c;
}
function colorForCell(cell,variant=0) {
  const roots=state.cellRootSets?.[cell]??[],root=roots.length?roots[variant%roots.length]:state.cellRoots[cell];
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
// swallowtail flag, base of the pole at the bottom-left
const FLAG_SPRITE = [
  '#.#######',
  '#.#####..',
  '#.####...',
  '#.#####..',
  '#.#######',
  '#........',
  '#........',
  '#........',
];
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
const FLAG_IMG = makeSprite(FLAG_SPRITE, { '#': '#6fdcff' }, '#16161c');

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
      const type = state.guide[c] && state.cells[c] < BLDG ? (state.blinkOn ? GUIDE : GUIDE_OFF) : state.cells[c];
      let lv = dx*L[0] + dy*L[1] + z*L[2];
      lv = lv > 0.75 ? 3 : lv > 0.45 ? 2 : lv > 0.1 ? 1 : 0;
      const rootType=type===PLAN||type===ROAD||type===ENTERED||type===GUIDE||type===GUIDE_OFF;
      const roots=state.cellRootSets?.[c]??[],variant=Math.floor((x+y+c*3)/5);
      const pal=rootType&&roots.length?colorPalette(colorForCell(c,variant)):PAL[type];
      const k = y*W + x;
      if (grid && edge) { buf[k] = type ? pal[Math.max(0, lv - 1)] : pal[0]; continue; }
      buf[k] = rootType&&((x+y+c*3)%9===0)?pal[Math.min(3,lv+1)]:pal[lv];
    }
  }
  fctx.clearRect(0, 0, W, H);
  drawAliens(now);
  if (state.walker) drawSprite(now);
  ctx.putImageData(img, 0, 0);
  drawLabels();
}
// Aliens and flags point out from the globe's centre, like ticks around a dial.
function pose(p, n) {
  const px=cellPx(),s=px>=28?2:1,cell=nodeCell(n),color=colorForCell(cell);
  const sprite=n.awakened?awakeAlien(color):ALIEN_IDLE;
  const sx = (p.x - CX) / view.R, sy = (p.y - CY) / view.R;
  const ax = sx, ay = sy * 0.8 - p.z * 0.6, m = Math.hypot(ax, ay);
  const ux = m < 1e-3 ? 0 : ax / m, uy = m < 1e-3 ? -1 : ay / m;
  const off = -px * 0.25;              // foot of the building sits inside its tile
  // far away the flag shrinks with the building so it doesn't outweigh it
  return { s, fs: px >= 10 ? s : 0.6, ux, uy, sprite, h: sprite.height * s, bx: p.x + ux * off, by: p.y + uy * off };
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
    const { s, fs, ux, uy, sprite, h, bx, by } = pose(p, n);
    const jumping=state.alienJumpAt&&now-state.alienJumpAt<760?Math.abs(Math.sin((now-state.alienJumpAt)/760*Math.PI))*cellPx()*.33:0;
    place(sprite,bx,by-jumping,ux,uy,s,sprite.width/2);
    const roof = h - 2 * s;   // planted where the antenna meets the roof
    if (state.cells[nodeCell(n)] === ENTERED) place(FLAG_IMG, bx + ux * roof, by + uy * roof, ux, uy, fs, 1);
  }
}
function drawSprite(now) {
  const p = project(state.walker); if (!p) return;
  const s=cellPx()>=28?2:1,img=ASTRONAUT;
  fctx.save();
  fctx.translate(Math.round(p.x), Math.round(p.y + cellPx() * 0.25));
  fctx.scale(state.facing, 1);
  fctx.drawImage(img, -img.width * s / 2, -img.height * s, img.width * s, img.height * s);
  fctx.restore();
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

export { cv, PX, resize, cellPx, render, pose, project, unproject, FLAG_SPRITE };
