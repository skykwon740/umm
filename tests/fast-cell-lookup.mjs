// 지구본 픽셀마다 칸을 찾는 빠른 길(nearCell)이 전체 검색(cellOf)과 언제나 같은 칸을 돌려주는지 확인한다.
// nearCell은 옆 픽셀의 칸이 이웃 칸들보다 여전히 가까우면 그 칸을 그대로 쓴다. 틀리면 칸 경계가 어긋나 그려진다.
import assert from 'node:assert/strict';
import {CELL_COUNT,cellOf,cellVec,cellNeighbours,nearCell} from '../src/core/grid.js';

let seed=12345;
const rand=()=>(seed=Math.imul(seed^seed>>>15,2654435761)>>>0,(seed>>>0)/4294967296);
const randomPoint=()=>{const z=rand()*2-1,a=rand()*Math.PI*2,r=Math.sqrt(1-z*z);return [r*Math.cos(a),z,r*Math.sin(a)];};
const brute=p=>{let best=0,score=-Infinity;for(let c=0;c<CELL_COUNT;c++){const v=cellVec(c),d=p[0]*v[0]+p[1]*v[1]+p[2]*v[2];if(d>score){score=d;best=c;}}return best;};

// 1) 아무 점에서나: 진짜 가장 가까운 칸 주변 두 겹 안의 어느 칸에서 출발해도 답이 같다
for(let i=0;i<40000;i++) {
  const p=randomPoint(),t=brute(p);
  assert.equal(cellOf(...p),t);
  const ring=new Set([t]);
  for(const a of cellNeighbours(t)){ring.add(a);for(const b of cellNeighbours(a))ring.add(b);}
  for(const c of ring)assert.equal(nearCell(c,...p),t,`start ${c} at point ${i}`);
}

// 2) 렌더러처럼 한 줄씩 훑을 때(왼쪽 픽셀의 칸에서 출발): 여러 카메라 각도·확대에서 전체 검색과 같다
for(let view=0;view<24;view++) {
  const lat=(rand()*170-85)*Math.PI/180,lon=rand()*Math.PI*2,R=[40,150,600,1400][view%4];
  const cl=Math.cos(lat),sl=Math.sin(lat),co=Math.cos(lon),so=Math.sin(lon),W=240,H=160,cx=W/2,cy=H/2;
  for(let y=0;y<H;y++) {
    let left=-1;
    for(let x=0;x<W;x++) {
      const dx=(x+.5-cx)/R,dy=(cy-y-.5)/R,d2=dx*dx+dy*dy;
      if(d2>1){left=-1;continue;}
      const z=Math.sqrt(1-d2),wy=dy*cl+z*sl,z1=-dy*sl+z*cl,wx=dx*co+z1*so,wz=-dx*so+z1*co;
      const c=left>=0?nearCell(left,wx,wy,wz):cellOf(wx,wy,wz);
      assert.equal(c,cellOf(wx,wy,wz));
      left=c;
    }
  }
}
console.log('PASS: nearCell matches the full cell search for random points and renderer-style scans.');
