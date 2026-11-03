import {webCatalog,topics} from './web-catalog.js';
import {safeURL,domainOf,summarizeHistory,classify} from './history.js';
import {hash} from '../world/math.js';

export function makeSite(data,personal=false) {
  const url=safeURL(data.url);
  if(!url) return null;
  const domain=domainOf(url);
  const known=webCatalog.find(site=>domainOf(site.url)===domain);
  const title=data.siteTitle||known?.title||domain;
  const youtube=new URL(url);
  let youtubeId=null;
  if(/(^|\.)youtube\.com$/.test(youtube.hostname)) youtubeId=youtube.searchParams.get('v')||youtube.pathname.match(/^\/shorts\/([\w-]{11})/)?.[1];
  if(youtube.hostname==='youtu.be') youtubeId=youtube.pathname.slice(1);
  if(!/^[\w-]{11}$/.test(youtubeId||'')) youtubeId=null;
  return {
    id:'web-'+hash(domain).toString(36),domain,url,source:url,title,
    pageTitle:data.title||title,description:data.description||known?.description||'',
    topic:(data.topic&&data.topic!=='other'?data.topic:null)||known?.topic||classify({url,title:[data.title,data.description].filter(Boolean).join(' ')}),
    personal,recordCount:data.count||0,pages:data.pages||[],queries:data.queries||[],
    origin:personal?'history':data.origin||'added',youtubeId,evidence:safeURL(data.evidence)||null,
  };
}

export function buildWebWorld(records=[],addedSites=[]) {
  const profile=summarizeHistory(records);
  const personal=profile.map(group=>makeSite(group,true)).filter(Boolean);
  const owned=new Set(personal.map(site=>site.domain));
  const unique=new Map();
  for(const data of [...webCatalog,...addedSites]) {
    const site=makeSite(data);
    if(site&&!owned.has(site.domain)) unique.set(site.domain,site);
  }
  const counts=topics.map(topic=>({id:topic.id,name:topic.name,color:topic.color,count:records.filter(record=>classify(record)===topic.id).length}));
  const otherCount=records.filter(record=>classify(record)==='other').length;
  if(otherCount)counts.push({id:'other',name:'그 밖의 기록',color:'#c4cea5',count:otherCount});
  const home={id:'home',name:'내 영토',owner:'나',color:'#c4cea5',distance:0,x:0,y:0,personal:true,
    radiusX:226+Math.min(55,Math.sqrt(records.length)*3),radiusY:203+Math.min(45,Math.sqrt(records.length)*2.4),
    items:personal,profile:counts};
  const territories=[home,...topics.map((topic,index)=>({
    id:topic.id,name:topic.name,owner:'웹',color:topic.color,x:topic.x,y:topic.y,
    distance:(index+1)/topics.length,items:[...unique.values()].filter(site=>site.topic===topic.id),
  }))];
  const unclassified=[...unique.values()].filter(site=>!topics.some(topic=>topic.id===site.topic));
  if(unclassified.length) territories.push({id:'unmapped',name:'새로운 웹',color:'#b7bac3',distance:1,x:300,y:650,items:unclassified});
  const edges=[];
  // Connectivity serves free movement, not a prescribed tour or a similarity score.
  for(let i=1;i<territories.length;i++) {
    const here=territories[i];
    const nearest=territories.slice(0,i).sort((a,b)=>Math.hypot(a.x-here.x,a.y-here.y)-Math.hypot(b.x-here.x,b.y-here.y));
    for(const next of nearest.slice(0,2)) edges.push([here.id,next.id]);
  }
  return {territories,edges,profile,sites:territories.flatMap(territory=>territory.items),recordCount:records.length};
}
