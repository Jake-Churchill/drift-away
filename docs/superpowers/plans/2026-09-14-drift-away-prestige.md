# Drift Away Prestige Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player who has fully completed the game (all 36 tiles unlocked and at level 3) reset their farm for a permanent, persistent token currency spent on a small store of permanent production upgrades.

**Architecture:** All new logic is pure economy math added to `js/state.js` (data model, completion tracking, the reset itself, the upgrade store), threaded through the existing `effectiveRate`/`effectiveTileRate` functions exactly the way tile levels and boosters already are. The UI is three new sub-views inside the existing menu overlay (`index.html`/`style.css`/`js/ui.js`), wired up from `js/main.js` following the same callback pattern the Restart flow already established.

**Tech Stack:** Vanilla ES modules, no build step, no framework. Node's built-in `assert` for economy-math tests (`npm test`). Manual browser verification for anything touching the DOM (this project has no DOM test harness).

**Spec:** `docs/superpowers/specs/2026-09-14-drift-away-prestige-design.md`

## Global Constraints

- No new resource type or tile tier. Prestige upgrades affect production **rate** only — never unlock costs or level-up costs.
- Full reset only: prestiging always returns `resources`, `lifetime`, `unlocked`, and `levels` to exactly `createInitialState()`'s defaults. Only `prestige.tokens` and `prestige.upgrades` persist across a reset.
- No cap on the number of times a player can prestige, and no cap on how many times a single upgrade can be purchased — the escalating token cost is the only brake.
- `js/scene.js` and `js/render.js` are out of scope for this plan — no new 3D art, no changes to the 3D scene.
- Balance constants are first-pass, not playtested — same convention already used for `PRODUCER_UPGRADE_BASE`/`BOOSTER_UPGRADE_BASE` in `js/state.js`: `PRESTIGE_TOKEN_DIVISOR = 1000`, `PRESTIGE_UPGRADE_BASE_COST = 5`, `PRESTIGE_UPGRADE_PERCENT = 10`.
- Pure economy math (`js/state.js`) is unit-tested in Node via `tests/economy.test.mjs`. Anything touching the DOM (`js/ui.js`, `js/main.js`, `index.html`, `style.css`) is verified manually in the browser — there is no DOM test harness in this project.
- **When manually testing anything that depends on a stale `localStorage` value** (as in Task 1's verification): edit `localStorage` and reload in a **second browser tab**, not the same tab. The existing page's `beforeunload` handler calls `saveState`, which re-stamps a fresh value and overwrites an injected one the instant you navigate the same tab away.

---

### Task 1: Prestige data model

**Files:**
- Modify: `js/state.js:11-16` (`createInitialState`), `js/state.js:142-168` (`loadState`)
- Test: `tests/economy.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `createInitialPrestige()` returning `{ tokens: 0, upgrades: { fish: 0, kelp: 0, driftwood: 0, crops: 0 } }`. `createInitialState()`'s return value gains a `prestige` field with that shape. `loadState()`'s returned state always has a well-formed `prestige` field, even when loading a save written before this feature existed.

- [ ] **Step 1: Write the failing test**

Add to `tests/economy.test.mjs`, immediately after the existing `--- createInitialState ---` block (currently lines 128-144, ending with `assert.deepEqual(state.levels, {}, 'no tile starts above level 1');` and its closing `}`):

```js
{
  const state = createInitialState();
  assert.deepEqual(
    state.prestige,
    { tokens: 0, upgrades: { fish: 0, kelp: 0, driftwood: 0, crops: 0 } },
    'a fresh game starts with zero prestige tokens and no upgrades purchased'
  );
}
```

No new imports are needed for this test — it only calls the already-imported `createInitialState`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `assert.deepEqual` reports a mismatch because `state.prestige` is `undefined`, not the expected object.

- [ ] **Step 3: Write minimal implementation**

In `js/state.js`, replace the current `createInitialState` (lines 11-16):

```js
export function createInitialState() {
  const resources = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  const lifetime = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  const unlocked = TILES.filter((t) => t.unlock.type === 'start').map((t) => t.id);
  return { version: 1, resources, lifetime, unlocked, levels: {} };
}
```

with:

```js
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, and every previously-passing assertion still passes.

- [ ] **Step 5: Extend `loadState`'s defensive merge (no Node test — `loadState` needs `localStorage`, which doesn't exist under plain `node`; this is verified manually in Step 6)**

In `js/state.js`, `loadState` currently builds its merged state like this (lines 154-161):

```js
    const base = createInitialState();
    const state = {
      ...base,
      ...parsed,
      resources: { ...base.resources, ...parsed.resources },
      lifetime: { ...base.lifetime, ...parsed.lifetime },
      levels: { ...base.levels, ...parsed.levels },
    };
```

Replace it with:

```js
    const base = createInitialState();
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

This mirrors the existing `levels` merge exactly: an old save with no `prestige` field at all gets the full default; a save with a partial `upgrades` object (e.g. missing a resource key added in a later version) still gets zeros for anything missing.

- [ ] **Step 6: Manually verify the `loadState` merge in the browser**

1. `preview_start` the `drift-away` dev server and open it.
2. In the browser devtools console (or via the `javascript_tool`), simulate an old, pre-prestige save by writing a state object with no `prestige` field at all:
   ```js
   localStorage.setItem('driftaway_save_v1', JSON.stringify({
     version: 1,
     resources: { fish: 0, kelp: 0, driftwood: 0, crops: 5 },
     lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 5 },
     unlocked: ['driftwood_start'],
     levels: {},
   }));
   ```
3. Reload the page (same tab is fine here — there's no `lastSaved` timestamp involved in this check, so the `beforeunload` caveat doesn't apply).
4. Confirm the page loads with no console errors, and that
   `JSON.parse(localStorage.getItem('driftaway_save_v1')).prestige` (read after the page has had a moment to run) is `{ tokens: 0, upgrades: { fish: 0, kelp: 0, driftwood: 0, crops: 0 } }`.
5. Stop the preview server.

- [ ] **Step 7: Commit**

```bash
git add js/state.js tests/economy.test.mjs
git commit -m "Add a persistent prestige field to the game state

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Completion tracking

**Files:**
- Modify: `js/state.js` (add near `getLevel`/`MAX_LEVEL`, after line 63)
- Test: `tests/economy.test.mjs`

**Interfaces:**
- Consumes: `TILES` (already imported in `state.js`), `getLevel`, `MAX_LEVEL` (both already in `state.js`).
- Produces: `TOTAL_TILE_COUNT: number` (= 36), `completionCount(state): number`, `isFullyComplete(state): boolean`.

- [ ] **Step 1: Write the failing test**

Add to `tests/economy.test.mjs`, after the `applyOfflineProgress` section (after the line `console.log('offline progress tests passed');`, before `// --- unlockTile ---`):

```js
// --- completionCount / isFullyComplete ---

{
  const state = createInitialState();
  assert.equal(completionCount(state), 0, 'a fresh game has zero maxed tiles');
  assert.equal(isFullyComplete(state), false, 'a fresh game is not fully complete');
}

{
  const state = createInitialState();
  state.unlocked = TILES.map((t) => t.id);
  for (const t of TILES) state.levels[t.id] = MAX_LEVEL;
  assert.equal(completionCount(state), 36, 'every tile unlocked and maxed counts as complete');
  assert.equal(isFullyComplete(state), true, 'fully complete once every tile is unlocked and maxed');
}

{
  const state = createInitialState();
  state.unlocked = TILES.map((t) => t.id);
  for (const t of TILES) state.levels[t.id] = MAX_LEVEL;
  state.levels[TILES[0].id] = 1;
  assert.equal(completionCount(state), 35, 'one non-maxed tile is excluded from the count');
  assert.equal(isFullyComplete(state), false, 'not fully complete until every tile is maxed');
}

console.log('completion tracking tests passed');
```

Add `completionCount` and `isFullyComplete` to the top-of-file import list from `'../js/state.js'`. Also add `MAX_LEVEL` to that same import list — the test body above uses it directly, and it isn't currently imported anywhere in this file (it's an existing export of `state.js`, just never previously needed here).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — import error, `completionCount`/`isFullyComplete` are not exported yet.

- [ ] **Step 3: Write minimal implementation**

In `js/state.js`, add immediately after `getLevel` (currently lines 61-63):

```js
export const TOTAL_TILE_COUNT = TILES.length;

export function completionCount(state) {
  return TILES.filter((t) => state.unlocked.includes(t.id) && getLevel(state, t.id) >= MAX_LEVEL).length;
}

export function isFullyComplete(state) {
  return completionCount(state) === TOTAL_TILE_COUNT;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, all suites green.

- [ ] **Step 5: Commit**

```bash
git add js/state.js tests/economy.test.mjs
git commit -m "Add completion tracking for the prestige gate

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Token formula and reset

**Files:**
- Modify: `js/state.js` (add near `createInitialPrestige`/`isFullyComplete`)
- Test: `tests/economy.test.mjs`

**Interfaces:**
- Consumes: `RESOURCES`, `createInitialState`, `isFullyComplete` (Task 2).
- Produces: `PRESTIGE_TOKEN_DIVISOR: number`, `prestigeTokensEarned(state): number`, `doPrestige(state): { state, tokensEarned } | null` — a pure function; does not mutate its argument.

- [ ] **Step 1: Write the failing test**

Add to `tests/economy.test.mjs`, after the `completionCount / isFullyComplete` section:

```js
// --- prestigeTokensEarned / doPrestige ---

{
  const state = createInitialState();
  state.lifetime = { fish: 500, kelp: 500, driftwood: 1000, crops: 1000 };
  assert.equal(prestigeTokensEarned(state), 3, 'floor((500+500+1000+1000) / 1000) = 3');
}

{
  const state = createInitialState(); // not fully complete
  const result = doPrestige(state);
  assert.equal(result, null, 'prestige is refused before full completion');
}

{
  const state = createInitialState();
  state.unlocked = TILES.map((t) => t.id);
  for (const t of TILES) state.levels[t.id] = MAX_LEVEL;
  state.lifetime = { fish: 1000, kelp: 1000, driftwood: 1000, crops: 1000 };
  state.prestige.tokens = 7; // simulate a prior prestige
  state.prestige.upgrades.fish = 2;
  const resourcesBefore = { ...state.resources };

  const result = doPrestige(state);

  assert.ok(result, 'prestige succeeds once fully complete');
  assert.equal(result.tokensEarned, 4, 'floor(4000 / 1000) = 4');
  assert.equal(result.state.prestige.tokens, 11, 'earned tokens add to the carried-over balance (7 + 4)');
  assert.deepEqual(
    result.state.prestige.upgrades,
    { fish: 2, kelp: 0, driftwood: 0, crops: 0 },
    'purchased upgrades carry over unchanged'
  );
  assert.deepEqual(result.state.resources, { fish: 0, kelp: 0, driftwood: 0, crops: 0 }, 'resources reset');
  assert.deepEqual(result.state.lifetime, { fish: 0, kelp: 0, driftwood: 0, crops: 0 }, 'lifetime totals reset');
  assert.deepEqual(result.state.unlocked, ['driftwood_start'], 'unlocked tiles reset to just the start tile');
  assert.deepEqual(result.state.levels, {}, 'levels reset');
  assert.deepEqual(state.resources, resourcesBefore, 'the input state object is not mutated');
}

console.log('prestige reset tests passed');
```

Add `prestigeTokensEarned` and `doPrestige` to the top-of-file import list.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — import error, neither function is exported yet.

- [ ] **Step 3: Write minimal implementation**

In `js/state.js`, add immediately after `isFullyComplete` (from Task 2):

```js
export const PRESTIGE_TOKEN_DIVISOR = 1000; // first-pass constant, not playtested

export function prestigeTokensEarned(state) {
  const total = RESOURCES.reduce((sum, r) => sum + state.lifetime[r], 0);
  return Math.floor(total / PRESTIGE_TOKEN_DIVISOR);
}

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, all suites green.

- [ ] **Step 5: Commit**

```bash
git add js/state.js tests/economy.test.mjs
git commit -m "Add the prestige token formula and reset

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Upgrade store math

**Files:**
- Modify: `js/state.js` (add near `doPrestige`)
- Test: `tests/economy.test.mjs`

**Interfaces:**
- Consumes: nothing new beyond what's already in `state.js`.
- Produces: `PRESTIGE_UPGRADE_BASE_COST: number`, `PRESTIGE_UPGRADE_PERCENT: number`, `prestigeUpgradeCost(currentCount): number`, `buyPrestigeUpgrade(state, resource): boolean` — mutates `state` in place on success, same convention as `unlockTile`/`levelUpTile`.

- [ ] **Step 1: Write the failing test**

Add to `tests/economy.test.mjs`, after the `prestigeTokensEarned / doPrestige` section:

```js
// --- prestigeUpgradeCost / buyPrestigeUpgrade ---

{
  assert.equal(prestigeUpgradeCost(0), 5, 'first purchase costs the base amount');
  assert.equal(prestigeUpgradeCost(1), 10, 'second purchase costs 2x base');
  assert.equal(prestigeUpgradeCost(4), 25, 'fifth purchase costs 5x base');
}

{
  const state = createInitialState();
  state.prestige.tokens = 5;
  const ok = buyPrestigeUpgrade(state, 'fish');
  assert.equal(ok, true, 'purchase succeeds when affordable');
  assert.equal(state.prestige.tokens, 0, 'cost is deducted');
  assert.equal(state.prestige.upgrades.fish, 1, 'purchase count incremented');
}

{
  const state = createInitialState();
  state.prestige.tokens = 4; // one short of the base cost of 5
  const ok = buyPrestigeUpgrade(state, 'fish');
  assert.equal(ok, false, 'purchase fails when not affordable');
  assert.equal(state.prestige.tokens, 4, 'tokens unchanged on failure');
  assert.equal(state.prestige.upgrades.fish, 0, 'purchase count unchanged on failure');
}

console.log('prestige store tests passed');
```

Add `prestigeUpgradeCost` and `buyPrestigeUpgrade` to the top-of-file import list.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — import error, neither function is exported yet.

- [ ] **Step 3: Write minimal implementation**

In `js/state.js`, add immediately after `doPrestige` (from Task 3):

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, all suites green.

- [ ] **Step 5: Commit**

```bash
git add js/state.js tests/economy.test.mjs
git commit -m "Add the prestige upgrade store's cost math

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Thread prestige upgrades into production math

**Files:**
- Modify: `js/state.js:30-40` (`effectiveRate`, `effectiveTileRate`), `js/state.js` (`tick`, `applyOfflineProgress` call sites), `js/ui.js:98-103` (`describeProduction`)
- Test: `tests/economy.test.mjs`

**Interfaces:**
- Consumes: `PRESTIGE_UPGRADE_PERCENT` (Task 4).
- Produces: `effectiveRate(resource, unlockedIds, levels = {}, prestigeUpgrades = {})` and `effectiveTileRate(tile, unlockedIds, levels = {}, prestigeUpgrades = {})` — both gain a 4th, optional, trailing parameter; every existing call and test that omits it keeps working unchanged because it defaults to `{}`.

- [ ] **Step 1: Write the failing test**

Add to `tests/economy.test.mjs`, after the `prestigeUpgradeCost / buyPrestigeUpgrade` section:

```js
// --- prestige upgrades feeding effectiveRate / effectiveTileRate / tick / applyOfflineProgress ---

{
  const unlocked = ['fish_start'];
  const prestigeUpgrades = { fish: 2 }; // +20%
  assert.equal(
    effectiveRate('fish', unlocked, {}, prestigeUpgrades),
    1.2,
    'two fish upgrades add +20% on top of the base rate'
  );
}

{
  const unlocked = ['fish_start', 'booster_smokehouse'];
  const levels = { fish_start: 2 };
  const prestigeUpgrades = { fish: 1 }; // +10%
  assert.equal(
    effectiveRate('fish', unlocked, levels, prestigeUpgrades),
    1.5 * 1.25 * 1.1,
    'level, booster, and prestige multipliers all stack multiplicatively'
  );
}

{
  const tile = TILES.find((t) => t.id === 'fish_start');
  assert.equal(
    effectiveTileRate(tile, ['fish_start'], {}, { fish: 3 }),
    1.3,
    "three fish upgrades add +30% to the tile's own effective rate"
  );
}

{
  const state = {
    unlocked: ['fish_start'],
    resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    levels: {},
    prestige: { tokens: 0, upgrades: { fish: 2, kelp: 0, driftwood: 0, crops: 0 } },
  };
  tick(state, 10);
  assert.equal(state.resources.fish, 12, 'tick applies the prestige-boosted rate: 1.0 * 1.2 * 10s');
}

{
  const state = {
    unlocked: ['fish_start'],
    resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    levels: {},
    prestige: { tokens: 0, upgrades: { fish: 2, kelp: 0, driftwood: 0, crops: 0 } },
  };
  const result = applyOfflineProgress(state, 100);
  assert.equal(result.gains.fish, 1.2 * 100 * 0.5, 'offline progress applies the prestige-boosted rate too');
}

console.log('prestige production integration tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — the first three assertions fail because `effectiveRate`/`effectiveTileRate` don't accept a 4th parameter yet (it's silently ignored and has no effect, so the computed values come out lower than expected); the `tick`/`applyOfflineProgress` assertions fail for the same underlying reason.

- [ ] **Step 3: Write minimal implementation**

In `js/state.js`, replace the current `effectiveRate` and `effectiveTileRate` (lines 30-40):

```js
export function effectiveRate(resource, unlockedIds, levels = {}) {
  const baseSum = TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'producer' && t.produces === resource)
    .reduce((sum, t) => sum + t.rate * levelMultiplier(levels[t.id] || 1), 0);
  return baseSum * (1 + boostPercentFor(resource, unlockedIds, levels) / 100);
}

export function effectiveTileRate(tile, unlockedIds, levels = {}) {
  const level = levels[tile.id] || 1;
  return tile.rate * levelMultiplier(level) * (1 + boostPercentFor(tile.produces, unlockedIds, levels) / 100);
}
```

with:

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

Note `PRESTIGE_UPGRADE_PERCENT` is defined further down the file (Task 4); since these are all top-level `function`/`const` declarations evaluated at module load and JavaScript hoists `const` bindings within the module's temporal scope before execution of any function body, the physical ordering of these declarations in the file doesn't matter — only that both exist somewhere in the module by the time `effectiveRate`/`effectiveTileRate` are actually *called*, which they aren't until after the whole module has loaded.

Next, update `tick`'s and `applyOfflineProgress`'s calls to `effectiveRate`. `tick` currently reads (lines 110-117):

```js
export function tick(state, dt) {
  for (const resource of RESOURCES) {
    const amount = effectiveRate(resource, state.unlocked, state.levels) * dt;
    state.resources[resource] += amount;
    state.lifetime[resource] += amount;
  }
  return state;
}
```

Change the `effectiveRate` call to:

```js
    const amount = effectiveRate(resource, state.unlocked, state.levels, state.prestige.upgrades) * dt;
```

`applyOfflineProgress` currently reads (lines 97-108):

```js
export function applyOfflineProgress(state, elapsedSeconds) {
  if (elapsedSeconds < MIN_OFFLINE_SECONDS) return null;
  const seconds = Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS);
  const gains = {};
  for (const resource of RESOURCES) {
    const amount = effectiveRate(resource, state.unlocked, state.levels) * seconds * OFFLINE_RATE;
    state.resources[resource] += amount;
    state.lifetime[resource] += amount;
    gains[resource] = amount;
  }
  return { gains, seconds };
}
```

Change its `effectiveRate` call the same way:

```js
    const amount = effectiveRate(resource, state.unlocked, state.levels, state.prestige.upgrades) * seconds * OFFLINE_RATE;
```

Finally, in `js/ui.js`, `describeProduction` currently reads (lines 98-103):

```js
function describeProduction(tile, state) {
  const level = getLevel(state, tile.id);
  return tile.kind === 'producer'
    ? `Produces ${Number(effectiveTileRate(tile, state.unlocked, state.levels).toFixed(2))} ${tile.produces}/s`
    : tile.boosts.map((b) => `+${Number((b.percent * levelMultiplier(level)).toFixed(2))}% ${b.resource}`).join(', ');
}
```

Change its `effectiveTileRate` call to:

```js
    ? `Produces ${Number(effectiveTileRate(tile, state.unlocked, state.levels, state.prestige.upgrades).toFixed(2))} ${tile.produces}/s`
```

**Also fix one pre-existing test that this change would otherwise break.** `applyOfflineProgress` now unconditionally reads `state.prestige.upgrades`, but one existing hand-built (not `createInitialState()`-derived) test state — added when offline progress was built, before `prestige` existed — has no `prestige` field at all. In `tests/economy.test.mjs`, this block currently reads:

```js
{
  // boosters and levels feed into offline gains the same way they feed effectiveRate
  const state = {
    unlocked: ['fish_start', 'booster_smokehouse'],
    resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    levels: {},
  };
  const result = applyOfflineProgress(state, 100);
  assert.equal(result.gains.fish, 62.5, 'smokehouse-boosted rate (1.25) * 100s * 50% offline rate');
}
```

Add a `prestige` field matching every other synthetic state object's shape:

```js
{
  // boosters and levels feed into offline gains the same way they feed effectiveRate
  const state = {
    unlocked: ['fish_start', 'booster_smokehouse'],
    resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    lifetime: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    levels: {},
    prestige: { tokens: 0, upgrades: { fish: 0, kelp: 0, driftwood: 0, crops: 0 } },
  };
  const result = applyOfflineProgress(state, 100);
  assert.equal(result.gains.fish, 62.5, 'smokehouse-boosted rate (1.25) * 100s * 50% offline rate');
}
```

Without this fix, Step 4 below would fail on a test this task didn't intend to touch.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, all suites green — including every pre-existing `effectiveRate`/`effectiveTileRate`/`tick` assertion that calls these functions with fewer arguments (they must keep passing unchanged, since the new parameter defaults to `{}`), and the pre-existing `applyOfflineProgress` test just updated above.

- [ ] **Step 5: Manually verify the tile panel reflects prestige upgrades**

1. `preview_start` the `drift-away` dev server and open it.
2. Inject a save with a prestige upgrade already purchased and reload:
   ```js
   const state = JSON.parse(localStorage.getItem('driftaway_save_v1')) || {};
   state.prestige = { tokens: 0, upgrades: { fish: 0, kelp: 0, driftwood: 2, crops: 0 } };
   state.unlocked = ['driftwood_start'];
   state.levels = {};
   localStorage.setItem('driftaway_save_v1', JSON.stringify(state));
   ```
3. Reload the page, click the driftwood tile (the raft in the middle), and confirm the tile panel's "Produces ... driftwood/s" line reads `0.5 * 1.2 = 0.6` (two +10% upgrades), not the un-boosted `0.5`.
4. Stop the preview server.

- [ ] **Step 6: Commit**

```bash
git add js/state.js js/ui.js tests/economy.test.mjs
git commit -m "Apply prestige upgrades to production rate everywhere it's computed

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Prestige and Store menu UI

**Files:**
- Modify: `index.html` (menu overlay markup), `style.css` (new styles), `js/ui.js:1` (imports), `js/ui.js:98-103` (already done in Task 5), `js/ui.js:146-184` (`initMenu`, add `updateMenuDisplay`), `js/main.js` (imports, `initMenu` call site)

**Interfaces:**
- Consumes: `completionCount`, `isFullyComplete`, `TOTAL_TILE_COUNT`, `prestigeTokensEarned`, `doPrestige`, `prestigeUpgradeCost`, `buyPrestigeUpgrade`, `PRESTIGE_UPGRADE_PERCENT` (Tasks 2-5).
- Produces: the full interactive Prestige/Store UI. No new exports consumed by later tasks (this is the last task in this plan).

This task has no Node-testable pure logic — it's pure DOM wiring, verified manually per this project's existing convention (see `memory-bank/architecture-notes.md`: `js/ui.js`/`js/main.js` are "browser-only... verified visually, not by the Node test suite").

- [ ] **Step 1: Add the new menu markup to `index.html`**

The current `#menu-main` block reads:

```html
      <div id="menu-main">
        <button id="menu-resume-btn">Resume</button>
        <button id="menu-restart-btn">Restart</button>
        <div id="menu-credits">
          <p>Made by <a href="mailto:warmonkey@jakechurchill.com">warmonkey@jakechurchill.com</a></p>
          <p>🐍 Check out <a href="https://python.jakechurchill.com" target="_blank" rel="noopener">python.jakechurchill.com</a></p>
        </div>
      </div>
```

Replace it with:

```html
      <div id="menu-main">
        <button id="menu-resume-btn">Resume</button>
        <button id="menu-restart-btn">Restart</button>
        <button id="menu-prestige-btn" disabled>Prestige</button>
        <button id="menu-store-btn">Prestige Store</button>
        <div id="menu-credits">
          <p>Made by <a href="mailto:warmonkey@jakechurchill.com">warmonkey@jakechurchill.com</a></p>
          <p>🐍 Check out <a href="https://python.jakechurchill.com" target="_blank" rel="noopener">python.jakechurchill.com</a></p>
        </div>
      </div>
```

Then, right after the existing `#menu-confirm` block (which currently ends the `#menu-panel` div):

```html
      <div id="menu-confirm" class="hidden">
        <p>This will erase all progress. Are you sure?</p>
        <button id="menu-confirm-yes-btn">Yes, restart</button>
        <button id="menu-confirm-no-btn">Cancel</button>
      </div>
    </div>
  </div>
```

insert the two new sub-views between `#menu-confirm`'s closing `</div>` and `#menu-panel`'s closing `</div>`:

```html
      <div id="menu-confirm" class="hidden">
        <p>This will erase all progress. Are you sure?</p>
        <button id="menu-confirm-yes-btn">Yes, restart</button>
        <button id="menu-confirm-no-btn">Cancel</button>
      </div>
      <div id="menu-prestige-confirm" class="hidden">
        <p id="menu-prestige-confirm-text"></p>
        <button id="menu-prestige-confirm-yes-btn">Yes, prestige</button>
        <button id="menu-prestige-confirm-no-btn">Cancel</button>
      </div>
      <div id="menu-store" class="hidden">
        <p id="menu-store-tokens"></p>
        <div class="store-row">
          <span class="store-icon">🐟</span>
          <span id="store-fish-count"></span>
          <span id="store-fish-cost"></span>
          <button id="store-fish-buy-btn">Buy</button>
        </div>
        <div class="store-row">
          <span class="store-icon">🌿</span>
          <span id="store-kelp-count"></span>
          <span id="store-kelp-cost"></span>
          <button id="store-kelp-buy-btn">Buy</button>
        </div>
        <div class="store-row">
          <span class="store-icon">🪵</span>
          <span id="store-driftwood-count"></span>
          <span id="store-driftwood-cost"></span>
          <button id="store-driftwood-buy-btn">Buy</button>
        </div>
        <div class="store-row">
          <span class="store-icon">🌾</span>
          <span id="store-crops-count"></span>
          <span id="store-crops-cost"></span>
          <button id="store-crops-buy-btn">Buy</button>
        </div>
        <button id="menu-store-back-btn">Back</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: Add the new styles to `style.css`**

Replace the current combined hidden-selector rule:

```css
#menu-main.hidden,
#menu-confirm.hidden {
  display: none;
}
```

with:

```css
#menu-main.hidden,
#menu-confirm.hidden,
#menu-prestige-confirm.hidden,
#menu-store.hidden {
  display: none;
}
```

Then append the following to the end of `style.css`:

```css
#menu-prestige-btn {
  background: #d9b545;
  color: #10263a;
}

#menu-prestige-btn:disabled {
  background: #6b6b6b;
  color: #ccc;
  cursor: not-allowed;
}

#menu-store-btn {
  background: transparent;
  color: #f4ead2;
  border: 1px solid rgba(244, 234, 210, 0.4);
}

#menu-prestige-confirm p {
  margin: 0 0 14px;
  font-size: 14px;
}

#menu-prestige-confirm button {
  display: block;
  width: 100%;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  padding: 10px 16px;
  margin-bottom: 10px;
}

#menu-prestige-confirm-yes-btn {
  background: #d9b545;
  color: #10263a;
  border: none;
}

#menu-prestige-confirm-no-btn {
  background: transparent;
  color: #f4ead2;
  border: 1px solid rgba(244, 234, 210, 0.4);
  margin-bottom: 0;
}

#menu-store-tokens {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: bold;
}

.store-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 14px;
}

.store-icon {
  font-size: 18px;
}

.store-row span:nth-child(2) {
  flex: 1;
  text-align: left;
}

.store-row span:nth-child(3) {
  opacity: 0.85;
}

.store-row button {
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 13px;
  padding: 6px 12px;
  background: #d9b545;
  color: #10263a;
}

.store-row button:disabled {
  background: #6b6b6b;
  color: #ccc;
  cursor: not-allowed;
}

#menu-store-back-btn {
  display: block;
  width: 100%;
  border: 1px solid rgba(244, 234, 210, 0.4);
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  padding: 10px 16px;
  background: transparent;
  color: #f4ead2;
  margin-top: 4px;
}
```

- [ ] **Step 3: Update `js/ui.js`'s import line**

Current line 1:

```js
import { RESOURCES, effectiveTileRate, getLevel, levelMultiplier, levelUpCost, MAX_LEVEL } from './state.js';
```

Replace with:

```js
import {
  RESOURCES,
  effectiveTileRate,
  getLevel,
  levelMultiplier,
  levelUpCost,
  MAX_LEVEL,
  completionCount,
  isFullyComplete,
  prestigeTokensEarned,
  prestigeUpgradeCost,
  PRESTIGE_UPGRADE_PERCENT,
  TOTAL_TILE_COUNT,
} from './state.js';
```

- [ ] **Step 4: Extend `initMenu` and add `updateMenuDisplay` in `js/ui.js`**

Replace the current `initMenu` and the `hideMenu` that follows it (lines 146-184):

```js
export function initMenu(onRestart) {
  elements.menuBtn = document.getElementById('menu-btn');
  elements.menuOverlay = document.getElementById('menu-overlay');
  elements.menuMain = document.getElementById('menu-main');
  elements.menuConfirm = document.getElementById('menu-confirm');
  elements.menuResumeBtn = document.getElementById('menu-resume-btn');
  elements.menuRestartBtn = document.getElementById('menu-restart-btn');
  elements.menuConfirmYesBtn = document.getElementById('menu-confirm-yes-btn');
  elements.menuConfirmNoBtn = document.getElementById('menu-confirm-no-btn');

  function showConfirm() {
    elements.menuMain.classList.add('hidden');
    elements.menuConfirm.classList.remove('hidden');
  }

  function hideConfirm() {
    elements.menuConfirm.classList.add('hidden');
    elements.menuMain.classList.remove('hidden');
  }

  elements.menuBtn.addEventListener('click', () => {
    elements.menuOverlay.classList.remove('hidden');
  });
  elements.menuResumeBtn.addEventListener('click', hideMenu);
  elements.menuOverlay.addEventListener('click', (event) => {
    if (event.target === elements.menuOverlay) hideMenu();
  });
  elements.menuRestartBtn.addEventListener('click', showConfirm);
  elements.menuConfirmNoBtn.addEventListener('click', hideConfirm);
  elements.menuConfirmYesBtn.addEventListener('click', () => {
    hideConfirm();
    hideMenu();
    onRestart();
  });
}

export function hideMenu() {
  elements.menuOverlay.classList.add('hidden');
}
```

with:

```js
export function initMenu(onRestart, onPrestige, onBuyUpgrade, onOpen) {
  elements.menuBtn = document.getElementById('menu-btn');
  elements.menuOverlay = document.getElementById('menu-overlay');
  elements.menuMain = document.getElementById('menu-main');
  elements.menuConfirm = document.getElementById('menu-confirm');
  elements.menuResumeBtn = document.getElementById('menu-resume-btn');
  elements.menuRestartBtn = document.getElementById('menu-restart-btn');
  elements.menuConfirmYesBtn = document.getElementById('menu-confirm-yes-btn');
  elements.menuConfirmNoBtn = document.getElementById('menu-confirm-no-btn');

  elements.menuPrestigeBtn = document.getElementById('menu-prestige-btn');
  elements.menuStoreBtn = document.getElementById('menu-store-btn');
  elements.menuPrestigeConfirm = document.getElementById('menu-prestige-confirm');
  elements.menuPrestigeConfirmText = document.getElementById('menu-prestige-confirm-text');
  elements.menuPrestigeYesBtn = document.getElementById('menu-prestige-confirm-yes-btn');
  elements.menuPrestigeNoBtn = document.getElementById('menu-prestige-confirm-no-btn');
  elements.menuStore = document.getElementById('menu-store');
  elements.menuStoreTokens = document.getElementById('menu-store-tokens');
  elements.menuStoreBackBtn = document.getElementById('menu-store-back-btn');
  elements.storeRows = {};
  for (const resource of RESOURCES) {
    elements.storeRows[resource] = {
      count: document.getElementById(`store-${resource}-count`),
      cost: document.getElementById(`store-${resource}-cost`),
      buyBtn: document.getElementById(`store-${resource}-buy-btn`),
    };
    elements.storeRows[resource].buyBtn.addEventListener('click', () => onBuyUpgrade(resource));
  }

  function showConfirm() {
    elements.menuMain.classList.add('hidden');
    elements.menuConfirm.classList.remove('hidden');
  }

  function hideConfirm() {
    elements.menuConfirm.classList.add('hidden');
    elements.menuMain.classList.remove('hidden');
  }

  function showPrestigeConfirm() {
    elements.menuPrestigeConfirmText.textContent =
      `Prestige for ${elements.pendingPrestigeTokens} tokens? This resets your farm but keeps your permanent upgrades.`;
    elements.menuMain.classList.add('hidden');
    elements.menuPrestigeConfirm.classList.remove('hidden');
  }

  function hidePrestigeConfirm() {
    elements.menuPrestigeConfirm.classList.add('hidden');
    elements.menuMain.classList.remove('hidden');
  }

  function showStore() {
    // Hides every sub-view, not just menu-main: this is called both from menu-main
    // (via the Store button) and directly from the prestige-confirm sub-view (right
    // after a successful prestige), so it can't assume which one is currently visible.
    elements.menuMain.classList.add('hidden');
    elements.menuConfirm.classList.add('hidden');
    elements.menuPrestigeConfirm.classList.add('hidden');
    elements.menuStore.classList.remove('hidden');
  }

  function hideStore() {
    elements.menuStore.classList.add('hidden');
    elements.menuMain.classList.remove('hidden');
  }

  elements.menuBtn.addEventListener('click', () => {
    if (onOpen) onOpen();
    elements.menuOverlay.classList.remove('hidden');
  });
  elements.menuResumeBtn.addEventListener('click', hideMenu);
  elements.menuOverlay.addEventListener('click', (event) => {
    if (event.target === elements.menuOverlay) hideMenu();
  });
  elements.menuRestartBtn.addEventListener('click', showConfirm);
  elements.menuConfirmNoBtn.addEventListener('click', hideConfirm);
  elements.menuConfirmYesBtn.addEventListener('click', () => {
    hideConfirm();
    hideMenu();
    onRestart();
  });

  elements.menuPrestigeBtn.addEventListener('click', showPrestigeConfirm);
  elements.menuPrestigeNoBtn.addEventListener('click', hidePrestigeConfirm);
  elements.menuPrestigeYesBtn.addEventListener('click', () => {
    // Calls onPrestige() (which updates state and refreshes the store's displayed
    // token balance via updateMenuDisplay) before showStore() reveals it, per the
    // spec's "confirming lands the player directly in the Store" flow.
    onPrestige();
    showStore();
  });
  elements.menuStoreBtn.addEventListener('click', showStore);
  elements.menuStoreBackBtn.addEventListener('click', hideStore);
}

export function hideMenu() {
  elements.menuOverlay.classList.add('hidden');
}

export function updateMenuDisplay(state) {
  const complete = isFullyComplete(state);
  const count = completionCount(state);
  elements.pendingPrestigeTokens = complete ? prestigeTokensEarned(state) : 0;
  elements.menuPrestigeBtn.disabled = !complete;
  elements.menuPrestigeBtn.textContent = complete
    ? `Prestige (+${elements.pendingPrestigeTokens} tokens)`
    : `Prestige (${count}/${TOTAL_TILE_COUNT} maxed)`;

  elements.menuStoreTokens.textContent = `Tokens: ${state.prestige.tokens}`;
  for (const resource of RESOURCES) {
    const row = elements.storeRows[resource];
    const purchaseCount = state.prestige.upgrades[resource];
    const cost = prestigeUpgradeCost(purchaseCount);
    // The icon itself is already the static `.store-icon` span in the HTML — this
    // text is just the count, so it doesn't duplicate it.
    row.count.textContent = `+${purchaseCount * PRESTIGE_UPGRADE_PERCENT}%`;
    row.cost.textContent = `${cost} tokens`;
    row.buyBtn.disabled = state.prestige.tokens < cost;
  }
}
```

- [ ] **Step 5: Wire it up in `js/main.js`**

Current `js/main.js` (full file):

```js
import { TILES } from './tiles.js';
import { createInitialState, getLevel, isEligible, isLevelUpEligible, levelUpTile, loadState, MAX_LEVEL, saveState, tick, unlockTile } from './state.js';
import { initScene, updateScene, screenToGrid } from './render.js';
import { initUI, getCanvas, updateResourceBar, showTilePanel, hideTilePanel, initMenu, showOfflineModal } from './ui.js';

let selectedTileId = null;

initUI(() => {
  selectedTileId = null;
});

initMenu(() => {
  state = createInitialState();
  selectedTileId = null;
  hideTilePanel();
  saveState(state);
});

const canvas = getCanvas();
initScene(canvas);

let { state, offline } = loadState();
if (offline) {
  showOfflineModal(offline.seconds, offline.gains);
}
```

(the rest of the file, from `function renderTilePanel(tile) {` onward, is unchanged by this task)

Replace the top of the file down through the `initMenu(...)` call with:

```js
import { TILES } from './tiles.js';
import {
  buyPrestigeUpgrade,
  createInitialState,
  doPrestige,
  getLevel,
  isEligible,
  isLevelUpEligible,
  levelUpTile,
  loadState,
  MAX_LEVEL,
  saveState,
  tick,
  unlockTile,
} from './state.js';
import { initScene, updateScene, screenToGrid } from './render.js';
import {
  initUI,
  getCanvas,
  updateResourceBar,
  showTilePanel,
  hideTilePanel,
  initMenu,
  showOfflineModal,
  updateMenuDisplay,
} from './ui.js';

let selectedTileId = null;

initUI(() => {
  selectedTileId = null;
});

initMenu(
  () => {
    state = createInitialState();
    selectedTileId = null;
    hideTilePanel();
    saveState(state);
  },
  () => {
    const result = doPrestige(state);
    if (result) {
      state = result.state;
      selectedTileId = null;
      hideTilePanel();
      saveState(state);
      updateMenuDisplay(state);
    }
  },
  (resource) => {
    const success = buyPrestigeUpgrade(state, resource);
    if (success) {
      saveState(state);
      updateMenuDisplay(state);
    }
  },
  () => {
    updateMenuDisplay(state);
  }
);

const canvas = getCanvas();
initScene(canvas);

let { state, offline } = loadState();
if (offline) {
  showOfflineModal(offline.seconds, offline.gains);
}
```

- [ ] **Step 6: Manually verify the full flow in the browser**

1. Run `npm test` first to confirm nothing broke.
2. `preview_start` the `drift-away` dev server and open it in a first tab (call it tab A). Note the origin it's served from (e.g. `http://localhost:4180`).
3. Confirm the menu's **Prestige** button is disabled and reads something like "Prestige (1/36 maxed)", and **Prestige Store** opens showing "Tokens: 0" with all four Buy buttons disabled.
4. In tab A, run the following via the `javascript_tool` to fabricate a fully-completed, token-rich save. This uses a dynamic `import()` of the page's own `tiles.js` module to get the real, current list of 36 tile ids rather than hardcoding them (they're derived from whatever `js/tiles.js` currently contains, so this stays correct even if tile data changes later):
   ```js
   const { TILES } = await import(window.location.origin + '/js/tiles.js');
   const state = JSON.parse(localStorage.getItem('driftaway_save_v1')) || {};
   state.unlocked = TILES.map((t) => t.id);
   state.levels = Object.fromEntries(TILES.map((t) => [t.id, 3]));
   state.lifetime = { fish: 5000, kelp: 5000, driftwood: 5000, crops: 5000 };
   state.prestige = { tokens: 50, upgrades: { fish: 0, kelp: 0, driftwood: 0, crops: 0 } };
   localStorage.setItem('driftaway_save_v1', JSON.stringify(state));
   ```
5. Open a **second tab** (tab B) at the same URL rather than reloading tab A — tab A is still running with its own in-memory state, and reloading it would trigger `beforeunload` → `saveState`, which re-serializes tab A's stale in-memory state and overwrites the injected save before tab B ever gets to read it (the same pitfall documented in the Global Constraints section).
6. In tab B, confirm the **Prestige** button is now enabled and shows "Prestige (+20 tokens)" (`floor((5000*4) / 1000)`).
7. Click it, confirm the prestige-confirmation sub-view shows "Prestige for 20 tokens? ...", click "Yes, prestige", and confirm: the menu lands directly on the Store view showing "Tokens: 70" (50 + 20), the resource bar drops back to the starting values, and only `driftwood_start` is unlocked again on the board.
8. In the Store, click the driftwood row's Buy button, confirm the token balance drops to 65 (cost 5 for the first purchase), the row now reads "🪵 +10%", then close the menu, click the driftwood tile, and confirm its panel shows a production rate of `0.5 * 1.1 = 0.55`, not the un-boosted `0.5`.
9. Reload tab B (fine here — no timestamp-dependent state is involved in this check) and confirm the token balance and upgrade count both persisted.
10. Close tab A and tab B, then stop the preview server.

- [ ] **Step 7: Commit**

```bash
git add index.html style.css js/ui.js js/main.js
git commit -m "Add the Prestige and Store menu UI

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
