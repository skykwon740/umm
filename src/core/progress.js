// D 트랙 진행도: 만난 외계인(서로 다른 단어만), 떠돌이 외계인, 튜토리얼 완료 여부.
// 공유 state(webglobe3)는 건드리지 않고 별도 키에 저장한다.
const KEY='umm.mission';
const empty=()=>({met:[],wanderers:[],tutorial:false});
let data=empty(),store=null;

const idOf=(t,lang)=>`${lang}:${t}`;
function persist() { try{store?.setItem(KEY,JSON.stringify(data));}catch{} }

export function loadProgress(storage=globalThis.localStorage) {
  store=storage??null;data=empty();
  try {
    const s=JSON.parse(store?.getItem(KEY));
    if(s&&Array.isArray(s.met))data={
      met:s.met.filter(x=>typeof x==='string'),
      wanderers:Array.isArray(s.wanderers)?s.wanderers.filter(x=>typeof x==='string'):[],
      tutorial:s.tutorial===true,
    };
  } catch {}
  return progress();
}
export function progress() {
  return Object.freeze({met:data.met.length,wanderers:data.wanderers.length,tutorial:data.tutorial,
    recent:Object.freeze(data.met.slice(-8).map(id=>id.slice(id.indexOf(':')+1)).reverse())});
}
// returns true only the first time this alien is met
export function markMet(t,lang) {
  const id=idOf(t,lang);if(!t||data.met.includes(id))return false;
  data={...data,met:[...data.met,id]};persist();return true;
}
export function markWanderer(t,lang) {
  const id=idOf(t,lang);if(!t||data.wanderers.includes(id))return false;
  data={...data,wanderers:[...data.wanderers,id]};persist();return true;
}
export function setTutorialDone(done=true) { data={...data,tutorial:done};persist(); }
