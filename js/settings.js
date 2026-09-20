// Player preferences. Kept apart from the game save on purpose: restarting or importing a save
// shouldn't change how the game looks on this device.
export const SETTINGS_KEY = 'driftaway_settings_v1';

const DEFAULTS = { boardTint: true };

export function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return { boardTint: typeof parsed?.boardTint === 'boolean' ? parsed.boardTint : DEFAULTS.boardTint };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable — the choice just lasts for this session
  }
}
