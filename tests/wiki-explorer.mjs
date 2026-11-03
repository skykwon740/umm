import assert from 'node:assert/strict';
import {state,PLAN,ROAD,BLDG,ENTERED,load,save,beginJourney,queueWalk,nextWalkStep} from '../src/core/state.js';
import {cellOf,cellVec,N,FACE} from '../src/core/grid.js';
import {wikiURL,imageSearchURL} from '../src/content/result-links.js';
import {createNavigation} from '../src/world/navigation.js';

// The refactored cube-sphere must preserve every legacy cell identity, including seams.
for(let c=0;c<6*FACE;c++)assert.equal(cellOf(...cellVec(c)),c);
for(const [title,lang]of [['춤 & 정치 + 경제','ko'],['Dance / culture? #1','en'],['"<여행>"','ko']]){
  const node={t:title,lang};
  const wiki=new URL(wikiURL(node)),images=new URL(imageSearchURL(node));
  assert.equal(wiki.hostname,lang+'.wikipedia.org');
  assert.equal(decodeURIComponent(wiki.pathname.slice(6)),title.replace(/ /g,'_'));
  assert.equal(images.hostname,'www.google.com');
  assert.equal(images.searchParams.get('q'),title);
  assert.equal(images.searchParams.get('udm'),'2');
}
const storage=new Map();globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
// Load the old schema, then walk the drawn route and read it back after saving.
const a=2*FACE+12*N+10,b=a+1,c=a+2;
const cells=new Uint8Array(6*FACE);cells[a]=ENTERED;cells[b]=PLAN;cells[c]=BLDG;
const legacy={c:Array.from(cells).join(''),n:[{t:'Dance',lang:'en',lat:0,lon:0}],r:[a,b,c],t:[0],h:a,g:[b]};
storage.set('webglobe3',JSON.stringify(legacy));load();
assert.deepEqual(state.route,[a,b,c]);assert.equal(state.here,a);assert.equal(state.guide[b],1);
const older={...legacy,a:1};delete older.h;delete older.g;
storage.set('webglobe3',JSON.stringify(older));assert.equal(load(),true);
assert.equal(state.here,b);assert.equal(state.guide[b],1);
storage.set('webglobe3',JSON.stringify(legacy));load();
let arrivals=0;const keys=new Set();
const navigation=createNavigation({project:v=>({x:v[0]*100,y:-v[1]*100}),onArrive:()=>arrivals++,keys});
navigation.walkTo(c);assert.equal(state.walkPath.at(-1),c);
while(state.walkPath.length)navigation.step(nextWalkStep());
assert.equal(state.here,c);assert.equal(state.cells[b],ROAD);assert.equal(state.guide[b],0);assert.equal(state.cells[a],ENTERED);assert.ok(arrivals>0);
save();beginJourney();load();
assert.equal(state.here,c);assert.deepEqual(state.route,[a,b,c]);assert.equal(state.nodes[0].t,'Dance');
// Keyboard movement uses the same state and clears queued click travel.
storage.set('webglobe3',JSON.stringify(legacy));load();queueWalk([c]);keys.add('ArrowRight');
assert.equal(navigation.keyStep(),true);assert.notEqual(state.here,a);assert.deepEqual(state.walkPath,[]);
storage.set('webglobe3','invalid json');assert.doesNotThrow(()=>load());
console.log('PASS: all 3456 cell identities, destination encoding, legacy save round-trip, click/keyboard travel and visited flags.');
