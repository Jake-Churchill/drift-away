# Drift Away Tile Leveling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let every unlocked tile be leveled from 1 to 3, increasing its production rate (producers) or boost percent (boosters) by a fixed curve, at a cost derived from the tile's existing data (no visual change yet, but the renderer gets a hook for one later).

**Architecture:** `js/state.js` gains a sparse `state.levels` map and four new exports (`getLevel`, `levelUpCost`, `isLevelUpEligible`, `levelUpTile`) mirroring the existing `unlockTile` pattern; `effectiveRate`/`effectiveTileRate`/the internal `boostPercentFor` each gain an optional third `levels` parameter defaulting to `{}` so every existing call site is unaffected. `js/ui.js`'s tile panel reuses its single existing action button, switching between Unlock/Level-Up/Max-Level based on tile state. `js/main.js` gains a level-up click handler and a small fix to its per-frame panel refresh. `js/scene.js` gains a three-line, no-behavior-change addition exposing each tile's prop group for a future visual-per-level pass.

**Tech Stack:** Same as the rest of the project — vanilla ES modules, Node's built-in `assert` for tests.

**Spec:** `docs/superpowers/specs/2026-09-09-drift-away-leveling-design.md`

## Global Constraints

- Level effect: `levelMultiplier(level) = 1 + (level - 1) * 0.5` — level 1 = 1.0x, level 2 = 1.5x, level 3 = 2.0x. Applies identically to producer rate and booster boost percent — spec §2.
- Level-up cost: producers pay `{ [tile.produces]: round(tile.rate * 30 * stepMult) }`; boosters pay, per boosted resource, `round(percent * 6 * stepMult)`; `stepMult` is `1` for level 2 and `2.5` for level 3 — spec §2. These exact constants (30, 6, 1, 2.5) are load-bearing — they're what makes boosters cost more than producers; don't substitute different values.
- `state.levels` is sparse: a tile with no entry is level 1. No per-tile default needs populating on unlock — spec §3.
- The three rate/boost functions' new third parameter must default to `{}` — every existing call site (none of which pass a third argument) must continue to behave exactly as today — spec §3.
- No new DOM elements in `index.html` — the tile panel's existing single action button (`tile-panel-unlock-btn`) is reused for both Unlock and Level Up — spec §4.
- No 3D visual change this pass — spec §1 non-goals.
- **Git policy:** per the user's standing instruction, do not run `git commit` without checking with them first — batch confirmation across tasks is fine, same as the two prior plans for this project. Every commit message ends with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

## Task 1: Leveling core logic (`js/state.js`) + rendering hook (`js/scene.js`)

**Files:**
- Modify: `js/state.js` (full-file replace)
- Modify: `js/scene.js:504-517` (`addProp`), `js/scene.js:519-547` (`buildRaftMesh`), `js/scene.js:640-656` (the tile-building loop)
- Modify: `tests/economy.test.mjs` (full-file replace)

**Interfaces:**
- Consumes: nothing new from outside this task.
- Produces (used by Task 2):
  - `export const MAX_LEVEL` = `3` from `js/state.js`.
  - `export function getLevel(state, tileId)` → `number`.
  - `export function levelUpCost(tile, targetLevel)` → `{ [resource]: number }` (same shape as `tile.unlock.cost`).
  - `export function isLevelUpEligible(state, tile)` → `boolean`.
  - `export function levelUpTile(state, tile)` → `boolean` (mutates `state` on success, exactly like the existing `unlockTile`).
  - `effectiveRate(resource, unlockedIds, levels = {})` and `effectiveTileRate(tile, unlockedIds, levels = {})` — same names, one new optional parameter each.
  - `js/scene.js`'s `buildScene(canvas)` return value's `tileObjects` is now `Map<string, { raftMesh, markerMesh, propGroup }>` (previously `{ raftMesh, markerMesh }`) — Task 2 does not need this yet, but nothing later breaks: `js/render.js` only ever reads `.raftMesh`/`.markerMesh` off these entries, so the added key is inert.

- [ ] **Step 1: Write the failing tests**

Replace all of `tests/economy.test.mjs` with:

```js
import assert from 'node:assert/strict';
import { TILES, TILE_NEIGHBORS } from '../js/tiles.js';
import {
  createInitialState,
  effectiveRate,
  effectiveTileRate,
  getLevel,
  isDiscovered,
  isEligible,
  isLevelUpEligible,
  levelUpCost,
  levelUpTile,
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node tests/economy.test.mjs`
Expected: FAIL — `getLevel`, `levelUpCost`, `isLevelUpEligible`, `levelUpTile` aren't exported from `js/state.js` yet, so the import line produces `undefined` bindings and the first assertion using one of them throws.

- [ ] **Step 3: Replace `js/state.js`**

```js
import { TILES, TILE_NEIGHBORS } from './tiles.js';

export const RESOURCES = ['fish', 'kelp', 'driftwood', 'crops'];
export const SAVE_KEY = 'driftaway_save_v1';
export const MAX_LEVEL = 3;

const STEP_MULTIPLIER = { 2: 1, 3: 2.5 };
const PRODUCER_UPGRADE_BASE = 30;
const BOOSTER_UPGRADE_BASE = 6;

export function createInitialState() {
  const resources = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  const lifetime = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  const unlocked = TILES.filter((t) => t.unlock.type === 'start').map((t) => t.id);
  return { version: 1, resources, lifetime, unlocked, levels: {} };
}

function levelMultiplier(level) {
  return 1 + (level - 1) * 0.5;
}

function boostPercentFor(resource, unlockedIds, levels = {}) {
  return TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'booster')
    .flatMap((t) => t.boosts.map((b) => ({ ...b, level: levels[t.id] || 1 })))
    .filter((b) => b.resource === resource)
    .reduce((sum, b) => sum + b.percent * levelMultiplier(b.level), 0);
}

export function effectiveRate(resource, unlockedIds, levels = {}) {
  const baseSum = TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'producer' && t.produces === resource)
    .reduce((sum, t) => sum + t.rate * levelMultiplier(levels[t.id] || 1), 0);
  return baseSum * (1 + boostPercentFor(resource, unlockedIds, levels) / 100);
}

export function effectiveTileRate(tile, unlockedIds, levels = {}) {
  const level = levels[tile.id] || 1;
  return tile.rate * levelMultiplier(level) * (1 + boostPercentFor(tile.produces, unlockedIds, levels) / 100);
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
  return true;
}

export function tick(state, dt) {
  for (const resource of RESOURCES) {
    const amount = effectiveRate(resource, state.unlocked, state.levels) * dt;
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
```

Note on `loadState()`: it is otherwise byte-identical to before. An old save with no `levels` key simply inherits `base.levels` (`{}`) from the `{ ...base, ...parsed }` spread — no new merge logic needed, per spec §3.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node tests/economy.test.mjs`
Expected: PASS, printing `tile data tests passed`, `adjacency tests passed`, `geometry-derived adjacency tests passed`, and `economy math tests passed`.

- [ ] **Step 5: Add the rendering hook to `js/scene.js`**

Find `addProp` (currently lines 504-517):

```js
function addProp(raftMesh, tile) {
  const propGroup = new THREE.Group();
  propGroup.position.y = WALL_HEIGHT;
  switch (tile.family) {
    case 'fish': buildFishProp(propGroup); break;
    case 'kelp': buildKelpProp(propGroup); break;
    case 'driftwood': buildDriftwoodProp(propGroup); break;
    case 'crops': buildCropsProp(propGroup); break;
    case 'booster': buildBoosterProp(propGroup, tile.id); break;
  }
  const extraScale = LARGE_BOOSTER_IDS.has(tile.id) ? BOOSTER_PROP_SCALE : 1;
  propGroup.scale.setScalar(PROP_SCALE * extraScale);
  raftMesh.add(propGroup);
}
```

Add a `return propGroup;` as its last line:

```js
function addProp(raftMesh, tile) {
  const propGroup = new THREE.Group();
  propGroup.position.y = WALL_HEIGHT;
  switch (tile.family) {
    case 'fish': buildFishProp(propGroup); break;
    case 'kelp': buildKelpProp(propGroup); break;
    case 'driftwood': buildDriftwoodProp(propGroup); break;
    case 'crops': buildCropsProp(propGroup); break;
    case 'booster': buildBoosterProp(propGroup, tile.id); break;
  }
  const extraScale = LARGE_BOOSTER_IDS.has(tile.id) ? BOOSTER_PROP_SCALE : 1;
  propGroup.scale.setScalar(PROP_SCALE * extraScale);
  raftMesh.add(propGroup);
  return propGroup;
}
```

Find `buildRaftMesh` (currently lines 519-547), specifically its last two lines:

```js
  addProp(raftMesh, tile);
  return raftMesh;
}
```

Replace with:

```js
  const propGroup = addProp(raftMesh, tile);
  return { raftMesh, propGroup };
}
```

Find the tile-building loop inside `buildScene` (currently around lines 640-656):

```js
  const tileObjects = new Map();
  for (const tile of TILES) {
    const { x, z } = hexLocalPosition(tile.gridPos.row, tile.gridPos.col);

    const raftMesh = buildRaftMesh(tile);
    raftMesh.position.set(x, 0, z);
    raftMesh.visible = false;
    scene.add(raftMesh);

    const markerMesh = buildMarkerMesh(tile);
    markerMesh.position.x = x;
    markerMesh.position.z = z;
    markerMesh.visible = false;
    scene.add(markerMesh);

    tileObjects.set(tile.id, { raftMesh, markerMesh });
```

Replace the first line inside the loop and the final line shown with:

```js
  const tileObjects = new Map();
  for (const tile of TILES) {
    const { x, z } = hexLocalPosition(tile.gridPos.row, tile.gridPos.col);

    const { raftMesh, propGroup } = buildRaftMesh(tile);
    raftMesh.position.set(x, 0, z);
    raftMesh.visible = false;
    scene.add(raftMesh);

    const markerMesh = buildMarkerMesh(tile);
    markerMesh.position.x = x;
    markerMesh.position.z = z;
    markerMesh.visible = false;
    scene.add(markerMesh);

    tileObjects.set(tile.id, { raftMesh, markerMesh, propGroup });
```

(Everything else in that loop and the rest of the file is unchanged. `buildRaftMesh` has exactly one call site, inside this loop.)

- [ ] **Step 6: Verify no syntax errors and no regressions**

Run: `node --check js/scene.js`
Expected: no output (syntax is valid).

Run: `node tests/economy.test.mjs`
Expected: still PASS (this step didn't touch anything the test suite exercises, but confirms nothing else broke).

- [ ] **Step 7: Commit**

```bash
git add js/state.js js/scene.js tests/economy.test.mjs
git commit -m "$(cat <<'EOF'
Add tile leveling core logic and a rendering hook for future per-level visuals

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Tile panel UI + game wiring (`js/ui.js`, `js/main.js`)

**Files:**
- Modify: `js/ui.js` (full-file replace)
- Modify: `js/main.js` (full-file replace)

**Interfaces:**
- Consumes: `MAX_LEVEL`, `getLevel`, `levelUpCost`, `isLevelUpEligible`, `levelUpTile` (Task 1, `js/state.js`).
- Produces: nothing new for later tasks — this is the last code task. `showTilePanel`'s signature becomes `showTilePanel(tile, state, eligible, onUnlock, onLevelUp)` (previously 4 params, no `onLevelUp`).

- [ ] **Step 1: Replace `js/ui.js`**

```js
import { RESOURCES, effectiveTileRate, getLevel, levelUpCost, MAX_LEVEL } from './state.js';

const elements = {};

const RESOURCE_ICONS = { fish: '🐟', kelp: '🌿', driftwood: '🪵', crops: '🌾' };

function tileIcon(tile) {
  if (tile.kind === 'producer') return RESOURCE_ICONS[tile.produces];
  return tile.boosts.map((b) => RESOURCE_ICONS[b.resource]).join('');
}

export function initUI(onClose) {
  elements.canvas = document.getElementById('game-canvas');
  elements.counts = {};
  for (const resource of RESOURCES) {
    elements.counts[resource] = document.getElementById(`count-${resource}`);
  }
  elements.panel = document.getElementById('tile-panel');
  elements.panelIcon = document.getElementById('tile-panel-icon');
  elements.panelName = document.getElementById('tile-panel-name');
  elements.panelDesc = document.getElementById('tile-panel-desc');
  elements.panelProgress = document.getElementById('tile-panel-progress');
  elements.panelUnlockBtn = document.getElementById('tile-panel-unlock-btn');
  elements.panelCloseBtn = document.getElementById('tile-panel-close-btn');
  elements.panelCloseBtn.addEventListener('click', () => {
    hideTilePanel();
    if (onClose) onClose();
  });
}

export function getCanvas() {
  return elements.canvas;
}

export function updateResourceBar(state) {
  for (const resource of RESOURCES) {
    elements.counts[resource].textContent = Math.floor(state.resources[resource]).toLocaleString();
  }
}

function describeCost(cost) {
  return Object.entries(cost)
    .map(([resource, amount]) => `${amount} ${resource}`)
    .join(' + ');
}

function costProgressFraction(cost, state) {
  const fractions = Object.entries(cost).map(([resource, amount]) =>
    Math.min(1, state.resources[resource] / amount)
  );
  return Math.min(...fractions);
}

function describeUnlock(tile) {
  if (tile.unlock.type === 'cost') {
    return describeCost(tile.unlock.cost);
  }
  return `Reach ${tile.unlock.target} lifetime ${tile.unlock.resource}`;
}

function progressFraction(tile, state) {
  if (tile.unlock.type === 'cost') {
    return costProgressFraction(tile.unlock.cost, state);
  }
  return Math.min(1, state.lifetime[tile.unlock.resource] / tile.unlock.target);
}

function describeProduction(tile, state) {
  return tile.kind === 'producer'
    ? `Produces ${Number(effectiveTileRate(tile, state.unlocked, state.levels).toFixed(2))} ${tile.produces}/s`
    : tile.boosts.map((b) => `+${b.percent}% ${b.resource}`).join(', ');
}

export function showTilePanel(tile, state, eligible, onUnlock, onLevelUp) {
  elements.panel.classList.remove('hidden');
  elements.panelIcon.textContent = tileIcon(tile);
  elements.panelName.textContent = tile.name;

  const unlocked = state.unlocked.includes(tile.id);
  if (!unlocked) {
    elements.panelDesc.textContent = `Requires: ${describeUnlock(tile)}`;
    const frac = progressFraction(tile, state);
    elements.panelProgress.textContent = `${Math.floor(frac * 100)}% ready`;
    elements.panelUnlockBtn.classList.remove('hidden');
    elements.panelUnlockBtn.textContent = 'Unlock';
    elements.panelUnlockBtn.disabled = !eligible;
    elements.panelUnlockBtn.onclick = () => onUnlock(tile);
    return;
  }

  const level = getLevel(state, tile.id);
  const description = `${describeProduction(tile, state)} (Level ${level})`;

  if (level >= MAX_LEVEL) {
    elements.panelDesc.textContent = description;
    elements.panelProgress.textContent = 'Max Level';
    elements.panelUnlockBtn.classList.add('hidden');
    return;
  }

  const cost = levelUpCost(tile, level + 1);
  elements.panelDesc.textContent = description;
  const frac = costProgressFraction(cost, state);
  elements.panelProgress.textContent = `${Math.floor(frac * 100)}% to Level ${level + 1}`;
  elements.panelUnlockBtn.classList.remove('hidden');
  elements.panelUnlockBtn.textContent = `Level Up (${describeCost(cost)})`;
  elements.panelUnlockBtn.disabled = !eligible;
  elements.panelUnlockBtn.onclick = () => onLevelUp(tile);
}

export function hideTilePanel() {
  elements.panel.classList.add('hidden');
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node --check js/ui.js`
Expected: no output.

- [ ] **Step 3: Replace `js/main.js`**

```js
import { TILES } from './tiles.js';
import { getLevel, isEligible, isLevelUpEligible, levelUpTile, loadState, MAX_LEVEL, saveState, tick, unlockTile } from './state.js';
import { initScene, updateScene, screenToGrid } from './render.js';
import { initUI, getCanvas, updateResourceBar, showTilePanel, hideTilePanel } from './ui.js';

let selectedTileId = null;

initUI(() => {
  selectedTileId = null;
});

const canvas = getCanvas();
initScene(canvas);

let state = loadState();

function renderTilePanel(tile) {
  const unlocked = state.unlocked.includes(tile.id);
  const eligible = unlocked ? isLevelUpEligible(state, tile) : isEligible(tile, state);
  showTilePanel(tile, state, eligible, handleUnlockClick, handleLevelUpClick);
}

function handleUnlockClick(tile) {
  const success = unlockTile(state, tile);
  if (success) {
    saveState(state);
    renderTilePanel(tile);
  }
}

function handleLevelUpClick(tile) {
  const success = levelUpTile(state, tile);
  if (success) {
    saveState(state);
    renderTilePanel(tile);
  }
}

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const gridPos = screenToGrid(x, y, rect.width, rect.height);

  if (!gridPos) {
    selectedTileId = null;
    hideTilePanel();
    return;
  }

  const tile = TILES.find((t) => t.gridPos.row === gridPos.row && t.gridPos.col === gridPos.col);
  if (!tile) return;

  selectedTileId = tile.id;
  renderTilePanel(tile);
});

let lastFrameTime = performance.now();
let timeSinceSave = 0;

function loop(now) {
  const dt = Math.min(0.25, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  tick(state, dt);
  updateResourceBar(state);

  if (selectedTileId) {
    const tile = TILES.find((t) => t.id === selectedTileId);
    const stillProgressing = tile && (!state.unlocked.includes(tile.id) || getLevel(state, tile.id) < MAX_LEVEL);
    if (stillProgressing) {
      renderTilePanel(tile);
    }
  }

  updateScene(state, now);

  timeSinceSave += dt;
  if (timeSinceSave >= 10) {
    saveState(state);
    timeSinceSave = 0;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

window.addEventListener('beforeunload', () => {
  saveState(state);
});
```

Note what changed from before: `handleUnlockClick` and the click handler both now call the new shared `renderTilePanel(tile)` helper instead of calling `showTilePanel` directly with an inline `isEligible(tile, state)` — the helper picks `isLevelUpEligible` or `isEligible` depending on whether the tile is unlocked, and always passes both callbacks (`showTilePanel` only wires up whichever one applies). The per-frame loop's refresh condition changes from "only refresh a selected locked tile" to "refresh a selected tile that still has something to progress toward" (locked, or unlocked-but-below `MAX_LEVEL`) — a level-3 tile's panel is now static, matching a locked tile before this feature existed.

- [ ] **Step 4: Verify no syntax errors**

Run: `node --check js/main.js`
Expected: no output.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS, all four sections (this task didn't touch any tested logic, but confirms nothing broke).

- [ ] **Step 6: Verify in browser**

Run the dev server (`npx serve .` or the project's existing `drift-away` launch config) and open the page in a private/incognito window.

Expected, in order:
1. No console errors on load.
2. Click `driftwood_start`'s raft (the only unlocked tile at first) — the panel shows "Driftwood Collector", "Produces 0.5 driftwood/s (Level 1)", a progress bar toward level 2 (15 driftwood), and a "Level Up (15 driftwood)" button, disabled until you have 15 driftwood.
3. Wait for driftwood to reach 15 (or accelerate via `localStorage` if you want to move faster — see the territory-expansion plan's Task 3 for the pattern of blocking `localStorage.setItem` before `location.reload()` to avoid the autosave race), click "Level Up" — the panel updates immediately to "Level 2", a new progress bar toward level 3 (38 driftwood) appears, and driftwood resets to 0.
4. Leave the panel open and watch driftwood accrue — the progress bar percentage should climb live, without needing to re-click the tile (this exercises the per-frame refresh fix in Step 3).
5. Unlock a second tile (e.g. `crops_start`, cost 20 driftwood) and confirm its panel independently shows "Level 1" and its own level-up cost — leveling one tile must not affect another's level.
6. Manually level a tile to 3 (or edit `localStorage` to set `levels: { driftwood_start: 3 }` and reload) and confirm its panel shows "Max Level" with no button.
7. Confirm a still-locked tile's panel is completely unaffected (still shows "Requires: ..." / "Unlock", no level text) — leveling only applies post-unlock.

- [ ] **Step 7: Commit**

```bash
git add js/ui.js js/main.js
git commit -m "$(cat <<'EOF'
Wire tile leveling into the panel UI and game loop

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
Expected: `tile data tests passed`, `adjacency tests passed`, `geometry-derived adjacency tests passed`, `economy math tests passed`, exit code 0.

- [ ] **Step 2: Booster-vs-producer cost check**

In the browser (or via a direct module import in the page console, as done for the territory-expansion plan's verification), confirm `levelUpCost` for a booster genuinely costs more than a producer of comparable tier — e.g. compare `booster_smokehouse`'s level-2 cost (150 fish) against `fish_start`'s level-2 cost (30 fish). This is the feature's core ask ("boosters should be more expensive") — confirm it holds for at least one more booster/producer pair beyond what the unit tests already cover.

- [ ] **Step 3: Save/reload persistence check**

Level up a tile, reload the page, and confirm the level persisted (this exercises `saveState`/`loadState` with the new `levels` field, which Task 1 didn't add any special-case merge logic for — confirming the default `{ ...base, ...parsed }` spread genuinely round-trips it).

- [ ] **Step 4: Old-save compatibility check**

In the browser console, simulate an old save that predates this feature by writing a `driftaway_save_v1` value with no `levels` key at all, then reload. Confirm the game loads without error and every unlocked tile reads as level 1 (this is the save-compatibility claim from spec §3 — worth confirming directly rather than trusting the code-reading alone).

- [ ] **Step 5: Regression check on unlocking**

Confirm unlocking a brand-new tile still works exactly as before (this feature didn't change `unlockTile`, `isEligible`, or `isDiscovered`, but the panel/click-handling code around them changed in Task 2 — confirm the refactor didn't regress the unlock flow itself).

No commit for this task — it's verification only. If any step fails, fix the underlying file from Task 1 or 2 and re-run `npm test` plus the affected manual check before considering this plan done.
