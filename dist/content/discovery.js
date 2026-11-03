import {safeURL,domainOf} from './history.js';

async function api(language,parameters,signal) {
  const response=await fetch('https://'+language+'.wikipedia.org/w/api.php?'+new URLSearchParams({
    ...parameters,format:'json',formatversion:'2',origin:'*',
  }),{signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok) throw new Error('연관 사이트를 불러올 수 없습니다.');
  const data=await response.json();
  if(data.error) throw new Error('연관 사이트를 불러올 수 없습니다.');
  return data;
}

// Called only for a topic the user explicitly submits, never for imported private history.
export async function discoverWebsites(query,{signal}={}) {
  const language=/[ㄱ-ㅎ가-힣]/.test(query)?'ko':'en';
  const search=await api(language,{action:'query',list:'search',srsearch:query,srlimit:'1',srnamespace:'0'},signal);
  const page=search.query?.search?.[0];
  if(!page) return [];
  const result=await api(language,{action:'query',pageids:String(page.pageid),prop:'extlinks',ellimit:'max',elprotocol:'https'},signal);
  const found=new Map();
  for(const link of result.query?.pages?.[0]?.extlinks||[]) {
    const url=safeURL(link.url);
    if(!url) continue;
    const domain=domainOf(url);
    if(/(^|\.)(wikipedia\.org|wikimedia\.org|doi\.org|web\.archive\.org)$/.test(domain)) continue;
    if(!found.has(domain)) found.set(domain,{url,title:domain,siteTitle:domain,origin:'wikipedia',description:page.title+' 문서의 외부 링크',evidence:'https://'+language+'.wikipedia.org/?curid='+page.pageid});
    if(found.size>=18) break;
  }
  return [...found.values()];
}
