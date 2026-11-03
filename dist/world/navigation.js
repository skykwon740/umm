/** A* movement graph and authorized bridges, independent of projection. */
export function createNavigation(terrain,options,origin) {
  const {TERRAIN,lands,bounds,columns,rows,ownership,atGrid}=terrain;
  const validTerritoryIds=new Set(lands.map(land=>land.territory.id));
  const suppliedEdges = Array.isArray(options.allowedEdges) ? options.allowedEdges : Array.isArray(options.connections) ? options.connections : null;
  const fallbackEdges = [];
  const distanceOrdered = [...lands].sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y));
  for (let index = 1; index < distanceOrdered.length; index += 1) {
    const land = distanceOrdered[index];
    const earlier = distanceOrdered.slice(0, index);
    const nearest = earlier.reduce((best, next) => Math.hypot(next.x - land.x, next.y - land.y) < Math.hypot(best.x - land.x, best.y - land.y) ? next : best);
    fallbackEdges.push([nearest.territory.id, land.territory.id]);
  }
  const semanticEdges = (suppliedEdges || fallbackEdges).filter((edge) => Array.isArray(edge) && edge.length === 2 && validTerritoryIds.has(edge[0]) && validTerritoryIds.has(edge[1]) && edge[0] !== edge[1]);
  const edgeKey = (a, b) => a < b ? a + ':' + b : b + ':' + a;
  const allowedTransitions = new Set(semanticEdges.map(([a, b]) => edgeKey(lands.findIndex((land) => land.territory.id === a), lands.findIndex((land) => land.territory.id === b))));
  if(options.freeRoam) {
    for(let i=0;i<ownership.length;i++) {
      if(ownership[i]<0) continue;
      for(const j of [i%columns<columns-1?i+1:-1,i+columns<ownership.length?i+columns:-1]) {
        if(j>=0&&ownership[j]>=0) allowedTransitions.add(edgeKey(ownership[i],ownership[j]));
      }
    }
  }
  const navOwner = new Int16Array(ownership);
  const bridgeCells = new Set();

  function gridCenter(index) {
    return { x: bounds.minX + (index % columns + 0.5) * TERRAIN, y: bounds.minY + (Math.floor(index / columns) + 0.5) * TERRAIN };
  }
  function pathfind(start, end, canVisit, stepCost = () => 1) {
    if (start < 0 || end < 0) return null;
    if (start === end) return [start];
    const cost = new Float64Array(columns * rows).fill(Infinity);
    const previous = new Int32Array(columns * rows).fill(-1);
    const closed = new Uint8Array(columns * rows);
    const heap = [];
    const targetCol = end % columns, targetRow = Math.floor(end / columns);
    const heuristic = (i) => Math.abs(i % columns - targetCol) + Math.abs(Math.floor(i / columns) - targetRow);
    function push(i, score) {
      let k = heap.length;
      heap.push({ i, score });
      while (k > 0) {
        const parent = Math.floor((k - 1) / 2);
        if (heap[parent].score <= heap[k].score) break;
        [heap[parent], heap[k]] = [heap[k], heap[parent]]; k = parent;
      }
    }
    function pop() {
      const first = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        while (true) {
          const left = k * 2 + 1, right = left + 1;
          let next = k;
          if (left < heap.length && heap[left].score < heap[next].score) next = left;
          if (right < heap.length && heap[right].score < heap[next].score) next = right;
          if (next === k) break;
          [heap[next], heap[k]] = [heap[k], heap[next]]; k = next;
        }
      }
      return first.i;
    }
    cost[start] = 0; push(start, heuristic(start));
    while (heap.length) {
      const current = pop();
      if (closed[current]) continue;
      if (current === end) {
        const result = [end];
        let node = end;
        while (node !== start) { node = previous[node]; if (node < 0) return null; result.push(node); }
        return result.reverse();
      }
      closed[current] = 1;
      const col = current % columns, row = Math.floor(current / columns);
      const neighbors = [];
      if (col > 0) neighbors.push(current - 1);
      if (col < columns - 1) neighbors.push(current + 1);
      if (row > 0) neighbors.push(current - columns);
      if (row < rows - 1) neighbors.push(current + columns);
      for (const next of neighbors) {
        if (closed[next] || !canVisit(current, next)) continue;
        const nextCost = cost[current] + stepCost(next);
        if (nextCost >= cost[next]) continue;
        previous[next] = current; cost[next] = nextCost;
        push(next, nextCost + heuristic(next));
      }
    }
    return null;
  }
  function canTransition(a, b) {
    const ownerA = navOwner[a], ownerB = navOwner[b];
    if (ownerA < 0 || ownerB < 0) return false;
    return ownerA === ownerB || allowedTransitions.has(edgeKey(ownerA, ownerB));
  }
  function representativeCell(land) {
    return land.cells.reduce((best, cell) => Math.hypot(cell.x - land.x, cell.y - land.y) < Math.hypot(best.x - land.x, best.y - land.y) ? cell : best, land.cells[0])?.i ?? -1;
  }

  // Coast inlets can separate pockets of one domain; its video sites get authorized footbridges.
  for (const land of lands) {
    const start = representativeCell(land);
    for (const tile of land.tiles) {
      const end = atGrid(tile.x, tile.y);
      const connected = pathfind(start, end, (_, next) => navOwner[next] === land.index);
      if (connected) continue;
      const path = pathfind(start, end, (_, next) => navOwner[next] === land.index || navOwner[next] < 0, (index) => ownership[index] < 0 ? 3 : 1);
      if (!path) continue;
      for (const index of path) {
        if (ownership[index] < 0) { navOwner[index] = land.index; bridgeCells.add(index); }
      }
    }
  }
  // Create only semantically authorized bridges. Water cannot be walked elsewhere.
  semanticEdges.forEach(([idA, idB], edgeIndex) => {
    const a = lands.find((land) => land.territory.id === idA);
    const b = lands.find((land) => land.territory.id === idB);
    if (!a || !b) return;
    const start = representativeCell(a), end = representativeCell(b);
    const alreadyConnected = pathfind(start, end, (current, next) => {
      const owner = navOwner[next];
      return (owner === a.index || owner === b.index) && canTransition(current, next);
    });
    if (alreadyConnected) return;
    const bridgeOwner = lands.length + edgeIndex;
    allowedTransitions.add(edgeKey(a.index, bridgeOwner));
    allowedTransitions.add(edgeKey(b.index, bridgeOwner));
    const path = pathfind(start, end, (_, next) => {
      const owner = navOwner[next];
      return owner === a.index || owner === b.index || owner === bridgeOwner || owner < 0;
    }, (index) => ownership[index] < 0 ? 2.7 : 1);
    if (!path) return;
    for (const index of path) {
      if (ownership[index] < 0) { navOwner[index] = bridgeOwner; bridgeCells.add(index); }
    }
  });


  function canStep(from, to) {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4));
    let previous = atGrid(from.x, from.y);
    if (previous < 0 || navOwner[previous] < 0) return false;
    for (let step = 1; step <= steps; step += 1) {
      const next = atGrid(from.x + (to.x - from.x) * step / steps, from.y + (to.y - from.y) * step / steps);
      if (next < 0 || navOwner[next] < 0) return false;
      if (next !== previous && !canTransition(previous, next)) return false;
      previous = next;
    }
    return true;
  }

  const connections = semanticEdges.map(([idA, idB]) => { const a = lands.find((land) => land.territory.id === idA), b = lands.find((land) => land.territory.id === idB); return { a, b, path: a && b ? pathfind(representativeCell(a), representativeCell(b), canTransition)?.map(gridCenter) : null }; }).filter(({a,b}) => a && b);


  return {semanticEdges,navOwner,bridgeCells,allowedTransitions,edgeKey,gridCenter,pathfind,canTransition,canStep,connections};
}
