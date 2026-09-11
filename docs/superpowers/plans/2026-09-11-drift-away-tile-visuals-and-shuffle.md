# Drift Away — Tile Level Visuals & Layout Shuffle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshuffle which tile occupies which grid slot (breaking the four family-colored blocks) and give every tile's 3D prop a visibly bigger, more elaborate look at level 2/3 (currently `state.levels` has zero rendering effect).

**Architecture:** Part A rewrites `js/tiles.js`'s `TILES` array in place (new `gridPos`+`unlock` per tile id, everything else unchanged) and fixes two hardcoded neighbor-list assertions in `tests/economy.test.mjs`. Part B adds a shared scale+badge+trim-ring mechanism to `js/scene.js` (one task), wires it into `js/render.js`'s per-frame visibility toggle (same task), then gives each of the 9 remaining prop archetypes (fish, kelp, driftwood, crops, and 5 of the 6 boosters — windmill needs no prop change) its own per-level embellishment in its own task, each following the existing "build once, toggle `.visible`" pattern already used for `raftMesh`/`markerMesh`.

**Tech Stack:** Vanilla ES modules, Three.js r182 via CDN import map (no npm dependency, no build step), Node `assert` for `tests/economy.test.mjs` (run via `npm test` — plain `node tests/economy.test.mjs`, no test framework).

**Spec:** [docs/superpowers/specs/2026-09-11-drift-away-tile-visuals-and-shuffle-design.md](../specs/2026-09-11-drift-away-tile-visuals-and-shuffle-design.md)

## Global Constraints

- No new npm dependencies, no build step — `three` is loaded only via the browser `<script type="importmap">` in `index.html`, so `js/scene.js`/`js/render.js` cannot be syntax/runtime-checked with plain `node`; verify them by loading the actual game in the browser instead.
- Follow the project's existing "build every variant once at scene-construction time, toggle `.visible` per frame" pattern (already used for `raftMesh`/`markerMesh`) — never rebuild geometry in the per-frame `updateScene` loop.
- `js/tiles.js`'s `unlock` field travels with the **slot** (`gridPos`), never with the **flavor** (`id`) — this is the whole mechanism Part A relies on.
- Don't touch unlock/discovery mechanics, the leveling economy (`js/state.js`), or add new prop archetypes — this plan is a data reassignment (Part A) plus a rendering-only pass (Part B) on top of already-existing `state.levels` data.
- `npm test` (= `node tests/economy.test.mjs`) must pass after every task.

## Verification recipe (used by every Part B task)

Each Part B task's browser-verification step reloads the real game with a hand-crafted save injected into `localStorage`, so specific tiles can be inspected at level 2/3 without playing through the economy. The 36 tile ids never change across the shuffle (only their `gridPos`/`unlock` do), so this same id list is valid for every task:

```js
localStorage.setItem('driftaway_save_v1', JSON.stringify({
  version: 1,
  resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  unlocked: [
    'fish_start', 'fish_anchored_net', 'fish_trawling_raft', 'fish_tide_pool_trap',
    'fish_deep_sea_longline', 'fish_grand_fishery', 'fish_open_ocean_trawler', 'fish_leviathan_net',
    'kelp_nursery', 'kelp_start', 'kelp_seaweed_raft', 'kelp_floating_garden',
    'kelp_deep_bed', 'kelp_reef', 'kelp_open_water_farm', 'kelp_abyssal_forest',
    'driftwood_start', 'driftwood_salvage_raft', 'driftwood_debris_net', 'driftwood_current_sweeper',
    'driftwood_storm_wreckage', 'driftwood_flotsam_dredge', 'driftwood_shipwreck_salvage',
    'crops_start', 'crops_soil_barge', 'crops_hanging_garden', 'crops_terraced_planter',
    'crops_floating_orchard', 'crops_paddy_raft', 'crops_vertical_farm',
    'booster_drying_rack', 'booster_smokehouse', 'booster_windmill',
    'booster_net_weavers', 'booster_composting_shed', 'booster_lighthouse',
  ],
  levels: { /* set per task */ },
}));
location.reload();
```

Every task's own step gives the exact `levels` object to use and what to look for in the resulting screenshot.

---

## Task 1: Layout shuffle — rewrite `js/tiles.js` and fix two dependent tests

**Files:**
- Modify: `js/tiles.js:1-47` (the `TILES` array — `neighborGridPositions`/`TILE_NEIGHBORS` below it are unchanged, they derive from `gridPos` automatically)
- Modify: `tests/economy.test.mjs:65-82` (two hardcoded neighbor-list assertions)

**Interfaces:**
- Consumes: nothing new — `TILES`' shape (`{id, name, gridPos, family, kind, produces, rate, boosts, unlock}`) is unchanged, only per-tile field values move.
- Produces: `TILES` with the post-shuffle `gridPos`/`unlock` values every later task's manual verification (and the whole game) will run against.

- [ ] **Step 1: Replace the `TILES` array**

Replace the entire `export const TILES = [ ... ];` block (lines 1-47) in `js/tiles.js` with:

```js
export const TILES = [
  // Fish family (base resource: fish)
  { id: 'fish_start', name: 'Fishing Raft', gridPos: { row: 0, col: 1 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 50, crops: 40 } } },
  { id: 'fish_anchored_net', name: 'Anchored Net', gridPos: { row: 0, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 60, crops: 50 } } },
  { id: 'fish_trawling_raft', name: 'Trawling Raft', gridPos: { row: 2, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'cost', cost: { driftwood: 25 } } },
  { id: 'fish_tide_pool_trap', name: 'Tide Pool Trap', gridPos: { row: 5, col: 2 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 250 } },
  { id: 'fish_deep_sea_longline', name: 'Deep-Sea Longline', gridPos: { row: 1, col: 5 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { fish: 60, driftwood: 40 } } },
  { id: 'fish_grand_fishery', name: 'Grand Fishery', gridPos: { row: 3, col: 0 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 2, boosts: null, unlock: { type: 'cost', cost: { kelp: 70, crops: 50 } } },
  { id: 'fish_open_ocean_trawler', name: 'Open-Ocean Trawler', gridPos: { row: 0, col: 3 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.8, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 40 } },
  { id: 'fish_leviathan_net', name: 'Leviathan Net', gridPos: { row: 4, col: 1 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 2.5, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 200 } },

  // Kelp family (base resource: kelp)
  { id: 'kelp_nursery', name: 'Kelp Nursery', gridPos: { row: 2, col: 0 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 150 } },
  { id: 'kelp_start', name: 'Kelp Farm', gridPos: { row: 4, col: 2 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 70, crops: 60 } } },
  { id: 'kelp_seaweed_raft', name: 'Seaweed Raft', gridPos: { row: 1, col: 3 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 30 } } },
  { id: 'kelp_floating_garden', name: 'Floating Garden', gridPos: { row: 1, col: 1 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 150 } },
  { id: 'kelp_deep_bed', name: 'Deep Kelp Bed', gridPos: { row: 4, col: 4 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 90, crops: 70 } } },
  { id: 'kelp_reef', name: 'Kelp Reef', gridPos: { row: 3, col: 3 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 2, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 60 } },
  { id: 'kelp_open_water_farm', name: 'Open-Water Kelp Farm', gridPos: { row: 1, col: 0 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.8, boosts: null, unlock: { type: 'cost', cost: { fish: 80, driftwood: 70 } } },
  { id: 'kelp_abyssal_forest', name: 'Abyssal Kelp Forest', gridPos: { row: 2, col: 2 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 2.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 40 } } },

  // Driftwood family (base resource: driftwood)
  { id: 'driftwood_start', name: 'Driftwood Collector', gridPos: { row: 2, col: 3 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.5, boosts: null, unlock: { type: 'start' } },
  { id: 'driftwood_salvage_raft', name: 'Salvage Raft', gridPos: { row: 5, col: 5 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 500 } },
  { id: 'driftwood_debris_net', name: 'Debris Net', gridPos: { row: 5, col: 4 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 400 } },
  { id: 'driftwood_current_sweeper', name: 'Current Sweeper', gridPos: { row: 5, col: 3 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.8, boosts: null, unlock: { type: 'cost', cost: { fish: 150, kelp: 150 } } },
  { id: 'driftwood_storm_wreckage', name: 'Storm Wreckage Raft', gridPos: { row: 3, col: 5 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 40 } } },
  { id: 'driftwood_flotsam_dredge', name: 'Flotsam Dredge', gridPos: { row: 2, col: 5 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1, boosts: null, unlock: { type: 'cost', cost: { crops: 45 } } },
  { id: 'driftwood_shipwreck_salvage', name: 'Shipwreck Salvage', gridPos: { row: 3, col: 4 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1.3, boosts: null, unlock: { type: 'cost', cost: { driftwood: 35, crops: 25 } } },

  // Crops family (base resource: crops)
  { id: 'crops_start', name: 'Planter Raft', gridPos: { row: 5, col: 1 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.5, boosts: null, unlock: { type: 'cost', cost: { fish: 100, driftwood: 100 } } },
  { id: 'crops_soil_barge', name: 'Soil Barge', gridPos: { row: 3, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { driftwood: 35 } } },
  { id: 'crops_hanging_garden', name: 'Hanging Garden', gridPos: { row: 4, col: 3 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 120 } },
  { id: 'crops_terraced_planter', name: 'Terraced Planter', gridPos: { row: 0, col: 5 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.8, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 300 } },
  { id: 'crops_floating_orchard', name: 'Floating Orchard', gridPos: { row: 0, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 30, crops: 20 } } },
  { id: 'crops_paddy_raft', name: 'Paddy Raft', gridPos: { row: 4, col: 5 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 140, crops: 120 } } },
  { id: 'crops_vertical_farm', name: 'Vertical Farm', gridPos: { row: 2, col: 1 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1.3, boosts: null, unlock: { type: 'cost', cost: { driftwood: 55 } } },

  // Booster family (no production of their own)
  { id: 'booster_drying_rack', name: 'Drying Rack', gridPos: { row: 1, col: 4 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'kelp', percent: 20 }, { resource: 'driftwood', percent: 20 }], unlock: { type: 'milestone', resource: 'crops', target: 40 } },
  { id: 'booster_smokehouse', name: 'Smokehouse', gridPos: { row: 5, col: 0 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 25 }], unlock: { type: 'cost', cost: { kelp: 200, driftwood: 200 } } },
  { id: 'booster_windmill', name: 'Windmill', gridPos: { row: 1, col: 2 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 25 }], unlock: { type: 'cost', cost: { driftwood: 20 } } },
  { id: 'booster_net_weavers', name: 'Net Weavers', gridPos: { row: 0, col: 0 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 20 }, { resource: 'kelp', percent: 20 }], unlock: { type: 'cost', cost: { fish: 120, driftwood: 90 } } },
  { id: 'booster_composting_shed', name: 'Composting Shed', gridPos: { row: 3, col: 1 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 20 }, { resource: 'driftwood', percent: 20 }], unlock: { type: 'milestone', resource: 'driftwood', target: 90 } },
  { id: 'booster_lighthouse', name: 'Lighthouse', gridPos: { row: 4, col: 0 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 15 }, { resource: 'kelp', percent: 15 }, { resource: 'driftwood', percent: 15 }, { resource: 'crops', percent: 15 }], unlock: { type: 'cost', cost: { kelp: 120, driftwood: 90 } } },
];
```

This content was generated and verified by actually running the seeded shuffle (mulberry32 seed `20260911`, Fisher-Yates) against the real pre-shuffle `TILES` data and checking: 36 unique ids, 36 unique positions, all 36 grid cells filled, exactly one `unlock.type === 'start'` tile (`driftwood_start`, unchanged). Do not regenerate the shuffle — this exact array is the approved, final layout.

- [ ] **Step 2: Fix the two hardcoded neighbor-list tests**

In `tests/economy.test.mjs`, replace this assertion (around line 65):

```js
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
```

with:

```js
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
```

(`driftwood_start`'s own `gridPos` doesn't move, but the shuffle reassigns different flavors to all 6 of its neighboring positions, so the expected id list changes even though the position doesn't.)

Then replace this assertion (around line 78):

```js
assert.deepEqual(
  [...TILE_NEIGHBORS.get('kelp_start')].sort(),
  ['kelp_abyssal_forest', 'kelp_nursery', 'kelp_open_water_farm', 'kelp_seaweed_raft'],
  'kelp_start (0,1) has exactly these 4 neighbors (grid-edge tile, fewer than 6)'
);
```

with:

```js
assert.deepEqual(
  [...TILE_NEIGHBORS.get('fish_start')].sort(),
  ['booster_net_weavers', 'crops_floating_orchard', 'kelp_floating_garden', 'kelp_open_water_farm'],
  'fish_start (0,1) has exactly these 4 neighbors (grid-edge tile, fewer than 6)'
);
```

(`kelp_start` moves to (4,2), an interior 6-neighbor position, so it no longer serves as the 4-neighbor edge-case example; `fish_start` now sits at (0,1) instead.)

- [ ] **Step 3: Run the test suite**

Run: `npm test`
Expected: all lines print `... tests passed` (including `tile data tests passed`, `adjacency tests passed`, `geometry-derived adjacency tests passed`, `economy math tests passed`) and the process exits 0. If `geometry-derived adjacency tests passed` fails, the `TILES` array above was transcribed incorrectly — re-check `gridPos`/`unlock` pairings against Step 1 exactly, don't hand-edit values to make it pass.

- [ ] **Step 4: Commit**

```bash
git add js/tiles.js tests/economy.test.mjs
git commit -m "$(cat <<'EOF'
Shuffle tile layout to break family-clustered grid

The 36 tiles' gridPos values were originally assigned in family
blocks, so the map reads as four solid color regions. This performs
the one-time seeded reshuffle from the approved spec: each tile's
gridPos and unlock cost move together as a slot, so the ring-based
adjacency/reachability guarantees from the territory-expansion
rebalance are preserved exactly — only which tile appears where
changes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Shared per-level rendering mechanism (scale, badge, booster trim ring) + visibility-toggle wiring

**Files:**
- Modify: `js/scene.js` (add shared constants/helper; change `addProp`, `buildRaftMesh`, `buildScene`; add `level` parameter to all 10 prop-builder function signatures)
- Modify: `js/render.js` (import `getLevel`, toggle the right level's `propGroup`/`trimMesh` each frame)
- Create: `.claude/launch.json` (dev-server config for browser verification, if it doesn't already exist)

**Interfaces:**
- Consumes: `getLevel(state, tileId)` from `js/state.js` (already exported, returns `1` when `state.levels[tileId]` is unset).
- Produces: `addLevelBadge(propGroup, level, anchorHeight)` (module-private helper in `scene.js`, used by later tasks' embellishment code — no, later tasks don't call it directly, `addProp` calls it uniformly for every archetype). `tileObjects.get(tileId)` now returns `{ raftMesh, markerMesh, propGroups, trimMeshes }` where `propGroups` is `{1: Group, 2: Group, 3: Group}` and `trimMeshes` is the same shape for boosters or `null` for producers — every later task's builder function receives `(group, level)` where `group` is one of these 3 pre-built `propGroups[level]`.

- [ ] **Step 1: Add shared level constants and the badge helper to `js/scene.js`**

Immediately after the existing `LARGE_BOOSTER_IDS` constant block (currently lines 19-25):

```js
const LARGE_BOOSTER_IDS = new Set([
  'booster_windmill',
  'booster_smokehouse',
  'booster_drying_rack',
  'booster_composting_shed',
  'booster_lighthouse',
]);
```

add:

```js
const LEVEL_SCALE = { 1: 1.0, 2: 1.15, 3: 1.3 };
const BADGE_COLOR = { 2: 0xb8752f, 3: 0xffd23d };
const BADGE_EMISSIVE = { 2: 0x000000, 3: 0xffb300 };
const BADGE_SIZE = { 2: 0.06, 3: 0.08 };
const BADGE_ANCHOR_HEIGHT = {
  fish: 0.32,
  kelp: 0.85,
  driftwood: 0.25,
  crops: 0.95,
  booster_windmill: 1.0,
  booster_smokehouse: 0.8,
  booster_drying_rack: 0.55,
  booster_net_weavers: 0.6,
  booster_composting_shed: 0.35,
  booster_lighthouse: 1.05,
};
const TRIM_THICKNESS = { 1: 0.03, 2: 0.045, 3: 0.06 };
const TRIM_COLOR = { 1: BOOSTER_TRIM, 2: 0xf0c94f, 3: 0xfff0a0 };

function addLevelBadge(propGroup, level, anchorHeight) {
  if (level === 1) return;
  // Anchor is a per-archetype fixed height, not a computed bounding box: a
  // live Box3 badge anchor was prototyped and found to run away for tall
  // archetypes (e.g. the windmill) relative to short ones (fish/kelp).
  // Must be called before propGroup.scale.setScalar(...) — see addProp
  // below — so this local offset is the badge's correct final position
  // once the group's own scale is applied on top of it.
  const size = BADGE_SIZE[level];
  const geo = new THREE.OctahedronGeometry(size, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: BADGE_COLOR[level],
    roughness: 0.3,
    metalness: 0.6,
    emissive: BADGE_EMISSIVE[level],
    emissiveIntensity: level === 3 ? 0.7 : 0,
  });
  const badge = new THREE.Mesh(geo, mat);
  badge.position.set(0, anchorHeight + size * 1.4, 0);
  badge.rotation.y = Math.PI / 6;
  propGroup.add(badge);
}
```

- [ ] **Step 2: Add a `level` parameter to all 10 prop-builder function signatures**

Change each of these function signature lines (bodies unchanged in this task — embellishment logic is added per-archetype in later tasks):

- `function buildFishProp(group) {` → `function buildFishProp(group, level) {`
- `function buildKelpProp(group) {` → `function buildKelpProp(group, level) {`
- `function buildDriftwoodProp(group) {` → `function buildDriftwoodProp(group, level) {`
- `function buildCropsProp(group) {` → `function buildCropsProp(group, level) {`
- `function buildWindmill(group) {` → `function buildWindmill(group, level) {`
- `function buildSmokehouse(group) {` → `function buildSmokehouse(group, level) {`
- `function buildDryingRack(group) {` → `function buildDryingRack(group, level) {`
- `function buildNetWeavers(group) {` → `function buildNetWeavers(group, level) {`
- `function buildCompostingShed(group) {` → `function buildCompostingShed(group, level) {`
- `function buildLighthouse(group) {` → `function buildLighthouse(group, level) {`

And the dispatcher, replacing:

```js
function buildBoosterProp(group, tileId) {
  switch (tileId) {
    case 'booster_windmill': buildWindmill(group); break;
    case 'booster_smokehouse': buildSmokehouse(group); break;
    case 'booster_drying_rack': buildDryingRack(group); break;
    case 'booster_net_weavers': buildNetWeavers(group); break;
    case 'booster_composting_shed': buildCompostingShed(group); break;
    case 'booster_lighthouse': buildLighthouse(group); break;
  }
}
```

with:

```js
function buildBoosterProp(group, tileId, level) {
  switch (tileId) {
    case 'booster_windmill': buildWindmill(group, level); break;
    case 'booster_smokehouse': buildSmokehouse(group, level); break;
    case 'booster_drying_rack': buildDryingRack(group, level); break;
    case 'booster_net_weavers': buildNetWeavers(group, level); break;
    case 'booster_composting_shed': buildCompostingShed(group, level); break;
    case 'booster_lighthouse': buildLighthouse(group, level); break;
  }
}
```

- [ ] **Step 3: Rewrite `addProp` to build 3 level variants**

Replace:

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

with:

```js
function addProp(raftMesh, tile) {
  const propGroups = {};
  for (const level of [1, 2, 3]) {
    const propGroup = new THREE.Group();
    propGroup.position.y = WALL_HEIGHT;
    switch (tile.family) {
      case 'fish': buildFishProp(propGroup, level); break;
      case 'kelp': buildKelpProp(propGroup, level); break;
      case 'driftwood': buildDriftwoodProp(propGroup, level); break;
      case 'crops': buildCropsProp(propGroup, level); break;
      case 'booster': buildBoosterProp(propGroup, tile.id, level); break;
    }
    const anchorKey = tile.family === 'booster' ? tile.id : tile.family;
    addLevelBadge(propGroup, level, BADGE_ANCHOR_HEIGHT[anchorKey]);
    const extraScale = LARGE_BOOSTER_IDS.has(tile.id) ? BOOSTER_PROP_SCALE : 1;
    propGroup.scale.setScalar(PROP_SCALE * extraScale * LEVEL_SCALE[level]);
    propGroup.visible = level === 1;
    raftMesh.add(propGroup);
    propGroups[level] = propGroup;
  }
  return propGroups;
}
```

- [ ] **Step 4: Rewrite `buildRaftMesh` to build 3 trim-ring variants for boosters**

Replace:

```js
function buildRaftMesh(tile) {
  const raftGeometry = new THREE.ExtrudeGeometry(hexShape(HEX_RADIUS), {
    depth: WALL_HEIGHT,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  raftGeometry.rotateX(-Math.PI / 2);

  const raftMaterial = new THREE.MeshStandardMaterial({ color: WOOD_TOP, roughness: 0.85, metalness: 0.05 });
  const raftMesh = new THREE.Mesh(raftGeometry, raftMaterial);
  raftMesh.castShadow = true;
  raftMesh.receiveShadow = true;
  raftMesh.userData.tileId = tile.id;

  if (tile.kind === 'booster') {
    const trimGeometry = new THREE.TorusGeometry(HEX_RADIUS * 0.92, 0.03, 8, 24);
    const trimMaterial = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.4, metalness: 0.3 });
    const trim = new THREE.Mesh(trimGeometry, trimMaterial);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = WALL_HEIGHT + 0.01;
    trim.userData.tileId = tile.id;
    raftMesh.add(trim);
  }

  const propGroup = addProp(raftMesh, tile);
  return { raftMesh, propGroup };
}
```

with:

```js
function buildRaftMesh(tile) {
  const raftGeometry = new THREE.ExtrudeGeometry(hexShape(HEX_RADIUS), {
    depth: WALL_HEIGHT,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  raftGeometry.rotateX(-Math.PI / 2);

  const raftMaterial = new THREE.MeshStandardMaterial({ color: WOOD_TOP, roughness: 0.85, metalness: 0.05 });
  const raftMesh = new THREE.Mesh(raftGeometry, raftMaterial);
  raftMesh.castShadow = true;
  raftMesh.receiveShadow = true;
  raftMesh.userData.tileId = tile.id;

  let trimMeshes = null;
  if (tile.kind === 'booster') {
    trimMeshes = {};
    for (const level of [1, 2, 3]) {
      const trimGeometry = new THREE.TorusGeometry(HEX_RADIUS * 0.92, TRIM_THICKNESS[level], 8, 24);
      const trimMaterial = new THREE.MeshStandardMaterial({
        color: TRIM_COLOR[level],
        roughness: 0.4,
        metalness: 0.3,
        emissive: level === 3 ? 0x664400 : 0x000000,
        emissiveIntensity: level === 3 ? 0.4 : 0,
      });
      const trim = new THREE.Mesh(trimGeometry, trimMaterial);
      trim.rotation.x = Math.PI / 2;
      trim.position.y = WALL_HEIGHT + 0.01;
      trim.userData.tileId = tile.id;
      trim.visible = level === 1;
      raftMesh.add(trim);
      trimMeshes[level] = trim;
    }
  }

  const propGroups = addProp(raftMesh, tile);
  return { raftMesh, propGroups, trimMeshes };
}
```

- [ ] **Step 5: Update `buildScene`'s `tileObjects` construction**

Replace:

```js
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

with:

```js
    const { raftMesh, propGroups, trimMeshes } = buildRaftMesh(tile);
    raftMesh.position.set(x, 0, z);
    raftMesh.visible = false;
    scene.add(raftMesh);

    const markerMesh = buildMarkerMesh(tile);
    markerMesh.position.x = x;
    markerMesh.position.z = z;
    markerMesh.visible = false;
    scene.add(markerMesh);

    tileObjects.set(tile.id, { raftMesh, markerMesh, propGroups, trimMeshes });
```

- [ ] **Step 6: Wire the level toggle into `js/render.js`**

Change the import line:

```js
import { isDiscovered, isEligible } from './state.js';
```

to:

```js
import { getLevel, isDiscovered, isEligible } from './state.js';
```

Then in `updateScene`, replace:

```js
    objects.raftMesh.visible = unlocked;
    objects.markerMesh.visible = !unlocked && discovered;

    if (!unlocked && discovered) {
```

with:

```js
    objects.raftMesh.visible = unlocked;
    objects.markerMesh.visible = !unlocked && discovered;

    const level = getLevel(state, tile.id);
    for (const lvl of [1, 2, 3]) {
      objects.propGroups[lvl].visible = lvl === level;
      if (objects.trimMeshes) objects.trimMeshes[lvl].visible = lvl === level;
    }

    if (!unlocked && discovered) {
```

- [ ] **Step 7: Run the test suite**

Run: `npm test`
Expected: all tests still pass (this task doesn't touch `js/tiles.js`/`js/state.js`, so this is a regression guard, not a direct test of this task's change — `js/scene.js`/`js/render.js` have no automated tests, per the spec's Testing section, and are verified in the browser in Step 9 below).

- [ ] **Step 8: Create the dev-server launch config**

If `.claude/launch.json` doesn't already exist, create it:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "drift-away",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["serve", "-l", "4173", "."],
      "port": 4173
    }
  ]
}
```

- [ ] **Step 9: Verify in the browser**

Start the dev server with `mcp__Claude_Browser__preview_start` using `{ "name": "drift-away" }`, then navigate to its root. Run this in the page via `javascript_tool` (using the Verification recipe above, with this `levels` object):

```js
localStorage.setItem('driftaway_save_v1', JSON.stringify({
  version: 1,
  resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  unlocked: [
    'fish_start', 'fish_anchored_net', 'fish_trawling_raft', 'fish_tide_pool_trap',
    'fish_deep_sea_longline', 'fish_grand_fishery', 'fish_open_ocean_trawler', 'fish_leviathan_net',
    'kelp_nursery', 'kelp_start', 'kelp_seaweed_raft', 'kelp_floating_garden',
    'kelp_deep_bed', 'kelp_reef', 'kelp_open_water_farm', 'kelp_abyssal_forest',
    'driftwood_start', 'driftwood_salvage_raft', 'driftwood_debris_net', 'driftwood_current_sweeper',
    'driftwood_storm_wreckage', 'driftwood_flotsam_dredge', 'driftwood_shipwreck_salvage',
    'crops_start', 'crops_soil_barge', 'crops_hanging_garden', 'crops_terraced_planter',
    'crops_floating_orchard', 'crops_paddy_raft', 'crops_vertical_farm',
    'booster_drying_rack', 'booster_smokehouse', 'booster_windmill',
    'booster_net_weavers', 'booster_composting_shed', 'booster_lighthouse',
  ],
  levels: { driftwood_start: 3, booster_windmill: 2, fish_start: 2 },
}));
location.reload();
```

Take a screenshot (`computer` action `screenshot`) and check `read_console_messages` with `onlyErrors: true`. Expected: the page loads with no console errors, the whole 6×6 grid renders, and `driftwood_start` (level 3), `booster_windmill` (level 2), and `fish_start` (level 2) are each visibly larger than their unleveled neighbors and each show a small floating gem badge (bronze on the level-2 tiles, gold on the level-3 tile) — `booster_windmill`'s gold trim ring should also look thicker/brighter than the other boosters' rings. The prop *shapes* themselves should be otherwise identical to their level-1 form (no archetype-specific embellishment yet — that starts in Task 3).

- [ ] **Step 10: Commit**

```bash
git add js/scene.js js/render.js .claude/launch.json
git commit -m "$(cat <<'EOF'
Add shared level-up rendering mechanism for all tile props

Every tile's prop now has 3 pre-built level variants (scale increase
+ floating tier badge, boosters additionally get an escalating trim
ring), toggled per frame the same way raftMesh/markerMesh already
are. state.levels has existed since the 2026-09-09 leveling feature
but had zero visual effect until now. No per-archetype embellishment
yet — that's the remaining tasks in this plan.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Fish embellishment — fins elongate and brighten with level

**Files:**
- Modify: `js/scene.js` (`buildFishProp` function and the `FISH_*` constants above it)

**Interfaces:**
- Consumes: `level` parameter (1/2/3) already threaded through by Task 2; `buildSpikeLobe(mat, radius, height, zDegRotation, flattenZ)` and `addOutline(mesh, scale, color)` (existing helpers, unchanged).
- Produces: nothing new consumed by other tasks — this is a leaf archetype.

- [ ] **Step 1: Add fin-color/length constants next to the existing `FISH_*` constants**

After:

```js
const FISH_BODY_COLOR = 0x5c7a4e;
const FISH_BODY_DARK = 0x46603a;
const FISH_SPOT_COLOR = 0x33481f;
const FISH_OUTLINE = 0x16210f;
```

add:

```js
// Real fish (koi/goldfish) grow longer, more pointed, more saturated fins as
// they mature — not more numerous. Tail/dorsal/pectoral fins share one
// level-colored material so they all mature together; only the tail and
// dorsal spikes also grow longer (pectorals keep their original size).
const FISH_FIN_COLOR = { 1: FISH_BODY_DARK, 2: 0xb8752f, 3: 0xffd23d };
const FISH_FIN_LENGTH_MULT = { 1: 1.0, 2: 1.35, 3: 1.75 };
const FISH_FIN_EMISSIVE = { 1: 0x000000, 2: 0x000000, 3: 0x664400 };
```

- [ ] **Step 2: Replace `buildFishProp`**

Replace the whole function (currently `function buildFishProp(group, level) { ... }`, added in Task 2 with just the parameter):

```js
function buildFishProp(group, level) {
  const bodyMat = new THREE.MeshStandardMaterial({ color: FISH_BODY_COLOR, roughness: 0.55 });
  const body = new THREE.Mesh(buildFishBodyGeometry(), bodyMat);
  body.castShadow = true;
  addOutline(body, 1.06, FISH_OUTLINE);
  group.add(body);

  const finLen = FISH_FIN_LENGTH_MULT[level];
  const finMat = new THREE.MeshStandardMaterial({
    color: FISH_FIN_COLOR[level],
    roughness: 0.55,
    metalness: level >= 2 ? 0.35 : 0.1,
    emissive: FISH_FIN_EMISSIVE[level],
    emissiveIntensity: level === 3 ? 0.5 : 0,
  });

  // Small, modestly-forked tail (subtle, not a dominant feature). Length and
  // color escalate with level.
  const tailA = buildSpikeLobe(finMat, 0.05, 0.15 * finLen, 75, 0.3);
  tailA.position.set(-0.42 - 0.02 * (finLen - 1), 0.03, 0);
  group.add(tailA);
  const tailB = buildSpikeLobe(finMat, 0.05, 0.15 * finLen, 105, 0.3);
  tailB.position.set(-0.42 - 0.02 * (finLen - 1), -0.03, 0);
  group.add(tailB);

  // Jagged dorsal ridge: a row of spikes rising and falling along the back.
  const ridgeSpec = [
    { x: 0.16, h: 0.09 }, { x: 0.07, h: 0.14 }, { x: -0.02, h: 0.17 },
    { x: -0.11, h: 0.12 }, { x: -0.20, h: 0.07 },
  ];
  for (const s of ridgeSpec) {
    const spike = buildSpikeLobe(finMat, 0.06, s.h * finLen, 0, 0.35);
    spike.position.set(s.x, 0.19, 0);
    group.add(spike);
  }

  // Level 3 only: a pair of long trailing streamer fins, echoing full-grown
  // koi's more graceful, elongated fin extensions.
  if (level >= 3) {
    for (const zSign of [1, -1]) {
      const streamer = buildSpikeLobe(finMat, 0.035, 0.32, 0, 0.2);
      streamer.rotation.z += (Math.PI / 180) * (zSign * 20);
      streamer.position.set(-0.30, -0.05, zSign * 0.08);
      group.add(streamer);
    }
  }

  // Small pectoral fins, sticking out sideways near the head.
  function buildPectoral(zSign) {
    const geo = new THREE.ConeGeometry(0.045, 0.16, 5);
    geo.scale(0.3, 1, 1); // thin fin, spread in Y-Z plane
    geo.rotateX((Math.PI / 2) * zSign);
    geo.rotateY(-0.3 * zSign);
    const mesh = new THREE.Mesh(geo, finMat);
    mesh.castShadow = true;
    addOutline(mesh, 1.15, FISH_OUTLINE);
    mesh.position.set(0.10, 0.00, zSign * 0.16);
    return mesh;
  }
  group.add(buildPectoral(1));
  group.add(buildPectoral(-1));

  // Dark body spots.
  const spotMat = new THREE.MeshStandardMaterial({ color: FISH_SPOT_COLOR, roughness: 0.6 });
  const spots = [
    { x: 0.06, y: 0.15, z: 0.15, r: 0.03 }, { x: -0.07, y: 0.16, z: -0.13, r: 0.026 },
    { x: 0.00, y: 0.02, z: 0.20, r: 0.022 }, { x: -0.14, y: 0.06, z: 0.13, r: 0.024 },
  ];
  for (const s of spots) {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(s.r, 6, 6), spotMat);
    spot.scale.set(1, 0.6, 1);
    spot.position.set(s.x, s.y, s.z);
    group.add(spot);
  }

  // Eye.
  const eyeWhite = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xf4f7f0, roughness: 0.3 })
  );
  eyeWhite.position.set(0.24, 0.08, 0.13);
  group.add(eyeWhite);
  const pupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 })
  );
  pupil.position.set(0.265, 0.08, 0.145);
  group.add(pupil);

  group.rotation.y = 0.6;
  group.position.y += 0.20;
}
```

(Unchanged from the pre-Task-2 version: body, pectoral fins, spots, eye. Changed: `finMat` is now level-colored/metallic/emissive instead of a fixed dark color; tail and dorsal spikes scale their height by `finLen`; a level-3-only pair of streamer fins is added. This exact treatment was prototyped in a scratch file and visually approved before this plan was written.)

- [ ] **Step 3: Run the test suite**

Run: `npm test`
Expected: all tests pass (unaffected — this task only touches `js/scene.js`).

- [ ] **Step 4: Verify in the browser**

With the dev server from Task 2 still running (or restarted via `preview_start` with `{ "name": "drift-away" }`), inject this save via `javascript_tool` (same recipe, different `levels`) and reload:

```js
localStorage.setItem('driftaway_save_v1', JSON.stringify({
  version: 1,
  resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  unlocked: [
    'fish_start', 'fish_anchored_net', 'fish_trawling_raft', 'fish_tide_pool_trap',
    'fish_deep_sea_longline', 'fish_grand_fishery', 'fish_open_ocean_trawler', 'fish_leviathan_net',
    'kelp_nursery', 'kelp_start', 'kelp_seaweed_raft', 'kelp_floating_garden',
    'kelp_deep_bed', 'kelp_reef', 'kelp_open_water_farm', 'kelp_abyssal_forest',
    'driftwood_start', 'driftwood_salvage_raft', 'driftwood_debris_net', 'driftwood_current_sweeper',
    'driftwood_storm_wreckage', 'driftwood_flotsam_dredge', 'driftwood_shipwreck_salvage',
    'crops_start', 'crops_soil_barge', 'crops_hanging_garden', 'crops_terraced_planter',
    'crops_floating_orchard', 'crops_paddy_raft', 'crops_vertical_farm',
    'booster_drying_rack', 'booster_smokehouse', 'booster_windmill',
    'booster_net_weavers', 'booster_composting_shed', 'booster_lighthouse',
  ],
  levels: { fish_start: 2, fish_anchored_net: 3 },
}));
location.reload();
```

Screenshot and check `read_console_messages` for errors. Expected: `fish_anchored_net` (level 3) shows visibly longer, gold-colored fins with a pair of trailing streamers and a gold badge; `fish_start` (level 2) shows shorter bronze-colored elongation and a bronze badge; both keep their original body shape, spots, and eye unchanged from the other (level 1) fish tiles.

- [ ] **Step 5: Commit**

```bash
git add js/scene.js
git commit -m "$(cat <<'EOF'
Give fish tiles a per-level fin embellishment

Grounded in koi/goldfish maturation research: real fish grow longer,
more pointed, more saturated fins as they mature rather than more
numerous ones. Tail and dorsal fins lengthen and shift from bronze
(level 2) to gold with a glow and trailing streamers (level 3); body,
spots, and eye are unchanged.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Kelp embellishment — fuller bed with more blades

**Files:**
- Modify: `js/scene.js` (`buildKelpProp` function)

**Interfaces:**
- Consumes: `buildKelpBlade(colorHex, segments, baseHeight)` (existing helper, unchanged).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Replace `buildKelpProp`**

Replace:

```js
function buildKelpProp(group, level) {
  const specs = [
    { color: 0x3f8a5c, x: -0.28, h: 0.62 },
    { color: 0x4c9a6a, x: 0, h: 0.75 },
    { color: 0x5aab78, x: 0.28, h: 0.58 },
  ];
  for (const s of specs) {
    const blade = buildKelpBlade(s.color, 5, s.h);
    blade.position.x = s.x;
    blade.rotation.y = s.x * 0.6;
    group.add(blade);
  }
}
```

with:

```js
const KELP_LEVEL_BLADES = {
  2: [{ color: 0x6fbb88, x: -0.44, h: 0.5 }],
  3: [{ color: 0x6fbb88, x: -0.44, h: 0.5 }, { color: 0x2f7248, x: 0.44, h: 0.68 }],
};

function buildKelpProp(group, level) {
  const specs = [
    { color: 0x3f8a5c, x: -0.28, h: 0.62 },
    { color: 0x4c9a6a, x: 0, h: 0.75 },
    { color: 0x5aab78, x: 0.28, h: 0.58 },
    ...(KELP_LEVEL_BLADES[level] || []),
  ];
  for (const s of specs) {
    const blade = buildKelpBlade(s.color, 5, s.h);
    blade.position.x = s.x;
    blade.rotation.y = s.x * 0.6;
    group.add(blade);
  }
}
```

(`KELP_LEVEL_BLADES` must be declared before `buildKelpProp` uses it — place it directly above the function, as shown.)

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Verify in the browser**

With the dev server running (`preview_start` with `{ "name": "drift-away" }`), inject this save via `javascript_tool` and reload:

```js
localStorage.setItem('driftaway_save_v1', JSON.stringify({
  version: 1,
  resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  unlocked: [
    'fish_start', 'fish_anchored_net', 'fish_trawling_raft', 'fish_tide_pool_trap',
    'fish_deep_sea_longline', 'fish_grand_fishery', 'fish_open_ocean_trawler', 'fish_leviathan_net',
    'kelp_nursery', 'kelp_start', 'kelp_seaweed_raft', 'kelp_floating_garden',
    'kelp_deep_bed', 'kelp_reef', 'kelp_open_water_farm', 'kelp_abyssal_forest',
    'driftwood_start', 'driftwood_salvage_raft', 'driftwood_debris_net', 'driftwood_current_sweeper',
    'driftwood_storm_wreckage', 'driftwood_flotsam_dredge', 'driftwood_shipwreck_salvage',
    'crops_start', 'crops_soil_barge', 'crops_hanging_garden', 'crops_terraced_planter',
    'crops_floating_orchard', 'crops_paddy_raft', 'crops_vertical_farm',
    'booster_drying_rack', 'booster_smokehouse', 'booster_windmill',
    'booster_net_weavers', 'booster_composting_shed', 'booster_lighthouse',
  ],
  levels: { kelp_start: 2, kelp_nursery: 3 },
}));
location.reload();
```

Take a screenshot (`computer` action `screenshot`) and check `read_console_messages` with `onlyErrors: true`. Expected: no console errors; `kelp_nursery` (level 3) shows 5 blades (a lighter 4th and darker 5th added) and a gold badge; `kelp_start` (level 2) shows 4 blades and a bronze badge; other kelp tiles show the original 3 blades.

- [ ] **Step 4: Commit**

```bash
git add js/scene.js
git commit -m "$(cat <<'EOF'
Give kelp tiles a per-level blade-count embellishment

Level 2 adds a 4th (lighter) blade, level 3 adds a 5th (darker) one
on top — a fuller kelp bed at higher levels, reusing the existing
buildKelpBlade helper with no new geometry.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Driftwood embellishment — bigger accumulated pile

**Files:**
- Modify: `js/scene.js` (`buildLog` and `buildDriftwoodProp` functions)

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildLog` gains an optional 8th parameter (`yOffset`, default `0`) — backward compatible, no other call site needs to change.

- [ ] **Step 1: Extend `buildLog` with an optional height offset**

Replace:

```js
function buildLog(colorHex, length, radius, x, z, rotY, tilt) {
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9 });
  const log = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius, length, 8), mat);
  log.rotation.z = Math.PI / 2;
  log.rotation.y = rotY;
  log.rotation.x = tilt;
  log.position.set(x, radius + 0.03, z);
  log.castShadow = true;
  return log;
}
```

with:

```js
function buildLog(colorHex, length, radius, x, z, rotY, tilt, yOffset = 0) {
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9 });
  const log = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius, length, 8), mat);
  log.rotation.z = Math.PI / 2;
  log.rotation.y = rotY;
  log.rotation.x = tilt;
  log.position.set(x, radius + 0.03 + yOffset, z);
  log.castShadow = true;
  return log;
}
```

- [ ] **Step 2: Replace `buildDriftwoodProp`**

Replace:

```js
function buildDriftwoodProp(group, level) {
  group.add(buildLog(0x5a3f22, 0.85, 0.075, -0.05, 0.05, 0.15, 0));
  group.add(buildLog(0x8a7f6e, 0.65, 0.06, 0.12, -0.08, -0.6, 0.05));
  group.add(buildLog(0x6b4c2a, 0.42, 0.045, -0.2, -0.15, 1.1, -0.08));

  const twigMat = new THREE.MeshStandardMaterial({ color: 0x7a6a52, roughness: 0.9 });
  for (const t of [{ x: 0.22, z: 0.1, r: 0.3 }, { x: -0.15, z: 0.18, r: -0.4 }]) {
    const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.28, 6), twigMat);
    twig.rotation.z = Math.PI / 2.4;
    twig.rotation.y = t.r;
    twig.position.set(t.x, 0.14, t.z);
    twig.castShadow = true;
    group.add(twig);
  }
}
```

with:

```js
function buildDriftwoodProp(group, level) {
  group.add(buildLog(0x5a3f22, 0.85, 0.075, -0.05, 0.05, 0.15, 0));
  group.add(buildLog(0x8a7f6e, 0.65, 0.06, 0.12, -0.08, -0.6, 0.05));
  group.add(buildLog(0x6b4c2a, 0.42, 0.045, -0.2, -0.15, 1.1, -0.08));

  const twigMat = new THREE.MeshStandardMaterial({ color: 0x7a6a52, roughness: 0.9 });
  const twigSpecs = [{ x: 0.22, z: 0.1, r: 0.3 }, { x: -0.15, z: 0.18, r: -0.4 }];
  if (level >= 2) twigSpecs.push({ x: 0.28, z: -0.2, r: 0.9 });
  for (const t of twigSpecs) {
    const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.28, 6), twigMat);
    twig.rotation.z = Math.PI / 2.4;
    twig.rotation.y = t.r;
    twig.position.set(t.x, 0.14, t.z);
    twig.castShadow = true;
    group.add(twig);
  }

  if (level >= 2) {
    group.add(buildLog(0x4a5c3a, 0.35, 0.04, 0.05, 0.25, -1.3, 0.1)); // small mossy 4th log
  }
  if (level >= 3) {
    group.add(buildLog(0x8a7f6e, 0.95, 0.09, -0.05, 0.02, 0.4, 0, 0.12)); // larger 5th log, stacked on top
    const barnacleMat = new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 0.8 });
    for (const b of [{ x: 0.1, y: 0.12, z: 0.08 }, { x: -0.15, y: 0.16, z: -0.1 }]) {
      const barnacle = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), barnacleMat);
      barnacle.position.set(b.x, b.y, b.z);
      group.add(barnacle);
    }
  }
}
```

- [ ] **Step 3: Run the test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Verify in the browser**

With the dev server running (`preview_start` with `{ "name": "drift-away" }`), inject this save via `javascript_tool` and reload:

```js
localStorage.setItem('driftaway_save_v1', JSON.stringify({
  version: 1,
  resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  unlocked: [
    'fish_start', 'fish_anchored_net', 'fish_trawling_raft', 'fish_tide_pool_trap',
    'fish_deep_sea_longline', 'fish_grand_fishery', 'fish_open_ocean_trawler', 'fish_leviathan_net',
    'kelp_nursery', 'kelp_start', 'kelp_seaweed_raft', 'kelp_floating_garden',
    'kelp_deep_bed', 'kelp_reef', 'kelp_open_water_farm', 'kelp_abyssal_forest',
    'driftwood_start', 'driftwood_salvage_raft', 'driftwood_debris_net', 'driftwood_current_sweeper',
    'driftwood_storm_wreckage', 'driftwood_flotsam_dredge', 'driftwood_shipwreck_salvage',
    'crops_start', 'crops_soil_barge', 'crops_hanging_garden', 'crops_terraced_planter',
    'crops_floating_orchard', 'crops_paddy_raft', 'crops_vertical_farm',
    'booster_drying_rack', 'booster_smokehouse', 'booster_windmill',
    'booster_net_weavers', 'booster_composting_shed', 'booster_lighthouse',
  ],
  levels: { driftwood_salvage_raft: 2, driftwood_debris_net: 3 },
}));
location.reload();
```

Take a screenshot (`computer` action `screenshot`) and check `read_console_messages` with `onlyErrors: true`. Expected: no console errors; `driftwood_debris_net` (level 3) shows 5 logs (including one visibly raised above the others) plus small grey barnacle bumps and a gold badge; `driftwood_salvage_raft` (level 2) shows a 4th mossy log, an extra twig, and a bronze badge.

- [ ] **Step 5: Commit**

```bash
git add js/scene.js
git commit -m "$(cat <<'EOF'
Give driftwood tiles a per-level pile-size embellishment

Level 2 adds a small mossy log and an extra twig; level 3 stacks a
larger log on top and adds barnacle clusters — a bigger accumulated
driftwood pile at higher levels. buildLog gains an optional yOffset
parameter (default 0, backward compatible) so the stacked log can sit
visibly above the rest of the pile.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Crops embellishment — denser, riper grain

**Files:**
- Modify: `js/scene.js` (`buildCropsProp` function)

**Interfaces:**
- Consumes: `buildGrainHead(mat, h)` (existing helper, unchanged).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Replace `buildCropsProp`**

Replace:

```js
function buildCropsProp(group, level) {
  const stalkMat = new THREE.MeshStandardMaterial({ color: 0xac9138, roughness: 0.65 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe9c85a, roughness: 0.5 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x8f8a3a, roughness: 0.6, side: THREE.DoubleSide });

  const count = 14;
  for (let i = 0; i < count; i++) {
```

with:

```js
const CROPS_HEAD_COLOR = { 1: 0xe9c85a, 2: 0xd9a83a, 3: 0xc98f2a };
const CROPS_STALK_COUNT = { 1: 14, 2: 17, 3: 20 };

function buildCropsProp(group, level) {
  const stalkMat = new THREE.MeshStandardMaterial({ color: 0xac9138, roughness: 0.65 });
  const headMat = new THREE.MeshStandardMaterial({ color: CROPS_HEAD_COLOR[level], roughness: 0.5 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x8f8a3a, roughness: 0.6, side: THREE.DoubleSide });

  const count = CROPS_STALK_COUNT[level];
  for (let i = 0; i < count; i++) {
```

(Everything from the `for` loop body onward — the per-stalk placement math and the leaf-blade loop at the end — is unchanged; the loop already derives each stalk's angle/radius from `i / count`, so a larger `count` naturally interleaves more stalks without new hand-placed positions.)

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Verify in the browser**

With the dev server running (`preview_start` with `{ "name": "drift-away" }`), inject this save via `javascript_tool` and reload:

```js
localStorage.setItem('driftaway_save_v1', JSON.stringify({
  version: 1,
  resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  unlocked: [
    'fish_start', 'fish_anchored_net', 'fish_trawling_raft', 'fish_tide_pool_trap',
    'fish_deep_sea_longline', 'fish_grand_fishery', 'fish_open_ocean_trawler', 'fish_leviathan_net',
    'kelp_nursery', 'kelp_start', 'kelp_seaweed_raft', 'kelp_floating_garden',
    'kelp_deep_bed', 'kelp_reef', 'kelp_open_water_farm', 'kelp_abyssal_forest',
    'driftwood_start', 'driftwood_salvage_raft', 'driftwood_debris_net', 'driftwood_current_sweeper',
    'driftwood_storm_wreckage', 'driftwood_flotsam_dredge', 'driftwood_shipwreck_salvage',
    'crops_start', 'crops_soil_barge', 'crops_hanging_garden', 'crops_terraced_planter',
    'crops_floating_orchard', 'crops_paddy_raft', 'crops_vertical_farm',
    'booster_drying_rack', 'booster_smokehouse', 'booster_windmill',
    'booster_net_weavers', 'booster_composting_shed', 'booster_lighthouse',
  ],
  levels: { crops_start: 2, crops_soil_barge: 3 },
}));
location.reload();
```

Take a screenshot (`computer` action `screenshot`) and check `read_console_messages` with `onlyErrors: true`. Expected: no console errors; `crops_soil_barge` (level 3) shows a visibly denser stalk cluster (20 vs. 14) with darker amber-gold grain heads and a gold badge; `crops_start` (level 2) shows a moderately denser cluster (17 stalks) with richer gold heads and a bronze badge.

- [ ] **Step 4: Commit**

```bash
git add js/scene.js
git commit -m "$(cat <<'EOF'
Give crops tiles a per-level density/ripeness embellishment

Stalk count increases (14 -> 17 -> 20) and grain-head color deepens
toward amber with level, reusing the existing angle/radius placement
formula so denser levels interleave naturally with no new hand-placed
positions.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Smokehouse embellishment — smoke plume and ember glow

**Files:**
- Modify: `js/scene.js` (`buildSmokehouse` function)

**Interfaces:**
- Consumes: `BOOSTER_TRIM` (existing top-level constant, unchanged).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Replace `buildSmokehouse`**

Replace:

```js
function buildSmokehouse(group, level) {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.6, metalness: 0.15 });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.4), wallMat);
  cabin.position.y = 0.16;
  cabin.castShadow = true;
  group.add(cabin);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 0.43;
  roof.castShadow = true;
  group.add(roof);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 8), wallMat);
  chimney.position.set(0.1, 0.6, 0.05);
  chimney.castShadow = true;
  group.add(chimney);
}
```

with:

```js
const SMOKE_PUFF_COUNT = { 1: 0, 2: 2, 3: 4 };

function buildSmokehouse(group, level) {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.6, metalness: 0.15 });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.4), wallMat);
  cabin.position.y = 0.16;
  cabin.castShadow = true;
  group.add(cabin);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 0.43;
  roof.castShadow = true;
  group.add(roof);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 8), wallMat);
  chimney.position.set(0.1, 0.6, 0.05);
  chimney.castShadow = true;
  group.add(chimney);

  const puffCount = SMOKE_PUFF_COUNT[level];
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0xcfd6da, roughness: 0.9, transparent: true, opacity: 0.55 });
  for (let i = 0; i < puffCount; i++) {
    const t = i / Math.max(puffCount - 1, 1);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.035 + t * 0.03, 8, 8), smokeMat);
    puff.position.set(0.1 + t * 0.05, 0.78 + t * 0.16, 0.05 - t * 0.03);
    group.add(puff);
  }
  if (level === 3) {
    const ember = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xff8a3d, emissive: 0xff5a1d, emissiveIntensity: 1.2, roughness: 0.4 })
    );
    ember.position.set(0.1, 0.74, 0.05);
    group.add(ember);
  }
}
```

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Verify in the browser**

With the dev server running (`preview_start` with `{ "name": "drift-away" }`), inject this save via `javascript_tool` and reload:

```js
localStorage.setItem('driftaway_save_v1', JSON.stringify({
  version: 1,
  resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  unlocked: [
    'fish_start', 'fish_anchored_net', 'fish_trawling_raft', 'fish_tide_pool_trap',
    'fish_deep_sea_longline', 'fish_grand_fishery', 'fish_open_ocean_trawler', 'fish_leviathan_net',
    'kelp_nursery', 'kelp_start', 'kelp_seaweed_raft', 'kelp_floating_garden',
    'kelp_deep_bed', 'kelp_reef', 'kelp_open_water_farm', 'kelp_abyssal_forest',
    'driftwood_start', 'driftwood_salvage_raft', 'driftwood_debris_net', 'driftwood_current_sweeper',
    'driftwood_storm_wreckage', 'driftwood_flotsam_dredge', 'driftwood_shipwreck_salvage',
    'crops_start', 'crops_soil_barge', 'crops_hanging_garden', 'crops_terraced_planter',
    'crops_floating_orchard', 'crops_paddy_raft', 'crops_vertical_farm',
    'booster_drying_rack', 'booster_smokehouse', 'booster_windmill',
    'booster_net_weavers', 'booster_composting_shed', 'booster_lighthouse',
  ],
  levels: { booster_smokehouse: 3 },
}));
location.reload();
```

Take a screenshot (`computer` action `screenshot`) and check `read_console_messages` with `onlyErrors: true`. Expected: no console errors; `booster_smokehouse` shows 4 rising smoke puffs above the chimney, a small glowing ember at the chimney opening, a thick pale-gold trim ring (from Task 2's shared mechanism), and a gold badge.

- [ ] **Step 4: Commit**

```bash
git add js/scene.js
git commit -m "$(cat <<'EOF'
Give the smokehouse booster a per-level smoke-plume embellishment

Level 2 adds 2 rising smoke puffs above the chimney, level 3 adds 4
puffs plus a small glowing ember at the chimney opening — a more
active smokehouse at higher levels.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Drying rack embellishment — more hanging fish, second tier

**Files:**
- Modify: `js/scene.js` (`buildDryingRack` function)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Replace `buildDryingRack`**

Replace:

```js
function buildDryingRack(group, level) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x6b4c2a, roughness: 0.85 });
  for (const x of [-0.22, 0.22]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), mat);
    post.position.set(x, 0.25, 0);
    post.castShadow = true;
    group.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 0.46;
  bar.castShadow = true;
  group.add(bar);
  const hangMat = new THREE.MeshStandardMaterial({ color: 0xb08a55, roughness: 0.7 });
  for (const x of [-0.14, 0.02, 0.16]) {
    const hang = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), hangMat);
    hang.scale.set(0.7, 1.3, 0.7);
    hang.position.set(x, 0.34, 0);
    group.add(hang);
  }
}
```

with:

```js
const DRYING_RACK_HANGS = {
  1: [-0.14, 0.02, 0.16],
  2: [-0.18, -0.06, 0.06, 0.18, -0.02],
  3: [-0.18, -0.06, 0.06, 0.18, -0.02],
};

function buildDryingRack(group, level) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x6b4c2a, roughness: 0.85 });
  const postHeight = level === 3 ? 0.62 : 0.5;
  for (const x of [-0.22, 0.22]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, postHeight, 6), mat);
    post.position.set(x, postHeight / 2, 0);
    post.castShadow = true;
    group.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 0.46;
  bar.castShadow = true;
  group.add(bar);

  const hangMat = new THREE.MeshStandardMaterial({ color: 0xb08a55, roughness: 0.7 });
  function addHangsOnBar(barY, xs) {
    for (const x of xs) {
      const hang = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), hangMat);
      hang.scale.set(0.7, 1.3, 0.7);
      hang.position.set(x, barY - 0.12, 0);
      group.add(hang);
    }
  }
  addHangsOnBar(0.46, DRYING_RACK_HANGS[level]);

  if (level === 3) {
    const bar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat);
    bar2.rotation.z = Math.PI / 2;
    bar2.position.y = 0.58;
    bar2.castShadow = true;
    group.add(bar2);
    addHangsOnBar(0.58, [-0.14, 0.02, 0.16]);
  }
}
```

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Verify in the browser**

With the dev server running (`preview_start` with `{ "name": "drift-away" }`), inject this save via `javascript_tool` and reload:

```js
localStorage.setItem('driftaway_save_v1', JSON.stringify({
  version: 1,
  resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  unlocked: [
    'fish_start', 'fish_anchored_net', 'fish_trawling_raft', 'fish_tide_pool_trap',
    'fish_deep_sea_longline', 'fish_grand_fishery', 'fish_open_ocean_trawler', 'fish_leviathan_net',
    'kelp_nursery', 'kelp_start', 'kelp_seaweed_raft', 'kelp_floating_garden',
    'kelp_deep_bed', 'kelp_reef', 'kelp_open_water_farm', 'kelp_abyssal_forest',
    'driftwood_start', 'driftwood_salvage_raft', 'driftwood_debris_net', 'driftwood_current_sweeper',
    'driftwood_storm_wreckage', 'driftwood_flotsam_dredge', 'driftwood_shipwreck_salvage',
    'crops_start', 'crops_soil_barge', 'crops_hanging_garden', 'crops_terraced_planter',
    'crops_floating_orchard', 'crops_paddy_raft', 'crops_vertical_farm',
    'booster_drying_rack', 'booster_smokehouse', 'booster_windmill',
    'booster_net_weavers', 'booster_composting_shed', 'booster_lighthouse',
  ],
  levels: { booster_drying_rack: 3 },
}));
location.reload();
```

Take a screenshot (`computer` action `screenshot`) and check `read_console_messages` with `onlyErrors: true`. Expected: no console errors; `booster_drying_rack` shows two horizontal bars (taller posts) with a total of 8 hanging items across both tiers, plus the shared gold trim ring and badge.

- [ ] **Step 4: Commit**

```bash
git add js/scene.js
git commit -m "$(cat <<'EOF'
Give the drying-rack booster a per-level hanging-fish embellishment

Level 2 adds 2 more hanging items on the existing bar (5 total).
Level 3 adds a second, higher bar with 3 more (8 total across two
tiers) — a more productive drying operation at higher levels.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Net weavers embellishment — denser net, rope bundle

**Files:**
- Modify: `js/scene.js` (`buildNetWeavers` function)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Replace `buildNetWeavers`**

Replace:

```js
function buildNetWeavers(group, level) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x6b4c2a, roughness: 0.85 });
  const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6);
  const posts = [[-0.24, -0.15], [0.24, -0.15], [-0.24, 0.15], [0.24, 0.15]];
  for (const [x, z] of posts) {
    const post = new THREE.Mesh(postGeo, mat);
    post.position.set(x, 0.275, z);
    post.castShadow = true;
    group.add(post);
  }
  const netMat = new THREE.LineBasicMaterial({ color: 0xdfe9ee, transparent: true, opacity: 0.8 });
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const a = new THREE.Vector3(-0.24 + t * 0.48, 0.45, -0.15);
    const b = new THREE.Vector3(-0.24 + t * 0.48, 0.45, 0.15);
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    group.add(new THREE.Line(geo, netMat));
  }
  for (let i = 0; i <= 3; i++) {
    const t = i / 3;
    const a = new THREE.Vector3(-0.24, 0.45, -0.15 + t * 0.3);
    const b = new THREE.Vector3(0.24, 0.45, -0.15 + t * 0.3);
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    group.add(new THREE.Line(geo, netMat));
  }
}
```

with:

```js
const NET_DIVISIONS = { 1: { x: 4, z: 3 }, 2: { x: 8, z: 6 }, 3: { x: 8, z: 6 } };

function buildNetWeavers(group, level) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x6b4c2a, roughness: 0.85 });
  const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6);
  const posts = [[-0.24, -0.15], [0.24, -0.15], [-0.24, 0.15], [0.24, 0.15]];
  for (const [x, z] of posts) {
    const post = new THREE.Mesh(postGeo, mat);
    post.position.set(x, 0.275, z);
    post.castShadow = true;
    group.add(post);
  }
  const netMat = new THREE.LineBasicMaterial({ color: 0xdfe9ee, transparent: true, opacity: 0.8 });
  const divisions = NET_DIVISIONS[level];
  for (let i = 0; i <= divisions.x; i++) {
    const t = i / divisions.x;
    const a = new THREE.Vector3(-0.24 + t * 0.48, 0.45, -0.15);
    const b = new THREE.Vector3(-0.24 + t * 0.48, 0.45, 0.15);
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    group.add(new THREE.Line(geo, netMat));
  }
  for (let i = 0; i <= divisions.z; i++) {
    const t = i / divisions.z;
    const a = new THREE.Vector3(-0.24, 0.45, -0.15 + t * 0.3);
    const b = new THREE.Vector3(0.24, 0.45, -0.15 + t * 0.3);
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    group.add(new THREE.Line(geo, netMat));
  }

  if (level === 3) {
    const bundleMat = new THREE.MeshStandardMaterial({ color: 0xc9b98a, roughness: 0.8 });
    const bundle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 16), bundleMat);
    bundle.rotation.x = Math.PI / 2;
    bundle.position.set(0, 0.04, 0.22);
    bundle.castShadow = true;
    group.add(bundle);
  }
}
```

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Verify in the browser**

With the dev server running (`preview_start` with `{ "name": "drift-away" }`), inject this save via `javascript_tool` and reload:

```js
localStorage.setItem('driftaway_save_v1', JSON.stringify({
  version: 1,
  resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  unlocked: [
    'fish_start', 'fish_anchored_net', 'fish_trawling_raft', 'fish_tide_pool_trap',
    'fish_deep_sea_longline', 'fish_grand_fishery', 'fish_open_ocean_trawler', 'fish_leviathan_net',
    'kelp_nursery', 'kelp_start', 'kelp_seaweed_raft', 'kelp_floating_garden',
    'kelp_deep_bed', 'kelp_reef', 'kelp_open_water_farm', 'kelp_abyssal_forest',
    'driftwood_start', 'driftwood_salvage_raft', 'driftwood_debris_net', 'driftwood_current_sweeper',
    'driftwood_storm_wreckage', 'driftwood_flotsam_dredge', 'driftwood_shipwreck_salvage',
    'crops_start', 'crops_soil_barge', 'crops_hanging_garden', 'crops_terraced_planter',
    'crops_floating_orchard', 'crops_paddy_raft', 'crops_vertical_farm',
    'booster_drying_rack', 'booster_smokehouse', 'booster_windmill',
    'booster_net_weavers', 'booster_composting_shed', 'booster_lighthouse',
  ],
  levels: { booster_net_weavers: 3 },
}));
location.reload();
```

Take a screenshot (`computer` action `screenshot`) and check `read_console_messages` with `onlyErrors: true`. Expected: no console errors; `booster_net_weavers` shows a visibly denser net grid (roughly double the lines in both directions) plus a small coiled rope/net bundle resting at the base, and the shared gold trim ring and badge.

- [ ] **Step 4: Commit**

```bash
git add js/scene.js
git commit -m "$(cat <<'EOF'
Give the net-weavers booster a per-level net-density embellishment

Net line density doubles at level 2/3 (tighter weave), and level 3
adds a coiled rope/net bundle at the base — a more advanced weaving
operation at higher levels.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Composting shed embellishment — steam and a second bin

**Files:**
- Modify: `js/scene.js` (`buildCompostingShed` function)

**Interfaces:**
- Consumes: `BOOSTER_TRIM` (existing top-level constant, unchanged).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Replace `buildCompostingShed`**

Replace:

```js
function buildCompostingShed(group, level) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a4a34, roughness: 0.85 });
  const lidMat = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.6, metalness: 0.15 });
  const bin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.36), mat);
  bin.position.y = 0.13;
  bin.castShadow = true;
  group.add(bin);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.4), lidMat);
  lid.position.set(-0.03, 0.27, 0);
  lid.rotation.z = 0.25;
  lid.castShadow = true;
  group.add(lid);
}
```

with:

```js
const COMPOST_STEAM_COUNT = { 1: 0, 2: 3, 3: 5 };

function buildCompostingShed(group, level) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a4a34, roughness: 0.85 });
  const lidMat = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.6, metalness: 0.15 });
  const bin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.36), mat);
  bin.position.y = 0.13;
  bin.castShadow = true;
  group.add(bin);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.4), lidMat);
  lid.position.set(-0.03, 0.27, 0);
  lid.rotation.z = 0.25;
  lid.castShadow = true;
  group.add(lid);

  if (level === 3) {
    const bin2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.42), mat);
    bin2.position.set(0.32, 0.15, 0.02);
    bin2.castShadow = true;
    group.add(bin2);
    const lid2 = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.03, 0.46), lidMat);
    lid2.position.set(0.29, 0.31, 0.02);
    lid2.rotation.z = 0.2;
    lid2.castShadow = true;
    group.add(lid2);
  }

  const steamCount = COMPOST_STEAM_COUNT[level];
  const steamMat = new THREE.MeshStandardMaterial({ color: 0x8fae86, roughness: 0.9, transparent: true, opacity: 0.45 });
  for (let i = 0; i < steamCount; i++) {
    const t = i / Math.max(steamCount - 1, 1);
    const steam = new THREE.Mesh(new THREE.SphereGeometry(0.03 + t * 0.02, 6, 6), steamMat);
    steam.position.set(-0.1 + t * 0.4, 0.36 + t * 0.14, -0.05 + t * 0.1);
    group.add(steam);
  }
}
```

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Verify in the browser**

With the dev server running (`preview_start` with `{ "name": "drift-away" }`), inject this save via `javascript_tool` and reload:

```js
localStorage.setItem('driftaway_save_v1', JSON.stringify({
  version: 1,
  resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  unlocked: [
    'fish_start', 'fish_anchored_net', 'fish_trawling_raft', 'fish_tide_pool_trap',
    'fish_deep_sea_longline', 'fish_grand_fishery', 'fish_open_ocean_trawler', 'fish_leviathan_net',
    'kelp_nursery', 'kelp_start', 'kelp_seaweed_raft', 'kelp_floating_garden',
    'kelp_deep_bed', 'kelp_reef', 'kelp_open_water_farm', 'kelp_abyssal_forest',
    'driftwood_start', 'driftwood_salvage_raft', 'driftwood_debris_net', 'driftwood_current_sweeper',
    'driftwood_storm_wreckage', 'driftwood_flotsam_dredge', 'driftwood_shipwreck_salvage',
    'crops_start', 'crops_soil_barge', 'crops_hanging_garden', 'crops_terraced_planter',
    'crops_floating_orchard', 'crops_paddy_raft', 'crops_vertical_farm',
    'booster_drying_rack', 'booster_smokehouse', 'booster_windmill',
    'booster_net_weavers', 'booster_composting_shed', 'booster_lighthouse',
  ],
  levels: { booster_composting_shed: 3 },
}));
location.reload();
```

Take a screenshot (`computer` action `screenshot`) and check `read_console_messages` with `onlyErrors: true`. Expected: no console errors; `booster_composting_shed` shows two bins side by side, translucent green steam rising above them, and the shared gold trim ring and badge.

- [ ] **Step 4: Commit**

```bash
git add js/scene.js
git commit -m "$(cat <<'EOF'
Give the composting-shed booster a per-level embellishment

Level 2 adds a few translucent green steam puffs above the lid gap;
level 3 adds a second, larger bin plus more steam — a bigger
composting operation at higher levels.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Lighthouse embellishment — brighter beacon with a glow halo

**Files:**
- Modify: `js/scene.js` (`buildLighthouse` function)

**Interfaces:**
- Consumes: `BOOSTER_TRIM` (existing top-level constant, unchanged).
- Produces: nothing consumed by other tasks. This is the last archetype task — Task 12 (cleanup) depends on all of Tasks 2-11 being done.

- [ ] **Step 1: Replace `buildLighthouse`**

Replace:

```js
function buildLighthouse(group, level) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8d3c8, roughness: 0.6 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.5 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.7, 10), mat);
  tower.position.y = 0.35;
  tower.castShadow = true;
  group.add(tower);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.093, 0.12, 0.14, 10), stripeMat);
  stripe.position.y = 0.3;
  group.add(stripe);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 }));
  lantern.position.y = 0.77;
  group.add(lantern);
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xfff2c0, emissiveIntensity: 1.2, roughness: 0.3 })
  );
  light.position.y = 0.77;
  group.add(light);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.12, 10), stripeMat);
  roof.position.y = 0.9;
  roof.castShadow = true;
  group.add(roof);
}
```

with:

```js
const LIGHTHOUSE_LIGHT_SIZE = { 1: 0.06, 2: 0.07, 3: 0.08 };
const LIGHTHOUSE_LIGHT_INTENSITY = { 1: 1.2, 2: 1.8, 3: 2.4 };
const LIGHTHOUSE_LIGHT_COLOR = { 1: 0xfff2c0, 2: 0xffe9a0, 3: 0xffd23d };

function buildLighthouse(group, level) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8d3c8, roughness: 0.6 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.5 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.7, 10), mat);
  tower.position.y = 0.35;
  tower.castShadow = true;
  group.add(tower);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.093, 0.12, 0.14, 10), stripeMat);
  stripe.position.y = 0.3;
  group.add(stripe);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 }));
  lantern.position.y = 0.77;
  group.add(lantern);
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(LIGHTHOUSE_LIGHT_SIZE[level], 10, 10),
    new THREE.MeshStandardMaterial({
      color: LIGHTHOUSE_LIGHT_COLOR[level],
      emissive: LIGHTHOUSE_LIGHT_COLOR[level],
      emissiveIntensity: LIGHTHOUSE_LIGHT_INTENSITY[level],
      roughness: 0.3,
    })
  );
  light.position.y = 0.77;
  group.add(light);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.12, 10), stripeMat);
  roof.position.y = 0.9;
  roof.castShadow = true;
  group.add(roof);

  if (level >= 2) {
    const haloMat = new THREE.MeshBasicMaterial({
      color: LIGHTHOUSE_LIGHT_COLOR[level],
      transparent: true,
      opacity: level === 3 ? 0.35 : 0.25,
    });
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(LIGHTHOUSE_LIGHT_SIZE[level] * (level === 3 ? 2.2 : 1.8), 12, 12),
      haloMat
    );
    halo.position.y = 0.77;
    group.add(halo);
  }
}
```

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Verify in the browser**

With the dev server running (`preview_start` with `{ "name": "drift-away" }`), inject this save via `javascript_tool` and reload:

```js
localStorage.setItem('driftaway_save_v1', JSON.stringify({
  version: 1,
  resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  unlocked: [
    'fish_start', 'fish_anchored_net', 'fish_trawling_raft', 'fish_tide_pool_trap',
    'fish_deep_sea_longline', 'fish_grand_fishery', 'fish_open_ocean_trawler', 'fish_leviathan_net',
    'kelp_nursery', 'kelp_start', 'kelp_seaweed_raft', 'kelp_floating_garden',
    'kelp_deep_bed', 'kelp_reef', 'kelp_open_water_farm', 'kelp_abyssal_forest',
    'driftwood_start', 'driftwood_salvage_raft', 'driftwood_debris_net', 'driftwood_current_sweeper',
    'driftwood_storm_wreckage', 'driftwood_flotsam_dredge', 'driftwood_shipwreck_salvage',
    'crops_start', 'crops_soil_barge', 'crops_hanging_garden', 'crops_terraced_planter',
    'crops_floating_orchard', 'crops_paddy_raft', 'crops_vertical_farm',
    'booster_drying_rack', 'booster_smokehouse', 'booster_windmill',
    'booster_net_weavers', 'booster_composting_shed', 'booster_lighthouse',
  ],
  levels: { booster_lighthouse: 3 },
}));
location.reload();
```

Take a screenshot (`computer` action `screenshot`) and check `read_console_messages` with `onlyErrors: true`. Expected: no console errors; `booster_lighthouse`'s beacon is visibly bigger/brighter with a warm gold-tinted glow halo around the lantern, plus the shared gold trim ring and badge.

- [ ] **Step 4: Commit**

```bash
git add js/scene.js
git commit -m "$(cat <<'EOF'
Give the lighthouse booster a per-level beacon embellishment

Beacon size/brightness increases with level and gains a soft glow
halo at level 2/3, shifting warmer toward gold at level 3 — a more
powerful beacon at higher levels.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Whole-map verification and scratch-file cleanup

**Files:**
- Delete: `preview-levels.html` (scratch prototype at the repo root, not part of the shipped game)

**Interfaces:**
- Consumes: the complete feature from Tasks 1-11.
- Produces: nothing — this is the final task.

- [ ] **Step 1: Confirm the scratch file is untracked and safe to delete**

Run: `git status --short preview-levels.html`
Expected: `?? preview-levels.html` (untracked — it was a scratch file used during design, never committed). If it shows as tracked instead, stop and check with the user before deleting.

- [ ] **Step 2: Delete it**

```bash
rm preview-levels.html
```

- [ ] **Step 3: Run the full test suite one more time**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Whole-map browser verification**

Start the dev server (`preview_start` with `{ "name": "drift-away" }`) and inject a save exercising every family and every level at once:

```js
localStorage.setItem('driftaway_save_v1', JSON.stringify({
  version: 1,
  resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
  unlocked: [
    'fish_start', 'fish_anchored_net', 'fish_trawling_raft', 'fish_tide_pool_trap',
    'fish_deep_sea_longline', 'fish_grand_fishery', 'fish_open_ocean_trawler', 'fish_leviathan_net',
    'kelp_nursery', 'kelp_start', 'kelp_seaweed_raft', 'kelp_floating_garden',
    'kelp_deep_bed', 'kelp_reef', 'kelp_open_water_farm', 'kelp_abyssal_forest',
    'driftwood_start', 'driftwood_salvage_raft', 'driftwood_debris_net', 'driftwood_current_sweeper',
    'driftwood_storm_wreckage', 'driftwood_flotsam_dredge', 'driftwood_shipwreck_salvage',
    'crops_start', 'crops_soil_barge', 'crops_hanging_garden', 'crops_terraced_planter',
    'crops_floating_orchard', 'crops_paddy_raft', 'crops_vertical_farm',
    'booster_drying_rack', 'booster_smokehouse', 'booster_windmill',
    'booster_net_weavers', 'booster_composting_shed', 'booster_lighthouse',
  ],
  levels: {
    fish_start: 2, fish_anchored_net: 3,
    kelp_start: 2, kelp_nursery: 3,
    driftwood_salvage_raft: 2, driftwood_debris_net: 3,
    crops_start: 2, crops_soil_barge: 3,
    booster_windmill: 2, booster_smokehouse: 3,
    booster_drying_rack: 2, booster_net_weavers: 3,
    booster_composting_shed: 2, booster_lighthouse: 3,
  },
}));
location.reload();
```

Take a full screenshot and check `read_console_messages` with `onlyErrors: true`. Expected: no console errors, the full 6×6 grid renders with the shuffled layout from Task 1 (no visible family clustering), and every listed tile shows the size increase, badge, and (for boosters) trim-ring escalation appropriate to its level, on top of each archetype's own embellishment from Tasks 3-11. Also click on 2-3 unlisted (level-1) tiles to confirm the tile panel still opens correctly and shows "Level Up" with the right cost (spot-check against the `levelUpCost` formula from the 2026-09-09 design) — this exercises the `objects.propGroups`/`trimMeshes` plumbing from Task 2 hasn't broken tile selection or the leveling UI.

- [ ] **Step 5: Commit**

```bash
git add -u preview-levels.html
git commit -m "$(cat <<'EOF'
Remove scratch preview file used to design level visuals

preview-levels.html was a standalone Three.js prototype used to
validate the shared scale+badge mechanism and the fish/kelp/windmill
embellishments before writing the spec. Its design is now fully
absorbed into js/scene.js across Tasks 2-11 of this branch.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
