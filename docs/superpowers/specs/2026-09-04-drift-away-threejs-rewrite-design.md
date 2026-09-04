# Drift Away — Three.js Rendering Rewrite & 6×6 Grid Expansion

Date: 2026-09-04
Status: Approved for planning
Supersedes: sections 4 ("Tile content"), 6 ("Rendering"), and parts of 7 ("Game loop") of `docs/superpowers/specs/2026-09-02-drift-away-design.md`. Everything else in that spec (resources, unlock mechanics, data model for state, UI, persistence, deployment target) is unchanged and still authoritative — this document only covers what's different.

## 1. Overview

Two changes, shipped together on one branch:

1. **Grid expansion**: 5×5 (25 tiles) → 6×6 (36 tiles), scaling the existing family proportions and tier-progression pattern rather than introducing a new game-design approach.
2. **Rendering rewrite**: the Canvas 2D hex renderer (`js/render.js`) is replaced with a Three.js/WebGL scene — real 3D geometry, real lighting and cast shadows, and genuine animated wave displacement on the water — loaded via a CDN import map (no build step, no bundler). This was validated with a live interactive prototype before being written up here (real hex-prism raft with bevel, real directional-light shadow cast onto animated water, orbit-camera interaction) — two real bugs were found and fixed during that prototyping (a water-shader addon that didn't render correctly at the pinned version, and a water material color that exactly matched the background color and was invisible) and both fixes are reflected in the design below.

### Non-goals (in addition to the original spec's non-goals, all still in force)
- No player camera control (orbit/zoom) — the camera stays fixed, same interaction model as today.
- No texture-mapped materials (wood grain images, water normal maps) — flat-shaded low-poly materials lit by real 3D lighting, matching the existing stylized aesthetic.
- No WebGL fallback for non-WebGL browsers — effectively universal support at this point; not worth the complexity.
- No offline/self-contained guarantee for Three.js itself — the game now requires network access to the CDN to load the renderer at all (see §7 Deployment).

## 2. Grid expansion: 5×5 → 6×6 (36 tiles)

Grid is now 6 rows × 6 columns (0-indexed 0–5), still exactly one tile per cell, still a mix of cost- and milestone-gated unlocks, still one `start`-unlocked tile per resource family (booster family has none). Family counts scale from the original 6/6/5/5/3 (25 total) to **8/8/7/7/6 (36 total)** — each family keeps its existing tier-progression shape and simply extends two tiers further; the three new boosters add two dual-resource combo boosts (covering the two resource pairings the original 3 boosters didn't) and one all-resource capstone.

This is still a first-pass balance, not playtested — same caveat as the original 25-tile table.

### Fish family (8 — base resource: fish)
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

### Kelp family (8 — base resource: kelp)
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

### Driftwood family (7 — base resource: driftwood)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `driftwood_start` | Driftwood Collector | 2,3 | 0.5 | start |
| `driftwood_salvage_raft` | Salvage Raft | 2,4 | 0.6 | cost: 40 fish |
| `driftwood_debris_net` | Debris Net | 2,5 | 0.6 | milestone: lifetime driftwood ≥ 100 |
| `driftwood_current_sweeper` | Current Sweeper | 3,0 | 0.8 | cost: 80 kelp + 60 crops |
| `driftwood_storm_wreckage` | Storm Wreckage Raft | 3,1 | 1.0 | milestone: lifetime driftwood ≥ 500 |
| `driftwood_flotsam_dredge` | Flotsam Dredge | 3,2 | 1.0 | cost: 150 kelp + 120 crops |
| `driftwood_shipwreck_salvage` | Shipwreck Salvage | 3,3 | 1.3 | milestone: lifetime driftwood ≥ 1200 |

### Crops family (7 — base resource: crops)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `crops_start` | Planter Raft | 1,2 | 0.5 | start |
| `crops_soil_barge` | Soil Barge | 1,3 | 0.6 | cost: 40 kelp |
| `crops_hanging_garden` | Hanging Garden | 1,4 | 0.6 | milestone: lifetime crops ≥ 100 |
| `crops_terraced_planter` | Terraced Planter | 1,5 | 0.8 | cost: 80 fish + 60 driftwood |
| `crops_floating_orchard` | Floating Orchard | 2,0 | 1.0 | milestone: lifetime crops ≥ 500 |
| `crops_paddy_raft` | Paddy Raft | 2,1 | 1.0 | cost: 150 fish + 120 driftwood |
| `crops_vertical_farm` | Vertical Farm | 2,2 | 1.3 | milestone: lifetime crops ≥ 1200 |

### Booster family (6 — no production of their own)
| id | name | pos (r,c) | effect | unlock |
|---|---|---|---|---|
| `booster_drying_rack` | Drying Rack | 5,0 | +20% kelp, +20% driftwood | cost: 150 kelp + 150 driftwood |
| `booster_smokehouse` | Smokehouse | 5,1 | +25% fish | cost: 100 fish + 100 driftwood |
| `booster_windmill` | Windmill | 5,2 | +25% crops | milestone: lifetime crops ≥ 300 |
| `booster_net_weavers` | Net Weavers | 5,3 | +20% fish, +20% kelp | cost: 200 fish + 200 kelp |
| `booster_composting_shed` | Composting Shed | 5,4 | +20% crops, +20% driftwood | milestone: lifetime driftwood ≥ 800 |
| `booster_lighthouse` | Lighthouse | 5,5 | +15% fish, +15% kelp, +15% driftwood, +15% crops | milestone: lifetime crops ≥ 1500 |

Grid coverage check: every one of the 36 `(row, col)` pairs for row/col in 0–5 appears exactly once across the table above (verified by construction — rows 0–1 are kelp, row 1 cols 2-5 + row 2 cols 0-2 are crops, row 2 cols 3-5 + row 3 cols 0-3 are driftwood, row 3 cols 4-5 + row 4 are fish, row 5 is boosters).

## 3. Data model changes

`js/tiles.js`'s `TILES` array grows to the 36 entries above — same schema as before (`id`, `name`, `gridPos`, `family`, `kind`, `produces`, `rate`, `boosts`, `unlock`), no schema changes. `js/state.js` is **completely unchanged** — none of its functions reference the grid size or tile count directly; they all operate generically over whatever `TILES` contains.

## 4. Rendering: Three.js scene

### 4.1 Dependency loading

`index.html` adds an ES module import map before the `main.js` script tag:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.js"
  }
}
</script>
```

Version `0.182.0` is pinned because it's the exact version validated in the live prototype. No `three/addons/` import is needed — the prototype's use of the `Water` addon (`three/addons/objects/Water.js`) didn't render correctly at this version (the water surface came out flat gray instead of reflective blue) and was replaced with a hand-rolled displaced-geometry water plane (§4.4) that only needs core Three.js. If a future revision wants the fancier `Water`/`Water2` addons, that needs its own compatibility check against whatever Three.js version is pinned at the time — don't assume the addon "just works" at a given version without testing it live first, the way this design's own prototype didn't.

### 4.2 File structure

- **`js/scene.js`** (new) — pure scene *construction*, run once. Exports `buildScene(canvas)` → `{ renderer, scene, camera, resize(width, height), waterMesh, waterBasePositions, tileObjects }`, where `tileObjects` is a `Map<tileId, { raftMesh, markerMesh }>` — both meshes are created for every tile up front (per the Three.js skill's "reuse objects, avoid per-frame allocation, dispose properly" rules — nothing is created or destroyed after this point), and their `.visible` flag is what `render.js` toggles per frame based on lock state. No imports from `state.js` — this module only knows about `TILES` (positions, families, kinds) and geometry/materials, not game state.
- **`js/render.js`** (rewritten) — owns the per-frame *update* loop and hit-testing. Exports `initScene(canvas)` (calls `buildScene`, stores the result in module scope, calls `resize()` once and wires a `window.resize` listener that calls it again), `updateScene(state, time)` (per frame: displaces water vertices, toggles each tile's `raftMesh`/`markerMesh` visibility from `state.unlocked`, animates locked-eligible tiles' marker opacity, calls `renderer.render(scene, camera)`), and `screenToGrid(screenX, screenY, canvasWidth, canvasHeight)` (raycasting, §4.6). Imports `isEligible` from `state.js` (same as the old `render.js` did) to drive the eligible-pulse animation.

### 4.3 Hex geometry, camera, and lighting

Hex math reuses the exact same odd-r horizontal-offset formulas as the Canvas version, just outputting a 3D `(x, z)` world position instead of a 2D `(x, y)` canvas position (Y is now the vertical/up axis):

```js
const HEX_RADIUS = 1.6;                       // world units, center-to-vertex
const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
const HEX_HEIGHT = 2 * HEX_RADIUS;
const ROW_SPACING = 0.75 * HEX_HEIGHT;
const GRID_ROWS = 6;
const GRID_COLS = 6;

function hexWorldPosition(row, col) {
  const x = col * HEX_WIDTH + (row % 2 === 1 ? HEX_WIDTH / 2 : 0);
  const z = row * ROW_SPACING;
  return { x, z };
}
```
The whole grid is then translated so its bounding-box center sits at world `(0, *, 0)` (same centering concept as the old `hexGridBounds()`/`computeFitScale()`, just done once at scene-build time instead of every frame via a canvas transform).

**Camera**: fixed `THREE.OrthographicCamera`, positioned diagonally like the validated prototype (`camera.position.set(14, 16, 14)`, `camera.lookAt(0, 0, 0)`) — an isometric-ish 3/4 view. Frustum is recomputed on resize from a fixed world half-size, the direct 3D analog of the old `computeFitScale`:

```js
const CAMERA_FRUSTUM_HALF_SIZE = 12; // world units, tuned to fit the 6x6 grid comfortably
function resize(camera, renderer, width, height) {
  const aspect = width / height;
  camera.left = -CAMERA_FRUSTUM_HALF_SIZE * aspect;
  camera.right = CAMERA_FRUSTUM_HALF_SIZE * aspect;
  camera.top = CAMERA_FRUSTUM_HALF_SIZE;
  camera.bottom = -CAMERA_FRUSTUM_HALF_SIZE;
  camera.near = 0.1;
  camera.far = 100;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
```

**Lighting**: one `AmbientLight(0xbcd8e8, 0.55)` for soft fill, one `DirectionalLight(0xfff4d6, 1.4)` positioned at `(10, 16, 6)` with `castShadow = true`, `shadow.mapSize.set(1024, 1024)`, and a shadow-camera frustum sized to cover the grid bounds (`left/right = ±16`, `top/bottom = ±16`, `near = 1`, `far = 40`) — this replaces the old rim-light-stroke trick with a real cast shadow (rafts genuinely shadow the water beneath them, validated in the prototype).

### 4.4 Water

A single large plane, oversized relative to the grid so its edges are never visible: `new THREE.PlaneGeometry(80, 80, 140, 140)`, rotated flat (`rotateX(-Math.PI / 2)`), material `MeshStandardMaterial({ color: 0x2e7ba8, roughness: 0.25, metalness: 0.2 })`, `receiveShadow = true`. The **scene background** is a distinct, darker color (`0x0e2f42`, plus `scene.fog = new THREE.Fog(0x0e2f42, 10, 40)` for depth) — during prototyping the water material was initially set to the *same* color as the scene background and was consequently invisible; keeping them visibly distinct is a hard requirement here, not a style preference.

Waves are real displaced geometry, animated every frame — no shader, no texture, matching what was validated live:

```js
function updateWater(waterMesh, basePositions, time) {
  const positions = waterMesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = basePositions[i * 3];
    const z = basePositions[i * 3 + 2];
    const y =
      Math.sin(x * 0.35 + time * 1.1) * 0.05 +
      Math.sin(z * 0.5 + time * 0.7) * 0.04 +
      Math.sin((x + z) * 0.2 + time * 1.6) * 0.025;
    positions.setY(i, y);
  }
  positions.needsUpdate = true;
  waterMesh.geometry.computeVertexNormals();
}
```
`basePositions` is a `Float32Array` snapshot of the plane's post-rotation vertex positions, taken once at construction time (so `x`/`z` above are real world coordinates, and only `y` — the up axis — gets displaced).

### 4.5 Tiles and props

Each tile gets, built once at scene-construction time:
- **`raftMesh`**: `ExtrudeGeometry` from the same hexagon shape used for hit-testing, `{ depth: 0.35, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2 }`, material `MeshStandardMaterial({ color: 0xc9975b, roughness: 0.85, metalness: 0.05 })`, `castShadow = true`, `receiveShadow = true`. Booster tiles additionally get a thin ring/torus accent in `0xe0b84b` (the old `BOOSTER_TRIM` gold) sitting just above the top face.
- **`markerMesh`**: a thin, semi-transparent hex outline (`THREE.LineLoop` built from the same hexagon's vertices, material `LineBasicMaterial({ color: 0xbcd8e8, transparent: true, opacity: 0.35 })`) sitting just above the water — the 3D analog of the old dashed-outline-plus-buoy-dot locked-tile look. `render.js`'s per-frame update animates this material's `opacity` between ~0.35 and ~0.75 (via `Math.sin(time / 300)`, same pulse math as before) whenever `isEligible(tile, state)` is true.
- Both meshes carry `userData.tileId = tile.id` for hit-test lookup (§4.6), and both exist in the scene at all times — `render.js`'s `updateScene` sets exactly one of the two `.visible = true` per tile per frame based on `state.unlocked.includes(tile.id)`.

Props are simple primitive geometries positioned on top of `raftMesh`, one Group per tile added as a child of the raft:
- **fish**: `ConeGeometry(0.25, 0.7, 12)`, material `0x5fa8d3`, laid on its side.
- **kelp**: three `CylinderGeometry` "strands" (thin, tapered), material `0x4c9a6a`, each with a small continuous sway rotation.
- **driftwood**: two crossed `CylinderGeometry` "logs", material `0x5a3f22`.
- **crops**: four thin `BoxGeometry` "stalks", material `0xd9b545`.
- **booster**: for `booster_windmill`, a box "post" plus four thin pyramid "blades" that continuously rotate; every other booster gets a single pyramid (`ConeGeometry` with 4 radial segments) in `0xe0b84b`.

All materials are flat single-color `MeshStandardMaterial` (no texture maps) — the low-poly look comes from geometry and real lighting, not surface detail, consistent with the "no texture-mapped materials" non-goal.

### 4.6 Hit-testing

No separate invisible hit-test geometry — `raftMesh` and `markerMesh` are already the visible representation of a tile in every state, exactly one of them visible at a time, so raycasting against the concatenated list of all `raftMesh`/`markerMesh` objects (kept visible per §4.5) is sufficient and simpler than adding a third invisible plane per tile:

```js
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

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
`main.js`'s call site (`screenToGrid(x, y, canvas.width, canvas.height)`) is unchanged — this is the one interface that stays identical across the rewrite.

## 5. Game loop & main.js changes

`js/main.js` changes at exactly two points:

1. **Setup**: `const ctx = canvas.getContext('2d');` is removed entirely (Three.js's `WebGLRenderer` takes the canvas element directly, constructed inside `scene.js`). `initScene(canvas)` replaces the old `resizeCanvas()` + manual `canvas.width/height` assignment — `initScene` sets up its own `window.resize` listener internally (calling `scene.js`'s `resize()`), so `main.js` no longer manages canvas sizing at all.
2. **Per frame**: `drawScene(ctx, canvas, state, now)` becomes `updateScene(state, now)`.

Everything else in `main.js` — `loadState`/`tick`/`isEligible`/`unlockTile`/`saveState`, the click handler, `handleUnlockClick`, the autosave timer, the `beforeunload` listener — is untouched, since none of it depended on the rendering technology, only on `screenToGrid`'s return shape (unchanged) and `updateScene` being called once per frame (structurally identical to the old `drawScene` call).

## 6. Testing

Same split as the original spec: `tests/economy.test.mjs` covers pure data/logic, rendering is verified by hand in a browser. Three assertions in the existing tile-data test need updating for the new grid size and family counts:

```js
assert.equal(TILES.length, 36, 'expected exactly 36 tiles');
// ...
for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 6; col++) {
    assert.ok(positions.includes(`${row},${col}`), `missing tile at (${row},${col})`);
  }
}
// ...
assert.deepEqual(
  familyCounts,
  { fish: 8, kelp: 8, driftwood: 7, crops: 7, booster: 6 },
  'family counts must match the spec'
);
```
The economy-math tests (`effectiveRate`, `isEligible`, `tick`, `unlockTile`) need no changes — they exercise `fish_start`, `fish_anchored_net`, and `booster_smokehouse`, all of which still exist unchanged in the 36-tile roster.

Rendering verification is manual, same discipline used during prototyping: run the game in a browser, confirm the scene renders without console errors, confirm the water is visibly distinct from the background and animates, confirm shadows are cast from rafts onto the water, confirm clicking each tile type (locked/unlocked/eligible, one of each family) opens the correct panel via `screenToGrid`, confirm resize keeps the grid centered and fully visible.

## 7. Deployment

No change to *how* the game deploys (still static files via GitHub Pages, still `index.html` at repo root, still the `CNAME` file from the original spec) — but there's a new **operational** dependency worth calling out: the game now needs network access to `cdn.jsdelivr.net` at runtime to load Three.js. If jsdelivr is ever unreachable from a player's network, the game fails to start (a blank canvas, no error UI planned for this — out of scope, matching the "no WebGL fallback" non-goal's spirit of not over-engineering for edge-case availability). This is a real, accepted trade-off versus the original zero-dependency design, not an oversight.
