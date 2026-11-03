import {noise} from './math.js';
import {ecosystemFor} from '../content/ecosystems.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const blend=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*clamp(t)));
const css=color=>'rgb('+color.map(v=>Math.round(clamp(v,0,255))).join(',')+')';

/** Authored pixel clusters and a limited palette. Never enlarges a blurred raster. */
export function paintEcosystemSurface(terrain,navigation) {
  const {lands,columns,rows,TERRAIN,bounds,ownership,coastDepth,waterDepth,terrainCanvas,terrainContext:ctx}=terrain;
  const count=columns*rows;
  const elevation=new Float32Array(count);
  const ridges=new Float32Array(count);
  const configs=lands.map(land=>{
    const base=ecosystemFor(land.territory.id);
    const webRegion=Boolean(land.territory.items);
    const low=webRegion?rgb(land.territory.color):rgb(base.low);
    return {...base,kind:webRegion?'meadow':base.kind,lowRGB:low,highRGB:webRegion?blend(low,[211,215,179],.3):rgb(base.high)};
  });
  const personalPatches=lands.map(land=>{
    const groups=(land.territory.profile||[]).filter(group=>group.count>0);
    let total=0;
    const count=groups.reduce((sum,group)=>sum+group.count,0);
    return groups.map(group=>{
      const start=total;total+=group.count/count;
      return {end:total,angle:(start+total)/2*Math.PI*2,color:rgb(group.color)};
    });
  });
  const groves=lands.map(land=>[
    {x:land.x-64,y:land.y-45,r:62},
    {x:land.x+66,y:land.y+59,r:56},
    {x:land.x+10,y:land.y-98,r:43},
  ]);
  for(let i=0;i<count;i++) {
    if(ownership[i]<0)continue;
    for(const j of [i%columns<columns-1?i+1:-1,i+columns<count?i+columns:-1]) {
      if(j<0||ownership[j]<0||ownership[i]===ownership[j]||navigation.allowedTransitions.has(navigation.edgeKey(ownership[i],ownership[j])))continue;
      const cx=i%columns,cy=Math.floor(i/columns);
      for(let oy=-7;oy<=7;oy++)for(let ox=-7;ox<=7;ox++) {
        const x=cx+ox,y=cy+oy;
        if(x<0||y<0||x>=columns||y>=rows)continue;
        const k=y*columns+x;
        ridges[k]=Math.max(ridges[k],Math.exp(-(ox*ox+oy*oy)/18)*.34);
      }
    }
  }
  for(let i=0;i<count;i++) {
    if(ownership[i]<0)continue;
    const x=bounds.minX+(i%columns+.5)*TERRAIN;
    const y=bounds.minY+(Math.floor(i/columns)+.5)*TERRAIN;
    const config=configs[ownership[i]];
    const broad=noise(x/145,y/145,32);
    let height=.10+broad*.24+ridges[i];
    if(config.kind==='blockland')height=.12+Math.floor(broad*5)*.055+ridges[i];
    if(config.kind==='terrarium')height=.07+broad*.10+ridges[i]*.6;
    elevation[i]=height*Math.min(1,(coastDepth[i]+1)/3);
  }
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#698e9c';ctx.fillRect(0,0,terrainCanvas.width,terrainCanvas.height);
  for(let i=0;i<count;i++) {
    const col=i%columns,row=Math.floor(i/columns);
    const px=col*TERRAIN,py=row*TERRAIN;
    const x=bounds.minX+px+TERRAIN/2,y=bounds.minY+py+TERRAIN/2;
    const owner=ownership[i];
    if(owner<0) {
      const depth=waterDepth[i];
      ctx.fillStyle=depth===0?'#b5c8b6':depth===1?'#91b7b6':depth<4?'#7da9b1':'#698e9c';
      ctx.fillRect(px,py,TERRAIN,TERRAIN);
      // A few deliberate long water glints, rather than per-pixel noise.
      if(depth>5 && col%29===0 && row%23===0) {
        ctx.fillStyle='#80a5af';ctx.fillRect(px+1,py+2,TERRAIN*2,1);
      }
      continue;
    }
    const config=configs[owner],land=lands[owner],h=elevation[i];
    const broad=noise(x/145,y/145,32);
    const band=Math.floor(broad*4)/3;
    let color=blend(config.lowRGB,config.highRGB,band*.5);
    if(personalPatches[owner].length) {
      const angle=((Math.atan2(y-land.y,x-land.x)/(Math.PI*2))+1)%1;
      const patch=personalPatches[owner].find(patch=>angle<patch.end)||personalPatches[owner].at(-1);
      color=blend(patch.color,[204,214,169],band*.25);
    }
    const left=col>0?elevation[i-1]:h,up=row>0?elevation[i-columns]:h;
    const slope=(h-left)*2+(h-up)*2;
    if(slope>.035)color=blend(color,[232,226,190],.2);
    else if(slope<-.035)color=blend(color,[62,83,66],.22);
    if(h>.40)color=blend([121,133,115],[179,180,151],Math.floor(clamp((h-.4)*4)*3)/3);
    if(coastDepth[i]===0)color=[216,202,157];
    else if(coastDepth[i]===1)color=blend(color,[216,202,157],.28);
    ctx.fillStyle=css(color);ctx.fillRect(px,py,TERRAIN,TERRAIN);
    if(config.kind==='blockland' && h-left>.025 && ownership[i-1]===owner) {
      ctx.fillStyle='#76694d';ctx.fillRect(px,py,2,TERRAIN);
      ctx.fillStyle='#c5d0a1';ctx.fillRect(px+2,py,TERRAIN-2,1);
    }
    if((config.kind==='woodland'||config.kind==='terrarium') && coastDepth[i]>2) {
      const dist=Math.min(...groves[owner].map(g=>Math.hypot((x-g.x)/g.r,(y-g.y)/g.r)));
      const edge=1+(noise(x/37,y/37,19)-.5)*.22;
      if(dist<edge) {
        const canopy=config.kind==='woodland';
        ctx.fillStyle=dist>.83?(canopy?'#52765c':'#668569'):dist>.48?(canopy?'#6f936e':'#88a17a'):(canopy?'#8eaa7c':'#a6b98b');
        ctx.fillRect(px,py,TERRAIN,TERRAIN);
      }
      if(config.kind==='terrarium' && Math.hypot(x-land.x-56,y-land.y+22)<25 && (col+row)%3!==0) {
        ctx.fillStyle='#788a79';ctx.fillRect(px,py+2,TERRAIN,TERRAIN-2);
        ctx.fillStyle='#c0c3a6';ctx.fillRect(px,py,TERRAIN-1,TERRAIN-2);
      }
    }
    if(coastDepth[i]>2 && ridges[i]<.06 && noise(col*7,row*7,81)>.994) {
      ctx.fillStyle=css(blend(color,[70,102,64],.3));
      ctx.fillRect(px+2,py+2,1,3);ctx.fillRect(px+3,py+3,2,1);
    }
  }
  terrain.relief={elevation,columns,rows};
  terrain.ecosystems=configs;
}
