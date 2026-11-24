import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pickImages,imageList} from '../src/content/images.js';

// ── 이미지 목록: 그림만 남기고 아이콘·로고·영상·문서 파일·작은 썸네일은 거른다 ──
const item=(title,extra={})=>({type:'image',showInGallery:true,title,srcset:[{src:`//thumb.wikimedia.org/x/${title}/330px-${title}`,scale:'1x'}],...extra});
const picked=pickImages([
  item('File:Photo_one.jpg',{caption:{text:'첫 사진'}}),item('파일:Photo_two.png'),
  item('File:Wikipedia-logo.png'),item('File:Edit-icon.png'),item('File:Diagram.svg'),item('File:Scan.pdf'),item('File:Scan.tif'),
  item('File:Hidden.jpg',{showInGallery:false}),{...item('File:Movie.ogg'),type:'video'},
  item('File:Tiny.jpg',{srcset:[{src:'//thumb.wikimedia.org/x/20px-Tiny.jpg'}]}),item('File:NoSrc.jpg',{srcset:[]}),
  item('File:Photo_one.jpg'),item('File:Dunk.gif'),
]);
assert.deepEqual(picked.map(p=>p.alt),['첫 사진','Photo two.png','Dunk.gif']);
assert.ok(picked.every(p=>p.src.startsWith('https://thumb.wikimedia.org/')));
assert.equal(pickImages(Array.from({length:30},(_,i)=>item(`File:P${i}.jpg`))).length,12);
assert.deepEqual(pickImages(undefined),[]);

const calls=[];let restStatus=200,restItems=[];
globalThis.fetch=async url=>{
  const u=new URL(url);calls.push(u);
  if(u.pathname.startsWith('/api/rest_v1/page/media-list/'))return {ok:restStatus===200,status:restStatus,json:async()=>({items:restItems})};
  const p=u.searchParams,body=json=>({ok:true,json:async()=>json});
  if(p.get('prop')==='links')return body({query:{pages:{1:{title:p.get('titles'),ns:0,links:'ABCDEFGHI'.split('').map(c=>({ns:0,title:'가족'+c}))}}}});
  if(p.get('exsentences')==='4')return body({query:{pages:{1:{title:p.get('titles'),ns:0,extract:'요약 문장이다. 둘째 문장이다.'}}}});
  const pages={};p.get('titles').split('|').forEach((t,i)=>{pages[100+i]={title:t,ns:0,extract:t+'는 설명이다.'};});
  return body({query:{pages}});
};
restItems=[item('File:A.jpg')];
assert.equal((await imageList('ko','농구 공')).length,1);
const rest=calls.at(-1);assert.equal(rest.hostname,'ko.wikipedia.org');assert.equal(decodeURIComponent(rest.pathname.split('/').pop()),'농구_공');
restStatus=404;assert.deepEqual(await imageList('ko','없는문서'),[]);
restStatus=500;await assert.rejects(()=>imageList('ko','농구'));
restStatus=200;

// ── 작은 DOM 흉내: 실제 정보창·보기 창·메모 모듈을 그대로 불러 클릭과 키 입력을 흘려 보낸다 ──
class Element {
  constructor(id=''){this.id=id;this.l={};this.hidden=false;this.disabled=false;this.value='';this.textContent='';this.attrs={};this.children=[];
    this.style={};this.offsetWidth=300;this.offsetHeight=200;this.classes=new Set();
    this.classList={toggle:(c,on)=>{(on??!this.classes.has(c))?this.classes.add(c):this.classes.delete(c);},contains:c=>this.classes.has(c)};}
  addEventListener(type,handler){(this.l[type]??=[]).push(handler);}
  fire(type,event={}){for(const handler of this.l[type]??[])handler({preventDefault(){},...event});}
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
  set src(v){this.attrs.src=v;}get src(){return this.attrs.src;}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
  focus(){focused=this;}observe(){}
  getContext(){return {createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),setTransform(){},fillRect(){}};}
}
let focused=null;
const elements=new Map();
globalThis.document={createElement(){return new Element();},getElementById(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);},querySelector(){return new Element();}};
const $=id=>document.getElementById(id);
const windowListeners={};
globalThis.addEventListener=(type,handler)=>{(windowListeners[type]??=[]).push(handler);};
const press=key=>windowListeners.keydown.forEach(h=>h({key}));
globalThis.ResizeObserver=class{observe(){}};
globalThis.innerWidth=1200;globalThis.innerHeight=800;globalThis.devicePixelRatio=1;
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
for(const id of ['resultActions','story','viewer','wikiFrame','imageGrid','viewerNote','storyRetry'])$(id).hidden=true;

const core=await import('../src/core/state.js');   // state는 바뀌는 바인딩이라 core.state로 읽는다
const {load,jumpTo,beginExtension,finishExtension,queueWalk,BLDG,ROAD}=core;
const {CELL_COUNT,cellVec,cellNeighbours,ll}=await import('../src/core/grid.js');
const {loadInterests,getInterest}=await import('../src/core/interests.js');
const {resize}=await import('../src/world/renderer.js');resize();
const {createResults,hideResults}=await import('../src/ui/results.js');
const {createMemo}=await import('../src/ui/memo.js');
loadInterests();

const a=500,b=cellNeighbours(a)[0],[lat,lon]=ll(cellVec(a));
const cells=Array(CELL_COUNT).fill(0);cells[a]=BLDG;cells[b]=ROAD;
store.set('webglobe3',JSON.stringify({c:cells.join(''),n:[{t:'농구',lang:'ko',lat,lon}],r:[a,b],t:[0],h:b,g:[]}));
assert.equal(load(),true);
const contacts=[],chosen=[];
const results=createResults({onChoose:(from,c)=>chosen.push([from.t,c.t]),onFirstContact:n=>contacts.push(n.t)});
const memo=createMemo({delay:30});
const here=()=>core.state.nodes.find(n=>n.t==='농구'&&core.state.here===a);
const arrive=()=>{results.arrive();memo.show(core.state.nodes.find(n=>n.t==='농구'&&core.state.here===a));};
const settle=()=>new Promise(resolve=>setTimeout(resolve,40));
const names=()=>$('familyBoxes').children.map(li=>li.children[0].children[0].textContent);

// 1) 외계인이 아닌 칸에서는 열리지 않는다
arrive();assert.equal($('resultActions').hidden,true);assert.equal(results.isAlienHere(core.state.here),false);
// 2) 걷는 도중 지나는 칸(남은 길 있음)·여정 진행 중(busy)에는 열리지 않는다
jumpTo(a);queueWalk([b]);arrive();assert.equal($('resultActions').hidden,true,'passing through is not arriving');
queueWalk([]);assert.equal(beginExtension(),true);arrive();assert.equal($('resultActions').hidden,true,'busy journey does not open');
finishExtension();
// 3) 도착(남은 길 없음·여정 아님)하면 자동으로 열리고, 첫 접촉은 한 번
arrive();
assert.equal($('resultActions').hidden,false);assert.equal($('story').hidden,false);
assert.equal($('familyTitle').textContent,'“농구”의 가족들');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(html.includes('<p id="familyRule">위키백과 문서 링크 단어 중 랜덤 3개</p>'));
for(const gone of ['openStory','id="again"','interestPanel','embedWiki','memoToggle','메모 저장'])assert.equal(html.includes(gone),false,gone);
assert.equal(focused,$('story'));assert.deepEqual(contacts,['농구']);
await settle();
assert.equal($('storySummary').textContent,'요약 문장이다. 둘째 문장이다.');
assert.equal(names().length,3);assert.equal($('familyGuide').textContent,'','첫 접촉에는 안내 문구가 없다 (고정 한 줄은 따로)');
// 후보 버튼에는 단어와 설명(호버 때만 보임)이 있고, 고르면 onChoose
const card=$('familyBoxes').children[0].children[0];
assert.equal(card.className,'family-card');assert.ok(card.children[1].textContent.endsWith('설명이다.'));
card.fire('click');assert.deepEqual(chosen,[['농구',names()[0]]]);
// 4) 같은 칸에서 arrive가 다시 불려도 닫은 창은 저절로 다시 열리지 않는다. 클릭하면 다시 열린다
$('closeStory').fire('click');assert.equal($('resultActions').hidden,true);
arrive();arrive();assert.equal($('resultActions').hidden,true,'closed window stays closed');
assert.equal(results.isAlienHere(core.state.here),true);results.openStory();
assert.equal($('resultActions').hidden,false);assert.deepEqual(contacts,['농구'],'first contact fires once per document');
await settle();assert.equal($('familyGuide').textContent,'','다시 만나도 안내 문구는 없다');

// 5) ↻: 지금 보이는 후보를 피해 다시 뽑는다
for(let i=0;i<6;i++){
  const before=names();$('familyReroll').fire('click');
  assert.equal(names().length,0,'cleared while loading');await settle();
  const after=names();assert.equal(after.length,3);assert.equal(after.some(t=>before.includes(t)),false,`${before} → ${after}`);
  assert.equal($('familyGuide').textContent,'');
}
// 가져오기에 실패하면 '다시 불러오기'가 나온다
const realFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:false,status:500,json:async()=>({})});
$('familyReroll').fire('click');await settle();
assert.equal($('storyRetry').hidden,false);assert.match($('familyGuide').textContent,/불러오지 못했어요/);
globalThis.fetch=realFetch;$('storyRetry').fire('click');await settle();
assert.equal($('storyRetry').hidden,true);assert.equal(names().length,3);

// 6) 하트·메모: 입력 뒤 잠시 있다가 자동 저장, 정보창을 닫을 때도 저장
$('heart').fire('click');assert.equal(getInterest(here()).heart,true);assert.equal($('heart').attrs['aria-pressed'],'true');assert.equal($('heart').textContent,'♥');
$('memoText').value='첫 메모';$('memoText').fire('input');assert.equal(getInterest(here()).memo,'');assert.equal($('memoCount').textContent,'4/500');
await settle();assert.equal(getInterest(here()).memo,'첫 메모');
// 7) 보기 창: 원문 → 이미지로 교체, 한 번에 하나
restItems=[item('File:Shot_1.jpg'),item('File:Shot_2.jpg')];
$('openWiki').fire('click');
assert.equal($('viewer').hidden,false);assert.match($('wikiFrame').src,/^https:\/\/ko\.wikipedia\.org\/wiki\/.*\?useformat=mobile$/);
assert.equal($('wikiFrame').hidden,false);assert.equal($('viewerExternal').textContent,'새 탭으로 열기');assert.equal($('openWiki').attrs['aria-expanded'],'true');
$('openImages').fire('click');
assert.equal($('wikiFrame').src,undefined,'only one overlay at a time');assert.equal($('wikiFrame').hidden,true);
assert.equal($('openWiki').attrs['aria-expanded'],'false');assert.equal($('openImages').attrs['aria-expanded'],'true');
assert.match($('viewerExternal').href,/^https:\/\/www\.google\.com\/search\?q=/);assert.equal($('viewerExternal').textContent,'구글 이미지');
await settle();assert.equal($('imageGrid').hidden,false);assert.equal($('imageGrid').children.length,2);
$('openImages').fire('click');assert.equal($('viewer').hidden,true,'pressing the same button again closes it');
restStatus=404;restItems=[];$('openImages').fire('click');await settle();   // 캐시되어 있어 다시 받지 않는다
assert.equal($('imageGrid').children.length,2);
$('viewerClose').fire('click');assert.equal($('viewer').hidden,true);assert.equal(focused,$('openImages'));
// 8) Esc: 정보창과 보기 창이 함께 닫히고, 쓰던 메모가 저장된다
$('openWiki').fire('click');assert.equal($('viewer').hidden,false);
$('memoText').value='닫기 직전 메모';$('memoText').fire('input');   // 기다리지 않고 바로 닫는다
press('Escape');
assert.equal($('resultActions').hidden,true);assert.equal($('viewer').hidden,true);assert.equal($('wikiFrame').src,undefined);
assert.equal(getInterest(here()).memo,'닫기 직전 메모');
// 9) 다시 열면 저장한 하트·메모가 그대로 보인다
results.openStory();assert.equal($('memoText').value,'닫기 직전 메모');assert.equal($('heart').attrs['aria-pressed'],'true');
// 10) 외계인을 떠나면 정보창도 보기 창도 닫히고 메모가 저장된다
$('openImages').fire('click');$('memoText').value='떠나기 전 메모';$('memoText').fire('input');
jumpTo(b);arrive();
assert.equal($('resultActions').hidden,true);assert.equal($('viewer').hidden,true);
jumpTo(a);
assert.equal(JSON.parse(store.get('webglobe-interests-v1'))[JSON.stringify(['ko','농구'])].memo,'떠나기 전 메모');
// 11) 되돌아 도착하면 새로 열린다. 새 여정이 시작되면(hideResults) 닫히고, 서 있던 외계인 앞에서 저절로 다시 열리지 않는다
arrive();assert.equal($('resultActions').hidden,false);
hideResults();assert.equal($('resultActions').hidden,true);arrive();assert.equal($('resultActions').hidden,true);
// 12) 메모 저장 실패는 짧게 알린다
results.openStory();arrive();
globalThis.localStorage={getItem:()=>null,setItem(){throw new Error('quota');}};
$('memoText').value='저장 안 됨';$('memoText').fire('input');await settle();
assert.match($('memoStatus').textContent,/저장하지 못했습니다/);
console.log('PASS: image filter and fetch, auto-open only on arrival, first contact once, closed window stays closed until clicked, reroll avoids shown family, hover-line cards, heart/memo autosave and failure notice, one overlay at a time, Esc/leave/new journey close overlay.');
