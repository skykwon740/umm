// A geodesic icosphere and its dual Voronoi cells. The dual contains twelve
// pentagons and hexagons everywhere else, like a soccer ball.
export const N = 16;
export const CELL_COUNT = 10 * N * N + 2;
export const DEG = 180 / Math.PI, RAD = Math.PI / 180, Q = 4 / Math.PI;
export const vec = (lat, lon) => [Math.cos(lat*RAD)*Math.sin(lon*RAD), Math.sin(lat*RAD), Math.cos(lat*RAD)*Math.cos(lon*RAD)];
export const ll = v => [Math.asin(Math.max(-1, Math.min(1, v[1]))) * DEG, Math.atan2(v[0], v[2]) * DEG];
export function slerp(a,b,t) {
  const d=Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2])),w=Math.acos(d);
  if(w<1e-6)return a;
  const s=Math.sin(w),p=Math.sin((1-t)*w)/s,q=Math.sin(t*w)/s;
  return [a[0]*p+b[0]*q,a[1]*p+b[1]*q,a[2]*p+b[2]*q];
}
export function hash(s) { let h=2166136261;for(const ch of s){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0; }

const vertices=[],faces=[],lookup=new Map();
function addVertex(v) {
  const m=Math.hypot(...v),p=v.map(x=>x/m),key=p.map(x=>Math.round(x*1e8)).join(',');
  if(lookup.has(key))return lookup.get(key);
  const id=vertices.length;vertices.push(p);lookup.set(key,id);return id;
}
const phi=(1+Math.sqrt(5))/2;
const seed=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(v=>addVertex(v));
const base=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
const edgeMid=new Map();
function point(a,b,c,i,j) { return addVertex(vertices[a].map((x,k)=>((N-i-j)*x+i*vertices[b][k]+j*vertices[c][k])/N)); }
for(const [a,b,c] of base) {
  const rows=Array.from({length:N+1},(_,i)=>Array.from({length:N-i+1},(_,j)=>point(a,b,c,i,j)));
  for(let i=0;i<N;i++)for(let j=0;j<N-i;j++) {
    const p=rows[i][j],q=rows[i+1][j],r=rows[i][j+1];faces.push([p,q,r]);
    if(i+j<N-1)faces.push([q,rows[i+1][j+1],r]);
  }
}
// Remove duplicate vertices introduced by adjacent icosahedron faces and
// remap faces to their shared spherical vertex ids.
// addVertex already welds by normalized coordinates.
export const CELL_COUNT_ACTUAL=vertices.length;
const neighbours=Array.from({length:vertices.length},()=>new Set());
for(const [a,b,c] of faces)for(const [x,y] of [[a,b],[b,c],[c,a]]){neighbours[x].add(y);neighbours[y].add(x);}
export const cellNeighbours=cell=>[...(neighbours[cell]??[])];
export const cellVec=cell=>vertices[cell]??vertices[0];
export const nodeCell=n=>cellOf(...vec(n.lat,n.lon));

// Balanced 3D kd-tree keeps per-pixel spherical cell lookup quick.
function tree(ids,depth=0) {
  if(!ids.length)return null;
  const axis=depth%3;ids.sort((a,b)=>vertices[a][axis]-vertices[b][axis]);
  const m=ids.length>>1;return {id:ids[m],axis,left:tree(ids.slice(0,m),depth+1),right:tree(ids.slice(m+1),depth+1)};
}
const kd=tree(vertices.map((_,i)=>i));
export function cellOf(x,y,z) {
  const target=[x,y,z];let best=0,score=-Infinity;
  function visit(node) {
    if(!node)return;
    const v=vertices[node.id],d=target[0]*v[0]+target[1]*v[1]+target[2]*v[2];if(d>score){score=d;best=node.id;}
    const delta=target[node.axis]-v[node.axis],first=delta<0?node.left:node.right,second=delta<0?node.right:node.left;
    visit(first);if(delta*delta<Math.max(0,2*(1-score)))visit(second);
  }
  visit(kd);return best;
}
// 화면에서 붙은 픽셀은 대개 같은 칸이다. 앞 픽셀의 칸에서 출발해 더 가까운 이웃 칸으로 옮겨 가다가,
// 이웃 칸들보다 가까운 칸에 닿으면 그 칸이 답이다(전체 검색과 같은 답, tests/fast-cell-lookup.mjs). 몇 걸음 안에 못 닿으면 전체 검색
// 픽셀마다 불리므로 평평한 숫자 배열로 둔다 (칸 좌표 XYZ, 이웃 목록 NEAR의 칸별 시작 위치 FROM)
const XYZ=Float64Array.from(vertices.flat()),FROM=new Int32Array(vertices.length+1);
neighbours.forEach((s,c)=>{FROM[c+1]=FROM[c]+s.size;});
const NEAR=Int32Array.from(neighbours.flatMap(s=>[...s]));
export function nearCell(cell,x,y,z) {
  for(let step=0;step<4;step++) {
    let i=cell*3,best=x*XYZ[i]+y*XYZ[i+1]+z*XYZ[i+2],next=cell;
    for(let k=FROM[cell],end=FROM[cell+1];k<end;k++){i=NEAR[k]*3;const d=x*XYZ[i]+y*XYZ[i+1]+z*XYZ[i+2];if(d>best){best=d;next=NEAR[k];}}
    if(next===cell)return cell;
    cell=next;
  }
  return cellOf(x,y,z);
}
export const PENTAGON_COUNT=12, HEXAGON_COUNT=CELL_COUNT-PENTAGON_COUNT;
export const cellSides=cell=>cellNeighbours(cell).length;

// Compatibility helpers for migrating the former 24×24 cube-sphere save.
const LN=24, LF=LN*LN, LQ=4/Math.PI;
export function legacyCellVec(c) {
  const f=Math.floor(c/LF),j=Math.floor((c%LF)/LN),i=c%LN;
  const a=Math.tan(((i+.5)/LN*2-1)/LQ),b=Math.tan(((j+.5)/LN*2-1)/LQ);
  const v=[[1,-b,-a],[-1,-b,a],[a,-b,1],[-a,-b,-1],[a,1,b],[a,-1,-b]][f];const m=Math.hypot(...v);return v.map(x=>x/m);
}
