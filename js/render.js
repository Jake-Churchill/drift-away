import { TILES } from './tiles.js';
import { isEligible } from './state.js';

const GRID_ROWS = 5;
const GRID_COLS = 5;
const HEX_RADIUS = 42;
const SCALE_Y = 0.62;
const WALL_HEIGHT = 14;

const WOOD_TOP = '#c9975b';
const WOOD_SIDE = '#8a6236';
const BOOSTER_TRIM = '#e0b84b';

const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
const HEX_HEIGHT = 2 * HEX_RADIUS;
const ROW_SPACING = 0.75 * HEX_HEIGHT;

function hexGridBounds() {
  return {
    width: GRID_COLS * HEX_WIDTH + HEX_WIDTH / 2,
    height: (GRID_ROWS - 1) * ROW_SPACING + HEX_HEIGHT,
  };
}

function computeFitScale(canvasWidth, canvasHeight) {
  const bounds = hexGridBounds();
  return Math.min(
    (canvasWidth * 0.85) / bounds.width,
    (canvasHeight * 0.85) / (bounds.height * SCALE_Y)
  );
}

function hexCenter(row, col) {
  const x = col * HEX_WIDTH + (row % 2 === 1 ? HEX_WIDTH / 2 : 0) + HEX_WIDTH / 2;
  const y = row * ROW_SPACING + HEX_HEIGHT / 2;
  return { x, y };
}

function hexPolygonPoints(cx, cy, radius) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = ((30 + 60 * i) * Math.PI) / 180;
    points.push({ x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) });
  }
  return points;
}

function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function tracePolygon(ctx, points, offsetY = 0) {
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y + offsetY);
    else ctx.lineTo(p.x, p.y + offsetY);
  });
  ctx.closePath();
}

function drawWater(ctx, canvas, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1b4965');
  gradient.addColorStop(1, '#2e6f95');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.strokeStyle = 'rgba(95, 168, 211, 0.15)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const yBase = (canvas.height / 5) * i + ((time / 40) % canvas.height) - canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, yBase);
    ctx.quadraticCurveTo(canvas.width / 2, yBase + 20, canvas.width, yBase);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLockedTile(ctx, cx, cy, eligible, time) {
  const poly = hexPolygonPoints(cx, cy, HEX_RADIUS);

  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  if (eligible) {
    const pulse = 0.5 + 0.5 * Math.sin(time / 300);
    ctx.strokeStyle = `rgba(188, 216, 232, ${0.4 + 0.4 * pulse})`;
  } else {
    ctx.strokeStyle = 'rgba(188, 216, 232, 0.35)';
  }
  tracePolygon(ctx, poly);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(188, 216, 232, 0.6)';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFishProp(ctx) {
  ctx.fillStyle = '#5fa8d3';
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.quadraticCurveTo(0, -10, 14, 0);
  ctx.quadraticCurveTo(0, 10, -14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(22, -6);
  ctx.lineTo(22, 6);
  ctx.closePath();
  ctx.fill();
}

function drawKelpProp(ctx) {
  ctx.strokeStyle = '#4c9a6a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const dx of [-10, 0, 10]) {
    ctx.beginPath();
    ctx.moveTo(dx, 14);
    ctx.quadraticCurveTo(dx + 6, 0, dx, -14);
    ctx.stroke();
  }
}

function drawDriftwoodProp(ctx) {
  ctx.strokeStyle = '#5a3f22';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-16, 8); ctx.lineTo(16, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(14, -10); ctx.stroke();
}

function drawCropsProp(ctx) {
  ctx.strokeStyle = '#d9b545';
  ctx.lineWidth = 3;
  for (const dx of [-12, -4, 4, 12]) {
    ctx.beginPath();
    ctx.moveTo(dx, 12);
    ctx.lineTo(dx, -12);
    ctx.stroke();
  }
}

function drawBoosterProp(ctx, id) {
  ctx.fillStyle = '#e0b84b';
  if (id === 'booster_windmill') {
    ctx.fillRect(-2, -14, 4, 20);
    for (const angle of [0, 90, 180, 270]) {
      ctx.save();
      ctx.rotate((angle * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(6, -2);
      ctx.lineTo(-6, -2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(-14, 10);
    ctx.lineTo(14, 10);
    ctx.lineTo(8, -12);
    ctx.lineTo(-8, -12);
    ctx.closePath();
    ctx.fill();
  }
}

function drawProp(ctx, tile, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  switch (tile.family) {
    case 'fish': drawFishProp(ctx); break;
    case 'kelp': drawKelpProp(ctx); break;
    case 'driftwood': drawDriftwoodProp(ctx); break;
    case 'crops': drawCropsProp(ctx); break;
    case 'booster': drawBoosterProp(ctx, tile.id); break;
  }
  ctx.restore();
}

function drawUnlockedTile(ctx, tile, cx, cy) {
  const topPoly = hexPolygonPoints(cx, cy, HEX_RADIUS);

  ctx.save();
  ctx.fillStyle = 'rgba(10, 30, 45, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + HEX_RADIUS * 0.55, HEX_RADIUS * 0.8, HEX_RADIUS * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = WOOD_SIDE;
  tracePolygon(ctx, topPoly, WALL_HEIGHT);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = WOOD_TOP;
  tracePolygon(ctx, topPoly);
  ctx.fill();
  if (tile.kind === 'booster') {
    ctx.lineWidth = 3;
    ctx.strokeStyle = BOOSTER_TRIM;
    ctx.stroke();
  }
  ctx.restore();

  drawProp(ctx, tile, cx, cy);
}

function drawTile(ctx, tile, state, time) {
  const { x: cx, y: cy } = hexCenter(tile.gridPos.row, tile.gridPos.col);
  const unlocked = state.unlocked.includes(tile.id);
  if (unlocked) {
    drawUnlockedTile(ctx, tile, cx, cy);
  } else {
    drawLockedTile(ctx, cx, cy, isEligible(tile, state), time);
  }
}

export function drawScene(ctx, canvas, state, time) {
  drawWater(ctx, canvas, time);

  const bounds = hexGridBounds();
  const fitScale = computeFitScale(canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(fitScale, fitScale * SCALE_Y);
  ctx.translate(-bounds.width / 2, -bounds.height / 2);

  for (const tile of TILES) {
    drawTile(ctx, tile, state, time);
  }

  ctx.restore();
}

export function screenToGrid(screenX, screenY, canvasWidth, canvasHeight) {
  const bounds = hexGridBounds();
  const fitScale = computeFitScale(canvasWidth, canvasHeight);

  const lx = (screenX - canvasWidth / 2) / fitScale + bounds.width / 2;
  const ly = (screenY - canvasHeight / 2) / (fitScale * SCALE_Y) + bounds.height / 2;

  for (const tile of TILES) {
    const { x: cx, y: cy } = hexCenter(tile.gridPos.row, tile.gridPos.col);
    const poly = hexPolygonPoints(cx, cy, HEX_RADIUS);
    if (pointInPolygon(lx, ly, poly)) {
      return tile.gridPos;
    }
  }
  return null;
}
