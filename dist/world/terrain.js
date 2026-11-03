import {hash,noise} from './math.js';

/** Deterministic geography and content ownership. No input, playback or camera state. */
export function createTerrain(territories) {
  const TERRAIN = 7;
  const lands = territories.map((territory, index) => ({
    territory, index, x: Number(territory.x) || 0, y: Number(territory.y) || 0,
    seed: hash(territory.id), tiles: [], cells: [],
  }));
  const bounds = lands.length ? {
    minX: Math.floor((Math.min(...lands.map((land) => land.x)) - 310) / TERRAIN) * TERRAIN,
    maxX: Math.ceil((Math.max(...lands.map((land) => land.x)) + 310) / TERRAIN) * TERRAIN,
    minY: Math.floor((Math.min(...lands.map((land) => land.y)) - 300) / TERRAIN) * TERRAIN,
    maxY: Math.ceil((Math.max(...lands.map((land) => land.y)) + 300) / TERRAIN) * TERRAIN,
  } : { minX: -560, maxX: 560, minY: -450, maxY: 450 };
  const columns = Math.ceil((bounds.maxX - bounds.minX) / TERRAIN);
  const rows = Math.ceil((bounds.maxY - bounds.minY) / TERRAIN);
  const ownership = new Int16Array(columns * rows).fill(-1);
  const coastDepth = new Uint8Array(columns * rows).fill(99);
  const waterDepth = new Uint8Array(columns * rows).fill(99);
  const terrainCanvas = document.createElement('canvas');
  terrainCanvas.width = bounds.maxX - bounds.minX;
  terrainCanvas.height = bounds.maxY - bounds.minY;
  const terrainContext = terrainCanvas.getContext('2d');

  function atGrid(x, y) {
    const col = Math.floor((x - bounds.minX) / TERRAIN), row = Math.floor((y - bounds.minY) / TERRAIN);
    if (col < 0 || row < 0 || col >= columns || row >= rows) return -1;
    return row * columns + col;
  }
  function nearestOwner(x, y) {
    const distortedX = x + (noise(x / 150, y / 150, 5) - 0.5) * 105 + (noise(x / 45, y / 45, 8) - 0.5) * 23;
    const distortedY = y + (noise(x / 150, y / 150, 9) - 0.5) * 105 + (noise(x / 45, y / 45, 3) - 0.5) * 23;
    let owner = -1, best = Infinity;
    for (const land of lands) {
      const distance = Math.hypot((distortedX - land.x) * 0.96, distortedY - land.y);
      if (distance < best) { best = distance; owner = land.index; }
    }
    return owner;
  }

  // A union of noisy geographic fields forms a continuous continent rather than
  // one isolated icon per person. Ownership is a separate, warped Voronoi field.
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const i = row * columns + col;
      const x = bounds.minX + (col + 0.5) * TERRAIN;
      const y = bounds.minY + (row + 0.5) * TERRAIN;
      let field = -Infinity;
      for (const land of lands) {
        const rx = land.territory.radiusX || (land.territory.id === 'nature' ? 233 : 226);
        const ry = land.territory.radiusY || (land.territory.id === 'nature' ? 204 : 203);
        field = Math.max(field, 1 - Math.hypot((x - land.x) / rx, (y - land.y) / ry));
      }
      field += (noise(x / 145, y / 145, 12) - 0.5) * 0.44 + (noise(x / 43, y / 43, 24) - 0.5) * 0.13;
      if (field > 0) ownership[i] = nearestOwner(x, y);
    }
  }
  // Pixel distance fields provide a sand edge and several shallow-water bands.
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const i = row * columns + col;
      const land = ownership[i] >= 0;
      const neighbors = [[col - 1, row], [col + 1, row], [col, row - 1], [col, row + 1]];
      const edge = neighbors.some(([x, y]) => x < 0 || y < 0 || x >= columns || y >= rows || (ownership[y * columns + x] >= 0) !== land);
      if (edge) (land ? coastDepth : waterDepth)[i] = 0;
    }
  }
  for (const depthMap of [coastDepth, waterDepth]) {
    for (let pass = 0; pass < 2; pass += 1) {
      for (let i = 0; i < depthMap.length; i += 1) {
        const col = i % columns;
        if (col) depthMap[i] = Math.min(depthMap[i], depthMap[i - 1] + 1);
        if (i >= columns) depthMap[i] = Math.min(depthMap[i], depthMap[i - columns] + 1);
      }
      for (let i = depthMap.length - 1; i >= 0; i -= 1) {
        const col = i % columns;
        if (col < columns - 1) depthMap[i] = Math.min(depthMap[i], depthMap[i + 1] + 1);
        if (i + columns < depthMap.length) depthMap[i] = Math.min(depthMap[i], depthMap[i + columns] + 1);
      }
    }
  }

  for(let i=0;i<ownership.length;i++) {
    if(ownership[i]<0) continue;
    lands[ownership[i]].cells.push({
      x:bounds.minX+(i%columns+.5)*TERRAIN,
      y:bounds.minY+(Math.floor(i/columns)+.5)*TERRAIN,
      depth:coastDepth[i],i,
    });
  }

  // Each content item gets a unique landmark inside its ownership region.
  for (const land of lands) {
    const candidates = land.cells.filter((cell) => cell.depth > 1 && Math.hypot(cell.x - land.x, cell.y - land.y) < 178 && Math.hypot(cell.x - land.x, cell.y - land.y) > 34);
    candidates.sort((a, b) => hash(land.seed + ':' + a.i) - hash(land.seed + ':' + b.i));
    const chosen = [];
    const items = land.territory.items || land.territory.videos || [];
    const minimumSpacing = Math.min(58,Math.max(14,Math.sqrt(candidates.length*TERRAIN*TERRAIN/Math.max(items.length,1))*.55));
    const occupied = new Set();
    for (let index = 0; index < items.length; index += 1) {
      const cell = candidates.find(candidate=>!occupied.has(candidate.i)&&chosen.every(point=>Math.hypot(point.x-candidate.x,point.y-candidate.y)>minimumSpacing)) || candidates.find(candidate=>!occupied.has(candidate.i)) || { x: land.x + index * 27, y: land.y + 38 };
      occupied.add(cell.i);
      chosen.push(cell);
      land.tiles.push({ x: cell.x, y: cell.y, key: land.territory.id + ':' + index, index, territory: land.territory, item:items[index] });
    }
  }
  const allTiles = lands.flatMap((land) => land.tiles);


  const contentZones = new Int16Array(columns * rows).fill(-1);
  for (const land of lands) {
    for (const cell of land.cells) {
      let nearest = -1, best = Infinity;
      const x = cell.x + (noise(cell.x / 65, cell.y / 65, 27) - 0.5) * 16;
      const y = cell.y + (noise(cell.x / 65, cell.y / 65, 45) - 0.5) * 16;
      for (const tile of land.tiles) {
        const distance = Math.hypot(x - tile.x, y - tile.y);
        if (distance < best) { best = distance; nearest = tile.index; }
      }
      contentZones[cell.i] = nearest;

    }
  }
  function contentAt(point) {
    const i = atGrid(point.x, point.y);
    if (i < 0 || ownership[i] < 0 || contentZones[i] < 0) return null;
    return lands[ownership[i]]?.tiles[contentZones[i]] || null;
  }

  return {TERRAIN,lands,bounds,columns,rows,ownership,coastDepth,waterDepth,terrainCanvas,terrainContext,allTiles,contentZones,atGrid,contentAt};
}
