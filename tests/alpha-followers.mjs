// 알파 피드백: 계급이 오르면 작은 외계인이 따라다니고, 헬멧 색이 계급 색이 된다 (순수 로직 검사)
import assert from 'node:assert/strict';
import {RANKS,rankOf} from '../src/core/ranks.js';
import {MAX_FOLLOWERS,GAP,followerCount,helmetColor,createTrail,advanceTrail,followerSpots,isVisorPixel,tintVisor,shrinkHalf} from '../src/world/followers.js';
import {vec} from '../src/core/grid.js';

const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);

// 따라다니는 수 = 계급 번호, 최대 3
assert.deepEqual(RANKS.map((_,i)=>followerCount(i)),[0,1,2,3]);
assert.equal(followerCount(9),MAX_FOLLOWERS);assert.equal(MAX_FOLLOWERS,3);assert.equal(followerCount(-1),0);
[[0,0],[4,0],[5,1],[15,2],[25,3],[99,3]].forEach(([met,n])=>assert.equal(followerCount(rankOf(met).index),n,`${met} met -> ${n} followers`));

// 헬멧 색 = 계급 배지 색
RANKS.forEach((r,i)=>assert.equal(helmetColor(i),r.visor));

// 가만히 서 있을 때: 우주인과 겹치지 않고, 바라보는 쪽 반대로 간격 GAP씩 서 있다
const here=vec(10,20),trail=createTrail();
advanceTrail(trail,here,1);
let spots=followerSpots(trail,here,3);
assert.equal(spots.length,3);
spots.forEach((s,i)=>{assert.ok(Math.abs(dist(s,here)-GAP*(i+1))<0.01,`idle follower ${i} sits ${i+1} gaps away`);assert.ok(Math.abs(Math.hypot(...s)-1)<1e-9,'on the globe');});
assert.ok(dist(spots[0],here)>GAP*0.9,'not on top of the astronaut');
const east=vec(10,60);   // 멀리 오른쪽(경도 증가)
assert.ok(dist(spots[0],east)>dist(here,east),'facing right: followers stand on the left');
const left=createTrail();advanceTrail(left,here,-1);
assert.ok(dist(followerSpots(left,here,1)[0],east)<dist(here,east),'facing left: followers stand on the right');
assert.equal(followerSpots(trail,here,0).length,0);assert.deepEqual(followerSpots(trail,null,3),[]);

// 걸으면 걸어온 길 위 뒤쪽에 선다: 순서대로 한 걸음, 두 걸음, 세 걸음 뒤
const walk=createTrail();let lon=0;
for(let i=0;i<=80;i++){lon=i*0.5;advanceTrail(walk,vec(0,lon),1);}
const walker=vec(0,lon);spots=followerSpots(walk,walker,3);
spots.forEach((s,i)=>{
  assert.ok(Math.abs(s[1])<1e-6,'follower stays on the walked equator');
  assert.ok(Math.abs(dist(s,walker)-GAP*(i+1))<0.002,`walking follower ${i} is ${i+1} gaps behind`);
  const sLon=Math.atan2(s[0],s[2])*180/Math.PI;assert.ok(sLon<lon,'behind (west of) the walker moving east');
});
assert.ok(Math.atan2(spots[0][0],spots[0][2])>Math.atan2(spots[1][0],spots[1][2]),'follower 1 is closer than follower 2');
assert.ok(walk.pts.length<40,'trail is pruned to what the followers need');

// 순간이동하면 발자취를 새로 깐다 (옛 길에 서 있지 않는다)
const far=vec(-40,150);advanceTrail(walk,far,1);
assert.ok(followerSpots(walk,far,3).every((s,i)=>Math.abs(dist(s,far)-GAP*(i+1))<0.01),'trail reseeded after a jump');
advanceTrail(walk,null,1);assert.deepEqual(walk.pts,[]);

// 헬멧 유리 칸만 바꾼다: assets/astronaut.png를 14×16으로 줄였을 때의 어두운 무채색 칸
[[0x28,0x29,0x27],[0x2c,0x2c,0x2b],[0x29,0x28,0x29],[0x2a,0x29,0x28]].forEach(c=>assert.ok(isVisorPixel(...c),`visor ${c}`));
[[0xe9,0xe9,0xf5],[0x13,0x12,0x21],[0x2e,0x35,0x4d],[0xa7,0xb5,0xd7],[0x59,0x6d,0x92]].forEach(c=>assert.ok(!isVisorPixel(...c),`not visor ${c}`));
assert.equal(isVisorPixel(0x28,0x28,0x28,0),false,'transparent is never visor');
const px=new Uint8ClampedArray([0x28,0x29,0x27,255, 0xe9,0xe9,0xf5,255, 0x13,0x12,0x21,255, 0x28,0x29,0x27,0]);
RANKS.forEach(r=>{
  const out=tintVisor(px,r.visor),n=parseInt(r.visor.slice(1),16);
  assert.deepEqual([...out.slice(0,3)],[n>>16&255,n>>8&255,n&255].map(v=>Math.min(255,Math.round(v*(0x28+0x29+0x27)/(3*0x29)))),`${r.name} visor tinted`);
  assert.deepEqual([...out.slice(4,12)],[...px.slice(4,12)],'suit and outline stay');
  assert.deepEqual([...out.slice(12,16)],[...px.slice(12,16)],'transparent stays');
});
assert.notDeepEqual([...tintVisor(px,RANKS[3].visor).slice(0,3)],[...tintVisor(px,RANKS[1].visor).slice(0,3)],'ranks look different');
assert.equal(px[0],0x28,'source pixels are not modified');

// 작은 외계인: 16×20 → 8×10, 2×2 중 둘 이상 찬 칸만
const big=new Uint8ClampedArray(16*20*4);
const set=(x,y,r)=>{const i=(y*16+x)*4;big.set([r,100,50,255],i);};
set(0,0,100);set(1,0,200);set(0,1,100);   // 3칸 → 채움(평균 133)
set(2,0,10);                              // 1칸 → 비움
const small=shrinkHalf(big,16,20);
assert.deepEqual([small.width,small.height],[8,10]);
assert.deepEqual([...small.data.slice(0,4)],[133,100,50,255]);
assert.equal(small.data[7],0,'single stray pixel dropped');
console.log('PASS alpha-followers');
