const N = 24, FACE = N * N;
const DEG = 180 / Math.PI, RAD = Math.PI / 180, Q = 4 / Math.PI;
const vec = (lat, lon) => [Math.cos(lat*RAD)*Math.sin(lon*RAD), Math.sin(lat*RAD), Math.cos(lat*RAD)*Math.cos(lon*RAD)];
const ll = v => [Math.asin(Math.max(-1, Math.min(1, v[1]))) * DEG, Math.atan2(v[0], v[2]) * DEG];
function cellOf(x, y, z) {
  const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
  let f, a, b;
  if (ax >= ay && ax >= az) { f = x > 0 ? 0 : 1; a = (x > 0 ? -z : z) / ax; b = -y / ax; }
  else if (az >= ay)        { f = z > 0 ? 2 : 3; a = (z > 0 ? x : -x) / az; b = -y / az; }
  else                      { f = y > 0 ? 4 : 5; a = x / ay; b = (y > 0 ? z : -z) / ay; }
  const fu = (Math.atan(a) * Q + 1) * N / 2, fv = (Math.atan(b) * Q + 1) * N / 2;
  const i = Math.min(N - 1, Math.floor(fu)), j = Math.min(N - 1, Math.floor(fv));
  return f * FACE + j * N + i;
}
function cellVec(c) {
  const f = Math.floor(c / FACE), j = Math.floor((c % FACE) / N), i = c % N;
  const a = Math.tan(((i + .5) / N * 2 - 1) / Q), b = Math.tan(((j + .5) / N * 2 - 1) / Q);
  const v = [[1, -b, -a], [-1, -b, a], [a, -b, 1], [-a, -b, -1], [a, 1, b], [a, -1, -b]][f];
  const m = Math.hypot(...v); return v.map(x => x / m);
}
function slerp(a, b, t) {
  const d = Math.max(-1, Math.min(1, a[0]*b[0] + a[1]*b[1] + a[2]*b[2]));
  const w = Math.acos(d); if (w < 1e-6) return a;
  const s = Math.sin(w), p = Math.sin((1-t)*w)/s, q = Math.sin(t*w)/s;
  return [a[0]*p + b[0]*q, a[1]*p + b[1]*q, a[2]*p + b[2]*q];
}
function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

const nodeCell = n => cellOf(...vec(n.lat, n.lon));
export { N, FACE, DEG, RAD, vec, ll, cellOf, cellVec, slerp, hash, nodeCell };
