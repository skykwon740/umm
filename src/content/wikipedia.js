async function api(lang, p) {
  const r = await fetch(`https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({ ...p, format: 'json', origin: '*' }));
  if (!r.ok) throw new Error('위키백과 응답을 받지 못했습니다. 다시 시도해 주세요.');
  return r.json();
}
async function search(lang, q) {
  const d = await api(lang, { action: 'query', list: 'search', srsearch: q, srlimit: 1, srnamespace: 0 });
  return d.query.search[0]?.title;
}
// one short line saying what the word is
async function describe(lang, title) {
  try {
    const d = await api(lang, { action: 'query', prop: 'extracts', exintro: 1, explaintext: 1, exchars: 160, titles: title, redirects: 1 });
    const text = (Object.values(d.query.pages)[0].extract || '').replace(/\s*[(（][^)）]*[)）]/g, '').replace(/\s+/g, ' ').trim();
    const line = (text.match(/^.*?(다\.|\.\s)/) || [text])[0].trim();
    return line.length > 70 ? line.slice(0, 70) + '…' : line;
  } catch { return ''; }
}
async function links(lang, title) {
  const d = await api(lang, { action: 'query', prop: 'links', titles: title, plnamespace: 0, pllimit: 'max', redirects: 1 });
  return (Object.values(d.query.pages)[0].links || []).map(l => l.title);
}
function okWord(t, path) {
  if (t.length < 2 || t.length > 28) return false;
  if (/[:(]|^\d|목록|연표|List of|Index of|\d{3,}/i.test(t)) return false;
  const lt = t.toLowerCase();
  return path.every(p => { const lp = p.toLowerCase(); return !lt.includes(lp) && !lp.includes(lt); });
}
// pick a linked word that does NOT link back → connected, but not the obvious neighbour
async function pick(lang, cur, path) {
  const all = (await links(lang, cur)).filter(t => okWord(t, path));
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  const cand = all.slice(0, 40);
  if (!cand.length) return null;
  const d = await api(lang, { action: 'query', titles: cand.join('|'), prop: 'links|pageprops', ppprop: 'disambiguation',
    pltitles: path.join('|'), pllimit: 'max', redirects: 1 });
  const pages = Object.values(d.query.pages).filter(p => !('missing' in p) && p.ns === 0 && !p.pageprops && okWord(p.title, path));
  const far = pages.filter(p => !p.links);
  const pool = far.length ? far : pages;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)].title : cand[0];
}

export {search, describe, pick};
