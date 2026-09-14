import {
  RESOURCES,
  effectiveTileRate,
  getLevel,
  levelMultiplier,
  levelUpCost,
  MAX_LEVEL,
  completionCount,
  isFullyComplete,
  prestigeTokensEarned,
  prestigeUpgradeCost,
  PRESTIGE_UPGRADE_PERCENT,
  TOTAL_TILE_COUNT,
} from './state.js';

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

export function initMenu(onRestart, onPrestige, onBuyUpgrade, onOpen) {
  elements.menuBtn = document.getElementById('menu-btn');
  elements.menuOverlay = document.getElementById('menu-overlay');
  elements.menuMain = document.getElementById('menu-main');
  elements.menuConfirm = document.getElementById('menu-confirm');
  elements.menuResumeBtn = document.getElementById('menu-resume-btn');
  elements.menuRestartBtn = document.getElementById('menu-restart-btn');
  elements.menuConfirmYesBtn = document.getElementById('menu-confirm-yes-btn');
  elements.menuConfirmNoBtn = document.getElementById('menu-confirm-no-btn');

  elements.menuPrestigeBtn = document.getElementById('menu-prestige-btn');
  elements.menuStoreBtn = document.getElementById('menu-store-btn');
  elements.menuPrestigeConfirm = document.getElementById('menu-prestige-confirm');
  elements.menuPrestigeConfirmText = document.getElementById('menu-prestige-confirm-text');
  elements.menuPrestigeYesBtn = document.getElementById('menu-prestige-confirm-yes-btn');
  elements.menuPrestigeNoBtn = document.getElementById('menu-prestige-confirm-no-btn');
  elements.menuStore = document.getElementById('menu-store');
  elements.menuStoreTokens = document.getElementById('menu-store-tokens');
  elements.menuStoreBackBtn = document.getElementById('menu-store-back-btn');
  elements.storeRows = {};
  for (const resource of RESOURCES) {
    elements.storeRows[resource] = {
      count: document.getElementById(`store-${resource}-count`),
      cost: document.getElementById(`store-${resource}-cost`),
      buyBtn: document.getElementById(`store-${resource}-buy-btn`),
    };
    elements.storeRows[resource].buyBtn.addEventListener('click', () => onBuyUpgrade(resource));
  }

  function showConfirm() {
    elements.menuMain.classList.add('hidden');
    elements.menuConfirm.classList.remove('hidden');
  }

  function hideConfirm() {
    elements.menuConfirm.classList.add('hidden');
    elements.menuMain.classList.remove('hidden');
  }

  function showPrestigeConfirm() {
    elements.menuPrestigeConfirmText.textContent =
      `Prestige for ${elements.pendingPrestigeTokens} tokens? This resets your farm but keeps your permanent upgrades.`;
    elements.menuMain.classList.add('hidden');
    elements.menuPrestigeConfirm.classList.remove('hidden');
  }

  function hidePrestigeConfirm() {
    elements.menuPrestigeConfirm.classList.add('hidden');
    elements.menuMain.classList.remove('hidden');
  }

  function showStore() {
    // Hides every sub-view, not just menu-main: this is called both from menu-main
    // (via the Store button) and directly from the prestige-confirm sub-view (right
    // after a successful prestige), so it can't assume which one is currently visible.
    elements.menuMain.classList.add('hidden');
    elements.menuConfirm.classList.add('hidden');
    elements.menuPrestigeConfirm.classList.add('hidden');
    elements.menuStore.classList.remove('hidden');
  }

  function hideStore() {
    elements.menuStore.classList.add('hidden');
    elements.menuMain.classList.remove('hidden');
  }

  elements.menuBtn.addEventListener('click', () => {
    if (onOpen) onOpen();
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

  elements.menuPrestigeBtn.addEventListener('click', showPrestigeConfirm);
  elements.menuPrestigeNoBtn.addEventListener('click', hidePrestigeConfirm);
  elements.menuPrestigeYesBtn.addEventListener('click', () => {
    // Calls onPrestige() (which updates state and refreshes the store's displayed
    // token balance via updateMenuDisplay) before showStore() reveals it, per the
    // spec's "confirming lands the player directly in the Store" flow.
    onPrestige();
    showStore();
  });
  elements.menuStoreBtn.addEventListener('click', showStore);
  elements.menuStoreBackBtn.addEventListener('click', hideStore);
}

export function hideMenu() {
  elements.menuOverlay.classList.add('hidden');
}

export function updateMenuDisplay(state) {
  const complete = isFullyComplete(state);
  const count = completionCount(state);
  elements.pendingPrestigeTokens = complete ? prestigeTokensEarned(state) : 0;
  elements.menuPrestigeBtn.disabled = !complete;
  elements.menuPrestigeBtn.textContent = complete
    ? `Prestige (+${elements.pendingPrestigeTokens} tokens)`
    : `Prestige (${count}/${TOTAL_TILE_COUNT} maxed)`;

  elements.menuStoreTokens.textContent = `Tokens: ${state.prestige.tokens}`;
  for (const resource of RESOURCES) {
    const row = elements.storeRows[resource];
    const purchaseCount = state.prestige.upgrades[resource];
    const cost = prestigeUpgradeCost(purchaseCount);
    // The icon itself is already the static `.store-icon` span in the HTML — this
    // text is just the count, so it doesn't duplicate it.
    row.count.textContent = `+${purchaseCount * PRESTIGE_UPGRADE_PERCENT}%`;
    row.cost.textContent = `${cost} tokens`;
    row.buyBtn.disabled = state.prestige.tokens < cost;
  }
}
