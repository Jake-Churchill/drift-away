# Drift Away — Zone 3 (Abyssal Trench) Design

## Overview

Adds a third zone of 36 tiles ("Abyssal Trench") east of Frozen Reach, following the exact zone architecture zone 2 established: same adjacency/discovery/leveling/prestige machinery, no new persisted-state shape, a full art redesign of all 10 prop archetypes, and a pricier/more-productive version of the same four-resource economy. Unlike zone 2, zone 3 also introduces one new mechanic — bioluminescence — so it's a genuine escalation in kind, not just in numbers.

**Theme**: a dark, bioluminescent deep-sea trench — near-black water and rafts, glowing cyan/violet accents, anglerfish/tube-worm/bone-reef silhouettes in place of zone 1/2's tropical and arctic ones.

## Goals

- Reuse the zone concept exactly as zone 2 did: zone 3 tiles are just more entries in `TILES`/`ZONES`, no special-casing in the generic economy/achievement/prestige code.
- A new mechanic exclusive to zone 3 — **bioluminescence** — that makes adjacency placement matter for the first time in the game: zone-3 producer tiles produce at half rate until a hex-adjacent zone-3 booster is unlocked, then produce at full rate.
- Zone 3 has its own visual identity: dark water/fog tint, an abyssal raft color, and redesigned (not recolored) prop geometry for all 10 archetypes.
- A cost/rate escalation at least as steep as the zone1→zone2 jump, tuned by simulation before launch rather than guessed.

## Non-Goals

- No new resource types — zone 3 still runs on fish/kelp/driftwood/crops (matches zone 2's own Non-Goal).
- No separate zone-3 currency, no changes to prestige/reset shape — one unified economy and completion gate across all three zones.
- The bioluminescence mechanic affects only zone-3 *producer* rates. It does not touch zone-1/zone-2 tiles, zone-3 boosters' own boost percentages, unlock costs, or discovery/adjacency rules — those all work exactly as they do today.
- No dynamic per-frame lighting simulation — "lit" is a discrete boolean per tile, recomputed like the existing board-tint outlines are (cheap, once a frame), not a real-time light-propagation system.
- No zone-3-exclusive achievements beyond mirroring zone 2's pattern (a "reached" and a "mastered" achievement) — see Mechanics.

## Data Model

- **`ZONES`**: append `{ id: 'zone3', name: 'Abyssal Trench', colStart: 12, colEnd: 17, raftColor: 0x232838 }` to `js/zones.js`. Columns 12–17, same 6-row range as every zone — column 11 (zone 2) / column 12 (zone 3) tiles land as hex-neighbors under the existing offset-hex math, exactly like the zone1/zone2 border, so `TILE_NEIGHBORS` needs no changes.
- **Tile roster**: mirrors zone 1/2's family split exactly — 8 fish, 8 kelp, 7 driftwood, 7 crops, 6 boosters (36 total), ids prefixed `abyssal_` to avoid collisions.
- **No new tile field.** The bioluminescence mechanic is derived entirely from `tile.zone === 'zone3'` and `tile.kind`/`tile.family` — no schema change to `TILES`.
- **Costs and rates** (first-pass, to be simulated before launch — see Testing Plan): starting proposal is the *same escalation ratio* zone 2 used over zone 1 (≈6× unlock cost, ≈4.8× production), applied again on top of zone 2's own numbers. That compounds to roughly 36× zone 1's unlock costs and 23× zone 1's production — a materially bigger jump in absolute terms than zone1→zone2 was, while keeping the game's one existing pacing rule (each zone costs proportionally more than it produces, so later zones are deliberately slower per resource spent) intact rather than inventing a second rule. This needs the same kind of quick offline-progress simulation used to tune zone 2's Batch-3 pricing before it's final.

## Mechanics

### Bioluminescence (new)

- **Two new pure functions in `js/state.js`**, alongside the existing `effectiveTileRate`/`rateBreakdown`:
  ```js
  export function isLit(tile, state) {
    if (tile.zone !== 'zone3' || tile.kind !== 'producer') return true; // only zone-3 producers are ever dim
    return (TILE_NEIGHBORS[tile.id] || []).some((id) => {
      const neighbor = TILES.find((t) => t.id === id);
      return neighbor?.zone === 'zone3' && neighbor.kind === 'booster' && state.unlocked.includes(id);
    });
  }
  const DARKNESS_PENALTY = 0.5;
  ```
  `isLit` returns `true` for every non-zone-3 or non-producer tile, so every existing call site that doesn't care about this mechanic never has to check for it.
- **One change to `effectiveTileRate`**: multiply by `isLit(tile, state) ? 1 : DARKNESS_PENALTY` as a final factor, the same way `ballastPercent` is already threaded through as a final multiplier. Because every other function (`rateBreakdown`, `unlockEta`, `applyOfflineProgress`, the HUD rate line, achievement lifetime totals) already calls through `effectiveTileRate`, they all automatically respect darkness with no other code changes — the same reasoning the original spec used for why zone 2 needed no changes to these functions at all.
- **Light source = any unlocked zone-3 booster** (all 6 archetypes, not just one dedicated "lure" tile) lights its own hex-adjacent neighbors. With only one instance of each of the 6 booster archetypes scattered across a 36-tile zone (the same density zone 1/2 already use), a single dedicated light-source tile would only ever cover ~6 of 36 tiles — using all 6 boosters as light sources gives meaningfully broader (but still incomplete and placement-dependent) coverage, so *which* boosters you unlock first, not just *that* you unlock them, matters.
- **The ex-"Lighthouse" slot becomes "Anglerfish Lure"** — same role (a modest boost split across all four resources, matching `booster_lighthouse`/`frozen_booster_lighthouse`'s shape), reskinned as the mechanic's flagship: the biggest glow of the six, and the only one that gets a real `THREE.PointLight` at its glow-orb position (a small, cheap addition — at most 6 extra point lights exist at once, one per booster archetype, realistically fewer since most players won't have all 6 unlocked immediately). The other five boosters still count toward `isLit` for gameplay purposes; they just read visually as "glowing enough to matter" via emissive materials rather than casting a literal dynamic light.
- **Visual**: a dim zone-3 producer's prop materials sit desaturated/darkened; once lit, they render at full color. This is computed once a frame from `isLit`, following the exact "build once, toggle/recolor per frame" pattern `updateBoardTint` already uses for locked-tile outlines — no new architectural pattern, just one more per-frame pass over the currently-visible zone-3 tiles.
- **Tile panel hint**: a dim producer's panel gets one hint line, in the same slot/style as the existing "you have no fish tiles yet" booster hint: *"Dim — production is halved until a Bioluminescent structure is unlocked next to it."*

### Zone discovery, fog, camera sail, achievements structure

All unchanged from zone 2's design — `isDiscovered`, the cloud field (already generic over `ZONES`, per its own header comment: *"Zones are assumed to open in ZONES order"*), and the click-to-sail camera logic in `main.js` all work for a third zone with zero code changes beyond the new `ZONES` entry and camera framing, which `buildScene`'s existing per-zone loop already computes generically (it special-cases only zone 1's exact legacy position; zone 2 and zone 3 both get an auto-derived centroid framing).

Two new achievements, mirroring `frozen-reach-discovered`/`frozen-reach-complete` exactly:

| id | name | condition | reward |
|---|---|---|---|
| `abyssal-trench-discovered` | The Abyssal Trench | first zone-3 tile unlocked | 3 |
| `abyssal-trench-complete` | Master of the Abyss | every zone-3 tile maxed | 10 |

Reward amounts sit above their zone-2 equivalents (2/8), matching the existing pattern of each zone's achievements paying a bit more than the last.

### Existing tile-count achievements need one fix

`ACHIEVEMENTS` has a fixed-threshold tier list — `[10, 25, 36, 50, 72]` — authored when 72 was the whole game. `TOTAL_TILE_COUNT` (`= TILES.length`) automatically becomes 108, and the generic ones (`halfway-there` at `ceil(TOTAL/2)`, `drift-away-complete` at full completion) already scale correctly with no changes. The one problem: **`tiles-72`'s name, "A Whole Ocean," stops being true** once 72 is only two-thirds of the game (its description already self-corrects, since it's conditional on `count === TOTAL_TILE_COUNT`, but the name is a plain string). Proposed fix, to do alongside the zone-3 tile data: rename the 72-tier to something that doesn't claim completion (e.g. "Two Seas Charted"), and add a new top tier at 108 named "A Whole Ocean" — moving that name to the tier it was always meant to describe. One-line change to the existing list, not a new system.

## Art Plan

Same process as zone 2's: **prototype-first**, all 10 archetypes rendered side by side in a throwaway scratch page (`preview-levels-3.html`) before any of it is ported into a new `js/zone3-props.js` (mirroring `zone2-props.js`'s structure and its `buildZone3Prop(propGroup, tile, level)` export, dispatched from `addProp` next to the existing zone-2 branch). Comparable in size to the zone-2 prop pass (~600 lines).

Palette: near-black abyssal rock raft (`0x232838`), deep indigo water/fog, with glowing accents in cyan (`0x35e6c8`, the primary bioluminescence color) and violet (`0x9b5de5`, secondary), plus a warm amber (`0xffb84d`) reserved for the Anglerfish Lure's glow so it reads as the "special" structure at a glance.

Archetype redesigns (same role as their zone-1/2 counterpart, same 1/2/3 level-escalation pattern already used everywhere):

| Zone-1 role | Zone-3 archetype | Concept |
|---|---|---|
| Fish producer | **Anglerfish** | Bulkier lathe body, needle teeth, a thin stalk off the head ending in a small glowing esca orb (grows/brightens with level) |
| Kelp producer | **Tube Worm Colony** | Reuses the recent flattened-blade/sine-sway kelp structure, restyled as segmented worm tubes topped with a feathery glowing plume instead of a kelp tip |
| Driftwood producer | **Bone Reef** | Reuses the log-pile structure with bone-white tapered "logs" and bulbous joint-spheres instead of wood grain; a glowing lure-orb or two rests in the pile at level 3 |
| Crops producer | **Vent Garden** | Reuses the recent radial wheat-stalk cluster, restyled as pale stalks capped with glowing bulbous fungal caps, with a small vent-bubble puff at the center (reusing the smokehouse's existing puff-particle technique) |
| Drying Rack | **Bone Rack** | Same post-and-crossbar structure, hanging glowing lure-orbs instead of fillets |
| Smokehouse | **Vent Chimney** | Same cabin+chimney+puff structure, re-themed as a mineral chimney venting glowing cyan/violet particulate instead of grey smoke |
| Windmill | **Current Turbine** | Same lattice-tower-plus-spinning-blades structure, glowing blade tips |
| Net Weavers | **Filter Web** | A radial strut web (reusing `cylinderBetween`) catching tiny glowing plankton-mote spheres |
| Composting Shed | **Ossuary** | Same shed-and-roof structure, bone-and-coral hut with glowing fungal growth on the roof |
| Lighthouse | **Anglerfish Lure** | Tall stalk topped with a large glowing orb — the mechanic's flagship, the one archetype with a real `THREE.PointLight` |

## UI/UX Flow

Identical to zone 2's (unlock a border tile → discover → sail → unlock/level as normal), with one addition: from the moment zone 3 is discovered, its producer tiles visibly sit dim until a nearby booster is unlocked, giving an immediate, legible reason to prioritize boosters early in this zone specifically — a deliberate contrast with zone 1/2, where booster order never mattered.

## Testing Plan

- Pure economy math: `isLit` and the darkness multiplier get direct unit tests in the same Node/`assert` style as the rest of `tests/economy.test.mjs` — a zone-3 producer with no adjacent unlocked booster reads the darkness-penalized rate; unlocking an adjacent booster flips it to full rate; a zone-1/zone-2 tile and a zone-3 booster are both unaffected regardless of neighbors.
- The two new achievements get the same idempotency/false-positive tests zone 2's did.
- The `tiles-72`/new `tiles-108` rename gets a small assertion that the achievement fired at 72 no longer claims "all" and that the new 108-tier does.
- Extend the existing generic 108-tile assertions the same way zone 2's design extended the 72-tile ones.
- Camera sail, cloud cover, and the new prop geometry stay manual-verification-only, per this project's established convention — plus one new manual check specific to this zone: an unlocked zone-3 producer with no adjacent booster visibly reads as dim, and unlocking an adjacent booster visibly brightens it without a page reload.
