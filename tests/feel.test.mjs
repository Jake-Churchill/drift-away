import assert from 'node:assert/strict';
import { formatCount, formatEta } from '../js/format.js';
import { SETTINGS_KEY, loadSettings, saveSettings } from '../js/settings.js';
import { VERSION } from '../js/version.js';

assert.match(VERSION, /^\d+\.\d+\.\d+$/, 'VERSION must be MAJOR.MINOR.PATCH');

// --- number and time formatting ---
{
  assert.equal(formatCount(0), '0');
  assert.equal(formatCount(9999.9), '9,999', 'under ten thousand, show the whole number');
  assert.equal(formatCount(10000), '10K');
  assert.equal(formatCount(12345), '12.3K');
  assert.equal(formatCount(118000), '118K');
  assert.equal(formatCount(85812), '85.8K');
  assert.equal(formatCount(1234567), '1.23M');
  assert.equal(formatCount(1.5e9), '1.5B');
  assert.equal(formatCount(2.5e12), '2.5T');
  assert.equal(formatCount(999950), '1M', 'rounding up across a suffix steps up to the next one, not "1000K"');
  assert.doesNotThrow(() => formatCount(-3.2), 'a negative number never crashes the HUD');

  assert.equal(formatEta(0), '0s');
  assert.equal(formatEta(0.2), '1s', 'a sliver of a second still rounds up, never "0s" while waiting');
  assert.equal(formatEta(21), '21s');
  assert.equal(formatEta(59.1), '1m 00s');
  assert.equal(formatEta(252), '4m 12s');
  assert.equal(formatEta(3600), '1h 00m');
  assert.equal(formatEta(3725), '1h 02m');
  assert.equal(formatEta(Infinity), '\u2014', 'no income means no time to show');

  console.log('formatting tests passed');
}

// --- settings ---
{
  let stored = null;
  globalThis.localStorage = {
    getItem: (k) => (k === SETTINGS_KEY ? stored : null),
    setItem: (k, v) => { if (k === SETTINGS_KEY) stored = v; },
  };

  assert.deepEqual(loadSettings(), { boardTint: true }, 'board tint is on by default');

  saveSettings({ boardTint: false });
  assert.deepEqual(loadSettings(), { boardTint: false }, 'a saved choice comes back');

  stored = 'not json';
  assert.deepEqual(loadSettings(), { boardTint: true }, 'a corrupt value falls back to defaults');
  stored = JSON.stringify({ boardTint: 'yes' });
  assert.deepEqual(loadSettings(), { boardTint: true }, 'a wrongly typed value falls back to the default');
  stored = JSON.stringify({ somethingElse: 1 });
  assert.deepEqual(loadSettings(), { boardTint: true }, 'unknown keys are ignored');

  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.deepEqual(loadSettings(), { boardTint: true }, 'blocked storage still yields defaults');
  saveSettings({ boardTint: false }); // must not throw

  console.log('settings tests passed');
}
