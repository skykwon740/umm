import assert from 'node:assert/strict';
import {loadInterests,getInterest,saveInterest} from '../src/core/interests.js';
import {camera,initializeCamera,rotateCamera,followWalker,resumeTracking,tickCamera} from '../src/world/camera.js';
import {state,load,initializeWalker,queueWalk,tickAnimation,stepTo,flushMovementSave} from '../src/core/state.js';
import {CELL_COUNT,cellVec} from '../src/core/grid.js';
const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
globalThis.localStorage=storage;
loadInterests(storage);
const ko={t:'Dance',lang:'ko'},en={t:'Dance',lang:'en'};
assert.equal(saveInterest(ko,{heart:true,memo:'<script>메모</script>'},storage),true);
loadInterests(storage);assert.equal(getInterest(ko).heart,true);assert.equal(getInterest(en).heart,false);
assert.equal(getInterest(ko).memo,'<script>메모</script>');
assert.equal(saveInterest(ko,{memo:'a'.repeat(501)},storage),false);
assert.equal(saveInterest(ko,{heart:false},{setItem(){throw Error('quota');}}),false);
assert.equal(getInterest(ko).heart,true);
assert.throws(()=>{getInterest(ko).heart=false;},TypeError);
initializeCamera(cellVec(100),false);rotateCamera(10,5);
const manual=camera;followWalker(cellVec(500));assert.equal(camera,manual);
resumeTracking(cellVec(500));assert.notEqual(camera.tLon,manual.tLon);
// Camera interpolation gives the same result for equal elapsed time at 30/60 Hz.
function cameraAt(hz) {
  initializeCamera(cellVec(100),false);resumeTracking(cellVec(500));tickCamera(0);
  // Reset initial pose after priming the clock.
  initializeCamera(cellVec(100),false);resumeTracking(cellVec(500));
  for(let i=1;i<=hz;i++)tickCamera(i*1000/hz);
  return camera.lon;
}
assert.ok(Math.abs(cameraAt(30)-cameraAt(60))<1e-6);
const a=500,cells=Array(CELL_COUNT).fill(0);for(let i=0;i<90;i++)cells[a+i]=2;
function reset(){storage.setItem('webglobe3',JSON.stringify({c:cells.join(''),n:[],r:[],t:[],h:a}));load();initializeWalker();}
reset();stepTo(a+1,1,1000);queueWalk([]);assert.equal(tickAnimation(1050).canStep,false);
queueWalk(Array(80).fill(a+2));assert.equal(tickAnimation(1050).canStep,true);
flushMovementSave();assert.equal(JSON.parse(storage.getItem('webglobe3')).h,a+1);
console.log('PASS: interest persistence/language separation/quota, camera manual tracking and frame independence, distance speed and final movement save.');

// Exercise the actual input/search/memo event handlers with a small DOM adapter.
class Element {
  constructor(){this.listeners=new Map();this.hidden=false;this.value='';this.textContent='';this.attrs={};this.offsetWidth=260;this.offsetHeight=44;}
  addEventListener(type,handler){this.listeners.set(type,handler);}
  fire(type,event={}){this.listeners.get(type)?.({preventDefault(){},...event});}
  setAttribute(key,value){this.attrs[key]=value;}
  focus(){this.focused=true;}
  blur(){this.focused=false;}
  setPointerCapture(){}
  hasPointerCapture(){return true;}
  releasePointerCapture(){}
  getContext(){return {createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),setTransform(){},fillRect(){}};}
}
const elements=new Map();
globalThis.document={createElement(){return new Element();},getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},querySelector(){return new Element();}};
const globalEvents=[];globalThis.addEventListener=(name)=>globalEvents.push(name);
globalThis.innerWidth=1200;globalThis.innerHeight=800;globalThis.devicePixelRatio=1;
const {resize}=await import('../src/world/renderer.js');resize();
const {bindInput}=await import('../src/world/input.js');
let clicks=0;bindInput({walkTo(){clicks++;}});
const canvas=document.getElementById('c');
const pointer={pointerId:1,button:0,clientX:450,clientY:400};
const before=camera;
canvas.fire('pointerdown',pointer);canvas.fire('pointermove',{...pointer,clientX:452});
assert.equal(camera,before);canvas.fire('pointerup',pointer);assert.equal(clicks,1);
canvas.fire('pointerdown',pointer);canvas.fire('pointermove',{...pointer,clientX:480});
assert.notEqual(camera,before);canvas.fire('pointerup',pointer);assert.equal(clicks,1);
canvas.fire('pointerdown',{...pointer,button:2});canvas.fire('pointerup',pointer);assert.equal(clicks,1);
assert.ok(!globalEvents.includes('keydown'));assert.ok(!globalEvents.includes('wheel'));
const {bindSearch}=await import('../src/ui/panel.js');
const searches=[];bindSearch(q=>searches.push(q));
const input=document.getElementById('q'),bar=document.getElementById('bar');
input.value='   ';bar.fire('submit');assert.equal(searches.length,0);
input.value='a'.repeat(101);bar.fire('submit');assert.equal(searches.length,0);
input.value='  여행  ';bar.fire('submit');assert.deepEqual(searches,['여행']);
let prevented=false;input.fire('keydown',{key:'Enter',isComposing:true,preventDefault(){prevented=true;}});assert.equal(prevented,true);
const {createMemo}=await import('../src/ui/memo.js');
const memo=createMemo();memo.show(en);
const memoInput=document.getElementById('memoText');memoInput.value='안전한 메모';
document.getElementById('memoEditor').fire('submit');assert.equal(getInterest(en).memo,'안전한 메모');
document.getElementById('heart').fire('click');assert.equal(getInterest(en).heart,true);
memo.show(ko);assert.equal(memoInput.value,'<script>메모</script>');
memo.show(null);assert.equal(document.getElementById('interestPanel').hidden,true);
console.log('PASS: actual click/drag/right-click handlers, mouse-only world bindings, search limits/IME, memo save/toggle and node switching.');
