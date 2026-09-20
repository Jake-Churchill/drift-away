# Drift Away — Project Overview

## Concept

An idle/incremental farming game on the open sea. Two zones of hexagonal raft tiles, each a fixed 6×6 grid (36 slots), side by side: Home Waters, then the Frozen Reach to its east (72 tiles total), rendered in a 2.5D pseudo-isometric style. Four resources (fish, kelp, driftwood, crops); tiles either produce one of them over time or boost another tile family's output raft-wide. All 72 tile identities and positions are fixed in `js/tiles.js` — there's no player choice of *what* to place, only *which already-defined slot* to unlock next.

## Status

The original MVP (`docs/superpowers/specs/2026-09-02-drift-away-design.md`) has since grown: per-tile levels 1–3, achievements (gold rewards), prestige (tokens and production upgrades, available once every tile is maxed), capped offline progress, sound, and a second zone (`docs/superpowers/specs/2026-09-16-drift-away-multi-level-expansion-design.md`). Three.js hex rendering with raft depth/props, click-to-unlock flow (cost- or milestone-gated, plus grid adjacency), localStorage persistence, deployed to GitHub Pages.

## Key decisions and why

- **Offline progress is capped and discounted** — `applyOfflineProgress` grants 50% of the production rate for at most 8 hours away (ignored under a minute). The MVP was active-only; this replaced it.
- **Fixed grid, not freeform placement** — every slot's tile identity and unlock requirement is predetermined; placement is cosmetic (the layout was deliberately shuffled so families aren't grouped) since boosters are raft-wide, not adjacency-based.
- **Zones extend the grid rather than replacing it** — zone 2 sits at cols 6–11 and is discovered by ordinary adjacency across the col 5/col 6 border, its tiles cost ×90 (started at ×15, then ×6 after a simulated run showed zone 2 finishing in about 2 minutes) and produce ×4 what their zone-1 mirrors do, and it resets on prestige like everything else. Fog of war is the existing `isDiscovered` rule plus a purely visual cloud field (`js/clouds.js`) covering everything outside the open zones. See `memory-bank/tile-design.md`.
- **Hexagons over the original octagon idea** — hexagons tile the plane edge-to-edge with no infill shapes needed, which is why the design changed mid-brainstorm from octagons to hexagons.
- **ES modules + a one-line `package.json`** — lets the exact same `import`/`export` syntax run in the browser (`<script type="module">`) and in Node (for `tests/economy.test.mjs`), with zero bundler. Trade-off: local dev needs a static file server instead of double-clicking `index.html`, because browsers block ES module loads over `file://`. Production (GitHub Pages) always serves over `https://`, so this only affects local dev ergonomics.
- **Public repo, GitHub Pages deploy to `driftaway.jakechurchill.com`** — see `docs/superpowers/specs/2026-09-02-drift-away-design.md` §12 for the deploy mechanics (Pages source = `main` branch root, `CNAME` file, DNS is external/manual).

## Where things live

See `memory-bank/architecture-notes.md` for module responsibilities and `memory-bank/tile-design.md` for the full tile table and balance notes.
