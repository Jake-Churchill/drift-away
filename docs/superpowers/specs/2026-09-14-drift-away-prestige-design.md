# Drift Away — Prestige Design

## Overview

Drift Away currently has a hard ceiling: once all 36 tiles are unlocked and
leveled to 3, there is nothing left to do. Research on idle/incremental
game retention consistently flags this as a top cause of churn — "even a
simple achievement gives direction," and a missing endgame bleeds players
after the first session. This spec adds a **prestige loop**: reaching full
completion lets the player reset their farm in exchange for a permanent,
persistent currency ("tokens") spent on permanent production upgrades.

This ships as its own branch/plan, independent of the offline-progress
feature (already implemented) that was brainstormed alongside it.

## Goals

- Give players a reason to keep playing after full completion.
- Make the reset feel like acceleration, not punishment — tokens spent on
  upgrades make the next run measurably faster from the start.
- Add a small amount of genuine player choice/agency, which the base game
  currently has none of (tile identity, position, and unlock order are all
  fixed).

## Non-Goals

- No new resource type or tile tier. The reward is a production multiplier
  on the four existing resources, not new content (this was decided over
  the alternative "new tile tier" option during brainstorming).
- No unlock-cost or level-up-cost discounts. Prestige upgrades affect
  production rate only, never costs — this keeps prestige orthogonal to
  the existing unlock/level economy rather than entangling the two.
- No partial reset. Prestiging always fully resets resources, lifetime
  totals, unlocked tiles, and levels — there is no "keep some tiles"
  variant.
- No cap on the number of times a player can prestige, and no cap on how
  many times a single upgrade can be purchased. The escalating cost is the
  only brake.
- No changes to `js/scene.js` or `js/render.js` — this is a pure
  economy + UI feature, no new 3D art.
- Restart (the existing menu option) is unaffected and unchanged: it
  already wipes everything via `createInitialState()`, and that continues
  to include prestige tokens/upgrades. "Restart" means start over
  completely; "Prestige" is the only path that resets the farm while
  preserving something.

## Data Model

A new `prestige` field is added to the state object, alongside
`resources`/`lifetime`/`unlocked`/`levels`:

```js
// js/state.js
export function createInitialPrestige() {
  return { tokens: 0, upgrades: { fish: 0, kelp: 0, driftwood: 0, crops: 0 } };
}

export function createInitialState() {
  const resources = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  const lifetime = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  const unlocked = TILES.filter((t) => t.unlock.type === 'start').map((t) => t.id);
  return { version: 1, resources, lifetime, unlocked, levels: {}, prestige: createInitialPrestige() };
}
```

`loadState()`'s existing defensive-merge pattern (already used for
`resources`/`lifetime`/`levels`) is extended the same way, so an old save
made before this feature shipped loads with a default `prestige` instead
of `undefined`:

```js
const state = {
  ...base,
  ...parsed,
  resources: { ...base.resources, ...parsed.resources },
  lifetime: { ...base.lifetime, ...parsed.lifetime },
  levels: { ...base.levels, ...parsed.levels },
  prestige: {
    ...base.prestige,
    ...(parsed.prestige || {}),
    upgrades: { ...base.prestige.upgrades, ...(parsed.prestige || {}).upgrades },
  },
};
```

## Mechanics

### Completion tracking

```js
export function completionCount(state) {
  return TILES.filter((t) => state.unlocked.includes(t.id) && getLevel(state, t.id) >= MAX_LEVEL).length;
}

export function isFullyComplete(state) {
  return completionCount(state) === TILES.length;
}
```

`completionCount` is also used by the UI to show progress toward
prestige eligibility before the player gets there (e.g. "29/36 tiles at
max level") — giving an interesting next goal even mid-run, per the
research on visible progress.

### Token formula

```js
export const PRESTIGE_TOKEN_DIVISOR = 1000; // first-pass constant, not playtested

export function prestigeTokensEarned(state) {
  const total = RESOURCES.reduce((sum, r) => sum + state.lifetime[r], 0);
  return Math.floor(total / PRESTIGE_TOKEN_DIVISOR);
}
```

Tokens scale with combined lifetime production at the moment of
prestiging. Because unlock/level-up costs are fixed regardless of
production speed, lifetime totals at "just reached full completion" are
roughly consistent run over run — a player who prestiges the moment
they're eligible gets a consistent baseline, while one who lets the farm
idle longer before cashing out earns more. `PRESTIGE_TOKEN_DIVISOR` is a
tunable balance constant, in the same spirit as `PRODUCER_UPGRADE_BASE`
and `BOOSTER_UPGRADE_BASE` already in this file — a reasonable starting
value, not a playtested one.

### Resetting

```js
export function doPrestige(state) {
  if (!isFullyComplete(state)) return null;
  const tokensEarned = prestigeTokensEarned(state);
  const nextState = createInitialState();
  nextState.prestige = {
    tokens: state.prestige.tokens + tokensEarned,
    upgrades: { ...state.prestige.upgrades },
  };
  return { state: nextState, tokensEarned };
}
```

`doPrestige` is a pure function returning a brand-new state object (it
does not mutate its argument), mirroring how `createInitialState()`
already works and how `main.js`'s existing Restart handler reassigns
`state` wholesale rather than mutating in place. The caller in `main.js`
is responsible for `state = result.state` and `saveState(state)`.

### Upgrade store math

```js
export const PRESTIGE_UPGRADE_BASE_COST = 5; // first-pass constant, not playtested
export const PRESTIGE_UPGRADE_PERCENT = 10; // +10% production per purchase, first-pass

export function prestigeUpgradeCost(currentCount) {
  return PRESTIGE_UPGRADE_BASE_COST * (currentCount + 1);
}

export function buyPrestigeUpgrade(state, resource) {
  const count = state.prestige.upgrades[resource];
  const cost = prestigeUpgradeCost(count);
  if (state.prestige.tokens < cost) return false;
  state.prestige.tokens -= cost;
  state.prestige.upgrades[resource] += 1;
  return true;
}
```

Unlike `doPrestige`, `buyPrestigeUpgrade` mutates `state` in place and
returns a boolean — this matches the existing `unlockTile`/`levelUpTile`
convention for small in-place actions, as distinct from the
whole-state-replacing reset.

Cost escalates linearly (1st purchase costs `BASE`, 2nd costs `BASE * 2`,
3rd costs `BASE * 3`, ...) — the same flat, easy-to-read escalation style
the rest of the game already uses (e.g. the level-up step multipliers),
rather than an exponential curve.

### Production math integration

`effectiveRate` and `effectiveTileRate` each gain a fourth, optional,
trailing parameter defaulting to `{}` so every existing call site and
every existing test keeps working unchanged:

```js
export function effectiveRate(resource, unlockedIds, levels = {}, prestigeUpgrades = {}) {
  const baseSum = TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'producer' && t.produces === resource)
    .reduce((sum, t) => sum + t.rate * levelMultiplier(levels[t.id] || 1), 0);
  const boosterMultiplier = 1 + boostPercentFor(resource, unlockedIds, levels) / 100;
  const prestigeMultiplier = 1 + (PRESTIGE_UPGRADE_PERCENT * (prestigeUpgrades[resource] || 0)) / 100;
  return baseSum * boosterMultiplier * prestigeMultiplier;
}

export function effectiveTileRate(tile, unlockedIds, levels = {}, prestigeUpgrades = {}) {
  const level = levels[tile.id] || 1;
  const boosterMultiplier = 1 + boostPercentFor(tile.produces, unlockedIds, levels) / 100;
  const prestigeMultiplier = 1 + (PRESTIGE_UPGRADE_PERCENT * (prestigeUpgrades[tile.produces] || 0)) / 100;
  return tile.rate * levelMultiplier(level) * boosterMultiplier * prestigeMultiplier;
}
```

Every internal caller that already threads `state.levels` through now also
threads `state.prestige.upgrades` through:

- `tick(state, dt)` — its `effectiveRate` call.
- `applyOfflineProgress(state, elapsedSeconds)` — its `effectiveRate` call,
  so offline gains correctly reflect prestige upgrades too.
- `js/ui.js`'s `describeProduction` — its `effectiveTileRate` call, so the
  tile panel displays the boosted number.

`levelUpCost` is unchanged — it reads `tile.rate`/`b.percent` directly,
never `effectiveRate`, so prestige upgrades correctly do not affect
unlock or level-up costs (per the Non-Goals above).

## UI/UX Flow

All of this lives in the existing menu overlay (`index.html`'s
`#menu-overlay`), as new sibling sub-views alongside the current
`#menu-main`/`#menu-confirm`, following the same show/hide-by-class
pattern `js/ui.js`'s `initMenu` already establishes.

- **`#menu-main`** gains two new rows:
  - **Prestige** — enabled only when `isFullyComplete(state)`; while
    locked, it's disabled and shows progress, e.g. "Prestige (29/36 maxed)"
    using `completionCount`.
  - **Store** — always visible (so players can see upgrades exist and
    what they'll eventually buy), opens `#menu-store` regardless of token
    balance (buttons are simply disabled at 0 tokens).
- **`#menu-prestige-confirm`** (new sub-view, parallel to
  `#menu-confirm`'s existing restart-confirmation pattern, but with its
  own copy): "Prestige for {tokensEarned} tokens? This resets your farm
  but keeps your permanent upgrades." / "Yes, prestige" / "Cancel".
  Confirming calls `doPrestige`, reassigns `state`, saves, and transitions
  directly into `#menu-store` (so the player can immediately spend their
  new tokens) with a small "+{N} tokens earned!" banner.
- **`#menu-store`** (new sub-view): shows the current token balance, then
  one row per resource (fish/kelp/driftwood/crops) with its icon, current
  purchase count, cumulative bonus ("+30%"), next cost, and a Buy button
  (disabled when unaffordable). A Back button returns to `#menu-main`.

Visual styling reuses the existing dark-blue/cream/gold palette and
button styles already established by the menu and offline-progress work
— no new visual language needed.

## Testing Plan

Following this project's existing split (pure economy math is
Node-tested; DOM/UI is browser-verified manually):

**New Node unit tests in `tests/economy.test.mjs`** (TDD, one failing
test at a time, matching how `applyOfflineProgress` was just built):

- `completionCount` / `isFullyComplete` — 0 tiles maxed, some tiles
  maxed, all 36 maxed.
- `prestigeTokensEarned` — computed correctly from lifetime totals across
  all four resources.
- `doPrestige` — returns `null` when not fully complete; on success,
  resets resources/lifetime/unlocked/levels to the initial state while
  carrying forward `prestige.tokens` (incremented) and
  `prestige.upgrades` (unchanged); does not mutate the input state.
- `prestigeUpgradeCost` — escalates linearly as documented.
- `buyPrestigeUpgrade` — succeeds and deducts tokens/increments count
  when affordable; fails and leaves state unchanged when not.
- `effectiveRate` / `effectiveTileRate` — a purchased prestige upgrade
  increases the resource's effective rate by the expected percentage,
  stacking correctly alongside existing level/booster multipliers; the
  new fourth parameter defaults to no effect when omitted (regression
  check that every pre-existing call/test still passes unchanged).

**Manual browser verification** (same approach used for the menu and
offline-progress work): reach or fabricate a fully-completed save via
localStorage injection, confirm the Prestige option is disabled with
correct progress text before completion and enabled after; confirm the
confirm-flow and reset behavior; confirm Store purchases deduct tokens,
increment the count, and visibly change production; confirm everything
persists correctly across a reload.
