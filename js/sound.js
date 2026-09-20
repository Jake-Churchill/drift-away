// Tiny Web Audio wrapper: every sound is synthesised from oscillators, so there
// are no audio assets to load or ship. Sound is a "nice to have" layer — if the
// browser refuses to give us a context (or to resume one before the player's
// first gesture), every call here degrades to a silent no-op rather than an error.

let audioContext = null;

function getContext() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  } catch {
    return null;
  }
}

// One soft blip: a sine oscillator shaped by a quick attack and a short
// exponential decay, so it fades out instead of clicking off. Exponential ramps
// can't target zero, hence the near-silent 0.0001 floor at both ends.
function playTone(frequency, startOffset, duration, type = 'sine', peak = 0.18) {
  const context = getContext();
  if (!context) return;

  const start = context.currentTime + startOffset;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playUnlockSound() {
  playTone(523.25, 0, 0.1);
  playTone(783.99, 0.1, 0.12);
}

export function playLevelUpSound() {
  playTone(440, 0, 0.08);
}

export function playPrestigeSound() {
  playTone(523.25, 0, 0.18);
  playTone(659.25, 0.12, 0.18);
  playTone(783.99, 0.24, 0.45);
}

// The chime for an unlock or level-up you just clicked. `intensity` (0 to 1) lifts the pitch up to
// five semitones so a late unlock rings higher than an early one, adds a top note when it is big,
// and puts a low thump under anything past the smallest.
const CHIME_ROOT = 392; // G4
const chimeFrequency = (semitones, intensity) => CHIME_ROOT * 2 ** ((semitones + Math.round(intensity * 5)) / 12);

export function playUnlockImpactSound(intensity) {
  const notes = intensity > 0.6 ? [0, 4, 7, 12] : [0, 4, 7];
  notes.forEach((semitones, i) => playTone(chimeFrequency(semitones, intensity), i * 0.07, 0.38, 'triangle', 0.12));
  if (intensity > 0.3) playThump(intensity);
}

export function playLevelUpImpactSound(intensity) {
  [0, 7].forEach((semitones, i) => playTone(chimeFrequency(semitones, intensity), i * 0.07, 0.32, 'triangle', 0.12));
}

function playThump(intensity) {
  const context = getContext();
  if (!context) return;
  const start = context.currentTime + 0.005;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.setValueAtTime(110, start);
  oscillator.frequency.exponentialRampToValueAtTime(42, start + 0.22);
  gain.gain.setValueAtTime(0.22 * intensity, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.3);
}
