import assert from 'node:assert/strict';
import {state,PLAN,ROAD,BLDG,ENTERED,load,save,beginJourney,queueWalk,nextWalkStep} from '../src/core/state.js';
import {CELL_COUNT,cellOf,cellVec,cellNeighbours,legacyCellVec} from '../src/core/grid.js';
import {wikiURL,imageSearchURL} from '../src/content/result-links.js';
import {createNavigation} from '../src/world/navigation.js';

// Every geodesic dual cell maps back to itself, including pentagons and seams.
for(let c=0;c<CELL_COUNT;c++)assert.equal(cellOf(...cellVec(c)),c);
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
// Old 24×24 cube-sphere saves migrate into the new soccer-ball grid.
const legacyA=2*24*24+12*24+10,legacyCells=new Uint8Array(3456);legacyCells[legacyA]=ENTERED;
const legacy={c:Array.from(legacyCells).join(''),n:[{t:'Dance',lang:'en',lat:0,lon:0}],r:[legacyA],t:[0],h:legacyA,g:[]};
storage.set('webglobe3',JSON.stringify(legacy));load();
assert.equal(state.route[0],cellOf(...legacyCellVec(legacyA)));assert.equal(state.here,state.route[0]);assert.equal(state.cells[state.here],ENTERED);
const older={...legacy,a:0};delete older.h;delete older.g;
storage.set('webglobe3',JSON.stringify(older));assert.equal(load(),true);
assert.equal(state.here,state.route[0]);
// A native hex-cell path uses explicit dual-mesh neighbours for travel.
const a=500,b=cellNeighbours(a)[0],c=cellNeighbours(b).find(x=>x!==a);
const cells=Array(CELL_COUNT).fill(0);cells[a]=ENTERED;cells[b]=PLAN;cells[c]=BLDG;
const native={c:cells.join(''),n:[{t:'Dance',lang:'en',lat:0,lon:0}],r:[a,b,c],t:[0],h:a,g:[b]};
storage.set('webglobe3',JSON.stringify(native));load();assert.equal(state.guide[b],1);
let arrivals=0;
const navigation=createNavigation({project:v=>({x:v[0]*100,y:-v[1]*100}),onArrive:()=>arrivals++});
navigation.walkTo(c);assert.equal(state.walkPath.at(-1),c);
while(state.walkPath.length)navigation.step(nextWalkStep());
assert.equal(state.here,c);assert.equal(state.cells[b],ROAD);assert.equal(state.guide[b],0);assert.equal(state.cells[a],ENTERED);assert.ok(arrivals>0);
save();beginJourney('New start');load();
assert.equal(state.here,c);assert.deepEqual(state.route,[a,b,c]);assert.equal(state.nodes[0].t,'Dance');
// Clicking again replaces travel; disconnected cells never teleport the walker.
storage.set('webglobe3',JSON.stringify(native));load();
navigation.walkTo(c);navigation.walkTo(b);assert.equal(state.walkPath.at(-1),b);
navigation.walkTo(a);assert.deepEqual(state.walkPath,[]);
const connected=new Set([a,b,c,...cellNeighbours(a),...cellNeighbours(b),...cellNeighbours(c)]);
const disconnected=Array.from({length:CELL_COUNT},(_,i)=>i).find(i=>!connected.has(i)),isolated=[...cells];isolated[disconnected]=ROAD;
storage.set('webglobe3',JSON.stringify({...native,c:isolated.join('')}));load();
assert.equal(navigation.walkTo(disconnected),false);assert.equal(state.here,a);
assert.equal(navigation.walkTo(-1),false);assert.equal(state.here,a);
storage.set('webglobe3','invalid json');assert.doesNotThrow(()=>load());
console.log('PASS: all geodesic cell identities, square-save migration, destination encoding, click travel and disconnected-path rejection and visited flags.');
