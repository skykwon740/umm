// Keep external destination rules here, independent of the globe and UI.
export const wikiURL = n => `https://${n.lang}.wikipedia.org/wiki/${encodeURIComponent(n.t.replace(/ /g, '_'))}`;
// 이야기 창 안의 작은 화면용: 위키백과 모바일 화면 (문서 페이지는 iframe을 막지 않는다. 2026-11-24 확인)
export const wikiEmbedURL = n => wikiURL(n) + '?useformat=mobile';
export function imageSearchURL(n) {
  const url = new URL('https://www.google.com/search');
  url.searchParams.set('q', n.t);
  url.searchParams.set('udm', '2');
  return url.href;
}
