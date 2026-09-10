# Drift Away — Tile Leveling System

Date: 2026-09-09
Status: Approved for planning
Supersedes: nothing — this is additive. It touches the same files the 2026-09-07 territory-expansion work touched (`js/state.js`, `js/render.js`, `js/main.js`) but doesn't change anything that document specified; adjacency/discovery gating is unaffected.

## 1. Overview

Every unlocked tile (all 36, producers and boosters alike) can be leveled from 1 to 3. Leveling costs resources and increases the tile's output — production rate for producers, boost percent for boosters — by a fixed curve. Boosters cost more to level than producers, by design. No 3D visuals change in this pass, but the data (`state.levels`) is available to the renderer for a future pass to use, and one small addition (exposing each tile's prop group) removes the only real friction that future pass would otherwise hit.

### Non-goals
- No change to unlock/discovery mechanics (adjacency gating, the 2026-09-07 territory-expansion work) — leveling only applies to already-unlocked tiles.
- No 3D visual change per level in this pass (bigger/fancier prop geometry per level is explicitly future work).
- No level cap beyond 3, no prestige/reset mechanic.
- No hand-authored per-tile level costs — costs are formula-derived from each tile's existing `rate`/`boosts` data (see §2), matching this pass's explicit goal of avoiding a 72-number authoring effort.

## 2. Level effect and cost formulas

**Effect curve** (applies uniformly to producers and boosters):
```
levelMultiplier(level) = 1 + (level - 1) * 0.5
```
Level 1 = 1.0x (base), level 2 = 1.5x, level 3 = 2.0x. A producer's effective rate and a booster's effective boost percent both scale by this same multiplier — only the *cost* to reach a level differs between the two kinds.

**Upgrade cost**, computed purely from data already in `js/tiles.js` — no new per-tile fields:
```
STEP_MULTIPLIER = { 2: 1, 3: 2.5 }   // level-3 upgrade costs more than level-2

// Producers: pay in the resource they produce
producerUpgradeCost(tile, targetLevel) =
  { [tile.produces]: round(tile.rate * 30 * STEP_MULTIPLIER[targetLevel]) }

// Boosters: pay across the resources they boost, proportional to each one's percent
boosterUpgradeCost(tile, targetLevel) =
  Object.fromEntries(tile.boosts.map(b =>
    [b.resource, round(b.percent * 6 * STEP_MULTIPLIER[targetLevel])]
  ))
```
Worked examples:
| Tile | Kind | Level 2 cost | Level 3 cost |
|---|---|---|---|
| `driftwood_start` (rate 0.5) | producer | 15 driftwood | 38 driftwood |
| `fish_start` (rate 1.0) | producer | 30 fish | 75 fish |
| `fish_leviathan_net` (rate 2.5) | producer | 75 fish | 188 fish |
| `booster_smokehouse` (+25% fish) | booster | 150 fish | 375 fish |
| `booster_net_weavers` (+20% fish, +20% kelp) | booster | 120 fish + 120 kelp | 300 fish + 300 kelp |
| `booster_lighthouse` (+15% all four) | booster | 90 of each resource | 225 of each resource |

Boosters cost noticeably more than producers of comparable "power" (25% boost ≈ 150 fish vs. a rate-1.0 producer's 30 fish) — the 6x gap between the producer and booster base constants (30 vs. 6, applied to differently-scaled inputs — rate is ~0.5–2.5, percent is ~15–25) is what produces this; the two constants aren't meant to be compared directly to each other, only their resulting costs are. This is a first-pass balance, not playtested — same caveat the unlock-cost table carries.

## 3. State shape (`js/state.js`)

`state.levels` is a sparse map, `{ [tileId]: level }` — a tile with no entry is level 1. `createInitialState()` adds `levels: {}`. `loadState()` needs no new merge logic: its existing `{ ...base, ...parsed }` spread means an old save with no `levels` key simply inherits `base.levels` (`{}`), which is exactly the correct default (every previously-unlocked tile reads as level 1, which is what it always was).

New exports:
```js
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
  if (!state.unlocked.includes(tile.id) || level >= 3) return false;
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
```
This mirrors `unlockTile`'s existing shape (eligibility check → deduct → mutate) deliberately, for consistency with the codebase's established pattern.

**Existing functions gain an optional third parameter**, defaulting to `{}` (all level 1) so every current call site — none of which pass a third argument — is unaffected:
```js
function boostPercentFor(resource, unlockedIds, levels = {}) {
  return TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'booster')
    .flatMap((t) => t.boosts.map((b) => ({ ...b, level: levels[t.id] || 1 })))
    .filter((b) => b.resource === resource)
    .reduce((sum, b) => sum + b.percent * (1 + (b.level - 1) * 0.5), 0);
}

export function effectiveRate(resource, unlockedIds, levels = {}) {
  const baseSum = TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'producer' && t.produces === resource)
    .reduce((sum, t) => sum + t.rate * (1 + ((levels[t.id] || 1) - 1) * 0.5), 0);
  return baseSum * (1 + boostPercentFor(resource, unlockedIds, levels) / 100);
}

export function effectiveTileRate(tile, unlockedIds, levels = {}) {
  const level = levels[tile.id] || 1;
  return tile.rate * (1 + (level - 1) * 0.5) * (1 + boostPercentFor(tile.produces, unlockedIds, levels) / 100);
}
```
`tick()` (internal to `state.js`, already has `state` in scope) passes `state.levels` as the third argument. `ui.js`'s call to `effectiveTileRate` similarly passes `state.levels` — it already receives the full `state` object.

## 4. UI (`js/ui.js`, `index.html`)

The tile panel's single existing action button (`tile-panel-unlock-btn`) is reused rather than adding a second button — its label and handler switch based on context:

- **Locked tile** (unchanged from today): "Requires: ..." description, progress toward unlock, button reads "Unlock".
- **Unlocked, level < 3**: description becomes `Produces X/s (Level N)` or `+P% resource (Level N)`, progress bar shows fraction toward the *next* level's cost (reusing the same `progressFraction`-style calculation, against `levelUpCost(tile, level+1)` instead of `tile.unlock.cost`), button reads `Level Up (cost)` and is disabled unless `isLevelUpEligible` — mirroring exactly how the locked-tile button already works.
- **Unlocked, level 3 (max)**: description as above, progress bar and button both hidden, replaced with a static "Max Level" indicator.

`showTilePanel`'s signature gains a second callback: `showTilePanel(tile, state, eligible, onUnlock, onLevelUp)`. `eligible` continues to mean "can take the primary action right now" (either unlock-eligible or level-up-eligible, whichever applies) — `main.js` computes the correct one before calling, so `ui.js` doesn't need to know about `isEligible` vs. `isLevelUpEligible` itself.

## 5. `js/main.js` changes

1. `handleUnlockClick` is joined by a `handleLevelUpClick(tile)` following the identical pattern (call `levelUpTile`, save on success, re-render the panel).
2. The click handler and the per-frame panel refresh both need the right `eligible` value and the right callback pair passed to `showTilePanel` — computed by checking `state.unlocked.includes(tile.id)` first.
3. **Behavior change**: the per-frame loop currently only re-renders the panel for a selected tile if it's locked (`!state.unlocked.includes(tile.id)`) — a static, already-unlocked tile never needed a live refresh before. Now it does, so a selected tile's level-up progress bar updates in real time. The condition becomes: refresh whenever a tile is selected and (locked, or unlocked-but-not-max-level) — i.e., skip the refresh only once a tile has nothing left to progress toward.

## 6. Rendering hook (`js/scene.js`)

No behavior change. `updateScene(state, time)` in `render.js` already receives the full `state` object every frame, so a future visual-per-level pass can read `state.levels[tile.id]` with zero new plumbing. The one addition: `js/scene.js`'s `tileObjects` map (currently `Map<tileId, { raftMesh, markerMesh }>`) also stores each tile's `propGroup` — already constructed in `addProp` and attached to `raftMesh`, just not currently kept anywhere after that — so a future pass can scale or swap it directly instead of re-deriving it from `raftMesh.children`.

## 7. Testing

`tests/economy.test.mjs` additions:
- `getLevel` returns 1 for an untouched tile, and the stored value once set.
- `levelUpCost` spot-checked against the worked-example table in §2 for a producer and a multi-resource booster.
- `levelUpTile`: succeeds and deducts cost when affordable, fails when unaffordable, fails when the tile is still locked, fails when already at level 3.
- `effectiveRate`/`effectiveTileRate` produce the level-1.5x/2x values from §2 when a `levels` map is passed, and are unchanged from their current values when it's omitted (regression guard on the default-parameter backward-compatibility claim in §3).
