const page=(title,url,seconds=180)=>({title,url,seconds});
const session=(day,time,focus,purpose,query,pages,reflection)=>({day,time,focus,purpose,query,pages,reflection});

export const personaSeeds=[
  {
    id:'yunseo',name:'윤서',age:23,color:'#b8acd3',role:'디지털미디어학부 3학년 · 웹 탐험 서비스 팀 프로젝트',
    portrait:'Y',tagline:'게임 지도를 만들다가 우연한 발견의 구조가 궁금해진 사람',
    background:'학교 근처 원룸에서 살며 주 3일은 수업, 이틀은 카페 아르바이트를 한다. 프론트엔드는 익숙하지만 서버 운영 경험은 적다. 이번 학기에는 숏폼 피드 밖의 웹을 탐험하는 프로젝트를 맡았다.',
    currentGoal:'11월 첫째 주까지 지구본 탐험 프로토타입을 만들고, 처음 보는 사이트에서 무엇을 발견하는지 사용자 테스트를 하고 싶다.',
    constraints:['노트북 내장 그래픽에서 돌아가야 한다.','학기 중 지출은 최소화하고 무료 문서를 우선 쓴다.','평일 집중 가능한 시간은 대체로 21시 이후 90분이다.'],
    habits:['검색 뒤 공식 문서와 구현 예제를 나란히 연다.','잘 모르는 API의 예제부터 복사해 보고 막히면 원리를 읽는다.','완성된 작품보다 작은 도구와 제작 과정을 오래 본다.'],
    tension:'우연한 발견을 만들고 싶지만 실제 방문 기록은 익숙한 개발 문서와 픽셀 아트 도구로 되돌아간다.',
    distinction:'과제 제출 사이트 방문은 관심사가 아니라 의무다. 게임 영상 시청도 모두 게임 개발 관심으로 해석하지 않는다.',
    routines:[page('MDN Canvas API','https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API',420),page('Lospec palettes','https://lospec.com/palette-list',270)],
    sessions:[
      session(20,'21:10','픽셀 지도','구현','canvas pixel art blurry device pixel ratio',[page('Canvas image smoothing','https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled',520),page('Canvas API','https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API',640),page('Lospec palettes','https://lospec.com/palette-list',310)],'화면 해상도와 도트의 크기를 같은 문제로 취급하고 있었다.'),
      session(22,'22:05','지형 생성','구현','procedural island map noise voronoi',[page('Terrain from noise','https://www.redblobgames.com/maps/terrain-from-noise/',720),page('Voronoi maps','https://www.redblobgames.com/maps/voronoi/',540),page('Noise','https://en.wikipedia.org/wiki/Perlin_noise',190)],'예쁜 땅과 걸을 수 있는 땅을 따로 검증해야 한다.'),
      session(24,'17:40','게임 제작','호기심','small exploration games no quest',[page('itch exploration games','https://itch.io/games/tag-exploration',610),page('Godot docs','https://docs.godotengine.org/en/stable/',210),page('Aseprite docs','https://www.aseprite.org/docs/',260)],'퀘스트 목록이 없는 게임에서도 건물과 길이 다음 행동을 제안했다.'),
      session(26,'20:35','우연한 발견','조사','randonautica intention random exploration',[page('Randonautica','https://randonautica.app/',340),page('Serendipity','https://en.wikipedia.org/wiki/Serendipity',480),page('Randomness','https://en.wikipedia.org/wiki/Randomness',220)],'목적지가 무작위여도 발견을 해석하는 과정은 사람마다 다르다.'),
      session(28,'23:00','픽셀 지도','구현','requestAnimationFrame delta time movement',[page('requestAnimationFrame','https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame',420),page('GitHub code search','https://github.com/search?q=canvas+globe&type=repositories',160),page('Web Crypto API','https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API',360)],'속도 조절과 무작위 선택을 한 함수에 섞지 않기로 했다.'),
      session(30,'21:50','사용자 관찰','조사','serendipity recommender systems filter bubble',[page('Filter bubble','https://en.wikipedia.org/wiki/Filter_bubble',330),page('Are.na','https://www.are.na/',440),page('OpenStreetMap about','https://www.openstreetmap.org/about',280)],'사용자가 낯선 사이트를 발견한 이유를 자기 말로 남기게 하고 싶다.'),
      session(32,'14:15','게임 제작','휴식','pixel art music game jam',[page('itch game jams','https://itch.io/jams',450),page('Freesound FAQ','https://freesound.org/help/faq/',250),page('Bandcamp','https://bandcamp.com/',740)],'잠깐 쉬려고 음악을 듣다가 게임 효과음의 출처 표기를 찾아봤다.'),
      session(33,'22:20','프로젝트 기록','정리','localStorage export json notes app',[page('localStorage','https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage',470),page('GitHub','https://github.com/',190),page('Lospec palettes','https://lospec.com/palette-list',220)],'평가 결과보다 원래 쓴 요약을 먼저 보존해야 비교할 수 있다.'),
    ],
  },
  {
    id:'minjae',name:'민재',age:31,color:'#9fbdba',role:'도시환경 연구실 연구보조원 · 주말 필드 레코딩',portrait:'M',tagline:'같은 장소를 소리와 지도라는 두 방식으로 기록하는 사람',
    background:'오래된 아파트에 살며 대중교통으로 출근한다. 평일에는 도시 소음 측정 자료를 정리하고, 주말에는 소형 레코더로 시장·역·강변을 녹음한다. 음악을 작곡하기보다 장소의 변화가 녹음에 남는 방식에 관심이 있다.',
    currentGoal:'집에서 역까지 걷는 20분 구간의 소리를 같은 시간대에 다시 녹음해 작은 사운드 지도를 만들려 한다.',
    constraints:['새 장비를 사기보다 보유 레코더와 무료 편집기를 쓴다.','녹음에 들어간 대화는 공개 자료에서 제외한다.','주말 비 예보에 따라 야외 계획을 바꾼다.'],
    habits:['검색 결과에서 장비 리뷰보다 사용자 녹음 예시를 먼저 듣는다.','도서관·논문과 취미 커뮤니티를 함께 본다.','같은 장소를 다른 날짜에 다시 확인한다.'],
    tension:'소음은 줄여야 할 대상이라고 일하지만 취미에서는 그 소리의 맥락을 보존하고 싶다.',
    distinction:'업무상 논문 재방문 횟수와 자발적인 소리 수집 시간을 분리한다. 주변기기 검색은 구매 결정을 위한 일회성 활동이다.',
    routines:[page('Freesound search','https://freesound.org/search/?q=field+recording',380),page('OpenStreetMap','https://www.openstreetmap.org/',230)],
    sessions:[
      session(20,'07:45','소리 채집','조사','field recording urban soundscape repeated route',[page('Acoustic ecology','https://en.wikipedia.org/wiki/Acoustic_ecology',490),page('Freesound field recordings','https://freesound.org/search/?q=urban+ambience',650),page('OpenStreetMap about','https://www.openstreetmap.org/about',230)],'지도에 없는 장소의 성질이 소리에는 남는다.'),
      session(22,'12:15','녹음 편집','업무','audacity remove wind noise without removing birds',[page('Audacity noise reduction','https://manual.audacityteam.org/man/noise_reduction.html',510),page('Freesound FAQ','https://freesound.org/help/faq/',410),page('Creative Commons BY 4.0','https://creativecommons.org/licenses/by/4.0/',260)],'깨끗하게 만드는 것과 원래 현장을 보존하는 것이 충돌한다.'),
      session(23,'22:05','장소 기록','호기심','sound map radio places',[page('Radio Garden','https://radio.garden/',780),page('Wikimedia Commons sounds','https://commons.wikimedia.org/wiki/Category:Sounds',310),page('OpenStreetMap about','https://www.openstreetmap.org/about',280)],'멀리 있는 도시도 사람이 말을 멈추는 순간의 소리로 상상하게 된다.'),
      session(25,'09:20','소리 채집','실습','rain railway station field recording stereo mono',[page('Freesound rain station','https://freesound.org/search/?q=rain+station',570),page('Audacity manual','https://manual.audacityteam.org/',430),page('Acoustic ecology','https://en.wikipedia.org/wiki/Acoustic_ecology',240)],'녹음 채널 수보다 소리를 둔 위치의 설명이 먼저 필요했다.'),
      session(27,'18:30','도시 관찰','조사','citizen science sound observations',[page('Zooniverse about','https://www.zooniverse.org/about',550),page('iNaturalist help','https://www.inaturalist.org/pages/help',370),page('GBIF','https://www.gbif.org/',210)],'전문가만 기록하는 것이 아니라 여러 사람이 같은 대상을 반복해 보는 구조가 중요하다.'),
      session(29,'21:45','소리 채집','정리','field recording attribution license example',[page('Freesound FAQ','https://freesound.org/help/faq/',480),page('Creative Commons BY 4.0','https://creativecommons.org/licenses/by/4.0/',340),page('Wikimedia Commons sounds','https://commons.wikimedia.org/wiki/Category:Sounds',400)],'비슷하게 들리는 녹음도 사용 조건과 녹음 상황이 다르다.'),
      session(31,'16:00','산책','휴식','random walk city exploration',[page('Random walk','https://en.wikipedia.org/wiki/Random_walk',360),page('Randonautica','https://randonautica.app/',310),page('OpenStreetMap','https://www.openstreetmap.org/',530)],'목적 없이 걷는 것과 무작위 목적지를 정해 걷는 것은 다른 경험 같다.'),
      session(33,'08:10','녹음 편집','업무','audacity spectrogram settings compare recordings',[page('Spectrogram view','https://manual.audacityteam.org/man/spectrogram_view.html',610),page('Audacity noise reduction','https://manual.audacityteam.org/man/noise_reduction.html',260),page('Freesound search','https://freesound.org/search/?q=morning+city',220)],'다른 사람이 무엇을 배경음이라고 부르는지 비교하고 싶다.'),
    ],
  },
  {
    id:'subin',name:'수빈',age:28,color:'#d0b298',role:'소형 출판사 편집 디자이너 · 독립 제본 모임',portrait:'S',tagline:'같은 이야기가 종이·화면·소장품에서 어떻게 달라지는지 보는 사람',
    background:'직원 다섯 명인 출판사에서 책 표지와 본문을 함께 맡는다. 집에서는 재활용 종이로 작은 책을 만든다. 공개 원문과 박물관 자료를 모으지만 수집한 자료를 다시 찾기 어려워하는 편이다.',
    currentGoal:'공개 원문 한 편을 골라 여덟 쪽짜리 소책자로 재구성하고, 원문과 편집자의 해석을 구별해서 표시하고 싶다.',
    constraints:['상업 인쇄에 사용할 수 있는 폰트와 이미지인지 확인한다.','회사 업무 중 브라우저를 자주 열어두므로 체류 시간만으로 관심을 판단하기 어렵다.','출퇴근 지하철에서는 긴 글보다 자료 목록을 저장한다.'],
    habits:['원문과 다른 판본을 번갈아 읽는다.','이미지 검색 뒤에는 소장 기관의 원본 페이지로 돌아간다.','정리하지 못한 탭을 주말에 다시 방문한다.'],
    tension:'사람에게 읽히는 순서를 설계하지만 스스로는 끝없이 자료를 수집한다.',
    distinction:'인쇄 납기와 저작권 확인은 일의 요구다. 원문을 오래 본다고 그 모든 주제에 개인적 선호가 있는 것은 아니다.',
    routines:[page('Google Fonts knowledge','https://fonts.google.com/knowledge',450),page('Project Gutenberg','https://www.gutenberg.org/',260)],
    sessions:[
      session(20,'09:35','책의 물성','업무','book typography line length small format',[page('Google Fonts knowledge','https://fonts.google.com/knowledge',600),page('Book design','https://en.wikipedia.org/wiki/Book_design',260),page('Are.na','https://www.are.na/',360)],'보기 좋은 페이지와 실제로 읽기 좋은 페이지의 차이를 설명해야 한다.'),
      session(21,'20:40','공개 원문','조사','Frankenstein public domain different editions',[page('Frankenstein Gutenberg','https://www.gutenberg.org/ebooks/84',710),page('Frankenstein Standard Ebooks','https://standardebooks.org/ebooks/mary-shelley/frankenstein',590),page('Wikisource','https://en.wikisource.org/wiki/Main_Page',210)],'같은 작품도 판본 정보와 읽는 인터페이스에 따라 첫인상이 달라진다.'),
      session(23,'13:05','소장품 읽기','조사','museum open access book illustration',[page('The Met Open Access','https://www.metmuseum.org/about-the-met/policies-and-documents/open-access',430),page('Smithsonian Open Access','https://www.si.edu/openaccess',550),page('Wikimedia Commons','https://commons.wikimedia.org/',260)],'이미지의 설명과 사용 조건을 함께 보관해야겠다.'),
      session(25,'15:25','책의 물성','실습','pamphlet stitch bookbinding grain direction',[page('Bookbinding','https://en.wikipedia.org/wiki/Bookbinding',510),page('Instructables','https://www.instructables.com/',620),page('Google Fonts knowledge','https://fonts.google.com/knowledge',220)],'화면에서 만든 그리드를 접히는 종이에 적용하니 여백이 달라졌다.'),
      session(27,'22:15','자료 아카이브','정리','personal archive tags versus folders',[page('Are.na','https://www.are.na/',690),page('Internet Archive about','https://archive.org/about/',390),page('Open Library','https://openlibrary.org/',280)],'한 자료를 여러 맥락에서 다시 읽을 수 있게 두고 싶다.'),
      session(29,'11:10','소장품 읽기','호기심','citizen science historical documents transcription',[page('Zooniverse about','https://www.zooniverse.org/about',570),page('Smithsonian transcription','https://transcription.si.edu/',640),page('Wikisource','https://en.wikisource.org/wiki/Main_Page',280)],'보존된 문서를 읽을 수 있는 데이터로 만드는 일에도 독자의 참여가 필요하다.'),
      session(31,'18:35','산책 지도','휴식','old city maps public domain',[page('Library of Congress maps','https://www.loc.gov/maps/',550),page('OpenStreetMap about','https://www.openstreetmap.org/about',280),page('Europeana','https://www.europeana.eu/',430)],'옛 지도와 지금 지도의 빈칸이 서로 달랐다.'),
      session(33,'10:20','공개 원문','업무','Creative Commons attribution image booklet',[page('Creative Commons BY 4.0','https://creativecommons.org/licenses/by/4.0/',460),page('The Met Open Access','https://www.metmuseum.org/about-the-met/policies-and-documents/open-access',330),page('Frankenstein Gutenberg','https://www.gutenberg.org/ebooks/84',390)],'요약 글에서도 원문에 있던 말과 내가 붙인 의미를 구분하고 싶다.'),
    ],
  },
  {
    id:'jihoo',name:'지후',age:36,color:'#a8bbd0',role:'중학교 과학 교사 · 방과 후 메이커 동아리',portrait:'J',tagline:'학생이 자기 말로 설명할 수 있는 실험을 찾는 사람',
    background:'주중에는 수업과 평가 자료를 만들고, 화요일에는 메이커 동아리를 맡는다. 주말에는 자전거를 타거나 맨눈으로 하늘을 본다. 온라인 자료의 화려함보다 학생이 어떤 조작을 해볼 수 있는지를 먼저 본다.',
    currentGoal:'회로와 에너지 단원의 공개 자료를 골라, 관찰 사실과 학생의 해석을 나눠 적는 탐구 활동지를 만들려 한다.',
    constraints:['학교 기기에서 로그인 없이 접근되는 자료를 선호한다.','한 활동은 수업 15분 안에 설명하고 실행할 수 있어야 한다.','자료의 대상 연령과 출처를 확인한다.'],
    habits:['같은 시뮬레이션을 서로 다른 조건으로 다시 연다.','검색어에 수업 시간과 오개념을 함께 넣는다.','학생 질문 때문에 원래 계획과 다른 자료로 갈 때가 많다.'],
    tension:'정답을 명확히 제시해야 하지만 탐구에서는 성급한 정답을 미루게 하고 싶다.',
    distinction:'수업 준비용 조회와 개인적인 천문·자전거 관심을 구별한다. 조회 횟수를 수업 자료의 교육 효과로 간주하지 않는다.',
    routines:[page('PhET simulations','https://phet.colorado.edu/en/simulations/browse',520),page('NASA learning resources','https://www.nasa.gov/learning-resources/',310)],
    sessions:[
      session(20,'16:25','수업 실험','업무','phet circuit construction kit student misconceptions',[page('Circuit Construction Kit DC','https://phet.colorado.edu/en/simulations/circuit-construction-kit-dc',720),page('About PhET','https://phet.colorado.edu/en/about',340),page('Khan Academy science','https://www.khanacademy.org/science',330)],'학생이 잘못 연결한 회로도 설명의 출발점이 될 수 있다.'),
      session(22,'19:40','수업 실험','업무','energy skate park observation explanation worksheet',[page('Energy Skate Park Basics','https://phet.colorado.edu/en/simulations/energy-skate-park-basics',680),page('About PhET','https://phet.colorado.edu/en/about',250),page('MIT OpenCourseWare','https://ocw.mit.edu/',220)],'관찰 결과를 먼저 쓰게 하고 에너지라는 말을 나중에 붙이게 하려고 한다.'),
      session(24,'21:15','밤하늘','취미','what can I see night sky without telescope',[page('Stellarium Web','https://stellarium-web.org/',710),page('NASA Solar System','https://science.nasa.gov/solar-system/',420),page('NASA citizen science','https://science.nasa.gov/citizen-science/',330)],'전문 장비 없이도 참여할 수 있는 관찰이 있는지 궁금했다.'),
      session(26,'17:55','메이커 동아리','업무','arduino light sensor beginner lesson',[page('Arduino documentation','https://docs.arduino.cc/',650),page('Instructables','https://www.instructables.com/',440),page('MDN Canvas API','https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API',210)],'측정값을 화면에 그리는 과정도 설명에 포함해야겠다.'),
      session(28,'20:10','참여형 연구','조사','Zooniverse classroom citizen science reliability',[page('Zooniverse about','https://www.zooniverse.org/about',620),page('NASA citizen science','https://science.nasa.gov/citizen-science/',470),page('iNaturalist help','https://www.inaturalist.org/pages/help',280)],'참여가 쉽다는 설명과 데이터가 믿을 만하다는 설명은 별개였다.'),
      session(30,'07:20','자전거 경로','휴식','openstreetmap bicycle local knowledge',[page('OpenStreetMap about','https://www.openstreetmap.org/about',440),page('OpenStreetMap','https://www.openstreetmap.org/',660),page('Wikivoyage','https://en.wikivoyage.org/',240)],'내가 매일 지나가는 길도 누군가의 관찰이 모인 데이터다.'),
      session(32,'15:30','수업 실험','정리','science claim evidence reasoning student summary',[page('About PhET','https://phet.colorado.edu/en/about',400),page('NASA learning resources','https://www.nasa.gov/learning-resources/',560),page('Zooniverse about','https://www.zooniverse.org/about',300)],'잘 쓴 요약은 용어의 개수보다 무엇을 보고 그렇게 말했는지가 드러났다.'),
      session(33,'18:15','메이커 동아리','업무','arduino data export csv',[page('Arduino documentation','https://docs.arduino.cc/',560),page('Creative Commons BY 4.0','https://creativecommons.org/licenses/by/4.0/',280),page('PhET simulations','https://phet.colorado.edu/en/simulations/browse',210)],'다른 학생의 결과를 보여주기 전에 자기 관찰을 먼저 적도록 했다.'),
    ],
  },
  {
    id:'narae',name:'나래',age:26,color:'#a6bd95',role:'프리랜서 제품 시각화 작업자 · 베란다 생태 기록',portrait:'N',tagline:'완벽한 이미지보다 시간이 지나며 달라지는 작은 세계를 보는 사람',
    background:'집에서 3D 제품 이미지를 만드는 일을 한다. 작업대 옆 유리병 세 개에 이끼와 작은 식물을 키우며 매주 같은 구도로 사진을 찍는다. 종 이름을 바로 단정하기보다 날짜별 변화를 남기는 편이다.',
    currentGoal:'테라리움 한 병의 8주 변화를 정리하고, 비슷한 사진을 다른 사람이 어떤 근거로 다르게 해석하는지 알고 싶다.',
    constraints:['식물을 더 사기보다 현재 가진 용기의 조건을 조절한다.','사진 한 장으로 생물 종을 확정하지 않는다.','낮에는 클라이언트 수정 요청 때문에 방문 흐름이 자주 끊긴다.'],
    habits:['실패한 관리 기록도 지우지 않는다.','식물 이름 검색 뒤 관찰 사진과 분포 자료를 함께 본다.','일의 도구 검색과 개인 관찰을 같은 브라우저에서 한다.'],
    tension:'업무에서는 결과 이미지를 통제하지만 취미에서는 통제되지 않는 변화를 관찰하고 싶다.',
    distinction:'Blender·자료 구매 사이트는 업무 도구다. 생물 사진의 조회가 곧 그 종을 직접 관찰했다는 뜻은 아니다.',
    routines:[page('iNaturalist observations','https://www.inaturalist.org/observations',440),page('Blender manual','https://docs.blender.org/manual/en/latest/',520)],
    sessions:[
      session(20,'08:35','작은 생태계','관찰','terrarium moss browning humidity record',[page('iNaturalist help','https://www.inaturalist.org/pages/help',390),page('Commons mosses','https://commons.wikimedia.org/wiki/Category:Mosses',650),page('Kew science','https://www.kew.org/science',220)],'갈변했다는 관찰과 습도가 원인이라는 추측을 따로 적었다.'),
      session(22,'14:10','제품 시각화','업무','blender glass condensation material',[page('Blender manual','https://docs.blender.org/manual/en/latest/',740),page('Blender','https://www.blender.org/',180),page('Sketchfab terrarium','https://sketchfab.com/tags/terrarium',430)],'업무 이미지를 만들 때 참고한 물방울 모양을 실제 용기에서 다시 보게 됐다.'),
      session(24,'10:20','작은 생태계','관찰','terrarium time lapse 8 months',[page('Terrarium observation','https://www.youtube.com/shorts/HawePkgEfwU',300),page('Terrarium materials','https://www.youtube.com/shorts/PZyiDbbvkMw',260),page('Commons mosses','https://commons.wikimedia.org/wiki/Category:Mosses',390)],'같은 테라리움이라는 이름 아래에서도 재료와 관찰 기간은 달랐다.'),
      session(26,'21:30','생물 기록','조사','bryophyta observations taxonomy uncertainty',[page('GBIF moss search','https://www.gbif.org/species/search?q=Bryophyta',560),page('iNaturalist observations','https://www.inaturalist.org/observations',660),page('Encyclopedia of Life','https://eol.org/',310)],'이름을 붙이지 못한 관찰도 남겨둘 가치가 있다.'),
      session(28,'09:05','사진 비교','실습','repeat photography fixed position plant growth',[page('Commons photography','https://commons.wikimedia.org/wiki/Category:Photography',340),page('iNaturalist help','https://www.inaturalist.org/pages/help',380),page('Blender manual','https://docs.blender.org/manual/en/latest/',430)],'비교할 사진은 같은 조건으로 남겨야 작은 변화를 볼 수 있었다.'),
      session(30,'18:50','관찰 참여','호기심','citizen science classify wildlife images',[page('Zooniverse projects','https://www.zooniverse.org/projects',570),page('Zooniverse about','https://www.zooniverse.org/about',500),page('GBIF','https://www.gbif.org/',260)],'같은 사진을 여러 사람이 보는 방식이 내 기록에도 도움이 될 것 같다.'),
      session(32,'16:15','작은 생태계','산책','local nature observations map moss',[page('OpenStreetMap about','https://www.openstreetmap.org/about',320),page('iNaturalist observations','https://www.inaturalist.org/observations',640),page('Commons mosses','https://commons.wikimedia.org/wiki/Category:Mosses',290)],'유리병 안의 작은 세계가 바깥의 장소와 연결됐다.'),
      session(33,'22:10','관찰 노트','정리','observation inference separate field notes',[page('iNaturalist help','https://www.inaturalist.org/pages/help',470),page('Zooniverse about','https://www.zooniverse.org/about',360),page('Creative Commons BY 4.0','https://creativecommons.org/licenses/by/4.0/',230)],'다른 사람의 설명을 읽기 전에 내가 본 것을 먼저 써보고 싶다.'),
    ],
  },
];

// Small personal pages and individual videos are first-class records, not domain placeholders.
const extraSessions={
  yunseo:[
    session(21,'22:10','우연한 발견','개인 글 읽기','digital garden contextual links personal website',[
      page('A Brief History & Ethos of the Digital Garden','https://maggieappleton.com/garden-history',920),
      page('Why books don’t work','https://andymatuschak.org/books/',530),
      page('Old pixel art trick','https://www.youtube.com/shorts/dwTGhkArV7Q',68),
      page('Minecraft pixel art reveal','https://www.youtube.com/shorts/Z2kCmULIKp4',94),
    ],'개인 글의 옆길을 따라가다가 같은 픽셀이라는 말 아래에서도 제작과 리빌 영상이 다르다는 것을 봤다.'),
  ],
  minjae:[
    session(24,'23:10','접촉 마이크','개인 글 읽기','contact mic field recording zach poff',[
      page('Choosing a Contact Mic For Field Recording','https://zachpoff.com/resources/choosing-a-contact-mic-for-field-recording/',810),
      page('Low-Noise Binaural Mics','https://zachpoff.com/resources/low-noise-binaural-mics-primo-em172/',660),
      page('Choosing a Hydrophone','https://zachpoff.com/resources/choosing-a-hydrophone-for-field-recording/',540),
    ],'제품 스펙보다 마이크를 물체에 붙이는 방식이 결과를 크게 바꾼다는 설명이 남았다.'),
    session(32,'20:15','쉬는 시간','휴식','kalimba game music piano short',[
      page('Super Mario Bros Songs on Piano','https://www.youtube.com/shorts/__zJOfDpJrs',110),
      page('Chubina kalimba cover','https://www.youtube.com/shorts/YV5Lkz-V_5M',82),
    ],'일의 녹음과 무관하게 연주 영상을 연달아 봤다.'),
  ],
  subin:[
    session(24,'21:35','읽는 방식','개인 글 읽기','why books do not work active reading',[
      page('Why books don’t work','https://andymatuschak.org/books/',1120),
      page('Digital Garden history','https://maggieappleton.com/garden-history',780),
      page('Web books — Andy’s working notes','https://notes.andymatuschak.org/zJgf3fYv555s984EZUBk9zN',370),
    ],'책의 모양을 다시 만드는 것과 읽은 내용을 자기 지식으로 만드는 일을 구분해 봤다.'),
  ],
  jihoo:[
    session(25,'18:45','상호작용 수업','호기심','interactive explanation trust learning by playing',[
      page('The Evolution of Trust','https://ncase.me/trust/',1190),
      page('Why books don’t work','https://andymatuschak.org/books/',850),
      page('A small product announcement and its comments','https://news.ycombinator.com/item?id=8863',330),
      page('Why you hate the sound of your own voice','https://www.youtube.com/shorts/1Xk8ldFZhFM',145),
    ],'짧은 설명과 실제 조작, 댓글에서 나온 반론이 각각 다른 방식으로 이해를 바꿨다.'),
  ],
  narae:[
    session(21,'20:05','작은 생태계','개인 글 읽기','terrarium glass jar patricia buzo margaret roach',[
      page('DIY terrariums with Patricia Buzo','https://awaytogarden.com/d-i-y-terrariums-as-gifts-or-centerpieces-with-patricia-buzo/comment-page-8/',990),
      page('Terrarium materials in a glass container','https://www.youtube.com/shorts/PZyiDbbvkMw',140),
      page('Terrarium after eight months','https://www.youtube.com/shorts/HawePkgEfwU',190),
      page('Digital Garden history','https://maggieappleton.com/garden-history',480),
    ],'진짜 유리병 정원을 읽다가 웹의 정원이라는 비유까지 따라갔다. 같은 정원이라는 단어가 같은 활동을 뜻하지는 않았다.'),
    session(29,'22:35','모형 만들기','휴식','tiny house architecture model shorts',[
      page('Making an architecture model','https://www.youtube.com/shorts/I_AbQlk7hcU',94),
      page('DIY miniature objects','https://www.youtube.com/shorts/oGEyHi_iv88',108),
      page('DIY miniature making process','https://www.youtube.com/shorts/gFJFBRbw87Y',127),
    ],'식물 관리와 별개로 작은 물건을 만드는 손동작을 오래 봤다.'),
  ],
};
for(const persona of personaSeeds)persona.sessions.push(...extraSessions[persona.id]);
