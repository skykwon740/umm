import {state,visitCurrent} from '../core/state.js';
import {story as fetchStory,familyPool,family} from '../content/wikipedia.js';
import {wikiEmbedURL} from '../content/result-links.js';

// 이야기 창: 요약, 원문, 창 안에서 보기, 가족 후보 3칸. 열 때마다 후보를 새로 뽑는다.
const $=id=>document.getElementById(id);
const storyEl=$('story'),summaryEl=$('storySummary'),guideEl=$('familyGuide'),listEl=$('familyBoxes');
const retryEl=$('storyRetry'),embedEl=$('embedWiki'),frameEl=$('wikiFrame');
const keyOf=n=>n.lang+':'+n.t;

export function createStory({onChoose,onFirstContact,onToggle}) {
  const stories=new Map(),pools=new Map(),shown=new Map();
  let node=null,token=0,again=false;
  // 같은 문서는 한 번만 받아 두고, 실패하면 다음에 다시 받는다
  function cached(map,key,load) {
    if(!map.has(key)){const p=load();map.set(key,p);p.catch(()=>map.delete(key));}
    return map.get(key);
  }
  async function candidates(n) {
    const key=keyOf(n),pool=await cached(pools,key,()=>familyPool(n.lang,n.t));
    const exclude=state.nodes.filter(m=>m.lang===n.lang).map(m=>m.t);
    const picked=await family(n.lang,pool,{exclude,avoid:shown.get(key)??[]});
    return picked;
  }
  function familyGuide(count,again) {
    if(!count)return '이 문서에서는 이어질 가족을 찾지 못했어요. 다른 외계인에게 가 보거나 새 관심사로 출발해 보세요.';
    const pick='한 명을 고르면 그 외계인까지 길이 열려요.';
    if(count<3)return `가족 후보가 ${count}명뿐이에요. ${pick}`;
    return again?`다시 만나서 가족 후보를 새로 뽑았어요. ${pick}`:pick;
  }
  function showFamily(from,list,again) {
    listEl.replaceChildren(...list.map(c=>{
      const item=document.createElement('li'),button=document.createElement('button');
      const title=document.createElement('span'),line=document.createElement('small');
      button.type='button';title.textContent=c.t;line.textContent=c.d;
      button.append(title);if(c.d)button.append(line);
      button.addEventListener('click',()=>{if(node===from&&!state.busy)onChoose(from,c);});
      item.append(button);return item;
    }));
    guideEl.textContent=familyGuide(list.length,again);
  }
  async function load(n,again) {
    const mine=++token,key=keyOf(n);
    retryEl.hidden=true;listEl.replaceChildren();
    summaryEl.textContent='이야기를 듣는 중…';guideEl.textContent='가족을 찾는 중…';
    let failed=false;
    const summary=cached(stories,key,()=>fetchStory(n.lang,n.t)).then(s=>{
      if(mine!==token)return;
      summaryEl.textContent=!s?'위키백과에서 이 문서를 찾지 못했어요. 원문 링크로 확인해 보세요.'
        :s.summary||'요약이 없는 문서예요. 원문이나 창 안에서 보기로 읽어 보세요.';
    },()=>{if(mine===token){failed=true;summaryEl.textContent='이야기를 불러오지 못했어요.';}});
    const relatives=candidates(n).then(list=>{
      if(mine!==token)return;
      shown.set(key,list.map(c=>c.t));showFamily(n,list,again);
    },()=>{if(mine===token){failed=true;guideEl.textContent='가족 후보를 불러오지 못했어요. 연결을 확인하고 다시 불러와 주세요.';}});
    await Promise.all([summary,relatives]);
    if(mine===token&&failed)retryEl.hidden=false;
  }
  function setEmbed(open) {
    if(open&&node&&!frameEl.getAttribute('src'))frameEl.src=wikiEmbedURL(node);
    frameEl.hidden=!open;embedEl.setAttribute('aria-expanded',String(open));
    embedEl.textContent=open?'창 접기':'창 안에서 보기';
  }
  function open(n) {
    if(node)return;
    node=n;frameEl.removeAttribute('src');setEmbed(false);storyEl.hidden=false;onToggle(true);
    // 처음 이야기를 들으면 만난 외계인이 된다 (문서당 1회, 사용자 결정 2026-11-21). 저장된 깃발로 판단한다
    const first=visitCurrent();again=!first;
    if(first)onFirstContact?.(n);
    load(n,again);
  }
  function close() {
    if(!node)return;
    node=null;token++;storyEl.hidden=true;setEmbed(false);frameEl.removeAttribute('src');onToggle(false);
  }
  embedEl.addEventListener('click',()=>setEmbed(frameEl.hidden));
  retryEl.addEventListener('click',()=>{if(node)load(node,again);});
  return {open,close,get node(){return node;}};
}
