import { TILES, TILE_NEIGHBORS } from './tiles.js';

export const RESOURCES = ['fish', 'kelp', 'driftwood', 'crops'];
export const SAVE_KEY = 'driftaway_save_v1';

export function createInitialState() {
  const resources = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  const lifetime = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  const unlocked = TILES.filter((t) => t.unlock.type === 'start').map((t) => t.id);
  return { version: 1, resources, lifetime, unlocked };
}

function boostPercentFor(resource, unlockedIds) {
  return TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'booster')
    .flatMap((t) => t.boosts)
    .filter((b) => b.resource === resource)
    .reduce((sum, b) => sum + b.percent, 0);
}

export function effectiveRate(resource, unlockedIds) {
  const baseSum = TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'producer' && t.produces === resource)
    .reduce((sum, t) => sum + t.rate, 0);
  return baseSum * (1 + boostPercentFor(resource, unlockedIds) / 100);
}

export function effectiveTileRate(tile, unlockedIds) {
  return tile.rate * (1 + boostPercentFor(tile.produces, unlockedIds) / 100);
}

export function isDiscovered(tile, state) {
  if (state.unlocked.includes(tile.id)) return true;
  return TILE_NEIGHBORS.get(tile.id).some((id) => state.unlocked.includes(id));
}

export function isEligible(tile, state) {
  if (tile.unlock.type === 'start') return true;
  if (!isDiscovered(tile, state)) return false;
  if (tile.unlock.type === 'cost') {
    return Object.entries(tile.unlock.cost).every(
      ([resource, amount]) => state.resources[resource] >= amount
    );
  }
  if (tile.unlock.type === 'milestone') {
    return state.lifetime[tile.unlock.resource] >= tile.unlock.target;
  }
  return false;
}

export function tick(state, dt) {
  for (const resource of RESOURCES) {
    const amount = effectiveRate(resource, state.unlocked) * dt;
    state.resources[resource] += amount;
    state.lifetime[resource] += amount;
  }
  return state;
}

export function unlockTile(state, tile) {
  if (state.unlocked.includes(tile.id)) return false;
  if (!isEligible(tile, state)) return false;

  if (tile.unlock.type === 'cost') {
    for (const [resource, amount] of Object.entries(tile.unlock.cost)) {
      state.resources[resource] -= amount;
    }
  }

  state.unlocked.push(tile.id);
  return true;
}

export function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (blocked, sandboxed, quota) — play continues without persistence
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    const looksValid =
      parsed &&
      typeof parsed === 'object' &&
      parsed.resources &&
      parsed.lifetime &&
      Array.isArray(parsed.unlocked);
    if (!looksValid) return createInitialState();
    const base = createInitialState();
    return {
      ...base,
      ...parsed,
      resources: { ...base.resources, ...parsed.resources },
      lifetime: { ...base.lifetime, ...parsed.lifetime },
    };
  } catch {
    return createInitialState();
  }
}
