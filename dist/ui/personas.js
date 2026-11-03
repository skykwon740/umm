export function renderPersonas(root,personas,activeId,onChoose) {
  root.replaceChildren();
  for(const persona of personas) {
    const card=document.createElement('article');card.className='persona-card';
    const heading=document.createElement('h3');heading.textContent=persona.name+' · '+persona.age+'세';
    const role=document.createElement('p');role.className='persona-role';role.textContent=persona.role;
    const about=document.createElement('p');about.textContent=persona.background;
    const goal=document.createElement('p');goal.textContent='지금의 목표 — '+persona.currentGoal;
    const details=document.createElement('details');const caption=document.createElement('summary');caption.textContent='생활 맥락과 기록';details.append(caption);
    for(const [label,value] of [['제약',persona.constraints],['탐색 습관',persona.habits],['모순',persona.tension],['해석할 때 주의',persona.distinction]]) {
      const line=document.createElement('p');line.textContent=label+' — '+(Array.isArray(value)?value.join(' '):value);details.append(line);
    }
    const counts=document.createElement('p');counts.className='persona-counts';counts.textContent=persona.period.from+'~'+persona.period.to+' · 검색 '+persona.counts.searches+'회 · 방문 '+persona.counts.visits+'회 · 가상 기록';
    const log=document.createElement('div');log.className='persona-log';
    for(const event of persona.events) {
      const row=document.createElement('div');
      const date=document.createElement('time');date.textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(event.dateVisited));
      const text=document.createElement('p');text.textContent=(event.type==='search'?'⌕ ':'↗ ')+event.title;
      const context=document.createElement('small');context.textContent=event.focus+' · '+event.purpose+' · '+event.dwellSeconds+'초';
      const url=document.createElement('code');url.textContent=event.url;
      row.append(date,text,context,url);if(event.note){const note=document.createElement('p');note.className='persona-note';note.textContent=event.note;row.append(note);}log.append(row);
    }
    details.append(counts,log);
    const choose=document.createElement('button');choose.className='persona-choose';choose.textContent=persona.id===activeId?'현재 출발점':persona.name+'의 영토에서 시작';choose.disabled=persona.id===activeId;choose.addEventListener('click',()=>onChoose(persona.id));
    card.append(heading,role,about,goal,details,choose);root.append(card);
  }
}
