// Odd-row offset hex grid, the layout js/scene.js draws. Rows may be negative: `row % 2` is -1 for
// negative odd rows, so oddness is tested with `!== 0` / `& 1`, never `=== 1`.

export function cellKey(row, col) {
  return `${row},${col}`;
}

// The six neighbours of a cell, ordered E, NE, NW, W, SW, SE.
export function neighborCells(row, col) {
  const deltas = row % 2 === 0
    ? [[0, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]]
    : [[0, 1], [-1, 1], [-1, 0], [0, -1], [1, 0], [1, 1]];
  return deltas.map(([dr, dc]) => ({ row: row + dr, col: col + dc }));
}

function toAxial(row, col) {
  return { q: col - (row - (row & 1)) / 2, r: row };
}

function fromAxial(q, r) {
  return { row: r, col: q + (r - (r & 1)) / 2 };
}

export function hexDistance(a, b) {
  const p = toAxial(a.row, a.col);
  const q = toAxial(b.row, b.col);
  return (Math.abs(p.q - q.q) + Math.abs(p.r - q.r) + Math.abs(p.q + p.r - q.q - q.r)) / 2;
}

// Every cell within `radius` steps of (row, col), excluding the cell itself.
export function cellsWithin(row, col, radius) {
  const { q, r } = toAxial(row, col);
  const cells = [];
  for (let dq = -radius; dq <= radius; dq++) {
    for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++) {
      if (dq === 0 && dr === 0) continue;
      cells.push(fromAxial(q + dq, r + dr));
    }
  }
  return cells;
}
