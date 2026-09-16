import { TILES } from './tiles.js';
import {
  buyPrestigeUpgrade,
  createInitialState,
  doPrestige,
  getLevel,
  isEligible,
  isLevelUpEligible,
  levelUpTile,
  loadState,
  MAX_LEVEL,
  saveState,
  tick,
  unlockTile,
} from './state.js';
import { initScene, updateScene, screenToGrid } from './render.js';
import {
  initUI,
  getCanvas,
  updateResourceBar,
  showTilePanel,
  hideTilePanel,
  initMenu,
  initPrestige,
  showOfflineModal,
  updateAchievementsDisplay,
  updatePrestigeDisplay,
} from './ui.js';

let selectedTileId = null;

initUI(() => {
  selectedTileId = null;
});

initMenu(
  () => {
    state = createInitialState();
    selectedTileId = null;
    hideTilePanel();
    saveState(state);
    updateAchievementsDisplay(state);
  },
  () => {
    updateAchievementsDisplay(state);
  }
);

initPrestige(
  () => {
    const result = doPrestige(state);
    if (result) {
      state = result.state;
      selectedTileId = null;
      hideTilePanel();
      saveState(state);
      updatePrestigeDisplay(state);
      updateAchievementsDisplay(state);
    }
    return !!result;
  },
  (resource) => {
    const success = buyPrestigeUpgrade(state, resource);
    if (success) {
      saveState(state);
      updatePrestigeDisplay(state);
      if (selectedTileId) {
        const tile = TILES.find((t) => t.id === selectedTileId);
        if (tile) renderTilePanel(tile);
      }
    }
  },
  () => {
    updatePrestigeDisplay(state);
  }
);

const canvas = getCanvas();
initScene(canvas);

let { state, offline } = loadState();
updateAchievementsDisplay(state);
if (offline) {
  showOfflineModal(offline.seconds, offline.gains);
}

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
    updateAchievementsDisplay(state);
  }
}

function handleLevelUpClick(tile) {
  const success = levelUpTile(state, tile);
  if (success) {
    saveState(state);
    renderTilePanel(tile);
    updateAchievementsDisplay(state);
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
  // tick() can award achievements mid-play, so this is refreshed every frame rather
  // than tracking whether the sub-view happens to be open; ui.js skips the rebuild
  // when nothing changed.
  updateAchievementsDisplay(state);

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
