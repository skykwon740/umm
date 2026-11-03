import {state,beginJourney,addJourneyNode,previewJourneyNode,clearJourneyPreview,revealRoute,holdJourney,completeJourney} from './core/state.js';
import {vec,ll,cellVec,cellOf,slerp,hash,DEG} from './core/grid.js';
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
  async function run(query,lang) {
    if(!query.trim()||!beginJourney())return;
    onStart();onChange();lang=lang||(/[ㄱ-ㅎ가-힣]/.test(query)?'ko':'en');
    try {
      const first=await wiki.search(lang,query);
      if(!first){onMessage(query+' 문서를 찾지 못했습니다. 다른 관심사를 입력해 주세요.');return;}
      let current=addJourneyNode(first,lang,await wiki.describe(lang,first));
      onFocus(current,'overview');onChange();
      const path=[query,first];
      for(let hop=0;hop<2;hop++) {
        const [word]=await Promise.all([wiki.pick(lang,current.t,path),wait(500)]);
        if(!word)break;path.push(word);
        const [lat,lon]=ll(cellVec(hash(word)%state.cells.length));
        const description=await wiki.describe(lang,word);
        previewJourneyNode(word,description);onChange();await reveal(current,{lat,lon});
        current=addJourneyNode(word,lang,description);clearJourneyPreview();onChange();
      }
      if(state.trip.length>1) {
        holdJourney();onChange();onFocus(current,'walk');await wait(Math.min(3000,1300+current.t.length*120));
      }
    } catch {
      onMessage('경로를 불러오지 못했습니다. 연결을 확인하고 다시 출발해 주세요.');
    } finally {
      const arrived=completeJourney();onFinish();
      if(arrived){const [lat,lon]=ll(state.walker);onFocus({lat,lon},'walk');onArrive();}
      else onChange();
    }
  }
  return {run};
}
