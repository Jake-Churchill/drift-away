# Long-Term Meta-Progression and Goal Systems for Idle/Incremental Games

Scope note: this file covers achievements-with-teeth, spendable secondary currencies, quests/dailies, collections, challenge runs, and prestige layers — researched against shipped, well-documented idle games and applied to **Drift Away** (vanilla JS + Three.js, localStorage, no backend, one developer).

**Evidence quality labels used below:**
- **[A] Strong** — primary or near-primary documentation of a shipped mechanic (official/community game wiki describing a system that exists in the build).
- **[B] Moderate** — secondary source, guide site, or community aggregation; directionally reliable, details may lag patches.
- **[C] Weak** — opinion, devlog, or SEO blog; useful as a design hypothesis, not as fact.
- **[U] Unverified** — author background knowledge that this search did not confirm. Flagged explicitly and never used as a load-bearing claim.

---

## Q1: How do good idle games give achievements real value, versus cosmetic-only ones? What are the pitfalls?

### Takeaway
The best-documented pattern is that achievements are not the reward — they are the *measurement*, and a separate multiplier or currency reads that measurement. Cookie Clicker turns achievement count into "milk", a global production stat; Antimatter Dimensions and Kittens Game attach concrete permanent unlocks (autobuyers, mechanics) to completion; almost nobody ships achievement lists that are purely cosmetic in a genre where the player's entire motivation is a bigger number.

### Cited Findings
- Cookie Clicker (Orteil, 2013) ships **622 normal achievements plus 17 shadow achievements (639 total)**; each normal achievement increases "milk", which enhances cookie production, while shadow achievements grant a badge only and deliberately do **not** increase milk — [Cookie Clicker Wiki, Achievements (accessed 2026)](https://cookieclicker.wiki.gg/wiki/Achievements) **[A]**
- Cookie Clicker unlocks **new milk flavors as achievement thresholds are crossed**, which the player can choose to display — i.e. the same achievement count drives both a numeric bonus and a cosmetic selector — [Cookie Clicker Wiki, FAQ (accessed 2026)](https://cookieclicker.wiki.gg/wiki/Frequently_Asked_Questions) **[A]**
- Cookie Clicker's own guidance to players is "before you reset, try to obtain as many of the achievements as you can, so that you have a lot of milk and thus progress quickly on subsequent ascensions" — achievements are explicitly framed as *run-spanning power*, not trophies — [Cookie Clicker Wiki, FAQ (accessed 2026)](https://cookieclicker.wiki.gg/wiki/Frequently_Asked_Questions) **[A]**
- Antimatter Dimensions (Hevipelle, 2016) attaches its permanent rewards to **challenge completion rather than passive milestones**: each of the 12 Normal Challenges grants either an autobuyer interval upgrade or an entirely new autobuyer, and completing all Normal Challenges makes all Antimatter Dimensions 10% stronger — [Antimatter Dimensions Wiki, Normal Challenges (accessed 2026)](https://antimatterdimensions.wiki.gg/wiki/Normal_Challenges) **[A]**; corroborated by [Antimatter Dimensions Wiki (Fandom), Challenges](https://antimatter-dimensions.fandom.com/wiki/Challenges) **[B]**
- Kittens Game (bloodrizer, 2014) challenges "impose special restrictions and give permanent rewards once a certain milestone is reached" — e.g. clearing "Winter Has Come" permanently raises the chance of warm weather in future runs — [Kittens Game Wiki, Challenges (accessed 2026)](https://wiki.kittensgame.com/en/game-tabs/challenges) **[B — page retrieved via search summary; full text fetch failed]**
- Realm Grinder (Divine Games, 2015) keeps **trophies, unlocked upgrades, heritages, rubies, and artifacts** through its deeper reset (reincarnation), i.e. the achievement-adjacent layer is explicitly reset-proof — [Realm Grinder Wikia, Reincarnation (accessed 2026)](https://realm-grinder.fandom.com/wiki/Reincarnation) **[B]**

### Inferences
- The design move that makes achievements matter is **indirection**: don't put the bonus on each achievement, put a global stat on the *count* and let an upgrade read it. Cookie Clicker's milk is one number (achievement count) that upgrades multiply against. This is dramatically cheaper for a solo dev than hand-balancing 60 individual bonuses, and it means adding an achievement later never needs a balance pass.
- Shadow achievements are the genre's answer to "achievements for things that aren't skill" — Cookie Clicker deliberately zeroes their milk so that unfair/janitorial/cheat-adjacent achievements can exist without wrecking balance **[A, inference from the shadow-achievement rule]**.
- Pitfalls visible in the data: (a) an achievement currency with no sink is dead weight — this is exactly Drift Away's current gold; (b) achievements that gate power behind *luck or grind you cannot plan* create resentment, which is why AD ties rewards to challenges the player elects to attempt; (c) 639 achievements is a Cookie-Clicker-scale number and not a target for a solo dev — the useful lesson is the *mechanism*, not the count.

### Gaps
- I could not retrieve the exact Cookie Clicker milk→CpS conversion chain (milk itself does nothing until "kitten" upgrades are purchased that convert milk % into CpS; my recollection is +4% milk per achievement). The wiki.gg page fetch summarised milk as directly enhancing production, which is imprecise. **[U]** — treat the *mechanism* (count → global stat → upgrades multiply it) as confirmed, the exact percentages as unverified. The Fandom achievement page returned HTTP 402 and could not be used to settle it.
- No academic or telemetry-backed study was found comparing achievement-with-reward vs cosmetic-only achievements on retention in web idle games.

---

## Q2: How should a second currency like gold be designed and spent? What sinks keep a currency meaningful?

### Takeaway
Shipped idle games use three sink archetypes in combination: **permanent power** (bought once, kept forever), **a dump/overflow sink** that absorbs unlimited surplus at poor efficiency, and **quality-of-life/automation** purchases. The failure mode Drift Away currently has — a currency that nothing reads — is the one thing every documented game avoids.

### Cited Findings
- Cookie Clicker's Heavenly Chips are "the currency used to buy Heavenly Upgrades, which cost a varying number of Heavenly Chips and are retained across all subsequent ascensions" — a permanent-power sink where purchases survive every reset — [Cookie Clicker Wiki, Ascension (accessed 2026)](https://cookieclicker.wiki.gg/wiki/Ascension) **[A]**
- Cookie Clicker also sells **permanent upgrade slots** for heavenly chips: "placing an upgrade in this slot will make its effects permanent across all playthroughs", with multiple slots unlocking progressively at higher prestige costs — a sink that sells *player agency* rather than a flat multiplier — [Cookie Clicker Wiki, Ascension (accessed 2026)](https://cookieclicker.wiki.gg/wiki/Ascension) **[A]**
- Cookie Clicker sells cosmetic/behavioural toggles for the same prestige currency (e.g. the "Season Switcher", alongside quality-of-life buys like "Persistent memory" and "Starter kit") — cosmetics and QoL compete for the same currency as raw power — [Cookie Clicker Wiki, Ascension (accessed 2026)](https://cookieclicker.wiki.gg/wiki/Ascension) **[A]**
- Clicker Heroes (Playsaurus, 2014) uses **Morgulis explicitly as an overflow sink**: "Morgulis is your 'sink' to dump all your hero souls into when you are done with upgrading the other Ancients" — a deliberately low-efficiency infinite dump so surplus currency never feels wasted — [Clicker Heroes blog, Ancient Souls guide (accessed 2026)](https://blog.clickerheroes.com/clicker-heroes-ancient-souls-master-the-ultimate-currency/) **[C]**; Ancients themselves level at escalating Hero Soul cost — [ClickerHeroes Wiki, Ancients (accessed 2026)](https://clickerheroes.fandom.com/wiki/Ancients) **[B]**
- Clicker Heroes separates currencies by layer: Hero Souls buy Ancients (reset each transcension), **Ancient Souls are "much rarer and used exclusively to empower Outsiders"**, which persist through transcensions — two currencies, two spend screens, two time horizons — [Clicker Heroes blog, Transcendence guide (accessed 2026)](https://blog.clickerheroes.com/clicker-heroes-transcendence-guide-outsiders-souls-explained/) **[C]**; Outsiders confirmed as post-first-Transcendence and transcension-persistent — [ClickerHeroes Wiki, Outsiders (accessed 2026)](https://clickerheroes.fandom.com/wiki/Outsiders) **[B]**
- Antimatter Dimensions' primary "spend" for early meta-progress is **automation** — autobuyers and autobuyer interval upgrades — not a raw multiplier; the wiki summary notes these rewards "make repeated runs less manual" — [Antimatter Dimensions Wiki, Normal Challenges (accessed 2026)](https://antimatterdimensions.wiki.gg/wiki/Normal_Challenges) **[A]**
- Kittens Game's Paragon is spent in the Metaphysics tab, and "things you can buy with Metaphysics carry over after resets, and make certain things easier in the game" — again: permanent, cross-run, purchased in a dedicated screen — [Kittens Game Wiki, Paragon (accessed 2026)](https://wiki.kittensgame.com/en/general-information/resources/paragon) **[B]**
- Egg, Inc. (Auxbrain, 2016) shows the **compounding second-currency** pattern: Soul Eggs give +10% earnings each, while the rarer Eggs of Prophecy increase the *per-Soul-Egg* multiplier by 5% each and compound, so "a small number of Eggs of Prophecy can greatly increase the bonus" — [Egg Inc Wiki, Eggs of Prophecy (accessed 2026)](https://egg-inc.fandom.com/wiki/Egg_of_Prophecy) **[B]**; Soul Egg mechanics — [Egg Inc Wiki, Earnings Bonus/Soul Eggs (accessed 2026)](https://egg-inc.fandom.com/wiki/Earnings_Bonus/Soul_Eggs) **[B]**

### Inferences
- **Two currencies want two different jobs.** Drift Away already has prestige tokens doing "flat +10% production per resource". If gold also buys flat production, the two screens become the same screen. The clean split, following Cookie Clicker and AD: **tokens = raw multipliers; gold = things you can't buy with tokens** — quality of life (offline cap/rate), agency (retheme a tile, keep something through prestige), and cosmetics (raft decoration).
- **Cosmetics are the only infinite sink a solo dev can afford.** Balanced power sinks need a balance pass every time you add one; a lantern on the raft needs none. Cookie Clicker's milk flavors and Season Switcher show cosmetics sitting happily inside a power economy **[A]**. For a cozy open-sea game this is also the *thematically* strongest sink — the raft is the player's home.
- **Ship an overflow sink from day one.** Morgulis exists because late-game players accumulate currency faster than the shop absorbs it **[C]**. For Drift Away the trivial version is a final gold item with unlimited purchases at escalating cost and a small bonus (e.g. "Ballast: +0.5% all production, cost grows"), so gold never caps out and feels pointless again.
- **Egg Inc's compounding second currency is the highest-value lesson for long-run retention but the highest balance risk.** A rare currency that multiplies the *effect of the common currency* (rather than adding to it) is what keeps veterans chasing a single drop. For a hobbyist build, do this only if the drop source is bounded and countable (e.g. one per achievement tier), otherwise the exponent runs away.

### Gaps
- No source found quantifying how much currency surplus is "too much" before players disengage; the overflow-sink rationale is design folklore documented in guides, not measured.

---

## Q3: What do prestige loops need to feel rewarding on repeat runs, and how do games avoid "same run again" fatigue?

### Takeaway
Four documented mechanisms: (1) the prestige currency formula must **sublinearly reward** longer runs so resetting sooner is correct, (2) each run must be **materially faster** via automation, not just bigger numbers, (3) the game must **open new mechanics/screens after the first reset** rather than replaying identical content, and (4) eventually a **second reset layer** re-uses the whole first loop as its new "early game".

### Cited Findings
- Cookie Clicker's prestige is **explicitly sublinear**: prestige level = (cookies baked all time / 1 trillion)^(1/3), earning heavenly chips 1:1 with prestige levels, each level giving +1% CpS permanently — the cube root means a 8× longer run yields only 2× the prestige — [Cookie Clicker Wiki, Ascension (accessed 2026)](https://cookieclicker.wiki.gg/wiki/Ascension) **[A]**
- Egg, Inc. uses the same shape from the other direction: "the rate of Soul Egg gain slows as your Prestige Earnings increase, **encouraging frequent prestiging over waiting**" — diminishing returns is the anti-stall mechanism — [Egg Inc Wiki, Prestige (accessed 2026)](https://egg-inc.fandom.com/wiki/Prestige) **[B]**
- Antimatter Dimensions makes repeat runs *shorter in wall-clock and in clicks*: challenge rewards are autobuyers and autobuyer interval upgrades, i.e. the same run is progressively automated away — [Antimatter Dimensions Wiki, Normal Challenges (accessed 2026)](https://antimatterdimensions.wiki.gg/wiki/Normal_Challenges) **[A]**
- Cookie Clicker opens genuinely new systems *after* first ascension — heavenly upgrades, permanent upgrade slots, and Challenge Mode ("Born again") are all post-ascension content — [Cookie Clicker Wiki, Ascension (accessed 2026)](https://cookieclicker.wiki.gg/wiki/Ascension) **[A]**
- Realm Grinder stacks **two reset layers**: Abdication ("cash in all the coins you have earned in order to boost your production", starting a new run) and Reincarnation, unlocked at one octillion gems, which resets gold/gems/excavations but keeps trophies, upgrades, heritages, rubies and artifacts and grants "Reincarnation Power" scaling with total reincarnations — [Realm Grinder Wikia, Abdication (accessed 2026)](https://realm-grinder.fandom.com/wiki/Abdication) **[B]**; [Realm Grinder Wikia, Reincarnation (accessed 2026)](https://realm-grinder.fandom.com/wiki/Reincarnation) **[B]**
- Realm Grinder also varies the *content* of a run, not just its speed: factions (fairies, elves, angels, goblins, undead, demons) are chosen per run and change which upgrades and strategies apply — [PC Gamer, Realm Grinder guide (2017)](https://www.pcgamer.com/realm-grinder-guide/) **[B]**
- Clicker Heroes added Transcendence as a *second* prestige layer whose currency (Ancient Souls) buys Outsiders that persist through transcensions, "in the same way that ancients persist through ascensions" — the first loop becomes the new short loop — [ClickerHeroes Wiki, Outsiders (accessed 2026)](https://clickerheroes.fandom.com/wiki/Outsiders) **[B]**; gain formula reported as floor(5·log₁₀(sacrificed Hero Souls)), i.e. **logarithmic** — [Clicker Heroes blog, Transcendence guide (accessed 2026)](https://blog.clickerheroes.com/clicker-heroes-transcendence-guide-outsiders-souls-explained/) **[C]**
- Kittens Game's Paragon is earned "for resetting with over 70 kittens (you gain 1 point per kitten over 70)" — a **threshold** rather than a ratio, which makes each reset a clear goal ("beat my kitten count") instead of an open-ended grind — [Kittens Game Wiki, Paragon (accessed 2026)](https://wiki.kittensgame.com/en/general-information/resources/paragon) **[B]**
- Community/dev commentary identifies the failure modes directly: "the reward schedule lacks variability... prestige arrives too late or too early, or exponential growth stalls at a point where new content doesn't open up", and that incremental games with many unlocks spanning multiple days "can lead to players giving up as they forget what's needed for progression" — [Dinogame, Psychology of Idle Games (accessed 2026)](https://dinogame.gg/blog/psychology-of-idle-games/) **[C]**; [itch.io developer feedback thread on prestige pacing (accessed 2026)](https://itch.io/t/5446445/feedback-prestige-loop-accelerates-to-endgame-levels-at-3-prestige-points) **[C]**

### Inferences
- **Drift Away's prestige trigger is currently the strictest possible: every tile in both zones maxed (72 tiles × level 3).** Every documented game instead lets the player reset *whenever*, and uses the reward curve to suggest when. A hard 100%-completion gate means one prestige is a marathon and the second prestige is the same marathon — which is precisely the "same run again" trap. Allowing prestige any time after some modest threshold, with tokens scaling sublinearly (e.g. `tokens = floor((lifetime/1000)^0.6)` rather than linear), converts a one-time slog into a repeatable rhythm. **This is the single highest-leverage change in this document.**
- **Token linearity is a live risk.** Drift Away's `lifetime resources / 1000` is *linear*, which (per Egg Inc's stated rationale **[B]**) rewards waiting rather than resetting — the opposite of what keeps a loop turning. Cube-root (Cookie Clicker **[A]**) or log (Clicker Heroes **[C]**) shapes are the shipped precedents.
- **Automation is the most reliable "runs get better" reward and Drift Away has an obvious one it hasn't spent yet.** The tile unlock + level-up loop is manual clicking on 72 tiles × 3 levels. Auto-unlock and auto-level, bought with gold or earned from achievements, is Drift Away's exact analogue of AD's autobuyers **[A]** — it makes run 3 feel unlike run 1 without adding a single new number.
- **Faction-style variety (Realm Grinder **[B]**) maps cleanly onto Drift Away's four resources.** "This run I'm a kelp raft" is a run-shaping choice that costs one modifier table, not new content.

### Gaps
- No reliable source was found for how long the median player stays with an idle game across prestige counts, or at what prestige number drop-off spikes. All prestige-fatigue claims here are design-community assertions **[C]**, not measured.

---

## Q4: What are challenge runs / ascension modifiers, and how are they built cheaply?

### Takeaway
A challenge run is the *same game with one rule inverted*, a completion condition, and a permanent first-clear reward. They are the cheapest content in the genre because they reuse 100% of the existing simulation — the implementation is typically a flag read at a handful of multiplier sites.

### Cited Findings
- Antimatter Dimensions' 12 Normal Challenges are each a single-rule modification of the base game with the same win condition (reach Infinity / 1.80e308 antimatter). Documented restrictions include: buying anything halts production for 3 minutes; the 1st Dimension is heavily weakened; buying a Dimension erases all lower-tier ones; the tickspeed multiplier drops from ×1.125 to ×1.080; Dimensions cost other Dimensions instead of antimatter; no Boosts or Galaxies but stronger Sacrifice; only 6 Dimensions exist — [Antimatter Dimensions Wiki, Normal Challenges (accessed 2026)](https://antimatterdimensions.wiki.gg/wiki/Normal_Challenges) **[A]**
- The reward ladder is staged: challenges 1–9 give autobuyer *interval* upgrades, 10–12 give entirely **new** autobuyers (Dimension Boost, Antimatter Galaxy, Big Crunch) — early rewards are incremental, late rewards are structural — [Antimatter Dimensions Wiki, Normal Challenges (accessed 2026)](https://antimatterdimensions.wiki.gg/wiki/Normal_Challenges) **[A]**
- Challenges are **gated behind the first prestige** ("unlocked upon reaching Infinity"), and the last three are additionally gated behind 16 Infinities — they are deliberately post-prestige content, and they are drip-fed — [Antimatter Dimensions Wiki (Fandom), Challenges (accessed 2026)](https://antimatter-dimensions.fandom.com/wiki/Challenges) **[B]**
- Cookie Clicker's Challenge Mode ("Born again") is activated *before* ascending and starts the run "as though a new game had begun" with default stats, with upgrades returning on the next ascension — i.e. the challenge is implemented as "temporarily ignore your permanent bonuses" — [Cookie Clicker Wiki, Ascension (accessed 2026)](https://cookieclicker.wiki.gg/wiki/Ascension) **[A]**
- Kittens Game gates challenges behind a metaphysics upgrade (Adjustment Bureau); they "impose special restrictions and give permanent rewards once a certain milestone is reached, and they reset your game with paragon and karma gained as normal" — crucially, **a challenge run still pays normal prestige currency**, so attempting one is never a wasted session — [Kittens Game Wiki, Challenges (accessed 2026)](https://wiki.kittensgame.com/en/game-tabs/challenges) **[B]**
- Kittens Game examples show the restriction/reward pairing is thematically linked: "Winter Has Come" replaces the seasonal cycle with four winters and disables paragon bonuses on catnip; clearing it permanently raises warm-weather chance — [Kittens Game Wiki, Challenges (accessed 2026)](https://wiki.kittensgame.com/en/game-tabs/challenges) **[B]**
- AD's completion bonus for the full set is a flat global buff (all Antimatter Dimensions 10% stronger), with a separate reward making dimensions 40% stronger *only inside challenges* — a self-referential reward that makes later challenges easier — [Antimatter Dimensions Wiki (Fandom), Challenges (accessed 2026)](https://antimatter-dimensions.fandom.com/wiki/Challenges) **[B]**

### Inferences
- **The cheap implementation pattern, read off AD and Cookie Clicker:** one `activeChallenge` string in save state, a `challengeMods` lookup table, and the existing production/cost functions consult it. Drift Away already has exactly the right hook points — per-tile production, booster percentages, unlock cost, unlock adjacency, level cost. Inverting any one of those is a few lines each:
  - *Becalmed*: boosters give 0%. Forces pure producer play.
  - *Scattered Fleet*: adjacency requirement removed but unlock costs ×5. Changes the map-spreading puzzle entirely.
  - *Lean Waters*: tiles cannot be levelled past 1.
  - *Monoculture*: only one resource family may be unlocked (or produces; others yield 0).
  - *Long Night*: offline progress disabled for the run.
  - *Frozen First*: Frozen Reach is open from the start, Home Waters is fogged.
- **Kittens Game's "challenge runs still pay normal prestige currency" rule is the retention-critical detail [B].** If a challenge run pays nothing, most players will never try one, because opportunity cost dominates in a genre about accumulation. Make challenge runs pay *at least* normal tokens.
- **Gate challenges behind the first prestige** (AD **[A]**, Kittens Game via Adjustment Bureau **[B]**). This is also the answer to "what is the post-prestige loop" — the content that makes run 2 different is content run 1 never saw.

### Gaps
- Cookie Clicker "ascension seeds" (as named in the research brief) were not confirmed by any source retrieved. Cookie Clicker does have a save **seed** used by the Golden Cookie/Grandmapocalypse RNG and a "Chocolate egg"/seed-related system **[U]**, but I found no documentation of *challenge seeds as a run-modifier system*. Treat "seeded challenge runs, Cookie Clicker style" as unsupported; the supported mechanism is the named **Born again** challenge mode.

---

## Q5: Do quests, daily/weekly goals, collections/codexes and stats screens measurably help retention in web idle games? What are the ethical versions of daily-return incentives?

### Takeaway
**I found no measured retention data for these features in web idle games** — this is the weakest-evidenced question in the brief, and the report should say so. What *is* documented is the structural argument: idle games fail when players "forget what's needed for progression", which is a goal-legibility problem that quest logs and stats screens directly address.

### Cited Findings
- Documented failure mode: incremental games with many unlocks spanning multiple days of playtime "can lead to players giving up as they **forget what's needed for progression**" — [Dinogame, Psychology of Idle Games (accessed 2026)](https://dinogame.gg/blog/psychology-of-idle-games/) **[C]**
- Documented failure mode: "the reward schedule lacks variability (everything pays out predictably, killing anticipation)" — [Dinogame, Psychology of Idle Games (accessed 2026)](https://dinogame.gg/blog/psychology-of-idle-games/) **[C]**
- Collection-as-progression is well-attested as a *power* system rather than a checklist: Cookie Clicker's milk flavors are collectible display states unlocked by achievement thresholds — [Cookie Clicker Wiki, FAQ (accessed 2026)](https://cookieclicker.wiki.gg/wiki/Frequently_Asked_Questions) **[A]**; Realm Grinder keeps trophies and artifacts as a permanent collection across reincarnation — [Realm Grinder Wikia, Reincarnation (accessed 2026)](https://realm-grinder.fandom.com/wiki/Reincarnation) **[B]**
- Kittens Game's Paragon accrues partly with *in-game time* ("1 every 1000 ingame years") in addition to reset thresholds — a return incentive tied to the simulation rather than to a real-world calendar — [Kittens Game Wiki, Paragon (accessed 2026)](https://wiki.kittensgame.com/en/general-information/resources/paragon) **[B]**
- Egg, Inc.'s design explicitly nudges *session frequency* through the reward curve (slowing Soul Egg gain over a long run) rather than through a login calendar — [Egg Inc Wiki, Prestige (accessed 2026)](https://egg-inc.fandom.com/wiki/Prestige) **[B]**

### Inferences
- **Ethical daily-return design, derived from the above:** make the *game state* worth returning to, not the *clock*. Concrete rules that keep Drift Away non-manipulative:
  - **No streaks.** A streak punishes missing a day; that is the dark pattern. Kittens Game/Egg Inc precedent uses curve shape, not calendars **[B]**.
  - **Nothing expires.** If a goal is only claimable today, absence becomes loss. Make goals *rotate* but let the completed one bank.
  - **Offline progress already is the ethical daily incentive** — Drift Away's 8-hour cap at 50% is the honest version: come back when you like, the raft kept fishing. Extending the cap via gold is a *reduction* of pressure, not an increase.
  - **The "return moment" is the retention feature, not the reward.** A summary on load ("while you were away: 2.4k fish, 1.1k kelp — a gull landed on tile 14") is cheap, cozy, and creates no obligation.
- **A stats screen is near-free and directly attacks the documented "forgot what I was doing" failure [C].** Drift Away already tracks lifetime totals (the unlock milestones read them) and prestige tokens; a Voyage Log panel is presentation over existing state, not new state.
- **A codex/collection is Drift Away's cheapest route to "story" without writing a story.** The brief notes there is no narrative. A "Sea Life Almanac" of ~30 entries discovered by playing (each with two lines of flavor text and a tiny permanent bonus) delivers narrative texture, a collection, and a milk-style aggregate stat from one data table.

### Gaps
- **No quantitative retention evidence found** for quests, dailies, codexes, or stats screens specifically in web/browser idle games. No GDC talk or Game Developer article on idle-game meta-progression was surfaced by these searches. Every claim in this section is structural reasoning from shipped designs plus one low-quality secondary source. The report writer should not assert measured retention lift.
- r/incremental_games threads did not surface through the available search tool (results skewed to itch.io and SEO blogs), so the community-consensus angle requested in the brief is under-evidenced.

---

## Q6: How much content depth do successful idle games add over time, and how do they pace reveals?

### Takeaway
The documented pattern is **layered gating, not breadth**: content is revealed in tiers keyed to prestige count, and later tiers of the *same* system are locked behind repetitions of the earlier one. Successful games add depth by stacking reset layers over years, not by shipping more zones.

### Cited Findings
- Antimatter Dimensions gates its last 3 Normal Challenges behind **16 Infinities** — content locked behind a *count of prestiges*, not a resource threshold — [Antimatter Dimensions Wiki (Fandom), Challenges (accessed 2026)](https://antimatter-dimensions.fandom.com/wiki/Challenges) **[B]**
- Realm Grinder's second reset layer (Reincarnation) is gated at **one octillion (1e27) gems**, far past the first layer, and grants Reincarnation Power scaling with total reincarnations — the second layer is a late reveal that then becomes the new long loop — [Realm Grinder Wikia, Reincarnation (accessed 2026)](https://realm-grinder.fandom.com/wiki/Reincarnation) **[B]**
- Realm Grinder has continued rebalancing its reset economy in live patches, streamlining "Reincarnation gems requirement and Coins required per Gem... throughout all Ascensions except Ascension 0" — the depth ladder is maintained post-launch, not shipped whole — [Realm Grinder 4.3.0 patch notes, Divine Games (accessed 2026)](https://www.divinegames.it/discuss/viewtopic.php?id=609) **[B]**
- Clicker Heroes' Outsiders are "a new feature encountered **after the player's first Transcendence**" — an entire new upgrade screen that does not exist until a deep milestone — [ClickerHeroes Wiki, Outsiders (accessed 2026)](https://clickerheroes.fandom.com/wiki/Outsiders) **[B]**
- Cookie Clicker's post-ascension content is itself tiered by prestige cost: permanent upgrade slots "unlock progressively at higher prestige costs", and guides point players at specific heavenly upgrades around ~2,185 prestige — reveals are priced along a single currency axis — [Cookie Clicker Wiki, Ascension (accessed 2026)](https://cookieclicker.wiki.gg/wiki/Ascension) **[A]**; [Cookie Clicker Wiki, Ascension guide (accessed 2026)](https://cookieclicker.wiki.gg/wiki/Ascension_guide) **[A]**
- Cookie Clicker's recommended *first* ascension is at 365 prestige levels / ~48.6 quintillion lifetime cookies — i.e. the game expects a substantial first run before the meta-layer opens at all — [Cookie Clicker Wiki, Ascension guide (accessed 2026)](https://cookieclicker.wiki.gg/wiki/Ascension_guide) **[A]**

### Inferences
- **Drift Away should gate by prestige count, not build new zones.** A third zone is the expensive answer (new art, new balance, new tiles). "Prestige 1 unlocks challenges; prestige 3 unlocks a new tile type; prestige 5 unlocks the second gold shop tier" is the cheap answer and matches AD's 16-Infinity gate **[B]** and Clicker Heroes' post-Transcendence Outsiders **[B]**.
- **The reveal cadence that works is: one new *screen* per major milestone, one new *row* per minor one.** Drift Away currently reveals everything (two zones, tokens, achievements) in the first playthrough, so there is nothing left to show. Holding back two or three systems for post-prestige is worth more than doubling the map.
- **Fog is Drift Away's existing reveal mechanism and it is underused.** The brief notes undiscovered tiles are hidden and Frozen Reach is fog-covered. Reusing fog as the presentation layer for *every* new system (a fogged shop shelf, a fogged almanac page) gives free anticipation at zero new tech.

### Gaps
- No source found giving a recommended number of content layers or a target time-to-first-prestige for a hobbyist-scale game; Cookie Clicker's 48.6-quintillion first ascension **[A]** is a scale reference for a 10+ year live game, not a target.

---

## Idea Candidates for Drift Away

Effort: **S** = an evening or two; **M** = a weekend; **L** = multi-weekend. All fit vanilla JS + localStorage, no backend, no monetization, no streaks or expiring rewards.

### Gold sinks (5 candidates — brief asked for ≥3)

**1. Harbor Shop: permanent quality-of-life perks — S/M**
Gold buys cross-prestige comfort upgrades: offline cap 8h → 12h → 16h → 24h, offline rate 50% → 65% → 80%, auto-collect on load.
*Why it works:* Cookie Clicker sells QoL ("Persistent memory", "Starter kit") for its prestige currency alongside raw power **[A]**, keeping two currencies in two distinct lanes so gold never duplicates tokens. QoL perks also reduce return pressure rather than increase it — the ethical direction.
*Effort:* S if the shop is a list in the existing UI; M with a proper panel.

**2. Raft decorations: infinite cosmetic sink — M**
Gold buys placeable cosmetics — lanterns, gull perches, flags, rope rails, a raft cat, hull colors, water/sky palettes, a night-lantern mode. Purely visual, persists through prestige.
*Why it works:* An infinite sink that never needs a balance pass — the one sink type a solo dev can extend forever. Cookie Clicker precedent for cosmetics living inside a power economy (milk flavors, Season Switcher) **[A]**. Strongest thematic fit: the raft is the player's home, and a cozy game's long-tail motivation is making it yours.
*Effort:* M — Three.js props plus a placement UI; each additional prop after the first is S.

**3. Tile Re-theme (repeatable sink) — M**
Pay gold to convert a producer tile to a different resource, or re-roll a booster's family. Cost escalates within a run.
*Why it works:* Sells **agency**, which Cookie Clicker's permanent upgrade slots show is a premium sink players value above flat multipliers **[A]**. It makes the 72-tile grid a layout the player authors rather than one they receive, and it's the natural counterweight to randomized layouts (idea 9).
*Effort:* M — needs tile-type mutation plus visual swap.

**4. Automation licenses — M**
Gold buys auto-unlock (unlock the cheapest affordable adjacent tile automatically) and auto-level (spend surplus on the lowest-level tile), each with a speed tier.
*Why it works:* This is Drift Away's exact analogue of Antimatter Dimensions' autobuyers and autobuyer interval upgrades — the genre's most reliable "repeat runs feel better" reward **[A]**. It is also the specific fix for a 72-tile × 3-level manual click loop on run 2 and beyond.
*Effort:* M — the logic is small; the care is in not letting it spend resources the player was saving.

**5. Ballast: the overflow sink — S**
A final shop entry with unlimited purchases at escalating gold cost, granting a small global production bonus each (e.g. +0.5%).
*Why it works:* Clicker Heroes ships Morgulis explicitly as a dump for surplus prestige currency so late-game income never feels wasted **[C]**. Prevents gold from re-becoming a dead counter once the shop is cleared. Ship it with the shop, not after.
*Effort:* S — one entry, one multiplier.

### Making post-prestige runs different (5 candidates — brief asked for ≥3)

**6. Voyage Challenges: one-rule-inverted runs, unlocked at first prestige — M**
A `challengeMods` table read by existing production/cost/adjacency functions. Launch set of six: *Becalmed* (boosters give 0%), *Scattered Fleet* (no adjacency requirement, unlock costs ×5), *Lean Waters* (no tile levelling), *Monoculture* (one resource family only), *Long Night* (offline disabled), *Frozen First* (start in Frozen Reach, Home Waters fogged). Each first-clear grants a permanent raft-wide bonus plus gold.
*Why it works:* Cheapest content in the genre — AD's 12 challenges are each a single-rule modification with the same win condition **[A]**. Two critical rules from the research: **gate them behind the first prestige** (AD **[A]**, Kittens Game **[B]**), and **pay normal tokens for a challenge run anyway** so attempting one is never a wasted session (Kittens Game **[B]**).
*Effort:* M for the framework, S per additional challenge afterwards.

**7. Soften the prestige gate and bend the token curve — S (highest leverage)**
Allow prestige any time past a modest threshold instead of requiring all 72 tiles maxed, and change tokens from linear `lifetime/1000` to sublinear, e.g. `floor((lifetime/1000)^0.6)`.
*Why it works:* Cookie Clicker's prestige is a **cube root** of lifetime cookies **[A]** and Egg, Inc. explicitly slows Soul Egg gain on long runs to encourage "frequent prestiging over waiting" **[B]**. Drift Away's linear formula plus a 100%-completion gate rewards exactly the behaviour those games designed against, and guarantees run 2 is the same marathon as run 1. This is the change that makes every other post-prestige idea reachable.
*Effort:* S — two formulas and an unlock condition.

**8. Prestige-gated tile types — M**
New tile archetypes unlock at prestige counts, not at resource thresholds: P1 → *Net* (produces two resources at half rate), P2 → *Gull Roost* (raises offline cap for the run), P3 → *Trade Post* (converts one resource to another), P5 → *Deep Anchor* (booster that scales with adjacent maxed tiles).
*Why it works:* AD locks its last three challenges behind **16 Infinities** — a count of prestiges, not a resource number **[B]**; Clicker Heroes reveals Outsiders only after the first Transcendence **[B]**. New tile types change the *shape* of the raft puzzle, which is what "different run" means in a spatial game — and they cost a data-table row each, not a new zone.
*Effort:* M for the first (needs a new tile behaviour hook), S each after.

**9. Seeded tile layout per run — M**
Shuffle which hexes are producers vs boosters and which resource each carries, seeded per prestige, with the seed shown in the Voyage Log.
*Why it works:* Directly attacks "same run again" for a grid game: the adjacency-spreading puzzle is the core of Drift Away's early game, and re-rolling it re-creates the best part of run 1 in run 2. The community-documented failure mode is a predictable reward schedule with no variability **[C]**; a new map is variability the player can plan around rather than gamble on. Pairs with idea 3 (gold lets you correct a bad roll) and 12 (a shown seed makes runs comparable).
*Effort:* M — a seeded PRNG plus a layout generator; guard that generated layouts are always completable.

**10. Sea Conditions: pick one of three modifiers at prestige — S**
On prestige, choose from three drawn conditions, e.g. *Calm Seas* (+20% all production), *Storm Season* (boosters ×2, producers −30%), *Cold Current* (Frozen Reach costs −50%, Home Waters +50%).
*Why it works:* Realm Grinder's factions are chosen per run and change which strategies apply **[B]** — a run-shaping choice from one modifier table, no new content. Unlike challenges this is a *buff-shaped* choice, so it's the low-friction version for players who won't opt into a handicap.
*Effort:* S — reuses the same `challengeMods` plumbing as idea 6.

### Goals, collection and legibility (2 candidates)

**11. Tide Level: achievements as a global multiplier + expanded tiered achievement list — M**
Expand 10 achievements to ~40–60 tiered ones (lifetime totals at 5 tiers per resource, tiles unlocked, zones maxed, challenges cleared, prestige counts). Each grants gold **and** raises a single "Tide" stat; a gold-bought *Tide Charm* converts Tide into a global production multiplier.
*Why it works:* This is Cookie Clicker's milk mechanism exactly — 622 achievements feed one stat, and upgrades multiply against it **[A]** — and it is far cheaper for a solo dev than balancing 60 individual bonuses, because adding an achievement later never needs a balance pass. It also retroactively gives gold two jobs (spend it, and the count itself is power). Include Cookie Clicker's shadow-achievement escape hatch **[A]**: joke/janitorial achievements that grant a badge and no Tide.
*Effort:* M — mostly a data table plus one multiplier and a grid UI.

**12. Voyage Log: stats screen + rotating goals + Sea Life Almanac — M/L**
One panel, three tabs. *Stats:* lifetime and per-run totals, best time-to-prestige, prestige count, current seed, production graph. *Goals:* three rotating objectives that never expire and have no streak (e.g. "max a booster tile in Frozen Reach", "reach 50k kelp this run"), each paying gold; completed goals bank and a new one is drawn. *Almanac:* ~30 sea-life/flotsam entries discovered by playing, each two lines of flavor text plus a tiny permanent bonus.
*Why it works:* The documented failure mode is players who "forget what's needed for progression" **[C]**, which a stats screen and an always-visible goal list directly address; almost all of the stats already exist in save state, so this is presentation over existing data. The Almanac gives the game narrative texture without writing a story, and doubles as a collection — the collection-as-permanent-progression pattern Realm Grinder keeps across resets **[B]**. The no-expiry / no-streak rules are the ethical constraint derived from Kittens Game and Egg Inc., which drive return frequency through curve shape rather than a real-world calendar **[B]**.
*Effort:* M for stats + goals; L if the Almanac gets art. Ship stats first (S on its own) — it is the cheapest item in this document.

### Sequencing recommendation
Idea 7 (prestige gate + token curve) is a prerequisite for the value of 6, 8, 9 and 10 — without a repeatable prestige, post-prestige content is content almost nobody sees. Then 1 + 5 together (gold gets a shop and an overflow sink in the same change), then 11 (achievements feed gold and a multiplier), then 6, then the rest.

### Honest caveats for the report writer
- Every "this improves retention" claim in this document is **structural reasoning from shipped designs**, not measured. No telemetry, academic study, or GDC/Game Developer article on idle-game meta-progression was retrieved by these searches.
- "Cookie Clicker ascension seeds" as a challenge-run system could not be confirmed and should not be cited; the confirmed mechanism is Cookie Clicker's named **Born again** challenge mode **[A]**.
- Exact numeric tuning above (0.6 exponent, +0.5% ballast, 20%/30%/50% condition values) is illustrative, derived from the *shape* of cited formulas, not copied from any source.
