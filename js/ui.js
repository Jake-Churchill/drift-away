import { RESOURCES, effectiveTileRate } from './state.js';

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
}

export function getCanvas() {
  return elements.canvas;
}

export function updateResourceBar(state) {
  for (const resource of RESOURCES) {
    elements.counts[resource].textContent = Math.floor(state.resources[resource]).toLocaleString();
  }
}

function describeUnlock(tile) {
  if (tile.unlock.type === 'cost') {
    return Object.entries(tile.unlock.cost)
      .map(([resource, amount]) => `${amount} ${resource}`)
      .join(' + ');
  }
  return `Reach ${tile.unlock.target} lifetime ${tile.unlock.resource}`;
}

function progressFraction(tile, state) {
  if (tile.unlock.type === 'cost') {
    const fractions = Object.entries(tile.unlock.cost).map(([resource, amount]) =>
      Math.min(1, state.resources[resource] / amount)
    );
    return Math.min(...fractions);
  }
  return Math.min(1, state.lifetime[tile.unlock.resource] / tile.unlock.target);
}

export function showTilePanel(tile, state, eligible, onUnlock) {
  elements.panel.classList.remove('hidden');
  elements.panelIcon.textContent = tileIcon(tile);
  elements.panelName.textContent = tile.name;

  const unlocked = state.unlocked.includes(tile.id);
  if (unlocked) {
    elements.panelDesc.textContent =
      tile.kind === 'producer'
        ? `Produces ${Number(effectiveTileRate(tile, state.unlocked).toFixed(2))} ${tile.produces}/s`
        : tile.boosts.map((b) => `+${b.percent}% ${b.resource}`).join(', ');
    elements.panelProgress.textContent = '';
    elements.panelUnlockBtn.classList.add('hidden');
    return;
  }

  elements.panelDesc.textContent = `Requires: ${describeUnlock(tile)}`;
  const frac = progressFraction(tile, state);
  elements.panelProgress.textContent = `${Math.floor(frac * 100)}% ready`;
  elements.panelUnlockBtn.classList.remove('hidden');
  elements.panelUnlockBtn.disabled = !eligible;
  elements.panelUnlockBtn.onclick = () => onUnlock(tile);
}

export function hideTilePanel() {
  elements.panel.classList.add('hidden');
}
