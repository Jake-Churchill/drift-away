# Zone 4: Timberline Coast — Design Spec

Written after implementation (matching the numbers actually shipped), so this doc stays accurate
rather than drifting the way zone 3's did.

## Overview

Zone 4 is the game's fourth zone and its first that isn't a straightforward reskin-and-scale of
the previous one. It sits **north of zone 1** (rows -6..-1, same columns 0-5 as zone 1) rather
than extending the zone1→zone2→zone3 eastward chain, and it introduces the game's second
non-cosmetic zone-specific mechanic: **generators**, tiles that consume existing resources to
make a new one, instead of producing from nothing like every other tile in the game.

## Goals

- A zone reachable in parallel with zone 2/3, not gated behind them — its entry tiles cost
  zone-1-level amounts of the base 4 resources.
- Cost/difficulty scales with distance from zone 1, not a single flat per-zone multiplier.
- A genuinely different building block (conversion, not raw harvesting) that creates real
  resource-spending tension with the rest of the game.

## Non-Goals

- Deep balance tuning. Every number here is first-pass, unsimulated, same caveat as zone 2/3's
  own early multipliers (which needed correction after the fact). Baron/magnate achievement
  targets (25,000/100,000 lifetime) are the same generic thresholds every resource gets — not
  retuned for how fast planks/kelp_rope/bread actually accumulate.

## Spatial layout

Zone 4 occupies the same 6x6 hex shape as every other zone, at `gridPos.row` -6 through -1 and
`col` 0-5. The hex-adjacency math (`neighborGridPositions` in `js/tiles.js`) works on raw
row/col deltas already, so this needed no changes there — row -1 tiles are automatically
hex-neighbors of zone 1's row-0 tiles, exactly like zone 2 borders zone 1 across a column edge.

**Bug found and fixed along the way:** `js/scene.js`'s `hexLocalPosition` computed the odd-row
hex offset with `row % 2 === 1`, which is wrong for negative rows — JavaScript's `%` keeps the
sign of the dividend, so `-1 % 2` is `-1`, not `1`. Every odd-numbered zone-4 row (-1, -3, -5)
was rendering at the wrong horizontal offset, confirmed by an independent geometry-based
adjacency cross-check in `tests/economy.test.mjs` disagreeing with `TILE_NEIGHBORS`. Fixed by
checking `row % 2 !== 0` instead. `js/tiles.js`'s own neighbor-delta formula (`row % 2 === 0`)
happened to already be correct, since equality to exactly zero is sign-independent.

Water bounds, fog, and the cloud field were already fully generic over tile position (derived
from real `TILES` data, not a hardcoded per-zone constant — see the water-coverage fix from
earlier this project), so none of them needed changes for the new direction. The one exception:
`js/clouds.js`'s "which ground points can ever be on screen during a sail" sampling assumed
zones open in `ZONES` array order (each bordering the previous one) — true for zone1→2→3, but
zone 4 borders zone 1 directly, and the "next unlock" HUD shortcut can sail straight from any
discovered zone to any other. Fixed by passing explicit sail edges (`[zone1↔2, zone2↔3, zone1↔4]`)
instead of assuming a linear chain.

**Known accepted limitation:** the separate "stage contour" ring precompute in `clouds.js` (used
for puff density/placement, not for what's actually revealed at runtime — that's driven by each
puff's own `clearedBy` check against real unlocked-zone membership) still assumes zones open in
array order for its ring positions. If a player unlocks zone 4 before zone 3, that intermediate
shape isn't specifically pre-computed, which could mean cloud puffs pack slightly less densely
at that specific boundary. This does not affect what's actually revealed — only ring density —
so it was left as-is given the risk/reward of touching that code further.

## The generator mechanic

A generator (`kind: 'generator'`) has both a `produces` resource (like a producer) and a
`consumes: { resource: ratePerSecond, ... }` map (new). Each tick, after the base-4 resources
produce as usual, `applyGenerators` (`js/state.js`) runs:

1. For each distinct input resource any unlocked generator consumes, sum every such generator's
   full (unthrottled) desired draw for that resource this tick.
2. That resource's scarcity factor = `min(1, currently-in-stock / total desired)`.
3. Each generator's own throttle = the minimum scarcity factor across *its own* inputs (a
   generator with two inputs is capped by whichever is scarcer).
4. Output and every input's consumption are scaled by that generator's throttle.

This means several generators competing for the same scarce input are throttled by the same
fraction — not first-come-first-served — and the pool never goes negative.

**Known first-pass simplification:** a multi-input generator draws its own full share of a
*non*-limiting input, even though its throttled output didn't need that much. E.g. if kelp is
scarce but driftwood is abundant, a Ropewalk still draws driftwood at its full un-throttled rate
while producing kelp rope at the kelp-limited (lower) rate. A fully "fair" allocation would need
to solve for consistent per-generator throttles across all resources simultaneously, which is
circular (a generator's throttle depends on global demand, which depends on every generator's
throttle). Given every other numeric part of this zone is already first-pass, this was accepted
rather than solved exactly — see `tests/economy.test.mjs`'s "zone 4 generator tests" for the
exact behavior this produces.

Leveling up a generator costs its own output resource, the same convention as a producer
(`levelUpCost` in `js/state.js` now treats `kind: 'producer' | 'generator'` identically). Level
and boosts scale a generator's output *and* its consumption by the same multiplier — an upgraded
sawmill makes more planks but also eats more driftwood, preserving the conversion ratio.

## The three new resources

Recipes (the two the user specified verbatim; kelp rope's recipe is this session's own call):

| Family | Produces | Consumes | Archetype |
|---|---|---|---|
| `planks` | planks | driftwood | Sawmill |
| `kelp_rope` | kelp_rope | kelp + driftwood | Ropeworks |
| `bread` | bread | crops + driftwood | Bakehouse |

Driftwood is the shared input across all three chains, deliberately — it becomes zone 4's real
bottleneck, in tension with spending it on more zone1-3 unlocks.

**Same rules as the base 4 (updated from the original design):** `planks`/`kelp_rope`/`bread`
(exported as `GOODS` in `js/state.js`) live in the same `state.resources`/`state.lifetime`
objects as the base 4, and are now folded directly into the `RESOURCES` array itself. All the
existing generic cost/eligibility/level-up machinery — `isEligible`, `unlockTile`, `levelUpCost`,
`unlockEta` — already worked on them with no changes, since it keys off `state.resources`
generically rather than the `RESOURCES` list. They reset to 0 on prestige the same way everything
else does (via `createInitialState()`).

Originally shipped as a deliberately separate layer — no prestige row, no lifetime achievements,
no HUD bar slot, shown only in their own small strip once zone 4 was discovered — and changed on
request shortly after to give them full parity: a main HUD bar slot with a rate line from the
start, a prestige upgrade row (`createInitialPrestige`'s `upgrades` object now has all 7 keys), and
baron/magnate lifetime achievements (`for (const resource of RESOURCES)` already generated those
generically, so this fell out for free once `RESOURCES` included them). Two things had to change
to make that correct rather than just cosmetic:
- `rateBreakdown`'s generator branch was overstating the HUD rate (it used unthrottled capacity,
  fine for an internal idle-check but wrong once shown as the literal "+X/s" number) — fixed to
  use the actual scarcity-throttled rate.
- `boosterIsIdle` depended on that same `rateBreakdown` base, so throttling it correctly would
  have made every freshly-unlocked, not-yet-fed generator's booster look idle again. Decoupled
  into its own existence check (does an unlocked producer/generator for this resource exist at
  all), independent of its current rate.

`resourceLabel`/`resourceTitle` (in both `state.js` and `ui.js`, small enough to duplicate rather
than share) turn `kelp_rope` into `kelp rope`/`Kelp Rope` for achievement names/descriptions, the
hover tooltip, and cost/hint text — the one multi-word resource name in the game.

## Tile roster (36 tiles: 10 + 10 + 10 generators, 6 boosters)

Generated by a script (matching the zone 2/3 precedent) rather than hand-authored, from a
per-ring cost/rate curve — `ring = -row` (1 = bordering zone 1, 6 = farthest):

- Rings 1-3: unlock cost in the base 4 resources, `4^(ring-1)`× a ring-1 baseline.
- Rings 4-6: unlock cost shifts to the generator's own output resource (planks/kelp_rope/bread),
  `4^(ring-4)`× a ring-4 baseline — the bootstrap loop: cheap early tiles fund the generators
  that pay for the expensive deep ones.
- Rate (and consumption, at a fixed ratio) scales `1.6^(ring-1)`×.

Family placement across the 6 rings is fixed per-ring (see `RING_MIX`/`COLUMN_ORDERS` in the
generation script, kept in the project's scratchpad, not the repo) so families interleave rather
than cluster, and each family's 10 members roughly track ring order (index 0 near, index 9 far)
so a tile's name and its actual cost stay in sync.

Boosters (6, mirroring zone 1-3's shape scaled to 3 resources instead of 4): 3 single-resource
(Tool Shed/planks, Drying Frames/kelp_rope, Grain Silo/bread, all +25%), 2 dual (Timber Yard:
planks+kelp_rope, Provision Store: kelp_rope+bread, both +20% each), 1 all-three flagship
(Millhouse, +15% each).

## Art

`js/zone4-props.js`: three generator archetypes (Sawmill, Ropeworks, Bakehouse) and six booster
archetypes, ported from an approved Three.js prototype (theme: "Timberline Coast" — weathered
cedar-brown raft, warm oven-fire accents, matching the game's real global sky/fog palette rather
than a lighter placeholder). Unlike zone 3, there's no per-tile dim/lit mechanic here, so no
`track()`/runtime material-swap system was needed — geometry is built once in its final look.
`level` is accepted in the builder signature for consistency with `buildZone2Prop`/
`buildZone3Prop` but unused: the shared per-level scale-up and badge in `scene.js`'s `addProp`
already carry level-up feedback, the same way zone 1's original archetypes did before any zone
needed its own per-level detail.

## Achievements

`timberline-coast-discovered` (+3, first zone-4 tile) and `timberline-coast-complete` (+10, every
zone-4 tile maxed), matching the zone2/zone3 pair shape. The tile-count tier list gained a new
144 entry ("The Whole Map", +6) and the old 108 entry was renamed from "A Whole Ocean" to "Three
Seas Charted" (it's no longer the true total, and "ocean" no longer fits now that a land zone
exists) — same rename pattern zone 3 applied to zone 2's own 72-tile tier. Once `GOODS` joined
`RESOURCES` (see above), the existing generic baron/magnate loop also generated 6 more
achievements (Planks/Kelp Rope/Bread Baron/Magnate) with no code change of its own — 39
achievements in all, ~137 gold available, up from 33/~122 right after the zone shipped.

## Testing

TDD block in `tests/economy.test.mjs` ("Generators (zone 4)") covers: full-rate output, single-
generator scarcity throttling, two generators fairly sharing a scarce input, a multi-input
generator capped by its scarcer input (and the documented over-draw of its non-limiting input),
generator level-up cost, and the `boosterIsIdle`/`rateBreakdown` fix (see below). The existing
suite's cascading fallout (tile counts, family counts, achievement counts/gold totals, the
`fish_start` adjacency list gaining zone-4 neighbors, the halfway-there/tiles-72 coincidence at
the new 144 total, head start now legitimately reaching into zone 4) was fixed the same way
zone 3's own tile-count jump was.

**Bug found via this implementation, fixed in `rateBreakdown`:** it only summed `kind ===
'producer'` tiles into a resource's `base`, so `boosterIsIdle` (and the free head-start grant's
idle-skip filter) would have permanently reported every zone-4 booster as idle — even with
several generators running — since nothing a booster boosts would ever register as "producing"
it. Fixed by having `rateBreakdown` also sum unthrottled generator output into `base`.
