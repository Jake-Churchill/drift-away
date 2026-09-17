import assert from 'node:assert/strict';
import { TILES, TILE_NEIGHBORS } from '../js/tiles.js';
import {
  ACHIEVEMENTS,
  applyOfflineProgress,
  buyPrestigeUpgrade,
  checkAchievements,
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
  loadState,
  MAX_LEVEL,
  prestigeTokensEarned,
  prestigeUpgradeCost,
  SAVE_KEY,
  tick,
  TOTAL_TILE_COUNT,
  unlockTile,
} from '../js/state.js';

// --- Tile data integrity ---

assert.equal(TILES.length, 72, 'expected exactly 72 tiles (36 zone-1 + 36 zone-2)');

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
  { fish: 16, kelp: 16, driftwood: 14, crops: 14, booster: 12 },
  'family counts doubled with zone 2 (8*2=16 fish/kelp, 7*2=14 driftwood/crops, 6*2=12 booster)'
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
  assert.equal(state.gold, 0, 'a fresh game starts with no gold');
  assert.deepEqual(state.achievements, [], 'a fresh game has earned no achievements');
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
    prestige: { tokens: 0, upgrades: { fish: 0, kelp: 0, driftwood: 0, crops: 0 } },
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
  assert.equal(ACHIEVEMENTS.length, 8, 'expected exactly 8 achievements');
  assert.equal(
    new Set(ACHIEVEMENTS.map((a) => a.id)).size,
    8,
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
  // halfway-there fires at ceil(TOTAL_TILE_COUNT / 2) maxed tiles
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
  assert.deepEqual(awarded.map((a) => a.id), ['halfway-there'], 'half the tiles maxed earns halfway-there');
  assert.equal(state.gold, goldBefore + 2, 'halfway-there pays 2 gold');
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

  assert.equal(result.state.gold, 9, 'gold is permanent currency and survives prestige');
  assert.deepEqual(
    result.state.achievements,
    ['first-steps', 'maxed-out'],
    'already-earned achievements carry over unchanged'
  );
  assert.notEqual(
    result.state.achievements,
    state.achievements,
    'the carried-over list is a copy, not a shared reference to the old state'
  );
  assert.deepEqual(result.state.resources, { fish: 0, kelp: 0, driftwood: 0, crops: 0 }, 'resources still reset');
  assert.deepEqual(result.state.lifetime, { fish: 0, kelp: 0, driftwood: 0, crops: 0 }, 'lifetime totals still reset');
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
