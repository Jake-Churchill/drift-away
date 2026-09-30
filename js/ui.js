import {
  ACHIEVEMENTS,
  RESOURCES,
  GOODS,
  boosterGain,
  boosterIsIdle,
  effectiveTileRate,
  generatorFullRate,
  generatorRate,
  getLevel,
  levelMultiplier,
  levelUpCost,
  MAX_LEVEL,
  HEAD_START_TILES_PER_LEVEL,
  costProgressFraction,
  isLit,
  lifetimeTotal,
  offlineCapSeconds,
  offlineRate,
  PRESTIGE_MIN_LIFETIME,
  PRESTIGE_MIN_TOKENS,
  prestigeTokensEarned,
  prestigeTreeCatalog,
  PRESTIGE_UPGRADE_PERCENT,
  rateBreakdown,
  shopCatalog,
  unlockEta,
} from './state.js';
import { formatCount, formatEta } from './format.js';
import { VERSION } from './version.js';
import { ZONES } from './zones.js';

const elements = {};

// Gold isn't one of the produced RESOURCES, so nothing that iterates RESOURCES
// picks it up — it's here only so the feedback popups can look up its icon the
// same way they look up every resource icon (fish/kelp/driftwood/crops and zone 3's
// planks/kelp_rope/bread, which are RESOURCES entries too and need no special-casing here).
const RESOURCE_ICONS = { fish: '🐟', kelp: '🌿', driftwood: '🪵', crops: '🌾', gold: '🪙', planks: '🟫', kelp_rope: '🪢', bread: '🍞' };
const TOKEN_ICON = '⭐';

function tileIcon(tile) {
  if (tile.kind === 'bridge') return '🌉';
  if (tile.kind === 'blank') return '\u2b21';
  if (tile.kind === 'producer' || tile.kind === 'generator') return RESOURCE_ICONS[tile.produces];
  return tile.boosts.map((b) => RESOURCE_ICONS[b.resource]).join('');
}

export function initUI(onClose, onNextUnlockClick) {
  elements.canvas = document.getElementById('game-canvas');
  elements.counts = {};
  elements.resourceCells = {};
  for (const resource of RESOURCES) {
    elements.counts[resource] = document.getElementById(`count-${resource}`);
    elements.resourceCells[resource] = document.querySelector(`.resource[data-resource="${resource}"]`);
  }
  // Gold is a reward counter, not one of the produced RESOURCES, so it sits
  // outside the loop above even though it shares the resource bar's markup.
  elements.goldCount = document.getElementById('count-gold');
  elements.rates = {};
  for (const resource of RESOURCES) {
    elements.rates[resource] = document.getElementById(`rate-${resource}`);
  }
  elements.rateTip = document.getElementById('rate-tip');
  elements.nextUnlock = document.getElementById('next-unlock');
  elements.nextUnlockText = document.getElementById('next-unlock-text');
  elements.nextUnlockBar = document.querySelector('#next-unlock-bar i');
  elements.nextUnlockHint = document.getElementById('next-unlock-hint');
  elements.boardPills = document.getElementById('board-pills');
  elements.panel = document.getElementById('tile-panel');
  elements.panelIcon = document.getElementById('tile-panel-icon');
  elements.panelName = document.getElementById('tile-panel-name');
  elements.panelDesc = document.getElementById('tile-panel-desc');
  elements.panelProgress = document.getElementById('tile-panel-progress');
  elements.panelHint = document.getElementById('tile-panel-hint');
  elements.panelUnlockBtn = document.getElementById('tile-panel-unlock-btn');
  elements.panelToggleBtn = document.getElementById('tile-panel-toggle-btn');
  elements.panelCloseBtn = document.getElementById('tile-panel-close-btn');
  elements.panelCloseBtn.addEventListener('click', () => {
    hideTilePanel();
    if (onClose) onClose();
  });

  elements.offlineOverlay = document.getElementById('offline-overlay');
  elements.offlineAway = document.getElementById('offline-away');
  elements.offlineNext = document.getElementById('offline-next');
  elements.offlineGoBtn = document.getElementById('offline-go-btn');
  elements.offlineGains = document.getElementById('offline-gains');
  elements.offlineCollectBtn = document.getElementById('offline-collect-btn');
  elements.offlineCollectBtn.addEventListener('click', () => {
    hideOfflineModal();
    if (elements.onOfflineCollect) elements.onOfflineCollect();
  });
  // Going to the next tile collects first, so the gains are never left unclaimed.
  elements.offlineGoBtn.addEventListener('click', () => {
    hideOfflineModal();
    if (elements.onOfflineCollect) elements.onOfflineCollect();
    if (elements.onOfflineGo) elements.onOfflineGo();
  });

  elements.feedbackLayer = document.getElementById('feedback-layer');

  // Hovering a resource shows where its income comes from.
  const bar = document.getElementById('resource-bar');
  bar.addEventListener('mousemove', (event) => {
    const cell = event.target.closest('[data-resource]');
    if (!cell || !elements.lastState) {
      elements.rateTip.classList.add('hidden');
      return;
    }
    showRateTip(cell.dataset.resource, event);
  });
  bar.addEventListener('mouseleave', () => elements.rateTip.classList.add('hidden'));

  elements.nextUnlock.addEventListener('click', () => {
    if (elements.nextTile && onNextUnlockClick) onNextUnlockClick(elements.nextTile);
  });
}

function showRateTip(resource, event) {
  const info = rateBreakdown(elements.lastState, resource);
  const tip = elements.rateTip;
  tip.textContent = '';
  const line = (text, dim) => {
    const row = document.createElement('div');
    row.textContent = text;
    if (dim) row.className = 'dim';
    tip.appendChild(row);
  };
  const label = resourceLabel(resource);
  const title = label.replace(/\b\w/g, (c) => c.toUpperCase());
  line(`${title} ${info.total.toFixed(2)}/s`);
  line(`${GOODS.includes(resource) ? 'Generators' : 'Producers'} ${info.base.toFixed(2)}/s`);
  if (info.boosters.length > 0) {
    line(`Boosters +${Math.round(info.boostPercent)}%`);
    for (const b of info.boosters) line(`${b.name} +${Number(b.percent.toFixed(1))}%`, true);
  } else {
    line('No boosters yet', true);
  }
  if (info.prestigePercent > 0) line(`Prestige +${info.prestigePercent}%`);
  if (info.ballastPercent > 0) line(`Ballast +${info.ballastPercent}%`);
  tip.classList.remove('hidden');
  tip.style.left = `${Math.min(window.innerWidth - 270, event.clientX + 14)}px`;
  tip.style.top = `${event.clientY + 18}px`;
}

function formatDuration(seconds) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

// `away` is applyOfflineProgress's result. `next` is nextUnlock(state) (or null): the modal ends by
// pointing at it, and `onGo` (only used when there is a next tile) takes the player there.
export function showOfflineModal(away, next, onCollect, onGo) {
  elements.onOfflineCollect = onCollect;
  elements.onOfflineGo = onGo;

  const rate = `${Math.round(away.rate * 100)}% rate`;
  elements.offlineAway.textContent =
    away.away > away.seconds
      ? `Away ${formatDuration(away.away)} \u00b7 ${formatDuration(away.seconds)} counted (offline cap), at ${rate}`
      : `Away ${formatDuration(away.away)} \u00b7 counted at ${rate}`;

  elements.offlineGains.innerHTML = '';
  for (const resource of RESOURCES) {
    const amount = away.gains[resource];
    if (amount <= 0) continue;
    const item = document.createElement('li');
    item.textContent = `${RESOURCE_ICONS[resource]} +${Math.floor(amount).toLocaleString()}`;
    elements.offlineGains.appendChild(item);
  }

  elements.offlineNext.classList.toggle('hidden', !next);
  elements.offlineGoBtn.classList.toggle('hidden', !next);
  if (next) {
    const name = document.createElement('b');
    name.textContent = next.tile.name;
    elements.offlineNext.textContent = 'Next: ';
    elements.offlineNext.append(name, ` \u2014 ${describeWhen(next)}`);
    elements.offlineGoBtn.textContent = `Take me to ${next.tile.name}`;
  }
  elements.offlineOverlay.classList.remove('hidden');
}

export function hideOfflineModal() {
  elements.offlineOverlay.classList.add('hidden');
}

export function getCanvas() {
  return elements.canvas;
}

// The counts glide to their new value instead of jumping, and flash green or red when something
// other than ordinary production changed them (a purchase, an import, time away).
const shownCounts = {};
const previousCounts = {};
let lastBarUpdate = null;

function flashCount(element, kind) {
  element.classList.remove('gain', 'spend');
  element.classList.add(kind);
  clearTimeout(element.flashTimer);
  element.flashTimer = setTimeout(() => element.classList.remove(kind), 450);
}

export function updateResourceBar(state) {
  const now = performance.now();
  const dt = lastBarUpdate === null ? 0 : Math.min(0.1, (now - lastBarUpdate) / 1000);
  lastBarUpdate = now;
  elements.lastState = state;

  for (const resource of RESOURCES) {
    // Stays hidden until the player has earned their first one, then never hides again.
    elements.resourceCells[resource].classList.toggle('hidden', state.lifetime[resource] <= 0);

    const actual = state.resources[resource];
    const info = rateBreakdown(state, resource);
    const element = elements.counts[resource];

    if (shownCounts[resource] === undefined) {
      shownCounts[resource] = actual;
    } else {
      const step = actual - previousCounts[resource];
      if (step < -0.5) flashCount(element, 'spend');
      else if (step > info.total * Math.max(dt, 0.02) * 3 + 5) flashCount(element, 'gain');
      shownCounts[resource] += (actual - shownCounts[resource]) * (1 - Math.exp(-dt * 9));
      if (Math.abs(actual - shownCounts[resource]) < 0.5) shownCounts[resource] = actual;
    }
    previousCounts[resource] = actual;

    element.textContent = formatCount(shownCounts[resource]);
    const boost = info.boostPercent > 0 ? `<small>\u00d7${(1 + info.boostPercent / 100).toFixed(2)}</small>` : '';
    elements.rates[resource].innerHTML = `+${info.total.toFixed(1)}/s${boost}`;
  }
  elements.goldCount.textContent = state.gold.toLocaleString();
  // Lifetime totals keep climbing while the prestige screen is open, so its button can't wait for a
  // reopen to notice the floor was crossed. Only the button: the tree and detail panel stay put.
  if (!elements.prestigeOverlay.classList.contains('hidden')) updatePrestigeButton(state);
}

// "ready now (+2 more)", "in 4m 12s", or "needs 🌾 income" for a nextUnlock() result.
function describeWhen({ eta, readyCount }) {
  if (eta.seconds === 0) return `ready now${readyCount > 1 ? ` (+${readyCount - 1} more)` : ''}`;
  if (eta.blockedBy) return `needs ${RESOURCE_ICONS[eta.blockedBy]} income`;
  return `in ${formatEta(eta.seconds)}`;
}

// The line under the resource bar: which tile you can unlock next and when. `showHint` adds a
// one-line instruction for a player who has never unlocked anything yet.
export function updateNextUnlock(next, showHint) {
  const element = elements.nextUnlock;
  if (!next) {
    element.classList.add('hidden');
    elements.nextTile = null;
    return;
  }
  elements.nextTile = next.tile;
  const text = `Next: ${next.tile.name} \u2014 ${describeWhen(next)}`;
  if (elements.nextUnlockText.textContent !== text) elements.nextUnlockText.textContent = text;
  elements.nextUnlockBar.style.width = `${Math.floor(next.eta.fraction * 100)}%`;
  elements.nextUnlockHint.classList.toggle('hidden', !showHint);
  element.classList.remove('hidden');
}

// Labels over the tiles you can see but haven't unlocked: a tick when ready, otherwise progress.
// The tile that comes next also says when. Off when `enabled` is false.
const boardPills = new Map();
export function updateBoardTint(statuses, next, enabled, project) {
  if (!enabled) {
    for (const pill of boardPills.values()) pill.remove();
    boardPills.clear();
    return;
  }
  const wanted = new Set();
  for (const { tile, eta } of statuses) {
    wanted.add(tile.id);
    let pill = boardPills.get(tile.id);
    if (!pill) {
      pill = document.createElement('div');
      elements.boardPills.appendChild(pill);
      boardPills.set(tile.id, pill);
    }
    const ready = eta.seconds === 0;
    const isNext = next !== null && next.tile.id === tile.id;
    const className = `board-pill ${ready ? 'ready' : 'wait'}${isNext ? ' next' : ''}`;
    if (pill.className !== className) pill.className = className;
    const wait = eta.blockedBy ? `needs ${RESOURCE_ICONS[eta.blockedBy]}` : formatEta(eta.seconds);
    const text = isNext ? (ready ? '\u2713 Next' : `\u25b8 ${wait}`) : ready ? '\u2713' : `${Math.floor(eta.fraction * 100)}%`;
    if (pill.textContent !== text) pill.textContent = text;
    const { x, y } = project(tile.id);
    pill.style.left = `${x}px`;
    pill.style.top = `${y - 4}px`;
  }
  for (const [id, pill] of boardPills) {
    if (!wanted.has(id)) {
      pill.remove();
      boardPills.delete(id);
    }
  }
}

// 'kelp_rope' -> 'kelp rope', for display text. A no-op for every other resource.
function resourceLabel(resource) {
  return resource.split('_').join(' ');
}
// 'kelp_rope' -> 'Kelp Rope', for button/heading text.
function resourceTitle(resource) {
  return resourceLabel(resource).replace(/\b\w/g, (c) => c.toUpperCase());
}

function describeCost(cost) {
  return Object.entries(cost)
    .map(([resource, amount]) => `${amount} ${resourceLabel(resource)}`)
    .join(' + ');
}

function describeUnlock(tile) {
  if (tile.unlock.type === 'cost') {
    return describeCost(tile.unlock.cost);
  }
  return `Reach ${tile.unlock.target} lifetime ${resourceLabel(tile.unlock.resource)}`;
}

function describeProduction(tile, state) {
  const level = getLevel(state, tile.id);
  if (tile.kind === 'producer') {
    const mine = effectiveTileRate(tile, state.unlocked, state.levels, state.prestige.upgrades, state.prestige.ballast);
    const share = Math.round((mine / rateBreakdown(state, tile.produces).total) * 100);
    return `Produces ${Number(mine.toFixed(2))} ${tile.produces}/s \u00b7 ${share}% of your ${tile.produces}`;
  }
  if (tile.kind === 'generator') {
    const inputs = Object.keys(tile.consumes).map(resourceLabel).join(' + ');
    if (state.generatorsEnabled[tile.family] === false) {
      return `Paused \u2014 consumes ${inputs} \u2192 produces ${resourceLabel(tile.produces)} when switched back on`;
    }
    const rate = generatorRate(state, tile);
    return `Consumes ${inputs} \u2192 produces ${Number(rate.toFixed(2))} ${resourceLabel(tile.produces)}/s`;
  }
  return tile.boosts
    .map((b) => `+${Number((b.percent * levelMultiplier(level)).toFixed(2))}% ${resourceLabel(b.resource)} (+${boosterGain(state, tile, b.resource).toFixed(2)}/s now)`)
    .join(', ');
}

// A generator whose whole family has been switched off (see js/state.js's generatorsEnabled) --
// checked ahead of starvedHint below, since a paused generator's 0 rate isn't a supply shortfall.
function pausedHint(tile, state) {
  if (tile.kind !== 'generator' || !state.unlocked.includes(tile.id)) return '';
  if (state.generatorsEnabled[tile.family] !== false) return '';
  return 'Paused \u2014 turned off. Switch it back on below to resume.';
}

// Zone 3's generators are throttled when demand for an input outruns the shared stock (see
// applyGenerators in state.js) -- this is the same idea as zone 4's dim hint, but continuous
// rather than a flat on/off penalty, so it's reported as a shortfall rather than "halved".
function starvedHint(tile, state) {
  if (tile.kind !== 'generator' || !state.unlocked.includes(tile.id)) return '';
  if (state.generatorsEnabled[tile.family] === false) return '';
  const rate = generatorRate(state, tile);
  const fullRate = generatorFullRate(state, tile);
  if (fullRate <= 0 || rate >= fullRate * 0.999) return '';
  const percent = Math.round((rate / fullRate) * 100);
  const inputs = Object.keys(tile.consumes).map((r) => RESOURCE_ICONS[r]).join('/');
  return `Starved \u2014 running at ${percent}% of full rate. Needs more ${inputs} income to keep up.`;
}

function boosterHint(tile, state) {
  if (tile.kind !== 'booster' || !boosterIsIdle(state, tile)) return '';
  const resources = tile.boosts.map((b) => b.resource);
  const icons = resources.map((r) => RESOURCE_ICONS[r]).join('');
  return `You have no ${icons} tiles yet. This boosts every ${resources.map(resourceLabel).join(' or ')} tile you build, wherever it sits.`;
}

// The Abyssal Trench's bioluminescence: a producer with no unlocked booster within two hexes of it runs dim.
function dimHint(tile, state) {
  if (tile.kind !== 'producer' || tile.zone !== 'zone4' || !state.unlocked.includes(tile.id)) return '';
  if (isLit(tile, state.unlocked)) return '';
  return 'Dim — production is halved until a bioluminescent structure is unlocked next to it.';
}

export function showTilePanel(tile, state, eligible, onUnlock, onLevelUp, onToggleGenerator) {
  elements.panel.classList.remove('hidden');
  const hint = boosterHint(tile, state) || dimHint(tile, state) || pausedHint(tile, state) || starvedHint(tile, state);
  elements.panelHint.textContent = hint;
  elements.panelHint.classList.toggle('hidden', hint === '');
  elements.panelIcon.textContent = tileIcon(tile);
  elements.panelName.textContent = tile.name;

  const unlocked = state.unlocked.includes(tile.id);
  if (!unlocked) {
    elements.panelDesc.textContent = `Requires: ${describeUnlock(tile)}`;
    const eta = unlockEta(state, tile);
    let progress = `${Math.floor(eta.fraction * 100)}% ready`;
    if (eta.blockedBy) progress += ` \u00b7 needs ${RESOURCE_ICONS[eta.blockedBy]} income first`;
    else if (eta.seconds > 0) progress += ` \u00b7 ${formatEta(eta.seconds)} left`;
    elements.panelProgress.textContent = progress;
    elements.panelUnlockBtn.classList.remove('hidden');
    elements.panelUnlockBtn.textContent = 'Unlock';
    elements.panelUnlockBtn.disabled = !eligible;
    elements.panelUnlockBtn.onclick = () => onUnlock(tile);
    elements.panelToggleBtn.classList.add('hidden');
    return;
  }

  if (tile.kind === 'bridge') {
    elements.panelDesc.textContent = 'A plank bridge to the next biome. It makes nothing itself, but is the only way across.';
    elements.panelProgress.textContent = '';
    elements.panelUnlockBtn.classList.add('hidden');
    elements.panelToggleBtn.classList.add('hidden');
    return;
  }
  if (tile.kind === 'blank') {
    elements.panelDesc.textContent = 'A walkway between rafts. It makes nothing itself, but opens the way to the tiles beside it.';
    elements.panelProgress.textContent = '';
    elements.panelUnlockBtn.classList.add('hidden');
    elements.panelToggleBtn.classList.add('hidden');
    return;
  }

  // A generator's on/off switch applies to every tile of its family at once (see js/state.js's
  // generatorsEnabled), so it's shown regardless of level -- including at max level, where the
  // Level Up button above is already gone.
  if (tile.kind === 'generator') {
    const enabled = state.generatorsEnabled[tile.family] !== false;
    elements.panelToggleBtn.classList.remove('hidden');
    elements.panelToggleBtn.classList.toggle('off', !enabled);
    elements.panelToggleBtn.textContent = `Turn ${enabled ? 'Off' : 'On'} ${resourceTitle(tile.family)} Generators`;
    elements.panelToggleBtn.onclick = () => onToggleGenerator(tile);
  } else {
    elements.panelToggleBtn.classList.add('hidden');
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

// The quick-upgrade panel: every tile that can still be levelled, with a Level up button.
export function initUpgrades(onLevelUp) {
  elements.upgradesBtn = document.getElementById('upgrades-btn');
  elements.upgradesBadge = document.getElementById('upgrades-badge');
  elements.upgradesPanel = document.getElementById('upgrades-panel');
  elements.upgradesReady = document.getElementById('upgrades-ready');
  elements.upgradesList = document.getElementById('upgrades-list');

  const setOpen = (open) => {
    elements.upgradesPanel.classList.toggle('hidden', !open);
    elements.upgradesBtn.classList.toggle('open', open);
  };
  elements.upgradesBtn.addEventListener('click', () => setOpen(elements.upgradesPanel.classList.contains('hidden')));
  document.getElementById('upgrades-close-btn').addEventListener('click', () => setOpen(false));
  elements.upgradesList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-tile]');
    if (button) onLevelUp(button.dataset.tile);
  });
}

function upgradeRowHtml({ tile, level, cost, ready }) {
  const costText = Object.entries(cost)
    .map(([resource, amount]) => `${RESOURCE_ICONS[resource]} ${formatCount(amount)}`)
    .join(' + ');
  const zone = tile.zone === ZONES[0].id ? '' : `<span class="zone-chip">${ZONES.find((z) => z.id === tile.zone).name}</span>`;
  return `<div class="upg-row">
    <div class="upg-icon">${tileIcon(tile)}</div>
    <div class="upg-body">
      <div class="upg-name">${tile.name}${zone}</div>
      <div class="upg-meta">Lv ${level} &rarr; ${level + 1} &middot; ${costText}</div>
      ${ready ? '' : `<div class="upg-bar"><i data-bar="${tile.id}"></i></div>`}
    </div>
    ${ready ? `<button class="upg-buy" data-tile="${tile.id}">Level up</button>` : `<span class="upg-wait" data-wait="${tile.id}"></span>`}
  </div>`;
}

let upgradesReadyShown = -1;
let upgradesLayout = '';

// Called every frame with upgradeList(state). The list is rebuilt only when its rows or their
// ready state change; the waiting rows' percentages are updated in place, so a button is never
// swapped out from under the cursor between mouse-down and mouse-up.
export function updateUpgrades(rows) {
  const ready = rows.filter((row) => row.ready).length;
  if (ready !== upgradesReadyShown) {
    upgradesReadyShown = ready;
    elements.upgradesBadge.textContent = ready;
    elements.upgradesBadge.classList.toggle('hidden', ready === 0);
    elements.upgradesReady.textContent = ready ? `${ready} ready` : '';
  }
  if (elements.upgradesPanel.classList.contains('hidden')) return;

  const layout = rows.map((row) => `${row.tile.id}:${row.level}:${row.ready ? 1 : 0}`).join(',');
  if (layout !== upgradesLayout) {
    upgradesLayout = layout;
    elements.upgradesList.innerHTML = rows.length
      ? rows.map(upgradeRowHtml).join('')
      : '<p class="upg-empty">Every tile you have unlocked is at max level. Unlock more tiles to keep upgrading.</p>';
  }
  for (const row of rows) {
    if (row.ready) continue;
    const percent = Math.floor(row.fraction * 100);
    elements.upgradesList.querySelector(`[data-wait="${row.tile.id}"]`).textContent = `${percent}%`;
    elements.upgradesList.querySelector(`[data-bar="${row.tile.id}"]`).style.width = `${percent}%`;
  }
}

export function initMenu({ onRestart, onRefresh, onExport, onImport, onShopBuy, settings, onSettingChange }) {
  document.getElementById('game-version').textContent = `Version ${VERSION}`;
  elements.menuBtn = document.getElementById('menu-btn');
  elements.menuOverlay = document.getElementById('menu-overlay');
  elements.menuMain = document.getElementById('menu-main');
  elements.menuConfirm = document.getElementById('menu-confirm');
  elements.menuResumeBtn = document.getElementById('menu-resume-btn');
  elements.menuRestartBtn = document.getElementById('menu-restart-btn');
  elements.menuConfirmYesBtn = document.getElementById('menu-confirm-yes-btn');
  elements.menuConfirmNoBtn = document.getElementById('menu-confirm-no-btn');
  elements.menuAchievementsBtn = document.getElementById('menu-achievements-btn');
  elements.menuAchievements = document.getElementById('menu-achievements');
  elements.menuAchievementsList = document.getElementById('menu-achievements-list');
  elements.menuAchievementsBackBtn = document.getElementById('menu-achievements-back-btn');
  elements.menuSaveBtn = document.getElementById('menu-save-btn');
  elements.menuSave = document.getElementById('menu-save');
  elements.menuSaveExport = document.getElementById('menu-save-export');
  elements.menuSaveCopyBtn = document.getElementById('menu-save-copy-btn');
  elements.menuSaveImport = document.getElementById('menu-save-import');
  elements.menuSaveLoadBtn = document.getElementById('menu-save-load-btn');
  elements.menuSaveStatus = document.getElementById('menu-save-status');
  elements.menuSaveBackBtn = document.getElementById('menu-save-back-btn');
  elements.menuShopBtn = document.getElementById('menu-shop-btn');
  elements.menuShop = document.getElementById('menu-shop');
  elements.shopGold = document.getElementById('shop-gold');
  elements.shopList = document.getElementById('shop-list');
  elements.menuShopBackBtn = document.getElementById('menu-shop-back-btn');
  elements.menuSettingsBtn = document.getElementById('menu-settings-btn');
  elements.menuSettings = document.getElementById('menu-settings');
  elements.menuSettingsBackBtn = document.getElementById('menu-settings-back-btn');
  elements.settingBoardTint = document.getElementById('setting-board-tint');
  let loadArmed = false;

  function showMain() {
    elements.menuConfirm.classList.add('hidden');
    elements.menuAchievements.classList.add('hidden');
    elements.menuSave.classList.add('hidden');
    elements.menuSettings.classList.add('hidden');
    elements.menuShop.classList.add('hidden');
    elements.menuMain.classList.remove('hidden');
  }

  function showConfirm() {
    elements.menuMain.classList.add('hidden');
    elements.menuConfirm.classList.remove('hidden');
  }

  function showAchievements() {
    if (onRefresh) onRefresh();
    elements.menuMain.classList.add('hidden');
    elements.menuAchievements.classList.remove('hidden');
  }

  function showSave() {
    elements.menuMain.classList.add('hidden');
    elements.menuSave.classList.remove('hidden');
    elements.menuSaveExport.value = onExport();
    elements.menuSaveImport.value = '';
    elements.menuSaveStatus.textContent = '';
    loadArmed = false;
  }

  elements.menuBtn.addEventListener('click', () => {
    showMain();
    elements.menuOverlay.classList.remove('hidden');
  });
  elements.menuResumeBtn.addEventListener('click', hideMenu);
  elements.menuOverlay.addEventListener('click', (event) => {
    if (event.target === elements.menuOverlay) hideMenu();
  });
  elements.menuRestartBtn.addEventListener('click', showConfirm);
  elements.menuConfirmNoBtn.addEventListener('click', showMain);
  elements.menuConfirmYesBtn.addEventListener('click', () => {
    showMain();
    hideMenu();
    onRestart();
  });
  elements.menuAchievementsBtn.addEventListener('click', showAchievements);
  elements.menuAchievementsBackBtn.addEventListener('click', showMain);

  const shopHeadings = { look: 'Look' };
  function renderShop() {
    const state = elements.lastState;
    elements.shopGold.textContent = `${RESOURCE_ICONS.gold} ${state.gold.toLocaleString()} gold`;
    elements.shopList.textContent = '';
    let section = null;
    for (const row of shopCatalog(state)) {
      if (row.section !== section) {
        section = row.section;
        const heading = document.createElement('div');
        heading.className = 'shop-section';
        heading.textContent = shopHeadings[section];
        elements.shopList.appendChild(heading);
      }
      const item = document.createElement('div');
      item.className = 'shop-item';
      const info = document.createElement('div');
      info.className = 'shop-info';
      const name = document.createElement('b');
      if (row.swatch) {
        const swatch = document.createElement('span');
        swatch.className = 'shop-swatch';
        swatch.style.background = row.swatch;
        name.appendChild(swatch);
      }
      name.append(row.name);
      const detail = document.createElement('small');
      detail.textContent = row.detail;
      info.append(name, detail);

      const button = document.createElement('button');
      const label = { buy: `${RESOURCE_ICONS.gold} ${row.cost}`, poor: `${RESOURCE_ICONS.gold} ${row.cost}`, owned: 'Use', active: 'In use' };
      button.textContent = label[row.status];
      button.disabled = row.status === 'poor' || row.status === 'active';
      if (row.status === 'owned' || row.status === 'active') button.className = 'own';
      button.addEventListener('click', () => {
        if (onShopBuy(row.id)) renderShop();
      });
      item.append(info, button);
      elements.shopList.appendChild(item);
    }
  }

  elements.menuShopBtn.addEventListener('click', () => {
    elements.menuMain.classList.add('hidden');
    elements.menuShop.classList.remove('hidden');
    renderShop();
  });
  elements.menuShopBackBtn.addEventListener('click', showMain);

  elements.settingBoardTint.checked = settings.boardTint;
  elements.settingBoardTint.addEventListener('change', () => onSettingChange('boardTint', elements.settingBoardTint.checked));
  elements.menuSettingsBtn.addEventListener('click', () => {
    elements.menuMain.classList.add('hidden');
    elements.menuSettings.classList.remove('hidden');
  });
  elements.menuSettingsBackBtn.addEventListener('click', showMain);

  elements.menuSaveBtn.addEventListener('click', showSave);
  elements.menuSaveBackBtn.addEventListener('click', showMain);
  elements.menuSaveCopyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(elements.menuSaveExport.value);
      elements.menuSaveStatus.textContent = 'Copied.';
    } catch {
      elements.menuSaveExport.select();
      elements.menuSaveStatus.textContent = 'Press Ctrl+C (or Cmd+C) to copy the selected code.';
    }
  });
  elements.menuSaveImport.addEventListener('input', () => {
    loadArmed = false;
    elements.menuSaveStatus.textContent = '';
  });
  // Loading replaces the whole game, so it takes a second press to confirm.
  elements.menuSaveLoadBtn.addEventListener('click', () => {
    const code = elements.menuSaveImport.value;
    if (!code.trim()) {
      elements.menuSaveStatus.textContent = 'Paste a save code first.';
    } else if (!loadArmed) {
      loadArmed = true;
      elements.menuSaveStatus.textContent = 'This replaces your current game. Press Load code again to confirm.';
    } else if (onImport(code)) {
      hideMenu();
    } else {
      loadArmed = false;
      elements.menuSaveStatus.textContent = "That code doesn't look like a Drift Away save.";
    }
  });
}

export function updateAchievementsDisplay(state) {
  // main.js calls this every frame, so rebuild only when the rendered content
  // would actually differ: wiping the list each frame would clamp the scrollable
  // container's scroll position back to 0 and make the lower rows unreachable.
  const signature = `${state.gold}|${state.achievements.join(',')}`;
  if (elements.achievementsSignature === signature) return;
  elements.achievementsSignature = signature;

  elements.menuAchievementsList.innerHTML = '';

  const total = document.createElement('p');
  total.className = 'achievements-gold';
  total.textContent = `🪙 ${state.gold.toLocaleString()} gold earned`;
  elements.menuAchievementsList.appendChild(total);

  for (const achievement of ACHIEVEMENTS) {
    const achieved = state.achievements.includes(achievement.id);

    const row = document.createElement('div');
    row.className = `achievement-row ${achieved ? 'achieved' : 'locked'}`;

    const status = document.createElement('span');
    status.className = 'achievement-status';
    status.textContent = achieved ? '✓' : '🔒';

    const body = document.createElement('div');
    body.className = 'achievement-body';

    const name = document.createElement('span');
    name.className = 'achievement-name';
    name.textContent = achievement.name;

    const description = document.createElement('span');
    description.className = 'achievement-desc';
    description.textContent = achievement.description;

    body.appendChild(name);
    body.appendChild(description);

    const reward = document.createElement('span');
    reward.className = 'achievement-reward';
    reward.textContent = `🪙 ${achievement.reward}`;

    row.appendChild(status);
    row.appendChild(body);
    row.appendChild(reward);
    elements.menuAchievementsList.appendChild(row);
  }
}

export function hideMenu() {
  elements.menuOverlay.classList.add('hidden');
}

// A tap fires once immediately; holding repeats it (fast enough to feel like "quick buy",
// slow enough not to double-spend a whole batch on one accidental extra tick).
const HOLD_REPEAT_DELAY_MS = 400;
const HOLD_REPEAT_INTERVAL_MS = 90;

function wireHoldToRepeat(button, onFire) {
  let timeoutId = null;
  let intervalId = null;
  const stop = () => {
    clearTimeout(timeoutId);
    clearInterval(intervalId);
    timeoutId = null;
    intervalId = null;
  };
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    onFire();
    timeoutId = setTimeout(() => {
      // A disabled button may never see the pointerup, so the repeat checks for itself.
      intervalId = setInterval(() => (button.disabled ? stop() : onFire()), HOLD_REPEAT_INTERVAL_MS);
    }, HOLD_REPEAT_DELAY_MS);
  });
  // Enter/Space (and click()) arrive as a click with no press count; a pointer's click already fired above.
  button.addEventListener('click', (event) => {
    if (event.detail === 0) onFire();
  });
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointerleave', stop);
  button.addEventListener('pointercancel', stop);
}

function wireQuickBuyButtons(row, onBuy) {
  wireHoldToRepeat(row.buyBtn, () => onBuy(1));
  wireHoldToRepeat(row.buyBtn5, () => onBuy(5));
  wireHoldToRepeat(row.buyBtn10, () => onBuy(10));
}

// The prestige tree's layout: each node's spot, x as a % of the tree's width and y in px from its top
// (style.css keeps the tree 300px tall to match). Every branch hangs off the root's bar; production's
// hub drops between Ballast and Head start to the seven lanes spread along the bottom row.
const TREE_SPOTS = { hold: [16, 80], tides: [16, 156], ballast: [50, 80], headStart: [84, 80] };
const LANE_Y = 276;
const laneX = (i) => 6 + (88 / (RESOURCES.length - 1)) * i;
const TREE_LINES = `M50 16V40M16 40H84M16 40V156M50 40V80M84 40V80M67 40V242M6 242H94${RESOURCES.map((_, i) => `M${laneX(i)} 242V${LANE_Y}`).join('')}`;
const TREE_FRAME =
  `<svg viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden="true"><path d="${TREE_LINES}"/></svg>` +
  `<div class="tree-root" style="left:50%;top:16px" aria-hidden="true">${TOKEN_ICON}</div>` +
  `<div class="tree-hub" style="left:67%;top:214px" aria-hidden="true">Production</div>`;
const TREE_ICONS = { hold: '📦', tides: '🌊', ballast: '⚓', headStart: '⛵' };
const BRANCH_NAMES = { production: 'Production', comfort: 'Comfort', efficiency: 'Efficiency', headstart: 'Head start' };
const STATUS_WORDS = { buy: 'affordable', poor: 'too costly', maxed: 'maxed', locked: 'locked' };

const nodeIcon = (row) => TREE_ICONS[row.id] ?? RESOURCE_ICONS[row.id];
const nodeTitle = (row) => row.name[0].toUpperCase() + row.name.slice(1);
const nodeLevel = (row) => (row.maxLevel ? `tier ${row.level} of ${row.maxLevel}` : `level ${row.level}`);

function treeNodeHtml(row, selected) {
  const [x, y] = TREE_SPOTS[row.id] ?? [laneX(RESOURCES.indexOf(row.id)), LANE_Y];
  const lane = row.branch === 'production';
  const branch = BRANCH_NAMES[row.branch] === nodeTitle(row) ? '' : ` (${BRANCH_NAMES[row.branch]})`;
  const label = `${nodeTitle(row)}${branch}, ${nodeLevel(row)}, ${STATUS_WORDS[row.status]}`;
  return `<button class="tree-node ${row.status}${lane ? ' lane' : ''}" data-node="${row.id}" style="left:${x}%;top:${y}px" aria-label="${label}"${selected ? ' aria-current="true"' : ''}>` +
    `<span class="tree-icon">${nodeIcon(row)}</span>${lane ? '' : `<span>${nodeTitle(row)}</span>`}` +
    `<small>${row.maxLevel ? `${row.level}/${row.maxLevel}` : `Lv ${row.level}`}</small></button>`;
}

// What a node gives you now.
function nodeEffect(row, state) {
  if (row.id === 'hold') return `Time away counts for up to ${offlineCapSeconds(state) / 3600}h`;
  if (row.id === 'tides') return `Time away is counted at ${Math.round(offlineRate(state) * 100)}% of your rate`;
  if (row.id === 'ballast') return `+${row.level}% to all production (+1% per level)`;
  if (row.id === 'headStart') return `Every run starts with ${row.level * HEAD_START_TILES_PER_LEVEL} free tiles (+${HEAD_START_TILES_PER_LEVEL} per tier)`;
  return `+${row.level * PRESTIGE_UPGRADE_PERCENT}% ${row.name} production (+${PRESTIGE_UPGRADE_PERCENT}% per level)`;
}

export function initPrestige(onPrestige, onBuyUpgrade, onRefresh) {
  elements.prestigeBtn = document.getElementById('prestige-btn');
  elements.prestigeOverlay = document.getElementById('prestige-overlay');
  elements.prestigeMain = document.getElementById('prestige-main');
  elements.prestigeActionBtn = document.getElementById('prestige-action-btn');
  elements.prestigeStoreBtn = document.getElementById('prestige-store-btn');
  elements.prestigeConfirm = document.getElementById('prestige-confirm');
  elements.prestigeConfirmText = document.getElementById('prestige-confirm-text');
  elements.prestigeYesBtn = document.getElementById('prestige-confirm-yes-btn');
  elements.prestigeNoBtn = document.getElementById('prestige-confirm-no-btn');
  elements.prestigeStore = document.getElementById('prestige-store');
  elements.prestigeStoreTokens = document.getElementById('prestige-store-tokens');
  elements.prestigeStoreBackBtn = document.getElementById('prestige-store-back-btn');
  elements.prestigeTree = document.getElementById('prestige-tree');
  elements.prestigeNodeDetail = document.getElementById('prestige-node-detail');
  const detail = {
    title: document.getElementById('node-detail-title'),
    meta: document.getElementById('node-detail-meta'),
    effect: document.getElementById('node-detail-effect'),
    cost: document.getElementById('node-detail-cost'),
    tierBtn: document.getElementById('node-detail-tier-btn'),
    qty: document.getElementById('node-detail-qty'),
    buyBtn: document.getElementById('node-detail-buy-btn'),
    buyBtn5: document.getElementById('node-detail-buy5-btn'),
    buyBtn10: document.getElementById('node-detail-buy10-btn'),
  };
  let selectedNodeId = null;
  let shownState = null; // what the tree was last drawn from, for re-drawing it when a node is picked

  // Cleared and rebuilt like renderShop: the tree's buttons are only ever clicked, never held. Focus
  // goes back to the rebuilt node so a keyboard player doesn't lose their place.
  function renderTree(state) {
    shownState = state;
    const focused = elements.prestigeTree.contains(document.activeElement) ? document.activeElement.dataset.node : null;
    // The production lanes go last so the tab order runs top to bottom, the way the tree reads.
    const rows = prestigeTreeCatalog(state).sort((a, b) => (a.branch === 'production') - (b.branch === 'production'));
    elements.prestigeTree.innerHTML = TREE_FRAME + rows.map((row) => treeNodeHtml(row, row.id === selectedNodeId)).join('');
    if (focused) elements.prestigeTree.querySelector(`[data-node="${focused}"]`).focus();
  }

  // Unlike the tree, this panel's buttons are fixed and wired once, below: a +1/+5/+10 button is held
  // to repeat, so it must never be swapped out from under the pointer as each purchase re-renders.
  function renderNodeDetail(state) {
    const row = prestigeTreeCatalog(state).find((r) => r.id === selectedNodeId);
    elements.prestigeNodeDetail.classList.toggle('hidden', !row);
    if (!row) return;
    const tiered = row.branch === 'comfort';
    detail.title.textContent = `${nodeIcon(row)} ${nodeTitle(row)}`;
    detail.meta.textContent = `${BRANCH_NAMES[row.branch]} · ${nodeLevel(row)}`;
    detail.effect.textContent = nodeEffect(row, state);
    detail.cost.textContent =
      row.status === 'maxed' ? 'Maxed'
      : row.status === 'locked' ? 'Locked until Deeper hold is maxed'
      : `Next ${row.maxLevel ? 'tier' : 'level'}: ${TOKEN_ICON} ${row.cost}`;
    detail.tierBtn.classList.toggle('hidden', !tiered);
    detail.qty.classList.toggle('hidden', tiered);
    for (const button of [detail.tierBtn, detail.buyBtn, detail.buyBtn5, detail.buyBtn10]) button.disabled = row.status !== 'buy';
  }

  elements.renderPrestigeTree = renderTree;
  elements.renderPrestigeNodeDetail = renderNodeDetail;
  elements.prestigeTree.addEventListener('click', (event) => {
    const node = event.target.closest('[data-node]');
    if (!node) return;
    selectedNodeId = node.dataset.node;
    renderTree(shownState);
    renderNodeDetail(shownState);
  });
  // Hold and Tides are a few fixed tiers, each dearer than the last, so they get one button, no quantity.
  detail.tierBtn.addEventListener('click', () => onBuyUpgrade(selectedNodeId, 1));
  wireQuickBuyButtons(detail, (qty) => onBuyUpgrade(selectedNodeId, qty));

  function showMain() {
    elements.prestigeConfirm.classList.add('hidden');
    elements.prestigeStore.classList.add('hidden');
    elements.prestigeMain.classList.remove('hidden');
  }

  function showConfirm() {
    elements.prestigeConfirmText.textContent =
      `Prestige for ${elements.pendingPrestigeTokens} tokens? This resets your farm but keeps your permanent upgrades.`;
    elements.prestigeMain.classList.add('hidden');
    elements.prestigeConfirm.classList.remove('hidden');
  }

  function hideConfirm() {
    elements.prestigeConfirm.classList.add('hidden');
    elements.prestigeMain.classList.remove('hidden');
  }

  function showStore() {
    // Hides every sub-view, not just prestige-main: this is called both from
    // prestige-main (via the Prestige tree button) and directly from the confirm sub-view
    // (right after a successful prestige), so it can't assume what's visible.
    elements.prestigeMain.classList.add('hidden');
    elements.prestigeConfirm.classList.add('hidden');
    elements.prestigeStore.classList.remove('hidden');
  }

  function hideStore() {
    elements.prestigeStore.classList.add('hidden');
    elements.prestigeMain.classList.remove('hidden');
  }

  elements.prestigeBtn.addEventListener('click', () => {
    if (onRefresh) onRefresh();
    showMain();
    elements.prestigeOverlay.classList.remove('hidden');
  });
  elements.prestigeOverlay.addEventListener('click', (event) => {
    if (event.target === elements.prestigeOverlay) hidePrestigeOverlay();
  });
  elements.prestigeActionBtn.addEventListener('click', () => {
    if (onRefresh) onRefresh();
    showConfirm();
  });
  elements.prestigeNoBtn.addEventListener('click', hideConfirm);
  elements.prestigeYesBtn.addEventListener('click', () => {
    // Calls onPrestige() (which updates state and refreshes the store's displayed
    // token balance via updatePrestigeDisplay) before showStore() reveals it, per
    // the spec's "confirming lands the player directly in the Store" flow. Only
    // shows the store if the prestige actually happened.
    const succeeded = onPrestige();
    if (succeeded) {
      showStore();
    } else {
      hideConfirm();
    }
  });
  elements.prestigeStoreBtn.addEventListener('click', showStore);
  elements.prestigeStoreBackBtn.addEventListener('click', hideStore);
}

export function hidePrestigeOverlay() {
  elements.prestigeOverlay.classList.add('hidden');
}

function updatePrestigeButton(state) {
  const tokens = prestigeTokensEarned(state);
  const eligible = tokens >= PRESTIGE_MIN_TOKENS;
  elements.pendingPrestigeTokens = eligible ? tokens : 0;
  elements.prestigeActionBtn.disabled = !eligible;
  const text = eligible
    ? `Prestige (+${tokens} tokens)`
    : `Prestige (${formatCount(lifetimeTotal(state))} / ${formatCount(PRESTIGE_MIN_LIFETIME)} lifetime resources)`;
  if (elements.prestigeActionBtn.textContent !== text) elements.prestigeActionBtn.textContent = text;
}

export function updatePrestigeDisplay(state) {
  updatePrestigeButton(state);
  elements.prestigeStoreTokens.textContent = `Tokens: ${state.prestige.tokens}`;
  // Given `state`, not elements.lastState: after a prestige or an import this runs before the next
  // frame hands the resource bar the new state.
  elements.renderPrestigeTree(state);
  elements.renderPrestigeNodeDetail(state);
}

const POPUP_DURATION_MS = 1200;
const POPUP_STAGGER_PX = 22;
const MAX_STAGGER_STEPS = 4;

// Two popups landing in the same frame would otherwise animate exactly on top of
// each other, so each one starts a notch lower than the ones still in flight and
// rises past them. The counter decays as popups retire, and the offset is capped
// so a long burst of them can't march off the bottom of the screen.
let activePopups = 0;

function spawnPopup(popup) {
  popup.style.top = `${Math.min(activePopups, MAX_STAGGER_STEPS) * POPUP_STAGGER_PX}px`;
  activePopups += 1;
  elements.feedbackLayer.appendChild(popup);
  setTimeout(() => {
    popup.remove();
    activePopups -= 1;
  }, POPUP_DURATION_MS);
}

function popupEntry(amount, icon) {
  const entry = document.createElement('span');
  entry.className = amount > 0 ? 'gain' : 'loss';
  entry.textContent = `${amount > 0 ? '+' : ''}${amount} ${icon}`;
  return entry;
}

// `deltas` is e.g. { fish: -50, kelp: -20 } — negative spent, positive gained.
// Every non-zero entry shares one popup line so a multi-resource cost reads as a
// single "-50 🐟 -20 🌿" rather than a stack of overlapping elements.
export function showResourcePopup(deltas) {
  const entries = Object.entries(deltas)
    .map(([resource, amount]) => [resource, Math.round(amount)])
    .filter(([, amount]) => amount !== 0);
  if (entries.length === 0) return;

  const popup = document.createElement('div');
  popup.className = 'feedback-popup';
  for (const [resource, amount] of entries) {
    popup.appendChild(popupEntry(amount, RESOURCE_ICONS[resource]));
  }
  spawnPopup(popup);
}

export function showTokenPopup(amount) {
  if (amount === 0) return;
  const popup = document.createElement('div');
  popup.className = 'feedback-popup';
  popup.appendChild(popupEntry(amount, TOKEN_ICON));
  spawnPopup(popup);
}

