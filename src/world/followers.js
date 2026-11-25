// 계급을 올리면 작은 외계인이 한 명씩 우주인을 따라다니고, 헬멧 색이 계급 색으로 바뀐다. DOM을 쓰지 않는 순수 로직.
import { RANKS } from '../core/ranks.js';

export const MAX_FOLLOWERS = 3;
export const GAP = 0.08;            // 따라다니는 간격(단위 구 위 거리). 한 칸 크기(약 0.098)보다 조금 좁다
const STEP = 0.012;                 // 이만큼 움직일 때마다 발자취 한 점
const JUMP = 0.6;                   // 이보다 멀리 옮겨 가면 순간이동으로 보고 발자취를 새로 깐다

// 따라다니는 외계인 수 = 계급 번호(0~3)
export const followerCount = rankIndex => Math.max(0, Math.min(MAX_FOLLOWERS, Math.floor(Number(rankIndex)) || 0));
export const helmetColor = rankIndex => RANKS[Math.max(0, Math.min(RANKS.length - 1, Math.floor(Number(rankIndex)) || 0))].visor;

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const unit = v => { const m = Math.hypot(...v) || 1; return v.map(x => x / m); };

export const createTrail = () => ({ pts: [] });

// 우주인 뒤쪽(=바라보는 방향의 반대, 화면 가로 방향)으로 미리 깔아 두는 발자취: 가만히 서 있을 때의 자리
function seed(walker, facing) {
  let east = [walker[2], 0, -walker[0]];                    // 세계 위쪽(0,1,0) × walker
  if (Math.hypot(...east) < 1e-6) east = [1, 0, 0];
  east = unit(east);
  const dir = east.map(x => x * -(facing < 0 ? -1 : 1));
  const pts = [];
  for (let k = MAX_FOLLOWERS + 1; k >= 1; k--) pts.push(unit(walker.map((x, i) => x + dir[i] * GAP * k)));
  return pts;
}

// 우주인이 걸은 자리를 오래된 것 → 새 것 순으로 쌓는다. 이 호출은 그려질 때마다 해도 된다.
export function advanceTrail(trail, walker, facing = 1) {
  if (!walker) { trail.pts = []; return trail; }
  const last = trail.pts.at(-1);
  if (!last || dist(last, walker) > JUMP) trail.pts = [...seed(walker, facing), walker.slice()];
  else if (dist(last, walker) >= STEP) trail.pts.push(walker.slice());
  // 필요한 길이를 넘는 오래된 점은 버린다
  const need = GAP * (MAX_FOLLOWERS + 2);
  let len = 0, keep = trail.pts.length;
  for (let i = trail.pts.length - 1; i > 0 && len < need; i--) { len += dist(trail.pts[i], trail.pts[i - 1]); keep = i - 1; }
  if (len >= need && keep > 0) trail.pts = trail.pts.slice(keep);
  return trail;
}

// 우주인에서 발자취를 따라 k*gap만큼 거슬러 간 자리(k=1..count). 우주인 쪽이 앞이다.
export function followerSpots(trail, walker, count, gap = GAP) {
  const out = [];
  if (!walker) return out;
  const path = [walker, ...[...trail.pts].reverse()];
  for (let k = 1; k <= count; k++) {
    let left = k * gap, spot = path.at(-1);
    for (let i = 0; i + 1 < path.length; i++) {
      const d = dist(path[i], path[i + 1]);
      if (left <= d) { const t = d ? left / d : 0; spot = unit(path[i].map((x, j) => x + (path[i + 1][j] - x) * t)); break; }
      left -= d;
    }
    out.push(spot);
  }
  return out;
}

// 헬멧 유리: assets/astronaut.png를 14×16으로 줄였을 때 어두운 무채색(약 #28~#2e, 채널 차 ≤6)인 칸.
// 윤곽선(#10~#14, 푸른 기)과 몸통 그림자(#2e354d 등 푸른 기)는 건드리지 않는다.
export const isVisorPixel = (r, g, b, a = 255) => a > 0 && Math.min(r, g, b) >= 0x1f && Math.max(r, g, b) <= 0x3a && Math.max(r, g, b) - Math.min(r, g, b) <= 6;

// RGBA 배열(복사본을 돌려준다)의 헬멧 유리 칸만 hex 색으로 바꾼다. 밝기 차이는 유지한다.
export function tintVisor(data, hex) {
  const n = parseInt(hex.slice(1), 16), t = [n >> 16 & 255, n >> 8 & 255, n & 255], out = new Uint8ClampedArray(data);
  for (let i = 0; i < out.length; i += 4) {
    if (!isVisorPixel(out[i], out[i + 1], out[i + 2], out[i + 3])) continue;
    const k = (out[i] + out[i + 1] + out[i + 2]) / (3 * 0x29);
    for (let c = 0; c < 3; c++) out[i + c] = Math.min(255, Math.round(t[c] * k));
  }
  return out;
}

// 16×20 외계인을 8×10으로: 2×2 칸 중 둘 이상이 찼으면 찬 칸 평균색으로 채운다(보간 없이 칸 단위).
export function shrinkHalf(data, w, h) {
  const W = w >> 1, H = h >> 1, out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let n = 0; const sum = [0, 0, 0];
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const i = ((y * 2 + dy) * w + x * 2 + dx) * 4;
      if (data[i + 3] >= 128) { n++; for (let c = 0; c < 3; c++) sum[c] += data[i + c]; }
    }
    if (n < 2) continue;
    const o = (y * W + x) * 4;
    for (let c = 0; c < 3; c++) out[o + c] = Math.round(sum[c] / n);
    out[o + 3] = 255;
  }
  return { data: out, width: W, height: H };
}
