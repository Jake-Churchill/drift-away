import { TILES } from './tiles.js';
import { loadState, tick, isEligible, unlockTile, saveState } from './state.js';
import { drawScene, screenToGrid } from './render.js';
import { initUI, getCanvas, updateResourceBar, showTilePanel, hideTilePanel } from './ui.js';

initUI();

const canvas = getCanvas();
const ctx = canvas.getContext('2d');

let state = loadState();
let selectedTileId = null;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function handleUnlockClick(tile) {
  const success = unlockTile(state, tile);
  if (success) {
    saveState(state);
    showTilePanel(tile, state, isEligible(tile, state), handleUnlockClick);
  }
}

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const gridPos = screenToGrid(x, y, canvas.width, canvas.height);

  if (!gridPos) {
    selectedTileId = null;
    hideTilePanel();
    return;
  }

  const tile = TILES.find((t) => t.gridPos.row === gridPos.row && t.gridPos.col === gridPos.col);
  if (!tile) return;

  selectedTileId = tile.id;
  showTilePanel(tile, state, isEligible(tile, state), handleUnlockClick);
});

let lastFrameTime = performance.now();

function loop(now) {
  const dt = Math.min(0.25, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  tick(state, dt);
  updateResourceBar(state);

  if (selectedTileId) {
    const tile = TILES.find((t) => t.id === selectedTileId);
    if (tile && !state.unlocked.includes(tile.id)) {
      showTilePanel(tile, state, isEligible(tile, state), handleUnlockClick);
    }
  }

  drawScene(ctx, canvas, state, now);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
