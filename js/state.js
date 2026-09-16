import { TILES, TILE_NEIGHBORS } from './tiles.js';

export const RESOURCES = ['fish', 'kelp', 'driftwood', 'crops'];
export const SAVE_KEY = 'driftaway_save_v1';

const STEP_MULTIPLIER = { 2: 1, 3: 2.5 };
export const MAX_LEVEL = Math.max(...Object.keys(STEP_MULTIPLIER).map(Number));
const PRODUCER_UPGRADE_BASE = 30;
const BOOSTER_UPGRADE_BASE = 6;

export function createInitialPrestige() {
  return { tokens: 0, upgrades: { fish: 0, kelp: 0, driftwood: 0, crops: 0 } };
}

export function createInitialState() {
  const resources = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  const lifetime = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  const unlocked = TILES.filter((t) => t.unlock.type === 'start').map((t) => t.id);
  return {
    version: 1,
    resources,
    lifetime,
    unlocked,
    levels: {},
    prestige: createInitialPrestige(),
    gold: 0,
    achievements: [],
  };
}

export function levelMultiplier(level) {
  return 1 + (level - 1) * 0.5;
}

function boostPercentFor(resource, unlockedIds, levels = {}) {
  return TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'booster')
    .flatMap((t) => t.boosts.map((b) => ({ ...b, level: levels[t.id] || 1 })))
    .filter((b) => b.resource === resource)
    .reduce((sum, b) => sum + b.percent * levelMultiplier(b.level), 0);
}

export function effectiveRate(resource, unlockedIds, levels = {}, prestigeUpgrades = {}) {
  const baseSum = TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'producer' && t.produces === resource)
    .reduce((sum, t) => sum + t.rate * levelMultiplier(levels[t.id] || 1), 0);
  const boosterMultiplier = 1 + boostPercentFor(resource, unlockedIds, levels) / 100;
  const prestigeMultiplier = 1 + (PRESTIGE_UPGRADE_PERCENT * (prestigeUpgrades[resource] || 0)) / 100;
  return baseSum * boosterMultiplier * prestigeMultiplier;
}

export function effectiveTileRate(tile, unlockedIds, levels = {}, prestigeUpgrades = {}) {
  const level = levels[tile.id] || 1;
  const boosterMultiplier = 1 + boostPercentFor(tile.produces, unlockedIds, levels) / 100;
  const prestigeMultiplier = 1 + (PRESTIGE_UPGRADE_PERCENT * (prestigeUpgrades[tile.produces] || 0)) / 100;
  return tile.rate * levelMultiplier(level) * boosterMultiplier * prestigeMultiplier;
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

export function getLevel(state, tileId) {
  return state.levels[tileId] || 1;
}

export const TOTAL_TILE_COUNT = TILES.length;

export function completionCount(state) {
  return TILES.filter((t) => state.unlocked.includes(t.id) && getLevel(state, t.id) >= MAX_LEVEL).length;
}

export function isFullyComplete(state) {
  return completionCount(state) === TOTAL_TILE_COUNT;
}

const START_TILE_COUNT = TILES.filter((t) => t.unlock.type === 'start').length;
const TYCOON_TARGET = 5000;

// Gold is a plain reward counter: nothing in the production, unlock, level-up or
// prestige-store math reads it. It only ever grows, via these rewards.
export const ACHIEVEMENTS = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Unlock a tile beyond your starting ones',
    reward: 1,
    condition: (state) => state.unlocked.length > START_TILE_COUNT,
  },
  {
    id: 'maxed-out',
    name: 'Maxed Out',
    description: 'Bring any tile to max level',
    reward: 1,
    condition: (state) => Object.values(state.levels).some((level) => level >= MAX_LEVEL),
  },
  {
    id: 'fish-tycoon',
    name: 'Fish Tycoon',
    description: 'Earn 5,000 lifetime fish',
    reward: 1,
    condition: (state) => state.lifetime.fish >= TYCOON_TARGET,
  },
  {
    id: 'kelp-tycoon',
    name: 'Kelp Tycoon',
    description: 'Earn 5,000 lifetime kelp',
    reward: 1,
    condition: (state) => state.lifetime.kelp >= TYCOON_TARGET,
  },
  {
    id: 'driftwood-tycoon',
    name: 'Driftwood Tycoon',
    description: 'Earn 5,000 lifetime driftwood',
    reward: 1,
    condition: (state) => state.lifetime.driftwood >= TYCOON_TARGET,
  },
  {
    id: 'crops-tycoon',
    name: 'Crops Tycoon',
    description: 'Earn 5,000 lifetime crops',
    reward: 1,
    condition: (state) => state.lifetime.crops >= TYCOON_TARGET,
  },
  {
    id: 'halfway-there',
    name: 'Halfway There',
    description: 'Max out half of all tiles',
    reward: 2,
    condition: (state) => completionCount(state) >= Math.ceil(TOTAL_TILE_COUNT / 2),
  },
  {
    id: 'drift-away-complete',
    name: 'Drift Away Complete',
    description: 'Max out every tile',
    reward: 5,
    condition: (state) => isFullyComplete(state),
  },
];

export function checkAchievements(state) {
  const awarded = [];
  for (const achievement of ACHIEVEMENTS) {
    if (state.achievements.includes(achievement.id)) continue;
    if (!achievement.condition(state)) continue;
    state.achievements.push(achievement.id);
    state.gold += achievement.reward;
    awarded.push(achievement);
  }
  return awarded;
}

export const PRESTIGE_TOKEN_DIVISOR = 1000; // first-pass constant, not playtested

export function prestigeTokensEarned(state) {
  const total = RESOURCES.reduce((sum, r) => sum + state.lifetime[r], 0);
  return Math.floor(total / PRESTIGE_TOKEN_DIVISOR);
}

export function doPrestige(state) {
  if (!isFullyComplete(state)) return null;
  const tokensEarned = prestigeTokensEarned(state);
  const nextState = createInitialState();
  nextState.prestige = {
    tokens: state.prestige.tokens + tokensEarned,
    upgrades: { ...state.prestige.upgrades },
  };
  nextState.gold = state.gold;
  nextState.achievements = [...state.achievements];
  return { state: nextState, tokensEarned };
}

export const PRESTIGE_UPGRADE_BASE_COST = 5; // first-pass constant, not playtested
export const PRESTIGE_UPGRADE_PERCENT = 10; // +10% production per purchase, first-pass

export function prestigeUpgradeCost(currentCount) {
  return PRESTIGE_UPGRADE_BASE_COST * (currentCount + 1);
}

export function buyPrestigeUpgrade(state, resource) {
  const count = state.prestige.upgrades[resource];
  const cost = prestigeUpgradeCost(count);
  if (state.prestige.tokens < cost) return false;
  state.prestige.tokens -= cost;
  state.prestige.upgrades[resource] += 1;
  return true;
}

export function levelUpCost(tile, targetLevel) {
  const stepMult = STEP_MULTIPLIER[targetLevel];
  if (tile.kind === 'producer') {
    return { [tile.produces]: Math.round(tile.rate * PRODUCER_UPGRADE_BASE * stepMult) };
  }
  return Object.fromEntries(
    tile.boosts.map((b) => [b.resource, Math.round(b.percent * BOOSTER_UPGRADE_BASE * stepMult)])
  );
}

export function isLevelUpEligible(state, tile) {
  const level = getLevel(state, tile.id);
  if (!state.unlocked.includes(tile.id) || level >= MAX_LEVEL) return false;
  const cost = levelUpCost(tile, level + 1);
  return Object.entries(cost).every(([resource, amount]) => state.resources[resource] >= amount);
}

export function levelUpTile(state, tile) {
  if (!isLevelUpEligible(state, tile)) return false;
  const level = getLevel(state, tile.id);
  const cost = levelUpCost(tile, level + 1);
  for (const [resource, amount] of Object.entries(cost)) {
    state.resources[resource] -= amount;
  }
  state.levels[tile.id] = level + 1;
  checkAchievements(state);
  return true;
}

export const OFFLINE_RATE = 0.5;
export const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
const MIN_OFFLINE_SECONDS = 60;

export function applyOfflineProgress(state, elapsedSeconds) {
  if (elapsedSeconds < MIN_OFFLINE_SECONDS) return null;
  const seconds = Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS);
  const gains = {};
  for (const resource of RESOURCES) {
    const amount = effectiveRate(resource, state.unlocked, state.levels, state.prestige.upgrades) * seconds * OFFLINE_RATE;
    state.resources[resource] += amount;
    state.lifetime[resource] += amount;
    gains[resource] = amount;
  }
  checkAchievements(state);
  return { gains, seconds };
}

export function tick(state, dt) {
  for (const resource of RESOURCES) {
    const amount = effectiveRate(resource, state.unlocked, state.levels, state.prestige.upgrades) * dt;
    state.resources[resource] += amount;
    state.lifetime[resource] += amount;
  }
  checkAchievements(state);
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
  checkAchievements(state);
  return true;
}

export function saveState(state) {
  state.lastSaved = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (blocked, sandboxed, quota) — play continues without persistence
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { state: createInitialState(), offline: null };
    const parsed = JSON.parse(raw);
    const looksValid =
      parsed &&
      typeof parsed === 'object' &&
      parsed.resources &&
      parsed.lifetime &&
      Array.isArray(parsed.unlocked);
    if (!looksValid) return { state: createInitialState(), offline: null };
    const base = createInitialState();
    const state = {
      ...base,
      ...parsed,
      resources: { ...base.resources, ...parsed.resources },
      lifetime: { ...base.lifetime, ...parsed.lifetime },
      levels: { ...base.levels, ...parsed.levels },
      prestige: {
        ...base.prestige,
        ...(parsed.prestige || {}),
        upgrades: { ...base.prestige.upgrades, ...(parsed.prestige || {}).upgrades },
      },
      gold: parsed.gold ?? base.gold,
      achievements: [...(parsed.achievements || base.achievements)],
    };
    const elapsedSeconds = parsed.lastSaved ? Math.max(0, (Date.now() - parsed.lastSaved) / 1000) : 0;
    const offline = applyOfflineProgress(state, elapsedSeconds);
    // A save migrated from before achievements existed may already meet several
    // conditions; credit them now rather than on the next frame's tick.
    checkAchievements(state);
    return { state, offline };
  } catch {
    return { state: createInitialState(), offline: null };
  }
}
