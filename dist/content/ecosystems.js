// Only concrete visual content supplies a special terrain motif.
// Everything else keeps neutral geography; genre names do not imply geology.
export const ecosystems = {
  home: {name:'초원과 낮은 언덕',kind:'meadow',low:'#a3b78f',high:'#c9b6d5',feature:'익숙한 게임 세계에서 출발하는 작은 대륙'},
  music: {name:'숲 가장자리와 초원',kind:'woodland',low:'#83a78d',high:'#b8c6a0',feature:'게임 음악의 숲을 감싸는 나무와 풀밭'},
  pixel: {name:'풀밭과 작은 작업 지대',kind:'meadow',low:'#c5a58d',high:'#dfc4a3',feature:'픽셀 작업실이 자리한 완만한 지형'},
  blocks: {name:'블록형 초원과 흙 절벽',kind:'blockland',low:'#9eae88',high:'#b6c89c',feature:'영상에서 확인한 마인크래프트의 블록 지형'},
  piano: {name:'완만한 언덕과 평지',kind:'meadow',low:'#b1a6bd',high:'#c5c1ca',feature:'피아노가 있는 방 주변의 작은 언덕'},
  instruments: {name:'열린 초원',kind:'meadow',low:'#b7b48c',high:'#d3c69e',feature:'작은 악기 상점이 자리한 열린 땅'},
  sound: {name:'넓은 평지와 물가',kind:'meadow',low:'#91afb0',high:'#b9c6b7',feature:'소리의 실험실 주변의 평지'},
  craft: {name:'작은 언덕과 풀밭',kind:'meadow',low:'#b6ad8c',high:'#d3c09e',feature:'모형과 소품 작업실이 자리한 땅'},
  architecture: {name:'작업실 주변의 평지',kind:'meadow',low:'#a9b293',high:'#c5c8ac',feature:'작은 건축 모형과 작업실이 자리한 땅'},
  coffee: {name:'낮은 구릉과 흙길',kind:'meadow',low:'#a7ac8b',high:'#c2b394',feature:'커피 도구 실험을 만나는 작은 정원'},
  plants: {name:'이끼·흙·자갈 정원',kind:'terrarium',low:'#789b75',high:'#b2bf94',feature:'테라리움 영상에서 확인한 식물과 흙·자갈·물'},
  nature: {name:'숲과 풀밭',kind:'woodland',low:'#759c7d',high:'#a7bc92',feature:'숲의 생물과 식물을 만나는 영토'},
};
export function ecosystemFor(id){return ecosystems[id]||ecosystems.home;}
