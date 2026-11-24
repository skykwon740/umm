export const MEMO_LIMIT=500;
const KEY='webglobe-interests-v1';
let entries=Object.create(null);
const keyOf=n=>JSON.stringify([n.lang,n.t]);
export function loadInterests(storage) {
  try {
    const saved=JSON.parse((storage??globalThis.localStorage).getItem(KEY));
    entries=Object.create(null);
    if(saved&&typeof saved==='object'&&!Array.isArray(saved))for(const [key,value] of Object.entries(saved)) {
      if(value&&typeof value.heart==='boolean'&&typeof value.memo==='string')entries[key]={heart:value.heart,memo:value.memo.slice(0,MEMO_LIMIT)};
    }
  } catch { entries=Object.create(null); }
}
export function getInterest(node) { return Object.freeze({...entries[keyOf(node)]??{heart:false,memo:''}}); }
export function saveInterest(node,patch,storage) {
  const value={...getInterest(node),...patch};
  if(typeof value.heart!=='boolean'||typeof value.memo!=='string'||value.memo.length>MEMO_LIMIT)return false;
  const next={...entries,[keyOf(node)]:value};
  try { (storage??globalThis.localStorage).setItem(KEY,JSON.stringify(next));entries=next;return true; } catch { return false; }
}
// 읽기 전용: 하트했거나 메모가 있는 항목 전부 [{lang,t,heart,memo}]
export function listInterests() {
  const out=[];
  for(const [key,value] of Object.entries(entries)) {
    if(!value.heart&&!value.memo.trim())continue;
    try { const [lang,t]=JSON.parse(key);if(typeof t==='string')out.push(Object.freeze({lang,t,heart:value.heart,memo:value.memo})); } catch {}
  }
  return Object.freeze(out);
}
