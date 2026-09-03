import { TILES } from './tiles.js';

export const RESOURCES = ['fish', 'kelp', 'driftwood', 'crops'];
export const SAVE_KEY = 'driftaway_save_v1';

export function createInitialState() {
  const resources = { fish: 0, kelp: 0, driftwood: 0, crops: 0 };
  const lifetime = { fish: 0, kelp: 0, driftwood: 0, crops: 0 };
  const unlocked = TILES.filter((t) => t.unlock.type === 'start').map((t) => t.id);
  return { version: 1, resources, lifetime, unlocked };
}

export function effectiveRate(resource, unlockedIds) {
  const baseSum = TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'producer' && t.produces === resource)
    .reduce((sum, t) => sum + t.rate, 0);

  const boostPct = TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'booster')
    .flatMap((t) => t.boosts)
    .filter((b) => b.resource === resource)
    .reduce((sum, b) => sum + b.percent, 0);

  return baseSum * (1 + boostPct / 100);
}

export function isEligible(tile, state) {
  if (tile.unlock.type === 'start') return true;
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
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
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
    return looksValid ? parsed : createInitialState();
  } catch {
    return createInitialState();
  }
}
