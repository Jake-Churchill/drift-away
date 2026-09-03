export const TILES = [
  // Fish family (base resource: fish)
  { id: 'fish_start', name: 'Fishing Raft', gridPos: { row: 2, col: 2 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.0, boosts: null, unlock: { type: 'start' } },
  { id: 'fish_anchored_net', name: 'Anchored Net', gridPos: { row: 2, col: 3 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 30 } } },
  { id: 'fish_trawling_raft', name: 'Trawling Raft', gridPos: { row: 3, col: 3 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'cost', cost: { kelp: 60, driftwood: 40 } } },
  { id: 'fish_tide_pool_trap', name: 'Tide Pool Trap', gridPos: { row: 3, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 200 } },
  { id: 'fish_deep_sea_longline', name: 'Deep-Sea Longline', gridPos: { row: 4, col: 3 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 150, crops: 100 } } },
  { id: 'fish_grand_fishery', name: 'Grand Fishery', gridPos: { row: 4, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 2.0, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 1000 } },

  // Kelp family (base resource: kelp)
  { id: 'kelp_start', name: 'Kelp Farm', gridPos: { row: 0, col: 1 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.0, boosts: null, unlock: { type: 'start' } },
  { id: 'kelp_seaweed_raft', name: 'Seaweed Raft', gridPos: { row: 0, col: 2 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { fish: 30 } } },
  { id: 'kelp_nursery', name: 'Kelp Nursery', gridPos: { row: 0, col: 0 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'cost', cost: { fish: 50, driftwood: 50 } } },
  { id: 'kelp_floating_garden', name: 'Floating Garden', gridPos: { row: 0, col: 3 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 200 } },
  { id: 'kelp_deep_bed', name: 'Deep Kelp Bed', gridPos: { row: 0, col: 4 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { fish: 120, crops: 100 } } },
  { id: 'kelp_reef', name: 'Kelp Reef', gridPos: { row: 1, col: 4 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 2.0, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 1000 } },

  // Driftwood family (base resource: driftwood)
  { id: 'driftwood_start', name: 'Driftwood Collector', gridPos: { row: 2, col: 1 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.5, boosts: null, unlock: { type: 'start' } },
  { id: 'driftwood_salvage_raft', name: 'Salvage Raft', gridPos: { row: 2, col: 0 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { fish: 40 } } },
  { id: 'driftwood_debris_net', name: 'Debris Net', gridPos: { row: 3, col: 0 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 100 } },
  { id: 'driftwood_current_sweeper', name: 'Current Sweeper', gridPos: { row: 3, col: 1 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.8, boosts: null, unlock: { type: 'cost', cost: { kelp: 80, crops: 60 } } },
  { id: 'driftwood_storm_wreckage', name: 'Storm Wreckage Raft', gridPos: { row: 4, col: 0 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1.0, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 500 } },

  // Crops family (base resource: crops)
  { id: 'crops_start', name: 'Planter Raft', gridPos: { row: 1, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.5, boosts: null, unlock: { type: 'start' } },
  { id: 'crops_soil_barge', name: 'Soil Barge', gridPos: { row: 1, col: 1 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { kelp: 40 } } },
  { id: 'crops_hanging_garden', name: 'Hanging Garden', gridPos: { row: 1, col: 3 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 100 } },
  { id: 'crops_terraced_planter', name: 'Terraced Planter', gridPos: { row: 3, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.8, boosts: null, unlock: { type: 'cost', cost: { fish: 80, driftwood: 60 } } },
  { id: 'crops_floating_orchard', name: 'Floating Orchard', gridPos: { row: 4, col: 1 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1.0, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 500 } },

  // Booster family (no production of their own)
  { id: 'booster_drying_rack', name: 'Drying Rack', gridPos: { row: 1, col: 0 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'kelp', percent: 20 }, { resource: 'driftwood', percent: 20 }], unlock: { type: 'cost', cost: { kelp: 150, driftwood: 150 } } },
  { id: 'booster_smokehouse', name: 'Smokehouse', gridPos: { row: 2, col: 4 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 25 }], unlock: { type: 'cost', cost: { fish: 100, driftwood: 100 } } },
  { id: 'booster_windmill', name: 'Windmill', gridPos: { row: 4, col: 2 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 25 }], unlock: { type: 'milestone', resource: 'crops', target: 300 } },
];
