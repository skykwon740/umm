export function showSharedPage(dialog,page,onTravel){
  const root=dialog.querySelector('[data-shared-records]');root.replaceChildren();
  dialog.querySelector('[data-shared-url]').textContent=page.url;
  for(const owner of page.owners){
    const card=document.createElement('article');card.className='shared-record';
    const title=document.createElement('h3');title.textContent=owner.name+' · '+owner.recordCount+'회 방문';
    const context=document.createElement('p');context.textContent=owner.context;
    const queries=document.createElement('p');queries.className='muted';queries.textContent=owner.queries.length?'검색: '+owner.queries.join(' / '):'직접 방문·재방문 기록';
    const travel=document.createElement('button');travel.className='primary-action';travel.textContent='이 영토에서 보기';travel.addEventListener('click',()=>{dialog.close();onTravel(owner.pageId);});
    card.append(title,context,queries,travel);root.append(card);
  }
  dialog.showModal();
}
