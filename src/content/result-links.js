// Keep external destination rules here, independent of the globe and UI.
export const wikiURL = n => `https://${n.lang}.wikipedia.org/wiki/${encodeURIComponent(n.t.replace(/ /g, '_'))}`;
export function imageSearchURL(n) {
  const url = new URL('https://www.google.com/search');
  url.searchParams.set('q', n.t);
  url.searchParams.set('udm', '2');
  return url.href;
}
