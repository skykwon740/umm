async function api(lang, p) {
  const r = await fetch(`https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({ ...p, format: 'json', origin: '*' }));
  if (!r.ok) throw new Error('위키백과 응답을 받지 못했습니다. 다시 시도해 주세요.');
  const d = await r.json();
  if (d.error) throw new Error(d.error.info || '위키백과 요청이 거절되었습니다.');
  return d;
}
// 본문 검색은 글자 조각이 들어 있는 아무 문서나 돌려준다(없는 단어 '웹프개탐험' → '미국').
// 제목이 입력과 맞닿는 문서만 받고, 없으면 입력 속 단어 이름의 문서가 있는지 본다.
// 둘 다 없으면 '위키백과에 없는 단어'다 (팀 결정: 이 이름의 외계인이 없다는 안내).
async function search(lang, q) {
  const d = await api(lang, { action: 'query', list: 'search', srsearch: q, srlimit: 5, srnamespace: 0 });
  const hit = matchTitle(q, (d.query.search ?? []).map(r => r.title));
  if (hit) return hit;
  const words = wordsOf(q);
  if (!words.length) return undefined;
  const t = await api(lang, { action: 'query', titles: words.join('|'), redirects: 1 });
  const found = new Map();
  for (const r of [...(t.query?.normalized ?? []), ...(t.query?.redirects ?? [])]) found.set(r.from, r.to);
  const exists = new Set(Object.values(t.query?.pages ?? {}).filter(p => !('missing' in p) && !('invalid' in p)).map(p => p.title));
  for (const w of words) { let title = w; while (found.has(title)) title = found.get(title); if (exists.has(title)) return title; }
  return undefined;
}
const clean = s => (s || '').replace(/\s*[(（][^)）]*[)）]/g, '').replace(/\s+/g, ' ').trim();
const squash = s => clean(s).toLowerCase().replace(/\s+/g, '');
const wordsOf = q => [...new Set(clean(q).split(' ').filter(w => w.length >= 2))];
// 괄호·띄어쓰기·대소문자를 빼고, 제목이 입력과 같거나 한쪽이 다른 쪽을 품거나, 입력 속 단어(2자 이상)를 품는 첫 문서
function matchTitle(q, titles) {
  const want = squash(q);
  if (!want) return undefined;
  const words = wordsOf(q).map(squash);
  return titles.find(t => {
    const got = squash(t);
    return got && (got === want || want.includes(got) || got.includes(want) || words.some(w => got.includes(w)));
  });
}
const firstLine = (text, max) => {
  const line = (text.match(/^.*?(다\.|\.\s)/) || [text])[0].trim();
  return line.length > max ? line.slice(0, max) + '…' : line;
};
// one short line saying what the word is
async function describe(lang, title) {
  try {
    const d = await api(lang, { action: 'query', prop: 'extracts', exintro: 1, explaintext: 1, exchars: 160, titles: title, redirects: 1 });
    return firstLine(clean(Object.values(d.query.pages)[0].extract), 70);
  } catch { return ''; }
}

// 이야기 창: 문서 앞부분 몇 문장. 문서가 없으면 null
async function story(lang, title) {
  const d = await api(lang, { action: 'query', prop: 'extracts', exintro: 1, explaintext: 1, exsentences: 4, titles: title, redirects: 1 });
  const page = Object.values(d.query?.pages ?? {})[0];
  if (!page || 'missing' in page || 'invalid' in page) return null;
  const text = clean(page.extract);
  return { t: page.title, summary: text.length > 360 ? text.slice(0, 360) + '…' : text };
}

// 가족 후보에서 빼는 문서: 날짜·연도·숫자·목록 (사용자 결정 2026-11-21)
const MONTH = 'January|February|March|April|May|June|July|August|September|October|November|December';
const REFERENCE = [
  /^[+-]?\d+(?:[.,]\d+)*(?:\s*\((?:수|숫자|number|integer|year)\))?$/i,
  /^(?:(?:기원전\s*|서기\s*)?\d{1,4}(?:\s*(?:년대?|세기)|s|\s+(?:BC|BCE|AD|CE))|(?:BC|BCE|AD|CE)\s+\d{1,4})$/i,
  /^(?:(?:기원전\s*|서기\s*)?\d{1,4}년\s*)?\d{1,2}월(?:\s*\d{1,2}일)?$/,
  new RegExp(`^(?:(?:${MONTH}) \\d{1,2}(?:, \\d{1,4})?|\\d{1,2} (?:${MONTH})(?: \\d{1,4})?)$`, 'i'),
  /^\d{1,2}(?:st|nd|rd|th) century(?: (?:BC|BCE|AD|CE))?$/i,
  /^(?:lists?|index|table) of\b|\s(?:목록|리스트|연표)(?:\s*\([^()]+\))?$/i,
];
function isReferenceTitle(title) {
  const t = title.normalize('NFKC').replace(/\s+/g, ' ').trim();
  return REFERENCE.some(pattern => pattern.test(t));
}

// 문서 안의 모든 링크 단어(최대 3,000개). 링크 API는 가나다순으로 500개씩 주므로 끝까지 이어 받는다
const LINK_BATCHES = 6;
async function familyPool(lang, title) {
  const found = new Set();
  let more = {};
  for (let i = 0; i < LINK_BATCHES && more; i++) {
    const d = await api(lang, { action: 'query', prop: 'links', titles: title, plnamespace: 0, pllimit: 'max', redirects: 1, ...more });
    for (const page of Object.values(d.query?.pages ?? {})) for (const link of page.links ?? []) found.add(link.title);
    more = d.continue;
  }
  return [...found].filter(t => t !== title && !isReferenceTitle(t));
}

function shuffle(list, random) {
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}
// 무작위 순서로 10개씩 확인해 실제 문서이고 동음이의 문서가 아닌 후보를 count개까지 고른다.
// avoid: 직전에 보여준 후보. 다른 후보가 모자랄 때만 다시 나온다
const CHECK_LIMIT = 40;
async function family(lang, pool, { count = 3, exclude = [], avoid = [], random = Math.random } = {}) {
  const skip = new Set(exclude), later = new Set(avoid), picked = [], spare = [];
  const order = shuffle(pool.filter(t => !skip.has(t)), random).sort((a, b) => later.has(a) - later.has(b));
  const taken = t => picked.some(c => c.t === t) || spare.some(c => c.t === t);
  for (let i = 0; picked.length < count && i < Math.min(order.length, CHECK_LIMIT); i += 10) {
    const batch = order.slice(i, i + 10);
    const d = await api(lang, { action: 'query', titles: batch.join('|'), prop: 'pageprops|extracts', ppprop: 'disambiguation',
      exintro: 1, explaintext: 1, exsentences: 1, exlimit: 'max', redirects: 1 });
    const q = d.query ?? {}, pages = new Map(Object.values(q.pages ?? {}).map(p => [p.title, p]));
    const resolve = t => { for (const step of [q.normalized, q.redirects]) t = step?.find(x => x.from === t)?.to ?? t; return t; };
    for (const t of batch) {
      const p = pages.get(resolve(t));
      if (!p || 'missing' in p || 'invalid' in p || p.ns !== 0 || p.pageprops || isReferenceTitle(p.title) ||
        skip.has(p.title) || taken(p.title)) continue;
      (later.has(p.title) ? spare : picked).push({ t: p.title, d: firstLine(clean(p.extract), 60) });
      if (picked.length === count) break;
    }
  }
  return picked.concat(spare).slice(0, count);
}

export {search, describe, story, familyPool, family, isReferenceTitle, matchTitle};
