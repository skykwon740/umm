// 홈화면 행성 그림용: 저장된 탐험에서 칠해진 칸과 그 색, 캐릭터 위치만 읽는다. 지금 상태(state)는 건드리지 않는다.
// 팀 문서: 「지나온 면적은 점수가 아니라 행성의 무늬가 됨」
import {CELL_COUNT} from './grid.js';
import {PLAN,ROAD,BLDG,ENTERED,routeColor} from './state.js';
import {storageKey} from './planets.js';

const PAINTED=new Set([PLAN,ROAD,BLDG,ENTERED]);
const UNROUTED='#45acd4';   // 루트 정보가 없는 옛 저장의 길: 렌더러와 같은 UI 색
export function readPlanetMap(storage,id) {
  const empty={paint:new Map(),here:-1};
  try {
    const s=JSON.parse(storage?.getItem(storageKey('webglobe3',id)));
    if(!s||typeof s.c!=='string'||s.c.length!==CELL_COUNT)return empty;
    const journeys=Array.isArray(s.j)?s.j:[];
    const colorOf=root=>/^#[\da-f]{6}$/i.test(journeys[root]?.color??'')?journeys[root].color:routeColor(root);
    const paint=new Map();
    for(let c=0;c<CELL_COUNT;c++) {
      if(!PAINTED.has(+s.c[c]))continue;
      const first=Array.isArray(s.cs?.[c])?s.cs[c][0]:undefined;
      const root=Number.isInteger(first)?first:Number.isInteger(s.cr?.[c])?s.cr[c]:-1;
      paint.set(c,root>=0?colorOf(root):UNROUTED);
    }
    const here=Number.isInteger(s.h)&&s.h>=0&&s.h<CELL_COUNT?s.h:-1;
    return {paint,here};
  } catch { return empty; }
}
