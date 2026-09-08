# Drift Away — Territory Expansion (Single Start Tile + Adjacency Gating)

Date: 2026-09-07
Status: Approved for planning
Supersedes: the unlock-mechanics portions of `docs/superpowers/specs/2026-09-02-drift-away-design.md` (four starting tiles, cost/milestone-only gating) and the tile-content table in `docs/superpowers/specs/2026-09-04-drift-away-threejs-rewrite-design.md` §2 (the 36-tile roster's `unlock` fields — positions, names, rates, and families are unchanged). The rendering/prop visuals described in that second document have since been superseded again by direct implementation (the chubby-cartoon-fish redesign and friends) with no written spec of their own; this document doesn't touch visuals beyond the new fog-of-war marker state in §5.

## 1. Overview

Three linked changes to how the board opens up:

1. **Single starting tile.** Only `driftwood_start` begins unlocked (it already sits at grid position `(2,3)`, one of the 6×6 grid's four true-center cells). `fish_start`, `kelp_start`, and `crops_start` stop being free and become normal cost/milestone tiles like everything else.
2. **Adjacency-gated unlocking.** A tile can only be unlocked if it's adjacent (on the hex grid) to a tile that's already unlocked, in addition to meeting its existing cost/milestone requirement. The player expands outward from the center, one hex at a time.
3. **Hidden costs for undiscovered tiles.** A tile that isn't yet adjacent to any unlocked tile shows no marker on the board at all — not even its outline — and isn't a valid click target. Its cost is never shown because it can't be clicked; there's no separate "hide the cost" UI state to build.

This requires a full rebalance of the 36 tiles' unlock costs (§4) — the existing costs assume all four base resources are flowing from turn one, which is no longer true.

### Non-goals
- No change to tile positions, names, production rates, family assignments, or booster effects — only `unlock` fields change.
- No save-migration system. Existing players keep whatever they've already unlocked; the new rule only governs tiles they haven't reached yet (§6).
- No animated "reveal" transition when a tile becomes discovered — it simply starts rendering next frame, same as any other state-driven visibility change already in the game.

## 2. Grid adjacency model

`js/tiles.js` gains a precomputed neighbor lookup, built once at module load from each tile's existing `gridPos`, using the same odd-r horizontal-offset neighbor relationship the grid's layout is already built on:

```js
function neighborGridPositions(row, col) {
  const deltas = row % 2 === 0
    ? [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]]
    : [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]];
  return deltas.map(([dr, dc]) => [row + dr, col + dc]);
}

const tileIdByPosition = new Map(TILES.map((t) => [`${t.gridPos.row},${t.gridPos.col}`, t.id]));

export const TILE_NEIGHBORS = new Map(
  TILES.map((t) => {
    const ids = neighborGridPositions(t.gridPos.row, t.gridPos.col)
      .map(([r, c]) => tileIdByPosition.get(`${r},${c}`))
      .filter(Boolean);
    return [t.id, ids];
  })
);
```

This is the single source of truth for adjacency — no hand-authored neighbor lists to keep in sync with `gridPos`, and both `state.js` and `render.js` read from the same map. A BFS from `driftwood_start` over this graph produces the ring structure used to design the cost table in §4:

| Ring | Distance | Count | Tiles |
|---|---|---|---|
| 0 | 0 | 1 | `driftwood_start` |
| 1 | 1 | 6 | `crops_vertical_farm`, `driftwood_salvage_raft`, `crops_start`, `crops_soil_barge`, `driftwood_flotsam_dredge`, `driftwood_shipwreck_salvage` |
| 2 | 2 | 12 | `crops_paddy_raft`, `kelp_abyssal_forest`, `driftwood_storm_wreckage`, `driftwood_debris_net`, `crops_hanging_garden`, `fish_start`, `kelp_seaweed_raft`, `kelp_floating_garden`, `kelp_deep_bed`, `fish_deep_sea_longline`, `fish_grand_fishery`, `fish_open_ocean_trawler` |
| 3 | 3 | 13 | `crops_floating_orchard`, `kelp_open_water_farm`, `driftwood_current_sweeper`, `kelp_start`, `fish_tide_pool_trap`, `crops_terraced_planter`, `fish_anchored_net`, `kelp_reef`, `fish_leviathan_net`, `booster_smokehouse`, `booster_windmill`, `booster_net_weavers`, `booster_composting_shed` |
| 4 | 4 | 4 | `fish_trawling_raft`, `kelp_nursery`, `booster_drying_rack`, `booster_lighthouse` |

Max distance from center is 4 — the whole board opens up within a handful of expansions, not a slow crawl.

## 3. Unlock model changes (`js/state.js`)

```js
export function isDiscovered(tile, state) {
  if (state.unlocked.includes(tile.id)) return true;
  return TILE_NEIGHBORS.get(tile.id).some((id) => state.unlocked.includes(id));
}

export function isEligible(tile, state) {
  if (!isDiscovered(tile, state)) return false;
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

`isDiscovered` is newly exported; everything else in `isEligible` is the existing body with one new guard clause prepended. `createInitialState()`, `unlockTile()`, `tick()`, `effectiveRate()`, `saveState()`/`loadState()` are all unchanged — `createInitialState` already derives `unlocked` from `TILES.filter(t => t.unlock.type === 'start')`, so it automatically yields just `['driftwood_start']` once the data change in §4 lands, with no code change needed.

## 4. Tile data rebalance (`js/tiles.js`)

Positions, names, rates, and families are unchanged from the existing 36-tile roster. Only `unlock` fields change, informed by the ring table in §2: ring 1 costs are driftwood-only (the only resource flowing at the start); ring 2 introduces the first fish/kelp costs now that ring-1 producers give the player driftwood and crops to spend, though most ring-2 tiles still only need driftwood/crops so there's no dependency on unlock order within the ring; ring 3–4 costs draw more freely from all four resources, now that fish and kelp are established. Within a ring, every tile's cost is payable using resources reachable from strictly earlier rings, so there's always a valid unlock order — no tile is stranded behind a resource that's only available by unlocking that same tile's own family first.

### Fish family (8)
| id | unlock (was → now) |
|---|---|
| `fish_start` | start → cost: 35 driftwood + 25 crops |
| `fish_anchored_net` | cost: 30 driftwood → cost: 40 driftwood |
| `fish_trawling_raft` | cost: 60 kelp + 40 driftwood → cost: 120 kelp + 90 driftwood |
| `fish_tide_pool_trap` | milestone: fish ≥ 200 → unchanged |
| `fish_deep_sea_longline` | cost: 150 driftwood + 100 crops → cost: 70 driftwood + 60 crops |
| `fish_grand_fishery` | milestone: fish ≥ 1000 → milestone: fish ≥ 120 |
| `fish_open_ocean_trawler` | cost: 250 driftwood + 200 crops → cost: 90 driftwood + 70 crops |
| `fish_leviathan_net` | milestone: fish ≥ 2500 → cost: 140 driftwood + 120 crops |

### Kelp family (8)
| id | unlock (was → now) |
|---|---|
| `kelp_nursery` | cost: 50 fish + 50 driftwood → cost: 120 fish + 90 driftwood |
| `kelp_start` | start → cost: 50 driftwood + 40 crops |
| `kelp_seaweed_raft` | cost: 30 fish → cost: 30 driftwood + 20 crops |
| `kelp_floating_garden` | milestone: kelp ≥ 200 → milestone: kelp ≥ 40 |
| `kelp_deep_bed` | cost: 120 fish + 100 crops → cost: 60 driftwood + 50 crops |
| `kelp_reef` | milestone: kelp ≥ 1000 → milestone: kelp ≥ 300 |
| `kelp_open_water_farm` | cost: 220 fish + 180 crops → cost: 80 fish + 70 driftwood |
| `kelp_abyssal_forest` | milestone: kelp ≥ 2500 → milestone: kelp ≥ 150 |

### Driftwood family (7)
| id | unlock (was → now) |
|---|---|
| `driftwood_start` | start → unchanged |
| `driftwood_salvage_raft` | cost: 40 fish → cost: 25 driftwood |
| `driftwood_debris_net` | milestone: driftwood ≥ 100 → cost: 45 crops |
| `driftwood_current_sweeper` | cost: 80 kelp + 60 crops → cost: 70 kelp + 50 crops |
| `driftwood_storm_wreckage` | milestone: driftwood ≥ 500 → milestone: driftwood ≥ 90 |
| `driftwood_flotsam_dredge` | cost: 150 kelp + 120 crops → cost: 35 driftwood |
| `driftwood_shipwreck_salvage` | milestone: driftwood ≥ 1200 → milestone: driftwood ≥ 60 |

### Crops family (7)
| id | unlock (was → now) |
|---|---|
| `crops_start` | start → cost: 20 driftwood |
| `crops_soil_barge` | cost: 40 kelp → cost: 30 driftwood |
| `crops_hanging_garden` | milestone: crops ≥ 100 → milestone: crops ≥ 40 |
| `crops_terraced_planter` | cost: 80 fish + 60 driftwood → cost: 60 fish + 40 driftwood |
| `crops_floating_orchard` | milestone: crops ≥ 500 → milestone: crops ≥ 150 |
| `crops_paddy_raft` | cost: 150 fish + 120 driftwood → cost: 55 driftwood |
| `crops_vertical_farm` | milestone: crops ≥ 1200 → cost: 40 driftwood |

### Booster family (6)
| id | unlock (was → now) |
|---|---|
| `booster_drying_rack` | cost: 150 kelp + 150 driftwood → cost: 200 kelp + 200 driftwood |
| `booster_smokehouse` | cost: 100 fish + 100 driftwood → unchanged |
| `booster_windmill` | milestone: crops ≥ 300 → milestone: crops ≥ 250 |
| `booster_net_weavers` | cost: 200 fish + 200 kelp → cost: 150 fish + 150 kelp |
| `booster_composting_shed` | milestone: driftwood ≥ 800 → milestone: driftwood ≥ 400 |
| `booster_lighthouse` | milestone: crops ≥ 1500 → milestone: fish ≥ 500 |

This is a first-pass balance, not playtested — same caveat the original design carried. It should be sanity-checked by playing through at least the first two rings after implementation (§7).

## 5. Rendering: fog-of-war marker state (`js/render.js`)

`updateScene`'s per-tile loop currently sets exactly one of `raftMesh`/`markerMesh` visible based on `state.unlocked`. It gains one more condition: a locked tile's `markerMesh` is only visible if `isDiscovered(tile, state)` is also true.

```js
const discovered = isDiscovered(tile, state);
objects.raftMesh.visible = unlocked;
objects.markerMesh.visible = !unlocked && discovered;
if (!unlocked && discovered) {
  const eligible = isEligible(tile, state);
  // existing pulse animation, unchanged
}
```

`screenToGrid`'s raycast hit-list must only include currently-visible meshes, so clicking where an undiscovered tile sits behaves exactly like clicking open water (no hit, panel closes) instead of silently hitting an invisible mesh:

```js
const hitTargets = [...tileObjects.values()]
  .flatMap((t) => [t.raftMesh, t.markerMesh])
  .filter((mesh) => mesh.visible);
```

This is the only rendering change. `js/ui.js` needs **zero** changes — `showTilePanel` (which reveals a tile's cost) is only ever called from `main.js`'s click handler after `screenToGrid` returns a hit, and an undiscovered tile can no longer produce one.

## 6. Save compatibility

`loadState()` doesn't validate `unlocked` against current unlock rules — it just merges whatever array was saved. An existing player's already-unlocked tiles (which may include all four old `_start` tiles) stay unlocked; nothing gets retroactively re-locked. The new adjacency+cost rules only apply going forward, to tiles that aren't yet in their save's `unlocked` array. This is a deliberate choice, not an oversight: no migration code, no forced resets.

## 7. Testing

`tests/economy.test.mjs` changes:
- `startTiles.length` assertion: `4` → `1`.
- The "each resource family should have exactly one starting tile" assertion is replaced with an assertion that the single start tile is `driftwood_start`.
- `createInitialState()` test gains an assertion that `unlocked` is exactly `['driftwood_start']`.
- New tests for `isDiscovered`/adjacency using real tiles (not fabricated ones, since it now depends on real grid topology): e.g. `isDiscovered(driftwood_salvage_raft, { unlocked: ['driftwood_start'] })` is `true` (ring 1), `isDiscovered(kelp_start, { unlocked: ['driftwood_start'] })` is `false` (ring 3).
- The existing `unlockTile`/`isEligible` tests that fabricate ad-hoc tile objects (`{ unlock: { type: 'cost', ... } }` with no `id`/`gridPos`) need reworking to use real `TILES` entries, since eligibility now depends on real adjacency data keyed by tile id.
- The existing `unlockTile` success/failure tests built around `fish_anchored_net` costing 30 driftwood need updating for its new cost (40 driftwood) and, since it's a ring-3 tile, a test state with a plausible unlocked chain leading up to it (or a switch to a ring-1 tile like `crops_start`, which is directly testable against just `driftwood_start`).

Rendering verification is manual: confirm only `driftwood_start` is visible on a fresh board, confirm exactly its 6 ring-1 neighbors' markers appear once it's the only unlocked tile, confirm unlocking a ring-1 tile reveals its own previously-hidden neighbors, confirm clicking where a still-undiscovered tile sits does nothing.
