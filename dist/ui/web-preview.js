export function createWebPreview({root,onChoosePage,onShowShared}) {
  return {
    show(site) {
      root.replaceChildren();
      const mark=document.createElement('div');mark.className='site-mark';mark.textContent=site.title.slice(0,2).toUpperCase();mark.setAttribute('aria-hidden','true');
      const domain=document.createElement('p');domain.className='site-domain';domain.textContent=site.domain;
      const title=document.createElement('h1');title.textContent=site.title;
      const description=document.createElement('p');description.className='site-description';description.textContent=site.description;
      const open=document.createElement('button');open.className='site-open';open.textContent='열기 ↗';open.addEventListener('click',()=>onChoosePage(site.url,site.pageTitle));
      root.append(mark,domain,title);
      if(site.description) root.append(description);
      root.append(open);
      if(site.evidence) {
        const evidence=document.createElement('button');evidence.className='site-evidence';evidence.textContent='연결 출처 ↗';evidence.addEventListener('click',()=>onChoosePage(site.evidence));root.append(evidence);
      }
      if(site.context){const context=document.createElement('p');context.className='site-description';context.textContent=(site.fictional?site.ownerName+'의 가상 기록 · ':'')+site.context;root.append(context);}
      if(site.sharedPage?.owners.length>1&&onShowShared){const shared=document.createElement('button');shared.className='shared-page-link';shared.textContent=site.sharedPage.owners.length+'명의 방문 흔적';shared.addEventListener('click',()=>onShowShared(site.sharedPage));root.append(shared);}
      if(site.queries.length) {
        const queries=document.createElement('div');queries.className='query-list';
        for(const query of site.queries.slice(0,5)) {const chip=document.createElement('span');chip.textContent=query;queries.append(chip);}
        root.append(queries);
      }
      if(site.pages.length) {
        const pages=document.createElement('div');pages.className='page-list';
        for(const page of site.pages.slice(0,8)) {
          const link=document.createElement('button');link.textContent=page.title;link.addEventListener('click',()=>onChoosePage(page.url,page.title));pages.append(link);
        }
        root.append(pages);
      }
    },
  };
}
