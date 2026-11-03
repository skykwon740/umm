import { N, DEG, RAD, vec, cellOf, cellVec, hash, nodeCell } from '../core/grid.js';
import { state, BLDG, ENTERED, GUIDE, GUIDE_OFF } from '../core/state.js';
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const fx = document.getElementById('fx'), fctx = fx.getContext('2d');
const PX = 3;
let W, H, img, buf, above;
let CX = 0, CY = 0;                             // globe centre: middle of the area the panels leave free
const view = { lat: 20, lon: 0, R: 60, tLat: 20, tLon: 0, tR: 60 };
const cellPx = () => view.R * Math.PI / 2 / N;
const walkR = () => 15 * 2 * N / Math.PI;      // zoom where a tile is ~15px
function resize() {
  W = Math.ceil(innerWidth / PX); H = Math.ceil(innerHeight / PX);
  cv.width = W; cv.height = H;
  CX = (W - document.getElementById('side').offsetWidth / PX) / 2;
  CY = (H + document.getElementById('top').offsetHeight / PX) / 2;
  const k = PX * (devicePixelRatio || 1);
  fx.width = W * k; fx.height = H * k; fctx.setTransform(k, 0, 0, k, 0, 0); fctx.imageSmoothingEnabled = false;
  img = ctx.createImageData(W, H); buf = new Uint32Array(img.data.buffer); above = new Int32Array(W);
  if (!resize.done) { view.R = view.tR = Math.min(W, H) * 0.36; resize.done = true; }
  state.dirty = true;
}
const rgb = h => { const n = parseInt(h.slice(1), 16); return 0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16); };
const BG = rgb('#16161c');
const PAL = [
  ['#1c262e', '#243039', '#2c3a45', '#354552'],   // unknown
  ['#2f8fb5', '#45acd4', '#6fdcff', '#9be8ff'],   // road not walked yet: UI colour
  ['#2f8fb5', '#45acd4', '#6fdcff', '#9be8ff'],   // walked road: UI colour
  ['#a4482a', '#c85f34', '#f08a4b', '#f6ad70'],   // building
  ['#2f8fb5', '#45acd4', '#6fdcff', '#9be8ff'],   // entered building (+flag): UI colour
  ['#c4c8cc', '#dcdfe2', '#f2f3f4', '#ffffff'],   // route guide, blinking over whatever is below
  ['#5a6068', '#6e747c', '#868c94', '#a0a6ae'],   // route guide, off beat
].map(p => p.map(rgb));
// line-art buildings: # navy outline / windows / shaded side, w wall. The address decides which one.
const BLDGC = { '#': '#0e1a45', w: '#e4e9f2' };
const BLDGS = [[
  '.....###.....',
  '......#......',
  '#############',
  '#wwwwwwwwww##',
  '#ww##ww##ww##',
  '#ww##ww##ww##',
  '#wwwwwwwwww##',
  '#ww##ww##ww##',
  '#ww##ww##ww##',
  '#wwwwwwwwww##',
  '#wwwww##www##',
  '#wwwww##www##',
  '#wwwww##www##',
  '#############',
], [
  '...###.........',
  '....#..........',
  '###############',
  '#wwwwwwwwwwww##',
  '#www##www##ww##',
  '#www##www##ww##',
  '#wwwwwwwwwwww##',
  '#www##www##ww##',
  '#www##www##ww##',
  '#wwwwwwww##ww##',
  '###############',
], [
  '.........###...',
  '..........#....',
  '.......########',
  '.......#wwwww##',
  '.......#w##ww##',
  '########wwwww##',
  '#wwwwww#w##ww##',
  '#wwwwww#wwwww##',
  '#ww##ww#w##ww##',
  '#ww##ww#wwwww##',
  '#wwwwww#ww##w##',
  '#wwwwww#ww##w##',
  '#wwwwww#ww##w##',
  '###############',
]];
const BLDG_TINY = ['..#..', '#####', '#www#', '#w#w#', '#www#', '#####'];   // seen from far away
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

// character (facing right): O cap, X edge, W body, B/E eye black + white
const SPRITE = [
  '...OOOOO...',
  '..OOOOOOOO.',
  '..XXXXXXX..',
  '.XWWWWWWWX.',
  '.XWWBEWBEX.',
  '.XWWWWWWWX.',
  '..XWWWWWX..',
  '...XWWWX...',
];
const LEGS = [['...XWXWX...', '...XX.XX...'], ['..XWX.XWX..', '..XX...XX..']];
const RAINBOW = ['#b2d620', '#f0925a', '#fa4fa8', '#c050d8', '#6a50e0', '#3038c0'].map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
// diagonal colour run from the top left down to the feet, pixels washed out unevenly like a mosaic
function rainbow(x, y, pale) {
  const t = Math.min(0.999, (x / 10 * 0.6 + y / 9) / 1.6) * (RAINBOW.length - 1), i = Math.floor(t), f = t - i;
  const wash = pale + ((x * 7 + y * 13) % 5) / 5 * 0.18;
  const c = RAINBOW[i].map((v, k) => v + (RAINBOW[i + 1][k] - v) * f).map(v => Math.round(v + (255 - v) * wash));
  return `rgb(${c})`;
}
const SPC = { O: (x, y) => rainbow(x, y, 0.1), X: (x, y) => rainbow(x, y, 0.2), W: (x, y) => rainbow(x, y, 0), B: '#0a0a0a', E: '#ffffff' };
function makeSprite(rows, colors, ring) {
  const pad = ring ? 1 : 0, c = document.createElement('canvas');
  c.width = rows[0].length + pad * 2; c.height = rows.length + pad * 2;
  const g = c.getContext('2d');
  const each = fn => rows.forEach((row, y) => [...row].forEach((ch, x) => { if (colors[ch]) fn(x + pad, y + pad, ch); }));
  if (ring) { g.fillStyle = ring; each((x, y) => { g.fillRect(x-1, y, 3, 1); g.fillRect(x, y-1, 1, 3); }); }
  each((x, y, ch) => { const c = colors[ch]; g.fillStyle = typeof c === 'function' ? c(x, y) : c; g.fillRect(x, y, 1, 1); });
  return c;
}
const BLDG_IMGS = BLDGS.map(b => makeSprite(b, BLDGC)), BLDG_TINY_IMG = makeSprite(BLDG_TINY, BLDGC);
const FLAG_IMG = makeSprite(FLAG_SPRITE, { '#': '#6fdcff' }, '#16161c');
const CHAR_IMGS = LEGS.map(l => makeSprite(SPRITE.concat(l), SPC));

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
      const pal = PAL[type];
      const k = y*W + x;
      if (grid && edge) { buf[k] = type ? pal[Math.max(0, lv - 1)] : pal[0]; continue; }
      buf[k] = pal[lv];
    }
  }
  fctx.clearRect(0, 0, W, H);
  drawBuildings();
  if (state.walker) drawSprite(now);
  ctx.putImageData(img, 0, 0);
  drawLabels();
}
// buildings and flags point out from the globe's centre, like ticks around a dial. The camera is
// treated as tilted so the middle of the view leans gently instead of fanning out from one point.
function pose(p, n) {
  const px = cellPx(), s = px >= 20 ? 2 : 1;
  const sprite = px >= 10 ? BLDG_IMGS[hash(n.t) % BLDG_IMGS.length] : BLDG_TINY_IMG;
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
function drawBuildings() {
  const list = [];
  for (const n of state.nodes) {
    const p = project(vec(n.lat, n.lon));
    if (p && p.x > -60 && p.y > -60 && p.x < W + 60 && p.y < H + 60) list.push([p, n]);
  }
  list.sort((a, b) => a[0].z - b[0].z);   // limb first, so the ones facing the camera overlap them
  for (const [p, n] of list) {
    const { s, fs, ux, uy, sprite, h, bx, by } = pose(p, n);
    place(sprite, bx, by, ux, uy, s, sprite.width / 2);
    const roof = h - 2 * s;   // planted where the antenna meets the roof
    if (state.cells[nodeCell(n)] === ENTERED) place(FLAG_IMG, bx + ux * roof, by + uy * roof, ux, uy, fs, 1);
  }
}
function drawSprite(now) {
  const p = project(state.walker); if (!p) return;
  const s = cellPx() >= 18 ? 2 : 1;
  const img = CHAR_IMGS[now - state.lastStep < 140 ? 1 : 0];
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

export { cv, PX, W, H, view, resize, cellPx, walkR, render, pose, project, unproject, FLAG_SPRITE };
