import { TILES } from './tiles.js';
import { loadState, tick, isEligible, unlockTile, saveState } from './state.js';
import { initScene, updateScene, screenToGrid } from './render.js';
import { initUI, getCanvas, updateResourceBar, showTilePanel, hideTilePanel } from './ui.js';

let selectedTileId = null;

initUI(() => {
  selectedTileId = null;
});

const canvas = getCanvas();
initScene(canvas);

let state = loadState();

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
  const gridPos = screenToGrid(x, y, rect.width, rect.height);

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
let timeSinceSave = 0;

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

  updateScene(state, now);

  timeSinceSave += dt;
  if (timeSinceSave >= 10) {
    saveState(state);
    timeSinceSave = 0;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

window.addEventListener('beforeunload', () => {
  saveState(state);
});
