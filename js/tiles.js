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
  { id: 'frozen_fish_start', name: 'Ice-Locked Raft', gridPos: { row: 0, col: 7 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 750, crops: 600 } }, zone: 'zone2' },
  { id: 'frozen_fish_anchored_net', name: 'Frozen Anchor Net', gridPos: { row: 0, col: 10 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 900, crops: 750 } }, zone: 'zone2' },
  { id: 'frozen_fish_trawling_raft', name: 'Glacier Trawler', gridPos: { row: 2, col: 10 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 4.8, boosts: null, unlock: { type: 'cost', cost: { driftwood: 375 } }, zone: 'zone2' },
  { id: 'frozen_fish_tide_pool_trap', name: 'Frostbound Tide Trap', gridPos: { row: 5, col: 8 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 4.8, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 3750 }, zone: 'zone2' },
  { id: 'frozen_fish_deep_sea_longline', name: 'Deep-Ice Longline', gridPos: { row: 1, col: 11 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 6, boosts: null, unlock: { type: 'cost', cost: { fish: 900, driftwood: 600 } }, zone: 'zone2' },
  { id: 'frozen_fish_grand_fishery', name: 'Grand Frozen Fishery', gridPos: { row: 3, col: 6 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 8, boosts: null, unlock: { type: 'cost', cost: { kelp: 1050, crops: 750 } }, zone: 'zone2' },
  { id: 'frozen_fish_open_ocean_trawler', name: 'Open-Ice Trawler', gridPos: { row: 0, col: 9 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 7.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 600 }, zone: 'zone2' },
  { id: 'frozen_fish_leviathan_net', name: 'Leviathan Ice Net', gridPos: { row: 4, col: 7 }, family: 'fish', kind: 'producer', produces: 'fish', rate: 10, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 3000 }, zone: 'zone2' },

  // Kelp family
  { id: 'frozen_kelp_nursery', name: 'Frost Kelp Nursery', gridPos: { row: 2, col: 6 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 4.8, boosts: null, unlock: { type: 'milestone', resource: 'crops', target: 2250 }, zone: 'zone2' },
  { id: 'frozen_kelp_start', name: 'Rimed Kelp Farm', gridPos: { row: 4, col: 8 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 1050, crops: 900 } }, zone: 'zone2' },
  { id: 'frozen_kelp_seaweed_raft', name: 'Frozen Seaweed Raft', gridPos: { row: 1, col: 9 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 450 } }, zone: 'zone2' },
  { id: 'frozen_kelp_floating_garden', name: 'Icebound Floating Garden', gridPos: { row: 1, col: 7 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 4.8, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 2250 }, zone: 'zone2' },
  { id: 'frozen_kelp_deep_bed', name: 'Deep Frost Kelp Bed', gridPos: { row: 4, col: 10 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 6, boosts: null, unlock: { type: 'cost', cost: { driftwood: 1350, crops: 1050 } }, zone: 'zone2' },
  { id: 'frozen_kelp_reef', name: 'Glacial Kelp Reef', gridPos: { row: 3, col: 9 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 8, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 900 }, zone: 'zone2' },
  { id: 'frozen_kelp_open_water_farm', name: 'Open-Water Frost Farm', gridPos: { row: 1, col: 6 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 7.2, boosts: null, unlock: { type: 'cost', cost: { fish: 1200, driftwood: 1050 } }, zone: 'zone2' },
  { id: 'frozen_kelp_abyssal_forest', name: 'Abyssal Ice Forest', gridPos: { row: 2, col: 8 }, family: 'kelp', kind: 'producer', produces: 'kelp', rate: 10, boosts: null, unlock: { type: 'cost', cost: { driftwood: 600 } }, zone: 'zone2' },

  // Driftwood family
  { id: 'frozen_driftwood_start', name: 'Glacier Driftwood Collector', gridPos: { row: 2, col: 9 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 2, boosts: null, unlock: { type: 'cost', cost: { crops: 600 } }, zone: 'zone2' },
  { id: 'frozen_driftwood_salvage_raft', name: 'Frozen Salvage Raft', gridPos: { row: 5, col: 11 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 2.4, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 7500 }, zone: 'zone2' },
  { id: 'frozen_driftwood_debris_net', name: 'Ice Debris Net', gridPos: { row: 5, col: 10 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 2.4, boosts: null, unlock: { type: 'milestone', resource: 'driftwood', target: 6000 }, zone: 'zone2' },
  { id: 'frozen_driftwood_current_sweeper', name: 'Frost Current Sweeper', gridPos: { row: 5, col: 9 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 3.2, boosts: null, unlock: { type: 'cost', cost: { fish: 2250, kelp: 2250 } }, zone: 'zone2' },
  { id: 'frozen_driftwood_storm_wreckage', name: 'Storm-Locked Wreckage', gridPos: { row: 3, col: 11 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 600 } }, zone: 'zone2' },
  { id: 'frozen_driftwood_flotsam_dredge', name: 'Frozen Flotsam Dredge', gridPos: { row: 2, col: 11 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 4, boosts: null, unlock: { type: 'cost', cost: { crops: 675 } }, zone: 'zone2' },
  { id: 'frozen_driftwood_shipwreck_salvage', name: 'Ice-Locked Shipwreck', gridPos: { row: 3, col: 10 }, family: 'driftwood', kind: 'producer', produces: 'driftwood', rate: 5.2, boosts: null, unlock: { type: 'cost', cost: { driftwood: 525, crops: 375 } }, zone: 'zone2' },

  // Crops family
  { id: 'frozen_crops_start', name: 'Tundra Planter Raft', gridPos: { row: 5, col: 7 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 2, boosts: null, unlock: { type: 'cost', cost: { fish: 1500, driftwood: 1500 } }, zone: 'zone2' },
  { id: 'frozen_crops_soil_barge', name: 'Frozen Soil Barge', gridPos: { row: 3, col: 8 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 2.4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 525 } }, zone: 'zone2' },
  { id: 'frozen_crops_hanging_garden', name: 'Icebound Hanging Garden', gridPos: { row: 4, col: 9 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 2.4, boosts: null, unlock: { type: 'milestone', resource: 'fish', target: 1800 }, zone: 'zone2' },
  { id: 'frozen_crops_terraced_planter', name: 'Frost-Terraced Planter', gridPos: { row: 0, col: 11 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 3.2, boosts: null, unlock: { type: 'milestone', resource: 'kelp', target: 4500 }, zone: 'zone2' },
  { id: 'frozen_crops_floating_orchard', name: 'Frozen Floating Orchard', gridPos: { row: 0, col: 8 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 450, crops: 300 } }, zone: 'zone2' },
  { id: 'frozen_crops_paddy_raft', name: 'Glacial Paddy Raft', gridPos: { row: 4, col: 11 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 4, boosts: null, unlock: { type: 'cost', cost: { driftwood: 2100, crops: 1800 } }, zone: 'zone2' },
  { id: 'frozen_crops_vertical_farm', name: 'Vertical Frost Farm', gridPos: { row: 2, col: 7 }, family: 'crops', kind: 'producer', produces: 'crops', rate: 5.2, boosts: null, unlock: { type: 'cost', cost: { driftwood: 825 } }, zone: 'zone2' },

  // Booster family
  { id: 'frozen_booster_drying_rack', name: 'Frozen Drying Rack', gridPos: { row: 1, col: 10 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'kelp', percent: 80 }, { resource: 'driftwood', percent: 80 }], unlock: { type: 'milestone', resource: 'crops', target: 600 }, zone: 'zone2' },
  { id: 'frozen_booster_smokehouse', name: 'Glacier Smokehouse', gridPos: { row: 5, col: 6 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 100 }], unlock: { type: 'cost', cost: { kelp: 3000, driftwood: 3000 } }, zone: 'zone2' },
  { id: 'frozen_booster_windmill', name: 'Frostwind Mill', gridPos: { row: 1, col: 8 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 100 }], unlock: { type: 'cost', cost: { driftwood: 300 } }, zone: 'zone2' },
  { id: 'frozen_booster_net_weavers', name: 'Ice Net Weavers', gridPos: { row: 0, col: 6 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 80 }, { resource: 'kelp', percent: 80 }], unlock: { type: 'cost', cost: { fish: 1800, driftwood: 1350 } }, zone: 'zone2' },
  { id: 'frozen_booster_composting_shed', name: 'Frozen Composting Shed', gridPos: { row: 3, col: 7 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'crops', percent: 80 }, { resource: 'driftwood', percent: 80 }], unlock: { type: 'milestone', resource: 'driftwood', target: 1350 }, zone: 'zone2' },
  { id: 'frozen_booster_lighthouse', name: 'Aurora Lighthouse', gridPos: { row: 4, col: 6 }, family: 'booster', kind: 'booster', produces: null, rate: null, boosts: [{ resource: 'fish', percent: 60 }, { resource: 'kelp', percent: 60 }, { resource: 'driftwood', percent: 60 }, { resource: 'crops', percent: 60 }], unlock: { type: 'cost', cost: { kelp: 1800, driftwood: 1350 } }, zone: 'zone2' },
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
