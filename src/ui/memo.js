import {getInterest,saveInterest,MEMO_LIMIT} from '../core/interests.js';
export function createMemo() {
  const panel=document.getElementById('interestPanel'),heart=document.getElementById('heart');
  const toggle=document.getElementById('memoToggle'),editor=document.getElementById('memoEditor');
  const input=document.getElementById('memoText'),count=document.getElementById('memoCount'),status=document.getElementById('memoStatus');
  let current=null;
  const counter=()=>{count.textContent=`${input.value.length}/${MEMO_LIMIT}`;};
  function show(node) {
    if(current?.t===node?.t&&current?.lang===node?.lang)return;
    current=node;panel.hidden=!node;editor.hidden=true;toggle.setAttribute('aria-expanded','false');status.textContent='';
    if(!node)return;
    const value=getInterest(node);heart.setAttribute('aria-pressed',String(value.heart));
    heart.textContent=value.heart?'♥ 관심 표시됨':'♡ 관심 표시';input.value=value.memo;counter();
  }
  heart.addEventListener('click',()=>{
    if(!current)return;
    const value=getInterest(current),ok=saveInterest(current,{heart:!value.heart});
    if(ok){heart.setAttribute('aria-pressed',String(!value.heart));heart.textContent=!value.heart?'♥ 관심 표시됨':'♡ 관심 표시';}
    status.textContent=ok?'관심 표시를 저장했습니다.':'저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.';
  });
  toggle.addEventListener('click',()=>{
    editor.hidden=!editor.hidden;toggle.setAttribute('aria-expanded',String(!editor.hidden));
    if(!editor.hidden)input.focus();
  });
  input.addEventListener('input',()=>{counter();status.textContent='아직 저장하지 않은 메모입니다.';});
  editor.addEventListener('submit',event=>{
    event.preventDefault();if(!current)return;
    status.textContent=saveInterest(current,{memo:input.value})?'메모를 저장했습니다.':'저장하지 못했습니다. 글자 수와 브라우저 저장 공간을 확인해 주세요.';
  });
  return {show};
}
