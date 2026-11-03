import { createGlobeSurface } from './globe-surface.js';

// Orthographic globe, inspired by skykwon740/umm's composition and motion.
// The surface is the OUTSIDE terrain raster; movement stays in world.js.
export function createGlobe({ context, terrainCanvas, relief, bounds, lands, reducedMotion }) {
  const gpu = createGlobeSurface(terrainCanvas,relief);
  const TAU = Math.PI * 2;
  const mapWidth = bounds.maxX - bounds.minX;
  const mapHeight = bounds.maxY - bounds.minY;
  const midX = (bounds.minX + bounds.maxX) / 2;
  const midY = (bounds.minY + bounds.maxY) / 2;
  const scaleX = mapWidth / (TAU * .9);
  const scaleY = mapHeight / (Math.PI * .8);
  const texture = terrainCanvas.getContext('2d').getImageData(0, 0, terrainCanvas.width, terrainCanvas.height);
  const surface = document.createElement('canvas');
  const surfaceContext = surface.getContext('2d');
  let width = 800, height = 600, radius = 230, targetRadius = 230;
  let lon = -midX / scaleX, lat = midY / scaleY;
  let image, renderWidth = 0, renderHeight = 0, lastPaint = 0, lastView = '';
  const PX = 1;
  const wrap = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const view = () => ({ cl: Math.cos(lat), sl: Math.sin(lat), co: Math.cos(lon), so: Math.sin(lon) });

  function project(x, y) {
    const la = (midY - y) / scaleY, lo = (x - midX) / scaleX;
    const c = Math.cos(la), wx = c * Math.sin(lo), wy = Math.sin(la), wz = c * Math.cos(lo);
    const {cl, sl, co, so} = view();
    const sx = wx * co - wz * so, z1 = wx * so + wz * co;
    const sy = wy * cl - z1 * sl, z = wy * sl + z1 * cl;
    return { x: width / 2 + sx * radius, y: height / 2 - sy * radius, z, visible: z > .06 };
  }

  function unproject(x, y) {
    const dx = (x - width / 2) / radius, dy = (height / 2 - y) / radius;
    const r2 = dx * dx + dy * dy;
    if (r2 > 1) return null;
    const z = Math.sqrt(1 - r2), {cl, sl, co, so} = view();
    const wy = dy * cl + z * sl, z1 = -dy * sl + z * cl;
    const wx = dx * co + z1 * so, wz = -dx * so + z1 * co;
    return { x: midX + Math.atan2(wx, wz) * scaleX, y: midY - Math.asin(clamp(wy, -1, 1)) * scaleY };
  }

  function update(state) {
    width = state.width; height = state.height;
    // Whole planet stays visible on arrival, then follows movement with soft rotation.
    targetRadius = Math.min(width, height) * (state.overview ? .38 : .48 * state.zoom);
    targetRadius = clamp(targetRadius, 75, Math.max(width, height) * 1.7);
    const ease = reducedMotion ? 1 : 1 - Math.exp(-7 * (state.dt || .016));
    radius += (targetRadius - radius) * ease;
    const targetLon = (state.camera.x - midX) / scaleX;
    const targetLat = clamp((midY - state.camera.y) / scaleY, -1.35, 1.35);
    lon = wrap(lon + wrap(targetLon - lon) * ease);
    lat += (targetLat - lat) * ease;
  }

  function paintSurface(now) {
    const rw = Math.ceil(width / PX), rh = Math.ceil(height / PX);
    if (rw !== renderWidth || rh !== renderHeight) {
      renderWidth = rw; renderHeight = rh;
      surface.width = rw; surface.height = rh;
      image = surfaceContext.createImageData(rw, rh);
      lastView = '';
    }
    const signature = [lon.toFixed(4), lat.toFixed(4), radius.toFixed(1), rw, rh].join(':');
    if (signature === lastView || now - lastPaint < 30) return;
    lastPaint = now; lastView = signature;
    const out = image.data, src = texture.data;
    out.fill(0);
    const {cl, sl, co, so} = view();
    const cx = width / 2 / PX, cy = height / 2 / PX, r = radius / PX;
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(rh, Math.ceil(cy + r));
    for (let y = y0; y < y1; y++) {
      const dy = (cy - y - .5) / r;
      const span = Math.sqrt(Math.max(0, 1 - dy * dy)) * r;
      const x0 = Math.max(0, Math.floor(cx - span)), x1 = Math.min(rw, Math.ceil(cx + span));
      for (let x = x0; x < x1; x++) {
        const dx = (x + .5 - cx) / r, d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const z = Math.sqrt(1 - d2), wy = dy * cl + z * sl, z1 = -dy * sl + z * cl;
        const wx = dx * co + z1 * so, wz = -dx * so + z1 * co;
        const worldX = midX + Math.atan2(wx, wz) * scaleX;
        const worldY = midY - Math.asin(clamp(wy, -1, 1)) * scaleY;
        const tx = Math.floor(worldX - bounds.minX), ty = Math.floor(worldY - bounds.minY);
        let red = 142, green = 181, blue = 187;
        if (tx >= 0 && ty >= 0 && tx < texture.width && ty < texture.height) {
          const i = (ty * texture.width + tx) * 4;
          red = src[i]; green = src[i + 1]; blue = src[i + 2];
        }
        // High resolution Canvas fallback for devices without WebGL.
        const light = -.35 * dx + .45 * dy + .82 * z;
        const shade = light>.78?1.02:light>.48?.90:light>.15?.74:.57;
        const i = (y * rw + x) * 4;
        out[i] = red * shade; out[i + 1] = green * shade; out[i + 2] = blue * shade; out[i + 3] = 255;
      }
    }
    surfaceContext.putImageData(image, 0, 0);
  }

  const building = [
    '....##.....', '....#......', '.#########.', '.#wwwwwww#.', '.#w#w#w#w#.',
    '.#wwwwwww#.', '.#w#w#w#w#.', '.#wwwwwww#.', '.#www#www#.', '.#########.',
  ];
  const person = [
    '...OOOO...', '..OOOOOO..', '..######..', '.#wwwwww#.', '.#wBwwBw#.',
    '.#wwwwww#.', '..#wwww#..', '..#gggg#..', '..#wwww#..', '..##..##..',
  ];
  const flag = ['#ffffff', '#fffff.', '#fff...', '#fffff.', '#ffffff', '#......', '#......'];

  function sprite(rows, x, y, unit, palette, angle = 0) {
    context.save(); context.translate(Math.round(x), Math.round(y)); context.rotate(angle);
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (!palette[ch]) return;
      context.fillStyle = palette[ch];
      context.fillRect(Math.round((i - row.length / 2) * unit), Math.round((j - rows.length) * unit), unit, unit);
    }));
    context.restore();
  }

  function text(value, x, y, color, size = 11) {
    context.font = `${size}px Galmuri11, monospace`;
    context.textAlign = 'center'; context.textBaseline = 'middle';
    const w = context.measureText(value).width;
    context.fillStyle = '#16161ce8'; context.fillRect(x - w / 2 - 5, y - 9, w + 10, 19);
    context.fillStyle = color; context.fillText(value, x, y);
    return { x: x - w / 2 - 5, y: y - 9, width: w + 10, height: 19 };
  }

  function drawPath(points, color, lineWidth = 2) {
    context.strokeStyle = color; context.lineWidth = lineWidth; context.beginPath();
    let pen = false, last;
    for (const point of points) {
      const p = project(point.x, point.y);
      if (!p.visible || (last && Math.hypot(last.x - p.x, last.y - p.y) > radius / 2)) { pen = false; last = null; continue; }
      if (pen) context.lineTo(p.x, p.y); else context.moveTo(p.x, p.y);
      pen = true; last = p;
    }
    context.stroke();
  }

  function render(state) {
    update(state);
    context.fillStyle = '#16161c'; context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = false;
    if(gpu) context.drawImage(gpu.draw({...state,lon,lat,radius}),0,0,width,height);
    else {
      paintSurface(state.now);
      context.drawImage(surface, 0, 0, renderWidth, renderHeight, 0, 0, renderWidth * PX, renderHeight * PX);
    }
    const scale = radius / scaleX;
    // Only the user's actual footprints are drawn, never a prescribed exploration itinerary.
    if (state.trail.length > 1) {
      context.setLineDash([2, 5]); drawPath(state.trail, '#f6e7aa', 2); context.setLineDash([]);
    }
    const tiles = lands.flatMap(l => l.tiles).map(tile => ({tile, p:project(tile.x, tile.y)}))
      .filter(({p}) => p.visible).sort((a,b) => a.p.z - b.p.z);
    for (const {tile, p} of tiles) {
      const active = state.activeKey === tile.key, hovered = state.hoveredTile?.key === tile.key;
      const unit = scale > 1.4 ? 2 : 1;
      const angle = Math.atan2((p.x-width/2)/radius, -(p.y-height/2)/radius + .8) * .35;
      sprite(building, p.x, p.y, unit, {'#':'#203137',w:active?'#e4f0c6':hovered?'#ffffff':tile.territory.color}, angle);
      if (active) sprite(flag, p.x + 5, p.y - 10 * unit, 1, {'#':'#e8e6bd',f:'#b9dca7'});
    }
    const boxes = [];
    const labelLands = lands.map(land => ({land,p:project(land.x,land.y)}))
      .filter(({p})=>p.visible).sort((a,b)=>Number(state.activeKey?.startsWith(b.land.territory.id+':'))-Number(state.activeKey?.startsWith(a.land.territory.id+':')) || b.p.z-a.p.z);
    for (const {land,p} of labelLands) {
      if (p.z < .3) continue;
      const active = state.activeKey?.startsWith(land.territory.id + ':');
      const value = land.territory.name;
      const x = p.x, y = p.y - 30;
      context.font = '11px Galmuri11, monospace';
      const w = context.measureText(value).width + 10;
      const box = {x:x-w/2,y:y-9,width:w,height:19};
      if (x < w/2+8 || x > width-w/2-8 || y < 16 || y > height-20) continue;
      if (!active && boxes.some(b=>box.x<b.x+b.width+6 && box.x+box.width>b.x-6 && box.y<b.y+b.height+5 && box.y+box.height>b.y-5)) continue;
      boxes.push(box);
      text(value,x,y,active?'#c7e7ac':state.visited.has(land.territory.id)?'#f3e2b8':'#b7c4b5');
    }
    const p = project(state.player.x, state.player.y);
    if (p.visible) {
      const moving = state.moving;
      const bounce = moving && !reducedMotion ? Math.sin(state.now / 70) * 1.5 : 0;
      sprite(person, p.x, p.y + bounce, scale > 1.1 ? 2 : 1.5, {'O':'#cbdba5','#':'#24363b',w:'#f6edcf',B:'#1a222a',g:'#a6c1a0'});
      context.fillStyle = '#f5e5a9'; context.fillRect(p.x-2,p.y+4,4,2);
    }
    if (state.hoveredTile) {
      const pos = project(state.hoveredTile.x,state.hoveredTile.y);
      if (pos.visible) {
        let title = state.hoveredTile.item.title;
        if(title.length>35) title=title.slice(0,33)+'…';
        text(title,clamp(pos.x,140,width-140),clamp(pos.y-43,20,height-25),'#f3e2b8');
      }
    }
  }

  return {
    render, project, unproject,
    drag(dx,dy,camera) {
      camera.x -= dx / radius * scaleX;
      camera.y = clamp(camera.y - dy / radius * scaleY, midY - scaleY*1.35, midY + scaleY*1.35);
    },
    hitTile(x,y) {
      return lands.flatMap(l=>l.tiles).map(tile=>({tile,p:project(tile.x,tile.y)})).filter(({p})=>p.visible)
        .sort((a,b)=>b.p.z-a.p.z).find(({p})=>Math.abs(p.x-x)<12 && y>p.y-24 && y<p.y+7)?.tile || null;
    },
    getView: () => ({longitude:lon,latitude:lat,radius,width,height,renderer:gpu?'webgl':'canvas'}),
    destroy(){gpu?.destroy();},
  };
}
