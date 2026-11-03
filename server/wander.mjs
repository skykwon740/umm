import {randomInt,randomBytes} from 'node:crypto';
import {inspectPage,publicURL} from './safe-web.mjs';

const providers=['https://wiby.me/surprise/','https://marginalia-search.com/explore'];
export async function findUnexpectedPage({exclude=[],blockedDomains=[],inspect=inspectPage,choose=randomInt}={}) {
  const excluded=new Set(exclude);
  const trace=[];
  const seed=randomBytes(16).toString('hex');
  const started=Date.now();
  for(let attempt=0;attempt<3&&Date.now()-started<35000;attempt++) {
    const provider=providers[(choose(providers.length)+attempt)%providers.length];
    try {
      let current=await inspect(provider,{blockedDomains});
      trace.push({step:'entry',url:provider});
      // Wiby redirects to an indexed page; Marginalia exposes a fresh random set of domains.
      if(new URL(current.url).hostname.includes('marginalia')) {
        const links=current.links.filter(link=>!new URL(link).hostname.includes('marginalia'));
        if(!links.length)continue;
        current=await inspect(links[choose(links.length)],{blockedDomains});
        trace.push({step:'random-domain',url:current.url});
      }
      const walkCount=1+choose(2);
      for(let hop=0;hop<walkCount;hop++) {
        if(Date.now()-started>25000)break;
        const internal=current.links.filter(link=>{
          const url=new URL(link);return url.hostname===new URL(current.url).hostname&&url.pathname!=='/'&&!excluded.has(url.href);
        });
        const candidates=internal.length?internal:current.links.filter(link=>!excluded.has(link));
        if(!candidates.length)break;
        try {const next=await inspect(candidates[choose(candidates.length)],{blockedDomains});trace.push({step:'link',from:current.url,url:next.url});current=next;}catch{break;}
      }
      const url=publicURL(current.url).href;
      if(excluded.has(url)||providers.some(provider=>new URL(provider).hostname===new URL(url).hostname))continue;
      return {...current,links:undefined,origin:'live-random-walk',discovery:{seed,provider,trace,algorithm:'공개 인덱스의 무작위 진입점 + 실제 링크 이동. 전체 웹 균등 추첨이 아님.'}};
    }catch(error){trace.push({step:'skipped',reason:error.message});}
  }
  throw new Error('검사를 통과한 공개 페이지를 찾지 못했습니다. 다시 시도하세요.');
}
