# Tile Design

All 72 tiles are defined in `js/tiles.js`: 36 per zone, each zone a 6×6 hex grid, placed side by side. Zone 1 ("Home Waters") is cols 0–5; zone 2 ("Frozen Reach") is cols 6–11. Every tile has a `zone` field (`zone1`/`zone2`); zone metadata (name, raft color) lives in `js/zones.js`. Within a zone, families are scattered rather than grouped (the layout was shuffled after the first version). This is a first-pass balance — not playtested — expect to retune specific numbers after actually playing it.

There is exactly one starting tile, `driftwood_start` (unlock type `start`); every other tile's `unlock` field is a `cost` or `milestone` requirement as shown below. But meeting that requirement isn't sufficient by itself: a tile can only be unlocked once it's also adjacent (on the hex grid) to a tile that's already unlocked. That adjacency requirement is derived from `gridPos` in `js/tiles.js` (see `TILE_NEIGHBORS`) and isn't repeated per-row below — assume it applies to every non-start tile in these tables.

## Zone 2 rules (how it relates to zone 1)

Every zone-2 tile mirrors one zone-1 tile: id prefixed `frozen_` (`fish_start` → `frozen_fish_start`), same family/kind/`produces`, `gridPos` shifted +6 columns, re-themed name. Numbers scale from the mirror:

- unlock `cost` amounts and milestone `target`s: **×15** (spending resources from zone 1's economy)
- producer `rate` and booster `percent`: **×4**
- one exception: `frozen_driftwood_start` is a normal `cost` tile (600 crops), not `start`, because the game has exactly one `start` tile.

Zone 2 is entered through the col 5 / col 6 border: same-row `col ± 1` neighbors are always adjacent, so unlocking a zone-1 border tile discovers the zone-2 tile next to it, with no zone-specific gating code. Zone 2 resets with everything else on prestige.

`tests/economy.test.mjs` pins the ×15/×4 relationship across all 36 pairs — if you deliberately retune zone 2, update the constants in the "zone-2 economy multiplier tests" section too.

Known balance quirk (accepted, not a bug): level-up cost derives from `rate`/`percent` (see the end of this page), so zone-2 level-ups cost only ~4× zone 1's while unlocks cost 15×. Level-ups are cheap relative to unlocks in zone 2.

## Zone 1 — Home Waters

### Fish (8 — base resource: fish)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `fish_start` | Fishing Raft | 0,1 | 1 | cost: 50 driftwood + 40 crops |
| `fish_anchored_net` | Anchored Net | 0,4 | 1 | cost: 60 driftwood + 50 crops |
| `fish_trawling_raft` | Trawling Raft | 2,4 | 1.2 | cost: 25 driftwood |
| `fish_tide_pool_trap` | Tide Pool Trap | 5,2 | 1.2 | milestone: lifetime crops ≥ 250 |
| `fish_deep_sea_longline` | Deep-Sea Longline | 1,5 | 1.5 | cost: 60 fish + 40 driftwood |
| `fish_grand_fishery` | Grand Fishery | 3,0 | 2 | cost: 70 kelp + 50 crops |
| `fish_open_ocean_trawler` | Open-Ocean Trawler | 0,3 | 1.8 | milestone: lifetime kelp ≥ 40 |
| `fish_leviathan_net` | Leviathan Net | 4,1 | 2.5 | milestone: lifetime fish ≥ 200 |

### Kelp (8 — base resource: kelp)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `kelp_nursery` | Kelp Nursery | 2,0 | 1.2 | milestone: lifetime crops ≥ 150 |
| `kelp_start` | Kelp Farm | 4,2 | 1 | cost: 70 driftwood + 60 crops |
| `kelp_seaweed_raft` | Seaweed Raft | 1,3 | 1 | cost: 30 driftwood |
| `kelp_floating_garden` | Floating Garden | 1,1 | 1.2 | milestone: lifetime kelp ≥ 150 |
| `kelp_deep_bed` | Deep Kelp Bed | 4,4 | 1.5 | cost: 90 driftwood + 70 crops |
| `kelp_reef` | Kelp Reef | 3,3 | 2 | milestone: lifetime driftwood ≥ 60 |
| `kelp_open_water_farm` | Open-Water Kelp Farm | 1,0 | 1.8 | cost: 80 fish + 70 driftwood |
| `kelp_abyssal_forest` | Abyssal Kelp Forest | 2,2 | 2.5 | cost: 40 driftwood |

### Driftwood (7 — base resource: driftwood)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `driftwood_start` | Driftwood Collector | 2,3 | 0.5 | start |
| `driftwood_salvage_raft` | Salvage Raft | 5,5 | 0.6 | milestone: lifetime fish ≥ 500 |
| `driftwood_debris_net` | Debris Net | 5,4 | 0.6 | milestone: lifetime driftwood ≥ 400 |
| `driftwood_current_sweeper` | Current Sweeper | 5,3 | 0.8 | cost: 150 fish + 150 kelp |
| `driftwood_storm_wreckage` | Storm Wreckage Raft | 3,5 | 1 | cost: 40 driftwood |
| `driftwood_flotsam_dredge` | Flotsam Dredge | 2,5 | 1 | cost: 45 crops |
| `driftwood_shipwreck_salvage` | Shipwreck Salvage | 3,4 | 1.3 | cost: 35 driftwood + 25 crops |

### Crops (7 — base resource: crops)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `crops_start` | Planter Raft | 5,1 | 0.5 | cost: 100 fish + 100 driftwood |
| `crops_soil_barge` | Soil Barge | 3,2 | 0.6 | cost: 35 driftwood |
| `crops_hanging_garden` | Hanging Garden | 4,3 | 0.6 | milestone: lifetime fish ≥ 120 |
| `crops_terraced_planter` | Terraced Planter | 0,5 | 0.8 | milestone: lifetime kelp ≥ 300 |
| `crops_floating_orchard` | Floating Orchard | 0,2 | 1 | cost: 30 driftwood + 20 crops |
| `crops_paddy_raft` | Paddy Raft | 4,5 | 1 | cost: 140 driftwood + 120 crops |
| `crops_vertical_farm` | Vertical Farm | 2,1 | 1.3 | cost: 55 driftwood |

### Booster (6 — no production of their own)
| id | name | pos (r,c) | effect | unlock |
|---|---|---|---|---|
| `booster_drying_rack` | Drying Rack | 1,4 | +20% kelp, +20% driftwood | milestone: lifetime crops ≥ 40 |
| `booster_smokehouse` | Smokehouse | 5,0 | +25% fish | cost: 200 kelp + 200 driftwood |
| `booster_windmill` | Windmill | 1,2 | +25% crops | cost: 20 driftwood |
| `booster_net_weavers` | Net Weavers | 0,0 | +20% fish, +20% kelp | cost: 120 fish + 90 driftwood |
| `booster_composting_shed` | Composting Shed | 3,1 | +20% crops, +20% driftwood | milestone: lifetime driftwood ≥ 90 |
| `booster_lighthouse` | Lighthouse | 4,0 | +15% fish, +15% kelp, +15% driftwood, +15% crops | cost: 120 kelp + 90 driftwood |

## Zone 2 — Frozen Reach

### Fish (8 — base resource: fish)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `frozen_fish_start` | Ice-Locked Raft | 0,7 | 4 | cost: 750 driftwood + 600 crops |
| `frozen_fish_anchored_net` | Frozen Anchor Net | 0,10 | 4 | cost: 900 driftwood + 750 crops |
| `frozen_fish_trawling_raft` | Glacier Trawler | 2,10 | 4.8 | cost: 375 driftwood |
| `frozen_fish_tide_pool_trap` | Frostbound Tide Trap | 5,8 | 4.8 | milestone: lifetime crops ≥ 3750 |
| `frozen_fish_deep_sea_longline` | Deep-Ice Longline | 1,11 | 6 | cost: 900 fish + 600 driftwood |
| `frozen_fish_grand_fishery` | Grand Frozen Fishery | 3,6 | 8 | cost: 1050 kelp + 750 crops |
| `frozen_fish_open_ocean_trawler` | Open-Ice Trawler | 0,9 | 7.2 | milestone: lifetime kelp ≥ 600 |
| `frozen_fish_leviathan_net` | Leviathan Ice Net | 4,7 | 10 | milestone: lifetime fish ≥ 3000 |

### Kelp (8 — base resource: kelp)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `frozen_kelp_nursery` | Frost Kelp Nursery | 2,6 | 4.8 | milestone: lifetime crops ≥ 2250 |
| `frozen_kelp_start` | Rimed Kelp Farm | 4,8 | 4 | cost: 1050 driftwood + 900 crops |
| `frozen_kelp_seaweed_raft` | Frozen Seaweed Raft | 1,9 | 4 | cost: 450 driftwood |
| `frozen_kelp_floating_garden` | Icebound Floating Garden | 1,7 | 4.8 | milestone: lifetime kelp ≥ 2250 |
| `frozen_kelp_deep_bed` | Deep Frost Kelp Bed | 4,10 | 6 | cost: 1350 driftwood + 1050 crops |
| `frozen_kelp_reef` | Glacial Kelp Reef | 3,9 | 8 | milestone: lifetime driftwood ≥ 900 |
| `frozen_kelp_open_water_farm` | Open-Water Frost Farm | 1,6 | 7.2 | cost: 1200 fish + 1050 driftwood |
| `frozen_kelp_abyssal_forest` | Abyssal Ice Forest | 2,8 | 10 | cost: 600 driftwood |

### Driftwood (7 — base resource: driftwood)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `frozen_driftwood_start` | Glacier Driftwood Collector | 2,9 | 2 | cost: 600 crops |
| `frozen_driftwood_salvage_raft` | Frozen Salvage Raft | 5,11 | 2.4 | milestone: lifetime fish ≥ 7500 |
| `frozen_driftwood_debris_net` | Ice Debris Net | 5,10 | 2.4 | milestone: lifetime driftwood ≥ 6000 |
| `frozen_driftwood_current_sweeper` | Frost Current Sweeper | 5,9 | 3.2 | cost: 2250 fish + 2250 kelp |
| `frozen_driftwood_storm_wreckage` | Storm-Locked Wreckage | 3,11 | 4 | cost: 600 driftwood |
| `frozen_driftwood_flotsam_dredge` | Frozen Flotsam Dredge | 2,11 | 4 | cost: 675 crops |
| `frozen_driftwood_shipwreck_salvage` | Ice-Locked Shipwreck | 3,10 | 5.2 | cost: 525 driftwood + 375 crops |

### Crops (7 — base resource: crops)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `frozen_crops_start` | Tundra Planter Raft | 5,7 | 2 | cost: 1500 fish + 1500 driftwood |
| `frozen_crops_soil_barge` | Frozen Soil Barge | 3,8 | 2.4 | cost: 525 driftwood |
| `frozen_crops_hanging_garden` | Icebound Hanging Garden | 4,9 | 2.4 | milestone: lifetime fish ≥ 1800 |
| `frozen_crops_terraced_planter` | Frost-Terraced Planter | 0,11 | 3.2 | milestone: lifetime kelp ≥ 4500 |
| `frozen_crops_floating_orchard` | Frozen Floating Orchard | 0,8 | 4 | cost: 450 driftwood + 300 crops |
| `frozen_crops_paddy_raft` | Glacial Paddy Raft | 4,11 | 4 | cost: 2100 driftwood + 1800 crops |
| `frozen_crops_vertical_farm` | Vertical Frost Farm | 2,7 | 5.2 | cost: 825 driftwood |

### Booster (6 — no production of their own)
| id | name | pos (r,c) | effect | unlock |
|---|---|---|---|---|
| `frozen_booster_drying_rack` | Frozen Drying Rack | 1,10 | +80% kelp, +80% driftwood | milestone: lifetime crops ≥ 600 |
| `frozen_booster_smokehouse` | Glacier Smokehouse | 5,6 | +100% fish | cost: 3000 kelp + 3000 driftwood |
| `frozen_booster_windmill` | Frostwind Mill | 1,8 | +100% crops | cost: 300 driftwood |
| `frozen_booster_net_weavers` | Ice Net Weavers | 0,6 | +80% fish, +80% kelp | cost: 1800 fish + 1350 driftwood |
| `frozen_booster_composting_shed` | Frozen Composting Shed | 3,7 | +80% crops, +80% driftwood | milestone: lifetime driftwood ≥ 1350 |
| `frozen_booster_lighthouse` | Aurora Lighthouse | 4,6 | +60% fish, +60% kelp, +60% driftwood, +60% crops | cost: 1800 kelp + 1350 driftwood |

## If retuning balance

Change the relevant tile's `rate`, `unlock.cost`, or `unlock.target` in `js/tiles.js` directly — `tests/economy.test.mjs`'s family-count and grid-coverage assertions will catch structural mistakes (wrong count, duplicated id/position), but won't catch a balance number that's simply "too slow/fast to feel good." That's a playtesting judgment call, not something to encode as a test. The exception is the zone-2 multiplier test noted above.

Note the hidden coupling this introduces: a tile's `rate` (producers) or a booster's `percent` (boosters) is also the input to its level-up cost, via the formula in `js/state.js` (`levelUpCost`). So retuning a tile's `rate`/`percent` for production-balance reasons silently changes what it costs to level up, too — there's no independent cost field to hold steady while you adjust production. The leveling cost constants themselves (`PRODUCER_UPGRADE_BASE = 30`, `BOOSTER_UPGRADE_BASE = 6`, and the level-2/level-3 step multipliers `1`/`2.5`) are, like the rest of the numbers on this page, a first-pass balance — not playtested.
