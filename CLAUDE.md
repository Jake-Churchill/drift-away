# Drift Away

## Version number

The game's version is `VERSION` in `js/version.js` (MAJOR.MINOR.PATCH), shown at the bottom of the in-game menu. Bump it in the same change whenever the game is added to or updated:

- MINOR for anything new the player can see or use (a feature, zone, tiles, shop item, setting), resetting PATCH to 0.
- PATCH for fixes, balance/price tuning, and visual polish.
- MAJOR only when the user says so.

Don't bump for changes that don't reach the player (docs, tests, scratch pages, refactors). State the new version in the summary of the change.
