# Drift Away — Multi-Level Expansion Design

## Overview

Adds a second zone of 36 tiles ("Frozen Reach") east of the existing grid, and establishes a reusable zone architecture so future zones follow the same pattern. Zone 2 sits behind a persistent atmospheric fog bank until explored, uses a much pricier/more productive version of the same four-resource economy, and gets its own Arctic-themed redesign of all 10 tile-prop archetypes. A new camera-sail control (two fixed camera positions, animated transition) lets the player travel between zones.

**Reference implementation**: `preview-camera-sail.html` at the repo root (a throwaway scratch prototype, not part of the build) is the validated, live-tested implementation of the camera-sail tween, click-to-sail hit-testing, and the cloud-cover visual — including its final tuned values (colors, position offsets, scale, fade curve). It went through several rounds of user feedback directly in-browser. The implementation plan should treat its logic and constants as the starting point to port into `js/scene.js`/`js/render.js`/`js/main.js`, not something to re-derive from this prose description alone — the prose here explains the *why*, the prototype file has the exact *what*. Delete the prototype file once its logic has been ported into the real game files.

## Goals

- Add zone 2 as a concrete instance of a general "zone" concept that zone 3+ can reuse without new architecture.
- Reuse the existing adjacency, discovery, completion, and prestige machinery with zero special-casing — zone 2 tiles are just more entries in `TILES`.
- New camera-sail navigation: fixed positions per zone, animated tween, player-triggered via a dedicated control.
- Zone 2 has its own visual identity: a cloud cover shadowing it before discovery that clears as it's explored, an Arctic color palette, and redesigned (not just recolored) per-archetype prop geometry.
- Zone-2 tiles use the same 4 resources, priced far higher and producing/boosting proportionally higher, as a genuine late-game upgrade layer rather than a pure cost sink.

## Non-Goals

- No new resource types — zone 2 still runs on fish/kelp/driftwood/crops.
- No free-roam camera (pan/zoom/orbit) — just two fixed positions with an animated tween between them.
- No changes to the existing 8 achievements' conditions — they already scale automatically (`TOTAL_TILE_COUNT`, `completionCount`, `isFullyComplete` are all generic over however many tiles exist). Zone 2 adds exactly two new achievements (see Mechanics below), not a broader achievement expansion.
- No separate zone-2 currency or separate prestige track — one unified economy, one unified prestige/full-completion gate covering both zones.
- No procedural/infinite zone generation — each zone is hand-authored tile data, same as zone 1 is today.

## Data Model

- **`ZONES` config** (new — either a new `js/zones.js` or a section of `js/tiles.js`): an array of `{ id, name, colStart, colEnd, palette, waterTint }`. Zone 1's entry documents today's implicit bounds (`colStart: 0, colEnd: 5`); zone 2 is `{ id: 'zone2', name: 'Frozen Reach', colStart: 6, colEnd: 11, palette: {...}, waterTint: {...} }`. Starting palette (approved during brainstorming, refinable during the art prototype step below): raft base `#a9c9d6` (ice-blue) with `#dce8ec` (frost-white) accents, water tint around the zone shifting toward `#5b7c8a`.
- **`tile.zone` field**: every entry in `TILES` gains `zone: 'zone1'` or `zone: 'zone2'`.
- **Grid placement**: zone-2 tiles occupy the *same* row/col coordinate space as zone 1, at columns 6–11 (zone 1 is columns 0–5), same 6-row range. This is deliberate: it means `neighborGridPositions`/`TILE_NEIGHBORS` (in `js/tiles.js`) keep working completely unchanged — several zone-1 column-5 tiles and zone-2 column-6 tiles land as hex-neighbors under the existing offset-hex math, and those pairs become the discovery border.
- **Zone-2 tile roster**: mirrors zone 1's family split exactly — 8 fish, 8 kelp, 7 driftwood, 7 crops, 6 boosters (36 total), with new ids/names (e.g. a `frozen_`/`_ii` naming convention to avoid collisions with zone-1 ids, exact names authored during implementation).
- **Costs and rates** (first-pass constants, not playtested, matching this codebase's existing convention e.g. `PRESTIGE_TOKEN_DIVISOR`): unlock/level-up costs roughly **15–20×** zone-1's equivalents; production rates and booster percentages roughly **3–5×** zone-1's equivalents. Same 1/2/3 leveling system and `levelMultiplier` math as zone 1 — just bigger base numbers.

## Mechanics

### Zone discovery & fog

No new persisted state. `isDiscovered`, `isEligible`, and `unlockTile` in `js/state.js` already operate generically over `TILE_NEIGHBORS` — zone-2 tiles discover exactly like any other tile does today, once a hex-adjacent zone-1 tile is unlocked.

One new derived helper, e.g. `isZoneDiscovered(state, zoneId)` in `js/state.js`, returning whether any tile in that zone is currently discovered:

```js
export function isZoneDiscovered(state, zoneId) {
  return TILES.some((t) => t.zone === zoneId && isDiscovered(t, state));
}
```

This drives whether zone-2 tiles are clickable-to-sail at all (see Camera sail below), and also gates the first of the two new achievements below.

### Zone-2 achievements

Two new entries in `ACHIEVEMENTS` (`js/state.js`), following the exact shape every existing entry already uses (`{ id, name, description, reward, condition }`), checked by the same `checkAchievements` that already runs after every `tick`/`unlockTile`/`levelUpTile`/`applyOfflineProgress` — no new call sites needed, just two more list entries:

| id | name | description | reward | condition |
|---|---|---|---|---|
| `frozen-reach-discovered` | Frozen Reach | Unlock your first tile in the Frozen Reach | 2 | `state.unlocked.some((id) => TILES.find((t) => t.id === id)?.zone === 'zone2')` |
| `frozen-reach-complete` | Master of the Frozen Reach | Max out every tile in the Frozen Reach | 8 | `TILES.filter((t) => t.zone === 'zone2').every((t) => state.unlocked.includes(t.id) && getLevel(state, t.id) >= MAX_LEVEL)` |

Reward amounts are first-pass, not playtested, matching every other reward value in this list — `frozen-reach-discovered` sits above `first-steps` (1) since reaching zone 2 at all is a bigger milestone than the first unlock; `frozen-reach-complete` sits above `drift-away-complete` (5) since it's a strictly harder subset of that same full-completion condition (zone-2 tiles cost 15–20× more), reached independently of whether zone 1 is also fully maxed.

### Camera sail

- A `CAMERA_POSITIONS` map in `js/scene.js`, keyed by zone id: `{ zone1: {position, target}, zone2: {position, target} }`. Zone 2's values are derived from its grid bounds using the same relative angle/distance/frustum as zone 1's current fixed camera.
- A new exported function (`js/render.js` or `js/scene.js`), e.g. `sailToZone(zoneId)`, that tweens the camera's position and look-at target from its current values to the target zone's over ~1.2s with ease-in-out — a small manual per-frame lerp, consistent with this project having no animation library and no build step.
- **No dedicated sail button.** Instead, `js/main.js`'s existing click handler (which already raycasts via `screenToGrid` to find the clicked tile) tracks which zone the camera is currently framing. If the clicked tile's `zone` differs from the currently-framed zone, the click sails the camera to that tile's zone instead of opening the tile panel; if it matches, the click behaves exactly as it does today (opens the tile panel). Concretely: from zone 1's framing, clicking a discovered zone-2 tile (visible at the edge of the current view, or once its marker is visible at all) sails to zone 2; from zone 2's framing, clicking a zone-1 tile sails back. This means a zone-2 tile only actually becomes "openable" once you've already sailed there — the first click on it from afar is purely a travel action.

### Fog-of-war visual (cloud cover)

Not a flat plane — a cloud cover, built once at scene-construction time like every other mesh in this codebase (per the established "build once, toggle `.visible`" convention documented in `memory-bank/architecture-notes.md` and the `three-best-practices` skill), with two parts. This design went through an explicit comparison pass: three candidate techniques (glossy overlapping spheres, a marching-cubes-merged blob, and a billboarded 2D sprite) were prototyped side by side against a user-provided reference image; the sprite was chosen for its cost and because it read cleanly at actual in-game camera distance once tuned.
- A single, large `THREE.Sprite` (always faces the camera automatically — relevant since the camera itself moves during the sail tween, see below), textured with a runtime-generated `CanvasTexture`: several overlapping soft-edged white highlight blobs painted over slightly-offset blue-grey shadow blobs, giving a puffy multi-lobed silhouette rather than one flat glow. No external image assets, consistent with this project's zero-asset convention. The blob hardness/feathering needs tuning for whatever final in-game camera distance is used — texture detail that reads fine from far away can look blurry up close, and vice versa.
- **Positioned off-center from zone 2's own grid**, biased further east, rather than centered on it: a cloud sized to meaningfully cover the zone must be bigger than zone 2's own footprint, and centering that on zone 2's exact middle would spill its west edge back over zone-1 tiles the player can already see clearly. Pushing the cloud's center further east keeps it clear of zone 1 with margin, and reads correctly thematically too — the fog is thinnest right at the explored frontier and thickest further into the unknown, rather than uniform across the whole zone.
- A soft-edged shadow patch at water level beneath it — a plane textured with a separate runtime-generated radial-gradient `CanvasTexture` (dark, fading to fully transparent at the edges), so the shadow reads as an organic patch, not a hard rectangle.

**Clears progressively as zone 2 is explored**, rather than staying static: both the sprite's opacity and the shadow patch's opacity/scale scale down together as a function of `completionCount` restricted to zone-2 tiles (i.e. `zone2UnlockedCount / 36`), fully gone once every zone-2 tile is unlocked. The sprite also drifts upward slightly as it fades, for a "burning off" feel. This needs one new small derived value (a zone-scoped tile count, straightforward to compute from `TILES`/`state.unlocked` the same way `completionCount` already does) — no new persisted state.

Zone-2 tile meshes (marker, then raft) render through/above the cloud cover exactly per today's existing visibility rules — discovery and unlock are entirely unaffected by it; it's purely a visual reflection of the same underlying progress. Click-to-sail (below) raycasts the cloud sprite itself rather than a separate hit-plane — the sprite's `visible` flag stays `true` throughout (only its material opacity fades), so it stays clickable even once fully cleared, the same way a real zone-2 tile mesh stays clickable regardless of any fog decoration around it.

### Economy integration

Zone-2 producer/booster tiles are ordinary `TILES` entries with larger `rate` / `boosts[].percent` and larger `unlock.cost` / `unlock.target` values. `effectiveRate`, `effectiveTileRate`, `levelUpCost`, `unlockTile`, `levelUpTile`, and `tick` are all already generic over "whatever's in `TILES`" — **no changes to any of these functions**. A zone-2 fish booster boosts every unlocked fish producer regardless of zone, exactly like zone-1 boosters do today; this is the existing behavior, not new code.

`TOTAL_TILE_COUNT` (`= TILES.length`) automatically becomes 72. `completionCount`, `isFullyComplete`, `doPrestige`'s reset, `prestigeTokensEarned`, and every existing achievement condition are already written generically over `TILES`/`RESOURCES` — they automatically now require/reset/cover both zones, with no code changes. This does mean (confirmed with the user): a prestige cycle takes substantially longer once zone 2 exists, and prestiging returns zone 2 to undiscovered fog along with zone 1 — that's the accepted tradeoff of a single unified reset cycle.

`tests/economy.test.mjs` hardcodes `36` as the tile count in several assertions — these need updating to the new total as part of implementation; this is a test-fixture update, not a design change.

## Art Plan

- Zone-2 raft base color uses the Arctic palette (ice-blue/frost-white), applied via the same per-tile-color-constant pattern `js/scene.js` already uses for raft coloring — a small, mechanical change once the palette is chosen.
- All 10 archetypes (fish/kelp/driftwood/crops producer props, plus the drying-rack/smokehouse/windmill/net-weavers/composting-shed/lighthouse boosters) get new, more elaborate geometry in the same procedural-Three.js style as the original prop pass, themed to frozen/icy motifs (e.g. frost-rimed nets, ice-locked driftwood, rimed kelp blades) while staying recognizably the same role as their zone-1 counterpart. Comparable in size to the original ~600-line prop pass.
- **Prototype-first, per the user's standing instruction**: before any zone-2 prop geometry is written into `js/scene.js`, a throwaway scratch page (e.g. `preview-levels-2.html`, following the exact precedent of this codebase's original `preview-levels.html` used for the first tile-visuals pass) renders all 10 redesigned archetypes side by side in a minimal standalone Three.js scene. This is shown to the user for approval; only after approval does the geometry get ported into `scene.js`'s `addProp`/`buildBoosterProp` dispatch.

## UI/UX Flow

1. Player unlocks zone-1 tiles as today. The zone-2 cloud cover is visible in the distance from the very start of the game.
2. Once a zone-1 column-5 border tile is unlocked, the hex-adjacent zone-2 tile(s) become discovered: their pulsing marker appears beneath the clouds, visible at the edge of the zone-1 camera framing. The cloud cover begins thinning as zone-2 tiles get unlocked, fully clearing once all 36 are.
3. Clicking that discovered zone-2 tile (instead of opening a tile panel) tweens the camera to zone 2's framing over ~1.2s. From zone 2's framing, clicking a visible zone-1 tile sails back the same way.
4. Once framed on zone 2, the player unlocks/levels its discovered tiles exactly like any tile today (same tile-panel UI, same click flow) — pricier, and rewarding a meaningfully higher production rate.
5. Continuing to unlock zone-2 tiles reveals more of its frontier and clears more of the cloud cover, mirroring zone 1's existing discovery pacing.
6. Full completion (72/72 tiles maxed across both zones) unlocks Prestige exactly as today. Prestiging resets both zones to their initial state — zone 2 returns to fully undiscovered/fogged — consistent with the existing full-reset design.

## Testing Plan

- Pure economy math: extend `tests/economy.test.mjs`'s existing generic tests to run against the full 72-tile roster once zone-2 data exists, and update the hardcoded `36` tile-count assertions to the new total.
- `isZoneDiscovered` (or equivalent) and the two new `frozen-reach-discovered`/`frozen-reach-complete` achievement conditions get direct unit tests in the same Node/`assert` style as the rest of the file — including that `frozen-reach-complete` doesn't fire on zone-1-only completion, and that both are idempotent like every other achievement.
- Camera-sail, the cloud cover, and the redesigned prop geometry have no automated test harness, consistent with this project's established convention that DOM/Three.js visuals are verified manually in a real browser. Manual verification covers: an undiscovered zone-2 tile is not clickable/sailable, a discovered one sails on click instead of opening its panel, a same-zone click still opens the tile panel as before, the camera tween runs smoothly in both directions, the cloud cover is present over zone 2 from scene start and visibly thins/clears in step with zone-2 unlock progress, the shipped prop geometry matches the approved prototype, and no console errors appear at any point.
