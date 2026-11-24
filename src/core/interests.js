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
