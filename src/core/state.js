import {CELL_COUNT,cellVec,hash,ll,nodeCell,vec,cellOf,legacyCellVec} from './grid.js';
import {storageKey} from './planets.js';

export const UNKNOWN=0,PLAN=1,ROAD=2,BLDG=3,ENTERED=4,GUIDE=5,GUIDE_OFF=6;
const validCell=c=>Number.isInteger(c)&&c>=0&&c<CELL_COUNT;
export const ROUTE_COLORS=['#ff9d42','#56c7e8','#d779e8','#a3d957','#f06f79','#7789f3','#e3c84d','#4dd0a4'];
export function routeColor(index) {
  if(index<ROUTE_COLORS.length)return ROUTE_COLORS[index];
  const h=(index*137.508+18)%360,s=.72,l=.62,c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(h/60%2-1)),m=l-c/2;
  const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return '#'+rgb.map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');
}
function addRootToCell(sets,cell,root) {
  if(root<0||sets[cell].includes(root))return;
  sets[cell]=[...sets[cell],root];
}
function freeze(value) {
  if(value&&typeof value==='object'&&!Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);Object.freeze(value);
  }
  return value;
}
function initialState() {
  return {
    cells:Array(CELL_COUNT).fill(UNKNOWN),guide:Array(CELL_COUNT).fill(0),cellRoots:Array(CELL_COUNT).fill(-1),cellRootSets:Array.from({length:CELL_COUNT},()=>[]),journeys:[],activeRoot:-1,
    nodes:[],trip:[],route:[],here:-1,walkPath:[],walkRoot:-1,
    dirty:true,walker:null,facing:1,lastStep:-1e9,alienJumpAt:0,
    revealing:false,pending:false,upcoming:null,holding:false,busy:false,
  };
}
// Deeply frozen live snapshots: only this module's commands can publish changes.
// Frozen plain arrays retain fast indexed reads in the pixel renderer.
export let state=freeze(initialState());
function commit(patch) { state=freeze({...state,...patch}); }

export function save(storage) {
  try {
    (storage??globalThis.localStorage).setItem(storageKey('webglobe3'),JSON.stringify({
      c:state.cells.join(''),n:state.nodes,r:state.route,t:state.trip,
      h:state.here,g:state.route.filter(c=>state.guide[c]),cr:state.cellRoots,cs:state.cellRootSets,j:state.journeys,
    }));return true;
  } catch { return false; }
}
export function load(storage) {
  try {
    const s=JSON.parse((storage??globalThis.localStorage).getItem(storageKey('webglobe3')));
    if(!s||typeof s.c!=='string'||![CELL_COUNT,3456].includes(s.c.length)||!/^[0-6]+$/.test(s.c))return false;
    const nodes=s.n??[],route=s.r??[],trip=s.t??[];
    if(!Array.isArray(nodes)||nodes.some(n=>!n||typeof n.t!=='string'||!['ko','en'].includes(n.lang)||!Number.isFinite(n.lat)||!Number.isFinite(n.lon)))return false;
    const legacy=s.c.length!==CELL_COUNT;
    const mapCell=c=>legacy?cellOf(...legacyCellVec(c)):c;
    const migratedRoute=route.map(mapCell),migratedHere=s.h??route[s.a??0]??-1;
    const here=migratedHere<0?-1:mapCell(migratedHere);
    const maxCell=legacy?3456:CELL_COUNT;
    if(!Array.isArray(route)||!route.every(c=>Number.isInteger(c)&&c>=0&&c<maxCell)||(here!==-1&&!validCell(here))||!Array.isArray(trip)||!trip.every(i=>Number.isInteger(i)&&i>=0&&i<nodes.length))return false;
    const rawVisible=s.g??route.filter(c=>+s.c[c]===PLAN);
    if(!Array.isArray(rawVisible)||!rawVisible.every(c=>Number.isInteger(c)&&c>=0&&c<maxCell))return false;
    const visible=rawVisible.map(mapCell);
    const guide=Array(CELL_COUNT).fill(0);visible.forEach(c=>{if(validCell(c))guide[c]=1;});
    const cells=Array(CELL_COUNT).fill(UNKNOWN);
    if(legacy) [...s.c].forEach((type,c)=>{const d=mapCell(c);if(+type>cells[d])cells[d]=+type;});
    else [...s.c].forEach((type,c)=>{cells[c]=+type;});
    const cellRoots=Array(CELL_COUNT).fill(-1);
    if(Array.isArray(s.cr)&&s.cr.length===CELL_COUNT)s.cr.forEach((root,c)=>{cellRoots[c]=Number.isInteger(root)?root:-1;});
    let journeys=Array.isArray(s.j)?s.j.filter(j=>j&&typeof j.start==='string'&&Array.isArray(j.trip)).map((j,i)=>({start:j.start,color:/^#[\da-f]{6}$/i.test(j.color)?j.color:routeColor(i),trip:j.trip.filter(i=>Number.isInteger(i)&&i>=0&&i<nodes.length)})):[];
    if(!journeys.length&&trip.length)journeys=[{start:nodes[trip[0]]?.t??'',color:routeColor(0),trip}];
    const cellRootSets=Array.from({length:CELL_COUNT},(_,c)=>Array.isArray(s.cs?.[c])?s.cs[c].filter(root=>Number.isInteger(root)&&root>=0&&root<journeys.length):cellRoots[c]>=0&&cellRoots[c]<journeys.length?[cellRoots[c]]:[]);
    const activeRoot=journeys.length-1;
    // 따로 시작한 여정은 섬으로 둔다. 예전에 이어 붙여 저장된 칸은 그대로 읽는다.
    state=freeze({...initialState(),nodes,route:migratedRoute,trip,here,guide,cells,cellRoots,cellRootSets,journeys,activeRoot});
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
export function beginJourney(start='') {
  if(state.busy)return false;
  const journeys=[...state.journeys,{start,color:routeColor(state.journeys.length),trip:[]}];
  commit({cells:state.cells.map(c=>c===PLAN?UNKNOWN:c),guide:Array(CELL_COUNT).fill(0),journeys,activeRoot:journeys.length-1,
    trip:[],route:[],here:-1,walkPath:[],walker:null,upcoming:null,holding:false,
    revealing:true,pending:true,busy:true,dirty:true});return true;
}
export function addJourneyNode(t,lang,d) {
  const nodes=state.nodes.slice();let index=nodes.findIndex(n=>n.t===t&&n.lang===lang);
  if(index<0) {
    const [lat,lon]=ll(cellVec(hash(t)%CELL_COUNT));index=nodes.length;nodes.push({t,lang,lat,lon});
  }
  if(d)nodes[index]={...nodes[index],d};
  const cell=nodeCell(nodes[index]),cells=state.cells.slice(),cellRoots=state.cellRoots.slice(),cellRootSets=state.cellRootSets.slice();
  if(cells[cell]!==ENTERED)cells[cell]=BLDG;
  if(cellRoots[cell]<0&&state.activeRoot>=0)cellRoots[cell]=state.activeRoot;
  addRootToCell(cellRootSets,cell,state.activeRoot);
  const route=state.route.at(-1)===cell?state.route:[...state.route,cell];
  const trip=[...state.trip,index],journeys=state.journeys.map((j,i)=>i===state.activeRoot?{...j,start:j.start||t,trip:[...j.trip,index]}:j);
  commit({nodes,cells,cellRoots,cellRootSets,route,trip,journeys,dirty:true});save();return state.nodes[index];
}
export function completeJourney() {
  const start=state.route[0];
  commit({pending:false,revealing:false,busy:false,upcoming:null,holding:false,dirty:true,
    ...(start===undefined?{}:{here:start,walker:cellVec(start),facing:1})});
  if(start!==undefined)save();return start!==undefined;
}
// 고른 가족까지 길을 이어 붙인다. 지금까지의 경로와 캐릭터 위치는 그대로 둔다.
export function beginExtension() {
  if(state.busy||state.here<0)return false;
  commit({walkPath:[],revealing:true,pending:true,busy:true,dirty:true});return true;
}
export function finishExtension() {
  commit({pending:false,revealing:false,busy:false,upcoming:null,holding:false,dirty:true});save();
}
export function updateNodeDescription(index,d) {
  if(!state.nodes[index])return;
  const nodes=state.nodes.slice();nodes[index]={...nodes[index],d};commit({nodes,dirty:true});save();
}
export function awakenCurrentNode(now=performance.now()) {
  const index=state.nodes.findIndex(n=>nodeCell(n)===state.here);if(index<0||state.nodes[index].awakened)return false;
  const nodes=state.nodes.slice();nodes[index]={...nodes[index],awakened:true};commit({nodes,alienJumpAt:now,dirty:true});save();return true;
}
export function visitCurrent() {
  if(state.cells[state.here]!==BLDG)return false;
  const cells=state.cells.slice();cells[state.here]=ENTERED;commit({cells,dirty:true});save();return true;
}
// root: 걸으면서 처음 밟는 빈 칸을 칠할 루트
export function queueWalk(path,root=state.activeRoot) { commit({walkPath:path.filter(validCell),walkRoot:root,dirty:true}); }
export function nextWalkStep() {
  const next=state.walkPath[0];
  if(next!==undefined)commit({walkPath:state.walkPath.slice(1)});return next;
}
export function jumpTo(cell) {
  if(!validCell(cell)||!state.cells[cell])return false;
  commit({here:cell,walkPath:[],dirty:true});save();return true;
}
// 빈 칸도 밟을 수 있다. 처음 밟은 빈 칸은 이번 걸음의 루트 색으로 칠하고, 이미 칠해진 칸은 그대로 둔다.
export function stepTo(cell,facing=state.facing,now=performance.now()) {
  if(!validCell(cell))return false;
  const cells=state.cells.slice(),guide=state.guide.slice(),patch={};
  const walked=c=>{guide[c]=0;if(cells[c]===PLAN)cells[c]=ROAD;};
  const a=state.route.indexOf(state.here),b=state.route.indexOf(cell);
  if(a>=0&&b>=0&&Math.abs(a-b)<=3)for(let i=Math.min(a,b);i<=Math.max(a,b);i++)walked(state.route[i]);
  walked(cell);
  if(cells[cell]===UNKNOWN) {
    cells[cell]=ROAD;const root=state.walkRoot;
    if(root>=0&&root<state.journeys.length) {
      const cellRoots=state.cellRoots.slice(),cellRootSets=state.cellRootSets.slice();
      cellRoots[cell]=root;addRootToCell(cellRootSets,cell,root);Object.assign(patch,{cellRoots,cellRootSets});
    }
  }
  commit({...patch,cells,guide,here:cell,facing,lastStep:now,dirty:true});clearTimeout(saveTimer);saveTimer=setTimeout(save,250);return true;
}
let lastAnimation=null,saveTimer;
export function flushMovementSave() { clearTimeout(saveTimer);save(); }
export function tickAnimation(now) {
  const dt=lastAnimation===null?1000/60:Math.max(0,Math.min(50,now-lastAnimation));lastAnimation=now;
  const interval=Math.max(32,110/(1+state.walkPath.length/20));
  const alpha=1-Math.pow(.65,dt/(1000/60)*110/interval);
  const patch={};let follow=null;
  if(state.alienJumpAt&&now-state.alienJumpAt<760)patch.dirty=true;
  const active=state.walker&&state.here>=0&&!state.revealing;
  if(active) {
    const target=cellVec(state.here);
    if(Math.hypot(...target.map((x,i)=>x-state.walker[i]))>1e-4) {
      const moved=state.walker.map((x,i)=>x+(target[i]-x)*alpha),m=Math.hypot(...moved);
      patch.walker=moved.map(x=>x/m);patch.dirty=true;follow=patch.walker;
    }
    if(now-state.lastStep<300)patch.dirty=true;
  }
  if(Object.keys(patch).length)commit(patch);
  return {follow,canStep:Boolean(active&&now-state.lastStep>interval)};
}
