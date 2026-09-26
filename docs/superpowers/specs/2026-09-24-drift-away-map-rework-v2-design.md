# Map Rework v2.0 — Design Spec

## Overview

A full rebuild of the hex map, shipping as v2.0. The four existing zones (Home Waters, Frozen
Reach, Abyssal Trench, Timberline Coast) are rebuilt from scratch under a new set of rules:

- The fixed 6x6-per-zone grid is gone. Each zone is now a **biome** — a hand-authored, irregularly
  shaped blob of hexes, not a rectangle.
- Producers and boosters are no longer single hexes. Each one is an **atomic 3-hex triangle
  cluster** — one purchase, one level, three hex cells, reusing today's exact prop art three times
  over instead of new art.
- A new **blank tile** kind is introduced: produces nothing, exists purely to physically bridge
  between clusters and between biomes. Flat-priced per zone rather than hand-tuned per tile.
- Biomes are placed on a **compass rule** (a hand-authored directional convention, not a
  procedural algorithm) that future biomes will keep following.
- Zone 3 and zone 4's identities swap: **Abyssal Trench becomes zone 4** (the capstone/last zone),
  **Timberline Coast becomes zone 3**.
- Existing saves are incompatible. This is a hard reset — there is no migration path.

This spec is the product of an extended brainstorming session; every decision below was a direct
answer to a clarifying question, not an assumption. Where an exact number is left open, that's
implementation-time tuning, not an unresolved design question.

## Goals

- Remove the fixed 6x6/144-tile structure so future biomes aren't bound to it.
- Make producers/boosters read as physically bigger, more substantial map objects, using existing
  art (no new textures or prop geometry).
- Give the map real geography: biomes occupy compass directions relative to zone 1, and one biome
  (Abyssal Trench) is a genuine two-part capstone — geographically gated behind another zone and
  economically dependent on a third zone's output.
- Establish a durable compass convention so a fifth biome (and beyond) can be added later without
  a fresh design conversation about where it goes.

## Non-Goals

- No new biomes beyond the existing four in this update. This update rebuilds what exists and
  ships the system; a fifth+ biome is future work that follows the compass rule established here.
- No procedural map generation. Every hex is hand-placed data, exactly like today.
- No player-chosen tile placement — same "unlock the next pre-defined slot" model as today.
- No save migration. Old saves are detected and discarded; the player starts fresh.
- No deep economy rebalancing beyond what's specified below. Production numbers for zones 1-3 are
  unchanged; only unlock-cost formulas and map shape change.

## Data model

`gridPos: {row, col}` is removed from every tile. It's replaced by `cells`, an array of
`{row, col}` hex coordinates:

```js
// Blank tile — one cell
{ id: 'homewaters_blank_3', name: 'Open Water', kind: 'blank', family: null, produces: null,
  rate: null, boosts: null, cells: [{ row: 2, col: -1 }],
  unlock: { type: 'cost', cost: { driftwood: 30 } }, zone: 'zone1' }

// Producer cluster — three mutually-adjacent cells
{ id: 'fish_start', name: 'Fishing Raft', kind: 'producer', family: 'fish', produces: 'fish',
  rate: 1, boosts: null,
  cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }],
  unlock: { type: 'cost', cost: { driftwood: 50, crops: 40 } }, zone: 'zone1' }
```

`kind` gains a fourth value: `'blank'`, alongside today's `'producer'`, `'booster'`, `'generator'`.
Every other field (`family`, `produces`, `rate`, `boosts`, `consumes`, `unlock`, `zone`) keeps its
current meaning and shape — only the position field changes, and only in how many cells it lists.

**Cluster validity rule:** a producer/booster/generator's `cells` array must contain exactly 3 hex
coordinates that are pairwise mutually adjacent under the existing neighbor-delta rule in
`neighborGridPositions` (`js/tiles.js`) — i.e. each of the 3 cells must be a hex-neighbor of the
other 2, forming a triangle. This is not a single fixed offset pattern; any rotation/mirror of the
triangle is valid, chosen per-tile during authoring to pack well against its neighbors in the
biome's blob shape. A test should validate this for every non-blank tile in `TILES`.

## Adjacency & discovery

`TILE_NEIGHBORS` generalizes from "neighbors of one cell" to "the union of hex-neighbors of all of
a tile's cells, excluding cells that belong to the tile itself." `isDiscovered` is unchanged in
spirit: a tile is discovered the instant any of its cells borders any cell belonging to an
unlocked tile. Clicking any of a tile's cells opens the same single tile panel it does today.

`tileIdByPosition` (the `"row,col"` string → tile id lookup) now needs one entry per cell rather
than one entry per tile — a 3-cell cluster registers 3 map entries all pointing at the same tile
id. Click-resolution in `main.js` (currently `TILES.find` by exact `gridPos` match) becomes a
lookup through this map instead of a linear scan, which is both correct for multi-cell tiles and
faster.

## Map layout & compass rule

| Zone | Name | Position | Reachability |
|------|------|----------|--------------|
| 1 | Home Waters | Center / origin | Start |
| 2 | Frozen Reach | North of zone 1 | Direct from zone 1 |
| 3 | Timberline Coast | West of zone 1 | Direct from zone 1 |
| 4 | Abyssal Trench | East of zone 2 | Only via Frozen Reach's eastern edge |

South remains open for a future biome. **The compass rule for any biome added later:** pick a
compass direction (or a direction relative to an existing biome, as zone 4 does here) based on the
biome's theme, place it as a hand-authored blob bordering that direction, and connect it via blank
tiles the same way every biome here connects to its neighbor. This is a hand-authored convention,
not a computed/procedural placement.

Each biome connects to its neighbor(s) via its own blank-tile border — there is no rigid
column-shift mirroring the way zones 1→2→3 work today. Zone 1, Frozen Reach, and Timberline are
each reachable directly off zone 1 (parallel, not a chain). **Abyssal Trench is the one exception:
its blank-tile border connects only to Frozen Reach's eastern edge, not to zone 1.** Under the
existing discovery rule, this means Abyssal Trench tiles are not even visible until a player has
unlocked through Frozen Reach's east side — a real geographic gate, not just an economic one. This
was confirmed explicitly, not inferred.

**Zone identity swap:** this is a from-scratch rebuild (hard reset, all-new tile data), so there is
no migration step to describe — Timberline Coast's tiles are simply authored with `zone: 'zone3'`
and Abyssal Trench's with `zone: 'zone4'` from the start. `zones.js`'s `raftColor` field (see
below) is what actually matters at runtime; `colStart`/`colEnd` should be removed rather than kept
as dead documentation now that biome shapes aren't rectangles (see Cleanup below).

## Tile taxonomy & production

**Unchanged from today:**
- Zone 1 (Home Waters) and Zone 2 (Frozen Reach): production and unlock costs unchanged. Same
  hand-tuned base-4-resource (fish/kelp/driftwood/crops) costs as today, just spent on 3-hex
  clusters instead of single hexes.
- Zone 3 (Timberline Coast, formerly zone 4): production mechanic is completely unchanged — its
  `kind: 'generator'` tiles still consume base-4 resources via `consumes` to produce
  planks/kelp_rope/bread at the same rates as today.
- Zone 4 (Abyssal Trench, formerly zone 3): production is completely unchanged — `kind: 'producer'`
  tiles still mirror the base-4 resources (fish/kelp/driftwood/crops) at their current high rate.

**Changed — unlock costs only:**
- **Timberline Coast (zone 3):** drops the distance-from-zone-1 ring formula (today's rings 1-3
  cost base-4 resources, rings 4-6 cost the tile's own goods). Every Timberline tile instead gets a
  hand-tuned base-4-resource unlock cost, following the same authoring pattern zones 1/2 already
  use (progressively pricier deeper into the biome). No Timberline tile costs planks/kelp_rope/
  bread to unlock anymore. Exact numbers are implementation-time authoring, following
  `tile-design.md`'s existing multiplier conventions.
- **Abyssal Trench (zone 4):** keeps its exact current base-4-resource unlock cost unchanged, and
  adds `planks` and `kelp_rope` as additional required cost keys on every tile — e.g. a tile that
  costs `{ driftwood: 405000, crops: 324000 }` today costs
  `{ driftwood: 405000, crops: 324000, planks: <new>, kelp_rope: <new> }` after the rework. New
  amounts are implementation-time tuning, scaled against Timberline's actual planks/kelp_rope
  output rate so the requirement is a real but achievable ask. Bread is deliberately excluded —
  only planks and kelp_rope are required.

## Blank tiles

Flat-priced per zone — every blank tile within a given zone shares one identical unlock-cost
object (not hand-tuned per tile, unlike producers/boosters):

- **Zone 1:** driftwood only, one flat amount.
- **Zone 2 & Zone 3 (Frozen Reach, Timberline):** a flat mix of zone 1's base-4 resources
  (fish/kelp/driftwood/crops) — the "zone-1 toll." This is the universal rule: expanding into
  either of these biomes requires a developed zone-1 economy, not local production. Zone 3's flat
  cost should be priced higher than zone 2's, following the existing escalating-cost convention
  between zones.
- **Zone 4 (Abyssal Trench):** the one exception to the zone-1 toll — a flat
  `{ planks: <amount>, kelp_rope: <amount> }` cost, matching Abyssal's own tile-unlock currency so
  the whole biome is internally consistent. Priced higher than zone 3's blank cost.

Blank tiles are ordinary `TILES` entries (`kind: 'blank'`, `produces: null`, `boosts: null`,
`family: null`) and need no new subsystem — they flow through the existing `unlocked` array,
`isDiscovered`/`isEligible`, and tile-panel click UI unchanged.

## Visuals: biome color-coding

Strengthen the existing per-zone `raftColor` tint (`zones.js`, already applied to zone hex meshes
at runtime per `architecture-notes.md`) so each biome's unlocked tiles are obviously,
unmistakably distinct by color at a glance — not the current subtle tint. No outline changes, no
UI/resource-icon changes; this is a material-tint intensity change on the existing raft mesh only.

## Achievements & completion tracking

The hardcoded tile-count achievement tiers (`js/state.js`'s `[10, 25, 36, 50, 72, 108, 144]`,
chosen to land exactly on "one/two/three/four zones complete") no longer mean anything once biome
sizes change from the fixed 36-per-zone rule. Replace with percentage-of-total tiers (e.g.
25%/50%/75%/100% of `TOTAL_TILE_COUNT`, which already self-derives from `TILES.length` and needs
no change itself) so they keep working regardless of exact biome size, including if a 5th biome is
added later.

Blank tiles have no rate to level up, so they count as "maxed" the instant they're unlocked — the
existing `completionCount`/`isFullyComplete` logic (`unlocked && level >= MAX_LEVEL`) keeps working
unchanged as long as `getLevel` treats a blank tile's level as always at `MAX_LEVEL`.

## Rendering follow-ons

- `js/scene.js`'s `GRID_ROWS`/`GRID_COLS = 6` constants, currently used only to center the whole
  board (`gridBounds()`), become computed from the actual authored map's cell extents
  (min/max row and col across every tile's `cells`) instead of a hardcoded 6x6 assumption.
- `main.js`'s click-to-tile lookup moves from a `TILES.find` linear scan by exact `gridPos` to a
  lookup through the generalized `tileIdByPosition` map (see Adjacency & discovery above).
- Prop rendering (`addProp` in `scene.js`, and the zone2/3/4-props.js dispatch-by-family builders)
  needs no changes to the builder functions themselves — only the call site changes, from "call
  once per tile" to "call once per cell in the tile's `cells` array," so each occupied hex gets its
  own instance of the same existing prop.
- `js/clouds.js`'s sail-edge list (added for zone 4's parallel-reachability, currently
  `[zone1↔2, zone2↔3, zone1↔4]`) needs updating to the new connectivity graph:
  `[zone1↔2, zone1↔3, zone2↔4]` — matching the compass table above, not the old zone numbering.

## Save compatibility

Hard reset. On load, detect that the save doesn't match the new tile-id set (or bump a save-format
version marker) and start a fresh game on the new map — no carry-over of resources, unlocks,
levels, or prestige state. This matches a real v2.0, not an in-place migration.

## Testing implications

The existing test suite hard-asserts the old fixed structure in several places that will need
rewriting once concrete map data exists (not decided by this spec — these are pointers for the
implementation plan, not design decisions):

- `TILES.length === 144` and the per-zone `=== 36` counts need updating to whatever the new
  hand-authored totals turn out to be.
- The zone1→zone2 "mirror at exactly col+6" geometric assertion no longer applies — biome shapes
  are hand-blobbed, not column-shifted rectangles. Replace with a structural assertion instead
  (same family/kind counts as zone 1, same cost-ratio convention) if mirroring is still intended
  in spirit.
- The achievement tier test keyed `{10, 25, 36, 50, 72, 108, 144}` needs updating to the new
  percentage-based tiers.

New tests this rework specifically needs:
- Every non-blank tile's `cells` array is exactly 3 mutually-adjacent hex coordinates.
- Every blank tile within a zone shares an identical unlock-cost object.
- Abyssal Trench tiles' unlock costs include `planks` and `kelp_rope` in addition to their base-4
  cost.
- Timberline Coast tiles' unlock costs contain only base-4 resources (no self-referential goods).
- Abyssal Trench has no cell bordering any zone-1 cell (only Frozen Reach) — a geometry check that
  the two-part gate is actually enforced by the authored map, not just intended.

## Cleanup

- Remove `zones.js`'s dead `colStart`/`colEnd` fields — already unread by any runtime code today,
  and actively misleading once biomes aren't rectangles.

## Addendum: decisions made while planning the implementation

Written after prototyping the whole change in a scratch copy of the repo (all tests green, checked
in a browser), so these are things learned from building it, not new requests.

**Scale correction.** The design discussion said "roughly 2-3x today's 144 hexes". That was wrong:
every one of the 144 clusters is 3 hexes (432) before a single blank is added. The real map is
**321 tiles covering 609 hexes** (144 clusters + 177 blanks): about 4.2x the hexes, but only 2.2x the
purchases. It spans roughly 185 x 120 world units, so a fixed camera can no longer show a biome
(see Camera).

**Layout scheme (concrete).**
- Clusters sit on a spacing-3 lattice of "slots". Every cluster is the same "up" triangle (anchor,
  its east neighbour, its south-east neighbour). Neighbouring slots are exactly two hexes apart, so
  exactly one hex touches both: that hex is the bridge.
- A biome is a seeded, compact-but-ragged blob of 36 slots. Tiles are assigned to slots by their
  old distance from the biome's entry, so cheap tiles stay near the way in.
- Within a biome, blanks are a shortest-path tree from the entry slot plus 6 extra loop edges.
  Between biomes, a corridor of blanks (4, 4 and 5 hexes) joins the parent biome's nearest slot to
  the child's entry slot.
- Biome centres in slot coordinates: Home Waters (0,0), Frozen Reach (4,-8) north, Timberline
  (-8,0) west, Abyssal Trench (12,-8) east of Frozen Reach. Result: zone counts of 41/45/45/46
  blanks, no two clusters ever touch, everything reachable from the start, and the Abyssal Trench
  reachable only through Frozen Reach.
- The layout is produced by a one-shot codemod (deterministic, seeded) whose output is committed as
  ordinary literal data in `js/tiles.js`. There is no procedural generation at runtime.

**Costs (first-pass, unsimulated, like every earlier zone's).**
- Blank bridges: Home Waters `{driftwood: 12}`; Frozen Reach `{driftwood: 1200, crops: 800}`;
  Timberline `{driftwood: 1800, crops: 1200, kelp: 900}`; Abyssal `{planks: 60, kelp_rope: 40}`.
- Timberline clusters: rings 1-3 keep their base-resource costs. Rings 4-6 (formerly priced in
  planks/kelp_rope/bread) continue the same curve in base resources instead.
- Abyssal clusters: cost-gated ones keep their base costs and add
  `planks = total / 1500` and `kelp_rope = 0.7 x planks` (each rounded to 2 significant digits, where
  `total` is the sum of the base costs). **Milestone-gated Abyssal
  clusters stay milestone-only** (a milestone has no cost to add to); the trench is still gated by
  the planks and kelp_rope its blanks and other clusters need.

**Rules that changed shape.**
- Bioluminescence ("a booster next to it") means within two hexes, since two clusters are never
  adjacent: touching, or one bridge apart.
- Blank tiles are "maxed" from the moment they are unlocked (`getLevel`), so completion counting and
  the upgrade list need no special cases.
- A head start grants N clusters plus whatever blanks are needed to reach them, free.
- Achievement tile-count tiers are percentages of the map: 5/10/25/40/50/75/100% (same seven
  names and rewards as before, so the achievement count and gold total are unchanged).

**Camera (not in the original spec, but the map is unplayable without it).** Drag to pan, wheel
and on-screen +/- buttons to zoom (frustum half-height 7 to 26 world units), clamped to the map.
Clicking a tile in another zone no longer sails the camera there; the "next unlock" shortcut glides
the camera to the tile. The sun follows the camera target and the fog scales with zoom, so shadows
and fade stay correct everywhere. Zone framings and the sail animation are gone.

**Performance.** Measured before/after in the prototype: membership checks on `state.unlocked` were
24 ms per frame at full unlock on the new map (5.8 ms on today's), now about 1.2 ms (a cached
`Set`). The scene held 93,000 nodes because every tile's props at all three levels were built up
front; props are now built when a tile is first shown at a level, and their matrices are frozen
(they never move on their own).

**Saves.** New storage key `driftaway_save_v2` and `state.version = 2`; a v1 save (or a pasted v1
code) is ignored, and the old save is left untouched in storage rather than erased.

**Visuals.** Biome raft colours: Home Waters `0xd9a441`, Frozen Reach `0x7cc8ee`, Timberline
`0x4f9a4c`, Abyssal `0x4a3aa8`. Blank bridges use their zone's colour 22% paler and carry no prop.

**Renamed modules.** `js/zone3-props.js` -> `js/abyssal-props.js` (`buildAbyssalProp`) and
`js/zone4-props.js` -> `js/timberline-props.js` (`buildTimberlineProp`), so file names match the
swapped zone numbers. Tile ids are unchanged.
