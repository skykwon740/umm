import {topics,webCatalog} from './web-catalog.js';

export function safeURL(value) {
  try {
    const url=new URL(value);
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password) return null;
    const host=url.hostname.toLowerCase();
    if(host==='localhost'||host==='127.0.0.1'||host==='[::1]'||host.endsWith('.local')) return null;
    url.hash='';
    for(const key of [...url.searchParams.keys()]) if(/^(utm_.+|fbclid|gclid|token|access_token|auth|code|session|state|password|key)$/i.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch { return null; }
}
export const domainOf = value => new URL(value).hostname.replace(/^www\./,'');

export function searchTerm(url,title='') {
  const parsed=new URL(url);
  const host=parsed.hostname;
  if(/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.naver\.com|search\.daum\.net|youtube\.com)$/.test(host)) {
    const observed=title.match(/^(.+?)\s[-–|]\s(?:Google 검색|Google Search|네이버 검색|Bing)/i)?.[1];
    if(observed)return observed;
    return parsed.searchParams.get('q')||parsed.searchParams.get('query')||parsed.searchParams.get('search_query')||'';
  }
  return title.replace(/^(Searched for|검색한 내용:)\s*/i,'')!==title ? title.replace(/^(Searched for|검색한 내용:)\s*/i,'') : '';
}

export function classify(record) {
  const domain=domainOf(record.url);
  const known=webCatalog.find(site=>domain===domainOf(site.url)||domain.endsWith('.'+domainOf(site.url)));
  if(known) return known.topic;
  return topics.find(topic=>topic.words.test([record.query,record.title,domain].join(' ')))?.id||'other';
}

export function normalizeRecords(input) {
  const source=Array.isArray(input)?input:input?.records||input?.['Browser History']||input?.history||[];
  if(!Array.isArray(source)) throw new Error('기록 배열을 찾을 수 없습니다.');
  return source.slice(0,5000).flatMap(row=>{
    if(typeof row==='string') row={url:row};
    if(!row||typeof row!=='object') return [];
    let url=safeURL(row.url||row.titleUrl||row.link);
    if(!url) return [];
    const title=String(row.title||domainOf(url)).slice(0,500);
    const query=searchTerm(url,title);
    if(query) {
      const searchURL=new URL(url);
      const parameter=['q','query','search_query'].find(key=>searchURL.searchParams.has(key));
      if(parameter) {searchURL.search='';searchURL.searchParams.set(parameter,query);url=searchURL.href;}
    }
    const value=row.dateVisited||row.time||row.lastVisitTime||(row.time_usec?Number(row.time_usec)/1000:null);
    const date=value?new Date(typeof value==='string'&&/^\d{10,}$/.test(value)?Number(value):value):null;
    return [{url,title,query,dateVisited:date&&!Number.isNaN(date.getTime())?date.toISOString():null}];
  });
}

function csvRows(text) {
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const ch=text[i];
    if(ch==='"') { if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted; }
    else if(ch===','&&!quoted){row.push(cell);cell='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}
    else cell+=ch;
  }
  row.push(cell);if(row.some(Boolean))rows.push(row);
  return rows;
}
export function parseHistory(text) {
  const trimmed=text.replace(/^\uFEFF/,'').trim();
  if(!trimmed) return [];
  if(trimmed.startsWith('[')||trimmed.startsWith('{')) return normalizeRecords(JSON.parse(trimmed));
  const rows=csvRows(trimmed),headers=rows[0]?.map(key=>key.trim().toLowerCase());
  if(headers?.some(key=>['url','titleurl','link'].includes(key))) {
    const names={titleurl:'titleUrl',datevisited:'dateVisited',lastvisittime:'lastVisitTime',last_visit_time:'lastVisitTime'};
    return normalizeRecords(rows.slice(1).map(values=>Object.fromEntries(headers.map((key,i)=>[names[key]||key,values[i]||'']))));
  }
  return normalizeRecords(trimmed.split(/\r?\n/).filter(Boolean).map(line=>{
    const url=safeURL(line.trim());
    return url?{url}:{url:'https://www.google.com/search?q='+encodeURIComponent(line.trim()),title:line.trim()};
  }));
}

export function summarizeHistory(records) {
  const groups=new Map();
  for(const record of records) {
    const domain=domainOf(record.url);
    if(!groups.has(domain)) groups.set(domain,{domain,title:record.title,url:record.url,topic:classify(record),count:0,pages:[],queries:[]});
    const group=groups.get(domain);group.count++;
    if(group.pages.length<20&&!group.pages.some(page=>page.url===record.url)) group.pages.push({title:record.title,url:record.url});
    if(record.query&&!group.queries.includes(record.query)) group.queries.push(record.query);
  }
  for(const group of groups.values()) {
    const counts=new Map();
    for(const record of records.filter(record=>domainOf(record.url)===group.domain)) {
      const topic=classify(record);counts.set(topic,(counts.get(topic)||0)+1);
    }
    group.topic=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]||'other';
  }
  return [...groups.values()].sort((a,b)=>b.count-a.count||a.domain.localeCompare(b.domain));
}

export function mergeHistory(existing,incoming) {
  const seen=new Set();
  return [...existing,...incoming].filter(record=>{
    const key=record.url+'|'+(record.dateVisited||'');
    if(seen.has(key))return false;
    seen.add(key);return true;
  }).slice(-5000);
}
