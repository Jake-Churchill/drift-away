const SUFFIXES = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

// Counts under ten thousand are shown whole; beyond that a three-digit figure with a suffix, so a
// count that moves every frame stays a readable width.
export function formatCount(n) {
  if (n < 1e4) return Math.floor(n).toLocaleString();
  for (let i = 0; i < SUFFIXES.length; i++) {
    const [limit, suffix] = SUFFIXES[i];
    if (n < limit) continue;
    const rounded = Number((n / limit).toPrecision(3));
    // 999,950 rounds to "1000K"; say "1M" instead.
    if (rounded >= 1000 && i > 0) return `1${SUFFIXES[i - 1][1]}`;
    return `${rounded}${suffix}`;
  }
  return String(Math.floor(n));
}

// Time left until something arrives: always rounds up, so a wait never reads "0s".
export function formatEta(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const s = Math.ceil(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
}
