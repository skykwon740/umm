// Tiny event bus so tracks can talk without importing each other.
// D (tutorial/ending) listens; app.js emits. Other tracks can emit the same names later.
//   journeyStart, journeyMessage(text), journeyEnd, arrive, contact, tutorialDone
const handlers=new Map();
export function on(type,fn) {
  if(!handlers.has(type))handlers.set(type,new Set());
  handlers.get(type).add(fn);return ()=>handlers.get(type).delete(fn);
}
export function emit(type,detail) {
  for(const fn of [...(handlers.get(type)??[])]) {
    try{fn(detail);}catch(error){console.error(error);}
  }
}
export function once(type,test=()=>true) {
  return new Promise(resolve=>{
    const off=on(type,detail=>{if(test(detail)){off();resolve(detail);}});
  });
}
