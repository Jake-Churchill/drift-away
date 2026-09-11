# Drift Away — Tile Level Visuals & Layout Shuffle

Date: 2026-09-11
Status: Approved for planning
Supersedes: nothing — additive to the 2026-09-09 leveling system (uses its `state.levels`/`getLevel` data, which already exists with zero visual effect today) and to the 2026-09-07 territory-expansion adjacency work (this reshuffles which flavor sits at each already-balanced slot, without touching the slots themselves).

## 1. Overview

Two independent, low-risk visual/layout improvements bundled into one spec since they land on the same branch and touch adjacent files:

- **Part A — Layout shuffle**: a one-time, permanent reassignment of which tile "flavor" (id/family/production stats) occupies which grid slot, so the map no longer reads as four solid family-colored blocks. Slot positions, unlock costs, and the whole ring-based adjacency graph are untouched — only which tile shows up where changes.
- **Part B — Per-level visuals**: every one of the 36 tiles' 3D prop already has a `level` (1-3, from the 2026-09-09 leveling system) with zero visual difference today. This gives each of the 10 prop archetypes (4 producer families + 6 individual boosters) a visibly bigger, more elaborate look at level 2 and level 3, built from a shared mechanism (scale + a floating tier badge) plus a light per-archetype embellishment that reuses each archetype's existing parametrized construction.

### Non-goals

- No change to unlock/discovery mechanics or to any tile's `gridPos` slot or `unlock` cost (Part A moves flavors between existing slots; it does not renumber or recost the slots themselves).
- No change to the leveling economy (costs, effect curve) from the 2026-09-09 design — this is a rendering-only pass on top of existing `state.levels` data.
- No level cap changes, no new prop archetypes, no lighting/environment changes.
- No per-playthrough randomization — the shuffle is one fixed, hand-approved layout baked directly into `js/tiles.js`.

## 2. Part A — Layout shuffle

### Mechanism

Decompose each tile into a **slot** (`{gridPos, unlock}` — position and its already ring-balanced cost) and a **flavor** (`{id, name, family, kind, produces, rate, boosts}` — identity and production characteristics). `driftwood_start`'s slot is fixed (it's the sole `unlock.type === 'start'` tile and must stay reachable at distance 0 from itself); the other 35 flavors are permuted across the other 35 slots using a seeded shuffle (mulberry32, seed `20260911`, Fisher-Yates). Because adjacency and reachability are derived entirely from `gridPos` (never from family/id), this permutation preserves every guarantee from the 2026-09-07 territory-expansion rebalance exactly — no soft-locks, same ring structure, same costs at each position — while completely breaking the family-block visual pattern.

### Resulting layout

Row-by-row family key (row 0 = top; f=fish, k=kelp, d=driftwood, c=crops, b=booster):

```
row 0: b f c f f c
row 1: k k b k b f
row 2: k c k d f d
row 3: f b c k d d
row 4: b f k c k c
row 5: b c f d d d
```

`driftwood_start` is fixed at (2,3), unchanged from today. Full new `gridPos` per tile id — every other field (`id`, `name`, `family`, `kind`, `produces`, `rate`, `boosts`, `unlock`) is untouched, so each tile keeps its own existing unlock cost exactly as it is today; the slot's cost travels with the slot, not the flavor (e.g. `fish_start`, moving to (0,1), keeps its current `{driftwood:50, crops:40}` cost — it just now sits where `kelp_start` used to be):

| Tile id | New gridPos (row,col) |
|---|---|
| driftwood_start | 2,3 (unchanged — fixed slot) |
| driftwood_shipwreck_salvage | 3,4 |
| driftwood_storm_wreckage | 3,5 |
| booster_lighthouse | 4,0 |
| fish_leviathan_net | 4,1 |
| kelp_start | 4,2 |
| crops_hanging_garden | 4,3 |
| kelp_deep_bed | 4,4 |
| crops_paddy_raft | 4,5 |
| booster_net_weavers | 0,0 |
| fish_start | 0,1 |
| crops_floating_orchard | 0,2 |
| fish_open_ocean_trawler | 0,3 |
| fish_anchored_net | 0,4 |
| crops_terraced_planter | 0,5 |
| kelp_open_water_farm | 1,0 |
| kelp_floating_garden | 1,1 |
| fish_trawling_raft | 2,4 |
| driftwood_flotsam_dredge | 2,5 |
| fish_grand_fishery | 3,0 |
| booster_composting_shed | 3,1 |
| crops_soil_barge | 3,2 |
| kelp_reef | 3,3 |
| booster_windmill | 1,2 |
| kelp_seaweed_raft | 1,3 |
| booster_drying_rack | 1,4 |
| fish_deep_sea_longline | 1,5 |
| kelp_nursery | 2,0 |
| crops_vertical_farm | 2,1 |
| kelp_abyssal_forest | 2,2 |
| booster_smokehouse | 5,0 |
| crops_start | 5,1 |
| fish_tide_pool_trap | 5,2 |
| driftwood_current_sweeper | 5,3 |
| driftwood_debris_net | 5,4 |
| driftwood_salvage_raft | 5,5 |

### Implementation

`js/tiles.js`'s `TILES` array is rewritten in place with each tile's `gridPos` field updated to the table above. `TILE_NEIGHBORS` is derived automatically from `gridPos` at module load, so it needs no manual changes.

### Testing impact

`tests/economy.test.mjs` hardcodes two tiles' neighbor lists by id. `driftwood_start`'s (fixed slot) is unaffected. `kelp_start`'s is not — `kelp_start` moves to (4,2), an interior position with 6 neighbors, not the 4-neighbor edge case that assertion currently documents. That edge-case assertion should move to whichever tile now sits at (0,1) — `fish_start` — with its new neighbor list:

```js
assert.deepEqual(
  [...TILE_NEIGHBORS.get('fish_start')].sort(),
  ['booster_net_weavers', 'crops_floating_orchard', 'kelp_floating_garden', 'kelp_open_water_farm'],
  'fish_start (0,1) has exactly these 4 neighbors (grid-edge tile, fewer than 6)'
);
```

The geometry-derived cross-check loop (which recomputes expected neighbors from `TILES` generically, independent of any hardcoded id) needs no changes.

## 3. Part B — Per-level visuals

### Shared mechanism (applies to all 10 archetypes)

- **Scale**: `propGroup.scale.setScalar(PROP_SCALE * extraScale * LEVEL_SCALE[level])` where `LEVEL_SCALE = { 1: 1.0, 2: 1.15, 3: 1.3 }` — a modest, uniform size increase layered on top of the existing `PROP_SCALE`/booster `extraScale`.
- **Tier badge**: a small floating `OctahedronGeometry` gem above the prop at levels 2-3 — bronze (`0xb8752f`) at level 2, gold (`0xffd23d`, emissive) at level 3. Anchored at a **per-archetype fixed height constant**, not a computed bounding box — prototyping showed a live `Box3` badge anchor runs away for tall archetypes (e.g. the windmill) relative to short ones (fish/kelp), placing badges wildly inconsistently:

  | Archetype | Anchor height |
  |---|---|
  | fish | 0.32 |
  | kelp | 0.85 |
  | driftwood | 0.25 |
  | crops | 0.95 |
  | booster_windmill | 1.0 |
  | booster_smokehouse | 0.8 |
  | booster_drying_rack | 0.55 |
  | booster_net_weavers | 0.6 |
  | booster_composting_shed | 0.35 |
  | booster_lighthouse | 1.05 |

  The badge must be added to the prop group **before** `propGroup.scale.setScalar(...)` is applied, so its local offset scales along with the rest of the prop.
- **Booster trim-ring escalation**: every booster's raft already has a static gold trim ring (`js/scene.js`'s `buildRaftMesh`). This becomes 3 pre-built variants (thickness 0.03/0.045/0.06 for levels 1/2/3, color gold → brighter gold → pale gold, level 3 adds a warm emissive glow), toggled the same way the prop groups are.

### Per-archetype embellishment

Each archetype's level-up adds more of, or intensifies, something it already has — no archetype gains a foreign visual element (the badge is the one universal exception, since not every shape has a natural place to visually "grow"):

| Archetype | Level 2 | Level 3 |
|---|---|---|
| **fish** | Fins/spikes turn bronze, ~35% longer | Fins turn gold with emissive glow, ~75% longer, adds a pair of trailing streamer fins (grounded in koi/goldfish maturation research: fins elongate, colors brighten/saturate, and become more graceful with age) |
| **kelp** | 4th blade added (lighter green) | 5th blade added (darker green) — fuller kelp bed |
| **driftwood** | 4th log added (small, mossy tint) + 1 extra twig | 5th, larger log stacked on top + barnacle clusters on 2 logs — bigger accumulated pile |
| **crops** | +3 stalks (17 total), grain-head color deepens to richer gold | +3 more stalks (20 total), grain-head color deepens further toward amber — riper grain |
| **booster_windmill** | (trim ring only — prop unchanged) | (trim ring only) |
| **booster_smokehouse** | 2 semi-transparent smoke puffs above the chimney | 4 puffs (taller plume) + small emissive ember glow at the chimney top |
| **booster_drying_rack** | 2 more hanging items (5 total) | second, higher bar added with 3 more hanging items (8 total across two tiers) |
| **booster_net_weavers** | net line density doubles (tighter weave) | denser net + a coiled rope/net bundle mesh resting at the base |
| **booster_composting_shed** | 2-3 small translucent green gas/steam spheres above the lid | second, larger bin added beside the first + more steam |
| **booster_lighthouse** | beacon emissive intensity/size increase, soft glow halo added around the lantern | brighter/bigger beacon + halo, light color shifts warmer (toward gold) |

Fish, kelp, and windmill were prototyped and visually validated in a scratch file (`preview-levels.html`) before writing this spec; the remaining seven archetypes follow the same "more/brighter of what's already there" principle applied to their existing construction and will be built directly in `js/scene.js` without a separate prototyping pass.

### `js/scene.js` changes

- Every prop builder (`buildFishProp`, `buildKelpProp`, `buildDriftwoodProp`, `buildCropsProp`, `buildWindmill`, `buildSmokehouse`, `buildDryingRack`, `buildNetWeavers`, `buildCompostingShed`, `buildLighthouse`) gains a `level` parameter and reads it to add the extra elements from the table above. `buildBoosterProp(group, tileId, level)` forwards `level` to whichever booster builder it dispatches to.
- New shared `addLevelBadge(propGroup, level, anchorHeight)` helper (module-level, no export needed) and a `BADGE_ANCHOR_HEIGHT` lookup keyed by `family` for producers and by `tile.id` for boosters.
- `addProp(raftMesh, tile)` is called once per level (1, 2, 3) instead of once total, building 3 sibling `propGroup`s attached to the same `raftMesh`, each visible only at its own level (level 1 visible by default, matching today's default-unlocked-at-level-1 behavior). This follows the project's established "build once at scene-construction time, toggle `.visible` per frame" pattern, already used for `raftMesh`/`markerMesh`.
- `buildRaftMesh(tile)` similarly builds 3 trim-ring variants for booster tiles (instead of 1), using the same visibility-toggle pattern.
- `tileObjects` (in `buildScene`) stores `propGroups` (an object keyed `{1, 2, 3}`) and `trimMeshes` (same shape, `null` for non-boosters) instead of the single `propGroup` it stores today.

### `js/render.js` changes

`updateScene` already imports `TILES` and calls `isDiscovered`/`isEligible` per tile every frame — it gains an import of `getLevel` from `state.js` (already exported per the 2026-09-09 design) and, per unlocked tile, sets `objects.propGroups[lvl].visible = (lvl === getLevel(state, tile.id))` for `lvl` in `1, 2, 3` (and the same for `trimMeshes` when present). This is a per-frame toggle of a boolean on 3 pre-built objects, not a rebuild — consistent with the existing `raftMesh`/`markerMesh` visibility toggling already happening in this same loop, so no new performance concern.

### Testing

This is a rendering-only change with no new `js/state.js` or economy logic — `tests/economy.test.mjs` needs no additions for Part B beyond the Part A neighbor-list fix already noted above. Manual verification (screenshot at each level, for a representative producer, a representative booster, and the game's actual gameplay zoom) replaces automated testing here, matching how the original prop visual work in the 2026-09-04 Three.js rewrite was verified.

## 4. Rollout

Both parts ship together on one branch (small, low-risk, and touching overlapping/adjacent files — `js/tiles.js` for Part A, `js/scene.js`/`js/render.js` for Part B — so there's no benefit to splitting them). `preview-levels.html` (the scratch prototype) and the ad-hoc shuffle script are deleted once their designs are fully absorbed into the real implementation.
