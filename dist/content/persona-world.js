import {makeSite} from './web-world.js';
import {safeURL} from './history.js';
import {hash} from '../world/math.js';
import {indexSharedPages} from './shared-pages.js';

export function canonicalPage(value) {
  const normalized=safeURL(value);if(!normalized)return null;
  const url=new URL(normalized);
  if(/(^|\.)youtube\.com$/.test(url.hostname)&&url.searchParams.has('v'))return 'https://www.youtube.com/watch?v='+url.searchParams.get('v');
  if(url.hostname==='youtu.be')return 'https://www.youtube.com/watch?v='+url.pathname.slice(1);
  if(/(^|\.)youtube\.com$/.test(url.hostname)&&url.pathname.startsWith('/shorts/'))return 'https://www.youtube.com/watch?v='+url.pathname.split('/')[2];
  return url.href;
}
export function makePage(data,ownerId='web') {
  const url=canonicalPage(data.url);if(!url)return null;
  const base=makeSite({...data,url,siteTitle:data.title||data.pageTitle||new URL(url).hostname});
  return {...base,id:ownerId+'@page-'+hash(url).toString(36),canonicalId:'page-'+hash(url).toString(36),
    title:data.title||base.pageTitle,url,source:url,ownerId,ownerName:data.ownerName||'',
    kind:base.youtubeId?'video':data.kind||'page',context:data.context||'',
    recordCount:data.recordCount||0,queries:data.queries||[],pages:[],personal:Boolean(data.personal),fictional:Boolean(data.fictional),
    discovery:data.discovery||null,safety:data.safety||null};
}
function pagesOf(persona,personal) {
  const pages=new Map();
  for(const event of persona.events.filter(event=>event.type==='visit')) {
    const url=canonicalPage(event.url);if(!url)continue;
    const search=persona.events.find(row=>row.sessionId===event.sessionId&&row.type==='search');
    if(!pages.has(url))pages.set(url,makePage({url,title:event.title,ownerName:persona.name,fictional:true,personal,
      context:event.focus+' · '+event.purpose,queries:search?[search.query]:[],description:event.note||'',recordCount:0},persona.id));
    const page=pages.get(url);page.recordCount++;
    if(search&&!page.queries.includes(search.query))page.queries.push(search.query);
  }
  return [...pages.values()];
}
const positions=[{x:0,y:0},{x:310,y:-165},{x:-310,y:-170},{x:-285,y:210},{x:305,y:220}];
export const gatewayURL='https://randonautica.app/';
export const initialOutsidePages=[
  {url:'https://wiby.me/about/',title:'Why Wiby? — 작은 개인 웹을 찾는 검색',kind:'essay'},
  {url:'https://marginalia-search.com/explore',title:'Marginalia — Explore Websites',kind:'directory'},
  {url:'https://www.zooniverse.org/about',title:'About the Zooniverse',kind:'article'},
  {url:'https://andymatuschak.org/books/',title:'Why books don’t work',kind:'blog'},
  {url:'https://maggieappleton.com/garden-history',title:'A Brief History & Ethos of the Digital Garden',kind:'blog'},
  {url:'https://zachpoff.com/resources/choosing-a-contact-mic-for-field-recording/',title:'Choosing a Contact Mic For Field Recording',kind:'blog'},
  {url:'https://awaytogarden.com/d-i-y-terrariums-as-gifts-or-centerpieces-with-patricia-buzo/comment-page-8/',title:'DIY terrariums — Margaret Roach와 Patricia Buzo',kind:'blog'},
  {url:'https://www.youtube.com/shorts/dwTGhkArV7Q',title:'Old pixel art trick',kind:'video'},
  {url:'https://www.youtube.com/shorts/1Xk8ldFZhFM',title:'Why you hate the sound of your own voice',kind:'video'},
  {url:'https://ncase.me/trust/',title:'The Evolution of Trust',kind:'interactive'},
];
export function buildPersonaWorld(personas,activeId,added=[]) {
  const index=Math.max(0,personas.findIndex(persona=>persona.id===activeId));
  const origin=positions[index];
  const ordered=[personas[index],...personas.filter((_,i)=>i!==index)];
  const territories=ordered.map((persona,order)=>{
    const location=positions[personas.findIndex(row=>row.id===persona.id)];
    const focusCounts=new Map();
    for(const event of persona.events)focusCounts.set(event.focus,(focusCounts.get(event.focus)||0)+1);
    return {id:order===0?'home':'person-'+persona.id,personaId:persona.id,name:persona.name+'의 영토',owner:persona.name,
      x:location.x-origin.x,y:location.y-origin.y,color:persona.color,distance:order===0?0:.2+order*.13,
      personal:order===0,items:pagesOf(persona,order===0),radiusX:205+Math.min(28,persona.events.length*.35),radiusY:190+Math.min(20,persona.sessions.length*2),
      profile:[...focusCounts].map(([name,count],i)=>({id:persona.id+'-'+i,name,count,color:i%2?persona.color:'#c5cea6'})),fictional:true};
  });
  const gateway=makePage({url:gatewayURL,title:'Randonautica',description:'무작위 목적지로 나가는 웹 탐방 관문'},'gateway');
  territories.push({id:'randonautica',name:'란더노티카',owner:'우연의 관문',x:-origin.x,y:440-origin.y,color:'#d2c7a2',distance:.75,items:[gateway]});
  const seen=new Set(territories[0].items.map(page=>page.url));
  const outside=new Map();
  for(const data of [...initialOutsidePages,...added]) {
    const page=makePage(data,'outside');if(page&&!seen.has(page.url))outside.set(page.url,page);
  }
  territories.push({id:'outside',name:'아직 모르는 웹',owner:'공개 웹',x:-origin.x,y:-450-origin.y,color:'#aebdc3',distance:1,items:[...outside.values()],radiusX:240,radiusY:215});
  const edges=[],relationships=[];
  for(let i=0;i<personas.length;i++)for(let j=i+1;j<personas.length;j++) {
    const a=territories.find(t=>t.personaId===personas[i].id),b=territories.find(t=>t.personaId===personas[j].id);
    const shared=a.items.map(page=>page.url).filter(url=>b.items.some(page=>page.url===url));
    if(shared.length){edges.push([a.id,b.id]);relationships.push({from:a.personaId,to:b.personaId,sharedPages:shared});}
  }
  for(let i=1;i<territories.length;i++) {
    const land=territories[i];
    const nearest=territories.slice(0,i).sort((a,b)=>Math.hypot(a.x-land.x,a.y-land.y)-Math.hypot(b.x-land.x,b.y-land.y))[0];
    if(!edges.some(edge=>edge.includes(land.id)&&edge.includes(nearest.id)))edges.push([land.id,nearest.id]);
  }
  const pages=indexSharedPages(territories);
  return {territories,edges,relationships,pages,sites:territories.flatMap(t=>t.items),active:personas[index],gateway};
}
