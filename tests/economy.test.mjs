import assert from 'node:assert/strict';
import { TILES, TILE_NEIGHBORS } from '../js/tiles.js';
import {
  applyOfflineProgress,
  buyPrestigeUpgrade,
  completionCount,
  createInitialState,
  doPrestige,
  effectiveRate,
  effectiveTileRate,
  getLevel,
  isDiscovered,
  isEligible,
  isFullyComplete,
  isLevelUpEligible,
  levelUpCost,
  levelUpTile,
  MAX_LEVEL,
  prestigeTokensEarned,
  prestigeUpgradeCost,
  RESOURCES,
  tick,
  unlockTile,
} from '../js/state.js';

// --- Tile data integrity ---

assert.equal(TILES.length, 36, 'expected exactly 36 tiles');

const ids = TILES.map((t) => t.id);
assert.equal(new Set(ids).size, 36, 'tile ids must be unique');

const positions = TILES.map((t) => `${t.gridPos.row},${t.gridPos.col}`);
assert.equal(new Set(positions).size, 36, 'grid positions must be unique');
for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 6; col++) {
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
  { fish: 8, kelp: 8, driftwood: 7, crops: 7, booster: 6 },
  'family counts are unchanged by the rebalance'
);

console.log('tile data tests passed');

// --- TILE_NEIGHBORS ---

assert.equal(TILE_NEIGHBORS.size, 36, 'every tile has a neighbor-list entry');

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
  ['booster_net_weavers', 'crops_floating_orchard', 'kelp_floating_garden', 'kelp_open_water_farm'],
  'fish_start (0,1) has exactly these 4 neighbors (grid-edge tile, fewer than 6)'
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
  const x = col * GEOM_HEX_WIDTH + (row % 2 === 1 ? GEOM_HEX_WIDTH / 2 : 0);
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
    { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    'resources shape must match pre-refactor output exactly'
  );
  assert.deepEqual(
    state.lifetime,
    { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    'lifetime shape must match pre-refactor output exactly'
  );
  assert.deepEqual(state.unlocked, ['driftwood_start'], 'only the single start tile is unlocked');
  assert.deepEqual(state.levels, {}, 'no tile starts above level 1');
}

{
  const state = createInitialState();
  assert.deepEqual(
    state.prestige,
    { tokens: 0, upgrades: { fish: 0, kelp: 0, driftwood: 0, crops: 0 } },
    'a fresh game starts with zero prestige tokens and no upgrades purchased'
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
  assert.equal(completionCount(state), 36, 'every tile unlocked and maxed counts as complete');
  assert.equal(isFullyComplete(state), true, 'fully complete once every tile is unlocked and maxed');
}

{
  const state = createInitialState();
  state.unlocked = TILES.map((t) => t.id);
  for (const t of TILES) state.levels[t.id] = MAX_LEVEL;
  state.levels[TILES[0].id] = 1;
  assert.equal(completionCount(state), 35, 'one non-maxed tile is excluded from the count');
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
  assert.deepEqual(result.state.resources, { fish: 0, kelp: 0, driftwood: 0, crops: 0 }, 'resources reset');
  assert.deepEqual(result.state.lifetime, { fish: 0, kelp: 0, driftwood: 0, crops: 0 }, 'lifetime totals reset');
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
