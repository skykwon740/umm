// 우주인 계급표. need = 만난 서로 다른 외계인 수.
// visor/collar = 결과 화면 헬멧 배지 색.
export const RANKS=Object.freeze([
  {need:0, name:'견습 우주인',      line:'헬멧은 썼다. 아직 거꾸로지만.',                 visor:'#4a5a66',collar:'#6fdcff'},
  {need:4, name:'신입 탐사대원',    line:'외계인과 눈 마주치는 법을 익혔다. 눈이 세 개여도.', visor:'#3fa7d6',collar:'#6fdcff'},
  {need:8, name:'외계어 통역 보조', line:'"안녕"과 "배고파"는 확실히 구별한다.',          visor:'#41c48b',collar:'#9ee86b'},
  {need:13,name:'행성 마당발',      line:'어딜 가나 아는 외계인 하나쯤은 있다.',          visor:'#9ee86b',collar:'#f3e2b8'},
  {need:20,name:'가문 연결책',      line:'이 집 사촌이 저 집 사돈이라는 걸 안다.',        visor:'#f0c34b',collar:'#f08a4b'},
  {need:28,name:'은하 외교관',      line:'외계인 결혼식에 하객으로 초대받기 시작했다.',    visor:'#f08a4b',collar:'#f3e2b8'},
  {need:38,name:'원로회 명예 회원', line:'외계인 할머니들이 반찬을 싸 준다.',             visor:'#ff8fb1',collar:'#f0c34b'},
  {need:50,name:'행성의 지배자',    line:'모든 가족이 너를 안다. 이 행성은 이제 너의 것.', visor:'#ffe066',collar:'#ffe066'},
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
