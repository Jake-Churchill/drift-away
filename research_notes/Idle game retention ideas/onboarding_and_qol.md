# First-Time Experience, Early Retention, Return Experience, and Quality of Life for Browser Idle Games

Scope note: this covers FTUE / first 10 minutes, the returning-player loop, the QoL layer, no-backend social features, ethics/accessibility, and web-platform specifics. Applied throughout to **Drift Away** (vanilla JS + Three.js, no backend, localStorage, 2 zones x 36 hex tiles, 4 resources, producer/booster tiles, adjacency-gated unlocks, tile levels 1–3, achievements granting unused "gold", prestige at max, offline = 50% rate capped at 8h).

**Evidence quality labels used below:** `[Strong]` peer-reviewed or primary platform documentation; `[Moderate]` named practitioner blog, game wiki, or industry benchmark report; `[Weak]` marketing/agency content blog with no methodology; `[Anecdotal]` individual player/dev comments in community threads.

---

## Q1. What do successful idle/incremental games do in the first minutes, and what causes early drop-off?

### Takeaway
The consensus across practitioner and industry sources is: let the player act before you explain anything, guarantee a "quick win" inside roughly the first 90 seconds, and then release systems one at a time rather than all at once — and the benchmark numbers show how brutal the funnel is, with median mobile-game D1 retention at ~23% and D7 at ~4%. For Drift Away specifically, the highest-risk moment is the gap between the first click and the first *unlock*, because a single starting tile with no explanatory text gives the player no visible goal.

### Cited Findings
- `[Moderate]` Median Day-1 retention across all markets and mobile game projects is **22.91%**, Day-7 is **4.2%**, and Day-28 is **0.85%** — [Segwise, Mobile Game Retention Benchmarks (2026 post, citing GameAnalytics data)](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies); underlying dataset described in [GameAnalytics, Mobile Gaming Benchmarks Q1 2024](https://www.gameanalytics.com/reports/mobile-games-benchmarks-q1-2024).
- `[Moderate]` By end of 2024 the **top quartile** of games averaged only **26.48%–27.69% D1**, *down* from 28–29% in 2023 — i.e. early retention got worse year over year — [Segwise (2026)](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies); corroborated in [GameDevReports, GameAnalytics Benchmarks Q1'24](https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile).
- `[Moderate]` Platform split in the top quartile: iOS D1 **31–33%**, Android **25–27%** — [Segwise (2026)](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies). (Relevant as a proxy: a desktop-browser hobby game has no store funnel, so raw D1 is not directly comparable, but the *shape* — most loss in the first session — is.)
- `[Moderate]` Casual / hyper-casual D1 of **30–40%** is considered "healthy" — [AppAgent, Mobile Game Retention Benchmarks](https://appagent.com/blog/mobile-game-retention-benchmarks/); [Mistplay, The big list of mobile game retention benchmarks](https://business.mistplay.com/resources/mobile-game-retention-benchmarks).
- `[Weak]` The "onboarding bundle" formula: an onboarding sequence needs at minimum **(1) a quick win, (2) a glimpse of the future, (3) a commitment hook**, and the quick win must land **within the first 90 seconds** or it isn't a quick win. The win should be *engineered* — feel hard, be guaranteed — [Yu-kai Chou, Game Design Techniques: the Onboarding Bundle](https://yukaichou.com/gamification-study/game-design-techniques-the-onboarding-bundle/).
- `[Weak]` "The worst onboarding mistake is explaining the product before letting the user touch it… Let them play first, explain later." — [Yu-kai Chou](https://yukaichou.com/gamification-study/game-design-techniques-the-onboarding-bundle/).
- `[Weak]` Idle-specific staging advice: the best idle games layer in auto-collectors, prestige, time boosts and events *over time*; dumping them in the first 10 minutes causes new players to bail. Recommended technique is to **gray out / lock advanced tabs visually** and use tooltip-style onboarding at the moment each system unlocks — [Apptrove, How to Make an Idle Game](https://apptrove.com/how-to-make-an-idle-game/); [GridInc, Idle Games Best Practices](https://gridinc.co.za/blog/idle-games-best-practices).
- `[Moderate]` Practitioner economy guidance for idle games: use exponential scaling where **production multiplier ≈ 1.1x and cost multiplier ≈ 1.15x** per step, so progression stays noticeable but naturally decelerates — [Eric Guan, Idle Game Design Principles (Substack; publication year not stated in retrieved content)](https://ericguan.substack.com/p/idle-game-design-principles).
- `[Moderate]` First-session play length for idle games is typically **15–60 minutes of active play**, decaying over the game's life toward weekly check-ins — [Eric Guan, Idle Game Design Principles](https://ericguan.substack.com/p/idle-game-design-principles).
- `[Moderate]` The first ten minutes are about "establishing a relationship, setting expectations, and making a promise the rest of the game must uphold" — not just teaching mechanics. Named examples of openings that do this: *Portal*, *The Witness* (teaches through curiosity with no explicit instruction), *Breath of the Wild*, *Subnautica* (scale contrast), *Arc Raiders* — [Doyen, Schiavo & Carrette, game-changr, "Stop Teaching, Start Seducing" (Feb 14, updated Apr 8; year not stated on page)](https://www.game-changr.com/post/stop-teaching-start-seducing-how-to-make-players-fall-in-love-in-10-minutes).
- `[Anecdotal]` Community-reported early-game friction in incremental games includes not knowing *why* a purchase is blocked (fixed by **red text when a resource is insufficient**) and not being able to see the board (fixed by **scroll-wheel pan/zoom**) — [itch.io feedback thread](https://itch.io/post/1603364); [itch.io "quality of life requests"](https://itch.io/t/3389312/quality-of-life-requests).
- `[Anecdotal]` Early-game grind is a named drop-off cause: players ask for **"starting money to skip the click phase"** and **autobuyers** in early incremental builds — [itch.io QoL requests thread](https://itch.io/t/3389312/quality-of-life-requests).

### Inferences
- Drift Away's first 10 minutes are unusually fragile for a *structural* reason rather than a content reason: with one starting driftwood tile, the player's first meaningful decision is gated behind a resource accumulation wait, and there is no visible "next thing" because undiscovered tiles are hidden. The quick-win window (≈90s) is likely being spent watching a counter.
- The adjacency + hidden-tile design is a strong "glimpse of the future" mechanic that is currently under-used: a pulsing marker on a discovered-but-locked tile *is* the glimpse, but only after discovery. Making the very first neighbour discovered and marked at t=0 converts the opening from "wait" into "visible goal".
- The 1.1x/1.15x guidance implies the first 3–4 unlocks should be cheap enough to land inside one session. If Drift Away's early unlock costs are tuned on the same curve as late ones, the first unlock is probably arriving too late.
- Teaching without a tutorial wall maps cleanly onto Drift Away's existing tile panel: the panel is already the natural place for just-in-time explanation (what a booster does, what adjacency means), so no separate tutorial system is needed.

### Gaps
- I could not find a rigorously sourced figure for "the first 5 minutes determine X% of retention." That claim appeared in a search summary attributed to the game-changr article, but on fetching the full article its **only** quantitative claim was vague ("within moments"). **Do not use an 80% figure** — it is not supported by any source I could verify.
- No idle-game-specific D1/D7 benchmark data (all retention numbers found are all-genre mobile). No browser/web-game retention benchmarks found at all.
- No postmortem with instrumented funnel data (e.g. "X% of players quit before first unlock") for any named incremental game was retrievable.

---

## Q2. What makes a good "welcome back" / return experience, and how do games show "what to do next"?

### Takeaway
The return experience is two jobs, not one: (a) an honest, itemised account of what happened while away, and (b) a forward-pointing reason to stay in the tab right now. Offline caps are deliberately used as a return incentive, and the best-documented implementations (Antimatter Dimensions) make offline progress *configurable* rather than a fixed black box.

### Cited Findings
- `[Moderate]` The canonical implementation is timestamp-delta, not tick-counting: `gained = Math.floor((now - last_saved) / tick_ms) * rate`, then a modal reading e.g. *"Welcome back! You were away 120s and earned 40 wood"* with a Continue button that dismisses and resumes — [Edvins Antonovs, Rebuilding the "Welcome Back" mechanic from idle games](https://edvins.io/rebuilding-the-welcome-back-mechanic-from-idle-games-in-react).
- `[Anecdotal]` A dev-facing "Welcome Back Engine" pattern additionally **records which action was in progress at close**, simulates that action forward, shows the summary, then *continues that action* automatically — [SkyPage6, The "Welcome Back" Engine (Offline Progress & Auto-Save), itch.io devlog](https://skypage6.itch.io/offline-progress-manager/devlog/1360897/the-welcome-back-engine-offline-progress-auto-save).
- `[Moderate]` Antimatter Dimensions runs **20 ticks/second online** (configurable "Update rate" in Options). Since the Reality Update, **offline progress is fully simulated** across a configurable number of ticks, with a **skip button**, and a **toggle to disable simulation** (falling back to applying all missed time in a single tick) if simulation misbehaves. Example given: 1,000 offline ticks over 1 hour away = 3.6-second ticks — [Antimatter Dimensions Wiki, Offline Progress](https://antimatter-dimensions.fandom.com/wiki/Offline_Progress); [AD: Endgame Wiki, Offline Progress](https://adendgame.wiki.gg/wiki/Offline_Progress); [Steam discussion: Offline Progression Clarification](https://steamcommunity.com/app/1399720/discussions/0/3732953628865759665/).
- `[Weak]` Offline income is explicitly described as a retention device: it "creates incentives for players to come back as they see the virtual world keeps evolving," and the **cap is intentional** — once accumulation stops it creates a "feeling of lost opportunity" that motivates regular check-ins — [The Mind Studios, Idle Clicker Game Design and Monetization](https://games.themindstudios.com/post/idle-clicker-game-design-and-monetization/); [DracoArts, Why Idle Mechanics Work Even When You're Offline](https://dracoarts.com/blogs/why-idle-mechanics-work-even-when-you-re-offline-the-science-of-passive-progress).
- `[Moderate]` Multi-clock design as a return mechanic: give different resources different natural "fill" cadences so a returning player always has *something* ready. Worked example: *"Milk-producing Cows cap every 20 minutes. Cheese-producing Creameries cap every 5 hours. Engine-producing Shipyards cap every 2 days."* This lets players with different check-in rhythms each have an optimisation target — [Eric Guan, Idle Game Design Principles](https://ericguan.substack.com/p/idle-game-design-principles).
- `[Moderate]` Multiple currencies let active players (checking every ~15 min) and casual players (daily/weekly) both optimise, producing "heterogenous players" rather than forcing one cadence — [Eric Guan, Idle Game Design Principles](https://ericguan.substack.com/p/idle-game-design-principles).
- `[Anecdotal]` Players explicitly ask for **"clearer information displays about selected options and resource gains, plus stat screens"** as a QoL need in incremental games — i.e. "what happened / what's next" legibility is a recurring complaint — [itch.io QoL requests](https://itch.io/t/3389312/quality-of-life-requests); [itch.io post](https://itch.io/post/9130550).

### Inferences
- Drift Away's existing Welcome Back modal is a summary but probably not a *nudge*. The evidence points to adding one forward-looking line — "Next: Kelp Bed (3 of 4 driftwood away)" — inside the same modal, because that converts the modal from a receipt into a call to action at the exact moment attention is highest.
- The 8-hour cap is doing retention work, but only if the player can *see* it. An unlabelled cap reads as a bug ("I was gone 20 hours and only got 8 hours of stuff"); a labelled one ("capped at 8h — you had 12h of unclaimed time") converts a perceived loss into a reason to check in more often. This is also the ethically clean framing: state the rule, don't hide it.
- The four-resource design already supports Eric Guan's multi-clock idea without new systems: if the zone-2 (Frozen Reach) resources cap or accrue on a slower clock than Home Waters resources, daily and weekly players each get a payoff.
- Drift Away's 50%-rate offline model is simpler than AD's full simulation and is fine for a 72-tile game; the transferable lesson from AD is not "simulate more accurately" but "**expose the setting and let the player skip/verify**."

### Gaps
- The Melvor Idle wiki page on Offline Progression returned **HTTP 403** and could not be fetched, so I have no verified figures for Melvor's offline cap (commonly cited as a fixed hour cap, but I could not confirm it — treat any specific number as unverified).
- No A/B or instrumented evidence that a "next goal" nudge in a welcome-back modal measurably improves retention. All support for it is design-reasoning, not data.

---

## Q3. Which QoL features do idle players expect, and which cause complaints when missing?

### Takeaway
The QoL floor for an incremental game is: save export/import, mute/volume, number-format choice, a stats screen, bulk/automation actions, and clear affordability feedback. Save export/import is the single most load-bearing one for a localStorage-only browser game, because it is the player's only defence against losing everything — and Cookie Clicker's base64 string is the de-facto standard pattern.

### Cited Findings
- `[Strong]` Definitional framing: QoL covers "a very broad category of elements designed to make a game easier to play **without changing the gameplay itself**" — [Game Developer, Pursuing Playability Part 1 — Quality of Life](https://www.gamedeveloper.com/design/pursuing-playability-part-1----quality-of-life).
- `[Moderate]` **Cookie Clicker (Orteil)** is the reference implementation of no-backend save portability: Options → **Export Save** produces a **base64-encoded string** containing the full session state, which the player copies to a text file; **Import Save** pastes it back. The same strings transfer between the **browser and Steam versions**. Autosave runs **every 60 seconds** — [Cookie Clicker Wiki, Save](https://cookieclicker.fandom.com/wiki/Save).
- `[Anecdotal]` Players request **manual save/load for web versions specifically because browsers can block or clear automatic saving** — i.e. export/import is treated as a correctness feature, not a luxury — surfaced across incremental-game community QoL discussion ([itch.io](https://itch.io/post/1927797), [itch.io](https://itch.io/post/6432309)).
- `[Moderate]` **Number notation is an expected setting.** Antimatter Dimensions' own community guidance is that players should "change the notation to scientific in the settings," because the default named-prefix notation becomes unreadable once values pass ~e10 — [Antimatter Dimensions Wiki, Guide](https://antimatter-dimensions.fandom.com/wiki/Guide).
- `[Anecdotal]` Recurring explicit QoL asks from incremental-game players, compiled from community threads: **buy multiple / buy all buttons**, **autobuyers**, **mute the game**, a **pause menu**, a **replay/restart button**, **sorting**, **hotkeys**, **stat screens**, **showing totals alongside multipliers** (so players don't have to do the arithmetic), and **cancelling an action without losing resources** — [itch.io QoL requests](https://itch.io/t/3389312/quality-of-life-requests); [itch.io](https://itch.io/post/9130550); [itch.io](https://itch.io/post/15791015); [bicubic.itch.io devlog](https://bicubic.itch.io/cyclo/devlog); [Evil Incremental v0.2 devlog](https://thomasporta.itch.io/evil-incremental/devlog/503211/evil-incremental-version-02).
- `[Anecdotal]` Grid/board-specific QoL that maps directly onto a hex grid: **scroll-wheel pan and zoom**, **colour shading to show valid placement spots**, and **red text when you can't afford something** — [itch.io feedback](https://itch.io/post/1603364); [itch.io QoL requests](https://itch.io/t/3389312/quality-of-life-requests).
- `[Anecdotal]` Accessibility and hotkeys are grouped together with QoL in changelogs by incremental devs themselves ("bug fixes and quality of life / accessibility features, including hotkey functionality") — [rodakdev, Time Lord's Legacy comments](https://rodakdev.itch.io/time-lords-legacy/comments).
- `[Strong]` **Web Storage (localStorage/sessionStorage) is capped at 10 MiB maximum on all browsers** — [Microsoft Edge Developer Docs, Store data on the device](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/offline).

### Inferences
- For Drift Away the ranked QoL gaps, by risk of causing an actual complaint, are: **(1) save export/import** (data loss is unrecoverable and unforgiveable), **(2) settings for sound/volume** (players ask for "mute" in nearly every thread), **(3) a stats screen** (the achievements system already tracks lifetime production — surfacing it is nearly free), **(4) number formatting** (only matters if prestige pushes values past ~1e6; if Drift Away's numbers stay small this is low priority — a genuine scope saving).
- "Buy multiple / autobuyers" mostly doesn't apply: Drift Away has 72 one-time unlocks and 3 levels per tile, not repeated purchases. The analogous QoL is **"level up all affordable tiles"** or at least showing which tiles are affordable right now without clicking each one.
- The "red text when unaffordable" and "colour-shade valid spots" asks translate directly to: tint each hex by state (affordable / not yet affordable / locked by adjacency) on the 3D board itself, so the player never has to open a panel to learn they can't act.
- Achievements granting currently-unused "gold" is a live complaint risk in its own right: community threads consistently penalise unclear information displays, and an earned currency that does nothing reads as broken rather than as "coming soon."

### Gaps
- No quantitative data on which QoL feature correlates with retention; all evidence here is stated player preference, not measured behaviour.
- I found no systematic survey (e.g. a well-upvoted r/incremental_games "QoL checklist" thread) — Reddit was not accessible to the search tool in this session, so community evidence is drawn from itch.io and Steam discussions instead. This is a real coverage limitation: itch.io commenters skew toward small/early games.

---

## Q4. Lightweight sharing/social with no backend

### Takeaway
The only sharing pattern I can evidence for a backendless browser game is the **encoded save/share string** (Cookie Clicker's base64 export), which doubles as backup, cross-device transfer, and a thing players paste to each other. I found **no reliable evidence** on whether any of these features affect retention.

### Cited Findings
- `[Moderate]` Cookie Clicker's base64 export string is used by players both as a backup and to move progress between the browser and Steam builds — the string *is* the transport, with no server involved — [Cookie Clicker Wiki, Save](https://cookieclicker.fandom.com/wiki/Save).
- `[Anecdotal]` Players do in fact share save strings socially — the Cookie Clicker Wiki hosts a **"post your save"** community thread — [Cookie Clicker Wiki forum, post your save](https://cookieclicker.fandom.com/f/p/2083722903945542134/r/2338048016646470540).
- `[Anecdotal]` Third-party tooling grows around exported save strings (e.g. community save editors/calculators that parse the exported string), which is both an ecosystem benefit and a tamper caveat — [Cookie Clicker Save Editor](https://cookieclickercalc.com/editor).
- `[Strong]` Zagal, Björk & Lewis classify **social-capital-based dark patterns** — mechanics that pressure players to recruit friends or compete with peers to advance — as a distinct category of unethical design — [Zagal, Björk & Lewis, "Dark Patterns in the Design of Games", FDG 2013](https://core.ac.uk/reader/301007767).

### Inferences
- The cheapest sharing feature for Drift Away is **the same export string, presented twice**: once as "Backup save" (safety framing) and once as "Copy my raft code" (social framing). One implementation, two jobs.
- A screenshot/"my raft" image is nearly free given Three.js: `renderer.domElement.toDataURL()` on a frame rendered with `preserveDrawingBuffer` (or a one-off render-to-canvas) produces a downloadable PNG with no backend. Compositing a small caption (zone, tiles unlocked, prestige count) onto a 2D canvas before download is a handful of lines. I could not find a source showing this specific technique in a shipped idle game, so treat the *retention* benefit as unevidenced — the *implementability* is certain.
- A static leaderboard requires either a backend or a manual, dev-curated list in the repo. The curated-list version (players send a save code, the dev pastes a name + number into a JSON file) is honest and backendless, but it is ongoing manual work for a solo dev — likely not worth it.
- Seed-based challenges are a poor fit for Drift Away as described: the board is a fixed 6x6 grid per zone with fixed tile types, so there is no randomness for a seed to control. A "challenge modifier" (e.g. no boosters, or one-resource-only) would be a *design* feature, not a sharing feature.
- Because there is no backend, no dark-pattern social pressure is even possible here — the social-capital risk from Zagal et al. is structurally ruled out, which is a genuine advantage worth preserving.

### Gaps
- **No evidence found either way** on whether share codes, exported screenshots, or static leaderboards affect retention in idle games. I looked and found nothing measurable; do not claim a retention benefit.
- No source found for seed-based challenge sharing in incremental games specifically.

---

## Q5. Ethical guardrails and accessibility basics

### Takeaway
The academic frame (Zagal et al. 2013) splits dark patterns into temporal, monetary, and social-capital categories — with no monetization and no social layer, Drift Away's only real exposure is **temporal**, i.e. artificial waiting and grind. On accessibility, the highest-leverage single rule is "never convey information by colour alone," followed by honouring `prefers-reduced-motion` and providing a text-size/contrast floor.

### Cited Findings
- `[Strong]` Dark game design patterns are defined as elements "whose purpose can be argued as against a player's best interests or unethical," organised into **temporal**, **monetary**, and **social-capital-based** categories. Temporal patterns manipulate the time players must invest to progress, often leading to frustration and incentivising paying to skip — [Zagal, Björk & Lewis, "Dark Patterns in the Design of Games", FDG 2013](https://core.ac.uk/reader/301007767); summarised at [Deceptive Design](https://deceptive.design/articles/dark-patterns-in-the-design-of-games/).
- `[Moderate]` The taxonomy has been critiqued — "Against Dark Game Design Patterns" argues the framing is contested — so treat "dark pattern" as a design heuristic, not a settled verdict — [Against "Dark Game Design Patterns" (ResearchGate record)](https://www.researchgate.net/publication/339054289_Against_Dark_Game_Design_Patterns).
- `[Moderate]` Later work extends the analysis to mobile games specifically — [Level Up or Game Over: Exploring How Dark Patterns Shape Mobile Games, MUM '24, ACM](https://dl.acm.org/doi/10.1145/3701571.3701604).
- `[Moderate]` **"Never conveying information through color alone is the single most impactful guideline for colorblind players."** Item rarities, danger states, interactive vs non-interactive elements and any state communicated by colour need a redundant non-colour indicator (shape, icon, label, pattern) — [Can I Play That?, Color-Blindness Accessibility Guide (2020)](https://caniplaythat.com/2020/01/29/color-blindness-accessibility-guide/).
- `[Moderate]` Visual accessibility floor for games: **minimum 4.5:1 text contrast**, **UI scalable to 200%**, never colour alone, provide a colourblind mode, respect `prefers-reduced-motion`, offer a high-contrast mode — [Abratabia, Game Accessibility Guidelines and Standards: WCAG, XAGs, and Legal Requirements](https://www.abratabia.com/game-accessibility/accessibility-guidelines.php).
- `[Moderate]` [gameaccessibilityguidelines.com](https://gameaccessibilityguidelines.com) is a community-maintained checklist tiered as **basic / intermediate / advanced**, described as more practical and less formal than WCAG — a good starting point for developers new to accessibility. Colourblind mode is classified at the **intermediate** tier — [Abratabia](https://www.abratabia.com/game-accessibility/accessibility-guidelines.php); [Can I Play That? (2020)](https://caniplaythat.com/2020/01/29/color-blindness-accessibility-guide/).
- `[Strong]` `prefers-reduced-motion` is a CSS media feature for detecting a user's OS-level request for reduced motion; the standard pattern is to disable or drastically shorten non-essential animation inside `@media (prefers-reduced-motion: reduce)` — [CSS-Tricks Almanac, prefers-reduced-motion](https://css-tricks.com/almanac/rules/m/media/prefers-reduced-motion/).
- `[Moderate]` Animations and camera shake can trigger motion sickness or discomfort; many games let players turn them off completely. A shipped example set of options is Roblox's: **reduced motion, preferred text size, preferred transparency** exposed in both platform and in-game settings — [Roblox Creator Hub, Accessibility guidelines](https://create.roblox.com/docs/production/publishing/accessibility).
- `[Weak]` Motion sickness / discomfort and their mitigation are a standard part of game accessibility testing practice — [TestDevLab, Video Game Accessibility](https://www.testdevlab.com/blog/video-game-accessibility-testing).

### Inferences
- Drift Away's temporal exposure is concentrated in two places: the **wait before the first unlock** (front-loaded grind) and the **8-hour offline cap** (a soft "play by appointment" pull). Both are fine ethically *if disclosed*; the cap becomes a dark pattern only if it is hidden so the player must check in to avoid unseen loss. Showing "12h away, 8h counted (cap)" is the honest version.
- The unused achievement "gold" is the other ethical soft spot: granting a currency that cannot be spent is a mild dangling-carrot. Either give it a use (cosmetics is the obvious no-power-creep answer) or stop granting it.
- Three.js-specific accessibility consequence: a 3D ocean scene with wave motion, drifting clouds, and pulsing unlock markers is exactly the class of ambient motion `prefers-reduced-motion` exists for. The reduced-motion path should calm the water, stop cloud drift, and replace the *pulsing* marker with a *static* one — note that killing the pulse removes an information channel, so the static marker must still be visually distinct (ring/outline), which is also the colour-blind fix.
- Resource colours (fish / kelp / driftwood / crops) are near-certainly the colour-alone risk in Drift Away. Each resource needs a distinct icon or glyph shown wherever its colour is shown.

### Gaps
- No idle-game-specific accessibility study or audit found.
- No source quantifying how many players use reduced-motion settings in browser games.

---

## Q6. Web-specific considerations: background tabs, PWA, localStorage loss

### Takeaway
Do not trust timers in a background tab — Chrome clamps background `setTimeout` to ~1 second and degrades further after minutes of inactivity — so the correct architecture is **timestamp-delta catch-up on every tick** (the same code path as offline progress), which makes background throttling a non-issue by construction. Separately, localStorage can be evicted under storage pressure by an LRU policy **even when you are under quota**, so export/import is not optional for a save-anywhere hobby game.

### Cited Findings
- `[Moderate]` Chrome clamps `setTimeout` in background tabs to approximately **1 second** — [Nolan Lawson, Why do browsers throttle JavaScript timers? (31 Aug 2025)](https://nolanlawson.com/2025/08/31/why-do-browsers-throttle-javascript-timers/).
- `[Moderate]` Baseline (foreground) clamping for comparison: `setTimeout(0)` is clamped to ~**4 ms** in Chrome/Firefox after 5+ nested calls, and Safari applies heavier clamping at ~**26.73 ms** — [Nolan Lawson (2025)](https://nolanlawson.com/2025/08/31/why-do-browsers-throttle-javascript-timers/).
- `[Weak]` Further degradation is reported: timers executing **once per minute after ~5 minutes** without activity in a background tab, and animations becoming choppy or "re-animating" on return — [WebTech Timeline, Browser Tab Throttling](https://www.getintechs.com/blog/inactive-tab-throttling); [Pontis Technology, Why setInterval drifts in inactive tabs](https://pontistechnology.com/learn-why-setinterval-javascript-breaks-when-throttled/). **Caveat:** these are content-marketing blogs; the exact 5-minute/1-minute numbers should be verified against Chrome's own intensive-throttling documentation before being relied on.
- `[Weak]` Web Workers are commonly recommended as a throttling workaround, on the claim that Chrome throttles `setInterval` callbacks on the **main thread** only — [Adithya Viswamithiran, Overcoming browser throttling of setInterval executions (Medium)](https://medium.com/@adithyaviswam/overcoming-browser-throttling-of-setinterval-executions-45387853a826). **Caveat:** this is a single Medium post and browsers have since tightened worker throttling; I would not architect around it.
- `[Moderate]` Faster foreground scheduling alternatives to `setTimeout`, measured: `scheduler.postTask()` at 0.00–0.01 ms latency, `MessageChannel.postMessage()` at 0.02–0.52 ms — [Nolan Lawson (2025)](https://nolanlawson.com/2025/08/31/why-do-browsers-throttle-javascript-timers/). (Relevant only to render-loop smoothness, not to idle accrual.)
- `[Moderate]` The idle-game-correct pattern is explicit in the welcome-back literature: compute progress from **`Date.now()` deltas**, not from counted ticks — `gained = Math.floor((now - last_saved) / tick_ms) * rate` — [Edvins Antonovs, Rebuilding the "Welcome Back" mechanic](https://edvins.io/rebuilding-the-welcome-back-mechanic-from-idle-games-in-react).
- `[Strong]` Browser storage eviction is **Least Recently Used**: under storage pressure the browser evicts data from the least-recently-used origin, and **"your app's data can disappear even if you're under quota"** — [MDN, Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria); [Microsoft Edge Developer Docs, Store data on the device](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/offline).
- `[Strong]` `navigator.storage.persist()` marks an origin's storage as persistent, after which **it can only be cleared by the user** — recommended for apps storing critical data — [web.dev, Persistent storage](https://web.dev/articles/persistent-storage); [MDN, Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
- `[Strong]` Web Storage is capped at **10 MiB** across browsers — ample for a 72-tile save — [Microsoft Edge Developer Docs](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/offline).
- `[Moderate]` Cookie Clicker autosaves **every 60 seconds** to browser storage as its baseline durability strategy — [Cookie Clicker Wiki, Save](https://cookieclicker.fandom.com/wiki/Save).

### Inferences
- If Drift Away currently accrues resources by incrementing on each animation frame or interval tick, a backgrounded tab silently under-produces and the numbers will disagree with the player's expectation. Switching the accrual to `delta = now - lastTick` (clamped to the offline rules when delta is large) makes background throttling, laptop sleep, and the offline-progress path all the *same* code — a net deletion, not an addition.
- `document.visibilitychange` is the natural hook for a "force a save + stamp `lastSaved`" call, which tightens the worst-case data-loss window well below a 60-second autosave interval.
- `navigator.storage.persist()` is a ~3-line addition (it returns a promise resolving to a boolean; browsers may grant it silently for installed/engaged sites). It reduces but does **not** eliminate loss risk — a user clearing site data, using a private window, or switching browsers still loses everything. That residual is exactly why export/import is the load-bearing mitigation, not persist().
- PWA/installability for Drift Away is a small manifest + service worker (offline cache of static assets). The retention argument is a home-screen/desktop icon as a re-entry point; the cost is a service-worker cache-busting discipline the dev must then maintain on every deploy. For a static-hosted hobby game this is a real ongoing tax — I'd rate it lower priority than export/import and the FTUE fixes.

### Gaps
- I did not verify Chrome's exact **intensive throttling** rules against Chrome's own developer documentation (the specific "5 minutes → once per minute" thresholds come only from marketing blogs). The ~1s background clamp is the only well-sourced figure.
- No source found on whether `navigator.storage.persist()` protects **localStorage** specifically as opposed to IndexedDB/Cache API. MDN describes the storage unit at origin granularity, but I could not confirm localStorage coverage explicitly — verify before promising the player their save is protected.
- No data found on PWA installation rates or their retention effect for browser games.

---

## Idea Candidates for Drift Away

Effort key: **S** = an evening; **M** = a weekend; **L** = multiple sessions. Every item is vanilla JS / client-only, no backend, no monetization.

### First 10 minutes

1. **Start with one neighbour already discovered and marked.** (S) — The very first adjacent tile is visible and pulsing from t=0, with its cost shown on the board. *Why:* provides the "glimpse of the future" and a concrete goal within seconds instead of an empty wait; the onboarding-bundle formula wants a visible target before it wants an explanation ([Yu-kai Chou](https://yukaichou.com/gamification-study/game-design-techniques-the-onboarding-bundle/)).

2. **Make the first unlock land inside ~60–90 seconds.** (S) — Retune only the first 2–3 unlock costs downward; leave the rest of the curve alone. *Why:* the quick win must land in the first 90 seconds to count as one, and idle progression curves (~1.1x gain / ~1.15x cost) assume early steps are cheap ([Chou](https://yukaichou.com/gamification-study/game-design-techniques-the-onboarding-bundle/); [Guan](https://ericguan.substack.com/p/idle-game-design-principles)).

3. **Just-in-time teaching inside the existing tile panel.** (S) — First time a *booster* tile is opened, the panel shows one sentence explaining raft-wide bonuses; first time an adjacency-blocked tile is opened, one sentence explains adjacency. No tutorial screens, no modals. *Why:* "let them play first, explain later," and progressive system reveal at the moment of unlock is the documented idle-game approach ([Chou](https://yukaichou.com/gamification-study/game-design-techniques-the-onboarding-bundle/); [Apptrove](https://apptrove.com/how-to-make-an-idle-game/)).

4. **Board-level affordability state: tint every discovered tile affordable / not-yet / adjacency-locked.** (M) — Colour *plus* a glyph or outline, never colour alone. *Why:* players explicitly ask for "red text when you can't afford it" and shaded valid-placement highlighting as core QoL; it also removes click-every-tile-to-check busywork ([itch.io](https://itch.io/post/1603364); [itch.io QoL requests](https://itch.io/t/3389312/quality-of-life-requests)) and satisfies the never-colour-alone rule ([Can I Play That?, 2020](https://caniplaythat.com/2020/01/29/color-blindness-accessibility-guide/)).

### Returning player

5. **Add a "Next goal" line to the Welcome Back modal.** (S) — Below the offline summary: *"Next: Kelp Bed — 42 / 60 driftwood"* with a progress bar, and a button that focuses the camera on that tile. *Why:* the return modal is the highest-attention moment and currently only looks backwards; players consistently complain about unclear "what now" information ([Edvins Antonovs](https://edvins.io/rebuilding-the-welcome-back-mechanic-from-idle-games-in-react); [itch.io QoL requests](https://itch.io/t/3389312/quality-of-life-requests)).

6. **State the offline cap honestly in the modal.** (S) — *"Away 14h 20m — 8h counted (offline cap)"* plus one line naming the 50% rate. *Why:* the cap is a legitimate return incentive but becomes a temporal dark pattern when it's invisible and the player just sees smaller-than-expected numbers ([Zagal, Björk & Lewis, FDG 2013](https://core.ac.uk/reader/301007767); [The Mind Studios](https://games.themindstudios.com/post/idle-clicker-game-design-and-monetization/)).

7. **Persistent "next unlock" tracker in the HUD.** (M) — A small always-visible strip showing the cheapest reachable unlock and live progress toward it, dismissible. *Why:* extends the welcome-back nudge across the whole session so the player is never between goals; directly addresses the "never feel lost" objective.

8. **Differentiate the two zones' clocks.** (M) — Give Frozen Reach resources a slower, longer-horizon accrual/cap than Home Waters. *Why:* multi-clock design gives both the 15-minute checker and the once-a-day player something ready when they arrive, without forcing one cadence ([Guan](https://ericguan.substack.com/p/idle-game-design-principles)).

9. **Spend the achievement gold on cosmetics.** (M–L) — Raft decorations, water/sky palettes, a lantern at night. No production bonuses. *Why:* an earned currency that does nothing is a dangling carrot and reads as broken; cosmetics give a long-tail goal after prestige with zero balance risk and zero monetization.

### Quality of life

10. **Save export / import as a base64 string, plus `navigator.storage.persist()`.** (S) — Two textarea prompts in the menu, exactly Cookie Clicker's pattern, plus the one-line persist request. Surface the same string a second time as "Copy my raft code" for sharing. *Why:* localStorage is evicted LRU **even under quota**, so this is the only real defence against total loss; it's also the de-facto standard players expect and the only backendless sharing mechanism with evidence behind it ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria); [web.dev](https://web.dev/articles/persistent-storage); [Cookie Clicker Wiki](https://cookieclicker.fandom.com/wiki/Save)).

11. **Timestamp-delta accrual + save on `visibilitychange`.** (S) — Replace per-tick increments with `delta = now - lastTick`, reusing the offline-progress path; flush the save when the tab hides. *Why:* Chrome clamps background `setTimeout` to ~1s and degrades further, so tick-counted accrual silently under-produces in a background tab; delta-based accrual makes background, sleep, and offline one code path — a deletion, not an addition ([Nolan Lawson, 2025](https://nolanlawson.com/2025/08/31/why-do-browsers-throttle-javascript-timers/); [Edvins Antonovs](https://edvins.io/rebuilding-the-welcome-back-mechanic-from-idle-games-in-react)).

12. **A minimal Settings panel: volume/mute, reduced motion, and resource glyphs.** (M) — Mute is the single most-requested QoL item in community threads; reduced motion should calm the waves, stop cloud drift, and swap the pulsing unlock marker for a static ring (defaulting from `prefers-reduced-motion`); each resource gets a distinct icon shown wherever its colour appears. *Why:* mute and accessibility toggles are baseline expectations, and an ambient 3D ocean is precisely the motion class reduced-motion exists for ([itch.io QoL requests](https://itch.io/t/3389312/quality-of-life-requests); [CSS-Tricks](https://css-tricks.com/almanac/rules/m/media/prefers-reduced-motion/); [Roblox](https://create.roblox.com/docs/production/publishing/accessibility); [Can I Play That?, 2020](https://caniplaythat.com/2020/01/29/color-blindness-accessibility-guide/)).

13. **Stats screen built from data the achievement system already tracks.** (M) — Lifetime production per resource, current per-second rates with the booster contribution broken out, tiles unlocked, time played, prestige count. *Why:* stat screens and "show the total alongside the multiplier so I don't have to do the maths" are recurring explicit player requests ([itch.io QoL requests](https://itch.io/t/3389312/quality-of-life-requests); [itch.io](https://itch.io/post/9130550)).

14. **"Save my raft" screenshot button.** (S) — Render the current view to a canvas, composite a caption line (zone, tiles unlocked, prestige count), download as PNG. *Why:* trivially implementable with Three.js and no backend, and it gives the cozy aesthetic something to travel on. **Caveat:** I found **no evidence** that screenshot sharing affects retention — build it because it's cheap and on-theme, not because it's proven.

**Deliberately not recommended:** seed-based challenges (the board is fixed — nothing for a seed to vary), a static/curated leaderboard (ongoing manual dev labour for a solo maintainer), buy-all/autobuyer QoL (Drift Away has one-time unlocks, not repeated purchases), and scientific-notation settings unless prestige actually pushes values past ~1e6.
