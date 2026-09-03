import { TILES } from './tiles.js';
import { isEligible } from './state.js';

const DRAW_ORDER = [...TILES].sort((a, b) => a.gridPos.row - b.gridPos.row);

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

const WATER_BANDS = [
  { speed: 40, amp: 20, width: 2, alpha: 0.18, phase: 0 },
  { speed: 65, amp: 14, width: 1.5, alpha: 0.12, phase: 40 },
  { speed: 25, amp: 26, width: 2.5, alpha: 0.1, phase: 80 },
];
const WATER_SPARKLE_COUNT = 18;

function drawWater(ctx, canvas, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1b4965');
  gradient.addColorStop(0.55, '#235d80');
  gradient.addColorStop(1, '#2e6f95');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  for (const band of WATER_BANDS) {
    ctx.strokeStyle = `rgba(150, 210, 235, ${band.alpha})`;
    ctx.lineWidth = band.width;
    for (let j = 0; j < 4; j++) {
      const yBase =
        (canvas.height / 4) * j +
        ((time / band.speed + band.phase) % canvas.height) -
        canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, yBase);
      ctx.quadraticCurveTo(canvas.width / 2, yBase + band.amp, canvas.width, yBase);
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < WATER_SPARKLE_COUNT; i++) {
    const seed = i * 137.5;
    const px = (seed * 3.1 + time / 25) % canvas.width;
    const py = (seed * 1.7) % canvas.height;
    const twinkle = 0.5 + 0.5 * Math.sin(time / 400 + i * 1.3);
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, twinkle - 0.3) * 0.6})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.3, 0, Math.PI * 2);
    ctx.fill();
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
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(1, 3, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const bodyGradient = ctx.createLinearGradient(-14, -8, 14, 8);
  bodyGradient.addColorStop(0, '#8cc7e8');
  bodyGradient.addColorStop(1, '#3d84ad');
  ctx.fillStyle = bodyGradient;
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
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const strandGradient = ctx.createLinearGradient(0, 14, 0, -14);
  strandGradient.addColorStop(0, '#2f6b48');
  strandGradient.addColorStop(1, '#6fc190');
  ctx.strokeStyle = strandGradient;
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
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const logGradient = ctx.createLinearGradient(0, -10, 0, 10);
  logGradient.addColorStop(0, '#7a5330');
  logGradient.addColorStop(1, '#3f2a15');
  ctx.strokeStyle = logGradient;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-16, 8); ctx.lineTo(16, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(14, -10); ctx.stroke();
}

function drawCropsProp(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(0, 13, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const stalkGradient = ctx.createLinearGradient(0, 12, 0, -12);
  stalkGradient.addColorStop(0, '#a9822c');
  stalkGradient.addColorStop(1, '#f0d878');
  ctx.strokeStyle = stalkGradient;
  ctx.lineWidth = 3;
  for (const dx of [-12, -4, 4, 12]) {
    ctx.beginPath();
    ctx.moveTo(dx, 12);
    ctx.lineTo(dx, -12);
    ctx.stroke();
  }
}

function drawBoosterProp(ctx, id) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const boosterGradient = ctx.createLinearGradient(-10, -14, 10, 14);
  boosterGradient.addColorStop(0, '#f6dc98');
  boosterGradient.addColorStop(1, '#c9973f');
  ctx.fillStyle = boosterGradient;
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
  const sideGradient = ctx.createLinearGradient(0, cy, 0, cy + WALL_HEIGHT + HEX_RADIUS * 0.3);
  sideGradient.addColorStop(0, '#a3763f');
  sideGradient.addColorStop(1, '#5e4020');
  ctx.fillStyle = sideGradient;
  tracePolygon(ctx, topPoly, WALL_HEIGHT);
  ctx.fill();
  ctx.restore();

  ctx.save();
  const topGradient = ctx.createRadialGradient(
    cx - HEX_RADIUS * 0.3,
    cy - HEX_RADIUS * 0.35,
    HEX_RADIUS * 0.1,
    cx,
    cy,
    HEX_RADIUS
  );
  topGradient.addColorStop(0, '#e8bd83');
  topGradient.addColorStop(0.55, WOOD_TOP);
  topGradient.addColorStop(1, '#a97c46');
  ctx.fillStyle = topGradient;
  tracePolygon(ctx, topPoly);
  ctx.fill();

  ctx.strokeStyle = 'rgba(94, 64, 32, 0.3)';
  ctx.lineWidth = 1.4;
  for (let i = -2; i <= 2; i++) {
    const gy = cy + i * (HEX_RADIUS * 0.28);
    ctx.beginPath();
    ctx.moveTo(cx - HEX_RADIUS * 0.7, gy);
    ctx.quadraticCurveTo(cx, gy + 5, cx + HEX_RADIUS * 0.7, gy);
    ctx.stroke();
  }

  if (tile.kind === 'booster') {
    ctx.lineWidth = 3;
    ctx.strokeStyle = BOOSTER_TRIM;
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 240, 210, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(topPoly[4].x, topPoly[4].y);
  ctx.lineTo(topPoly[3].x, topPoly[3].y);
  ctx.stroke();
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

  for (const tile of DRAW_ORDER) {
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
