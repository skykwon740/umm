import https from 'node:https';
import {isIP} from 'node:net';

export const MAX_BYTES=524288;
const reputationCache=new Map();
const blockedExtensions=/\.(exe|msi|dmg|pkg|apk|scr|bat|cmd|ps1|vbs|jar|com|dll|iso|torrent|zip|rar|7z)(?:$|[?#])/i;
const prohibitedOffer=/(?:warez|keygen|cracked[-_\s]+software|stolen[-_\s]+(?:credit|account)|buy[-_\s]+(?:cocaine|heroin)|child[-_\s]+sexual[-_\s]+abuse|마약\s*(?:판매|구매|거래)|대포\s*(?:통장|폰)\s*(?:판매|거래)|불법\s*(?:도박|촬영물)\s*(?:사이트|판매|공유)|해킹\s*계정\s*(?:판매|거래))/i;

export function publicAddress(address) {
  if(isIP(address)!==4)return false;
  const [a,b,c]=address.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===88&&c===99))||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19||b===51&&c===100))||(a===203&&b===0&&c===113));
}
export function publicURL(value) {
  const url=new URL(value);
  if(url.protocol==='http:')url.protocol='https:';
  if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443')throw new Error('허용되지 않은 주소입니다.');
  const host=url.hostname.toLowerCase();
  if(isIP(host.replace(/[\[\]]/g,''))||!host.includes('.')||/\.(?:onion|local|localhost|internal|invalid|test)$/.test(host)||host==='localhost')throw new Error('비공개 또는 로컬 주소는 제외합니다.');
  if(blockedExtensions.test(url.href)||prohibitedOffer.test(url.href))throw new Error('위험하거나 제외된 유형의 링크입니다.');
  url.hash='';return url;
}

export async function domainReputation(host,{fetcher=fetch}={}) {
  const cached=reputationCache.get(host);
  if(cached&&cached.expires>Date.now())return cached.value;
  const response=await fetcher('https://security.cloudflare-dns.com/dns-query?'+new URLSearchParams({name:host,type:'A'}),{
    headers:{accept:'application/dns-json'},signal:AbortSignal.timeout(7000),redirect:'error',
  });
  if(!response.ok)throw new Error('도메인 평판 검사를 완료하지 못했습니다.');
  const data=await response.json();
  const addresses=(data.Answer||[]).filter(answer=>answer.type===1).map(answer=>answer.data);
  if(data.Status!==0||!addresses.length)throw new Error('도메인을 확인하지 못했습니다.');
  if(addresses.some(address=>!publicAddress(address)))throw new Error('차단되었거나 비공개 주소를 가리키는 도메인입니다.');
  const value={addresses,provider:'Cloudflare malware/phishing DNS',checkedAt:new Date().toISOString()};
  reputationCache.set(host,{expires:Date.now()+300000,value});
  return value;
}

function pinnedRequest(url,address) {
  return new Promise((resolve,reject)=>{
    let finished=false,deadline;
    const done=(error,value)=>{if(finished)return;finished=true;clearTimeout(deadline);error?reject(error):resolve(value);};
    const request=https.get(url,{
      headers:{'user-agent':'OutsideWebExplorer/0.4','accept':'text/html,application/xhtml+xml','accept-encoding':'identity'},
      lookup(host,options,callback){callback(null,options.all?[{address,family:4}]:address,4);},
      timeout:9000,
    },response=>{
      const status=response.statusCode||0;
      if(status>=300&&status<400){response.destroy();done(null,{status,location:response.headers.location});return;}
      if(status<200||status>=300){response.destroy();done(new Error('접근할 수 없는 페이지입니다.'));return;}
      if(!/text\/html|application\/xhtml\+xml/i.test(response.headers['content-type']||'')){response.destroy();done(new Error('실행 파일과 비웹 문서는 자동 탐방에서 제외합니다.'));return;}
      if(response.headers['content-disposition']?.includes('attachment')){response.destroy();done(new Error('파일 다운로드 링크는 제외합니다.'));return;}
      let bytes=0;const chunks=[];
      response.on('data',chunk=>{
        bytes+=chunk.length;chunks.push(chunk);
        if(bytes>=MAX_BYTES){done(null,{status,html:Buffer.concat(chunks).subarray(0,MAX_BYTES).toString('utf8'),truncated:true});response.destroy();}
      });
      response.on('end',()=>done(null,{status,html:Buffer.concat(chunks).toString('utf8'),truncated:false}));
      response.on('error',error=>done(error));
    });
    request.on('timeout',()=>request.destroy(new Error('페이지 연결 시간이 초과됐습니다.')));
    request.on('error',error=>done(error));
    deadline=setTimeout(()=>request.destroy(new Error('페이지 검사 시간이 초과됐습니다.')),10000);
  });
}

const decode=text=>String(text).replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(Number(n),0x10ffff)));
export function pageMetadata(html,base) {
  const title=decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||new URL(base).hostname).replace(/\s+/g,' ').trim().slice(0,240);
  if(prohibitedOffer.test(title))throw new Error('제외된 콘텐츠 유형입니다.');
  const visible=decode(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
  if(prohibitedOffer.test(visible))throw new Error('제외 규칙에 해당하는 콘텐츠입니다.');
  const links=[];
  for(const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
    try {const url=publicURL(new URL(decode(match[1]),base));if(!links.includes(url.href))links.push(url.href);}catch{}
    if(links.length>=200)break;
  }
  const refresh=html.match(/<meta[^>]+http-equiv\s*=\s*["']refresh["'][^>]+content\s*=\s*["'][^"']*?url\s*=\s*([^"']+)/i)?.[1];
  return {title,links,refresh:refresh?decode(refresh.trim()):null};
}

export async function inspectPage(value,{blockedDomains=[],reputation=domainReputation,request=pinnedRequest}={}) {
  let url=publicURL(value);const hops=[];
  for(let i=0;i<5;i++) {
    if(blockedDomains.some(domain=>url.hostname===domain||url.hostname.endsWith('.'+domain)))throw new Error('신고로 제외된 도메인입니다.');
    const check=await reputation(url.hostname);
    const result=await request(url,check.addresses[0]);
    hops.push(url.href);
    if(result.location){url=publicURL(new URL(result.location,url));continue;}
    const metadata=pageMetadata(result.html,url.href);
    if(metadata.refresh){url=publicURL(new URL(metadata.refresh,url));continue;}
    return {url:url.href,title:metadata.title,links:metadata.links,safety:{status:'screened',provider:check.provider,checkedAt:check.checkedAt,hops,scope:'도메인 악성·피싱 평판, 공개 주소, 응답·다운로드 검사. 합법성이나 무해함의 보증이 아님.'}};
  }
  throw new Error('리디렉션이 너무 많은 페이지는 제외합니다.');
}
