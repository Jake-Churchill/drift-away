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
