# Land every unlock, then reopen prestige

Drift Away's problem is not the progression curve — it is that the game never *answers back*. Five research files converge on the same diagnosis from four different angles: the two buttons in the game (Unlock, Level Up) have no impact moment, the return after being away is a receipt instead of a decision, the achievement gold is a currency nothing reads, and prestige is gated behind maxing all 72 tiles — a completion gate that every shipped idle game in the research deliberately avoids. The highest-leverage work splits cleanly into two batches: a feel-and-legibility pass that adds **zero new save state** and touches every interaction in the game, and two structural fixes (give gold a shop, make prestige repeatable with a sublinear token curve) that together unlock every long-game idea downstream. One caveat governs everything below: **no retention telemetry for idle games exists in any source reached** — the claim "X improves retention" is, in every single case, structural reasoning from shipped designs rather than measured lift. The strongest counter-advice in the whole corpus is about restraint: Islanders shipped by *deleting* its day-cycle system, and Townscaper sustained a hit on a three-verb list ([Game World Observer](https://gameworldobserver.com/2019/06/14/islanders); [How Townscaper Works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)). Ship four things well, not fourteen thinly.

---

## What to build first

Four work batches, in order. Nothing here requires a backend, a dependency, or a save migration until batch 3.

**Batch 0 — insurance (do this before any feature).** Save export/import as a base64 string in a textarea, exactly Cookie Clicker's pattern, plus a one-line `navigator.storage.persist()` call. Then switch resource accrual from per-tick increments to `delta = now - lastTick`, reusing the offline-progress path, and flush a save on `visibilitychange`. This is not a feature — browser storage is evicted **Least Recently Used, and "your app's data can disappear even if you're under quota"** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)), and Chrome clamps background `setTimeout` to **~1 second** with further degradation after minutes idle ([Nolan Lawson, 2025](https://nolanlawson.com/2025/08/31/why-do-browsers-throttle-javascript-timers/)). The delta switch is a net *deletion*: background throttling, laptop sleep, and offline progress become one code path.

**Batch 1 — make the two buttons land, and make the board legible.** Hit-stop of ~50–80 ms on the frame an unlock confirms (freeze the production tick and camera), constant-volume squash-and-stretch on the hex as it rises, ring ripple, a few pixels of screen kick that settles fast. Thread one `intensity` value through it so unlock #1, #30 and #72 differ. Add a live per-resource rate readout with booster attribution ("fish 12.4/s, +18% boosters"), odometer-tweened counters (~300 ms ease), K/M/B suffixes at display time, and a "next unlock in 4m 12s" ETA. Tint every discovered hex by state — affordable / not yet / adjacency-locked — with a glyph or outline as well as colour. **No new save fields. Every one of these is seen on every interaction.**

**Batch 2 — fix the return, fix the first 90 seconds.** Rewrite the welcome-back moment so it ends in a decision, not a number: *"Away 14h 20m — 8h counted (offline cap, 50% rate). +2,400 kelp. Frozen Reach (3,2) is now unlockable → [focus camera]."* Keep that forward-pointing line permanently in the HUD as a next-unlock tracker. Then retune only the first two or three unlock costs so the first unlock lands inside ~60–90 seconds, start the player with one neighbour already discovered and pulsing, and put one sentence of just-in-time explanation in the existing tile panel the first time a booster or an adjacency-blocked tile is opened. No tutorial screens.

**Batch 3 — the two structural bugs.** Give gold a shop (quality-of-life perks + cosmetics + an unlimited escalating-cost "ballast" overflow entry, all three shipped together). Soften the prestige gate to a modest threshold available at any time, and bend the token formula from linear `lifetime/1000` to sublinear. These two changes are prerequisites for roughly half the remaining idea catalogue.

---

## The ten changes that matter, ranked

Effort: **S** = one sitting; **M** = a weekend-sized chunk; **L** = multi-session. Evidence: **Shipped** = documented in a released game; **Craft** = design-community consensus from talks and postmortems; **Reasoned** = inference from the notes, no direct source.

| # | Change | Why it ranks here | Evidence | Effort |
|---|---|---|---|---|
| 1 | **Save export/import + `persist()` + delta-time accrual** | Unrecoverable data loss is the only failure here that cannot be patched later. LRU eviction happens under quota. | Shipped ([Cookie Clicker Wiki](https://cookieclicker.fandom.com/wiki/Save)) + platform docs ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)) | S |
| 2 | **Unlock/Level-Up impact pass + escalation ladder** | The game has two buttons; all perceived quality lives in the polish layer because there is no real-time control layer to get wrong. | Craft (Swink, Nijman, Jonasson & Purho, via [Egmatic](https://egmatic.com/blog/how-to-make-your-game-feel-good)) | S |
| 3 | **Rate HUD with booster attribution + odometer counters + ETA bar** | Booster tiles currently have *invisible* effects — the single likeliest reason they feel worse than producers. A per-minute/hour readout is named as a core motivator. | Craft ([Machinations](https://machinations.io/articles/idle-games-and-how-to-design-them)) | S |
| 4 | **Welcome-back as a decision + honest cap disclosure** | The return is the highest-attention moment and currently only looks backwards. An undisclosed cap reads as a bug or a dark pattern; disclosed, it is a legitimate rhythm. | Craft + ethics frame ([Zagal, Björk & Lewis, FDG 2013](https://core.ac.uk/reader/301007767)) | S |
| 5 | **Soften the prestige gate + sublinear token curve** | Every documented game lets you reset whenever and lets the math suggest when. A 72-tile completion gate means one correct moment, no decision, and run 2 is the identical marathon. | Shipped ([Cookie Clicker cube root](https://cookieclicker.wiki.gg/wiki/Ascension); [Egg Inc slows gain to encourage frequent prestiging](https://egg-inc.fandom.com/wiki/Prestige)) | S |
| 6 | **Gold shop: QoL perks + cosmetics + ballast overflow** | A currency nothing reads teaches players that achievements are decorative. Cosmetics are the only infinite sink a solo dev can afford — no balance pass, ever. | Shipped ([Cookie Clicker heavenly upgrades, milk flavors, Season Switcher](https://cookieclicker.wiki.gg/wiki/Ascension)) | S–M |
| 7 | **FTUE: pre-discovered neighbour, cheap first unlocks, in-panel teaching** | The ~90-second quick-win window is currently spent watching a counter with no visible goal, because undiscovered tiles are hidden. | Craft ([Yu-kai Chou](https://yukaichou.com/gamification-study/game-design-techniques-the-onboarding-bundle/)) | S |
| 8 | **Ambient life layer + Frozen Reach reveal ceremony** | The fog reveal is the game's biggest untapped emotional beat and costs presentation only. Ambient life is what turns a hex grid into a raft. | Shipped precedent ([Kittens seasons](https://wiki.kittensgame.com/en/general-information/game-mechanics); [Egg Inc ~154 drones/hr](https://egg-inc.fandom.com/wiki/Drones)) + [InstancedMesh docs](https://threejs.org/docs/pages/InstancedMesh.html) | S–M |
| 9 | **Achievements feed one global stat ("Tide"), expanded to ~40–60 tiered entries** | The indirection is the trick: put the bonus on the *count*, not on each achievement, so adding one later never needs a balance pass. | Shipped ([Cookie Clicker: 622 normal + 17 shadow, milk on count](https://cookieclicker.wiki.gg/wiki/Achievements)) | M |
| 10 | **Drifting flotsam collectible, rewards priced in minutes-of-your-own-rate** | The genre's canonical active hook, and structurally impossible to make punitive: missing it costs nothing. | Shipped ([golden cookies: 300–900 s spawn, 13 s window, Lucky capped at 15 min CpS](https://cookieclicker.wiki.gg/wiki/Golden_Cookie)) | M |

**One sizing note on #5, the change three separate notes independently call the highest-leverage item.** Cookie Clicker's prestige is a **cube root of lifetime cookies**, so an 8× longer run yields only 2× the prestige ([Cookie Clicker Wiki](https://cookieclicker.wiki.gg/wiki/Ascension)). Egg, Inc. slows Soul Egg gain as run earnings rise, explicitly "encouraging frequent prestiging over waiting" ([Egg Inc Wiki](https://egg-inc.fandom.com/wiki/Prestige)). Across shipped games the growth required to *double* prestige currency ranges from **roughly 4× in Realm Grinder to 128× in Egg, Inc.** ([Kongregate, Math of Idle Games III](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-iii)). Drift Away's linear `lifetime/1000` on a lifetime stat is the most generous shape on that list, and it is paired with the strictest possible gate. That combination rewards exactly the behaviour those games designed against. A sublinear exponent plus an early, always-available reset is two formulas and an unlock condition.

---

## The two buttons carry all the perceived quality, because there is no control layer to blame

Game-feel literature is written for action games, and the instinct is to assume it doesn't transfer. The opposite is true here. Swink's three-part model — real-time control, simulated space, and polish — has one layer that barely exists in Drift Away: there is no avatar, no latency, nothing to make responsive ([Egmatic](https://egmatic.com/blog/how-to-make-your-game-feel-good)). That means essentially **all** perceived quality lives in the polish layer, and a game with two buttons has only two moments to make excellent. That is a far cheaper polish budget than a platformer, and it is the cheapest quality win available.

The concrete techniques the sources rate highest all apply unchanged to "player pressed Unlock": **hit-stop of roughly 40–80 ms on a heavy confirm**, constant-volume squash-and-stretch ("wider means shorter", which the eye reads as weight), easing curves because "linear motion looks mechanical and dead", a screen kick of a few pixels that settles fast, and sound — which "carries half the weight" of impact feedback ([Egmatic](https://egmatic.com/blog/how-to-make-your-game-feel-good), summarising Swink 2008, Jonasson & Purho's [*Juice It or Lose It*](https://www.are.na/block/15185843), and Nijman's *Art of Screenshake*, [reimplemented as a per-effect toggle demo](https://dkliao.itch.io/the-art-of-screenshake-recreation)). Squash-and-stretch maps directly onto a hex rising out of water, and Three.js gives it to you through `mesh.scale`. Since the game already synthesises audio, pitch randomisation of ±2–5% per popup and a rising chord across successive level-ups is effectively free.

The part most hobby projects miss is that Nijman's list of thirty tricks is **an intensity ladder, not thirty features**. Threading a single `intensity` parameter — scaled by tile index, zone, or level — through the existing burst, sound and shake makes the 1st, 30th and 72nd unlock feel measurably different for the cost of one variable. The juice talks' own method is incremental layering on a working prototype with each effect independently toggleable, which is exactly how a solo dev should approach this.

The hard constraint from the same literature: **"Polish cannot save input lag; it only makes a laggy game louder."** Polish is a multiplier on a loop that already works. The owner reports the loop works and the game looks good — that is precisely the condition under which this investment pays. War Clicks' own postmortem lists "graphics and UI DO matter" and compounding early ratings among its top lessons, and attributes heavy early churn to launch quality rather than to design ([Game Developer](https://www.gamedeveloper.com/business/from-a-prototype-to-one-of-the-biggest-idle-games-in-3-years-postmortem)).

---

## The return, the gold, and the prestige gate are three versions of the same bug: the game never gives the player a decision

The sharpest single rule in the offline-design material is that **the returning reward should open a choice, not merely produce a larger number to acknowledge** — "You earned 48,000 gold" is less useful than showing what that gold now unlocks ([Geek Extreme](https://www.geekextreme.com/idle-games-offline-progression-math/); [Kowalski](https://lkowalskil.github.io/offline-idle-dungeon-game-android.html)). Drift Away accrues offline progress and then hands the player four counters. The fix is pure UI on state that already exists: elapsed time, what accumulated, what is *now affordable*, and a button that focuses the camera on it. Disclose the cap in the same breath — *"away 14h 20m, 8h counted"* — because an undisclosed cap produces a silent, unexplained shortfall, which is the one framing that turns a legitimate pacing choice into a temporal dark pattern under Zagal et al.'s taxonomy ([FDG 2013](https://core.ac.uk/reader/301007767)).

The 8-hour / 50% numbers themselves are conservative but conventional, sitting at the short end of the verified range (Melvor Idle caps at **18 hours**, per a [Steam community thread](https://steamcommunity.com/app/1267910/discussions/0/4665175132461478006/)). With no monetization and no notifications, the "encourage daily logins" rationale doesn't apply, so extending the cap — or selling extensions for gold — is a *reduction* of pressure, not an increase. That makes it the ethically clean gold sink.

A related cheap win: **run several clocks instead of one.** The design argument is to pace tasks so a check-in succeeds at some and misses others, with a worked example of resources capping at 20 minutes, 5 hours, and 2 days respectively — which lets a 15-minute checker and a once-a-day player each have an optimisation target ([Eric Guan, Idle Game Design Principles](https://ericguan.substack.com/p/idle-game-design-principles)). Drift Away has four resources already ticking at different absolute rates; surfacing per-resource "time to next unlock" turns one clock into four for free, and giving Frozen Reach resources a genuinely slower horizon does it structurally.

Gold is the second version of the same bug. Every documented idle game routes its secondary currency into one of three sink archetypes — permanent power, quality-of-life/automation, or an overflow dump — and usually all three. Cookie Clicker sells heavenly upgrades, **permanent upgrade slots** (selling agency rather than a multiplier), and cosmetic/behavioural toggles for the same currency ([Cookie Clicker Wiki](https://cookieclicker.wiki.gg/wiki/Ascension)). Clicker Heroes ships Morgulis explicitly as a dump so surplus is never wasted ([Clicker Heroes blog](https://blog.clickerheroes.com/clicker-heroes-ancient-souls-master-the-ultimate-currency/), weak source but a well-attested pattern). The critical constraint for Drift Away is that **tokens and gold must do different jobs** — if gold also buys flat production, the two screens become the same screen. Tokens = raw multipliers; gold = comfort, agency, and cosmetics. Ship the overflow entry in the same change as the shop, not after, so gold never becomes a dead counter a second time.

Achievements are where the two meet. The mechanism worth copying is **indirection**: Cookie Clicker ships **622 normal achievements plus 17 shadow achievements**, and it is the *count* that drives "milk", which upgrades then multiply against — shadow achievements deliberately don't feed it, which is the escape hatch for joke or unfair entries ([Cookie Clicker Wiki](https://cookieclicker.wiki.gg/wiki/Achievements)). For a solo dev this is dramatically cheaper than hand-balancing sixty individual bonuses, and adding an achievement later never requires a balance pass. The game's guidance to its own players — grab achievements *before* you reset, so you ascend faster — shows the system working as run-spanning power rather than as trophies ([Cookie Clicker FAQ](https://cookieclicker.wiki.gg/wiki/Frequently_Asked_Questions)). (The exact milk percentages could not be verified; treat the mechanism as confirmed, the numbers as not.)

Third version, and the one that decides whether anyone plays a second time: prestige. **Drift Away's upgrades are +10% production, so run 2 is run 1 at 1.1×.** The best formulation of what good reset layers do instead is that "every reset layer *recontextualises* the one beneath it instead of just multiplying its output" — in Antimatter Dimensions, Infinity Points buy upgrades that change what the base dimension-buying game *is*, so "the same eight dimensions you started with behave like different furniture in the same room" ([Wanderer](https://playwanderer.online/game-reviews/antimatter-dimensions)). The cheap recontextualisation levers already sitting in Drift Away's design: prestige upgrades that start you with N tiles pre-unlocked, **remove the adjacency requirement**, raise max tile level from 3 to 4, lift the offline cap, or automate unlocking. Automation is the best-evidenced of these — Antimatter Dimensions pays out its challenge rewards as **autobuyers and autobuyer interval upgrades**, making repeat runs shorter in wall-clock and in clicks rather than merely bigger ([AD Wiki](https://antimatterdimensions.wiki.gg/wiki/Normal_Challenges)). A 72-tile × 3-level manual click loop is the most obvious automation target in the game.

---

## Where the notes disagree, and what carries real risk

Four genuine conflicts and three risk flags, stated plainly.

**Day/night cycle: mechanical or purely cosmetic?** One note argues for a small mechanical bias (night favours fish, storms favour driftwood) on the grounds that Kittens Game's seasons work *because* they change catnip yields and are therefore worth looking at — seasons run **200 seconds each, with a 35% chance from Year 4 of being abnormally warm or cold** ([Kittens Game Wiki](https://wiki.kittensgame.com/en/general-information/game-mechanics)). Another note argues the opposite and cites Islanders, whose three-person team **cut its day-cycle system entirely** to simplify, with simplicity becoming "one of the core pillars of our philosophy" ([Game World Observer](https://gameworldobserver.com/2019/06/14/islanders)). **Resolution: ship it cosmetic first.** A colour ramp across sky, fog, light and water tint is a lerp on objects that already exist and carries zero balance risk; a production bias is a balance change to a live economy. If the cosmetic version gets ignored, add the bias later.

**Randomised/seeded tile layouts per run.** One note proposes shuffling which hexes are producers versus boosters, seeded per prestige, as the direct fix for "same run again". Another explicitly rejects seeds on the grounds that the board is fixed, so there is nothing for a seed to vary, and a third note's spatial proposals (offered hand of tile types, tile facing) deliberately *preserve* determinism by seeding from the slot index so layouts stay authored and balanced. **Resolution: don't.** Randomising the layout adds a save-migration burden, a completability-guarantee problem, and a balance surface that no cited source says pays off, and it fights the authored-layout assumption the rest of the game rests on. Get run-to-run variety from challenge modifiers and prestige-gated tile types instead — both reuse 100% of the existing simulation.

**Prestige at all, versus growth without a wipe.** The cozy-games note flags that a soft reset is the one idle convention that fights everything else the research supports: attachment in Animal Crossing scales with **time spent shaping the island** ([ACM CHI PLAY](https://dl.acm.org/doi/fullHtml/10.1145/3641237.3691689)), and Terra Nil's thesis is that the world-state itself is the reward ([Game Developer](https://www.gamedeveloper.com/design/why-a-recycling-mechanic-saved-terra-nil-s-climate-cleanup-mechanics)) — wiping the raft works against both. The counter-argument is that prestige already exists in Drift Away and is currently unreachable-then-pointless, so the choice is fixing it or removing it, not adding it. **Resolution: fix it, but keep cosmetics, the codex, and achievements reset-proof** — Realm Grinder deliberately carries trophies, upgrades, heritages, rubies and artifacts through its deeper reset ([Realm Grinder Wikia](https://realm-grinder.fandom.com/wiki/Reincarnation)). Authorship persists; the economy resets.

**Neighbour-scoped boosters versus reversible tile facing.** Both proposals aim at the same gap — the 6×6 hex grid currently offers order-of-unlock, which is a decision about *sequence*, not *arrangement*. Changing booster scope from raft-wide to neighbour-only is the deeper fix but is a balance change that invalidates existing saves. Tile facing (each tile has one outflow edge you can rotate freely, bonusing whichever neighbour it points at) is additive, reversible, self-explaining because the prop physically points somewhere, and costs **one integer per tile** in the save. Reversibility also keeps it cozy-safe under the Project Horseshoe "safety" pillar ([Designing for Coziness](https://www.gamedeveloper.com/design/designing-for-coziness)). **Resolution: facing, if either. Pick one, not both.**

**Three risk flags.** *(1)* Adjacency and spatial systems are idle-compatible — a 72-tile recompute on state change is trivial — but no postmortem exists for any idle game that *added* adjacency post-launch, so there is no evidence about how existing players react. *(2)* Complexity stacking is the documented killer for exactly this kind of game: Antimatter Dimensions' Automator "compounds rather than solves" its clarity problem, and retention "collapses when external knowledge becomes prerequisite rather than optional enrichment" ([Wanderer](https://playwanderer.online/game-reviews/antimatter-dimensions)). Every addition must be self-teaching from the tile panel; if it would need a wiki, it is wrong for this game. *(3)* Save-format cost is the hidden tax — every feature with its own state is a field that must survive future versions forever, with no backend to migrate it. The entire Batch 1 list adds none.

---

## The full idea catalogue

Deduplicated across all five notes. Effort: **S** = one sitting, **M** = a weekend-sized chunk, **L** = multi-session.

### Feel and legibility — no new save state (do these first)

| Idea | Notes | Effort |
|---|---|---|
| Unlock/Level-Up impact pass: ~50–80 ms hit-stop, constant-volume squash-stretch, water ripple, small screen kick | The highest-rated techniques in the game-feel literature, applied to the only two buttons in the game | S |
| Escalation ladder: one `intensity` value threaded through burst, shake and audio pitch/chord | Makes unlock #1 and #72 feel different for the cost of one variable | S |
| Live rate HUD with booster attribution ("fish 12.4/s, +18% boosters"), per-tile contribution on select | Boosters currently have invisible effects | S |
| "Next unlock in 4m 12s" ETA bar + persistent HUD next-unlock tracker | Costs and rates are both known, so the ETA is exact | S |
| Odometer-tweened counters (~300 ms ease) + K/M/B suffixes at display time | Magnitudes stay inside a JS double — **no big-number library needed**, a ~15-line formatter suffices | S |
| Board-level affordability tinting: affordable / not-yet / adjacency-locked, colour **plus** glyph | Removes click-every-tile busywork; satisfies never-colour-alone | M |
| Frozen Reach reveal ceremony: camera pull-back, fog dissolving over seconds, palette shift, one line of text | The game's biggest structural moment, currently unmarked. Pure presentation | S |
| Ambient life: per-tile sine bob with random phase, instanced fish schools and gulls (vertex-shader motion, one draw call), vertex sway on kelp, second slower wave layer | Tie spawns to unlocked tiles so ambience doubles as progress feedback | S–M |
| Day/night as a colour ramp (sky, fog, light, water tint; emissive lanterns at night) | **Keep cosmetic** — see the conflict section | S–M |
| Weather moods reusing the existing cloud/fog systems + one rare recurring visitor (a whale, a distant sail) | Cheapest substitute for an NPC system | M |

### Return experience and first session

| Idea | Notes | Effort |
|---|---|---|
| Welcome-back ends in a decision: elapsed → accrued → what is now unlockable → focus-camera button | The single highest-leverage low-cost change in the corpus | S |
| Honest cap line: "away 14h 20m — 8h counted (cap), 50% rate" | Turns a silent shortfall into a stated rule | S |
| Physical flotsam on the raft to collect on return, instead of only a dismissible modal | Gives the return an act, not just a receipt. Nothing expires | S–M |
| Per-resource "time to next unlock"; give Frozen Reach a slower accrual horizon | Turns one clock into four; serves both the 15-minute checker and the daily player | S / M |
| Start with one neighbour already discovered and pulsing, cost shown on the board | Converts the opening from a wait into a visible goal | S |
| Retune only the first 2–3 unlock costs so the first unlock lands in ~60–90 s | Leave the rest of the curve alone | S |
| Just-in-time teaching in the existing tile panel (one sentence on first booster, first adjacency block) | No tutorial screens, no modals | S |

### Quality of life and safety

| Idea | Notes | Effort |
|---|---|---|
| Base64 save export/import + `navigator.storage.persist()` | The load-bearing mitigation; persist() alone does **not** eliminate loss risk | S |
| Timestamp-delta accrual + save on `visibilitychange` | A deletion, not an addition — one code path for background, sleep and offline | S |
| Settings panel: volume/mute, reduced motion (default from `prefers-reduced-motion`), resource glyphs | Mute is the most-requested QoL item in community threads. Reduced motion must keep the unlock marker *distinct* when the pulse stops | M |
| Voyage Log / stats screen: lifetime totals, per-second rates with booster breakdown, tiles unlocked, time played, prestige count | Almost all of this already exists in save state — presentation over existing data | M |
| "Save my raft" screenshot: render to canvas, composite a caption, download PNG | Cheap and on-theme. **No evidence it affects retention** — build it for that reason only | S |
| Surface the export string a second time as "copy my raft code" | One implementation, two jobs | S |

### Gold sinks and achievements with teeth

| Idea | Notes | Effort |
|---|---|---|
| Harbor Shop — QoL perks: offline cap 8h→12h→16h→24h, rate 50%→65%→80%, auto-collect on load | Reduces return pressure rather than increasing it — the ethical direction | S–M |
| Raft decorations: lanterns, gull perches, flags, hull colours, water/sky palettes | The only infinite sink a solo dev can afford; never needs a balance pass. Persists through prestige | M |
| Ballast: one unlimited entry at escalating cost, small global bonus each | **Ship with the shop, not after** | S |
| Tile re-theme: pay gold to convert a producer's resource or re-roll a booster family | Sells agency, the sink type players value above flat multipliers | M |
| Automation licenses: auto-unlock cheapest affordable adjacent tile, auto-level lowest tile | Drift Away's direct analogue of AD's autobuyers. Care needed so it doesn't spend what the player was saving | M |
| "Tide" stat: achievement *count* feeds one global stat; a gold-bought charm converts Tide into a production multiplier. Expand to ~40–60 tiered achievements, with a shadow-achievement escape hatch | The indirection means new achievements never need a balance pass | M |
| Gold buys flotsam frequency ("more drifts by") | An upgrade that only pays out when you are present can never feel compulsory | S |

### Active-play hooks (all strictly additive — missing one costs nothing)

| Idea | Notes | Effort |
|---|---|---|
| Drifting flotsam: spawns every ~4–12 min, clickable for ~13 s, pays either a timed raft-wide multiplier (60–90 s) or an instant bundle worth **2–10 minutes of current production** | Pricing rewards in minutes-of-your-own-rate means they auto-scale forever and never need rebalancing | M |
| Two-tier crossers: slow crate (frequent, easy) vs darting shoal (rare, curved path, pays several times more) | Egg Inc's standard-vs-elite drone split; one extra trajectory function | S on top of the above |
| Crab pots / drying nets: a tile diverts a small slice of output into a net; pulling it up returns the stored amount at ~×1.15, capped at ~30 min, diversion paused while offline | A near-literal reskin of wrinklers (5% CpS each, ×1.1 on pop, no offline effect). Makes presence a *timing decision*, not a reflex | M |

### Long game: making run 2 different

| Idea | Notes | Effort |
|---|---|---|
| **Soften the prestige gate to a modest always-available threshold; bend tokens sublinear** | Prerequisite for everything else in this table | S |
| Rule-changing prestige upgrades: start with N tiles, drop the adjacency requirement, max level 3→4, lift the offline cap | The difference between one prestige and several | S–M |
| Voyage Challenges — one `activeChallenge` flag and a `challengeMods` table read by existing production/cost/adjacency functions. Launch set: *Becalmed* (boosters 0%), *Scattered Fleet* (no adjacency, costs ×5), *Lean Waters* (no levelling), *Monoculture* (one resource family), *Long Night* (no offline), *Frozen First* (start east). | Cheapest content in the genre — AD's 12 challenges are each a single-rule change with the same win condition. **Two critical rules: gate behind the first prestige, and pay normal tokens anyway** so attempting one is never a wasted session | M framework, S each after |
| Sea Conditions: pick one of three buff-shaped modifiers at prestige (*Calm Seas*, *Storm Season*, *Cold Current*) | Reuses the same plumbing as challenges; the low-friction version for players who won't opt into a handicap | S |
| Prestige-gated tile types: P1 Net (two resources at half rate), P2 Gull Roost (raises run offline cap), P3 Trade Post (converts resources), P5 Deep Anchor (scales with adjacent maxed tiles) | Gate by *prestige count*, not resource thresholds — AD locks its last three challenges behind 16 Infinities. A data-table row each, not a new zone | M first, S after |
| Give Frozen Reach one genuine rule change (a "metaphase"), not just more tiles behind fog | Currently zone 2 is zone 1 behind fog — and it is the half where players will otherwise quit | M–L |
| Staggered raft-wide milestones ("5 kelp tiles at level 3 → all kelp +25%") or a 4th level paid in a different resource | A level-3 tile is currently permanently finished and never re-enters a decision | M |

### Choice in the layout — pick at most one

| Idea | Notes | Effort |
|---|---|---|
| **Tile facing**: keep slot and identity fixed, let the player rotate each hex; one outflow edge (rope, net line, plank) bonuses whichever neighbour it points at. Free and reversible | The recommended option: additive, reversible, self-explaining, one int per tile | S–M |
| Offered hand: present 2–3 candidate tile types at unlock, seeded deterministically from slot index | Turns 72 sequencing decisions into 72 design decisions without changing the grid or the economy shape | M |
| Neighbour-scoped boosters instead of raft-wide percentages | The deepest fix, but a balance change that invalidates existing saves | M |
| Cosmetic prop layer: earn and freely place decorations, zero mechanical effect | The zero-balance-risk fallback. Townscaper sustained a hit on three verbs | M |
| Mystery slots (identity unknown until unlocked) + hidden adjacency "recipes" at level 3 that spawn unique structures | Dorfromantik's white-outlined hexes and Townscaper's recipes; converts a known unlock into a reveal | S–M |

### Collections

| Idea | Notes | Effort |
|---|---|---|
| Sea Life Almanac / flotsam codex: every N units produced rolls a species by rarity weight; ~30 entries, two lines of flavour each, a tiny transparent permanent bonus to the matching resource family | Uses the existing production loop, needs no new simulation, and gives the game narrative texture without writing a story | M |
| Curated display: pin discoveries to a physical rack or shelf prop on the raft | The collecting literature identifies *curation and display* as the satisfaction, not acquisition | S on top |
| Before/after postcards at fixed milestones, stored small and JPEG-encoded | Growth registers when it can be compared. Watch the localStorage budget (**10 MiB cap**) | M |

### Do not build

Randomised/seeded layouts (see conflicts). A static or curated leaderboard — ongoing manual labour for a solo maintainer with no backend. Generic buy-all/autobuyer QoL — Drift Away has one-time unlocks, not repeated purchases; the analogous feature is "level up all affordable tiles". A big-number library — magnitudes stay inside a JS double. Scientific-notation settings unless prestige pushes values past ~1e6. Multi-layer prestige — the only evidence comes from a game with an enormous complexity budget, whose own layering drove players to external wikis. Mini-games and branching random-event frameworks — they add their own economies, balance surface, and save-migration cost, and no source suggests they outperform the Batch 1 list. Any streak or expiring reward: a streak punishes missing a day, which is the dark pattern, and absence must never become loss.

---

## What the evidence cannot tell you

Take the whole ranking above as an engineering judgement informed by shipped designs, not as a measured result. **No retention telemetry for idle games surfaced in any of the five research passes** — no survey, no instrumented funnel, no A/B result, no "X% of players quit before their first unlock" for any named incremental game. Reddit was not reachable by the research tooling, so there is no r/incremental_games community evidence anywhere in the corpus; community sentiment comes from itch.io and Steam threads, which skew toward small and early games. The only hard retention numbers found are **all-genre mobile benchmarks — median D1 22.91%, D7 4.2%, D28 0.85%**, with the top quartile at 26–28% D1 and falling year over year ([Segwise, citing GameAnalytics](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies)). Those describe a store funnel a browser hobby game does not have; the transferable part is only the *shape* — most loss happens in the first session.

Three specific numbers were checked and should not be used. The **"60% idle / 40% active"** split appears in two notes and traces to a single unsourced content-marketing page with no author or methodology; two separate research passes independently flagged it as unusable. The claim that **"the first five minutes determine 80% of retention"** is not supported by the article it is commonly attributed to. **"Cookie Clicker ascension seeds" as a challenge-run system does not exist** — the real mechanism is its named "Born again" mode. Separately, Cookie Clicker's exact milk-per-achievement percentages could not be verified (the mechanism — count feeds a global stat, upgrades multiply it — is confirmed), the Three.js effort ordering for ambient effects is unsourced engineering judgement with no benchmark behind it, and all numeric tuning suggestions here (sublinear exponents, ballast percentages, buff values) are derived from the *shape* of cited formulas rather than copied from any game.

---

## Conclusion

The most useful reframe in this research is that Drift Away's flat progression is not the disease. A 72-tile checklist produces a completion feeling rather than an escalation feeling, and the genre's classic engine — exponential costs outrunning polynomial production ([Kongregate](https://www.kongregate.com/pages/the-math-of-idle-games-part-i)) — is genuinely absent. But rebuilding the economy is the expensive answer to a problem the cheap answers cover: a checklist is perfectly enjoyable when each tick of it *lands*, when the next item is always visible with an exact ETA, and when finishing it opens something rather than ending something. Three of the four highest-ranked items here add no save state at all, and the two that do — a gold shop and a repeatable prestige — are each a formula and a data table.

The deeper structural point is about what should survive a reset. The cozy evidence is unusually consistent that attachment comes from accumulated authorship — Animal Crossing's islands, Townscaper's towns, Terra Nil's restored landscapes — which is exactly what a progress wipe destroys. Drift Away can have both, and this is the design decision worth making explicitly now rather than later: **let the economy reset and let authorship persist.** Cosmetics, codex entries, achievements, the Tide stat, and the raft's decorations carry across every run; the tiles, the resources and the tokens cycle. That split costs nothing to implement if it is decided before the gold shop exists, and it is very expensive to retrofit afterwards.
