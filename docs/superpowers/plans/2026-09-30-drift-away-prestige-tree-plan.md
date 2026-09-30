# Prestige Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prestige loses its all-or-nothing gate (today it requires every one of 492 tiles maxed);
a new floor of "earned at least 1 prestige token" replaces it. What tokens buy becomes a branching,
persistent tree with four branches (Production, Comfort, Efficiency, Head Start), replacing today's
flat "Prestige Store" list and absorbing three gold-shop items (Deeper Hold, Steady Tides, Ballast)
that move to token pricing. The Harbor Shop narrows to cosmetics (palettes) only.

**Architecture:** `state.shop` shrinks to `{ palette, palettes }`. `state.prestige` grows to add
`hold`, `tides`, `ballast` alongside its existing `tokens`, `upgrades`, `headStart`, `count`. Every
existing cost formula and tier table carries over unchanged — only three items change currency
(gold → tokens) and gain new state-object homes. A new `js/state.js` function,
`prestigeTreeCatalog(state)`, computes every tree node's level/cost/status in one place (mirroring
how `shopCatalog` already does this for the Harbor Shop), so `js/ui.js` stays a pure renderer with
no purchase logic of its own — the existing architectural rule this codebase already follows.
`normalizeSave` migrates a legacy save's `shop.holdLevel`/`tidesLevel`/`ballast` into
`prestige.hold`/`tides`/`ballast` so existing players don't lose gold-bought progress. No
`SAVE_VERSION` bump — no tile ids or map data change, only where three numbers live.

**Tech Stack:** Vanilla JS + Three.js (UI layer only, no 3D changes in this plan), no build step,
Node's built-in test runner via `npm test`.

**Spec:** `docs/superpowers/specs/2026-09-30-drift-away-prestige-tree-design.md`

## Global Constraints

- No rebalancing of any existing number: `PRESTIGE_UPGRADE_BASE_COST` (5), `PRESTIGE_UPGRADE_PERCENT`
  (10), `headStartCost` (`20*(level+1)`), `HOLD_COSTS` (`[6,12,20]`), `TIDES_COSTS` (`[8,16]`),
  `ballastCost` (`4+2*level`) all keep their exact formulas — only Hold/Tides/Ballast's currency
  changes from gold to tokens.
- `prestigeTokensEarned`'s formula is unchanged: `floor(sum of lifetime RESOURCES / 1000)`,
  `PRESTIGE_TOKEN_DIVISOR` stays 1000.
- The new prestige floor: `prestigeTokensEarned(state) >= PRESTIGE_MIN_TOKENS` where
  `PRESTIGE_MIN_TOKENS = 1`. `isFullyComplete`/the "Drift Away Complete" achievement is untouched —
  it keeps firing exactly as today, independent of prestige eligibility.
- Steady Tides' first tier requires Deeper Hold to be fully maxed (tier 3 of 3) first. No other
  cross-node or cross-branch dependency exists — Production's 7 lanes, Ballast, and Head Start are
  each reachable with no prerequisite beyond having tokens.
- The existing "tap once, hold to repeat" interaction (`js/ui.js`'s `wireHoldToRepeat`/
  `wireQuickBuyButtons`, 400ms delay then repeat every 90ms) is preserved for every node that has a
  quantity: the 7 production lanes, Ballast, and Head Start. Hold and Tides keep a single "buy next
  tier" button each, no quantity — matching today's `buyShopItem` behavior for these two.
- `SAVE_VERSION`/`SAVE_KEY` do not change. `js/version.js` bumps MINOR (new player-visible feature),
  only in the final task.
- No new npm dependencies. No changes to camera, tile/map data, generator economy, or `PALETTES`.
- Commits happen only on the branch/worktree set up for this plan, never on `main`, and only when
  the controller running this plan has been told commits are authorized there.

## Known-good facts (verified against the live `js/state.js`/`js/ui.js`/`js/main.js` before writing this plan)

- `doPrestige` (state.js:455): `if (!isFullyComplete(state)) return null;` is the entire gate today.
- `createInitialPrestige` (state.js:55-57):
  `{ tokens: 0, upgrades: Object.fromEntries(RESOURCES.map(r=>[r,0])), headStart: 0, count: 0 }`.
- `createInitialShop` (state.js:60-62):
  `{ holdLevel: 0, tidesLevel: 0, palette: 'default', palettes: [], ballast: 0 }`.
- `PRESTIGE_TOKEN_DIVISOR = 1000` (state.js:448); `prestigeTokensEarned` (state.js:450-453).
- `PRESTIGE_UPGRADE_BASE_COST = 5`, `PRESTIGE_UPGRADE_PERCENT = 10` (state.js:602-603);
  `prestigeUpgradeCost(count) = 5*(count+1)` (state.js:605-607); `buyPrestigeUpgrade` (state.js:609-616)
  — all three unchanged by this plan.
- `HEAD_START_MAX_LEVEL = 10`, `HEAD_START_TILES_PER_LEVEL = 2` (state.js:475-476);
  `headStartCost(level) = 20*(level+1)` (state.js:478-480); `buyHeadStart` (state.js:482-488) —
  unchanged by this plan.
- `HOLD_COSTS = [6, 12, 20]`, `TIDES_COSTS = [8, 16]` (state.js:519-520, currently module-private,
  not exported). `OFFLINE_CAP_HOURS = [8, 12, 16, 24]` (state.js:671, exported),
  `OFFLINE_RATES = [0.5, 0.65, 0.8]` (state.js:672, module-private).
- `ballastCost(state) { return 4 + 2 * state.shop.ballast; }` (state.js:522-524).
- `offlineCapSeconds`/`offlineRate` (state.js:675-681) read `state.shop.holdLevel`/`tidesLevel`.
- `stateRate` (state.js:136-138) and `rateBreakdown`'s `ballastPercent` (state.js:169) read
  `state.shop.ballast`.
- `shopCatalog` (state.js:528-561) currently returns rows for `hold`, `tides`, every `PALETTES`
  entry plus `Classic`, and `ballast`, in that order, grouped by `row.section`
  (`comfort`/`look`/`ballast`).
- `buyShopItem` (state.js:564-600) currently has four branches: `id === 'hold'`, `id === 'tides'`,
  `id === 'ballast'`, `id.startsWith('palette:')`.
- `normalizeSave` (state.js:812-840) and its `normalizeShop` helper (state.js:843-852) — the exact
  current bodies are quoted in Task 1, Step 7 below; `normalizeShop` currently clamps
  `holdLevel`/`tidesLevel`/`ballast` as well as filtering `palettes`.
- `doPrestige`'s body (state.js:455-471) builds `nextState.prestige` explicitly (tokens/upgrades/
  headStart/count) and copies `nextState.shop = { ...state.shop, palettes: [...state.shop.palettes] }`
  forward — this second line needs no code change (it already copies whatever fields `state.shop`
  has), but `nextState.prestige`'s explicit field list must grow to include `hold`/`tides`/`ballast`.
- `js/ui.js`'s `wireHoldToRepeat`/`wireQuickBuyButtons` (ui.js:747-777) and their current use on the
  7 resource rows and the Head Start row (ui.js:793-810) — reused as-is by Task 2, not modified.
- `js/ui.js`'s `updatePrestigeDisplay` (ui.js:877-911) currently gates the Prestige button on
  `isFullyComplete(state)` and shows "Prestige (X/Y maxed)" while incomplete — this text and gate
  change in Task 2.
- `js/ui.js`'s `renderShop`/`shopHeadings` (ui.js:603-644) render `shopCatalog`'s rows generically by
  `row.section` — already data-driven, so shrinking `shopCatalog`'s output (Task 1) needs no
  structural change here, only trimming the now-unused `comfort`/`ballast` entries from
  `shopHeadings` (Task 2, alongside the rest of the shop markup cleanup).
- `js/main.js`'s `initPrestige` call (main.js:130-170) wires `onPrestige`, a `(upgrade, qty) => ...`
  dispatcher (currently `upgrade === 'headStart' ? buyHeadStart(state) : buyPrestigeUpgrade(state,
  upgrade)`), and `onRefresh`. This dispatcher's ternary needs new branches for `'hold'`, `'tides'`,
  `'ballast'` in Task 2.
- `index.html`'s `#prestige-overlay` (lines 101-182) holds the flat `#prestige-store` markup (8
  `.store-row` divs, one per resource plus Head Start) that Task 2 replaces with the tree. The
  Harbor Shop's markup (`#menu-shop`, lines 77-81) is generic (`#shop-list` is populated entirely by
  `renderShop`) and needs no markup change — only `shopCatalog`'s data shrinks.
- `style.css`'s `#prestige-panel` (lines 1016-1140) is a narrow (280-340px) fixed-position panel
  sized for the old flat list — Task 2 must widen/reposition it to fit the tree (the approved mockup
  is roughly 700px wide); exact sizing is this plan's implementation detail, not fixed by the spec.

## Task 1: State model, prestige gate, and tree purchase logic

**Files:**
- Modify: `js/state.js`
- Test: `tests/economy.test.mjs`

**Interfaces:**
- Produces: `createInitialShop()` returning `{ palette, palettes }` only; `createInitialPrestige()`
  adding `hold: 0, tides: 0, ballast: 0`; `PRESTIGE_MIN_TOKENS` (exported constant, value `1`);
  `buyTreeHold(state)`, `buyTreeTides(state)`, `buyTreeBallast(state)` (each `(state) => boolean`,
  same signature style as `buyHeadStart`); `prestigeTreeCatalog(state)` returning an array of row
  objects `{ id, branch, name, level, maxLevel?, cost, status }` (`status` one of
  `'buy'|'poor'|'maxed'|'locked'`) covering all 11 nodes (7 resources + hold + tides + ballast +
  headStart) — modeled on `shopCatalog`'s existing row shape and spirit ("the screen has no rules of
  its own"). `doPrestige` gated on `PRESTIGE_MIN_TOKENS` instead of `isFullyComplete`.
  `normalizeSave` migrates a legacy save's `shop.{holdLevel,tidesLevel,ballast}` into
  `prestige.{hold,tides,ballast}`.
- Consumes: existing `RESOURCES`, `prestigeUpgradeCost`, `headStartCost`, `HEAD_START_MAX_LEVEL`,
  `ballastCost` (modified in this task), `OFFLINE_CAP_HOURS`/`OFFLINE_RATES` (unchanged), `PALETTES`
  (unchanged, for `shopCatalog`'s remaining rows).

This task is pure logic — no DOM. Task 2 (UI) depends on `prestigeTreeCatalog`,
`buyTreeHold`/`buyTreeTides`/`buyTreeBallast`, and `PRESTIGE_MIN_TOKENS` all existing and exported
before it can be dispatched.

- [ ] **Step 1: Write the failing test for the new prestige gate**

Find the existing block in `tests/economy.test.mjs` (around line 480-484):

```js
{
  const state = createInitialState(); // not fully complete
  const result = doPrestige(state);
  assert.equal(result, null, 'prestige is refused before full completion');
}
```

Replace it with:

```js
{
  const state = createInitialState(); // fresh game, no lifetime production yet
  const result = doPrestige(state);
  assert.equal(result, null, 'prestige is refused below the minimum token floor');
}

{
  const state = createInitialState();
  state.lifetime = { fish: 1000, kelp: 0, driftwood: 0, crops: 0, planks: 0, kelp_rope: 0, bread: 0 };
  const result = doPrestige(state); // nowhere near fully complete, but past the token floor
  assert.ok(result, 'prestige succeeds once the token floor is met, even far from full completion');
  assert.equal(result.tokensEarned, 1);
}
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npm test`
Expected: the first new assertion passes (still refused, same as before), but the second fails —
`doPrestige` still returns `null` because `isFullyComplete` is still the only gate and this state
isn't fully complete.

- [ ] **Step 3: Implement the new gate**

In `js/state.js`, near `PRESTIGE_TOKEN_DIVISOR` (line 448), add:

```js
export const PRESTIGE_MIN_TOKENS = 1; // below this, a prestige would earn nothing worth resetting for
```

Change `doPrestige` (line 456) from:

```js
export function doPrestige(state) {
  if (!isFullyComplete(state)) return null;
```

to:

```js
export function doPrestige(state) {
  if (prestigeTokensEarned(state) < PRESTIGE_MIN_TOKENS) return null;
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `npm test`
Expected: both new assertions pass. The large "fully complete" `doPrestige` test further down (state
1000+ lifetime resources, all tiles maxed) still passes unchanged — it's still comfortably past the
new floor too.

- [ ] **Step 5: Write the failing tests for the data model move (shop shrink, prestige growth)**

Add a new block in `tests/economy.test.mjs`, right after the `console.log('prestige store tests
passed');` line (around line 548):

```js
// --- prestige tree: comfort (hold -> tides) and efficiency (ballast) ---
{
  const s = createInitialState();
  assert.deepEqual(s.shop, { palette: 'default', palettes: [] }, 'shop only holds cosmetics now');
  assert.deepEqual(
    s.prestige,
    { tokens: 0, upgrades: Object.fromEntries(RESOURCES.map((r) => [r, 0])), headStart: 0, hold: 0, tides: 0, ballast: 0, count: 0 },
    'prestige gained hold/tides/ballast'
  );
  assert.equal(offlineCapSeconds(s), 8 * 3600);
  assert.equal(offlineRate(s), 0.5);

  s.prestige.tokens = 5;
  assert.equal(buyTreeHold(s), false, 'six tokens needed, five held');
  assert.equal(s.prestige.tokens, 5, 'a refused purchase costs nothing');
  s.prestige.tokens = 100;
  for (const [cost, hours] of [[6, 12], [12, 16], [20, 24]]) {
    const before = s.prestige.tokens;
    assert.equal(buyTreeHold(s), true);
    assert.equal(before - s.prestige.tokens, cost, `deeper hold to ${hours}h costs ${cost}`);
    assert.equal(offlineCapSeconds(s), hours * 3600);
  }
  assert.equal(buyTreeHold(s), false, 'nothing above the top step');

  const beforeHoldMaxed = createInitialState();
  beforeHoldMaxed.prestige.tokens = 100;
  assert.equal(buyTreeTides(beforeHoldMaxed), false, 'tides is locked until hold is fully maxed');

  for (const [cost, rate] of [[8, 0.65], [16, 0.8]]) {
    const before = s.prestige.tokens;
    assert.equal(buyTreeTides(s), true);
    assert.equal(before - s.prestige.tokens, cost);
    assert.equal(offlineRate(s), rate);
  }
  assert.equal(buyTreeTides(s), false, 'nothing above the top step');

  // the tree's effect on time away
  const away = createInitialState();
  away.prestige.hold = 2; // 16h
  away.prestige.tides = 1; // 65%
  const result = applyOfflineProgress(away, 20 * 3600);
  assert.equal(result.seconds, 16 * 3600, 'the bought cap applies');
  assert.equal(result.rate, 0.65, 'the summary reports the rate used');
  assert.equal(result.gains.driftwood, 0.5 * 16 * 3600 * 0.65);

  // ballast: unlimited, +1% each, price climbs by 2 -- same formula, now token-priced
  const b = createInitialState();
  b.prestige.tokens = 1000;
  const baseRate = effectiveRate('driftwood', b.unlocked, b.levels, b.prestige.upgrades);
  assert.equal(ballastCost(b), 4);
  for (const cost of [4, 6, 8]) {
    const before = b.prestige.tokens;
    assert.equal(buyTreeBallast(b), true);
    assert.equal(before - b.prestige.tokens, cost);
  }
  assert.equal(b.prestige.ballast, 3);
  assert.equal(ballastCost(b), 10);
  const info = rateBreakdown(b, 'driftwood');
  assert.equal(info.ballastPercent, 3);
  assert(Math.abs(info.total - baseRate * 1.03) < 1e-9, 'three ballast is +3% on everything');
  const beforeDriftwood = b.resources.driftwood;
  tick(b, 10);
  assert(Math.abs(b.resources.driftwood - beforeDriftwood - baseRate * 1.03 * 10) < 1e-9, 'production actually uses it');
  for (let i = 0; i < 40; i++) buyTreeBallast(b);
  assert.equal(b.prestige.ballast > 3, true, 'ballast has no ceiling until tokens run out');

  // survives export/import, and a legacy pre-rework save migrates gold-bought progress in
  const kept = createInitialState();
  kept.prestige.hold = 2;
  kept.prestige.tides = 1;
  kept.prestige.ballast = 5;
  const roundTrip = decodeSave(encodeSave(kept));
  assert.equal(roundTrip.prestige.hold, 2);
  assert.equal(roundTrip.prestige.tides, 1);
  assert.equal(roundTrip.prestige.ballast, 5);

  const legacy = decodeSave(btoa(JSON.stringify({
    version: 3, resources: {}, lifetime: {}, unlocked: ['driftwood_start'],
    shop: { holdLevel: 2, tidesLevel: 1, ballast: 5, palette: 'default', palettes: [] },
  })));
  assert.equal(legacy.prestige.hold, 2, "a legacy save's gold-bought hold carries into the tree");
  assert.equal(legacy.prestige.tides, 1, 'and tides');
  assert.equal(legacy.prestige.ballast, 5, 'and ballast');
  assert.equal(legacy.shop.holdLevel, undefined, 'the old shop fields are gone from the normalized state');

  console.log('prestige tree comfort and efficiency tests passed');
}
```

Add `buyTreeHold, buyTreeTides, buyTreeBallast` to this test file's existing import list from
`../js/state.js` (it already imports `ballastCost`, `offlineCapSeconds`, `offlineRate`,
`applyOfflineProgress`, `effectiveRate`, `rateBreakdown`, `tick`, `decodeSave`, `encodeSave`,
`createInitialState`, `RESOURCES` — confirm each is present, add any missing).

- [ ] **Step 6: Run it, confirm it fails**

Run: `npm test`
Expected: fails on the `createInitialShop`/`createInitialPrestige` shape assertions and/or a
`TypeError` importing `buyTreeHold`/`buyTreeTides`/`buyTreeBallast` (none exist yet).

- [ ] **Step 7: Implement the data model move**

Six edits to `js/state.js`:

1. `createInitialPrestige` (line 55-57), currently:

```js
export function createInitialPrestige() {
  return { tokens: 0, upgrades: Object.fromEntries(RESOURCES.map((r) => [r, 0])), headStart: 0, count: 0 };
}
```

Change to:

```js
export function createInitialPrestige() {
  return {
    tokens: 0,
    upgrades: Object.fromEntries(RESOURCES.map((r) => [r, 0])),
    headStart: 0,
    hold: 0,
    tides: 0,
    ballast: 0,
    count: 0,
  };
}
```

2. `createInitialShop` (line 60-62), currently:

```js
// What gold has bought. Like gold itself it survives a prestige.
export function createInitialShop() {
  return { holdLevel: 0, tidesLevel: 0, palette: 'default', palettes: [], ballast: 0 };
}
```

Change to:

```js
// What gold has bought -- cosmetics only. Like gold itself it survives a prestige. Deeper Hold,
// Steady Tides and Ballast moved to the prestige tree (state.prestige), bought with tokens instead.
export function createInitialShop() {
  return { palette: 'default', palettes: [] };
}
```

3. `ballastCost` (line 522-524), currently:

```js
export function ballastCost(state) {
  return 4 + 2 * state.shop.ballast;
}
```

Change to:

```js
export function ballastCost(state) {
  return 4 + 2 * state.prestige.ballast;
}
```

4. `stateRate` (line 136-138) and `rateBreakdown`'s ballast line (line 169) both currently read
   `state.shop.ballast` — change both to `state.prestige.ballast`. `offlineCapSeconds`/`offlineRate`
   (lines 675-681), currently:

```js
export function offlineCapSeconds(state) {
  return OFFLINE_CAP_HOURS[state.shop.holdLevel] * 60 * 60;
}

export function offlineRate(state) {
  return OFFLINE_RATES[state.shop.tidesLevel];
}
```

Change to:

```js
export function offlineCapSeconds(state) {
  return OFFLINE_CAP_HOURS[state.prestige.hold] * 60 * 60;
}

export function offlineRate(state) {
  return OFFLINE_RATES[state.prestige.tides];
}
```

5. `shopCatalog` (line 528-561) and `buyShopItem` (line 564-600): remove the `hold`, `tides`, and
   `ballast` handling from both. Read each function's current full body first (they're quoted in
   this plan's "Known-good facts" section above and in the file itself) and delete exactly the
   `hold`/`tides` row-pushes plus the ballast row-push from `shopCatalog`'s body (keep the `look`
   section's palette loop untouched), and the `if (id === 'hold') {...}`, `if (id === 'tides')
   {...}`, `if (id === 'ballast') {...}` branches from `buyShopItem`'s body (keep the
   `id.startsWith('palette:')` branch untouched). `shopCatalog` should end up returning only the
   palette rows (`Classic` plus every `PALETTES` entry); `buyShopItem` should end up handling only
   `palette:*` ids, returning `false` for anything else. Also delete the now-unused `HOLD_COSTS`/
   `TIDES_COSTS` constants' `shopCatalog`/`buyShopItem` usages -- but keep the constants themselves
   (module-private, `const HOLD_COSTS = [6, 12, 20];` / `const TIDES_COSTS = [8, 16];`), since
   `buyTreeHold`/`buyTreeTides` (step 6 below) still need them.

6. Add three new functions near `buyHeadStart` (after line 488), and one near `shopCatalog` (after
   the trimmed version from step 5 above):

```js
export function buyTreeHold(state) {
  const level = state.prestige.hold;
  if (level >= HOLD_COSTS.length || state.prestige.tokens < HOLD_COSTS[level]) return false;
  state.prestige.tokens -= HOLD_COSTS[level];
  state.prestige.hold += 1;
  return true;
}

// Locked until Deeper Hold is fully maxed -- the one place this rework adds a dependency between
// two things that used to be independent gold purchases.
export function buyTreeTides(state) {
  const level = state.prestige.tides;
  const holdMaxed = state.prestige.hold >= HOLD_COSTS.length;
  if (!holdMaxed || level >= TIDES_COSTS.length || state.prestige.tokens < TIDES_COSTS[level]) return false;
  state.prestige.tokens -= TIDES_COSTS[level];
  state.prestige.tides += 1;
  return true;
}

export function buyTreeBallast(state) {
  const cost = ballastCost(state);
  if (state.prestige.tokens < cost) return false;
  state.prestige.tokens -= cost;
  state.prestige.ballast += 1;
  return true;
}

// Every prestige tree node's current level, cost and status in one place, mirroring shopCatalog --
// js/ui.js stays a pure renderer with no purchase logic of its own.
export function prestigeTreeCatalog(state) {
  const { tokens } = state.prestige;
  const rows = [];
  for (const resource of RESOURCES) {
    const level = state.prestige.upgrades[resource];
    const cost = prestigeUpgradeCost(level);
    rows.push({ id: resource, branch: 'production', name: resourceLabel(resource), level, cost, status: tokens >= cost ? 'buy' : 'poor' });
  }
  const holdLevel = state.prestige.hold;
  const holdMaxed = holdLevel >= HOLD_COSTS.length;
  rows.push({
    id: 'hold', branch: 'comfort', name: 'Deeper hold', level: holdLevel, maxLevel: HOLD_COSTS.length,
    cost: holdMaxed ? 0 : HOLD_COSTS[holdLevel],
    status: holdMaxed ? 'maxed' : tokens >= HOLD_COSTS[holdLevel] ? 'buy' : 'poor',
  });
  const tidesLevel = state.prestige.tides;
  const tidesMaxed = tidesLevel >= TIDES_COSTS.length;
  rows.push({
    id: 'tides', branch: 'comfort', name: 'Steady tides', level: tidesLevel, maxLevel: TIDES_COSTS.length,
    cost: tidesMaxed ? 0 : TIDES_COSTS[tidesLevel],
    status: !holdMaxed ? 'locked' : tidesMaxed ? 'maxed' : tokens >= TIDES_COSTS[tidesLevel] ? 'buy' : 'poor',
  });
  const ballastLevel = state.prestige.ballast;
  const ballastPrice = ballastCost(state);
  rows.push({ id: 'ballast', branch: 'efficiency', name: 'Ballast', level: ballastLevel, cost: ballastPrice, status: tokens >= ballastPrice ? 'buy' : 'poor' });
  const hsLevel = state.prestige.headStart;
  const hsMaxed = hsLevel >= HEAD_START_MAX_LEVEL;
  rows.push({
    id: 'headStart', branch: 'headstart', name: 'Head start', level: hsLevel, maxLevel: HEAD_START_MAX_LEVEL,
    cost: hsMaxed ? 0 : headStartCost(hsLevel),
    status: hsMaxed ? 'maxed' : tokens >= headStartCost(hsLevel) ? 'buy' : 'poor',
  });
  return rows;
}
```

`resourceLabel` already exists in this file (state.js:43, a hoisted `function` declaration, module
-private, already used internally for achievement text at line 408) — call it directly, no import or
export needed.

- [ ] **Step 8: Run it, confirm it passes**

Run: `npm test`
Expected: `prestige tree comfort and efficiency tests passed`, plus every prior section. Note the
"gold shop" test (see Step 9) still fails at this point — that's expected, fixed next.

- [ ] **Step 9: Update the now-broken "gold shop" test to cosmetics only**

Find the existing `// --- gold shop ---` block in `tests/economy.test.mjs` (originally around line
1319-1412, now shifted later by Step 5's insertion). Replace its entire body with:

```js
// --- gold shop: cosmetics ---
{
  const s = createInitialState();
  assert.deepEqual(s.shop, { palette: 'default', palettes: [] });

  const p = createInitialState();
  p.gold = 100;
  assert.equal(buyShopItem(p, 'palette:lagoon'), true);
  assert.equal(p.gold, 94);
  assert.deepEqual(p.shop.palettes, ['lagoon']);
  assert.equal(p.shop.palette, 'lagoon', 'buying a palette also puts it on');
  assert.equal(buyShopItem(p, 'palette:lagoon'), false, 'already in use');
  assert.equal(buyShopItem(p, 'palette:dusk'), true);
  assert.equal(p.shop.palette, 'dusk');
  assert.equal(buyShopItem(p, 'palette:lagoon'), true, 'switching to one you own is free');
  assert.equal(p.gold, 88, 'nothing charged for switching');
  assert.equal(p.shop.palette, 'lagoon');
  assert.equal(buyShopItem(p, 'palette:default'), true, 'the classic look is always available');
  assert.equal(p.shop.palette, 'default');
  assert.equal(buyShopItem(p, 'palette:storm-nonsense'), false);
  assert.equal(buyShopItem(p, 'not-an-item'), false);
  assert.equal(buyShopItem(p, 'hold'), false, 'hold moved to the prestige tree, not a shop id anymore');
  assert.equal(buyShopItem(p, 'ballast'), false, 'so did ballast');
  const rows = shopCatalog(p);
  assert.ok(!rows.some((r) => ['hold', 'tides', 'ballast'].includes(r.id)), 'only palettes are left');
  assert.equal(rows.find((r) => r.id === 'palette:dusk').status, 'owned');
  assert.equal(rows.find((r) => r.id === 'palette:default').status, 'active');
  assert.equal(rows.find((r) => r.id === 'palette:storm').status, 'buy');

  // survives export/import, prestige, and a save from before the shop existed
  const kept = createInitialState();
  kept.shop = { palette: 'dusk', palettes: ['dusk'] };
  kept.gold = 9;
  const roundTrip = decodeSave(encodeSave(kept));
  assert.deepEqual(roundTrip.shop, kept.shop);
  const old = decodeSave(btoa(JSON.stringify({ version: 3, resources: {}, lifetime: {}, unlocked: ['driftwood_start'] })));
  assert.deepEqual(old.shop, createInitialState().shop, 'a save without a shop gets an empty one');
  for (const stale of [{ version: 1 }, { version: 2 }, {}]) {
    const v1 = btoa(JSON.stringify({ ...stale, resources: {}, lifetime: {}, unlocked: ['driftwood_start'] }));
    assert.equal(decodeSave(v1), null, 'a save from before the v3 bridges rework is rejected: the blank set and the crossings changed');
  }

  console.log('gold shop tests passed');
}
```

- [ ] **Step 10: Run it, confirm it passes**

Run: `npm test`
Expected: `gold shop tests passed`. Still failing: the "head start and prestige count" block (Step
11) references `f.shop.ballast` and asserts on the old shop shape.

- [ ] **Step 11: Fix the "head start and prestige count" block's two broken references**

Find (originally around line 1437): `f.shop.ballast = 7;` — change to `f.prestige.ballast = 7;`.

Find (originally around line 1450):

```js
assert.deepEqual(none.shop, { holdLevel: 0, tidesLevel: 0, palette: 'dusk', palettes: ['dusk'], ballast: 7 }, 'the shop is kept');
```

Change to:

```js
assert.deepEqual(none.shop, { palette: 'dusk', palettes: ['dusk'] }, 'the shop (cosmetics) is kept');
assert.equal(none.prestige.ballast, 7, 'ballast carries over through prestige');
```

- [ ] **Step 12: Implement the `normalizeSave` migration**

Read the current full bodies of `normalizeSave` and `normalizeShop` in `js/state.js` (quoted in this
plan's "Known-good facts" section) to confirm they still match before editing — they've been stable
since the map-v3-bridges rework, but confirm. Replace `normalizeSave`'s `prestige:` line and
`normalizeShop` with:

```js
function normalizeSave(parsed) {
  const looksValid =
    parsed &&
    typeof parsed === 'object' &&
    parsed.version === SAVE_VERSION &&
    parsed.resources &&
    parsed.lifetime &&
    Array.isArray(parsed.unlocked);
  if (!looksValid) return null;
  const base = createInitialState();
  return {
    ...base,
    ...parsed,
    resources: { ...base.resources, ...parsed.resources },
    lifetime: { ...base.lifetime, ...parsed.lifetime },
    levels: { ...base.levels, ...parsed.levels },
    prestige: normalizePrestige(parsed.prestige || {}, parsed.shop || {}, base.prestige),
    gold: parsed.gold ?? base.gold,
    achievements: [...(parsed.achievements || base.achievements)],
    shop: normalizeShop(parsed.shop, base.shop),
    // A save from before this toggle existed has no key here at all, so the merge leaves every
    // family at the base's default of enabled.
    generatorsEnabled: { ...base.generatorsEnabled, ...(parsed.generatorsEnabled || {}) },
  };
}

// A save from before the prestige tree rework kept Deeper Hold, Steady Tides and Ballast in `shop`,
// bought with gold; this rework moves them into `prestige`, bought with tokens. A legacy save's
// `shop.holdLevel`/`tidesLevel`/`ballast` is carried into the new `prestige.hold`/`tides`/`ballast`
// fields so a player doesn't lose progress they already paid gold for. A save already in the new
// shape (no `shop.holdLevel`) is untouched by the `??` fallback below.
function normalizePrestige(parsedPrestige, legacyShop, base) {
  const clamp = (value, max) => Math.min(max, Math.max(0, Math.floor(Number(value)) || 0));
  return {
    ...base,
    ...parsedPrestige,
    upgrades: { ...base.upgrades, ...(parsedPrestige.upgrades || {}) },
    hold: clamp(parsedPrestige.hold ?? legacyShop.holdLevel ?? base.hold, OFFLINE_CAP_HOURS.length - 1),
    tides: clamp(parsedPrestige.tides ?? legacyShop.tidesLevel ?? base.tides, OFFLINE_RATES.length - 1),
    ballast: clamp(parsedPrestige.ballast ?? legacyShop.ballast ?? base.ballast, Infinity),
  };
}

// A pasted or hand-edited save can hold anything, so the shop is clamped to what exists. Only
// cosmetics live here now -- Deeper Hold, Steady Tides and Ballast moved into `prestige` (see
// normalizePrestige above).
function normalizeShop(saved, base) {
  const shop = { ...base, ...(saved || {}) };
  shop.palettes = (Array.isArray(shop.palettes) ? shop.palettes : []).filter((id) => PALETTES[id]);
  if (shop.palette !== 'default' && !shop.palettes.includes(shop.palette)) shop.palette = 'default';
  return shop;
}
```

Note `normalizeShop` no longer needs its own `clamp` helper (moved into `normalizePrestige`) — if
nothing else in the file uses a same-named local `clamp`, removing it from `normalizeShop`'s scope
is safe; `normalizePrestige` declares its own.

- [ ] **Step 13: Update `doPrestige`'s carry-forward to include hold/tides/ballast**

Find `doPrestige`'s `nextState.prestige = {...}` assignment (state.js:459-464), currently:

```js
  nextState.prestige = {
    tokens: state.prestige.tokens + tokensEarned,
    upgrades: { ...state.prestige.upgrades },
    headStart: state.prestige.headStart,
    count: state.prestige.count + 1,
  };
```

Change to:

```js
  nextState.prestige = {
    tokens: state.prestige.tokens + tokensEarned,
    upgrades: { ...state.prestige.upgrades },
    headStart: state.prestige.headStart,
    hold: state.prestige.hold,
    tides: state.prestige.tides,
    ballast: state.prestige.ballast,
    count: state.prestige.count + 1,
  };
```

- [ ] **Step 14: Run the full test suite**

Run: `npm test`
Expected: every section passes, including the two new/rewritten ones from this task. Confirm no
other test file references `state.shop.holdLevel`/`tidesLevel`/`ballast` by searching
`tests/*.test.mjs` for those three strings — fix any stragglers the same way as Step 11.

- [ ] **Step 15: Commit**

```bash
git add js/state.js tests/economy.test.mjs
git commit -m "Task 1: prestige tree state model, gate, and purchase logic"
```

## Task 2: The prestige tree UI

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `js/ui.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `prestigeTreeCatalog(state)`, `buyTreeHold`, `buyTreeTides`, `buyTreeBallast`,
  `PRESTIGE_MIN_TOKENS`, `prestigeTokensEarned` (all from Task 1, already committed).
- Produces: nothing new for later tasks — this is the UI's terminal consumer.

This task has no red/green unit-test cycle (it's DOM rendering and event wiring, exercised visually,
matching how every other UI-only change in this project is verified). Read `js/ui.js`'s current
`initPrestige`/`updatePrestigeDisplay`/`wireHoldToRepeat`/`wireQuickBuyButtons` (quoted in this
plan's Known-good facts) and `index.html`'s current `#prestige-overlay` markup in full before
starting — this task replaces a meaningful chunk of both, and matching the surrounding code's exact
current shape matters more than any snippet below if the two have drifted.

- [ ] **Step 1: Replace `index.html`'s flat prestige store markup with the tree**

Replace the `#prestige-store` div's contents (currently the 8 `.store-row` divs, lines ~113-179)
with a tree container and an empty detail-panel slot the renderer fills in:

```html
<div id="prestige-store" class="hidden">
  <p id="prestige-store-tokens"></p>
  <div id="prestige-tree" role="group" aria-label="Prestige tree"></div>
  <div id="prestige-node-detail" class="hidden"></div>
  <button id="prestige-store-back-btn">Back</button>
</div>
```

`#prestige-tree` and `#prestige-node-detail` are built entirely from JS (Step 3) — no static markup
for individual nodes, since their count, position and state are all data-driven from
`prestigeTreeCatalog`. This mirrors how `#shop-list` already works for the Harbor Shop.

- [ ] **Step 2: Widen the prestige panel and add tree/node-detail styles in `style.css`**

`#prestige-panel` (lines 1016-1027) is currently a narrow (280-340px) fixed top-right box sized for
a short flat list. The tree needs real width for four branches (the approved mockup was ~700px).
Widen it (e.g. `min-width`/`max-width` closer to 600-720px, and reposition from a fixed top-right
corner to a centered overlay, consistent with how `#offline-panel`/other full overlays in this file
are centered — check `.hidden` overlay conventions already in this file for the pattern to match)
while keeping its existing color scheme (`rgba(16, 38, 58, 0.95)` background, `#f4ead2` text,
`#d9b545` gold accent, `#6b6b6b`/`#ccc` disabled). Add new rules for:
- `#prestige-tree`: a positioning context for the branch nodes (either an inline `<svg>` for
  connector lines plus absolutely-positioned node buttons, or a CSS-grid/flex layout with border
  lines — implementer's choice, following whichever pattern is less code given this file has no
  existing precedent for a node-graph; the approved mockup used SVG connector lines with `<circle>`/
  `<rect>` nodes and can be used as a direct visual reference).
- A per-node visual state: `maxed` (green, e.g. `#8fe0a0` border), `buy` (gold `#d9b545` border,
  matching existing affordable styling elsewhere in this file), `poor`/`locked` (muted, e.g.
  `#6b6b6b`/`#7fa0b3`, matching existing disabled styling).
- `#prestige-node-detail`: a panel below the tree matching `.store-row`'s existing button styling
  (`#prestige-panel .store-row button` at lines 1116-1134) for the +1/+5/+10 buttons, reused as-is
  for uncapped nodes; a single full-width button (matching `#prestige-action-btn`'s style) for
  Hold/Tides' "buy next tier".

Remove the now-unused `.store-row`/`.store-icon` rules (lines 1095-1134) only once Step 3 confirms
nothing else references them (the Harbor Shop uses `.shop-item`/`.shop-info`, a different class
family, untouched by this task).

- [ ] **Step 3: Rewrite `js/ui.js`'s prestige rendering**

Read `initPrestige` (ui.js:779-871) and `updatePrestigeDisplay` (ui.js:877-911) in full current
form first. Replace the per-resource/head-start row setup (the `for (const resource of RESOURCES)`
loop building `elements.storeRows`, and `elements.headStartRow`, lines 792-810) with:

- `elements.prestigeTree = document.getElementById('prestige-tree');`
- `elements.prestigeNodeDetail = document.getElementById('prestige-node-detail');`
- A `selectedNodeId` variable (module-scoped inside `initPrestige`, like `loadArmed` is inside
  `initMenu`) tracking which node's detail panel is open, `null` initially.
- A `renderTree()` function: clears `elements.prestigeTree`, calls `prestigeTreeCatalog(elements.
  lastState)`, and for each row renders one clickable node element (icon via `RESOURCE_ICONS[row.id]`
  for the 7 production rows, a suitable label/icon for `hold`/`tides`/`ballast`/`headStart`) styled
  per its `status` (Step 2's CSS classes), with a click handler that sets `selectedNodeId = row.id`
  and calls `renderNodeDetail()`.
- A `renderNodeDetail()` function: if `selectedNodeId` is null, hides `#prestige-node-detail`;
  otherwise finds that row in the fresh catalog, shows the panel with its name/level/cost, and
  either:
  - for `hold`/`tides` (branch `'comfort'`, no quantity): a single button, disabled when `status !==
    'buy'`, calling `onBuyUpgrade(row.id, 1)` on click (the dispatcher already loops `qty` times and
    stops on first failure, so `qty=1` here is correct and sufficient — these never have a
    meaningful "buy 5" since each tier costs more than the last and there are only 2-3 tiers total).
  - for every other node (branch `'production'`, `'efficiency'`, `'headstart'`, all uncapped): the
    existing `wireQuickBuyButtons`/`wireHoldToRepeat` pattern, wired fresh each time the detail panel
    opens for a new node (or wired once per possible node id if the detail panel reuses a fixed set
    of DOM buttons across selections — implementer's choice; the simplest correct approach is
    rebuilding the detail panel's DOM on each `renderNodeDetail()` call and wiring
    `wireQuickBuyButtons` fresh each time, exactly as `renderShop` already rebuilds `#shop-list` from
    scratch on every call).
- Both `renderTree()` and `renderNodeDetail()` get called together whenever the tree needs a
  refresh (on open, after any purchase, and after `onRefresh`), replacing today's per-row DOM
  mutation in `updatePrestigeDisplay` (which only ever mutates existing elements in place — the tree
  can follow `renderShop`'s simpler "clear and rebuild" pattern instead, since the node count is
  small and doesn't need count-up animation the way the resource bar does).
- **Scoping note:** unlike `renderShop` (defined inside `initMenu` and only ever called from event
  handlers also defined inside `initMenu`), `updatePrestigeDisplay` is a separate top-level exported
  function (ui.js:877) called from `js/main.js` — it cannot directly call a `renderTree`/
  `renderNodeDetail` that's merely a local closure inside `initPrestige`. Stash them on the shared
  module-level `elements` object instead (`elements.renderPrestigeTree = renderTree;` /
  `elements.renderPrestigeNodeDetail = renderNodeDetail;`, set once inside `initPrestige`, right
  alongside where `elements.prestigeTree`/`elements.prestigeNodeDetail` are assigned), the same way
  `elements.storeRows`/`elements.headStartRow` already bridge `initPrestige`'s closure to
  `updatePrestigeDisplay` today. `updatePrestigeDisplay` then calls
  `elements.renderPrestigeTree(); elements.renderPrestigeNodeDetail();`.

Update `updatePrestigeDisplay` (ui.js:877-911): replace its `isFullyComplete`/`completionCount`-based
gating (lines 878-884) with:

```js
export function updatePrestigeDisplay(state) {
  const tokens = prestigeTokensEarned(state);
  const eligible = tokens >= PRESTIGE_MIN_TOKENS;
  elements.pendingPrestigeTokens = eligible ? tokens : 0;
  elements.prestigeActionBtn.disabled = !eligible;
  elements.prestigeActionBtn.textContent = eligible
    ? `Prestige (+${elements.pendingPrestigeTokens} tokens)`
    : 'Prestige (not yet — earn more first)';

  elements.prestigeStoreTokens.textContent = `Tokens: ${state.prestige.tokens}`;
  elements.renderPrestigeTree();
  elements.renderPrestigeNodeDetail();
}
```

Remove the rest of the old function body (the per-resource loop and the Head Start block, lines
886-910) — their logic moves into `renderTree`/`renderNodeDetail` above, driven by
`prestigeTreeCatalog` instead of hand-computed per-row math.

Import `prestigeTreeCatalog`, `buyTreeHold`, `buyTreeTides`, `buyTreeBallast`, `PRESTIGE_MIN_TOKENS`
into `js/ui.js`'s existing import list from `../js/state.js` (alongside `prestigeTokensEarned`,
`HEAD_START_MAX_LEVEL`, `headStartCost`, `prestigeUpgradeCost`, `RESOURCES`, `isFullyComplete`,
`completionCount`, `TOTAL_TILE_COUNT` — drop any of these four that become unused after this task,
confirm with a search before removing).

- [ ] **Step 4: Extend `js/main.js`'s purchase dispatcher**

Find `initPrestige`'s second callback (main.js:148-166), currently:

```js
  (upgrade, qty = 1) => {
    const tokensBefore = state.prestige.tokens;
    let purchases = 0;
    for (let i = 0; i < qty; i++) {
      const success = upgrade === 'headStart' ? buyHeadStart(state) : buyPrestigeUpgrade(state, upgrade);
      if (!success) break;
      purchases++;
    }
```

Change the ternary to a small lookup so `'hold'`/`'tides'`/`'ballast'` route correctly:

```js
  (upgrade, qty = 1) => {
    const tokensBefore = state.prestige.tokens;
    const buyers = { headStart: buyHeadStart, hold: buyTreeHold, tides: buyTreeTides, ballast: buyTreeBallast };
    const buy = buyers[upgrade] ?? ((s) => buyPrestigeUpgrade(s, upgrade));
    let purchases = 0;
    for (let i = 0; i < qty; i++) {
      const success = buy(state);
      if (!success) break;
      purchases++;
    }
```

Add `buyTreeHold, buyTreeTides, buyTreeBallast` to `js/main.js`'s existing import list from
`./state.js` (alongside `buyHeadStart`, `buyPrestigeUpgrade`).

- [ ] **Step 5: Manual browser verification**

Serve the game locally (never port 4173). Using the project's established safe save-injection
pattern (stub `Storage.prototype.setItem` to a no-op, write a save via the captured original
`setItem`, then `location.reload()` in the same script), seed a save with `prestige.tokens` around
200 and a couple of production upgrades already bought, then open the Prestige overlay and confirm:

- The tree renders all 11 nodes across four visually distinct branches, with correct icons
  (production lanes use the same emoji as the resource bar/`RESOURCE_ICONS`).
- Clicking a production node opens its detail panel with working +1/+5/+10 buttons; holding one down
  past ~400ms repeats the purchase every ~90ms (matching the existing feel elsewhere in the game).
- Clicking Deeper Hold shows a single "buy next tier" button, no quantity buttons; after maxing all
  3 tiers, Steady Tides becomes clickable/buyable (it should show as locked/disabled before that).
- Ballast and Head Start behave like the production nodes (quantity buttons, hold-to-repeat).
- With `prestige.tokens` at 0 and every node unaffordable, nodes show their "poor" (not "locked")
  state except Tides before Hold is maxed, which shows "locked".
- The Prestige button is disabled with a fresh save (0 lifetime resources) and enables once lifetime
  resources cross 1000 total, without requiring any tiles to be unlocked/maxed.
- The Harbor Shop (separate menu entry) now shows only palettes — no Deeper Hold/Steady
  Tides/Ballast rows.
- Console is clean throughout; `npm test` still passes (should be unaffected by this UI-only task).

- [ ] **Step 6: Commit**

```bash
git add index.html style.css js/ui.js js/main.js
git commit -m "Task 2: prestige tree UI"
```

## Task 3: Version bump, docs, final verification

**Files:**
- Modify: `js/version.js`
- Modify: `memory-bank/architecture-notes.md`, `memory-bank/project-overview.md` (only if they
  mention prestige/shop mechanics that changed — read both first; only `project-overview.md`'s
  gold/prestige bullet and `architecture-notes.md`'s `js/state.js` module description are expected
  to need updates, based on a read of both files before this plan was written)

**Interfaces:** none new — this task only touches constants and docs.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: every section passes (unchanged from Task 1/2's end state — this task makes no logic
changes).

- [ ] **Step 2: Full-flow browser verification**

Serve the game locally (never port 4173), start a completely fresh game, and confirm end-to-end:
play or seed enough lifetime resources to cross the 1000 floor, prestige, confirm the tree opens
showing the earned tokens, buy a production upgrade and Ballast with the hold-to-repeat +5 button,
confirm both persist through a second prestige, confirm the Harbor Shop still sells palettes with
gold earned from achievements. Console clean throughout.

- [ ] **Step 3: Bump the version**

In `js/version.js`, bump MINOR (this is new, player-visible mechanic and UI) and reset PATCH to 0 —
read the file first for its exact current value (expected `2.2.0` after the map-v3-bridges rework)
and comment style, then set the new version to the next MINOR after whatever is there now (expected
`2.3.0`).

- [ ] **Step 4: Update the docs**

Read `memory-bank/architecture-notes.md`'s `js/state.js` bullet and `memory-bank/project-overview.md`
in full before editing — quote their exact current prestige/shop-related sentences here is not done
in this plan because their precise current wording wasn't re-verified after Task 1/2 landed (unlike
the rest of this plan, which was written against a specific verified commit). Update whatever
sentences describe: the old `isFullyComplete` prestige gate (now the token floor), the flat
"Prestige Store" (now the tree), and the Harbor Shop selling Deeper Hold/Steady Tides/Ballast (now
cosmetics only). Match each file's existing style; don't rewrite unrelated sections.

- [ ] **Step 5: Commit**

```bash
git add js/version.js memory-bank/architecture-notes.md memory-bank/project-overview.md
git commit -m "Task 3: version bump and docs for the prestige tree"
```

## Final verification (run by whoever finishes this plan, after all 3 tasks)

- `npm test` passes in full.
- A fresh browser session: play to 1000+ lifetime resources, prestige before the map is anywhere
  near complete, spend tokens across all four branches including maxing Deeper Hold to unlock Steady
  Tides, prestige again, confirm every purchased level persisted. Console clean throughout.
- Confirm the Harbor Shop no longer offers Deeper Hold, Steady Tides, or Ballast anywhere in its UI
  or `shopCatalog` output.
- Confirm a save built in the old shape (`shop.holdLevel`/`tidesLevel`/`ballast` present) still loads
  and its levels land in the new `prestige` fields (this is covered by Task 1's tests, but worth one
  manual check via the browser console's save-injection pattern too).

## Known limitations (carry into the finishing conversation, don't silently fix)

- Deeper Hold/Steady Tides/Ballast's token prices (6/12/20, 8/16, 4+2n) were sized for gold, which is
  earned far more slowly than tokens. Carried over unchanged per the spec's Non-goals; almost
  certainly too cheap in token terms once real play data exists.
- No deep balance simulation of how quickly a player can now prestige repeatedly at low token
  counts, or whether the 1000-lifetime-resource floor is meaningfully above "an accidental first
  click."
- Ballast's tree node gained +1/+5/+10 hold-to-repeat controls it didn't have as a Harbor Shop row
  (a small interaction upgrade, not a strict carryover) — flagged in the spec's "Open items," not
  reconsidered during implementation unless the finishing conversation raises it.
