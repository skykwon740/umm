// 우주인 계급표(4개). need = 만난 서로 다른 외계인 수 — 숫자는 이 파일에서만 바꾼다.
// line이 빈 문자열이면 화면에 한 줄 설명을 내지 않는다.
// visor/collar = 결과 화면 헬멧 배지 색.
export const RANKS=Object.freeze([
  {need:0, name:'견습 우주인',      line:'헬멧은 썼다. 아직 거꾸로지만.',                 visor:'#4a5a66',collar:'#6fdcff'},
  {need:5, name:'베테랑 탐사대원',  line:'',                                              visor:'#3fa7d6',collar:'#6fdcff'},
  {need:15,name:'가문 연결책',      line:'이 집 사촌이 저 집 사돈이라는 걸 안다.',        visor:'#f0c34b',collar:'#f08a4b'},
  {need:30,name:'행성의 지배자',    line:'모든 가족이 너를 안다. 이 행성은 이제 너의 것.', visor:'#ffe066',collar:'#ffe066'},
].map(Object.freeze));

export function rankOf(count) {
  let index=0;
  RANKS.forEach((rank,i)=>{if(count>=rank.need)index=i;});
  const next=RANKS[index+1]??null,base=RANKS[index].need;
  return {
    index,rank:RANKS[index],next,
    left:next?next.need-count:0,
    ratio:next?(count-base)/(next.need-base):1,
  };
}

// 상단 게이지: 계급 구간별 채움(0~1). 전체 길이 = 최고 계급 필요 수.
export function gaugeSegments(count) {
  return RANKS.slice(0,-1).map((rank,i)=>{
    const from=rank.need,to=RANKS[i+1].need;
    return {rank,from,to,fill:Math.max(0,Math.min(1,(count-from)/(to-from)))};
  });
}
