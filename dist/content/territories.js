export const territoryDefinitions = [
  { id:'home', name:'나의 게임 세계', owner:'윤', color:'#b9a2dc', distance:0, x:0,y:0, topics:['game','pixel','music'], limit:8, bio:'게임 62% · 게임 음악 24% · 픽셀 아트 14%', caption:'익숙한 세계에서\n여행을 시작해요', reason:'당신이 자주 찾는 게임, 가끔 듣는 게임 음악. 이 작은 세계가 오늘 여행의 출발점이에요.', neighbors:['music','pixel','blocks'] },
  { id:'music', name:'게임 음악의 숲', owner:'서윤', color:'#99bea4',distance:.16,x:235,y:-100,topics:['music','game'],limit:5,bio:'게임 속 멜로디를 일상에서도 듣는 사람',caption:'화면 밖으로\n이어지는 멜로디',reason:'게임에서 좋아했던 멜로디를 따라오니, 누군가의 피아노 연주와 만났어요.',neighbors:['piano','instruments','sound'] },
  { id:'pixel', name:'픽셀 작업실',owner:'민준',color:'#e2b298',distance:.20,x:-245,y:-110,topics:['pixel'],limit:5,bio:'작은 네모로 커다란 장면을 만드는 사람',caption:'작은 네모에\n담긴 다른 세계',reason:'게임을 이루던 픽셀에서, 픽셀 하나하나를 직접 만드는 사람의 세계로 이어졌어요.',neighbors:['craft','architecture','blocks'] },
  { id:'blocks',name:'블록 놀이터',owner:'하루',color:'#a9badb',distance:.22,x:20,y:235,topics:['game','pixel'],limit:5,bio:'블록으로 실험하고 새로운 장치를 만드는 사람',caption:'같은 게임,\n다른 호기심',reason:'같은 게임을 좋아해도 누군가는 음악을, 누군가는 구조와 실험을 발견해요.',neighbors:['pixel','craft','coffee'] },
  { id:'piano',name:'피아노가 있는 방',owner:'유진',color:'#c5b1dd',distance:.38,x:460,y:-225,topics:['music','instrument'],limit:4,bio:'좋아하는 선율이 어떻게 태어나는지 궁금한 사람',caption:'멜로디 너머,\n악기의 이야기',reason:'게임 음악을 연주하는 피아노에서, 악기가 소리를 만드는 방식으로 관심이 넓어져요.',neighbors:['instruments','sound','music'] },
  { id:'instruments',name:'작은 악기 상점',owner:'다온',color:'#e0c08e',distance:.61,x:675,y:-380,topics:['instrument','music'],limit:4,bio:'손바닥만 한 악기로 여행하는 사람',caption:'처음 만나는\n손끝의 리듬',reason:'피아노의 건반을 떠나 작은 칼림바의 금속 건반을 만나보세요. 닮은 소리에도 다른 세계가 있어요.',neighbors:['sound','nature','piano'] },
  { id:'sound',name:'소리의 실험실',owner:'수아',color:'#9fc9cd',distance:.77,x:770,y:-40,topics:['sound','music','nature'],limit:4,bio:'매일 듣는 소리의 원리를 찾아보는 사람',caption:'듣고 있던 것을\n다시 발견해요',reason:'악기에서 시작한 호기심이 내 목소리와 새들의 소리로 이어져요. 음악 바깥에도 들을 세계가 있어요.',neighbors:['nature','instruments','plants'] },
  { id:'craft',name:'미니어처 마을',owner:'지우',color:'#e6bd99',distance:.42,x:-465,y:-285,topics:['craft','pixel'],limit:4,bio:'손으로 작은 집과 풍경을 만드는 사람',caption:'화면 속 세계가\n손안의 세계로',reason:'작은 픽셀로 장면을 쌓던 취향이, 작은 재료로 실제 공간을 만드는 취향으로 이어져요.',neighbors:['architecture','plants','coffee'] },
  { id:'architecture',name:'작은 건축의 섬',owner:'도현',color:'#c4cc9e',distance:.68,x:-710,y:-435,topics:['craft'],limit:3,bio:'사람이 머무는 공간을 작은 모형으로 생각하는 사람',caption:'작은 집에서\n공간을 상상해요',reason:'미니어처 집을 지나, 공간의 구조를 생각하는 건축 모형의 세계에 도착했어요.',neighbors:['plants','craft','nature'] },
  { id:'coffee',name:'커피 실험 정원',owner:'시온',color:'#c7ad93',distance:.49,x:-160,y:255,topics:['coffee','sound'],limit:3,bio:'매일 마시는 한 잔에서도 실험을 찾는 사람',caption:'평범한 한 잔의\n뜻밖의 실험',reason:'게임에서 장치를 시험하던 호기심을 따라, 커피 입자를 관찰하는 일상의 실험을 만나보세요.',neighbors:['plants','blocks','craft'] },
  { id:'plants',name:'유리 속 작은 숲',owner:'나래',color:'#a4c49a',distance:.78,x:-410,y:650,topics:['plants','craft'],limit:4,bio:'유리병 안에 작은 생태계를 가꾸는 사람',caption:'작게 만든 세계가\n스스로 자라나요',reason:'손으로 만든 작은 공간에서, 스스로 변화하는 테라리움으로. 만드는 즐거움이 기르는 호기심으로 이어져요.',neighbors:['nature','architecture','coffee'] },
  { id:'nature',name:'처음 듣는 숲',owner:'이든',color:'#91bba3',distance:.95,x:610,y:455,topics:['nature','plants','instrument'],limit:4,bio:'숲의 소리와 눈에 보이지 않는 생명을 기록하는 사람',caption:'내 피드에는 없던\n세계의 소리',reason:'게임의 작은 소리에서 출발해, 새와 균류, 살아 있는 숲까지. 처음의 관심사에서 꽤 멀리 걸어왔어요.',neighbors:['plants','sound','instruments'] },
];
export const allowedEdges = [
  ['home','music'],['home','pixel'],['home','blocks'],['music','piano'],
  ['piano','instruments'],['piano','sound'],['instruments','sound'],['sound','nature'],
  ['pixel','craft'],['craft','architecture'],['craft','plants'],['blocks','coffee'],
  ['coffee','plants'],['plants','nature'],
];

export function resolveTerritories(catalog) {
    return territoryDefinitions.map((definition) => {
      // These assignments are authored fictional preferences, not an AI analysis of real people.
      const pool = definition.topics.flatMap((topic) => catalog.filter((v) => v.topic === topic));
      const unique = [...new Map(pool.map((v) => [v.id,v])).values()];
      const firstChoices = {piano:'syPqJQGqTNQ', architecture:'I_AbQlk7hcU', nature:'Llkg6gEGfOA', sound:'1Xk8ldFZhFM'};
      const preferred = firstChoices[definition.id];
      if (preferred) unique.sort((a,b) => Number(b.id === preferred) - Number(a.id === preferred));
      return {...definition, videos:unique.slice(0,definition.limit)};
    }).filter((t) => t.videos.length);

}
