# Prestige Tree — Design Spec

## Overview

Two changes to prestige, decided together because the second only makes sense once the first
removes the thing standing in its way:

1. **Prestige loses its all-or-nothing gate.** Today `doPrestige` refuses to run at all unless
   `isFullyComplete(state)` — literally every one of the 492 tiles maxed. In practice this means
   prestige is not a repeatable strategic choice, it is a single end-of-game reward. The gate is
   replaced with a much smaller floor: enough lifetime production to have actually earned at least
   one prestige token.
2. **What tokens buy becomes a branching, persistent tree**, replacing today's flat "Prestige
   Store" list (a plain scrollable list of 8 rows: 7 resources + Head Start) and absorbing three
   items out of the gold-funded Harbor Shop (Deeper Hold, Steady Tides, Ballast) that conceptually
   belong with the other permanent, prestige-funded upgrades. The Harbor Shop still exists, but
   narrows to cosmetics only (palettes), still bought with gold from achievements.

## Goals

- Let players prestige whenever it's worth it to them, not only after fully clearing the map.
- Give the four kinds of persistent, token-funded upgrade (per-resource production, comfort,
  efficiency, head start) one coherent screen with real branching, instead of a flat list plus a
  separate shop screen that happens to also survive resets.
- Keep the fast, familiar buy interaction (tap once, hold to repeat) for every upgrade that has a
  quantity, exactly as it works today.
- Change as little of the underlying math as possible: every existing cost formula and tier table
  carries over unchanged, just relocated and (for three items) repriced from gold to tokens.

## Non-goals

- No rebalancing of any existing cost, percentage, or tier number. `PRESTIGE_UPGRADE_BASE_COST`,
  `PRESTIGE_UPGRADE_PERCENT`, `headStartCost`, `HOLD_COSTS`, `TIDES_COSTS`, `ballastCost` all keep
  their current formulas and constants — first-pass and unsimulated, the same caveat every other
  number in this project carries.
- No change to how tokens are earned (`prestigeTokensEarned` keeps its exact formula: floor of
  total lifetime resources across all 7 `RESOURCES`, divided by `PRESTIGE_TOKEN_DIVISOR` = 1000).
- No change to `grantHeadStart`'s free-tile-selection logic, or to any tile/map data.
- No change to the achievement list, including "Drift Away Complete" (`isFullyComplete`) — it
  keeps firing exactly as it does today. It's no longer required for prestige, but stays a real,
  recognized milestone.
- The Harbor Shop's palette mechanics (`buyShopItem`'s `palette:*` branch, `PALETTES`) are
  untouched — only the rows for `hold`, `tides`, and `ballast` leave that screen.

## Known-good facts (verified against the live `js/state.js` before writing this spec)

- `doPrestige` (line 455): `if (!isFullyComplete(state)) return null;` is the entire gate.
- `prestigeTokensEarned` (line 450): `Math.floor(RESOURCES.reduce((sum,r)=>sum+state.lifetime[r],0) / PRESTIGE_TOKEN_DIVISOR)`, `PRESTIGE_TOKEN_DIVISOR = 1000`.
- `createInitialPrestige` (line 55): `{ tokens: 0, upgrades: Object.fromEntries(RESOURCES.map(r=>[r,0])), headStart: 0, count: 0 }`.
- `createInitialShop` (line 60): `{ holdLevel: 0, tidesLevel: 0, palette: 'default', palettes: [], ballast: 0 }`.
- Per-resource upgrade: `PRESTIGE_UPGRADE_BASE_COST = 5`, `PRESTIGE_UPGRADE_PERCENT = 10`,
  `prestigeUpgradeCost(count) = 5*(count+1)`, applied in `buyPrestigeUpgrade(state, resource)`.
  Uncapped. Read by `effectiveRate`/`effectiveTileRate` via `prestigeUpgrades[resource]`.
- Head Start: `HEAD_START_MAX_LEVEL = 10`, `HEAD_START_TILES_PER_LEVEL = 2`,
  `headStartCost(level) = 20*(level+1)`, spent via `buyHeadStart`. Capped at 10.
- Deeper Hold: `HOLD_COSTS = [6, 12, 20]` (gold today), `OFFLINE_CAP_HOURS = [8, 12, 16, 24]`
  (index 0 is the un-upgraded cap). 3 purchases to max, read via `offlineCapSeconds`
  (`OFFLINE_CAP_HOURS[state.shop.holdLevel] * 3600`).
- Steady Tides: `TIDES_COSTS = [8, 16]` (gold today), `OFFLINE_RATES = [0.5, 0.65, 0.8]`. 2
  purchases to max, read via `offlineRate` (`OFFLINE_RATES[state.shop.tidesLevel]`).
- Ballast: `ballastCost(state) = 4 + 2*state.shop.ballast` (gold today), uncapped, +1% to all
  production per level, read via `stateRate`'s `state.shop.ballast` argument to `effectiveRate`.
- The existing "tap once, hold to repeat" interaction (`js/ui.js:747-777`,
  `wireHoldToRepeat`/`wireQuickBuyButtons`): tap fires immediately, holding past 400ms repeats
  every 90ms; wired today to +1/+5/+10 buttons on each of the 7 resource rows and the Head Start
  row in the flat Prestige Store. `buyShopItem`'s `hold`/`tides` purchases have no quantity concept
  today (one discrete tier per click) — this spec keeps that distinction.
- Call sites that read `state.shop.holdLevel` / `state.shop.tidesLevel` / `state.shop.ballast`
  today, all of which move to `state.prestige.*` under this spec: `offlineCapSeconds` (676),
  `offlineRate` (680), `stateRate` (137), `shopCatalog`/`buyShopItem` (528-600),
  `normalizeSave`'s clamps (846-847), `doPrestige`'s shop copy-forward (465).

## Design

### 1. The new prestige gate

`doPrestige` drops `isFullyComplete` and instead requires `prestigeTokensEarned(state) >= 1` —
equivalently, at least 1,000 total lifetime resources, since that's exactly what
`PRESTIGE_TOKEN_DIVISOR` already means. The Prestige button in the UI is disabled below this
floor (mirroring how it's disabled today while incomplete), and enabled the moment a run has
earned its first token. This ties the floor to a constant that already exists and already means
"you'd get nothing for prestiging now" — no new magic number.

Everything else about `doPrestige` is unchanged: it still computes `tokensEarned`, still calls
`createInitialState()` for the reset, still carries forward `achievements`, `gold`, and (as
today) copies the persistent parts of `prestige` and `shop` forward explicitly.

### 2. Data model: `state.shop` shrinks, `state.prestige` grows

`state.shop` keeps only what's genuinely a look, not a permanent power-up:

```js
export function createInitialShop() {
  return { palette: 'default', palettes: [] };
}
```

`state.prestige` gains three fields, renamed to match the existing `headStart` convention (no
`Level` suffix):

```js
export function createInitialPrestige() {
  return {
    tokens: 0,
    upgrades: Object.fromEntries(RESOURCES.map((r) => [r, 0])),
    headStart: 0,
    hold: 0,    // was shop.holdLevel
    tides: 0,   // was shop.tidesLevel
    ballast: 0, // was shop.ballast
    count: 0,
  };
}
```

`HOLD_COSTS`, `TIDES_COSTS`, `ballastCost` keep their exact formulas — they now price in tokens
instead of gold, spent from `state.prestige.tokens` instead of `state.gold`, but the numbers
themselves (6/12/20, 8/16, 4+2n) are unchanged, per the Non-goals above.

`offlineCapSeconds`, `offlineRate`, and `stateRate`'s ballast argument switch from reading
`state.shop.{holdLevel,tidesLevel,ballast}` to `state.prestige.{hold,tides,ballast}`.
`buyShopItem`'s `hold`/`tides`/`ballast` branches and `shopCatalog`'s corresponding rows are
removed from the shop functions entirely and become part of the new tree's purchase/catalog
functions (named in the implementation plan — this spec fixes behavior, not function names).

### 3. Save migration: no version bump, a field-relocation migration instead

Unlike the map-v3 bridges rework, this change touches no tile ids and no map geometry — it only
moves three numbers from one sub-object to another and renames them. `SAVE_VERSION` stays 3.
Instead, `normalizeSave` gains a small migration step: when a parsed save's `shop` object still
has `holdLevel`/`tidesLevel`/`ballast` (the old shape), copy each into the corresponding
`prestige.hold`/`prestige.tides`/`prestige.ballast` field before applying `state.prestige`'s
normal defaults-merge, so a player who already bought comfort or ballast tiers with gold keeps
them — they just become token-tracked going forward. A save that already has the new shape (no
`shop.holdLevel`) is left alone. This is safe because the tiers and their effects are identical;
only their storage location and currency changed.

### 4. The tree itself

Four branches, all reachable directly (no branch requires another branch), rendered as a real
node graph with connector lines — replacing the flat Prestige Store screen inside the existing
`#prestige-overlay`. Clicking a node opens a small detail panel below the tree (name, current
level/tier, effect so far, next cost, and its buy control), the same interaction pattern the map
already uses for tiles (click → panel). The compact tree view itself shows only enough per node to
convey its state (icon, short label, current level/tier) — detail and controls live in the panel,
never crammed into the node itself.

- **Production** (fans into 7 parallel lanes, one per `RESOURCES` entry: fish, kelp, driftwood,
  crops, planks, kelp_rope, bread). Each lane is `buyPrestigeUpgrade`'s existing mechanic exactly:
  uncapped, +10% per level, cost `5*(level+1)` tokens. No lane requires another — this matches how
  they're already fully independent today. Each lane's detail panel keeps the +1/+5/+10
  hold-to-repeat buttons exactly as today's resource rows.
- **Comfort**: Deeper Hold (3 tiers, `HOLD_COSTS`, unchanged effect on `OFFLINE_CAP_HOURS`) sits
  above Steady Tides (2 tiers, `TIDES_COSTS`, unchanged effect on `OFFLINE_RATES`) — Steady Tides'
  first tier is locked until Deeper Hold reaches tier 3 of 3. This is the one place this spec adds
  a dependency that doesn't exist today (Hold and Tides are currently independent gold purchases).
  Both keep a single "buy next tier" button per tier — no quantity, matching today's `buyShopItem`
  behavior for these two.
- **Efficiency**: Ballast, a single uncapped repeatable node (`ballastCost`, unchanged formula, +1%
  all production per level). Its detail panel keeps the +1/+5/+10 hold-to-repeat buttons, matching
  today's Ballast row... except today Ballast has no +1/+5/+10 in the Harbor Shop (it's a single
  buy button there, `shopCatalog`'s ballast row has no quantity buttons). To match the other
  uncapped nodes' interaction (and because "keep the ability to hold down click to upgrade
  quicker" was an explicit requirement), Ballast's tree node gains the same +1/+5/+10 hold-to-repeat
  controls as Production and Head Start, even though its Shop row didn't have them before. Flagging
  this as a small interaction upgrade, not a carryover — call it out if you'd rather Ballast stay a
  single-buy node like Hold/Tides.
- **Head Start**: unchanged mechanically (`headStartCost`, `HEAD_START_MAX_LEVEL` = 10,
  `HEAD_START_TILES_PER_LEVEL` = 2, `grantHeadStart`'s free-tile logic). Its detail panel keeps the
  existing +1/+5/+10 hold-to-repeat buttons.

A small always-visible root node anchors the four branches visually; it is not purchasable.

### 5. The Harbor Shop, after

Keeps its name, its gold currency, and its achievements-fed balance, but `shopCatalog` now returns
only the palette rows (`Classic` plus every entry in `PALETTES`). `buyShopItem` drops its `hold`,
`tides`, and `ballast` branches (moved to the tree's own purchase function). No change to
`PALETTES`, palette switching, or how gold is earned.

## Costs (first-pass, unsimulated, like every other number in this project)

| Node | Formula | Currency (before → after) |
|---|---|---|
| Production (×7 resources) | `5*(level+1)` tokens/level, +10%/level | tokens → tokens (unchanged) |
| Deeper Hold (3 tiers) | `[6,12,20]` | gold → tokens |
| Steady Tides (2 tiers) | `[8,16]` | gold → tokens |
| Ballast | `4+2*level` | gold → tokens |
| Head Start (10 tiers) | `20*(level+1)` | tokens → tokens (unchanged) |
| Prestige floor | `prestigeTokensEarned(state) >= 1` | n/a (new; was `isFullyComplete`) |

## Testing implications

- `doPrestige` returns a valid reset once lifetime resources reach 1000 total, and still returns
  `null` below that floor, regardless of `isFullyComplete`.
- `isFullyComplete`/the "Drift Away Complete" achievement still fires independently of prestige
  eligibility — completing the map with prestige never yet available (impossible pre-1000, but the
  achievement condition itself doesn't reference tokens) and prestiging long before completion are
  both valid, independently testable states.
- Every existing per-resource upgrade, Head Start, Hold, Tides, and Ballast test needs its state
  path updated (`state.shop.holdLevel` → `state.prestige.hold`, etc.) but not its expected values —
  the tiers, costs, and effects are pinned to the same numbers as today.
- Steady Tides' first tier is only purchasable once Deeper Hold is at tier 3 — this needs a new
  test that doesn't exist today (the dependency is new).
- The `normalizeSave` migration needs a test loading a save shaped with the OLD `shop.holdLevel`/
  `tidesLevel`/`ballast` fields and confirming they land in `prestige.hold`/`tides`/`ballast`
  correctly, alongside a test confirming a save already in the new shape is untouched.
- `shopCatalog`'s row count drops from 4 categories to 1 (palettes only); existing shop tests
  asserting on `hold`/`tides`/`ballast` rows need to move to whatever the tree's new catalog
  function is called.

## Open items for the implementation plan (not decided here)

- Exact names for the new tree's purchase/catalog functions and DOM structure (this spec fixes
  behavior — node set, gating, costs, currency — not identifiers).
- Exact tree layout/geometry (the branch shapes shown during design were illustrative; the plan can
  adjust spacing/arrangement freely as long as the four branches and their internal gating match
  this spec).
- Whether Ballast's new +1/+5/+10 controls (a small interaction upgrade over today's single-buy
  Shop row, noted in Design section 4) are wanted, or whether Ballast should stay a single-buy node
  like Hold/Tides instead.

## Known limitations

- The Hold/Tides/Ballast token prices (6/12/20, 8/16, 4+2n) were sized for gold, which is earned
  far more slowly (achievements only, ~137 gold total across 39 achievements) than tokens, which
  scale with lifetime production and are earned repeatedly across prestiges. Carried over unchanged
  per this spec's Non-goals, but they will almost certainly read as trivially cheap in token terms
  once real playtesting happens — the same "first-pass, unsimulated" caveat every earlier number in
  this project carries, flagged explicitly here because the currency change makes it more likely to
  matter soon rather than eventually.
- No deep balance simulation of how quickly a player can now prestige repeatedly at low token
  counts, or whether the new floor (1000 lifetime resources) is meaningfully above "an accidental
  first click."
