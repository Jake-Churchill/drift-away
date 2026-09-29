# Map v3: Open Connectors and Plank Bridges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every hex that could connect two neighbouring clusters becomes a real, buyable blank tile
(not just today's sparse shortest-path tree), and the three inter-biome corridors each become a
single new `kind: 'bridge'` tile — a plank bridge, one purchase, priced in the resources of the
biome being left.

**Architecture:** A new tile `kind: 'bridge'` sits alongside `producer`/`booster`/`generator`/`blank`
in the same flat `TILES` array — one tile object, one `cells` array (a straight hex line, length set
per crossing, not fixed), one `unlock.cost`. It behaves like a blank everywhere in the engine (maxed
on unlock, no production, no leveling) except its own shape, name, cost and art. Clusters are
untouched. The new dense in-biome blanks are ordinary blanks with the same per-zone cost every
existing blank already has — nothing new there except how many of them exist. A one-shot
deterministic codemod (written for this change, deleted after use, matching how the v2 map rework's
`tools/build-map-v2.mjs` worked) rewrites `js/tiles.js`'s blank set and replaces the three corridors.

**Tech Stack:** Vanilla JS + Three.js, no build step, Node's built-in test runner (`node --test`-free
`assert`-based scripts run via `npm test`).

**Spec:** `docs/superpowers/specs/2026-09-28-drift-away-map-v3-bridges-design.md`

## Global Constraints

- Cluster positions, ids, costs, art and levels never change.
- Every ordinary (non-bridge) blank keeps its existing per-zone cost exactly: Home Waters
  `{driftwood:12}`, Frozen Reach `{driftwood:1200,crops:800}`, Timberline Coast
  `{driftwood:1800,crops:1200,kelp:900}`, Abyssal Trench `{planks:60,kelp_rope:40}`.
- A `kind: 'bridge'` tile: `getLevel` returns `MAX_LEVEL`; never appears in any production, darken,
  generator-scarcity, or booster-idle logic; `family: null`; its `zone` is the *destination* zone of
  its crossing.
- The three crossings and their one-time cost (paid in the *departing* zone's resources):
  Home Waters→Frozen Reach `{driftwood:1500,crops:900}`; Home Waters→Timberline Coast
  `{driftwood:1500,crops:900}`; Frozen Reach→Abyssal Trench `{driftwood:60000,crops:36000}`.
- `SAVE_VERSION` becomes `3`, `SAVE_KEY` becomes `'driftaway_save_v3'` (v2's key is left untouched in
  storage, same pattern v1→v2 used). A save that isn't version 3 is rejected and a fresh game starts.
- Commits happen only on the branch/worktree set up for this plan, never on `main`, and only when
  the controller running this plan has been told commits are authorized there.
- Every player-facing change bumps `js/version.js` (MINOR, since this adds new map content) — only
  the final task touches it.
- No new npm dependencies. No changes to camera, resources, generators' economy, or any existing
  zone's cluster art.

## Known-good facts to build from (verified against the live `js/tiles.js` before writing this plan)

- Every non-blank tile already has `cells` of length 3 forming an "up" triangle; there are 144 of
  them, untouched by this plan.
- Today's 3 corridors, in order, with their exact tiles and cells:
  - Home Waters→Frozen Reach: `frozen_blank_42..45` — cells `(-10,0) (-11,0) (-12,1) (-13,1)`.
  - Home Waters→Timberline Coast: `timberline_blank_42..45` — cells `(0,-10) (0,-11) (0,-12) (0,-13)`.
  - Frozen Reach→Abyssal Trench: `abyssal_blank_42..46` — cells `(-23,10) (-23,11) (-23,12) (-23,13) (-23,14)`.
  - All three chains are already perfectly collinear (each step uses the same one of the 6 hex
    directions) — confirmed by walking `TILE_NEIGHBORS` from each chain's start.
- The lattice invariant from the v2 map spec (`2026-09-24-drift-away-map-rework-v2-design.md`) still
  holds: any two cluster cells exactly `hexDistance` 2 apart have exactly one hex that's a neighbour
  of both — that hex is where a connector blank goes.

## Task 1: Bridge kind — hex helper and engine rules

**Files:**
- Modify: `js/hex.js`
- Modify: `js/state.js`
- Test: `tests/hex.test.mjs`, `tests/economy.test.mjs`

**Interfaces:**
- Produces: `isStraightLine(cells)` from `js/hex.js`, exported for reuse by the Task 3 codemod and
  by tests. Signature: `(cells: {row,col}[]) => boolean`.
- Consumes: existing `neighborCells`, `cellKey`, `hexDistance` from `js/hex.js`; existing
  `TILE_BY_ID`, `MAX_LEVEL`, `TILES` from `js/state.js`'s own imports.

There's no real bridge tile in `js/tiles.js` yet (Task 3 adds it) — this task pins the engine rules
with a stand-in fixture, the same way the original blank-tile engine rules were pinned before real
blank data existed (see `tests/economy.test.mjs`'s existing "Blank bridge tiles: engine rules"
block, which does exactly this with `TILES.push`/`TILE_BY_ID.set` in a `try`/`finally`).

- [ ] **Step 1: Write the failing test for `isStraightLine`**

```js
// in tests/hex.test.mjs, near the other hex.js unit tests
{
  assert.equal(isStraightLine([{ row: 0, col: 0 }]), true, 'a single cell is trivially a line');
  assert.equal(isStraightLine([{ row: 0, col: 0 }, { row: 0, col: 1 }]), true, 'two adjacent cells are always a line');
  assert.equal(
    isStraightLine([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }]),
    true,
    'four cells in a row, same direction throughout'
  );
  assert.equal(
    isStraightLine([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: -1, col: 1 }]),
    false,
    'a bend (two different step directions) is not a line'
  );
  assert.equal(
    isStraightLine([{ row: 0, col: 0 }, { row: 5, col: 5 }]),
    false,
    'two cells that are not neighbours at all is not a line'
  );
  console.log('isStraightLine tests passed');
}
```

- [ ] **Step 2: Run it, confirm it fails** (`isStraightLine` doesn't exist yet)

Run: `npm test`
Expected: a `TypeError` or `ReferenceError` importing `isStraightLine` from `js/hex.js`.

- [ ] **Step 3: Implement `isStraightLine` in `js/hex.js`**

Add near the other exports:

```js
// True when every consecutive pair of cells steps in the same one of the six hex directions --
// the shape every bridge tile must be (unlike a cluster's fixed "up" triangle or a blank's single
// hex). A list of 0 or 1 cells is trivially a line.
export function isStraightLine(cells) {
  if (cells.length < 2) return true;
  const directionOf = (a, b) => neighborCells(a.row, a.col).findIndex((n) => n.row === b.row && n.col === b.col);
  const first = directionOf(cells[0], cells[1]);
  if (first === -1) return false;
  for (let i = 1; i < cells.length - 1; i++) {
    if (directionOf(cells[i], cells[i + 1]) !== first) return false;
  }
  return true;
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `npm test`
Expected: `isStraightLine tests passed`, no other regressions.

- [ ] **Step 5: Write the failing test for the bridge fixture's engine rules**

Add a new block in `tests/economy.test.mjs`, styled exactly like the existing "Blank bridge tiles:
engine rules" block right above it:

```js
// --- Bridge tiles: engine rules ---
// No real bridge exists in js/tiles.js yet (Task 3 of the map-v3 plan adds the 3 real ones); this
// pins the engine rules with a stand-in, so they hold whatever the map looks like.
{
  const bridge = {
    id: 'test_bridge', name: 'Test Bridge', family: null, kind: 'bridge',
    cells: [{ row: 90, col: 90 }, { row: 90, col: 91 }, { row: 90, col: 92 }, { row: 90, col: 93 }],
    produces: null, rate: null, boosts: null,
    unlock: { type: 'cost', cost: { driftwood: 500 } }, zone: 'zone2',
  };
  TILES.push(bridge);
  TILE_BY_ID.set(bridge.id, bridge);
  try {
    const state = createInitialState();
    assert.equal(getLevel(state, bridge.id), MAX_LEVEL, 'a bridge has nothing to level, so it is maxed from the start');

    const before = completionCount(state);
    state.unlocked.push(bridge.id);
    assert.equal(completionCount(state), before + 1, 'an unlocked bridge counts toward completion straight away');
    assert.ok(!upgradeList(state).some((row) => row.tile.id === bridge.id), 'a bridge never shows in the upgrade list');
    assert.equal(isLevelUpEligible(state, bridge), false, 'and can never be levelled');
    assert.equal(rateBreakdown(state, 'driftwood').total, 0.5, 'a bridge adds no production');
  } finally {
    TILES.pop();
    TILE_BY_ID.delete(bridge.id);
  }

  console.log('bridge tile engine tests passed');
}
```

- [ ] **Step 6: Run it, confirm it fails**

Run: `npm test`
Expected: `getLevel(state, bridge.id)` returns `1`, not `MAX_LEVEL` — `getLevel` doesn't know about
`kind: 'bridge'` yet.

- [ ] **Step 7: Implement the engine rules in `js/state.js`**

Three separate edits:

1. `RATE_TILES` (near the top, alongside `BOOSTER_TILES`/`PRODUCER_TILES`/etc.) currently reads:

```js
const RATE_TILES = TILES.filter((t) => t.kind !== 'blank');
```

Change to:

```js
const RATE_TILES = TILES.filter((t) => t.kind !== 'blank' && t.kind !== 'bridge');
```

2. `getLevel` currently reads:

```js
export function getLevel(state, tileId) {
  if (TILE_BY_ID.get(tileId)?.kind === 'blank') return MAX_LEVEL;
```

Change the condition to:

```js
export function getLevel(state, tileId) {
  const kind = TILE_BY_ID.get(tileId)?.kind;
  if (kind === 'blank' || kind === 'bridge') return MAX_LEVEL;
```

3. `grantHeadStart` currently reads (the local variable name `bridges` here predates this feature —
   it means blanks; rename it so it isn't confused with the new real `kind: 'bridge'`):

```js
function grantHeadStart(state, count) {
  let granted = 0;
  while (granted < count) {
    const all = lockedTileStatuses(state);
    const useful = all.filter((x) => x.tile.kind !== 'blank' && (x.tile.kind !== 'booster' || !boosterIsIdle(state, x.tile)));
    if (useful.length > 0) {
      state.unlocked.push(nextUnlock(state, useful).tile.id);
      granted++;
      continue;
    }
    const bridges = all.filter((x) => x.tile.kind === 'blank');
    if (bridges.length > 0) {
      state.unlocked.push(nextUnlock(state, bridges).tile.id);
      continue;
    }
    if (all.length === 0) break;
    state.unlocked.push(nextUnlock(state, all).tile.id);
    granted++;
  }
}
```

Change to (excluding both connector kinds from `useful`, and granting either kind of connector as
the fallback, keeping the same three-tier structure):

```js
function grantHeadStart(state, count) {
  let granted = 0;
  while (granted < count) {
    const all = lockedTileStatuses(state);
    const useful = all.filter((x) =>
      x.tile.kind !== 'blank' && x.tile.kind !== 'bridge' && (x.tile.kind !== 'booster' || !boosterIsIdle(state, x.tile))
    );
    if (useful.length > 0) {
      state.unlocked.push(nextUnlock(state, useful).tile.id);
      granted++;
      continue;
    }
    const connectors = all.filter((x) => x.tile.kind === 'blank' || x.tile.kind === 'bridge');
    if (connectors.length > 0) {
      state.unlocked.push(nextUnlock(state, connectors).tile.id);
      continue;
    }
    if (all.length === 0) break;
    state.unlocked.push(nextUnlock(state, all).tile.id);
    granted++;
  }
}
```

Also update the comment two lines above `grantHeadStart` ("Blank bridges never count toward `count`
...") to say "Blanks and bridges never count toward `count`" since both kinds are now covered.

- [ ] **Step 8: Run it, confirm it passes**

Run: `npm test`
Expected: `bridge tile engine tests passed`, all prior sections still passing (33 sections before
this task; still 33 after, since this task adds assertions to existing-style blocks rather than a
new top-level section — confirm the count with `npm test 2>&1 | grep -c passed`).

- [ ] **Step 9: Commit**

```bash
git add js/hex.js js/state.js tests/hex.test.mjs tests/economy.test.mjs
git commit -m "Task 1: bridge kind engine rules and hex helper"
```

## Task 2: Plank bridge rendering

**Files:**
- Create: `js/bridge-props.js`
- Modify: `js/scene.js`
- Modify: `js/ui.js`

**Interfaces:**
- Produces: `buildBridgeProp(group, offsets)` from `js/bridge-props.js` — builds directly into
  `group` (already positioned/oriented by the caller), using `offsets` (`{dx,dz}[]`, the same shape
  `scene.js`'s `tileCells` already produces for every tile, in cell order along the line).
- Consumes: nothing from other new modules. Reads `tile.kind` (from `js/tiles.js` data) and the
  existing `WALL_HEIGHT`, `ZONE_RAFT_COLOR`, `LEVEL_SCALE`, `clusterProp`/`clusterScale` exports
  already in `js/scene.js`/`js/cluster-props.js`.

There's still no real bridge tile in `js/tiles.js` (Task 3 adds it) — this task's manual browser
verification (Step 6) uses a temporary fixture tile, deleted at the end of the step, the same way
`tests/economy.test.mjs` already stands blanks up with `TILES.push`/`TILE_BY_ID.set`.

- [ ] **Step 1: Write `js/bridge-props.js`**

```js
import * as THREE from 'three';

// A plank bridge: cross-planks along the straight line of hexes the tile covers, with two rope
// rails and a post at each end. Bridges have no levels (see js/state.js's getLevel) and aren't in
// CLUSTER_PROPS, so there is exactly one look, not one per level -- and no fixed hex count, unlike
// a cluster's always-3 cells: `offsets` can be any length, in order along the line.
const PLANK_COLOR = 0xa9754a;
const POST_COLOR = 0x6b4c2a;
const ROPE_COLOR = 0xb89a5e;

const materials = new Map();
function material(color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  return materials.get(color);
}

export function buildBridgeProp(group, offsets) {
  const start = offsets[0];
  const end = offsets[offsets.length - 1];
  const dx = end.dx - start.dx;
  const dz = end.dz - start.dz;
  const length = Math.hypot(dx, dz);
  const dir = { x: dx / length, z: dz / length };
  const side = { x: -dir.z, z: dir.x };

  const deckWidth = 0.9;
  const deckY = 0.05;
  const railHeight = 0.34;

  const plankMat = material(PLANK_COLOR);
  const plankGap = 0.32;
  const plankCount = Math.max(2, Math.round(length / plankGap));
  for (let i = 0; i <= plankCount; i++) {
    const t = i / plankCount;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, deckWidth), plankMat);
    plank.position.set(start.dx + dx * t, deckY, start.dz + dz * t);
    plank.rotation.y = Math.atan2(dir.x, dir.z);
    plank.castShadow = true;
    group.add(plank);
  }

  const railMat = material(ROPE_COLOR);
  const postMat = material(POST_COLOR);
  for (const s of [-1, 1]) {
    const ox = side.x * deckWidth * 0.5 * s;
    const oz = side.z * deckWidth * 0.5 * s;
    const from = new THREE.Vector3(start.dx + ox, deckY + railHeight, start.dz + oz);
    const to = new THREE.Vector3(end.dx + ox, deckY + railHeight, end.dz + oz);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, length, 6), railMat);
    rail.position.copy(from).lerp(to, 0.5);
    rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    group.add(rail);
    for (const point of [from, to]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, railHeight + deckY, 8), postMat);
      post.position.set(point.x, (railHeight + deckY) / 2, point.z);
      post.castShadow = true;
      group.add(post);
    }
  }
}
```

- [ ] **Step 2: Wire it into `js/scene.js`'s prop dispatch**

Add the import near the other prop-module imports:

```js
import { buildBridgeProp } from './bridge-props.js';
```

Read `buildLevelProps` first to match its current exact shape (it has been edited several times
this project), then apply this change: a bridge never scales (its geometry is authored directly in
true hex-distance units, like the bespoke cluster designs), builds via `buildBridgeProp` instead of
any cluster/booster/generic path, and gets no level badge and no paused-marker (both are meaningless
for a tile that's always `MAX_LEVEL` and never a generator).

```js
function buildLevelProps(tile, level, offsets) {
  const levelGroup = new THREE.Group();
  const cluster = clusterProp(tile);
  const extraScale = LARGE_BOOSTER_IDS.has(tile.id) ? BOOSTER_PROP_SCALE : 1;
  const groupScale = tile.kind === 'bridge'
    ? 1
    : (cluster ? clusterScale(cluster, level) : PROP_SCALE * extraScale) * LEVEL_SCALE[level];
  const propGroup = new THREE.Group();
  propGroup.position.set(0, WALL_HEIGHT, 0);
  if (tile.kind === 'bridge') {
    buildBridgeProp(propGroup, offsets);
  } else if (cluster) {
    buildClusterProp(cluster, propGroup, level, offsets);
  } else if (tile.family === 'booster') {
    buildCenteredCluster(propGroup, offsets, (sub) => buildSingleHexProp(sub, tile, level), { groupScale });
  } else {
    buildGenericCluster(propGroup, offsets, (sub) => buildSingleHexProp(sub, tile, level), { groupScale });
  }
  if (tile.kind !== 'bridge') {
    const anchorKey = tile.family === 'booster' ? tile.id : tile.family;
    const zoneAnchorKey = `${tile.zone}:${anchorKey}`;
    const anchorHeight = cluster ? cluster.badgeHeight : BADGE_ANCHOR_HEIGHT[zoneAnchorKey] ?? BADGE_ANCHOR_HEIGHT[anchorKey];
    addLevelBadge(propGroup, level, anchorHeight);
    if (tile.kind === 'generator') {
      levelGroup.userData.pausedMarker = addPausedMarker(propGroup, anchorHeight);
    }
  }
  propGroup.scale.setScalar(groupScale);
  levelGroup.add(propGroup);
  levelGroup.userData.darken = propGroup.userData.darken || [];
  freezeStatic(levelGroup);
  return levelGroup;
}
```

(Keep every existing line inside each branch exactly as it already reads in the file — the only
changes are: the new `groupScale` ternary, the new `if (tile.kind === 'bridge')` build branch, and
wrapping the badge/paused-marker block in `if (tile.kind !== 'bridge')`.)

- [ ] **Step 3: Give bridges their own raft tint**

Find `raftColor` in `js/scene.js` (it currently lightens a blank's raft toward white):

```js
function raftColor(tile) {
  const color = new THREE.Color(ZONE_RAFT_COLOR.get(tile.zone));
  return tile.kind === 'blank' ? color.lerp(new THREE.Color(0xffffff), BLANK_LIGHTEN) : color;
}
```

Add a distinct warm plank tint for bridges, next to `BLANK_LIGHTEN`'s own definition:

```js
const BRIDGE_TINT = 0x8a6a45; // warm plank-brown, distinct from a blank's white-lightened tint
```

```js
function raftColor(tile) {
  const color = new THREE.Color(ZONE_RAFT_COLOR.get(tile.zone));
  if (tile.kind === 'blank') return color.lerp(new THREE.Color(0xffffff), BLANK_LIGHTEN);
  if (tile.kind === 'bridge') return color.lerp(new THREE.Color(BRIDGE_TINT), 0.55);
  return color;
}
```

- [ ] **Step 4: Give bridges their own icon and panel text in `js/ui.js`**

`tileIcon` currently reads:

```js
function tileIcon(tile) {
  if (tile.kind === 'blank') return '⬡';
  if (tile.kind === 'producer' || tile.kind === 'generator') return RESOURCE_ICONS[tile.produces];
  return tile.boosts.map((b) => RESOURCE_ICONS[b.resource]).join('');
}
```

Add a bridge case ahead of the blank case:

```js
function tileIcon(tile) {
  if (tile.kind === 'bridge') return '🌉';
  if (tile.kind === 'blank') return '⬡';
  if (tile.kind === 'producer' || tile.kind === 'generator') return RESOURCE_ICONS[tile.produces];
  return tile.boosts.map((b) => RESOURCE_ICONS[b.resource]).join('');
}
```

`showTilePanel` currently has a blank-specific description block right after the "not unlocked"
early return:

```js
  if (tile.kind === 'blank') {
    elements.panelDesc.textContent = 'A walkway between rafts. It makes nothing itself, but opens the way to the tiles beside it.';
    elements.panelProgress.textContent = '';
    elements.panelUnlockBtn.classList.add('hidden');
    elements.panelToggleBtn.classList.add('hidden');
    return;
  }
```

Add a bridge case right above it:

```js
  if (tile.kind === 'bridge') {
    elements.panelDesc.textContent = 'A plank bridge to the next biome. It makes nothing itself, but is the only way across.';
    elements.panelProgress.textContent = '';
    elements.panelUnlockBtn.classList.add('hidden');
    elements.panelToggleBtn.classList.add('hidden');
    return;
  }
  if (tile.kind === 'blank') {
    elements.panelDesc.textContent = 'A walkway between rafts. It makes nothing itself, but opens the way to the tiles beside it.';
    elements.panelProgress.textContent = '';
    elements.panelUnlockBtn.classList.add('hidden');
    elements.panelToggleBtn.classList.add('hidden');
    return;
  }
```

(If `elements.panelToggleBtn` doesn't exist in the version of `js/ui.js` you're reading — it was
added for the Timberline generator on/off switch — omit that line; match whatever the blank case
right above it already does.)

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: unaffected — no test exercises `js/scene.js`/`js/ui.js` rendering directly. Still 33
sections passing (or whatever Task 1 left it at).

- [ ] **Step 6: Manual browser verification with a temporary fixture tile**

Serve the game locally (never on port 4173) and, in the browser console, run:

```js
const T = await import('/js/tiles.js');
const S = await import('/js/state.js');
const fixture = {
  id: 'fixture_bridge', name: 'Fixture Bridge', family: null, kind: 'bridge',
  cells: [{ row: 0, col: -10 }, { row: 0, col: -11 }, { row: 0, col: -12 }, { row: 0, col: -13 }],
  produces: null, rate: null, boosts: null, unlock: { type: 'start' }, zone: 'zone1',
};
T.TILES.push(fixture);
T.TILE_BY_ID.set(fixture.id, fixture);
// rebuild the scene the same way a real reload would, or simply reload after also unlocking it in
// a save (see the project's established pattern: stub Storage.prototype.setItem, write the save
// via the original setItem, then location.reload() -- never a bare reload after a plain
// localStorage.setItem, which races the dying page's own autosave).
```

Confirm: a plank walkway with rope rails and end posts spans the 4 cells in a straight line, sitting
on a warm-brown-tinted raft, with no level badge; clicking it opens a panel reading the bridge
description with no Level Up or generator-toggle button; the console is clean. Remove the fixture
(`T.TILES.pop(); T.TILE_BY_ID.delete(fixture.id);`) — it must not be left in the committed code.

- [ ] **Step 7: Commit**

```bash
git add js/bridge-props.js js/scene.js js/ui.js
git commit -m "Task 2: plank bridge rendering"
```

## Task 3: Map v3 data — dense connectors and the three real bridges

**Files:**
- Create (temporary, deleted at the end of this task): `tools/build-map-v3.mjs`
- Modify: `js/tiles.js` (rewritten by running the codemod)
- Modify: `tests/economy.test.mjs` (real-data assertions, replacing speculative ones)

**Interfaces:**
- Consumes: `TILES`, `TILE_NEIGHBORS` from `js/tiles.js`; `neighborCells`, `cellKey`, `hexDistance`,
  `isStraightLine` from `js/hex.js` (all already exist or were added in Task 1).
- Produces: the rewritten `js/tiles.js` — same 144 clusters, an enlarged blank set, and exactly 3
  new `kind: 'bridge'` tiles. No other file consumes anything new from this task.

This task has no red/green unit-test cycle of its own in the usual sense — it's a one-shot data
transform, verified by running it and then asserting properties of its output (the same shape the
original v2 map rework's own map-data task took). Steps 1-4 build and run the transform; steps 5+
update the test suite to match the new data and verify it.

- [ ] **Step 1: Write `tools/build-map-v3.mjs`**

```js
// One-shot codemod for the map-v3 bridges rework. Run once, verified, then deleted -- there is no
// runtime procedural generation, same as the v2 map rework's own build-map-v2.mjs.
import fs from 'node:fs';
import { TILES } from '../js/tiles.js';
import { neighborCells, cellKey, hexDistance, isStraightLine } from '../js/hex.js';

const clusters = TILES.filter((t) => t.kind !== 'blank');
const oldBlanks = TILES.filter((t) => t.kind === 'blank');

const BLANK_COST = {
  zone1: { driftwood: 12 },
  zone2: { driftwood: 1200, crops: 800 },
  zone3: { driftwood: 1800, crops: 1200, kelp: 900 },
  zone4: { planks: 60, kelp_rope: 40 },
};
const BLANK_NAME = {
  zone1: 'Driftwood Walkway', zone2: 'Ice Causeway', zone3: 'Timber Boardwalk', zone4: 'Kelp-Rope Bridge',
};

// The three corridors this rework replaces, by their current tile ids, in geometric order from the
// departing biome's edge to the arriving biome's entry (verified against the live map before this
// plan was written -- see "Known-good facts" above).
const CROSSINGS = [
  {
    ids: ['frozen_blank_42', 'frozen_blank_43', 'frozen_blank_44', 'frozen_blank_45'],
    destinationZone: 'zone2', name: 'Plank Bridge to Frozen Reach',
    cost: { driftwood: 1500, crops: 900 },
  },
  {
    ids: ['timberline_blank_42', 'timberline_blank_43', 'timberline_blank_44', 'timberline_blank_45'],
    destinationZone: 'zone3', name: 'Plank Bridge to Timberline Coast',
    cost: { driftwood: 1500, crops: 900 },
  },
  {
    ids: ['abyssal_blank_42', 'abyssal_blank_43', 'abyssal_blank_44', 'abyssal_blank_45', 'abyssal_blank_46'],
    destinationZone: 'zone4', name: 'Plank Bridge to Abyssal Trench',
    cost: { driftwood: 60000, crops: 36000 },
  },
];
const crossingIds = new Set(CROSSINGS.flatMap((c) => c.ids));

// Every occupied cell (any cluster, or any blank not being replaced by a bridge), for O(1) "is this
// hex free" checks.
const occupied = new Map();
for (const t of clusters) for (const c of t.cells) occupied.set(cellKey(c.row, c.col), t);
for (const t of oldBlanks) {
  if (crossingIds.has(t.id)) continue;
  for (const c of t.cells) occupied.set(cellKey(c.row, c.col), t);
}

function midpoint(a, b) {
  // The one hex that's a neighbour of both -- guaranteed to exist and be unique whenever
  // hexDistance(a, b) === 2, per the v2 map's own lattice invariant.
  const an = neighborCells(a.row, a.col);
  const bnKeys = new Set(neighborCells(b.row, b.col).map((c) => cellKey(c.row, c.col)));
  return an.find((c) => bnKeys.has(cellKey(c.row, c.col)));
}

// Every pair of clusters in the same zone with a cell exactly 2 apart gets its one connecting hex,
// whether or not it was already an existing blank.
const newConnectorKeys = new Set();
for (const a of clusters) {
  for (const cellA of a.cells) {
    for (const b of clusters) {
      if (a === b || a.zone !== b.zone) continue;
      for (const cellB of b.cells) {
        if (hexDistance(cellA, cellB) !== 2) continue;
        const mid = midpoint(cellA, cellB);
        if (!mid) continue;
        const key = cellKey(mid.row, mid.col);
        if (occupied.has(key)) continue;
        newConnectorKeys.add(key);
        occupied.set(key, { zone: a.zone, isNewConnector: true });
      }
    }
  }
}

// Rebuild each zone's blank list: every surviving old blank (not part of a crossing) plus every
// newly-found connector, renumbered sequentially so the ids stay tidy (`<zone>_blank_01`, ...).
const zoneOf = { zone1: 'homewaters', zone2: 'frozen', zone3: 'timberline', zone4: 'abyssal' };
const newBlanks = [];
for (const zone of ['zone1', 'zone2', 'zone3', 'zone4']) {
  const survivorCells = oldBlanks.filter((t) => t.zone === zone && !crossingIds.has(t.id)).map((t) => t.cells[0]);
  const addedCells = [...newConnectorKeys]
    .map((k) => { const [row, col] = k.split(',').map(Number); return { row, col }; })
    .filter((c) => occupied.get(cellKey(c.row, c.col)).zone === zone);
  const allCells = [...survivorCells, ...addedCells];
  allCells.forEach((cell, i) => {
    newBlanks.push({
      id: `${zoneOf[zone]}_blank_${String(i + 1).padStart(2, '0')}`,
      name: BLANK_NAME[zone],
      cells: [cell],
      family: null, kind: 'blank', produces: null, rate: null, boosts: null,
      unlock: { type: 'cost', cost: BLANK_COST[zone] }, zone,
    });
  });
}

// The three bridges: one tile per crossing, cells = the union of that corridor's old cells, in
// their existing geometric order (already collinear -- verified before writing this plan).
const bridgeTiles = CROSSINGS.map(({ ids, destinationZone, name, cost }, i) => {
  const cells = ids.map((id) => oldBlanks.find((t) => t.id === id).cells[0]);
  if (!isStraightLine(cells)) throw new Error(`crossing ${i} (${name}) is not a straight line -- check the source ids`);
  return {
    id: `bridge_${zoneOf[destinationZone]}`, name, cells,
    family: null, kind: 'bridge', produces: null, rate: null, boosts: null,
    unlock: { type: 'cost', cost }, zone: destinationZone,
  };
});

const finalTiles = [...clusters, ...newBlanks, ...bridgeTiles];

// Write js/tiles.js: keep every line above the `export const TILES = [...]` array (the file's own
// header comments, buildTileIndex, and the TILE_BY_ID/TILE_NEIGHBORS/TILE_NEARBY exports below it)
// untouched; regenerate only the array literal itself. Read the current file first to find exactly
// where the array starts and ends before splicing in `finalTiles`.
console.log(`clusters: ${clusters.length}, blanks: ${newBlanks.length} (was ${oldBlanks.length}), bridges: ${bridgeTiles.length}, total: ${finalTiles.length}`);
// ... implementer: serialize `finalTiles` into the existing array literal's exact object-literal
// style (see any existing tile entry for the field order and formatting), write it back into
// js/tiles.js in place of the old array, keeping everything else in the file identical.
```

The last comment block is deliberately not fully spelled out: read `js/tiles.js` first to see its
exact current formatting (one tile object per line, specific key order) and match it exactly when
you splice the regenerated array back in, the same way the v2 map rework's codemod did. Everything
above that point in this script is complete and ready to run as written.

- [ ] **Step 2: Run it and inspect the console summary**

Run: `node tools/build-map-v3.mjs`
Expected console line: `clusters: 144, blanks: <some number greater than 177 - 12>, bridges: 3, total: <144 + blanks + 3>`
(177 old blanks minus the 12 consumed by the 3 crossings, plus however many new connectors were
found). If it throws on the `isStraightLine` check, stop and re-verify the crossing ids/cells against
the live file before re-running — don't proceed past a thrown error.

- [ ] **Step 3: Sanity-check the rewritten `js/tiles.js` by hand**

Confirm: `js/tiles.js` still starts with its original header comment and helper functions
(`buildTileIndex`, the `TILE_BY_ID`/`TILE_NEIGHBORS`/`TILE_NEARBY` exports) completely unchanged;
only the `TILES` array literal's contents changed. Run `node --check js/tiles.js` to confirm it's
still syntactically valid.

- [ ] **Step 4: Delete the codemod script**

```bash
rm tools/build-map-v3.mjs
rmdir tools 2>/dev/null || true
```

- [ ] **Step 5: Update `tests/economy.test.mjs`'s map-data assertions**

Read the existing "Blank bridge tiles: the map's data" section (right after the engine-rules block
from Task 1) and the tile-count assertion near the top of the file (`clusters.length === 144`). Add,
alongside the existing structural assertions:

```js
// --- Bridge tiles: the map's data (Task 3 of the map-v3 plan) ---
{
  const bridges = TILES.filter((t) => t.kind === 'bridge');
  assert.equal(bridges.length, 3, 'exactly one bridge per inter-biome crossing');
  for (const bridge of bridges) {
    assert.ok(isStraightLine(bridge.cells), `${bridge.id}'s cells are a straight line`);
    assert.ok(bridge.cells.length >= 2, `${bridge.id} spans more than one hex`);
  }
  const byZone = Object.fromEntries(bridges.map((b) => [b.zone, b]));
  assert.deepEqual(byZone.zone2.unlock.cost, { driftwood: 1500, crops: 900 }, 'Home Waters -> Frozen Reach bridge cost, paid in Home Waters resources');
  assert.deepEqual(byZone.zone3.unlock.cost, { driftwood: 1500, crops: 900 }, 'Home Waters -> Timberline Coast bridge cost, paid in Home Waters resources');
  assert.deepEqual(byZone.zone4.unlock.cost, { driftwood: 60000, crops: 36000 }, 'Frozen Reach -> Abyssal Trench bridge cost, paid in Frozen Reach resources');
  // Every ordinary blank still costs exactly what its zone always charged -- the dense new
  // connectors don't introduce a new cost tier.
  const blanks = TILES.filter((t) => t.kind === 'blank');
  const costsByZone = { zone1: { driftwood: 12 }, zone2: { driftwood: 1200, crops: 800 }, zone3: { driftwood: 1800, crops: 1200, kelp: 900 }, zone4: { planks: 60, kelp_rope: 40 } };
  for (const blank of blanks) assert.deepEqual(blank.unlock.cost, costsByZone[blank.zone], `${blank.id} costs exactly what every blank in ${blank.zone} costs`);
  assert.ok(blanks.length > 165, 'the dense connector rule roughly doubled the blank count from the old 177 minus the 12 the bridges absorbed');
  console.log('bridge tile map data tests passed');
}
```

Update the file's existing `clusters.length === 144` assertion's neighbour (the total tile/hex
count, if one is hardcoded anywhere) to match the actual new numbers the codemod printed in Step 2 —
search the file for any other hardcoded `321`, `609`, or `177` and update each to the real new
totals.

Also add `isStraightLine` to this test file's import list from `js/hex.js`.

- [ ] **Step 6: Run the full test suite**

Run: `npm test 2>&1 | tail -30`
Expected: `bridge tile map data tests passed` plus every other section, all passing. If a corridor or
zone-adjacency test fails (e.g. one asserting "zone 3 doesn't touch zone 2" or similar geometric
checks from the v2 rework), read what it actually asserts and update it to reflect that the crossing
is now one bridge tile instead of several blanks, rather than deleting the assertion's intent.

- [ ] **Step 7: Browser verification against the real map**

Serve the game locally (never on port 4173). Using the project's established safe save-injection
pattern (stub `Storage.prototype.setItem` to a no-op, write the save via the captured original
`setItem`, then `location.reload()` in the same script — never a bare reload after a plain
`localStorage.setItem`, which races the dying page's own autosave) seed a save that unlocks a few
clusters near a biome edge plus enough of the new dense connectors to reach one of the three real
bridge tiles, and confirm: the extra connector blanks between clusters that had no path before are
visible and unlockable; the real plank bridge renders correctly at its true position and size (no
fixture this time); its panel shows the right cost, paid in the correct departing zone's resource
icons; unlocking it opens the next biome's clouds, matching today's existing behaviour. Check the
console is clean throughout.

- [ ] **Step 8: Commit**

```bash
git add js/tiles.js tests/economy.test.mjs
git commit -m "Task 3: map v3 data - dense connectors and the three plank bridges"
```

## Task 4: Save version, final verification, docs

**Files:**
- Modify: `js/state.js` (`SAVE_VERSION`, `SAVE_KEY`)
- Modify: `js/version.js`
- Modify: `memory-bank/architecture-notes.md`, `memory-bank/project-overview.md`, `memory-bank/tile-design.md`

**Interfaces:** none new — this task only touches constants and docs.

- [ ] **Step 1: Bump the save version**

In `js/state.js`:

```js
export const SAVE_KEY = 'driftaway_save_v2';
const SAVE_VERSION = 2;
```

becomes:

```js
// v3 is the bridges rework (dense connectors, single-tile inter-biome bridges): the blank set and
// the three crossings changed, so a v2 save's unlocks can't carry over. A new key leaves the v2 key
// untouched in storage, same pattern v1->v2 used.
export const SAVE_KEY = 'driftaway_save_v3';
const SAVE_VERSION = 3;
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: every section still passes — `normalizeSave`/`decodeSave` already key off `SAVE_VERSION`
generically, so no other code should need to change for the version bump itself. If a test hardcodes
`version: 2` while building a fixture save object, update it to `3`.

- [ ] **Step 3: Full-map browser verification**

Serve the game locally (never on port 4173), start a completely fresh game (clear any existing save
first) and confirm: the game starts normally on Home Waters; the resource bar and menu both work;
navigating to each of the three real bridges and each biome shows the new dense connectors and the
correct plank-bridge art; a pasted v2-era save code is rejected the same way a v1 save was rejected
after the v2 rework shipped. Console clean throughout.

- [ ] **Step 4: Bump the version**

In `js/version.js`, bump MINOR (this adds new map content the player can see and use) and reset
PATCH to 0 — read the file first for its exact current value and comment style, then set the new
version to the next MINOR after whatever is there now.

- [ ] **Step 5: Update the docs**

In `memory-bank/tile-design.md`, the "321 tiles, 609 hexes" and "Lattice"/"Biomes" bullets (lines
~15-17) describe the old sparse shortest-path-tree connectors and the old multi-blank corridors —
rewrite them to describe the new dense-connector rule and the single-tile bridges, with the real new
totals from Task 3. The paragraph around line 87 describing "a corridor of 4 blank bridges" leading
to Timberline Coast needs the same update.

In `memory-bank/project-overview.md`, the "Biomes on a compass, joined by blank bridges" bullet
(~line 15) describes "each biome is entered along a corridor of 4-5 blanks" — update it to describe
the new single plank-bridge tile per crossing and its departing-zone cost.

In `memory-bank/architecture-notes.md`, the sentence describing fog-of-war revealing "a biome... as
the way in (its corridor of blank bridges) is bought" (~line 27) needs the same update — a biome's
way in is now one bridge tile, not a corridor.

- [ ] **Step 6: Commit**

```bash
git add js/state.js js/version.js memory-bank/architecture-notes.md memory-bank/project-overview.md memory-bank/tile-design.md
git commit -m "Task 4: save v3, version bump, docs"
```

## Final verification (run by whoever finishes this plan, after all 4 tasks)

- `npm test` passes in full.
- A fresh browser session: start a new game, unlock a handful of clusters and the new dense
  connectors around them, unlock one full crossing via its plank bridge, confirm the next biome's
  clouds clear and its clusters are reachable. Console clean throughout.
- Confirm no other file in the repo still contains the string `'driftaway_save_v2'` outside a
  comment explaining the old key, and that nothing references the deleted `tools/build-map-v3.mjs`.

## Known limitations (carry into the finishing conversation, don't silently fix)

- Every bridge and connector-blank cost in this plan is first-pass and unsimulated, the same caveat
  every earlier zone's numbers have carried.
- The dense-connector rule roughly doubles blank counts per biome; this hasn't been checked against
  scene.js's per-frame or load-time performance the way the original v2 rework's Task 3 checked
  `isUnlocked` cost — if a future session notices slowdown on the fully-unlocked map, that's the
  first place to look.
