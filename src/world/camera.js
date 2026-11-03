import {DEG,N,ll} from '../core/grid.js';
export const walkRadius=15*2*N/Math.PI;
export let camera=Object.freeze({lat:20,lon:0,R:60,tLat:20,tLon:0,tR:60});
let overviewRadius=60,initialized=false;
const publish=patch=>{camera=Object.freeze({...camera,...patch});};
export function resizeCamera(width,height) {
  overviewRadius=Math.min(width,height)*.42;
  if(!initialized){const R=Math.min(width,height)*.36;publish({R,tR:R});initialized=true;}
}
export function initializeCamera(walker,hasNodes) {
  const [lat,lon]=ll(walker);publish({lat,lon,tLat:lat,tLon:lon,...(hasNodes?{R:walkRadius,tR:walkRadius}:{})});
}
export function focusCamera(point,mode='track') {
  publish({tLat:point.lat,tLon:point.lon,...(mode==='overview'?{tR:overviewRadius}:mode==='walk'?{tR:walkRadius}:{})});
}
export function followWalker(walker) { const [lat,lon]=ll(walker);focusCamera({lat,lon}); }
export function rotateCamera(dx,dy) {
  const lon=camera.lon-dx/camera.R*DEG,lat=Math.max(-85,Math.min(85,camera.lat+dy/camera.R*DEG));
  publish({lat,lon,tLat:lat,tLon:lon});
}
export function zoomCamera(deltaY) { publish({tR:Math.max(25,Math.min(1400,camera.tR*Math.exp(-deltaY*.0015)))}); }
export function tickCamera() {
  const dl=((camera.tLon-camera.lon+540)%360)-180;
  if(Math.abs(dl)<=.01&&Math.abs(camera.tLat-camera.lat)<=.01&&Math.abs(camera.tR-camera.R)<=.1)return false;
  publish({lon:camera.lon+dl*.12,lat:camera.lat+(camera.tLat-camera.lat)*.12,R:camera.R+(camera.tR-camera.R)*.12});return true;
}
