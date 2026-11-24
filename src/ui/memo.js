import {getInterest,saveInterest,MEMO_LIMIT} from '../core/interests.js';
// 외계인 정보창의 관심 표시(하트)와 메모. 메모는 입력 뒤 잠시 있다가, 정보창이 닫힐 때, 다른 외계인으로 바뀔 때 저장한다.
const FAILED='저장하지 못했습니다. 글자 수와 브라우저 저장 공간을 확인해 주세요.';
let active=null;
export const flushMemo=()=>active?.flush();
export function createMemo({delay=600}={}) {
  const heart=document.getElementById('heart'),input=document.getElementById('memoText');
  const count=document.getElementById('memoCount'),status=document.getElementById('memoStatus');
  let current=null,timer=null,dirty=false;
  const counter=()=>{count.textContent=`${input.value.length}/${MEMO_LIMIT}`;};
  const paint=value=>{heart.setAttribute('aria-pressed',String(value));heart.textContent=value?'♥':'♡';};
  function flush() {
    clearTimeout(timer);timer=null;
    if(!dirty||!current)return;
    dirty=false;status.textContent=saveInterest(current,{memo:input.value})?'':FAILED;
  }
  function show(node) {
    node=node??null;
    if(current?.t===node?.t&&current?.lang===node?.lang)return;
    flush();
    current=node;status.textContent='';
    if(!node)return;
    const value=getInterest(node);paint(value.heart);input.value=value.memo;counter();
  }
  heart.addEventListener('click',()=>{
    if(!current)return;
    const next=!getInterest(current).heart;
    if(saveInterest(current,{heart:next})){paint(next);status.textContent='';}
    else status.textContent=FAILED;
  });
  input.addEventListener('input',()=>{
    counter();dirty=true;clearTimeout(timer);timer=setTimeout(flush,delay);
  });
  globalThis.addEventListener?.('pagehide',flush);
  active={flush};
  return {show,flush};
}
