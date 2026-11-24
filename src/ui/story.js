import {state,visitCurrent} from '../core/state.js';
import {story as fetchStory,familyPool,family} from '../content/wikipedia.js';

// 정보창: 요약, 원문·이미지 버튼, 관심·메모 자리, “단어”의 가족들 3칸. 열 때와 ↻를 누를 때마다 가족을 새로 뽑는다.
const $=id=>document.getElementById(id);
const storyEl=$('story'),summaryEl=$('storySummary'),guideEl=$('familyGuide'),listEl=$('familyBoxes');
const titleEl=$('familyTitle'),rerollEl=$('familyReroll'),retryEl=$('storyRetry');
const keyOf=n=>n.lang+':'+n.t;
const FAMILY_FAILED='가족을 불러오지 못했어요. 연결을 확인하고 다시 불러와 주세요.';

export function createStory({onChoose,onFirstContact,onToggle}) {
  const stories=new Map(),pools=new Map(),shown=new Map();
  let node=null,token=0,familyToken=0,again=false;
  // 같은 문서는 한 번만 받아 두고, 실패하면 다음에 다시 받는다
  function cached(map,key,load) {
    if(!map.has(key)){const p=load();map.set(key,p);p.catch(()=>map.delete(key));}
    return map.get(key);
  }
  async function candidates(n) {
    const key=keyOf(n),pool=await cached(pools,key,()=>familyPool(n.lang,n.t));
    const exclude=state.nodes.filter(m=>m.lang===n.lang).map(m=>m.t);
    return family(n.lang,pool,{exclude,avoid:shown.get(key)??[]});   // avoid: 지금 보이는 후보
  }
  function familyGuide(count,again) {
    return count?'':'이 문서에서는 이어질 가족을 찾지 못했어요.';
  }
  function showFamily(from,list,again) {
    listEl.replaceChildren(...list.map((c,i)=>{
      const item=document.createElement('li'),button=document.createElement('button');
      const title=document.createElement('span'),line=document.createElement('small');
      button.type='button';button.className='family-card';title.textContent=c.t;
      button.append(title);
      // 설명은 마우스를 올리거나 키보드로 고른 카드에서만 한 줄로 보인다
      if(c.d){line.id=`familyLine${i}`;line.textContent=c.d;button.setAttribute('aria-describedby',line.id);button.append(line);}
      button.addEventListener('click',()=>{if(node===from&&!state.busy)onChoose(from,c);});
      item.append(button);return item;
    }));
    guideEl.textContent=familyGuide(list.length,again);
  }
  // 가족만 다시 뽑는다. 요약은 건드리지 않는다
  async function loadFamily(n,again) {
    const mine=++familyToken,key=keyOf(n);
    retryEl.hidden=true;rerollEl.disabled=true;listEl.replaceChildren();guideEl.textContent='가족을 찾는 중…';
    try {
      const list=await candidates(n);
      if(mine!==familyToken)return;
      shown.set(key,list.map(c=>c.t));showFamily(n,list,again);
    } catch {
      if(mine===familyToken){guideEl.textContent=FAMILY_FAILED;retryEl.hidden=false;}
    } finally {
      if(mine===familyToken)rerollEl.disabled=false;
    }
  }
  async function load(n,again) {
    const mine=++token,key=keyOf(n);
    retryEl.hidden=true;
    summaryEl.textContent='이야기를 듣는 중…';
    const summary=cached(stories,key,()=>fetchStory(n.lang,n.t)).then(s=>{
      if(mine!==token)return;
      summaryEl.textContent=!s?'위키백과에서 이 문서를 찾지 못했어요.'
        :s.summary||'요약이 없는 문서예요.';
    },()=>{if(mine===token){summaryEl.textContent='이야기를 불러오지 못했어요.';retryEl.hidden=false;}});
    await Promise.all([summary,loadFamily(n,again)]);
  }
  function open(n) {
    if(node)return;
    node=n;titleEl.textContent=`“${n.t}”의 가족들`;storyEl.hidden=false;onToggle(true);
    // 처음 열면 만난 외계인이 된다 (문서당 1회, 사용자 결정 2026-11-21). 저장된 깃발로 판단한다
    const first=visitCurrent();again=!first;
    if(first)onFirstContact?.(n);
    load(n,again);
  }
  function close() {
    if(!node)return;
    node=null;token++;familyToken++;storyEl.hidden=true;onToggle(false);
  }
  rerollEl.addEventListener('click',()=>{if(node&&!state.busy)loadFamily(node,false);});
  retryEl.addEventListener('click',()=>{if(node)load(node,again);});
  return {open,close,get node(){return node;}};
}
