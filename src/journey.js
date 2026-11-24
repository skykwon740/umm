import {state,beginJourney,addJourneyNode,previewJourneyNode,clearJourneyPreview,revealRoute,holdJourney,completeJourney,
  beginExtension,finishExtension} from './core/state.js';
import {vec,ll,cellVec,cellOf,slerp,hash,nodeCell,DEG} from './core/grid.js';
import * as wikipedia from './content/wikipedia.js';

// Presentation, timing and content are explicit dependencies. No DOM or renderer.
export function createJourney({onStart,onChange,onFocus,onArrive,onMessage,onFinish,
  wiki=wikipedia,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
  now=()=>performance.now(),requestFrame=callback=>requestAnimationFrame(callback)}) {
  function reveal(a,b) {
    return new Promise(resolve=>{
      const va=vec(a.lat,a.lon),vb=vec(b.lat,b.lon);
      const ang=Math.acos(Math.max(-1,Math.min(1,va[0]*vb[0]+va[1]*vb[1]+va[2]*vb[2])))*DEG;
      const n=Math.max(1,Math.ceil(ang*4)),duration=600+ang*10,start=now();
      let s=0;onFocus(a,'overview');
      function tick(time) {
        const t=Math.min(1,(time-start)/duration),cells=[];
        for(;s<=n*t;s++) {
          const position=slerp(va,vb,s/n);cells.push(cellOf(...position));
          const [lat,lon]=ll(position);onFocus({lat,lon},'track');
        }
        revealRoute(cells);if(t<1)requestFrame(tick);else resolve();
      }
      tick(start);
    });
  }
  // 관심사 → 첫 외계인. 캐릭터는 첫 외계인 앞에서 시작한다.
  async function run(query,lang) {
    if(!query.trim()||!beginJourney(query.trim()))return;
    onStart();onChange();lang=lang||(/[ㄱ-ㅎ가-힣]/.test(query)?'ko':'en');
    try {
      const first=await wiki.search(lang,query);
      if(!first){onMessage(query+' 문서를 찾지 못했습니다. 다른 관심사를 입력해 주세요.');return;}
      addJourneyNode(first,lang,await wiki.describe(lang,first));onChange();
    } catch {
      onMessage('경로를 불러오지 못했습니다. 연결을 확인하고 다시 출발해 주세요.');
    } finally {
      const arrived=completeJourney();onFinish();
      if(arrived){const [lat,lon]=ll(state.walker);onFocus({lat,lon},'walk');onArrive();}
      else onChange();
    }
  }
  // 지금 서 있는 외계인에서 고른 가족까지 길을 공개하고 새 외계인을 놓는다.
  async function extend(word,lang,description='') {
    const from=state.nodes.find(n=>nodeCell(n)===state.here);
    if(!from||!word||!beginExtension())return null;
    onStart();
    let node=null;
    try {
      const [lat,lon]=ll(cellVec(hash(word)%state.cells.length));
      previewJourneyNode(word,description);onChange();await reveal(from,{lat,lon});
      node=addJourneyNode(word,lang,description);clearJourneyPreview();
      holdJourney();onChange();onFocus(node,'walk');await wait(1100);
    } finally {
      finishExtension();onFinish();
      const [lat,lon]=ll(state.walker);onFocus({lat,lon},'walk');onArrive();
    }
    return node;
  }
  return {run,extend};
}
