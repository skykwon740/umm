import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {resolveTerritories,allowedEdges} from '../dist/content/territories.js';
import {createTerrain} from '../dist/world/terrain.js';
import {createNavigation} from '../dist/world/navigation.js';
import {createWorld} from '../dist/world/world.js';
import {buildWebWorld} from '../dist/content/web-world.js';
import {buildPersonaWorld} from '../dist/content/persona-world.js';

const noop=()=>{};
function makeContext() {
  return new Proxy({
    measureText:text=>({width:String(text).length*7}),
    getImageData:(x,y,width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}),
    createImageData:(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}),
  },{get:(target,key)=>key in target?target[key]:noop,set:(target,key,value)=>(target[key]=value,true)});
}
const canvasEvents=new Map(),windowEvents=new Map();
const context=makeContext();
const canvas={getContext:()=>context,style:{},getBoundingClientRect:()=>({width:96,height:96,left:0,top:0}),tabIndex:0,getAttribute:()=>'',setAttribute:noop,addEventListener:(key,value)=>canvasEvents.set(key,value),removeEventListener:noop,focus:noop};
globalThis.document={createElement:()=>({getContext:()=>makeContext()}),querySelector:()=>null};
globalThis.window={matchMedia:()=>({matches:true}),devicePixelRatio:1,addEventListener:(key,value)=>windowEvents.set(key,value),removeEventListener:noop};
globalThis.Path2D=class{rect(){}};
globalThis.ResizeObserver=class{observe(){} disconnect(){}};
let frame;
globalThis.requestAnimationFrame=callback=>(frame=callback,1);
globalThis.cancelAnimationFrame=noop;
const catalog=JSON.parse(await fs.readFile(new URL('../dist/videos.json',import.meta.url),'utf8'));
const territories=resolveTerritories(catalog);
const terrain=createTerrain(territories);
const nav=createNavigation(terrain,{allowedEdges},{x:0,y:0});
assert.equal(nav.connections.length,14);
assert(nav.connections.every(edge=>edge.path?.length),'Every allowed connection must remain reachable.');
let forbiddenBorders=0;
for(let i=0;i<terrain.ownership.length;i++) {
  for(const j of [i%terrain.columns<terrain.columns-1?i+1:-1,i+terrain.columns<terrain.ownership.length?i+terrain.columns:-1]) {
    if(j<0 || terrain.ownership[i]<0 || terrain.ownership[j]<0 || terrain.ownership[i]===terrain.ownership[j]) continue;
    if(nav.allowedTransitions.has(nav.edgeKey(terrain.ownership[i],terrain.ownership[j]))) continue;
    forbiddenBorders++;
    assert(!nav.canStep(nav.gridCenter(i),nav.gridCenter(j)),'A forbidden border can be crossed.');
  }
}
assert(forbiddenBorders>0);
for(const i of nav.bridgeCells) assert(terrain.ownership[i]<0 && nav.navOwner[i]>=0);

const selects=[];
const world=createWorld(canvas,{territories,allowedEdges,onSelect:selection=>selects.push(selection)});
let now=1000;
const tick=()=>{ now+=50; const callback=frame; callback(now); };
const finish=()=>{let count=0;while(world.getState().navigation.remainingSteps && count++<3000) tick();for(let n=0;n<6;n++)tick();assert.equal(world.getState().navigation.remainingSteps,0);};
tick();
for(const territory of territories.filter(t=>t.id!=='home')) {
  assert(world.home()); finish();
  const before=selects.length;
  assert(world.goTo(territory.id));
  assert.equal(selects.length,before,'A destination video was selected before arrival.');
  finish();
  assert.equal(selects.at(-1)?.territory.id,territory.id);
  const visible=world.getLandmarks().filter(item=>item.screen.visible);
  for(const item of visible) {
    const restored=world.unprojectPoint(item.screen);
    assert(Math.hypot(restored.x-item.world.x,restored.y-item.world.y)<1e-6,'Sphere picking does not match world coordinates.');
  }
}
assert.equal(world.unprojectPoint({x:-10000,y:-10000}),null);
world.destroy();
const webModel=buildWebWorld([{url:'https://github.com/example',title:'Example repository',query:''}]);
const webWorld=createWorld(canvas,{territories:webModel.territories,allowedEdges:webModel.edges,freeRoam:true});
tick();
assert.equal(webWorld.getState().navigation.unreachableEdges.length,0,'A web region cannot be reached.');
assert.equal(webWorld.getLandmarks().length,webModel.sites.length,'A website was lost during map generation.');
const landmarks=webWorld.getLandmarks();
assert.equal(new Set(landmarks.map(item=>item.world.x+':'+item.world.y)).size,landmarks.length,'Website buildings overlap.');
webWorld.destroy();
const {personas}=JSON.parse(await fs.readFile(new URL('../dist/data/personas.json',import.meta.url),'utf8'));
for(const persona of personas){
  const model=buildPersonaWorld(personas,persona.id);
  const map=createWorld(canvas,{territories:model.territories,allowedEdges:model.edges,freeRoam:true});
  assert.equal(map.getLandmarks().length,model.sites.length,'Persona pages must not be lost.');
  assert.equal(map.getState().navigation.unreachableEdges.length,0,'Every persona and gateway must be reachable.');
  const points=map.getLandmarks();assert.equal(new Set(points.map(point=>point.world.x+':'+point.world.y)).size,points.length,'Page buildings overlap.');
  assert(map.home());assert(map.goTo('randonautica'));map.stop();assert.equal(map.getState().navigation.remainingSteps,0);map.destroy();
}
console.log(JSON.stringify({territories:territories.length,allowedConnections:nav.connections.length,forbiddenBorderSegments:forbiddenBorders,bridgeCells:nav.bridgeCells.size,roundTrips:11,projectionRoundTrips:'passed',arrivalSelection:'passed'}));
