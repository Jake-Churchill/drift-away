# Map Rework v2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the hex map as four biomes of atomic 3-hex producer/booster/generator clusters joined by one-hex blank bridge tiles, with the Abyssal Trench as a gated capstone zone, a pan/zoom camera, and per-biome colour coding, shipping as v2.0.0.

**Architecture:** Every tile gets `cells` (an array of hexes) instead of `gridPos`; adjacency, discovery, hit-testing and rendering are generalised from "one hex per tile" to "a set of hexes per tile". Clusters sit on a spacing-3 lattice so any two neighbouring clusters are exactly two hexes apart and one blank hex bridges them. The map itself is literal data in `js/tiles.js`, produced once by a deterministic codemod. The camera becomes a target point plus a zoom, props are built lazily, and `state.unlocked` gets O(1) membership checks, because the map is 4.2x larger.

**Tech Stack:** Vanilla JS ES modules, Three.js r182 (CDN import map), Node's built-in `assert` for tests (`npm test`). No build step, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-24-drift-away-map-rework-v2-design.md`, **including its "Addendum: decisions made while planning the implementation"** (the addendum records everything this plan decided that the original spec left open, and corrects the scale estimate: 321 tiles / 609 hexes, not "2-3x").

## Global Constraints

- **Commits:** the user's standing rule (`~/.claude/CLAUDE.md`) is *never commit, push or amend unless explicitly asked*. This plan therefore ends every task with a **Checkpoint**, not a commit. If you run it under subagent-driven-development, get the user's explicit permission for per-task commits first (recommended: one commit per task, on a git worktree branch, so each task is individually revertable).
- **Version:** only Task 7 touches `js/version.js`, and it sets exactly `'2.0.0'` (MAJOR, requested by the user). Do not bump it anywhere else.
- **Tile ids never change.** Only the `zone` field of the Timberline/Abyssal tiles and the two props modules' file names change (Task 2).
- **No procedural generation at runtime.** The map is literal data in `js/tiles.js`. The Task 6 codemod is a one-shot dev tool that must be deleted once its output is in place.
- **Saves:** new key `driftaway_save_v2`, `state.version === 2`; v1 saves and pasted v1 codes are ignored, and the old save is left untouched in storage.
- **`npm test` must pass at the end of every task.** Tasks 1-4 and 6-7 are covered by the Node suite; Task 5 (renderer, camera) is browser-only and is verified by hand, exactly like `scene.js`/`render.js` always have been (see `memory-bank/architecture-notes.md`).
- **Project rules that still apply:** no bundler, ES modules only, hex rows may be negative (test oddness with `!== 0` / `& 1`, never `=== 1`), `Three.js` stays pinned at `0.182.0` in `index.html`.
- **The code and diffs in this plan are authoritative.** They were produced by replaying this exact sequence in a scratch copy of the repo: `npm test` was green after every task and the result was checked in a browser. If a diff hunk does not apply cleanly, make the equivalent edit by hand and keep the intent.

## Prerequisites (do these before Task 1)

- [ ] **The working tree must contain the uncommitted v1.7.2 resource-bar change** (`js/ui.js`, `js/version.js`, `style.css`: resource cells hidden until first earned). The plan was validated against a tree that includes it. Ask the user to commit it (and this plan and the spec) on `main`, then create a worktree: `git worktree add ../drift-away-map-rework-v2 -b map-rework-v2` and work there.
- [ ] Run `npm test`. Expected: the run ends with 29 lines ending in `passed` and no error. (`npm test 2>&1 | grep -c passed` prints `29`.)
- [ ] Do not run the dev server on port 4173: on the author's machine that port is a different project. Use any free port, e.g. `npx serve -l 4325 .`.

## Decisions this plan makes (all recorded in the spec addendum)

| # | Decision | Why |
|---|----------|-----|
| D1 | Milestone-gated Abyssal clusters stay milestone-only; only cost-gated ones gain planks + kelp_rope | A milestone unlock has no cost to add to; the trench is still gated by its blanks and other clusters |
| D2 | "A booster next to it" (bioluminescence) means within two hexes (`TILE_NEARBY`) | Clusters are never adjacent, so adjacency would leave every trench producer permanently dim |
| D3 | Blanks are maxed from the moment they are unlocked (`getLevel`) | Keeps `completionCount`, the "max out" achievements and `upgradeList` correct with no new branches |
| D4 | Head start grants N clusters plus the blanks needed to reach them | Otherwise a head start would hand out cheap blanks instead of producers |
| D5 | Tile-count achievements become percentages of the map (5/10/25/40/50/75/100) | The old 36/72/108/144 tiers meant "one/two/three/four zones" |
| D6 | Pan + zoom camera replaces per-zone framing and the sail animation | A biome is ~50 world units across; the fixed view shows ~24 |
| D7 | Cached `Set` for `state.unlocked` membership; kind-filtered rate loops | 24 ms/frame at full unlock on the new map (5.8 ms today) -> ~1.2 ms |
| D8 | Props are built lazily per tile per level, then matrices are frozen | 93,000 scene nodes -> only what is unlocked; ~20 ms of matrix updates per frame saved |
| D9 | New save key + version; old save left in storage | Hard reset as agreed, no data destroyed |
| D10 | Biome raft colours `0xd9a441` / `0x7cc8ee` / `0x4f9a4c` / `0x4a3aa8`; blanks 22% paler | "Stronger tile/platform tint", readable at a glance |
| D11 | `zone3-props.js` -> `abyssal-props.js`, `zone4-props.js` -> `timberline-props.js` | File names must match the swapped zone numbers |

## File structure

| File | Change | Responsibility |
|------|--------|----------------|
| `js/hex.js` | **create** | Pure odd-row hex helpers: `cellKey`, `neighborCells`, `hexDistance`, `cellsWithin` |
| `js/tiles.js` | rewrite data + index | 321 tiles with `cells`; `buildTileIndex`; exports `TILE_BY_ID`, `TILE_BY_CELL`, `TILE_NEIGHBORS`, `TILE_NEARBY` |
| `js/zones.js` | modify | Zone list in new order, new colours, no dead `colStart`/`colEnd` |
| `js/state.js` | modify | `isUnlocked`, blank rules, head start, save v2, percentage achievements, nearby lighting |
| `js/scene.js` | modify | Multi-cell rafts/markers, lazy props, camera constants, sun following |
| `js/render.js` | rewrite | Per-cell foam, `pickTile`, camera (pan/zoom/fly), lazy props |
| `js/clouds.js` | modify | `viewTargets` instead of `sailEdges`, per-cell tile positions |
| `js/effects.js` | modify | Level-up pops the lazily built props group |
| `js/main.js` | modify | Pointer drag/pan, wheel and button zoom, click -> `pickTile` |
| `js/ui.js` | modify | Blank tile icon and panel text; Abyssal dim hint uses zone 4 |
| `js/abyssal-props.js`, `js/timberline-props.js` | **rename** | Formerly `zone3-props.js` / `zone4-props.js` |
| `index.html`, `style.css` | modify | Zoom buttons, `touch-action: none` on the canvas |
| `tests/hex.test.mjs` | **create** | Hex helpers and `buildTileIndex` |
| `tests/economy.test.mjs` | modify | Rewritten data/adjacency tests plus new blank/cost/save/achievement tests |
| `package.json` | modify | `npm test` also runs `tests/hex.test.mjs` |
| `memory-bank/*.md`, `js/version.js` | modify | Docs and `2.0.0` (Task 7) |

---
## Task 1: `cells` model, hex helpers and the tile index

Everything that used to say "a tile is one hex at `gridPos`" becomes "a tile is a set of hexes in `cells`". This task changes only the data shape and the adjacency code; every tile still has exactly one cell, so behaviour is identical and all existing tests keep meaning the same thing.

**Files:**
- Create: `js/hex.js`, `tests/hex.test.mjs`
- Modify: `js/tiles.js`, `package.json`, `tests/economy.test.mjs`, `js/scene.js`, `js/main.js`, `js/render.js`

**Interfaces:**
- Produces (`js/hex.js`): `cellKey(row, col) -> "row,col"`; `neighborCells(row, col) -> [{row,col} x6]` ordered E, NE, NW, W, SW, SE; `hexDistance({row,col}, {row,col}) -> number`; `cellsWithin(row, col, radius) -> [{row,col}]` (excludes the cell itself).
- Produces (`js/tiles.js`): every tile has `cells: [{row, col}, ...]` (no `gridPos`); `buildTileIndex(tiles) -> { byId, idByCell, neighbors, nearby }` where `neighbors` maps a tile id to the ids of tiles with a cell touching one of its cells and `nearby` to the ids within two hexes; exports `TILE_BY_ID`, `TILE_BY_CELL`, `TILE_NEIGHBORS`, `TILE_NEARBY` (all `Map`s over the real map).

- [ ] **Step 1: Write the failing tests**

Create `tests/hex.test.mjs`:

````js
import assert from 'node:assert/strict';
import { cellKey, cellsWithin, hexDistance, neighborCells } from '../js/hex.js';
import { buildTileIndex } from '../js/tiles.js';

// --- neighbours ---

for (const [row, col] of [[0, 0], [1, 0], [2, 3], [-1, 2], [-2, -3], [-3, 4]]) {
  const around = neighborCells(row, col);
  assert.equal(around.length, 6, `(${row},${col}) has six neighbours`);
  assert.equal(new Set(around.map((c) => cellKey(c.row, c.col))).size, 6, `(${row},${col}) neighbours are distinct`);
  for (const n of around) {
    assert.ok(
      neighborCells(n.row, n.col).some((back) => back.row === row && back.col === col),
      `adjacency is symmetric: (${row},${col}) <-> (${n.row},${n.col}), including negative rows`
    );
    assert.equal(hexDistance({ row, col }, n), 1, 'a neighbour is one step away');
  }
}

// --- distance ---

assert.equal(hexDistance({ row: 0, col: 0 }, { row: 0, col: 0 }), 0);
assert.equal(hexDistance({ row: 0, col: 0 }, { row: 0, col: 5 }), 5, 'along a row');
assert.equal(hexDistance({ row: 0, col: 0 }, { row: 4, col: 0 }), 4, 'straight down rows');
assert.equal(hexDistance({ row: -3, col: 2 }, { row: 3, col: -1 }), hexDistance({ row: 3, col: -1 }, { row: -3, col: 2 }), 'symmetric');

// --- cellsWithin ---

{
  const ring1 = cellsWithin(2, 2, 1).map((c) => cellKey(c.row, c.col)).sort();
  const neighbours = neighborCells(2, 2).map((c) => cellKey(c.row, c.col)).sort();
  assert.deepEqual(ring1, neighbours, 'radius 1 is exactly the six neighbours');

  const within2 = cellsWithin(-1, 3, 2);
  assert.equal(within2.length, 18, 'radius 2 holds 6 + 12 cells');
  for (const c of within2) {
    const d = hexDistance({ row: -1, col: 3 }, c);
    assert.ok(d >= 1 && d <= 2, `(${c.row},${c.col}) is 1-2 steps away`);
  }
}

// --- buildTileIndex over a hand-made map ---
// Two 3-hex triangles with a single blank hex between them, one more tile far away.
//   A = (0,0) (0,1) (1,0)     blank = (0,2)     B = (0,3) (0,4) (1,3)

{
  const tile = (id, cells) => ({ id, cells: cells.map(([row, col]) => ({ row, col })) });
  const tiles = [
    tile('A', [[0, 0], [0, 1], [1, 0]]),
    tile('bridge', [[0, 2]]),
    tile('B', [[0, 3], [0, 4], [1, 3]]),
    tile('far', [[10, 10]]),
  ];
  const { byId, idByCell, neighbors, nearby } = buildTileIndex(tiles);

  assert.equal(byId.get('A'), tiles[0]);
  assert.equal(idByCell.get(cellKey(1, 3)), 'B', 'every cell of a multi-cell tile resolves to that tile');
  assert.equal(idByCell.get(cellKey(1, 0)), 'A');
  assert.equal(idByCell.get(cellKey(5, 5)), undefined, 'empty water resolves to nothing');

  assert.deepEqual([...neighbors.get('A')], ['bridge'], 'A touches only the bridge, once, however many cells touch it');
  assert.deepEqual([...neighbors.get('B')], ['bridge']);
  assert.deepEqual([...neighbors.get('bridge')].sort(), ['A', 'B']);
  assert.deepEqual([...neighbors.get('far')], []);

  assert.deepEqual([...nearby.get('A')].sort(), ['B', 'bridge'], 'a tile one bridge hex away is nearby');
  assert.deepEqual([...nearby.get('bridge')].sort(), ['A', 'B']);
  assert.deepEqual([...nearby.get('far')], []);
}

console.log('hex tests passed');
````
In `package.json`, make `npm test` run it first:

````diff
diff --git a/package.json b/package.json
index 51ba554..713ffb9 100644
--- a/package.json
+++ b/package.json
@@ -3,7 +3,7 @@
   "private": true,
   "type": "module",
   "scripts": {
-    "test": "node tests/economy.test.mjs && node tests/feel.test.mjs",
+    "test": "node tests/hex.test.mjs && node tests/economy.test.mjs && node tests/feel.test.mjs",
     "build": "scripts/build.sh"
   }
 }
````
- [ ] **Step 2: Run it and watch it fail**

Run: `node tests/hex.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `js/hex.js`.

- [ ] **Step 3: Create `js/hex.js`**

````js
// Odd-row offset hex grid, the layout js/scene.js draws. Rows may be negative: `row % 2` is -1 for
// negative odd rows, so oddness is tested with `!== 0` / `& 1`, never `=== 1`.

export function cellKey(row, col) {
  return `${row},${col}`;
}

// The six neighbours of a cell, ordered E, NE, NW, W, SW, SE.
export function neighborCells(row, col) {
  const deltas = row % 2 === 0
    ? [[0, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]]
    : [[0, 1], [-1, 1], [-1, 0], [0, -1], [1, 0], [1, 1]];
  return deltas.map(([dr, dc]) => ({ row: row + dr, col: col + dc }));
}

function toAxial(row, col) {
  return { q: col - (row - (row & 1)) / 2, r: row };
}

function fromAxial(q, r) {
  return { row: r, col: q + (r - (r & 1)) / 2 };
}

export function hexDistance(a, b) {
  const p = toAxial(a.row, a.col);
  const q = toAxial(b.row, b.col);
  return (Math.abs(p.q - q.q) + Math.abs(p.r - q.r) + Math.abs(p.q + p.r - q.q - q.r)) / 2;
}

// Every cell within `radius` steps of (row, col), excluding the cell itself.
export function cellsWithin(row, col, radius) {
  const { q, r } = toAxial(row, col);
  const cells = [];
  for (let dq = -radius; dq <= radius; dq++) {
    for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++) {
      if (dq === 0 && dr === 0) continue;
      cells.push(fromAxial(q + dq, r + dr));
    }
  }
  return cells;
}
````
- [ ] **Step 4: Convert `js/tiles.js` to `cells` and add the index**

Run this once from the repo root. It rewrites every `gridPos: { row: R, col: C }` as `cells: [{ row: R, col: C }]`, adds the `hex.js` import at the top, and deletes the old neighbour code (everything from `function neighborGridPositions` to the end of the file).

````python
import re
p = 'js/tiles.js'
s = open(p).read()
s = re.sub(r'gridPos: (\{ row: -?\d+, col: -?\d+ \})', r'cells: [\1]', s)
i = s.index('function neighborGridPositions')
open(p, 'w').write("import { cellKey, cellsWithin, neighborCells } from './hex.js';\n\n" + s[:i])
````

Expected: `grep -c "gridPos" js/tiles.js` prints `0` and `grep -c "cells: \[" js/tiles.js` prints `144`. Now append this block verbatim to the end of `js/tiles.js`:

````js
// Everything derived from where tiles sit. Kept as a pure function of a tile list so tests can build
// an index over a small hand-made map as well as the real one.
//   byId        id -> tile
//   idByCell    "row,col" -> id of the tile occupying that cell
//   neighbors   id -> ids of tiles with a cell touching one of this tile's cells
//   nearby      id -> ids of tiles within two hexes (touching, or one bridge hex apart)
export function buildTileIndex(tiles) {
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const idByCell = new Map();
  for (const t of tiles) {
    for (const c of t.cells) idByCell.set(cellKey(c.row, c.col), t.id);
  }
  const collect = (tile, cellsAround) => {
    const ids = new Set();
    for (const c of tile.cells) {
      for (const n of cellsAround(c)) {
        const id = idByCell.get(cellKey(n.row, n.col));
        if (id && id !== tile.id) ids.add(id);
      }
    }
    return [...ids];
  };
  const neighbors = new Map(tiles.map((t) => [t.id, collect(t, (c) => neighborCells(c.row, c.col))]));
  const nearby = new Map(tiles.map((t) => [t.id, collect(t, (c) => cellsWithin(c.row, c.col, 2))]));
  return { byId, idByCell, neighbors, nearby };
}

const INDEX = buildTileIndex(TILES);
export const TILE_BY_ID = INDEX.byId;
export const TILE_BY_CELL = INDEX.idByCell;
export const TILE_NEIGHBORS = INDEX.neighbors;
export const TILE_NEARBY = INDEX.nearby;
````

- [ ] **Step 5: Update the remaining `gridPos` references**

`tests/economy.test.mjs` reads positions in a few places, and `scene.js`, `main.js` and `render.js` read them for placement and click-matching. Every tile has exactly one cell for now, so `cells[0]` is the old `gridPos`. (Task 5 replaces these three files' usage properly.)

````python
import re
for p, pattern in [('tests/economy.test.mjs', r'\b(t|tile|other|t1|t2)\.gridPos\b'),
                   ('js/scene.js', r'\b(tile|t)\.gridPos\b'),
                   ('js/main.js', r'\b(tile|t)\.gridPos\b'),
                   ('js/render.js', r'\b(tile|t)\.gridPos\b')]:
    s = open(p).read()
    open(p, 'w').write(re.sub(pattern, r'\1.cells[0]', s))
````

Expected: `grep -rn "gridPos\." js tests` prints only the unrelated local variable named `gridPos` in `js/main.js`'s click handlers (a variable holding a screen-to-grid result, not a tile field).

- [ ] **Step 6: Run the whole suite**

Run: `npm test 2>&1 | grep -c passed`
Expected: `30` (the 29 existing sections plus `hex tests passed`), and `npm test` exits 0.

- [ ] **Step 7: Checkpoint.** The game plays exactly as before. (Do not commit unless the user has said to.)

---
## Task 2: Swap zone 3 and zone 4 (Timberline becomes zone 3, Abyssal becomes zone 4)

Tile ids stay (`abyssal_*`, `timberline_*`); only the `zone` field, the zone list order, the code that keys off `'zone3'`/`'zone4'`, and two file names change.

**Files:**
- Modify: `js/tiles.js` (data only), `js/zones.js`, `js/state.js`, `js/scene.js`, `js/render.js`, `js/ui.js`, `tests/economy.test.mjs`
- Rename: `js/zone3-props.js` -> `js/abyssal-props.js`, `js/zone4-props.js` -> `js/timberline-props.js`

**Interfaces:**
- Produces: `ZONES` order `zone1` Home Waters, `zone2` Frozen Reach, `zone3` Timberline Coast, `zone4` Abyssal Trench; `buildAbyssalProp(propGroup, tile, level)` and `buildTimberlineProp(propGroup, tile)`; `isLit` and the bioluminescence darkness pass now apply to `zone4` producers.

- [ ] **Step 1: Update the tests first**

These edits change two expectations to the new numbering (the head start now spills into zone 3, the bioluminescence fixtures use zone 4). Apply this diff to `tests/economy.test.mjs`:

````diff
diff --git a/tests/economy.test.mjs b/tests/economy.test.mjs
index 3d328e3..bd4938f 100644
--- a/tests/economy.test.mjs
+++ b/tests/economy.test.mjs
@@ -1397,11 +1397,11 @@ console.log('achievement save migration tests passed');
   }
   const big = doPrestige(finished(HEAD_START_MAX_LEVEL)).state;
   assert.equal(big.unlocked.length, 1 + 2 * HEAD_START_MAX_LEVEL);
-  // Zone 4 borders zone 1 directly and its entry tiles are deliberately zone-1-cheap, so a large
+  // Zone 3 (Timberline) borders zone 1 directly and its entry tiles are deliberately zone-1-cheap, so a large
   // enough head start now legitimately spills into it too, not just deeper into zone 1.
   assert(
-    big.unlocked.every((id) => ['zone1', 'zone4'].includes(TILES.find((t) => t.id === id).zone)),
-    'the head start stays in the zones reachable straight off the start tile (zone 1 and zone 4)'
+    big.unlocked.every((id) => ['zone1', 'zone3'].includes(TILES.find((t) => t.id === id).zone)),
+    'the head start stays in the zones reachable straight off the start tile (zone 1 and zone 3)'
   );
 
   console.log('head start tests passed');
@@ -1514,7 +1514,7 @@ console.log('achievement save migration tests passed');
 
   const noNeighborBooster = TILES.find((t) => t.id === 'abyssal_fish_tide_pool_trap');
   assert(
-    !(TILE_NEIGHBORS.get(noNeighborBooster.id) || []).some((id) => TILES.find((t) => t.id === id)?.zone === 'zone3' && TILES.find((t) => t.id === id)?.kind === 'booster'),
+    !(TILE_NEIGHBORS.get(noNeighborBooster.id) || []).some((id) => TILES.find((t) => t.id === id)?.zone === 'zone4' && TILES.find((t) => t.id === id)?.kind === 'booster'),
     'fixture assumption: this tile has no zone-3 booster neighbor'
   );
 
@@ -1526,7 +1526,7 @@ console.log('achievement save migration tests passed');
   // A zone-3 producer with no unlocked zone-3 booster neighbor is dim...
   assert.equal(isLit(litByBooster, []), false, 'dim with nothing unlocked nearby');
   assert.equal(isLit(litByBooster, [boosterNeighbor.id]), true, '...lit once that neighbor is unlocked');
-  assert.equal(isLit(noNeighborBooster, TILES.filter((t) => t.zone === 'zone3' && t.kind === 'booster').map((t) => t.id)), false, 'still dim: no zone-3 booster is actually adjacent to it, however many are unlocked elsewhere');
+  assert.equal(isLit(noNeighborBooster, TILES.filter((t) => t.zone === 'zone4' && t.kind === 'booster').map((t) => t.id)), false, 'still dim: no zone-3 booster is actually adjacent to it, however many are unlocked elsewhere');
 
   // The darkness penalty actually halves the rate, and lighting it doubles output back to normal.
   // Uses a producer/booster pair whose resources don't overlap, so unlocking the booster only
````
Run: `npm test`
Expected: FAIL at `the head start stays in the zones reachable straight off the start tile (zone 1 and zone 3)`.

- [ ] **Step 2: Swap the zone ids in the tile data**

````python
p = 'js/tiles.js'
s = open(p).read()
s = s.replace("zone: 'zone3'", "zone: 'ZTMP'").replace("zone: 'zone4'", "zone: 'zone3'").replace("zone: 'ZTMP'", "zone: 'zone4'")
open(p, 'w').write(s)
````

- [ ] **Step 3: Rename the props modules and their exports**

````bash
git mv js/zone3-props.js js/abyssal-props.js
git mv js/zone4-props.js js/timberline-props.js
````

Then in `js/abyssal-props.js` change `export function buildZone3Prop(` to `export function buildAbyssalProp(`, and in `js/timberline-props.js` change `export function buildZone4Prop(` to `export function buildTimberlineProp(`. (Only those two lines; leave the comments alone.)

- [ ] **Step 4: Apply the source changes**

Apply this diff (`zones.js` gets the new order and drops the dead `colStart`/`colEnd`; `state.js`, `scene.js`, `render.js` and `ui.js` swap every `'zone3'`/`'zone4'` key, the props dispatch and the achievements; `scene.js`'s temporary `sailEdges` list is rewritten for the new connectivity, and Task 5 removes it):

````diff
diff --git a/js/render.js b/js/render.js
index d481f23..2a6fbd4 100644
--- a/js/render.js
+++ b/js/render.js
@@ -187,11 +187,11 @@ export function updateScene(state, time, { boardTint }) {
       if (objects.trimMeshes) objects.trimMeshes[lvl].visible = lvl === level;
     }
 
-    // Zone 3's bioluminescence: a producer's materials were built in their normal ("lit")
-    // appearance (see js/zone3-props.js's track()) with both states remembered on each one, so a
+    // The Abyssal Trench's bioluminescence: a producer's materials were built in their normal ("lit")
+    // appearance (see js/abyssal-props.js's track()) with both states remembered on each one, so a
     // dim producer is just a color/emissive swap here, not a rebuild — and it can flip back and
     // forth as the player unlocks or (on prestige/restart) loses a nearby booster.
-    if (unlocked && tile.zone === 'zone3' && tile.kind === 'producer') {
+    if (unlocked && tile.zone === 'zone4' && tile.kind === 'producer') {
       const lit = isLit(tile, state.unlocked);
       for (const d of objects.propGroups[level].userData.darken || []) {
         d.material.color.setHex(lit ? d.litColor : d.dimColor);
diff --git a/js/scene.js b/js/scene.js
index 42f6664..e1496d7 100644
--- a/js/scene.js
+++ b/js/scene.js
@@ -2,8 +2,8 @@ import * as THREE from 'three';
 import { TILES } from './tiles.js';
 import { ZONES } from './zones.js';
 import { buildZone2Prop } from './zone2-props.js';
-import { buildZone3Prop } from './zone3-props.js';
-import { buildZone4Prop } from './zone4-props.js';
+import { buildAbyssalProp } from './abyssal-props.js';
+import { buildTimberlineProp } from './timberline-props.js';
 import { buildCloudField, resizeCloudField } from './clouds.js';
 import { createFoamTexture, createWaterNormalTexture } from './textures.js';
 import { DEFAULT_PALETTE } from './palettes.js';
@@ -76,27 +76,27 @@ const BADGE_ANCHOR_HEIGHT = {
   'zone2:frozen_booster_composting_shed': 0.5,
   'zone2:frozen_booster_lighthouse': 1.75,
   // Zone 3's redesigned props, measured the same way.
-  'zone3:fish': 0.85,
-  'zone3:kelp': 0.95,
-  'zone3:driftwood': 0.45,
-  'zone3:crops': 0.65,
-  'zone3:abyssal_booster_windmill': 0.95,
-  'zone3:abyssal_booster_smokehouse': 0.9,
-  'zone3:abyssal_booster_drying_rack': 0.65,
-  'zone3:abyssal_booster_net_weavers': 0.4,
-  'zone3:abyssal_booster_composting_shed': 0.6,
-  'zone3:abyssal_booster_lighthouse': 1.0,
+  'zone4:fish': 0.85,
+  'zone4:kelp': 0.95,
+  'zone4:driftwood': 0.45,
+  'zone4:crops': 0.65,
+  'zone4:abyssal_booster_windmill': 0.95,
+  'zone4:abyssal_booster_smokehouse': 0.9,
+  'zone4:abyssal_booster_drying_rack': 0.65,
+  'zone4:abyssal_booster_net_weavers': 0.4,
+  'zone4:abyssal_booster_composting_shed': 0.6,
+  'zone4:abyssal_booster_lighthouse': 1.0,
   // Zone 4's generators/boosters, measured the same way (no zone-1 archetype to fall back to --
   // planks/kelp_rope/bread have no equivalent there).
-  'zone4:planks': 1.1,
-  'zone4:kelp_rope': 1.3,
-  'zone4:bread': 1.3,
-  'zone4:timberline_booster_tool_shed': 0.75,
-  'zone4:timberline_booster_drying_frames': 0.8,
-  'zone4:timberline_booster_grain_silo': 1.25,
-  'zone4:timberline_booster_timber_yard': 0.85,
-  'zone4:timberline_booster_provision_store': 0.7,
-  'zone4:timberline_booster_millhouse': 1.5,
+  'zone3:planks': 1.1,
+  'zone3:kelp_rope': 1.3,
+  'zone3:bread': 1.3,
+  'zone3:timberline_booster_tool_shed': 0.75,
+  'zone3:timberline_booster_drying_frames': 0.8,
+  'zone3:timberline_booster_grain_silo': 1.25,
+  'zone3:timberline_booster_timber_yard': 0.85,
+  'zone3:timberline_booster_provision_store': 0.7,
+  'zone3:timberline_booster_millhouse': 1.5,
 };
 const TRIM_THICKNESS = { 1: 0.03, 2: 0.045, 3: 0.06 };
 const TRIM_COLOR = { 1: BOOSTER_TRIM, 2: 0xf0c94f, 3: 0xfff0a0 };
@@ -811,9 +811,9 @@ function addProp(raftMesh, tile) {
     if (tile.zone === 'zone2') {
       buildZone2Prop(propGroup, tile, level);
     } else if (tile.zone === 'zone3') {
-      buildZone3Prop(propGroup, tile, level);
+      buildTimberlineProp(propGroup, tile);
     } else if (tile.zone === 'zone4') {
-      buildZone4Prop(propGroup, tile);
+      buildAbyssalProp(propGroup, tile, level);
     } else {
       switch (tile.family) {
         case 'fish': buildFishProp(propGroup, level); break;
@@ -1096,11 +1096,10 @@ export function buildScene(canvas) {
   // branches off an existing zone rather than extending the chain needs its own edge added here,
   // so the cloud field's "can this point ever be seen" sampling covers every sail the "next
   // unlock" shortcut can actually trigger, not just consecutive-zone sails.
-  const sailEdges = [];
-  for (let i = 1; i < ZONES.length; i++) {
-    sailEdges.push([cameraPositions.get(ZONES[i - 1].id).target, cameraPositions.get(ZONES[i].id).target]);
-  }
-  sailEdges.push([cameraPositions.get('zone1').target, cameraPositions.get('zone4').target]);
+  const sailEdges = [['zone1', 'zone2'], ['zone1', 'zone3'], ['zone2', 'zone4']].map(([a, b]) => [
+    cameraPositions.get(a).target,
+    cameraPositions.get(b).target,
+  ]);
 
   const cloudField = buildCloudField({
     zoneIds: ZONES.map((zone) => zone.id),
diff --git a/js/state.js b/js/state.js
index 96c4873..c6ec429 100644
--- a/js/state.js
+++ b/js/state.js
@@ -54,17 +54,17 @@ export function levelMultiplier(level) {
   return 1 + (level - 1) * 0.5;
 }
 
-// Zone 3's mechanic: a zone-3 producer runs at half rate until a zone-3 booster is unlocked
-// hex-adjacent to it (any of the six archetypes, not one dedicated tile — with only one of each
-// scattered across 36 tiles, a single light source would leave most of the zone permanently dim).
-// Every other tile (all of zone 1/2, and zone-3 boosters themselves) is always "lit".
+// The Abyssal Trench's mechanic (zone 4): one of its producers runs at half rate until one of its
+// boosters is unlocked hex-adjacent to it (any of the six archetypes, not one dedicated tile — with
+// only one of each scattered across 36 tiles, a single light source would leave most of the zone
+// permanently dim). Every other tile (all of zones 1-3, and the trench's own boosters) is always "lit".
 const DARKNESS_PENALTY = 0.5;
 export function isLit(tile, unlockedIds) {
-  if (tile.zone !== 'zone3' || tile.kind !== 'producer') return true;
+  if (tile.zone !== 'zone4' || tile.kind !== 'producer') return true;
   return (TILE_NEIGHBORS.get(tile.id) || []).some((id) => {
     if (!unlockedIds.includes(id)) return false;
     const neighbor = TILES.find((t) => t.id === id);
-    return neighbor?.zone === 'zone3' && neighbor.kind === 'booster';
+    return neighbor?.zone === 'zone4' && neighbor.kind === 'booster';
   });
 }
 function darknessFactor(tile, unlockedIds) {
@@ -323,7 +323,7 @@ export const ACHIEVEMENTS = [
     name: 'The Abyssal Trench',
     description: 'Unlock your first tile in the Abyssal Trench',
     reward: 3,
-    condition: (state) => state.unlocked.some((id) => TILES.find((t) => t.id === id)?.zone === 'zone3'),
+    condition: (state) => state.unlocked.some((id) => TILES.find((t) => t.id === id)?.zone === 'zone4'),
   },
   {
     id: 'abyssal-trench-complete',
@@ -331,7 +331,7 @@ export const ACHIEVEMENTS = [
     description: 'Max out every tile in the Abyssal Trench',
     reward: 10,
     condition: (state) =>
-      TILES.filter((t) => t.zone === 'zone3').every(
+      TILES.filter((t) => t.zone === 'zone4').every(
         (t) => state.unlocked.includes(t.id) && getLevel(state, t.id) >= MAX_LEVEL
       ),
   },
@@ -340,7 +340,7 @@ export const ACHIEVEMENTS = [
     name: 'The Timberline Coast',
     description: 'Unlock your first tile in the Timberline Coast',
     reward: 3,
-    condition: (state) => state.unlocked.some((id) => TILES.find((t) => t.id === id)?.zone === 'zone4'),
+    condition: (state) => state.unlocked.some((id) => TILES.find((t) => t.id === id)?.zone === 'zone3'),
   },
   {
     id: 'timberline-coast-complete',
@@ -348,7 +348,7 @@ export const ACHIEVEMENTS = [
     description: 'Max out every tile in the Timberline Coast',
     reward: 10,
     condition: (state) =>
-      TILES.filter((t) => t.zone === 'zone4').every(
+      TILES.filter((t) => t.zone === 'zone3').every(
         (t) => state.unlocked.includes(t.id) && getLevel(state, t.id) >= MAX_LEVEL
       ),
   },
diff --git a/js/ui.js b/js/ui.js
index 5bfa538..f77d9de 100644
--- a/js/ui.js
+++ b/js/ui.js
@@ -351,9 +351,9 @@ function boosterHint(tile, state) {
   return `You have no ${icons} tiles yet. This boosts every ${resources.map(resourceLabel).join(' or ')} tile you build, wherever it sits.`;
 }
 
-// Zone 3's bioluminescence: a producer with no unlocked booster hex-adjacent to it runs dim.
+// The Abyssal Trench's bioluminescence: a producer with no unlocked booster hex-adjacent to it runs dim.
 function dimHint(tile, state) {
-  if (tile.kind !== 'producer' || tile.zone !== 'zone3' || !state.unlocked.includes(tile.id)) return '';
+  if (tile.kind !== 'producer' || tile.zone !== 'zone4' || !state.unlocked.includes(tile.id)) return '';
   if (isLit(tile, state.unlocked)) return '';
   return 'Dim — production is halved until a bioluminescent structure is unlocked next to it.';
 }
diff --git a/js/zones.js b/js/zones.js
index fbbe046..b120936 100644
--- a/js/zones.js
+++ b/js/zones.js
@@ -1,6 +1,6 @@
 export const ZONES = [
-  { id: 'zone1', name: 'Home Waters', colStart: 0, colEnd: 5, raftColor: 0xc9975b },
-  { id: 'zone2', name: 'Frozen Reach', colStart: 6, colEnd: 11, raftColor: 0xa9c9d6 },
-  { id: 'zone3', name: 'Abyssal Trench', colStart: 12, colEnd: 17, raftColor: 0x2f3a5a },
-  { id: 'zone4', name: 'Timberline Coast', colStart: 0, colEnd: 5, raftColor: 0x6b4a30 },
+  { id: 'zone1', name: 'Home Waters', raftColor: 0xc9975b },
+  { id: 'zone2', name: 'Frozen Reach', raftColor: 0xa9c9d6 },
+  { id: 'zone3', name: 'Timberline Coast', raftColor: 0x6b4a30 },
+  { id: 'zone4', name: 'Abyssal Trench', raftColor: 0x2f3a5a },
 ];
````
- [ ] **Step 5: Run the whole suite**

Run: `npm test 2>&1 | grep -c passed`
Expected: `30`, exit 0. Also `grep -rn "zone3-props\|zone4-props\|buildZone3Prop\|buildZone4Prop" js tests` must print nothing.

- [ ] **Step 6: Checkpoint.** Nothing player-visible has changed except zone colours in the code and the bioluminescence/achievement wiring following the new numbering.

---
## Task 3: O(1) unlocked-tile membership and kind-filtered rate loops

The v2 map has 321 tiles instead of 144. Every per-frame question of the form `state.unlocked.includes(tile.id)` is a linear scan, and the rate maths asks it for every tile several times a frame. Measured in the prototype (state code only, everything unlocked): **24 ms per frame on the new map, 5.8 ms on today's** — over a whole 60 fps frame budget before any drawing. This task adds a cached `Set` and precomputed per-kind tile lists. It is behaviour-preserving and is done now (on the old map) so it can be measured against a baseline.

**Files:**
- Modify: `js/state.js`, `js/render.js`, `tests/economy.test.mjs`

**Interfaces:**
- Produces: `isUnlocked(unlockedIds, tileId) -> boolean` exported from `js/state.js`. The `Set` is cached per array and rebuilt only when the array's identity or length changes (the game only ever appends to `state.unlocked` or replaces it wholesale).

- [ ] **Step 1: Measure the baseline**

Save this script outside the repo (it is a throwaway, not committed), e.g. as `bench.mjs` in your temp directory:

````js
const root = process.argv[2];
const { TILES } = await import(`${root}/js/tiles.js`);
const S = await import(`${root}/js/state.js`);
const { RESOURCES } = S;
function frame(state) {
  S.advance(state, 0.016);
  for (const r of RESOURCES) S.rateBreakdown(state, r);
  const statuses = S.lockedTileStatuses(state);
  S.nextUnlock(state, statuses);
  S.upgradeList(state);
  for (const t of TILES) S.isDiscovered(t, state);
  for (const t of TILES) S.getLevel(state, t.id);
}
function makeState(fraction) {
  const state = S.createInitialState();
  const n = Math.floor(TILES.length * fraction);
  state.unlocked = TILES.slice(0, n).map((t) => t.id);
  for (const t of TILES.slice(0, n)) state.levels[t.id] = 2;
  for (const r of RESOURCES) state.resources[r] = 1e9;
  return state;
}
for (const f of [0.25, 1]) {
  const state = makeState(f);
  for (let i = 0; i < 20; i++) frame(state);
  const N = 300; const t0 = performance.now();
  for (let i = 0; i < N; i++) frame(state);
  console.log(`${root.split('/').slice(-1)[0]} ${TILES.length} tiles, ${Math.round(f*100)}% unlocked: ${((performance.now()-t0)/N).toFixed(3)} ms/frame`);
}
````
Run: `node bench.mjs "$(pwd)"` from the repo root.
Expected (this machine, Task 2 state): `144 tiles, 100% unlocked: ~5.8 ms/frame`. Note your own number.

- [ ] **Step 2: Write the failing test**

Apply this diff to `tests/economy.test.mjs` (a new `isUnlocked` section and its import):

````diff
diff --git a/tests/economy.test.mjs b/tests/economy.test.mjs
index bd4938f..d9194b0 100644
--- a/tests/economy.test.mjs
+++ b/tests/economy.test.mjs
@@ -28,6 +28,7 @@ import {
   isFullyComplete,
   isLevelUpEligible,
   isLit,
+  isUnlocked,
   levelUpCost,
   levelUpIntensity,
   levelUpTile,
@@ -172,6 +173,20 @@ for (const tile of TILES) {
 
 console.log('geometry-derived adjacency tests passed');
 
+// --- isUnlocked (cached membership) ---
+
+{
+  const ids = ['a'];
+  assert.equal(isUnlocked(ids, 'a'), true);
+  assert.equal(isUnlocked(ids, 'b'), false);
+  ids.push('b');
+  assert.equal(isUnlocked(ids, 'b'), true, 'a tile appended to the same array is seen straight away');
+  const replaced = ['c'];
+  assert.equal(isUnlocked(replaced, 'a'), false, 'a replaced array is never mistaken for the old one');
+  assert.equal(isUnlocked(replaced, 'c'), true);
+  console.log('unlocked membership tests passed');
+}
+
 // --- createInitialState ---
 
 {
````
Run: `npm test`
Expected: FAIL — `isUnlocked` is not exported from `js/state.js`.

- [ ] **Step 3: Implement**

Apply this diff to `js/state.js` (adds `isUnlocked`, the cached kind lists, and switches every hot-path `includes`/`find` over) and `js/render.js` (its per-tile `state.unlocked.includes` call):

````diff
diff --git a/js/render.js b/js/render.js
index 2a6fbd4..53b981e 100644
--- a/js/render.js
+++ b/js/render.js
@@ -1,6 +1,6 @@
 import * as THREE from 'three';
 import { TILES } from './tiles.js';
-import { getLevel, isDiscovered, isEligible, isLit } from './state.js';
+import { getLevel, isDiscovered, isEligible, isLit, isUnlocked } from './state.js';
 import { buildScene } from './scene.js';
 import { updateCloudField, renderCloudField, setCloudTint } from './clouds.js';
 import { DEFAULT_PALETTE, PALETTES } from './palettes.js';
@@ -167,7 +167,7 @@ export function updateScene(state, time, { boardTint }) {
   for (let i = 0; i < TILES.length; i++) {
     const tile = TILES[i];
     const objects = tileObjects.get(tile.id);
-    const unlocked = state.unlocked.includes(tile.id);
+    const unlocked = isUnlocked(state.unlocked, tile.id);
     const discovered = isDiscovered(tile, state); // already true when `unlocked` is true
 
     objects.raftMesh.visible = unlocked;
diff --git a/js/state.js b/js/state.js
index c6ec429..7df6d95 100644
--- a/js/state.js
+++ b/js/state.js
@@ -1,4 +1,4 @@
-import { TILES, TILE_NEIGHBORS } from './tiles.js';
+import { TILES, TILE_BY_ID, TILE_NEIGHBORS } from './tiles.js';
 import { ZONES } from './zones.js';
 import { PALETTES } from './palettes.js';
 
@@ -10,6 +10,27 @@ export const GOODS = ['planks', 'kelp_rope', 'bread'];
 export const RESOURCES = [...BASE_RESOURCES, ...GOODS];
 export const SAVE_KEY = 'driftaway_save_v1';
 
+// Membership in `state.unlocked` is asked per tile, per frame, from many places, so on a map of a few
+// hundred tiles a linear `includes` scan dominates the frame. The array stays the saved source of
+// truth (tiles are only ever appended, or the whole array is replaced on prestige/restart/import);
+// this Set is rebuilt only when the array's identity or length changes.
+const unlockedSets = new WeakMap();
+export function isUnlocked(unlockedIds, tileId) {
+  let entry = unlockedSets.get(unlockedIds);
+  if (!entry || entry.length !== unlockedIds.length) {
+    entry = { length: unlockedIds.length, set: new Set(unlockedIds) };
+    unlockedSets.set(unlockedIds, entry);
+  }
+  return entry.set.has(tileId);
+}
+
+// Tiles by kind, computed once: the per-frame rate maths walks these, not every tile on the map.
+const RATE_TILES = TILES.filter((t) => t.kind !== 'blank');
+const BOOSTER_TILES = TILES.filter((t) => t.kind === 'booster');
+const PRODUCER_TILES = TILES.filter((t) => t.kind === 'producer');
+const GENERATOR_TILES = TILES.filter((t) => t.kind === 'generator');
+const SOURCE_TILES = TILES.filter((t) => t.kind === 'producer' || t.kind === 'generator');
+
 // 'kelp_rope' -> 'kelp rope' -> 'Kelp Rope', for achievement names/descriptions. A no-op for
 // every other resource, which has no underscore to begin with.
 function resourceLabel(resource) {
@@ -62,8 +83,8 @@ const DARKNESS_PENALTY = 0.5;
 export function isLit(tile, unlockedIds) {
   if (tile.zone !== 'zone4' || tile.kind !== 'producer') return true;
   return (TILE_NEIGHBORS.get(tile.id) || []).some((id) => {
-    if (!unlockedIds.includes(id)) return false;
-    const neighbor = TILES.find((t) => t.id === id);
+    if (!isUnlocked(unlockedIds, id)) return false;
+    const neighbor = TILE_BY_ID.get(id);
     return neighbor?.zone === 'zone4' && neighbor.kind === 'booster';
   });
 }
@@ -72,16 +93,16 @@ function darknessFactor(tile, unlockedIds) {
 }
 
 function boostPercentFor(resource, unlockedIds, levels = {}) {
-  return TILES
-    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'booster')
+  return BOOSTER_TILES
+    .filter((t) => isUnlocked(unlockedIds, t.id))
     .flatMap((t) => t.boosts.map((b) => ({ ...b, level: levels[t.id] || 1 })))
     .filter((b) => b.resource === resource)
     .reduce((sum, b) => sum + b.percent * levelMultiplier(b.level), 0);
 }
 
 export function effectiveRate(resource, unlockedIds, levels = {}, prestigeUpgrades = {}, ballastPercent = 0) {
-  const baseSum = TILES
-    .filter((t) => unlockedIds.includes(t.id) && t.kind === 'producer' && t.produces === resource)
+  const baseSum = PRODUCER_TILES
+    .filter((t) => isUnlocked(unlockedIds, t.id) && t.produces === resource)
     .reduce((sum, t) => sum + t.rate * levelMultiplier(levels[t.id] || 1) * darknessFactor(t, unlockedIds), 0);
   const boosterMultiplier = 1 + boostPercentFor(resource, unlockedIds, levels) / 100;
   const prestigeMultiplier = 1 + (PRESTIGE_UPGRADE_PERCENT * (prestigeUpgrades[resource] || 0)) / 100;
@@ -113,8 +134,8 @@ export function rateBreakdown(state, resource) {
   // `boostPercent` -- fine, since generatorThrottle/generatorScarcityFactors don't themselves
   // depend on this resource's boost, only on level+boost of whatever's consuming each input.
   const generatorFactors = generatorScarcityFactors(state);
-  for (const tile of TILES) {
-    if (!state.unlocked.includes(tile.id)) continue;
+  for (const tile of RATE_TILES) {
+    if (!isUnlocked(state.unlocked, tile.id)) continue;
     const multiplier = levelMultiplier(getLevel(state, tile.id));
     if (tile.kind === 'producer' && tile.produces === resource) base += tile.rate * multiplier * darknessFactor(tile, state.unlocked);
     if (tile.kind === 'generator' && tile.produces === resource) base += tile.rate * multiplier * generatorThrottle(tile, generatorFactors);
@@ -145,7 +166,7 @@ export function rateBreakdown(state, resource) {
 // is asking about -- it already exists and will produce as soon as its input income catches up.
 export function boosterIsIdle(state, tile) {
   return tile.boosts.every(
-    (b) => !TILES.some((t) => state.unlocked.includes(t.id) && (t.kind === 'producer' || t.kind === 'generator') && t.produces === b.resource)
+    (b) => !SOURCE_TILES.some((t) => isUnlocked(state.unlocked, t.id) && t.produces === b.resource)
   );
 }
 
@@ -163,8 +184,8 @@ export function boosterGain(state, tile, resource) {
 }
 
 export function isDiscovered(tile, state) {
-  if (state.unlocked.includes(tile.id)) return true;
-  return TILE_NEIGHBORS.get(tile.id).some((id) => state.unlocked.includes(id));
+  if (isUnlocked(state.unlocked, tile.id)) return true;
+  return TILE_NEIGHBORS.get(tile.id).some((id) => isUnlocked(state.unlocked, id));
 }
 
 export function isEligible(tile, state) {
@@ -209,7 +230,7 @@ export function unlockEta(state, tile) {
 
 // Every tile the player can see but hasn't unlocked, with its timer.
 export function lockedTileStatuses(state) {
-  return TILES.filter((t) => !state.unlocked.includes(t.id) && isDiscovered(t, state)).map((tile) => ({
+  return TILES.filter((t) => !isUnlocked(state.unlocked, t.id) && isDiscovered(t, state)).map((tile) => ({
     tile,
     eta: unlockEta(state, tile),
   }));
@@ -233,7 +254,7 @@ export function getLevel(state, tileId) {
 export const TOTAL_TILE_COUNT = TILES.length;
 
 export function completionCount(state) {
-  return TILES.filter((t) => state.unlocked.includes(t.id) && getLevel(state, t.id) >= MAX_LEVEL).length;
+  return TILES.filter((t) => isUnlocked(state.unlocked, t.id) && getLevel(state, t.id) >= MAX_LEVEL).length;
 }
 
 export function isFullyComplete(state) {
@@ -306,7 +327,7 @@ export const ACHIEVEMENTS = [
     name: 'Frozen Reach',
     description: 'Unlock your first tile in the Frozen Reach',
     reward: 2,
-    condition: (state) => state.unlocked.some((id) => TILES.find((t) => t.id === id)?.zone === 'zone2'),
+    condition: (state) => state.unlocked.some((id) => TILE_BY_ID.get(id)?.zone === 'zone2'),
   },
   {
     id: 'frozen-reach-complete',
@@ -315,7 +336,7 @@ export const ACHIEVEMENTS = [
     reward: 8,
     condition: (state) =>
       TILES.filter((t) => t.zone === 'zone2').every(
-        (t) => state.unlocked.includes(t.id) && getLevel(state, t.id) >= MAX_LEVEL
+        (t) => isUnlocked(state.unlocked, t.id) && getLevel(state, t.id) >= MAX_LEVEL
       ),
   },
   {
@@ -323,7 +344,7 @@ export const ACHIEVEMENTS = [
     name: 'The Abyssal Trench',
     description: 'Unlock your first tile in the Abyssal Trench',
     reward: 3,
-    condition: (state) => state.unlocked.some((id) => TILES.find((t) => t.id === id)?.zone === 'zone4'),
+    condition: (state) => state.unlocked.some((id) => TILE_BY_ID.get(id)?.zone === 'zone4'),
   },
   {
     id: 'abyssal-trench-complete',
@@ -332,7 +353,7 @@ export const ACHIEVEMENTS = [
     reward: 10,
     condition: (state) =>
       TILES.filter((t) => t.zone === 'zone4').every(
-        (t) => state.unlocked.includes(t.id) && getLevel(state, t.id) >= MAX_LEVEL
+        (t) => isUnlocked(state.unlocked, t.id) && getLevel(state, t.id) >= MAX_LEVEL
       ),
   },
   {
@@ -340,7 +361,7 @@ export const ACHIEVEMENTS = [
     name: 'The Timberline Coast',
     description: 'Unlock your first tile in the Timberline Coast',
     reward: 3,
-    condition: (state) => state.unlocked.some((id) => TILES.find((t) => t.id === id)?.zone === 'zone3'),
+    condition: (state) => state.unlocked.some((id) => TILE_BY_ID.get(id)?.zone === 'zone3'),
   },
   {
     id: 'timberline-coast-complete',
@@ -349,7 +370,7 @@ export const ACHIEVEMENTS = [
     reward: 10,
     condition: (state) =>
       TILES.filter((t) => t.zone === 'zone3').every(
-        (t) => state.unlocked.includes(t.id) && getLevel(state, t.id) >= MAX_LEVEL
+        (t) => isUnlocked(state.unlocked, t.id) && getLevel(state, t.id) >= MAX_LEVEL
       ),
   },
 ];
@@ -566,7 +587,7 @@ export function levelUpCost(tile, targetLevel) {
 
 export function isLevelUpEligible(state, tile) {
   const level = getLevel(state, tile.id);
-  if (!state.unlocked.includes(tile.id) || level >= MAX_LEVEL) return false;
+  if (!isUnlocked(state.unlocked, tile.id) || level >= MAX_LEVEL) return false;
   const cost = levelUpCost(tile, level + 1);
   return Object.entries(cost).every(([resource, amount]) => state.resources[resource] >= amount);
 }
@@ -596,7 +617,7 @@ export function costProgressFraction(cost, state) {
 export function upgradeList(state) {
   const rows = [];
   for (const tile of TILES) {
-    if (!state.unlocked.includes(tile.id)) continue;
+    if (!isUnlocked(state.unlocked, tile.id)) continue;
     const level = getLevel(state, tile.id);
     if (level >= MAX_LEVEL) continue;
     const cost = levelUpCost(tile, level + 1);
@@ -629,7 +650,7 @@ export function offlineRate(state) {
 // input than its (lower, capped) output actually needed that tick -- a known first-pass
 // simplification; see docs/superpowers/specs/2026-09-24-drift-away-zone4-design.md.
 function generatorTiles(unlockedIds) {
-  return TILES.filter((t) => unlockedIds.includes(t.id) && t.kind === 'generator');
+  return GENERATOR_TILES.filter((t) => isUnlocked(unlockedIds, t.id));
 }
 
 function generatorMultiplier(tile, unlockedIds, levels) {
@@ -718,7 +739,7 @@ export function tick(state, dt) {
 }
 
 export function unlockTile(state, tile) {
-  if (state.unlocked.includes(tile.id)) return false;
+  if (isUnlocked(state.unlocked, tile.id)) return false;
   if (!isEligible(tile, state)) return false;
 
   if (tile.unlock.type === 'cost') {
@@ -827,7 +848,7 @@ export function advance(state, elapsedSeconds) {
 // zone is the biggest moment in the game. Call after the tile is in state.unlocked.
 export function unlockIntensity(state, tile) {
   if (tile.zone !== ZONES[0].id) {
-    const inZone = state.unlocked.filter((id) => TILES.find((t) => t.id === id)?.zone === tile.zone).length;
+    const inZone = state.unlocked.filter((id) => TILE_BY_ID.get(id)?.zone === tile.zone).length;
     if (inZone === 1) return 1;
   }
   const progress = Math.max(0, Math.min(1, (state.unlocked.length - 1) / (TOTAL_TILE_COUNT - 1)));
````
- [ ] **Step 4: Run the suite and re-measure**

Run: `npm test 2>&1 | grep -c passed`
Expected: `31`, exit 0. Then `node bench.mjs "$(pwd)"` again.
Expected: at least 3x faster than your Step 1 number (about `1.2 ms/frame` at 100% unlocked here). `grep -n "unlocked.includes\|unlockedIds.includes" js/state.js js/render.js` must print nothing.

- [ ] **Step 5: Checkpoint.**

---
## Task 4: Engine rules for blank tiles, head start, save v2 and percentage achievements

Everything the new map needs from the *rules*, done against the current data so it can be tested in isolation. Blank tiles do not exist yet, so their tests use a stand-in tile that the test adds to `TILES` and removes again; Task 6 adds tests against the real ones.

**Files:**
- Modify: `js/state.js`, `tests/economy.test.mjs`

**Interfaces:**
- Consumes: `TILE_BY_ID` (Task 1), `isUnlocked` (Task 3).
- Produces: `getLevel(state, id)` returns `MAX_LEVEL` for any `kind: 'blank'` tile; `SAVE_KEY === 'driftaway_save_v2'`, `createInitialState().version === 2`, `decodeSave`/`loadState` reject anything whose `version !== 2`; head start grants `2 x level` non-blank tiles plus any blanks needed to reach them; achievements `tiles-5`, `tiles-10`, `tiles-25`, `tiles-40`, `tiles-50`, `tiles-75`, `tiles-100` (rounded-up share of `TOTAL_TILE_COUNT`) replace `tiles-10`...`tiles-144`, keeping the same seven names and rewards.

- [ ] **Step 1: Write the failing tests**

Apply this diff to `tests/economy.test.mjs`. It makes the halfway-there, head-start and tile-tier tests independent of the exact tile count, moves the save fixtures to `version: 2` (and adds "a v1 save is rejected"), and adds the blank-tile engine section:

````diff
diff --git a/tests/economy.test.mjs b/tests/economy.test.mjs
index d9194b0..94f0f25 100644
--- a/tests/economy.test.mjs
+++ b/tests/economy.test.mjs
@@ -1,5 +1,5 @@
 import assert from 'node:assert/strict';
-import { TILES, TILE_NEIGHBORS } from '../js/tiles.js';
+import { TILES, TILE_BY_ID, TILE_NEIGHBORS } from '../js/tiles.js';
 import {
   ACHIEVEMENTS,
   advance,
@@ -753,10 +753,10 @@ console.log('economy math tests passed');
 }
 
 {
-  // halfway-there fires at ceil(TOTAL_TILE_COUNT / 2) maxed tiles. With 144 tiles that's exactly
-  // 72 -- also exactly all of zone 1 + zone 2 (the first 72 entries in TILES) and exactly the
-  // tiles-72 tier, so all three fire together here; that's a coincidence of the current tile
-  // count, not something this test tries to avoid (zone 3's own version hit the same overlap).
+  // halfway-there fires at ceil(TOTAL_TILE_COUNT / 2) maxed tiles. That is also exactly the tiles-50
+  // tier's unlock count, so the two fire together here -- a coincidence of the definitions, not
+  // something this test tries to avoid. Whatever the earlier tiles already completed is awarded and
+  // consumed by the first check, so only the half-way tile's own awards show up in the second.
   const half = Math.ceil(TOTAL_TILE_COUNT / 2);
   const state = createInitialState();
   const maxed = TILES.slice(0, half - 1);
@@ -772,13 +772,11 @@ console.log('economy math tests passed');
   state.unlocked.push(nextTile.id);
   state.levels[nextTile.id] = MAX_LEVEL;
   const awarded = checkAchievements(state);
-  assert.deepEqual(
-    awarded.map((a) => a.id).sort(),
-    ['frozen-reach-complete', 'halfway-there', 'tiles-72'],
-    'half the tiles maxed earns halfway-there, and happens to also complete zone 2 and hit tiles-72'
-  );
+  const awardedIds = awarded.map((a) => a.id);
+  assert.ok(awardedIds.includes('halfway-there'), 'half the tiles maxed earns halfway-there');
   assert.equal(awarded.find((a) => a.id === 'halfway-there').reward, 2, 'halfway-there pays 2 gold');
-  assert.equal(state.gold, goldBefore + 2 + 8 + 4, 'halfway-there + frozen-reach-complete + tiles-72');
+  assert.ok(awardedIds.includes('tiles-50'), 'and, being half the map, also hits the tiles-50 tier');
+  assert.equal(state.gold, goldBefore + awarded.reduce((sum, a) => sum + a.reward, 0), 'gold matches what was awarded');
 }
 
 {
@@ -868,7 +866,7 @@ function seedSave(save) {
 {
   // a save from before gold/achievements existed
   seedSave({
-    version: 1,
+    version: 2,
     resources: { fish: 1, kelp: 2, driftwood: 3, crops: 4 },
     lifetime: { fish: 1, kelp: 2, driftwood: 3, crops: 4 },
     unlocked: ['driftwood_start'],
@@ -885,7 +883,7 @@ function seedSave(save) {
 {
   // a migrated save already past a threshold is credited on load, not on the next tick
   seedSave({
-    version: 1,
+    version: 2,
     resources: { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
     lifetime: { fish: 6000, kelp: 0, driftwood: 0, crops: 0 },
     unlocked: ['driftwood_start'],
@@ -1112,8 +1110,8 @@ console.log('achievement save migration tests passed');
   }
 
   // a save from an older version missing newer fields is filled in from the defaults
-  const old = decodeSave(btoa(JSON.stringify({ resources: { fish: 5 }, lifetime: { fish: 5 }, unlocked: ['driftwood_start'] })));
-  assert(old, 'an older, sparser save still imports');
+  const old = decodeSave(btoa(JSON.stringify({ version: 2, resources: { fish: 5 }, lifetime: { fish: 5 }, unlocked: ['driftwood_start'] })));
+  assert(old, 'a sparser save from this version still imports');
   assert.equal(old.resources.fish, 5);
   assert.equal(old.resources.kelp, 0);
   assert.deepEqual(old.prestige.upgrades, createInitialState().prestige.upgrades);
@@ -1350,8 +1348,12 @@ console.log('achievement save migration tests passed');
   kept.gold = 9;
   const roundTrip = decodeSave(encodeSave(kept));
   assert.deepEqual(roundTrip.shop, kept.shop);
-  const old = decodeSave(btoa(JSON.stringify({ resources: {}, lifetime: {}, unlocked: ['driftwood_start'] })));
-  assert.deepEqual(old.shop, createInitialState().shop, 'an older save gets an empty shop');
+  const old = decodeSave(btoa(JSON.stringify({ version: 2, resources: {}, lifetime: {}, unlocked: ['driftwood_start'] })));
+  assert.deepEqual(old.shop, createInitialState().shop, 'a save without a shop gets an empty one');
+  for (const stale of [{ version: 1 }, {}]) {
+    const v1 = btoa(JSON.stringify({ ...stale, resources: {}, lifetime: {}, unlocked: ['driftwood_start'] }));
+    assert.equal(decodeSave(v1), null, 'a save from before the v2 map rework is rejected: its tile ids no longer exist');
+  }
 
   console.log('gold shop tests passed');
 }
@@ -1386,6 +1388,9 @@ console.log('achievement save migration tests passed');
     f.achievements = ACHIEVEMENTS.map((a) => a.id); // already earned, so gold only shows what persists
     return f;
   };
+  // Blank bridges are only the way between clusters, so a head start grants them as needed and never
+  // counts them: two "tiles" per level means two clusters.
+  const clusterCount = (st) => st.unlocked.filter((id) => TILE_BY_ID.get(id).kind !== 'blank').length;
   const none = doPrestige(finished(0)).state;
   assert.equal(none.unlocked.length, 1, 'no head start: just the starting tile');
   assert.equal(none.prestige.count, 5, 'each prestige is counted');
@@ -1393,7 +1398,7 @@ console.log('achievement save migration tests passed');
   assert.equal(none.gold, 33);
 
   const two = doPrestige(finished(2)).state;
-  assert.equal(two.unlocked.length, 1 + 4, 'two tiles per level');
+  assert.equal(clusterCount(two), 1 + 4, 'two clusters per level');
   assert.equal(two.prestige.headStart, 2, 'the upgrade itself carries over');
   for (const r of ['fish', 'kelp', 'driftwood', 'crops']) assert.equal(two.resources[r], 0, 'a head start costs nothing');
   for (const id of two.unlocked) {
@@ -1411,7 +1416,7 @@ console.log('achievement save migration tests passed');
     }
   }
   const big = doPrestige(finished(HEAD_START_MAX_LEVEL)).state;
-  assert.equal(big.unlocked.length, 1 + 2 * HEAD_START_MAX_LEVEL);
+  assert.equal(clusterCount(big), 1 + 2 * HEAD_START_MAX_LEVEL);
   // Zone 3 (Timberline) borders zone 1 directly and its entry tiles are deliberately zone-1-cheap, so a large
   // enough head start now legitimately spills into it too, not just deeper into zone 1.
   assert(
@@ -1445,22 +1450,22 @@ console.log('achievement save migration tests passed');
 
   const counts = createInitialState();
   const ids = TILES.map((t) => t.id);
-  const expectAt = { 10: 'tiles-10', 25: 'tiles-25', 36: 'tiles-36', 50: 'tiles-50', 72: 'tiles-72', 108: 'tiles-108', 144: 'tiles-144' };
-  for (const [n, id] of Object.entries(expectAt)) {
-    counts.unlocked = ids.slice(0, Number(n) - 1);
+  // Tile-count milestones are a share of the whole map, rounded up.
+  const expectAt = Object.fromEntries([5, 10, 25, 40, 50, 75, 100].map((p) => [p, Math.ceil((TOTAL_TILE_COUNT * p) / 100)]));
+  for (const [percent, n] of Object.entries(expectAt)) {
+    const id = `tiles-${percent}`;
+    counts.unlocked = ids.slice(0, n - 1);
     assert(!fired(counts).has(id), `${id} not yet at ${n - 1} tiles`);
-    counts.unlocked = ids.slice(0, Number(n));
+    counts.unlocked = ids.slice(0, n);
     assert(fired(counts).has(id) || counts.achievements.includes(id), `${id} at ${n} tiles`);
   }
 
-  // 144 is now the real total — only the top tier's name may claim completion.
-  const tiles108 = ACHIEVEMENTS.find((a) => a.id === 'tiles-108');
-  const tiles144 = ACHIEVEMENTS.find((a) => a.id === 'tiles-144');
-  assert.equal(tiles108.description, 'Unlock 108 tiles', 'tiles-108 no longer claims "all" now that 144 exist');
-  assert.notEqual(tiles108.name, 'A Whole Ocean', 'the old "complete" name moved off this tier');
-  assert.notEqual(tiles108.name, 'The Whole Map', 'the new "complete" name belongs to the real top tier');
-  assert.equal(tiles144.name, 'The Whole Map');
-  assert.equal(tiles144.description, 'Unlock all 144 tiles');
+  // Only the top tier's description may claim completion.
+  const tiles75 = ACHIEVEMENTS.find((a) => a.id === 'tiles-75');
+  const tiles100 = ACHIEVEMENTS.find((a) => a.id === 'tiles-100');
+  assert.equal(tiles75.description, `Unlock ${expectAt[75]} tiles (75% of the map)`, 'a partial tier states its count and share');
+  assert.equal(tiles100.name, 'The Whole Map');
+  assert.equal(tiles100.description, `Unlock all ${TOTAL_TILE_COUNT} tiles`);
 
   const voyages = createInitialState();
   for (const [n, id] of [[1, 'voyage-1'], [3, 'voyage-3'], [5, 'voyage-5'], [10, 'voyage-10']]) {
@@ -1669,3 +1674,32 @@ console.log('achievement save migration tests passed');
 
   console.log('zone 4 generator tests passed');
 }
+
+// --- Blank bridge tiles: engine rules ---
+// The v2 map has real blanks (see the map data tests); this pins the engine rules with a stand-in, so
+// they hold whatever the map looks like.
+{
+  const blank = {
+    id: 'test_blank', name: 'Test Blank', cells: [{ row: 99, col: 99 }], family: null, kind: 'blank',
+    produces: null, rate: null, boosts: null, unlock: { type: 'cost', cost: { driftwood: 5 } }, zone: 'zone1',
+  };
+  TILES.push(blank);
+  TILE_BY_ID.set(blank.id, blank);
+  try {
+    const state = createInitialState();
+    assert.equal(getLevel(state, blank.id), MAX_LEVEL, 'a blank has nothing to level, so it is maxed from the start');
+    assert.equal(getLevel(state, 'driftwood_start'), 1, 'other tiles still default to level 1');
+
+    const before = completionCount(state);
+    state.unlocked.push(blank.id);
+    assert.equal(completionCount(state), before + 1, 'an unlocked blank counts toward completion straight away');
+    assert.ok(!upgradeList(state).some((row) => row.tile.id === blank.id), 'a blank never shows in the upgrade list');
+    assert.equal(isLevelUpEligible(state, blank), false, 'and can never be levelled');
+    assert.equal(rateBreakdown(state, 'driftwood').total, 0.5, 'a blank adds no production');
+  } finally {
+    TILES.pop();
+    TILE_BY_ID.delete(blank.id);
+  }
+
+  console.log('blank tile engine tests passed');
+}
````
Run: `npm test`
Expected: FAIL at `and, being half the map, also hits the tiles-50 tier` (the percentage tiers do not exist yet; the `version: 2` save tests, the head-start test and the blank-tile section fail once you get past it).

- [ ] **Step 2: Implement**

Apply this diff to `js/state.js`:

````diff
diff --git a/js/state.js b/js/state.js
index 7df6d95..b32309f 100644
--- a/js/state.js
+++ b/js/state.js
@@ -8,7 +8,10 @@ const BASE_RESOURCES = ['fish', 'kelp', 'driftwood', 'crops'];
 // rows, baron/magnate lifetime achievements, and counting toward prestige tokens earned.
 export const GOODS = ['planks', 'kelp_rope', 'bread'];
 export const RESOURCES = [...BASE_RESOURCES, ...GOODS];
-export const SAVE_KEY = 'driftaway_save_v1';
+// v2 is the map rework (blank bridges, 3-hex clusters): tile ids and layout changed, so a v1 save
+// can't be carried over. A new key leaves the old save untouched in storage rather than erasing it.
+export const SAVE_KEY = 'driftaway_save_v2';
+const SAVE_VERSION = 2;
 
 // Membership in `state.unlocked` is asked per tile, per frame, from many places, so on a map of a few
 // hundred tiles a linear `includes` scan dominates the frame. The array stays the saved source of
@@ -59,7 +62,7 @@ export function createInitialState() {
   const lifetime = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
   const unlocked = TILES.filter((t) => t.unlock.type === 'start').map((t) => t.id);
   return {
-    version: 1,
+    version: SAVE_VERSION,
     resources,
     lifetime,
     unlocked,
@@ -247,7 +250,10 @@ export function nextUnlock(state, statuses = lockedTileStatuses(state)) {
   return { ...best, readyCount: statuses.filter((x) => x.eta.seconds === 0).length };
 }
 
+// A blank bridge has nothing to level, so it counts as maxed the moment it is unlocked -- which keeps
+// completionCount, the "max out every tile" achievements and the upgrade list working unchanged.
 export function getLevel(state, tileId) {
+  if (TILE_BY_ID.get(tileId)?.kind === 'blank') return MAX_LEVEL;
   return state.levels[tileId] || 1;
 }
 
@@ -389,11 +395,14 @@ for (const resource of RESOURCES) {
     });
   }
 }
-for (const [count, name, reward] of [[10, 'Small Fleet', 1], [25, 'Growing Raft', 2], [36, 'Home Waters', 2], [50, 'Far Horizons', 3], [72, 'Two Seas Charted', 4], [108, 'Three Seas Charted', 5], [144, 'The Whole Map', 6]]) {
+// Milestones are a share of the whole map, not fixed counts, so they stay meaningful however many
+// tiles the map has (a tile here is any unlocked hex-group: a cluster or a blank bridge).
+for (const [percent, name, reward] of [[5, 'Small Fleet', 1], [10, 'Growing Raft', 2], [25, 'Home Waters', 2], [40, 'Far Horizons', 3], [50, 'Two Seas Charted', 4], [75, 'Three Seas Charted', 5], [100, 'The Whole Map', 6]]) {
+  const count = Math.ceil((TOTAL_TILE_COUNT * percent) / 100);
   ACHIEVEMENTS.push({
-    id: `tiles-${count}`,
+    id: `tiles-${percent}`,
     name,
-    description: count === TOTAL_TILE_COUNT ? `Unlock all ${count} tiles` : `Unlock ${count} tiles`,
+    description: percent === 100 ? `Unlock all ${count} tiles` : `Unlock ${count} tiles (${percent}% of the map)`,
     reward,
     condition: (state) => state.unlocked.length >= count,
   });
@@ -462,14 +471,27 @@ export function buyHeadStart(state) {
   return true;
 }
 
-// Skips boosters that have nothing to boost yet, so the free tiles are ones that do something.
+// Free tiles for a new run: the ones a player would have unlocked first. Skips boosters that have
+// nothing to boost yet, so the free tiles are ones that do something. Blank bridges never count
+// toward `count` -- they're only the way to the next cluster, so they're granted as needed.
 function grantHeadStart(state, count) {
-  for (let i = 0; i < count; i++) {
+  let granted = 0;
+  while (granted < count) {
     const all = lockedTileStatuses(state);
-    const useful = all.filter((x) => x.tile.kind !== 'booster' || !boosterIsIdle(state, x.tile));
-    const next = nextUnlock(state, useful.length > 0 ? useful : all);
-    if (!next) break;
-    state.unlocked.push(next.tile.id);
+    const useful = all.filter((x) => x.tile.kind !== 'blank' && (x.tile.kind !== 'booster' || !boosterIsIdle(state, x.tile)));
+    if (useful.length > 0) {
+      state.unlocked.push(nextUnlock(state, useful).tile.id);
+      granted++;
+      continue;
+    }
+    const bridges = all.filter((x) => x.tile.kind === 'blank');
+    if (bridges.length > 0) {
+      state.unlocked.push(nextUnlock(state, bridges).tile.id);
+      continue;
+    }
+    if (all.length === 0) break;
+    state.unlocked.push(nextUnlock(state, all).tile.id);
+    granted++;
   }
 }
 
@@ -768,6 +790,7 @@ function normalizeSave(parsed) {
   const looksValid =
     parsed &&
     typeof parsed === 'object' &&
+    parsed.version === SAVE_VERSION &&
     parsed.resources &&
     parsed.lifetime &&
     Array.isArray(parsed.unlocked);
````
- [ ] **Step 3: Run the suite**

Run: `npm test 2>&1 | grep -c passed`
Expected: `32`, exit 0.

- [ ] **Step 4: Checkpoint.**

---
## Task 5: Multi-cell rendering, lazy props, and the pan/zoom camera

The renderer draws one raft hex per cell of a tile, builds props only when a tile is shown at a level, and the camera becomes a draggable, zoomable view. This task is done **against the current single-cell map** so the result can be checked against the game you already know; the new map arrives in Task 6.

There are no Node tests for this task (`scene.js` and `render.js` are browser-only, as they always have been); verification is the manual checklist in Step 11.

**Files:**
- Modify: `js/scene.js`, `js/render.js` (rewritten), `js/clouds.js`, `js/effects.js`, `js/main.js`, `js/ui.js`, `js/zones.js`, `index.html`, `style.css`

**Interfaces:**
- Consumes: `cells` (Task 1), `isUnlocked` (Task 3), `getLevel` returning `MAX_LEVEL` for blanks (Task 4).
- Produces (`js/scene.js`): `buildScene(canvas) -> { renderer, scene, camera, sun, waterMesh, waterUniforms, foamMesh, tileObjects, worldBounds, cloudField }`; `frameCamera(camera, width, height, half)`; `aimSun(sun, target, half)`; constants `CAMERA_OFFSET`, `BASE_VIEW_HALF` (12), `MIN_VIEW_HALF` (7), `MAX_VIEW_HALF` (26), `FOG_NEAR` (36), `FOG_FAR` (60).
- Each `tileObjects.get(id)` entry: `{ raftMesh: Group (at the tile's centre), markerMesh: Group, raftCells: Mesh[], markerCells: Mesh[], propGroups: { [level]: Group }, ensureProps(level) -> Group (built on first use), trimMeshes: { [level]: Group } | null, cellWorld: [{x, z}], foamStart: number }`.
- Produces (`js/render.js`): `initScene`, `updateScene`, `pickTile(x, y, w, h) -> tile | null`, `panByPixels(dx, dy)`, `zoomBy(factor)` (>1 zooms out), `flyToTile(tileId)`, `resetCamera()`, `playUnlockImpact`, `playLevelUpImpact`, `projectTile`. **Removed:** `screenToGrid`, `sailToZone`, `getCurrentZone`, the per-zone `cameraPositions`.

- [ ] **Step 1: `js/scene.js`, top of the file**

Apply this diff. It drops `GRID_ROWS`/`GRID_COLS` and the fixed-grid centring, makes `hexLocalPosition` a plain function of `(row, col)`, and adds `tileCells` (world positions of a tile's cells and their average):

````diff
--- a/js/scene.js
+++ b/js/scene.js
@@ -4,12 +4,9 @@
 import { buildZone2Prop } from './zone2-props.js';
 import { buildAbyssalProp } from './abyssal-props.js';
 import { buildTimberlineProp } from './timberline-props.js';
-import { buildCloudField, resizeCloudField } from './clouds.js';
+import { buildCloudField } from './clouds.js';
 import { createFoamTexture, createWaterNormalTexture } from './textures.js';
 import { DEFAULT_PALETTE } from './palettes.js';
-
-export const GRID_ROWS = 6;
-export const GRID_COLS = 6;
 
 const HEX_RADIUS = 1.6;
 const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
@@ -20,7 +17,6 @@
 const ZONE_RAFT_COLOR = new Map(ZONES.map((z) => [z.id, z.raftColor]));
 const BOOSTER_TRIM = 0xe0b84b;
 const MARKER_COLOR = 0xbcd8e8;
-const CAMERA_FRUSTUM_HALF_SIZE = 12;
 const PROP_SCALE = 1.8;
 const BOOSTER_PROP_SCALE = 1.5;
 const LARGE_BOOSTER_IDS = new Set([
@@ -134,22 +130,23 @@
   return outline;
 }
 
-function gridBounds() {
-  return {
-    width: GRID_COLS * HEX_WIDTH + HEX_WIDTH / 2,
-    depth: (GRID_ROWS - 1) * ROW_SPACING + HEX_HEIGHT,
+function hexLocalPosition(row, col) {
+  // row % 2 === 1 silently breaks for negative rows (JS's % keeps the sign of the dividend, so
+  // -1 % 2 is -1, not 1) -- the map reaches well into negative rows, so this checks oddness, not
+  // equality to positive 1, or every odd-numbered row up there renders at the wrong horizontal offset.
+  const isOddRow = row % 2 !== 0;
+  return { x: col * HEX_WIDTH + (isOddRow ? HEX_WIDTH / 2 : 0), z: row * ROW_SPACING };
+}
+
+// Where a tile's cells sit in the world, and the point they average to. A tile's groups are placed
+// at that centre, with each cell offset from it, so scaling or lifting a group moves the whole tile.
+function tileCells(tile) {
+  const world = tile.cells.map((c) => hexLocalPosition(c.row, c.col));
+  const center = {
+    x: world.reduce((sum, p) => sum + p.x, 0) / world.length,
+    z: world.reduce((sum, p) => sum + p.z, 0) / world.length,
   };
-}
-
-function hexLocalPosition(row, col) {
-  const bounds = gridBounds();
-  // row % 2 === 1 silently breaks for negative rows (JS's % keeps the sign of the dividend, so
-  // -1 % 2 is -1, not 1) -- zone 4 sits at rows -6..-1, so this must check oddness, not equality
-  // to positive 1, or every odd-numbered row up there renders at the wrong horizontal offset.
-  const isOddRow = row % 2 !== 0;
-  const x = col * HEX_WIDTH + (isOddRow ? HEX_WIDTH / 2 : 0) + HEX_WIDTH / 2 - bounds.width / 2;
-  const z = row * ROW_SPACING + HEX_HEIGHT / 2 - bounds.depth / 2;
-  return { x, z };
+  return { center, world, offsets: world.map((p) => ({ dx: p.x - center.x, dz: p.z - center.z })) };
 }
 
 function hexShape(radius) {
````
- [ ] **Step 2: `js/scene.js`, everything from `addProp` to the end**

Delete everything from the line `function addProp(raftMesh, tile) {` to the end of the file and append the block below verbatim. It contains: `freezeStatic`, `buildLevelProps` (lazy, per level, one prop per cell), the shared raft/trim/marker geometry, `buildRaftMesh` and `buildMarkerMesh` (one hex per cell), `worldTileBounds` over every cell, `buildWater` (unchanged), the per-cell foam mesh, the camera helpers (`frameCamera`, `aimSun`) and constants, and the new `buildScene`.

````js
// Props never move on their own, so their local matrices are composed once here rather than every
// frame (the scene is tens of thousands of nodes at full unlock). The group itself stays animatable:
// effects.js pops it on a level-up, and the tile's raft group is lifted as a unit when it appears.
function freezeStatic(group) {
  group.traverse((node) => {
    node.updateMatrix();
    if (node !== group) node.matrixAutoUpdate = false;
  });
}

// One tile's props at one level: an instance of the archetype's prop on every cell the tile covers
// (a cluster is three rafts, each carrying the same building). Built on demand, only for tiles that
// are unlocked and only for the level they are at, so the scene holds a fraction of what building
// every level of every tile up front would.
function buildLevelProps(tile, level, offsets) {
  const levelGroup = new THREE.Group();
  const darken = [];
  for (const { dx, dz } of offsets) {
    const propGroup = new THREE.Group();
    propGroup.position.set(dx, WALL_HEIGHT, dz);
    if (tile.zone === 'zone2') {
      buildZone2Prop(propGroup, tile, level);
    } else if (tile.zone === 'zone3') {
      buildTimberlineProp(propGroup, tile);
    } else if (tile.zone === 'zone4') {
      buildAbyssalProp(propGroup, tile, level);
    } else {
      switch (tile.family) {
        case 'fish': buildFishProp(propGroup, level); break;
        case 'kelp': buildKelpProp(propGroup, level); break;
        case 'driftwood': buildDriftwoodProp(propGroup, level); break;
        case 'crops': buildCropsProp(propGroup, level); break;
        case 'booster': buildBoosterProp(propGroup, tile.id, level); break;
      }
    }
    const anchorKey = tile.family === 'booster' ? tile.id : tile.family;
    const zoneAnchorKey = `${tile.zone}:${anchorKey}`;
    const anchorHeight = BADGE_ANCHOR_HEIGHT[zoneAnchorKey] ?? BADGE_ANCHOR_HEIGHT[anchorKey];
    addLevelBadge(propGroup, level, anchorHeight);
    const extraScale = LARGE_BOOSTER_IDS.has(tile.id) ? BOOSTER_PROP_SCALE : 1;
    propGroup.scale.setScalar(PROP_SCALE * extraScale * LEVEL_SCALE[level]);
    levelGroup.add(propGroup);
    darken.push(...(propGroup.userData.darken || []));
  }
  levelGroup.userData.darken = darken;
  freezeStatic(levelGroup);
  return levelGroup;
}

// Every raft cell is the same hex; the geometry is built once and shared by all of them.
const RAFT_GEOMETRY = (() => {
  const geometry = new THREE.ExtrudeGeometry(hexShape(HEX_RADIUS), {
    depth: WALL_HEIGHT,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
})();

const TRIM_PARTS = {};
function trimParts(level) {
  if (!TRIM_PARTS[level]) {
    TRIM_PARTS[level] = {
      geometry: new THREE.TorusGeometry(HEX_RADIUS * 0.92, TRIM_THICKNESS[level], 8, 24),
      material: new THREE.MeshStandardMaterial({
        color: TRIM_COLOR[level],
        roughness: 0.4,
        metalness: 0.3,
        emissive: level === 3 ? 0x664400 : 0x000000,
        emissiveIntensity: level === 3 ? 0.4 : 0,
      }),
    };
  }
  return TRIM_PARTS[level];
}

// Blank bridges wear their zone's colour a little paler than the clusters, so a walkway reads as
// ground between buildings rather than as one more building.
const BLANK_LIGHTEN = 0.22;
function raftColor(tile) {
  const color = new THREE.Color(ZONE_RAFT_COLOR.get(tile.zone));
  return tile.kind === 'blank' ? color.lerp(new THREE.Color(0xffffff), BLANK_LIGHTEN) : color;
}

// One group per tile, positioned at the tile's centre, holding a raft hex per cell (plus each
// cell's props and trim). effects.js lifts and scales that group as a unit when the tile appears.
function buildRaftMesh(tile, offsets) {
  const raftMesh = new THREE.Group();
  const raftMaterial = new THREE.MeshStandardMaterial({ color: raftColor(tile), roughness: 0.85, metalness: 0.05 });
  const raftCells = offsets.map(({ dx, dz }) => {
    const cell = new THREE.Mesh(RAFT_GEOMETRY, raftMaterial);
    cell.position.set(dx, 0, dz);
    cell.castShadow = true;
    cell.receiveShadow = true;
    cell.userData.tileId = tile.id;
    raftMesh.add(cell);
    return cell;
  });

  let trimMeshes = null;
  if (tile.kind === 'booster') {
    trimMeshes = {};
    for (const level of [1, 2, 3]) {
      const trims = new THREE.Group();
      const { geometry, material } = trimParts(level);
      for (const { dx, dz } of offsets) {
        const trim = new THREE.Mesh(geometry, material);
        trim.rotation.x = Math.PI / 2;
        trim.position.set(dx, WALL_HEIGHT + 0.01, dz);
        trim.userData.tileId = tile.id;
        trims.add(trim);
      }
      trims.visible = level === 1;
      raftMesh.add(trims);
      trimMeshes[level] = trims;
    }
  }

  // propGroups[level] exists once that level has been asked for. A blank has no prop, so its groups
  // are empty ones (render.js and effects.js still treat every tile the same way).
  const propGroups = {};
  const ensureProps = (level) => {
    if (!propGroups[level]) {
      const group = tile.kind === 'blank' ? new THREE.Group() : buildLevelProps(tile, level, offsets);
      group.userData.darken ||= [];
      group.visible = false;
      raftMesh.add(group);
      propGroups[level] = group;
    }
    return propGroups[level];
  };
  return { raftMesh, raftCells, propGroups, ensureProps, trimMeshes };
}

// Invisible filled hexes, one per cell, sized to cover the whole cell -- these are what get
// raycast-tested, so clicking anywhere inside a locked tile registers, not just near its visible
// outline (a LineLoop alone would only be hit-testable in a thin ring near the edge, per
// THREE.Raycaster's line threshold). DoubleSide because ShapeGeometry's face winding after rotateX
// isn't hand-verified, and a raycast against a FrontSide-only mesh silently misses back faces.
const MARKER_HIT_GEOMETRY = (() => {
  const geometry = new THREE.ShapeGeometry(hexShape(HEX_RADIUS));
  geometry.rotateX(-Math.PI / 2);
  return geometry;
})();
const MARKER_HIT_MATERIAL = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
const MARKER_OUTLINE_GEOMETRY = new THREE.BufferGeometry().setFromPoints(hexOutlinePoints(HEX_RADIUS));
const MARKER_BUOY_GEOMETRY = new THREE.SphereGeometry(0.06, 8, 8);
const MARKER_BUOY_MATERIAL = new THREE.MeshBasicMaterial({ color: MARKER_COLOR, transparent: true, opacity: 0.6 });

function buildMarkerMesh(tile, offsets) {
  const markerMesh = new THREE.Group();
  const outlineMaterial = new THREE.LineBasicMaterial({ color: MARKER_COLOR, transparent: true, opacity: 0.35 });
  const markerCells = offsets.map(({ dx, dz }) => {
    const hit = new THREE.Mesh(MARKER_HIT_GEOMETRY, MARKER_HIT_MATERIAL);
    hit.position.set(dx, 0.02, dz);
    hit.userData.tileId = tile.id;
    hit.add(new THREE.LineLoop(MARKER_OUTLINE_GEOMETRY, outlineMaterial));
    markerMesh.add(hit);
    return hit;
  });
  const buoy = new THREE.Mesh(MARKER_BUOY_GEOMETRY, MARKER_BUOY_MATERIAL);
  buoy.position.y = 0.02;
  markerMesh.add(buoy);

  markerMesh.userData.outlineMaterial = outlineMaterial;
  markerMesh.userData.baseColor = MARKER_COLOR;
  return { markerMesh, markerCells };
}

// Open sea kept beyond the outermost tile on every side, so the water never runs out before the
// fog does.
const WATER_MARGIN = 40;

// The plane is sized once at scene build time from the whole map, so it stays correct however far
// the map reaches.
function worldTileBounds() {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const tile of TILES) {
    for (const cell of tile.cells) {
      const { x, z } = hexLocalPosition(cell.row, cell.col);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  return { minX, maxX, minZ, maxZ };
}

function buildWater(anisotropy, width, depth, centerX, centerZ) {
  const waterGeometry = new THREE.PlaneGeometry(width, depth, 1, 1);
  waterGeometry.rotateX(-Math.PI / 2);
  const waterUniforms = { uTime: { value: 0 }, uNormal: { value: createWaterNormalTexture(anisotropy) } };
  const waterMaterial = new THREE.MeshStandardMaterial({ color: DEFAULT_PALETTE.water, roughness: 0.14, metalness: 0 });
  // The ripples are two scrolling normal maps instead of moving vertices. The plane is flat and
  // horizontal, so the perturbed normal is built in world space and rotated into view space.
  waterMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.uniforms.uNormal = waterUniforms.uNormal;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uTime;\nuniform sampler2D uNormal;')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        vec2 wp = vWPos.xz;
        vec3 n1 = texture2D(uNormal, wp * 0.045 + vec2(uTime * 0.018, uTime * 0.011)).xyz * 2.0 - 1.0;
        vec3 n2 = texture2D(uNormal, wp * 0.11 + vec2(-uTime * 0.03, uTime * 0.02)).xyz * 2.0 - 1.0;
        vec3 wn = normalize(vec3((n1.x + n2.x) * 0.95, 1.0, (n1.y + n2.y) * 0.95));
        normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
        diffuseColor.rgb *= 0.86 + 0.28 * (n1.x * 0.5 + 0.5);`
      );
  };
  const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
  waterMesh.position.set(centerX, -0.05, centerZ);
  waterMesh.receiveShadow = true;
  return { waterMesh, waterUniforms };
}

// One instance per cell; render.js places and scales each one every frame, so a raft that isn't
// unlocked yet gets a zero-scale (invisible) ring.
function buildFoam(anisotropy, cellCount) {
  const foamGeometry = new THREE.PlaneGeometry(4.1, 4.1);
  foamGeometry.rotateX(-Math.PI / 2);
  const foamMaterial = new THREE.MeshBasicMaterial({
    map: createFoamTexture(anisotropy),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const foamMesh = new THREE.InstancedMesh(foamGeometry, foamMaterial, cellCount);
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < cellCount; i++) foamMesh.setMatrixAt(i, hidden);
  foamMesh.renderOrder = 1;
  foamMesh.frustumCulled = false;
  return foamMesh;
}

// The camera looks at a ground point from a fixed direction. `half` is the frustum's half-height in
// world units (zoom); the camera also backs off in proportion, so the near/far planes and the fog
// (see FOG_NEAR/FOG_FAR) keep covering the same share of the view at every zoom.
export const CAMERA_OFFSET = new THREE.Vector3(14, 16, 14);
export const BASE_VIEW_HALF = 12;
export const MIN_VIEW_HALF = 7;
export const MAX_VIEW_HALF = 26;
export const FOG_NEAR = 36;
export const FOG_FAR = 60;

export function frameCamera(camera, width, height, half) {
  const aspect = width / height;
  const scale = half / BASE_VIEW_HALF;
  camera.left = -half * aspect;
  camera.right = half * aspect;
  camera.top = half;
  camera.bottom = -half;
  camera.near = 0.1;
  camera.far = 100 * scale;
  camera.updateProjectionMatrix();
}

const SUN_OFFSET = new THREE.Vector3(10, 16, 6);
const SUN_SHADOW_HALF = 16;

// Keeps the sun (and so the shadows) over whatever the camera is looking at, at any zoom.
export function aimSun(sun, target, half) {
  const scale = half / BASE_VIEW_HALF;
  sun.target.position.copy(target);
  sun.position.copy(target).addScaledVector(SUN_OFFSET, scale);
  const shadowCamera = sun.shadow.camera;
  const size = SUN_SHADOW_HALF * scale;
  if (shadowCamera.right !== size) {
    shadowCamera.left = -size;
    shadowCamera.right = size;
    shadowCamera.top = size;
    shadowCamera.bottom = -size;
    shadowCamera.far = 40 * scale;
    shadowCamera.updateProjectionMatrix();
  }
}

export function buildScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(DEFAULT_PALETTE.background);
  scene.fog = new THREE.Fog(DEFAULT_PALETTE.background, FOG_NEAR, FOG_FAR);

  const camera = new THREE.OrthographicCamera();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.AmbientLight(0xbcd8e8, 0.55));

  const sun = new THREE.DirectionalLight(0xfff4d6, 1.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  scene.add(sun);
  scene.add(sun.target);
  aimSun(sun, new THREE.Vector3(), BASE_VIEW_HALF);

  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const bounds = worldTileBounds();
  const { waterMesh, waterUniforms } = buildWater(
    anisotropy,
    bounds.maxX - bounds.minX + WATER_MARGIN * 2,
    bounds.maxZ - bounds.minZ + WATER_MARGIN * 2,
    (bounds.maxX + bounds.minX) / 2,
    (bounds.maxZ + bounds.minZ) / 2
  );
  scene.add(waterMesh);
  const cellCount = TILES.reduce((sum, t) => sum + t.cells.length, 0);
  const foamMesh = buildFoam(anisotropy, cellCount);
  scene.add(foamMesh);

  const tileObjects = new Map();
  let foamStart = 0;
  for (const tile of TILES) {
    const { center, world, offsets } = tileCells(tile);

    const { raftMesh, raftCells, propGroups, ensureProps, trimMeshes } = buildRaftMesh(tile, offsets);
    raftMesh.position.set(center.x, 0, center.z);
    raftMesh.visible = false;
    scene.add(raftMesh);

    const { markerMesh, markerCells } = buildMarkerMesh(tile, offsets);
    markerMesh.position.set(center.x, 0, center.z);
    markerMesh.visible = false;
    scene.add(markerMesh);

    tileObjects.set(tile.id, { raftMesh, markerMesh, raftCells, markerCells, propGroups, ensureProps, trimMeshes, cellWorld: world, foamStart });
    foamStart += world.length;
  }

  // The cloud field only needs to exist where the camera can look. It can be panned anywhere over
  // the map, so sample ground points across the whole map at a spacing well inside the view.
  const viewTargets = [];
  const TARGET_STEP = 12;
  for (let x = bounds.minX; x <= bounds.maxX + TARGET_STEP; x += TARGET_STEP) {
    for (let z = bounds.minZ; z <= bounds.maxZ + TARGET_STEP; z += TARGET_STEP) viewTargets.push(new THREE.Vector3(x, 0, z));
  }

  const zoneTileCenters = new Map(
    ZONES.map((zone) => [
      zone.id,
      TILES.filter((t) => t.zone === zone.id).flatMap((t) => tileObjects.get(t.id).cellWorld.map((c) => ({ id: t.id, x: c.x, z: c.z }))),
    ])
  );

  const cloudField = buildCloudField({
    zoneIds: ZONES.map((zone) => zone.id),
    zoneTiles: zoneTileCenters,
    landRadius: HEX_RADIUS,
    viewHalfHeight: MAX_VIEW_HALF,
    viewTargets,
    cameraOffset: CAMERA_OFFSET,
  });

  return {
    renderer,
    scene,
    camera,
    sun,
    waterMesh,
    waterUniforms,
    foamMesh,
    tileObjects,
    worldBounds: bounds,
    cloudField,
  };
}
````
- [ ] **Step 3: `js/clouds.js`**

`sailEdges` (pairs of zone framings) becomes `viewTargets` (ground points across the whole map), because the camera can now be panned anywhere:

````diff
diff --git a/js/clouds.js b/js/clouds.js
index 07bddfa..2ff3e63 100644
--- a/js/clouds.js
+++ b/js/clouds.js
@@ -3,8 +3,9 @@ import * as THREE from 'three';
 // The cloud field fills everything outside the land, leaving an even strip of open sea around every
 // open zone. A zone is "open" once any of its tiles is unlocked; the first zone is open from the
 // start. Opening a zone clears the clouds over it and pulls the cloud edge out to the same sea gap
-// around the newly larger map. Zones are assumed to open in ZONES order, since each is reached by
-// adjacency from the previous one.
+// around the newly larger map. The outlines for each stage of the map are laid out assuming zones
+// open in ZONES order; a zone opened out of that order still clears exactly its own land (each puff
+// knows which zones clear it), it just leaves the intermediate outline slightly less tidy.
 const CLOUD_OPACITY = 0.4;
 const SEA_GAP = 2;
 const EDGE_WIDTH = 10.5;
@@ -67,11 +68,11 @@ function contourPoints(centers, rho, step) {
 
 const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
 
-// zoneTiles: Map zoneId -> [{ id, x, z }] in world coordinates. sailEdges: every pair of zone
-// framing targets a direct sail can actually cross (the "next unlock" shortcut can jump straight
-// between any two discovered zones, not just consecutive ones), used to work out how far the
-// field has to reach along every path the camera can actually travel.
-export function buildCloudField({ zoneIds, zoneTiles, landRadius, viewHalfHeight, sailEdges, cameraOffset }) {
+// zoneTiles: Map zoneId -> [{ id, x, z }] in world coordinates, one entry per hex cell (a tile
+// covering several cells appears once per cell). viewTargets: ground points the camera can look at,
+// spread across the whole map (it can be panned anywhere), used to work out how far the field has to
+// reach.
+export function buildCloudField({ zoneIds, zoneTiles, landRadius, viewHalfHeight, viewTargets, cameraOffset }) {
   const scene = new THREE.Scene();
   const target = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
 
@@ -109,16 +110,13 @@ export function buildCloudField({ zoneIds, zoneTiles, landRadius, viewHalfHeight
     ),
   ];
 
-  // Which ground points can ever be on screen, across every zone framing and the sail between them.
+  // Which ground points can ever be on screen, wherever the camera is pointed.
   const viewCam = new THREE.OrthographicCamera();
   viewCam.position.copy(cameraOffset);
   viewCam.lookAt(0, 0, 0);
   viewCam.updateMatrixWorld();
   const viewRot = new THREE.Matrix3().setFromMatrix4(viewCam.matrixWorldInverse);
-  const sampleTargets = [];
-  for (const [from, to] of sailEdges) {
-    for (let s = 0; s <= 6; s++) sampleTargets.push(from.clone().lerp(to, s / 6));
-  }
+  const sampleTargets = viewTargets;
   const halfH = viewHalfHeight + VIEW_MARGIN;
   const halfW = halfH * MAX_ASPECT;
   const canBeVisible = (x, z) =>
````
- [ ] **Step 4: Replace the whole of `js/render.js`**

````js
import * as THREE from 'three';
import { TILES, TILE_BY_ID } from './tiles.js';
import { getLevel, isDiscovered, isEligible, isLit, isUnlocked } from './state.js';
import {
  buildScene,
  frameCamera,
  aimSun,
  CAMERA_OFFSET,
  BASE_VIEW_HALF,
  MIN_VIEW_HALF,
  MAX_VIEW_HALF,
  FOG_NEAR,
  FOG_FAR,
} from './scene.js';
import { updateCloudField, renderCloudField, resizeCloudField, setCloudTint } from './clouds.js';
import { DEFAULT_PALETTE, PALETTES } from './palettes.js';
import { createEffects } from './effects.js';

let renderer, scene, camera, sun, waterMesh, waterUniforms, foamMesh, tileObjects, worldBounds;
let cloudField, effects;

// The camera looks at `camTarget` (a point on the water) from a fixed direction; `viewHalf` is the
// half-height of what it sees, in world units, so a bigger number is zoomed further out.
const camTarget = new THREE.Vector3();
let viewHalf = BASE_VIEW_HALF;
let framedHalf = null;
let canvasSize = { width: 1, height: 1 };
let flight = null;

const START_TILE_ID = TILES.find((t) => t.unlock.type === 'start').id;
const PAN_MARGIN = 10;
const FLIGHT_MS = 900;
const SCREEN_RIGHT = new THREE.Vector3(1, 0, -1).normalize();
const SCREEN_UP_ON_GROUND = new THREE.Vector3(-1, 0, -1).normalize();
const ELEVATION_SIN = CAMERA_OFFSET.y / CAMERA_OFFSET.length();

// The scene's own clock, in ms. It stops for a moment when an unlock lands (the frame hold), which
// freezes water, clouds, foam and effects together while the economy and the HUD carry on.
let visualMs = 0;
let lastFrameMs = null;
let holdMs = 0;
let kick = null;
const kickApplied = new THREE.Vector3();

let appliedPalette = 'default';

const TINT_READY = 0xffd23d;
const TINT_WAIT = 0x7fa8c4;

const FOAM_Y = 0.012;
const foamDummy = new THREE.Object3D();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export function initScene(canvas) {
  const built = buildScene(canvas);
  renderer = built.renderer;
  scene = built.scene;
  camera = built.camera;
  sun = built.sun;
  waterMesh = built.waterMesh;
  waterUniforms = built.waterUniforms;
  foamMesh = built.foamMesh;
  tileObjects = built.tileObjects;
  worldBounds = built.worldBounds;
  cloudField = built.cloudField;
  effects = createEffects(scene, tileObjects, () => visualMs / 1000);

  function handleResize() {
    canvasSize = { width: window.innerWidth, height: window.innerHeight };
    renderer.setSize(canvasSize.width, canvasSize.height, false);
    resizeCloudField(renderer, cloudField);
    framedHalf = null;
  }
  window.addEventListener('resize', handleResize);
  handleResize();
  resetCamera();
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clampTarget() {
  camTarget.x = Math.min(worldBounds.maxX + PAN_MARGIN, Math.max(worldBounds.minX - PAN_MARGIN, camTarget.x));
  camTarget.z = Math.min(worldBounds.maxZ + PAN_MARGIN, Math.max(worldBounds.minZ - PAN_MARGIN, camTarget.z));
}

// Puts the camera, fog and sun where the current target and zoom say they should be.
function applyView() {
  const scale = viewHalf / BASE_VIEW_HALF;
  if (framedHalf !== viewHalf) {
    frameCamera(camera, canvasSize.width, canvasSize.height, viewHalf);
    framedHalf = viewHalf;
  }
  camera.position.copy(camTarget).addScaledVector(CAMERA_OFFSET, scale);
  camera.lookAt(camTarget);
  scene.fog.near = FOG_NEAR * scale;
  scene.fog.far = FOG_FAR * scale;
  aimSun(sun, camTarget, viewHalf);
}

// Drags the map by a screen-space amount: the point under the cursor stays under the cursor.
export function panByPixels(dx, dy) {
  flight = null;
  const unitsPerPixel = (2 * viewHalf) / canvasSize.height;
  camTarget.addScaledVector(SCREEN_RIGHT, -dx * unitsPerPixel);
  camTarget.addScaledVector(SCREEN_UP_ON_GROUND, (dy * unitsPerPixel) / ELEVATION_SIN);
  clampTarget();
}

// factor > 1 zooms out, < 1 zooms in.
export function zoomBy(factor) {
  viewHalf = Math.min(MAX_VIEW_HALF, Math.max(MIN_VIEW_HALF, viewHalf * factor));
}

// Glides the camera to centre on a tile, keeping the current zoom.
export function flyToTile(tileId) {
  const { raftMesh } = tileObjects.get(tileId);
  flight = {
    from: camTarget.clone(),
    to: new THREE.Vector3(raftMesh.position.x, 0, raftMesh.position.z),
    start: performance.now(),
  };
}

// Back to the starting tile at the default zoom (a restart, a prestige or an import all begin there).
export function resetCamera() {
  flight = null;
  const start = tileObjects.get(START_TILE_ID).raftMesh.position;
  camTarget.set(start.x, 0, start.z);
  viewHalf = BASE_VIEW_HALF;
  applyView();
}

function advanceFlight() {
  if (!flight) return;
  const t = Math.min(1, (performance.now() - flight.start) / FLIGHT_MS);
  camTarget.lerpVectors(flight.from, flight.to, easeInOutCubic(t));
  if (t >= 1) flight = null;
}

// Every impact does the same things at different strength: hold the frame for a beat, kick the
// camera a few pixels, then play the effect. `intensity` runs from 0 to 1.
function impact(intensity) {
  holdMs = 30 + 50 * intensity;
  kick = { start: visualMs, amplitude: 0.05 + 0.17 * intensity, angle: Math.random() * Math.PI * 2 };
}

export function playUnlockImpact(tile, intensity) {
  impact(intensity);
  effects.unlock(tile, intensity);
}

export function playLevelUpImpact(tile, level, intensity) {
  impact(intensity);
  effects.levelUp(tile, level, intensity);
}

// Screen position (CSS pixels) of a tile's marker, for labels drawn over the board.
const projected = new THREE.Vector3();
export function projectTile(tileId) {
  const marker = tileObjects.get(tileId).markerMesh;
  projected.copy(marker.position).project(camera);
  const canvas = renderer.domElement;
  return {
    x: (projected.x * 0.5 + 0.5) * canvas.clientWidth,
    y: (-projected.y * 0.5 + 0.5) * canvas.clientHeight,
  };
}

// The shop's looks: water, sky and cloud colours. Applied when the chosen look changes, which also
// covers loading a save, importing one, and restarting.
function applyPalette(id) {
  const palette = PALETTES[id] ?? DEFAULT_PALETTE;
  waterMesh.material.color.setHex(palette.water);
  scene.background.setHex(palette.background);
  scene.fog.color.setHex(palette.background);
  setCloudTint(cloudField, palette.cloud);
  appliedPalette = id;
}

export function updateScene(state, time, { boardTint }) {
  if (state.shop.palette !== appliedPalette) applyPalette(state.shop.palette);

  const frameMs = lastFrameMs === null ? 0 : Math.max(0, Math.min(100, time - lastFrameMs));
  lastFrameMs = time;
  if (holdMs > 0) holdMs -= frameMs;
  else visualMs += frameMs;

  advanceFlight();
  applyView();
  kickApplied.set(0, 0, 0);
  if (kick) {
    const t = (visualMs - kick.start) / 1000;
    if (t > 0.5) kick = null;
    else {
      const offset = kick.amplitude * Math.exp(-t * 9) * Math.cos(t * 42);
      kickApplied.set(Math.cos(kick.angle) * offset, 0, Math.sin(kick.angle) * offset);
      camera.position.add(kickApplied);
    }
  }

  updateCloudField(cloudField, state.unlocked, visualMs);
  const seconds = visualMs / 1000;
  waterUniforms.uTime.value = seconds;

  for (const tile of TILES) {
    const objects = tileObjects.get(tile.id);
    const unlocked = isUnlocked(state.unlocked, tile.id);
    const discovered = isDiscovered(tile, state); // already true when `unlocked` is true

    objects.raftMesh.visible = unlocked;
    objects.markerMesh.visible = !unlocked && discovered;

    // Foam rings only exist around unlocked rafts: one per cell, in the instance order scene.js gave.
    objects.cellWorld.forEach((cell, k) => {
      const index = objects.foamStart + k;
      const swell = unlocked ? 1 + 0.025 * Math.sin(seconds * 1.3 + index * 2.4) : 0;
      foamDummy.position.set(cell.x, FOAM_Y, cell.z);
      foamDummy.scale.set(swell, 1, swell);
      foamDummy.updateMatrix();
      foamMesh.setMatrixAt(index, foamDummy.matrix);
    });

    if (unlocked) {
      // Props are built the first time a level is shown; a level that hasn't been shown has no group.
      const level = getLevel(state, tile.id);
      const shown = objects.ensureProps(level);
      for (const lvl of [1, 2, 3]) {
        if (objects.propGroups[lvl]) objects.propGroups[lvl].visible = lvl === level;
        if (objects.trimMeshes) objects.trimMeshes[lvl].visible = lvl === level;
      }

      // The Abyssal Trench's bioluminescence: a producer's materials were built in their normal
      // ("lit") appearance (see js/abyssal-props.js's track()) with both states remembered on each
      // one, so a dim producer is just a color/emissive swap here, not a rebuild -- and it can flip
      // back and forth as the player unlocks or (on prestige/restart) loses a nearby booster.
      if (tile.zone === 'zone4' && tile.kind === 'producer') {
        const lit = isLit(tile, state.unlocked);
        for (const d of shown.userData.darken) {
          d.material.color.setHex(lit ? d.litColor : d.dimColor);
          d.material.emissiveIntensity = lit ? d.litEmissiveIntensity : d.dimEmissiveIntensity;
        }
      }
    }

    if (!unlocked && discovered) {
      const eligible = isEligible(tile, state);
      const outline = objects.markerMesh.userData.outlineMaterial;
      const pulse = 0.5 + 0.5 * Math.sin(visualMs / 300);
      if (boardTint) {
        outline.color.setHex(eligible ? TINT_READY : TINT_WAIT);
        outline.opacity = eligible ? 0.7 + 0.3 * pulse : 0.5;
      } else {
        outline.color.setHex(objects.markerMesh.userData.baseColor);
        outline.opacity = eligible ? 0.35 + 0.4 * pulse : 0.35;
      }
    }
  }

  foamMesh.instanceMatrix.needsUpdate = true;
  foamMesh.material.opacity = 0.5 + 0.12 * Math.sin(seconds * 0.9);
  effects.update();

  renderer.render(scene, camera);
  renderCloudField(renderer, cloudField, camera);
}

// The tile under a screen point, or null. Only what is currently drawn can be hit: the rafts of
// unlocked tiles and the marker hexes of discovered locked ones.
export function pickTile(screenX, screenY, canvasWidth, canvasHeight) {
  pointer.x = (screenX / canvasWidth) * 2 - 1;
  pointer.y = -(screenY / canvasHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hitTargets = [];
  for (const objects of tileObjects.values()) {
    if (objects.raftMesh.visible) hitTargets.push(...objects.raftCells);
    if (objects.markerMesh.visible) hitTargets.push(...objects.markerCells);
  }
  const intersections = raycaster.intersectObjects(hitTargets, false);
  if (intersections.length === 0) return null;
  return TILE_BY_ID.get(intersections[0].object.userData.tileId) ?? null;
}
````
- [ ] **Step 5: `js/effects.js`**

A level-up pops the props group for the *new* level, which may not have been built yet, so it goes through `ensureProps`:

````diff
diff --git a/js/effects.js b/js/effects.js
index fb6fcc1..f25d9c3 100644
--- a/js/effects.js
+++ b/js/effects.js
@@ -152,7 +152,7 @@ export function createEffects(scene, tileObjects, getClock) {
     levelUp(tile, level, intensity) {
       const objects = tileObjects.get(tile.id);
       ring(objects.raftMesh.position, intensity);
-      pop(objects.propGroups[level], intensity);
+      pop(objects.ensureProps(level), intensity);
       sparks(objects.raftMesh.position, intensity * 0.6, 1.0);
     },
     update() {
````
- [ ] **Step 6: `js/main.js`**

Drag-to-pan (with the click that ends a drag suppressed), wheel and button zoom, and click/double-click through `pickTile` with no zone gating; `goToTile` glides the camera:

````diff
diff --git a/js/main.js b/js/main.js
index 482248f..7ca2367 100644
--- a/js/main.js
+++ b/js/main.js
@@ -26,9 +26,10 @@ import {
 import {
   initScene,
   updateScene,
-  screenToGrid,
-  sailToZone,
-  getCurrentZone,
+  pickTile,
+  panByPixels,
+  zoomBy,
+  flyToTile,
   resetCamera,
   playLevelUpImpact,
   playUnlockImpact,
@@ -69,9 +70,9 @@ function spent(cost) {
   return Object.fromEntries(Object.entries(cost).map(([resource, amount]) => [resource, -amount]));
 }
 
-// Takes the player to a tile: sail there if it's in the other zone, and open its panel.
+// Takes the player to a tile: glide the camera to it, and open its panel.
 function goToTile(tile) {
-  if (tile.zone !== getCurrentZone()) sailToZone(tile.zone);
+  flyToTile(tile.id);
   selectedTileId = tile.id;
   renderTilePanel(tile);
 }
@@ -233,26 +234,63 @@ function handleLevelUpClick(tile) {
   }
 }
 
+// Dragging the canvas pans the camera; a click that ends a drag must not also select a tile.
+const DRAG_THRESHOLD_PX = 5;
+let drag = null;
+let suppressClick = false;
+
+canvas.addEventListener('pointerdown', (event) => {
+  if (event.button !== 0) return;
+  suppressClick = false;
+  drag = { x: event.clientX, y: event.clientY, moved: false };
+  canvas.setPointerCapture(event.pointerId);
+});
+
+canvas.addEventListener('pointermove', (event) => {
+  if (!drag) return;
+  const dx = event.clientX - drag.x;
+  const dy = event.clientY - drag.y;
+  if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
+  drag.moved = true;
+  panByPixels(dx, dy);
+  drag.x = event.clientX;
+  drag.y = event.clientY;
+});
+
+function endDrag() {
+  if (drag?.moved) suppressClick = true;
+  drag = null;
+}
+canvas.addEventListener('pointerup', endDrag);
+canvas.addEventListener('pointercancel', endDrag);
+canvas.addEventListener('lostpointercapture', endDrag);
+
+canvas.addEventListener(
+  'wheel',
+  (event) => {
+    event.preventDefault();
+    zoomBy(Math.exp(event.deltaY * 0.0012));
+  },
+  { passive: false }
+);
+
+document.getElementById('zoom-in-btn').addEventListener('click', () => zoomBy(0.8));
+document.getElementById('zoom-out-btn').addEventListener('click', () => zoomBy(1.25));
+
 canvas.addEventListener('click', (event) => {
+  if (suppressClick) {
+    suppressClick = false;
+    return;
+  }
   const rect = canvas.getBoundingClientRect();
-  const x = event.clientX - rect.left;
-  const y = event.clientY - rect.top;
-  const gridPos = screenToGrid(x, y, rect.width, rect.height);
+  const tile = pickTile(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
 
-  if (!gridPos) {
+  if (!tile) {
     selectedTileId = null;
     hideTilePanel();
     return;
   }
 
-  const tile = TILES.find((t) => t.cells[0].row === gridPos.row && t.cells[0].col === gridPos.col);
-  if (!tile) return;
-
-  if (tile.zone !== getCurrentZone()) {
-    sailToZone(tile.zone);
-    return;
-  }
-
   selectedTileId = tile.id;
   renderTilePanel(tile);
 });
@@ -261,10 +299,8 @@ canvas.addEventListener('click', (event) => {
 // (which does nothing while the tile isn't affordable yet).
 canvas.addEventListener('dblclick', (event) => {
   const rect = canvas.getBoundingClientRect();
-  const gridPos = screenToGrid(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
-  if (!gridPos) return;
-  const tile = TILES.find((t) => t.cells[0].row === gridPos.row && t.cells[0].col === gridPos.col);
-  if (tile && tile.zone === getCurrentZone() && !state.unlocked.includes(tile.id)) handleUnlockClick(tile);
+  const tile = pickTile(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
+  if (tile && !state.unlocked.includes(tile.id)) handleUnlockClick(tile);
 });
 
 let lastTickAt = Date.now();
````
- [ ] **Step 7: `js/ui.js`**

A blank has an icon and a short panel text (no level, no progress line):

````diff
diff --git a/js/ui.js b/js/ui.js
index f77d9de..fdefebe 100644
--- a/js/ui.js
+++ b/js/ui.js
@@ -40,6 +40,7 @@ const RESOURCE_ICONS = { fish: '🐟', kelp: '🌿', driftwood: '🪵', crops: '
 const TOKEN_ICON = '⭐';
 
 function tileIcon(tile) {
+  if (tile.kind === 'blank') return '\u2b21';
   if (tile.kind === 'producer' || tile.kind === 'generator') return RESOURCE_ICONS[tile.produces];
   return tile.boosts.map((b) => RESOURCE_ICONS[b.resource]).join('');
 }
@@ -381,6 +382,13 @@ export function showTilePanel(tile, state, eligible, onUnlock, onLevelUp) {
     return;
   }
 
+  if (tile.kind === 'blank') {
+    elements.panelDesc.textContent = 'A walkway between rafts. It makes nothing itself, but opens the way to the tiles beside it.';
+    elements.panelProgress.textContent = '';
+    elements.panelUnlockBtn.classList.add('hidden');
+    return;
+  }
+
   const level = getLevel(state, tile.id);
   const description = `${describeProduction(tile, state)} (Level ${level})`;
 
````
- [ ] **Step 8: `index.html`, `style.css`, `js/zones.js`**

Zoom buttons, `touch-action: none` on the canvas (so a one-finger drag pans instead of scrolling the page), and the stronger biome colours:

````diff
diff --git a/index.html b/index.html
index eb4f999..936c4eb 100644
--- a/index.html
+++ b/index.html
@@ -39,6 +39,10 @@
   </div>
   <button id="prestige-btn" aria-label="Prestige">⭐</button>
   <button id="menu-btn" aria-label="Menu">☰</button>
+  <div id="zoom-controls">
+    <button id="zoom-in-btn" aria-label="Zoom in">+</button>
+    <button id="zoom-out-btn" aria-label="Zoom out">&minus;</button>
+  </div>
   <button id="upgrades-btn" aria-label="Upgrades"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 9h-5v9H9v-9H4z" fill="currentColor"/></svg><span id="upgrades-badge" class="hidden"></span></button>
   <div id="upgrades-panel" class="hidden">
     <div class="upg-head"><h2>Upgrades</h2><span id="upgrades-ready"></span><button id="upgrades-close-btn" aria-label="Close">&times;</button></div>
diff --git a/js/zones.js b/js/zones.js
index b120936..cfc5742 100644
--- a/js/zones.js
+++ b/js/zones.js
@@ -1,6 +1,6 @@
 export const ZONES = [
-  { id: 'zone1', name: 'Home Waters', raftColor: 0xc9975b },
-  { id: 'zone2', name: 'Frozen Reach', raftColor: 0xa9c9d6 },
-  { id: 'zone3', name: 'Timberline Coast', raftColor: 0x6b4a30 },
-  { id: 'zone4', name: 'Abyssal Trench', raftColor: 0x2f3a5a },
+  { id: 'zone1', name: 'Home Waters', raftColor: 0xd9a441 },
+  { id: 'zone2', name: 'Frozen Reach', raftColor: 0x7cc8ee },
+  { id: 'zone3', name: 'Timberline Coast', raftColor: 0x4f9a4c },
+  { id: 'zone4', name: 'Abyssal Trench', raftColor: 0x4a3aa8 },
 ];
diff --git a/style.css b/style.css
index dcc96f2..ad86e2e 100644
--- a/style.css
+++ b/style.css
@@ -13,6 +13,28 @@ html, body {
   display: block;
   width: 100vw;
   height: 100vh;
+  touch-action: none; /* one-finger drags pan the map instead of scrolling the page */
+}
+
+#zoom-controls {
+  position: fixed;
+  right: 12px;
+  bottom: 12px;
+  display: flex;
+  flex-direction: column;
+  gap: 6px;
+}
+
+#zoom-controls button {
+  width: 40px;
+  height: 40px;
+  background: rgba(16, 38, 58, 0.9);
+  color: #f4ead2;
+  border: none;
+  border-radius: 8px;
+  font-size: 22px;
+  line-height: 1;
+  cursor: pointer;
 }
 
 /* Fixed wrapper for the resource bar and the next-unlock banner below it, so the two stack in
````
- [ ] **Step 9: Confirm nothing still refers to the removed camera API**

Run: `grep -rn "sailToZone\|getCurrentZone\|screenToGrid\|cameraPositions\|GRID_ROWS\|GRID_COLS\|CAMERA_FRUSTUM_HALF_SIZE" js index.html`
Expected: no output.

- [ ] **Step 10: Run the suite**

Run: `npm test 2>&1 | grep -c passed`
Expected: `32` (unchanged: this task has no Node tests), exit 0.

- [ ] **Step 11: Verify in a browser** (`npx serve -l 4325 .`, open `http://localhost:4325`)

If the browser pane you use reports `document.hidden === true`, the browser throttles animation frames (the game looks frozen and reports ~1 fps) and a screenshot is what forces a repaint. That is an environment artefact, not a bug: the original game does the same.

1. **Fresh game** (clear `localStorage` first): one raft with its driftwood prop, six locked hexes with progress pills around it, the "Next: ..." bar, and `+` / `-` buttons bottom-right. Zoom buttons and mouse-wheel zoom in and out and stop at the limits (7 and 26 half-height); the camera keeps looking at the same spot.
2. **Drag**: press on the water and drag: the map follows the cursor; releasing does not select or deselect anything; a plain click on a hex selects it (tile panel opens) and a click on water closes the panel. Double-click a locked, affordable hex unlocks it (the raft rises out of the water).
3. **Mid-game load.** Wait ~10 s after the first load (so the game has written a save), then paste this into the page's JS console. It unlocks 60 tiles at mixed levels and reloads (the `Storage.prototype.setItem` line stops the dying page's own autosave overwriting it):

````js
const { TILES } = await import('/js/tiles.js');
const save = JSON.parse(localStorage.getItem('driftaway_save_v2'));   // exists ~10 s after the first load
const pick = TILES.filter((t) => t.zone === 'zone1' || t.zone === 'zone2').slice(0, 60);
save.unlocked = pick.map((t) => t.id);
save.levels = {};
pick.slice(0, 30).forEach((t, i) => { save.levels[t.id] = 1 + (i % 3); });
for (const r of Object.keys(save.resources)) { save.resources[r] = 5e6; save.lifetime[r] = 5e6; }
save.lastSaved = Date.now();
localStorage.setItem('driftaway_save_v2', JSON.stringify(save));
Storage.prototype.setItem = function () {};   // stop the dying page's own autosave overwriting ours
location.reload();
````
   Expected: all props render with level badges, zone 1 in the stronger gold, zone 2 in clearly ice-blue, foam rings under every raft, no console errors. Zoom out fully: the whole board fits, clouds ring the open zones.
4. **Next-unlock shortcut**: click the "Next: ..." bar: the camera glides to that tile and its panel opens.
5. **Level-up**: open an unlocked tile at level 1 or 2 and press Level Up: the new level's props pop in (they are built on this click).
6. **Menu -> Restart**: the camera returns to the starting tile at the default zoom.

- [ ] **Step 12: Checkpoint.** The game should look and play like before, plus pan/zoom and the stronger zone tints.

---
## Task 6: The v2 map: clusters, blank bridges, costs, and the tests that describe them

The map is generated once by a deterministic, seeded codemod and committed as ordinary literal data. It lays each of the 144 existing tiles out as a 3-hex "up" triangle on a spacing-3 lattice (neighbouring slots are exactly two hexes apart, so exactly one hex touches both: the bridge), grows each biome as a compact-but-ragged blob of 36 slots, joins slots with a shortest-path tree of blanks plus 6 loop edges, joins the biomes with corridors of blanks, and rewrites the unlock costs the spec changes. It also switches bioluminescence to "within two hexes".

**Files:**
- Create (temporarily): `tools/build-map-v2.mjs` — delete it in Step 6
- Modify: `js/tiles.js` (the `TILES` array is regenerated in place; the index code below it is untouched), `js/state.js`, `tests/economy.test.mjs`

**Interfaces:**
- Consumes: `cells` (Task 1), the swapped zone ids (Task 2), `TILE_NEARBY` (Task 1).
- Produces: 321 tiles: 144 clusters (36 per zone) + 177 blanks (`homewaters_blank_NN` x41, `frozen_blank_NN` x45, `timberline_blank_NN` x45, `abyssal_blank_NN` x46). Every blank: `family: null, kind: 'blank', produces: null, rate: null, boosts: null`, a flat per-zone cost. `isLit(tile, ids)` looks at `TILE_NEARBY`.

- [ ] **Step 1: Write the failing tests**

Apply this diff to `tests/economy.test.mjs`. It replaces every test that was pinned to the old 6x6 layout (144 tiles, position grid, `col + 6` mirror, neighbour lists, border adjacency) with tests for the new structure, adds the per-zone blank-cost, changed-cost and corridor tests, and re-fixtures the bioluminescence test for "within two hexes":

````diff
diff --git a/tests/economy.test.mjs b/tests/economy.test.mjs
index 94f0f25..0abc679 100644
--- a/tests/economy.test.mjs
+++ b/tests/economy.test.mjs
@@ -1,5 +1,6 @@
 import assert from 'node:assert/strict';
-import { TILES, TILE_BY_ID, TILE_NEIGHBORS } from '../js/tiles.js';
+import { TILES, TILE_BY_ID, TILE_NEARBY, TILE_NEIGHBORS } from '../js/tiles.js';
+import { hexDistance } from '../js/hex.js';
 import {
   ACHIEVEMENTS,
   advance,
@@ -53,19 +54,27 @@ import {
 
 // --- Tile data integrity ---
 
-assert.equal(TILES.length, 144, 'expected exactly 144 tiles (36 zone-1 + 36 zone-2 + 36 zone-3 + 36 zone-4)');
+const clusters = TILES.filter((t) => t.kind !== 'blank');
+const blanks = TILES.filter((t) => t.kind === 'blank');
+assert.equal(clusters.length, 144, 'expected 144 producer/booster/generator clusters (36 per zone)');
+assert.equal(blanks.length, 177, 'expected 177 blank bridge tiles');
+assert.equal(TILES.length, 321, 'clusters + blanks');
 
 const ids = TILES.map((t) => t.id);
 assert.equal(new Set(ids).size, TILES.length, 'tile ids must be unique');
 
-const positions = TILES.map((t) => `${t.cells[0].row},${t.cells[0].col}`);
-assert.equal(new Set(positions).size, TILES.length, 'grid positions must be unique');
-for (let row = 0; row < 6; row++) {
-  for (let col = 0; col < 6; col++) {
-    assert.ok(positions.includes(`${row},${col}`), `missing tile at (${row},${col})`);
-  }
-  for (let col = 6; col < 12; col++) {
-    assert.ok(positions.includes(`${row},${col}`), `missing tile at (${row},${col})`);
+const cellKeys = TILES.flatMap((t) => t.cells.map((c) => `${c.row},${c.col}`));
+assert.equal(new Set(cellKeys).size, cellKeys.length, 'no two tiles share a hex cell');
+assert.equal(cellKeys.length, 144 * 3 + 177, 'every cluster spans 3 cells and every blank 1');
+
+for (const t of TILES) {
+  assert.equal(t.cells.length, t.kind === 'blank' ? 1 : 3, `${t.id} has the right number of cells`);
+  if (t.kind === 'blank') continue;
+  for (const a of t.cells) {
+    for (const b of t.cells) {
+      if (a === b) continue;
+      assert.equal(hexDistance(a, b), 1, `${t.id}: all three cells of a cluster must be mutually adjacent`);
+    }
   }
 }
 
@@ -77,16 +86,39 @@ assert.deepEqual(
   'driftwood_start is the sole starting tile'
 );
 
-const familyCounts = TILES.reduce((counts, t) => {
+const familyCounts = clusters.reduce((counts, t) => {
   counts[t.family] = (counts[t.family] || 0) + 1;
   return counts;
 }, {});
 assert.deepEqual(
   familyCounts,
   { fish: 24, kelp: 24, driftwood: 21, crops: 21, booster: 24, planks: 10, kelp_rope: 10, bread: 10 },
-  'zone 4 adds 10 each of planks/kelp_rope/bread plus 6 more boosters (18+6=24), no new fish/kelp/driftwood/crops tiles'
+  'the producer/booster/generator mix is unchanged by the map rework'
+);
+
+const zoneCounts = TILES.reduce((counts, t) => {
+  const key = `${t.zone}:${t.kind === 'blank' ? 'blank' : 'cluster'}`;
+  counts[key] = (counts[key] || 0) + 1;
+  return counts;
+}, {});
+assert.deepEqual(
+  zoneCounts,
+  {
+    'zone1:cluster': 36, 'zone1:blank': 41,
+    'zone2:cluster': 36, 'zone2:blank': 45,
+    'zone3:cluster': 36, 'zone3:blank': 45,
+    'zone4:cluster': 36, 'zone4:blank': 46,
+  },
+  'every zone keeps its 36 clusters, plus its blank bridges'
 );
 
+for (const t of blanks) {
+  assert.equal(t.family, null);
+  assert.equal(t.produces, null);
+  assert.equal(t.boosts, null);
+  assert.equal(t.unlock.type, 'cost', `${t.id} is bought with a cost`);
+}
+
 console.log('tile data tests passed');
 
 // --- TILE_NEIGHBORS ---
@@ -103,41 +135,60 @@ for (const [id, neighbors] of TILE_NEIGHBORS) {
 }
 
 assert.deepEqual(
-  [...TILE_NEIGHBORS.get('driftwood_start')].sort(),
-  [
-    'booster_windmill',
-    'crops_soil_barge',
-    'fish_trawling_raft',
-    'kelp_abyssal_forest',
-    'kelp_reef',
-    'kelp_seaweed_raft',
-  ],
-  'driftwood_start (2,3) has exactly these 6 neighbors'
+  [...TILE_NEIGHBORS.get('driftwood_start')].map((id) => TILE_BY_ID.get(id).kind),
+  Array(6).fill('blank'),
+  'the start cluster is ringed by six blank bridges and touches no other cluster'
 );
 
-assert.deepEqual(
-  [...TILE_NEIGHBORS.get('fish_start')].sort(),
-  [
-    'booster_net_weavers',
-    'crops_floating_orchard',
-    'kelp_floating_garden',
-    'kelp_open_water_farm',
-    'timberline_ropeworks_1',
-    'timberline_sawmill_1',
-  ],
-  'fish_start (0,1) now borders zone 4 to the north too, on top of its 4 zone-1 neighbors'
-);
+for (const a of clusters) {
+  for (const id of TILE_NEIGHBORS.get(a.id)) {
+    assert.equal(TILE_BY_ID.get(id).kind, 'blank', `${a.id} only ever touches blank bridges, never another cluster directly`);
+  }
+}
+
+// Everything is reachable from the start by unlocking one neighbour at a time...
+function reachableFromStart(exclude = () => false) {
+  const seen = new Set(['driftwood_start']);
+  const queue = ['driftwood_start'];
+  while (queue.length) {
+    for (const next of TILE_NEIGHBORS.get(queue.pop())) {
+      if (seen.has(next) || exclude(TILE_BY_ID.get(next))) continue;
+      seen.add(next);
+      queue.push(next);
+    }
+  }
+  return seen;
+}
+assert.equal(reachableFromStart().size, TILES.length, 'every tile can be reached from the start tile');
+
+// ...the Timberline Coast (zone 3) straight off zone 1, but the Abyssal Trench (zone 4) only through Frozen Reach.
+{
+  const withoutFrozen = reachableFromStart((t) => t.zone === 'zone2');
+  assert.ok([...withoutFrozen].some((id) => TILE_BY_ID.get(id).zone === 'zone3'), 'Timberline is reachable without touching Frozen Reach');
+  assert.equal(
+    [...withoutFrozen].filter((id) => TILE_BY_ID.get(id).zone === 'zone4').length,
+    0,
+    'the Abyssal Trench cannot be reached except through Frozen Reach'
+  );
+  for (const abyssal of TILES.filter((t) => t.zone === 'zone4')) {
+    for (const cell of abyssal.cells) {
+      for (const home of TILES.filter((t) => t.zone === 'zone1')) {
+        for (const other of home.cells) {
+          assert.ok(hexDistance(cell, other) > 2, 'no Abyssal hex sits within two hexes of Home Waters');
+        }
+      }
+    }
+  }
+}
 
 console.log('adjacency tests passed');
 
 // --- Geometry-derived adjacency (cross-check against js/scene.js hex layout) ---
 
-// Mirrors js/scene.js's HEX_RADIUS/HEX_WIDTH/ROW_SPACING and hexLocalPosition's odd-r
-// offset layout exactly (minus the whole-grid centering offset, which is a constant
-// translation and doesn't affect pairwise distances). js/tiles.js's neighbor formula
-// and js/scene.js's hex-layout formula independently encode the same convention with
-// no shared constant — if one changes without the other, this catches it even though
-// every other test in this file would still pass.
+// Mirrors js/scene.js's HEX_RADIUS/HEX_WIDTH/ROW_SPACING and hexLocalPosition's odd-r offset
+// layout exactly. js/hex.js's neighbour formula and js/scene.js's hex-layout formula independently
+// encode the same convention with no shared constant -- if one changes without the other, this
+// catches it even though every other test in this file would still pass.
 const GEOM_HEX_RADIUS = 1.6;
 const GEOM_HEX_WIDTH = Math.sqrt(3) * GEOM_HEX_RADIUS;
 const GEOM_HEX_HEIGHT = 2 * GEOM_HEX_RADIUS;
@@ -146,29 +197,30 @@ const GEOM_NEIGHBOR_DISTANCE = GEOM_HEX_WIDTH; // same-row and diagonal-row neig
 const GEOM_DISTANCE_TOLERANCE = 1e-6;
 
 function hexCenter(row, col) {
-  // row % 2 === 1 breaks for negative rows (zone 4 sits at rows -6..-1) -- see the matching fix
-  // and comment on hexLocalPosition in js/scene.js.
+  // row % 2 === 1 breaks for negative rows -- see the matching comment on hexLocalPosition in js/scene.js.
   const x = col * GEOM_HEX_WIDTH + (row % 2 !== 0 ? GEOM_HEX_WIDTH / 2 : 0);
   const z = row * GEOM_ROW_SPACING;
   return { x, z };
 }
 
-for (const tile of TILES) {
-  const center = hexCenter(tile.cells[0].row, tile.cells[0].col);
-  const geometricNeighborIds = TILES.filter((other) => {
-    if (other.id === tile.id) return false;
-    const otherCenter = hexCenter(other.cells[0].row, other.cells[0].col);
-    const dx = otherCenter.x - center.x;
-    const dz = otherCenter.z - center.z;
-    const distance = Math.sqrt(dx * dx + dz * dz);
-    return Math.abs(distance - GEOM_NEIGHBOR_DISTANCE) < GEOM_DISTANCE_TOLERANCE;
-  }).map((t) => t.id);
-
-  assert.deepEqual(
-    geometricNeighborIds.sort(),
-    [...TILE_NEIGHBORS.get(tile.id)].sort(),
-    `geometry-derived neighbors for ${tile.id} must match TILE_NEIGHBORS`
-  );
+{
+  const owners = TILES.flatMap((tile) => tile.cells.map((cell) => ({ tile, ...hexCenter(cell.row, cell.col) })));
+  for (const tile of TILES) {
+    const geometric = new Set();
+    for (const cell of tile.cells) {
+      const center = hexCenter(cell.row, cell.col);
+      for (const other of owners) {
+        if (other.tile.id === tile.id) continue;
+        const distance = Math.hypot(other.x - center.x, other.z - center.z);
+        if (Math.abs(distance - GEOM_NEIGHBOR_DISTANCE) < GEOM_DISTANCE_TOLERANCE) geometric.add(other.tile.id);
+      }
+    }
+    assert.deepEqual(
+      [...geometric].sort(),
+      [...TILE_NEIGHBORS.get(tile.id)].sort(),
+      `geometry-derived neighbors for ${tile.id} must match TILE_NEIGHBORS`
+    );
+  }
 }
 
 console.log('geometry-derived adjacency tests passed');
@@ -273,11 +325,14 @@ console.log('geometry-derived adjacency tests passed');
 
 {
   const state = { unlocked: ['driftwood_start'] };
-  const adjacent = TILES.find((t) => t.id === 'crops_soil_barge');
-  assert.equal(isDiscovered(adjacent, state), true, 'crops_soil_barge is adjacent to driftwood_start');
+  const bridgeIds = TILE_NEIGHBORS.get('driftwood_start');
+  const bridge = TILE_BY_ID.get(bridgeIds[0]);
+  assert.equal(isDiscovered(bridge, state), true, 'a bridge touching the start cluster is discovered');
 
-  const distant = TILES.find((t) => t.id === 'kelp_start');
-  assert.equal(isDiscovered(distant, state), false, 'kelp_start is 2 hops from driftwood_start');
+  const beyond = TILE_BY_ID.get(TILE_NEIGHBORS.get(bridge.id).find((id) => id !== 'driftwood_start'));
+  assert.equal(beyond.kind !== 'blank', true, 'fixture assumption: the far side of a start bridge is a cluster');
+  assert.equal(isDiscovered(beyond, state), false, 'a cluster two tiles from the start is hidden until the bridge is unlocked');
+  assert.equal(isDiscovered(beyond, { unlocked: ['driftwood_start', bridge.id] }), true, '...and discovered once that bridge is unlocked');
 
   const start = TILES.find((t) => t.id === 'driftwood_start');
   assert.equal(isDiscovered(start, state), true, 'an already-unlocked tile is always discovered');
@@ -287,17 +342,19 @@ console.log('geometry-derived adjacency tests passed');
 
 {
   // cost-gated, adjacent to the sole unlocked tile: gated on resources only
-  const tile = TILES.find((t) => t.id === 'crops_soil_barge'); // cost: 35 driftwood
-  const state = { unlocked: ['driftwood_start'], resources: { driftwood: 10 }, lifetime: {} };
+  const tile = TILE_BY_ID.get(TILE_NEIGHBORS.get('driftwood_start')[0]); // a zone-1 blank: 12 driftwood
+  assert.deepEqual(tile.unlock.cost, { driftwood: 12 }, 'fixture assumption: zone-1 blanks cost 12 driftwood');
+  const state = { unlocked: ['driftwood_start'], resources: { driftwood: 5 }, lifetime: {} };
   assert.equal(isEligible(tile, state), false, 'not enough driftwood yet');
-  state.resources.driftwood = 35;
+  state.resources.driftwood = 12;
   assert.equal(isEligible(tile, state), true, 'discovered and affordable');
 }
 
 {
-  // milestone-gated, adjacent to the sole unlocked tile
+  // milestone-gated, and discovered because a bridge beside it is unlocked
   const tile = TILES.find((t) => t.id === 'kelp_reef'); // milestone: driftwood >= 60
-  const state = { unlocked: ['driftwood_start'], resources: {}, lifetime: { driftwood: 59 } };
+  const unlocked = ['driftwood_start', ...TILE_NEIGHBORS.get('kelp_reef')];
+  const state = { unlocked, resources: {}, lifetime: { driftwood: 59 } };
   assert.equal(isEligible(tile, state), false);
   state.lifetime.driftwood = 60;
   assert.equal(isEligible(tile, state), true);
@@ -556,20 +613,20 @@ console.log('prestige production integration tests passed');
 
 {
   const state = createInitialState();
-  state.resources.driftwood = 20;
-  const tile = TILES.find((t) => t.id === 'booster_windmill');
+  state.resources.driftwood = 12;
+  const tile = TILE_BY_ID.get(TILE_NEIGHBORS.get('driftwood_start')[0]); // a zone-1 blank: 12 driftwood
   const ok = unlockTile(state, tile);
   assert.equal(ok, true, 'unlock succeeds when adjacent and affordable');
   assert.equal(state.resources.driftwood, 0, 'cost is deducted');
-  assert.ok(state.unlocked.includes('booster_windmill'), 'tile id added to unlocked');
+  assert.ok(state.unlocked.includes(tile.id), 'tile id added to unlocked');
 }
 
 {
   const state = createInitialState();
-  const tile = TILES.find((t) => t.id === 'booster_windmill');
+  const tile = TILE_BY_ID.get(TILE_NEIGHBORS.get('driftwood_start')[0]);
   const ok = unlockTile(state, tile);
   assert.equal(ok, false, 'unlock fails when not enough resources');
-  assert.ok(!state.unlocked.includes('booster_windmill'));
+  assert.ok(!state.unlocked.includes(tile.id));
 }
 
 {
@@ -707,8 +764,8 @@ console.log('economy math tests passed');
 {
   // first-steps is also awarded through unlockTile's own check
   const state = createInitialState();
-  state.resources.driftwood = 20;
-  unlockTile(state, TILES.find((t) => t.id === 'booster_windmill'));
+  state.resources.driftwood = 12;
+  unlockTile(state, TILE_BY_ID.get(TILE_NEIGHBORS.get('driftwood_start')[0]));
   assert.deepEqual(state.achievements, ['first-steps'], 'unlockTile checks achievements after a successful unlock');
   assert.equal(state.gold, 1);
 }
@@ -897,41 +954,36 @@ function seedSave(save) {
 
 console.log('achievement save migration tests passed');
 
-// --- zone border adjacency tests ---
+// --- zone corridors ---
+// Every zone after the first is entered along a corridor of blank bridges from the zone that leads to it.
+const corridorEntry = (zone, fromZone) =>
+  TILES.find((t) => t.zone === zone && t.kind === 'blank' && TILE_NEIGHBORS.get(t.id).some((id) => TILE_BY_ID.get(id).zone === fromZone));
 {
-  const neighbors = TILE_NEIGHBORS.get('crops_terraced_planter'); // zone-1, row 0, col 5
-  assert(
-    neighbors.includes('frozen_booster_net_weavers'), // zone-2, row 0, col 6
-    'zone-1 col-5 tile should be hex-adjacent to its zone-2 col-6 neighbor'
-  );
-
-  const zone2Count = TILES.filter((t) => t.zone === 'zone2').length;
-  assert.strictEqual(zone2Count, 36, 'zone 2 should have exactly 36 tiles');
-
-  const zone1Count = TILES.filter((t) => t.zone === 'zone1').length;
-  assert.strictEqual(zone1Count, 36, 'zone 1 should still have exactly 36 tiles');
+  assert.ok(corridorEntry('zone2', 'zone1'), 'Frozen Reach is entered from Home Waters');
+  assert.ok(corridorEntry('zone3', 'zone1'), 'Timberline Coast is entered from Home Waters');
+  assert.ok(corridorEntry('zone4', 'zone2'), 'the Abyssal Trench is entered from Frozen Reach');
+  assert.equal(corridorEntry('zone4', 'zone1'), undefined, 'the Abyssal Trench has no way in from Home Waters');
+  assert.equal(corridorEntry('zone3', 'zone2'), undefined, 'and Timberline has none from Frozen Reach');
 
-  console.log('zone border adjacency tests passed');
+  console.log('zone corridor tests passed');
 }
 
 // --- zone-2 economy multiplier tests ---
 // Locks in the spec's mirrored-economy invariant: every zone-1 tile has a
-// zone-2 mirror 6 columns over (same row, family, kind) whose unlock cost is
+// zone-2 mirror (id `frozen_<id>`, same family and kind) whose unlock cost is
 // 90x and whose production (rate / boost percent) is 4x. The unlock cost was
 // 15x in the original design and was then multiplied by 6 after a simulated
 // run showed zone 2 finishing in about 2 minutes; this pins the shipped numbers.
 {
-  const zone1Tiles = TILES.filter((t) => t.zone === 'zone1');
-  const zone2Tiles = TILES.filter((t) => t.zone === 'zone2');
+  const zone1Tiles = TILES.filter((t) => t.zone === 'zone1' && t.kind !== 'blank');
+  const zone2Tiles = TILES.filter((t) => t.zone === 'zone2' && t.kind !== 'blank');
 
   const UNLOCK_MULTIPLIER = 90;
   const PRODUCTION_MULTIPLIER = 4;
 
   for (const t1 of zone1Tiles) {
-    const mirror = zone2Tiles.find(
-      (t2) => t2.cells[0].row === t1.cells[0].row && t2.cells[0].col === t1.cells[0].col + 6
-    );
-    assert.ok(mirror, `${t1.id} (zone1, col ${t1.cells[0].col}) must have a zone-2 mirror at col ${t1.cells[0].col + 6}`);
+    const mirror = zone2Tiles.find((t2) => t2.id === `frozen_${t1.id}`);
+    assert.ok(mirror, `${t1.id} (zone1) must have a zone-2 mirror named frozen_${t1.id}`);
     assert.equal(mirror.family, t1.family, `${t1.id}/${mirror.id} must share the same family`);
     assert.equal(mirror.kind, t1.kind, `${t1.id}/${mirror.id} must share the same kind`);
 
@@ -1006,11 +1058,10 @@ console.log('achievement save migration tests passed');
   console.log('zone-2 economy multiplier tests passed');
 }
 
-// --- zone-2 tile ineligible until its zone-1 border neighbor unlocks ---
+// --- the corridor into zone 2 stays shut until its zone-1 end is unlocked ---
 {
-  // Same col-5/col-6 border pair the zone-border-adjacency test above uses.
-  const frozenTile = TILES.find((t) => t.id === 'frozen_booster_net_weavers'); // zone-2, row 0, col 6
-  const borderNeighborId = 'crops_terraced_planter'; // zone-1, row 0, col 5
+  const entry = corridorEntry('zone2', 'zone1'); // a Frozen Reach bridge touching a zone-1 cluster
+  const borderNeighborId = TILE_NEIGHBORS.get(entry.id).find((id) => TILE_BY_ID.get(id).zone === 'zone1');
 
   const state = {
     unlocked: [],
@@ -1018,16 +1069,16 @@ console.log('achievement save migration tests passed');
     lifetime: {},
   };
   assert.equal(
-    isEligible(frozenTile, state),
+    isEligible(entry, state),
     false,
-    'a zone-2 tile is not eligible while its zone-1 border neighbor is locked, however affordable'
+    'a corridor bridge is not eligible while the zone-1 cluster beside it is locked, however affordable'
   );
 
   state.unlocked.push(borderNeighborId);
   assert.equal(
-    isEligible(frozenTile, state),
+    isEligible(entry, state),
     true,
-    'unlocking the bordering zone-1 tile makes the zone-2 tile eligible once affordable'
+    'unlocking the bordering zone-1 cluster makes the corridor bridge eligible once affordable'
   );
 
   console.log('zone-2 border eligibility tests passed');
@@ -1399,6 +1450,7 @@ console.log('achievement save migration tests passed');
 
   const two = doPrestige(finished(2)).state;
   assert.equal(clusterCount(two), 1 + 4, 'two clusters per level');
+  assert.ok(two.unlocked.length > 1 + 4, 'and the bridges needed to reach them come free too');
   assert.equal(two.prestige.headStart, 2, 'the upgrade itself carries over');
   for (const r of ['fish', 'kelp', 'driftwood', 'crops']) assert.equal(two.resources[r], 0, 'a head start costs nothing');
   for (const id of two.unlocked) {
@@ -1526,36 +1578,42 @@ console.log('achievement save migration tests passed');
   console.log('upgrade list tests passed');
 }
 
-// --- Bioluminescence (zone 3): dim until a zone-3 booster is unlocked next door ---
+// --- Bioluminescence (Abyssal Trench, zone 4): dim until one of its boosters is unlocked next door ---
 {
-  const litByBooster = TILES.find((t) => t.id === 'abyssal_fish_start');
-  const boosterNeighbor = TILES.find((t) => t.id === 'abyssal_booster_net_weavers');
-  assert(TILE_NEIGHBORS.get(litByBooster.id).includes(boosterNeighbor.id), 'fixture assumption: these two tiles are adjacent');
+  // "Next door" means within two hexes: touching, or one bridge tile apart -- as close as two clusters get.
+  const producers = TILES.filter((t) => t.zone === 'zone4' && t.kind === 'producer');
+  const near = (tile) => TILE_NEARBY.get(tile.id);
+  const isTrenchBooster = (id) => TILE_BY_ID.get(id).zone === 'zone4' && TILE_BY_ID.get(id).kind === 'booster';
 
-  const noNeighborBooster = TILES.find((t) => t.id === 'abyssal_fish_tide_pool_trap');
-  assert(
-    !(TILE_NEIGHBORS.get(noNeighborBooster.id) || []).some((id) => TILES.find((t) => t.id === id)?.zone === 'zone4' && TILES.find((t) => t.id === id)?.kind === 'booster'),
-    'fixture assumption: this tile has no zone-3 booster neighbor'
-  );
+  const litByBooster = producers.find((t) => near(t).some(isTrenchBooster));
+  const boosterNeighbor = TILE_BY_ID.get(near(litByBooster).find(isTrenchBooster));
+  const noNeighborBooster = producers.find((t) => !near(t).some(isTrenchBooster));
+  assert(litByBooster && boosterNeighbor, 'fixture assumption: some trench producer has a booster within two hexes');
+  assert(noNeighborBooster, 'fixture assumption: some trench producer has no booster within two hexes');
 
-  // Non-zone-3 tiles and zone-3 boosters are never dim, regardless of neighbors or unlocks.
+  // Non-trench tiles and the trench's own boosters are never dim, regardless of neighbors or unlocks.
   assert.equal(isLit(TILES.find((t) => t.id === 'fish_start'), []), true, 'a zone-1 tile is never dim');
   assert.equal(isLit(TILES.find((t) => t.id === 'frozen_fish_start'), []), true, 'a zone-2 tile is never dim');
-  assert.equal(isLit(boosterNeighbor, []), true, 'a zone-3 booster is never dim itself');
+  assert.equal(isLit(TILES.find((t) => t.zone === 'zone3' && t.kind === 'generator'), []), true, 'a Timberline tile is never dim');
+  assert.equal(isLit(boosterNeighbor, []), true, 'a trench booster is never dim itself');
 
-  // A zone-3 producer with no unlocked zone-3 booster neighbor is dim...
+  // A trench producer with no unlocked trench booster nearby is dim...
   assert.equal(isLit(litByBooster, []), false, 'dim with nothing unlocked nearby');
-  assert.equal(isLit(litByBooster, [boosterNeighbor.id]), true, '...lit once that neighbor is unlocked');
-  assert.equal(isLit(noNeighborBooster, TILES.filter((t) => t.zone === 'zone4' && t.kind === 'booster').map((t) => t.id)), false, 'still dim: no zone-3 booster is actually adjacent to it, however many are unlocked elsewhere');
+  assert.equal(isLit(litByBooster, [boosterNeighbor.id]), true, '...lit once that booster is unlocked');
+  assert.equal(
+    isLit(noNeighborBooster, TILES.filter((t) => t.zone === 'zone4' && t.kind === 'booster').map((t) => t.id)),
+    false,
+    'still dim: no trench booster is actually within two hexes of it, however many are unlocked elsewhere'
+  );
 
   // The darkness penalty actually halves the rate, and lighting it doubles output back to normal.
   // Uses a producer/booster pair whose resources don't overlap, so unlocking the booster only
   // lights the producer and doesn't also raise its rate via the booster's own (raft-wide) percent
-  // — that's a separate, already-tested effect this assertion isn't about.
-  const dimProducer = TILES.find((t) => t.id === 'abyssal_fish_anchored_net');
-  const nonOverlappingBooster = TILES.find((t) => t.id === 'abyssal_booster_drying_rack');
-  assert(TILE_NEIGHBORS.get(dimProducer.id).includes(nonOverlappingBooster.id), 'fixture assumption: these two tiles are adjacent');
-  assert(!nonOverlappingBooster.boosts.some((b) => b.resource === dimProducer.produces), 'fixture assumption: this booster does not also boost fish');
+  // -- that's a separate, already-tested effect this assertion isn't about.
+  const [dimProducer, nonOverlappingBooster] = producers
+    .flatMap((p) => near(p).filter(isTrenchBooster).map((id) => [p, TILE_BY_ID.get(id)]))
+    .find(([p, b]) => !b.boosts.some((x) => x.resource === p.produces));
+  assert(dimProducer && nonOverlappingBooster, 'fixture assumption: a nearby producer/booster pair with no shared resource exists');
 
   const st = createInitialState();
   st.unlocked = ['driftwood_start', dimProducer.id];
@@ -1566,10 +1624,10 @@ console.log('achievement save migration tests passed');
   assert.equal(dimRate, dimProducer.rate * 0.5, 'a dim, unboosted, level-1 producer runs at exactly half its listed rate');
 
   // rateBreakdown and effectiveRate (the HUD/ETA/offline-progress path) reflect the same penalty.
-  const before = rateBreakdown(st, 'fish').base;
+  const before = rateBreakdown(st, dimProducer.produces).base;
   st.unlocked = st.unlocked.filter((id) => id !== nonOverlappingBooster.id);
-  const after = rateBreakdown(st, 'fish').base;
-  assert.equal(after, before / 2, 'rateBreakdown halves a dim zone-3 producer\'s contribution to the resource total');
+  const after = rateBreakdown(st, dimProducer.produces).base;
+  assert.equal(after, before / 2, "rateBreakdown halves a dim trench producer's contribution to the resource total");
 
   console.log('bioluminescence tests passed');
 }
@@ -1703,3 +1761,52 @@ console.log('achievement save migration tests passed');
 
   console.log('blank tile engine tests passed');
 }
+
+// --- Blank bridge tiles: the map's data ---
+{
+  const bridge = TILE_BY_ID.get(TILE_NEIGHBORS.get('driftwood_start')[0]);
+  assert.equal(bridge.kind, 'blank', 'fixture assumption: the start cluster is ringed by blanks');
+
+  const state = createInitialState();
+  assert.equal(getLevel(state, bridge.id), MAX_LEVEL, 'a blank has nothing to level, so it is maxed from the start');
+  assert.equal(getLevel(state, 'driftwood_start'), 1, 'other tiles still default to level 1');
+
+  const before = completionCount(state);
+  state.resources.driftwood = 12;
+  assert.equal(unlockTile(state, bridge), true, 'a blank is bought like any other tile');
+  assert.equal(completionCount(state), before + 1, 'an unlocked blank counts toward completion straight away');
+  assert.ok(!upgradeList(state).some((row) => row.tile.id === bridge.id), 'a blank never shows in the upgrade list');
+  assert.equal(isLevelUpEligible(state, bridge), false, 'and can never be levelled');
+  assert.equal(rateBreakdown(state, 'driftwood').total, 0.5, 'a blank adds no production');
+
+  // Every blank in a zone shares one flat price.
+  const costsByZone = {};
+  for (const t of TILES.filter((x) => x.kind === 'blank')) {
+    const key = JSON.stringify(t.unlock.cost);
+    costsByZone[t.zone] ||= new Set();
+    costsByZone[t.zone].add(key);
+  }
+  for (const [zone, costs] of Object.entries(costsByZone)) assert.equal(costs.size, 1, `every ${zone} blank costs the same`);
+  const blankCost = (zone) => JSON.parse([...costsByZone[zone]][0]);
+  const total = (cost) => Object.values(cost).reduce((sum, n) => sum + n, 0);
+  const BASE4 = ['fish', 'kelp', 'driftwood', 'crops'];
+
+  assert.deepEqual(Object.keys(blankCost('zone1')), ['driftwood'], 'Home Waters bridges cost driftwood only');
+  for (const zone of ['zone2', 'zone3']) {
+    assert.ok(Object.keys(blankCost(zone)).every((r) => BASE4.includes(r)), `${zone} bridges cost zone-1 resources only: the toll for leaving Home Waters`);
+  }
+  assert.ok(total(blankCost('zone3')) > total(blankCost('zone2')), 'Timberline bridges cost more than Frozen Reach');
+  assert.deepEqual(Object.keys(blankCost('zone4')).sort(), ['kelp_rope', 'planks'], 'Abyssal bridges cost only planks and kelp_rope');
+
+  // Unlock costs the rework changed.
+  for (const t of TILES.filter((x) => x.zone === 'zone3' && x.kind !== 'blank')) {
+    assert.ok(Object.keys(t.unlock.cost).every((r) => BASE4.includes(r)), `${t.id}: Timberline unlocks cost base resources only`);
+  }
+  for (const t of TILES.filter((x) => x.zone === 'zone4' && x.kind !== 'blank')) {
+    if (t.unlock.type === 'milestone') continue;
+    assert.ok(t.unlock.cost.planks > 0 && t.unlock.cost.kelp_rope > 0, `${t.id}: Abyssal unlocks also need planks and kelp_rope`);
+    assert.equal(t.unlock.cost.bread, undefined, `${t.id}: bread is deliberately not part of it`);
+  }
+
+  console.log('blank tile tests passed');
+}
````
Run: `npm test`
Expected: FAIL at `expected 177 blank bridge tiles`.

- [ ] **Step 2: Create `tools/build-map-v2.mjs`**

````js
// One-shot codemod for the v2.0 map rework. Run once from the repo root with `node tools/build-map-v2.mjs`.
// Reads the current js/tiles.js (144 single-hex tiles, zones already swapped), lays every tile out as
// a 3-hex cluster on a spacing-3 lattice, adds the blank bridge tiles, rewrites the unlock costs the
// spec changes, and rewrites the TILES array in js/tiles.js in place. Deterministic (seeded). It
// cannot be re-run afterwards -- its input shape is gone -- so delete it once the output is committed.
import { readFileSync, writeFileSync } from 'node:fs';
import { TILES as OLD, TILE_NEIGHBORS } from '../js/tiles.js';

// Pure layout builder: old single-hex tiles in, new cluster/blank layout out.
// No file IO here so it can be validated and reused by the one-shot codemod.

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Axial hex coordinates {q, r}; directions ordered E, NE, NW, W, SW, SE.
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const ax = (q, r) => ({ q, r });
const akey = (h) => `${h.q},${h.r}`;
const add = (h, d) => ({ q: h.q + d[0], r: h.r + d[1] });
const hexDist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
const toOffset = (h) => ({ row: h.r, col: h.q + (h.r - (h.r & 1)) / 2 });
const toAxial = ({ row, col }) => ({ q: col - (row - (row & 1)) / 2, r: row });

// Clusters sit on a spacing-3 lattice of "slots". A cluster is the anchor hex plus its E and SE
// neighbours (three mutually adjacent hexes).
const SLOT_SPACING = 3;
const CLUSTER_OFFSETS = [[0, 0], [1, 0], [0, 1]];
const slotAnchor = (s) => ax(s.a * SLOT_SPACING, s.b * SLOT_SPACING);
const clusterCells = (s) => CLUSTER_OFFSETS.map((o) => add(slotAnchor(s), o));
const slotKey = (s) => `${s.a},${s.b}`;
const slotNeighbors = (s) => DIRS.map((d) => ({ a: s.a + d[0], b: s.b + d[1] }));
const slotDist = (x, y) => hexDist(ax(x.a, x.b), ax(y.a, y.b));

// For each of the 6 slot directions, the single hex that touches both the origin cluster and the
// neighbouring cluster (relative to the origin slot's anchor).
function bridgeOffsets() {
  const origin = clusterCells({ a: 0, b: 0 });
  return DIRS.map((d) => {
    const other = clusterCells({ a: d[0], b: d[1] });
    const occupied = new Set([...origin, ...other].map(akey));
    const found = [];
    for (let q = -6; q <= 6; q++) {
      for (let r = -6; r <= 6; r++) {
        const h = ax(q, r);
        if (occupied.has(akey(h))) continue;
        const touches = (cells) => cells.some((c) => hexDist(c, h) === 1);
        if (touches(origin) && touches(other)) found.push(h);
      }
    }
    found.sort((x, y) => x.q - y.q || x.r - y.r);
    return found;
  });
}

// Compact-but-ragged blob of slots grown from a centre slot.
function growBlob(center, size, rand) {
  const set = new Map([[slotKey(center), center]]);
  while (set.size < size) {
    const scores = new Map();
    for (const s of set.values()) {
      for (const n of slotNeighbors(s)) {
        const k = slotKey(n);
        if (set.has(k)) continue;
        if (!scores.has(k)) {
          const inSet = slotNeighbors(n).filter((m) => set.has(slotKey(m))).length;
          scores.set(k, { slot: n, score: inSet + rand() * 1.6 });
        }
      }
    }
    let best = null;
    for (const c of scores.values()) if (!best || c.score > best.score) best = c;
    set.set(slotKey(best.slot), best.slot);
  }
  return [...set.values()];
}

function shuffle(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const BIOMES = [
  { zone: 'zone1', center: { a: 0, b: 0 }, parent: null, seed: 1101 },
  { zone: 'zone2', center: { a: 4, b: -8 }, parent: 'zone1', seed: 2202 },
  { zone: 'zone3', center: { a: -8, b: 0 }, parent: 'zone1', seed: 3303 },
  { zone: 'zone4', center: { a: 12, b: -8 }, parent: 'zone2', seed: 4404 },
];
const EXTRA_LOOP_EDGES = 6;

// oldTiles: [{ id, zone, ... }] in board order. oldNeighbors: Map id -> [ids] from the old 1-hex adjacency.
function buildLayout(oldTiles, oldNeighbors) {
  const byZone = (z) => oldTiles.filter((t) => t.zone === z);
  const entryTileIds = {
    zone1: ['driftwood_start'],
    zone2: byZone('zone2').filter((t) => (oldNeighbors.get(t.id) || []).some((n) => oldTiles.find((x) => x.id === n).zone === 'zone1')).map((t) => t.id),
    zone3: byZone('zone3').filter((t) => (oldNeighbors.get(t.id) || []).some((n) => oldTiles.find((x) => x.id === n).zone === 'zone1')).map((t) => t.id),
    zone4: byZone('zone4').filter((t) => (oldNeighbors.get(t.id) || []).some((n) => oldTiles.find((x) => x.id === n).zone === 'zone2')).map((t) => t.id),
  };

  const bridgeOff = bridgeOffsets().map((list) => list[0]);
  const placements = new Map(); // tile id -> { slot, zone }
  const slotsByZone = new Map(); // zone -> Map(slotKey -> {slot, tileId})
  const internalBridges = []; // { zone, hex }
  const entrySlot = new Map();
  const exitSlot = new Map(); // child zone -> slot in PARENT blob used for the corridor

  // 1. Blobs + tile assignment.
  for (const biome of BIOMES) {
    const rand = mulberry32(biome.seed);
    const blob = growBlob(biome.center, byZone(biome.zone).length, rand);
    let entry;
    if (!biome.parent) entry = biome.center;
    else {
      const parentCenter = BIOMES.find((b) => b.zone === biome.parent).center;
      const sorted = [...blob].sort((x, y) => slotDist(x, parentCenter) - slotDist(y, parentCenter) || slotKey(x).localeCompare(slotKey(y)));
      entry = sorted[0];
    }
    entrySlot.set(biome.zone, entry);

    // old rank: BFS distance from the old entry tiles inside the zone
    const tiles = byZone(biome.zone);
    const dOld = new Map();
    let frontier = [...entryTileIds[biome.zone]];
    frontier.forEach((id) => dOld.set(id, 0));
    while (frontier.length) {
      const next = [];
      for (const id of frontier) {
        for (const n of oldNeighbors.get(id) || []) {
          const nt = oldTiles.find((x) => x.id === n);
          if (nt.zone !== biome.zone || dOld.has(n)) continue;
          dOld.set(n, dOld.get(id) + 1);
          next.push(n);
        }
      }
      frontier = next;
    }
    const tileOrder = shuffle(tiles, rand).sort((x, y) => (dOld.get(x.id) ?? 99) - (dOld.get(y.id) ?? 99));
    const slotOrder = shuffle(blob, rand).sort((x, y) => slotDist(x, entry) - slotDist(y, entry));
    const map = new Map();
    slotOrder.forEach((slot, i) => {
      map.set(slotKey(slot), { slot, tileId: tileOrder[i].id });
      placements.set(tileOrder[i].id, { slot, zone: biome.zone });
    });
    // the start tile must sit on the entry slot of zone 1
    if (biome.zone === 'zone1') {
      const startPlacement = placements.get('driftwood_start');
      if (slotKey(startPlacement.slot) !== slotKey(entry)) throw new Error('driftwood_start is not on the centre slot');
    }
    slotsByZone.set(biome.zone, map);
  }

  // 2. In-biome bridges: BFS tree from the entry slot plus a few loop edges.
  const usedBridgeHex = new Map(); // hex key -> zone
  const blankList = []; // { zone, hex }
  const addBlank = (zone, hex) => {
    if (usedBridgeHex.has(akey(hex))) throw new Error(`bridge hex collision at ${akey(hex)}`);
    usedBridgeHex.set(akey(hex), zone);
    blankList.push({ zone, hex });
  };
  const edgeBridgeHex = (s, dirIndex) => add(slotAnchor(s), [bridgeOff[dirIndex].q, bridgeOff[dirIndex].r]);

  for (const biome of BIOMES) {
    const rand = mulberry32(biome.seed + 7);
    const map = slotsByZone.get(biome.zone);
    const entry = entrySlot.get(biome.zone);
    const dist = new Map([[slotKey(entry), 0]]);
    const order = [entry];
    const treeEdges = [];
    for (let i = 0; i < order.length; i++) {
      const s = order[i];
      const nexts = shuffle(DIRS.map((d, di) => [d, di]), rand);
      for (const [d, di] of nexts) {
        const n = { a: s.a + d[0], b: s.b + d[1] };
        const k = slotKey(n);
        if (!map.has(k) || dist.has(k)) continue;
        dist.set(k, dist.get(slotKey(s)) + 1);
        order.push(n);
        treeEdges.push({ from: s, dir: di });
      }
    }
    const treeKeySet = new Set(treeEdges.map((e) => `${slotKey(e.from)}>${e.dir}`));
    // candidate loop edges: adjacent blob slot pairs not already a tree edge (either direction)
    const candidates = [];
    for (const { slot: s } of map.values()) {
      DIRS.forEach((d, di) => {
        const n = { a: s.a + d[0], b: s.b + d[1] };
        if (!map.has(slotKey(n))) return;
        const rev = (di + 3) % 6;
        if (treeKeySet.has(`${slotKey(s)}>${di}`) || treeKeySet.has(`${slotKey(n)}>${rev}`)) return;
        if (slotKey(s) > slotKey(n)) return; // count each pair once
        candidates.push({ from: s, dir: di });
      });
    }
    const loops = shuffle(candidates, rand).slice(0, EXTRA_LOOP_EDGES);
    for (const e of [...treeEdges, ...loops]) addBlank(biome.zone, edgeBridgeHex(e.from, e.dir));
  }

  // 3. Corridors between biomes: shortest hex path through free water.
  const occupied = new Map(); // hex key -> owner string
  for (const [zone, map] of slotsByZone) {
    for (const { slot } of map.values()) for (const h of clusterCells(slot)) occupied.set(akey(h), `c:${zone}:${slotKey(slot)}`);
  }
  for (const b of blankList) occupied.set(akey(b.hex), `b:${b.zone}`);

  const corridorInfo = [];
  for (const biome of BIOMES) {
    if (!biome.parent) continue;
    const parentMap = slotsByZone.get(biome.parent);
    const childEntry = entrySlot.get(biome.zone);
    const parentEntry = entrySlot.get(biome.parent);
    // parent's exit slot: parent blob slot nearest the child's entry slot
    const exit = [...parentMap.values()].map((x) => x.slot).sort((x, y) => slotDist(x, childEntry) - slotDist(y, childEntry) || slotKey(x).localeCompare(slotKey(y)))[0];
    exitSlot.set(biome.zone, exit);
    const exitOwner = `c:${biome.parent}:${slotKey(exit)}`;
    const entryOwner = `c:${biome.zone}:${slotKey(childEntry)}`;
    const allowed = (h) => {
      if (occupied.has(akey(h))) return false;
      for (const d of DIRS) {
        const o = occupied.get(akey(add(h, d)));
        if (o && o !== exitOwner && o !== entryOwner) return false;
      }
      return true;
    };
    const adjacentTo = (owner) => (h) => DIRS.some((d) => occupied.get(akey(add(h, d))) === owner);
    const isStart = adjacentTo(exitOwner);
    const isGoal = adjacentTo(entryOwner);
    // BFS over a bounded box around both clusters
    const seen = new Map();
    let frontier = [];
    const anchor = slotAnchor(exit);
    for (let q = anchor.q - 60; q <= anchor.q + 60; q++) {
      for (let r = anchor.r - 60; r <= anchor.r + 60; r++) {
        const h = ax(q, r);
        if (allowed(h) && isStart(h)) { seen.set(akey(h), null); frontier.push(h); }
      }
    }
    let goalHex = null;
    outer: while (frontier.length) {
      const next = [];
      for (const h of frontier) {
        if (isGoal(h)) { goalHex = h; break outer; }
        for (const d of DIRS) {
          const n = add(h, d);
          if (seen.has(akey(n)) || !allowed(n)) continue;
          seen.set(akey(n), h);
          next.push(n);
        }
      }
      frontier = next;
    }
    if (!goalHex) throw new Error(`no corridor found ${biome.parent} -> ${biome.zone}`);
    const path = [];
    for (let h = goalHex; h; h = seen.get(akey(h))) path.push(h);
    path.reverse();
    for (const h of path) { addBlank(biome.zone, h); occupied.set(akey(h), `b:${biome.zone}`); }
    corridorInfo.push({ from: biome.parent, to: biome.zone, length: path.length, exit, entry: childEntry });
  }

  return { placements, slotsByZone, blankList, entrySlot, exitSlot, corridorInfo };
}

function cellsForSlot(slot) {
  return clusterCells(slot).map(toOffset);
}

// ---------------------------------------------------------------------------------------------
// Costs (first-pass numbers, unsimulated -- same caveat as every earlier zone's).

const sig = (n, digits) => Number(n.toPrecision(digits));
const OWN_GOODS = new Set(['planks', 'kelp_rope', 'bread']);
// Timberline's old rings 4-6 were priced in its own goods. Continue rings 1-3's base-resource curve
// instead (cost per unit of output rate grew ~2.6x a ring: 50, 140, 370 -> 960, 2500, 6500), split
// 60/40 driftwood/second input the way rings 1-3 already are. Boosters ran x4 a ring (35, 140, 560).
const RING_COST_PER_RATE = { 4: 960, 5: 2500, 6: 6500 };
const RING_BOOSTER_DRIFTWOOD = { 4: 2240, 5: 8960, 6: 35840 };

function timberlineCost(tile) {
  const keys = Object.keys(tile.unlock.cost);
  if (!keys.every((k) => OWN_GOODS.has(k))) return tile.unlock.cost;
  const ring = -tile.cells[0].row;
  if (tile.kind === 'booster') return { driftwood: RING_BOOSTER_DRIFTWOOD[ring] };
  const total = tile.rate * RING_COST_PER_RATE[ring];
  if (tile.family === 'planks') return { driftwood: sig(total, 3) };
  const second = tile.family === 'kelp_rope' ? 'kelp' : 'crops';
  return { driftwood: sig(total * 0.6, 3), [second]: sig(total * 0.4, 3) };
}

// The Abyssal Trench keeps its base-resource cost and adds planks + kelp_rope on top. Tiles gated by
// a lifetime milestone have no cost to add to, so they stay milestone-gated.
function abyssalUnlock(tile) {
  if (tile.unlock.type !== 'cost') return tile.unlock;
  const total = Object.values(tile.unlock.cost).reduce((sum, n) => sum + n, 0);
  const planks = sig(total / 1500, 2);
  return { type: 'cost', cost: { ...tile.unlock.cost, planks, kelp_rope: sig(planks * 0.7, 2) } };
}

const BLANKS = {
  zone1: { prefix: 'homewaters', name: 'Driftwood Walkway', cost: { driftwood: 12 } },
  zone2: { prefix: 'frozen', name: 'Ice Causeway', cost: { driftwood: 1200, crops: 800 } },
  zone3: { prefix: 'timberline', name: 'Timber Boardwalk', cost: { driftwood: 1800, crops: 1200, kelp: 900 } },
  zone4: { prefix: 'abyssal', name: 'Kelp-Rope Bridge', cost: { planks: 60, kelp_rope: 40 } },
};

const SECTION_COMMENTS = {
  zone1: `  // ===== Zone 1: Home Waters ===== (the start: a blob of 36 three-hex clusters around
  // driftwood_start, joined by one-hex blank bridges that all cost the same flat driftwood price)`,
  zone2: `  // ===== Zone 2: Frozen Reach ===== (north of zone 1, reached by a corridor of blank bridges.
  // Cluster costs/milestones are 90x zone 1's, rates/boosts 4x; its blanks cost a flat mix of
  // zone 1's base resources -- the toll for leaving Home Waters)`,
  zone3: `  // ===== Zone 3: Timberline Coast ===== (west of zone 1, reached directly from it. Every
  // non-booster tile is a *generator*: it consumes existing resources to make a new one
  // (planks/kelp_rope/bread). Unlock costs are base resources only. First-pass numbers, not
  // simulated -- see docs/superpowers/specs/2026-09-24-drift-away-zone4-design.md and the v2 spec)`,
  zone4: `  // ===== Zone 4: Abyssal Trench ===== (east of zone 2, reachable only through the Frozen Reach.
  // Producers mirror zone 2's at 90x cost / 4x rate. Every cost-gated cluster also needs planks and
  // kelp_rope, and its blanks cost only those two -- the Timberline Coast's output)`,
};

const KEY_ORDER = ['id', 'name', 'cells', 'family', 'kind', 'produces', 'rate', 'consumes', 'boosts', 'unlock', 'zone'];
function lit(v) {
  if (v === null) return 'null';
  if (typeof v === 'string') return `'${v}'`;
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return `[${v.map(lit).join(', ')}]`;
  const key = (k) => (/^[a-z_][a-z0-9_]*$/i.test(k) ? k : `'${k}'`);
  return `{ ${Object.entries(v).map(([k, x]) => `${key(k)}: ${lit(x)}`).join(', ')} }`;
}
function tileLine(tile) {
  const parts = KEY_ORDER.filter((k) => tile[k] !== undefined).map((k) => `${k}: ${lit(tile[k])}`);
  return `  { ${parts.join(', ')} },`;
}

// ---------------------------------------------------------------------------------------------

const layout = buildLayout(OLD, TILE_NEIGHBORS);
const lines = [];
const seenIds = new Set();
for (const zone of ['zone1', 'zone2', 'zone3', 'zone4']) {
  lines.push(SECTION_COMMENTS[zone]);
  for (const tile of OLD.filter((t) => t.zone === zone)) {
    const placed = layout.placements.get(tile.id);
    let unlock = tile.unlock;
    if (zone === 'zone3') unlock = { type: 'cost', cost: timberlineCost(tile) };
    if (zone === 'zone4') unlock = abyssalUnlock(tile);
    lines.push(tileLine({ ...tile, cells: clusterCells(placed.slot).map(toOffset), unlock }));
    seenIds.add(tile.id);
  }
  const blank = BLANKS[zone];
  layout.blankList.filter((b) => b.zone === zone).forEach((b, i) => {
    const id = `${blank.prefix}_blank_${String(i + 1).padStart(2, '0')}`;
    if (seenIds.has(id)) throw new Error(`duplicate id ${id}`);
    seenIds.add(id);
    lines.push(tileLine({
      id, name: blank.name, cells: [toOffset(b.hex)], family: null, kind: 'blank', produces: null, rate: null,
      boosts: null, unlock: { type: 'cost', cost: { ...blank.cost } }, zone,
    }));
  });
}

const path = new URL('../js/tiles.js', import.meta.url);
const source = readFileSync(path, 'utf8');
const start = source.indexOf('export const TILES = [');
const end = source.indexOf('\n];\n', start) + 4;
if (start < 0 || end < 4) throw new Error('could not find the TILES array in js/tiles.js');
writeFileSync(path, `${source.slice(0, start)}export const TILES = [\n${lines.join('\n')}\n];\n${source.slice(end)}`);
console.log(`wrote ${lines.filter((l) => l.startsWith('  {')).length} tiles`);
````
- [ ] **Step 3: Run the codemod**

Run: `node tools/build-map-v2.mjs`
Expected output: `wrote 321 tiles`. `js/tiles.js` is now about 370 lines: an import line, the `TILES` array (each zone preceded by a comment block), and the unchanged index code. It is deterministic: running the pipeline again from Task 2's state gives byte-identical output, so a different tile count or a thrown error (`bridge hex collision`, `no corridor found`, `driftwood_start is not on the centre slot`) means an earlier task diverged.

- [ ] **Step 4: Bioluminescence within two hexes**

Apply this diff to `js/state.js` (`isLit` reads `TILE_NEARBY`, and its comment explains why):

````diff
diff --git a/js/state.js b/js/state.js
index b32309f..cda721c 100644
--- a/js/state.js
+++ b/js/state.js
@@ -1,4 +1,4 @@
-import { TILES, TILE_BY_ID, TILE_NEIGHBORS } from './tiles.js';
+import { TILES, TILE_BY_ID, TILE_NEARBY, TILE_NEIGHBORS } from './tiles.js';
 import { ZONES } from './zones.js';
 import { PALETTES } from './palettes.js';
 
@@ -79,13 +79,14 @@ export function levelMultiplier(level) {
 }
 
 // The Abyssal Trench's mechanic (zone 4): one of its producers runs at half rate until one of its
-// boosters is unlocked hex-adjacent to it (any of the six archetypes, not one dedicated tile — with
-// only one of each scattered across 36 tiles, a single light source would leave most of the zone
-// permanently dim). Every other tile (all of zones 1-3, and the trench's own boosters) is always "lit".
+// boosters is unlocked next to it -- within two hexes, i.e. touching or one bridge tile apart, which
+// is as close as two clusters ever get (any of the six archetypes, not one dedicated tile: with only
+// one of each in the zone, a single light source would leave most of it permanently dim). Every
+// other tile (all of zones 1-3, and the trench's own boosters) is always "lit".
 const DARKNESS_PENALTY = 0.5;
 export function isLit(tile, unlockedIds) {
   if (tile.zone !== 'zone4' || tile.kind !== 'producer') return true;
-  return (TILE_NEIGHBORS.get(tile.id) || []).some((id) => {
+  return (TILE_NEARBY.get(tile.id) || []).some((id) => {
     if (!isUnlocked(unlockedIds, id)) return false;
     const neighbor = TILE_BY_ID.get(id);
     return neighbor?.zone === 'zone4' && neighbor.kind === 'booster';
````
- [ ] **Step 5: Run the suite**

Run: `npm test 2>&1 | grep -c passed`
Expected: `33`, exit 0. Quick facts to spot-check: `node -e "import('./js/tiles.js').then(({TILES,TILE_NEIGHBORS})=>console.log(TILES.length, TILE_NEIGHBORS.get('driftwood_start').length))"` prints `321 6`.

- [ ] **Step 6: Delete the codemod**

Run: `rm -r tools` (it cannot be re-run: its input shape no longer exists). `git status` must not list `tools/`.

- [ ] **Step 7: Checkpoint.** The game now runs on the new map. Open it (see Task 7's verification) before moving on.

---
## Task 7: Version 2.0.0, docs and final verification

**Files:**
- Modify: `js/version.js`, `memory-bank/architecture-notes.md`, `memory-bank/project-overview.md`, `memory-bank/tile-design.md`

- [ ] **Step 1: Bump the version** (the user asked for 2.0: MAJOR)

Set `js/version.js` to:

````js
// Shown in the menu. Bump on every gameplay, content, or visual change (see CLAUDE.md).
export const VERSION = '2.0.0';
````
- [ ] **Step 2: Update the memory-bank docs**

Apply this diff. It rewrites the module bullets for `zones.js`, `tiles.js` (+ the new `hex.js`), `scene.js`, the two renamed props modules, `clouds.js`, `render.js`, `main.js` and `effects.js`; replaces "Zones and the camera" and the data-flow line; rewrites the concept/decision bullets in `project-overview.md`; and adds a "v2 map" section to `tile-design.md` that also says how the older per-zone sections below it map onto the swapped zone numbers.

````diff
diff --git a/memory-bank/architecture-notes.md b/memory-bank/architecture-notes.md
index 374189f..e3394e8 100644
--- a/memory-bank/architecture-notes.md
+++ b/memory-bank/architecture-notes.md
@@ -2,28 +2,29 @@
 
 ## Modules
 
-- **`js/zones.js`** — `ZONES`, the zone list (`id`, `name`, `colStart`/`colEnd`, `raftColor`). Only `raftColor` is read at runtime (by `scene.js`); the rest is documentation — zone 4's `colStart`/`colEnd` (0/5) reflect its true column range, but what actually distinguishes it (rows -6..-1) has no field here since nothing reads one. Adding a zone that extends the eastward chain = a new entry here plus tiles at the next 6 columns; a zone that branches off an existing zone instead (like zone 4 off zone 1) also needs its sail edge added explicitly in `scene.js` (see the clouds.js entry below).
-- **`js/tiles.js`** — the 144 tile definitions (`TILES`, 36 per zone, each with a `zone` field; zone 4's non-booster tiles also carry a `consumes` map, see below), plus a `neighborGridPositions()` helper that derives the exported `TILE_NEIGHBORS` adjacency map from those positions at module load. No imports.
+- **`js/zones.js`** — `ZONES`, the zone list (`id`, `name`, `raftColor`). Order is zone 1 Home Waters, zone 2 Frozen Reach, zone 3 Timberline Coast, zone 4 Abyssal Trench (the v2 map swapped the last two). `raftColor` is the biome's tint: `scene.js` paints every raft of that zone with it (blank bridges a little paler), so the four biomes read apart at a glance. The stage outlines in `clouds.js` assume zones open in this array order.
+- **`js/tiles.js`** — the 321 tile definitions (`TILES`: 144 producer/booster/generator *clusters*, 36 per zone, plus 177 one-hex `kind: 'blank'` bridges). Every tile has `cells`, an array of `{row, col}` hexes (3 mutually-adjacent hexes for a cluster, 1 for a blank), in the odd-row offset grid, negative rows and columns allowed; zone 3's generators also carry a `consumes` map. `buildTileIndex(tiles)` derives `byId`, `idByCell`, `neighbors` (tiles touching one of this tile's cells) and `nearby` (within two hexes) from those cells; the exports `TILE_BY_ID`, `TILE_BY_CELL`, `TILE_NEIGHBORS` and `TILE_NEARBY` are that index over the real map. Imports only `hex.js`.
+- **`js/hex.js`** — pure odd-row-offset hex helpers: `cellKey`, `neighborCells`, `hexDistance`, `cellsWithin`. Rows can be negative, so oddness is tested with `!== 0` / `& 1`, never `=== 1`. No imports.
 - **`js/state.js`** — pure economy math (`effectiveRate`, `isDiscovered`, `isEligible`, `tick`, `unlockTile`, `getLevel`, `levelUpCost`, `levelUpTile`, ...) plus achievements (`ACHIEVEMENTS`, `checkAchievements`), prestige (`doPrestige`, prestige upgrades), offline progress (`applyOfflineProgress`), `rateBreakdown`/`boosterGain` (where income comes from, for the HUD and tile panel), `unlockEta`/`lockedTileStatuses`/`nextUnlock` (how far each visible locked tile is from unlockable and how long that takes at current rates), `unlockIntensity`/`levelUpIntensity` (how hard an unlock or level-up lands, 0 to 1), `boosterIsIdle` (a booster with nothing yet to boost), `upgradeList`/`costProgressFraction` (every unlocked tile still below max level with its next cost, ordered affordable-first then closest-first, for the quick-upgrade panel), the Harbor Shop (`shopCatalog`, `buyShopItem`: offline cap and rate, palettes, unlimited ballast; state lives in `state.shop`, is bought with gold, and survives prestige), the prestige `headStart` upgrade (`buyHeadStart`; each level starts a run with two free tiles, skipping boosters that would boost nothing — with zone 4 this can now legitimately reach into zone 4 too, not just deeper into zone 1) and `prestige.count`, tiered achievements (39 in all, about 137 gold) that feed the shop, `advance` (the one rule for any gap between frames: under a minute is ordinary production, a minute or more is time away at the offline rate), save export/import as one base64 string (`encodeSave`, `decodeSave`, sharing `normalizeSave` with `loadState`), and the only two functions that touch `localStorage` (`saveState`, `loadState`). Almost none of the economy math is zone-aware: it filters `TILES` generically, so 144 tiles needed no changes there — the exceptions are `isLit` (zone 3's bioluminescence: a zone-3 producer with no zone-3 booster hex-adjacent to it via `TILE_NEIGHBORS` runs at half rate), folded into `effectiveTileRate`/`effectiveRate`/`rateBreakdown` as one more multiplier so every caller (HUD, ETA, offline progress) picks it up automatically, and `applyGenerators` (zone 4: a `kind: 'generator'` tile consumes existing resources to make one of `GOODS` — planks/kelp_rope/bread — instead of producing from nothing; every unlocked generator drawing on a scarce input is throttled by the same proportional factor each tick, computed in `generatorScarcityFactors`, so the pool never goes negative; `generatorRate`/`generatorFullRate` expose the same math read-only for the tile panel; `applyGenerators`'s return value — how much of each output it actually produced — folds into `applyOfflineProgress`'s gains summary the same way base-resource gains do). `GOODS` is folded into `RESOURCES` (not kept separate), so planks/kelp_rope/bread get a prestige upgrade row, baron/magnate achievements, and count toward prestige tokens earned, exactly like the base 4 — `isEligible`/`unlockTile`/`levelUpCost` already being generic over whatever keys are in `state.resources` meant no changes were needed there even before this, for goods-denominated unlock costs and generator level-ups. `rateBreakdown`'s generator branch reflects the *actual throttled* current rate (via `generatorThrottle`/`generatorScarcityFactors`, computed once per call and reused per tile) so the HUD's "+X/s" line for a zone-4 resource matches reality instead of overstating unfed capacity; `boosterIsIdle` was decoupled from `rateBreakdown` entirely (existence of a producer/generator, not its current rate) specifically because a freshly-unlocked, fully-throttled-to-zero generator still meaningfully exists for a booster to boost. `resourceLabel`/`resourceTitle` turn `kelp_rope` into `kelp rope`/`Kelp Rope` for achievement names/descriptions and other display text — a no-op for every underscore-free resource. The pure functions are exercised directly by `tests/economy.test.mjs` in Node — they don't touch the DOM, which is what makes that possible.
-- **`js/scene.js`** — all hex-grid math and Three.js scene *construction*, run once at startup: camera, lights, the water, the foam rings, all 144 tiles' `raftMesh`/`markerMesh`/`propGroup` triples (raft color comes from the tile's zone), the per-zone `cameraPositions` map, and the cloud field (built by `clouds.js`). Exports `buildScene(canvas)`; everything else is module-private. Nothing here runs per-frame. `addProp` builds zone-1 props with its own archetype builders and hands zone-2/3/4 tiles to `zone2-props.js`/`zone3-props.js`/`zone4-props.js`. `LARGE_BOOSTER_IDS`/`BOOSTER_PROP_SCALE` give 5 of each zone's 6 boosters (every archetype except one non-flagship role) an extra 1.5× scale so they read as more substantial structures; `BADGE_ANCHOR_HEIGHT` has a `zone3:*`/`zone4:*` entry per archetype/family, measured the same way zone 2's were, since the redesigned props aren't the same height as zone 1's. `hexLocalPosition`'s odd-row offset check was `row % 2 === 1`, which silently breaks for negative rows (JS's `%` keeps the dividend's sign, so `-1 % 2` is `-1`) — zone 4 sits at rows -6..-1, so this is now `row % 2 !== 0`. Cloud sail edges (`sailEdges`, passed to `buildCloudField`) are built from consecutive `ZONES` pairs plus an explicit zone1↔zone4 edge, since zone 4 borders zone 1 directly rather than the previous zone in array order.
+- **`js/scene.js`** — hex-to-world math and Three.js scene *construction*, run once at startup: lights, the water, the cell-count foam mesh, and per tile a `raftMesh` group (one raft hex per cell, at the tile's centre), a `markerMesh` group (one invisible hit hex + outline per cell, for locked tiles) and lazily built prop groups. Exports `buildScene(canvas)` plus the camera constants and `frameCamera`/`aimSun`. Geometry, trim geometry and marker geometry are built once and shared. `ensureProps(level)` (returned per tile) builds that tile's props at that level the first time it is shown: one instance of the archetype's prop on every cell, then `freezeStatic` composes the local matrices once, because the full scene would otherwise be tens of thousands of nodes recomposed every frame. Blanks have no props. `hexLocalPosition` tests `row % 2 !== 0` (negative rows). The camera looks at a ground point from a fixed direction; its half-height is the zoom, and the camera backs off in proportion so clipping and fog cover the same share of the view at any zoom. `LARGE_BOOSTER_IDS`/`BOOSTER_PROP_SCALE` and `BADGE_ANCHOR_HEIGHT` (`zone2:*`, `zone3:*` for Timberline, `zone4:*` for the Abyssal Trench) are unchanged in spirit.
 - **`js/zone2-props.js`** — `buildZone2Prop(propGroup, tile, level)`: the ice/frost-themed geometry for all 10 zone-2 archetypes (4 producer families + 6 boosters) at levels 1–3. It deliberately duplicates a couple of small helpers (`addOutline`, `cylinderBetween`) from `scene.js` rather than sharing a helper module.
-- **`js/zone3-props.js`** — `buildZone3Prop(propGroup, tile, level)`: the bioluminescent-deep-sea geometry for all 10 zone-3 archetypes (Anglerfish, Tube Worm Colony, Bone Reef, Vent Garden, and 6 re-themed boosters — Anglerfish Lure is the re-skinned lighthouse role and the mechanic's flagship, the only one with a real `THREE.PointLight`). A zone-3 producer's materials are built once in their normal ("lit") appearance; every one that should visibly darken is registered via `track()` onto `propGroup.userData.darken` (each entry remembers both its lit and dim color/emissiveIntensity), so `render.js`'s per-frame pass can flip a tile between dim and lit — as the player unlocks or (on prestige/restart) loses a nearby booster — as a color/emissive swap, never a rebuild. Boosters don't dim and so need no such bookkeeping.
-- **`js/zone4-props.js`** — `buildZone4Prop(propGroup, tile)`: the "Timberline Coast" geometry for the 3 generator archetypes (Sawmill/planks, Ropeworks/kelp_rope, Bakehouse/bread, dispatched by `tile.family`) and 6 booster archetypes (dispatched by `tile.id`, Millhouse the all-three flagship). No dim/lit mechanic here unlike zone 3, so no `track()`/runtime material swap — geometry is built once in its final look. `level` is accepted for signature consistency with `buildZone2Prop`/`buildZone3Prop` but unused; the shared per-level scale-up and badge in `addProp` already carry that feedback.
+- **`js/abyssal-props.js`** — `buildAbyssalProp(propGroup, tile, level)`: the bioluminescent-deep-sea geometry for all 10 Abyssal Trench (zone 4) archetypes (Anglerfish, Tube Worm Colony, Bone Reef, Vent Garden, and 6 re-themed boosters — Anglerfish Lure is the re-skinned lighthouse role and the mechanic's flagship, the only one with a real `THREE.PointLight`). An Abyssal producer's materials are built once in their normal ("lit") appearance; every one that should visibly darken is registered via `track()` onto `propGroup.userData.darken` (each entry remembers both its lit and dim color/emissiveIntensity), so `render.js`'s per-frame pass can flip a tile between dim and lit — as the player unlocks or (on prestige/restart) loses a nearby booster — as a color/emissive swap, never a rebuild. Boosters don't dim and so need no such bookkeeping.
+- **`js/timberline-props.js`** — `buildTimberlineProp(propGroup, tile)`: the "Timberline Coast" geometry for the 3 generator archetypes (Sawmill/planks, Ropeworks/kelp_rope, Bakehouse/bread, dispatched by `tile.family`) and 6 booster archetypes (dispatched by `tile.id`, Millhouse the all-three flagship). No dim/lit mechanic here unlike the Abyssal Trench, so no `track()`/runtime material swap — geometry is built once in its final look. `level` is accepted for signature consistency with `buildZone2Prop`/`buildAbyssalProp` but unused; the shared per-level scale-up and badge in `addProp` already carry that feedback.
 - **`js/textures.js`** — procedural textures generated at startup from a little periodic noise (no image files): the water normal map and the hex foam-ring texture. Its noise helpers (`fbm`, `normalFromHeight`) are the intended base for any further generated textures. Other texture ideas (planked decks, prop detail, frost, environment lighting) were prototyped but not adopted.
-- **`js/clouds.js`** — the cloud field: puffs that fill everything outside the land, leaving an even 2-unit strip of open sea around every *open* zone (a zone is open once any of its tiles is unlocked; the first zone always is). `buildCloudField` builds it once from the zone list and tile positions; its "which ground points can ever be on screen" sampling now takes explicit `sailEdges` (pairs of zone framing targets a direct sail can cross) from `scene.js`, rather than assuming zones open in `ZONES` array order — needed once zone 4 bordered zone 1 directly instead of extending the chain, since the "next unlock" HUD shortcut can sail straight between any two discovered zones. The separate "stage contour" ring precompute still assumes array order for puff *placement* (not for what's actually revealed, which is driven by each puff's own `clearedBy` check against real unlocked-zone membership) — a known, accepted gap in ring density if zone 4 is unlocked before zone 3. `updateCloudField` dissolves the puffs a zone's land would overlap when it opens and restores them when a reset closes it again; `renderCloudField` draws the puffs into an offscreen layer and blends it at a uniform 40% — drawn straight into the scene, the overlapping puffs would stack into a solid blanket. Purely visual: it gates nothing. `preview-cloud-ring.html` is a standalone sandbox of the same design, kept for tuning it or trying more zones.
+- **`js/clouds.js`** — the cloud field: puffs that fill everything outside the land, leaving an even 2-unit strip of open sea around every *open* zone (a zone is open once any of its tiles is unlocked; the first zone always is). `buildCloudField` builds it once from the zone list and the position of every hex cell (`zoneTiles` has one entry per cell), plus `viewTargets`: ground points spread across the whole map, because the camera can now be panned anywhere. The stage outlines (first zone only, first two, ...) assume zones open in `ZONES` order; a zone opened out of order still clears exactly its own land (each puff's `clearedBy` is checked against real unlocked-zone membership), it just leaves the intermediate outline less tidy. About 2,700 puffs at the current map size. `updateCloudField` dissolves the puffs a zone's land would overlap when it opens and restores them when a reset closes it again; `renderCloudField` draws the puffs into an offscreen layer and blends it at a uniform opacity.
 - **`js/palettes.js`** — colours for the shop's looks (water, background/fog, cloud tint), with `DEFAULT_PALETTE` as the source of the original colours so scene.js never duplicates them. render.js applies the chosen one whenever `state.shop.palette` changes, which also covers loading, importing and restarting.
 - **`js/version.js`** — the one place the game's version lives (`VERSION`, shown at the bottom of the menu by `ui.js`). Bumped by hand on every change to the game; the rule is in `CLAUDE.md`.
 - **`js/format.js`** — `formatCount` (whole numbers under 10,000, then `12.3K`/`1.23M`/`B`/`T`) and `formatEta` (`4m 12s`; rounds up so a wait never reads `0s`). Pure, so tested in Node.
 - **`js/settings.js`** — player preferences (`loadSettings`/`saveSettings`, currently just `boardTint`), stored under their own localStorage key so restarting or importing a save never changes them.
-- **`js/effects.js`** — the short-lived scene effects for an unlock or level-up: the raft rising out of the water with a constant-volume squash and stretch, the props popping on a level-up, ripple rings and sparkles. Timing comes from render.js's visual clock, so effects freeze with the scene.
-- **`js/render.js`** — the per-frame update loop and `screenToGrid` hit-testing (via `THREE.Raycaster` against the meshes `scene.js` built). Also owns camera framing: `sailToZone(zoneId)` runs a 1200ms eased tween between the per-zone framings, `getCurrentZone()` reports which zone is framed, and `resetCamera()` snaps back to zone 1 instantly (called on restart/prestige, since a reset would otherwise leave the camera on an empty zone 2/3). `updateScene` also runs zone 3's darkness pass (see `zone3-props.js`) for every visible zone-3 producer, each frame. It keeps its own visual clock, which stops for a moment when an unlock lands (the frame hold: water, clouds, foam and effects freeze while the economy and HUD carry on), applies the camera kick on top of whatever framing is current, advances the water's time uniform, places one foam-ring instance per unlocked raft, colours the outline of each visible locked tile when board tint is on (gold when affordable, blue while waiting), and updates and draws the cloud field. `playUnlockImpact`/`playLevelUpImpact` start the hold, the kick and the effect; `projectTile` gives the screen position of a tile for the labels drawn over the board. Exports `initScene`, `updateScene`, `screenToGrid`, `sailToZone`, `getCurrentZone`, `resetCamera`, `playUnlockImpact`, `playLevelUpImpact`, `projectTile`. Both this module and `scene.js` are browser-only — verified visually, not by the Node test suite (see the original spec's §11 for why that split exists; the same reasoning applies to the Three.js version).
+- **`js/effects.js`** — the short-lived scene effects for an unlock or level-up: the raft rising out of the water with a constant-volume squash and stretch, the props popping on a level-up, ripple rings and sparkles. Timing comes from render.js's visual clock, so effects freeze with the scene. A tile's raft group sits at the tile's centre, so a cluster rises, rings and sparkles as one unit; a level-up pops the (lazily built) props group for the new level.
+- **`js/render.js`** — the per-frame update loop, hit-testing and the camera. `pickTile(x, y, w, h)` raycasts the visible raft/marker cell meshes and returns the tile. Camera state is a target point and a zoom: `panByPixels`, `zoomBy`, `flyToTile` (a 900 ms eased glide) and `resetCamera` (back to the start tile at the default zoom, called on restart/prestige/import). Each frame `applyView` places the camera, scales the fog and moves the sun and its shadow frustum over the target. The Abyssal Trench's darkness pass runs for every visible trench producer (see `abyssal-props.js`), reading the props group `ensureProps(level)` returns. It keeps its own visual clock, which stops for a moment when an unlock lands (the frame hold), applies the camera kick on top of the current view, advances the water's time uniform, places one foam-ring instance per cell of each unlocked tile, colours the outline of each visible locked tile when board tint is on, and updates and draws the cloud field. `playUnlockImpact`/`playLevelUpImpact` start the hold, the kick and the effect; `projectTile` gives the screen position of a tile (its centre) for the labels drawn over the board. Both this module and `scene.js` are browser-only — verified visually, not by the Node test suite.
 - **`js/ui.js`** — the only module that touches the DOM elements from `index.html`: resource bar (all 7 `RESOURCES` including zone 4's planks/kelp_rope/bread, shown from the start like the base 4 — an earlier separate `#goods-bar` strip was removed once goods joined `RESOURCES` proper; `#resource-bar` and `#next-unlock` now sit inside a `#hud-top` wrapper — see `style.css`'s comment there for why `left`+`right` box geometry, not `left:50%`+`transform`, is what actually guarantees the bar can never slide under the upgrades/prestige/menu button cluster as the window narrows and the bar wraps to more rows) and tile panel, the menu modal (restart, achievements), the prestige overlay and store, the Harbor Shop view in the menu (rows come from `shopCatalog`, so the screen has no rules of its own), the head-start row in the prestige store, the welcome-back modal (time away, stating the offline cap and rate when it applied, the gains, then a "Next: ..." line and a button that collects and opens that tile), and the resource/token popups. The resource bar shows each count gliding to its new value (green/red flash on a purchase or import, `K`/`M`/`B` suffixes) with a per-second rate and booster multiplier under it and a hover breakdown; under it sits the "Next: ... in 4m 12s" line (clicking it opens that tile, sailing to its zone if needed); over the board, when the board-tint setting is on, each visible locked tile gets a tick or a percentage label. Two one-line hints are derived from the state on screen rather than saved: the timer line says what to click until the first unlock ever (remembered by the `first-steps` achievement, so it survives prestige), and a booster whose resources have no producer yet says what it will boost. The menu has a Settings view (board tint) beside Save data. The quick-upgrade panel (`initUpgrades`/`updateUpgrades`, opened by the arrow button left of the star, whose badge counts affordable upgrades) renders `upgradeList` rows with a Level up button that calls the same `handleLevelUpClick` as the tile panel; it rebuilds its list only when the rows or their ready state change and updates the waiting rows' percentages in place, so a button is never replaced between mouse-down and mouse-up.
 - **`js/sound.js`** — synthesised Web Audio sounds (unlock, level-up, prestige, and intensity-scaled unlock/level-up chimes for the tile you just clicked: higher pitch, an extra note and a low thump as the intensity rises); every call degrades to a silent no-op if audio is unavailable.
-- **`js/main.js`** — the only module that imports all the others. Owns the `requestAnimationFrame` loop, canvas resize handling, click → hit-test → panel wiring, the Unlock and Level Up buttons' callbacks, the autosave triggers (on unlock, on level-up, on restart/prestige/prestige-upgrade/import, every ~10s, on `beforeunload`, and when the tab is hidden), and a one-time `navigator.storage.persist()` request. Production is driven by wall-clock time (`Date.now()`), not animation-frame time, so a hidden tab or a sleeping laptop is credited on return through `advance` instead of being lost.
+- **`js/main.js`** — the only module that imports all the others. Owns the `requestAnimationFrame` loop, canvas resize handling, click → `pickTile` → panel wiring, drag-to-pan / wheel-and-button zoom (a click that ends a drag is suppressed), the Unlock and Level Up buttons' callbacks, the autosave triggers (on unlock, on level-up, on restart/prestige/prestige-upgrade/import, every ~10s, on `beforeunload`, and when the tab is hidden), and a one-time `navigator.storage.persist()` request. Production is driven by wall-clock time (`Date.now()`), not animation-frame time, so a hidden tab or a sleeping laptop is credited on return through `advance` instead of being lost.
 
 ## Zones and the camera
 
-A click on a tile in the zone that isn't currently framed sails the camera there instead of opening the tile panel (`main.js`); there is no sail button. Fog of war is just the existing `isDiscovered` rule: a zone-2 tile becomes visible when a neighbor is unlocked, and the col 5/col 6 border makes that work with no zone-specific code. Clouds fill zone 2's place while it is sealed and clear off it (and reform at an even sea gap around the whole map) once its first tile is unlocked; they are purely visual and gate nothing. Per-zone camera framings live in `buildScene`'s `cameraPositions` (zone 1 hardcoded, later zones framed on their tile centroid).
+The map is one large hex field with four biomes (see `memory-bank/tile-design.md`). The camera is a target point plus a zoom: drag to pan, the wheel or the +/- buttons to zoom, clamped to the map; clicking any visible tile selects it wherever it is, and the "next unlock" shortcut glides the camera to its tile. Fog of war is the existing `isDiscovered` rule: a tile becomes visible when a neighbouring tile is unlocked, so a biome appears as the way in (its corridor of blank bridges) is bought. Clouds fill a zone's place while it is sealed and clear off it (and reform at an even sea gap around the open map) once its first tile is unlocked; they are purely visual and gate nothing.
 
 ## Data flow
 
@@ -34,7 +35,7 @@ state.js (tick/effectiveRate/isEligible/unlockTile — pure math over TILES + a
    ↓
 main.js's RAF loop: tick(state, dt) → updateResourceBar(state) → updateScene(state, now)
    ↑
-ui.js (DOM) ←── click → screenToGrid (render.js) → find tile in TILES → showTilePanel(tile, state, ...)
+ui.js (DOM) ←── click → pickTile (render.js) → showTilePanel(tile, state, ...)
 ```
 
 `scene.js`, `render.js`, and `ui.js` are siblings — none of them import each other except `render.js` importing `buildScene` from `scene.js`. `main.js` is the only place that wires them together, which is why it's the file most later features will touch.
@@ -45,4 +46,4 @@ ui.js (DOM) ←── click → screenToGrid (render.js) → find tile in TILES
 
 ## Three.js dependency
 
-Three.js is loaded from `cdn.jsdelivr.net` via an ES module import map in `index.html`, pinned to `0.182.0` — no bundler, no local copy. This is a real runtime dependency the original zero-dependency design didn't have: if the CDN is unreachable, the game fails to load (no fallback is implemented — see the 2026-09-04 spec's Deployment section for why that's an accepted trade-off, not an oversight). The `three-best-practices` skill installed at `.claude/skills/three-best-practices/` documents the performance/memory-management rules this codebase follows (e.g. building all 144 tiles' meshes once at startup instead of per-frame).
+Three.js is loaded from `cdn.jsdelivr.net` via an ES module import map in `index.html`, pinned to `0.182.0` — no bundler, no local copy. This is a real runtime dependency the original zero-dependency design didn't have: if the CDN is unreachable, the game fails to load (no fallback is implemented — see the 2026-09-04 spec's Deployment section for why that's an accepted trade-off, not an oversight). The `three-best-practices` skill installed at `.claude/skills/three-best-practices/` documents the performance/memory-management rules this codebase follows (e.g. building the raft and marker meshes for every tile once at startup instead of per-frame, and building props lazily).
diff --git a/memory-bank/project-overview.md b/memory-bank/project-overview.md
index 43b4ae4..80a0aeb 100644
--- a/memory-bank/project-overview.md
+++ b/memory-bank/project-overview.md
@@ -2,19 +2,19 @@
 
 ## Concept
 
-An idle/incremental farming game on the open sea. Four zones of hexagonal raft tiles, each a fixed 6×6 grid (36 slots): Home Waters, the Frozen Reach, and the Abyssal Trench extend east of each other; the Timberline Coast sits north of Home Waters instead (144 tiles total), rendered in a 2.5D pseudo-isometric style. Four base resources (fish, kelp, driftwood, crops) plus three zone-4-only "goods" (planks, kelp_rope, bread); tiles either produce a resource over time, boost another tile family's output raft-wide, or (zone 4 only) consume existing resources to make a new one. All 144 tile identities and positions are fixed in `js/tiles.js` — there's no player choice of *what* to place, only *which already-defined slot* to unlock next.
+An idle/incremental farming game on the open sea. Four biomes of hexagonal raft tiles on one large map, rendered in a 2.5D pseudo-isometric style: Home Waters (zone 1) at the centre, the Frozen Reach (zone 2) to its north, the Timberline Coast (zone 3) to its west, and the Abyssal Trench (zone 4) east of the Frozen Reach, reachable only through it. Producers, boosters and generators are atomic 3-hex clusters; one-hex "blank" bridge tiles join the clusters and the biomes (321 tiles covering 609 hexes). Four base resources (fish, kelp, driftwood, crops) plus three Timberline "goods" (planks, kelp_rope, bread); tiles either produce a resource over time, boost another tile family's output raft-wide, consume existing resources to make a new one (Timberline generators), or just bridge (blanks). Every tile's identity, position and unlock requirement is fixed in `js/tiles.js` — there's no player choice of *what* to place, only *which already-defined tile* to unlock next.
 
 ## Status
 
-The original MVP (`docs/superpowers/specs/2026-09-02-drift-away-design.md`) has since grown: per-tile levels 1–3, achievements (gold rewards), prestige (tokens and production upgrades, available once every tile is maxed), capped offline progress, sound, a second zone (`docs/superpowers/specs/2026-09-16-drift-away-multi-level-expansion-design.md`), a third (`docs/superpowers/specs/2026-09-23-drift-away-zone3-design.md`, bioluminescence), and a fourth (`docs/superpowers/specs/2026-09-24-drift-away-zone4-design.md`, generators/goods). Three.js hex rendering with raft depth/props, click-to-unlock flow (cost- or milestone-gated, plus grid adjacency), localStorage persistence, deployed to GitHub Pages.
+The original MVP (`docs/superpowers/specs/2026-09-02-drift-away-design.md`) has since grown: per-tile levels 1–3, achievements (gold rewards), prestige (tokens and production upgrades, available once every tile is maxed), capped offline progress, sound, a second zone (`docs/superpowers/specs/2026-09-16-drift-away-multi-level-expansion-design.md`), a third (`docs/superpowers/specs/2026-09-23-drift-away-zone3-design.md`, bioluminescence), a fourth (`docs/superpowers/specs/2026-09-24-drift-away-zone4-design.md`, generators/goods) and, in v2.0, a full map rework (`docs/superpowers/specs/2026-09-24-drift-away-map-rework-v2-design.md`: biomes instead of 6×6 grids, 3-hex clusters, blank bridges, pan/zoom camera, and the last two zones swapped so the Abyssal Trench is the capstone). Three.js hex rendering with raft depth/props, click-to-unlock flow (cost- or milestone-gated, plus adjacency), localStorage persistence, deployed to GitHub Pages.
 
 ## Key decisions and why
 
 - **Offline progress is capped and discounted** — `applyOfflineProgress` grants 50% of the production rate for at most 8 hours away (ignored under a minute). The MVP was active-only; this replaced it.
-- **Fixed grid, not freeform placement** — every slot's tile identity and unlock requirement is predetermined; placement is cosmetic (the layout was deliberately shuffled so families aren't grouped) since boosters are raft-wide, not adjacency-based.
-- **Zones extend the grid rather than replacing it** — zone 2 sits at cols 6–11 and is discovered by ordinary adjacency across the col 5/col 6 border, its tiles cost ×90 (started at ×15, then ×6 after a simulated run showed zone 2 finishing in about 2 minutes) and produce ×4 what their zone-1 mirrors do; zone 3 sits at cols 12–17, discovered the same way at the col 11/col 12 border, and applies that same ×90/×4 ratio again on top of zone 2's own numbers (a first-pass choice, not yet simulated — see the zone-3 spec). Zone 4 breaks the eastward chain: it sits at rows -6..-1 (same cols 0-5 as zone 1), discovered off zone 1's row-0 edge directly, reachable in parallel with zone 2/3 rather than gated behind them — its own cost/rate scale with distance from zone 1 (a per-ring curve, not a flat per-zone multiplier; see the zone-4 spec). All of it resets on prestige like everything else. Fog of war is the existing `isDiscovered` rule plus a purely visual cloud field (`js/clouds.js`) covering everything outside the open zones, written generically over tile position — except its sail-path visibility sampling, which had to be taught zone 4's real border explicitly since it isn't the previous zone in `ZONES` array order. See `memory-bank/tile-design.md`.
-- **Zone 3 adds one real mechanic, not just a reskin** — bioluminescence: a zone-3 producer runs at half rate until a zone-3 booster is unlocked hex-adjacent to it (`isLit` in `js/state.js`, folded into `effectiveTileRate`/`effectiveRate`/`rateBreakdown` as one more multiplier, so the HUD/ETA/offline-progress paths need no separate handling). It's the first time in the game that *where* you unlock something, not just *that* you unlock it, changes the outcome.
-- **Zone 4 adds a second real mechanic: generators** — a `kind: 'generator'` tile (Sawmill/Ropeworks/Bakehouse) consumes existing resources to make a new one (planks/kelp_rope/bread) instead of producing from nothing. `applyGenerators` in `js/state.js` throttles every generator drawing on a scarce input by the same proportional factor each tick, so the shared pool never goes negative. The three new resources were briefly a separate layer outside `RESOURCES` (no HUD slot, no prestige row, no achievements) before being folded into `RESOURCES` proper on request, so they now follow exactly the same rules as the base 4 everywhere: main HUD bar with a rate line and hover breakdown, a prestige upgrade row, baron/magnate lifetime achievements, and counting toward prestige tokens earned.
+- **Fixed map, not freeform placement** — every tile's identity, position and unlock requirement is predetermined; placement is cosmetic (families aren't grouped) since boosters are raft-wide, not adjacency-based. The one exception is the Abyssal Trench's bioluminescence, where being within two hexes of a booster matters.
+- **Biomes on a compass, joined by blank bridges** — a biome is a hand-placed blob of 36 clusters; neighbouring clusters are never adjacent but two hexes apart, and one blank hex between them is what makes a cluster discoverable. Zone 2 sits north of zone 1, zone 3 west, and zone 4 east of zone 2 (so it is reachable only through the Frozen Reach). A future biome picks a direction the same way. Each biome is entered along a corridor of 4–5 blanks. Blanks are flat-priced per zone: driftwood in Home Waters, a mix of zone-1 resources in Frozen Reach and Timberline (the toll for leaving home), planks + kelp_rope in the Abyssal Trench. Frozen Reach tiles cost ×90 and produce ×4 their zone-1 mirrors (`frozen_<id>`); Abyssal producers mirror zone 2 the same way and also need planks and kelp_rope; Timberline has its own curve, priced in base resources only. Fog of war is the existing `isDiscovered` rule plus a purely visual cloud field (`js/clouds.js`). All of it resets on prestige. See `memory-bank/tile-design.md`.
+- **The Abyssal Trench (zone 4) adds one real mechanic, not just a reskin** — bioluminescence: one of its producers runs at half rate until one of its boosters is unlocked within two hexes (`isLit` in `js/state.js`, folded into `effectiveTileRate`/`effectiveRate`/`rateBreakdown` as one more multiplier, so the HUD/ETA/offline-progress paths need no separate handling). It's the first time in the game that *where* you unlock something, not just *that* you unlock it, changes the outcome.
+- **The Timberline Coast (zone 3) adds a second real mechanic: generators** — a `kind: 'generator'` tile (Sawmill/Ropeworks/Bakehouse) consumes existing resources to make a new one (planks/kelp_rope/bread) instead of producing from nothing. `applyGenerators` in `js/state.js` throttles every generator drawing on a scarce input by the same proportional factor each tick, so the shared pool never goes negative. The three new resources were briefly a separate layer outside `RESOURCES` (no HUD slot, no prestige row, no achievements) before being folded into `RESOURCES` proper on request, so they now follow exactly the same rules as the base 4 everywhere: main HUD bar with a rate line and hover breakdown, a prestige upgrade row, baron/magnate lifetime achievements, and counting toward prestige tokens earned.
 - **Hexagons over the original octagon idea** — hexagons tile the plane edge-to-edge with no infill shapes needed, which is why the design changed mid-brainstorm from octagons to hexagons.
 - **ES modules + a one-line `package.json`** — lets the exact same `import`/`export` syntax run in the browser (`<script type="module">`) and in Node (for `tests/economy.test.mjs`), with zero bundler. Trade-off: local dev needs a static file server instead of double-clicking `index.html`, because browsers block ES module loads over `file://`. Production (GitHub Pages) always serves over `https://`, so this only affects local dev ergonomics.
 - **Public repo, GitHub Pages deploy to `driftaway.jakechurchill.com`** — see `docs/superpowers/specs/2026-09-02-drift-away-design.md` §12 for the deploy mechanics (Pages source = `main` branch root, `CNAME` file, DNS is external/manual).
diff --git a/memory-bank/tile-design.md b/memory-bank/tile-design.md
index 73b3de5..36039e9 100644
--- a/memory-bank/tile-design.md
+++ b/memory-bank/tile-design.md
@@ -1,6 +1,17 @@
 # Tile Design
 
-All 144 tiles are defined in `js/tiles.js`: 36 per zone, each zone a 6×6 hex grid. Zone 1 ("Home Waters") is cols 0–5; zone 2 ("Frozen Reach") is cols 6–11; zone 3 ("Abyssal Trench") is cols 12–17 — all three side by side. Zone 4 ("Timberline Coast") breaks that eastward chain: it's rows -6..-1 at the *same* cols 0–5 as zone 1, sitting north of it instead. Every tile has a `zone` field (`zone1`/`zone2`/`zone3`/`zone4`); zone metadata (name, raft color) lives in `js/zones.js`. Within a zone, families are scattered rather than grouped (the layout was shuffled after the first version). This is a first-pass balance — not playtested — expect to retune specific numbers after actually playing it.
+**v2.0 map (current).** Everything below the "v2 map" section still describes the tiles' families, rates, costs and mechanics, but its positions ("cols 0–5", "`gridPos`", "+6 columns", "row 0 / row -1 border") are the v1 6×6 slots and no longer apply: `js/tiles.js` gives every tile a `cells` array instead, and the two last zones swapped numbers (**zone 3 is now the Timberline Coast, zone 4 the Abyssal Trench**; the old "Zone 3 rules" and "Zone 4 rules" sections below are the Abyssal Trench and the Timberline Coast respectively). Tile ids did not change.
+
+## v2 map
+
+- **321 tiles, 609 hexes.** 144 clusters (36 per zone: producers/boosters, or generators/boosters in Timberline), each 3 mutually-adjacent hexes, plus 177 one-hex blank bridges (41 Home Waters, 45 Frozen Reach, 45 Timberline, 46 Abyssal). A cluster is bought, levelled and shown as one unit. A blank produces nothing, is bought once, and counts as maxed from the moment it is unlocked (`getLevel`).
+- **Lattice.** Clusters sit on a spacing-3 lattice of slots; every cluster is the same "up" triangle (anchor, east neighbour, south-east neighbour). Neighbouring slots are exactly two hexes apart, so no two clusters ever touch, and exactly one hex touches both: the bridge. A cluster becomes discoverable when a bridge beside it is unlocked, and a bridge when a cluster beside it is.
+- **Biomes.** A biome is a seeded, compact-but-ragged blob of 36 slots. Blanks inside it are a shortest-path tree from its entry slot plus 6 loop edges. Centres in slot coordinates: Home Waters (0,0), Frozen Reach (4,-8) north, Timberline (-8,0) west, Abyssal Trench (12,-8) east of Frozen Reach. Corridors of blanks (4, 4 and 5) join Home Waters to Frozen Reach and Timberline, and Frozen Reach to the Abyssal Trench; each corridor's blanks belong to the zone being entered. The Abyssal Trench has no hex within two of Home Waters.
+- **Blank costs (flat per zone).** Home Waters `{driftwood: 12}`; Frozen Reach `{driftwood: 1200, crops: 800}`; Timberline `{driftwood: 1800, crops: 1200, kelp: 900}`; Abyssal `{planks: 60, kelp_rope: 40}`. Leaving Home Waters costs zone-1 resources; the trench costs Timberline's goods.
+- **Cluster costs.** Home Waters and Frozen Reach are unchanged (Frozen Reach is still ×90 cost / ×4 rate of its `frozen_<id>` mirror). Timberline clusters cost base resources only: rings 1–3 as before, rings 4–6 (once priced in planks/kelp_rope/bread) continue the curve (`rate × 960 / 2500 / 6500`, split 60/40 driftwood/second input; boosters 2240 / 8960 / 35840 driftwood). Abyssal cost-gated clusters keep their base costs and add `planks = total/1500`, `kelp_rope = 0.7 × planks` (2 significant digits); milestone-gated ones stay milestone-only. All first-pass, unsimulated.
+- **Bioluminescence.** "A booster next to it" means within two hexes (`TILE_NEARBY`): touching, or one bridge apart.
+- **Head start.** Grants N clusters (skipping idle boosters) plus whatever blanks are needed to reach them, free.
+- **Tests.** `tests/economy.test.mjs` pins the counts, the cluster shape (3 mutually-adjacent cells), that no cluster touches another, full reachability from the start, that the Abyssal Trench is unreachable without Frozen Reach, the per-zone blank costs and the changed cluster costs. `tests/hex.test.mjs` covers the hex helpers and `buildTileIndex`.
 
 There is exactly one starting tile, `driftwood_start` (unlock type `start`); every other tile's `unlock` field is a `cost` or `milestone` requirement as shown below. But meeting that requirement isn't sufficient by itself: a tile can only be unlocked once it's also adjacent (on the hex grid) to a tile that's already unlocked. That adjacency requirement is derived from `gridPos` in `js/tiles.js` (see `TILE_NEIGHBORS`) and isn't repeated per-row below — assume it applies to every non-start tile in these tables.
 
````
- [ ] **Step 3: Run the suite**

Run: `npm test 2>&1 | grep -c passed`
Expected: `33`, exit 0.

- [ ] **Step 4: Final verification in a browser.** See the next section; do not skip it, the renderer has no automated tests.

- [ ] **Step 5: Checkpoint.** Tell the user: v2.0.0 is implemented, nothing is committed or pushed, and the first-pass numbers below are unsimulated.

---

## Final verification (browser, after Task 7)

Use `npx serve -l 4325 .` (not 4173). Clear the page's `localStorage` between scenarios that need a fresh game.

1. **Fresh game.** One three-raft cluster (three driftwood props) ringed by six pale blank hexes with progress pills; the HUD shows only driftwood and gold; "Next: Driftwood Walkway" reads about 24 s. Unlock a walkway (12 driftwood): it rises out of the water and a cluster beside it appears with its own pills.
2. **Whole map.** Paste the console script below (wait ~10 s after the first load so a save exists). It unlocks every Home Waters tile and 30 Frozen Reach tiles, then zoom fully out: Home Waters is a ragged blob of clusters joined by paler walkways, ringed by cloud; a corridor of ice-blue blanks leaves its north-east edge toward Frozen Reach.

````js
const { TILES } = await import('/js/tiles.js');
const save = JSON.parse(localStorage.getItem('driftaway_save_v2'));
const z1 = TILES.filter((t) => t.zone === 'zone1');
const z2 = TILES.filter((t) => t.zone === 'zone2').slice(0, 30);
save.unlocked = [...z1, ...z2].map((t) => t.id);
save.levels = {};
z1.slice(0, 20).forEach((t) => { save.levels[t.id] = 2; });
z1.slice(20, 30).forEach((t) => { save.levels[t.id] = 3; });
for (const r of Object.keys(save.resources)) { save.resources[r] = 5e6; save.lifetime[r] = 5e6; }
save.lastSaved = Date.now();
localStorage.setItem('driftaway_save_v2', JSON.stringify(save));
Storage.prototype.setItem = function () {};
location.reload();
````
3. **The two swapped biomes.** Same trick with `zone3` and `zone4` clusters (`t.zone === 'zone3' || t.zone === 'zone4'`, `t.kind !== 'blank'`), then in the console `const R = await import('/js/render.js'); R.flyToTile('timberline_sawmill_1')` and, separately, `R.flyToTile('abyssal_fish_start')` (zoom out a little with the `-` button). Timberline: forest-green rafts with sawmills, ropeworks and bakehouses. Abyssal: violet rafts with the bioluminescent props, some visibly dim (no booster within two hexes) and some lit.
4. **Interaction.** Click a blank: panel shows its name, "Requires: ..." (e.g. `Ice Causeway` needs `1200 driftwood + 800 crops`), Unlock works; once unlocked the panel reads "A walkway between rafts...". Drag pans; a drag never selects a tile; wheel and buttons zoom.
5. **Old saves.** Menu -> Save data -> paste a code copied from the v1 game: "Load code" must refuse it. A browser that has a v1 save simply starts a fresh game; the old key is left in storage.
6. **Console:** no errors or warnings through all of the above.
7. **Frame cost, same machine, before vs. after.** With the same 60-ish tiles unlocked, compare per-frame cost of `updateScene` between the untouched game (`git stash`/another worktree, another port) and this build. In a foreground tab both are smooth; in a throttled pane compare the two numbers, not the absolute values. In the prototype this was: start-only 10 ms (before) vs 9.5 ms (after); 72 unlocked tiles 31.5 vs 32 ms; all 144 vs all 321 tiles 38 vs 45 ms, in an *unfocused* pane. A regression to worry about would be 2x or worse at equal unlocked-tile counts.

## Known limitations and follow-ups (deliberately not in this plan)

- **All numbers are first-pass and unsimulated**, like every earlier zone's: the blank costs (12 driftwood; 1200 driftwood + 800 crops; 1800 driftwood + 1200 crops + 900 kelp; 60 planks + 40 kelp_rope), Timberline's ring 4-6 curve, and the Abyssal planks/kelp_rope amounts. Expect to tune them after playing. In particular the Timberline blanks (thousands of resources) cost far more than Timberline's own cheap early generators, which is what the spec asked for ("blanks cost zone-1 resources, priced higher than Frozen Reach's") but is worth a look.
- **The old save is silently ignored.** There is no "your progress could not be carried over" notice. Adding one is small but was not asked for.
- **Cloud stage outlines assume zones open in `ZONES` order.** Opening Timberline before Frozen Reach (or the trench before Timberline) leaves an intermediate outline slightly less tidy; what is actually revealed is unaffected. (Same accepted limitation as before, noted in `clouds.js` and the architecture notes.)
- **No pinch-zoom** on touch screens (the +/- buttons work; one-finger drag pans).
- **About 2,700 cloud puffs** at this map size, up from ~470. If clouds ever dominate frame time, thin the far field in `buildCloudField`.
- **A three-raft cluster shows three copies of its prop.** That is the design (reuse of the existing art); if it feels busy, scale the prop or draw it on one raft only in `buildLevelProps`.
