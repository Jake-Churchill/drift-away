# Drift Away Territory Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four-starting-tiles-anywhere unlock model with a single center starting tile (`driftwood_start`) and grid-adjacency-gated expansion — the player can only unlock a tile that's adjacent to one they've already unlocked, and a tile that isn't adjacent to anything unlocked yet shows no marker on the board at all (its cost is never visible because it can't be clicked).

**Architecture:** `js/tiles.js` gains a precomputed `TILE_NEIGHBORS` map (tile id → array of neighbor tile ids) built once from each tile's existing `gridPos`, and every tile's `unlock` field is rebalanced so the cost graph is completable one adjacency-ring at a time from the center. `js/state.js` gains `isDiscovered(tile, state)` and `isEligible` gains one guard clause that calls it. `js/render.js`'s per-frame tile-visibility loop and raycast hit-list both key off the same discovery check, so an undiscovered tile is simply not a valid click target — `js/ui.js` needs no changes at all.

**Tech Stack:** Same as the rest of the project — vanilla ES modules, Three.js via CDN import map (untouched by this plan), Node's built-in `assert` for tests.

**Spec:** `docs/superpowers/specs/2026-09-07-drift-away-territory-expansion-design.md`

## Global Constraints

- The neighbor formula must be the odd-r horizontal-offset relationship already implied by `js/scene.js`'s hex layout (`hexLocalPosition`) — spec §2.
- Only the `unlock` field of each of the 36 entries in `js/tiles.js`'s `TILES` array changes. `id`, `name`, `gridPos`, `family`, `kind`, `produces`, `rate`, and `boosts` are all unchanged — spec §4.
- `js/ui.js` is not touched by this plan at all — spec §5.
- In `isEligible`, the `type === 'start'` check must run **before** the discovery check, not after. A `'start'` tile (only `driftwood_start` now) must be unconditionally eligible regardless of what's currently unlocked — it's how the game bootstraps itself. Checking discovery first would make it depend on something already being unlocked, which is backwards for the one tile that has nothing unlocked yet when it matters. (This corrects the illustrative code order in spec §3 — found while writing this plan's test cases.)
- `loadState()` is not touched — existing players' saved `unlocked` arrays are preserved as-is, with no validation against the new rules (spec §6).
- **Git policy:** per the user's standing instruction, do not run `git commit` without checking with them first — batch confirmation across tasks is fine, same as the two prior plans for this project. Every commit message ends with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

## Task 1: Adjacency model, tile rebalance, and unlock logic

**Files:**
- Modify: `js/tiles.js` (full-file replace)
- Modify: `js/state.js:32-43` (the `isEligible` function, plus a new `isDiscovered` export immediately above it)
- Modify: `tests/economy.test.mjs` (full-file replace)

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Task 2's `js/render.js`):
  - `export const TILE_NEIGHBORS` from `js/tiles.js` — a `Map<string, string[]>` keyed by tile id, values are that tile's neighboring tile ids (up to 6, fewer at grid edges/corners).
  - `export function isDiscovered(tile, state)` from `js/state.js` — `true` if `tile.id` is in `state.unlocked`, or if any id in `TILE_NEIGHBORS.get(tile.id)` is in `state.unlocked`.
  - `isEligible(tile, state)` keeps its exact existing signature and return type (`boolean`); its behavior now additionally requires `isDiscovered(tile, state)` for non-`'start'` tiles.

- [ ] **Step 1: Write the new test file**

Replace all of `tests/economy.test.mjs` with:

```js
import assert from 'node:assert/strict';
import { TILES, TILE_NEIGHBORS } from '../js/tiles.js';
import {
  createInitialState,
  effectiveRate,
  effectiveTileRate,
  isDiscovered,
  isEligible,
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
    'crops_soil_barge',
    'crops_start',
    'crops_vertical_farm',
    'driftwood_flotsam_dredge',
    'driftwood_salvage_raft',
    'driftwood_shipwreck_salvage',
  ],
  'driftwood_start (2,3) has exactly these 6 neighbors'
);

assert.deepEqual(
  [...TILE_NEIGHBORS.get('kelp_start')].sort(),
  ['kelp_abyssal_forest', 'kelp_nursery', 'kelp_open_water_farm', 'kelp_seaweed_raft'],
  'kelp_start (0,1) has exactly these 4 neighbors (grid-edge tile, fewer than 6)'
);

console.log('adjacency tests passed');

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

// --- isDiscovered ---

{
  const state = { unlocked: ['driftwood_start'] };
  const adjacent = TILES.find((t) => t.id === 'crops_start');
  assert.equal(isDiscovered(adjacent, state), true, 'crops_start is adjacent to driftwood_start');

  const distant = TILES.find((t) => t.id === 'kelp_start');
  assert.equal(isDiscovered(distant, state), false, 'kelp_start is 3 hops from driftwood_start');

  const start = TILES.find((t) => t.id === 'driftwood_start');
  assert.equal(isDiscovered(start, state), true, 'an already-unlocked tile is always discovered');
}

// --- isEligible ---

{
  // cost-gated, adjacent to the sole unlocked tile: gated on resources only
  const tile = TILES.find((t) => t.id === 'crops_start'); // cost: 20 driftwood
  const state = { unlocked: ['driftwood_start'], resources: { driftwood: 10 }, lifetime: {} };
  assert.equal(isEligible(tile, state), false, 'not enough driftwood yet');
  state.resources.driftwood = 20;
  assert.equal(isEligible(tile, state), true, 'discovered and affordable');
}

{
  // milestone-gated, adjacent to the sole unlocked tile
  const tile = TILES.find((t) => t.id === 'driftwood_shipwreck_salvage'); // milestone: driftwood >= 60
  const state = { unlocked: ['driftwood_start'], resources: {}, lifetime: { driftwood: 59 } };
  assert.equal(isEligible(tile, state), false);
  state.lifetime.driftwood = 60;
  assert.equal(isEligible(tile, state), true);
}

{
  // not discovered: plenty of resources, but not adjacent to anything unlocked
  const tile = TILES.find((t) => t.id === 'kelp_start'); // cost: 50 driftwood + 40 crops
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

// --- unlockTile ---

{
  const state = createInitialState();
  state.resources.driftwood = 20;
  const tile = TILES.find((t) => t.id === 'crops_start');
  const ok = unlockTile(state, tile);
  assert.equal(ok, true, 'unlock succeeds when adjacent and affordable');
  assert.equal(state.resources.driftwood, 0, 'cost is deducted');
  assert.ok(state.unlocked.includes('crops_start'), 'tile id added to unlocked');
}

{
  const state = createInitialState();
  const tile = TILES.find((t) => t.id === 'crops_start');
  const ok = unlockTile(state, tile);
  assert.equal(ok, false, 'unlock fails when not enough resources');
  assert.ok(!state.unlocked.includes('crops_start'));
}

{
  const state = createInitialState();
  state.resources.driftwood = 9999;
  state.resources.crops = 9999;
  const tile = TILES.find((t) => t.id === 'fish_start'); // not adjacent to driftwood_start alone
  const ok = unlockTile(state, tile);
  assert.equal(ok, false, 'unlock fails when not adjacent to anything unlocked, however affordable');
}

console.log('economy math tests passed');
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node tests/economy.test.mjs`
Expected: FAIL — `TILE_NEIGHBORS` isn't exported from `js/tiles.js` yet, and `isDiscovered` isn't exported from `js/state.js` yet, so the import line itself will produce `undefined` bindings and the first assertion that uses them will throw.

- [ ] **Step 3: Replace `js/tiles.js`**

```js
export const TILES = [
  // Fish family (base resource: fish)
  { id: 'fish_start', name: 'Fishing Raft', gridPos: { row: 3, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 35, crops: 25 } } },
  { id: 'fish_anchored_net', name: 'Anchored Net', gridPos: { row: 3, col: 5 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 40 } } },
  { id: 'fish_trawling_raft', name: 'Trawling Raft', gridPos: { row: 4, col: 0 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'cost', cost: { kelp: 120, driftwood: 90 } } },
  { id: 'fish_tide_pool_trap', name: 'Tide Pool Trap', gridPos: { row: 4, col: 1 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 200 } },
  { id: 'fish_deep_sea_longline', name: 'Deep-Sea Longline', gridPos: { row: 4, col: 2 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 70, crops: 60 } } },
  { id: 'fish_grand_fishery', name: 'Grand Fishery', gridPos: { row: 4, col: 3 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 2.0, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 120 } },
  { id: 'fish_open_ocean_trawler', name: 'Open-Ocean Trawler', gridPos: { row: 4, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.8, boosts: null, unlock: { type: 'cost', cost: { driftwood: 90, crops: 70 } } },
  { id: 'fish_leviathan_net', name: 'Leviathan Net', gridPos: { row: 4, col: 5 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 2.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 140, crops: 120 } } },

  // Kelp family (base resource: kelp)
  { id: 'kelp_nursery', name: 'Kelp Nursery', gridPos: { row: 0, col: 0 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'cost', cost: { fish: 120, driftwood: 90 } } },
  { id: 'kelp_start', name: 'Kelp Farm', gridPos: { row: 0, col: 1 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 50, crops: 40 } } },
  { id: 'kelp_seaweed_raft', name: 'Seaweed Raft', gridPos: { row: 0, col: 2 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 30, crops: 20 } } },
  { id: 'kelp_floating_garden', name: 'Floating Garden', gridPos: { row: 0, col: 3 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 40 } },
  { id: 'kelp_deep_bed', name: 'Deep Kelp Bed', gridPos: { row: 0, col: 4 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 60, crops: 50 } } },
  { id: 'kelp_reef', name: 'Kelp Reef', gridPos: { row: 0, col: 5 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 2.0, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 300 } },
  { id: 'kelp_open_water_farm', name: 'Open-Water Kelp Farm', gridPos: { row: 1, col: 0 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.8, boosts: null, unlock: { type: 'cost', cost: { fish: 80, driftwood: 70 } } },
  { id: 'kelp_abyssal_forest', name: 'Abyssal Kelp Forest', gridPos: { row: 1, col: 1 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 2.5, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 150 } },

  // Driftwood family (base resource: driftwood)
  { id: 'driftwood_start', name: 'Driftwood Collector', gridPos: { row: 2, col: 3 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.5, boosts: null, unlock: { type: 'start' } },
  { id: 'driftwood_salvage_raft', name: 'Salvage Raft', gridPos: { row: 2, col: 4 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { driftwood: 25 } } },
  { id: 'driftwood_debris_net', name: 'Debris Net', gridPos: { row: 2, col: 5 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { crops: 45 } } },
  { id: 'driftwood_current_sweeper', name: 'Current Sweeper', gridPos: { row: 3, col: 0 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.8, boosts: null, unlock: { type: 'cost', cost: { kelp: 70, crops: 50 } } },
  { id: 'driftwood_storm_wreckage', name: 'Storm Wreckage Raft', gridPos: { row: 3, col: 1 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1.0, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 90 } },
  { id: 'driftwood_flotsam_dredge', name: 'Flotsam Dredge', gridPos: { row: 3, col: 2 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 35 } } },
  { id: 'driftwood_shipwreck_salvage', name: 'Shipwreck Salvage', gridPos: { row: 3, col: 3 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1.3, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 60 } },

  // Crops family (base resource: crops)
  { id: 'crops_start', name: 'Planter Raft', gridPos: { row: 1, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 20 } } },
  { id: 'crops_soil_barge', name: 'Soil Barge', gridPos: { row: 1, col: 3 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { driftwood: 30 } } },
  { id: 'crops_hanging_garden', name: 'Hanging Garden', gridPos: { row: 1, col: 4 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 40 } },
  { id: 'crops_terraced_planter', name: 'Terraced Planter', gridPos: { row: 1, col: 5 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.8, boosts: null, unlock: { type: 'cost', cost: { fish: 60, driftwood: 40 } } },
  { id: 'crops_floating_orchard', name: 'Floating Orchard', gridPos: { row: 2, col: 0 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1.0, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 150 } },
  { id: 'crops_paddy_raft', name: 'Paddy Raft', gridPos: { row: 2, col: 1 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 55 } } },
  { id: 'crops_vertical_farm', name: 'Vertical Farm', gridPos: { row: 2, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1.3, boosts: null, unlock: { type: 'cost', cost: { driftwood: 40 } } },

  // Booster family (no production of their own)
  { id: 'booster_drying_rack', name: 'Drying Rack', gridPos: { row: 5, col: 0 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'kelp', percent: 20 }, { resource: 'driftwood', percent: 20 }], unlock: { type: 'cost', cost: { kelp: 200, driftwood: 200 } } },
  { id: 'booster_smokehouse', name: 'Smokehouse', gridPos: { row: 5, col: 1 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 25 }], unlock: { type: 'cost', cost: { fish: 100, driftwood: 100 } } },
  { id: 'booster_windmill', name: 'Windmill', gridPos: { row: 5, col: 2 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 25 }], unlock: { type: 'milestone', resource: 'crops', target: 250 } },
  { id: 'booster_net_weavers', name: 'Net Weavers', gridPos: { row: 5, col: 3 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 20 }, { resource: 'kelp', percent: 20 }], unlock: { type: 'cost', cost: { fish: 150, kelp: 150 } } },
  { id: 'booster_composting_shed', name: 'Composting Shed', gridPos: { row: 5, col: 4 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 20 }, { resource: 'driftwood', percent: 20 }], unlock: { type: 'milestone', resource: 'driftwood', target: 400 } },
  { id: 'booster_lighthouse', name: 'Lighthouse', gridPos: { row: 5, col: 5 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 15 }, { resource: 'kelp', percent: 15 }, { resource: 'driftwood', percent: 15 }, { resource: 'crops', percent: 15 }], unlock: { type: 'milestone', resource: 'fish', target: 500 } },
];

function neighborGridPositions(row, col) {
  const deltas = row % 2 === 0
    ? [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]]
    : [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]];
  return deltas.map(([dr, dc]) => [row + dr, col + dc]);
}

const tileIdByPosition = new Map(TILES.map((t) => [`${t.gridPos.row},${t.gridPos.col}`, t.id]));

export const TILE_NEIGHBORS = new Map(
  TILES.map((t) => {
    const neighborIds = neighborGridPositions(t.gridPos.row, t.gridPos.col)
      .map(([r, c]) => tileIdByPosition.get(`${r},${c}`))
      .filter(Boolean);
    return [t.id, neighborIds];
  })
);
```

- [ ] **Step 4: Modify `js/state.js`**

Find this block (currently lines 32-43):

```js
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
```

Replace it with:

```js
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
```

And update the top-of-file import (currently `import { TILES } from './tiles.js';` on line 1) to also bring in `TILE_NEIGHBORS`:

```js
import { TILES, TILE_NEIGHBORS } from './tiles.js';
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node tests/economy.test.mjs`
Expected: PASS, printing `tile data tests passed`, `adjacency tests passed`, and `economy math tests passed`.

- [ ] **Step 6: Commit**

```bash
git add js/tiles.js js/state.js tests/economy.test.mjs
git commit -m "$(cat <<'EOF'
Add grid-adjacency unlock gating and rebalance all tile costs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Fog-of-war marker visibility (`js/render.js`)

**Files:**
- Modify: `js/render.js` (full-file replace)

**Interfaces:**
- Consumes: `isDiscovered` (new, from Task 1's `js/state.js`), `isEligible` (unchanged import from `js/state.js`), `TILES`, `buildScene` (unchanged imports).
- Produces: `initScene`, `updateScene`, `screenToGrid` keep their exact existing signatures — `js/main.js` needs no changes at all.

- [ ] **Step 1: Replace `js/render.js`**

```js
import * as THREE from 'three';
import { TILES } from './tiles.js';
import { isDiscovered, isEligible } from './state.js';
import { buildScene } from './scene.js';

let renderer, scene, camera, resizeFn, waterMesh, waterBasePositions, tileObjects;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export function initScene(canvas) {
  const built = buildScene(canvas);
  renderer = built.renderer;
  scene = built.scene;
  camera = built.camera;
  resizeFn = built.resize;
  waterMesh = built.waterMesh;
  waterBasePositions = built.waterBasePositions;
  tileObjects = built.tileObjects;

  function handleResize() {
    resizeFn(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', handleResize);
  handleResize();
}

function updateWater(elapsedSeconds) {
  const positions = waterMesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = waterBasePositions[i * 3];
    const z = waterBasePositions[i * 3 + 2];
    const y =
      Math.sin(x * 0.35 + elapsedSeconds * 1.1) * 0.05 +
      Math.sin(z * 0.5 + elapsedSeconds * 0.7) * 0.04 +
      Math.sin((x + z) * 0.2 + elapsedSeconds * 1.6) * 0.025;
    positions.setY(i, y);
  }
  positions.needsUpdate = true;
  waterMesh.geometry.computeVertexNormals();
}

export function updateScene(state, time) {
  updateWater(time / 1000);

  for (const tile of TILES) {
    const objects = tileObjects.get(tile.id);
    const unlocked = state.unlocked.includes(tile.id);
    const discovered = isDiscovered(tile, state); // already true when `unlocked` is true

    objects.raftMesh.visible = unlocked;
    objects.markerMesh.visible = !unlocked && discovered;

    if (!unlocked && discovered) {
      const eligible = isEligible(tile, state);
      const pulse = eligible ? 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time / 300)) : 0.35;
      objects.markerMesh.userData.outlineMaterial.opacity = pulse;
    }
  }

  renderer.render(scene, camera);
}

export function screenToGrid(screenX, screenY, canvasWidth, canvasHeight) {
  pointer.x = (screenX / canvasWidth) * 2 - 1;
  pointer.y = -(screenY / canvasHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hitTargets = [...tileObjects.values()]
    .flatMap((t) => [t.raftMesh, t.markerMesh])
    .filter((mesh) => mesh.visible);
  const intersections = raycaster.intersectObjects(hitTargets, false);
  if (intersections.length === 0) return null;

  const tileId = intersections[0].object.userData.tileId;
  const tile = TILES.find((t) => t.id === tileId);
  return tile ? tile.gridPos : null;
}
```

Note what changed from the previous version: `objects.markerMesh.visible` now requires `discovered` in addition to `!unlocked` (previously every locked tile's marker was always visible), and `screenToGrid`'s `hitTargets` now filters to `mesh.visible` only, so an undiscovered tile's invisible marker can never register a raycast hit (Three.js's `Raycaster` does not itself skip invisible objects — this filter is required, not redundant).

- [ ] **Step 2: Verify in browser**

Run the dev server (`npx serve .` or the project's existing `drift-away` launch config) and open the page in a private/incognito window (no leftover `localStorage`).

Expected: exactly one wood-toned raft is visible (`driftwood_start`, center of the grid), and exactly 6 translucent hex-outline markers surround it (its ring-1 neighbors: `crops_vertical_farm`, `driftwood_salvage_raft`, `crops_start`, `crops_soil_barge`, `driftwood_flotsam_dredge`, `driftwood_shipwreck_salvage`) — no other markers or outlines appear anywhere else on the board. Click empty water outside that cluster — nothing happens, no panel opens. Click `crops_start`'s marker (row 1, col 2) — the tile panel opens showing its cost (20 driftwood). No console errors.

- [ ] **Step 3: Commit**

```bash
git add js/render.js
git commit -m "$(cat <<'EOF'
Hide undiscovered tiles' markers and exclude them from hit-testing

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: End-to-end verification pass

**Files:** none (verification only — if this surfaces a bug, fix it in the relevant file from Task 1 or 2 and re-run the affected checks before continuing).

**Interfaces:** none — this exercises the fully assembled game.

- [ ] **Step 1: Run the automated tests**

Run: `npm test`
Expected: `tile data tests passed`, `adjacency tests passed`, `economy math tests passed`, exit code 0.

- [ ] **Step 2: Fresh-start expansion check**

In a private/incognito window, load the game. Wait for driftwood to reach 20 (≈40s at 0.5/s), unlock `crops_start` (row 1, col 2). Confirm its previously-hidden neighbors now appear as markers — specifically `kelp_abyssal_forest`, `kelp_seaweed_raft`, and `kelp_floating_garden` should newly appear (its other neighbors — `driftwood_start`, `crops_vertical_farm`, `crops_soil_barge` — were already discovered via ring 1 and should already have been visible).

- [ ] **Step 3: Undiscovered-tile click check**

With only the ring-0/ring-1 tiles discovered, click on the board where `fish_start` (row 3, col 4) or `kelp_start` (row 0, col 1) would be — both are still undiscovered at this point. Confirm nothing happens (no panel, no error) — clicking there must behave exactly like clicking open water.

- [ ] **Step 4: Multi-ring expansion check**

Continue playing (or accelerate by unlocking several ring-1 tiles) until `fish_start` and `kelp_start` become adjacent to unlocked territory and can themselves be unlocked. Confirm fish/kelp resources start accruing only once their respective `_start` tile is actually unlocked, not before.

- [ ] **Step 5: Deployment sanity check**

Run: `cat CNAME` — confirm it's still exactly `driftaway.jakechurchill.com` (this plan doesn't touch it). Confirm `index.html` is still at the repo root.

No commit for this task — it's verification only. If any step fails, fix the underlying file from Task 1 or 2 and re-run `npm test` plus the affected manual check before considering this plan done.
