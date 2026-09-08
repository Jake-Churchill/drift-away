# Drift Away — Project Overview

## Concept

An idle/incremental farming game on the open sea. A fixed 6×6 grid (36 slots) of hexagonal raft tiles, rendered in a 2.5D pseudo-isometric style. Four resources (fish, kelp, driftwood, crops); tiles either produce one of them over time or boost another tile family's output raft-wide. All 36 tile identities and positions are fixed in `js/tiles.js` — there's no player choice of *what* to place, only *which already-defined slot* to unlock next.

## Status

MVP complete per `docs/superpowers/specs/2026-09-02-drift-away-design.md`: full 36-tile economy, Three.js hex rendering with raft depth/props, click-to-unlock flow (cost- or milestone-gated, plus grid adjacency), localStorage persistence, deployed to GitHub Pages.

## Key decisions and why

- **Active-only ticking, no offline progress** — deliberate scope cut to keep the first version simple; see spec §1 non-goals.
- **Fixed grid, not freeform placement** — every slot's tile identity and unlock requirement is predetermined; placement is cosmetic (families are grouped by quadrant) since boosters are grid-wide, not adjacency-based.
- **Hexagons over the original octagon idea** — hexagons tile the plane edge-to-edge with no infill shapes needed, which is why the design changed mid-brainstorm from octagons to hexagons.
- **ES modules + a one-line `package.json`** — lets the exact same `import`/`export` syntax run in the browser (`<script type="module">`) and in Node (for `tests/economy.test.mjs`), with zero bundler. Trade-off: local dev needs a static file server instead of double-clicking `index.html`, because browsers block ES module loads over `file://`. Production (GitHub Pages) always serves over `https://`, so this only affects local dev ergonomics.
- **Public repo, GitHub Pages deploy to `driftaway.jakechurchill.com`** — see `docs/superpowers/specs/2026-09-02-drift-away-design.md` §12 for the deploy mechanics (Pages source = `main` branch root, `CNAME` file, DNS is external/manual).

## Where things live

See `memory-bank/architecture-notes.md` for module responsibilities and `memory-bank/tile-design.md` for the full tile table and balance notes.
