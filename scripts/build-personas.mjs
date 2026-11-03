import fs from 'node:fs/promises';
import {personaSeeds} from './persona-seeds.mjs';

const origin=new Date('2026-10-01T00:00:00+09:00').getTime();
const iso=(day,time)=>new Date(origin+(day-1)*86400000+Number(time.slice(0,2))*3600000+Number(time.slice(3))*60000).toISOString();
const output=personaSeeds.map((seed,personIndex)=>{
  const events=[];
  for(const [index,session] of seed.sessions.entries()) {
    const sessionId=seed.id+'-research-'+(index+1);
    let time=new Date(iso(session.day,session.time)).getTime();
    const searchId=sessionId+'-search';
    const url='https://www.google.com/search?q='+encodeURIComponent(session.query);
    events.push({id:searchId,sessionId,type:'search',dateVisited:new Date(time).toISOString(),url,title:session.query+' - Google 검색',query:session.query,focus:session.focus,purpose:session.purpose,from:null,dwellSeconds:34+index*3,fictional:true});
    let from=searchId;time+=60000;
    for(const [pageIndex,page] of session.pages.entries()) {
      const id=sessionId+'-visit-'+(pageIndex+1);
      events.push({id,sessionId,type:'visit',dateVisited:new Date(time).toISOString(),url:page.url,title:page.title,query:'',focus:session.focus,purpose:session.purpose,from,dwellSeconds:page.seconds,fictional:true,note:pageIndex===session.pages.length-1?session.reflection:''});
      from=id;time+=(page.seconds+25)*1000;
    }
  }
  for(let day=20;day<=33;day++) {
    if((day+personIndex*2)%(personIndex+4)===0)continue;
    const routine=seed.routines[(day+personIndex)%seed.routines.length];
    const sessionId=seed.id+'-routine-'+day;
    events.push({id:sessionId,sessionId,type:'visit',dateVisited:iso(day,personIndex===0?'18:20':personIndex===1?'06:55':personIndex===2?'08:20':personIndex===3?'06:40':'12:40'),url:routine.url,title:routine.title,query:'',focus:'익숙한 재방문',purpose:day%7===0?'휴식':'재확인',from:null,dwellSeconds:routine.seconds+(day%3)*35,fictional:true,note:'이전에 본 자료를 다시 확인한 짧은 세션.'});
  }
  events.sort((a,b)=>a.dateVisited.localeCompare(b.dateVisited));
  const {sessions,routines,...profile}=seed;
  return {...profile,fictional:true,period:{from:'2026-10-20',to:'2026-11-02'},events,sessions:seed.sessions.map((session,index)=>({id:seed.id+'-research-'+(index+1),focus:session.focus,purpose:session.purpose,reflection:session.reflection,query:session.query})),counts:{events:events.length,searches:events.filter(event=>event.type==='search').length,visits:events.filter(event=>event.type==='visit').length}};
});
await fs.mkdir(new URL('../dist/data/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('../dist/data/personas.json',import.meta.url),JSON.stringify({schemaVersion:1,fictional:true,description:'가상 인물 5명의 14일 활동 시나리오. 실제 사용자의 기록이 아니며 생성 규칙과 원본 시나리오를 함께 보관한다.',personas:output},null,2)+'\n');
console.log(JSON.stringify(output.map(({id,counts})=>({id,...counts}))));
