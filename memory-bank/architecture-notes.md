# Architecture Notes

## Modules

- **`js/zones.js`** — `ZONES`, the zone list (`id`, `name`, `colStart`/`colEnd`, `raftColor`). Only `raftColor` is read at runtime (by `scene.js`); the rest is documentation. Adding a zone = a new entry here plus tiles with that `zone` id at the next 6 columns.
- **`js/tiles.js`** — the 72 tile definitions (`TILES`, 36 per zone, each with a `zone` field), plus a `neighborGridPositions()` helper that derives the exported `TILE_NEIGHBORS` adjacency map from those positions at module load. No imports.
- **`js/state.js`** — pure economy math (`effectiveRate`, `isDiscovered`, `isEligible`, `tick`, `unlockTile`, `getLevel`, `levelUpCost`, `levelUpTile`, ...) plus achievements (`ACHIEVEMENTS`, `checkAchievements`), prestige (`doPrestige`, prestige upgrades), offline progress (`applyOfflineProgress`), and the only two functions that touch `localStorage` (`saveState`, `loadState`). None of the economy math is zone-aware: it filters `TILES` generically, so 72 tiles needed no changes there. The pure functions are exercised directly by `tests/economy.test.mjs` in Node — they don't touch the DOM, which is what makes that possible.
- **`js/scene.js`** — all hex-grid math and Three.js scene *construction*, run once at startup: camera, lights, the water plane, all 72 tiles' `raftMesh`/`markerMesh`/`propGroup` triples (raft color comes from the tile's zone), the per-zone `cameraPositions` map, and the zone-2 cloud-cover sprite. Exports `buildScene(canvas)`; everything else is module-private. Nothing here runs per-frame. `addProp` builds zone-1 props with its own archetype builders and hands zone-2 tiles to `zone2-props.js`.
- **`js/zone2-props.js`** — `buildZone2Prop(propGroup, tile, level)`: the ice/frost-themed geometry for all 10 zone-2 archetypes (4 producer families + 6 boosters) at levels 1–3. It deliberately duplicates a couple of small helpers (`addOutline`, `cylinderBetween`) from `scene.js` rather than sharing a helper module.
- **`js/render.js`** — the per-frame update loop and `screenToGrid` hit-testing (via `THREE.Raycaster` against the meshes `scene.js` built). Also owns camera framing: `sailToZone(zoneId)` runs a 1200ms eased tween between the per-zone framings, `getCurrentZone()` reports which zone is framed, and `resetCamera()` snaps back to zone 1 instantly (called on restart/prestige, since a reset would otherwise leave the camera on an empty zone 2). `updateScene` also drives the cloud cover, whose opacity and lift follow how many zone-2 tiles are unlocked. Exports `initScene`, `updateScene`, `screenToGrid`, `sailToZone`, `getCurrentZone`, `resetCamera`. Both this module and `scene.js` are browser-only — verified visually, not by the Node test suite (see the original spec's §11 for why that split exists; the same reasoning applies to the Three.js version).
- **`js/ui.js`** — the only module that touches the DOM elements from `index.html`: resource bar and tile panel, the menu modal (restart, achievements), the prestige overlay and store, the offline-progress modal, and the resource/token popups and unlock burst.
- **`js/sound.js`** — synthesised Web Audio sounds (unlock, level-up, prestige); every call degrades to a silent no-op if audio is unavailable.
- **`js/main.js`** — the only module that imports all the others. Owns the `requestAnimationFrame` loop, canvas resize handling, click → hit-test → panel wiring, the Unlock and Level Up buttons' callbacks, and the autosave triggers (on unlock, on level-up, on restart/prestige/prestige-upgrade, every ~10s, on `beforeunload`).

## Zones and the camera

A click on a tile in the zone that isn't currently framed sails the camera there instead of opening the tile panel (`main.js`); there is no sail button. Fog of war is just the existing `isDiscovered` rule: a zone-2 tile becomes visible when a neighbor is unlocked, and the col 5/col 6 border makes that work with no zone-specific code. The cloud sprite is purely visual and doesn't gate anything. Per-zone camera framings live in `buildScene`'s `cameraPositions` (zone 1 hardcoded, later zones framed on their tile centroid).

## Data flow

```
tiles.js (static data)
   ↓
state.js (tick/effectiveRate/isEligible/unlockTile — pure math over TILES + a state object)
   ↓
main.js's RAF loop: tick(state, dt) → updateResourceBar(state) → updateScene(state, now)
   ↑
ui.js (DOM) ←── click → screenToGrid (render.js) → find tile in TILES → showTilePanel(tile, state, ...)
```

`scene.js`, `render.js`, and `ui.js` are siblings — none of them import each other except `render.js` importing `buildScene` from `scene.js`. `main.js` is the only place that wires them together, which is why it's the file most later features will touch.

## Why ES modules everywhere

`package.json` sets `"type": "module"`, so every `.js` file (browser or Node) and every `.mjs` test file uses the same `import`/`export` syntax with no transpilation. The only cost: local dev needs a static server (`npx serve .`), because browsers refuse to load ES modules over `file://`. Production (GitHub Pages) always serves over HTTPS, so this doesn't affect deployment at all — only the "how do I preview this on my laptop" step.

## Three.js dependency

Three.js is loaded from `cdn.jsdelivr.net` via an ES module import map in `index.html`, pinned to `0.182.0` — no bundler, no local copy. This is a real runtime dependency the original zero-dependency design didn't have: if the CDN is unreachable, the game fails to load (no fallback is implemented — see the 2026-09-04 spec's Deployment section for why that's an accepted trade-off, not an oversight). The `three-best-practices` skill installed at `.claude/skills/three-best-practices/` documents the performance/memory-management rules this codebase follows (e.g. building all 72 tiles' meshes once at startup instead of per-frame).
