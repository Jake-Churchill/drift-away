# Tile Design

All 36 tiles are defined in `js/tiles.js`, arranged on a 6×6 grid. This is a first-pass balance — not playtested — expect to retune specific numbers after actually playing it.

## Fish family (8 — base resource: fish)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `fish_start` | Fishing Raft | 3,4 | 1.0 | start |
| `fish_anchored_net` | Anchored Net | 3,5 | 1.0 | cost: 30 driftwood |
| `fish_trawling_raft` | Trawling Raft | 4,0 | 1.2 | cost: 60 kelp + 40 driftwood |
| `fish_tide_pool_trap` | Tide Pool Trap | 4,1 | 1.2 | milestone: lifetime fish ≥ 200 |
| `fish_deep_sea_longline` | Deep-Sea Longline | 4,2 | 1.5 | cost: 150 driftwood + 100 crops |
| `fish_grand_fishery` | Grand Fishery | 4,3 | 2.0 | milestone: lifetime fish ≥ 1000 |
| `fish_open_ocean_trawler` | Open-Ocean Trawler | 4,4 | 1.8 | cost: 250 driftwood + 200 crops |
| `fish_leviathan_net` | Leviathan Net | 4,5 | 2.5 | milestone: lifetime fish ≥ 2500 |

## Kelp family (8 — base resource: kelp)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `kelp_nursery` | Kelp Nursery | 0,0 | 1.2 | cost: 50 fish + 50 driftwood |
| `kelp_start` | Kelp Farm | 0,1 | 1.0 | start |
| `kelp_seaweed_raft` | Seaweed Raft | 0,2 | 1.0 | cost: 30 fish |
| `kelp_floating_garden` | Floating Garden | 0,3 | 1.2 | milestone: lifetime kelp ≥ 200 |
| `kelp_deep_bed` | Deep Kelp Bed | 0,4 | 1.5 | cost: 120 fish + 100 crops |
| `kelp_reef` | Kelp Reef | 0,5 | 2.0 | milestone: lifetime kelp ≥ 1000 |
| `kelp_open_water_farm` | Open-Water Kelp Farm | 1,0 | 1.8 | cost: 220 fish + 180 crops |
| `kelp_abyssal_forest` | Abyssal Kelp Forest | 1,1 | 2.5 | milestone: lifetime kelp ≥ 2500 |

## Driftwood family (7 — base resource: driftwood)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `driftwood_start` | Driftwood Collector | 2,3 | 0.5 | start |
| `driftwood_salvage_raft` | Salvage Raft | 2,4 | 0.6 | cost: 40 fish |
| `driftwood_debris_net` | Debris Net | 2,5 | 0.6 | milestone: lifetime driftwood ≥ 100 |
| `driftwood_current_sweeper` | Current Sweeper | 3,0 | 0.8 | cost: 80 kelp + 60 crops |
| `driftwood_storm_wreckage` | Storm Wreckage Raft | 3,1 | 1.0 | milestone: lifetime driftwood ≥ 500 |
| `driftwood_flotsam_dredge` | Flotsam Dredge | 3,2 | 1.0 | cost: 150 kelp + 120 crops |
| `driftwood_shipwreck_salvage` | Shipwreck Salvage | 3,3 | 1.3 | milestone: lifetime driftwood ≥ 1200 |

## Crops family (7 — base resource: crops)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `crops_start` | Planter Raft | 1,2 | 0.5 | start |
| `crops_soil_barge` | Soil Barge | 1,3 | 0.6 | cost: 40 kelp |
| `crops_hanging_garden` | Hanging Garden | 1,4 | 0.6 | milestone: lifetime crops ≥ 100 |
| `crops_terraced_planter` | Terraced Planter | 1,5 | 0.8 | cost: 80 fish + 60 driftwood |
| `crops_floating_orchard` | Floating Orchard | 2,0 | 1.0 | milestone: lifetime crops ≥ 500 |
| `crops_paddy_raft` | Paddy Raft | 2,1 | 1.0 | cost: 150 fish + 120 driftwood |
| `crops_vertical_farm` | Vertical Farm | 2,2 | 1.3 | milestone: lifetime crops ≥ 1200 |

## Booster family (6 — no production of their own)
| id | name | pos (r,c) | effect | unlock |
|---|---|---|---|---|
| `booster_drying_rack` | Drying Rack | 5,0 | +20% kelp, +20% driftwood | cost: 150 kelp + 150 driftwood |
| `booster_smokehouse` | Smokehouse | 5,1 | +25% fish | cost: 100 fish + 100 driftwood |
| `booster_windmill` | Windmill | 5,2 | +25% crops | milestone: lifetime crops ≥ 300 |
| `booster_net_weavers` | Net Weavers | 5,3 | +20% fish, +20% kelp | cost: 200 fish + 200 kelp |
| `booster_composting_shed` | Composting Shed | 5,4 | +20% crops, +20% driftwood | milestone: lifetime driftwood ≥ 800 |
| `booster_lighthouse` | Lighthouse | 5,5 | +15% fish, +15% kelp, +15% driftwood, +15% crops | milestone: lifetime crops ≥ 1500 |

## If retuning balance

Change the relevant tile's `rate`, `unlock.cost`, or `unlock.target` in `js/tiles.js` directly — `tests/economy.test.mjs`'s family-count and grid-coverage assertions will catch structural mistakes (wrong count, duplicated id/position), but won't catch a balance number that's simply "too slow/fast to feel good." That's a playtesting judgment call, not something to encode as a test.
