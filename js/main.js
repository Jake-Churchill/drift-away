import { TILES } from './tiles.js';
import {
  advance,
  buyHeadStart,
  buyPrestigeUpgrade,
  buyShopItem,
  createInitialState,
  decodeSave,
  doPrestige,
  encodeSave,
  getLevel,
  isEligible,
  isLevelUpEligible,
  levelUpCost,
  levelUpIntensity,
  levelUpTile,
  loadState,
  lockedTileStatuses,
  MAX_LEVEL,
  nextUnlock,
  saveState,
  unlockIntensity,
  unlockTile,
  upgradeList,
} from './state.js';
import {
  initScene,
  updateScene,
  screenToGrid,
  sailToZone,
  getCurrentZone,
  resetCamera,
  playLevelUpImpact,
  playUnlockImpact,
  projectTile,
} from './render.js';
import {
  initUI,
  getCanvas,
  updateResourceBar,
  showTilePanel,
  hideTilePanel,
  initMenu,
  initPrestige,
  initUpgrades,
  showOfflineModal,
  showResourcePopup,
  showTokenPopup,
  updateAchievementsDisplay,
  updateBoardTint,
  updateNextUnlock,
  updatePrestigeDisplay,
  updateUpgrades,
} from './ui.js';
import {
  playLevelUpImpactSound,
  playLevelUpSound,
  playPrestigeSound,
  playUnlockImpactSound,
  playUnlockSound,
} from './sound.js';
import { loadSettings, saveSettings } from './settings.js';

let selectedTileId = null;
const settings = loadSettings();

// showResourcePopup takes signed deltas, and a cost is always something spent.
function spent(cost) {
  return Object.fromEntries(Object.entries(cost).map(([resource, amount]) => [resource, -amount]));
}

// Takes the player to a tile: sail there if it's in the other zone, and open its panel.
function goToTile(tile) {
  if (tile.zone !== getCurrentZone()) sailToZone(tile.zone);
  selectedTileId = tile.id;
  renderTilePanel(tile);
}

initUI(
  () => {
    selectedTileId = null;
  },
  goToTile
);

initUpgrades((tileId) => handleLevelUpClick(TILES.find((t) => t.id === tileId)));

initMenu({
  onRestart: () => {
    state = createInitialState();
    resetCamera();
    selectedTileId = null;
    hideTilePanel();
    saveState(state);
    updateAchievementsDisplay(state);
  },
  onRefresh: () => {
    updateAchievementsDisplay(state);
  },
  onExport: () => encodeSave(state),
  onImport: (code) => {
    const imported = decodeSave(code);
    if (!imported) return false;
    state = imported;
    resetCamera();
    selectedTileId = null;
    hideTilePanel();
    saveState(state);
    updateAchievementsDisplay(state);
    updatePrestigeDisplay(state);
    return true;
  },
  onShopBuy: (id) => {
    const success = buyShopItem(state, id);
    if (success) {
      saveState(state);
      playLevelUpSound();
    }
    return success;
  },
  settings,
  onSettingChange: (key, value) => {
    settings[key] = value;
    saveSettings(settings);
  },
});

initPrestige(
  () => {
    const goldBefore = state.gold;
    const result = doPrestige(state);
    if (result) {
      state = result.state;
      resetCamera();
      selectedTileId = null;
      hideTilePanel();
      saveState(state);
      updatePrestigeDisplay(state);
      updateAchievementsDisplay(state);
      showTokenPopup(result.tokensEarned);
      if (state.gold > goldBefore) showResourcePopup({ gold: state.gold - goldBefore });
      playPrestigeSound();
    }
    return !!result;
  },
  (upgrade) => {
    const tokensBefore = state.prestige.tokens;
    const success = upgrade === 'headStart' ? buyHeadStart(state) : buyPrestigeUpgrade(state, upgrade);
    if (success) {
      saveState(state);
      updatePrestigeDisplay(state);
      showTokenPopup(-(tokensBefore - state.prestige.tokens));
      playLevelUpSound();
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
if (offline) showAway(offline);

// The welcome-back message: what accrued, and where to go next.
function showAway(away) {
  const next = nextUnlock(state);
  showOfflineModal(
    away,
    next,
    () => {
      showResourcePopup(away.gains);
      playUnlockSound();
    },
    next ? () => goToTile(next.tile) : null
  );
}

function renderTilePanel(tile) {
  const unlocked = state.unlocked.includes(tile.id);
  const eligible = unlocked ? isLevelUpEligible(state, tile) : isEligible(tile, state);
  showTilePanel(tile, state, eligible, handleUnlockClick, handleLevelUpClick);
}

// unlockTile/levelUpTile call checkAchievements internally, so the awarded list is
// already consumed by the time they return. Diffing state.gold across the call is
// the simplest signal that an achievement fired, and needs nothing from state.js.
function handleUnlockClick(tile) {
  const cost = tile.unlock.type === 'cost' ? tile.unlock.cost : null;
  const goldBefore = state.gold;
  const success = unlockTile(state, tile);
  if (success) {
    saveState(state);
    renderTilePanel(tile);
    updateAchievementsDisplay(state);
    if (cost) showResourcePopup(spent(cost));
    const intensity = unlockIntensity(state, tile);
    playUnlockImpact(tile, intensity);
    playUnlockImpactSound(intensity);
    if (state.gold > goldBefore) showResourcePopup({ gold: state.gold - goldBefore });
  }
}

function handleLevelUpClick(tile) {
  // Captured before the call, because a successful level-up changes the level the
  // cost is derived from.
  const level = getLevel(state, tile.id);
  const cost = levelUpCost(tile, level + 1);
  const goldBefore = state.gold;
  const success = levelUpTile(state, tile);
  if (success) {
    saveState(state);
    // Also called from the upgrades panel, where no tile panel should pop up.
    if (selectedTileId === tile.id) renderTilePanel(tile);
    updateAchievementsDisplay(state);
    showResourcePopup(spent(cost));
    const intensity = levelUpIntensity(level + 1);
    playLevelUpImpact(tile, level + 1, intensity);
    playLevelUpImpactSound(intensity);
    if (state.gold > goldBefore) showResourcePopup({ gold: state.gold - goldBefore });
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

  if (tile.zone !== getCurrentZone()) {
    sailToZone(tile.zone);
    return;
  }

  selectedTileId = tile.id;
  renderTilePanel(tile);
});

// Double-clicking a locked tile unlocks it, the same as pressing its panel's Unlock button
// (which does nothing while the tile isn't affordable yet).
canvas.addEventListener('dblclick', (event) => {
  const rect = canvas.getBoundingClientRect();
  const gridPos = screenToGrid(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
  if (!gridPos) return;
  const tile = TILES.find((t) => t.gridPos.row === gridPos.row && t.gridPos.col === gridPos.col);
  if (tile && tile.zone === getCurrentZone() && !state.unlocked.includes(tile.id)) handleUnlockClick(tile);
});

let lastTickAt = Date.now();
let timeSinceSave = 0;

// Wall-clock time, not the frame timestamp: hidden tabs stop animation frames and laptops sleep, and
// both show up here as one long gap that advance() treats the same as time spent away.
function loop(now) {
  const tickedAt = Date.now();
  const elapsed = Math.max(0, (tickedAt - lastTickAt) / 1000);
  lastTickAt = tickedAt;

  // The one path where an achievement can fire with no click behind it (passive
  // production crossing a lifetime threshold), so it gets its own sound.
  const goldBefore = state.gold;
  const away = advance(state, elapsed);
  if (away) showAway(away);
  if (state.gold > goldBefore) {
    showResourcePopup({ gold: state.gold - goldBefore });
    playUnlockSound();
  }
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

  updateScene(state, now, settings);

  // After updateScene, so the labels follow the camera as it ends up this frame.
  const statuses = lockedTileStatuses(state);
  const next = nextUnlock(state, statuses);
  // Until the very first unlock (which is remembered by its achievement, so a new run after
  // prestige doesn't repeat it), the line also says what to click.
  updateNextUnlock(next, !state.achievements.includes('first-steps'));
  updateBoardTint(statuses, next, settings.boardTint, projectTile);
  updateUpgrades(upgradeList(state));

  timeSinceSave += elapsed;
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

// beforeunload is unreliable on phones; hiding the tab is the last moment we can count on.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveState(state);
});

// Asks the browser not to evict the save under storage pressure. Harmless if refused or unsupported.
navigator.storage?.persist?.()?.catch(() => {});
