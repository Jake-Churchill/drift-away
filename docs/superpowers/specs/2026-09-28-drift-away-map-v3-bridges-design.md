# Map v3: Open Connectors and Plank Bridges — Design Spec

## Overview

Two changes to the v2 map (see `2026-09-24-drift-away-map-rework-v2-design.md`), both about the
tiles *between* producer/booster/generator clusters, not the clusters themselves:

1. **Every possible connector hex within a biome becomes a real, buyable blank tile.** Today, a
   biome's blanks are a minimal shortest-path tree (plus 6 loop edges) — most hex positions that
   *could* bridge two neighbouring clusters are just permanent, unusable water. In v3, every one of
   those positions is a purchasable blank, roughly doubling the blank count per biome and giving
   players real path choice instead of one prescribed route.
2. **A new `bridge` tile — a straight line of hexes, built as a plank bridge — replaces the chain
   of individual blanks that currently connects one biome to the next, as a single purchase.** It
   costs resources
   from the biome you're leaving (not the one you're entering), priced as a flat, one-time,
   un-leveled milestone purchase, more expensive for a deeper crossing than an earlier one.

Clusters (144 of them: producers, boosters, generators, their positions, art and costs) are
**untouched**. This is a rework of the connective tissue only.

## Goals

- Replace the sparse connector tree with full connectivity: every hex touching two neighbouring
  cluster slots is a real tile.
- Give inter-biome crossings their own distinct, bigger, purpose-built tile — visually and
  mechanically different from an ordinary blank — themed as a plank bridge.
- Keep the crossing's cost tied to the biome the player is leaving, so it reads as "spend what
  you've already earned to reach the next place," and make later crossings cost more than earlier
  ones (matching how later zones already cost more today).

## Non-goals

- No changes to cluster positions, art, costs, or levels.
- No changes to the existing in-biome blank costs (Home Waters `{driftwood:12}`, Frozen Reach
  `{driftwood:1200,crops:800}`, Timberline `{driftwood:1800,crops:1200,kelp:900}`, Abyssal
  `{planks:60,kelp_rope:40}`) — those still apply to every ordinary blank, including the new ones
  added by rule 1. Only the dedicated inter-biome bridge tile gets the new source-biome cost.
- No deep balance simulation. Every number below is first-pass and unsimulated, the same caveat
  every earlier zone's costs carry.
- No changes to the existing two-part Abyssal gate (its clusters and blanks still separately
  require `planks`/`kelp_rope` from Timberline) — the new Frozen→Abyssal bridge sits in front of
  that gate, it doesn't replace it.

## Design

### 1. Dense in-biome connectors

Today: within a biome, blanks are a shortest-path tree from the entry slot plus 6 extra loop edges
(the `2026-09-24` spec's own words). In v3: for every pair of cluster slots that are exactly two
hexes apart (i.e. every pair the lattice allows to be bridged at all — the spec's own geometric
rule is that neighbouring slots are exactly two hexes apart with exactly one hex touching both),
that one hex becomes a real blank tile, whether or not it was on the old tree.

This roughly doubles blank counts (today: 41/45/45/46 per zone). It doesn't change blank costs
(rule above): a new connector blank costs exactly what every other blank in its zone costs.

Clusters, their `cells`, ids, costs and art stay byte-identical; only the *set of blanks* grows.

### 2. The Bridge tile

A new `kind: 'bridge'`, modeled exactly like a cluster is: one tile object, one `cells` array, one
`unlock.cost` — never several separate tiles chained together the way today's multi-blank corridors
are several separate purchases. Structurally its own thing, not a variant of `kind: 'blank'`:

- **Shape**: a straight line of hexes (an "I" shape), oriented along whichever direction actually
  points from the departing biome's edge toward the arriving biome's entry slot for that specific
  crossing. Its length is whatever that crossing's corridor already needs — 4 or 5 hexes today, not
  forced to a fixed count — because the whole point is one tile, one cost, for the whole crossing,
  not a fixed-size piece repeated until the gap is covered. (Clusters are always a 3-hex "up"
  triangle; blanks are always 1 hex; a bridge is a straight line whose length is set once per
  crossing — three unambiguous silhouettes on sight.) **This changed from the "always exactly 3
  hexes" shape in the version you first approved** — flag it if you actually want every bridge to be
  a fixed 3-hex piece with multiple purchases per crossing instead.
- **No levels.** `getLevel` returns `MAX_LEVEL` for `kind: 'bridge'`, the same rule that already
  applies to blanks: bought once, instantly at full "level," nothing to level up. This was an
  explicit call from you: a bridge is a milestone gate, not a resource sink to invest further in.
- **No production.** Like a blank, it produces nothing and never appears in any rate/darken/booster
  logic.
- **Cost:** resources from the biome being left, not the one being entered (see Costs below).
- **Art:** a plank bridge — a wooden plank walkway spanning the full line of hexes, rope railings
  down both sides, simple corner posts at each end. Visually distinct from both a cluster's building and
  a blank's plain raft tint. Exact geometry is an implementation detail for the plan, not this spec.

### 3. Where bridges replace today's corridors

Today, the three inter-biome crossings (Home Waters→Frozen Reach, Home Waters→Timberline Coast,
Frozen Reach→Abyssal Trench) are each a corridor of 4 or 5 individual single-hex blanks, each its
own separate purchase. In v3, **each crossing becomes exactly one Bridge tile**, its `cells`
covering the same hexes that corridor already occupies (so biome positions don't move at all) —
one purchase instead of 4 or 5. No rounding, no chaining, no resizing the map.

Each Bridge tile's `zone` field is the *destination* zone (matching how today's corridor blanks are
already zoned to the zone they lead into — this is what already makes the destination zone "open"
for cloud-reveal purposes the moment its first crossing tile is unlocked, identical to today's
behaviour with multi-blank corridors).

## Costs (first-pass, unsimulated, like every earlier number in this project)

| Crossing | Leaving | Entering | Cost (the whole crossing, one purchase) |
|---|---|---|---|
| Home Waters → Frozen Reach | zone1 | zone2 | `{driftwood: 1500, crops: 900}` |
| Home Waters → Timberline Coast | zone1 | zone3 | `{driftwood: 1500, crops: 900}` |
| Frozen Reach → Abyssal Trench | zone2 | zone4 | `{driftwood: 60000, crops: 36000}` |

The two Home-originating crossings are priced identically (both leave the same biome with the same
resource mix); the Frozen→Abyssal crossing costs roughly 40x more, mirroring how Frozen Reach's own
blank cost is roughly 100x Home Waters' blank cost — a deeper crossing should feel like a bigger
milestone. Every number here is a first-pass placeholder, the same as the original blank/cluster
costs were when each zone shipped.

## Save compatibility

Blank/bridge tile ids across the whole map change (many new connector blanks, each corridor
replaced by one bridge tile). Cluster ids, costs and positions do not change. Per the precedent set by the
v2 map rework: this needs another hard reset. `SAVE_VERSION` bumps from 2 to 3, and the save key
becomes `driftaway_save_v3` (leaving the v2 key untouched in storage, same pattern as v1→v2).

## Testing implications

- Every `kind: 'bridge'` tile's `cells` are collinear (each consecutive pair is a hex step in the
  same direction) — the structural check that distinguishes it from a cluster (3 cells, "up"
  triangle) or a blank (1 cell). Unlike a cluster, a bridge's cell *count* isn't fixed — it matches
  whatever that one crossing needs.
- There are exactly 3 `kind: 'bridge'` tiles on the whole map (one per crossing), each with exactly
  one `unlock.cost` — never split across multiple tiles for the same crossing.
- `getLevel` returns `MAX_LEVEL` for `kind: 'bridge'`, same as `kind: 'blank'`.
- A bridge tile never appears in `RATE_TILES`'s production loops, `generatorTiles`, `boosterIsIdle`'s
  `SOURCE_TILES`, or any darken/lit logic — it behaves like a blank everywhere except its own shape,
  name and cost.
- Every bridge tile's unlock cost matches its crossing's table above exactly, and uses only the
  departing zone's resources (never a resource from the zone it leads into).
- Every zone's ordinary (non-bridge) blanks still cost exactly what they cost today — the dense new
  connectors don't introduce a new cost tier.
- Existing structural checks (every non-blank/non-bridge tile is 3 mutually-adjacent hexes; every
  ordinary blank in a zone shares one cost object; the Abyssal two-part gate) continue to hold.
- Total tile/hex counts, and the corridor test pinning "zone 3 doesn't touch zone 2," need
  updating to the new numbers once the codemod runs.

## Open items for the implementation plan (not decided here)

- Exact plank-bridge geometry (this spec only sets the visual direction: plank walkway + rope rails
  + end posts).
- Bridge tile display names (candidates: one generic "Plank Bridge" for all three, matching how
  blanks share one name per zone; or destination-specific, e.g. "Plank Bridge to Frozen Reach" —
  there are only 3 bridge tiles on the whole map, one per crossing, so unique naming costs nothing).
- The precise new connector-blank positions and corridor rerouting are produced by a new one-shot
  deterministic codemod, the same approach `tools/build-map-v2.mjs` used (written for this change,
  deleted after use) — not hand-authored.
