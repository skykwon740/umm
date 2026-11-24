// 무전 창 + 스포트라이트. 튜토리얼·승진 통보·떠돌이 외계인 알림이 함께 쓴다.
const el=(tag,cls,html='')=>{const e=document.createElement(tag);if(cls)e.className=cls;e.innerHTML=html;return e;};
// 무전 창은 화면 아래에 뜬다. 밝힌 곳(구멍)을 가리면 상단 바 바로 아래로 옮긴다.
// 위로 옮겨도 가리면 아래에 그대로 둔다. hole = {top,bottom} (없으면 null)
export function radioPlacement(hole,{height,viewport,topBar=0,gap=20}) {
  if(!hole||!height)return 'bottom';
  const covers=(from,to)=>hole.top<to&&hole.bottom>from;
  const atBottom=covers(viewport-gap-height,viewport-gap),atTop=covers(topBar+8,topBar+8+height);
  return atBottom&&!atTop?'top':'bottom';
}

export function createRadio() {
  // spotlight: one hole with a huge shadow + 4 blockers so only the hole is clickable
  const shade=el('div','d-shade');shade.hidden=true;
  const hole=el('div','d-hole');shade.append(hole);
  const blockers=[0,1,2,3].map(()=>{const b=el('div','d-block');shade.append(b);return b;});

  const box=el('section','d-radio');box.hidden=true;
  box.setAttribute('role','dialog');box.setAttribute('aria-label','본부 무전');
  box.innerHTML=`<span class="d-label">[본부]</span><span class="d-step"></span>
    <p class="d-text" aria-live="polite"></p><span class="d-more" aria-hidden="true">▼</span>
    <button type="button" class="d-skip">건너뛰기</button>`;
  document.body.append(shade,box);
  const textEl=box.querySelector('.d-text'),stepEl=box.querySelector('.d-step');
  const moreEl=box.querySelector('.d-more'),skipEl=box.querySelector('.d-skip');

  let target=null,typing=null,waitClick=null,closeTimer=0;

  box.addEventListener('click',event=>{
    if(event.target===skipEl)return;
    if(typing){typing();return;}          // 타이핑 중 클릭 → 전부 표시
    if(waitClick){const done=waitClick;waitClick=null;moreEl.hidden=true;done();}
  });

  function open({step='',skip=null}={}) {
    clearTimeout(closeTimer);box.hidden=false;stepEl.textContent=step;
    skipEl.hidden=!skip;skipEl.onclick=skip;
  }
  function close() {
    clearTimeout(closeTimer);box.hidden=true;spot(false);
    typing?.();waitClick=null;textEl.textContent='';
  }
  const setStep=step=>{stepEl.textContent=step;};

  // types one line. click:true → resolves after the reader clicks again.
  function line(text,{click=true,speed=32}={}) {
    clearTimeout(closeTimer);typing?.();waitClick=null;moreEl.hidden=true;
    return new Promise(resolve=>{
      let i=0,timer=0;
      const finish=()=>{
        clearInterval(timer);typing=null;textEl.textContent=text;
        if(click){moreEl.hidden=false;waitClick=resolve;}else resolve();
      };
      typing=finish;textEl.textContent='';
      timer=setInterval(()=>{i++;textEl.textContent=text.slice(0,i);if(i>=text.length)finish();},speed);
    });
  }
  // short message that closes by itself (승진, 떠돌이 포착)
  async function notice(lines,ms=2600) {
    if(isBusy())return false;
    open();box.classList.add('d-notice');
    for(const text of lines)await line(text,{click:false});
    closeTimer=setTimeout(()=>{box.classList.remove('d-notice');close();},ms);
    return true;
  }
  const isBusy=()=>!box.hidden&&!box.classList.contains('d-notice');

  // target: false(off) | null(dim all) | 'clear'(block all, no dim) | selector | Element | ()=>DOMRect|null
  function spot(next) {
    target=next;shade.hidden=next===false;
    shade.classList.toggle('clear',next==='clear');tick();
  }
  function rectOf() {
    if(target===null||target==='clear')return null;
    if(typeof target==='function')return target();
    const node=typeof target==='string'?document.querySelector(target):target;
    if(!node||node.hidden||getComputedStyle(node).visibility==='hidden')return null;
    const r=node.getBoundingClientRect();
    return r.width&&r.height?r:null;
  }
  function place(where,topBar=0) {
    box.style.top=where==='top'?topBar+8+'px':'';box.style.bottom=where==='top'?'auto':'';
  }
  function tick() {
    if(shade.hidden){if(box.style.top)place('bottom');return;}
    const r=rectOf(),pad=8,W=innerWidth,H=innerHeight;
    const [x,y,w,h]=r?[Math.max(0,r.left-pad),Math.max(0,r.top-pad),r.width+pad*2,r.height+pad*2]:[W/2,H/2,0,0];
    Object.assign(hole.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
    hole.classList.toggle('on',Boolean(r));
    // 좁은 화면에서 아래 판(정보창) 속 가족 칸을 무전 창이 가리지 않게
    const topBar=document.getElementById('top')?.offsetHeight??0;
    place(radioPlacement(r?{top:y,bottom:y+h}:null,{height:box.offsetHeight,viewport:H,topBar}),topBar);
    const boxes=[[0,0,W,y],[0,y+h,W,H-y-h],[0,y,x,h],[x+w,y,W-x-w,h]];
    blockers.forEach((b,i)=>{const [l,t,bw,bh]=boxes[i];
      Object.assign(b.style,{left:l+'px',top:t+'px',width:Math.max(0,bw)+'px',height:Math.max(0,bh)+'px'});});
  }
  return {open,close,line,notice,spot,tick,setStep,isBusy};
}
