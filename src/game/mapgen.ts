/** Seeded, six-neighbour cellular terrain. Map randomness never consumes the dice RNG. */
export type WorldAnchor = { key: string; type: 'start' | 'goal' | 'nutrient' | 'repellent' | 'depletion' };
export type WorldTile = {
 q: number; r: number; key: string;
 kind: 'empty' | 'nutrient' | 'wall' | 'repellent' | 'goal';
 depleted: boolean; anchor?: boolean;
};
export type GenerationFrame = { label: 'anchors' | 'growth' | 'final'; walls: string[]; nutrients: string[]; depleted: string[] };
export type GeneratedWorld = {
 tiles: WorldTile[]; start: string; goal: string; radius: number; mapSeed: number; turnLimit: number;
 anchors: WorldAnchor[];
 generation: { passes: number; shortestPath: number; wallCount: number; foodCount: number };
 frames: GenerationFrame[];
};

const DIRECTIONS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]] as const;
const hexDistance = (a: WorldTile, b: WorldTile) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;

export function generateWorld(seed: number, radius = 6): GeneratedWorld {
 radius = Math.max(4, Math.min(10, Math.round(Number.isFinite(radius) ? radius : 6)));
 const mapSeed = Number.isFinite(seed) ? seed >>> 0 : 0;
 let state = (mapSeed ^ 0xa511e9b3 ^ Math.imul(radius, 0x9e3779b9)) >>> 0;
 const random = () => {
  state = (state + 0x6d2b79f5) >>> 0;
  let n = state;
  n = Math.imul(n ^ (n >>> 15), n | 1);
  n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
 };
 const tiles: WorldTile[] = [];
 for (let q = -radius; q <= radius; q++) for (let r = -radius; r <= radius; r++) {
  if (Math.abs(q + r) <= radius) tiles.push({ q, r, key: `${q},${r}`, kind: 'empty', depleted: false });
 }
 const byKey = new Map(tiles.map(t => [t.key, t]));
 const neighbours = new Map(tiles.map(t => [t.key, DIRECTIONS.map(([q, r]) => `${t.q + q},${t.r + r}`).filter(k => byKey.has(k))]));
 const adjacent = (key: string) => neighbours.get(key)!;
 const at = (key: string) => byKey.get(key)!;
 const dist = (a: string, b: string) => hexDistance(at(a), at(b));
 const pick = (list: WorldTile[]) => list[Math.floor(random() * list.length)];
 const edge = (t: WorldTile) => Math.max(Math.abs(t.q), Math.abs(t.r), Math.abs(t.q + t.r)) === radius;
 const startTile = pick(tiles.filter(t => edge(t) && t.q + t.r / 2 < -radius * .7));
 const goalTile = pick(tiles.filter(t => edge(t) && t.q + t.r / 2 > radius * .7 && hexDistance(startTile, t) >= radius * 1.6));
 const start = startTile.key, goal = goalTile.key;
 const directDistance = dist(start, goal);
 const anchors: WorldAnchor[] = [{ key: start, type: 'start' }, { key: goal, type: 'goal' }];

 // Seed places first, including at least two food patches off the shortest geometric route.
 const foodSeeds: string[] = [];
 const foodSeedCount = Math.min(7, Math.max(4, radius - 1));
 for (let i = 0; i < foodSeedCount; i++) {
  let candidates = tiles.filter(t => !edge(t) && dist(t.key, start) >= 2 && dist(t.key, goal) >= 2 && foodSeeds.every(k => dist(k, t.key) >= 3));
  if (!candidates.length) candidates = tiles.filter(t => !edge(t) && anchors.every(a => dist(a.key, t.key) >= 2));
  const detours = candidates.filter(t => dist(start, t.key) + dist(t.key, goal) >= directDistance + 2);
  if (i < 2 && detours.length) candidates = detours;
  if (!candidates.length) break;
  const key = pick(candidates).key;
  foodSeeds.push(key); anchors.push({ key, type: 'nutrient' });
 }
 const repelSeeds: string[] = [], depletionSeeds: string[] = [];
 for (const type of ['repellent', 'depletion'] as const) {
  const amount = type === 'repellent' && radius >= 8 ? 3 : 2;
  for (let i = 0; i < amount; i++) {
   let candidates = tiles.filter(t => !edge(t) && anchors.every(a => dist(a.key, t.key) >= 3));
   if (!candidates.length) candidates = tiles.filter(t => !edge(t) && anchors.every(a => dist(a.key, t.key) >= 2));
   if (!candidates.length) continue;
   const key = pick(candidates).key;
   (type === 'repellent' ? repelSeeds : depletionSeeds).push(key); anchors.push({ key, type });
  }
 }
 const anchorKeys = new Set(anchors.map(a => a.key));
 const protectedOpen = new Set([start, goal, ...adjacent(start), ...adjacent(goal), ...anchorKeys]);
 const nearest = (key: string, seeds: string[]) => Math.min(...seeds.map(k => dist(k, key)));
 const wallSeeds: string[] = [];
 for (let i = 0; i < Math.max(3, radius - 2); i++) {
  const candidates = tiles.filter(t => !edge(t) && !protectedOpen.has(t.key) && anchors.every(a => dist(a.key, t.key) >= 2) && wallSeeds.every(k => dist(k, t.key) >= 3));
  if (candidates.length) wallSeeds.push(pick(candidates).key);
 }
 let walls = new Set<string>(), food = new Set(foodSeeds), depleted = new Set(depletionSeeds);
 for (const t of tiles) {
  if (!protectedOpen.has(t.key) && random() < (nearest(t.key, wallSeeds) <= 1 ? .83 : .24)) walls.add(t.key);
  const foodDistance = nearest(t.key, foodSeeds), depletedDistance = nearest(t.key, depletionSeeds);
  if (random() < (foodDistance === 1 ? .56 : foodDistance === 2 ? .16 : 0)) food.add(t.key);
  if (random() < (depletedDistance <= 1 ? .82 : depletedDistance === 2 ? .28 : 0)) depleted.add(t.key);
 }
 const snapshot = (label: GenerationFrame['label']): GenerationFrame => ({ label, walls: [...walls], nutrients: [...food], depleted: [...depleted] });
 const frames: GenerationFrame[] = [{ label: 'anchors', walls: [], nutrients: [...foodSeeds], depleted: [...depletionSeeds] }];
 const passes = 5;
 for (let pass = 0; pass < passes; pass++) {
  const nextWalls = new Set<string>(), nextFood = new Set<string>(), nextDepleted = new Set<string>();
  for (const t of tiles) {
   const near = adjacent(t.key);
   const wallN = near.filter(k => walls.has(k)).length;
   const foodN = near.filter(k => food.has(k)).length;
   const depletedN = near.filter(k => depleted.has(k)).length;
   // Synchronous CA, six neighbours: walls B4+/S2+, food B2/S1-3,
   // depletion B3+/S2+. Food has radius-2 resource support; depletion radius 3.
   if (!protectedOpen.has(t.key) && (walls.has(t.key) ? wallN >= 2 : wallN >= 4)) nextWalls.add(t.key);
   if (foodSeeds.includes(t.key) || (nearest(t.key, foodSeeds) <= 2 && (food.has(t.key) ? foodN >= 1 && foodN <= 3 : foodN === 2))) nextFood.add(t.key);
   if (depletionSeeds.includes(t.key) || (nearest(t.key, depletionSeeds) <= 3 && (depleted.has(t.key) ? depletedN >= 2 : depletedN >= 3))) nextDepleted.add(t.key);
  }
  walls = nextWalls; food = nextFood; depleted = nextDepleted;
  frames.push(snapshot('growth'));
 }

 // Connect every walkable component by opening paths with the fewest wall cells.
 const reachable = () => {
  const seen = new Set([start]), queue = [start];
  for (let i = 0; i < queue.length; i++) for (const next of adjacent(queue[i])) {
   if (!walls.has(next) && !seen.has(next)) { seen.add(next); queue.push(next); }
  }
  return seen;
 };
 let connected = reachable();
 while (connected.size < tiles.length - walls.size) {
  const costs = new Map<string, number>(), previous = new Map<string, string>(), pending = new Set<string>();
  for (const k of connected) { costs.set(k, 0); pending.add(k); }
  let target: string | undefined;
  while (pending.size) {
   let best: string | undefined, cost = Infinity;
   for (const k of pending) if (costs.get(k)! < cost) { best = k; cost = costs.get(k)!; }
   const current = best!; pending.delete(current);
   if (!walls.has(current) && !connected.has(current)) { target = current; break; }
   for (const next of adjacent(current)) {
    const newCost = cost + (walls.has(next) ? 1 : 0) + .001;
    if (newCost < (costs.get(next) ?? Infinity)) { costs.set(next, newCost); previous.set(next, current); pending.add(next); }
   }
  }
  if (!target) break;
  while (!connected.has(target)) { walls.delete(target); target = previous.get(target)!; }
  connected = reachable();
 }
 // Eliminate dead ends; interior cells have >=3 exits and boundary cells >=2.
 let repaired = true;
 while (repaired) {
  repaired = false;
  for (const t of tiles) {
   if (walls.has(t.key)) continue;
   const near = adjacent(t.key), minimum = edge(t) ? 2 : 3;
   let degree = near.filter(k => !walls.has(k)).length;
   while (degree < minimum) {
    const candidates = near.filter(k => walls.has(k));
    if (!candidates.length) break;
    candidates.sort((a, b) => adjacent(b).filter(k => !walls.has(k)).length - adjacent(a).filter(k => !walls.has(k)).length);
    walls.delete(candidates[0]); degree++; repaired = true;
   }
  }
 }

 // Resource budget prevents CA growth from turning the whole board into free moves.
 // Keep each food core plus 1-2 reachable neighbours, then preserve selected CA cells.
 const legalFood = (key: string) => !walls.has(key) && key !== start && key !== goal && !repelSeeds.includes(key) && !depletionSeeds.includes(key);
 const chosenFood = new Set(foodSeeds);
 const tie = new Map(tiles.map(t => [t.key, random()]));
 for (const core of foodSeeds) {
  const candidates = adjacent(core).filter(legalFood).sort((a, b) => Number(food.has(b)) - Number(food.has(a)) || tie.get(a)! - tie.get(b)!);
  for (const key of candidates.slice(0, 1 + (random() < .7 ? 1 : 0))) chosenFood.add(key);
 }
 const foodBudget = Math.round(tiles.length * .18);
 const extras = [...food].filter(k => legalFood(k) && !chosenFood.has(k)).sort((a, b) => tie.get(a)! - tie.get(b)!);
 for (const key of extras) {
  if (chosenFood.size >= foodBudget) break;
  // Separate rich patches; a cell adjoining >=3 food tiles over-connects the combo.
  if (adjacent(key).filter(k => chosenFood.has(k)).length < 3) chosenFood.add(key);
 }
 food = chosenFood;
 depleted = new Set([...depleted].filter(k => !walls.has(k) && !food.has(k) && k !== start && k !== goal && !repelSeeds.includes(k)));
 for (const t of tiles) {
  t.kind = t.key === goal ? 'goal' : walls.has(t.key) ? 'wall' : repelSeeds.includes(t.key) ? 'repellent' : food.has(t.key) ? 'nutrient' : 'empty';
  t.depleted = depleted.has(t.key);
  if (anchorKeys.has(t.key)) t.anchor = true;
 }
 const distances = new Map([[start, 0]]), queue = [start];
 for (let i = 0; i < queue.length; i++) for (const next of adjacent(queue[i])) {
  if (!walls.has(next) && !distances.has(next)) { distances.set(next, distances.get(queue[i])! + 1); queue.push(next); }
 }
 const shortestPath = distances.get(goal)!;
 // Calibrated against visible-board policies. Standard maps leave detour time;
 // large maps have tighter time per path step. See docs/RULES.md for budgets.
 const turnLimit = Math.max(16, Math.round(shortestPath * (radius >= 8 ? 1.55 : 1.8) + 2));
 frames.push(snapshot('final'));
 return { tiles, start, goal, radius, mapSeed, turnLimit, anchors,
  generation: { passes, shortestPath, wallCount: walls.size, foodCount: food.size }, frames };
}
