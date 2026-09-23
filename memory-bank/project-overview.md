# Drift Away — Project Overview

## Concept

An idle/incremental farming game on the open sea. Three zones of hexagonal raft tiles, each a fixed 6×6 grid (36 slots), side by side: Home Waters, the Frozen Reach, then the Abyssal Trench (108 tiles total), rendered in a 2.5D pseudo-isometric style. Four resources (fish, kelp, driftwood, crops); tiles either produce one of them over time or boost another tile family's output raft-wide. All 108 tile identities and positions are fixed in `js/tiles.js` — there's no player choice of *what* to place, only *which already-defined slot* to unlock next.

## Status

The original MVP (`docs/superpowers/specs/2026-09-02-drift-away-design.md`) has since grown: per-tile levels 1–3, achievements (gold rewards), prestige (tokens and production upgrades, available once every tile is maxed), capped offline progress, sound, a second zone (`docs/superpowers/specs/2026-09-16-drift-away-multi-level-expansion-design.md`), and a third (`docs/superpowers/specs/2026-09-23-drift-away-zone3-design.md`) that also adds the game's first non-cosmetic zone-specific mechanic: bioluminescence. Three.js hex rendering with raft depth/props, click-to-unlock flow (cost- or milestone-gated, plus grid adjacency), localStorage persistence, deployed to GitHub Pages.

## Key decisions and why

- **Offline progress is capped and discounted** — `applyOfflineProgress` grants 50% of the production rate for at most 8 hours away (ignored under a minute). The MVP was active-only; this replaced it.
- **Fixed grid, not freeform placement** — every slot's tile identity and unlock requirement is predetermined; placement is cosmetic (the layout was deliberately shuffled so families aren't grouped) since boosters are raft-wide, not adjacency-based.
- **Zones extend the grid rather than replacing it** — zone 2 sits at cols 6–11 and is discovered by ordinary adjacency across the col 5/col 6 border, its tiles cost ×90 (started at ×15, then ×6 after a simulated run showed zone 2 finishing in about 2 minutes) and produce ×4 what their zone-1 mirrors do; zone 3 sits at cols 12–17, discovered the same way at the col 11/col 12 border, and applies that same ×90/×4 ratio again on top of zone 2's own numbers (a first-pass choice, not yet simulated — see the zone-3 spec). All of it resets on prestige like everything else. Fog of war is the existing `isDiscovered` rule plus a purely visual cloud field (`js/clouds.js`) covering everything outside the open zones, already written generically over however many zones exist. See `memory-bank/tile-design.md`.
- **Zone 3 adds one real mechanic, not just a reskin** — bioluminescence: a zone-3 producer runs at half rate until a zone-3 booster is unlocked hex-adjacent to it (`isLit` in `js/state.js`, folded into `effectiveTileRate`/`effectiveRate`/`rateBreakdown` as one more multiplier, so the HUD/ETA/offline-progress paths need no separate handling). It's the first time in the game that *where* you unlock something, not just *that* you unlock it, changes the outcome.
- **Hexagons over the original octagon idea** — hexagons tile the plane edge-to-edge with no infill shapes needed, which is why the design changed mid-brainstorm from octagons to hexagons.
- **ES modules + a one-line `package.json`** — lets the exact same `import`/`export` syntax run in the browser (`<script type="module">`) and in Node (for `tests/economy.test.mjs`), with zero bundler. Trade-off: local dev needs a static file server instead of double-clicking `index.html`, because browsers block ES module loads over `file://`. Production (GitHub Pages) always serves over `https://`, so this only affects local dev ergonomics.
- **Public repo, GitHub Pages deploy to `driftaway.jakechurchill.com`** — see `docs/superpowers/specs/2026-09-02-drift-away-design.md` §12 for the deploy mechanics (Pages source = `main` branch root, `CNAME` file, DNS is external/manual).

## Where things live

See `memory-bank/architecture-notes.md` for module responsibilities and `memory-bank/tile-design.md` for the full tile table and balance notes.
