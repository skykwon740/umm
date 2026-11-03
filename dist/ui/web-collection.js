export function renderWebCollection(root,{sites,onTravel,onRemove}) {
  root.replaceChildren();
  if(!sites.length){const empty=document.createElement('p');empty.className='empty-collection';empty.textContent='보관한 사이트가 없습니다.';root.append(empty);return;}
  for(const site of [...sites].reverse()) {
    const row=document.createElement('article');row.className='web-saved';
    const info=document.createElement('button');info.className='web-saved-info';
    const title=document.createElement('strong');title.textContent=site.title;
    const domain=document.createElement('span');domain.textContent=site.domain;
    info.append(title,domain);info.addEventListener('click',()=>onTravel(site.id));
    const remove=document.createElement('button');remove.className='icon-button';remove.textContent='×';remove.setAttribute('aria-label',site.title+' 보관 해제');remove.addEventListener('click',()=>onRemove(site.id));
    row.append(info,remove);root.append(row);
  }
}
