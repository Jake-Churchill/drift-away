# Tile Design

All 108 tiles are defined in `js/tiles.js`: 36 per zone, each zone a 6×6 hex grid, placed side by side. Zone 1 ("Home Waters") is cols 0–5; zone 2 ("Frozen Reach") is cols 6–11; zone 3 ("Abyssal Trench") is cols 12–17. Every tile has a `zone` field (`zone1`/`zone2`/`zone3`); zone metadata (name, raft color) lives in `js/zones.js`. Within a zone, families are scattered rather than grouped (the layout was shuffled after the first version). This is a first-pass balance — not playtested — expect to retune specific numbers after actually playing it.

There is exactly one starting tile, `driftwood_start` (unlock type `start`); every other tile's `unlock` field is a `cost` or `milestone` requirement as shown below. But meeting that requirement isn't sufficient by itself: a tile can only be unlocked once it's also adjacent (on the hex grid) to a tile that's already unlocked. That adjacency requirement is derived from `gridPos` in `js/tiles.js` (see `TILE_NEIGHBORS`) and isn't repeated per-row below — assume it applies to every non-start tile in these tables.

## Zone 2 rules (how it relates to zone 1)

Every zone-2 tile mirrors one zone-1 tile: id prefixed `frozen_` (`fish_start` → `frozen_fish_start`), same family/kind/`produces`, `gridPos` shifted +6 columns, re-themed name. Numbers scale from the mirror:

- unlock `cost` amounts and milestone `target`s: **×90** (spending resources from zone 1's economy). This started at ×15 and was multiplied by 6 after a simulated run showed zone 2 finishing about 2 minutes after its first tile; at ×90 a perfect player needs about 9.5 minutes for zone 2 and about 18m40s for the whole game.
- producer `rate` and booster `percent`: **×4**
- one exception: `frozen_driftwood_start` is a normal `cost` tile (3600 crops), not `start`, because the game has exactly one `start` tile.

Zone 2 is entered through the col 5 / col 6 border: same-row `col ± 1` neighbors are always adjacent, so unlocking a zone-1 border tile discovers the zone-2 tile next to it, with no zone-specific gating code. Zone 2 resets with everything else on prestige.

`tests/economy.test.mjs` pins the ×90/×4 relationship across all 36 pairs — if you deliberately retune zone 2, update the constants in the "zone-2 economy multiplier tests" section too.

Known balance quirk (accepted, not a bug): level-up cost derives from `rate`/`percent` (see the end of this page), so zone-2 level-ups cost only ~4× zone 1's while unlocks cost 90×. Level-ups are cheap relative to unlocks in zone 2.

## Zone 3 rules (how it relates to zone 2, and its own mechanic)

Every zone-3 tile mirrors one zone-2 tile the same way zone 2 mirrors zone 1: id prefixed `abyssal_` (`frozen_fish_start` → `abyssal_fish_start`), same family/kind/`produces`, `gridPos` shifted +6 more columns, re-themed name. Numbers scale from the zone-2 mirror by the *same* ×90/×4 ratio zone 2 itself used over zone 1 (so ×8100/×16 cumulative from zone 1) — the same rule applied twice, not a new one, chosen for consistency over guessing a bigger number; this has **not** been simulated the way zone 2's pricing was, and should be before it's considered final (see the zone-3 spec's Testing Plan).

Zone 3 also adds **bioluminescence**, the game's first zone-specific mechanic beyond a reskin: a zone-3 *producer* runs at half rate until a zone-3 *booster* is unlocked hex-adjacent to it (any of the six archetypes, not one dedicated tile — see `isLit` in `js/state.js`). Zone-3 boosters, and every zone-1/zone-2 tile, are never affected. The ex-"Lighthouse" role is reskinned as the "Anglerfish Lure" and is the mechanic's flagship (the only booster with a real dynamic light in the scene), but mechanically it's no different from the other five — all six cast light on their own neighbors.

Zone 3 is entered through the col 11 / col 12 border, the same adjacency rule as every other zone border. It resets with everything else on prestige — including which producers are lit, since that's derived from `state.unlocked` fresh each time, not separately tracked.

`tests/economy.test.mjs`'s "bioluminescence" section tests `isLit` and the darkness penalty directly; there's no equivalent of the zone-2 "×90/×4 pinned" test for zone 3 yet, since those numbers are still first-pass.

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
| `frozen_fish_start` | Ice-Locked Raft | 0,7 | 4 | cost: 4500 driftwood + 3600 crops |
| `frozen_fish_anchored_net` | Frozen Anchor Net | 0,10 | 4 | cost: 5400 driftwood + 4500 crops |
| `frozen_fish_trawling_raft` | Glacier Trawler | 2,10 | 4.8 | cost: 2250 driftwood |
| `frozen_fish_tide_pool_trap` | Frostbound Tide Trap | 5,8 | 4.8 | milestone: lifetime crops ≥ 22500 |
| `frozen_fish_deep_sea_longline` | Deep-Ice Longline | 1,11 | 6 | cost: 5400 fish + 3600 driftwood |
| `frozen_fish_grand_fishery` | Grand Frozen Fishery | 3,6 | 8 | cost: 6300 kelp + 4500 crops |
| `frozen_fish_open_ocean_trawler` | Open-Ice Trawler | 0,9 | 7.2 | milestone: lifetime kelp ≥ 3600 |
| `frozen_fish_leviathan_net` | Leviathan Ice Net | 4,7 | 10 | milestone: lifetime fish ≥ 18000 |

### Kelp (8 — base resource: kelp)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `frozen_kelp_nursery` | Frost Kelp Nursery | 2,6 | 4.8 | milestone: lifetime crops ≥ 13500 |
| `frozen_kelp_start` | Rimed Kelp Farm | 4,8 | 4 | cost: 6300 driftwood + 5400 crops |
| `frozen_kelp_seaweed_raft` | Frozen Seaweed Raft | 1,9 | 4 | cost: 2700 driftwood |
| `frozen_kelp_floating_garden` | Icebound Floating Garden | 1,7 | 4.8 | milestone: lifetime kelp ≥ 13500 |
| `frozen_kelp_deep_bed` | Deep Frost Kelp Bed | 4,10 | 6 | cost: 8100 driftwood + 6300 crops |
| `frozen_kelp_reef` | Glacial Kelp Reef | 3,9 | 8 | milestone: lifetime driftwood ≥ 5400 |
| `frozen_kelp_open_water_farm` | Open-Water Frost Farm | 1,6 | 7.2 | cost: 7200 fish + 6300 driftwood |
| `frozen_kelp_abyssal_forest` | Abyssal Ice Forest | 2,8 | 10 | cost: 3600 driftwood |

### Driftwood (7 — base resource: driftwood)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `frozen_driftwood_start` | Glacier Driftwood Collector | 2,9 | 2 | cost: 3600 crops |
| `frozen_driftwood_salvage_raft` | Frozen Salvage Raft | 5,11 | 2.4 | milestone: lifetime fish ≥ 45000 |
| `frozen_driftwood_debris_net` | Ice Debris Net | 5,10 | 2.4 | milestone: lifetime driftwood ≥ 36000 |
| `frozen_driftwood_current_sweeper` | Frost Current Sweeper | 5,9 | 3.2 | cost: 13500 fish + 13500 kelp |
| `frozen_driftwood_storm_wreckage` | Storm-Locked Wreckage | 3,11 | 4 | cost: 3600 driftwood |
| `frozen_driftwood_flotsam_dredge` | Frozen Flotsam Dredge | 2,11 | 4 | cost: 4050 crops |
| `frozen_driftwood_shipwreck_salvage` | Ice-Locked Shipwreck | 3,10 | 5.2 | cost: 3150 driftwood + 2250 crops |

### Crops (7 — base resource: crops)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `frozen_crops_start` | Tundra Planter Raft | 5,7 | 2 | cost: 9000 fish + 9000 driftwood |
| `frozen_crops_soil_barge` | Frozen Soil Barge | 3,8 | 2.4 | cost: 3150 driftwood |
| `frozen_crops_hanging_garden` | Icebound Hanging Garden | 4,9 | 2.4 | milestone: lifetime fish ≥ 10800 |
| `frozen_crops_terraced_planter` | Frost-Terraced Planter | 0,11 | 3.2 | milestone: lifetime kelp ≥ 27000 |
| `frozen_crops_floating_orchard` | Frozen Floating Orchard | 0,8 | 4 | cost: 2700 driftwood + 1800 crops |
| `frozen_crops_paddy_raft` | Glacial Paddy Raft | 4,11 | 4 | cost: 12600 driftwood + 10800 crops |
| `frozen_crops_vertical_farm` | Vertical Frost Farm | 2,7 | 5.2 | cost: 4950 driftwood |

### Booster (6 — no production of their own)
| id | name | pos (r,c) | effect | unlock |
|---|---|---|---|---|
| `frozen_booster_drying_rack` | Frozen Drying Rack | 1,10 | +80% kelp, +80% driftwood | milestone: lifetime crops ≥ 3600 |
| `frozen_booster_smokehouse` | Glacier Smokehouse | 5,6 | +100% fish | cost: 18000 kelp + 18000 driftwood |
| `frozen_booster_windmill` | Frostwind Mill | 1,8 | +100% crops | cost: 1800 driftwood |
| `frozen_booster_net_weavers` | Ice Net Weavers | 0,6 | +80% fish, +80% kelp | cost: 10800 fish + 8100 driftwood |
| `frozen_booster_composting_shed` | Frozen Composting Shed | 3,7 | +80% crops, +80% driftwood | milestone: lifetime driftwood ≥ 8100 |
| `frozen_booster_lighthouse` | Aurora Lighthouse | 4,6 | +60% fish, +60% kelp, +60% driftwood, +60% crops | cost: 10800 kelp + 8100 driftwood |

## Zone 3 — Abyssal Trench

### Fish (8 — base resource: fish)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `abyssal_fish_start` | Anglerfish Trap | 0,13 | 16 | cost: 405,000 driftwood + 324,000 crops |
| `abyssal_fish_anchored_net` | Sunken Anchor Net | 0,16 | 16 | cost: 486,000 driftwood + 405,000 crops |
| `abyssal_fish_trawling_raft` | Trench Trawler | 2,16 | 19.2 | cost: 202,500 driftwood |
| `abyssal_fish_tide_pool_trap` | Vent-Side Trap | 5,14 | 19.2 | milestone: lifetime crops ≥ 2,025,000 |
| `abyssal_fish_deep_sea_longline` | Deep Longline | 1,17 | 24 | cost: 486,000 fish + 324,000 driftwood |
| `abyssal_fish_grand_fishery` | Grand Abyssal Fishery | 3,12 | 32 | cost: 567,000 kelp + 405,000 crops |
| `abyssal_fish_open_ocean_trawler` | Open-Trench Trawler | 0,15 | 28.8 | milestone: lifetime kelp ≥ 324,000 |
| `abyssal_fish_leviathan_net` | Leviathan Maw | 4,13 | 40 | milestone: lifetime fish ≥ 1,620,000 |

### Kelp (8 — base resource: kelp)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `abyssal_kelp_nursery` | Tube Worm Nursery | 2,12 | 19.2 | milestone: lifetime crops ≥ 1,215,000 |
| `abyssal_kelp_start` | Bristle Worm Bed | 4,14 | 16 | cost: 567,000 driftwood + 486,000 crops |
| `abyssal_kelp_seaweed_raft` | Vent Worm Raft | 1,15 | 16 | cost: 243,000 driftwood |
| `abyssal_kelp_floating_garden` | Floating Worm Garden | 1,13 | 19.2 | milestone: lifetime kelp ≥ 1,215,000 |
| `abyssal_kelp_deep_bed` | Deep Worm Bed | 4,16 | 24 | cost: 729,000 driftwood + 567,000 crops |
| `abyssal_kelp_reef` | Worm Reef | 3,15 | 32 | milestone: lifetime driftwood ≥ 486,000 |
| `abyssal_kelp_open_water_farm` | Open-Trench Worm Farm | 1,12 | 28.8 | cost: 648,000 fish + 567,000 driftwood |
| `abyssal_kelp_abyssal_forest` | Abyssal Worm Forest | 2,14 | 40 | cost: 324,000 driftwood |

### Driftwood (7 — base resource: driftwood)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `abyssal_driftwood_start` | Bone Collector | 2,15 | 8 | cost: 324,000 crops |
| `abyssal_driftwood_salvage_raft` | Sunken Salvage Raft | 5,17 | 9.6 | milestone: lifetime fish ≥ 4,050,000 |
| `abyssal_driftwood_debris_net` | Skeletal Debris Net | 5,16 | 9.6 | milestone: lifetime driftwood ≥ 3,240,000 |
| `abyssal_driftwood_current_sweeper` | Current-Swept Bones | 5,15 | 12.8 | cost: 1,215,000 fish + 1,215,000 kelp |
| `abyssal_driftwood_storm_wreckage` | Storm-Sunk Wreckage | 3,17 | 16 | cost: 324,000 driftwood |
| `abyssal_driftwood_flotsam_dredge` | Bone Dredge | 2,17 | 16 | cost: 364,500 crops |
| `abyssal_driftwood_shipwreck_salvage` | Drowned Shipwreck | 3,16 | 20.8 | cost: 283,500 driftwood + 202,500 crops |

### Crops (7 — base resource: crops)
| id | name | pos (r,c) | rate/s | unlock |
|---|---|---|---|---|
| `abyssal_crops_start` | Vent Garden Plot | 5,13 | 8 | cost: 810,000 fish + 810,000 driftwood |
| `abyssal_crops_soil_barge` | Mineral Soil Vent | 3,14 | 9.6 | cost: 283,500 driftwood |
| `abyssal_crops_hanging_garden` | Hanging Vent Garden | 4,15 | 9.6 | milestone: lifetime fish ≥ 972,000 |
| `abyssal_crops_terraced_planter` | Terraced Vent Beds | 0,17 | 12.8 | milestone: lifetime kelp ≥ 2,430,000 |
| `abyssal_crops_floating_orchard` | Floating Spore Garden | 0,14 | 16 | cost: 243,000 driftwood + 162,000 crops |
| `abyssal_crops_paddy_raft` | Vent Paddy | 4,17 | 16 | cost: 1,134,000 driftwood + 972,000 crops |
| `abyssal_crops_vertical_farm` | Vertical Vent Farm | 2,13 | 20.8 | cost: 445,500 driftwood |

### Booster (6 — no production of their own)
| id | name | pos (r,c) | effect | unlock |
|---|---|---|---|---|
| `abyssal_booster_drying_rack` | Bone Rack | 1,16 | +320% kelp, +320% driftwood | milestone: lifetime crops ≥ 324,000 |
| `abyssal_booster_smokehouse` | Vent Chimney | 5,12 | +400% fish | cost: 1,620,000 kelp + 1,620,000 driftwood |
| `abyssal_booster_windmill` | Current Turbine | 1,14 | +400% crops | cost: 162,000 driftwood |
| `abyssal_booster_net_weavers` | Filter Web | 0,12 | +320% fish, +320% kelp | cost: 972,000 fish + 729,000 driftwood |
| `abyssal_booster_composting_shed` | Ossuary | 3,13 | +320% crops, +320% driftwood | milestone: lifetime driftwood ≥ 729,000 |
| `abyssal_booster_lighthouse` | Anglerfish Lure | 4,12 | +240% fish, +240% kelp, +240% driftwood, +240% crops | cost: 972,000 kelp + 729,000 driftwood |

## If retuning balance

Change the relevant tile's `rate`, `unlock.cost`, or `unlock.target` in `js/tiles.js` directly — `tests/economy.test.mjs`'s family-count and grid-coverage assertions will catch structural mistakes (wrong count, duplicated id/position), but won't catch a balance number that's simply "too slow/fast to feel good." That's a playtesting judgment call, not something to encode as a test. The exception is the zone-2 multiplier test noted above.

Note the hidden coupling this introduces: a tile's `rate` (producers) or a booster's `percent` (boosters) is also the input to its level-up cost, via the formula in `js/state.js` (`levelUpCost`). So retuning a tile's `rate`/`percent` for production-balance reasons silently changes what it costs to level up, too — there's no independent cost field to hold steady while you adjust production. The leveling cost constants themselves (`PRODUCER_UPGRADE_BASE = 30`, `BOOSTER_UPGRADE_BASE = 6`, and the level-2/level-3 step multipliers `1`/`2.5`) are, like the rest of the numbers on this page, a first-pass balance — not playtested.
