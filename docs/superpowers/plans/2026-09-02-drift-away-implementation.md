# Drift Away Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Drift Away browser game — a 5×5 hex-grid idle farming/resource game on the open sea — exactly as specified, deployable as-is to GitHub Pages.

**Architecture:** Five plain ES modules with no build step: `tiles.js` (static data), `state.js` (pure economy math + localStorage persistence), `render.js` (hex-grid math + Canvas 2D drawing), `ui.js` (DOM updates for the resource bar and tile panel), and `main.js` (wires them together into a `requestAnimationFrame` loop with click handling). A minimal `package.json` with `"type": "module"` lets the same ESM syntax run unmodified in both the browser (via `<script type="module">`) and Node (for the economy tests) — no bundler, no transpilation.

**Tech Stack:** Vanilla HTML/CSS/JavaScript (ES modules), Canvas 2D. No frameworks, no npm dependencies. Node's built-in `assert` module for the economy tests (`node tests/economy.test.mjs`).

**Spec:** `docs/superpowers/specs/2026-09-02-drift-away-design.md`

## Global Constraints

- No offline progress — resources only tick while the page is open and running (spec §1, §2).
- No sound, no accounts, no multiplayer, no adjacency-based bonuses, no in-place tile leveling (spec §1 non-goals).
- Vanilla HTML/CSS/JS + Canvas 2D only — no framework, no build step, no bundler (spec §6).
- `localStorage` save key must be exactly `driftaway_save_v1` (spec §5, §9).
- Grid is exactly 5×5 (25 slots), pointy-top hexagons, "odd-r" horizontal offset, edge-to-edge, no gaps (spec §4, §6).
- Repo is public (`Jake-Churchill/drift-away` on GitHub, `main` branch) and deploys via GitHub Pages from repo root to `driftaway.jakechurchill.com` — never introduce secrets/API keys, none are needed (spec §12).
- **Local dev note (implementation decision, not in spec):** because `<script type="module">` is blocked by CORS on `file://`, running the game locally requires a static file server (e.g. `npx serve .` or `python3 -m http.server`) rather than double-clicking `index.html`. This matches how GitHub Pages actually serves it in production. Document this in the README (Task 7).
- **Git policy override:** the user's standing instruction is "never commit unless explicitly asked." Each task below ends with a `git commit` step per the standard plan format, but during execution do **not** run it automatically — pause and get an explicit go-ahead first (batching several tasks' commits into one confirmation is fine). Every commit message in this plan ends with the required attribution line — keep that line when you do commit.

---

## Task 1: Project scaffold (HTML/CSS/config shell)

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `package.json`
- Create: `CNAME`

**Interfaces:**
- Produces: the DOM elements every later task's JS will bind to — `#game-canvas`, `#resource-bar` with child count spans `#count-fish` / `#count-kelp` / `#count-driftwood` / `#count-crops`, `#tile-panel` (initially `class="hidden"`) with `#tile-panel-icon`, `#tile-panel-name`, `#tile-panel-desc`, `#tile-panel-progress`, `#tile-panel-unlock-btn`, `#tile-panel-close-btn`. Also produces `package.json`'s `"type": "module"`, which every later `import`/`export` in `js/*.js` and `tests/*.mjs` relies on.

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Drift Away</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <canvas id="game-canvas"></canvas>
  <div id="resource-bar">
    <div class="resource" data-resource="fish"><span class="icon">🐟</span><span class="count" id="count-fish">0</span></div>
    <div class="resource" data-resource="kelp"><span class="icon">🌿</span><span class="count" id="count-kelp">0</span></div>
    <div class="resource" data-resource="driftwood"><span class="icon">🪵</span><span class="count" id="count-driftwood">0</span></div>
    <div class="resource" data-resource="crops"><span class="icon">🌾</span><span class="count" id="count-crops">0</span></div>
  </div>
  <div id="tile-panel" class="hidden">
    <button id="tile-panel-close-btn">×</button>
    <span id="tile-panel-icon" class="tile-panel-icon"></span>
    <h2 id="tile-panel-name"></h2>
    <p id="tile-panel-desc"></p>
    <div id="tile-panel-progress"></div>
    <button id="tile-panel-unlock-btn" class="hidden">Unlock</button>
  </div>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `style.css`**

```css
* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
  background: #1b4965;
}

#game-canvas {
  display: block;
  width: 100vw;
  height: 100vh;
}

#resource-bar {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 18px;
  background: rgba(16, 38, 58, 0.9);
  color: #f4ead2;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 16px;
  line-height: 1;
}

#resource-bar .resource {
  display: flex;
  align-items: center;
  gap: 6px;
}

#tile-panel {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(16, 38, 58, 0.92);
  color: #f4ead2;
  padding: 16px 28px;
  border-radius: 8px;
  min-width: 260px;
  max-width: 360px;
  text-align: center;
}

#tile-panel.hidden {
  display: none;
}

.tile-panel-icon {
  display: block;
  font-size: 24px;
  margin-bottom: 2px;
}

#tile-panel h2 {
  margin: 4px 0 8px;
  font-size: 18px;
}

#tile-panel p {
  margin: 0 0 8px;
  font-size: 14px;
}

#tile-panel-progress {
  font-size: 13px;
  opacity: 0.85;
  margin-bottom: 8px;
}

#tile-panel button {
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

#tile-panel-unlock-btn {
  padding: 6px 16px;
  background: #d9b545;
  color: #10263a;
  font-weight: bold;
  font-size: 14px;
}

#tile-panel-unlock-btn:disabled {
  background: #6b6b6b;
  color: #ccc;
  cursor: not-allowed;
}

#tile-panel-unlock-btn.hidden {
  display: none;
}

#tile-panel-close-btn {
  position: absolute;
  top: 6px;
  right: 10px;
  background: transparent;
  color: #f4ead2;
  font-size: 16px;
}
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "drift-away",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node tests/economy.test.mjs"
  }
}
```

- [ ] **Step 4: Create `CNAME`**

```
driftaway.jakechurchill.com
```

- [ ] **Step 5: Verify in browser**

Run: `npx serve .` (or `python3 -m http.server 8000`) from the `drift-away/` directory, then open the served URL.
Expected: a solid dark-blue page (`#1b4965`) fills the viewport (the canvas has no drawing yet, so the CSS background shows through). A resource bar is visible at the top center showing "🐟 0  🌿 0  🪵 0  🌾 0". No tile panel is visible. No console errors.

- [ ] **Step 6: Commit**

```bash
git add index.html style.css package.json CNAME
git commit -m "$(cat <<'EOF'
Add project scaffold: HTML shell, styling, and GitHub Pages config

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Tile data (`js/tiles.js`)

**Files:**
- Create: `js/tiles.js`
- Create: `tests/economy.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `export const TILES` — an array of exactly 25 tile objects shaped `{ id, name, gridPos: {row, col}, family, kind, produces, rate, boosts, unlock }` per spec §5. Every later task (`state.js`, `render.js`, `main.js`, tests) imports `TILES` from this file by exact name.

- [ ] **Step 1: Write the failing tile-data test**

Create `tests/economy.test.mjs`:

```js
import assert from 'node:assert/strict';
import { TILES } from '../js/tiles.js';

// --- Tile data integrity ---

assert.equal(TILES.length, 25, 'expected exactly 25 tiles');

const ids = TILES.map((t) => t.id);
assert.equal(new Set(ids).size, 25, 'tile ids must be unique');

const positions = TILES.map((t) => `${t.gridPos.row},${t.gridPos.col}`);
assert.equal(new Set(positions).size, 25, 'grid positions must be unique');
for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 5; col++) {
    assert.ok(positions.includes(`${row},${col}`), `missing tile at (${row},${col})`);
  }
}

const startTiles = TILES.filter((t) => t.unlock.type === 'start');
assert.equal(startTiles.length, 4, 'expected exactly 4 starting tiles');
assert.deepEqual(
  startTiles.map((t) => t.family).sort(),
  ['crops', 'driftwood', 'fish', 'kelp'],
  'each resource family should have exactly one starting tile'
);

const familyCounts = TILES.reduce((counts, t) => {
  counts[t.family] = (counts[t.family] || 0) + 1;
  return counts;
}, {});
assert.deepEqual(
  familyCounts,
  { fish: 6, kelp: 6, driftwood: 5, crops: 5, booster: 3 },
  'family counts must match the spec'
);

console.log('tile data tests passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/economy.test.mjs`
Expected: FAIL — `Cannot find module '../js/tiles.js'` (the file doesn't exist yet).

- [ ] **Step 3: Create `js/tiles.js`**

```js
export const TILES = [
  // Fish family (base resource: fish)
  { id: 'fish_start', name: 'Fishing Raft', gridPos: { row: 2, col: 2 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.0, boosts: null, unlock: { type: 'start' } },
  { id: 'fish_anchored_net', name: 'Anchored Net', gridPos: { row: 2, col: 3 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 30 } } },
  { id: 'fish_trawling_raft', name: 'Trawling Raft', gridPos: { row: 3, col: 3 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'cost', cost: { kelp: 60, driftwood: 40 } } },
  { id: 'fish_tide_pool_trap', name: 'Tide Pool Trap', gridPos: { row: 3, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 200 } },
  { id: 'fish_deep_sea_longline', name: 'Deep-Sea Longline', gridPos: { row: 4, col: 3 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 150, crops: 100 } } },
  { id: 'fish_grand_fishery', name: 'Grand Fishery', gridPos: { row: 4, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 2.0, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 1000 } },

  // Kelp family (base resource: kelp)
  { id: 'kelp_start', name: 'Kelp Farm', gridPos: { row: 0, col: 1 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.0, boosts: null, unlock: { type: 'start' } },
  { id: 'kelp_seaweed_raft', name: 'Seaweed Raft', gridPos: { row: 0, col: 2 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { fish: 30 } } },
  { id: 'kelp_nursery', name: 'Kelp Nursery', gridPos: { row: 0, col: 0 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'cost', cost: { fish: 50, driftwood: 50 } } },
  { id: 'kelp_floating_garden', name: 'Floating Garden', gridPos: { row: 0, col: 3 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 200 } },
  { id: 'kelp_deep_bed', name: 'Deep Kelp Bed', gridPos: { row: 0, col: 4 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { fish: 120, crops: 100 } } },
  { id: 'kelp_reef', name: 'Kelp Reef', gridPos: { row: 1, col: 4 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 2.0, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 1000 } },

  // Driftwood family (base resource: driftwood)
  { id: 'driftwood_start', name: 'Driftwood Collector', gridPos: { row: 2, col: 1 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.5, boosts: null, unlock: { type: 'start' } },
  { id: 'driftwood_salvage_raft', name: 'Salvage Raft', gridPos: { row: 2, col: 0 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { fish: 40 } } },
  { id: 'driftwood_debris_net', name: 'Debris Net', gridPos: { row: 3, col: 0 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 100 } },
  { id: 'driftwood_current_sweeper', name: 'Current Sweeper', gridPos: { row: 3, col: 1 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.8, boosts: null, unlock: { type: 'cost', cost: { kelp: 80, crops: 60 } } },
  { id: 'driftwood_storm_wreckage', name: 'Storm Wreckage Raft', gridPos: { row: 4, col: 0 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1.0, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 500 } },

  // Crops family (base resource: crops)
  { id: 'crops_start', name: 'Planter Raft', gridPos: { row: 1, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.5, boosts: null, unlock: { type: 'start' } },
  { id: 'crops_soil_barge', name: 'Soil Barge', gridPos: { row: 1, col: 1 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { kelp: 40 } } },
  { id: 'crops_hanging_garden', name: 'Hanging Garden', gridPos: { row: 1, col: 3 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 100 } },
  { id: 'crops_terraced_planter', name: 'Terraced Planter', gridPos: { row: 3, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.8, boosts: null, unlock: { type: 'cost', cost: { fish: 80, driftwood: 60 } } },
  { id: 'crops_floating_orchard', name: 'Floating Orchard', gridPos: { row: 4, col: 1 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1.0, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 500 } },

  // Booster family (no production of their own)
  { id: 'booster_drying_rack', name: 'Drying Rack', gridPos: { row: 1, col: 0 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'kelp', percent: 20 }, { resource: 'driftwood', percent: 20 }], unlock: { type: 'cost', cost: { kelp: 150, driftwood: 150 } } },
  { id: 'booster_smokehouse', name: 'Smokehouse', gridPos: { row: 2, col: 4 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 25 }], unlock: { type: 'cost', cost: { fish: 100, driftwood: 100 } } },
  { id: 'booster_windmill', name: 'Windmill', gridPos: { row: 4, col: 2 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 25 }], unlock: { type: 'milestone', resource: 'crops', target: 300 } },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/economy.test.mjs`
Expected: PASS, printing `tile data tests passed`.

- [ ] **Step 5: Commit**

```bash
git add js/tiles.js tests/economy.test.mjs
git commit -m "$(cat <<'EOF'
Add the 25 tile definitions and a data-integrity test

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Economy state module (`js/state.js`)

**Files:**
- Create: `js/state.js`
- Modify: `tests/economy.test.mjs`

**Interfaces:**
- Consumes: `TILES` from `js/tiles.js` (Task 2).
- Produces (used by `render.js`, `ui.js`, `main.js` in later tasks):
  - `export const RESOURCES` — `['fish', 'kelp', 'driftwood', 'crops']`
  - `export const SAVE_KEY` — `'driftaway_save_v1'`
  - `export function createInitialState()` → `{ version: 1, resources: {...}, lifetime: {...}, unlocked: string[] }`
  - `export function effectiveRate(resource, unlockedIds)` → `number`
  - `export function isEligible(tile, state)` → `boolean`
  - `export function tick(state, dt)` → mutates and returns `state`
  - `export function unlockTile(state, tile)` → `boolean` (mutates `state` on success)
  - `export function saveState(state)` → `void`
  - `export function loadState()` → `state` (from `localStorage`, or a fresh `createInitialState()`)

- [ ] **Step 1: Write the failing economy tests**

First, add this import alongside the existing `import { TILES } from '../js/tiles.js';` line at the **top** of `tests/economy.test.mjs`:

```js
import { createInitialState, effectiveRate, isEligible, tick, unlockTile } from '../js/state.js';
```

Then append the following to the **bottom** of `tests/economy.test.mjs` (after the existing tile-data assertions and their `console.log('tile data tests passed');`):

```js
// --- effectiveRate ---

{
  const state = createInitialState();
  assert.equal(effectiveRate('fish', state.unlocked), 1.0, 'starting fish rate');
  assert.equal(effectiveRate('kelp', state.unlocked), 1.0, 'starting kelp rate');
  assert.equal(effectiveRate('driftwood', state.unlocked), 0.5, 'starting driftwood rate');
  assert.equal(effectiveRate('crops', state.unlocked), 0.5, 'starting crops rate');
}

{
  const unlocked = ['fish_start', 'booster_smokehouse'];
  assert.equal(effectiveRate('fish', unlocked), 1.25, 'smokehouse adds +25% to fish');
}

// --- isEligible ---

{
  const tile = { unlock: { type: 'cost', cost: { driftwood: 30 } } };
  assert.equal(isEligible(tile, { resources: { driftwood: 10 } }), false);
  assert.equal(isEligible(tile, { resources: { driftwood: 30 } }), true);
}

{
  const tile = { unlock: { type: 'milestone', resource: 'fish', target: 200 } };
  assert.equal(isEligible(tile, { lifetime: { fish: 199 } }), false);
  assert.equal(isEligible(tile, { lifetime: { fish: 200 } }), true);
}

{
  const tile = { unlock: { type: 'start' } };
  assert.equal(isEligible(tile, {}), true);
}

// --- tick ---

{
  const state = createInitialState();
  tick(state, 2);
  assert.equal(state.resources.fish, 2.0, 'fish accrues at 1/s for 2s');
  assert.equal(state.lifetime.fish, 2.0, 'lifetime tracks the same total');
  assert.equal(state.resources.driftwood, 1.0, 'driftwood accrues at 0.5/s for 2s');
}

// --- unlockTile ---

{
  const state = createInitialState();
  state.resources.driftwood = 30;
  const tile = TILES.find((t) => t.id === 'fish_anchored_net');
  const ok = unlockTile(state, tile);
  assert.equal(ok, true, 'unlock succeeds when eligible');
  assert.equal(state.resources.driftwood, 0, 'cost is deducted');
  assert.ok(state.unlocked.includes('fish_anchored_net'), 'tile id added to unlocked');
}

{
  const state = createInitialState();
  const tile = TILES.find((t) => t.id === 'fish_anchored_net');
  const ok = unlockTile(state, tile);
  assert.equal(ok, false, 'unlock fails when not eligible');
  assert.ok(!state.unlocked.includes('fish_anchored_net'));
}

console.log('economy math tests passed');
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `node tests/economy.test.mjs`
Expected: FAIL — `Cannot find module '../js/state.js'`.

- [ ] **Step 3: Create `js/state.js`**

```js
import { TILES } from './tiles.js';

export const RESOURCES = ['fish', 'kelp', 'driftwood', 'crops'];
export const SAVE_KEY = 'driftaway_save_v1';

export function createInitialState() {
  const resources = { fish: 0, kelp: 0, driftwood: 0, crops: 0 };
  const lifetime = { fish: 0, kelp: 0, driftwood: 0, crops: 0 };
  const unlocked = TILES.filter((t) => t.unlock.type === 'start').map((t) => t.id);
  return { version: 1, resources, lifetime, unlocked };
}

export function effectiveRate(resource, unlockedIds) {
  const baseSum = TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'producer' && t.produces === resource)
    .reduce((sum, t) => sum + t.rate, 0);

  const boostPct = TILES
    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'booster')
    .flatMap((t) => t.boosts)
    .filter((b) => b.resource === resource)
    .reduce((sum, b) => sum + b.percent, 0);

  return baseSum * (1 + boostPct / 100);
}

export function isEligible(tile, state) {
  if (tile.unlock.type === 'start') return true;
  if (tile.unlock.type === 'cost') {
    return Object.entries(tile.unlock.cost).every(
      ([resource, amount]) => state.resources[resource] >= amount
    );
  }
  if (tile.unlock.type === 'milestone') {
    return state.lifetime[tile.unlock.resource] >= tile.unlock.target;
  }
  return false;
}

export function tick(state, dt) {
  for (const resource of RESOURCES) {
    const amount = effectiveRate(resource, state.unlocked) * dt;
    state.resources[resource] += amount;
    state.lifetime[resource] += amount;
  }
  return state;
}

export function unlockTile(state, tile) {
  if (state.unlocked.includes(tile.id)) return false;
  if (!isEligible(tile, state)) return false;

  if (tile.unlock.type === 'cost') {
    for (const [resource, amount] of Object.entries(tile.unlock.cost)) {
      state.resources[resource] -= amount;
    }
  }

  state.unlocked.push(tile.id);
  return true;
}

export function saveState(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    const looksValid =
      parsed &&
      typeof parsed === 'object' &&
      parsed.resources &&
      parsed.lifetime &&
      Array.isArray(parsed.unlocked);
    return looksValid ? parsed : createInitialState();
  } catch {
    return createInitialState();
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node tests/economy.test.mjs`
Expected: PASS, printing both `tile data tests passed` and `economy math tests passed`.

- [ ] **Step 5: Commit**

```bash
git add js/state.js tests/economy.test.mjs
git commit -m "$(cat <<'EOF'
Add economy state module with tick/effectiveRate/isEligible/unlockTile

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Rendering module + minimal game loop (`js/render.js`, `js/main.js`)

**Files:**
- Create: `js/render.js`
- Create: `js/main.js`

**Interfaces:**
- Consumes: `TILES` (Task 2); `loadState`, `tick` (Task 3).
- Produces (used by `ui.js`/`main.js` extensions in Tasks 5–6):
  - `export function drawScene(ctx, canvas, state, time)` — draws the water background, all 25 hexes (locked outline or unlocked raft+prop), given the current game state and a timestamp (ms) for animation.
  - `export function screenToGrid(screenX, screenY, canvasWidth, canvasHeight)` → `{ row, col } | null` — converts a canvas-space click into the grid cell it landed in, or `null` if it hit open space outside every hex.

- [ ] **Step 1: Create `js/render.js`**

```js
import { TILES } from './tiles.js';
import { isEligible } from './state.js';

const GRID_ROWS = 5;
const GRID_COLS = 5;
const HEX_RADIUS = 42;
const SCALE_Y = 0.62;
const WALL_HEIGHT = 14;

const WOOD_TOP = '#c9975b';
const WOOD_SIDE = '#8a6236';
const BOOSTER_TRIM = '#e0b84b';

const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
const HEX_HEIGHT = 2 * HEX_RADIUS;
const ROW_SPACING = 0.75 * HEX_HEIGHT;

function hexGridBounds() {
  return {
    width: GRID_COLS * HEX_WIDTH + HEX_WIDTH / 2,
    height: (GRID_ROWS - 1) * ROW_SPACING + HEX_HEIGHT,
  };
}

function computeFitScale(canvasWidth, canvasHeight) {
  const bounds = hexGridBounds();
  return Math.min(
    (canvasWidth * 0.85) / bounds.width,
    (canvasHeight * 0.85) / (bounds.height * SCALE_Y)
  );
}

function hexCenter(row, col) {
  const x = col * HEX_WIDTH + (row % 2 === 1 ? HEX_WIDTH / 2 : 0) + HEX_WIDTH / 2;
  const y = row * ROW_SPACING + HEX_HEIGHT / 2;
  return { x, y };
}

function hexPolygonPoints(cx, cy, radius) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = ((30 + 60 * i) * Math.PI) / 180;
    points.push({ x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) });
  }
  return points;
}

function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function tracePolygon(ctx, points, offsetY = 0) {
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y + offsetY);
    else ctx.lineTo(p.x, p.y + offsetY);
  });
  ctx.closePath();
}

function drawWater(ctx, canvas, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1b4965');
  gradient.addColorStop(1, '#2e6f95');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.strokeStyle = 'rgba(95, 168, 211, 0.15)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const yBase = (canvas.height / 5) * i + ((time / 40) % canvas.height) - canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, yBase);
    ctx.quadraticCurveTo(canvas.width / 2, yBase + 20, canvas.width, yBase);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLockedTile(ctx, cx, cy, eligible, time) {
  const poly = hexPolygonPoints(cx, cy, HEX_RADIUS);

  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  if (eligible) {
    const pulse = 0.5 + 0.5 * Math.sin(time / 300);
    ctx.strokeStyle = `rgba(188, 216, 232, ${0.4 + 0.4 * pulse})`;
  } else {
    ctx.strokeStyle = 'rgba(188, 216, 232, 0.35)';
  }
  tracePolygon(ctx, poly);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(188, 216, 232, 0.6)';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFishProp(ctx) {
  ctx.fillStyle = '#5fa8d3';
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.quadraticCurveTo(0, -10, 14, 0);
  ctx.quadraticCurveTo(0, 10, -14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(22, -6);
  ctx.lineTo(22, 6);
  ctx.closePath();
  ctx.fill();
}

function drawKelpProp(ctx) {
  ctx.strokeStyle = '#4c9a6a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const dx of [-10, 0, 10]) {
    ctx.beginPath();
    ctx.moveTo(dx, 14);
    ctx.quadraticCurveTo(dx + 6, 0, dx, -14);
    ctx.stroke();
  }
}

function drawDriftwoodProp(ctx) {
  ctx.strokeStyle = '#5a3f22';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-16, 8); ctx.lineTo(16, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(14, -10); ctx.stroke();
}

function drawCropsProp(ctx) {
  ctx.strokeStyle = '#d9b545';
  ctx.lineWidth = 3;
  for (const dx of [-12, -4, 4, 12]) {
    ctx.beginPath();
    ctx.moveTo(dx, 12);
    ctx.lineTo(dx, -12);
    ctx.stroke();
  }
}

function drawBoosterProp(ctx, id) {
  ctx.fillStyle = '#e0b84b';
  if (id === 'booster_windmill') {
    ctx.fillRect(-2, -14, 4, 20);
    for (const angle of [0, 90, 180, 270]) {
      ctx.save();
      ctx.rotate((angle * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(6, -2);
      ctx.lineTo(-6, -2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(-14, 10);
    ctx.lineTo(14, 10);
    ctx.lineTo(8, -12);
    ctx.lineTo(-8, -12);
    ctx.closePath();
    ctx.fill();
  }
}

function drawProp(ctx, tile, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  switch (tile.family) {
    case 'fish': drawFishProp(ctx); break;
    case 'kelp': drawKelpProp(ctx); break;
    case 'driftwood': drawDriftwoodProp(ctx); break;
    case 'crops': drawCropsProp(ctx); break;
    case 'booster': drawBoosterProp(ctx, tile.id); break;
  }
  ctx.restore();
}

function drawUnlockedTile(ctx, tile, cx, cy) {
  const topPoly = hexPolygonPoints(cx, cy, HEX_RADIUS);

  ctx.save();
  ctx.fillStyle = 'rgba(10, 30, 45, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + HEX_RADIUS * 0.55, HEX_RADIUS * 0.8, HEX_RADIUS * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = WOOD_SIDE;
  tracePolygon(ctx, topPoly, WALL_HEIGHT);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = WOOD_TOP;
  tracePolygon(ctx, topPoly);
  ctx.fill();
  if (tile.kind === 'booster') {
    ctx.lineWidth = 3;
    ctx.strokeStyle = BOOSTER_TRIM;
    ctx.stroke();
  }
  ctx.restore();

  drawProp(ctx, tile, cx, cy);
}

function drawTile(ctx, tile, state, time) {
  const { x: cx, y: cy } = hexCenter(tile.gridPos.row, tile.gridPos.col);
  const unlocked = state.unlocked.includes(tile.id);
  if (unlocked) {
    drawUnlockedTile(ctx, tile, cx, cy);
  } else {
    drawLockedTile(ctx, cx, cy, isEligible(tile, state), time);
  }
}

export function drawScene(ctx, canvas, state, time) {
  drawWater(ctx, canvas, time);

  const bounds = hexGridBounds();
  const fitScale = computeFitScale(canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(fitScale, fitScale * SCALE_Y);
  ctx.translate(-bounds.width / 2, -bounds.height / 2);

  for (const tile of TILES) {
    drawTile(ctx, tile, state, time);
  }

  ctx.restore();
}

export function screenToGrid(screenX, screenY, canvasWidth, canvasHeight) {
  const bounds = hexGridBounds();
  const fitScale = computeFitScale(canvasWidth, canvasHeight);

  const lx = (screenX - canvasWidth / 2) / fitScale + bounds.width / 2;
  const ly = (screenY - canvasHeight / 2) / (fitScale * SCALE_Y) + bounds.height / 2;

  for (const tile of TILES) {
    const { x: cx, y: cy } = hexCenter(tile.gridPos.row, tile.gridPos.col);
    const poly = hexPolygonPoints(cx, cy, HEX_RADIUS);
    if (pointInPolygon(lx, ly, poly)) {
      return tile.gridPos;
    }
  }
  return null;
}
```

- [ ] **Step 2: Create a minimal `js/main.js`**

```js
import { loadState, tick } from './state.js';
import { drawScene } from './render.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let state = loadState();

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let lastFrameTime = performance.now();

function loop(now) {
  const dt = Math.min(0.25, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  tick(state, dt);
  drawScene(ctx, canvas, state, now);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

- [ ] **Step 3: Verify in browser**

Run: `npx serve .` from `drift-away/`, open the served URL.
Expected: an animated blue water background with faint drifting highlight streaks. Four solid wood-toned hex rafts are visible with distinct prop art (a fish shape, seaweed strands, a log pile, wheat rows) at the grid positions from the spec table (fish at row 2/col 2, kelp at row 0/col 1, driftwood at row 2/col 1, crops at row 1/col 2 — remember odd rows are shifted right). The other 21 hexes show as faint dashed outlines with a small dot (buoy), no wood fill. No console errors. Resource bar still reads all zeros (expected — `ui.js` doesn't exist yet, that's Task 5).

- [ ] **Step 4: Commit**

```bash
git add js/render.js js/main.js
git commit -m "$(cat <<'EOF'
Add hex-grid Canvas 2D renderer and a minimal render loop

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: UI module + interactive unlock flow (`js/ui.js`, modify `js/main.js`)

**Files:**
- Create: `js/ui.js`
- Modify: `js/main.js` (full replacement — see Step 2)

**Interfaces:**
- Consumes: `RESOURCES` (Task 3); DOM ids from `index.html` (Task 1).
- Produces (used by `main.js`):
  - `export function initUI()` — caches DOM references; wires the panel's close button.
  - `export function getCanvas()` → the `<canvas>` element.
  - `export function updateResourceBar(state)` — writes the four live counts.
  - `export function showTilePanel(tile, state, eligible, onUnlock)` — renders the panel for `tile` and, if it's locked, wires the Unlock button's click to call `onUnlock(tile)`.
  - `export function hideTilePanel()`

- [ ] **Step 1: Create `js/ui.js`**

```js
import { RESOURCES } from './state.js';

const elements = {};

const RESOURCE_ICONS = { fish: '🐟', kelp: '🌿', driftwood: '🪵', crops: '🌾' };

function tileIcon(tile) {
  if (tile.kind === 'producer') return RESOURCE_ICONS[tile.produces];
  return tile.boosts.map((b) => RESOURCE_ICONS[b.resource]).join('');
}

export function initUI() {
  elements.canvas = document.getElementById('game-canvas');
  elements.counts = {};
  for (const resource of RESOURCES) {
    elements.counts[resource] = document.getElementById(`count-${resource}`);
  }
  elements.panel = document.getElementById('tile-panel');
  elements.panelIcon = document.getElementById('tile-panel-icon');
  elements.panelName = document.getElementById('tile-panel-name');
  elements.panelDesc = document.getElementById('tile-panel-desc');
  elements.panelProgress = document.getElementById('tile-panel-progress');
  elements.panelUnlockBtn = document.getElementById('tile-panel-unlock-btn');
  elements.panelCloseBtn = document.getElementById('tile-panel-close-btn');
  elements.panelCloseBtn.addEventListener('click', hideTilePanel);
}

export function getCanvas() {
  return elements.canvas;
}

export function updateResourceBar(state) {
  for (const resource of RESOURCES) {
    elements.counts[resource].textContent = Math.floor(state.resources[resource]).toLocaleString();
  }
}

function describeUnlock(tile) {
  if (tile.unlock.type === 'cost') {
    return Object.entries(tile.unlock.cost)
      .map(([resource, amount]) => `${amount} ${resource}`)
      .join(' + ');
  }
  return `Reach ${tile.unlock.target} lifetime ${tile.unlock.resource}`;
}

function progressFraction(tile, state) {
  if (tile.unlock.type === 'cost') {
    const fractions = Object.entries(tile.unlock.cost).map(([resource, amount]) =>
      Math.min(1, state.resources[resource] / amount)
    );
    return Math.min(...fractions);
  }
  return Math.min(1, state.lifetime[tile.unlock.resource] / tile.unlock.target);
}

export function showTilePanel(tile, state, eligible, onUnlock) {
  elements.panel.classList.remove('hidden');
  elements.panelIcon.textContent = tileIcon(tile);
  elements.panelName.textContent = tile.name;

  const unlocked = state.unlocked.includes(tile.id);
  if (unlocked) {
    elements.panelDesc.textContent =
      tile.kind === 'producer'
        ? `Produces ${tile.rate}/s ${tile.produces}`
        : tile.boosts.map((b) => `+${b.percent}% ${b.resource}`).join(', ');
    elements.panelProgress.textContent = '';
    elements.panelUnlockBtn.classList.add('hidden');
    return;
  }

  elements.panelDesc.textContent = `Requires: ${describeUnlock(tile)}`;
  const frac = progressFraction(tile, state);
  elements.panelProgress.textContent = `${Math.floor(frac * 100)}% ready`;
  elements.panelUnlockBtn.classList.remove('hidden');
  elements.panelUnlockBtn.disabled = !eligible;
  elements.panelUnlockBtn.onclick = () => onUnlock(tile);
}

export function hideTilePanel() {
  elements.panel.classList.add('hidden');
}
```

- [ ] **Step 2: Replace `js/main.js`**

```js
import { TILES } from './tiles.js';
import { loadState, tick, isEligible, unlockTile, saveState } from './state.js';
import { drawScene, screenToGrid } from './render.js';
import { initUI, getCanvas, updateResourceBar, showTilePanel, hideTilePanel } from './ui.js';

initUI();

const canvas = getCanvas();
const ctx = canvas.getContext('2d');

let state = loadState();
let selectedTileId = null;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function handleUnlockClick(tile) {
  const success = unlockTile(state, tile);
  if (success) {
    saveState(state);
    showTilePanel(tile, state, isEligible(tile, state), handleUnlockClick);
  }
}

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const gridPos = screenToGrid(x, y, canvas.width, canvas.height);

  if (!gridPos) {
    selectedTileId = null;
    hideTilePanel();
    return;
  }

  const tile = TILES.find((t) => t.gridPos.row === gridPos.row && t.gridPos.col === gridPos.col);
  if (!tile) return;

  selectedTileId = tile.id;
  showTilePanel(tile, state, isEligible(tile, state), handleUnlockClick);
});

let lastFrameTime = performance.now();

function loop(now) {
  const dt = Math.min(0.25, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  tick(state, dt);
  updateResourceBar(state);

  if (selectedTileId) {
    const tile = TILES.find((t) => t.id === selectedTileId);
    if (tile && !state.unlocked.includes(tile.id)) {
      showTilePanel(tile, state, isEligible(tile, state), handleUnlockClick);
    }
  }

  drawScene(ctx, canvas, state, now);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

- [ ] **Step 3: Verify in browser**

Run: `npx serve .`, open the served URL.
Expected:
1. The resource bar now counts up live (fish and kelp by ~1/s, driftwood and crops by ~0.5/s).
2. Clicking the Fishing Raft hex (row 2, col 2) opens the panel showing a 🐟 icon, "Fishing Raft" / "Produces 1 fish/s", no Unlock button.
3. Clicking a locked hex, e.g. the Tide Pool Trap (row 3, col 4), shows a 🐟 icon (it will produce fish once unlocked), "Requires: Reach 200 lifetime fish" and a low "X% ready", with a disabled Unlock button.
4. Clicking the Anchored Net hex (row 2, col 3) shows "Requires: 30 driftwood" and a live-updating "% ready" that climbs as driftwood accrues.
5. Clicking the locked Drying Rack (row 1, col 0) shows a combined 🌿🪵 icon (it boosts both kelp and driftwood).
6. Clicking the panel's × closes it; clicking open water also closes it.

- [ ] **Step 4: Commit**

```bash
git add js/ui.js js/main.js
git commit -m "$(cat <<'EOF'
Add resource bar / tile panel UI and wire the click-to-unlock flow

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Autosave and load-on-start persistence (modify `js/main.js`)

**Files:**
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `saveState`, `loadState` (Task 3, already imported).
- Produces: no new exports — this task only changes `main.js`'s runtime behavior (periodic + unload autosave). `loadState()` was already used for initial load since Task 4; this task adds the two remaining autosave triggers from spec §9 (every ~10s of elapsed play time, and on `beforeunload` — the third trigger, "on every unlock," is already covered by Task 5's `handleUnlockClick`).

- [ ] **Step 1: Add the autosave timer and unload handler to `js/main.js`**

Modify the `loop` function and add a `beforeunload` listener:

```js
let lastFrameTime = performance.now();
let timeSinceSave = 0;

function loop(now) {
  const dt = Math.min(0.25, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  tick(state, dt);
  updateResourceBar(state);

  if (selectedTileId) {
    const tile = TILES.find((t) => t.id === selectedTileId);
    if (tile && !state.unlocked.includes(tile.id)) {
      showTilePanel(tile, state, isEligible(tile, state), handleUnlockClick);
    }
  }

  drawScene(ctx, canvas, state, now);

  timeSinceSave += dt;
  if (timeSinceSave >= 10) {
    saveState(state);
    timeSinceSave = 0;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

window.addEventListener('beforeunload', () => {
  saveState(state);
});
```

(This replaces the previous `let lastFrameTime = performance.now();` / `function loop(now) {...}` / final `requestAnimationFrame(loop);` block at the bottom of the file with the version above, which adds `timeSinceSave` tracking and the `beforeunload` listener. Everything above that block in the file — the imports, `initUI()`, canvas setup, `handleUnlockClick`, and the click listener — stays unchanged.)

- [ ] **Step 2: Verify in browser**

Run: `npx serve .`, open the served URL, let it run for at least 15 real seconds (past one autosave), then close the tab and reopen the served URL.
Expected: resource counts on reload are at or above where they were before closing (not reset to zero), confirming the state round-tripped through `localStorage`. Open DevTools → Application → Local Storage and confirm a `driftaway_save_v1` key exists containing the expected JSON shape (`version`, `resources`, `lifetime`, `unlocked`).

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "$(cat <<'EOF'
Add periodic autosave and save-on-unload

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Documentation (`README.md`, `memory-bank/`)

**Files:**
- Modify: `README.md` (currently just a `# drift-away` stub)
- Create: `memory-bank/project-overview.md`
- Create: `memory-bank/tile-design.md`
- Create: `memory-bank/architecture-notes.md`

**Interfaces:**
- Consumes: nothing (pure documentation, written against the finished code from Tasks 1–6).
- Produces: nothing consumed by code — these are for future sessions/readers.

- [ ] **Step 1: Replace `README.md`**

```markdown
# Drift Away

A calm, idle resource-management game: unlock hexagonal raft tiles on the open sea, each producing fish, kelp, driftwood, or crops, or boosting another resource's output, until all 25 slots are claimed.

Play it live at **https://driftaway.jakechurchill.com**.

## Running locally

This is a plain HTML/CSS/JS project — no build step, no dependencies. It uses ES modules, which browsers block from loading over `file://`, so serve it with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the URL it prints (e.g. `http://localhost:3000` or `http://localhost:8000`).

## Controls

- Click any tile to see what it produces (or boosts) and, if it's locked, what's needed to unlock it.
- Once a locked tile's requirement is met, its **Unlock** button becomes active — click it to claim the raft.
- Progress saves automatically to your browser's local storage; resources only accrue while the tab is open.

## Tests

The core economy math (production rates, unlock eligibility, ticking) has a zero-dependency test suite:

```bash
npm test
```

## Project docs

- Design spec: `docs/superpowers/specs/2026-09-02-drift-away-design.md`
- Project context for future work: `memory-bank/`
```

- [ ] **Step 2: Create `memory-bank/project-overview.md`**

```markdown
# Drift Away — Project Overview

## Concept

An idle/incremental farming game on the open sea. A fixed 5×5 grid (25 slots) of hexagonal raft tiles, rendered in a 2.5D pseudo-isometric style. Four resources (fish, kelp, driftwood, crops); tiles either produce one of them over time or boost another tile family's output raft-wide. All 25 tile identities and positions are fixed in `js/tiles.js` — there's no player choice of *what* to place, only *which already-defined slot* to unlock next.

## Status

MVP complete per `docs/superpowers/specs/2026-09-02-drift-away-design.md`: full 25-tile economy, hex rendering with raft depth/props, click-to-unlock flow (both cost- and milestone-gated), localStorage persistence, deployed to GitHub Pages.

## Key decisions and why

- **Active-only ticking, no offline progress** — deliberate scope cut to keep the first version simple; see spec §1 non-goals.
- **Fixed grid, not freeform placement** — every slot's tile identity and unlock requirement is predetermined; placement is cosmetic (families are grouped by quadrant) since boosters are grid-wide, not adjacency-based.
- **Hexagons over the original octagon idea** — hexagons tile the plane edge-to-edge with no infill shapes needed, which is why the design changed mid-brainstorm from octagons to hexagons.
- **ES modules + a one-line `package.json`** — lets the exact same `import`/`export` syntax run in the browser (`<script type="module">`) and in Node (for `tests/economy.test.mjs`), with zero bundler. Trade-off: local dev needs a static file server instead of double-clicking `index.html`, because browsers block ES module loads over `file://`. Production (GitHub Pages) always serves over `https://`, so this only affects local dev ergonomics.
- **Public repo, GitHub Pages deploy to `driftaway.jakechurchill.com`** — see `docs/superpowers/specs/2026-09-02-drift-away-design.md` §12 for the deploy mechanics (Pages source = `main` branch root, `CNAME` file, DNS is external/manual).

## Where things live

See `memory-bank/architecture-notes.md` for module responsibilities and `memory-bank/tile-design.md` for the full tile table and balance notes.
```

- [ ] **Step 3: Create `memory-bank/tile-design.md`**

```markdown
# Tile Design

All 25 tiles are defined in `js/tiles.js`. This is a first-pass balance — not playtested — expect to retune specific numbers after actually playing it. It's internally consistent: early tiles are reachable in well under a minute at starting rates, later tiles assume several producers of that family are already unlocked.

## Fish family (6 — base resource: fish)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `fish_start` | Fishing Raft | 2,2 | 1.0 | start |
| `fish_anchored_net` | Anchored Net | 2,3 | 1.0 | cost: 30 driftwood |
| `fish_trawling_raft` | Trawling Raft | 3,3 | 1.2 | cost: 60 kelp + 40 driftwood |
| `fish_tide_pool_trap` | Tide Pool Trap | 3,4 | 1.2 | milestone: lifetime fish ≥ 200 |
| `fish_deep_sea_longline` | Deep-Sea Longline | 4,3 | 1.5 | cost: 150 driftwood + 100 crops |
| `fish_grand_fishery` | Grand Fishery | 4,4 | 2.0 | milestone: lifetime fish ≥ 1000 |

## Kelp family (6 — base resource: kelp)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `kelp_start` | Kelp Farm | 0,1 | 1.0 | start |
| `kelp_seaweed_raft` | Seaweed Raft | 0,2 | 1.0 | cost: 30 fish |
| `kelp_nursery` | Kelp Nursery | 0,0 | 1.2 | cost: 50 fish + 50 driftwood |
| `kelp_floating_garden` | Floating Garden | 0,3 | 1.2 | milestone: lifetime kelp ≥ 200 |
| `kelp_deep_bed` | Deep Kelp Bed | 0,4 | 1.5 | cost: 120 fish + 100 crops |
| `kelp_reef` | Kelp Reef | 1,4 | 2.0 | milestone: lifetime kelp ≥ 1000 |

## Driftwood family (5 — base resource: driftwood)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `driftwood_start` | Driftwood Collector | 2,1 | 0.5 | start |
| `driftwood_salvage_raft` | Salvage Raft | 2,0 | 0.6 | cost: 40 fish |
| `driftwood_debris_net` | Debris Net | 3,0 | 0.6 | milestone: lifetime driftwood ≥ 100 |
| `driftwood_current_sweeper` | Current Sweeper | 3,1 | 0.8 | cost: 80 kelp + 60 crops |
| `driftwood_storm_wreckage` | Storm Wreckage Raft | 4,0 | 1.0 | milestone: lifetime driftwood ≥ 500 |

## Crops family (5 — base resource: crops)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `crops_start` | Planter Raft | 1,2 | 0.5 | start |
| `crops_soil_barge` | Soil Barge | 1,1 | 0.6 | cost: 40 kelp |
| `crops_hanging_garden` | Hanging Garden | 1,3 | 0.6 | milestone: lifetime crops ≥ 100 |
| `crops_terraced_planter` | Terraced Planter | 3,2 | 0.8 | cost: 80 fish + 60 driftwood |
| `crops_floating_orchard` | Floating Orchard | 4,1 | 1.0 | milestone: lifetime crops ≥ 500 |

## Booster family (3 — no production of their own)
| id | name | pos (r,c) | effect | unlock |
|---|---|---|---|---|
| `booster_drying_rack` | Drying Rack | 1,0 | +20% kelp, +20% driftwood | cost: 150 kelp + 150 driftwood |
| `booster_smokehouse` | Smokehouse | 2,4 | +25% fish | cost: 100 fish + 100 driftwood |
| `booster_windmill` | Windmill | 4,2 | +25% crops | milestone: lifetime crops ≥ 300 |

## If retuning balance

Change the relevant tile's `rate`, `unlock.cost`, or `unlock.target` in `js/tiles.js` directly — `tests/economy.test.mjs`'s family-count and starting-rate assertions will catch structural mistakes (wrong count, duplicated id/position), but won't catch a balance number that's simply "too slow/fast to feel good." That's a playtesting judgment call, not something to encode as a test.
```

- [ ] **Step 4: Create `memory-bank/architecture-notes.md`**

```markdown
# Architecture Notes

## Modules

- **`js/tiles.js`** — pure data: the 25 tile definitions (`TILES`). No logic, no imports.
- **`js/state.js`** — pure economy math (`effectiveRate`, `isEligible`, `tick`, `unlockTile`, `createInitialState`) plus the only two functions that touch `localStorage` (`saveState`, `loadState`). The pure functions are exercised directly by `tests/economy.test.mjs` in Node — they don't touch the DOM, which is what makes that possible.
- **`js/render.js`** — all hex-grid math (`hexCenter`, `hexPolygonPoints`, the odd-r offset formulas) and Canvas 2D drawing, plus `screenToGrid` for click hit-testing. Only two functions are exported (`drawScene`, `screenToGrid`); everything else is module-private. This module is browser-only — verified visually, not by the Node test suite (see spec §11 for why that split exists).
- **`js/ui.js`** — the only module that touches the resource bar / tile panel DOM elements from `index.html`. Exposes `initUI`, `updateResourceBar`, `showTilePanel`, `hideTilePanel`, `getCanvas`.
- **`js/main.js`** — the only module that imports all the others. Owns the `requestAnimationFrame` loop, canvas resize handling, click → hit-test → panel wiring, the Unlock button's callback, and the three autosave triggers (on unlock, every ~10s, on `beforeunload`).

## Data flow

```
tiles.js (static data)
   ↓
state.js (tick/effectiveRate/isEligible/unlockTile — pure math over TILES + a state object)
   ↓
main.js's RAF loop: tick(state, dt) → updateResourceBar(state) → drawScene(ctx, canvas, state, now)
   ↑
ui.js (DOM) ←── click → screenToGrid (render.js) → find tile in TILES → showTilePanel(tile, state, ...)
```

`render.js` and `ui.js` are siblings — neither imports the other. `main.js` is the only place that wires them together, which is why it's the file most later features will touch.

## Why ES modules everywhere

`package.json` sets `"type": "module"`, so every `.js` file (browser or Node) and every `.mjs` test file uses the same `import`/`export` syntax with no transpilation. The only cost: local dev needs a static server (`npx serve .`), because browsers refuse to load ES modules over `file://`. Production (GitHub Pages) always serves over HTTPS, so this doesn't affect deployment at all — only the "how do I preview this on my laptop" step.
```

- [ ] **Step 5: Commit**

```bash
git add README.md memory-bank/
git commit -m "$(cat <<'EOF'
Write README and memory-bank project documentation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: End-to-end verification pass

**Files:** none (verification only — no code changes expected; if this surfaces a bug, fix it in the relevant file from Tasks 1–6 and re-run the affected checks before continuing).

**Interfaces:** none — this exercises the fully assembled game.

- [ ] **Step 1: Run the automated economy tests one more time**

Run: `npm test` (equivalently `node tests/economy.test.mjs`)
Expected: both `tile data tests passed` and `economy math tests passed` print, exit code 0.

- [ ] **Step 2: Fresh-start browser check**

Run: `npx serve .`, open the served URL in a private/incognito window (guarantees no leftover `localStorage`).
Expected: no console errors; water animates; exactly 4 wood-toned rafts visible (Fishing Raft, Kelp Farm, Driftwood Collector, Planter Raft) at the positions from the tile table; 21 dashed-outline locked hexes.

- [ ] **Step 3: Rate check**

Watch the resource bar for 10 real seconds without clicking anything.
Expected: fish and kelp counts each increase by ~10; driftwood and crops counts each increase by ~5 (matches the 1.0/1.0/0.5/0.5 starting rates from `tests/economy.test.mjs`).

- [ ] **Step 4: Unlocked-tile panel check**

Click the Fishing Raft (row 2, col 2).
Expected: panel shows "Fishing Raft" / "Produces 1 fish/s", no Unlock button.

- [ ] **Step 5: Locked milestone-tile panel check**

Click the Tide Pool Trap (row 3, col 4).
Expected: panel shows "Requires: Reach 200 lifetime fish" and a low "% ready" figure (well under 100%, since 200 fish takes a while), Unlock button visible but disabled.

- [ ] **Step 6: Locked cost-tile unlock, end to end**

Click the Anchored Net (row 2, col 3) to open its panel, then wait (real time) until the driftwood count reaches 30 (~60 seconds from a fresh start at 0.5/s).
Expected: the panel's "% ready" climbs to 100% and the Unlock button becomes enabled on its own (panel refreshes live per Task 5/6). Click Unlock.
Expected after click: a new wood-toned raft with fish-prop art appears at row 2/col 3; driftwood drops by 30; the panel updates to show "Produces 1 fish/s" with no Unlock button.

- [ ] **Step 7: Persistence check**

Reload the page (same window, not incognito-fresh).
Expected: the Anchored Net raft is still present (unlocked survived reload); resource counts pick up at or above their pre-reload values (not reset to the 4-tile starting state).

- [ ] **Step 8: Responsive check**

Resize the browser window (or use devtools device toolbar) to a few different widths/heights.
Expected: the hex grid re-centers and rescales to fit on the next frame; no clipped or misaligned hexes; no console errors.

- [ ] **Step 9: Deployment-readiness check**

Run: `cat CNAME`
Expected: output is exactly `driftaway.jakechurchill.com` with no extra whitespace or lines. Confirm `index.html` is at the repo root (not inside `docs/`), since that's what GitHub Pages will serve from `main` branch root per spec §12.

- [ ] **Step 10: Capture proof**

Take a screenshot of the running game (water background, mixed locked/unlocked hexes, resource bar, an open tile panel) to have on hand as evidence the visual design matches the spec.

No commit for this task — it's verification only. If any step above fails, fix the underlying file and re-run that step (and Step 1, if the fix touched `state.js` or `tiles.js`) before considering the game done.
