import assert from 'node:assert/strict';
import {createShortsPlayer} from '../dist/media/youtube.js';
const element=()=>({hidden:false,dataset:{},classList:{add(){},remove(){}},replaceChildren(){},textContent:''});
let config,instance,focusCount=0;
const calls=[];
globalThis.window={YT:{Player:class{
  constructor(mount,options){config=options;instance=this;}
  loadVideoById(id){calls.push(['load',id]);}
  playVideo(){calls.push(['play']);}
  mute(){calls.push(['mute']);}
  unMute(){calls.push(['unmute']);}
  destroy(){calls.push(['destroy']);}
}}};
globalThis.document={createElement:()=>element()};
globalThis.location={origin:'http://localhost'};
const error=element();
const playback=createShortsPlayer({host:element(),stage:element(),cover:element(),error,errorText:element(),onFocus:()=>focusCount++});
await playback.play('first',{muted:true,focus:true});
playback.setVideo('second');
await playback.play('second',{muted:true});
config.events.onReady({target:instance});
assert(calls.some(call=>call[0]==='load' && call[1]==='second'),'Newest selection was lost while iframe initialized.');
assert(calls.some(call=>call[0]==='mute'));
assert.equal(focusCount,1);
assert(playback.setMuted(false));
assert.equal(calls.at(-1)[0],'unmute');
config.events.onError({data:153,target:{getVideoData:()=>({video_id:'first'})}});
assert.equal(error.hidden,true,'A stale video error hid the newer selection.');
config.events.onError({data:153,target:{getVideoData:()=>({video_id:'second'})}});
assert.equal(error.hidden,false);
playback.destroy();
console.log('Player latest-selection race, mute and stale-error handling passed.');
