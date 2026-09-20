// Colours for the Harbor Shop's looks. The default is the game's original palette, so scene.js can
// take its starting colours from here too and the two never drift apart. `cloud` tints the clouds.
export const DEFAULT_PALETTE = { water: 0x2e7ba8, background: 0x0e2f42, cloud: 0xffffff };

export const PALETTES = {
  lagoon: {
    name: 'Lagoon',
    blurb: 'Turquoise water and a clear sky',
    swatch: '#3fb3b8',
    cost: 6,
    water: 0x3fb3b8,
    background: 0x0f4a55,
    cloud: 0xffffff,
  },
  dusk: {
    name: 'Dusk',
    blurb: 'Mauve water, rose clouds',
    swatch: '#a8659f',
    cost: 6,
    water: 0xa8659f,
    background: 0x3a2251,
    cloud: 0xffc9dc,
  },
  storm: {
    name: 'Storm',
    blurb: 'Grey-green swell, heavy clouds',
    swatch: '#5d7a6f',
    cost: 6,
    water: 0x4f6f66,
    background: 0x1b2926,
    cloud: 0x9aa4a6,
  },
};
