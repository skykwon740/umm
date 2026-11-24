import {state,beginJourney,addJourneyNode,completeJourney,beginExtension,finishExtension} from './core/state.js';
import {ll,nodeCell} from './core/grid.js';
import * as wikipedia from './content/wikipedia.js';

// Presentation, timing and content are explicit dependencies. No DOM or renderer.
export function createJourney({onStart,onChange,onFocus,onArrive,onMessage,onFinish,wiki=wikipedia}) {
  // 관심사 → 첫 외계인. 캐릭터는 첫 외계인 앞에서 시작하고, 새 여정은 다른 길과 이어지지 않은 섬이다.
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
  // 지금 서 있는 외계인에서 고른 가족을 새 외계인으로 놓는다. 길은 미리 공개하지 않는다:
  // 캐릭터가 실제로 밟는 칸만 루트 색이 된다.
  async function extend(word,lang,description='') {
    const from=state.nodes.find(n=>nodeCell(n)===state.here);
    if(!from||!word||!beginExtension())return null;
    onStart();
    let node=null;
    try {
      node=addJourneyNode(word,lang,description);onChange();
    } finally {
      finishExtension();onFinish();onArrive();
    }
    return node;
  }
  return {run,extend};
}
