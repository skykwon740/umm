import assert from 'node:assert/strict';

// 정보창 떨림(사용자 영상 11/27): 가족 카드에 마우스를 올리면 설명 줄이 나타나 창이 길어지고,
// 길어진 창이 위/아래/옆 다른 자리로 옮겨 가 커서가 카드에서 벗어나고, 설명이 사라져 다시 돌아오기를 되풀이했다.
// ↻를 눌러도 후보가 비었다 차면서 창이 커서 밑에서 튀었다.
// 규칙: 포인터가 정보창 위에 있는 동안에는 높이가 바뀌어도 창 자리를 옮기지 않는다(화면 아래로 넘칠 때만 위로 올림).
class Element {
  constructor(id=''){this.id=id;this.l={};this.hidden=false;this.disabled=false;this.value='';this.textContent='';this.attrs={};this.children=[];
    this.style={};this.offsetWidth=300;this.offsetHeight=40;this.classes=new Set();this.hovered=false;
    this.classList={toggle:(c,on)=>{(on??!this.classes.has(c))?this.classes.add(c):this.classes.delete(c);},contains:c=>this.classes.has(c)};}
  addEventListener(type,handler){(this.l[type]??=[]).push(handler);}
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
  focus(){}observe(){}matches(selector){return selector===':hover'&&this.hovered;}
  // 캔버스 그리기는 이 검사와 상관없다: 이미지 데이터만 크기에 맞게 주고 나머지 호출은 무시한다
  getContext(){const image=(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h});
    return new Proxy({},{get:(t,k)=>k==='createImageData'?image:k==='getImageData'?(x,y,w,h)=>image(w,h):k in t?t[k]:()=>{},set:(t,k,v)=>{t[k]=v;return true;}});}
}
const elements=new Map();
globalThis.document={createElement(){return new Element();},getElementById(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);},querySelector(){return new Element();}};
const $=id=>document.getElementById(id);
globalThis.addEventListener=()=>{};globalThis.ResizeObserver=class{observe(){}};
globalThis.innerWidth=1200;globalThis.innerHeight=800;globalThis.devicePixelRatio=1;
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
globalThis.fetch=async()=>({ok:false,status:500,json:async()=>({})});   // 위키 응답은 이 검사와 상관없다
for(const id of ['resultActions','story','viewer','wikiFrame','imageGrid','viewerNote','storyRetry'])$(id).hidden=true;
$('side').offsetWidth=300;$('top').offsetHeight=48;

const {load,BLDG,ROAD}=await import('../src/core/state.js');
const {CELL_COUNT,cellVec,cellNeighbours,ll}=await import('../src/core/grid.js');
const {initializeCamera}=await import('../src/world/camera.js');
const {resize}=await import('../src/world/renderer.js');resize();
const {createResults,drawLabels}=await import('../src/ui/results.js');

// 캐릭터가 외계인 칸(a)에 서 있고, 카메라는 그 칸을 본다
const a=500,b=cellNeighbours(a)[0],[lat,lon]=ll(cellVec(a));
const cells=Array(CELL_COUNT).fill(0);cells[a]=BLDG;cells[b]=ROAD;
store.set('webglobe3',JSON.stringify({c:cells.join(''),n:[{t:'농구',lang:'ko',lat,lon}],r:[a,b],t:[0],h:a,g:[]}));
assert.equal(load(),true);
initializeCamera(cellVec(a));
const results=createResults({onChoose(){},onFirstContact(){}});
results.arrive();
const box=$('resultActions');
assert.equal(box.hidden,false);assert.equal(box.classList.contains('open'),true);

const place=height=>{box.offsetHeight=height;drawLabels();return {left:box.style.left,top:box.style.top};};
// 포인터가 밖에 있으면: 높이에 맞춰 자리를 다시 고른다 (예전 동작 유지)
const short=place(420),tall=place(520);
assert.ok(short.top&&short.left,'placed');
assert.notDeepEqual(short,tall,'without the pointer the window re-places itself for a new height');
// 포인터가 위에 있으면: 설명 줄(+18px)이 생기거나 ↻로 후보가 비었다 차도 자리가 그대로다
const before=place(420);box.hovered=true;
for(const h of [438,300,420,438,420])assert.deepEqual(place(h),before,`height ${h}px under the pointer moved the window`);
// 포인터 아래에서 커져 화면 아래로 넘치면 넘친 만큼만 올린다 (왼쪽은 그대로)
const over=place(800-parseFloat(before.top)+40);
assert.equal(over.left,before.left);assert.ok(parseFloat(over.top)<parseFloat(before.top),'overflowing window is lifted');
assert.ok(parseFloat(over.top)>=48+8,'never under the top bar');
// 포인터가 위에 있어도 보기 창(원문·이미지)이 열려 오른쪽이 좁아지면 그만큼 옆으로 비킨다
const held=place(420),viewer=$('viewer');viewer.hidden=false;viewer.offsetWidth=500;
const beside=place(420);
assert.ok(parseFloat(beside.left)<parseFloat(held.left),'window steps aside for the opened viewer');assert.equal(beside.top,held.top);
viewer.hidden=true;
// 포인터가 떠나면 다시 제자리를 고른다
box.hovered=false;assert.deepEqual(place(420),before);
console.log('PASS info window stays put under the pointer');
