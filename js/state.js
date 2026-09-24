import { TILES, TILE_NEIGHBORS } from './tiles.js';
import { ZONES } from './zones.js';
import { PALETTES } from './palettes.js';

export const RESOURCES = ['fish', 'kelp', 'driftwood', 'crops'];
// Zone 4's own resources: a separate layer from RESOURCES, so they get no prestige upgrade row,
// don't count toward lifetime-based achievements, and don't appear in the main HUD bar. They
// still live in state.resources/state.lifetime alongside the base 4 -- isEligible/unlockTile/
// levelUpCost all key off state.resources generically already, so goods-denominated costs and
// level-ups just work without touching that code.
export const GOODS = ['planks', 'kelp_rope', 'bread'];
export const SAVE_KEY = 'driftaway_save_v1';

const STEP_MULTIPLIER = { 2: 1, 3: 2.5 };
export const MAX_LEVEL = Math.max(...Object.keys(STEP_MULTIPLIER).map(Number));
const PRODUCER_UPGRADE_BASE = 30;
const BOOSTER_UPGRADE_BASE = 6;

export function createInitialPrestige() {
  return { tokens: 0, upgrades: { fish: 0, kelp: 0, driftwood: 0, crops: 0 }, headStart: 0, count: 0 };
}

// What gold has bought. Like gold itself it survives a prestige.
export function createInitialShop() {
  return { holdLevel: 0, tidesLevel: 0, palette: 'default', palettes: [], ballast: 0 };
}

export function createInitialState() {
  const resources = Object.fromEntries([...RESOURCES, ...GOODS].map((r) => [r, 0]));
  const lifetime = Object.fromEntries([...RESOURCES, ...GOODS].map((r) => [r, 0]));
  const unlocked = TILES.filter((t) => t.unlock.type === 'start').map((t) => t.id);
  return {
    version: 1,
    resources,
    lifetime,
    unlocked,
    levels: {},
    prestige: createInitialPrestige(),
    shop: createInitialShop(),
    gold: 0,
    achievements: [],
  };
}

export function levelMultiplier(level) {
  return 1 + (level - 1) * 0.5;
}

// Zone 3's mechanic: a zone-3 producer runs at half rate until a zone-3 booster is unlocked
// hex-adjacent to it (any of the six archetypes, not one dedicated tile — with only one of each
// scattered across 36 tiles, a single light source would leave most of the zone permanently dim).
// Every other tile (all of zone 1/2, and zone-3 boosters themselves) is always "lit".
const DARKNESS_PENALTY = 0.5;
export function isLit(tile, unlockedIds) {
  if (tile.zone !== 'zone3' || tile.kind !== 'producer') return true;
  return (TILE_NEIGHBORS.get(tile.id) || []).some((id) => {
    if (!unlockedIds.includes(id)) return false;
    const neighbor = TILES.find((t) => t.id === id);
    return neighbor?.zone === 'zone3' && neighbor.kind === 'booster';
  });
}
function darknessFactor(tile, unlockedIds) {
  return isLit(tile, unlockedIds) ? 1 : DARKNESS_PENALTY;
}

function boostPercentFor(resource, unlockedIds, levels = {}) {
  return TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'booster')
    .flatMap((t) => t.boosts.map((b) => ({ ...b, level: levels[t.id] || 1 })))
    .filter((b) => b.resource === resource)
    .reduce((sum, b) => sum + b.percent * levelMultiplier(b.level), 0);
}

export function effectiveRate(resource, unlockedIds, levels = {}, prestigeUpgrades = {}, ballastPercent = 0) {
  const baseSum = TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'producer' && t.produces === resource)
    .reduce((sum, t) => sum + t.rate * levelMultiplier(levels[t.id] || 1) * darknessFactor(t, unlockedIds), 0);
  const boosterMultiplier = 1 + boostPercentFor(resource, unlockedIds, levels) / 100;
  const prestigeMultiplier = 1 + (PRESTIGE_UPGRADE_PERCENT * (prestigeUpgrades[resource] || 0)) / 100;
  return baseSum * boosterMultiplier * prestigeMultiplier * (1 + ballastPercent / 100);
}

export function effectiveTileRate(tile, unlockedIds, levels = {}, prestigeUpgrades = {}, ballastPercent = 0) {
  const level = levels[tile.id] || 1;
  const boosterMultiplier = 1 + boostPercentFor(tile.produces, unlockedIds, levels) / 100;
  const prestigeMultiplier = 1 + (PRESTIGE_UPGRADE_PERCENT * (prestigeUpgrades[tile.produces] || 0)) / 100;
  return tile.rate * levelMultiplier(level) * boosterMultiplier * prestigeMultiplier * darknessFactor(tile, unlockedIds) * (1 + ballastPercent / 100);
}

// A resource's income for this game state: everything that applies, ballast included.
function stateRate(state, resource) {
  return effectiveRate(resource, state.unlocked, state.levels, state.prestige.upgrades, state.shop.ballast);
}

// Where a resource's income comes from, for the HUD: producer output, the boosters stacked on it,
// and the prestige bonus. `total` is exactly effectiveRate.
export function rateBreakdown(state, resource) {
  let base = 0;
  let boostPercent = 0;
  const boosters = [];
  for (const tile of TILES) {
    if (!state.unlocked.includes(tile.id)) continue;
    const multiplier = levelMultiplier(getLevel(state, tile.id));
    if (tile.kind === 'producer' && tile.produces === resource) base += tile.rate * multiplier * darknessFactor(tile, state.unlocked);
    // Generators (zone 4) count toward "is anything making this yet" the same way producers do --
    // unthrottled, since the scarcity throttle in applyGenerators is circular with this base sum
    // (this feeds boosterIsIdle and a booster's own "+X/s now" display, not the tick itself).
    if (tile.kind === 'generator' && tile.produces === resource) base += tile.rate * multiplier;
    if (tile.kind === 'booster') {
      for (const b of tile.boosts) {
        if (b.resource !== resource) continue;
        boostPercent += b.percent * multiplier;
        boosters.push({ name: tile.name, percent: b.percent * multiplier });
      }
    }
  }
  const prestigePercent = PRESTIGE_UPGRADE_PERCENT * (state.prestige.upgrades[resource] || 0);
  const ballastPercent = state.shop.ballast;
  return {
    base,
    boostPercent,
    boosters,
    prestigePercent,
    ballastPercent,
    total: base * (1 + boostPercent / 100) * (1 + prestigePercent / 100) * (1 + ballastPercent / 100),
  };
}

// True when nothing the booster affects has a producer yet, so unlocking it would change nothing.
export function boosterIsIdle(state, tile) {
  return tile.boosts.every((b) => rateBreakdown(state, b.resource).base === 0);
}

// What one booster adds to a resource right now, per second.
export function boosterGain(state, tile, resource) {
  const b = tile.boosts.find((x) => x.resource === resource);
  if (!b) return 0;
  const { base, prestigePercent, ballastPercent } = rateBreakdown(state, resource);
  return (
    base *
    ((b.percent * levelMultiplier(getLevel(state, tile.id))) / 100) *
    (1 + prestigePercent / 100) *
    (1 + ballastPercent / 100)
  );
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

// How close a locked tile is to being unlockable, and how long that takes at current rates.
// `blockedBy` names a needed resource nothing produces yet.
export function unlockEta(state, tile) {
  let needs = [];
  if (tile.unlock.type === 'cost') {
    needs = Object.entries(tile.unlock.cost).map(([r, amount]) => [r, amount, state.resources[r]]);
  } else if (tile.unlock.type === 'milestone') {
    needs = [[tile.unlock.resource, tile.unlock.target, state.lifetime[tile.unlock.resource]]];
  }
  let seconds = 0;
  let fraction = 1;
  let blockedBy = null;
  for (const [resource, amount, have] of needs) {
    fraction = Math.min(fraction, Math.min(1, have / amount));
    if (have >= amount) continue;
    const rate = stateRate(state, resource);
    if (rate <= 0) {
      blockedBy = resource;
      seconds = Infinity;
    } else {
      seconds = Math.max(seconds, (amount - have) / rate);
    }
  }
  return { seconds, fraction, blockedBy };
}

// Every tile the player can see but hasn't unlocked, with its timer.
export function lockedTileStatuses(state) {
  return TILES.filter((t) => !state.unlocked.includes(t.id) && isDiscovered(t, state)).map((tile) => ({
    tile,
    eta: unlockEta(state, tile),
  }));
}

// The soonest visible tile to unlock (ties go to the one closest to affordable), and how many are
// ready right now. Null when nothing visible is left to unlock.
export function nextUnlock(state, statuses = lockedTileStatuses(state)) {
  if (statuses.length === 0) return null;
  let best = statuses[0];
  for (const x of statuses) {
    if (x.eta.seconds < best.eta.seconds || (x.eta.seconds === best.eta.seconds && x.eta.fraction > best.eta.fraction)) best = x;
  }
  return { ...best, readyCount: statuses.filter((x) => x.eta.seconds === 0).length };
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

// Gold is earned only from these rewards, never lost to a prestige, and spent in the Harbor Shop.
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
  {
    id: 'frozen-reach-discovered',
    name: 'Frozen Reach',
    description: 'Unlock your first tile in the Frozen Reach',
    reward: 2,
    condition: (state) => state.unlocked.some((id) => TILES.find((t) => t.id === id)?.zone === 'zone2'),
  },
  {
    id: 'frozen-reach-complete',
    name: 'Master of the Frozen Reach',
    description: 'Max out every tile in the Frozen Reach',
    reward: 8,
    condition: (state) =>
      TILES.filter((t) => t.zone === 'zone2').every(
        (t) => state.unlocked.includes(t.id) && getLevel(state, t.id) >= MAX_LEVEL
      ),
  },
  {
    id: 'abyssal-trench-discovered',
    name: 'The Abyssal Trench',
    description: 'Unlock your first tile in the Abyssal Trench',
    reward: 3,
    condition: (state) => state.unlocked.some((id) => TILES.find((t) => t.id === id)?.zone === 'zone3'),
  },
  {
    id: 'abyssal-trench-complete',
    name: 'Master of the Abyss',
    description: 'Max out every tile in the Abyssal Trench',
    reward: 10,
    condition: (state) =>
      TILES.filter((t) => t.zone === 'zone3').every(
        (t) => state.unlocked.includes(t.id) && getLevel(state, t.id) >= MAX_LEVEL
      ),
  },
  {
    id: 'timberline-coast-discovered',
    name: 'The Timberline Coast',
    description: 'Unlock your first tile in the Timberline Coast',
    reward: 3,
    condition: (state) => state.unlocked.some((id) => TILES.find((t) => t.id === id)?.zone === 'zone4'),
  },
  {
    id: 'timberline-coast-complete',
    name: 'Master of the Coast',
    description: 'Max out every tile in the Timberline Coast',
    reward: 10,
    condition: (state) =>
      TILES.filter((t) => t.zone === 'zone4').every(
        (t) => state.unlocked.includes(t.id) && getLevel(state, t.id) >= MAX_LEVEL
      ),
  },
];

// Tiered follow-ups, so there is always a next one to reach: bigger lifetime totals per resource,
// tile counts, and how many times the player has prestiged.
for (const resource of RESOURCES) {
  const name = `${resource[0].toUpperCase()}${resource.slice(1)}`;
  for (const [suffix, title, target, reward] of [['baron', 'Baron', 25000, 2], ['magnate', 'Magnate', 100000, 3]]) {
    ACHIEVEMENTS.push({
      id: `${resource}-${suffix}`,
      name: `${name} ${title}`,
      description: `Earn ${target.toLocaleString('en-US')} lifetime ${resource}`,
      reward,
      condition: (state) => state.lifetime[resource] >= target,
    });
  }
}
for (const [count, name, reward] of [[10, 'Small Fleet', 1], [25, 'Growing Raft', 2], [36, 'Home Waters', 2], [50, 'Far Horizons', 3], [72, 'Two Seas Charted', 4], [108, 'Three Seas Charted', 5], [144, 'The Whole Map', 6]]) {
  ACHIEVEMENTS.push({
    id: `tiles-${count}`,
    name,
    description: count === TOTAL_TILE_COUNT ? `Unlock all ${count} tiles` : `Unlock ${count} tiles`,
    reward,
    condition: (state) => state.unlocked.length >= count,
  });
}
for (const [count, name, reward] of [[1, 'Second Voyage', 5], [3, 'Seasoned Sailor', 5], [5, 'Old Salt', 8], [10, 'Ocean Legend', 12]]) {
  ACHIEVEMENTS.push({
    id: `voyage-${count}`,
    name,
    description: count === 1 ? 'Prestige for the first time' : `Prestige ${count} times`,
    reward,
    condition: (state) => state.prestige.count >= count,
  });
}

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
    headStart: state.prestige.headStart,
    count: state.prestige.count + 1,
  };
  nextState.shop = { ...state.shop, palettes: [...state.shop.palettes] };
  nextState.gold = state.gold;
  nextState.achievements = [...state.achievements];
  grantHeadStart(nextState, HEAD_START_TILES_PER_LEVEL * nextState.prestige.headStart);
  checkAchievements(nextState);
  return { state: nextState, tokensEarned };
}

// Head start: each level begins a run with two more tiles already unlocked, free — the ones a
// player would have unlocked first at that point.
export const HEAD_START_MAX_LEVEL = 10;
export const HEAD_START_TILES_PER_LEVEL = 2;

export function headStartCost(level) {
  return 20 * (level + 1);
}

export function buyHeadStart(state) {
  const level = state.prestige.headStart;
  if (level >= HEAD_START_MAX_LEVEL || state.prestige.tokens < headStartCost(level)) return false;
  state.prestige.tokens -= headStartCost(level);
  state.prestige.headStart += 1;
  return true;
}

// Skips boosters that have nothing to boost yet, so the free tiles are ones that do something.
function grantHeadStart(state, count) {
  for (let i = 0; i < count; i++) {
    const all = lockedTileStatuses(state);
    const useful = all.filter((x) => x.tile.kind !== 'booster' || !boosterIsIdle(state, x.tile));
    const next = nextUnlock(state, useful.length > 0 ? useful : all);
    if (!next) break;
    state.unlocked.push(next.tile.id);
  }
}

// ---------------------------------------------------------------------------------------------
// Harbor Shop: what gold buys. Comfort (time away), looks (palettes) and ballast (a small, endless
// production bonus so gold never has nowhere to go).
const HOLD_COSTS = [6, 12, 20];
const TIDES_COSTS = [8, 16];

export function ballastCost(state) {
  return 4 + 2 * state.shop.ballast;
}

// The rows the shop screen shows. `status` is one of buy / poor (can't afford yet) / owned /
// active (a look that is on) / maxed.
export function shopCatalog(state) {
  const { shop, gold } = state;
  const row = (id, section, name, detail, cost, status, extra = {}) => ({ id, section, name, detail, cost, status, ...extra });
  const priced = (cost) => (gold >= cost ? 'buy' : 'poor');
  const rows = [];

  const hold = shop.holdLevel;
  rows.push(
    hold >= HOLD_COSTS.length
      ? row('hold', 'comfort', `Deeper hold \u00b7 ${hold} of ${HOLD_COSTS.length}`, `Offline cap ${OFFLINE_CAP_HOURS[hold]}h`, 0, 'maxed')
      : row('hold', 'comfort', `Deeper hold \u00b7 ${hold} of ${HOLD_COSTS.length}`, `Offline cap ${OFFLINE_CAP_HOURS[hold]}h \u2192 ${OFFLINE_CAP_HOURS[hold + 1]}h`, HOLD_COSTS[hold], priced(HOLD_COSTS[hold]))
  );

  const tides = shop.tidesLevel;
  const percent = (level) => Math.round(OFFLINE_RATES[level] * 100);
  rows.push(
    tides >= TIDES_COSTS.length
      ? row('tides', 'comfort', `Steady tides \u00b7 ${tides} of ${TIDES_COSTS.length}`, `Time away counted at ${percent(tides)}%`, 0, 'maxed')
      : row('tides', 'comfort', `Steady tides \u00b7 ${tides} of ${TIDES_COSTS.length}`, `Time away counted at ${percent(tides + 1)}% instead of ${percent(tides)}%`, TIDES_COSTS[tides], priced(TIDES_COSTS[tides]))
  );

  const look = (id, name, detail, cost, swatch) => {
    const active = shop.palette === id;
    const owned = shop.palettes.includes(id) || id === 'default';
    return row(`palette:${id}`, 'look', name, detail, cost, active ? 'active' : owned ? 'owned' : priced(cost), { swatch });
  };
  if (shop.palettes.length > 0) rows.push(look('default', 'Classic', 'The original look', 0, '#2e7ba8'));
  for (const [id, palette] of Object.entries(PALETTES)) rows.push(look(id, palette.name, palette.blurb, palette.cost, palette.swatch));

  rows.push(
    row('ballast', 'ballast', `Ballast \u00b7 owned ${shop.ballast}`, '+1% to all production each. Cost rises by 2 every time, no limit', ballastCost(state), priced(ballastCost(state)))
  );
  return rows;
}

// Buys (or, for a look already owned, switches to) a shop item. False if it can't be done.
export function buyShopItem(state, id) {
  const { shop } = state;
  const pay = (cost) => {
    if (state.gold < cost) return false;
    state.gold -= cost;
    return true;
  };
  if (id === 'hold') {
    if (shop.holdLevel >= HOLD_COSTS.length || !pay(HOLD_COSTS[shop.holdLevel])) return false;
    shop.holdLevel += 1;
    return true;
  }
  if (id === 'tides') {
    if (shop.tidesLevel >= TIDES_COSTS.length || !pay(TIDES_COSTS[shop.tidesLevel])) return false;
    shop.tidesLevel += 1;
    return true;
  }
  if (id === 'ballast') {
    if (!pay(ballastCost(state))) return false;
    shop.ballast += 1;
    return true;
  }
  if (id.startsWith('palette:')) {
    const key = id.slice('palette:'.length);
    if (shop.palette === key) return false;
    if (key !== 'default') {
      if (!PALETTES[key]) return false;
      if (!shop.palettes.includes(key)) {
        if (!pay(PALETTES[key].cost)) return false;
        shop.palettes.push(key);
      }
    }
    shop.palette = key;
    return true;
  }
  return false;
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
  if (tile.kind === 'producer' || tile.kind === 'generator') {
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

// How much of a cost is in hand, 0 to 1 (the scarcest resource decides).
export function costProgressFraction(cost, state) {
  const fractions = Object.entries(cost).map(([resource, amount]) =>
    Math.min(1, state.resources[resource] / amount)
  );
  return Math.min(...fractions);
}

// Every unlocked tile that can still be levelled, for the quick-upgrade panel: affordable
// ones first in board order, then the rest closest-to-affordable first (ties keep board order).
export function upgradeList(state) {
  const rows = [];
  for (const tile of TILES) {
    if (!state.unlocked.includes(tile.id)) continue;
    const level = getLevel(state, tile.id);
    if (level >= MAX_LEVEL) continue;
    const cost = levelUpCost(tile, level + 1);
    const fraction = costProgressFraction(cost, state);
    rows.push({ tile, level, cost, fraction, ready: fraction >= 1 });
  }
  return rows.sort((a, b) => b.ready - a.ready || (a.ready ? 0 : b.fraction - a.fraction));
}

// Time away. The cap and the rate start at 8 hours and 50% and are raised in the Harbor Shop.
export const OFFLINE_CAP_HOURS = [8, 12, 16, 24];
const OFFLINE_RATES = [0.5, 0.65, 0.8];
const MIN_OFFLINE_SECONDS = 60;

export function offlineCapSeconds(state) {
  return OFFLINE_CAP_HOURS[state.shop.holdLevel] * 60 * 60;
}

export function offlineRate(state) {
  return OFFLINE_RATES[state.shop.tidesLevel];
}

// Zone 4's mechanic: a generator (kind 'generator') doesn't produce from nothing like every
// other tile -- it consumes existing resources to make a new one (planks/kelp_rope/bread). It
// draws on the shared pool alongside everything else (unlocks, other generators), so if unlocked
// generators together want more of an input than is in stock, every one of them drawing on that
// resource is throttled by the same fraction rather than first-come-first-served -- the pool
// never goes negative, and each generator's own output is capped by whichever of its inputs is
// scarcest. A generator with two inputs can end up drawing slightly more of its non-limiting
// input than its (lower, capped) output actually needed that tick -- a known first-pass
// simplification; see docs/superpowers/specs/2026-09-24-drift-away-zone4-design.md.
function generatorTiles(unlockedIds) {
  return TILES.filter((t) => unlockedIds.includes(t.id) && t.kind === 'generator');
}

function generatorMultiplier(tile, unlockedIds, levels) {
  const boostPercent = boostPercentFor(tile.produces, unlockedIds, levels);
  return levelMultiplier(levels[tile.id] || 1) * (1 + boostPercent / 100);
}

function generatorScarcityFactors(state) {
  const generators = generatorTiles(state.unlocked);
  const inputResources = [...new Set(generators.flatMap((t) => Object.keys(t.consumes)))];
  const factors = {};
  for (const resource of inputResources) {
    const desired = generators.reduce((sum, t) => {
      const rate = t.consumes[resource];
      return rate ? sum + rate * generatorMultiplier(t, state.unlocked, state.levels) : sum;
    }, 0);
    factors[resource] = desired > 0 ? Math.min(1, state.resources[resource] / desired) : 1;
  }
  return factors;
}

function generatorThrottle(tile, factors) {
  const inputs = Object.keys(tile.consumes);
  return inputs.length === 0 ? 1 : Math.min(...inputs.map((r) => factors[r]));
}

// A generator's current per-second output, throttled by whichever input is scarcest right now.
export function generatorRate(state, tile) {
  const throttle = generatorThrottle(tile, generatorScarcityFactors(state));
  return tile.rate * generatorMultiplier(tile, state.unlocked, state.levels) * throttle;
}

// The same, ignoring scarcity -- what the generator would produce with a full input pool.
export function generatorFullRate(state, tile) {
  return tile.rate * generatorMultiplier(tile, state.unlocked, state.levels);
}

function applyGenerators(state, dt) {
  const generators = generatorTiles(state.unlocked);
  if (generators.length === 0) return;
  const factors = generatorScarcityFactors(state);
  for (const tile of generators) {
    const multiplier = generatorMultiplier(tile, state.unlocked, state.levels);
    const throttle = generatorThrottle(tile, factors);
    for (const [resource, rate] of Object.entries(tile.consumes)) {
      state.resources[resource] -= rate * multiplier * throttle * dt;
    }
    const output = tile.rate * multiplier * throttle * dt;
    state.resources[tile.produces] += output;
    state.lifetime[tile.produces] += output;
  }
}

export function applyOfflineProgress(state, elapsedSeconds) {
  if (elapsedSeconds < MIN_OFFLINE_SECONDS) return null;
  const seconds = Math.min(elapsedSeconds, offlineCapSeconds(state));
  const rate = offlineRate(state);
  const gains = {};
  for (const resource of RESOURCES) {
    const amount = stateRate(state, resource) * seconds * rate;
    state.resources[resource] += amount;
    state.lifetime[resource] += amount;
    gains[resource] = amount;
  }
  applyGenerators(state, seconds * rate);
  checkAchievements(state);
  return { gains, seconds, away: elapsedSeconds, rate };
}

export function tick(state, dt) {
  for (const resource of RESOURCES) {
    const amount = stateRate(state, resource) * dt;
    state.resources[resource] += amount;
    state.lifetime[resource] += amount;
  }
  applyGenerators(state, dt);
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

// Shared by loading from localStorage and importing a pasted code: fills a saved object in from the
// defaults so saves from older versions keep working. Null when it doesn't look like a save at all.
function normalizeSave(parsed) {
  const looksValid =
    parsed &&
    typeof parsed === 'object' &&
    parsed.resources &&
    parsed.lifetime &&
    Array.isArray(parsed.unlocked);
  if (!looksValid) return null;
  const base = createInitialState();
  return {
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
    shop: normalizeShop(parsed.shop, base.shop),
  };
}

// A pasted or hand-edited save can hold anything, so the shop is clamped to what exists.
function normalizeShop(saved, base) {
  const shop = { ...base, ...(saved || {}) };
  const clamp = (value, max) => Math.min(max, Math.max(0, Math.floor(Number(value)) || 0));
  shop.holdLevel = clamp(shop.holdLevel, OFFLINE_CAP_HOURS.length - 1);
  shop.tidesLevel = clamp(shop.tidesLevel, OFFLINE_RATES.length - 1);
  shop.ballast = clamp(shop.ballast, Infinity);
  shop.palettes = (Array.isArray(shop.palettes) ? shop.palettes : []).filter((id) => PALETTES[id]);
  if (shop.palette !== 'default' && !shop.palettes.includes(shop.palette)) shop.palette = 'default';
  return shop;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const state = raw ? normalizeSave(JSON.parse(raw)) : null;
    if (!state) return { state: createInitialState(), offline: null };
    const elapsedSeconds = state.lastSaved ? Math.max(0, (Date.now() - state.lastSaved) / 1000) : 0;
    const offline = applyOfflineProgress(state, elapsedSeconds);
    // A save migrated from before achievements existed may already meet several
    // conditions; credit them now rather than on the next frame's tick.
    checkAchievements(state);
    return { state, offline };
  } catch {
    return { state: createInitialState(), offline: null };
  }
}

// The save as one unbroken base64 string, stamped with the time so any offline credit on the
// other end counts from the moment of export.
export function encodeSave(state) {
  return btoa(JSON.stringify({ ...state, lastSaved: Date.now() }));
}

export function decodeSave(text) {
  try {
    const state = normalizeSave(JSON.parse(atob(text.trim())));
    if (state) checkAchievements(state);
    return state;
  } catch {
    return null;
  }
}

// One rule for every kind of gap between frames. A short gap is ordinary production; a minute or
// more means the tab was hidden, the machine slept, or the game was closed, and is treated as time
// away (offline rate, capped). Returns the away summary ({ gains, seconds counted, away = the real
// time away }), or null for ordinary production.
export function advance(state, elapsedSeconds) {
  if (elapsedSeconds >= MIN_OFFLINE_SECONDS) return applyOfflineProgress(state, elapsedSeconds);
  tick(state, elapsedSeconds);
  return null;
}

// How hard an unlock lands, from 0 to 1: it grows as the map fills, and the first tile of a new
// zone is the biggest moment in the game. Call after the tile is in state.unlocked.
export function unlockIntensity(state, tile) {
  if (tile.zone !== ZONES[0].id) {
    const inZone = state.unlocked.filter((id) => TILES.find((t) => t.id === id)?.zone === tile.zone).length;
    if (inZone === 1) return 1;
  }
  const progress = Math.max(0, Math.min(1, (state.unlocked.length - 1) / (TOTAL_TILE_COUNT - 1)));
  return 0.2 + 0.6 * progress;
}

export function levelUpIntensity(newLevel) {
  return 0.25 + (0.3 * (newLevel - 1)) / (MAX_LEVEL - 1);
}
