import { createGlobe } from './globe.js';
import { createTerrain } from './terrain.js';
import { createNavigation } from './navigation.js';
import { paintTerrainDetails } from './terrain-paint.js';
import { paintEcosystemSurface } from './ecosystem-surface.js';
/** A dependency-free, retina canvas world. Each marked tile is one content item. */
export function createWorld(canvas, options = {}) {
  const { territories = [], initialVisited = [], onSelect, onVisit, onMove } = options;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable.');

  const CELL = 22;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const homeTerritory = territories.find((item) => Number(item.distance) === 0) || territories[0];
  const origin = { x: Number(homeTerritory?.x) || 0, y: Number(homeTerritory?.y) || 0 };
  const player = { ...(options.initialPosition||origin) };
  const camera = { ...player };
  const validTerritoryIds = new Set(territories.map((territory) => territory.id));
  const visited = new Set([
    ...(homeTerritory ? [homeTerritory.id] : []),
    ...(Array.isArray(initialVisited) ? initialVisited.filter((id) => validTerritoryIds.has(id)) : []),
  ]);
  const keys = new Set();
  let activeKey = null;
  let hoveredTile = null;
  let target = null;
  let overview = false;
  let following = true;
  let zoom = Number(options.initialZoom)||0.95;
  let width = 800;
  let height = 600;
  let dpr = 1;
  let lastTime = 0;
  let lastNotice = 0;
  let frameId;
  let destroyed = false;
  let pointer = null;
  let pointerWorld = null;
  let trail = [{ ...player }];

  const terrain=createTerrain(territories);
  const navigation=createNavigation(terrain,options,origin);
  paintEcosystemSurface(terrain,navigation);
  paintTerrainDetails(terrain,navigation);
  const {lands,bounds,ownership,terrainCanvas,allTiles,atGrid,contentAt}=terrain;
  const {navOwner,bridgeCells,canTransition,canStep,gridCenter,pathfind,semanticEdges,connections}=navigation;
  let route=[];
  let lastBarrierNotice=-Infinity;
  let blockedCount=0;
  let blockedReason=null;
  let movementZoneKey = contentAt(player)?.key || null;
  let pendingZoneKey = null;
  let pendingZoneSince = 0;
  let hasMoved = false;


  function emitBarrier(from, to, force = false) {
    const now = performance.now();
    if (!force && now - lastBarrierNotice < 1300) return;
    lastBarrierNotice = now;
    blockedCount += 1;
    const fromIndex = atGrid(from.x, from.y), toIndex = atGrid(to.x, to.y);
    const water = toIndex < 0 || navOwner[toIndex] < 0;
    const message = water ? '바다는 다리가 있는 곳에서 건널 수 있어요.' : '서로 먼 관심사 사이의 산맥과 강은 건널 수 없어요. 연결된 길로 돌아가세요.';
    blockedReason = water ? 'water' : 'mountain';
    const event = { from: fromIndex >= 0 && ownership[fromIndex] >= 0 ? lands[ownership[fromIndex]].territory.id : null, to: toIndex >= 0 && ownership[toIndex] >= 0 ? lands[ownership[toIndex]].territory.id : null, reason: blockedReason, message };
    options.onBarrier?.(event);
    options.onBlocked?.(event);
  }
  function routeTo(point) {
    const start = atGrid(player.x, player.y), end = atGrid(point.x, point.y);
    if (end < 0 || navOwner[end] < 0) { emitBarrier(player, point, true); return false; }
    const path = pathfind(start, end, canTransition);
    if (!path) { emitBarrier(player, point, true); return false; }
    route = path.map(gridCenter);
    route.push({ ...point });
    target = { ...point };
    following = true; overview = false;
    blockedReason = null;
    return true;
  }

  const globe = createGlobe({context,terrainCanvas,relief:terrain.relief,bounds,lands,reducedMotion});
  if(canvas.dataset) canvas.dataset.renderer=globe.getView().renderer;
  function screenToWorld(x,y) { return globe.unproject(x,y); }
  function worldToScreen(x,y) { return globe.project(x,y); }
  function fitOverview() { zoom = .9; }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1,rect.width || 800); height = Math.max(1,rect.height || 600);
    dpr = Math.min(window.devicePixelRatio || 1,2);
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    if (!lastTime&&!options.initialZoom) zoom = .9;
    if (overview) fitOverview();
  }
  function tileAt(point) {
    if(!point) return null;
    return allTiles.find(tile=>Math.abs(point.x-tile.x)<=CELL/2+3/zoom && Math.abs(point.y-tile.y)<=CELL/2+3/zoom) || null;
  }
  function landAt(point) {
    if(!point) return null;
    const index=atGrid(point.x,point.y);
    return index>=0 && ownership[index]>=0 ? lands[ownership[index]] : null;
  }

  function selectTile(tile, travel = true, source = 'click') {
    if (!tile) return false;
    if (travel) {
      const current = contentAt(player);
      if (current?.key !== tile.key) {
        const accepted = routeTo({ x: tile.x, y: tile.y });
        if (accepted) zoom = Math.max(zoom, clamp(width / 790, 0.65, 1.05));
        return accepted;
      }
      movementZoneKey = tile.key;
      pendingZoneKey = null;
    }
    activeKey = tile.key;
    onSelect?.({ territory: tile.territory, item:tile.item, index: tile.index, key: tile.key, source });
    return true;
  }

  function notifyVisit() {
    const current = landAt(player);
    if (current && !visited.has(current.territory.id)) {
      visited.add(current.territory.id);
      onVisit?.(current.territory);
    }
    return current;
  }

  function tick(now) {
    if (destroyed) return;
    const dt = Math.min((now - (lastTime || now)) / 1000, 0.05);
    lastTime = now;
    if (document.querySelector('dialog[open]')) keys.clear();
    const previousPosition = { ...player };
    let dx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    let dy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);

    if (dx || dy) {
      const length = Math.hypot(dx, dy);
      const proposedX = { x: player.x + dx / length * 210 * dt, y: player.y };
      const proposedY = { x: player.x, y: player.y + dy / length * 210 * dt };
      if (dx && canStep(player, proposedX)) player.x = proposedX.x;
      else if (dx) emitBarrier(player, proposedX);
      proposedY.x = player.x;
      if (dy && canStep(player, proposedY)) player.y = proposedY.y;
      else if (dy) emitBarrier(player, proposedY);
      target = null;
      route = [];
      following = true;
      if (overview) { overview = false; zoom = clamp(width / 790, 0.65, 1.05); }
    } else if (target && route.length) {
      const waypoint = route[0];
      dx = waypoint.x - player.x;
      dy = waypoint.y - player.y;
      const distance = Math.hypot(dx, dy);
      const step = 330 * dt;
      const next = distance < Math.max(1, step) ? { ...waypoint } : { x: player.x + dx / distance * step, y: player.y + dy / distance * step };
      if (canStep(player, next)) {
        player.x = next.x; player.y = next.y;
        if (distance < Math.max(1, step)) route.shift();
        if (!route.length) target = null;
      } else {
        emitBarrier(player, next);
        route = []; target = null;
      }
    }
    player.x = clamp(player.x, bounds.minX, bounds.maxX);
    player.y = clamp(player.y, bounds.minY, bounds.maxY);
    if (Math.hypot(player.x - trail[trail.length - 1].x, player.y - trail[trail.length - 1].y) > 12) {
      trail.push({ ...player });
      if (trail.length > 850) trail.shift();
    }
    if (following && !overview) {
      const ease = reducedMotion ? 1 : 1 - Math.exp(-5 * dt);
      camera.x += (player.x - camera.x) * ease;
      camera.y += (player.y - camera.y) * ease;
    }

    if (!hasMoved && Math.hypot(player.x - previousPosition.x, player.y - previousPosition.y) > 0.1) { hasMoved = true; movementZoneKey = null; }
    if (hasMoved) {
      const zone = contentAt(player);
      if (zone && zone.key !== movementZoneKey) {
        if (pendingZoneKey !== zone.key) { pendingZoneKey = zone.key; pendingZoneSince = now; }
        else if (now - pendingZoneSince >= 180) {
          movementZoneKey = zone.key;
          pendingZoneKey = null;
          selectTile(zone, false, 'movement');
        }
      } else pendingZoneKey = null;
    }
    const current = notifyVisit();
    if (now - lastNotice > 160) {
      lastNotice = now;
      onMove?.({ x: player.x, y: player.y, distance: Math.hypot(player.x - origin.x, player.y - origin.y), territoryId: current?.territory.id || null });
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    globe.render({width,height,dpr,zoom,overview,camera,player,activeKey,visited,trail,hoveredTile,now,dt,moving:Boolean(target || keys.size)});
    frameId = requestAnimationFrame(tick);
  }

  function localPointer(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function pointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    canvas.focus({ preventScroll: true });
    const point = localPointer(event);
    pointer = { id: event.pointerId, startX: point.x, startY: point.y, lastX: point.x, lastY: point.y, dragging: false };
    canvas.setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event) {
    const point = localPointer(event);
    pointerWorld = screenToWorld(point.x, point.y);
    if (pointer && pointer.id === event.pointerId) {
      if (Math.hypot(point.x - pointer.startX, point.y - pointer.startY) > 5) pointer.dragging = true;
      if (pointer.dragging) {
        globe.drag(point.x-pointer.lastX,point.y-pointer.lastY,camera);
        following = false;
      }
      pointer.lastX = point.x;
      pointer.lastY = point.y;
    }
    hoveredTile = globe.hitTile(point.x,point.y) || tileAt(pointerWorld);
    canvas.style.cursor = pointer?.dragging ? 'grabbing' : hoveredTile ? 'pointer' : 'grab';
  }

  function pointerUp(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const wasDragging = pointer.dragging;
    pointer = null;
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (wasDragging) return;
    const pos = localPointer(event);
    const point = screenToWorld(pos.x, pos.y);
    if (!point) return;
    const tile = globe.hitTile(pos.x,pos.y) || tileAt(point);
    if (tile) selectTile(tile);
    else {
      if (routeTo({ x: clamp(point.x, bounds.minX, bounds.maxX), y: clamp(point.y, bounds.minY, bounds.maxY) })) zoom = Math.max(zoom, 0.6);
    }
  }

  function pointerLeave() {
    if (!pointer) { hoveredTile = null; pointerWorld = null; }
  }

  function pointerCancel(event) {
    if (pointer?.id === event.pointerId) pointer = null;
  }

  function wheel(event) {
    event.preventDefault();
    zoom = clamp(zoom * Math.exp(-event.deltaY * .0013), .35, 3.2);
    overview = false;
  }

  function keyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (document.querySelector('dialog[open]')) { keys.clear(); return; }
    if (event.target?.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
    const key = event.key.toLowerCase();
    if (!['w', 'a', 's', 'd', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) return;
    event.preventDefault();
    keys.add(key);
  }

  function keyUp(event) { keys.delete(event.key.toLowerCase()); }
  function blur() { keys.clear(); pointer = null; }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  canvas.tabIndex = canvas.tabIndex < 0 ? 0 : canvas.tabIndex;
  if (!canvas.getAttribute('aria-label')) canvas.setAttribute('aria-label', '관심사 영토 지도. 방향키 또는 WASD로 이동하고, 영상 타일을 선택해 탐험하세요.');
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('pointerleave', pointerLeave);
  canvas.addEventListener('wheel', wheel, { passive: false });
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', blur);
  resize();
  frameId = requestAnimationFrame(tick);

  return {
    stop() { route=[];target=null; },
    goTo(id) {
      const land = lands.find((item) => item.territory.id === id);
      if (!land) return false;
      return land.tiles.length ? selectTile(land.tiles[0], true, 'travel') : routeTo({x:land.x,y:land.y});
    },
    goToTile(key) {
      const tile = allTiles.find((item) => item.key === key);
      return tile ? selectTile(tile, true, 'travel') : false;
    },
    setOverview(value = true) {
      overview = Boolean(value);
      following = !overview;
      if (overview) fitOverview();
      else zoom = clamp(width / 790, 0.65, 1.05);
    },
    zoomBy(factor) {
      if (!Number.isFinite(factor) || factor <= 0) return;
      zoom = clamp(zoom * factor, .35, 3.2);
      overview = false;
    },
    home() {
      const accepted = routeTo(origin);
      if (accepted) zoom = clamp(width / 790, 0.65, 1.05);
      return accepted;
    },
    setActiveTile(contentKey) {
      const tile = allTiles.find((item) => item.key === contentKey || item.item?.id === contentKey);
      if (tile) activeKey = tile.key;
      return Boolean(tile);
    },
    projectPoint(point) { return worldToScreen(point.x,point.y); },
    unprojectPoint(point) { return screenToWorld(point.x,point.y); },
    getLandmarks() { return allTiles.map(tile=>({key:tile.key,contentId:tile.item.id,world:{x:tile.x,y:tile.y},screen:worldToScreen(tile.x,tile.y)})); },
    getState() {
      return { projection: 'globe', view:globe.getView(), visited: [...visited], player: { ...player }, zoom, overview, activeKey, navigation: { remainingSteps: route.length, blockedReason, blockedCount, bridges: bridgeCells.size, allowedEdges: semanticEdges, unreachableEdges: connections.filter((edge) => !edge.path).map(({a,b}) => [a.territory.id,b.territory.id]) } };
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frameId);
      globe.destroy();
      observer.disconnect();
      keys.clear();
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerCancel);
      canvas.removeEventListener('pointerleave', pointerLeave);
      canvas.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
    },
  };
}
