import {createWorld} from './world/world.js';
import {buildPersonaWorld,makePage} from './content/persona-world.js';
import {safeURL} from './content/history.js';
import {apiRequest,checkedOpen} from './content/safe-open.js';
import {createShortsPlayer} from './media/youtube.js';
import {createWebPreview} from './ui/web-preview.js';
import {renderWebCollection} from './ui/web-collection.js';
import {renderPersonas} from './ui/personas.js';
import {createExpeditionUI} from './ui/expedition.js';
import {showSharedPage} from './ui/shared-page.js';

const $=id=>document.getElementById(id),KEY='outside-persona-world-v1';
let state;try{state=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{state={};}
state={activeId:state?.activeId||'yunseo',added:Array.isArray(state?.added)?state.added:[],saved:Array.isArray(state?.saved)?state.saved:[],blocked:Array.isArray(state?.blocked)?state.blocked:[]};
let personas=[],world,model,selected,expedition,siteKeys=new Map(),muted=true,toastTimer;
function notice(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),5000);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{notice('저장 공간이 부족합니다.');}}
const isBlocked=url=>{try{const host=new URL(url).hostname;return state.blocked.some(domain=>host===domain||host.endsWith('.'+domain));}catch{return true;}};
const preview=createWebPreview({root:$('sitePreview'),onChoosePage:url=>checkedOpen(url,notice),onShowShared:page=>showSharedPage($('sharedPageDialog'),page,id=>{if(expedition.hasActive()){notice('탐방을 마치거나 취소한 후 이동하세요.');return;}travel(id);})});
const playback=createShortsPlayer({host:$('playerHost'),stage:$('videoStage'),cover:$('playVideo'),error:$('playerError'),errorText:$('playerErrorText'),onFocus:()=>$('worldCanvas').focus({preventScroll:true})});
function updateSaved(){const saved=Boolean(selected&&state.saved.some(page=>page.url===selected.url));$('saveButton').classList.toggle('is-saved',saved);$('saveButton').setAttribute('aria-pressed',String(saved));}
async function playVideo(){
  if(!selected?.youtubeId)return;const page=selected;
  try{await apiRequest('/api/check-page',{url:page.url});if(selected?.id===page.id)playback.play(page.youtubeId,{muted,focus:true});}catch(error){notice(error.message);}
}
function selectSite(selection){
  const page=selection.item;if(!page)return;selected=page;
  const video=Boolean(page.youtubeId);$('sitePreview').hidden=video;$('videoStage').hidden=!video;$('videoTitle').hidden=!video;$('soundButton').hidden=!video;
  $('siteDomain').textContent=page.domain;$('sourceLink').href=page.url;playback.destroy();
  if(video){$('videoTitle').textContent=page.title;$('errorYouTubeLink').href=page.url;$('playerError').hidden=true;$('videoThumb').src='https://i.ytimg.com/vi/'+page.youtubeId+'/hqdefault.jpg';$('videoThumb').alt=page.title;$('playVideo').hidden=false;playback.setVideo(page.youtubeId);}
  else preview.show(page);
  world?.setActiveTile(selection.key);updateSaved();
}
function rebuild(preferredId=selected?.id,preserve=false){
  const old=preserve?world?.getState():null;world?.destroy();
  model=buildPersonaWorld(personas,state.activeId,state.added.filter(page=>!isBlocked(page.url)));
  for(const land of model.territories)land.items=land.items.filter(page=>!isBlocked(page.url));
  siteKeys=new Map();for(const territory of model.territories)territory.items.forEach((item,index)=>siteKeys.set(item.id,{territory,item,index,key:territory.id+':'+index}));
  world=createWorld($('worldCanvas'),{territories:model.territories,allowedEdges:model.edges,freeRoam:true,initialPosition:old?.player,initialZoom:old?.zoom,onSelect:selectSite});
  const first=siteKeys.get(preferredId)||siteKeys.values().next().value;if(first)selectSite({...first,source:'initial'});
  $('personaButton').textContent=model.active.name;$('mapLoading').hidden=true;
  window.outsidePrototype={getState:()=>({map:world.getState(),personaId:state.activeId,recordCount:model.active.events.length,siteCount:siteKeys.size,selected:selected?.id,activeExpedition:expedition?.hasActive()}),getLandmarks:()=>world.getLandmarks()};
}
function addDestination(target){
  const page=makePage(target,'outside');state.added=state.added.filter(row=>row.url!==target.url);state.added.push(target);persist();rebuild(page.id,true);
  return siteKeys.get(page.id)?.key;
}
function travel(id){const page=siteKeys.get(id);if(!page||!world.goToTile(page.key)){notice('이동할 수 없습니다.');return;}$('searchResults').hidden=true;}
function showSearch(){
  const query=$('searchInput').value.trim(),root=$('searchResults');root.replaceChildren();root.hidden=!query;if(!query)return;
  const lower=query.toLowerCase();
  const matches=new Map();
  for(const row of siteKeys.values())if(!matches.has(row.item.url)&&[row.item.title,row.item.domain,row.item.context,...row.item.queries].join(' ').toLowerCase().includes(lower))matches.set(row.item.url,row);
  for(const {item,territory} of [...matches.values()].slice(0,10)){
    const button=document.createElement('button'),title=document.createElement('strong'),meta=document.createElement('span');title.textContent=item.title;meta.textContent=(item.sharedPage?.owners.length>1?item.sharedPage.owners.length+'명의 기록':territory.name)+' · '+item.domain;button.append(title,meta);button.addEventListener('click',()=>travel(item.id));root.append(button);
  }
  const url=safeURL(query)||(/^[\w.-]+\.[a-z]{2,}([/:]|$)/i.test(query)?safeURL('https://'+query):null);
  if(url){const add=document.createElement('button');add.textContent='검사 후 이 페이지 추가';add.addEventListener('click',async()=>{add.disabled=true;try{const target=await apiRequest('/api/check-page',{url});const key=addDestination(target);world.goToTile(key);root.hidden=true;}catch(error){notice(error.message);add.disabled=false;}});root.append(add);}
}
function drawCollection(){renderWebCollection($('collectionList'),{sites:state.saved.filter(page=>!isBlocked(page.url)),onTravel(id){$('collectionDialog').close();const saved=state.saved.find(page=>page.id===id);const found=[...siteKeys.values()].find(({item})=>item.url===saved?.url);if(found)travel(found.item.id);else if(saved)checkedOpen(saved.url,notice);},onRemove(id){state.saved=state.saved.filter(page=>page.id!==id);persist();updateSaved();drawCollection();}});}
function showPersonas(){renderPersonas($('personaList'),personas,state.activeId,id=>{if(expedition.hasActive()){notice('진행 중인 탐방을 마치거나 취소해주세요.');return;}state.activeId=id;persist();$('personaDialog').close();rebuild(null);});$('personaDialog').showModal();}
async function init(){
  try{
    const response=await fetch('./data/personas.json');if(!response.ok)throw new Error('인물 기록을 불러오지 못했습니다.');const data=await response.json();personas=Array.isArray(data)?data:data.personas;
    if(!personas.some(persona=>persona.id===state.activeId))state.activeId=personas[0].id;
    rebuild();expedition=createExpeditionUI({getWorld:()=>world,getPersona:()=>model.active,addDestination,notice});
    $('homeButton').addEventListener('click',()=>world.home());$('personaButton').addEventListener('click',showPersonas);
    $('saveButton').addEventListener('click',()=>{if(!selected)return;state.saved=state.saved.some(page=>page.url===selected.url)?state.saved.filter(page=>page.url!==selected.url):[...state.saved,selected];persist();updateSaved();});
    $('collectionButton').addEventListener('click',()=>{drawCollection();$('collectionDialog').showModal();});
    for(const id of ['sourceLink','errorYouTubeLink'])$(id).addEventListener('click',event=>{event.preventDefault();if(selected)checkedOpen(selected.url,notice);});
    $('reportButton').addEventListener('click',async()=>{if(!selected)return;try{const result=await apiRequest('/api/report',{url:selected.url});state.blocked.push(result.domain);persist();rebuild(null,true);notice('이 도메인을 탐방과 영토에서 제외했습니다.');}catch(error){notice(error.message);}});
    $('playVideo').addEventListener('click',playVideo);$('soundButton').addEventListener('click',()=>{muted=!muted;$('soundButton').setAttribute('aria-pressed',String(!muted));playback.setMuted(muted);});
    $('searchInput').addEventListener('input',showSearch);$('searchForm').addEventListener('submit',event=>{event.preventDefault();showSearch();});
    document.addEventListener('pointerdown',event=>{if(!event.target.closest('.world-search'))$('searchResults').hidden=true;});
    document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  }catch(error){$('mapLoading').textContent=error.message;console.error(error);}
}
init();
