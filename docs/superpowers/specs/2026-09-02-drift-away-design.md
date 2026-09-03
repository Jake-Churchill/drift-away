# Drift Away — Design Spec

Date: 2026-09-02
Status: Approved for planning
Working title: **Drift Away**

## 1. Overview

Drift Away is a single-page browser game: a calm, idle resource-management game played on a fixed 5×5 grid (25 slots) of hexagonal raft tiles floating on open water, rendered in a 2.5D pseudo-isometric style. The player starts with four rafts already unlocked (one producer per resource type) and grows outward by unlocking the remaining 21 slots, each gated behind either a resource cost or a lifetime-production milestone. Unlocked tiles either produce a resource over time or boost the output of other tiles raft-wide.

No offline progress, no combat, no multiplayer, no accounts, no sound. Progress is saved to `localStorage` so a session can be resumed later, but resources only tick while the game is open and running.

### Non-goals (explicitly out of scope for this version)
- Offline/idle progress while the tab is closed
- Adjacency-based bonuses (booster effects are grid-wide, not positional)
- Tile leveling/upgrading in place (all progression is via unlocking new fixed slots)
- Sound/music
- Mobile touch optimization
- Any multiplayer, accounts, or server component

## 2. Core loop

1. Unlocked producer tiles generate their resource every tick (`amount += rate * dt`), added to both the current balance and a lifetime-total counter.
2. Unlocked booster tiles apply a stored percentage bonus to the effective rate of their target resource(s), recalculated every tick.
3. Every tick, each locked tile's unlock requirement is checked against current balances (cost-type) or lifetime totals (milestone-type). A newly-eligible tile gets a visual "ready" highlight.
4. Clicking any tile (locked or unlocked) opens an info panel showing its name, what it produces/boosts, its rate, and its unlock requirement/progress.
5. Clicking "Unlock" on an eligible locked tile: cost-type tiles deduct the cost from current balances; milestone-type tiles unlock immediately (the condition is already met — no cost deducted). The raft then renders on the grid.
6. State autosaves to `localStorage` on every unlock, every ~10 seconds, and on tab close/unload.

## 3. Resources

Four resources, each produced by one tile family:

| Resource | Icon concept | Color |
|---|---|---|
| Fish | silver/blue fish silhouette | `#5fa8d3` |
| Kelp | green spiral strand | `#4c9a6a` |
| Driftwood | brown log | `#8a6236` |
| Crops | golden wheat sheaf | `#d9b545` |

## 4. Tile content (all 25 slots)

Grid uses 0-indexed `(row, col)` offset coordinates, 5 rows × 5 cols. Every cell is filled by exactly one of the 25 tiles below; 4 start unlocked (`unlock.type: "start"`), the other 21 start locked. Placement groups each family into a rough quadrant purely for visual clustering — since boosters are grid-wide, exact placement has no mechanical effect and can be freely adjusted during implementation without touching balance.

### Fish family (6 — base resource: fish)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `fish_start` | Fishing Raft | 2,2 | 1.0 | start |
| `fish_anchored_net` | Anchored Net | 2,3 | 1.0 | cost: 30 driftwood |
| `fish_trawling_raft` | Trawling Raft | 3,3 | 1.2 | cost: 60 kelp + 40 driftwood |
| `fish_tide_pool_trap` | Tide Pool Trap | 3,4 | 1.2 | milestone: lifetime fish ≥ 200 |
| `fish_deep_sea_longline` | Deep-Sea Longline | 4,3 | 1.5 | cost: 150 driftwood + 100 crops |
| `fish_grand_fishery` | Grand Fishery | 4,4 | 2.0 | milestone: lifetime fish ≥ 1000 |

### Kelp family (6 — base resource: kelp)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `kelp_start` | Kelp Farm | 0,1 | 1.0 | start |
| `kelp_seaweed_raft` | Seaweed Raft | 0,2 | 1.0 | cost: 30 fish |
| `kelp_nursery` | Kelp Nursery | 0,0 | 1.2 | cost: 50 fish + 50 driftwood |
| `kelp_floating_garden` | Floating Garden | 0,3 | 1.2 | milestone: lifetime kelp ≥ 200 |
| `kelp_deep_bed` | Deep Kelp Bed | 0,4 | 1.5 | cost: 120 fish + 100 crops |
| `kelp_reef` | Kelp Reef | 1,4 | 2.0 | milestone: lifetime kelp ≥ 1000 |

### Driftwood family (5 — base resource: driftwood)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `driftwood_start` | Driftwood Collector | 2,1 | 0.5 | start |
| `driftwood_salvage_raft` | Salvage Raft | 2,0 | 0.6 | cost: 40 fish |
| `driftwood_debris_net` | Debris Net | 3,0 | 0.6 | milestone: lifetime driftwood ≥ 100 |
| `driftwood_current_sweeper` | Current Sweeper | 3,1 | 0.8 | cost: 80 kelp + 60 crops |
| `driftwood_storm_wreckage` | Storm Wreckage Raft | 4,0 | 1.0 | milestone: lifetime driftwood ≥ 500 |

### Crops family (5 — base resource: crops)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `crops_start` | Planter Raft | 1,2 | 0.5 | start |
| `crops_soil_barge` | Soil Barge | 1,1 | 0.6 | cost: 40 kelp |
| `crops_hanging_garden` | Hanging Garden | 1,3 | 0.6 | milestone: lifetime crops ≥ 100 |
| `crops_terraced_planter` | Terraced Planter | 3,2 | 0.8 | cost: 80 fish + 60 driftwood |
| `crops_floating_orchard` | Floating Orchard | 4,1 | 1.0 | milestone: lifetime crops ≥ 500 |

### Booster family (3 — no production of their own)
| id | name | pos (r,c) | effect | unlock |
|---|---|---|---|---|
| `booster_drying_rack` | Drying Rack | 1,0 | +20% kelp, +20% driftwood | cost: 150 kelp + 150 driftwood |
| `booster_smokehouse` | Smokehouse | 2,4 | +25% fish | cost: 100 fish + 100 driftwood |
| `booster_windmill` | Windmill | 4,2 | +25% crops | milestone: lifetime crops ≥ 300 |

This is a first-pass balance, not playtested — expect to retune specific numbers after playing it, but it's internally consistent (early tiles reachable in under a minute at starting rates, later tiles assume several producers of that family are already online).

## 5. Data model

### Tile definition (`js/tiles.js`, plain data array)
```
{
  id: string,
  name: string,
  gridPos: { row: number, col: number },
  family: "fish" | "kelp" | "driftwood" | "crops" | "booster",
  kind: "producer" | "booster",
  produces: "fish" | "kelp" | "driftwood" | "crops" | null,   // producers only
  rate: number | null,                                         // units/sec, producers only
  boosts: [{ resource: string, percent: number }] | null,      // boosters only
  unlock:
      { type: "start" }
    | { type: "cost", cost: { [resource]: number } }
    | { type: "milestone", resource: string, target: number }
}
```

### Game state (`js/state.js`, in-memory + persisted)
```
{
  version: 1,
  resources:  { fish: number, kelp: number, driftwood: number, crops: number },
  lifetime:   { fish: number, kelp: number, driftwood: number, crops: number },
  unlocked:   string[]   // tile ids
}
```

### Save schema
`localStorage` key: `driftaway_save_v1`. Value: JSON-serialized game state exactly as above. On load: if the key exists and parses, restore it; otherwise initialize `resources`/`lifetime` to all zeros and `unlocked` to the four `*_start` tile ids.

### Effective rate calculation (pure function, testable without the DOM)
```
effectiveRate(resource, unlockedTileIds) =
  baseSum = sum of .rate for unlocked producer tiles where .produces === resource
  boostPct = sum of .percent for unlocked booster tiles where any boosts[].resource === resource
  return baseSum * (1 + boostPct / 100)
```

### Unlock eligibility (pure function, testable without the DOM)
```
isEligible(tile, state) =
  if tile.unlock.type === "start": true
  if tile.unlock.type === "cost": every resource key in tile.unlock.cost has state.resources[key] >= amount
  if tile.unlock.type === "milestone": state.lifetime[tile.unlock.resource] >= tile.unlock.target
```

## 6. Rendering

**Technique**: this is a 2.5D pseudo-isometric look, not a true 3D/axonometric engine — kept in plain Canvas 2D per the original vanilla-JS scope. A standard 2D hex grid is computed, then the whole grid is rendered with a vertical squash to fake a camera tilt, and per-tile bevel/shadow shading fakes the raft's physical depth.

**Hex grid math** (pointy-top hexagons, "odd-r" horizontal offset, edge-to-edge):
```
hexRadius = R                      // center to vertex, in px
hexWidth  = sqrt(3) * R
hexHeight = 2 * R
rowSpacing = 0.75 * hexHeight
x = col * hexWidth + (row % 2 === 1 ? hexWidth / 2 : 0) + originX
y = row * rowSpacing + originY
```
The whole grid is then drawn onto a canvas transform with `scaleY ≈ 0.62` (tunable) applied around the grid's vertical center to produce the isometric-ish flattened look.

**Per-tile depth (unlocked tiles)**:
1. Draw a blurred dark ellipse on the water beneath the hex (drop shadow).
2. Draw the hex's lower-facing edges offset down by a fixed "wall height" in a darker shade of the raft's wood tone (`#8a6236`) — this is the visible plank-edge lip.
3. Draw the top face as a flat hexagon in the lighter wood tone (`#c9975b`).
4. Draw a small flat-shaded prop cluster centered on the top face representing the resource (e.g. fish + net for Fishing Raft, seaweed strands for Kelp Farm, a log pile for Driftwood, wheat rows for Planter Raft, a windmill/smokehouse/drying-rack silhouette for boosters). Boosters get a thin gold trim (`#e0b84b`) around the top face to visually distinguish them from producers.

**Locked tiles**: rendered as open water — a faint dashed hex outline (`#bcd8e8` at low opacity) and a small floating buoy marker, no raft geometry. Tiles that are currently eligible (requirement met but not yet clicked) get a soft pulsing glow on the dashed outline.

**Water background**: a vertical blue gradient (`#1b4965` → `#2e6f95`) covering the canvas, with a few slow-drifting lighter streaks/highlights (`#5fa8d3`, low opacity) animated via `requestAnimationFrame` for subtle shimmer — decorative only, no gameplay effect.

**Hit-testing**: canvas clicks are converted from screen space back to the pre-squash hex-grid space (invert the `scaleY` transform, then invert the axial/offset formulas to the nearest `(row, col)`), then checked against that cell's actual hex path for containment.

## 7. Game loop

`requestAnimationFrame`-driven loop in `js/main.js`:
1. Compute `dt` (seconds since last frame, clamped to avoid huge jumps if the tab was backgrounded).
2. `state.tick(dt)` — apply `effectiveRate(resource, unlocked) * dt` to each resource's current + lifetime totals.
3. Recompute eligibility for all locked tiles; update "ready" set.
4. `ui.update(state)` — refresh the resource bar and, if open, the tile info panel.
5. `render.draw(state, tiles)` — redraw the full scene (grid + water animation).
6. Autosave check (every ~10s of elapsed play time) — write state to `localStorage`.

Input handling (also in `main.js`): canvas `click` → hit-test → open/close tile panel via `ui.js`. Panel's "Unlock" button click → validate eligibility again (defensive), apply cost deduction or milestone unlock, add tile id to `state.unlocked`, save immediately, close or refresh panel.

## 8. UI

- **Resource bar** (top of screen): four icon+count pairs (Fish, Kelp, Driftwood, Crops), live-updating, styled as a clean horizontal row (dark translucent navy background `#10263a` at ~90% opacity, cream text `#f4ead2`).
- **Tile info panel** (bottom or side, toggled by clicking a tile): tile name, resource/boost icon, current effective rate (unlocked tiles) or requirement + live progress bar (locked tiles), and an "Unlock" button (disabled/hidden until eligible).
- No settings menu, no sound toggle (nothing to toggle), no accounts.

## 9. Persistence

- Autosave triggers: on every successful unlock, every ~10 seconds of elapsed play time, and on `beforeunload`.
- Load-on-start: attempt to read + parse `driftaway_save_v1` from `localStorage`; fall back to a fresh game state if missing or unparsable (corrupt save is treated as no save, not an error state).
- No versioned migration logic beyond the `version: 1` field — out of scope until a save format change actually happens.

## 10. File structure

```
drift-away/
  index.html              # canvas + UI shell
  style.css               # layout, resource bar, tile panel styling
  README.md               # what it is, how to run it, controls
  memory-bank/
    project-overview.md   # concept, current status, key decisions
    tile-design.md        # the tile table above + balance notes, kept up to date as tuned
    architecture-notes.md # module responsibilities, data flow
  js/
    tiles.js              # the 25 tile definitions (data only)
    state.js               # state shape, tick(), effectiveRate(), isEligible(), save/load
    render.js              # hex grid math, drawing, water animation
    ui.js                  # resource bar + tile panel DOM updates
    main.js                # game loop wiring, input handling
  tests/
    economy.test.mjs       # plain Node `assert` checks for tick/effectiveRate/isEligible
  docs/
    superpowers/specs/
      2026-09-02-drift-away-design.md   # this file
```

## 11. Testing / verification

No test framework or build step. `state.js`'s core math (`tick`, `effectiveRate`, `isEligible`) is kept DOM-free so `tests/economy.test.mjs` can exercise it directly with Node's built-in `assert` (`node tests/economy.test.mjs`) — fast regression check with zero dependencies. Everything involving rendering, input, and the actual feel of play is verified by running the game in a browser and exercising the full loop end-to-end (tick rates, clicking to unlock both cost- and milestone-gated tiles, boosters affecting the right resource, save/reload restoring state correctly) before considering any implementation step done.
