# Tile Design

All 36 tiles are defined in `js/tiles.js`, arranged on a 6×6 grid. This is a first-pass balance — not playtested — expect to retune specific numbers after actually playing it.

There is exactly one starting tile, `driftwood_start` (unlock type `start`); every other tile's `unlock` field is a `cost` or `milestone` requirement as shown below. But meeting that requirement isn't sufficient by itself: a tile can only be unlocked once it's also adjacent (on the hex grid) to a tile that's already unlocked. That adjacency requirement is derived from `gridPos` in `js/tiles.js` (see `TILE_NEIGHBORS`) and isn't repeated per-row below — assume it applies to every non-start tile in these tables.

## Fish family (8 — base resource: fish)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `fish_start` | Fishing Raft | 3,4 | 1.0 | cost: 35 driftwood + 25 crops |
| `fish_anchored_net` | Anchored Net | 3,5 | 1.0 | cost: 40 driftwood |
| `fish_trawling_raft` | Trawling Raft | 4,0 | 1.2 | cost: 120 kelp + 90 driftwood |
| `fish_tide_pool_trap` | Tide Pool Trap | 4,1 | 1.2 | milestone: lifetime fish ≥ 200 |
| `fish_deep_sea_longline` | Deep-Sea Longline | 4,2 | 1.5 | cost: 70 driftwood + 60 crops |
| `fish_grand_fishery` | Grand Fishery | 4,3 | 2.0 | milestone: lifetime fish ≥ 120 |
| `fish_open_ocean_trawler` | Open-Ocean Trawler | 4,4 | 1.8 | cost: 90 driftwood + 70 crops |
| `fish_leviathan_net` | Leviathan Net | 4,5 | 2.5 | cost: 140 driftwood + 120 crops |

## Kelp family (8 — base resource: kelp)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `kelp_nursery` | Kelp Nursery | 0,0 | 1.2 | cost: 120 fish + 90 driftwood |
| `kelp_start` | Kelp Farm | 0,1 | 1.0 | cost: 50 driftwood + 40 crops |
| `kelp_seaweed_raft` | Seaweed Raft | 0,2 | 1.0 | cost: 30 driftwood + 20 crops |
| `kelp_floating_garden` | Floating Garden | 0,3 | 1.2 | milestone: lifetime kelp ≥ 40 |
| `kelp_deep_bed` | Deep Kelp Bed | 0,4 | 1.5 | cost: 60 driftwood + 50 crops |
| `kelp_reef` | Kelp Reef | 0,5 | 2.0 | milestone: lifetime kelp ≥ 300 |
| `kelp_open_water_farm` | Open-Water Kelp Farm | 1,0 | 1.8 | cost: 80 fish + 70 driftwood |
| `kelp_abyssal_forest` | Abyssal Kelp Forest | 1,1 | 2.5 | milestone: lifetime kelp ≥ 150 |

## Driftwood family (7 — base resource: driftwood)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `driftwood_start` | Driftwood Collector | 2,3 | 0.5 | start |
| `driftwood_salvage_raft` | Salvage Raft | 2,4 | 0.6 | cost: 25 driftwood |
| `driftwood_debris_net` | Debris Net | 2,5 | 0.6 | cost: 45 crops |
| `driftwood_current_sweeper` | Current Sweeper | 3,0 | 0.8 | cost: 70 kelp + 50 crops |
| `driftwood_storm_wreckage` | Storm Wreckage Raft | 3,1 | 1.0 | milestone: lifetime driftwood ≥ 90 |
| `driftwood_flotsam_dredge` | Flotsam Dredge | 3,2 | 1.0 | cost: 35 driftwood |
| `driftwood_shipwreck_salvage` | Shipwreck Salvage | 3,3 | 1.3 | milestone: lifetime driftwood ≥ 60 |

## Crops family (7 — base resource: crops)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `crops_start` | Planter Raft | 1,2 | 0.5 | cost: 20 driftwood |
| `crops_soil_barge` | Soil Barge | 1,3 | 0.6 | cost: 30 driftwood |
| `crops_hanging_garden` | Hanging Garden | 1,4 | 0.6 | milestone: lifetime crops ≥ 40 |
| `crops_terraced_planter` | Terraced Planter | 1,5 | 0.8 | cost: 60 fish + 40 driftwood |
| `crops_floating_orchard` | Floating Orchard | 2,0 | 1.0 | milestone: lifetime crops ≥ 150 |
| `crops_paddy_raft` | Paddy Raft | 2,1 | 1.0 | cost: 55 driftwood |
| `crops_vertical_farm` | Vertical Farm | 2,2 | 1.3 | cost: 40 driftwood |

## Booster family (6 — no production of their own)
| id | name | pos (r,c) | effect | unlock |
|---|---|---|---|---|
| `booster_drying_rack` | Drying Rack | 5,0 | +20% kelp, +20% driftwood | cost: 200 kelp + 200 driftwood |
| `booster_smokehouse` | Smokehouse | 5,1 | +25% fish | cost: 100 fish + 100 driftwood |
| `booster_windmill` | Windmill | 5,2 | +25% crops | milestone: lifetime crops ≥ 250 |
| `booster_net_weavers` | Net Weavers | 5,3 | +20% fish, +20% kelp | cost: 150 fish + 150 kelp |
| `booster_composting_shed` | Composting Shed | 5,4 | +20% crops, +20% driftwood | milestone: lifetime driftwood ≥ 400 |
| `booster_lighthouse` | Lighthouse | 5,5 | +15% fish, +15% kelp, +15% driftwood, +15% crops | milestone: lifetime fish ≥ 500 |

## If retuning balance

Change the relevant tile's `rate`, `unlock.cost`, or `unlock.target` in `js/tiles.js` directly — `tests/economy.test.mjs`'s family-count and grid-coverage assertions will catch structural mistakes (wrong count, duplicated id/position), but won't catch a balance number that's simply "too slow/fast to feel good." That's a playtesting judgment call, not something to encode as a test.

Note the hidden coupling this introduces: a tile's `rate` (producers) or a booster's `percent` (boosters) is also the input to its level-up cost, via the formula in `js/state.js` (`levelUpCost`). So retuning a tile's `rate`/`percent` for production-balance reasons silently changes what it costs to level up, too — there's no independent cost field to hold steady while you adjust production. The leveling cost constants themselves (`PRODUCER_UPGRADE_BASE = 30`, `BOOSTER_UPGRADE_BASE = 6`, and the level-2/level-3 step multipliers `1`/`2.5`) are, like the rest of the numbers on this page, a first-pass balance — not playtested.
