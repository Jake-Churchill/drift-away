export const TILES = [
  // Fish family (base resource: fish)
  { id: 'fish_start', name: 'Fishing Raft', gridPos: { row: 3, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 35, crops: 25 } } },
  { id: 'fish_anchored_net', name: 'Anchored Net', gridPos: { row: 3, col: 5 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 40 } } },
  { id: 'fish_trawling_raft', name: 'Trawling Raft', gridPos: { row: 4, col: 0 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'cost', cost: { kelp: 120, driftwood: 90 } } },
  { id: 'fish_tide_pool_trap', name: 'Tide Pool Trap', gridPos: { row: 4, col: 1 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 200 } },
  { id: 'fish_deep_sea_longline', name: 'Deep-Sea Longline', gridPos: { row: 4, col: 2 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 70, crops: 60 } } },
  { id: 'fish_grand_fishery', name: 'Grand Fishery', gridPos: { row: 4, col: 3 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 2.0, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 120 } },
  { id: 'fish_open_ocean_trawler', name: 'Open-Ocean Trawler', gridPos: { row: 4, col: 4 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 1.8, boosts: null, unlock: { type: 'cost', cost: { driftwood: 90, crops: 70 } } },
  { id: 'fish_leviathan_net', name: 'Leviathan Net', gridPos: { row: 4, col: 5 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 2.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 140, crops: 120 } } },

  // Kelp family (base resource: kelp)
  { id: 'kelp_nursery', name: 'Kelp Nursery', gridPos: { row: 0, col: 0 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'cost', cost: { fish: 120, driftwood: 90 } } },
  { id: 'kelp_start', name: 'Kelp Farm', gridPos: { row: 0, col: 1 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 50, crops: 40 } } },
  { id: 'kelp_seaweed_raft', name: 'Seaweed Raft', gridPos: { row: 0, col: 2 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 30, crops: 20 } } },
  { id: 'kelp_floating_garden', name: 'Floating Garden', gridPos: { row: 0, col: 3 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 40 } },
  { id: 'kelp_deep_bed', name: 'Deep Kelp Bed', gridPos: { row: 0, col: 4 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 60, crops: 50 } } },
  { id: 'kelp_reef', name: 'Kelp Reef', gridPos: { row: 0, col: 5 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 2.0, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 300 } },
  { id: 'kelp_open_water_farm', name: 'Open-Water Kelp Farm', gridPos: { row: 1, col: 0 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 1.8, boosts: null, unlock: { type: 'cost', cost: { fish: 80, driftwood: 70 } } },
  { id: 'kelp_abyssal_forest', name: 'Abyssal Kelp Forest', gridPos: { row: 1, col: 1 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 2.5, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 150 } },

  // Driftwood family (base resource: driftwood)
  { id: 'driftwood_start', name: 'Driftwood Collector', gridPos: { row: 2, col: 3 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.5, boosts: null, unlock: { type: 'start' } },
  { id: 'driftwood_salvage_raft', name: 'Salvage Raft', gridPos: { row: 2, col: 4 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { driftwood: 25 } } },
  { id: 'driftwood_debris_net', name: 'Debris Net', gridPos: { row: 2, col: 5 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { crops: 45 } } },
  { id: 'driftwood_current_sweeper', name: 'Current Sweeper', gridPos: { row: 3, col: 0 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 0.8, boosts: null, unlock: { type: 'cost', cost: { kelp: 70, crops: 50 } } },
  { id: 'driftwood_storm_wreckage', name: 'Storm Wreckage Raft', gridPos: { row: 3, col: 1 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1.0, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 90 } },
  { id: 'driftwood_flotsam_dredge', name: 'Flotsam Dredge', gridPos: { row: 3, col: 2 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 35 } } },
  { id: 'driftwood_shipwreck_salvage', name: 'Shipwreck Salvage', gridPos: { row: 3, col: 3 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 1.3, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 60 } },

  // Crops family (base resource: crops)
  { id: 'crops_start', name: 'Planter Raft', gridPos: { row: 1, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.5, boosts: null, unlock: { type: 'cost', cost: { driftwood: 20 } } },
  { id: 'crops_soil_barge', name: 'Soil Barge', gridPos: { row: 1, col: 3 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'cost', cost: { driftwood: 30 } } },
  { id: 'crops_hanging_garden', name: 'Hanging Garden', gridPos: { row: 1, col: 4 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.6, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 40 } },
  { id: 'crops_terraced_planter', name: 'Terraced Planter', gridPos: { row: 1, col: 5 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 0.8, boosts: null, unlock: { type: 'cost', cost: { fish: 60, driftwood: 40 } } },
  { id: 'crops_floating_orchard', name: 'Floating Orchard', gridPos: { row: 2, col: 0 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1.0, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 150 } },
  { id: 'crops_paddy_raft', name: 'Paddy Raft', gridPos: { row: 2, col: 1 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1.0, boosts: null, unlock: { type: 'cost', cost: { driftwood: 55 } } },
  { id: 'crops_vertical_farm', name: 'Vertical Farm', gridPos: { row: 2, col: 2 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 1.3, boosts: null, unlock: { type: 'cost', cost: { driftwood: 40 } } },

  // Booster family (no production of their own)
  { id: 'booster_drying_rack', name: 'Drying Rack', gridPos: { row: 5, col: 0 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'kelp', percent: 20 }, { resource: 'driftwood', percent: 20 }], unlock: { type: 'cost', cost: { kelp: 200, driftwood: 200 } } },
  { id: 'booster_smokehouse', name: 'Smokehouse', gridPos: { row: 5, col: 1 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 25 }], unlock: { type: 'cost', cost: { fish: 100, driftwood: 100 } } },
  { id: 'booster_windmill', name: 'Windmill', gridPos: { row: 5, col: 2 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 25 }], unlock: { type: 'milestone', resource: 'crops', target: 250 } },
  { id: 'booster_net_weavers', name: 'Net Weavers', gridPos: { row: 5, col: 3 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 20 }, { resource: 'kelp', percent: 20 }], unlock: { type: 'cost', cost: { fish: 150, kelp: 150 } } },
  { id: 'booster_composting_shed', name: 'Composting Shed', gridPos: { row: 5, col: 4 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 20 }, { resource: 'driftwood', percent: 20 }], unlock: { type: 'milestone', resource: 'driftwood', target: 400 } },
  { id: 'booster_lighthouse', name: 'Lighthouse', gridPos: { row: 5, col: 5 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 15 }, { resource: 'kelp', percent: 15 }, { resource: 'driftwood', percent: 15 }, { resource: 'crops', percent: 15 }], unlock: { type: 'milestone', resource: 'fish', target: 500 } },
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
