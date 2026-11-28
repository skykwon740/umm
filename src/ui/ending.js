// Final exploration view: route replay, planet return, and a downloadable planet card.
import {state,ROAD,routeColor} from '../core/state.js';
import {RANKS,rankOf} from '../core/ranks.js';
import {progress} from '../core/progress.js';
import {currentPlanet,PLANETS,isUnlocked} from '../core/planets.js';
import {getInterest} from '../core/interests.js';
import {vec} from '../core/grid.js';
import {drawGlobeSnapshot,drawAlienSnapshot,cv,unproject,resize,project,pose,PX} from '../world/renderer.js';
import {focusCamera} from '../world/camera.js';

const HELMET=[
  '....k..k..k.....','....kk.kk.kk....','....kkkkkkkk....','....kkkkkkkk....',
  '................','.....dddddd.....','...ddwwwwwwdd...','..dwwwwwwwwwwd..',
  '.dwwvvvvvvvvwwd.','.dwvvvvvvvvvvwd.','dwwvvhvvvvvvvwwd','dwwvvvhvvvvvvwwd',
  'dwwvvvvvvvvvvwwd','.dwvvvvvvvvvvwd.','.dwwvvvvvvvvwwd.','..dwwwwwwwwwwd..',
  '...ddwwwwwwdd...','..dddddddddddd..','..dccccccccccd..','..dddddddddddd..',
];
export function drawBadge(canvas,index) {
  const rank=RANKS[index],top=index===RANKS.length-1,s=canvas.width/16,g=canvas.getContext('2d');
  const color={d:'#0b0b10',w:'#e8e4d8',h:'#ffffff',v:rank.visor,c:rank.collar,k:'#ffe066'};
  g.clearRect(0,0,canvas.width,canvas.height);
  HELMET.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch==='.'||(ch==='k'&&!top))return;g.fillStyle=color[ch];g.fillRect(x*s,y*s,s,s);}));
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function discovered() {let n=0;for(const c of state.cells)if(c>=ROAD)n++;return n/state.cells.length;}
function routeColorAt(root) {return state.journeys[root]?.color||routeColor(root);}

export function createEnding({onReplayTutorial,onHome}={}) {
  const tools=document.createElement('div');tools.className='d-tools';
  tools.innerHTML=`<button type="button" class="d-end">탐험 마치기</button><button type="button" class="d-replay">훈련 다시 받기</button>`;
  document.getElementById('side')?.append(tools);
  const view=document.createElement('main');view.className='f-results';view.hidden=true;
  view.setAttribute('aria-label','탐험 결과');
  view.innerHTML=`<header class="f-heading"><div><small>EXPLORATION COMPLETE</small><h1>탐험 결과</h1><p class="f-planet"></p><p class="f-instructions">행성을 움직여 탐험한 루트를 확인해보세요! 행성을 움직여 원하는 장면을 저장할 수 있습니다.</p></div></header>
    <section class="f-route-panel" aria-live="polite"><h2>행성 탐험 길</h2><p class="f-route-empty">지구본에서 색깔 길이나 외계인을 선택해 탐험 경로를 확인하세요.</p><div class="f-route-list"></div><button type="button" class="f-return-planet">전체 행성보기</button></section>
    <aside class="f-stats" aria-label="탐험 통계"></aside>
    <footer class="f-actions"><button type="button" class="f-save">행성 저장하기</button><button type="button" class="f-other">나의 다른 행성 보기</button><button type="button" class="f-resume">계속 탐험하기</button></footer>
    <button type="button" class="f-exit">종료</button>
    <section class="f-save-modal" hidden role="dialog" aria-modal="true" aria-label="행성 저장하기"></section>`;
  document.body.append(view);
  const endButton=tools.querySelector('.d-end'),list=view.querySelector('.f-route-list'),empty=view.querySelector('.f-route-empty');
  const noteTooltip=document.createElement('div');noteTooltip.className='f-note-tooltip';noteTooltip.textContent='노트 보기';noteTooltip.hidden=true;document.body.append(noteTooltip);
  let saveOpen=false,skipRepeatPromptOnce=false;
  const savedCards=new Set();
  let pointerStart=null,suppressClick=false;
  const side=document.getElementById('side');
  if(side&&globalThis.ResizeObserver)new ResizeObserver(()=>resize()).observe(side);

  function updateProgress() {
    const full=discovered()>=1;
    endButton.classList.toggle('complete',full);
    endButton.setAttribute('aria-label',full?'탐험 100% 완료. 탐험 결과 보기':'탐험 마치기');
  }
  function drawRoute(root,selectedIndex=null) {
    const journey=state.journeys[root];if(!journey)return;
    view.classList.add('has-route');document.body.classList.add('route-selected');resize();
    const color=routeColorAt(root),nodes=(journey.trip||[]).map(nodeIndex=>({node:state.nodes[nodeIndex],nodeIndex})).filter(item=>item.node?.awakened);
    empty.hidden=true;
    list.innerHTML=`<div class="f-route-chip" style="--route-color:${color}"><i></i><span>시작 단어: <b>${esc(journey.start||'새 탐험')}</b></span></div>
      <ol>${nodes.map(({node,nodeIndex},index)=>{const interest=getInterest(node),key=node.lang+':'+node.t;return `<li style="--route-color:${color}" data-route-node="${esc(key)}"><span class="f-step">${index+1}</span><button type="button" class="f-word" data-word="${esc(key)}" data-node-index="${nodeIndex}" aria-pressed="false"><span class="f-word-title"><b>${esc(node.t)}</b>${interest.heart?'<span class="f-heart" title="관심 표시">♥</span>':''}</span><small>${esc(node.lang==='ko'?'한국어':'English')}</small></button><div class="f-marks">${interest.memo.trim()?`<button type="button" class="f-note" data-note="${index}" title="노트 보기" aria-label="${esc(node.t)} 노트 보기">▤</button>`:''}</div><p class="f-note-text" data-note-text="${index}" hidden>${esc(interest.memo)}</p></li>`;}).join('')}</ol>${nodes.length?'':'<p class="f-route-empty">이 길에서 만난 외계인이 아직 없습니다.</p>'}`;
    list.querySelectorAll('.f-word').forEach(button=>button.addEventListener('click',()=>{
      list.querySelectorAll('.f-word').forEach(word=>{word.classList.toggle('selected',word===button);word.setAttribute('aria-pressed',String(word===button));});
      list.querySelectorAll('li').forEach(row=>row.classList.toggle('selected',row.dataset.routeNode===button.dataset.word));
      centerAlien(Number(button.dataset.nodeIndex));
    }));
    list.querySelectorAll('.f-note').forEach(button=>button.addEventListener('click',()=>{
      const note=list.querySelector(`[data-note-text="${button.dataset.note}"]`);note.hidden=!note.hidden;
    }));
    list.querySelectorAll('.f-note').forEach(button=>{
      const showTooltip=()=>{const rect=button.getBoundingClientRect(),width=noteTooltip.offsetWidth||86;noteTooltip.hidden=false;const left=Math.max(8,Math.min(innerWidth-width-8,rect.left+rect.width/2-width/2));const top=rect.top>=40?rect.top-34:rect.bottom+8;noteTooltip.style.left=`${left}px`;noteTooltip.style.top=`${Math.min(innerHeight-34,top)}px`;};
      button.addEventListener('mouseenter',showTooltip);button.addEventListener('focus',showTooltip);
      button.addEventListener('mouseleave',()=>{noteTooltip.hidden=true;});button.addEventListener('blur',()=>{noteTooltip.hidden=true;});
    });
    view.querySelector('.f-planet').textContent=currentPlanet().name;
    if(selectedIndex!==null){const button=list.querySelector(`.f-word[data-node-index="${selectedIndex}"]`);button?.click();}
  }
  function open() {
    const p=progress(),r=rankOf(p.met),other=PLANETS.some(planet=>planet.id!==currentPlanet().id&&isUnlocked(globalThis.localStorage,planet.id));
    view.querySelector('.f-planet').textContent=currentPlanet().name;
    view.querySelector('.f-stats').innerHTML=`<div><small>외계인</small><b>${p.met}명</b></div><div><small>밝힌 면적</small><b>${(discovered()*100).toFixed(1)}%</b></div><div><small>계급 <em>${RANKS.length}개 계급 중 ${r.index+1}위</em></small><b>${esc(r.rank.name)}</b></div>`;
    view.querySelector('.f-other').dataset.unlocked=String(other);
    view.classList.remove('has-route');document.body.classList.remove('route-selected');list.replaceChildren();empty.hidden=false;
    document.body.classList.add('results-open');view.hidden=false;resize();updateProgress();
    view.querySelector('.f-resume').focus({preventScroll:true});
  }
  function close() {view.hidden=true;noteTooltip.hidden=true;document.body.classList.remove('results-open','route-selected');saveOpen=false;resize();}
  view.querySelector('.f-return-planet').addEventListener('click',()=>{
    view.classList.remove('has-route');document.body.classList.remove('route-selected');list.replaceChildren();empty.hidden=false;resize();
  });
  function centerAlien(nodeIndex) {
    const node=state.nodes[nodeIndex];if(!node?.awakened)return;
    focusCamera({lat:node.lat,lon:node.lon},'lock');
  }
  function pickAt(x,y) {
    if(view.hidden||saveOpen)return;
    const sx=x/PX,sy=y/PX;
    for(let nodeIndex=state.nodes.length-1;nodeIndex>=0;nodeIndex--){
      const node=state.nodes[nodeIndex];if(!node.awakened)continue;
      const p=project(vec(node.lat,node.lon));if(!p)continue;
      const f=pose(p,node),mx=f.bx+f.ux*f.h/2,my=f.by+f.uy*f.h/2;
      if(Math.hypot(sx-mx,sy-my)<=Math.max(f.h*.72,7)){
        const root=state.journeys.findIndex(j=>j.trip?.includes(nodeIndex));
        if(root>=0)drawRoute(root,nodeIndex);
        else centerAlien(nodeIndex);
        return;
      }
    }
    const cell=unproject(x,y);
    if(cell<0)return;
    const roots=state.cellRootSets?.[cell]??[],root=roots[0]??state.cellRoots[cell];
    if(Number.isInteger(root)&&root>=0)drawRoute(root);
  }
  cv.addEventListener('pointerdown',event=>{if(event.button===0)pointerStart={x:event.clientX,y:event.clientY};});
  cv.addEventListener('pointermove',event=>{if(pointerStart&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>=5)suppressClick=true;});
  cv.addEventListener('pointerup',()=>{if(suppressClick)setTimeout(()=>{suppressClick=false;},0);pointerStart=null;});
  cv.addEventListener('pointercancel',()=>{pointerStart=null;suppressClick=true;setTimeout(()=>{suppressClick=false;},0);});
  cv.addEventListener('click',event=>{if(!suppressClick)pickAt(event.clientX,event.clientY);});

  function exploredJourneys() {
    return state.journeys.map((journey,index)=>({journey,index,nodes:(journey.trip||[]).map(nodeIndex=>state.nodes[nodeIndex]).filter(node=>node?.awakened)})).filter(item=>item.nodes.length);
  }
  function cardRoutePages() {
    const pages=[[]];let used=0;
    for(const item of exploredJourneys()) {
      const height=22+Math.ceil(item.nodes.length/7)*42+4;
      if(pages.at(-1).length>=4||used+height>330){pages.push([]);used=0;}
      pages.at(-1).push(item);used+=height;
    }
    return pages;
  }
  function cardCanvas(name,pageIndex=0,journeys=cardRoutePages()[pageIndex]) {
    const width=800,height=1120,c=document.createElement('canvas');c.width=width;c.height=height;
    const g=c.getContext('2d'),bg=g.createLinearGradient(0,0,width,height);bg.addColorStop(0,'#101b36');bg.addColorStop(1,'#080d20');g.fillStyle=bg;g.fillRect(0,0,width,height);
    let seed=19;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<180;i++){const x=rand()*width,y=rand()*height,r=rand()*2+1;g.globalAlpha=.32+rand()*.65;g.fillStyle='#eaf4ff';g.shadowColor='#a8d7ff';g.shadowBlur=r*3;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}g.globalAlpha=1;g.shadowBlur=0;
    g.strokeStyle='#50658c';g.lineWidth=3;g.strokeRect(22,22,width-44,height-44);
    if(pageIndex>0) {
      g.fillStyle='#f5f7ff';g.textAlign='center';g.font='bold 36px sans-serif';g.fillText('발견한 루트',width/2,100,690);
      drawCardRoutes(g,56,150,688,920,journeys);
      return c;
    }
    g.fillStyle='#f5f7ff';g.textAlign='center';g.font='bold 42px sans-serif';g.fillText(name.slice(0,26),width/2,92,690);
    g.fillStyle='#9caccb';g.font='20px sans-serif';g.fillText(`${currentPlanet().name}  •  탐험 일지`,width/2,130);
    drawGlobeSnapshot(c,54,190,450);
    const p=progress(),r=rankOf(p.met),lx=532,ly=218,lw=218,lh=476;
    g.fillStyle='#e7edf9';g.fillRect(lx,ly,lw,lh);g.fillStyle='#16233e';g.fillRect(lx+7,ly+7,lw-14,lh-14);
    g.fillStyle='#9fb8df';g.textAlign='center';g.font='bold 16px sans-serif';g.fillText('탐험가 자격증',lx+lw/2,ly+34);
    const badge=document.createElement('canvas');badge.width=128;badge.height=160;drawBadge(badge,r.index);g.imageSmoothingEnabled=false;g.drawImage(badge,lx+59,ly+52,100,125);
    g.fillStyle='#fff';g.textAlign='center';g.font='bold 23px sans-serif';g.fillText(r.rank.name,lx+lw/2,ly+214,lw-20);
    g.fillStyle='#d4ddf0';g.font='14px sans-serif';wrapText(g,r.rank.line||'새로운 행성을 탐험하고 외계인과 만났습니다.',lx+lw/2,ly+249,lw-30,21,4);
    g.strokeStyle='#7185a6';g.beginPath();g.moveTo(lx+18,ly+360);g.lineTo(lx+lw-18,ly+360);g.stroke();
    g.fillStyle='#9fb8df';g.font='13px sans-serif';g.fillText('발견한 외계인',lx+lw/2,ly+389);g.fillStyle='#fff';g.font='bold 26px sans-serif';g.fillText(String(p.met),lx+lw/2,ly+425);
    g.fillStyle='#91a6cc';g.font='13px sans-serif';g.textAlign='center';g.fillText(`탐구한 행성 면적  ${(discovered()*100).toFixed(1)}%`,lx+lw/2,ly+455,lw-18);
    g.textAlign='left';g.fillStyle='#dce7fa';g.font='18px sans-serif';g.fillText('발견한 루트',56,730);
    drawCardRoutes(g,56,756,688,330,journeys);
    return c;
  }
  function drawCardRoutes(g,x,y,width,height,journeys) {
    const spacing=84,firstX=x+148,routeGap=4,lineGap=42;
    let cursorY=y;
    g.save();g.beginPath();g.rect(x,y,width,height);g.clip();
    journeys.forEach(({journey,index:root,nodes})=>{
      const color=routeColorAt(root),chunks=Math.ceil(nodes.length/7);
      g.textAlign='left';g.textBaseline='middle';g.fillStyle=color;g.font='bold 12px sans-serif';
      let previousEnd=null;
      for(let row=0;row<chunks;row++){
        const items=nodes.slice(row*7,row*7+7),lineY=cursorY+22+row*lineGap;
        if(row===0)g.fillText(`시작 단어: ${journey.start||'탐험'}`,x,lineY,120);
        const positioned=items.map((node,index)=>({node,slot:row%2===0?index:6-index,x:firstX+(row%2===0?index:6-index)*spacing}));
        g.save();g.strokeStyle=color;g.lineWidth=3;g.shadowColor=color;g.shadowBlur=8;g.beginPath();
        g.moveTo(positioned[0].x,lineY);
        positioned.slice(1).forEach(item=>g.lineTo(item.x,lineY));
        if(previousEnd){g.moveTo(previousEnd.x,previousEnd.y);g.lineTo(positioned[0].x,lineY);}
        g.stroke();g.restore();
        positioned.forEach(({node,x:alienX})=>{
          drawAlienSnapshot(g,alienX,lineY-16,node,26,32);
          const label=node.t.length>12?node.t.slice(0,11)+'…':node.t;
          g.fillStyle='#eef3ff';g.font='10px sans-serif';g.textAlign='center';g.fillText(label,alienX,lineY+20,82);
        });
        const end=positioned.at(-1);previousEnd={x:end.x,y:lineY+lineGap};
      }
      cursorY+=22+chunks*lineGap+routeGap;
    });
    g.restore();
  }
  function wrapText(g,text,x,y,maxWidth,lineHeight,maxLines){const words=String(text).split(/\s+/);let line='',lines=[];for(const word of words){const test=line?line+' '+word:word;if(g.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);lines.slice(0,maxLines).forEach((row,i)=>g.fillText(row,x,y+i*lineHeight,maxWidth));}
  function showSaveForm() {
    saveOpen=true;const modal=view.querySelector('.f-save-modal');modal.hidden=false;
    modal.innerHTML=`<form class="f-save-box"><button type="button" class="f-modal-close" aria-label="닫기">×</button><h2>행성 저장하기</h2><p>이 작은 행성에 이름을 붙여 주세요.</p><label for="f-planet-name">행성 이름</label><input id="f-planet-name" maxlength="26" required value="${esc(currentPlanet().name)}" autocomplete="off"><button class="f-create" type="submit">카드 만들고 PNG 저장</button></form>`;
    modal.querySelector('.f-modal-close').onclick=closeSave;
    modal.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const name=modal.querySelector('input').value.trim();if(!name)return;
      const savedKey=`umm.planet-card-saved@${currentPlanet().id}`;
      let savedBefore=savedCards.has(currentPlanet().id);
      try{savedBefore=savedBefore||globalThis.localStorage?.getItem(savedKey)==='true';}catch{}
      if(skipRepeatPromptOnce)skipRepeatPromptOnce=false;
      else if(savedBefore&&typeof globalThis.confirm==='function'&&!globalThis.confirm('이미 한 번 저장했습니다. 또 저장하시겠습니까?'))return;
      const safeName=name.replace(/[\\/:*?"<>|]/g,'-'),pages=cardRoutePages(),totalPages=pages.length;
      const cards=pages.map((routes,index)=>({url:cardCanvas(name,index,routes).toDataURL('image/png'),index}));
      cards.forEach(({url},index)=>{const anchor=document.createElement('a');anchor.href=url;anchor.download=`${safeName}-planet${totalPages>1?`-${index+1}`:''}.png`;anchor.click();});
      savedCards.add(currentPlanet().id);try{globalThis.localStorage?.setItem(savedKey,'true');}catch{}
      modal.innerHTML=`<section class="f-save-box f-preview"><button type="button" class="f-modal-close" aria-label="닫기">×</button><h2>행성 카드가 저장됐어요</h2><p>${esc(name)} 카드 ${totalPages}장을 PNG로 다운로드했습니다.</p><div class="f-preview-cards">${cards.map(({url},index)=>`<figure><img alt="${esc(name)} 행성 탐험 카드 ${index+1}" src="${url}"><a class="f-download" href="${url}" download="${esc(safeName)}-planet${totalPages>1?`-${index+1}`:''}.png">PNG 다시 저장 ${totalPages>1?index+1:''}</a></figure>`).join('')}</div></section>`;
      modal.querySelector('.f-modal-close').onclick=closeSave;
    });
    modal.querySelector('input').focus({preventScroll:true});
  }
  function closeSave(){const modal=view.querySelector('.f-save-modal');modal.hidden=true;modal.replaceChildren();saveOpen=false;view.querySelector('.f-save').focus({preventScroll:true});}

  endButton.addEventListener('click',open);
  tools.querySelector('.d-replay').addEventListener('click',()=>onReplayTutorial?.());
  view.querySelector('.f-resume').addEventListener('click',()=>{skipRepeatPromptOnce=true;close();});
  view.querySelector('.f-exit').addEventListener('click',()=>onHome?.());
  view.querySelector('.f-save').addEventListener('click',showSaveForm);
  view.querySelector('.f-other').addEventListener('click',()=>{
    if(view.querySelector('.f-other').dataset.unlocked==='true')onHome?.();
    else globalThis.alert?.('아직 다른 행성을 열지 못했습니다!');
  });
  addEventListener('keydown',event=>{if(event.key==='Escape'&&!view.hidden){if(saveOpen)closeSave();else close();}});
  return {open,close,isOpen:()=>!view.hidden,tick:updateProgress};
}
