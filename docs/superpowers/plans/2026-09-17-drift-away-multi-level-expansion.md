# Drift Away Multi-Level Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add zone 2 ("Frozen Reach", 36 tiles) east of the existing 36-tile grid, with a reusable zone architecture, camera-sail navigation between zones, a cloud-cover fog visual that clears as zone 2 is explored, a pricier/more-productive zone-2 economy, two new achievements, and redesigned Arctic-themed prop art for all 10 tile archetypes.

**Architecture:** Zone 2's tiles are ordinary entries in the existing flat `TILES` array (just tagged `zone: 'zone2'` and placed at higher grid columns), so the existing adjacency/discovery/completion/prestige machinery needs zero changes — it already operates generically over "however many tiles exist." The only genuinely new systems are: a small `ZONES` config, a per-zone camera framing + animated tween (ported from a validated scratch prototype), a cloud-cover visual (also ported from that prototype), and a dispatch point in the prop-rendering code that routes zone-2 tiles to new geometry (built and approved in its own scratch prototype first).

**Tech Stack:** Vanilla ES modules, Three.js (via CDN import map, no build step), Node `assert` tests (`npm test`).

**Spec:** `docs/superpowers/specs/2026-09-16-drift-away-multi-level-expansion-design.md`

**Reference implementation:** `preview-camera-sail.html` (repo root) is a validated, user-tested scratch prototype containing the exact tuned camera-sail tween logic and cloud-cover visual (colors, positions, scale, fade curve). Tasks 3 and 4 port its logic and constants — read it before starting either task. Delete it at the end of Task 5 once its logic is fully ported and manually re-verified in the real game.

## Global Constraints

- No new resource types — zone 2 uses only `fish`/`kelp`/`driftwood`/`crops`, exactly like zone 1.
- No free-roam camera — exactly two fixed camera framings (one per zone) with a single animated tween between them. No drag/zoom/orbit controls.
- No changes to the existing 8 achievements' conditions in `js/state.js`'s `ACHIEVEMENTS` array — they already scale automatically. Add exactly 2 new achievements, nothing more.
- No separate zone-2 currency and no separate prestige track — one unified economy, one unified prestige/full-completion gate covering both zones (this is deliberate: prestiging now resets zone 2 too, and full completion now means both zones maxed — 72 tiles).
- No procedural/infinite zone generation — zone 2's 36 tiles are hand-authored data, same as zone 1.
- Zone-2 unlock costs and milestone targets are **15×** zone-1's equivalents. Zone-2 production rates and booster percentages are **4×** zone-1's equivalents. (Both within the spec's approved 15–20× / 3–5× bands — this plan picks concrete single multipliers so every zone-2 tile's numbers are unambiguous.) These are first-pass constants, not playtested — matching this codebase's existing convention (see `PRESTIGE_TOKEN_DIVISOR`'s comment in `js/state.js`).
- Zone-2 prop geometry (10 archetypes) MUST be prototyped in a scratch file and shown to the user for approval before any of it is ported into `js/scene.js`. This is a hard stop (Task 6), not a formality — do not write zone-2 geometry directly into `js/scene.js` under any circumstances before that approval.
- This project has no automated test harness for DOM/Three.js visuals (established convention) — verify those manually in a real browser via `npx serve -l 4173 .`. Pure economy-math changes (anything in `js/state.js`) get Node/`assert` tests in `tests/economy.test.mjs`, run via `npm test`.

---

## File Structure

- **Create** `js/zones.js` — the `ZONES` config (one entry per zone: id, name, grid column range, raft color).
- **Modify** `js/tiles.js` — tag all 36 existing tiles with `zone: 'zone1'`; append 36 new zone-2 tile definitions.
- **Modify** `js/state.js` — add 2 achievements to `ACHIEVEMENTS`.
- **Modify** `js/scene.js` — zone-aware raft coloring; generic per-zone camera framing computation; cloud-cover mesh construction; prop-dispatch routes zone-2 tiles to the new file below.
- **Modify** `js/render.js` — `sailToZone`/`getCurrentZone` exports and the camera tween; per-frame cloud-cover fade.
- **Modify** `js/main.js` — click handler sails instead of opening a tile panel when the clicked tile's zone differs from the currently-framed zone.
- **Create** `js/zone2-props.js` — the 10 redesigned zone-2 prop builders (Task 7 only, after Task 6's approval gate).
- **Modify** `tests/economy.test.mjs` — update the hardcoded tile-count total; add tests for the new state.js additions.
- **Create, then delete** `preview-levels-2.html` (Task 6, art prototype) and delete `preview-camera-sail.html` (end of Task 5).

---

### Task 1: Zone data model — `ZONES` config and 36 authored zone-2 tiles

**Files:**
- Create: `js/zones.js`
- Modify: `js/tiles.js`
- Test: `tests/economy.test.mjs`

**Interfaces:**
- Produces: `ZONES` (array of `{ id, name, colStart, colEnd, raftColor }`), exported from `js/zones.js`. `TILES` (from `js/tiles.js`) grows from 36 to 72 entries; every entry now has a `zone: 'zone1' | 'zone2'` field.
- Consumes: nothing new — `TILE_NEIGHBORS`'s existing `neighborGridPositions` function needs no changes (see below for why).

- [ ] **Step 1: Create `js/zones.js`**

```js
// One entry per explorable zone. Zone 2's tiles sit in the *same* row/col
// coordinate space as zone 1, just at higher columns — colStart/colEnd here
// are documentation of that placement, not consumed by any position math
// (js/tiles.js's neighborGridPositions and js/scene.js's hexLocalPosition
// already work generically over whatever row/col values exist).
export const ZONES = [
  { id: 'zone1', name: 'Home Waters', colStart: 0, colEnd: 5, raftColor: 0xc9975b },
  { id: 'zone2', name: 'Frozen Reach', colStart: 6, colEnd: 11, raftColor: 0xa9c9d6 },
];
```

- [ ] **Step 2: Tag all 36 existing tiles in `js/tiles.js` with `zone: 'zone1'`**

Add `zone: 'zone1'` as the last property of every one of the 36 existing entries in the `TILES` array (e.g. `{ id: 'fish_start', name: 'Fishing Raft', gridPos: { row: 0, col: 1 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 50, crops: 40 } }, zone: 'zone1' }`). Do this for all 36 — the diff should touch every existing tile line, appending `, zone: 'zone1'` before the closing `}`.

- [ ] **Step 3: Append the 36 zone-2 tiles to `js/tiles.js`'s `TILES` array**

Each mirrors its zone-1 counterpart's row and family/kind/produces/boosts shape exactly, at `col + 6`, with costs/milestone-targets ×15 and rates/boost-percents ×4 (both rounded to clean numbers). The one exception is `frozen_driftwood_start`: zone 1's `driftwood_start` is the game's single `unlock: { type: 'start' }` tile, which cannot be duplicated — its zone-2 mirror instead gets a modest `cost` unlock, priced at the low end of zone 2's range like its neighbors.

Add this block immediately after the existing 36 entries, before the closing `];` of `TILES`:

```js
  // ===== Zone 2: Frozen Reach ===== (mirrors zone 1's grid shape at col+6;
  // costs/milestones are 15x zone-1's, rates/boosts are 4x zone-1's)

  // Fish family
  { id: 'frozen_fish_start', name: 'Ice-Locked Raft', gridPos: { row: 0, col: 7 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 750, crops: 600 } }, zone: 'zone2' },
  { id: 'frozen_fish_anchored_net', name: 'Frozen Anchor Net', gridPos: { row: 0, col: 10 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 900, crops: 750 } }, zone: 'zone2' },
  { id: 'frozen_fish_trawling_raft', name: 'Glacier Trawler', gridPos: { row: 2, col: 10 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 4.8, boosts: null, unlock: { type: 'cost', cost: { driftwood: 375 } }, zone: 'zone2' },
  { id: 'frozen_fish_tide_pool_trap', name: 'Frostbound Tide Trap', gridPos: { row: 5, col: 8 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 4.8, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 3750 }, zone: 'zone2' },
  { id: 'frozen_fish_deep_sea_longline', name: 'Deep-Ice Longline', gridPos: { row: 1, col: 11 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 6, boosts: null, unlock: { type: 'cost', cost: { fish: 900, driftwood: 600 } }, zone: 'zone2' },
  { id: 'frozen_fish_grand_fishery', name: 'Grand Frozen Fishery', gridPos: { row: 3, col: 6 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 8, boosts: null, unlock: { type: 'cost', cost: { kelp: 1050, crops: 750 } }, zone: 'zone2' },
  { id: 'frozen_fish_open_ocean_trawler', name: 'Open-Ice Trawler', gridPos: { row: 0, col: 9 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 7.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 600 }, zone: 'zone2' },
  { id: 'frozen_fish_leviathan_net', name: 'Leviathan Ice Net', gridPos: { row: 4, col: 7 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 10, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 3000 }, zone: 'zone2' },

  // Kelp family
  { id: 'frozen_kelp_nursery', name: 'Frost Kelp Nursery', gridPos: { row: 2, col: 6 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 4.8, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 2250 }, zone: 'zone2' },
  { id: 'frozen_kelp_start', name: 'Rimed Kelp Farm', gridPos: { row: 4, col: 8 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 1050, crops: 900 } }, zone: 'zone2' },
  { id: 'frozen_kelp_seaweed_raft', name: 'Frozen Seaweed Raft', gridPos: { row: 1, col: 9 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 450 } }, zone: 'zone2' },
  { id: 'frozen_kelp_floating_garden', name: 'Icebound Floating Garden', gridPos: { row: 1, col: 7 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 4.8, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 2250 }, zone: 'zone2' },
  { id: 'frozen_kelp_deep_bed', name: 'Deep Frost Kelp Bed', gridPos: { row: 4, col: 10 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 6, boosts: null, unlock: { type: 'cost', cost: { driftwood: 1350, crops: 1050 } }, zone: 'zone2' },
  { id: 'frozen_kelp_reef', name: 'Glacial Kelp Reef', gridPos: { row: 3, col: 9 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 8, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 900 }, zone: 'zone2' },
  { id: 'frozen_kelp_open_water_farm', name: 'Open-Water Frost Farm', gridPos: { row: 1, col: 6 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 7.2, boosts: null, unlock: { type: 'cost', cost: { fish: 1200, driftwood: 1050 } }, zone: 'zone2' },
  { id: 'frozen_kelp_abyssal_forest', name: 'Abyssal Ice Forest', gridPos: { row: 2, col: 8 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 10, boosts: null, unlock: { type: 'cost', cost: { driftwood: 600 } }, zone: 'zone2' },

  // Driftwood family
  { id: 'frozen_driftwood_start', name: 'Glacier Driftwood Collector', gridPos: { row: 2, col: 9 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 2, boosts: null, unlock: { type: 'cost', cost: { crops: 600 } }, zone: 'zone2' },
  { id: 'frozen_driftwood_salvage_raft', name: 'Frozen Salvage Raft', gridPos: { row: 5, col: 11 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 2.4, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 7500 }, zone: 'zone2' },
  { id: 'frozen_driftwood_debris_net', name: 'Ice Debris Net', gridPos: { row: 5, col: 10 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 2.4, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 6000 }, zone: 'zone2' },
  { id: 'frozen_driftwood_current_sweeper', name: 'Frost Current Sweeper', gridPos: { row: 5, col: 9 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 3.2, boosts: null, unlock: { type: 'cost', cost: { fish: 2250, kelp: 2250 } }, zone: 'zone2' },
  { id: 'frozen_driftwood_storm_wreckage', name: 'Storm-Locked Wreckage', gridPos: { row: 3, col: 11 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 600 } }, zone: 'zone2' },
  { id: 'frozen_driftwood_flotsam_dredge', name: 'Frozen Flotsam Dredge', gridPos: { row: 2, col: 11 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 4, boosts: null, unlock: { type: 'cost', cost: { crops: 675 } }, zone: 'zone2' },
  { id: 'frozen_driftwood_shipwreck_salvage', name: 'Ice-Locked Shipwreck', gridPos: { row: 3, col: 10 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 5.2, boosts: null, unlock: { type: 'cost', cost: { driftwood: 525, crops: 375 } }, zone: 'zone2' },

  // Crops family
  { id: 'frozen_crops_start', name: 'Tundra Planter Raft', gridPos: { row: 5, col: 7 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 2, boosts: null, unlock: { type: 'cost', cost: { fish: 1500, driftwood: 1500 } }, zone: 'zone2' },
  { id: 'frozen_crops_soil_barge', name: 'Frozen Soil Barge', gridPos: { row: 3, col: 8 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 2.4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 525 } }, zone: 'zone2' },
  { id: 'frozen_crops_hanging_garden', name: 'Icebound Hanging Garden', gridPos: { row: 4, col: 9 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 2.4, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 1800 }, zone: 'zone2' },
  { id: 'frozen_crops_terraced_planter', name: 'Frost-Terraced Planter', gridPos: { row: 0, col: 11 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 3.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 4500 }, zone: 'zone2' },
  { id: 'frozen_crops_floating_orchard', name: 'Frozen Floating Orchard', gridPos: { row: 0, col: 8 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 450, crops: 300 } }, zone: 'zone2' },
  { id: 'frozen_crops_paddy_raft', name: 'Glacial Paddy Raft', gridPos: { row: 4, col: 11 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 2100, crops: 1800 } }, zone: 'zone2' },
  { id: 'frozen_crops_vertical_farm', name: 'Vertical Frost Farm', gridPos: { row: 2, col: 7 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 5.2, boosts: null, unlock: { type: 'cost', cost: { driftwood: 825 } }, zone: 'zone2' },

  // Booster family
  { id: 'frozen_booster_drying_rack', name: 'Frozen Drying Rack', gridPos: { row: 1, col: 10 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'kelp', percent: 80 }, { resource: 'driftwood', percent: 80 }], unlock: { type: 'milestone', resource: 'crops', target: 600 }, zone: 'zone2' },
  { id: 'frozen_booster_smokehouse', name: 'Glacier Smokehouse', gridPos: { row: 5, col: 6 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 100 }], unlock: { type: 'cost', cost: { kelp: 3000, driftwood: 3000 } }, zone: 'zone2' },
  { id: 'frozen_booster_windmill', name: 'Frostwind Mill', gridPos: { row: 1, col: 8 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 100 }], unlock: { type: 'cost', cost: { driftwood: 300 } }, zone: 'zone2' },
  { id: 'frozen_booster_net_weavers', name: 'Ice Net Weavers', gridPos: { row: 0, col: 6 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 80 }, { resource: 'kelp', percent: 80 }], unlock: { type: 'cost', cost: { fish: 1800, driftwood: 1350 } }, zone: 'zone2' },
  { id: 'frozen_booster_composting_shed', name: 'Frozen Composting Shed', gridPos: { row: 3, col: 7 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 80 }, { resource: 'driftwood', percent: 80 }], unlock: { type: 'milestone', resource: 'driftwood', target: 1350 }, zone: 'zone2' },
  { id: 'frozen_booster_lighthouse', name: 'Aurora Lighthouse', gridPos: { row: 4, col: 6 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 60 }, { resource: 'kelp', percent: 60 }, { resource: 'driftwood', percent: 60 }, { resource: 'crops', percent: 60 }], unlock: { type: 'cost', cost: { kelp: 1800, driftwood: 1350 } }, zone: 'zone2' },
```

- [ ] **Step 4: Run the existing test suite to check nothing broke**

Run: `npm test`
Expected: The suites that count tiles or assert `TILES.length === 36` (grep the test file for the literal `36` to find every one — there are several, per the design spec's Testing Plan) will now FAIL, since `TILES.length` is 72. This is expected at this point — fix them in the next step.

- [ ] **Step 5: Update every hardcoded `36` tile-count assertion in `tests/economy.test.mjs`**

Search the file for the literal `36` (`grep -n '36' tests/economy.test.mjs`) and update each one to `72`, or better, to `TILES.length` where the test already imports `TILES` — prefer referencing `TILES.length` over a new hardcoded `72` so this doesn't need updating again for zone 3. Do the same for any test asserting a specific family count (e.g. "8 fish tiles") — those should become "16 fish tiles" (8 zone-1 + 8 zone-2), or better, computed as `TILES.filter(t => t.family === 'fish').length` compared against an explicit expected count you compute from both zones' rosters.

- [ ] **Step 6: Add a zone-border adjacency test**

Add a new test section (matching the file's existing style — a labeled block using `assert`, with a `console.log('... tests passed')` at the end) verifying the zone-1/zone-2 border works:

```js
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
```

Add the import `TILE_NEIGHBORS` to this test file if it isn't already imported (check the top of the file first).

- [ ] **Step 7: Run tests to verify everything passes**

Run: `npm test`
Expected: PASS — every suite, including the new zone border adjacency section.

- [ ] **Step 8: Commit**

```bash
git add js/zones.js js/tiles.js tests/economy.test.mjs
git commit -m "Add zone-2 tile data and zone tagging for all tiles"
```

---

### Task 2: The two zone-2 achievements

**Files:**
- Modify: `js/state.js`
- Test: `tests/economy.test.mjs`

**Deviation from the spec, decided during planning:** the design spec calls for an `isZoneDiscovered(state, zoneId)` helper to "gate whether zone-2 tiles are clickable-to-sail" and to "gate" the discovery achievement. Working through Task 5's actual click handling shows neither use materializes: `screenToGrid` already only returns tiles whose mesh is currently `.visible` (i.e. already discovered-or-unlocked), so an undiscovered zone-2 tile can never be clicked in the first place — no separate gate is needed. And the discovery achievement is about *unlocking* the first zone-2 tile (a later, stricter state than mere discovery), so its condition checks `state.unlocked` directly, not discovery. Adding `isZoneDiscovered` anyway would be dead code with no caller, which this codebase's conventions (and CLAUDE.md) explicitly avoid. This task therefore skips it and implements only the two achievements — a ruling, not an oversight.

**Interfaces:**
- Consumes: `TILES` (with `.zone` field from Task 1), `getLevel`, `MAX_LEVEL`, `ACHIEVEMENTS`, `checkAchievements` (all already exist in `js/state.js`).
- Produces: two new entries appended to the exported `ACHIEVEMENTS` array: `frozen-reach-discovered` (reward 2) and `frozen-reach-complete` (reward 8).

- [ ] **Step 1: Write the failing tests**

Add to `tests/economy.test.mjs` (check the top of the file for how `ACHIEVEMENTS`/`checkAchievements`/`createInitialState` are already imported):

```js
// --- zone-2 achievement tests ---
{
  const state = createInitialState();
  const goldBefore = state.gold;
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — the achievement assertions fail since `frozen-reach-discovered`/`frozen-reach-complete` don't exist in `ACHIEVEMENTS` yet.

- [ ] **Step 3: Add the two achievements to `ACHIEVEMENTS`**

Append these two entries to the existing `ACHIEVEMENTS` array (after `drift-away-complete`, or wherever the array currently ends):

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites, including the new one.

- [ ] **Step 5: Commit**

```bash
git add js/state.js tests/economy.test.mjs
git commit -m "Add the two Frozen Reach achievements"
```

---

### Task 3: Generic per-zone camera framing and the sail tween

**Read `preview-camera-sail.html` fully before starting** — this task ports its `sailTo`/`easeInOutCubic` logic (lines ~167–199 of that file) into the real game's render loop, adapted from a standalone `requestAnimationFrame` loop into the existing per-frame `updateScene` call.

**Files:**
- Modify: `js/scene.js`
- Modify: `js/render.js`

**Interfaces:**
- Consumes: `ZONES` (from Task 1's `js/zones.js`), `TILES` (with `.zone`).
- Produces: `buildScene(canvas)`'s return value gains `cameraPositions: Map<string, { position: THREE.Vector3, target: THREE.Vector3 }>`. `js/render.js` gains two new exports: `sailToZone(zoneId)` and `getCurrentZone()`.

- [ ] **Step 1: Compute `cameraPositions` in `js/scene.js`'s `buildScene`**

In `js/scene.js`, import `ZONES` at the top:

```js
import { ZONES } from './zones.js';
```

In `buildScene`, after the existing tile-building loop (right before the `function resize(...)` declaration), add:

```js
  const CAMERA_OFFSET = new THREE.Vector3(14, 16, 14);
  const cameraPositions = new Map();
  for (const zone of ZONES) {
    if (zone.id === 'zone1') {
      // Keep zone 1's camera exactly as it is today — an averaged centroid
      // would land very close to (0,0,0) but not exactly, and there's no
      // reason to risk a tiny shift to the one framing players already know.
      cameraPositions.set('zone1', { position: new THREE.Vector3(14, 16, 14), target: new THREE.Vector3(0, 0, 0) });
      continue;
    }
    const zoneTiles = TILES.filter((t) => t.zone === zone.id);
    const center = new THREE.Vector3();
    for (const tile of zoneTiles) {
      const { x, z } = hexLocalPosition(tile.gridPos.row, tile.gridPos.col);
      center.x += x;
      center.z += z;
    }
    center.divideScalar(zoneTiles.length);
    cameraPositions.set(zone.id, { position: center.clone().add(CAMERA_OFFSET), target: center });
  }
```

Add `cameraPositions` to `buildScene`'s final returned object: `return { renderer, scene, camera, resize, waterMesh, waterBasePositions, tileObjects, cameraPositions };`.

- [ ] **Step 2: Capture `cameraPositions` and add the sail tween in `js/render.js`**

Add to the module-level `let` declaration at the top of `js/render.js`:

```js
let renderer, scene, camera, resizeFn, waterMesh, waterBasePositions, tileObjects, cameraPositions;
let currentZone = 'zone1';
let cameraLookTarget = new THREE.Vector3(0, 0, 0);
let sailAnimation = null;
```

In `initScene`, capture the new field:

```js
  cameraPositions = built.cameraPositions;
```

Add these new exports (anywhere after `initScene`, e.g. right before `updateWater`):

```js
const SAIL_DURATION_MS = 1200;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function getCurrentZone() {
  return currentZone;
}

export function sailToZone(zoneId) {
  if (sailAnimation || zoneId === currentZone) return;
  const dest = cameraPositions.get(zoneId);
  if (!dest) return;
  sailAnimation = {
    fromPos: camera.position.clone(),
    fromTarget: cameraLookTarget.clone(),
    toPos: dest.position.clone(),
    toTarget: dest.target.clone(),
    startTime: performance.now(),
    destZone: zoneId,
  };
}

function advanceSail() {
  if (!sailAnimation) return;
  const t = Math.min(1, (performance.now() - sailAnimation.startTime) / SAIL_DURATION_MS);
  const e = easeInOutCubic(t);
  camera.position.lerpVectors(sailAnimation.fromPos, sailAnimation.toPos, e);
  cameraLookTarget.lerpVectors(sailAnimation.fromTarget, sailAnimation.toTarget, e);
  camera.lookAt(cameraLookTarget);
  if (t >= 1) {
    currentZone = sailAnimation.destZone;
    sailAnimation = null;
  }
}
```

Call `advanceSail()` as the very first line inside `updateScene(state, time)`.

- [ ] **Step 3: Manual verification**

Run: `npx serve -l 4173 .`, open the game, unlock zone-1 tiles until a zone-2 tile is discovered (Task 5 wires the actual click-to-sail trigger, so for now, verify `sailToZone` works by calling it from the browser console: `import('/js/render.js').then(m => m.sailToZone('zone2'))`).

Expected: the camera smoothly tweens to zone 2's computed framing over ~1.2s and `getCurrentZone()` (also callable from the console) returns `'zone2'` afterward. Calling `sailToZone('zone1')` sails back. No console errors.

- [ ] **Step 4: Commit**

```bash
git add js/scene.js js/render.js
git commit -m "Add generic per-zone camera framing and the sail tween"
```

---

### Task 4: Zone-2 visual identity — raft recoloring and the cloud-cover fog

**Read `preview-camera-sail.html` fully before starting** — this task ports its cloud-cover construction (`softRadialTexture`, `shadowMesh`, `paintCloudTexture`, `cloudMaterial`, `cloudSprite`, `setCloudProgress` — lines ~73–157 of that file) into `js/scene.js`/`js/render.js`.

**Files:**
- Modify: `js/scene.js`
- Modify: `js/render.js`

**Interfaces:**
- Consumes: `cameraPositions` (Task 3, for computing the cloud's east-of-zone-2 offset), `ZONES` (Task 1, for the raft color lookup).
- Produces: `buildScene`'s return value gains `cloudSprite`, `cloudMaterial`, `cloudShadowMesh` (the built meshes, so `render.js` can update their fade every frame).

- [ ] **Step 1: Zone-aware raft coloring in `js/scene.js`**

Add near the other top-level constants (after `const WOOD_TOP = 0xc9975b;` — leave that constant in place since it's still referenced elsewhere, or replace its usages, whichever reads cleaner once you look at the surrounding code):

```js
const ZONE_RAFT_COLOR = new Map(ZONES.map((z) => [z.id, z.raftColor]));
```

In `buildRaftMesh(tile)`, change:

```js
  const raftMaterial = new THREE.MeshStandardMaterial({ color: WOOD_TOP, roughness: 0.85, metalness: 0.05 });
```

to:

```js
  const raftMaterial = new THREE.MeshStandardMaterial({ color: ZONE_RAFT_COLOR.get(tile.zone), roughness: 0.85, metalness: 0.05 });
```

- [ ] **Step 2: Build the cloud cover in `buildScene`**

Add this after the `cameraPositions` computation from Task 3 (still inside `buildScene`, before the `function resize(...)` declaration):

```js
  const zone2Target = cameraPositions.get('zone2').target;
  const CLOUD_CENTER_X = zone2Target.x + 8; // offset further east than zone 2's own
  // center — a cloud sized to meaningfully cover the zone is bigger than the zone's
  // own footprint, and centering it exactly on zone 2 would spill its west edge back
  // over zone-1 tiles players can already see clearly.

  function softRadialTexture() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(20,30,38,0.55)');
    g.addColorStop(0.55, 'rgba(20,30,38,0.32)');
    g.addColorStop(1, 'rgba(20,30,38,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  const cloudShadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 22, 1, 1),
    new THREE.MeshBasicMaterial({ map: softRadialTexture(), transparent: true, depthWrite: false })
  );
  cloudShadowMesh.rotation.x = -Math.PI / 2;
  cloudShadowMesh.position.set(CLOUD_CENTER_X, 0.05, 0);
  scene.add(cloudShadowMesh);

  function paintCloudTexture() {
    const w = 1024, h = 640;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    function blob(x, y, r, color, hardness) {
      const g = ctx.createRadialGradient(x, y, r * hardness, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const shadowSpots = [[380, 390, 220], [520, 360, 260], [660, 396, 210], [300, 424, 156], [740, 416, 156]];
    for (const [x, y, r] of shadowSpots) blob(x, y, r, 'rgba(96,112,146,0.95)', 0.72);
    const topSpots = [[380, 290, 200], [510, 244, 256], [650, 286, 196], [300, 336, 144], [730, 326, 144]];
    for (const [x, y, r] of topSpots) blob(x, y, r, 'rgba(214,220,232,1)', 0.8);
    return new THREE.CanvasTexture(c);
  }

  const cloudMaterial = new THREE.SpriteMaterial({ map: paintCloudTexture(), transparent: true });
  const cloudSprite = new THREE.Sprite(cloudMaterial);
  cloudSprite.scale.set(32, 20, 1);
  cloudSprite.position.set(CLOUD_CENTER_X, 6, 0);
  scene.add(cloudSprite);
```

Add `cloudSprite, cloudMaterial, cloudShadowMesh` to `buildScene`'s final returned object.

- [ ] **Step 3: Fade the cloud based on zone-2 unlock progress in `js/render.js`**

Add to the module-level `let` declaration: `cloudSprite, cloudMaterial, cloudShadowMesh`. Capture them in `initScene` alongside `cameraPositions`. Precompute the zone-2 tile list once at module scope (near the top of the file, after imports): `const ZONE2_TILES = TILES.filter((t) => t.zone === 'zone2');`.

Add this function (e.g. near `updateWater`):

```js
function updateCloudCover(state) {
  const unlockedCount = ZONE2_TILES.filter((t) => state.unlocked.includes(t.id)).length;
  const progress = unlockedCount / ZONE2_TILES.length;
  const remaining = 1 - progress;
  cloudShadowMesh.material.opacity = remaining;
  const shadowScale = 0.4 + 0.6 * remaining;
  cloudShadowMesh.scale.set(shadowScale, shadowScale, 1);
  cloudShadowMesh.visible = remaining > 0.02;
  cloudMaterial.opacity = remaining;
  cloudSprite.position.y = 6 + progress * 4;
}
```

Call `updateCloudCover(state)` inside `updateScene(state, time)` (anywhere in its body — e.g. right after `advanceSail()`).

- [ ] **Step 4: Manual verification**

Run: `npx serve -l 4173 .`. Confirm: zone-1 rafts are unchanged (still the original wood color); sailing to zone 2 (via the console call from Task 3, or wait for Task 5) shows a large cloud cover east of zone 2 that does not overlap zone-1 tiles; in the browser console, manually unlock a few zone-2 tiles by mutating `state.unlocked` directly (or wait for Task 5's real unlock flow) and confirm the cloud visibly thins. No console errors.

- [ ] **Step 5: Commit**

```bash
git add js/scene.js js/render.js
git commit -m "Add zone-2 raft coloring and the cloud-cover fog visual"
```

---

### Task 5: Wire click-to-sail into the real click handler, delete the camera prototype

**Files:**
- Modify: `js/main.js`
- Delete: `preview-camera-sail.html`

**Interfaces:**
- Consumes: `sailToZone`, `getCurrentZone` (Task 3), `tile.zone` (Task 1).

Note the simplification versus the prototype: the prototype needed to raycast against its stand-in cloud sprite because no real zone-2 tiles existed yet to click on. In the real game, zone-2 tiles' own marker meshes are already raycast targets via the existing `screenToGrid` (it raycasts every tile's `raftMesh`/`markerMesh` that's currently `.visible`, zone-agnostic) — so no new raycasting code is needed at all, only a branch in the click handler's existing tile-resolution logic.

- [ ] **Step 1: Update the click handler in `js/main.js`**

Add `sailToZone, getCurrentZone` to the existing `import { initScene, updateScene, screenToGrid } from './render.js';` line.

Change the canvas click handler from:

```js
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
```

to:

```js
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

  if (tile.zone !== getCurrentZone()) {
    sailToZone(tile.zone);
    return;
  }

  selectedTileId = tile.id;
  renderTilePanel(tile);
});
```

- [ ] **Step 2: Manual verification of the full flow**

Run: `npx serve -l 4173 .`. Play through: unlock zone-1 tiles until a zone-1 column-5 tile is unlocked (e.g. `crops_terraced_planter` or whichever col-5 tile is cheapest given Task 1's actual costs) — confirm a zone-2 tile's pulsing marker becomes visible at the edge of the screen, under the cloud. Click it: the camera should sail to zone 2 (not open a tile panel). From zone 2's framing, click a zone-1 tile: the camera sails back. From zone 2's framing, click a discovered-but-unlocked zone-2 tile: it should open the normal tile panel (same zone, no sail). Confirm no console errors throughout, and that `saveState`/reload preserves which zone-2 tiles are unlocked (reload the page and check).

- [ ] **Step 3: Delete the camera-sail prototype**

```bash
rm preview-camera-sail.html
```

- [ ] **Step 4: Run the full test suite one more time**

Run: `npm test`
Expected: PASS — this task touches no economy logic, so this should be unaffected, but confirm nothing regressed.

- [ ] **Step 5: Commit**

```bash
git add -A js/main.js
git commit -m "Wire click-to-sail into the real click handler"
```

---

### Task 6: Design and prototype the 10 redesigned zone-2 prop archetypes (STOP for user approval)

**This task is exploratory/creative, not mechanical** — unlike every other task in this plan, the exact geometry code cannot be pre-specified here, because that is the entire point of prototyping it first per the user's standing instruction (see the design spec's Art Plan section). This task's job is to produce a real, working Three.js prototype and get the user's explicit approval on it. **Do not skip the approval step and do not proceed to Task 7 without an explicit yes from the user.**

**Files:**
- Create: `preview-levels-2.html`

**Interfaces:**
- Consumes: nothing from earlier tasks except `TILES` (to know the 10 archetypes and their zone-2 ids) and the Arctic palette (`ZONES.find(z => z.id === 'zone2').raftColor`, `0xa9c9d6`).
- Produces: an approved visual reference for Task 7 to port from. No code from this task ships in the final game — the file itself gets deleted at the end of Task 7.

- [ ] **Step 1: Build the prototype scene**

Follow the exact structural pattern of `preview-camera-sail.html` (before its deletion in Task 5 — check git history if it's already gone by the time this task runs: `git show HEAD~5:preview-camera-sail.html` or similar, or just replicate the pattern described here): a standalone HTML file with the same `three` import map, a `<canvas>`, and a small module script that creates its own `THREE.Scene`/camera/renderer/lighting (reuse the exact ambient+directional light setup from `js/scene.js`'s `buildScene` — same colors/positions/shadow settings, so the props are lit identically to how they'll look in the real game) — do not import `js/scene.js` for this one, since the point is prototyping *new* geometry, not reusing the old.

Lay out all 10 archetypes side by side (a row of raft-sized hex platforms, or simpler: just floating prop groups with no raft underneath, spaced evenly along the x-axis, each labeled with an HTML overlay), at level 1 (the base look — level 2/3 embellishments are a nice-to-have here but not required for approval; the spec's bar is "represents all 10 archetypes," not full 3-level polish).

- [ ] **Step 2: Design and build each archetype**

For each of the 10 archetypes (fish, kelp, driftwood, crops producers; drying-rack, smokehouse, windmill, net-weavers, composting-shed, lighthouse boosters), build new procedural Three.js geometry — grander/more elaborate than zone 1's equivalent, but recognizably the same role — themed to frost/ice motifs per the spec (e.g. frost-rimed nets, ice-locked driftwood, rimed kelp blades, icicle accents). Reuse `js/scene.js`'s existing helper patterns where they fit (e.g. a lathe-geometry body, cylinder-between-two-points for struts, an outline-shell trick for cartoon-style edges) by reading that file for inspiration — you may copy small helper functions like `cylinderBetween` directly into this scratch file rather than importing them (this file is throwaway and shouldn't create a dependency on `js/scene.js`'s internals).

Use the Arctic palette (`0xa9c9d6` ice-blue, plus frost-white `0xdce8ec` accents per the design spec) as the base tones, varying per archetype for visual distinction the way zone-1's archetypes already vary (e.g. `FISH_FIN_COLOR`, `CROPS_HEAD_COLOR` constants in `js/scene.js`).

- [ ] **Step 3: Manual self-check before showing the user**

Run: `npx serve -l 4173 .`, open `preview-levels-2.html`. Confirm: all 10 archetypes are present and visually distinguishable from each other at a glance (someone who knows zone 1's tile-panel icons should be able to guess which zone-2 archetype corresponds to which zone-1 role), no console errors, and the overall palette reads as a cohesive "frozen" theme.

- [ ] **Step 4: STOP — show the user and get explicit approval**

Tell the user the prototype is ready, how to view it (same `npx serve` command as every other prototype in this project), and wait for their explicit approval or requested changes. Iterate on this same file (do not create `preview-levels-2-v2.html` etc. — keep revising the one file) until they approve. **Do not start Task 7 until they say yes.**

- [ ] **Step 5: Commit the approved prototype**

```bash
git add preview-levels-2.html
git commit -m "Add approved zone-2 prop art prototype"
```

---

### Task 7: Port the approved zone-2 prop art into the real game

**Only start this task after Task 6's prototype has been explicitly approved by the user.**

**Files:**
- Create: `js/zone2-props.js`
- Modify: `js/scene.js`
- Delete: `preview-levels-2.html`

**Interfaces:**
- Consumes: the approved geometry-building code from `preview-levels-2.html` (Task 6's output — copy it, do not redesign it here; if something looks wrong once it's actually on a raft in the real game, fix the specific issue, don't re-litigate the approved design).
- Produces: `export function buildZone2Prop(propGroup, tile, level)` from `js/zone2-props.js`, dispatched from `js/scene.js`'s existing `addProp`.

- [ ] **Step 1: Create `js/zone2-props.js`**

Copy each archetype's builder function from the approved `preview-levels-2.html` into this new file, adapting only what's mechanically necessary to fit this module's shape (parameter names to match the signature below, `import * as THREE from 'three';` at the top, `export` on the entry point only). Structure it exactly like `js/scene.js`'s own dispatch pattern:

```js
import * as THREE from 'three';

// [paste each archetype's builder function here, e.g. buildFrozenFishProp,
// buildFrozenKelpProp, buildFrozenDriftwoodProp, buildFrozenCropsProp,
// buildFrozenBoosterProp — copied verbatim from the approved preview-levels-2.html]

export function buildZone2Prop(propGroup, tile, level) {
  switch (tile.family) {
    case 'fish': buildFrozenFishProp(propGroup, level); break;
    case 'kelp': buildFrozenKelpProp(propGroup, level); break;
    case 'driftwood': buildFrozenDriftwoodProp(propGroup, level); break;
    case 'crops': buildFrozenCropsProp(propGroup, level); break;
    case 'booster': buildFrozenBoosterProp(propGroup, tile.id, level); break;
  }
}
```

- [ ] **Step 2: Wire the dispatch in `js/scene.js`**

Import it: `import { buildZone2Prop } from './zone2-props.js';`

In `addProp(raftMesh, tile)`, change the family switch to branch on zone first:

```js
    if (tile.zone === 'zone2') {
      buildZone2Prop(propGroup, tile, level);
    } else {
      switch (tile.family) {
        case 'fish': buildFishProp(propGroup, level); break;
        case 'kelp': buildKelpProp(propGroup, level); break;
        case 'driftwood': buildDriftwoodProp(propGroup, level); break;
        case 'crops': buildCropsProp(propGroup, level); break;
        case 'booster': buildBoosterProp(propGroup, tile.id, level); break;
      }
    }
```

- [ ] **Step 3: Check badge-anchor heights and large-booster scaling for the new ids**

`BADGE_ANCHOR_HEIGHT` is keyed by family for producers but by specific tile `id` for boosters (check the constant near the top of `js/scene.js`). If any of the 6 zone-2 booster ids (`frozen_booster_drying_rack`, `frozen_booster_smokehouse`, `frozen_booster_windmill`, `frozen_booster_net_weavers`, `frozen_booster_composting_shed`, `frozen_booster_lighthouse`) end up visually different in height from their zone-1 counterparts, add entries for them (copy the zone-1 value as a starting point, adjust after visual verification in Step 4). Similarly check `LARGE_BOOSTER_IDS` — add the zone-2 booster ids there too if the redesigned versions should get the same extra scale treatment as their zone-1 counterparts.

- [ ] **Step 4: Manual verification against the approved prototype**

Run: `npx serve -l 4173 .`. Sail to zone 2 (or use the console `sailToZone('zone2')` call, or unlock a zone-1 border tile first) and unlock a few zone-2 tiles of different archetypes directly via the console (`state.resources.driftwood = 99999; state.resources.crops = 99999;` etc., or just call `unlockTile`/`levelUpTile` on `state` after importing them) to see their real in-game props on actual rafts. Compare against the approved `preview-levels-2.html` screenshot/session — the shipped geometry should match what was approved (same silhouettes, same palette). Check level 2 and 3 variants render correctly if the prototype included them; if it only had level 1, level 2/3 can reuse level 1's geometry with the existing `LEVEL_SCALE` scaling as a reasonable default (note this in the commit message if so). No console errors.

- [ ] **Step 5: Delete the art prototype**

```bash
rm preview-levels-2.html
```

- [ ] **Step 6: Run the full test suite one final time**

Run: `npm test`
Expected: PASS — this task touches no economy logic.

- [ ] **Step 7: Commit**

```bash
git add -A js/zone2-props.js js/scene.js
git commit -m "Port approved zone-2 prop art into the real game"
```

---

## Self-Review Notes (for whoever executes this plan)

- Every task after Task 1 depends on Task 1's `tile.zone` field and 72-tile roster existing — execute in order.
- Tasks 3 and 4 both modify `buildScene`'s return object; if executed by different subagents in sequence, Task 4's implementer should re-read the current state of `js/scene.js` (post-Task-3) rather than assuming the exact diff shown here still applies line-for-line.
- The one deliberately unverifiable-in-advance piece is Task 6's art — everything else in this plan is fully specified and should not require design judgment calls beyond the badge-anchor/scaling check called out in Task 7 Step 3.
