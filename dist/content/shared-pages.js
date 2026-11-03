/** One public page, many independent records. Ownership of a trace is not ownership of a URL. */
export function indexSharedPages(territories){
  const pages=new Map();
  for(const territory of territories)for(const item of territory.items){
    if(!pages.has(item.url))pages.set(item.url,{id:item.canonicalId,url:item.url,title:item.title,owners:[]});
    const page=pages.get(item.url);
    if(territory.personaId)page.owners.push({personaId:territory.personaId,name:territory.owner,territoryId:territory.id,pageId:item.id,recordCount:item.recordCount,queries:[...item.queries],context:item.context,fictional:item.fictional});
  }
  for(const territory of territories)for(const item of territory.items)item.sharedPage=pages.get(item.url);
  return pages;
}
