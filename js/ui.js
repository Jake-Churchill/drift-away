import { RESOURCES, effectiveTileRate, getLevel, levelMultiplier, levelUpCost, MAX_LEVEL } from './state.js';

const elements = {};

const RESOURCE_ICONS = { fish: '🐟', kelp: '🌿', driftwood: '🪵', crops: '🌾' };

function tileIcon(tile) {
  if (tile.kind === 'producer') return RESOURCE_ICONS[tile.produces];
  return tile.boosts.map((b) => RESOURCE_ICONS[b.resource]).join('');
}

export function initUI(onClose) {
  elements.canvas = document.getElementById('game-canvas');
  elements.counts = {};
  for (const resource of RESOURCES) {
    elements.counts[resource] = document.getElementById(`count-${resource}`);
  }
  elements.panel = document.getElementById('tile-panel');
  elements.panelIcon = document.getElementById('tile-panel-icon');
  elements.panelName = document.getElementById('tile-panel-name');
  elements.panelDesc = document.getElementById('tile-panel-desc');
  elements.panelProgress = document.getElementById('tile-panel-progress');
  elements.panelUnlockBtn = document.getElementById('tile-panel-unlock-btn');
  elements.panelCloseBtn = document.getElementById('tile-panel-close-btn');
  elements.panelCloseBtn.addEventListener('click', () => {
    hideTilePanel();
    if (onClose) onClose();
  });

  elements.offlineOverlay = document.getElementById('offline-overlay');
  elements.offlineDuration = document.getElementById('offline-duration');
  elements.offlineGains = document.getElementById('offline-gains');
  elements.offlineCollectBtn = document.getElementById('offline-collect-btn');
  elements.offlineCollectBtn.addEventListener('click', hideOfflineModal);
}

function formatDuration(seconds) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
}

export function showOfflineModal(seconds, gains) {
  elements.offlineDuration.textContent = `While you were away for ${formatDuration(seconds)}, you earned:`;
  elements.offlineGains.innerHTML = '';
  for (const resource of RESOURCES) {
    const amount = gains[resource];
    if (amount <= 0) continue;
    const item = document.createElement('li');
    item.textContent = `${RESOURCE_ICONS[resource]} +${Math.floor(amount).toLocaleString()}`;
    elements.offlineGains.appendChild(item);
  }
  elements.offlineOverlay.classList.remove('hidden');
}

export function hideOfflineModal() {
  elements.offlineOverlay.classList.add('hidden');
}

export function getCanvas() {
  return elements.canvas;
}

export function updateResourceBar(state) {
  for (const resource of RESOURCES) {
    elements.counts[resource].textContent = Math.floor(state.resources[resource]).toLocaleString();
  }
}

function describeCost(cost) {
  return Object.entries(cost)
    .map(([resource, amount]) => `${amount} ${resource}`)
    .join(' + ');
}

function costProgressFraction(cost, state) {
  const fractions = Object.entries(cost).map(([resource, amount]) =>
    Math.min(1, state.resources[resource] / amount)
  );
  return Math.min(...fractions);
}

function describeUnlock(tile) {
  if (tile.unlock.type === 'cost') {
    return describeCost(tile.unlock.cost);
  }
  return `Reach ${tile.unlock.target} lifetime ${tile.unlock.resource}`;
}

function progressFraction(tile, state) {
  if (tile.unlock.type === 'cost') {
    return costProgressFraction(tile.unlock.cost, state);
  }
  return Math.min(1, state.lifetime[tile.unlock.resource] / tile.unlock.target);
}

function describeProduction(tile, state) {
  const level = getLevel(state, tile.id);
  return tile.kind === 'producer'
    ? `Produces ${Number(effectiveTileRate(tile, state.unlocked, state.levels, state.prestige.upgrades).toFixed(2))} ${tile.produces}/s`
    : tile.boosts.map((b) => `+${Number((b.percent * levelMultiplier(level)).toFixed(2))}% ${b.resource}`).join(', ');
}

export function showTilePanel(tile, state, eligible, onUnlock, onLevelUp) {
  elements.panel.classList.remove('hidden');
  elements.panelIcon.textContent = tileIcon(tile);
  elements.panelName.textContent = tile.name;

  const unlocked = state.unlocked.includes(tile.id);
  if (!unlocked) {
    elements.panelDesc.textContent = `Requires: ${describeUnlock(tile)}`;
    const frac = progressFraction(tile, state);
    elements.panelProgress.textContent = `${Math.floor(frac * 100)}% ready`;
    elements.panelUnlockBtn.classList.remove('hidden');
    elements.panelUnlockBtn.textContent = 'Unlock';
    elements.panelUnlockBtn.disabled = !eligible;
    elements.panelUnlockBtn.onclick = () => onUnlock(tile);
    return;
  }

  const level = getLevel(state, tile.id);
  const description = `${describeProduction(tile, state)} (Level ${level})`;

  if (level >= MAX_LEVEL) {
    elements.panelDesc.textContent = description;
    elements.panelProgress.textContent = 'Max Level';
    elements.panelUnlockBtn.classList.add('hidden');
    return;
  }

  const cost = levelUpCost(tile, level + 1);
  elements.panelDesc.textContent = description;
  const frac = costProgressFraction(cost, state);
  elements.panelProgress.textContent = `${Math.floor(frac * 100)}% to Level ${level + 1}`;
  elements.panelUnlockBtn.classList.remove('hidden');
  elements.panelUnlockBtn.textContent = `Level Up (${describeCost(cost)})`;
  elements.panelUnlockBtn.disabled = !eligible;
  elements.panelUnlockBtn.onclick = () => onLevelUp(tile);
}

export function hideTilePanel() {
  elements.panel.classList.add('hidden');
}

export function initMenu(onRestart) {
  elements.menuBtn = document.getElementById('menu-btn');
  elements.menuOverlay = document.getElementById('menu-overlay');
  elements.menuMain = document.getElementById('menu-main');
  elements.menuConfirm = document.getElementById('menu-confirm');
  elements.menuResumeBtn = document.getElementById('menu-resume-btn');
  elements.menuRestartBtn = document.getElementById('menu-restart-btn');
  elements.menuConfirmYesBtn = document.getElementById('menu-confirm-yes-btn');
  elements.menuConfirmNoBtn = document.getElementById('menu-confirm-no-btn');

  function showConfirm() {
    elements.menuMain.classList.add('hidden');
    elements.menuConfirm.classList.remove('hidden');
  }

  function hideConfirm() {
    elements.menuConfirm.classList.add('hidden');
    elements.menuMain.classList.remove('hidden');
  }

  elements.menuBtn.addEventListener('click', () => {
    elements.menuOverlay.classList.remove('hidden');
  });
  elements.menuResumeBtn.addEventListener('click', hideMenu);
  elements.menuOverlay.addEventListener('click', (event) => {
    if (event.target === elements.menuOverlay) hideMenu();
  });
  elements.menuRestartBtn.addEventListener('click', showConfirm);
  elements.menuConfirmNoBtn.addEventListener('click', hideConfirm);
  elements.menuConfirmYesBtn.addEventListener('click', () => {
    hideConfirm();
    hideMenu();
    onRestart();
  });
}

export function hideMenu() {
  elements.menuOverlay.classList.add('hidden');
}
