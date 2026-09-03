# Drift Away

A calm, idle resource-management game: unlock hexagonal raft tiles on the open sea, each producing fish, kelp, driftwood, or crops, or boosting another resource's output, until all 25 slots are claimed.

Once deployed, it will be live at **https://driftaway.jakechurchill.com**.

## Running locally

This is a plain HTML/CSS/JS project — no build step, no dependencies. It uses ES modules, which browsers block from loading over `file://`, so serve it with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the URL it prints (e.g. `http://localhost:3000` or `http://localhost:8000`).

## Controls

- Click any tile to see what it produces (or boosts) and, if it's locked, what's needed to unlock it.
- Once a locked tile's requirement is met, its **Unlock** button becomes active — click it to claim the raft.
- Progress saves automatically to your browser's local storage; resources only accrue while the tab is open.

## Tests

The core economy math (production rates, unlock eligibility, ticking) has a zero-dependency test suite:

```bash
npm test
```

## Project docs

- Design spec: `docs/superpowers/specs/2026-09-02-drift-away-design.md`
- Project context for future work: `memory-bank/`
