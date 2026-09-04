# Architecture Notes

## Modules

- **`js/tiles.js`** — pure data: the 36 tile definitions (`TILES`). No logic, no imports.
- **`js/state.js`** — pure economy math (`effectiveRate`, `isEligible`, `tick`, `unlockTile`, `createInitialState`) plus the only two functions that touch `localStorage` (`saveState`, `loadState`). The pure functions are exercised directly by `tests/economy.test.mjs` in Node — they don't touch the DOM, which is what makes that possible.
- **`js/scene.js`** — all hex-grid math and Three.js scene *construction*, run once at startup: camera, lights, the water plane, and all 36 tiles' `raftMesh`/`markerMesh` pairs. Exports `buildScene(canvas)`; everything else is module-private. Nothing here runs per-frame.
- **`js/render.js`** — the per-frame update loop and `screenToGrid` hit-testing (now via `THREE.Raycaster` against the meshes `scene.js` built, rather than point-in-polygon math). Exports `initScene`, `updateScene`, `screenToGrid`. Both this module and `scene.js` are browser-only — verified visually, not by the Node test suite (see the original spec's §11 for why that split exists; the same reasoning applies to the Three.js version).
- **`js/ui.js`** — the only module that touches the resource bar / tile panel DOM elements from `index.html`. Exposes `initUI`, `updateResourceBar`, `showTilePanel`, `hideTilePanel`, `getCanvas`.
- **`js/main.js`** — the only module that imports all the others. Owns the `requestAnimationFrame` loop, canvas resize handling, click → hit-test → panel wiring, the Unlock button's callback, and the three autosave triggers (on unlock, every ~10s, on `beforeunload`).

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

Three.js is loaded from `cdn.jsdelivr.net` via an ES module import map in `index.html`, pinned to `0.182.0` — no bundler, no local copy. This is a real runtime dependency the original zero-dependency design didn't have: if the CDN is unreachable, the game fails to load (no fallback is implemented — see the 2026-09-04 spec's Deployment section for why that's an accepted trade-off, not an oversight). The `three-best-practices` skill installed at `.claude/skills/three-best-practices/` documents the performance/memory-management rules this codebase follows (e.g. building all 36 tiles' meshes once at startup instead of per-frame).
