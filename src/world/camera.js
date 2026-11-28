import {DEG,ll} from '../core/grid.js';
export let camera=Object.freeze({lat:20,lon:0,R:60,tLat:20,tLon:0,tR:60});
let initialized=false,tracking=true,lastTick=null;
let savedPresentation=null;
export function resumeTracking(walker) { tracking=true;followWalker(walker); }
const publish=patch=>{camera=Object.freeze({...camera,...patch});};
// 줌아웃 상태가 기본이다. 카메라는 스스로 확대·축소하지 않고, 휠로 바꾼 줌은 그대로 둔다.
export function resizeCamera(width,height) {
  if(!initialized){const R=Math.min(width,height)*.42;publish({R,tR:R});initialized=true;}
}
// Keep the results globe compact enough to sit beside its stats and route details.
export function setPresentationMode(active,width,height,routeSelected=false) {
  if(active) {
    if(!savedPresentation)savedPresentation={R:camera.R,tR:camera.tR};
    const compact=width<400;
    const R=Math.min(width,height)*(routeSelected?(compact ? .21 : .30):.28);
    publish({R,tR:R});
  } else if(savedPresentation) {
    publish(savedPresentation);savedPresentation=null;
  }
}
export function initializeCamera(walker) {
  tracking=true;const [lat,lon]=ll(walker);publish({lat,lon,tLat:lat,tLon:lon});
}
// 'track': 지금 추적 상태 그대로, 'lock': 그 자리에 고정(캐릭터를 따라가지 않음), 그 밖: 캐릭터 추적을 다시 켠다.
export function focusCamera(point,mode='track') {
  if(mode==='lock')tracking=false;else if(mode!=='track')tracking=true;
  publish({tLat:point.lat,tLon:point.lon});
}
export function followWalker(walker) { if(!tracking)return;const [lat,lon]=ll(walker);focusCamera({lat,lon}); }
export function rotateCamera(dx,dy) {
  tracking=false;const lon=camera.lon-dx/camera.R*DEG,lat=Math.max(-85,Math.min(85,camera.lat+dy/camera.R*DEG));
  publish({lat,lon,tLat:lat,tLon:lon});
}
export function zoomCamera(deltaY) { publish({tR:Math.max(25,Math.min(1400,camera.tR*Math.exp(-deltaY*.0015)))}); }
export function tickCamera(now=performance.now()) {
  const dt=lastTick===null?1000/60:Math.max(0,Math.min(50,now-lastTick));lastTick=now;
  const alpha=1-Math.pow(.88,dt/(1000/60));
  const dl=((camera.tLon-camera.lon+540)%360)-180;
  if(Math.abs(dl)<=.01&&Math.abs(camera.tLat-camera.lat)<=.01&&Math.abs(camera.tR-camera.R)<=.1)return false;
  publish({lon:camera.lon+dl*alpha,lat:camera.lat+(camera.tLat-camera.lat)*alpha,R:camera.R+(camera.tR-camera.R)*alpha});return true;
}
