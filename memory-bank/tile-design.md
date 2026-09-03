# Tile Design

All 25 tiles are defined in `js/tiles.js`. This is a first-pass balance — not playtested — expect to retune specific numbers after actually playing it. It's internally consistent: early tiles are reachable in well under a minute at starting rates, later tiles assume several producers of that family are already unlocked.

## Fish family (6 — base resource: fish)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `fish_start` | Fishing Raft | 2,2 | 1.0 | start |
| `fish_anchored_net` | Anchored Net | 2,3 | 1.0 | cost: 30 driftwood |
| `fish_trawling_raft` | Trawling Raft | 3,3 | 1.2 | cost: 60 kelp + 40 driftwood |
| `fish_tide_pool_trap` | Tide Pool Trap | 3,4 | 1.2 | milestone: lifetime fish ≥ 200 |
| `fish_deep_sea_longline` | Deep-Sea Longline | 4,3 | 1.5 | cost: 150 driftwood + 100 crops |
| `fish_grand_fishery` | Grand Fishery | 4,4 | 2.0 | milestone: lifetime fish ≥ 1000 |

## Kelp family (6 — base resource: kelp)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `kelp_start` | Kelp Farm | 0,1 | 1.0 | start |
| `kelp_seaweed_raft` | Seaweed Raft | 0,2 | 1.0 | cost: 30 fish |
| `kelp_nursery` | Kelp Nursery | 0,0 | 1.2 | cost: 50 fish + 50 driftwood |
| `kelp_floating_garden` | Floating Garden | 0,3 | 1.2 | milestone: lifetime kelp ≥ 200 |
| `kelp_deep_bed` | Deep Kelp Bed | 0,4 | 1.5 | cost: 120 fish + 100 crops |
| `kelp_reef` | Kelp Reef | 1,4 | 2.0 | milestone: lifetime kelp ≥ 1000 |

## Driftwood family (5 — base resource: driftwood)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `driftwood_start` | Driftwood Collector | 2,1 | 0.5 | start |
| `driftwood_salvage_raft` | Salvage Raft | 2,0 | 0.6 | cost: 40 fish |
| `driftwood_debris_net` | Debris Net | 3,0 | 0.6 | milestone: lifetime driftwood ≥ 100 |
| `driftwood_current_sweeper` | Current Sweeper | 3,1 | 0.8 | cost: 80 kelp + 60 crops |
| `driftwood_storm_wreckage` | Storm Wreckage Raft | 4,0 | 1.0 | milestone: lifetime driftwood ≥ 500 |

## Crops family (5 — base resource: crops)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `crops_start` | Planter Raft | 1,2 | 0.5 | start |
| `crops_soil_barge` | Soil Barge | 1,1 | 0.6 | cost: 40 kelp |
| `crops_hanging_garden` | Hanging Garden | 1,3 | 0.6 | milestone: lifetime crops ≥ 100 |
| `crops_terraced_planter` | Terraced Planter | 3,2 | 0.8 | cost: 80 fish + 60 driftwood |
| `crops_floating_orchard` | Floating Orchard | 4,1 | 1.0 | milestone: lifetime crops ≥ 500 |

## Booster family (3 — no production of their own)
| id | name | pos (r,c) | effect | unlock |
|---|---|---|---|---|
| `booster_drying_rack` | Drying Rack | 1,0 | +20% kelp, +20% driftwood | cost: 150 kelp + 150 driftwood |
| `booster_smokehouse` | Smokehouse | 2,4 | +25% fish | cost: 100 fish + 100 driftwood |
| `booster_windmill` | Windmill | 4,2 | +25% crops | milestone: lifetime crops ≥ 300 |

## If retuning balance

Change the relevant tile's `rate`, `unlock.cost`, or `unlock.target` in `js/tiles.js` directly — `tests/economy.test.mjs`'s family-count and starting-rate assertions will catch structural mistakes (wrong count, duplicated id/position), but won't catch a balance number that's simply "too slow/fast to feel good." That's a playtesting judgment call, not something to encode as a test.
