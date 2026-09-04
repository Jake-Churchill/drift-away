# Drift Away Three.js Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Drift Away's Canvas 2D renderer with a Three.js/WebGL scene (real 3D geometry, lighting, cast shadows, animated water) and expand the tile grid from 5×5 (25 tiles) to 6×6 (36 tiles).

**Architecture:** `js/tiles.js` grows to 36 entries with the same schema. Rendering splits into two modules: `js/scene.js` builds the Three.js scene once (camera, lights, water plane, all 36 tile meshes — nothing is created or destroyed after startup), and `js/render.js` owns the per-frame update loop (water wave animation, tile visibility toggling, raycasting hit-testing) plus the same `screenToGrid` interface `main.js` already calls. `js/tiles.js`'s and `js/state.js`'s existing logic is untouched — this is a rendering-layer and content-volume change only.

**Tech Stack:** Three.js `0.182.0`, loaded via a CDN (`cdn.jsdelivr.net`) ES module import map in `index.html` — no bundler, no build step. Everything else stays vanilla HTML/CSS/JS.

**Spec:** `docs/superpowers/specs/2026-09-04-drift-away-threejs-rewrite-design.md` (supersedes sections 4, 6, and part of 7 of `docs/superpowers/specs/2026-09-02-drift-away-design.md`, which is otherwise still authoritative)

## Global Constraints

- Grid is exactly 6×6 (36 tiles), family counts fish=8/kelp=8/driftwood=7/crops=7/booster=6, exactly one `start`-unlocked tile per resource family (booster has none) — spec §2.
- Three.js version pinned to exactly `0.182.0` via CDN import map — this is the version already validated in a live prototype; do not "helpfully" bump it — spec §4.1.
- No `three/addons/` import needed — the water is hand-rolled displaced geometry, not the `Water`/`Water2` addon (that addon didn't render correctly at this pinned version during prototyping) — spec §4.1, §4.4.
- No player camera control (fixed orthographic camera only), no texture-mapped materials (flat-shaded low-poly only), no WebGL fallback — spec §1 non-goals.
- The water material color and the scene background color must be visibly distinct — during prototyping these were accidentally set to the same hex value and the water was invisible — spec §4.4.
- `js/state.js` and `js/ui.js` are not touched by this plan at all.
- **Git policy:** per the user's standing instruction, do not run `git commit` without checking with them first — batch confirmation across tasks is fine. Every commit message ends with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

## Task 1: Expand tile roster to 36 tiles (6×6 grid)

**Files:**
- Modify: `js/tiles.js` (full-file replace)
- Modify: `tests/economy.test.mjs:1-38` (the tile-data-integrity block only — lines 40-133, the economy-math tests, must be left exactly as they are)

**Interfaces:**
- Consumes: nothing new.
- Produces: `TILES` still exports the same 25-tile schema, now with 36 entries at grid positions `(row, col)` for row/col in `0..5`. Every later task (`js/scene.js`) imports `TILES` from this file unchanged in shape.

- [ ] **Step 1: Write the failing tile-data tests**

Replace `tests/economy.test.mjs` lines 1-38 (everything from the top of the file through `console.log('tile data tests passed');`) with:

```js
import assert from 'node:assert/strict';
import { TILES } from '../js/tiles.js';
import { createInitialState, effectiveRate, effectiveTileRate, isEligible, tick, unlockTile } from '../js/state.js';

// --- Tile data integrity ---

assert.equal(TILES.length, 36, 'expected exactly 36 tiles');

const ids = TILES.map((t) => t.id);
assert.equal(new Set(ids).size, 36, 'tile ids must be unique');

const positions = TILES.map((t) => `${t.gridPos.row},${t.gridPos.col}`);
assert.equal(new Set(positions).size, 36, 'grid positions must be unique');
for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 6; col++) {
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
  { fish: 8, kelp: 8, driftwood: 7, crops: 7, booster: 6 },
  'family counts must match the spec'
);

console.log('tile data tests passed');
```

(The rest of the file — everything from `// --- createInitialState ---` onward — is unchanged. This block only replaces the `import` lines and the tile-data assertions above them.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node tests/economy.test.mjs`
Expected: FAIL — `TILES.length` is still 25, not 36.

- [ ] **Step 3: Replace `js/tiles.js`**

```js
export const TILES = [
  // Fish family (base resource: fish)
  { id: 'fish_start', name: 'Fishing Raft', gridPos: { row: 3, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.0, boosts: null, unlock: { type: 'start' } },
  { id: 'fish_anchored_net', name: 'Anchored Net', gridPos: { row: 3, col: 5 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 30 } } },
  { id: 'fish_trawling_raft', name: 'Trawling Raft', gridPos: { row: 4, col: 0 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'cost', cost: { kelp: 60, driftwood: 40 } } },
  { id: 'fish_tide_pool_trap', name: 'Tide Pool Trap', gridPos: { row: 4, col: 1 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 200 } },
  { id: 'fish_deep_sea_longline', name: 'Deep-Sea Longline', gridPos: { row: 4, col: 2 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 150, crops: 100 } } },
  { id: 'fish_grand_fishery', name: 'Grand Fishery', gridPos: { row: 4, col: 3 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 2.0, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 1000 } },
  { id: 'fish_open_ocean_trawler', name: 'Open-Ocean Trawler', gridPos: { row: 4, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.8, boosts: null, unlock: { type: 'cost', cost: { driftwood: 250, crops: 200 } } },
  { id: 'fish_leviathan_net', name: 'Leviathan Net', gridPos: { row: 4, col: 5 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 2.5, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 2500 } },

  // Kelp family (base resource: kelp)
  { id: 'kelp_nursery', name: 'Kelp Nursery', gridPos: { row: 0, col: 0 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'cost', cost: { fish: 50, driftwood: 50 } } },
  { id: 'kelp_start', name: 'Kelp Farm', gridPos: { row: 0, col: 1 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.0, boosts: null, unlock: { type: 'start' } },
  { id: 'kelp_seaweed_raft', name: 'Seaweed Raft', gridPos: { row: 0, col: 2 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { fish: 30 } } },
  { id: 'kelp_floating_garden', name: 'Floating Garden', gridPos: { row: 0, col: 3 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 200 } },
  { id: 'kelp_deep_bed', name: 'Deep Kelp Bed', gridPos: { row: 0, col: 4 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { fish: 120, crops: 100 } } },
  { id: 'kelp_reef', name: 'Kelp Reef', gridPos: { row: 0, col: 5 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 2.0, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 1000 } },
  { id: 'kelp_open_water_farm', name: 'Open-Water Kelp Farm', gridPos: { row: 1, col: 0 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.8, boosts: null, unlock: { type: 'cost', cost: { fish: 220, crops: 180 } } },
  { id: 'kelp_abyssal_forest', name: 'Abyssal Kelp Forest', gridPos: { row: 1, col: 1 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 2.5, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 2500 } },

  // Driftwood family (base resource: driftwood)
  { id: 'driftwood_start', name: 'Driftwood Collector', gridPos: { row: 2, col: 3 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.5, boosts: null, unlock: { type: 'start' } },
  { id: 'driftwood_salvage_raft', name: 'Salvage Raft', gridPos: { row: 2, col: 4 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { fish: 40 } } },
  { id: 'driftwood_debris_net', name: 'Debris Net', gridPos: { row: 2, col: 5 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 100 } },
  { id: 'driftwood_current_sweeper', name: 'Current Sweeper', gridPos: { row: 3, col: 0 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.8, boosts: null, unlock: { type: 'cost', cost: { kelp: 80, crops: 60 } } },
  { id: 'driftwood_storm_wreckage', name: 'Storm Wreckage Raft', gridPos: { row: 3, col: 1 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1.0, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 500 } },
  { id: 'driftwood_flotsam_dredge', name: 'Flotsam Dredge', gridPos: { row: 3, col: 2 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { kelp: 150, crops: 120 } } },
  { id: 'driftwood_shipwreck_salvage', name: 'Shipwreck Salvage', gridPos: { row: 3, col: 3 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1.3, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 1200 } },

  // Crops family (base resource: crops)
  { id: 'crops_start', name: 'Planter Raft', gridPos: { row: 1, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.5, boosts: null, unlock: { type: 'start' } },
  { id: 'crops_soil_barge', name: 'Soil Barge', gridPos: { row: 1, col: 3 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { kelp: 40 } } },
  { id: 'crops_hanging_garden', name: 'Hanging Garden', gridPos: { row: 1, col: 4 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 100 } },
  { id: 'crops_terraced_planter', name: 'Terraced Planter', gridPos: { row: 1, col: 5 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.8, boosts: null, unlock: { type: 'cost', cost: { fish: 80, driftwood: 60 } } },
  { id: 'crops_floating_orchard', name: 'Floating Orchard', gridPos: { row: 2, col: 0 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1.0, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 500 } },
  { id: 'crops_paddy_raft', name: 'Paddy Raft', gridPos: { row: 2, col: 1 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { fish: 150, driftwood: 120 } } },
  { id: 'crops_vertical_farm', name: 'Vertical Farm', gridPos: { row: 2, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1.3, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 1200 } },

  // Booster family (no production of their own)
  { id: 'booster_drying_rack', name: 'Drying Rack', gridPos: { row: 5, col: 0 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'kelp', percent: 20 }, { resource: 'driftwood', percent: 20 }], unlock: { type: 'cost', cost: { kelp: 150, driftwood: 150 } } },
  { id: 'booster_smokehouse', name: 'Smokehouse', gridPos: { row: 5, col: 1 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 25 }], unlock: { type: 'cost', cost: { fish: 100, driftwood: 100 } } },
  { id: 'booster_windmill', name: 'Windmill', gridPos: { row: 5, col: 2 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 25 }], unlock: { type: 'milestone', resource: 'crops', target: 300 } },
  { id: 'booster_net_weavers', name: 'Net Weavers', gridPos: { row: 5, col: 3 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 20 }, { resource: 'kelp', percent: 20 }], unlock: { type: 'cost', cost: { fish: 200, kelp: 200 } } },
  { id: 'booster_composting_shed', name: 'Composting Shed', gridPos: { row: 5, col: 4 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 20 }, { resource: 'driftwood', percent: 20 }], unlock: { type: 'milestone', resource: 'driftwood', target: 800 } },
  { id: 'booster_lighthouse', name: 'Lighthouse', gridPos: { row: 5, col: 5 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 15 }, { resource: 'kelp', percent: 15 }, { resource: 'driftwood', percent: 15 }, { resource: 'crops', percent: 15 }], unlock: { type: 'milestone', resource: 'crops', target: 1500 } },
];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node tests/economy.test.mjs`
Expected: PASS, printing both `tile data tests passed` and `economy math tests passed` (the economy-math tests further down the file are untouched and exercise `fish_start`/`fish_anchored_net`/`booster_smokehouse`, all of which still exist).

- [ ] **Step 5: Commit**

```bash
git add js/tiles.js tests/economy.test.mjs
git commit -m "$(cat <<'EOF'
Expand tile roster to 36 tiles on a 6x6 grid

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Three.js scene construction (`js/scene.js`) + import map

**Files:**
- Create: `js/scene.js`
- Modify: `index.html` (add the import map)

**Interfaces:**
- Consumes: `TILES` from `js/tiles.js` (Task 1) — needs `id`, `gridPos`, `family`, `kind`.
- Produces (used by Task 3's `js/render.js`):
  - `export const GRID_ROWS` = `6`, `export const GRID_COLS` = `6`
  - `export function buildScene(canvas)` → `{ renderer, scene, camera, resize(width, height), waterMesh, waterBasePositions, tileObjects }`, where:
    - `renderer` is a `THREE.WebGLRenderer` already attached to `canvas`
    - `resize(width, height)` updates the camera frustum for the given CSS-pixel dimensions and calls `renderer.setSize(width, height, false)`
    - `waterMesh` is the `THREE.Mesh` for the water plane; `waterBasePositions` is a `Float32Array` snapshot of its un-displaced vertex positions (same length as `waterMesh.geometry.attributes.position.array`)
    - `tileObjects` is a `Map<string, { raftMesh: THREE.Mesh, markerMesh: THREE.Mesh }>` keyed by tile id — both objects exist in the scene for every tile from the start; only one is meant to be visible at a time (Task 3 controls that). `markerMesh` is a **filled, invisible** hex-shaped mesh (`opacity: 0`, `transparent: true`, `visible` toggled by Task 3) — its geometry covers the tile's whole hex area so raycasting hits anywhere inside the tile, not just near its visible outline. The actual visible dashed-outline-equivalent (a `LineLoop`) and buoy dot are children of `markerMesh`, rendered/hidden together with it. `markerMesh.userData.outlineMaterial` holds the outline's `LineBasicMaterial` so Task 3 can animate its pulse opacity directly. Both `raftMesh` and `markerMesh` carry `userData.tileId` set to the tile's `id` (and on `raftMesh`, its booster trim child also carries the same `userData.tileId`) so Task 3's raycasting can look up which tile was hit.

- [ ] **Step 1: Add the Three.js import map to `index.html`**

In `index.html`, add this `<script type="importmap">` block immediately before the existing `<script type="module" src="js/main.js"></script>` line:

```html
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.js"
    }
  }
  </script>
  <script type="module" src="js/main.js"></script>
```

- [ ] **Step 2: Create `js/scene.js`**

```js
import * as THREE from 'three';
import { TILES } from './tiles.js';

export const GRID_ROWS = 6;
export const GRID_COLS = 6;

const HEX_RADIUS = 1.6;
const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
const HEX_HEIGHT = 2 * HEX_RADIUS;
const ROW_SPACING = 0.75 * HEX_HEIGHT;
const WALL_HEIGHT = 0.35;

const WOOD_TOP = 0xc9975b;
const BOOSTER_TRIM = 0xe0b84b;
const MARKER_COLOR = 0xbcd8e8;
const CAMERA_FRUSTUM_HALF_SIZE = 12;

function gridBounds() {
  return {
    width: GRID_COLS * HEX_WIDTH + HEX_WIDTH / 2,
    depth: (GRID_ROWS - 1) * ROW_SPACING + HEX_HEIGHT,
  };
}

function hexLocalPosition(row, col) {
  const bounds = gridBounds();
  const x = col * HEX_WIDTH + (row % 2 === 1 ? HEX_WIDTH / 2 : 0) + HEX_WIDTH / 2 - bounds.width / 2;
  const z = row * ROW_SPACING + HEX_HEIGHT / 2 - bounds.depth / 2;
  return { x, z };
}

function hexShape(radius) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function hexOutlinePoints(radius) {
  const points = [];
  for (let i = 0; i <= 6; i++) {
    const angle = (Math.PI / 180) * (60 * (i % 6) - 90);
    points.push(new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle)));
  }
  return points;
}

function buildFishProp(group) {
  const material = new THREE.MeshStandardMaterial({ color: 0x5fa8d3, roughness: 0.4, metalness: 0.15 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 12), material);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.25;
  body.castShadow = true;
  group.add(body);
}

function buildKelpProp(group) {
  const material = new THREE.MeshStandardMaterial({ color: 0x4c9a6a, roughness: 0.7 });
  for (const offset of [-0.3, 0, 0.3]) {
    const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.6, 6), material);
    strand.position.set(offset, 0.3, 0);
    strand.castShadow = true;
    group.add(strand);
  }
}

function buildDriftwoodProp(group) {
  const material = new THREE.MeshStandardMaterial({ color: 0x5a3f22, roughness: 0.9 });
  const logA = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), material);
  logA.rotation.z = Math.PI / 2;
  logA.rotation.y = 0.2;
  logA.position.y = 0.1;
  logA.castShadow = true;
  const logB = logA.clone();
  logB.rotation.y = -0.3;
  logB.position.y = 0.18;
  logB.castShadow = true;
  group.add(logA, logB);
}

function buildCropsProp(group) {
  const material = new THREE.MeshStandardMaterial({ color: 0xd9b545, roughness: 0.6 });
  for (const offset of [-0.3, -0.1, 0.1, 0.3]) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), material);
    stalk.position.set(offset, 0.25, 0);
    stalk.castShadow = true;
    group.add(stalk);
  }
}

function buildBoosterProp(group, tileId) {
  const material = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.5, metalness: 0.2 });
  if (tileId === 'booster_windmill') {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), material);
    post.position.y = 0.35;
    post.castShadow = true;
    group.add(post);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.35, 4), material);
      blade.position.y = 0.7;
      blade.rotation.z = Math.PI / 2;
      blade.rotation.x = (Math.PI / 2) * i;
      blade.castShadow = true;
      group.add(blade);
    }
  } else {
    const pyramid = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 4), material);
    pyramid.position.y = 0.3;
    pyramid.castShadow = true;
    group.add(pyramid);
  }
}

function addProp(raftMesh, tile) {
  const propGroup = new THREE.Group();
  propGroup.position.y = WALL_HEIGHT;
  switch (tile.family) {
    case 'fish': buildFishProp(propGroup); break;
    case 'kelp': buildKelpProp(propGroup); break;
    case 'driftwood': buildDriftwoodProp(propGroup); break;
    case 'crops': buildCropsProp(propGroup); break;
    case 'booster': buildBoosterProp(propGroup, tile.id); break;
  }
  raftMesh.add(propGroup);
}

function buildRaftMesh(tile) {
  const raftGeometry = new THREE.ExtrudeGeometry(hexShape(HEX_RADIUS), {
    depth: WALL_HEIGHT,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  raftGeometry.rotateX(-Math.PI / 2);

  const raftMaterial = new THREE.MeshStandardMaterial({ color: WOOD_TOP, roughness: 0.85, metalness: 0.05 });
  const raftMesh = new THREE.Mesh(raftGeometry, raftMaterial);
  raftMesh.castShadow = true;
  raftMesh.receiveShadow = true;
  raftMesh.userData.tileId = tile.id;

  if (tile.kind === 'booster') {
    const trimGeometry = new THREE.TorusGeometry(HEX_RADIUS * 0.92, 0.03, 8, 24);
    const trimMaterial = new THREE.MeshStandardMaterial({ color: BOOSTER_TRIM, roughness: 0.4, metalness: 0.3 });
    const trim = new THREE.Mesh(trimGeometry, trimMaterial);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = WALL_HEIGHT + 0.01;
    trim.userData.tileId = tile.id;
    raftMesh.add(trim);
  }

  addProp(raftMesh, tile);
  return raftMesh;
}

function buildMarkerMesh(tile) {
  // Invisible filled hex, sized to cover the whole tile area — this is what
  // gets raycast-tested, so clicking anywhere inside a locked tile registers,
  // not just near its visible outline (a LineLoop alone would only be
  // hit-testable in a thin ring near the edge, per THREE.Raycaster's line
  // threshold — that would regress the original full-hex clickable area).
  const hitGeometry = new THREE.ShapeGeometry(hexShape(HEX_RADIUS));
  hitGeometry.rotateX(-Math.PI / 2);
  // DoubleSide: ShapeGeometry's face winding after rotateX isn't hand-verified here,
  // and a raycast against a FrontSide-only mesh silently misses back-facing triangles —
  // DoubleSide guarantees this invisible hit-plane always registers clicks regardless.
  const hitMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const markerMesh = new THREE.Mesh(hitGeometry, hitMaterial);
  markerMesh.position.y = 0.02;
  markerMesh.userData.tileId = tile.id;

  const outlineMaterial = new THREE.LineBasicMaterial({ color: MARKER_COLOR, transparent: true, opacity: 0.35 });
  const outline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(hexOutlinePoints(HEX_RADIUS)),
    outlineMaterial
  );
  markerMesh.add(outline);

  const buoy = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    new THREE.MeshBasicMaterial({ color: MARKER_COLOR, transparent: true, opacity: 0.6 })
  );
  markerMesh.add(buoy);

  markerMesh.userData.outlineMaterial = outlineMaterial;
  return markerMesh;
}

function buildWater() {
  const waterGeometry = new THREE.PlaneGeometry(80, 80, 140, 140);
  waterGeometry.rotateX(-Math.PI / 2);
  const waterBasePositions = Float32Array.from(waterGeometry.attributes.position.array);
  const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x2e7ba8, roughness: 0.25, metalness: 0.2 });
  const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
  waterMesh.position.y = -0.05;
  waterMesh.receiveShadow = true;
  return { waterMesh, waterBasePositions };
}

function updateCameraFrustum(camera, width, height) {
  const aspect = width / height;
  camera.left = -CAMERA_FRUSTUM_HALF_SIZE * aspect;
  camera.right = CAMERA_FRUSTUM_HALF_SIZE * aspect;
  camera.top = CAMERA_FRUSTUM_HALF_SIZE;
  camera.bottom = -CAMERA_FRUSTUM_HALF_SIZE;
  camera.near = 0.1;
  camera.far = 100;
  camera.updateProjectionMatrix();
}

export function buildScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e2f42);
  scene.fog = new THREE.Fog(0x0e2f42, 10, 40);

  const camera = new THREE.OrthographicCamera();
  camera.position.set(14, 16, 14);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.AmbientLight(0xbcd8e8, 0.55));

  const sun = new THREE.DirectionalLight(0xfff4d6, 1.4);
  sun.position.set(10, 16, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  scene.add(sun);

  const { waterMesh, waterBasePositions } = buildWater();
  scene.add(waterMesh);

  const tileObjects = new Map();
  for (const tile of TILES) {
    const { x, z } = hexLocalPosition(tile.gridPos.row, tile.gridPos.col);

    const raftMesh = buildRaftMesh(tile);
    raftMesh.position.set(x, 0, z);
    raftMesh.visible = false;
    scene.add(raftMesh);

    const markerMesh = buildMarkerMesh(tile);
    markerMesh.position.x = x;
    markerMesh.position.z = z;
    markerMesh.visible = true;
    scene.add(markerMesh);

    tileObjects.set(tile.id, { raftMesh, markerMesh });
  }

  function resize(width, height) {
    updateCameraFrustum(camera, width, height);
    renderer.setSize(width, height, false);
  }

  return { renderer, scene, camera, resize, waterMesh, waterBasePositions, tileObjects };
}
```

- [ ] **Step 3: Verify in browser**

Run a local static server (`npx serve .`) and open the page. `js/main.js` doesn't call `buildScene` yet (that's Task 3), so nothing will render differently yet — this step is just to confirm `index.html`'s import map doesn't break the page and there are no import-map syntax errors in the console (a malformed import map throws immediately on page load, before any module code runs).
Expected: page loads exactly as before (still the old Canvas 2D renderer, since `main.js` hasn't changed yet), no console errors about the import map itself.

- [ ] **Step 4: Commit**

```bash
git add js/scene.js index.html
git commit -m "$(cat <<'EOF'
Add Three.js scene construction module and CDN import map

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Per-frame update loop and raycasting hit-test (`js/render.js`)

**Files:**
- Modify: `js/render.js` (full-file replace — this deletes all of the old Canvas 2D drawing code)

**Interfaces:**
- Consumes: `TILES` (`js/tiles.js`), `isEligible` (`js/state.js`), `buildScene` (`js/scene.js`, Task 2) with its exact return shape.
- Produces (used by Task 4's `js/main.js`):
  - `export function initScene(canvas)` — builds the scene once, wires a `window.resize` listener, and calls it once immediately so the initial frame is sized correctly. No return value.
  - `export function updateScene(state, time)` — advances the water animation, shows/hides each tile's `raftMesh`/`markerMesh` per `state.unlocked`, pulses eligible-locked tiles' marker opacity, and renders the frame. `time` is the same `DOMHighResTimeStamp` (milliseconds) `main.js`'s `requestAnimationFrame` callback already receives.
  - `export function screenToGrid(screenX, screenY, canvasWidth, canvasHeight)` → `{ row, col } | null` — same exact signature as the old Canvas 2D version, but `canvasWidth`/`canvasHeight` must now be the canvas's **CSS/layout pixel size** (e.g. from `canvas.getBoundingClientRect()`), not `canvas.width`/`canvas.height`. This matters because the Three.js renderer's internal drawing buffer is scaled by `devicePixelRatio` (via `renderer.setPixelRatio` in Task 2), so `canvas.width`/`canvas.height` are no longer equal to the canvas's on-screen CSS size the way they were with the old 2D canvas — passing the scaled buffer size here would misalign clicks with tiles on any display with `devicePixelRatio !== 1` (e.g. any Retina/HiDPI screen). Task 4 handles passing the right values.

- [ ] **Step 1: Replace `js/render.js`**

```js
import * as THREE from 'three';
import { TILES } from './tiles.js';
import { isEligible } from './state.js';
import { buildScene } from './scene.js';

let renderer, scene, camera, resizeFn, waterMesh, waterBasePositions, tileObjects;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export function initScene(canvas) {
  const built = buildScene(canvas);
  renderer = built.renderer;
  scene = built.scene;
  camera = built.camera;
  resizeFn = built.resize;
  waterMesh = built.waterMesh;
  waterBasePositions = built.waterBasePositions;
  tileObjects = built.tileObjects;

  function handleResize() {
    resizeFn(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', handleResize);
  handleResize();
}

function updateWater(elapsedSeconds) {
  const positions = waterMesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = waterBasePositions[i * 3];
    const z = waterBasePositions[i * 3 + 2];
    const y =
      Math.sin(x * 0.35 + elapsedSeconds * 1.1) * 0.05 +
      Math.sin(z * 0.5 + elapsedSeconds * 0.7) * 0.04 +
      Math.sin((x + z) * 0.2 + elapsedSeconds * 1.6) * 0.025;
    positions.setY(i, y);
  }
  positions.needsUpdate = true;
  waterMesh.geometry.computeVertexNormals();
}

export function updateScene(state, time) {
  updateWater(time / 1000);

  for (const tile of TILES) {
    const objects = tileObjects.get(tile.id);
    const unlocked = state.unlocked.includes(tile.id);
    objects.raftMesh.visible = unlocked;
    objects.markerMesh.visible = !unlocked;

    if (!unlocked) {
      const eligible = isEligible(tile, state);
      const pulse = eligible ? 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time / 300)) : 0.35;
      objects.markerMesh.userData.outlineMaterial.opacity = pulse;
    }
  }

  renderer.render(scene, camera);
}

export function screenToGrid(screenX, screenY, canvasWidth, canvasHeight) {
  pointer.x = (screenX / canvasWidth) * 2 - 1;
  pointer.y = -(screenY / canvasHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hitTargets = [...tileObjects.values()].flatMap((t) => [t.raftMesh, t.markerMesh]);
  const intersections = raycaster.intersectObjects(hitTargets, false);
  if (intersections.length === 0) return null;

  const tileId = intersections[0].object.userData.tileId;
  const tile = TILES.find((t) => t.id === tileId);
  return tile ? tile.gridPos : null;
}
```

- [ ] **Step 2: Verify in browser**

`main.js` still calls the old (now-removed) `drawScene`/unchanged `screenToGrid` import — this will throw an import error until Task 4 updates `main.js`. That's expected and fine; this task's own verification is just that the file has no syntax errors:

Run: `node --check js/render.js`
Expected: no output (syntax is valid). A full functional check happens in Task 4 once `main.js` is updated to actually call `initScene`/`updateScene`.

- [ ] **Step 3: Commit**

```bash
git add js/render.js
git commit -m "$(cat <<'EOF'
Rewrite render.js as a Three.js per-frame update loop with raycasting hit-test

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wire `main.js` to the new renderer

**Files:**
- Modify: `js/main.js` (full-file replace)

**Interfaces:**
- Consumes: `initScene`, `updateScene`, `screenToGrid` (Task 3, `js/render.js`). Everything else (`loadState`/`tick`/`isEligible`/`unlockTile`/`saveState` from `state.js`, `initUI`/`getCanvas`/`updateResourceBar`/`showTilePanel`/`hideTilePanel` from `ui.js`) is unchanged from before.
- Produces: nothing new — this is the top-level wiring, nothing imports `main.js`.

- [ ] **Step 1: Replace `js/main.js`**

```js
import { TILES } from './tiles.js';
import { loadState, tick, isEligible, unlockTile, saveState } from './state.js';
import { initScene, updateScene, screenToGrid } from './render.js';
import { initUI, getCanvas, updateResourceBar, showTilePanel, hideTilePanel } from './ui.js';

let selectedTileId = null;

initUI(() => {
  selectedTileId = null;
});

const canvas = getCanvas();
initScene(canvas);

let state = loadState();

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
  const gridPos = screenToGrid(x, y, rect.width, rect.height);

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

  updateScene(state, now);

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

Note what changed from the old version: `canvas.getContext('2d')` and the manual `resizeCanvas()`/`canvas.width`/`canvas.height` assignment are gone entirely (Three.js's `WebGLRenderer` owns the canvas and `initScene` wires its own resize listener internally, per Task 3). The click handler now passes `rect.width, rect.height` (from `getBoundingClientRect()`) to `screenToGrid` instead of `canvas.width, canvas.height` — see Task 3's Interfaces note for why.

- [ ] **Step 2: Verify in browser**

Run `npx serve .`, open the served URL.
Expected: a 3D scene renders — a dark blue-green water plane with visible wave motion, 4 solid wood-toned hex raft prisms (with real bevel/shading) at the starting-tile positions from Task 1's tile table (`fish_start` at row 3/col 4, `kelp_start` at row 0/col 1, `driftwood_start` at row 2/col 3, `crops_start` at row 1/col 2), each casting a visible shadow onto the water, and the other 32 tiles showing as translucent hex outline markers with a small buoy dot. No console errors. Resource bar ticks up live (unaffected by this change). Click the Fishing Raft — the tile panel should open showing "Fishing Raft" / "Produces 1 fish/s" (rendering technology doesn't affect `ui.js`). Click a locked tile — panel should show its requirement and a live progress percentage. Click open water (outside any hex) — panel should close.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "$(cat <<'EOF'
Wire main.js to the Three.js scene (initScene/updateScene)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Documentation updates

**Files:**
- Modify: `README.md`
- Modify: `memory-bank/tile-design.md` (full-file replace)
- Modify: `memory-bank/architecture-notes.md`

**Interfaces:** none — pure documentation, written against the finished code from Tasks 1-4.

- [ ] **Step 1: Update `README.md`**

Add a line after the existing "Once deployed, it will be live at..." line noting the new runtime dependency:

Find this line in `README.md`:
```
Once deployed, it will be live at **https://driftaway.jakechurchill.com**.
```
Replace it with:
```
Once deployed, it will be live at **https://driftaway.jakechurchill.com**.

The renderer is [Three.js](https://threejs.org), loaded from a CDN at runtime — an internet connection is required to load the game, even when running it locally.
```

- [ ] **Step 2: Replace `memory-bank/tile-design.md`**

```markdown
# Tile Design

All 36 tiles are defined in `js/tiles.js`, arranged on a 6×6 grid. This is a first-pass balance — not playtested — expect to retune specific numbers after actually playing it.

## Fish family (8 — base resource: fish)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `fish_start` | Fishing Raft | 3,4 | 1.0 | start |
| `fish_anchored_net` | Anchored Net | 3,5 | 1.0 | cost: 30 driftwood |
| `fish_trawling_raft` | Trawling Raft | 4,0 | 1.2 | cost: 60 kelp + 40 driftwood |
| `fish_tide_pool_trap` | Tide Pool Trap | 4,1 | 1.2 | milestone: lifetime fish ≥ 200 |
| `fish_deep_sea_longline` | Deep-Sea Longline | 4,2 | 1.5 | cost: 150 driftwood + 100 crops |
| `fish_grand_fishery` | Grand Fishery | 4,3 | 2.0 | milestone: lifetime fish ≥ 1000 |
| `fish_open_ocean_trawler` | Open-Ocean Trawler | 4,4 | 1.8 | cost: 250 driftwood + 200 crops |
| `fish_leviathan_net` | Leviathan Net | 4,5 | 2.5 | milestone: lifetime fish ≥ 2500 |

## Kelp family (8 — base resource: kelp)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `kelp_nursery` | Kelp Nursery | 0,0 | 1.2 | cost: 50 fish + 50 driftwood |
| `kelp_start` | Kelp Farm | 0,1 | 1.0 | start |
| `kelp_seaweed_raft` | Seaweed Raft | 0,2 | 1.0 | cost: 30 fish |
| `kelp_floating_garden` | Floating Garden | 0,3 | 1.2 | milestone: lifetime kelp ≥ 200 |
| `kelp_deep_bed` | Deep Kelp Bed | 0,4 | 1.5 | cost: 120 fish + 100 crops |
| `kelp_reef` | Kelp Reef | 0,5 | 2.0 | milestone: lifetime kelp ≥ 1000 |
| `kelp_open_water_farm` | Open-Water Kelp Farm | 1,0 | 1.8 | cost: 220 fish + 180 crops |
| `kelp_abyssal_forest` | Abyssal Kelp Forest | 1,1 | 2.5 | milestone: lifetime kelp ≥ 2500 |

## Driftwood family (7 — base resource: driftwood)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `driftwood_start` | Driftwood Collector | 2,3 | 0.5 | start |
| `driftwood_salvage_raft` | Salvage Raft | 2,4 | 0.6 | cost: 40 fish |
| `driftwood_debris_net` | Debris Net | 2,5 | 0.6 | milestone: lifetime driftwood ≥ 100 |
| `driftwood_current_sweeper` | Current Sweeper | 3,0 | 0.8 | cost: 80 kelp + 60 crops |
| `driftwood_storm_wreckage` | Storm Wreckage Raft | 3,1 | 1.0 | milestone: lifetime driftwood ≥ 500 |
| `driftwood_flotsam_dredge` | Flotsam Dredge | 3,2 | 1.0 | cost: 150 kelp + 120 crops |
| `driftwood_shipwreck_salvage` | Shipwreck Salvage | 3,3 | 1.3 | milestone: lifetime driftwood ≥ 1200 |

## Crops family (7 — base resource: crops)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `crops_start` | Planter Raft | 1,2 | 0.5 | start |
| `crops_soil_barge` | Soil Barge | 1,3 | 0.6 | cost: 40 kelp |
| `crops_hanging_garden` | Hanging Garden | 1,4 | 0.6 | milestone: lifetime crops ≥ 100 |
| `crops_terraced_planter` | Terraced Planter | 1,5 | 0.8 | cost: 80 fish + 60 driftwood |
| `crops_floating_orchard` | Floating Orchard | 2,0 | 1.0 | milestone: lifetime crops ≥ 500 |
| `crops_paddy_raft` | Paddy Raft | 2,1 | 1.0 | cost: 150 fish + 120 driftwood |
| `crops_vertical_farm` | Vertical Farm | 2,2 | 1.3 | milestone: lifetime crops ≥ 1200 |

## Booster family (6 — no production of their own)
| id | name | pos (r,c) | effect | unlock |
|---|---|---|---|---|
| `booster_drying_rack` | Drying Rack | 5,0 | +20% kelp, +20% driftwood | cost: 150 kelp + 150 driftwood |
| `booster_smokehouse` | Smokehouse | 5,1 | +25% fish | cost: 100 fish + 100 driftwood |
| `booster_windmill` | Windmill | 5,2 | +25% crops | milestone: lifetime crops ≥ 300 |
| `booster_net_weavers` | Net Weavers | 5,3 | +20% fish, +20% kelp | cost: 200 fish + 200 kelp |
| `booster_composting_shed` | Composting Shed | 5,4 | +20% crops, +20% driftwood | milestone: lifetime driftwood ≥ 800 |
| `booster_lighthouse` | Lighthouse | 5,5 | +15% fish, +15% kelp, +15% driftwood, +15% crops | milestone: lifetime crops ≥ 1500 |

## If retuning balance

Change the relevant tile's `rate`, `unlock.cost`, or `unlock.target` in `js/tiles.js` directly — `tests/economy.test.mjs`'s family-count and grid-coverage assertions will catch structural mistakes (wrong count, duplicated id/position), but won't catch a balance number that's simply "too slow/fast to feel good." That's a playtesting judgment call, not something to encode as a test.
```

- [ ] **Step 3: Update `memory-bank/architecture-notes.md`**

Find this section:
```
- **`js/render.js`** — all hex-grid math (`hexCenter`, `hexPolygonPoints`, the odd-r offset formulas) and Canvas 2D drawing, plus `screenToGrid` for click hit-testing. Only two functions are exported (`drawScene`, `screenToGrid`); everything else is module-private. This module is browser-only — verified visually, not by the Node test suite (see spec §11 for why that split exists).
```
Replace it with:
```
- **`js/scene.js`** — all hex-grid math and Three.js scene *construction*, run once at startup: camera, lights, the water plane, and all 36 tiles' `raftMesh`/`markerMesh` pairs. Exports `buildScene(canvas)`; everything else is module-private. Nothing here runs per-frame.
- **`js/render.js`** — the per-frame update loop and `screenToGrid` hit-testing (now via `THREE.Raycaster` against the meshes `scene.js` built, rather than point-in-polygon math). Exports `initScene`, `updateScene`, `screenToGrid`. Both this module and `scene.js` are browser-only — verified visually, not by the Node test suite (see the original spec's §11 for why that split exists; the same reasoning applies to the Three.js version).
```

Also find:
```
`render.js` and `ui.js` are siblings — neither imports the other. `main.js` is the only place that wires them together, which is why it's the file most later features will touch.
```
Replace it with:
```
`scene.js`, `render.js`, and `ui.js` are siblings — none of them import each other except `render.js` importing `buildScene` from `scene.js`. `main.js` is the only place that wires them together, which is why it's the file most later features will touch.
```

Also add a new paragraph at the end of the file:
```

## Three.js dependency

Three.js is loaded from `cdn.jsdelivr.net` via an ES module import map in `index.html`, pinned to `0.182.0` — no bundler, no local copy. This is a real runtime dependency the original zero-dependency design didn't have: if the CDN is unreachable, the game fails to load (no fallback is implemented — see the 2026-09-04 spec's Deployment section for why that's an accepted trade-off, not an oversight). The `three-best-practices` skill installed at `.claude/skills/three-best-practices/` documents the performance/memory-management rules this codebase follows (e.g. building all 36 tiles' meshes once at startup instead of per-frame).
```

- [ ] **Step 4: Commit**

```bash
git add README.md memory-bank/tile-design.md memory-bank/architecture-notes.md
git commit -m "$(cat <<'EOF'
Update docs for the 36-tile grid and Three.js renderer

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: End-to-end verification pass

**Files:** none (verification only — if this surfaces a bug, fix it in the relevant file from Tasks 1-4 and re-run the affected checks before continuing).

**Interfaces:** none — this exercises the fully assembled game.

- [ ] **Step 1: Run the automated tests**

Run: `npm test`
Expected: `tile data tests passed` and `economy math tests passed`, exit code 0.

- [ ] **Step 2: Fresh-start browser check**

Open the served game in a private/incognito window (no leftover `localStorage`).
Expected: no console errors; water is a visibly distinct color from the background and animates; exactly 4 wood-toned rafts are visible (at `fish_start` 3,4 / `kelp_start` 0,1 / `driftwood_start` 2,3 / `crops_start` 1,2) each casting a shadow onto the water; the other 32 cells show as translucent hex outlines with a buoy dot.

- [ ] **Step 3: Hit-testing check across all 5 families**

Click one tile from each family and confirm the panel opens with correct info: `fish_start` (unlocked, shows rate), `kelp_start` (unlocked, shows rate), a locked driftwood tile (shows cost or milestone requirement), a locked crops tile, and a locked booster tile (shows its boost description, e.g. Drying Rack showing "+20% kelp, +20% driftwood").

- [ ] **Step 4: Resize check**

Resize the browser window (or use devtools' device toolbar) across a few sizes.
Expected: the grid stays centered and fully visible, hit-testing (Step 3's clicks) still lands on the correct tile after resizing — this specifically exercises the `rect.width`/`rect.height` vs `canvas.width`/`canvas.height` distinction from Task 3/4, so test on both a standard-DPI and a Retina/HiDPI display if you have access to one.

- [ ] **Step 5: Persistence check**

Let the game run long enough to unlock one cost-gated tile (or use `fish_anchored_net`, needing only 30 driftwood at 0.5/s ≈ 60s), unlock it, reload the page, and confirm it's still unlocked and resources picked up where they left off (this exercises `state.js`'s save/load, which this plan didn't touch — confirming it still works end-to-end through the new renderer).

- [ ] **Step 6: Deployment sanity check**

Run: `cat CNAME` — confirm it's still exactly `driftaway.jakechurchill.com` (this plan doesn't touch it, but confirm nothing else clobbered it). Confirm `index.html` is still at the repo root.

No commit for this task — it's verification only. If any step fails, fix the underlying file and re-run that step (and Step 1, if the fix touched `state.js` or `tiles.js`) before considering this plan done.
