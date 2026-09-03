import assert from 'node:assert/strict';
import { TILES } from '../js/tiles.js';

// --- Tile data integrity ---

assert.equal(TILES.length, 25, 'expected exactly 25 tiles');

const ids = TILES.map((t) => t.id);
assert.equal(new Set(ids).size, 25, 'tile ids must be unique');

const positions = TILES.map((t) => `${t.gridPos.row},${t.gridPos.col}`);
assert.equal(new Set(positions).size, 25, 'grid positions must be unique');
for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 5; col++) {
    assert.ok(positions.includes(`${row},${col}`), `missing tile at (${row},${col})`);
  }
}

const startTiles = TILES.filter((t) => t.unlock.type === 'start');
assert.equal(startTiles.length, 4, 'expected exactly 4 starting tiles');
assert.deepEqual(
  startTiles.map((t) => t.family).sort(),
  ['crops', 'driftwood', 'fish', 'kelp'],
  'each resource family should have exactly one starting tile'
);

const familyCounts = TILES.reduce((counts, t) => {
  counts[t.family] = (counts[t.family] || 0) + 1;
  return counts;
}, {});
assert.deepEqual(
  familyCounts,
  { fish: 6, kelp: 6, driftwood: 5, crops: 5, booster: 3 },
  'family counts must match the spec'
);

console.log('tile data tests passed');
