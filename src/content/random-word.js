// 떠돌이 외계인의 이름: 위키백과 임의 문서 하나.
const usable=t=>t.length>=2&&t.length<=16&&!/[:(),\d]|목록|연표|List of/i.test(t);
export async function randomWord(lang='ko',fetcher=globalThis.fetch) {
  try {
    const r=await fetcher(`https://${lang}.wikipedia.org/w/api.php?`+new URLSearchParams({
      action:'query',list:'random',rnnamespace:0,rnlimit:10,format:'json',origin:'*'}));
    if(!r.ok)return null;
    const titles=((await r.json()).query?.random??[]).map(p=>p.title).filter(usable);
    return titles[0]??null;
  } catch { return null; }
}
