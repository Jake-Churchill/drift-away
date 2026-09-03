import assert from 'node:assert/strict';
import { TILES } from '../js/tiles.js';
import { createInitialState, effectiveRate, effectiveTileRate, isEligible, tick, unlockTile } from '../js/state.js';

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

// --- createInitialState ---

{
  const state = createInitialState();
  assert.deepEqual(
    state.resources,
    { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    'resources shape must match pre-refactor output exactly'
  );
  assert.deepEqual(
    state.lifetime,
    { fish: 0, kelp: 0, driftwood: 0, crops: 0 },
    'lifetime shape must match pre-refactor output exactly'
  );
}

// --- effectiveRate ---

{
  const state = createInitialState();
  assert.equal(effectiveRate('fish', state.unlocked), 1.0, 'starting fish rate');
  assert.equal(effectiveRate('kelp', state.unlocked), 1.0, 'starting kelp rate');
  assert.equal(effectiveRate('driftwood', state.unlocked), 0.5, 'starting driftwood rate');
  assert.equal(effectiveRate('crops', state.unlocked), 0.5, 'starting crops rate');
}

{
  const unlocked = ['fish_start', 'booster_smokehouse'];
  assert.equal(effectiveRate('fish', unlocked), 1.25, 'smokehouse adds +25% to fish');
}

// --- effectiveTileRate ---

{
  const tile = TILES.find((t) => t.id === 'fish_start');
  assert.equal(effectiveTileRate(tile, ['fish_start']), 1.0, 'no boosters unlocked returns raw rate');
  assert.equal(
    effectiveTileRate(tile, ['fish_start', 'booster_smokehouse']),
    1.25,
    'smokehouse boosts fish_start tile rate by +25%'
  );
}

// --- isEligible ---

{
  const tile = { unlock: { type: 'cost', cost: { driftwood: 30 } } };
  assert.equal(isEligible(tile, { resources: { driftwood: 10 } }), false);
  assert.equal(isEligible(tile, { resources: { driftwood: 30 } }), true);
}

{
  const tile = { unlock: { type: 'milestone', resource: 'fish', target: 200 } };
  assert.equal(isEligible(tile, { lifetime: { fish: 199 } }), false);
  assert.equal(isEligible(tile, { lifetime: { fish: 200 } }), true);
}

{
  const tile = { unlock: { type: 'start' } };
  assert.equal(isEligible(tile, {}), true);
}

// --- tick ---

{
  const state = createInitialState();
  tick(state, 2);
  assert.equal(state.resources.fish, 2.0, 'fish accrues at 1/s for 2s');
  assert.equal(state.lifetime.fish, 2.0, 'lifetime tracks the same total');
  assert.equal(state.resources.driftwood, 1.0, 'driftwood accrues at 0.5/s for 2s');
}

// --- unlockTile ---

{
  const state = createInitialState();
  state.resources.driftwood = 30;
  const tile = TILES.find((t) => t.id === 'fish_anchored_net');
  const ok = unlockTile(state, tile);
  assert.equal(ok, true, 'unlock succeeds when eligible');
  assert.equal(state.resources.driftwood, 0, 'cost is deducted');
  assert.ok(state.unlocked.includes('fish_anchored_net'), 'tile id added to unlocked');
}

{
  const state = createInitialState();
  const tile = TILES.find((t) => t.id === 'fish_anchored_net');
  const ok = unlockTile(state, tile);
  assert.equal(ok, false, 'unlock fails when not eligible');
  assert.ok(!state.unlocked.includes('fish_anchored_net'));
}

console.log('economy math tests passed');
