import {apiRequest,openScreened} from '../content/safe-open.js';
import {loadExpeditions,saveExpeditions,remainingTime,EXPLORE_MS,createArchiveEntry,evaluationPrompt,comparisonsFor} from '../content/expeditions.js';
import {canonicalPage} from '../content/persona-world.js';

export function createExpeditionUI({getWorld,getPersona,addDestination,notice}) {
  const $=id=>document.getElementById(id);
  const archive=loadExpeditions();let active=archive.active,examples=[],requesting=false,generation=0;
  // A refreshed walking animation is restarted explicitly, never silently counted as browsing time.
  if(active&&['to-home','to-gate','sampling','to-page'].includes(active.phase)){active=null;archive.active=null;}
  const persist=()=>{archive.active=active;saveExpeditions(archive);};
  const setPhase=phase=>{active.phase=phase;persist();renderDock();};
  function renderDock() {
    $('expeditionDock').hidden=!active;
    if(!active)return;
    const names={'to-home':'내 영토로 이동','to-gate':'란더노티카로 이동',sampling:'공개 웹에서 목적지 검사 중','to-page':'우연한 페이지로 이동',ready:'페이지 열기',exploring:'10분 탐방',writing:'내 말로 정리하기'};
    $('expeditionStage').textContent=names[active.phase]||'';
    const left=remainingTime(active);
    const seconds=Math.ceil(left/1000);
    $('expeditionClock').textContent=active.phase==='exploring'?String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'):'';
    const action=$('expeditionAction');action.hidden=!['ready','exploring','writing'].includes(active.phase);
    action.textContent=active.phase==='ready'?'열기':active.phase==='exploring'?'탐방 끝내기':'요약 쓰기';
  }
  function startClock() {
    if(!openScreened(active.target)){setPhase('ready');return;}
    active.startedAt=Date.now();active.deadline=active.startedAt+EXPLORE_MS;setPhase('exploring');
  }
  async function drawTarget() {
    if(requesting)return;requesting=true;setPhase('sampling');
    const currentGeneration=generation;
    try {
      const target=await apiRequest('/api/wander',{exclude:getPersona().events.map(event=>canonicalPage(event.url)).filter(Boolean)});
      if(!active||currentGeneration!==generation)return;
      active.target=target;const key=addDestination(target);active.targetKey=key;
      setPhase('to-page');if(!getWorld().goToTile(key))throw new Error('목적지까지 길을 만들지 못했습니다.');
    }catch(error){if(currentGeneration===generation){notice(error.message);active=null;persist();renderDock();}}finally{requesting=false;}
  }
  function showWriter() {
    if(!active?.target)return;
    if(active.phase==='exploring'){active.finishedAt=Date.now();setPhase('writing');}
    $('summaryTarget').textContent=active.target.title+' · '+new URL(active.target.url).hostname;
    $('ownSummary').value=active.draft?.summary||'';$('summaryEvidence').value=active.draft?.evidence||'';$('summaryQuestion').value=active.draft?.question||'';
    $('summaryDialog').showModal();
  }
  function renderArchive() {
    const root=$('archiveList');root.replaceChildren();
    if(!archive.entries.length){const empty=document.createElement('p');empty.textContent='아직 내 탐방 기록이 없습니다.';root.append(empty);}
    for(const entry of [...archive.entries].reverse()) {
      const card=document.createElement('article');card.className='archive-entry';
      const title=document.createElement('h3');title.textContent=entry.title;
      const meta=document.createElement('p');meta.className='archive-meta';meta.textContent=entry.authorName+' · '+Math.floor(entry.elapsedSeconds/60)+'분 '+entry.elapsedSeconds%60+'초';
      const summary=document.createElement('p');summary.textContent=entry.summary;
      const row=document.createElement('div');row.className='archive-actions';
      const evaluate=document.createElement('button');evaluate.textContent='AI 평가 요청문 복사';evaluate.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(evaluationPrompt(entry));notice('평가 요청문을 복사했습니다.');}catch{notice('복사하지 못했습니다. 내보내기로 기록을 저장하세요.');}});
      const compare=document.createElement('button');compare.textContent='같은 페이지의 다른 요약';compare.addEventListener('click',()=>showComparison(entry));
      row.append(evaluate,compare);card.append(title,meta,summary,row);root.append(card);
    }
  }
  function showComparison(entry) {
    const peers=comparisonsFor(entry,[...archive.entries,...examples]);
    const root=$('comparisonList');root.replaceChildren();
    for(const item of [entry,...peers]) {
      const card=document.createElement('article');card.className='comparison-entry';
      const author=document.createElement('h3');author.textContent=item.authorName+(item.fictional?' · 가상 작성 예시':'');
      const text=document.createElement('p');text.textContent=item.summary;
      const question=document.createElement('p');question.className='comparison-question';question.textContent=item.question||'';card.append(author,text,question);root.append(card);
    }
    if(!peers.length){const empty=document.createElement('p');empty.textContent='같은 페이지의 다른 기록이 아직 없습니다. 다른 사람의 아카이브 파일을 가져와 비교할 수 있습니다.';root.append(empty);}
    $('comparisonDialog').showModal();
  }
  const timer=setInterval(()=>{
    if(!active)return;
    if(active.phase==='exploring'&&remainingTime(active)===0){active.finishedAt=Date.now();setPhase('writing');}
    if(['to-home','to-gate','to-page'].includes(active.phase)&&getWorld()?.getState().navigation.remainingSteps===0) {
      const position=getWorld().getState();
      if(active.phase==='to-home'&&Math.hypot(position.player.x,position.player.y)>8){getWorld().home();return;}
      if(active.phase==='to-gate'&&position.activeKey!=='randonautica:0'){getWorld().goTo('randonautica');return;}
      if(active.phase==='to-page'&&position.activeKey!==active.targetKey){getWorld().goToTile(active.targetKey);return;}
      if(active.phase==='to-home'){setPhase('to-gate');if(!getWorld().goTo('randonautica')){notice('관문까지 이동할 수 없습니다.');active=null;persist();}}
      else if(active.phase==='to-gate')drawTarget();
      else startClock();
    }
    renderDock();
  },500);
  $('startExpedition').addEventListener('click',()=>{
    if(active){notice('진행 중인 탐방을 먼저 마쳐주세요.');return;}
    $('expeditionDialog').showModal();
  });
  $('beginExpedition').addEventListener('click',()=>{
    active={id:crypto.randomUUID(),phase:'to-home',personaId:getPersona().id,intention:$('expeditionIntention').value.trim(),createdAt:new Date().toISOString()};
    $('expeditionDialog').close();persist();renderDock();if(!getWorld().home()){active=null;persist();notice('출발점으로 이동할 수 없습니다.');}
  });
  $('expeditionAction').addEventListener('click',()=>{if(active?.phase==='ready')startClock();else showWriter();});
  $('cancelExpedition').addEventListener('click',()=>{generation++;active=null;persist();renderDock();getWorld().stop?.();});
  for(const id of ['ownSummary','summaryEvidence','summaryQuestion'])$(id).addEventListener('input',()=>{
    if(active){active.draft={summary:$('ownSummary').value,evidence:$('summaryEvidence').value,question:$('summaryQuestion').value};persist();}
  });
  $('saveSummary').addEventListener('click',()=>{
    try {
      const entry=createArchiveEntry(active,{summary:$('ownSummary').value,evidence:$('summaryEvidence').value,question:$('summaryQuestion').value},getPersona(),active.finishedAt||Date.now());
      archive.entries.push(entry);active=null;persist();renderDock();$('summaryDialog').close();renderArchive();$('archiveDialog').showModal();
    }catch(error){notice(error.message);}
  });
  $('archiveButton').addEventListener('click',()=>{renderArchive();$('archiveDialog').showModal();});
  $('exportArchive').addEventListener('click',()=>{
    const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:1,entries:archive.entries},null,2)],{type:'application/json'}));link.download='outside-expeditions.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  });
  $('importArchiveButton').addEventListener('click',()=>$('importArchiveFile').click());
  $('importArchiveFile').addEventListener('change',async event=>{
    try {
      const file=event.target.files[0];if(!file)return;if(file.size>5*1024*1024)throw new Error('5MB 이하 파일을 선택하세요.');
      const data=JSON.parse(await file.text());if(!Array.isArray(data.entries))throw new Error('아카이브 파일이 아닙니다.');
      for(const row of data.entries.slice(0,100))if(canonicalPage(row.url)&&typeof row.summary==='string'&&row.summary.length<=12000&&!archive.entries.some(entry=>entry.id===row.id))archive.entries.push({...row,id:String(row.id||crypto.randomUUID()),authorKind:'imported',authorName:'가져온 기록 · '+String(row.authorName||'익명').slice(0,80),title:String(row.title||row.url).slice(0,300),question:String(row.question||'').slice(0,3000),elapsedSeconds:Math.max(0,Number(row.elapsedSeconds)||0)});
      persist();renderArchive();
    }catch(error){notice(error.message);}event.target.value='';
  });
  fetch('./data/example-summaries.json').then(response=>response.json()).then(data=>{examples=data;}).catch(()=>{});
  renderDock();
  return {hasActive:()=>Boolean(active),cancel(){generation++;active=null;persist();renderDock();},destroy(){clearInterval(timer);}};
}
