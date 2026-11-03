import {FACE,cellVec,hash,ll,nodeCell,vec} from './grid.js';

export const UNKNOWN=0,PLAN=1,ROAD=2,BLDG=3,ENTERED=4,GUIDE=5,GUIDE_OFF=6;
const CELL_COUNT=6*FACE;
const validCell=c=>Number.isInteger(c)&&c>=0&&c<CELL_COUNT;
function freeze(value) {
  if(value&&typeof value==='object'&&!Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);Object.freeze(value);
  }
  return value;
}
function initialState() {
  return {
    cells:Array(CELL_COUNT).fill(UNKNOWN),guide:Array(CELL_COUNT).fill(0),
    nodes:[],trip:[],route:[],here:-1,walkPath:[],
    dirty:true,walker:null,facing:1,lastStep:-1e9,blinkOn:true,
    revealing:false,pending:false,upcoming:null,holding:false,busy:false,
  };
}
// Deeply frozen live snapshots: only this module's commands can publish changes.
// Frozen plain arrays retain fast indexed reads in the pixel renderer.
export let state=freeze(initialState());
function commit(patch) { state=freeze({...state,...patch}); }

export function save(storage) {
  try {
    (storage??globalThis.localStorage).setItem('webglobe3',JSON.stringify({
      c:state.cells.join(''),n:state.nodes,r:state.route,t:state.trip,
      h:state.here,g:state.route.filter(c=>state.guide[c]),
    }));return true;
  } catch { return false; }
}
export function load(storage) {
  try {
    const s=JSON.parse((storage??globalThis.localStorage).getItem('webglobe3'));
    if(!s||typeof s.c!=='string'||s.c.length!==CELL_COUNT||!/^[0-6]+$/.test(s.c))return false;
    const nodes=s.n??[],route=s.r??[],trip=s.t??[];
    if(!Array.isArray(nodes)||nodes.some(n=>!n||typeof n.t!=='string'||!['ko','en'].includes(n.lang)||!Number.isFinite(n.lat)||!Number.isFinite(n.lon)))return false;
    if(!Array.isArray(route)||!route.every(validCell)||!Array.isArray(trip)||!trip.every(i=>Number.isInteger(i)&&i>=0&&i<nodes.length))return false;
    const here=s.h??route[s.a??0]??-1,visible=s.g??route.filter(c=>+s.c[c]===PLAN);
    if((here!==-1&&!validCell(here))||!Array.isArray(visible)||!visible.every(validCell))return false;
    const guide=Array(CELL_COUNT).fill(0);visible.forEach(c=>{guide[c]=1;});
    state=freeze({...initialState(),nodes,route,trip,here,guide,
      cells:[...s.c].map(type=>+type===PLAN&&!route.length?UNKNOWN:+type)});
    return true;
  } catch { return false; }
}
export function requestRedraw() { if(!state.dirty)commit({dirty:true}); }
export function consumeRedraw() {
  if(!state.dirty)return false;commit({dirty:false});return true;
}
export function initializeWalker() {
  const last=state.nodes.at(-1),here=state.here<0&&last?nodeCell(last):state.here;
  commit({here,walker:here>=0?cellVec(here):vec(20,0),dirty:true});
}
export function beginJourney() {
  if(state.busy)return false;
  commit({cells:state.cells.map(c=>c===PLAN?UNKNOWN:c),guide:Array(CELL_COUNT).fill(0),
    trip:[],route:[],here:-1,walkPath:[],walker:null,upcoming:null,holding:false,
    revealing:true,pending:true,busy:true,dirty:true});return true;
}
export function addJourneyNode(t,lang,d) {
  const nodes=state.nodes.slice();let index=nodes.findIndex(n=>n.t===t&&n.lang===lang);
  if(index<0) {
    const [lat,lon]=ll(cellVec(hash(t)%CELL_COUNT));index=nodes.length;nodes.push({t,lang,lat,lon});
  }
  if(d)nodes[index]={...nodes[index],d};
  const cell=nodeCell(nodes[index]),cells=state.cells.slice();
  if(cells[cell]!==ENTERED)cells[cell]=BLDG;
  const route=state.route.at(-1)===cell?state.route:[...state.route,cell];
  commit({nodes,cells,route,trip:[...state.trip,index],dirty:true});save();return state.nodes[index];
}
export function previewJourneyNode(t,d) { commit({upcoming:{t,d},dirty:true}); }
export function clearJourneyPreview() { commit({upcoming:null,dirty:true}); }
export function revealRoute(cellIds) {
  const cells=state.cells.slice(),guide=state.guide.slice(),route=state.route.slice();
  for(const cell of cellIds)if(validCell(cell)&&route.at(-1)!==cell) {
    route.push(cell);guide[cell]=1;if(!cells[cell])cells[cell]=PLAN;
  }
  commit({cells,guide,route,dirty:true});
}
export function holdJourney() { commit({holding:true,dirty:true}); }
export function completeJourney() {
  const start=state.route[0];
  commit({pending:false,revealing:false,busy:false,upcoming:null,holding:false,dirty:true,
    ...(start===undefined?{}:{here:start,walker:cellVec(start),facing:1})});
  if(start!==undefined)save();return start!==undefined;
}
export function updateNodeDescription(index,d) {
  if(!state.nodes[index])return;
  const nodes=state.nodes.slice();nodes[index]={...nodes[index],d};commit({nodes,dirty:true});save();
}
export function visitCurrent() {
  if(state.cells[state.here]!==BLDG)return false;
  const cells=state.cells.slice();cells[state.here]=ENTERED;commit({cells,dirty:true});save();return true;
}
export function queueWalk(path) { commit({walkPath:path.filter(validCell)}); }
export function nextWalkStep() {
  const next=state.walkPath[0];
  if(next!==undefined)commit({walkPath:state.walkPath.slice(1)});return next;
}
export function jumpTo(cell) {
  if(!validCell(cell)||!state.cells[cell])return false;
  commit({here:cell,walkPath:[],dirty:true});save();return true;
}
export function stepTo(cell,facing=state.facing,now=performance.now()) {
  if(!validCell(cell)||!state.cells[cell])return false;
  const cells=state.cells.slice(),guide=state.guide.slice();
  const walked=c=>{guide[c]=0;if(cells[c]===PLAN)cells[c]=ROAD;};
  const a=state.route.indexOf(state.here),b=state.route.indexOf(cell);
  if(a>=0&&b>=0&&Math.abs(a-b)<=3)for(let i=Math.min(a,b);i<=Math.max(a,b);i++)walked(state.route[i]);
  walked(cell);commit({cells,guide,here:cell,facing,lastStep:now,dirty:true});save();return true;
}
export function tickAnimation(now) {
  const blinkOn=Math.floor(now/450)%2===0,patch={};let follow=null;
  if(blinkOn!==state.blinkOn){patch.blinkOn=blinkOn;if(state.route.length)patch.dirty=true;}
  const active=state.walker&&state.here>=0&&!state.revealing;
  if(active) {
    const target=cellVec(state.here);
    if(Math.hypot(...target.map((x,i)=>x-state.walker[i]))>1e-4) {
      const moved=state.walker.map((x,i)=>x+(target[i]-x)*.35),m=Math.hypot(...moved);
      patch.walker=moved.map(x=>x/m);patch.dirty=true;follow=patch.walker;
    }
    if(now-state.lastStep<300)patch.dirty=true;
  }
  if(Object.keys(patch).length)commit(patch);
  return {follow,canStep:Boolean(active&&now-state.lastStep>110)};
}
