import assert from 'node:assert/strict';
import { TILES, TILE_NEIGHBORS } from '../js/tiles.js';
import {
  ACHIEVEMENTS,
  advance,
  applyOfflineProgress,
  ballastCost,
  boosterGain,
  boosterIsIdle,
  buyHeadStart,
  buyPrestigeUpgrade,
  buyShopItem,
  checkAchievements,
  completionCount,
  createInitialState,
  decodeSave,
  doPrestige,
  effectiveRate,
  effectiveTileRate,
  encodeSave,
  generatorFullRate,
  generatorRate,
  getLevel,
  HEAD_START_MAX_LEVEL,
  headStartCost,
  isDiscovered,
  isEligible,
  isFullyComplete,
  isLevelUpEligible,
  isLit,
  levelUpCost,
  levelUpIntensity,
  levelUpTile,
  loadState,
  lockedTileStatuses,
  MAX_LEVEL,
  nextUnlock,
  offlineCapSeconds,
  offlineRate,
  prestigeTokensEarned,
  prestigeUpgradeCost,
  rateBreakdown,
  SAVE_KEY,
  shopCatalog,
  tick,
  TOTAL_TILE_COUNT,
  unlockEta,
  unlockIntensity,
  unlockTile,
  upgradeList,
} from '../js/state.js';

// --- Tile data integrity ---

assert.equal(TILES.length, 144, 'expected exactly 144 tiles (36 zone-1 + 36 zone-2 + 36 zone-3 + 36 zone-4)');

const ids = TILES.map((t) => t.id);
assert.equal(new Set(ids).size, TILES.length, 'tile ids must be unique');

const positions = TILES.map((t) => `${t.gridPos.row},${t.gridPos.col}`);
assert.equal(new Set(positions).size, TILES.length, 'grid positions must be unique');
for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 6; col++) {
    assert.ok(positions.includes(`${row},${col}`), `missing tile at (${row},${col})`);
  }
  for (let col = 6; col < 12; col++) {
    assert.ok(positions.includes(`${row},${col}`), `missing tile at (${row},${col})`);
  }
}

const startTiles = TILES.filter((t) => t.unlock.type === 'start');
assert.equal(startTiles.length, 1, 'expected exactly 1 starting tile');
assert.deepEqual(
  startTiles.map((t) => t.id),
  ['driftwood_start'],
  'driftwood_start is the sole starting tile'
);

const familyCounts = TILES.reduce((counts, t) => {
  counts[t.family] = (counts[t.family] || 0) + 1;
  return counts;
}, {});
assert.deepEqual(
  familyCounts,
  { fish: 24, kelp: 24, driftwood: 21, crops: 21, booster: 24, planks: 10, kelp_rope: 10, bread: 10 },
  'zone 4 adds 10 each of planks/kelp_rope/bread plus 6 more boosters (18+6=24), no new fish/kelp/driftwood/crops tiles'
);

console.log('tile data tests passed');

// --- TILE_NEIGHBORS ---

assert.equal(TILE_NEIGHBORS.size, TILES.length, 'every tile has a neighbor-list entry');

for (const [id, neighbors] of TILE_NEIGHBORS) {
  for (const neighborId of neighbors) {
    assert.ok(
      TILE_NEIGHBORS.get(neighborId).includes(id),
      `adjacency must be symmetric: ${id} <-> ${neighborId}`
    );
  }
}

assert.deepEqual(
  [...TILE_NEIGHBORS.get('driftwood_start')].sort(),
  [
    'booster_windmill',
    'crops_soil_barge',
    'fish_trawling_raft',
    'kelp_abyssal_forest',
    'kelp_reef',
    'kelp_seaweed_raft',
  ],
  'driftwood_start (2,3) has exactly these 6 neighbors'
);

assert.deepEqual(
  [...TILE_NEIGHBORS.get('fish_start')].sort(),
  [
    'booster_net_weavers',
    'crops_floating_orchard',
    'kelp_floating_garden',
    'kelp_open_water_farm',
    'timberline_ropeworks_1',
    'timberline_sawmill_1',
  ],
  'fish_start (0,1) now borders zone 4 to the north too, on top of its 4 zone-1 neighbors'
);

console.log('adjacency tests passed');

// --- Geometry-derived adjacency (cross-check against js/scene.js hex layout) ---

// Mirrors js/scene.js's HEX_RADIUS/HEX_WIDTH/ROW_SPACING and hexLocalPosition's odd-r
// offset layout exactly (minus the whole-grid centering offset, which is a constant
// translation and doesn't affect pairwise distances). js/tiles.js's neighbor formula
// and js/scene.js's hex-layout formula independently encode the same convention with
// no shared constant — if one changes without the other, this catches it even though
// every other test in this file would still pass.
const GEOM_HEX_RADIUS = 1.6;
const GEOM_HEX_WIDTH = Math.sqrt(3) * GEOM_HEX_RADIUS;
const GEOM_HEX_HEIGHT = 2 * GEOM_HEX_RADIUS;
const GEOM_ROW_SPACING = 0.75 * GEOM_HEX_HEIGHT;
const GEOM_NEIGHBOR_DISTANCE = GEOM_HEX_WIDTH; // same-row and diagonal-row neighbors are equidistant in this layout
const GEOM_DISTANCE_TOLERANCE = 1e-6;

function hexCenter(row, col) {
  // row % 2 === 1 breaks for negative rows (zone 4 sits at rows -6..-1) -- see the matching fix
  // and comment on hexLocalPosition in js/scene.js.
  const x = col * GEOM_HEX_WIDTH + (row % 2 !== 0 ? GEOM_HEX_WIDTH / 2 : 0);
  const z = row * GEOM_ROW_SPACING;
  return { x, z };
}

for (const tile of TILES) {
  const center = hexCenter(tile.gridPos.row, tile.gridPos.col);
  const geometricNeighborIds = TILES.filter((other) => {
    if (other.id === tile.id) return false;
    const otherCenter = hexCenter(other.gridPos.row, other.gridPos.col);
    const dx = otherCenter.x - center.x;
    const dz = otherCenter.z - center.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return Math.abs(distance - GEOM_NEIGHBOR_DISTANCE) < GEOM_DISTANCE_TOLERANCE;
  }).map((t) => t.id);

  assert.deepEqual(
    geometricNeighborIds.sort(),
    [...TILE_NEIGHBORS.get(tile.id)].sort(),
    `geometry-derived neighbors for ${tile.id} must match TILE_NEIGHBORS`
  );
}

console.log('geometry-derived adjacency tests passed');

// --- createInitialState ---

{
  const state = createInitialState();
  assert.deepEqual(
    state.resources,
    { fish: 0, kelp: 0, driftwood: 0, crops: 0, planks: 0, kelp_rope: 0, bread: 0 },
    'resources shape includes zone 4 goods alongside the base 4'
  );
  assert.deepEqual(
    state.lifetime,
    { fish: 0, kelp: 0, driftwood: 0, crops: 0, planks: 0, kelp_rope: 0, bread: 0 },
    'lifetime shape includes zone 4 goods alongside the base 4'
  );
  assert.deepEqual(state.unlocked, ['driftwood_start'], 'only the single start tile is unlocked');
  assert.deepEqual(state.levels, {}, 'no tile starts above level 1');
  assert.equal(state.gold, 0, 'a fresh game starts with no gold');
  assert.deepEqual(state.achievements, [], 'a fresh game has earned no achievements');
}

{
  const state = createInitialState();
  assert.deepEqual(
    state.prestige,
    { tokens: 0, upgrades: { fish: 0, kelp: 0, driftwood: 0, crops: 0 }, headStart: 0, count: 0 },
    'a fresh game starts with zero prestige tokens, no upgrades purchased, and no prestiges done'
  );
}

// --- effectiveRate ---

{
  const state = createInitialState();
  assert.equal(effectiveRate('fish', state.unlocked), 0, 'no fish producer unlocked at start');
  assert.equal(effectiveRate('kelp', state.unlocked), 0, 'no kelp producer unlocked at start');
  assert.equal(effectiveRate('driftwood', state.unlocked), 0.5, 'starting driftwood rate');
  assert.equal(effectiveRate('crops', state.unlocked), 0, 'no crops producer unlocked at start');
}

{
  const unlocked = ['fish_start', 'booster_smokehouse'];
  assert.equal(effectiveRate('fish', unlocked), 1.25, 'smokehouse adds +25% to fish');
}

{
  const unlocked = ['fish_start'];
  const levels = { fish_start: 2 };
  assert.equal(effectiveRate('fish', unlocked, levels), 1.5, 'level 2 fish_start produces 1.5x base rate');
}

{
  const unlocked = ['fish_start', 'booster_smokehouse'];
  const levels = { booster_smokehouse: 2 };
  assert.equal(
    effectiveRate('fish', unlocked, levels),
    1.375,
    'level 2 smokehouse boosts by 25% * 1.5x = 37.5%, giving 1.0 * 1.375'
  );
}

// --- effectiveTileRate ---

{
  const tile = TILES.find((t) => t.id === 'fish_start');
  assert.equal(effectiveTileRate(tile, ['fish_start']), 1.0, 'no boosters unlocked returns raw rate');
  assert.equal(
    effectiveTileRate(tile, ['fish_start', 'booster_smokehouse']),
    1.25,
    'smokehouse boosts fish_start tile rate by +25%'
  );
}

{
  const tile = TILES.find((t) => t.id === 'fish_start');
  const levels = { fish_start: 3 };
  assert.equal(
    effectiveTileRate(tile, ['fish_start'], levels),
    2.0,
    'level 3 fish_start produces 2x base rate'
  );
}

// --- isDiscovered ---

{
  const state = { unlocked: ['driftwood_start'] };
  const adjacent = TILES.find((t) => t.id === 'crops_soil_barge');
  assert.equal(isDiscovered(adjacent, state), true, 'crops_soil_barge is adjacent to driftwood_start');

  const distant = TILES.find((t) => t.id === 'kelp_start');
  assert.equal(isDiscovered(distant, state), false, 'kelp_start is 2 hops from driftwood_start');

  const start = TILES.find((t) => t.id === 'driftwood_start');
  assert.equal(isDiscovered(start, state), true, 'an already-unlocked tile is always discovered');
}

// --- isEligible ---

{
  // cost-gated, adjacent to the sole unlocked tile: gated on resources only
  const tile = TILES.find((t) => t.id === 'crops_soil_barge'); // cost: 35 driftwood
  const state = { unlocked: ['driftwood_start'], resources: { driftwood: 10 }, lifetime: {} };
  assert.equal(isEligible(tile, state), false, 'not enough driftwood yet');
  state.resources.driftwood = 35;
  assert.equal(isEligible(tile, state), true, 'discovered and affordable');
}

{
  // milestone-gated, adjacent to the sole unlocked tile
  const tile = TILES.find((t) => t.id === 'kelp_reef'); // milestone: driftwood >= 60
  const state = { unlocked: ['driftwood_start'], resources: {}, lifetime: { driftwood: 59 } };
  assert.equal(isEligible(tile, state), false);
  state.lifetime.driftwood = 60;
  assert.equal(isEligible(tile, state), true);
}

{
  // not discovered: plenty of resources, but not adjacent to anything unlocked
  const tile = TILES.find((t) => t.id === 'kelp_start'); // cost: 70 driftwood + 60 crops
  const state = {
    unlocked: ['driftwood_start'],
    resources: { driftwood: 9999, crops: 9999 },
    lifetime: {},
  };
  assert.equal(isEligible(tile, state), false, 'undiscovered tiles are never eligible');
}

{
  // the start tile itself is always eligible, even with nothing unlocked yet
  const tile = TILES.find((t) => t.id === 'driftwood_start');
  assert.equal(isEligible(tile, { unlocked: [], resources: {}, lifetime: {} }), true);
}

// --- tick ---

{
  const state = createInitialState();
  tick(state, 2);
  assert.equal(state.resources.driftwood, 1.0, 'driftwood accrues at 0.5/s for 2s');
  assert.equal(state.lifetime.driftwood, 1.0, 'lifetime tracks the same total');
  assert.equal(state.resources.fish, 0, 'fish does not accrue before fish_start is unlocked');
}

{
  const state = createInitialState();
  state.levels.driftwood_start = 3;
  tick(state, 2);
  assert.equal(state.resources.driftwood, 2.0, 'a level-3 producer (2x multiplier) accrues at 2x through tick()');
}

// --- applyOfflineProgress ---

{
  const state = createInitialState(); // driftwood_start unlocked, rate 0.5/s
  const before = { ...state.resources };
  const result = applyOfflineProgress(state, 30);
  assert.equal(result, null, 'below the 60s minimum returns null');
  assert.deepEqual(state.resources, before, 'no resources granted below threshold');
}

{
  const state = createInitialState();
  const result = applyOfflineProgress(state, 100);
  assert.ok(result, 'returns a result at or above the 60s threshold');
  assert.equal(result.seconds, 100, 'credited seconds equals elapsed when under the cap');
  assert.equal(result.gains.driftwood, 25, '0.5 rate * 100s * 50% offline rate = 25');
  assert.equal(result.gains.fish, 0, 'no fish producer unlocked, so zero gain');
  assert.equal(state.resources.driftwood, 25, 'resources increased by the gain');
  assert.equal(state.lifetime.driftwood, 25, 'lifetime increased by the same amount');
}

{
  const state = createInitialState();
  const result = applyOfflineProgress(state, 100000); // far beyond the 8-hour cap
  assert.equal(result.seconds, 28800, 'credited seconds clamped to the 8-hour cap');
  assert.equal(result.gains.driftwood, 0.5 * 28800 * 0.5, 'gain computed from the capped duration, not raw elapsed time');
}

{
  // boosters and levels feed into offline gains the same way they feed effectiveRate
  const state = {
    unlocked: ['fish_start', 'booster_smokehouse'],
    resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    levels: {},
    prestige: { tokens: 0, upgrades: { fish: 0, kelp: 0, driftwood: 0, crops: 0 } },
    shop: createInitialState().shop,
    gold: 0,
    achievements: [],
  };
  const result = applyOfflineProgress(state, 100);
  assert.equal(result.gains.fish, 62.5, 'smokehouse-boosted rate (1.25) * 100s * 50% offline rate');
}

console.log('offline progress tests passed');

// --- completionCount / isFullyComplete ---

{
  const state = createInitialState();
  assert.equal(completionCount(state), 0, 'a fresh game has zero maxed tiles');
  assert.equal(isFullyComplete(state), false, 'a fresh game is not fully complete');
}

{
  const state = createInitialState();
  state.unlocked = TILES.map((t) => t.id);
  for (const t of TILES) state.levels[t.id] = MAX_LEVEL;
  assert.equal(completionCount(state), TILES.length, 'every tile unlocked and maxed counts as complete');
  assert.equal(isFullyComplete(state), true, 'fully complete once every tile is unlocked and maxed');
}

{
  const state = createInitialState();
  state.unlocked = TILES.map((t) => t.id);
  for (const t of TILES) state.levels[t.id] = MAX_LEVEL;
  state.levels[TILES[0].id] = 1;
  assert.equal(completionCount(state), TILES.length - 1, 'one non-maxed tile is excluded from the count');
  assert.equal(isFullyComplete(state), false, 'not fully complete until every tile is maxed');
}

console.log('completion tracking tests passed');

// --- prestigeTokensEarned / doPrestige ---

{
  const state = createInitialState();
  state.lifetime = { fish: 500, kelp: 500, driftwood: 1000, crops: 1000 };
  assert.equal(prestigeTokensEarned(state), 3, 'floor((500+500+1000+1000) / 1000) = 3');
}

{
  const state = createInitialState(); // not fully complete
  const result = doPrestige(state);
  assert.equal(result, null, 'prestige is refused before full completion');
}

{
  const state = createInitialState();
  state.unlocked = TILES.map((t) => t.id);
  for (const t of TILES) state.levels[t.id] = MAX_LEVEL;
  state.lifetime = { fish: 1000, kelp: 1000, driftwood: 1000, crops: 1000 };
  state.prestige.tokens = 7; // simulate a prior prestige
  state.prestige.upgrades.fish = 2;
  const resourcesBefore = { ...state.resources };

  const result = doPrestige(state);

  assert.ok(result, 'prestige succeeds once fully complete');
  assert.equal(result.tokensEarned, 4, 'floor(4000 / 1000) = 4');
  assert.equal(result.state.prestige.tokens, 11, 'earned tokens add to the carried-over balance (7 + 4)');
  assert.deepEqual(
    result.state.prestige.upgrades,
    { fish: 2, kelp: 0, driftwood: 0, crops: 0 },
    'purchased upgrades carry over unchanged'
  );
  assert.deepEqual(
    result.state.resources,
    { fish: 0, kelp: 0, driftwood: 0, crops: 0, planks: 0, kelp_rope: 0, bread: 0 },
    'resources reset, including zone 4 goods'
  );
  assert.deepEqual(
    result.state.lifetime,
    { fish: 0, kelp: 0, driftwood: 0, crops: 0, planks: 0, kelp_rope: 0, bread: 0 },
    'lifetime totals reset, including zone 4 goods'
  );
  assert.deepEqual(result.state.unlocked, ['driftwood_start'], 'unlocked tiles reset to just the start tile');
  assert.deepEqual(result.state.levels, {}, 'levels reset');
  assert.deepEqual(state.resources, resourcesBefore, 'the input state object is not mutated');
}

console.log('prestige reset tests passed');

// --- prestigeUpgradeCost / buyPrestigeUpgrade ---

{
  assert.equal(prestigeUpgradeCost(0), 5, 'first purchase costs the base amount');
  assert.equal(prestigeUpgradeCost(1), 10, 'second purchase costs 2x base');
  assert.equal(prestigeUpgradeCost(4), 25, 'fifth purchase costs 5x base');
}

{
  const state = createInitialState();
  state.prestige.tokens = 5;
  const ok = buyPrestigeUpgrade(state, 'fish');
  assert.equal(ok, true, 'purchase succeeds when affordable');
  assert.equal(state.prestige.tokens, 0, 'cost is deducted');
  assert.equal(state.prestige.upgrades.fish, 1, 'purchase count incremented');
}

{
  const state = createInitialState();
  state.prestige.tokens = 4; // one short of the base cost of 5
  const ok = buyPrestigeUpgrade(state, 'fish');
  assert.equal(ok, false, 'purchase fails when not affordable');
  assert.equal(state.prestige.tokens, 4, 'tokens unchanged on failure');
  assert.equal(state.prestige.upgrades.fish, 0, 'purchase count unchanged on failure');
}

console.log('prestige store tests passed');

// --- prestige upgrades feeding effectiveRate / effectiveTileRate / tick / applyOfflineProgress ---

{
  const unlocked = ['fish_start'];
  const prestigeUpgrades = { fish: 2 }; // +20%
  assert.equal(
    effectiveRate('fish', unlocked, {}, prestigeUpgrades),
    1.2,
    'two fish upgrades add +20% on top of the base rate'
  );
}

{
  const unlocked = ['fish_start', 'booster_smokehouse'];
  const levels = { fish_start: 2 };
  const prestigeUpgrades = { fish: 1 }; // +10%
  assert.equal(
    effectiveRate('fish', unlocked, levels, prestigeUpgrades),
    1.5 * 1.25 * 1.1,
    'level, booster, and prestige multipliers all stack multiplicatively'
  );
}

{
  const tile = TILES.find((t) => t.id === 'fish_start');
  assert.equal(
    effectiveTileRate(tile, ['fish_start'], {}, { fish: 3 }),
    1.3,
    "three fish upgrades add +30% to the tile's own effective rate"
  );
}

{
  const state = {
    unlocked: ['fish_start'],
    resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    levels: {},
    prestige: { tokens: 0, upgrades: { fish: 2, kelp: 0, driftwood: 0, crops: 0 } },
    shop: createInitialState().shop,
    gold: 0,
    achievements: [],
  };
  tick(state, 10);
  assert.equal(state.resources.fish, 12, 'tick applies the prestige-boosted rate: 1.0 * 1.2 * 10s');
}

{
  const state = {
    unlocked: ['fish_start'],
    resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    levels: {},
    prestige: { tokens: 0, upgrades: { fish: 2, kelp: 0, driftwood: 0, crops: 0 } },
    shop: createInitialState().shop,
    gold: 0,
    achievements: [],
  };
  const result = applyOfflineProgress(state, 100);
  assert.equal(result.gains.fish, 1.2 * 100 * 0.5, 'offline progress applies the prestige-boosted rate too');
}

console.log('prestige production integration tests passed');

// --- unlockTile ---

{
  const state = createInitialState();
  state.resources.driftwood = 20;
  const tile = TILES.find((t) => t.id === 'booster_windmill');
  const ok = unlockTile(state, tile);
  assert.equal(ok, true, 'unlock succeeds when adjacent and affordable');
  assert.equal(state.resources.driftwood, 0, 'cost is deducted');
  assert.ok(state.unlocked.includes('booster_windmill'), 'tile id added to unlocked');
}

{
  const state = createInitialState();
  const tile = TILES.find((t) => t.id === 'booster_windmill');
  const ok = unlockTile(state, tile);
  assert.equal(ok, false, 'unlock fails when not enough resources');
  assert.ok(!state.unlocked.includes('booster_windmill'));
}

{
  const state = createInitialState();
  state.resources.driftwood = 9999;
  state.resources.crops = 9999;
  const tile = TILES.find((t) => t.id === 'fish_start'); // not adjacent to driftwood_start alone
  const ok = unlockTile(state, tile);
  assert.equal(ok, false, 'unlock fails when not adjacent to anything unlocked, however affordable');
}

// --- getLevel ---

{
  const state = createInitialState();
  assert.equal(getLevel(state, 'driftwood_start'), 1, 'untouched tile defaults to level 1');
  state.levels.driftwood_start = 2;
  assert.equal(getLevel(state, 'driftwood_start'), 2, 'returns the stored level once set');
}

// --- levelUpCost ---

{
  const tile = TILES.find((t) => t.id === 'fish_start'); // rate 1.0
  assert.deepEqual(levelUpCost(tile, 2), { fish: 30 }, 'producer level 2 cost: round(1.0 * 30 * 1)');
  assert.deepEqual(levelUpCost(tile, 3), { fish: 75 }, 'producer level 3 cost: round(1.0 * 30 * 2.5)');
}

{
  const tile = TILES.find((t) => t.id === 'booster_net_weavers'); // +20% fish, +20% kelp
  assert.deepEqual(
    levelUpCost(tile, 2),
    { fish: 120, kelp: 120 },
    'booster level 2 cost: round(20 * 6 * 1) per boosted resource'
  );
  assert.deepEqual(
    levelUpCost(tile, 3),
    { fish: 300, kelp: 300 },
    'booster level 3 cost: round(20 * 6 * 2.5) per boosted resource'
  );
}

{
  const producer = TILES.find((t) => t.id === 'fish_start'); // rate 1.0
  const booster = TILES.find((t) => t.id === 'booster_smokehouse'); // +25% fish, comparable tier
  assert.ok(
    levelUpCost(booster, 2).fish > levelUpCost(producer, 2).fish,
    'a booster must cost more to level than a comparable-tier producer, by design'
  );
}

// --- levelUpTile ---

{
  const state = createInitialState(); // driftwood_start (rate 0.5) is already unlocked
  state.resources.driftwood = 15; // level 2 cost: round(0.5 * 30 * 1)
  const tile = TILES.find((t) => t.id === 'driftwood_start');
  const ok = levelUpTile(state, tile);
  assert.equal(ok, true, 'level-up succeeds when affordable');
  assert.equal(state.resources.driftwood, 0, 'cost is deducted');
  assert.equal(getLevel(state, tile.id), 2, 'level incremented');
}

{
  const state = createInitialState();
  const tile = TILES.find((t) => t.id === 'driftwood_start');
  const ok = levelUpTile(state, tile);
  assert.equal(ok, false, 'level-up fails when not enough resources');
  assert.equal(getLevel(state, tile.id), 1, 'level unchanged');
}

{
  const state = createInitialState();
  state.resources.driftwood = 9999;
  const tile = TILES.find((t) => t.id === 'crops_start'); // not unlocked yet
  const ok = levelUpTile(state, tile);
  assert.equal(ok, false, 'level-up fails on a locked tile, however affordable');
}

{
  const state = createInitialState();
  const tile = TILES.find((t) => t.id === 'driftwood_start');
  state.levels[tile.id] = 3;
  state.resources.driftwood = 9999;
  const ok = levelUpTile(state, tile);
  assert.equal(ok, false, 'level-up fails once already at max level');
  assert.equal(getLevel(state, tile.id), 3, 'level unchanged at max');
}

{
  assert.equal(isLevelUpEligible({ unlocked: [], resources: {}, levels: {} },
    TILES.find((t) => t.id === 'driftwood_start')), false, 'a locked tile is never level-up eligible');
}

console.log('economy math tests passed');

// --- ACHIEVEMENTS data integrity ---

{
  assert.equal(ACHIEVEMENTS.length, 33, 'expected exactly 33 achievements');
  assert.equal(
    new Set(ACHIEVEMENTS.map((a) => a.id)).size,
    33,
    'achievement ids must be unique'
  );
  for (const achievement of ACHIEVEMENTS) {
    assert.equal(typeof achievement.name, 'string', `${achievement.id} needs a name`);
    assert.equal(typeof achievement.description, 'string', `${achievement.id} needs a description`);
    assert.ok(achievement.reward > 0, `${achievement.id} must pay out some gold`);
    assert.equal(typeof achievement.condition, 'function', `${achievement.id} needs a condition`);
  }
}

// --- checkAchievements ---

{
  const state = createInitialState();
  assert.deepEqual(checkAchievements(state), [], 'a fresh game has earned nothing');
  assert.equal(state.gold, 0, 'no gold awarded when nothing is earned');
  assert.deepEqual(state.achievements, [], 'nothing recorded when nothing is earned');
}

{
  // first-steps: only the single start tile is unlocked to begin with
  const state = createInitialState();
  assert.deepEqual(checkAchievements(state).map((a) => a.id), [], 'the start tile alone is not a first step');

  state.unlocked.push('booster_windmill');
  const awarded = checkAchievements(state);
  assert.deepEqual(awarded.map((a) => a.id), ['first-steps'], 'unlocking beyond the start set earns first-steps');
  assert.deepEqual(state.achievements, ['first-steps'], 'the id is recorded on the state');
  assert.equal(state.gold, 1, 'first-steps pays 1 gold');
}

{
  // first-steps is also awarded through unlockTile's own check
  const state = createInitialState();
  state.resources.driftwood = 20;
  unlockTile(state, TILES.find((t) => t.id === 'booster_windmill'));
  assert.deepEqual(state.achievements, ['first-steps'], 'unlockTile checks achievements after a successful unlock');
  assert.equal(state.gold, 1);
}

{
  // maxed-out
  const state = createInitialState();
  state.levels.driftwood_start = MAX_LEVEL - 1;
  assert.deepEqual(checkAchievements(state).map((a) => a.id), [], 'one level short of max earns nothing');

  state.levels.driftwood_start = MAX_LEVEL;
  const awarded = checkAchievements(state);
  assert.deepEqual(awarded.map((a) => a.id), ['maxed-out'], 'a tile at max level earns maxed-out');
  assert.equal(state.gold, 1, 'maxed-out pays 1 gold');
}

{
  // *-tycoon thresholds key off lifetime, not current resources
  const state = createInitialState();
  state.lifetime.kelp = 4999;
  assert.deepEqual(checkAchievements(state).map((a) => a.id), [], 'one short of 5,000 lifetime kelp earns nothing');

  state.lifetime.kelp = 5000;
  const awarded = checkAchievements(state);
  assert.deepEqual(awarded.map((a) => a.id), ['kelp-tycoon'], '5,000 lifetime kelp earns kelp-tycoon');
  assert.equal(state.gold, 1, 'kelp-tycoon pays 1 gold');
  assert.equal(state.resources.kelp, 0, 'gold is a separate counter and does not touch resources');
}

{
  // idempotent: the same met condition is never paid out twice
  const state = createInitialState();
  state.lifetime.fish = 5000;
  checkAchievements(state);
  assert.deepEqual(state.achievements, ['fish-tycoon']);
  assert.equal(state.gold, 1);

  const second = checkAchievements(state);
  assert.deepEqual(second, [], 'a second call with no state change awards nothing');
  assert.deepEqual(state.achievements, ['fish-tycoon'], 'no duplicate ids');
  assert.equal(state.gold, 1, 'gold does not double');
}

{
  // halfway-there fires at ceil(TOTAL_TILE_COUNT / 2) maxed tiles. With 144 tiles that's exactly
  // 72 -- also exactly all of zone 1 + zone 2 (the first 72 entries in TILES) and exactly the
  // tiles-72 tier, so all three fire together here; that's a coincidence of the current tile
  // count, not something this test tries to avoid (zone 3's own version hit the same overlap).
  const half = Math.ceil(TOTAL_TILE_COUNT / 2);
  const state = createInitialState();
  const maxed = TILES.slice(0, half - 1);
  state.unlocked = maxed.map((t) => t.id);
  for (const t of maxed) state.levels[t.id] = MAX_LEVEL;

  checkAchievements(state);
  assert.equal(completionCount(state), half - 1, 'one tile short of half');
  assert.ok(!state.achievements.includes('halfway-there'), 'one tile short of half earns nothing');

  const goldBefore = state.gold;
  const nextTile = TILES[half - 1];
  state.unlocked.push(nextTile.id);
  state.levels[nextTile.id] = MAX_LEVEL;
  const awarded = checkAchievements(state);
  assert.deepEqual(
    awarded.map((a) => a.id).sort(),
    ['frozen-reach-complete', 'halfway-there', 'tiles-72'],
    'half the tiles maxed earns halfway-there, and happens to also complete zone 2 and hit tiles-72'
  );
  assert.equal(awarded.find((a) => a.id === 'halfway-there').reward, 2, 'halfway-there pays 2 gold');
  assert.equal(state.gold, goldBefore + 2 + 8 + 4, 'halfway-there + frozen-reach-complete + tiles-72');
}

{
  // drift-away-complete fires only on full completion
  const state = createInitialState();
  state.unlocked = TILES.map((t) => t.id);
  for (const t of TILES) state.levels[t.id] = MAX_LEVEL;
  state.levels[TILES[0].id] = 1;

  checkAchievements(state);
  assert.ok(!state.achievements.includes('drift-away-complete'), 'one un-maxed tile is not complete');

  const goldBefore = state.gold;
  state.levels[TILES[0].id] = MAX_LEVEL;
  const awarded = checkAchievements(state);
  assert.deepEqual(awarded.map((a) => a.id), ['drift-away-complete'], 'every tile maxed earns drift-away-complete');
  assert.equal(state.gold, goldBefore + 5, 'drift-away-complete pays 5 gold');
}

console.log('achievement award tests passed');

// --- gold + achievements survive prestige ---

{
  const state = createInitialState();
  state.unlocked = TILES.map((t) => t.id);
  for (const t of TILES) state.levels[t.id] = MAX_LEVEL;
  state.lifetime = { fish: 1000, kelp: 1000, driftwood: 1000, crops: 1000 };
  state.gold = 9;
  state.achievements = ['first-steps', 'maxed-out'];

  const result = doPrestige(state);

  // Prestiging is itself an achievement now ("Second Voyage", 5 gold), earned the moment the new run starts.
  assert.equal(result.state.gold, 9 + 5, 'gold is permanent currency and survives prestige, plus the voyage reward');
  assert.deepEqual(
    result.state.achievements,
    ['first-steps', 'maxed-out', 'voyage-1'],
    'already-earned achievements carry over unchanged, and the first voyage is added'
  );
  assert.notEqual(
    result.state.achievements,
    state.achievements,
    'the carried-over list is a copy, not a shared reference to the old state'
  );
  assert.deepEqual(
    result.state.resources,
    { fish: 0, kelp: 0, driftwood: 0, crops: 0, planks: 0, kelp_rope: 0, bread: 0 },
    'resources still reset, including zone 4 goods'
  );
  assert.deepEqual(
    result.state.lifetime,
    { fish: 0, kelp: 0, driftwood: 0, crops: 0, planks: 0, kelp_rope: 0, bread: 0 },
    'lifetime totals still reset, including zone 4 goods'
  );
  assert.deepEqual(result.state.unlocked, ['driftwood_start'], 'unlocked tiles still reset');
  assert.deepEqual(result.state.levels, {}, 'levels still reset');
}

console.log('achievement prestige carry-over tests passed');

// --- loadState migration ---

// state.js reads `localStorage` off the global at call time, so this minimal
// Map-backed stub is enough to exercise loadState() from Node. No prior test
// needed it, so this is the first stub in the file.
globalThis.localStorage = {
  store: new Map(),
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  },
  setItem(key, value) {
    this.store.set(key, String(value));
  },
  removeItem(key) {
    this.store.delete(key);
  },
};

// Saves written before this feature existed have no `lastSaved` handling concerns
// here: omitting it makes loadState's elapsed time 0, so offline progress is skipped
// and only the defensive merge is under test.
function seedSave(save) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

{
  // a save from before gold/achievements existed
  seedSave({
    version: 1,
    resources: { fish: 1, kelp: 2, driftwood: 3, crops: 4 },
    lifetime: { fish: 1, kelp: 2, driftwood: 3, crops: 4 },
    unlocked: ['driftwood_start'],
    levels: {},
    prestige: { tokens: 3, upgrades: { fish: 1, kelp: 0, driftwood: 0, crops: 0 } },
  });
  const { state } = loadState();
  assert.equal(state.gold, 0, 'a save missing gold defaults to 0 rather than undefined');
  assert.deepEqual(state.achievements, [], 'a save missing achievements defaults to an empty list');
  assert.equal(state.prestige.tokens, 3, 'existing fields still load unchanged');
  assert.equal(state.resources.driftwood, 3, 'existing fields still load unchanged');
}

{
  // a migrated save already past a threshold is credited on load, not on the next tick
  seedSave({
    version: 1,
    resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    lifetime: { fish: 6000, kelp: 0, driftwood: 0, crops: 0 },
    unlocked: ['driftwood_start'],
    levels: {},
    prestige: { tokens: 0, upgrades: { fish: 0, kelp: 0, driftwood: 0, crops: 0 } },
  });
  const { state } = loadState();
  assert.deepEqual(state.achievements, ['fish-tycoon'], 'an already-met condition is credited on load');
  assert.equal(state.gold, 1, 'the reward is granted on load');
}

console.log('achievement save migration tests passed');

// --- zone border adjacency tests ---
{
  const neighbors = TILE_NEIGHBORS.get('crops_terraced_planter'); // zone-1, row 0, col 5
  assert(
    neighbors.includes('frozen_booster_net_weavers'), // zone-2, row 0, col 6
    'zone-1 col-5 tile should be hex-adjacent to its zone-2 col-6 neighbor'
  );

  const zone2Count = TILES.filter((t) => t.zone === 'zone2').length;
  assert.strictEqual(zone2Count, 36, 'zone 2 should have exactly 36 tiles');

  const zone1Count = TILES.filter((t) => t.zone === 'zone1').length;
  assert.strictEqual(zone1Count, 36, 'zone 1 should still have exactly 36 tiles');

  console.log('zone border adjacency tests passed');
}

// --- zone-2 economy multiplier tests ---
// Locks in the spec's mirrored-economy invariant: every zone-1 tile has a
// zone-2 mirror 6 columns over (same row, family, kind) whose unlock cost is
// 90x and whose production (rate / boost percent) is 4x. The unlock cost was
// 15x in the original design and was then multiplied by 6 after a simulated
// run showed zone 2 finishing in about 2 minutes; this pins the shipped numbers.
{
  const zone1Tiles = TILES.filter((t) => t.zone === 'zone1');
  const zone2Tiles = TILES.filter((t) => t.zone === 'zone2');

  const UNLOCK_MULTIPLIER = 90;
  const PRODUCTION_MULTIPLIER = 4;

  for (const t1 of zone1Tiles) {
    const mirror = zone2Tiles.find(
      (t2) => t2.gridPos.row === t1.gridPos.row && t2.gridPos.col === t1.gridPos.col + 6
    );
    assert.ok(mirror, `${t1.id} (zone1, col ${t1.gridPos.col}) must have a zone-2 mirror at col ${t1.gridPos.col + 6}`);
    assert.equal(mirror.family, t1.family, `${t1.id}/${mirror.id} must share the same family`);
    assert.equal(mirror.kind, t1.kind, `${t1.id}/${mirror.id} must share the same kind`);

    if (t1.id === 'driftwood_start') continue; // special-cased below: can't mirror a 'start' unlock

    if (t1.unlock.type === 'cost') {
      assert.equal(mirror.unlock.type, 'cost', `${mirror.id} must also be cost-gated`);
      assert.deepEqual(
        Object.keys(mirror.unlock.cost).sort(),
        Object.keys(t1.unlock.cost).sort(),
        `${t1.id}/${mirror.id} unlock cost must use the same resource keys`
      );
      for (const [resource, amount] of Object.entries(t1.unlock.cost)) {
        assert.equal(
          mirror.unlock.cost[resource],
          amount * UNLOCK_MULTIPLIER,
          `${mirror.id}.unlock.cost.${resource} must be exactly ${UNLOCK_MULTIPLIER}x ${t1.id}'s`
        );
      }
    } else if (t1.unlock.type === 'milestone') {
      assert.equal(mirror.unlock.type, 'milestone', `${mirror.id} must also be milestone-gated`);
      assert.equal(
        mirror.unlock.resource,
        t1.unlock.resource,
        `${t1.id}/${mirror.id} milestone must key off the same resource`
      );
      assert.equal(
        mirror.unlock.target,
        t1.unlock.target * UNLOCK_MULTIPLIER,
        `${mirror.id}.unlock.target must be exactly ${UNLOCK_MULTIPLIER}x ${t1.id}'s`
      );
    }

    if (typeof t1.rate === 'number') {
      assert.equal(
        mirror.rate,
        t1.rate * PRODUCTION_MULTIPLIER,
        `${mirror.id}.rate must be exactly ${PRODUCTION_MULTIPLIER}x ${t1.id}'s`
      );
    }
    if (t1.boosts) {
      assert.equal(mirror.boosts.length, t1.boosts.length, `${t1.id}/${mirror.id} must have the same number of boosts`);
      t1.boosts.forEach((boost, i) => {
        assert.equal(mirror.boosts[i].resource, boost.resource, `${t1.id}/${mirror.id} boost[${i}] resource must match`);
        assert.equal(
          mirror.boosts[i].percent,
          boost.percent * PRODUCTION_MULTIPLIER,
          `${mirror.id}.boosts[${i}].percent must be exactly ${PRODUCTION_MULTIPLIER}x ${t1.id}'s`
        );
      });
    }
  }

  // The special-cased pair: frozen_driftwood_start can't be a 'start' tile (only
  // one 'start' tile exists total), so it carries an explicit unlock cost instead
  // of mirroring driftwood_start's free start — but production still follows the
  // same 4x rule as every other mirror pair.
  const driftwoodStart = TILES.find((t) => t.id === 'driftwood_start');
  const frozenDriftwoodStart = TILES.find((t) => t.id === 'frozen_driftwood_start');
  assert.equal(driftwoodStart.unlock.type, 'start', 'driftwood_start is the one true start tile');
  assert.deepEqual(
    frozenDriftwoodStart.unlock,
    { type: 'cost', cost: { crops: 3600 } },
    'frozen_driftwood_start has its own explicit unlock cost since it cannot mirror a start tile'
  );
  assert.equal(
    frozenDriftwoodStart.rate,
    driftwoodStart.rate * PRODUCTION_MULTIPLIER,
    'frozen_driftwood_start production still follows the 4x rule despite the special-cased unlock'
  );

  console.log('zone-2 economy multiplier tests passed');
}

// --- zone-2 tile ineligible until its zone-1 border neighbor unlocks ---
{
  // Same col-5/col-6 border pair the zone-border-adjacency test above uses.
  const frozenTile = TILES.find((t) => t.id === 'frozen_booster_net_weavers'); // zone-2, row 0, col 6
  const borderNeighborId = 'crops_terraced_planter'; // zone-1, row 0, col 5

  const state = {
    unlocked: [],
    resources: { fish: 99999, kelp: 99999, driftwood: 99999, crops: 99999 },
    lifetime: {},
  };
  assert.equal(
    isEligible(frozenTile, state),
    false,
    'a zone-2 tile is not eligible while its zone-1 border neighbor is locked, however affordable'
  );

  state.unlocked.push(borderNeighborId);
  assert.equal(
    isEligible(frozenTile, state),
    true,
    'unlocking the bordering zone-1 tile makes the zone-2 tile eligible once affordable'
  );

  console.log('zone-2 border eligibility tests passed');
}

// --- zone-2 achievement tests ---
{
  const state = createInitialState();
  // First unlock a non-start zone-1 tile to trigger first-steps and establish a baseline
  state.unlocked.push(TILES.find((t) => t.id === 'booster_windmill').id);
  checkAchievements(state); // triggers first-steps
  const goldBefore = state.gold; // now goldBefore = 1

  const frozenTile = TILES.find((t) => t.id === 'frozen_fish_start');
  state.unlocked.push(frozenTile.id); // directly unlock for the test, bypassing cost
  const awarded = checkAchievements(state);
  assert(awarded.some((a) => a.id === 'frozen-reach-discovered'), 'unlocking a zone-2 tile awards frozen-reach-discovered');
  assert.strictEqual(state.gold, goldBefore + 2, 'frozen-reach-discovered pays 2 gold');

  // Idempotent: calling again with no state change awards nothing more.
  const secondCall = checkAchievements(state);
  assert.strictEqual(secondCall.some((a) => a.id === 'frozen-reach-discovered'), false, 'frozen-reach-discovered does not re-award');

  // frozen-reach-complete requires every zone-2 tile unlocked AND maxed — check it
  // does NOT fire on full zone-1 completion alone.
  const zone1OnlyState = createInitialState();
  for (const tile of TILES.filter((t) => t.zone === 'zone1')) {
    zone1OnlyState.unlocked.push(tile.id);
    zone1OnlyState.levels[tile.id] = MAX_LEVEL;
  }
  const zone1OnlyAwarded = checkAchievements(zone1OnlyState);
  assert.strictEqual(
    zone1OnlyAwarded.some((a) => a.id === 'frozen-reach-complete'),
    false,
    'frozen-reach-complete does not fire from zone-1 completion alone'
  );

  // Now also fully complete zone 2 — it should fire.
  for (const tile of TILES.filter((t) => t.zone === 'zone2')) {
    zone1OnlyState.unlocked.push(tile.id);
    zone1OnlyState.levels[tile.id] = MAX_LEVEL;
  }
  const bothZonesAwarded = checkAchievements(zone1OnlyState);
  assert(bothZonesAwarded.some((a) => a.id === 'frozen-reach-complete'), 'frozen-reach-complete fires once every zone-2 tile is maxed');

  console.log('zone-2 achievement tests passed');
}

// --- save export / import ---
{
  const state = createInitialState();
  state.resources.fish = 123.5;
  state.lifetime.fish = 999;
  state.unlocked.push('fish_start');
  state.levels.fish_start = 2;
  state.prestige.tokens = 3;
  checkAchievements(state); // so the exported gold already includes what these tiles earn
  assert(state.gold > 0, 'setup: some achievement gold is in the save');

  const code = encodeSave(state);
  assert.equal(typeof code, 'string');
  assert(!/\s/.test(code), 'export code is one unbroken string, safe to paste');

  const restored = decodeSave(code);
  assert(restored, 'a code we exported decodes');
  assert.equal(restored.resources.fish, 123.5);
  assert.equal(restored.lifetime.fish, 999);
  assert.deepEqual(restored.unlocked, state.unlocked);
  assert.equal(restored.levels.fish_start, 2);
  assert.equal(restored.gold, state.gold);
  assert.deepEqual(restored.achievements, state.achievements);
  assert.equal(restored.prestige.tokens, 3);
  assert(Math.abs(restored.lastSaved - Date.now()) < 5000, 'export stamps the time so offline credit counts from the export');

  assert(decodeSave('  \n' + code + '\n '), 'surrounding whitespace from copy/paste is tolerated');
  assert(decodeSave('  ' + code.slice(0, 20) + '\n' + code.slice(20) + '  '), 'a code wrapped across lines still decodes');

  for (const junk of ['', 'not base64 !!', btoa('not json'), btoa('{}'), btoa('{"resources":{},"lifetime":{}}'), btoa('null')]) {
    assert.equal(decodeSave(junk), null, `rejects ${JSON.stringify(junk).slice(0, 30)}`);
  }

  // a save from an older version missing newer fields is filled in from the defaults
  const old = decodeSave(btoa(JSON.stringify({ resources: { fish: 5 }, lifetime: { fish: 5 }, unlocked: ['driftwood_start'] })));
  assert(old, 'an older, sparser save still imports');
  assert.equal(old.resources.fish, 5);
  assert.equal(old.resources.kelp, 0);
  assert.deepEqual(old.prestige.upgrades, createInitialState().prestige.upgrades);

  console.log('save export/import tests passed');
}

// --- advance: one rule for a running frame, a throttled tab, a sleeping laptop and a closed game ---
{
  const running = createInitialState();
  assert.equal(advance(running, 1), null, 'a short gap is plain production, no away summary');
  assert.equal(running.resources.driftwood, 0.5, '0.5/s for 1s at full rate');

  const backgrounded = createInitialState();
  assert.equal(advance(backgrounded, 30), null);
  assert.equal(backgrounded.resources.driftwood, 15, 'a 30s hiccup is not penalised: full rate, uncapped by frame size');

  const away = createInitialState();
  const summary = advance(away, 100);
  assert(summary, 'a gap of a minute or more is reported as time away');
  assert.equal(summary.seconds, 100);
  assert.equal(summary.gains.driftwood, 25, 'away time is the offline rate (50%)');
  assert.equal(away.resources.driftwood, 25);

  const capped = createInitialState();
  assert.equal(advance(capped, 30 * 3600).seconds, 8 * 3600, 'away time is capped at 8 hours');

  console.log('advance tests passed');
}

// --- rate breakdown, unlock timer, intensity ---
{
  const state = createInitialState();
  const smokehouse = TILES.find((t) => t.id === 'booster_smokehouse');
  const fishStart = TILES.find((t) => t.id === 'fish_start');
  state.unlocked.push(fishStart.id, smokehouse.id);
  state.levels[fishStart.id] = 2;
  state.prestige.upgrades.fish = 2;

  const fish = rateBreakdown(state, 'fish');
  assert.equal(fish.base, fishStart.rate * 1.5, 'producer base is rate x level multiplier');
  assert.equal(fish.boostPercent, smokehouse.boosts.find((b) => b.resource === 'fish').percent);
  assert.deepEqual(fish.boosters.map((b) => b.name), [smokehouse.name]);
  assert.equal(fish.prestigePercent, 20);
  assert.equal(fish.total, effectiveRate('fish', state.unlocked, state.levels, state.prestige.upgrades), 'breakdown total matches effectiveRate');
  assert.equal(rateBreakdown(state, 'kelp').boosters.length, 0, 'a booster that does not touch kelp is not listed under kelp');

  const withBooster = effectiveRate('fish', state.unlocked, state.levels, state.prestige.upgrades);
  const without = effectiveRate('fish', state.unlocked.filter((id) => id !== smokehouse.id), state.levels, state.prestige.upgrades);
  assert(Math.abs(boosterGain(state, smokehouse, 'fish') - (withBooster - without)) < 1e-9, 'booster gain is exactly what removing it would cost');
  assert.equal(boosterGain(state, smokehouse, 'kelp'), 0);

  // unlock timer: crops_soil_barge costs 35 driftwood; the start tile makes 0.5 driftwood/s
  const fresh = createInitialState();
  const soil = TILES.find((t) => t.id === 'crops_soil_barge');
  assert.deepEqual(soil.unlock.cost, { driftwood: 35 }, 'setup: the tile this test reasons about');
  let eta = unlockEta(fresh, soil);
  assert.equal(eta.fraction, 0);
  assert.equal(eta.seconds, 35 / 0.5, 'seconds = shortfall / current rate');
  fresh.resources.driftwood = 21;
  eta = unlockEta(fresh, soil);
  assert.equal(eta.fraction, 21 / 35);
  assert.equal(eta.seconds, 14 / 0.5);
  fresh.resources.driftwood = 35;
  eta = unlockEta(fresh, soil);
  assert.equal(eta.seconds, 0, 'nothing left to wait for');
  assert.equal(eta.fraction, 1);

  const noIncome = createInitialState();
  const needsCrops = TILES.find((t) => t.unlock.type === 'cost' && 'crops' in t.unlock.cost);
  noIncome.resources.crops = 0;
  const blocked = unlockEta(noIncome, needsCrops);
  assert.equal(blocked.seconds, Infinity, 'a resource with no producer never arrives');
  assert.equal(blocked.blockedBy, 'crops');

  // it agrees with isEligible for every tile the player can see
  const mid = createInitialState();
  for (const r of ['fish', 'kelp', 'driftwood', 'crops']) { mid.resources[r] = 80; mid.lifetime[r] = 150; }
  for (let i = 0; i < 6; i++) {
    const next = TILES.find((t) => !mid.unlocked.includes(t.id) && isEligible(t, mid));
    if (next) unlockTile(mid, next);
  }
  const statuses = lockedTileStatuses(mid);
  assert(statuses.length > 0);
  for (const { tile, eta: e } of statuses) {
    assert(isDiscovered(tile, mid) && !mid.unlocked.includes(tile.id), 'only discovered, still-locked tiles are listed');
    assert.equal(e.seconds === 0, isEligible(tile, mid), `ready <=> eligible for ${tile.id}`);
  }
  const next = nextUnlock(mid);
  assert(statuses.every((x) => next.eta.seconds <= x.eta.seconds), 'next is the soonest tile');
  assert.equal(next.readyCount, statuses.filter((x) => x.eta.seconds === 0).length);

  const everything = createInitialState();
  everything.unlocked = TILES.map((t) => t.id);
  assert.equal(nextUnlock(everything), null, 'nothing left to unlock');

  // intensity ladder
  const early = createInitialState();
  early.unlocked.push('fish_start');
  const late = createInitialState();
  late.unlocked = TILES.filter((t) => t.zone === 'zone1').map((t) => t.id);
  const zone1Tile = TILES.find((t) => t.id === 'fish_start');
  assert(unlockIntensity(early, zone1Tile) < unlockIntensity(late, zone1Tile), 'later unlocks hit harder');
  assert(unlockIntensity(early, zone1Tile) >= 0.2 && unlockIntensity(late, zone1Tile) <= 0.8, 'ordinary unlocks stay in 0.2-0.8');
  const firstFrozen = createInitialState();
  const frozenTile = TILES.find((t) => t.zone === 'zone2');
  firstFrozen.unlocked = TILES.filter((t) => t.zone === 'zone1').map((t) => t.id).concat(frozenTile.id);
  assert.equal(unlockIntensity(firstFrozen, frozenTile), 1, 'the first tile of a new zone is the biggest moment');
  firstFrozen.unlocked.push(TILES.filter((t) => t.zone === 'zone2')[1].id);
  assert(unlockIntensity(firstFrozen, TILES.filter((t) => t.zone === 'zone2')[1]) < 1, 'the second one is not');
  assert(levelUpIntensity(3) > levelUpIntensity(2), 'reaching max level lands harder');
  assert(levelUpIntensity(2) > 0 && levelUpIntensity(MAX_LEVEL) <= 1);

  console.log('rate breakdown, unlock timer and intensity tests passed');
}

// --- the away summary carries the real time away, so a capped return can say so ---
{
  const state = createInitialState();
  const short = applyOfflineProgress(state, 100);
  assert.equal(short.away, 100);
  assert.equal(short.seconds, 100, 'under the cap, everything counts');

  const long = applyOfflineProgress(createInitialState(), 14 * 3600 + 1200);
  assert.equal(long.away, 14 * 3600 + 1200, 'the true time away is reported');
  assert.equal(long.seconds, 8 * 3600, 'only the capped amount is credited');

  const viaAdvance = advance(createInitialState(), 30 * 3600);
  assert.equal(viaAdvance.away, 30 * 3600, 'advance reports it too');

  console.log('away summary tests passed');
}

// --- a booster with nothing to boost ---
{
  const state = createInitialState();
  const windmill = TILES.find((t) => t.id === 'booster_windmill'); // +25% crops
  const netWeavers = TILES.find((t) => t.id === 'booster_net_weavers'); // +fish, +kelp
  assert.equal(boosterIsIdle(state, windmill), true, 'no crops producer yet');
  assert.equal(boosterIsIdle(state, netWeavers), true, 'no fish or kelp producer yet');

  state.unlocked.push('crops_start');
  assert.equal(boosterIsIdle(state, windmill), false, 'a crops tile gives it something to boost');
  assert.equal(boosterIsIdle(state, netWeavers), true, 'still nothing for fish or kelp');

  state.unlocked.push('fish_start');
  assert.equal(boosterIsIdle(state, netWeavers), false, 'one of its two resources is enough');

  console.log('idle booster tests passed');
}

// --- gold shop ---
{
  const s = createInitialState();
  assert.deepEqual(s.shop, { holdLevel: 0, tidesLevel: 0, palette: 'default', palettes: [], ballast: 0 });
  assert.equal(offlineCapSeconds(s), 8 * 3600);
  assert.equal(offlineRate(s), 0.5);

  s.gold = 5;
  assert.equal(buyShopItem(s, 'hold'), false, 'six gold needed, five held');
  assert.equal(s.gold, 5, 'a refused purchase costs nothing');
  s.gold = 100;
  for (const [cost, hours] of [[6, 12], [12, 16], [20, 24]]) {
    const before = s.gold;
    assert.equal(buyShopItem(s, 'hold'), true);
    assert.equal(before - s.gold, cost, `deeper hold to ${hours}h costs ${cost}`);
    assert.equal(offlineCapSeconds(s), hours * 3600);
  }
  assert.equal(buyShopItem(s, 'hold'), false, 'nothing above the top step');
  for (const [cost, rate] of [[8, 0.65], [16, 0.8]]) {
    const before = s.gold;
    assert.equal(buyShopItem(s, 'tides'), true);
    assert.equal(before - s.gold, cost);
    assert.equal(offlineRate(s), rate);
  }
  assert.equal(buyShopItem(s, 'tides'), false);
  assert.equal(shopCatalog(s).find((r) => r.id === 'hold').status, 'maxed');

  // the shop's effect on time away
  const away = createInitialState();
  away.shop.holdLevel = 2; // 16h
  away.shop.tidesLevel = 1; // 65%
  const result = applyOfflineProgress(away, 20 * 3600);
  assert.equal(result.seconds, 16 * 3600, 'the bought cap applies');
  assert.equal(result.rate, 0.65, 'the summary reports the rate used');
  assert.equal(result.gains.driftwood, 0.5 * 16 * 3600 * 0.65);

  // palettes
  const p = createInitialState();
  p.gold = 100;
  assert.equal(buyShopItem(p, 'palette:lagoon'), true);
  assert.equal(p.gold, 94);
  assert.deepEqual(p.shop.palettes, ['lagoon']);
  assert.equal(p.shop.palette, 'lagoon', 'buying a palette also puts it on');
  assert.equal(buyShopItem(p, 'palette:lagoon'), false, 'already in use');
  assert.equal(buyShopItem(p, 'palette:dusk'), true);
  assert.equal(p.shop.palette, 'dusk');
  assert.equal(buyShopItem(p, 'palette:lagoon'), true, 'switching to one you own is free');
  assert.equal(p.gold, 88, 'nothing charged for switching');
  assert.equal(p.shop.palette, 'lagoon');
  assert.equal(buyShopItem(p, 'palette:default'), true, 'the classic look is always available');
  assert.equal(p.shop.palette, 'default');
  assert.equal(buyShopItem(p, 'palette:storm-nonsense'), false);
  assert.equal(buyShopItem(p, 'not-an-item'), false);
  const rows = shopCatalog(p);
  assert.equal(rows.find((r) => r.id === 'palette:dusk').status, 'owned');
  assert.equal(rows.find((r) => r.id === 'palette:default').status, 'active');
  assert.equal(rows.find((r) => r.id === 'palette:storm').status, 'buy');

  // ballast: unlimited, +1% each, price climbs by 2
  const b = createInitialState();
  b.gold = 1000;
  const baseRate = effectiveRate('driftwood', b.unlocked, b.levels, b.prestige.upgrades);
  assert.equal(ballastCost(b), 4);
  for (const cost of [4, 6, 8]) {
    const before = b.gold;
    assert.equal(buyShopItem(b, 'ballast'), true);
    assert.equal(before - b.gold, cost);
  }
  assert.equal(b.shop.ballast, 3);
  assert.equal(ballastCost(b), 10);
  const info = rateBreakdown(b, 'driftwood');
  assert.equal(info.ballastPercent, 3);
  assert(Math.abs(info.total - baseRate * 1.03) < 1e-9, 'three ballast is +3% on everything');
  const before = b.resources.driftwood;
  tick(b, 10);
  assert(Math.abs(b.resources.driftwood - before - baseRate * 1.03 * 10) < 1e-9, 'production actually uses it');
  for (let i = 0; i < 40; i++) buyShopItem(b, 'ballast');
  assert.equal(b.shop.ballast > 3, true, 'ballast has no ceiling until gold runs out');

  // survives export/import, prestige, and a save from before the shop existed
  const kept = createInitialState();
  kept.shop = { holdLevel: 2, tidesLevel: 1, palette: 'dusk', palettes: ['dusk'], ballast: 5 };
  kept.gold = 9;
  const roundTrip = decodeSave(encodeSave(kept));
  assert.deepEqual(roundTrip.shop, kept.shop);
  const old = decodeSave(btoa(JSON.stringify({ resources: {}, lifetime: {}, unlocked: ['driftwood_start'] })));
  assert.deepEqual(old.shop, createInitialState().shop, 'an older save gets an empty shop');

  console.log('gold shop tests passed');
}

// --- head start and prestige count ---
{
  assert.equal(headStartCost(0), 20);
  assert.equal(headStartCost(2), 60);
  const s = createInitialState();
  s.prestige.tokens = 19;
  assert.equal(buyHeadStart(s), false, 'twenty tokens for the first level');
  s.prestige.tokens = 10000;
  for (let level = 0; level < HEAD_START_MAX_LEVEL; level++) {
    const before = s.prestige.tokens;
    assert.equal(buyHeadStart(s), true);
    assert.equal(before - s.prestige.tokens, headStartCost(level));
  }
  assert.equal(s.prestige.headStart, HEAD_START_MAX_LEVEL);
  assert.equal(buyHeadStart(s), false, 'there is a top level');

  const finished = (headStart) => {
    const f = createInitialState();
    f.unlocked = TILES.map((t) => t.id);
    for (const t of TILES) f.levels[t.id] = MAX_LEVEL;
    for (const r of ['fish', 'kelp', 'driftwood', 'crops']) f.lifetime[r] = 10000;
    f.prestige.headStart = headStart;
    f.prestige.count = 4;
    f.shop.ballast = 7;
    f.shop.palettes = ['dusk'];
    f.shop.palette = 'dusk';
    f.gold = 33;
    f.achievements = ACHIEVEMENTS.map((a) => a.id); // already earned, so gold only shows what persists
    return f;
  };
  const none = doPrestige(finished(0)).state;
  assert.equal(none.unlocked.length, 1, 'no head start: just the starting tile');
  assert.equal(none.prestige.count, 5, 'each prestige is counted');
  assert.deepEqual(none.shop, { holdLevel: 0, tidesLevel: 0, palette: 'dusk', palettes: ['dusk'], ballast: 7 }, 'the shop is kept');
  assert.equal(none.gold, 33);

  const two = doPrestige(finished(2)).state;
  assert.equal(two.unlocked.length, 1 + 4, 'two tiles per level');
  assert.equal(two.prestige.headStart, 2, 'the upgrade itself carries over');
  for (const r of ['fish', 'kelp', 'driftwood', 'crops']) assert.equal(two.resources[r], 0, 'a head start costs nothing');
  for (const id of two.unlocked) {
    assert(
      id === 'driftwood_start' || TILE_NEIGHBORS.get(id).some((n) => two.unlocked.includes(n)),
      `${id} is connected to the raft`
    );
  }
  assert.deepEqual(doPrestige(finished(2)).state.unlocked, two.unlocked, 'the same tiles every time');
  const boosterIds = TILES.filter((t) => t.kind === 'booster').map((t) => t.id);
  for (const level of [1, 2, 3, 5]) {
    const st = doPrestige(finished(level)).state;
    for (const id of st.unlocked.filter((x) => boosterIds.includes(x))) {
      assert.equal(boosterIsIdle(st, TILES.find((t) => t.id === id)), false, `a head start never wastes ${id} on nothing to boost (level ${level})`);
    }
  }
  const big = doPrestige(finished(HEAD_START_MAX_LEVEL)).state;
  assert.equal(big.unlocked.length, 1 + 2 * HEAD_START_MAX_LEVEL);
  // Zone 4 borders zone 1 directly and its entry tiles are deliberately zone-1-cheap, so a large
  // enough head start now legitimately spills into it too, not just deeper into zone 1.
  assert(
    big.unlocked.every((id) => ['zone1', 'zone4'].includes(TILES.find((t) => t.id === id).zone)),
    'the head start stays in the zones reachable straight off the start tile (zone 1 and zone 4)'
  );

  console.log('head start tests passed');
}

// --- the new achievements ---
{
  const total = ACHIEVEMENTS.reduce((sum, a) => sum + a.reward, 0);
  assert.equal(total, 122, 'gold available from achievements');
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length, 'ids are unique');

  const st = createInitialState();
  const fired = (state) => new Set(checkAchievements(state).map((a) => a.id));

  for (const resource of ['fish', 'kelp', 'driftwood', 'crops']) {
    st.lifetime[resource] = 25000;
  }
  let got = fired(st);
  for (const resource of ['fish', 'kelp', 'driftwood', 'crops']) {
    assert(got.has(`${resource}-baron`), `${resource}-baron at 25,000`);
    assert(!got.has(`${resource}-magnate`), `${resource}-magnate needs 100,000`);
  }
  for (const resource of ['fish', 'kelp', 'driftwood', 'crops']) st.lifetime[resource] = 100000;
  got = fired(st);
  for (const resource of ['fish', 'kelp', 'driftwood', 'crops']) assert(got.has(`${resource}-magnate`));

  const counts = createInitialState();
  const ids = TILES.map((t) => t.id);
  const expectAt = { 10: 'tiles-10', 25: 'tiles-25', 36: 'tiles-36', 50: 'tiles-50', 72: 'tiles-72', 108: 'tiles-108', 144: 'tiles-144' };
  for (const [n, id] of Object.entries(expectAt)) {
    counts.unlocked = ids.slice(0, Number(n) - 1);
    assert(!fired(counts).has(id), `${id} not yet at ${n - 1} tiles`);
    counts.unlocked = ids.slice(0, Number(n));
    assert(fired(counts).has(id) || counts.achievements.includes(id), `${id} at ${n} tiles`);
  }

  // 144 is now the real total — only the top tier's name may claim completion.
  const tiles108 = ACHIEVEMENTS.find((a) => a.id === 'tiles-108');
  const tiles144 = ACHIEVEMENTS.find((a) => a.id === 'tiles-144');
  assert.equal(tiles108.description, 'Unlock 108 tiles', 'tiles-108 no longer claims "all" now that 144 exist');
  assert.notEqual(tiles108.name, 'A Whole Ocean', 'the old "complete" name moved off this tier');
  assert.notEqual(tiles108.name, 'The Whole Map', 'the new "complete" name belongs to the real top tier');
  assert.equal(tiles144.name, 'The Whole Map');
  assert.equal(tiles144.description, 'Unlock all 144 tiles');

  const voyages = createInitialState();
  for (const [n, id] of [[1, 'voyage-1'], [3, 'voyage-3'], [5, 'voyage-5'], [10, 'voyage-10']]) {
    voyages.prestige.count = n - 1;
    assert(!voyages.achievements.includes(id));
    voyages.prestige.count = n;
    checkAchievements(voyages);
    assert(voyages.achievements.includes(id), `${id} after ${n} prestige(s)`);
  }

  console.log('new achievement tests passed');
}

// --- Upgrade list (the quick-upgrade panel) ---
{
  const st = createInitialState();
  const rows = upgradeList(st);
  assert.equal(rows.length, st.unlocked.length, 'a new game lists just the tiles it starts with');
  assert(rows.every((r) => r.level === 1 && !r.ready), 'nothing is affordable at the start');

  // Locked tiles never appear, max-level tiles drop out.
  const zone1 = TILES.filter((t) => t.zone === 'zone1').slice(0, 12);
  st.unlocked = zone1.map((t) => t.id);
  st.levels[zone1[0].id] = MAX_LEVEL;
  st.levels[zone1[1].id] = MAX_LEVEL - 1;
  const listed = upgradeList(st).map((r) => r.tile.id);
  assert(!listed.includes(zone1[0].id), 'a maxed tile is not listed');
  assert(listed.includes(zone1[1].id), 'a tile below max is listed');
  assert(!listed.includes(TILES.find((t) => t.zone === 'zone2').id), 'a locked tile is not listed');
  assert.equal(listed.length, zone1.length - 1);

  // Each row agrees with the single-tile helpers.
  for (const resource of ['fish', 'kelp', 'driftwood', 'crops']) st.resources[resource] = 40;
  for (const row of upgradeList(st)) {
    assert.deepEqual(row.cost, levelUpCost(row.tile, row.level + 1));
    assert.equal(row.ready, isLevelUpEligible(st, row.tile), `${row.tile.id} ready flag`);
    assert(row.fraction >= 0 && row.fraction <= 1);
  }

  // Ready rows come first in board order; waiting rows follow, closest first.
  const ordered = upgradeList(st);
  const firstWaiting = ordered.findIndex((r) => !r.ready);
  assert(firstWaiting > 0 && ordered.slice(firstWaiting).every((r) => !r.ready), 'ready rows are grouped first');
  const order = (r) => TILES.indexOf(r.tile);
  for (let i = 1; i < ordered.length; i++) {
    const [a, b] = [ordered[i - 1], ordered[i]];
    if (a.ready && b.ready) assert(order(a) < order(b), 'ready rows keep board order');
    if (!a.ready && !b.ready) {
      assert(a.fraction >= b.fraction, 'waiting rows go closest first');
      if (a.fraction === b.fraction) assert(order(a) < order(b), 'ties keep board order');
    }
  }

  // Everything maxed: nothing to upgrade.
  for (const id of st.unlocked) st.levels[id] = MAX_LEVEL;
  assert.equal(upgradeList(st).length, 0);

  console.log('upgrade list tests passed');
}

// --- Bioluminescence (zone 3): dim until a zone-3 booster is unlocked next door ---
{
  const litByBooster = TILES.find((t) => t.id === 'abyssal_fish_start');
  const boosterNeighbor = TILES.find((t) => t.id === 'abyssal_booster_net_weavers');
  assert(TILE_NEIGHBORS.get(litByBooster.id).includes(boosterNeighbor.id), 'fixture assumption: these two tiles are adjacent');

  const noNeighborBooster = TILES.find((t) => t.id === 'abyssal_fish_tide_pool_trap');
  assert(
    !(TILE_NEIGHBORS.get(noNeighborBooster.id) || []).some((id) => TILES.find((t) => t.id === id)?.zone === 'zone3' && TILES.find((t) => t.id === id)?.kind === 'booster'),
    'fixture assumption: this tile has no zone-3 booster neighbor'
  );

  // Non-zone-3 tiles and zone-3 boosters are never dim, regardless of neighbors or unlocks.
  assert.equal(isLit(TILES.find((t) => t.id === 'fish_start'), []), true, 'a zone-1 tile is never dim');
  assert.equal(isLit(TILES.find((t) => t.id === 'frozen_fish_start'), []), true, 'a zone-2 tile is never dim');
  assert.equal(isLit(boosterNeighbor, []), true, 'a zone-3 booster is never dim itself');

  // A zone-3 producer with no unlocked zone-3 booster neighbor is dim...
  assert.equal(isLit(litByBooster, []), false, 'dim with nothing unlocked nearby');
  assert.equal(isLit(litByBooster, [boosterNeighbor.id]), true, '...lit once that neighbor is unlocked');
  assert.equal(isLit(noNeighborBooster, TILES.filter((t) => t.zone === 'zone3' && t.kind === 'booster').map((t) => t.id)), false, 'still dim: no zone-3 booster is actually adjacent to it, however many are unlocked elsewhere');

  // The darkness penalty actually halves the rate, and lighting it doubles output back to normal.
  // Uses a producer/booster pair whose resources don't overlap, so unlocking the booster only
  // lights the producer and doesn't also raise its rate via the booster's own (raft-wide) percent
  // — that's a separate, already-tested effect this assertion isn't about.
  const dimProducer = TILES.find((t) => t.id === 'abyssal_fish_anchored_net');
  const nonOverlappingBooster = TILES.find((t) => t.id === 'abyssal_booster_drying_rack');
  assert(TILE_NEIGHBORS.get(dimProducer.id).includes(nonOverlappingBooster.id), 'fixture assumption: these two tiles are adjacent');
  assert(!nonOverlappingBooster.boosts.some((b) => b.resource === dimProducer.produces), 'fixture assumption: this booster does not also boost fish');

  const st = createInitialState();
  st.unlocked = ['driftwood_start', dimProducer.id];
  const dimRate = effectiveTileRate(dimProducer, st.unlocked, st.levels);
  st.unlocked.push(nonOverlappingBooster.id);
  const litRate = effectiveTileRate(dimProducer, st.unlocked, st.levels);
  assert.equal(litRate, dimRate * 2, 'lighting a dim producer doubles its rate (the darkness penalty is 50%)');
  assert.equal(dimRate, dimProducer.rate * 0.5, 'a dim, unboosted, level-1 producer runs at exactly half its listed rate');

  // rateBreakdown and effectiveRate (the HUD/ETA/offline-progress path) reflect the same penalty.
  const before = rateBreakdown(st, 'fish').base;
  st.unlocked = st.unlocked.filter((id) => id !== nonOverlappingBooster.id);
  const after = rateBreakdown(st, 'fish').base;
  assert.equal(after, before / 2, 'rateBreakdown halves a dim zone-3 producer\'s contribution to the resource total');

  console.log('bioluminescence tests passed');
}

// --- Generators (zone 4): consume existing resources to make planks/kelp_rope/bread ---
{
  const sawmill1 = TILES.find((t) => t.id === 'timberline_sawmill_1');
  const sawmill2 = TILES.find((t) => t.id === 'timberline_sawmill_2');
  const ropeworks1 = TILES.find((t) => t.id === 'timberline_ropeworks_1');
  const toolShed = TILES.find((t) => t.id === 'timberline_booster_tool_shed');
  assert.deepEqual(sawmill1.consumes, { driftwood: 1.2 }, 'fixture assumption: Driftwood Sawpit consumes 1.2 driftwood/s for 0.6 planks/s');
  assert.deepEqual(ropeworks1.consumes, { kelp: 0.65, driftwood: 0.5 }, 'fixture assumption: Kelp Ropewalk has two inputs');

  // Full rate: abundant input, no throttling.
  {
    const state = createInitialState();
    state.unlocked = [sawmill1.id];
    state.resources.driftwood = 1000;
    assert.equal(generatorRate(state, sawmill1), 0.6, 'unthrottled, a level-1 sawmill runs at its listed rate');
    assert.equal(generatorRate(state, sawmill1), generatorFullRate(state, sawmill1), 'full rate matches the throttled rate when input is abundant');
    tick(state, 2);
    assert.equal(state.resources.planks, 1.2, 'planks gained = rate * dt (0.6 * 2)');
    assert.equal(Math.round(state.resources.driftwood * 10) / 10, 997.6, 'driftwood spent = consume rate * dt (1.2 * 2)');
    assert.equal(state.lifetime.planks, 1.2, 'lifetime tracks generator output too');
  }

  // Scarcity: a single generator throttles proportionally to what's actually in stock.
  {
    const state = createInitialState();
    state.unlocked = [sawmill1.id];
    state.resources.driftwood = 0.6; // half of the 1.2 desired for a 1s tick
    assert.equal(generatorRate(state, sawmill1), 0.3, 'half the driftwood in stock halves the output');
    tick(state, 1);
    assert.equal(state.resources.planks, 0.3);
    assert.equal(Math.round(state.resources.driftwood * 1e9) / 1e9, 0, 'the pool is drained to exactly zero, never negative');
  }

  // Two generators sharing a scarce input are throttled by the same fraction each -- not
  // first-come-first-served, where one would run full and the other starve.
  {
    const state = createInitialState();
    state.unlocked = [sawmill1.id, sawmill2.id];
    state.resources.driftwood = 1.25; // half of 1.2 + 1.3 = 2.5 combined demand for a 1s tick
    assert.equal(generatorRate(state, sawmill1), 0.3, 'sawmill 1 gets exactly half its full 0.6 rate');
    assert.equal(generatorRate(state, sawmill2), 0.325, 'sawmill 2 gets exactly half its full 0.65 rate too, not zero');
    tick(state, 1);
    assert.equal(Math.round(state.resources.planks * 1000) / 1000, 0.625, '0.3 + 0.325');
    assert.equal(Math.round(state.resources.driftwood * 1e9) / 1e9, 0, 'combined draw exactly matches the shared pool');
  }

  // A multi-input generator is capped by whichever input is scarcest -- and, per the documented
  // first-pass simplification, still draws its own full (unthrottled) share of a non-limiting
  // input rather than also scaling that draw down to match.
  {
    const state = createInitialState();
    state.unlocked = [ropeworks1.id];
    state.resources.kelp = 0.325; // half of the 0.65 desired
    state.resources.driftwood = 1000; // abundant
    assert.equal(generatorRate(state, ropeworks1), 0.25, 'output capped by the scarcer input (kelp), half of the full 0.5 rate');
    tick(state, 1);
    assert.equal(state.resources.kelp_rope, 0.25);
    assert.equal(Math.round(state.resources.kelp * 1e9) / 1e9, 0, 'kelp (the limiting input) is drained exactly to zero');
    assert.equal(Math.round((1000 - state.resources.driftwood) * 1e9) / 1e9, 0.25, 'driftwood is drawn at its own full rate (0.5) throttled by the kelp factor (0.5) = 0.25, not further reduced');
  }

  // Leveling up a generator costs its own output resource, the same convention as a producer.
  {
    assert.deepEqual(levelUpCost(sawmill1, 2), { planks: 18 }, 'round(0.6 rate * 30 base * step-1 multiplier 1)');
    assert.deepEqual(levelUpCost(sawmill1, 3), { planks: 45 }, 'round(0.6 rate * 30 base * step-2 multiplier 2.5)');
  }

  // rateBreakdown/boosterIsIdle count generator output (unthrottled) the same way they count a
  // producer's, so a zone-4 booster correctly stops reporting itself as idle once its resource
  // has any source at all -- even one that (as above) hasn't necessarily produced anything yet.
  {
    const state = createInitialState();
    assert.equal(boosterIsIdle(state, toolShed), true, 'no planks source yet');
    state.unlocked = [toolShed.id, sawmill1.id];
    assert.equal(boosterIsIdle(state, toolShed), false, 'a sawmill exists now, so the booster has something to boost');
  }

  // Discovering zone 4 fires its own achievement, same pattern as zone 2/3.
  {
    const state = createInitialState();
    state.unlocked.push(sawmill1.id);
    const awarded = checkAchievements(state).map((a) => a.id);
    assert(awarded.includes('timberline-coast-discovered'), 'unlocking a zone-4 tile awards timberline-coast-discovered');
  }

  console.log('zone 4 generator tests passed');
}
