import { TILES } from './tiles.js';
import { getLevel, isEligible, isLevelUpEligible, levelUpTile, loadState, MAX_LEVEL, saveState, tick, unlockTile } from './state.js';
import { initScene, updateScene, screenToGrid } from './render.js';
import { initUI, getCanvas, updateResourceBar, showTilePanel, hideTilePanel } from './ui.js';

let selectedTileId = null;

initUI(() => {
  selectedTileId = null;
});

const canvas = getCanvas();
initScene(canvas);

let state = loadState();

function renderTilePanel(tile) {
  const unlocked = state.unlocked.includes(tile.id);
  const eligible = unlocked ? isLevelUpEligible(state, tile) : isEligible(tile, state);
  showTilePanel(tile, state, eligible, handleUnlockClick, handleLevelUpClick);
}

function handleUnlockClick(tile) {
  const success = unlockTile(state, tile);
  if (success) {
    saveState(state);
    renderTilePanel(tile);
  }
}

function handleLevelUpClick(tile) {
  const success = levelUpTile(state, tile);
  if (success) {
    saveState(state);
    renderTilePanel(tile);
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
  renderTilePanel(tile);
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
    const stillProgressing = tile && (!state.unlocked.includes(tile.id) || getLevel(state, tile.id) < MAX_LEVEL);
    if (stillProgressing) {
      renderTilePanel(tile);
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
