export const TILES = [
  // Fish family (base resource: fish)
  { id: 'fish_start', name: 'Fishing Raft', gridPos: { row: 0, col: 1 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 50, crops: 40 } }, zone: 'zone1' },
  { id: 'fish_anchored_net', name: 'Anchored Net', gridPos: { row: 0, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 60, crops: 50 } }, zone: 'zone1' },
  { id: 'fish_trawling_raft', name: 'Trawling Raft', gridPos: { row: 2, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'cost', cost: { driftwood: 25 } }, zone: 'zone1' },
  { id: 'fish_tide_pool_trap', name: 'Tide Pool Trap', gridPos: { row: 5, col: 2 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 250 }, zone: 'zone1' },
  { id: 'fish_deep_sea_longline', name: 'Deep-Sea Longline', gridPos: { row: 1, col: 5 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { fish: 60, driftwood: 40 } }, zone: 'zone1' },
  { id: 'fish_grand_fishery', name: 'Grand Fishery', gridPos: { row: 3, col: 0 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 2, boosts: null, unlock: { type: 'cost', cost: { kelp: 70, crops: 50 } }, zone: 'zone1' },
  { id: 'fish_open_ocean_trawler', name: 'Open-Ocean Trawler', gridPos: { row: 0, col: 3 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.8, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 40 }, zone: 'zone1' },
  { id: 'fish_leviathan_net', name: 'Leviathan Net', gridPos: { row: 4, col: 1 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 2.5, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 200 }, zone: 'zone1' },

  // Kelp family (base resource: kelp)
  { id: 'kelp_nursery', name: 'Kelp Nursery', gridPos: { row: 2, col: 0 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 150 }, zone: 'zone1' },
  { id: 'kelp_start', name: 'Kelp Farm', gridPos: { row: 4, col: 2 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 70, crops: 60 } }, zone: 'zone1' },
  { id: 'kelp_seaweed_raft', name: 'Seaweed Raft', gridPos: { row: 1, col: 3 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 30 } }, zone: 'zone1' },
  { id: 'kelp_floating_garden', name: 'Floating Garden', gridPos: { row: 1, col: 1 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 150 }, zone: 'zone1' },
  { id: 'kelp_deep_bed', name: 'Deep Kelp Bed', gridPos: { row: 4, col: 4 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 90, crops: 70 } }, zone: 'zone1' },
  { id: 'kelp_reef', name: 'Kelp Reef', gridPos: { row: 3, col: 3 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 2, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 60 }, zone: 'zone1' },
  { id: 'kelp_open_water_farm', name: 'Open-Water Kelp Farm', gridPos: { row: 1, col: 0 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.8, boosts: null, unlock: { type: 'cost', cost: { fish: 80, driftwood: 70 } }, zone: 'zone1' },
  { id: 'kelp_abyssal_forest', name: 'Abyssal Kelp Forest', gridPos: { row: 2, col: 2 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 2.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 40 } }, zone: 'zone1' },

  // Driftwood family (base resource: driftwood)
  { id: 'driftwood_start', name: 'Driftwood Collector', gridPos: { row: 2, col: 3 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.5, boosts: null, unlock: { type: 'start' }, zone: 'zone1' },
  { id: 'driftwood_salvage_raft', name: 'Salvage Raft', gridPos: { row: 5, col: 5 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 500 }, zone: 'zone1' },
  { id: 'driftwood_debris_net', name: 'Debris Net', gridPos: { row: 5, col: 4 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 400 }, zone: 'zone1' },
  { id: 'driftwood_current_sweeper', name: 'Current Sweeper', gridPos: { row: 5, col: 3 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.8, boosts: null, unlock: { type: 'cost', cost: { fish: 150, kelp: 150 } }, zone: 'zone1' },
  { id: 'driftwood_storm_wreckage', name: 'Storm Wreckage Raft', gridPos: { row: 3, col: 5 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 40 } }, zone: 'zone1' },
  { id: 'driftwood_flotsam_dredge', name: 'Flotsam Dredge', gridPos: { row: 2, col: 5 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1, boosts: null, unlock: { type: 'cost', cost: { crops: 45 } }, zone: 'zone1' },
  { id: 'driftwood_shipwreck_salvage', name: 'Shipwreck Salvage', gridPos: { row: 3, col: 4 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1.3, boosts: null, unlock: { type: 'cost', cost: { driftwood: 35, crops: 25 } }, zone: 'zone1' },

  // Crops family (base resource: crops)
  { id: 'crops_start', name: 'Planter Raft', gridPos: { row: 5, col: 1 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.5, boosts: null, unlock: { type: 'cost', cost: { fish: 100, driftwood: 100 } }, zone: 'zone1' },
  { id: 'crops_soil_barge', name: 'Soil Barge', gridPos: { row: 3, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { driftwood: 35 } }, zone: 'zone1' },
  { id: 'crops_hanging_garden', name: 'Hanging Garden', gridPos: { row: 4, col: 3 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 120 }, zone: 'zone1' },
  { id: 'crops_terraced_planter', name: 'Terraced Planter', gridPos: { row: 0, col: 5 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.8, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 300 }, zone: 'zone1' },
  { id: 'crops_floating_orchard', name: 'Floating Orchard', gridPos: { row: 0, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 30, crops: 20 } }, zone: 'zone1' },
  { id: 'crops_paddy_raft', name: 'Paddy Raft', gridPos: { row: 4, col: 5 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1, boosts: null, unlock: { type: 'cost', cost: { driftwood: 140, crops: 120 } }, zone: 'zone1' },
  { id: 'crops_vertical_farm', name: 'Vertical Farm', gridPos: { row: 2, col: 1 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1.3, boosts: null, unlock: { type: 'cost', cost: { driftwood: 55 } }, zone: 'zone1' },

  // Booster family (no production of their own)
  { id: 'booster_drying_rack', name: 'Drying Rack', gridPos: { row: 1, col: 4 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'kelp', percent: 20 }, { resource: 'driftwood', percent: 20 }], unlock: { type: 'milestone', resource: 'crops', target: 40 }, zone: 'zone1' },
  { id: 'booster_smokehouse', name: 'Smokehouse', gridPos: { row: 5, col: 0 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 25 }], unlock: { type: 'cost', cost: { kelp: 200, driftwood: 200 } }, zone: 'zone1' },
  { id: 'booster_windmill', name: 'Windmill', gridPos: { row: 1, col: 2 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 25 }], unlock: { type: 'cost', cost: { driftwood: 20 } }, zone: 'zone1' },
  { id: 'booster_net_weavers', name: 'Net Weavers', gridPos: { row: 0, col: 0 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 20 }, { resource: 'kelp', percent: 20 }], unlock: { type: 'cost', cost: { fish: 120, driftwood: 90 } }, zone: 'zone1' },
  { id: 'booster_composting_shed', name: 'Composting Shed', gridPos: { row: 3, col: 1 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 20 }, { resource: 'driftwood', percent: 20 }], unlock: { type: 'milestone', resource: 'driftwood', target: 90 }, zone: 'zone1' },
  { id: 'booster_lighthouse', name: 'Lighthouse', gridPos: { row: 4, col: 0 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 15 }, { resource: 'kelp', percent: 15 }, { resource: 'driftwood', percent: 15 }, { resource: 'crops', percent: 15 }], unlock: { type: 'cost', cost: { kelp: 120, driftwood: 90 } }, zone: 'zone1' },

  // ===== Zone 2: Frozen Reach ===== (mirrors zone 1's grid shape at col+6;
  // costs/milestones are 15x zone-1's, rates/boosts are 4x zone-1's)

  // Fish family
  { id: 'frozen_fish_start', name: 'Ice-Locked Raft', gridPos: { row: 0, col: 7 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 4500, crops: 3600 } }, zone: 'zone2' },
  { id: 'frozen_fish_anchored_net', name: 'Frozen Anchor Net', gridPos: { row: 0, col: 10 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 5400, crops: 4500 } }, zone: 'zone2' },
  { id: 'frozen_fish_trawling_raft', name: 'Glacier Trawler', gridPos: { row: 2, col: 10 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 4.8, boosts: null, unlock: { type: 'cost', cost: { driftwood: 2250 } }, zone: 'zone2' },
  { id: 'frozen_fish_tide_pool_trap', name: 'Frostbound Tide Trap', gridPos: { row: 5, col: 8 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 4.8, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 22500 }, zone: 'zone2' },
  { id: 'frozen_fish_deep_sea_longline', name: 'Deep-Ice Longline', gridPos: { row: 1, col: 11 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 6, boosts: null, unlock: { type: 'cost', cost: { fish: 5400, driftwood: 3600 } }, zone: 'zone2' },
  { id: 'frozen_fish_grand_fishery', name: 'Grand Frozen Fishery', gridPos: { row: 3, col: 6 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 8, boosts: null, unlock: { type: 'cost', cost: { kelp: 6300, crops: 4500 } }, zone: 'zone2' },
  { id: 'frozen_fish_open_ocean_trawler', name: 'Open-Ice Trawler', gridPos: { row: 0, col: 9 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 7.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 3600 }, zone: 'zone2' },
  { id: 'frozen_fish_leviathan_net', name: 'Leviathan Ice Net', gridPos: { row: 4, col: 7 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 10, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 18000 }, zone: 'zone2' },

  // Kelp family
  { id: 'frozen_kelp_nursery', name: 'Frost Kelp Nursery', gridPos: { row: 2, col: 6 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 4.8, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 13500 }, zone: 'zone2' },
  { id: 'frozen_kelp_start', name: 'Rimed Kelp Farm', gridPos: { row: 4, col: 8 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 6300, crops: 5400 } }, zone: 'zone2' },
  { id: 'frozen_kelp_seaweed_raft', name: 'Frozen Seaweed Raft', gridPos: { row: 1, col: 9 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 2700 } }, zone: 'zone2' },
  { id: 'frozen_kelp_floating_garden', name: 'Icebound Floating Garden', gridPos: { row: 1, col: 7 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 4.8, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 13500 }, zone: 'zone2' },
  { id: 'frozen_kelp_deep_bed', name: 'Deep Frost Kelp Bed', gridPos: { row: 4, col: 10 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 6, boosts: null, unlock: { type: 'cost', cost: { driftwood: 8100, crops: 6300 } }, zone: 'zone2' },
  { id: 'frozen_kelp_reef', name: 'Glacial Kelp Reef', gridPos: { row: 3, col: 9 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 8, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 5400 }, zone: 'zone2' },
  { id: 'frozen_kelp_open_water_farm', name: 'Open-Water Frost Farm', gridPos: { row: 1, col: 6 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 7.2, boosts: null, unlock: { type: 'cost', cost: { fish: 7200, driftwood: 6300 } }, zone: 'zone2' },
  { id: 'frozen_kelp_abyssal_forest', name: 'Abyssal Ice Forest', gridPos: { row: 2, col: 8 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 10, boosts: null, unlock: { type: 'cost', cost: { driftwood: 3600 } }, zone: 'zone2' },

  // Driftwood family
  { id: 'frozen_driftwood_start', name: 'Glacier Driftwood Collector', gridPos: { row: 2, col: 9 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 2, boosts: null, unlock: { type: 'cost', cost: { crops: 3600 } }, zone: 'zone2' },
  { id: 'frozen_driftwood_salvage_raft', name: 'Frozen Salvage Raft', gridPos: { row: 5, col: 11 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 2.4, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 45000 }, zone: 'zone2' },
  { id: 'frozen_driftwood_debris_net', name: 'Ice Debris Net', gridPos: { row: 5, col: 10 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 2.4, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 36000 }, zone: 'zone2' },
  { id: 'frozen_driftwood_current_sweeper', name: 'Frost Current Sweeper', gridPos: { row: 5, col: 9 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 3.2, boosts: null, unlock: { type: 'cost', cost: { fish: 13500, kelp: 13500 } }, zone: 'zone2' },
  { id: 'frozen_driftwood_storm_wreckage', name: 'Storm-Locked Wreckage', gridPos: { row: 3, col: 11 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 3600 } }, zone: 'zone2' },
  { id: 'frozen_driftwood_flotsam_dredge', name: 'Frozen Flotsam Dredge', gridPos: { row: 2, col: 11 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 4, boosts: null, unlock: { type: 'cost', cost: { crops: 4050 } }, zone: 'zone2' },
  { id: 'frozen_driftwood_shipwreck_salvage', name: 'Ice-Locked Shipwreck', gridPos: { row: 3, col: 10 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 5.2, boosts: null, unlock: { type: 'cost', cost: { driftwood: 3150, crops: 2250 } }, zone: 'zone2' },

  // Crops family
  { id: 'frozen_crops_start', name: 'Tundra Planter Raft', gridPos: { row: 5, col: 7 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 2, boosts: null, unlock: { type: 'cost', cost: { fish: 9000, driftwood: 9000 } }, zone: 'zone2' },
  { id: 'frozen_crops_soil_barge', name: 'Frozen Soil Barge', gridPos: { row: 3, col: 8 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 2.4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 3150 } }, zone: 'zone2' },
  { id: 'frozen_crops_hanging_garden', name: 'Icebound Hanging Garden', gridPos: { row: 4, col: 9 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 2.4, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 10800 }, zone: 'zone2' },
  { id: 'frozen_crops_terraced_planter', name: 'Frost-Terraced Planter', gridPos: { row: 0, col: 11 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 3.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 27000 }, zone: 'zone2' },
  { id: 'frozen_crops_floating_orchard', name: 'Frozen Floating Orchard', gridPos: { row: 0, col: 8 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 2700, crops: 1800 } }, zone: 'zone2' },
  { id: 'frozen_crops_paddy_raft', name: 'Glacial Paddy Raft', gridPos: { row: 4, col: 11 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 12600, crops: 10800 } }, zone: 'zone2' },
  { id: 'frozen_crops_vertical_farm', name: 'Vertical Frost Farm', gridPos: { row: 2, col: 7 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 5.2, boosts: null, unlock: { type: 'cost', cost: { driftwood: 4950 } }, zone: 'zone2' },

  // Booster family
  { id: 'frozen_booster_drying_rack', name: 'Frozen Drying Rack', gridPos: { row: 1, col: 10 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'kelp', percent: 80 }, { resource: 'driftwood', percent: 80 }], unlock: { type: 'milestone', resource: 'crops', target: 3600 }, zone: 'zone2' },
  { id: 'frozen_booster_smokehouse', name: 'Glacier Smokehouse', gridPos: { row: 5, col: 6 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 100 }], unlock: { type: 'cost', cost: { kelp: 18000, driftwood: 18000 } }, zone: 'zone2' },
  { id: 'frozen_booster_windmill', name: 'Frostwind Mill', gridPos: { row: 1, col: 8 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 100 }], unlock: { type: 'cost', cost: { driftwood: 1800 } }, zone: 'zone2' },
  { id: 'frozen_booster_net_weavers', name: 'Ice Net Weavers', gridPos: { row: 0, col: 6 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 80 }, { resource: 'kelp', percent: 80 }], unlock: { type: 'cost', cost: { fish: 10800, driftwood: 8100 } }, zone: 'zone2' },
  { id: 'frozen_booster_composting_shed', name: 'Frozen Composting Shed', gridPos: { row: 3, col: 7 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 80 }, { resource: 'driftwood', percent: 80 }], unlock: { type: 'milestone', resource: 'driftwood', target: 8100 }, zone: 'zone2' },
  { id: 'frozen_booster_lighthouse', name: 'Aurora Lighthouse', gridPos: { row: 4, col: 6 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 60 }, { resource: 'kelp', percent: 60 }, { resource: 'driftwood', percent: 60 }, { resource: 'crops', percent: 60 }], unlock: { type: 'cost', cost: { kelp: 10800, driftwood: 8100 } }, zone: 'zone2' },

  // ===== Zone 3: Abyssal Trench ===== (mirrors zone 2's grid shape at col+6;
  // costs/milestones are 90x zone-2's, rates/boosts are 4x zone-2's -- the same
  // ratio zone 2 itself used over zone 1)
  // Fish family
  { id: 'abyssal_fish_start', name: 'Anglerfish Trap', gridPos: { row: 0, col: 13 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 16, boosts: null, unlock: { type: 'cost', cost: { driftwood: 405000, crops: 324000 } }, zone: 'zone3' },
  { id: 'abyssal_fish_anchored_net', name: 'Sunken Anchor Net', gridPos: { row: 0, col: 16 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 16, boosts: null, unlock: { type: 'cost', cost: { driftwood: 486000, crops: 405000 } }, zone: 'zone3' },
  { id: 'abyssal_fish_trawling_raft', name: 'Trench Trawler', gridPos: { row: 2, col: 16 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 19.2, boosts: null, unlock: { type: 'cost', cost: { driftwood: 202500 } }, zone: 'zone3' },
  { id: 'abyssal_fish_tide_pool_trap', name: 'Vent-Side Trap', gridPos: { row: 5, col: 14 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 19.2, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 2025000 }, zone: 'zone3' },
  { id: 'abyssal_fish_deep_sea_longline', name: 'Deep Longline', gridPos: { row: 1, col: 17 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 24, boosts: null, unlock: { type: 'cost', cost: { fish: 486000, driftwood: 324000 } }, zone: 'zone3' },
  { id: 'abyssal_fish_grand_fishery', name: 'Grand Abyssal Fishery', gridPos: { row: 3, col: 12 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 32, boosts: null, unlock: { type: 'cost', cost: { kelp: 567000, crops: 405000 } }, zone: 'zone3' },
  { id: 'abyssal_fish_open_ocean_trawler', name: 'Open-Trench Trawler', gridPos: { row: 0, col: 15 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 28.8, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 324000 }, zone: 'zone3' },
  { id: 'abyssal_fish_leviathan_net', name: 'Leviathan Maw', gridPos: { row: 4, col: 13 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 40, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 1620000 }, zone: 'zone3' },

  // Kelp family
  { id: 'abyssal_kelp_nursery', name: 'Tube Worm Nursery', gridPos: { row: 2, col: 12 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 19.2, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 1215000 }, zone: 'zone3' },
  { id: 'abyssal_kelp_start', name: 'Bristle Worm Bed', gridPos: { row: 4, col: 14 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 16, boosts: null, unlock: { type: 'cost', cost: { driftwood: 567000, crops: 486000 } }, zone: 'zone3' },
  { id: 'abyssal_kelp_seaweed_raft', name: 'Vent Worm Raft', gridPos: { row: 1, col: 15 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 16, boosts: null, unlock: { type: 'cost', cost: { driftwood: 243000 } }, zone: 'zone3' },
  { id: 'abyssal_kelp_floating_garden', name: 'Floating Worm Garden', gridPos: { row: 1, col: 13 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 19.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 1215000 }, zone: 'zone3' },
  { id: 'abyssal_kelp_deep_bed', name: 'Deep Worm Bed', gridPos: { row: 4, col: 16 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 24, boosts: null, unlock: { type: 'cost', cost: { driftwood: 729000, crops: 567000 } }, zone: 'zone3' },
  { id: 'abyssal_kelp_reef', name: 'Worm Reef', gridPos: { row: 3, col: 15 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 32, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 486000 }, zone: 'zone3' },
  { id: 'abyssal_kelp_open_water_farm', name: 'Open-Trench Worm Farm', gridPos: { row: 1, col: 12 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 28.8, boosts: null, unlock: { type: 'cost', cost: { fish: 648000, driftwood: 567000 } }, zone: 'zone3' },
  { id: 'abyssal_kelp_abyssal_forest', name: 'Abyssal Worm Forest', gridPos: { row: 2, col: 14 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 40, boosts: null, unlock: { type: 'cost', cost: { driftwood: 324000 } }, zone: 'zone3' },

  // Driftwood family
  { id: 'abyssal_driftwood_start', name: 'Bone Collector', gridPos: { row: 2, col: 15 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 8, boosts: null, unlock: { type: 'cost', cost: { crops: 324000 } }, zone: 'zone3' },
  { id: 'abyssal_driftwood_salvage_raft', name: 'Sunken Salvage Raft', gridPos: { row: 5, col: 17 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 9.6, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 4050000 }, zone: 'zone3' },
  { id: 'abyssal_driftwood_debris_net', name: 'Skeletal Debris Net', gridPos: { row: 5, col: 16 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 9.6, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 3240000 }, zone: 'zone3' },
  { id: 'abyssal_driftwood_current_sweeper', name: 'Current-Swept Bones', gridPos: { row: 5, col: 15 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 12.8, boosts: null, unlock: { type: 'cost', cost: { fish: 1215000, kelp: 1215000 } }, zone: 'zone3' },
  { id: 'abyssal_driftwood_storm_wreckage', name: 'Storm-Sunk Wreckage', gridPos: { row: 3, col: 17 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 16, boosts: null, unlock: { type: 'cost', cost: { driftwood: 324000 } }, zone: 'zone3' },
  { id: 'abyssal_driftwood_flotsam_dredge', name: 'Bone Dredge', gridPos: { row: 2, col: 17 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 16, boosts: null, unlock: { type: 'cost', cost: { crops: 364500 } }, zone: 'zone3' },
  { id: 'abyssal_driftwood_shipwreck_salvage', name: 'Drowned Shipwreck', gridPos: { row: 3, col: 16 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 20.8, boosts: null, unlock: { type: 'cost', cost: { driftwood: 283500, crops: 202500 } }, zone: 'zone3' },

  // Crops family
  { id: 'abyssal_crops_start', name: 'Vent Garden Plot', gridPos: { row: 5, col: 13 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 8, boosts: null, unlock: { type: 'cost', cost: { fish: 810000, driftwood: 810000 } }, zone: 'zone3' },
  { id: 'abyssal_crops_soil_barge', name: 'Mineral Soil Vent', gridPos: { row: 3, col: 14 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 9.6, boosts: null, unlock: { type: 'cost', cost: { driftwood: 283500 } }, zone: 'zone3' },
  { id: 'abyssal_crops_hanging_garden', name: 'Hanging Vent Garden', gridPos: { row: 4, col: 15 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 9.6, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 972000 }, zone: 'zone3' },
  { id: 'abyssal_crops_terraced_planter', name: 'Terraced Vent Beds', gridPos: { row: 0, col: 17 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 12.8, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 2430000 }, zone: 'zone3' },
  { id: 'abyssal_crops_floating_orchard', name: 'Floating Spore Garden', gridPos: { row: 0, col: 14 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 16, boosts: null, unlock: { type: 'cost', cost: { driftwood: 243000, crops: 162000 } }, zone: 'zone3' },
  { id: 'abyssal_crops_paddy_raft', name: 'Vent Paddy', gridPos: { row: 4, col: 17 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 16, boosts: null, unlock: { type: 'cost', cost: { driftwood: 1134000, crops: 972000 } }, zone: 'zone3' },
  { id: 'abyssal_crops_vertical_farm', name: 'Vertical Vent Farm', gridPos: { row: 2, col: 13 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 20.8, boosts: null, unlock: { type: 'cost', cost: { driftwood: 445500 } }, zone: 'zone3' },

  // Booster family
  { id: 'abyssal_booster_drying_rack', name: 'Bone Rack', gridPos: { row: 1, col: 16 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'kelp', percent: 320 }, { resource: 'driftwood', percent: 320 }], unlock: { type: 'milestone', resource: 'crops', target: 324000 }, zone: 'zone3' },
  { id: 'abyssal_booster_smokehouse', name: 'Vent Chimney', gridPos: { row: 5, col: 12 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 400 }], unlock: { type: 'cost', cost: { kelp: 1620000, driftwood: 1620000 } }, zone: 'zone3' },
  { id: 'abyssal_booster_windmill', name: 'Current Turbine', gridPos: { row: 1, col: 14 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 400 }], unlock: { type: 'cost', cost: { driftwood: 162000 } }, zone: 'zone3' },
  { id: 'abyssal_booster_net_weavers', name: 'Filter Web', gridPos: { row: 0, col: 12 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 320 }, { resource: 'kelp', percent: 320 }], unlock: { type: 'cost', cost: { fish: 972000, driftwood: 729000 } }, zone: 'zone3' },
  { id: 'abyssal_booster_composting_shed', name: 'Ossuary', gridPos: { row: 3, col: 13 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 320 }, { resource: 'driftwood', percent: 320 }], unlock: { type: 'milestone', resource: 'driftwood', target: 729000 }, zone: 'zone3' },
  { id: 'abyssal_booster_lighthouse', name: 'Anglerfish Lure', gridPos: { row: 4, col: 12 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 240 }, { resource: 'kelp', percent: 240 }, { resource: 'driftwood', percent: 240 }, { resource: 'crops', percent: 240 }], unlock: { type: 'cost', cost: { kelp: 972000, driftwood: 729000 } }, zone: 'zone3' },

  // ===== Zone 4: Timberline Coast ===== (north of zone 1: rows -6..-1, same cols 0-5 -- the hex
  // adjacency math works on raw row/col, so this needs no changes there. Every non-booster tile
  // is a *generator*: it consumes existing resources to make a new one (planks/kelp_rope/bread),
  // instead of producing from nothing like every other tile in the game. Cost/rate scale with
  // distance from zone 1 (ring 1 = bordering row, ring 6 = farthest) rather than a flat per-zone
  // multiplier: ring 1 costs zone-1-level amounts of the base 4 resources, rings 4-6 shift to
  // costing planks/kelp_rope/bread themselves (the bootstrap loop). First-pass numbers, not
  // simulated -- see docs/superpowers/specs/2026-09-24-drift-away-zone4-design.md.
  { id: 'timberline_sawmill_1', name: 'Driftwood Sawpit', gridPos: { row: -1, col: 0 }, family: 'planks', kind: 'generator', produces: 'planks', rate: 0.6, consumes: { driftwood: 1.2 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 30 } }, zone: 'zone4' },
  { id: 'timberline_sawmill_2', name: 'Timber Saw', gridPos: { row: -1, col: 3 }, family: 'planks', kind: 'generator', produces: 'planks', rate: 0.65, consumes: { driftwood: 1.3 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 35 } }, zone: 'zone4' },
  { id: 'timberline_ropeworks_1', name: 'Kelp Ropewalk', gridPos: { row: -1, col: 1 }, family: 'kelp_rope', kind: 'generator', produces: 'kelp_rope', rate: 0.5, consumes: { kelp: 0.65, driftwood: 0.5 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 24, kelp: 16 } }, zone: 'zone4' },
  { id: 'timberline_ropeworks_2', name: 'Twisting Frame', gridPos: { row: -1, col: 4 }, family: 'kelp_rope', kind: 'generator', produces: 'kelp_rope', rate: 0.54, consumes: { kelp: 0.7, driftwood: 0.54 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 28, kelp: 18 } }, zone: 'zone4' },
  { id: 'timberline_bakehouse_1', name: 'Coastal Bakehouse', gridPos: { row: -1, col: 2 }, family: 'bread', kind: 'generator', produces: 'bread', rate: 0.5, consumes: { crops: 0.65, driftwood: 0.5 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 24, crops: 16 } }, zone: 'zone4' },
  { id: 'timberline_booster_tool_shed', name: 'Tool Shed', gridPos: { row: -1, col: 5 }, family: 'booster', kind: 'booster', produces: null, rate: null, consumes: null, boosts: [{ resource: 'planks', percent: 25 }], unlock: { type: 'cost', cost: { driftwood: 35 } }, zone: 'zone4' },
  { id: 'timberline_sawmill_3', name: 'Plank Press', gridPos: { row: -2, col: 4 }, family: 'planks', kind: 'generator', produces: 'planks', rate: 1.11, consumes: { driftwood: 2.22 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 156 } }, zone: 'zone4' },
  { id: 'timberline_ropeworks_3', name: 'Fiber Spinner', gridPos: { row: -2, col: 1 }, family: 'kelp_rope', kind: 'generator', produces: 'kelp_rope', rate: 0.93, consumes: { kelp: 1.21, driftwood: 0.93 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 125, kelp: 83 } }, zone: 'zone4' },
  { id: 'timberline_ropeworks_4', name: 'Driftline Works', gridPos: { row: -2, col: 5 }, family: 'kelp_rope', kind: 'generator', produces: 'kelp_rope', rate: 0.99, consumes: { kelp: 1.29, driftwood: 0.99 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 139, kelp: 93 } }, zone: 'zone4' },
  { id: 'timberline_bakehouse_2', name: 'Clay Oven', gridPos: { row: -2, col: 0 }, family: 'bread', kind: 'generator', produces: 'bread', rate: 0.86, consumes: { crops: 1.12, driftwood: 0.86 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 110, crops: 74 } }, zone: 'zone4' },
  { id: 'timberline_bakehouse_3', name: 'Hearth House', gridPos: { row: -2, col: 3 }, family: 'bread', kind: 'generator', produces: 'bread', rate: 0.93, consumes: { crops: 1.21, driftwood: 0.93 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 125, crops: 83 } }, zone: 'zone4' },
  { id: 'timberline_booster_drying_frames', name: 'Drying Frames', gridPos: { row: -2, col: 2 }, family: 'booster', kind: 'booster', produces: null, rate: null, consumes: null, boosts: [{ resource: 'kelp_rope', percent: 25 }], unlock: { type: 'cost', cost: { driftwood: 140 } }, zone: 'zone4' },
  { id: 'timberline_sawmill_4', name: 'Ripsaw Platform', gridPos: { row: -3, col: 2 }, family: 'planks', kind: 'generator', produces: 'planks', rate: 1.9, consumes: { driftwood: 3.8 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 696 } }, zone: 'zone4' },
  { id: 'timberline_sawmill_5', name: 'Millrace Saw', gridPos: { row: -3, col: 5 }, family: 'planks', kind: 'generator', produces: 'planks', rate: 2.03, consumes: { driftwood: 4.06 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 768 } }, zone: 'zone4' },
  { id: 'timberline_ropeworks_5', name: 'Coilworks', gridPos: { row: -3, col: 0 }, family: 'kelp_rope', kind: 'generator', produces: 'kelp_rope', rate: 1.69, consumes: { kelp: 2.2, driftwood: 1.69 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 614, kelp: 410 } }, zone: 'zone4' },
  { id: 'timberline_bakehouse_4', name: 'Millstone Bakery', gridPos: { row: -3, col: 3 }, family: 'bread', kind: 'generator', produces: 'bread', rate: 1.59, consumes: { crops: 2.07, driftwood: 1.59 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 557, crops: 371 } }, zone: 'zone4' },
  { id: 'timberline_bakehouse_5', name: 'Driftwood Cookhouse', gridPos: { row: -3, col: 1 }, family: 'bread', kind: 'generator', produces: 'bread', rate: 1.69, consumes: { crops: 2.2, driftwood: 1.69 }, boosts: null, unlock: { type: 'cost', cost: { driftwood: 614, crops: 410 } }, zone: 'zone4' },
  { id: 'timberline_booster_grain_silo', name: 'Grain Silo', gridPos: { row: -3, col: 4 }, family: 'booster', kind: 'booster', produces: null, rate: null, consumes: null, boosts: [{ resource: 'bread', percent: 25 }], unlock: { type: 'cost', cost: { driftwood: 560 } }, zone: 'zone4' },
  { id: 'timberline_sawmill_6', name: 'Twin-Blade Mill', gridPos: { row: -4, col: 3 }, family: 'planks', kind: 'generator', produces: 'planks', rate: 3.44, consumes: { driftwood: 6.88 }, boosts: null, unlock: { type: 'cost', cost: { planks: 48 } }, zone: 'zone4' },
  { id: 'timberline_sawmill_7', name: 'Highland Sawworks', gridPos: { row: -4, col: 0 }, family: 'planks', kind: 'generator', produces: 'planks', rate: 3.64, consumes: { driftwood: 7.28 }, boosts: null, unlock: { type: 'cost', cost: { planks: 52 } }, zone: 'zone4' },
  { id: 'timberline_ropeworks_6', name: 'Highland Ropewalk', gridPos: { row: -4, col: 4 }, family: 'kelp_rope', kind: 'generator', produces: 'kelp_rope', rate: 2.87, consumes: { kelp: 3.73, driftwood: 2.87 }, boosts: null, unlock: { type: 'cost', cost: { kelp_rope: 38 } }, zone: 'zone4' },
  { id: 'timberline_ropeworks_7', name: 'Grand Ropewalk', gridPos: { row: -4, col: 2 }, family: 'kelp_rope', kind: 'generator', produces: 'kelp_rope', rate: 3.03, consumes: { kelp: 3.94, driftwood: 3.03 }, boosts: null, unlock: { type: 'cost', cost: { kelp_rope: 41 } }, zone: 'zone4' },
  { id: 'timberline_bakehouse_6', name: 'Highland Bakehouse', gridPos: { row: -4, col: 5 }, family: 'bread', kind: 'generator', produces: 'bread', rate: 2.87, consumes: { crops: 3.73, driftwood: 2.87 }, boosts: null, unlock: { type: 'cost', cost: { bread: 38 } }, zone: 'zone4' },
  { id: 'timberline_booster_timber_yard', name: 'Timber Yard', gridPos: { row: -4, col: 1 }, family: 'booster', kind: 'booster', produces: null, rate: null, consumes: null, boosts: [{ resource: 'planks', percent: 20 }, { resource: 'kelp_rope', percent: 20 }], unlock: { type: 'cost', cost: { planks: 20 } }, zone: 'zone4' },
  { id: 'timberline_sawmill_8', name: 'Grand Timber Mill', gridPos: { row: -5, col: 1 }, family: 'planks', kind: 'generator', produces: 'planks', rate: 6.13, consumes: { driftwood: 12.26 }, boosts: null, unlock: { type: 'cost', cost: { planks: 221 } }, zone: 'zone4' },
  { id: 'timberline_ropeworks_8', name: 'Open-Coast Cordage', gridPos: { row: -5, col: 4 }, family: 'kelp_rope', kind: 'generator', produces: 'kelp_rope', rate: 5.11, consumes: { kelp: 6.64, driftwood: 5.11 }, boosts: null, unlock: { type: 'cost', cost: { kelp_rope: 177 } }, zone: 'zone4' },
  { id: 'timberline_ropeworks_9', name: 'Braided Works', gridPos: { row: -5, col: 2 }, family: 'kelp_rope', kind: 'generator', produces: 'kelp_rope', rate: 5.37, consumes: { kelp: 6.98, driftwood: 5.37 }, boosts: null, unlock: { type: 'cost', cost: { kelp_rope: 188 } }, zone: 'zone4' },
  { id: 'timberline_bakehouse_7', name: 'Grand Bakehouse', gridPos: { row: -5, col: 5 }, family: 'bread', kind: 'generator', produces: 'bread', rate: 4.85, consumes: { crops: 6.31, driftwood: 4.85 }, boosts: null, unlock: { type: 'cost', cost: { bread: 165 } }, zone: 'zone4' },
  { id: 'timberline_bakehouse_8', name: 'Open-Coast Ovens', gridPos: { row: -5, col: 0 }, family: 'bread', kind: 'generator', produces: 'bread', rate: 5.11, consumes: { crops: 6.64, driftwood: 5.11 }, boosts: null, unlock: { type: 'cost', cost: { bread: 177 } }, zone: 'zone4' },
  { id: 'timberline_booster_provision_store', name: 'Provision Store', gridPos: { row: -5, col: 3 }, family: 'booster', kind: 'booster', produces: null, rate: null, consumes: null, boosts: [{ resource: 'kelp_rope', percent: 20 }, { resource: 'bread', percent: 20 }], unlock: { type: 'cost', cost: { kelp_rope: 80 } }, zone: 'zone4' },
  { id: 'timberline_sawmill_9', name: 'Open-Coast Sawmill', gridPos: { row: -6, col: 5 }, family: 'planks', kind: 'generator', produces: 'planks', rate: 10.32, consumes: { driftwood: 20.64 }, boosts: null, unlock: { type: 'cost', cost: { planks: 941 } }, zone: 'zone4' },
  { id: 'timberline_sawmill_10', name: 'Old-Growth Mill', gridPos: { row: -6, col: 2 }, family: 'planks', kind: 'generator', produces: 'planks', rate: 10.82, consumes: { driftwood: 21.64 }, boosts: null, unlock: { type: 'cost', cost: { planks: 998 } }, zone: 'zone4' },
  { id: 'timberline_ropeworks_10', name: 'Old Tackle Yard', gridPos: { row: -6, col: 3 }, family: 'kelp_rope', kind: 'generator', produces: 'kelp_rope', rate: 9.02, consumes: { kelp: 11.73, driftwood: 9.02 }, boosts: null, unlock: { type: 'cost', cost: { kelp_rope: 799 } }, zone: 'zone4' },
  { id: 'timberline_bakehouse_9', name: 'Stone Hearth', gridPos: { row: -6, col: 1 }, family: 'bread', kind: 'generator', produces: 'bread', rate: 8.6, consumes: { crops: 11.18, driftwood: 8.6 }, boosts: null, unlock: { type: 'cost', cost: { bread: 753 } }, zone: 'zone4' },
  { id: 'timberline_bakehouse_10', name: 'Old Rising House', gridPos: { row: -6, col: 4 }, family: 'bread', kind: 'generator', produces: 'bread', rate: 9.02, consumes: { crops: 11.73, driftwood: 9.02 }, boosts: null, unlock: { type: 'cost', cost: { bread: 799 } }, zone: 'zone4' },
  { id: 'timberline_booster_millhouse', name: 'Millhouse', gridPos: { row: -6, col: 0 }, family: 'booster', kind: 'booster', produces: null, rate: null, consumes: null, boosts: [{ resource: 'planks', percent: 15 }, { resource: 'kelp_rope', percent: 15 }, { resource: 'bread', percent: 15 }], unlock: { type: 'cost', cost: { planks: 320 } }, zone: 'zone4' },
];

function neighborGridPositions(row, col) {
  const deltas = row % 2 === 0
    ? [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]]
    : [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]];
  return deltas.map(([dr, dc]) => [row + dr, col + dc]);
}

const tileIdByPosition = new Map(TILES.map((t) => [`${t.gridPos.row},${t.gridPos.col}`, t.id]));

export const TILE_NEIGHBORS = new Map(
  TILES.map((t) => {
    const neighborIds = neighborGridPositions(t.gridPos.row, t.gridPos.col)
      .map(([r, c]) => tileIdByPosition.get(`${r},${c}`))
      .filter(Boolean);
    return [t.id, neighborIds];
  })
);
