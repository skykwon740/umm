// 외계인 문서의 이미지 목록: 위키백과 REST media-list (CORS 허용, 2026-11-25 확인).
// 아이콘·로고·문서 파일처럼 그림 자료가 아닌 것은 거르고, 썸네일 주소만 돌려준다.
const SHOWABLE = /\.(?:jpe?g|png|gif|webp)$/i;
const NOT_A_PICTURE = /(?:icon|logo|symbol|flag[_ ]of|ambox|padlock|wikt|wikiquote|commons-|question[_ ]book|disambig|stub|portal|edit-)/i;
const MIN_WIDTH = 60;
const MAX_IMAGES = 12;

export function pickImages(items, { max = MAX_IMAGES } = {}) {
  const seen = new Set(), picked = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (picked.length >= max) break;
    if (item?.type !== 'image' || item.showInGallery === false || typeof item.title !== 'string') continue;
    const name = item.title.replace(/^[^:]+:/, '');
    if (!SHOWABLE.test(name) || NOT_A_PICTURE.test(name) || seen.has(item.title)) continue;
    const src = item.srcset?.[0]?.src;
    if (typeof src !== 'string' || !src) continue;
    const width = Number(src.match(/\/(\d+)px-[^/]*$/)?.[1]);
    if (width < MIN_WIDTH) continue;
    seen.add(item.title);
    picked.push({ src: src.startsWith('//') ? 'https:' + src : src, alt: String(item.caption?.text || name.replace(/_/g, ' ')).slice(0, 200) });
  }
  return picked;
}

// 문서가 없으면 빈 목록, 요청이 실패하면 오류
export async function imageList(lang, title) {
  const response = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title.replace(/ /g, '_'))}`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('위키백과 응답을 받지 못했습니다.');
  return pickImages((await response.json()).items);
}
