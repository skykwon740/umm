import {wikiURL,wikiEmbedURL,imageSearchURL} from '../content/result-links.js';
import {imageList} from '../content/images.js';

// 정보창 옆(화면 오른쪽)에 뜨는 보기 창. 위키백과 원문 또는 이미지 격자 중 하나만 보여 주고, 바꾸면 교체한다.
const $=id=>document.getElementById(id);
export function createViewer({onChange=()=>{}}={}) {
  const box=$('viewer'),titleEl=$('viewerTitle'),closeEl=$('viewerClose'),frame=$('wikiFrame'),grid=$('imageGrid');
  const note=$('viewerNote'),external=$('viewerExternal');
  const cache=new Map();   // 문서별 이미지 목록. 실패하면 지워서 다음에 다시 받는다
  let kind=null,node=null,token=0,opener=null;
  function say(text){note.textContent=text;note.hidden=!text;}
  async function showImages(n) {
    const mine=token,key=n.lang+':'+n.t;
    say('이미지를 불러오는 중…');
    if(!cache.has(key)){const p=imageList(n.lang,n.t);cache.set(key,p);p.catch(()=>cache.delete(key));}
    try {
      const list=await cache.get(key);
      if(mine!==token)return;
      grid.replaceChildren(...list.map(image=>{
        const item=document.createElement('li'),img=document.createElement('img');
        img.src=image.src;img.alt=image.alt;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
        item.append(img);return item;
      }));
      grid.hidden=!list.length;say(list.length?'':'이 문서에서 보여 줄 이미지를 찾지 못했어요.');
    } catch {
      if(mine===token)say('이미지를 불러오지 못했어요.');
    }
  }
  function open(next,n,from) {
    token++;kind=next;node=n;opener=from??null;
    frame.removeAttribute('src');grid.replaceChildren();grid.hidden=true;say('');
    box.hidden=false;
    if(next==='wiki') {
      titleEl.textContent='위키백과 원문';frame.src=wikiEmbedURL(n);frame.hidden=false;
      external.textContent='새 탭으로 열기';external.href=wikiURL(n);
    } else {
      titleEl.textContent='이미지';frame.hidden=true;
      external.textContent='구글 이미지';external.href=imageSearchURL(n);
      showImages(n);
    }
    box.setAttribute('aria-label',`${n.t} ${titleEl.textContent}`);
    onChange(kind);
  }
  function close(returnFocus=false) {
    if(!kind)return;
    const from=opener;
    token++;kind=node=opener=null;box.hidden=true;frame.removeAttribute('src');frame.hidden=true;grid.replaceChildren();grid.hidden=true;say('');
    onChange(null);
    if(returnFocus)from?.focus();
  }
  // 같은 종류를 다시 누르면 닫고, 다른 종류를 누르면 교체한다
  function toggle(next,n,from) {
    if(kind===next&&node.t===n.t&&node.lang===n.lang)close(true);else open(next,n,from);
  }
  closeEl.addEventListener('click',()=>close(true));
  return {toggle,close,get kind(){return kind;}};
}
