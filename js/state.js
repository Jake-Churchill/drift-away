import { TILES, TILE_BY_ID, TILE_NEARBY, TILE_NEIGHBORS } from './tiles.js';
import { ZONES } from './zones.js';
import { PALETTES } from './palettes.js';

const BASE_RESOURCES = ['fish', 'kelp', 'driftwood', 'crops'];
// Zone 3's own resources. Folded into RESOURCES (not kept separate) so they follow the exact same
// rules as the base 4 everywhere that iterates RESOURCES: HUD bar + rate line, prestige upgrade
// rows, baron/magnate lifetime achievements, and counting toward prestige tokens earned.
export const GOODS = ['planks', 'kelp_rope', 'bread'];
export const RESOURCES = [...BASE_RESOURCES, ...GOODS];
// v2 is the map rework (blank bridges, 3-hex clusters): the map's layout, clusters and zones changed,
// so a v1 save's unlocks and levels can't carry over. A new key leaves the old save untouched in
// storage rather than erasing it.
// v3 is the bridges rework (dense connectors, single-tile inter-biome bridges): the blank set and
// the three crossings changed, so a v2 save's unlocks can't carry over. A new key leaves the v2 key
// untouched in storage, same pattern v1->v2 used.
export const SAVE_KEY = 'driftaway_save_v3';
const SAVE_VERSION = 3;

// Membership in `state.unlocked` is asked per tile, per frame, from many places, so on a map of a few
// hundred tiles a linear `includes` scan dominates the frame. The array stays the saved source of
// truth (tiles are only ever appended, or the whole array is replaced on prestige/restart/import);
// this Set is rebuilt only when the array's identity or length changes.
const unlockedSets = new WeakMap();
export function isUnlocked(unlockedIds, tileId) {
  let entry = unlockedSets.get(unlockedIds);
  if (!entry || entry.length !== unlockedIds.length) {
    entry = { length: unlockedIds.length, set: new Set(unlockedIds) };
    unlockedSets.set(unlockedIds, entry);
  }
  return entry.set.has(tileId);
}

// Tiles by kind, computed once: the per-frame rate maths walks these, not every tile on the map.
const RATE_TILES = TILES.filter((t) => t.kind !== 'blank' && t.kind !== 'bridge');
const BOOSTER_TILES = TILES.filter((t) => t.kind === 'booster');
const PRODUCER_TILES = TILES.filter((t) => t.kind === 'producer');
const GENERATOR_TILES = TILES.filter((t) => t.kind === 'generator');
const SOURCE_TILES = TILES.filter((t) => t.kind === 'producer' || t.kind === 'generator');

// 'kelp_rope' -> 'kelp rope' -> 'Kelp Rope', for achievement names/descriptions. A no-op for
// every other resource, which has no underscore to begin with.
function resourceLabel(resource) {
  return resource.split('_').join(' ');
}
function resourceTitle(resource) {
  return resourceLabel(resource).replace(/\b\w/g, (c) => c.toUpperCase());
}

const STEP_MULTIPLIER = { 2: 1, 3: 2.5 };
export const MAX_LEVEL = Math.max(...Object.keys(STEP_MULTIPLIER).map(Number));
const PRODUCER_UPGRADE_BASE = 30;
const BOOSTER_UPGRADE_BASE = 6;

export function createInitialPrestige() {
  return {
    tokens: 0,
    upgrades: Object.fromEntries(RESOURCES.map((r) => [r, 0])),
    headStart: 0,
    hold: 0,
    tides: 0,
    ballast: 0,
    count: 0,
  };
}

// What gold has bought -- cosmetics only. Like gold itself it survives a prestige. Deeper Hold,
// Steady Tides and Ballast moved to the prestige tree (state.prestige), bought with tokens instead.
export function createInitialShop() {
  return { palette: 'default', palettes: [] };
}

export function createInitialState() {
  const resources = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  const lifetime = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  const unlocked = TILES.filter((t) => t.unlock.type === 'start').map((t) => t.id);
  return {
    version: SAVE_VERSION,
    resources,
    lifetime,
    unlocked,
    levels: {},
    prestige: createInitialPrestige(),
    shop: createInitialShop(),
    gold: 0,
    achievements: [],
    // One switch per generator family (keyed by GOODS, which is exactly the 3 families), so a
    // player who's about to run short on an input a generator eats (e.g. driftwood) can pause
    // that whole family instead of it silently outbidding them for the pool every tick.
    generatorsEnabled: Object.fromEntries(GOODS.map((g) => [g, true])),
  };
}

export function setGeneratorEnabled(state, family, enabled) {
  state.generatorsEnabled[family] = enabled;
}

export function levelMultiplier(level) {
  return 1 + (level - 1) * 0.5;
}

// The Abyssal Trench's mechanic (zone 4): one of its producers runs at half rate until one of its
// boosters is unlocked next to it -- within two hexes, which is as close as two clusters ever get
// (any of the six archetypes, not one dedicated tile: with only one of each in the zone, a single
// light source would leave most of it permanently dim). Every other tile (all of zones 1-3, and the
// trench's own boosters) is always "lit".
const DARKNESS_PENALTY = 0.5;
export function isLit(tile, unlockedIds) {
  if (tile.zone !== 'zone4' || tile.kind !== 'producer') return true;
  return (TILE_NEARBY.get(tile.id) || []).some((id) => {
    if (!isUnlocked(unlockedIds, id)) return false;
    const nearby = TILE_BY_ID.get(id);
    return nearby?.zone === 'zone4' && nearby.kind === 'booster';
  });
}
function darknessFactor(tile, unlockedIds) {
  return isLit(tile, unlockedIds) ? 1 : DARKNESS_PENALTY;
}

function boostPercentFor(resource, unlockedIds, levels = {}) {
  return BOOSTER_TILES
    .filter((t) => isUnlocked(unlockedIds, t.id))
    .flatMap((t) => t.boosts.map((b) => ({ ...b, level: levels[t.id] || 1 })))
    .filter((b) => b.resource === resource)
    .reduce((sum, b) => sum + b.percent * levelMultiplier(b.level), 0);
}

export function effectiveRate(resource, unlockedIds, levels = {}, prestigeUpgrades = {}, ballastPercent = 0) {
  const baseSum = PRODUCER_TILES
    .filter((t) => isUnlocked(unlockedIds, t.id) && t.produces === resource)
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
  return effectiveRate(resource, state.unlocked, state.levels, state.prestige.upgrades, state.prestige.ballast);
}

// Where a resource's income comes from, for the HUD: producer output, the boosters stacked on it,
// and the prestige bonus. `total` is exactly effectiveRate; `used` is what running generators take
// of it, and `net` what actually lands in the stock.
export function rateBreakdown(state, resource) {
  let base = 0;
  let boostPercent = 0;
  const boosters = [];
  // Computed once (not per-tile below): resolves the scarcity throttle every unlocked generator
  // is currently running at, so a zone-3 resource's HUD rate reflects actual current income, not
  // the unthrottled capacity. The generator's own boost is applied to `base` below just like a
  // producer's darkness factor is, and the *same* boost is folded into `total` again via
  // `boostPercent` -- fine, since generatorThrottle/generatorScarcityFactors don't themselves
  // depend on this resource's boost, only on level+boost of whatever's consuming each input.
  const generatorFactors = generatorScarcityFactors(state);
  for (const tile of RATE_TILES) {
    if (!isUnlocked(state.unlocked, tile.id)) continue;
    const multiplier = levelMultiplier(getLevel(state, tile.id));
    if (tile.kind === 'producer' && tile.produces === resource) base += tile.rate * multiplier * darknessFactor(tile, state.unlocked);
    if (tile.kind === 'generator' && tile.produces === resource && state.generatorsEnabled[tile.family] !== false) {
      base += tile.rate * multiplier * generatorThrottle(tile, generatorFactors);
    }
    if (tile.kind === 'booster') {
      for (const b of tile.boosts) {
        if (b.resource !== resource) continue;
        boostPercent += b.percent * multiplier;
        boosters.push({ name: tile.name, percent: b.percent * multiplier });
      }
    }
  }
  const prestigePercent = PRESTIGE_UPGRADE_PERCENT * (state.prestige.upgrades[resource] || 0);
  const ballastPercent = state.prestige.ballast;
  const total = base * (1 + boostPercent / 100) * (1 + prestigePercent / 100) * (1 + ballastPercent / 100);
  const used = generatorFlows(state, generatorFactors).used[resource] || 0;
  return { base, boostPercent, boosters, prestigePercent, ballastPercent, total, used, net: total - used };
}

// Every resource's net change per second right now: producer income plus what generators make,
// minus what they use. Unlock timers wait on this.
function netRates(state) {
  const { used, made } = generatorFlows(state);
  return Object.fromEntries(RESOURCES.map((r) => [r, stateRate(state, r) + (made[r] || 0) - (used[r] || 0)]));
}

// True when nothing the booster affects has a producer yet, so unlocking it would change nothing.
// A booster is idle if nothing it boosts exists yet. Checked by existence (an unlocked producer
// or generator targeting the resource), not by current rate: a freshly-unlocked generator with
// nothing to consume yet still has a real 0 throttled rate, but it isn't "idle" in the sense this
// is asking about -- it already exists and will produce as soon as its input income catches up.
export function boosterIsIdle(state, tile) {
  return tile.boosts.every(
    (b) => !SOURCE_TILES.some((t) => isUnlocked(state.unlocked, t.id) && t.produces === b.resource)
  );
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
  if (isUnlocked(state.unlocked, tile.id)) return true;
  return TILE_NEIGHBORS.get(tile.id).some((id) => isUnlocked(state.unlocked, id));
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

// How close a locked tile is to being unlockable, and how long that takes at current net rates.
// `blockedBy` names a needed resource with no net income.
export function unlockEta(state, tile, rates = netRates(state)) {
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
    const rate = rates[resource];
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
  const rates = netRates(state);
  return TILES.filter((t) => !isUnlocked(state.unlocked, t.id) && isDiscovered(t, state)).map((tile) => ({
    tile,
    eta: unlockEta(state, tile, rates),
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

// A blank or a bridge has nothing to level, so it counts as maxed the moment it is unlocked -- which keeps
// completionCount, the "max out every tile" achievements and the upgrade list working unchanged.
export function getLevel(state, tileId) {
  const kind = TILE_BY_ID.get(tileId)?.kind;
  if (kind === 'blank' || kind === 'bridge') return MAX_LEVEL;
  return state.levels[tileId] || 1;
}

export const TOTAL_TILE_COUNT = TILES.length;

export function completionCount(state) {
  return TILES.filter((t) => isUnlocked(state.unlocked, t.id) && getLevel(state, t.id) >= MAX_LEVEL).length;
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
    condition: (state) => state.unlocked.some((id) => TILE_BY_ID.get(id)?.zone === 'zone2'),
  },
  {
    id: 'frozen-reach-complete',
    name: 'Master of the Frozen Reach',
    description: 'Max out every tile in the Frozen Reach',
    reward: 8,
    condition: (state) =>
      TILES.filter((t) => t.zone === 'zone2').every(
        (t) => isUnlocked(state.unlocked, t.id) && getLevel(state, t.id) >= MAX_LEVEL
      ),
  },
  {
    id: 'abyssal-trench-discovered',
    name: 'The Abyssal Trench',
    description: 'Unlock your first tile in the Abyssal Trench',
    reward: 3,
    condition: (state) => state.unlocked.some((id) => TILE_BY_ID.get(id)?.zone === 'zone4'),
  },
  {
    id: 'abyssal-trench-complete',
    name: 'Master of the Abyss',
    description: 'Max out every tile in the Abyssal Trench',
    reward: 10,
    condition: (state) =>
      TILES.filter((t) => t.zone === 'zone4').every(
        (t) => isUnlocked(state.unlocked, t.id) && getLevel(state, t.id) >= MAX_LEVEL
      ),
  },
  {
    id: 'timberline-coast-discovered',
    name: 'The Timberline Coast',
    description: 'Unlock your first tile in the Timberline Coast',
    reward: 3,
    condition: (state) => state.unlocked.some((id) => TILE_BY_ID.get(id)?.zone === 'zone3'),
  },
  {
    id: 'timberline-coast-complete',
    name: 'Master of the Coast',
    description: 'Max out every tile in the Timberline Coast',
    reward: 10,
    condition: (state) =>
      TILES.filter((t) => t.zone === 'zone3').every(
        (t) => isUnlocked(state.unlocked, t.id) && getLevel(state, t.id) >= MAX_LEVEL
      ),
  },
];

// Tiered follow-ups, so there is always a next one to reach: bigger lifetime totals per resource,
// tile counts, and how many times the player has prestiged.
for (const resource of RESOURCES) {
  const name = resourceTitle(resource);
  for (const [suffix, title, target, reward] of [['baron', 'Baron', 25000, 2], ['magnate', 'Magnate', 100000, 3]]) {
    ACHIEVEMENTS.push({
      id: `${resource}-${suffix}`,
      name: `${name} ${title}`,
      description: `Earn ${target.toLocaleString('en-US')} lifetime ${resourceLabel(resource)}`,
      reward,
      condition: (state) => state.lifetime[resource] >= target,
    });
  }
}
// Milestones are a share of the whole map, not fixed counts, so they stay meaningful however many
// tiles the map has (a tile here is any unlocked hex-group: a cluster or a blank bridge).
for (const [percent, name, reward] of [[5, 'Small Fleet', 1], [10, 'Growing Raft', 2], [25, 'Home Waters', 2], [40, 'Far Horizons', 3], [50, 'Two Seas Charted', 4], [75, 'Three Seas Charted', 5], [100, 'The Whole Map', 6]]) {
  const count = Math.ceil((TOTAL_TILE_COUNT * percent) / 100);
  ACHIEVEMENTS.push({
    id: `tiles-${percent}`,
    name,
    description: percent === 100 ? `Unlock all ${count} tiles` : `Unlock ${count} tiles (${percent}% of the map)`,
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
export const PRESTIGE_MIN_TOKENS = 1; // below this, a prestige would earn nothing worth resetting for
export const PRESTIGE_MIN_LIFETIME = PRESTIGE_MIN_TOKENS ** 2 * PRESTIGE_TOKEN_DIVISOR; // the same floor, in lifetime resources

export function lifetimeTotal(state) {
  return RESOURCES.reduce((sum, r) => sum + state.lifetime[r], 0);
}

// Square root, so each prestige makes the next run a little easier instead of one full clear
// paying enough to trivialize every run after it; later areas can then ask for a lot of prestige.
export function prestigeTokensEarned(state) {
  return Math.floor(Math.sqrt(lifetimeTotal(state) / PRESTIGE_TOKEN_DIVISOR));
}

export function doPrestige(state) {
  const tokensEarned = prestigeTokensEarned(state);
  if (tokensEarned < PRESTIGE_MIN_TOKENS) return null;
  const nextState = createInitialState();
  nextState.prestige = {
    ...state.prestige,
    tokens: state.prestige.tokens + tokensEarned,
    upgrades: { ...state.prestige.upgrades },
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

export function buyTreeHold(state) {
  const level = state.prestige.hold;
  if (level >= HOLD_COSTS.length || state.prestige.tokens < HOLD_COSTS[level]) return false;
  state.prestige.tokens -= HOLD_COSTS[level];
  state.prestige.hold += 1;
  return true;
}

// Locked until Deeper Hold is fully maxed -- the one place this rework adds a dependency between
// two things that used to be independent gold purchases.
export function buyTreeTides(state) {
  const level = state.prestige.tides;
  const holdMaxed = state.prestige.hold >= HOLD_COSTS.length;
  if (!holdMaxed || level >= TIDES_COSTS.length || state.prestige.tokens < TIDES_COSTS[level]) return false;
  state.prestige.tokens -= TIDES_COSTS[level];
  state.prestige.tides += 1;
  return true;
}

export function buyTreeBallast(state) {
  const cost = ballastCost(state);
  if (state.prestige.tokens < cost) return false;
  state.prestige.tokens -= cost;
  state.prestige.ballast += 1;
  return true;
}

// Free tiles for a new run: the ones a player would have unlocked first. Skips boosters that have
// nothing to boost yet, so the free tiles are ones that do something. Blanks and bridges never count
// toward `count` -- they're only the way to the next cluster, so they're granted as needed.
function grantHeadStart(state, count) {
  let granted = 0;
  while (granted < count) {
    const all = lockedTileStatuses(state);
    const useful = all.filter((x) =>
      x.tile.kind !== 'blank' && x.tile.kind !== 'bridge' && (x.tile.kind !== 'booster' || !boosterIsIdle(state, x.tile))
    );
    if (useful.length > 0) {
      state.unlocked.push(nextUnlock(state, useful).tile.id);
      granted++;
      continue;
    }
    const connectors = all.filter((x) => x.tile.kind === 'blank' || x.tile.kind === 'bridge');
    if (connectors.length > 0) {
      state.unlocked.push(nextUnlock(state, connectors).tile.id);
      continue;
    }
    if (all.length === 0) break;
    state.unlocked.push(nextUnlock(state, all).tile.id);
    granted++;
  }
}

// ---------------------------------------------------------------------------------------------
// Prestige tree comfort and efficiency nodes, bought with tokens: Deeper Hold, Steady Tides (locked
// until Deeper Hold is maxed) and Ballast (a small, endless production bonus).
const HOLD_COSTS = [6, 12, 20];
const TIDES_COSTS = [8, 16];

export function ballastCost(state) {
  return 4 + 2 * state.prestige.ballast;
}

// Harbor Shop: what gold buys -- looks (palettes). The rows the shop screen shows. `status` is one
// of buy / poor (can't afford yet) / owned / active (a look that is on).
export function shopCatalog(state) {
  const { shop, gold } = state;
  const row = (id, section, name, detail, cost, status, extra = {}) => ({ id, section, name, detail, cost, status, ...extra });
  const priced = (cost) => (gold >= cost ? 'buy' : 'poor');
  const rows = [];

  const look = (id, name, detail, cost, swatch) => {
    const active = shop.palette === id;
    const owned = shop.palettes.includes(id) || id === 'default';
    return row(`palette:${id}`, 'look', name, detail, cost, active ? 'active' : owned ? 'owned' : priced(cost), { swatch });
  };
  if (shop.palettes.length > 0) rows.push(look('default', 'Classic', 'The original look', 0, '#2e7ba8'));
  for (const [id, palette] of Object.entries(PALETTES)) rows.push(look(id, palette.name, palette.blurb, palette.cost, palette.swatch));
  return rows;
}

// Every prestige tree node's current level, cost and status in one place, mirroring shopCatalog --
// js/ui.js stays a pure renderer with no purchase logic of its own.
export function prestigeTreeCatalog(state) {
  const { tokens } = state.prestige;
  const rows = [];
  for (const resource of RESOURCES) {
    const level = state.prestige.upgrades[resource];
    const cost = prestigeUpgradeCost(level);
    rows.push({ id: resource, branch: 'production', name: resourceLabel(resource), level, cost, status: tokens >= cost ? 'buy' : 'poor' });
  }
  const holdLevel = state.prestige.hold;
  const holdMaxed = holdLevel >= HOLD_COSTS.length;
  rows.push({
    id: 'hold', branch: 'comfort', name: 'Deeper hold', level: holdLevel, maxLevel: HOLD_COSTS.length,
    cost: holdMaxed ? 0 : HOLD_COSTS[holdLevel],
    status: holdMaxed ? 'maxed' : tokens >= HOLD_COSTS[holdLevel] ? 'buy' : 'poor',
  });
  const tidesLevel = state.prestige.tides;
  const tidesMaxed = tidesLevel >= TIDES_COSTS.length;
  rows.push({
    id: 'tides', branch: 'comfort', name: 'Steady tides', level: tidesLevel, maxLevel: TIDES_COSTS.length,
    cost: tidesMaxed ? 0 : TIDES_COSTS[tidesLevel],
    status: tidesMaxed ? 'maxed' : !holdMaxed ? 'locked' : tokens >= TIDES_COSTS[tidesLevel] ? 'buy' : 'poor',
  });
  const ballastLevel = state.prestige.ballast;
  const ballastPrice = ballastCost(state);
  rows.push({ id: 'ballast', branch: 'efficiency', name: 'Ballast', level: ballastLevel, cost: ballastPrice, status: tokens >= ballastPrice ? 'buy' : 'poor' });
  const hsLevel = state.prestige.headStart;
  const hsMaxed = hsLevel >= HEAD_START_MAX_LEVEL;
  rows.push({
    id: 'headStart', branch: 'headstart', name: 'Head start', level: hsLevel, maxLevel: HEAD_START_MAX_LEVEL,
    cost: hsMaxed ? 0 : headStartCost(hsLevel),
    status: hsMaxed ? 'maxed' : tokens >= headStartCost(hsLevel) ? 'buy' : 'poor',
  });
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
  if (!isUnlocked(state.unlocked, tile.id) || level >= MAX_LEVEL) return false;
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
    if (!isUnlocked(state.unlocked, tile.id)) continue;
    const level = getLevel(state, tile.id);
    if (level >= MAX_LEVEL) continue;
    const cost = levelUpCost(tile, level + 1);
    const fraction = costProgressFraction(cost, state);
    rows.push({ tile, level, cost, fraction, ready: fraction >= 1 });
  }
  return rows.sort((a, b) => b.ready - a.ready || (a.ready ? 0 : b.fraction - a.fraction));
}

// Time away. The cap and the rate start at 8 hours and 50% and are raised in the prestige tree.
export const OFFLINE_CAP_HOURS = [8, 12, 16, 24];
const OFFLINE_RATES = [0.5, 0.65, 0.8];
const MIN_OFFLINE_SECONDS = 60;

export function offlineCapSeconds(state) {
  return OFFLINE_CAP_HOURS[state.prestige.hold] * 60 * 60;
}

export function offlineRate(state) {
  return OFFLINE_RATES[state.prestige.tides];
}

// Zone 3's mechanic: a generator (kind 'generator') doesn't produce from nothing like every
// other tile -- it consumes existing resources to make a new one (planks/kelp_rope/bread). It
// only ever takes a share of its inputs' producer income (GENERATOR_INCOME_SHARE), never the
// stockpile, so leaving generators on can't stall unlocks. If unlocked generators together want
// more of an input than that share, every one of them drawing on it is throttled by the same
// fraction rather than first-come-first-served, and each generator's own output is capped by
// whichever of its inputs is scarcest. A generator with two inputs can end up drawing slightly
// more of its non-limiting input than its (lower, capped) output actually needed -- a known
// first-pass simplification; see docs/superpowers/specs/2026-09-24-drift-away-zone4-design.md.
// A disabled family's generators are excluded outright -- they neither draw on the shared pool
// nor count toward it being scarce for everyone else still running.
function generatorTiles(state) {
  return GENERATOR_TILES.filter((t) => isUnlocked(state.unlocked, t.id) && state.generatorsEnabled[t.family] !== false);
}

function generatorMultiplier(tile, unlockedIds, levels) {
  const boostPercent = boostPercentFor(tile.produces, unlockedIds, levels);
  return levelMultiplier(levels[tile.id] || 1) * (1 + boostPercent / 100);
}

const GENERATOR_INCOME_SHARE = 0.5;

// Comparing demand with income (a rate), not with the stock, also means no step -- however long --
// can draw more than was earned during it.
function generatorScarcityFactors(state) {
  const generators = generatorTiles(state);
  const inputResources = [...new Set(generators.flatMap((t) => Object.keys(t.consumes)))];
  const factors = {};
  for (const resource of inputResources) {
    const desired = generators.reduce((sum, t) => {
      const rate = t.consumes[resource];
      return rate ? sum + rate * generatorMultiplier(t, state.unlocked, state.levels) : sum;
    }, 0);
    const available = GENERATOR_INCOME_SHARE * stateRate(state, resource);
    factors[resource] = desired > 0 ? Math.min(1, available / desired) : 1;
  }
  return factors;
}

// The prestige lane and Ballast raise a generator's output without raising what it uses, the same
// way they raise a producer's output.
function productionBonus(state, resource) {
  return (1 + (PRESTIGE_UPGRADE_PERCENT * (state.prestige.upgrades[resource] || 0)) / 100) * (1 + state.prestige.ballast / 100);
}

// What every running generator uses and makes per second right now.
function generatorFlows(state, factors = generatorScarcityFactors(state)) {
  const used = {};
  const made = {};
  for (const tile of generatorTiles(state)) {
    const multiplier = generatorMultiplier(tile, state.unlocked, state.levels);
    const throttle = generatorThrottle(tile, factors);
    for (const [resource, rate] of Object.entries(tile.consumes)) {
      used[resource] = (used[resource] || 0) + rate * multiplier * throttle;
    }
    made[tile.produces] = (made[tile.produces] || 0) + tile.rate * multiplier * throttle * productionBonus(state, tile.produces);
  }
  return { used, made };
}

function generatorThrottle(tile, factors) {
  const inputs = Object.keys(tile.consumes);
  return inputs.length === 0 ? 1 : Math.min(...inputs.map((r) => factors[r]));
}

// A generator's current per-second output, throttled by whichever input is scarcest right now.
// Zero outright while its family is turned off, same as if it had no input at all.
export function generatorRate(state, tile) {
  if (state.generatorsEnabled[tile.family] === false) return 0;
  const throttle = generatorThrottle(tile, generatorScarcityFactors(state));
  return generatorFullRate(state, tile) * throttle;
}

// The same, ignoring scarcity -- what the generator would produce with a full input pool.
export function generatorFullRate(state, tile) {
  return tile.rate * generatorMultiplier(tile, state.unlocked, state.levels) * productionBonus(state, tile.produces);
}

// Returns the net change to each resource this call (goods made, inputs used), so offline progress
// can fold it into its gains summary the same way it does for the base 4.
function applyGenerators(state, dt) {
  const { used, made } = generatorFlows(state);
  const changes = {};
  for (const [resource, rate] of Object.entries(used)) {
    state.resources[resource] -= rate * dt;
    changes[resource] = -rate * dt;
  }
  for (const [resource, rate] of Object.entries(made)) {
    state.resources[resource] += rate * dt;
    state.lifetime[resource] += rate * dt;
    changes[resource] = (changes[resource] || 0) + rate * dt;
  }
  return changes;
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
  for (const [resource, amount] of Object.entries(applyGenerators(state, seconds * rate))) {
    gains[resource] = (gains[resource] || 0) + amount;
  }
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
  if (isUnlocked(state.unlocked, tile.id)) return false;
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

// A pasted, hand-edited or damaged save can hold anything where a number belongs (strings,
// Infinity, negatives -- old saves written while generators could overdraw went negative), and a
// string would turn every `+=` into concatenation. Anything that isn't a finite positive number is 0.
function count(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function wholeNumber(value, max = Infinity) {
  return Math.min(max, Math.floor(count(value)));
}

function counts(saved) {
  return Object.fromEntries(RESOURCES.map((r) => [r, count(saved?.[r])]));
}

// Shared by loading from localStorage and importing a pasted code: fills a v3 save in from the
// defaults, so any field it lacks gets its starting value. Null when it isn't a v3 save (any other
// version, including every v1 and v2 save, is rejected) or doesn't look like a save at all.
function normalizeSave(parsed) {
  const looksValid =
    parsed &&
    typeof parsed === 'object' &&
    parsed.version === SAVE_VERSION &&
    parsed.resources &&
    parsed.lifetime &&
    Array.isArray(parsed.unlocked);
  if (!looksValid) return null;
  const base = createInitialState();
  const knownTile = (id) => TILE_BY_ID.has(id);
  const levels = Object.entries(parsed.levels || {}).filter(([id]) => knownTile(id));
  return {
    ...base,
    ...parsed,
    resources: counts(parsed.resources),
    lifetime: counts(parsed.lifetime),
    unlocked: [...new Set([...base.unlocked, ...parsed.unlocked.filter(knownTile)])],
    levels: Object.fromEntries(levels.map(([id, level]) => [id, Math.max(1, wholeNumber(level, MAX_LEVEL))])),
    prestige: normalizePrestige(isObject(parsed.prestige) ? parsed.prestige : {}, parsed.shop || {}),
    gold: wholeNumber(parsed.gold),
    achievements: Array.isArray(parsed.achievements) ? parsed.achievements.filter((id) => typeof id === 'string') : [],
    shop: normalizeShop(parsed.shop, base.shop),
    // A save from before this toggle existed has no key here at all, so the merge leaves every
    // family at the base's default of enabled.
    generatorsEnabled: { ...base.generatorsEnabled, ...(parsed.generatorsEnabled || {}) },
    lastSaved: Number.isFinite(parsed.lastSaved) ? parsed.lastSaved : undefined,
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object';
}

// A save from before the prestige tree rework kept Deeper Hold, Steady Tides and Ballast in `shop`,
// bought with gold; this rework moves them into `prestige`, bought with tokens. A legacy save's
// `shop.holdLevel`/`tidesLevel`/`ballast` is carried into the new `prestige.hold`/`tides`/`ballast`
// fields so a player doesn't lose progress they already paid gold for. A save already in the new
// shape (no `shop.holdLevel`) is untouched by the `??` fallback below.
function normalizePrestige(parsedPrestige, legacyShop) {
  return {
    tokens: wholeNumber(parsedPrestige.tokens),
    upgrades: Object.fromEntries(RESOURCES.map((r) => [r, wholeNumber(parsedPrestige.upgrades?.[r])])),
    headStart: wholeNumber(parsedPrestige.headStart, HEAD_START_MAX_LEVEL),
    hold: wholeNumber(parsedPrestige.hold ?? legacyShop.holdLevel, OFFLINE_CAP_HOURS.length - 1),
    tides: wholeNumber(parsedPrestige.tides ?? legacyShop.tidesLevel, OFFLINE_RATES.length - 1),
    ballast: wholeNumber(parsedPrestige.ballast ?? legacyShop.ballast),
    count: wholeNumber(parsedPrestige.count),
  };
}

// A pasted or hand-edited save can hold anything, so the shop is clamped to what exists. Only
// cosmetics live here now -- Deeper Hold, Steady Tides and Ballast moved into `prestige` (see
// normalizePrestige above).
function normalizeShop(saved, base) {
  const shop = { palette: saved?.palette ?? base.palette, palettes: saved?.palettes };
  shop.palettes = (Array.isArray(shop.palettes) ? shop.palettes : []).filter((id) => PALETTES[id]);
  if (shop.palette !== 'default' && !shop.palettes.includes(shop.palette)) shop.palette = 'default';
  return shop;
}

export function loadState() {
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
    const state = raw && normalizeSave(JSON.parse(raw));
    if (state) {
      const elapsedSeconds = state.lastSaved ? Math.max(0, (Date.now() - state.lastSaved) / 1000) : 0;
      const offline = applyOfflineProgress(state, elapsedSeconds);
      // A save migrated from before achievements existed may already meet several
      // conditions; credit them now rather than on the next frame's tick.
      checkAchievements(state);
      return { state, offline };
    }
  } catch {
    // unreadable: falls through to a fresh game below
  }
  // Copied aside first, so the fresh game's first autosave doesn't destroy a save we couldn't read.
  if (raw) {
    try {
      localStorage.setItem(`${SAVE_KEY}_backup`, raw);
    } catch {
      // storage full or blocked: nothing more to do
    }
  }
  return { state: createInitialState(), offline: null };
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
    const inZone = state.unlocked.filter((id) => TILE_BY_ID.get(id)?.zone === tile.zone).length;
    if (inZone === 1) return 1;
  }
  const progress = Math.max(0, Math.min(1, (state.unlocked.length - 1) / (TOTAL_TILE_COUNT - 1)));
  return 0.2 + 0.6 * progress;
}

export function levelUpIntensity(newLevel) {
  return 0.25 + (0.3 * (newLevel - 1)) / (MAX_LEVEL - 1);
}
