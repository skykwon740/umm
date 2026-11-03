/** Paint rivers and footbridges on the same cells used by navigation. */
export function paintTerrainDetails(terrain,navigation) {
  const {TERRAIN,bounds,columns,rows,ownership,terrainContext:ctx}=terrain;
  const {allowedTransitions,edgeKey,bridgeCells}=navigation;
  ctx.save();
  ctx.lineCap='round';
  for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
    const i=row*columns+col;
    if(ownership[i]<0) continue;
    for(const [j,vertical] of [[col+1<columns?i+1:-1,true],[row+1<rows?i+columns:-1,false]]) {
      if(j<0 || ownership[j]<0 || ownership[i]===ownership[j] || allowedTransitions.has(edgeKey(ownership[i],ownership[j]))) continue;
      const x=col*TERRAIN+(vertical?TERRAIN:TERRAIN/2);
      const y=row*TERRAIN+(vertical?TERRAIN/2:TERRAIN);
      if(bounds.minY+y<=110) continue; // Northern barriers are relief ridges, southern barriers are rivers.
      ctx.beginPath();
      ctx.moveTo(x-(vertical?0:TERRAIN/2),y-(vertical?TERRAIN/2:0));
      ctx.lineTo(x+(vertical?0:TERRAIN/2),y+(vertical?TERRAIN/2:0));
      ctx.strokeStyle='#aec3a4';ctx.lineWidth=7;ctx.stroke();
      ctx.strokeStyle='#57979e';ctx.lineWidth=4;ctx.stroke();
      ctx.strokeStyle='#91bec0';ctx.lineWidth=1;ctx.stroke();
    }
  }
  for(const i of bridgeCells) {
    const x=i%columns*TERRAIN,y=Math.floor(i/columns)*TERRAIN;
    ctx.fillStyle='#8d8161';ctx.fillRect(x,y,TERRAIN,TERRAIN);
    ctx.fillStyle='#c2b08a';ctx.fillRect(x+1,y+1,TERRAIN-2,TERRAIN-2);
  }
  ctx.restore();
}
