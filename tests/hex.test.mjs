import assert from 'node:assert/strict';
import { cellKey, cellsWithin, hexDistance, isStraightLine, neighborCells } from '../js/hex.js';
import { buildTileIndex } from '../js/tiles.js';

// --- neighbours ---

for (const [row, col] of [[0, 0], [1, 0], [2, 3], [-1, 2], [-2, -3], [-3, 4]]) {
  const around = neighborCells(row, col);
  assert.equal(around.length, 6, `(${row},${col}) has six neighbours`);
  assert.equal(new Set(around.map((c) => cellKey(c.row, c.col))).size, 6, `(${row},${col}) neighbours are distinct`);
  for (const n of around) {
    assert.ok(
      neighborCells(n.row, n.col).some((back) => back.row === row && back.col === col),
      `adjacency is symmetric: (${row},${col}) <-> (${n.row},${n.col}), including negative rows`
    );
    assert.equal(hexDistance({ row, col }, n), 1, 'a neighbour is one step away');
  }
}

// --- distance ---

assert.equal(hexDistance({ row: 0, col: 0 }, { row: 0, col: 0 }), 0);
assert.equal(hexDistance({ row: 0, col: 0 }, { row: 0, col: 5 }), 5, 'along a row');
assert.equal(hexDistance({ row: 0, col: 0 }, { row: 4, col: 0 }), 4, 'straight down rows');
assert.equal(hexDistance({ row: -3, col: 2 }, { row: 3, col: -1 }), hexDistance({ row: 3, col: -1 }, { row: -3, col: 2 }), 'symmetric');

// --- cellsWithin ---

{
  const ring1 = cellsWithin(2, 2, 1).map((c) => cellKey(c.row, c.col)).sort();
  const neighbours = neighborCells(2, 2).map((c) => cellKey(c.row, c.col)).sort();
  assert.deepEqual(ring1, neighbours, 'radius 1 is exactly the six neighbours');

  const within2 = cellsWithin(-1, 3, 2);
  assert.equal(within2.length, 18, 'radius 2 holds 6 + 12 cells');
  for (const c of within2) {
    const d = hexDistance({ row: -1, col: 3 }, c);
    assert.ok(d >= 1 && d <= 2, `(${c.row},${c.col}) is 1-2 steps away`);
  }
}

// --- isStraightLine ---

{
  assert.equal(isStraightLine([{ row: 0, col: 0 }]), true, 'a single cell is trivially a line');
  assert.equal(isStraightLine([{ row: 0, col: 0 }, { row: 0, col: 1 }]), true, 'two adjacent cells are always a line');
  assert.equal(
    isStraightLine([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }]),
    true,
    'four cells in a row, same direction throughout'
  );
  assert.equal(
    isStraightLine([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: -1, col: 1 }]),
    false,
    'a bend (two different step directions) is not a line'
  );
  assert.equal(
    isStraightLine([{ row: 0, col: 0 }, { row: 5, col: 5 }]),
    false,
    'two cells that are not neighbours at all is not a line'
  );
  console.log('isStraightLine tests passed');
}

// --- buildTileIndex over a hand-made map ---
// Two 3-hex triangles with a single blank hex between them, one more tile far away.
//   A = (0,0) (0,1) (1,0)     blank = (0,2)     B = (0,3) (0,4) (1,3)

{
  const tile = (id, cells) => ({ id, cells: cells.map(([row, col]) => ({ row, col })) });
  const tiles = [
    tile('A', [[0, 0], [0, 1], [1, 0]]),
    tile('bridge', [[0, 2]]),
    tile('B', [[0, 3], [0, 4], [1, 3]]),
    tile('far', [[10, 10]]),
  ];
  const { byId, idByCell, neighbors, nearby } = buildTileIndex(tiles);

  assert.equal(byId.get('A'), tiles[0]);
  assert.equal(idByCell.get(cellKey(1, 3)), 'B', 'every cell of a multi-cell tile resolves to that tile');
  assert.equal(idByCell.get(cellKey(1, 0)), 'A');
  assert.equal(idByCell.get(cellKey(5, 5)), undefined, 'empty water resolves to nothing');

  assert.deepEqual([...neighbors.get('A')], ['bridge'], 'A touches only the bridge, once, however many cells touch it');
  assert.deepEqual([...neighbors.get('B')], ['bridge']);
  assert.deepEqual([...neighbors.get('bridge')].sort(), ['A', 'B']);
  assert.deepEqual([...neighbors.get('far')], []);

  assert.deepEqual([...nearby.get('A')].sort(), ['B', 'bridge'], 'a tile one bridge hex away is nearby');
  assert.deepEqual([...nearby.get('bridge')].sort(), ['A', 'B']);
  assert.deepEqual([...nearby.get('far')], []);
}

console.log('hex tests passed');
