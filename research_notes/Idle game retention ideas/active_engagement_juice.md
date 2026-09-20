# Active-Engagement Hooks and "Game Feel"/Juice in Idle and Incremental Games

Evidence-quality labels used throughout: **[Strong]** = primary source / game's own data or a canonical talk; **[Moderate]** = community wiki or reputable secondary write-up; **[Weak]** = SEO/blog content with no methodology or named author; **[Inference]** = my reasoning, not cited.

Two Fandom wikis (Egg Inc Drones, A Dark Room Events) returned HTTP 402 and could not be fetched directly; those findings rest on search snippets and are labelled accordingly.

---

## Q1: What active-play hooks do successful idle games use, and how are they tuned to reward attention without punishing absence?

### Takeaway
The dominant pattern is a **spawned, time-limited, optional collectible** (Cookie Clicker's golden cookie, Egg Inc's drones) whose reward is either a *multiplier on the passive rate* or a *fraction of banked/stored production* — so it is always strictly additive to idling, never a gate on it. The second pattern is a **deliberate accumulator you choose when to cash in** (Cookie Clicker's wrinklers), which turns "being present" into a timing decision rather than a grind.

### Cited Findings
- **[Moderate]** Cookie Clicker (Orteil, 2013–present) golden cookies spawn on a randomised timer with a base window of **300–900 seconds**, and once spawned stay on screen **13 seconds** before disappearing — [Cookie Clicker Wiki, Golden Cookie](https://cookieclicker.wiki.gg/wiki/Golden_Cookie)
- **[Moderate]** Golden cookie effect table (base pools): **Frenzy = x7 CpS for 77 s (~40%)**; **Lucky = 15% of banked cookies + 13, capped at 15 minutes of CpS (instant, ~40%)**; **Click Frenzy = x777 per click for 13 s (~3%)**; **Building Special = N x 10% boost for 30 s (~8%)**; **Cookie Storm = spawns mini-cookies worth 1–7 minutes of CpS each, 7 s (~0.7%)**; **Blab = no effect, flavour text only (~0.003%)** — [Cookie Clicker Wiki, Golden Cookie](https://cookieclicker.wiki.gg/wiki/Golden_Cookie). Note: the percentage column is the wiki's summary of a more complex weighted pool that changes with upgrades; treat the exact percentages as approximate.
- **[Moderate]** The "Lucky" reward is explicitly **capped at 15 minutes of CpS**, and both Frenzy and Lucky scale off the player's *existing passive rate* — [Cookie Clicker Wiki, Golden Cookie](https://cookieclicker.wiki.gg/wiki/Golden_Cookie)
- **[Moderate]** Stacking golden-cookie buffs multiply each other, so combos "easily grant several days worth of CpS in a few seconds" — [Cookie Clicker Wiki, General Combo Guide](https://cookieclicker.wiki.gg/wiki/General_Combo_Guide)
- **[Moderate]** Cookie Clicker **wrinklers**: each attached wrinkler reduces CpS by **5%**, up to **10 simultaneously (14 with upgrades)**; when popped, a wrinkler returns **x1.1 the cookies it has digested** (shiny wrinklers, 0.01% spawn chance, return x3.3). The CpS penalty **has no effect on offline production**. Because the aggregate bonus "quadratically scales with the amount eating the cookie at once", players deliberately let all 10 attach before popping — [Cookie Clicker Wiki, Wrinkler](https://cookieclicker.wiki.gg/wiki/Wrinkler)
- **[Moderate]** Egg Inc (Auxbrain, 2016) **drones**: base spawn rate is roughly **142 common + 12 elite drones per hour (~154/hr)**; they fly across the screen and are tapped/swiped down. Standard drones fly a **consistent straight line**; elite drones fly a **curved path at high speed**, are rarer and pay much better. Drops are **~70% Bocks (soft currency), ~30% Golden Eggs (premium currency)** — [Egg Inc Wiki, Drones](https://egg-inc.fandom.com/wiki/Drones) (page returned HTTP 402 to direct fetch; content from search snippet), corroborated by [Tap Guides, Egg Inc Drone Guide, 2025](https://tap-guides.com/2025/10/24/egg-inc-drone-guide/)
- **[Moderate]** Kittens Game (bloodrizer, 2014) **astronomical events**: a transient phenomenon appears and the player clicks "observe" for **20–60+ science** depending on progression; certain Metaphysics upgrades and late-game buildings *increase the frequency* of these events (i.e. the reward for attention is itself an upgrade axis) — [Kittens Game Wiki, Events](https://wiki.kittensgame.com/en/general-information/events)
- **[Moderate]** Kittens Game **seasons**: four seasons of 100 days = **1,000 ticks = 200 seconds (3 m 20 s)** each; they affect catnip-field output but *not* farmer output. From Year 4, there is a **35% chance a season is abnormal (17.5% warm / 17.5% cold)** — [Kittens Game Wiki, Game Mechanics](https://wiki.kittensgame.com/en/general-information/game-mechanics)
- **[Moderate]** A Dark Room (Doublespeak Games, 2013) uses **random narrative events** — traveling merchants, beggars asking for supplies, animals killing villagers or breaking traps — plus location-specific encounters where the player chooses how to proceed. The developer of the iOS port explicitly worried about pacing, wanting to avoid players "see[ing] just a single 'stoke fire' button for too long", and playtested to find where interest was lost — [Game Developer, "A Dark Room's unique journey from the web to iOS"](https://www.gamedeveloper.com/design/-i-a-dark-room-i-s-unique-journey-from-the-web-to-ios)
- **[Moderate]** AdVenture Capitalist (Hyper Hippo, 2014) uses **milestone unlocks at 25 / 50 / 100 copies of a business**, plus "Capitalist"/global unlocks awarded when *every* business on a planet reaches a uniform milestone, which multiply all income streams — [AdVenture Capitalist Wiki, Unlocks (Earth)](https://adventure-capitalist.fandom.com/wiki/Unlocks_(Earth)). Note: in-game multipliers are **additive**, not multiplicative — [AdVenture Capitalist Help Center, "How do Multipliers work?"](https://screenzilla.helpshift.com/hc/en/5-adventure-capitalist/faq/32-how-do-multipliers-work/)
- **[Weak/Moderate]** A developer who built seven idle prototypes in 30 days (aguier, 2 Aug 2026) reports that **offline earnings at "50% of normal rate"** makes returning feel rewarded without making active play pointless, summarised as "presence should always feel superior to absence"; that new players must hit a meaningful decision within **300 seconds**; and that first automation should land by minute 3, first prestige within 10–15 minutes — [DEV Community, "I Built 7 Idle Games in 30 Days"](https://dev.to/aguier/i-built-7-idle-games-in-30-days-what-i-learned-about-incremental-design-5d3f). Single-author, self-reported, no telemetry — treat as heuristic, not evidence.
- **[Weak]** A commonly repeated rule of thumb is "aim for **60% of progress from idle, 40% from active**" — [GridInc, Idle Games Best Practices](https://gridinc.co.za/blog/idle-games-best-practices). No author, no methodology, no source given; I found **no primary source** for this split.
- **[Weak]** Design commentary that the most engaged idle players are "not playing idly" but checking back every ~15 minutes to optimise multipliers and plan prestige cycles — [Dinogame, Psychology of Idle Games](https://dinogame.gg/blog/psychology-of-idle-games/). SEO blog, unsourced.
- **[Moderate]** Machinations' design guide frames the target as "the player to feel like they are being rewarded for both the time they are playing and the time they are not playing, while still feeling they are earning those rewards", and warns that over-rewarding devalues accomplishment — [Machinations.io, How to design idle games](https://machinations.io/articles/idle-games-and-how-to-design-them)

### Inferences
- The universal anti-punishment device is **reward-by-multiplier-on-rate or reward-as-a-slice-of-stock, with a hard cap measured in minutes of production**. Cookie Clicker's Lucky cap (15 min CpS) and Cookie Storm's per-cookie value (1–7 min CpS) both express rewards in *time units of your own passive rate*. This is the single most transferable tuning rule: express every active-play reward as "X minutes of your current production", pick X ≈ 2–15, and the reward auto-scales across the whole game and never becomes mandatory.
- **Missing a spawn costs nothing in all four games examined.** Golden cookies simply vanish; Egg Inc drones fly off-screen; Kittens astronomical events expire. None deduct resources, none reset a streak. That is the line between an engagement hook and a FOMO mechanic, and it is the one the owner's "no dark patterns" constraint depends on.
- Egg Inc's **two-tier drone design (common/straight/frequent vs. elite/curved/rare)** is the cheapest way to add a skill ceiling: the same code path, one harder trajectory, a much bigger payout. Drift Away could do the same with a slow-drifting crate vs. a fast-darting fish.
- The wrinkler pattern is interesting for Drift Away specifically because it **inverts the usual direction**: it is a small *voluntary* rate sacrifice that pays out on collection. It makes "I'm here now" a decision rather than a reflex, and because it is opt-in and capped, an absent player is unaffected. A "net" or "crab pot" on a raft tile is a near-literal reskin.
- Kittens Game's trick of making **event frequency itself an upgrade** is a good sink for Drift Away's currently-useless gold: buying "more flotsam drifts by" is a reward for attention that only matters if you're present, so it can never feel compulsory.

### Gaps
- No primary developer commentary (postmortem, dev blog, GDC talk) found for Egg Inc, Idle Miner Tycoon, or Clicker Heroes on how active-play hooks were *tuned*. All available material is community wiki or SEO content.
- Could not verify the "60/40 idle-active" split from any primary or academic source; the only citation found is an unsourced blog. **Do not report it as a finding.**
- No retention telemetry (D1/D7 lift from adding a golden-cookie-style hook) found in any public source.

---

## Q2: Which juice techniques most affect perceived quality, and does game-feel research apply to low-input games?

### Takeaway
The canonical juice literature (Swink 2008, Jonasson & Purho 2012, Nijman 2013) is written for high-input action games, but the portion that transfers to idle games is large: **everything about the response to a discrete confirm** — hit-stop, easing, squash-and-stretch, particle burst, sound, screen kick — applies unchanged to "player pressed Unlock". What does *not* transfer is the input-latency half of game feel, because idle games have almost no continuous control to make responsive.

### Cited Findings
- **[Strong, via secondary]** Steve Swink's *Game Feel* (2008) defines a three-part model: **(1) real-time control, (2) simulated space, (3) polish** — the feedback-and-exaggeration layer — [Egmatic, How to Make Your Game Feel Good](https://egmatic.com/blog/how-to-make-your-game-feel-good)
- **[Strong, via secondary]** Jan Willem Nijman (Vlambeer), *The Art of Screenshake* (GDC/INDIGO 2013), is "a rapid-fire list of roughly thirty tricks" — muzzle flash, hit-stop, camera kick — used to make Nuclear Throne feel immediate — [Egmatic](https://egmatic.com/blog/how-to-make-your-game-feel-good); the talk's effect list has been reimplemented as an interactive toggle-each-effect demo — [The Art of Screenshake Recreation, DK Liao](https://dkliao.itch.io/the-art-of-screenshake-recreation) and its [effects breakdown devlog](https://dkliao.itch.io/the-art-of-screenshake-recreation/devlog/451576/quick-breakdown-of-all-the-effects)
- **[Strong, via secondary]** Martin Jonasson & Petri Purho, *Juice It or Lose It* (2012), is the canonical juice reference: a grey Breakout clone has effects layered on live on stage until it is "gleeful". Its signature techniques are **particles** (bricks exploding into dozens of bits) and **squash-and-stretch with constant volume** (flatten on impact, stretch on rebound — "wider means shorter", which the eye reads as weight) — [Are.na, Juice it or lose it](https://www.are.na/block/15185843); [talk video](https://www.youtube.com/watch?v=Fy0aCDmgnxg); [Roblog summary, Mar 2024](https://roblog.co.uk/2024/03/juicy-games/)
- **[Moderate]** Concrete parameter values: **hit-stop / freeze-frame on a heavy impact ≈ 40–80 ms**; **input buffering and coyote-time windows kept "well under 150 ms"**; **screen shake should kick the camera a few pixels and then settle fast**, with intensity scaled to event severity — [Egmatic](https://egmatic.com/blog/how-to-make-your-game-feel-good)
- **[Moderate]** "Squash and stretch ... does more for liveliness than any other" single technique; **easing curves are essential** for UI, camera and tweens because "linear motion looks mechanical and dead" — [Egmatic](https://egmatic.com/blog/how-to-make-your-game-feel-good)
- **[Moderate]** Sound "carries half the weight" of impact feedback: "a punch with no sound barely registers" — [Egmatic](https://egmatic.com/blog/how-to-make-your-game-feel-good)
- **[Moderate]** The hierarchy constraint: **"Polish cannot save input lag; it only makes a laggy game louder"** — feel must be verified on grey-box prototypes before art — [Egmatic](https://egmatic.com/blog/how-to-make-your-game-feel-good)
- **[Moderate]** Juice's four components as commonly summarised: "enemies exploding in a shower of particles, screen shudder, and other small but satisfying forms of feedback" create polish; game feel proper is "controls respond instantly, each action gives readable feedback", and juice is the exaggeration layer on top — [Egmatic](https://egmatic.com/blog/how-to-make-your-game-feel-good)
- **[Moderate]** The juice principles are lifted directly from **Disney's 12 Principles of Animation** (Thomas & Johnston) — squash, stretch, anticipation, follow-through — [Egmatic](https://egmatic.com/blog/how-to-make-your-game-feel-good)

### Inferences
- **Drift Away's input model makes the polish layer *more* important, not less.** Swink's layer (1), real-time control, barely exists here — there is no avatar, no latency to hide. That means essentially all perceived quality lives in layer (3). A game with two buttons has two moments to make excellent, which is a far cheaper polish budget than a platformer.
- **Hit-stop maps directly to Unlock/Level Up.** A 40–80 ms freeze of the whole simulation (pause the production tick, pause camera drift) on the frame the unlock lands, followed by the burst, is one of the highest-value/lowest-cost changes available: about ten lines, and it is the specific technique that makes a confirm "land".
- **Squash-and-stretch applies to a hex tile rising out of water.** Constant-volume deformation on the tile mesh as it emerges (scale.y up + scale.x/z down, then overshoot back) is the single technique the sources rate highest for liveliness, and Three.js gives it to you for free via `mesh.scale`.
- **Escalation is the missing axis in most hobby idle games.** Nijman's list is not thirty independent effects; it is an intensity ladder. Drift Away already has one unlock burst — the upgrade is to make the 1st, 20th and 72nd unlock feel measurably different (bigger ring, longer freeze, higher chord, more particles, brighter flash), which costs one `intensity` parameter threaded through existing code.
- Since the game already synthesises audio, **pitch randomisation (±2–5%) per resource popup and a rising scale-degree chord for successive level-ups** is essentially free and is the "half the weight" the sources attribute to sound.

### Gaps
- No study or experiment quantifying juice's effect on *retention* (as opposed to perceived quality) in idle games specifically. All claims here are craft consensus from talks, not measured.
- The 40–80 ms hit-stop figure comes from a secondary summary rather than from Nijman's own slides; I could not retrieve primary slide text. One other secondary source cited "60–80 ms" for a destructive confirm ([valdemird.com, "Game feel on the web"](https://valdemird.com/blog/game-feel-on-the-web/)) but that URL returned **HTTP 404** on fetch and only the search snippet was available — the two ranges roughly agree, so ~50–80 ms is a safe design target, but neither figure is primary.

---

## Q3: How do idle games make the numbers themselves satisfying?

### Takeaway
Three levers: **notation that stays readable as magnitudes explode**, **a visible rate (per-second/per-minute) shown alongside the stock**, and **a progress bar or countdown toward the next discrete unlock**. The genre's entire value proposition reduces to "numbers go up", so the number display *is* the core UI, not chrome.

### Cited Findings
- **[Strong]** The incremental genre is defined by "the incremental accumulation of in-game resources and gradual, often exponential progression"; values are "often expressed in scientific notation, shorthand formats (e.g. '1T' for trillion), or special naming schemes for extremely large numbers" — [Wikipedia, Incremental game](https://en.wikipedia.org/wiki/Incremental_game)
- **[Strong]** `swarm-numberformat` (Evan Rosson, built for Swarm Simulator) is a purpose-built library offering **standard ("10.000 billion"), scientific ("1.0000e10") and engineering ("10.000E9")** formats, and notes players have strong and differing preferences — a **format toggle in settings** is the practical answer — [GitHub, erosson/swarm-numberformat](https://github.com/erosson/swarm-numberformat)
- **[Moderate]** InnoGames' engineering blog covers the floating-point problem: idle games exceed the precision of standard number types and need either a mantissa/exponent representation or a big-number library — [InnoGames Blog, "Dealing with huge numbers in idle games"](https://blog.innogames.com/dealing-with-huge-numbers-in-idle-games/)
- **[Moderate]** Practical shorthand approach for a small dev: keep the raw value, format at display time with a suffix table (K/M/B/T/aa/ab...), and only switch to a big-number library when doubles actually break — [Construct, "Easy way to format big numbers for idle/incremental games"](https://www.construct.net/en/tutorials/easy-format-big-numbers-idle-2549)
- **[Moderate]** Machinations' guidance names an explicit UI requirement: show the player "how much resources or currency they are able to generate in a **per minute or per hour cycle**", because players are motivated by watching "those sweet sweet numbers continue to go up" — [Machinations.io](https://machinations.io/articles/idle-games-and-how-to-design-them)
- **[Weak/Moderate]** Exponential cost curves (a **1.15x multiplier per level**, the AdVenture-Capitalist-style convention) are recommended over linear costs because linear costs "create engagement drops"/dead zones — [DEV Community, aguier, Aug 2026](https://dev.to/aguier/i-built-7-idle-games-in-30-days-what-i-learned-about-incremental-design-5d3f)
- **[Moderate]** Milestone fanfare in AdVenture Capitalist is tied to **round, announced thresholds (25/50/100)** and to a **completionist "every business at N" global unlock** — the numbers are chosen to be legible targets, not arbitrary — [AdVenture Capitalist Wiki, Unlocks (Earth)](https://adventure-capitalist.fandom.com/wiki/Unlocks_(Earth))
- **[Moderate]** Cookie Clicker expresses transient rewards **in units of the player's own rate** ("15 minutes of CpS", "1–7 minutes of CpS"), making the reward self-describing at every stage of the game — [Cookie Clicker Wiki, Golden Cookie](https://cookieclicker.wiki.gg/wiki/Golden_Cookie)

### Inferences
- **Drift Away does not have a big-number problem.** With 72 tiles at 1/sec, x2 tile levels, booster percentages and +10% prestige upgrades, lifetime totals will sit in the millions-to-billions range, well inside a JS double. That means the entire "huge numbers" branch of this literature is *not* a cost the project has to pay — a ~15-line K/M/B/T formatter is sufficient and a big-number library would be wasted effort.
- The **highest-value number work for this game is rate display, not magnitude display**: "fish 12.4/s (+18% from boosters)" tells the player what every decision did, and is the readout that makes booster tiles feel meaningful. Right now a booster tile's contribution is invisible, which is the likeliest reason boosters feel less satisfying than producers.
- **A countdown, not just a bar.** Because unlock costs are known and rates are known, Drift Away can show "next unlock in 4 m 12 s" exactly. That converts the bar from a vague fill into a commitment device and gives a natural reason to stay for one more tile — which is the goal-gradient effect the genre runs on. (Goal-gradient itself I could not source in a game-design context; treat as design rationale, not cited fact.)
- **Tweened/odometer counters matter more here than formatting.** A counter that eases toward its true value over ~250–400 ms instead of snapping reads as momentum; the sources' "linear motion looks mechanical and dead" applies to numerals as much as to meshes.

### Gaps
- No source found comparing player preference between notation styles with data; `swarm-numberformat` implies preferences differ but offers no numbers.
- No source found on the perceptual effect of animated/odometer counters specifically. That recommendation is craft inference from the easing literature in Q2, not a cited finding.

---

## Q4: What ambient life/atmosphere techniques keep a mostly-watched screen interesting, and which are cheap in Three.js?

### Takeaway
The cited precedent for ambient systems in idle games is thin but consistent: **Kittens Game's seasons/weather** and **A Dark Room's event drip** both exist to make a static screen change over time without requiring input. For the Three.js implementation side I found no usable sources within budget — the recommendations below are engineering judgement and are labelled as such.

### Cited Findings
- **[Moderate]** Kittens Game runs a **visible, mechanically-meaningful season cycle** — 4 seasons x 200 s, with a 35% chance from Year 4 that a season is abnormally warm or cold — so the world state visibly changes on a ~3-minute cadence even when the player does nothing — [Kittens Game Wiki, Game Mechanics](https://wiki.kittensgame.com/en/general-information/game-mechanics)
- **[Moderate]** Kittens Game's **astronomical events** are the atmospheric equivalent of a collectible: a transient sky phenomenon that also pays out if observed — [Kittens Game Wiki, Events](https://wiki.kittensgame.com/en/general-information/events)
- **[Moderate]** A Dark Room's ambience is **textual**: random merchants, beggars and hazards fire as narrative interruptions, and the developer explicitly used them to solve the "staring at one button" pacing problem — [Game Developer, A Dark Room's journey to iOS](https://www.gamedeveloper.com/design/-i-a-dark-room-i-s-unique-journey-from-the-web-to-ios)
- **[Moderate]** Egg Inc's farm is kept visually alive by **continuously spawning entities that cross the screen** (~154 drones/hour) independent of any player action — [Egg Inc Wiki, Drones](https://egg-inc.fandom.com/wiki/Drones) (402 on direct fetch; search snippet)
- **[Moderate]** The juice literature's relevant principle here is that **exaggeration and continuous motion read as "alive"**, and that constant-volume squash/stretch is the cheapest way to get it — [Are.na, Juice it or lose it](https://www.are.na/block/15185843)

### Inferences
*(All of the following are my engineering judgement for a vanilla-JS + Three.js, procedural-assets-only project — not cited findings.)*
- **Cheapest per unit of perceived life, in rough order:**
  1. **Per-tile bob/sway** — offset each raft tile's `position.y` and `rotation.z` by `sin(t * w + phase)` with a per-tile random phase. ~10 lines in the existing render loop, zero new geometry, and it is the single change that turns "a grid of static hexes" into "a raft on water".
  2. **Sky/water colour ramp over a day cycle** — lerp fog colour, water colour, directional-light colour and intensity through 4–6 keyframes. No new draw calls at all; it is a colour lerp on objects that already exist.
  3. **Ambient crossers** — 3–8 instanced low-poly birds/fish on looping spline paths, `InstancedMesh` so it is one draw call. Doubles as the spawn system for an active-play collectible (Q1), so the cost is shared.
  4. **Vertex-shader sway for kelp/crops** — a small `onBeforeCompile` patch adding `sin` displacement scaled by vertex height. One shader injection covers every kelp and crop tile on the raft.
  5. **Weather as a particle sheet + colour shift** — rain as a single `Points` cloud with a scrolling y and a darker fog colour; visually reads as a whole weather system for the cost of one buffer.
  6. **Water motion** — if the water plane already animates, adding a second, slower normal/offset layer at a different frequency is a one-line change that removes the "single repeating wave" tell.
- **Most expensive / worst ratio:** real reflections, dynamic shadows from many lights, per-tile idle animation rigs, and any system needing authored assets. All violate the "procedural only, one developer" constraint.
- **Tie ambience to mechanics or it will be ignored.** Kittens Game's seasons matter because they change catnip yields. A Drift Away day/night cycle that changes nothing is decoration; one where night biases fish and storms bias driftwood gives the player a reason to look at the sky, at no extra rendering cost.
- **Respect `prefers-reduced-motion`** and give a single "reduce motion" toggle — bob, shake and particles are exactly the effects that cause discomfort, and an idle game is left open for hours.

### Gaps
- I found **no reliable source** on Three.js-specific cost of these effects within the research budget, and no idle-game postmortem discussing ambient visuals. The ordering above is unsourced engineering judgement and should be presented as such in the final report.
- No source found on whether ambient atmosphere measurably affects idle-game retention. I would treat it as a quality/taste investment, not a retention lever.

---

## Q5: Which techniques are the highest value per unit of effort for a one-person hobby project?

### Takeaway
Rank by **(moments affected) x (times seen per session) / (lines of code)**. That puts *escalating feedback on the two existing buttons* and *rate/progress readouts* at the top, a *single optional collectible* in the middle, and *new systems with their own state and balance* (mini-games, multi-event frameworks) at the bottom.

### Cited Findings
- **[Moderate]** "Polish cannot save input lag; it only makes a laggy game louder" — polish is a multiplier on an already-working loop, which the owner states Drift Away has — [Egmatic](https://egmatic.com/blog/how-to-make-your-game-feel-good)
- **[Moderate]** The juice talks' own method is **incremental layering on an existing grey prototype**, one effect at a time, with each effect independently toggleable — the recreation of *The Art of Screenshake* is literally built as a per-effect toggle list — [DK Liao, Art of Screenshake Recreation](https://dkliao.itch.io/the-art-of-screenshake-recreation/devlog/451576/quick-breakdown-of-all-the-effects)
- **[Moderate]** Cookie Clicker's golden cookie is **one spawner, one timer, one buff-multiplier field** applied to the existing CpS calculation — the entire active-play layer of the best-known idle game is a small amount of code hanging off an existing rate variable — [Cookie Clicker Wiki, Golden Cookie](https://cookieclicker.wiki.gg/wiki/Golden_Cookie)
- **[Weak/Moderate]** All seven of the prototypes in the 30-day experiment were kept **under 30 KB of vanilla JavaScript**, with the author arguing tight design beat framework convenience — evidence that idle-game feel does not require scale — [DEV Community, aguier, Aug 2026](https://dev.to/aguier/i-built-7-idle-games-in-30-days-what-i-learned-about-incremental-design-5d3f)

### Inferences
- **Tier 1 (do first, hours not days):** hit-stop + squash/stretch + escalating audio on Unlock and Level Up; per-second rate display with booster contribution; "next unlock in mm:ss" progress bar; tweened number counters; per-tile bob. These touch every single interaction in the game and add no new state to save, balance or migrate.
- **Tier 2 (a weekend each):** one drifting collectible with a rate-relative capped reward; a gold sink; a stats/log screen; day/night colour ramp tied to a small production bias.
- **Tier 3 (avoid for now):** mini-games, branching random-event frameworks, anything with its own economy. These add balance surface and save-migration cost, and the sources give no evidence they outperform Tier 1 for enjoyment.
- The **save-format cost is the hidden tax**: every Tier 2/3 idea adds fields to localStorage that must survive future versions. Tier 1 ideas add none. For a solo dev with no backend, that asymmetry is larger than the coding time itself.

### Gaps
- No cost/benefit data exists for any of this; the ranking is reasoned from the sources' own descriptions of implementation scope, not measured.

---

## Idea Candidates for Drift Away

*(Requested deliverable. Effort: S = a few hours, M = a weekend, L = longer. Each ties back to a named precedent above.)*

1. **Unlock/Level-Up impact pass** — On confirm: freeze the production tick and camera for ~60 ms, squash-and-stretch the hex as it rises (constant volume, elastic overshoot), ring ripple on the water, brief screen kick of a few pixels that settles fast. *Why:* hit-stop at 40–80 ms plus squash-and-stretch are the two techniques the game-feel sources rate highest, and these are the only two buttons in the game. *Effort: S.*

2. **Escalation ladder on that same pass** — Thread one `intensity` value (scaled by tile index / zone / level) through the existing burst, sound and shake so unlock #1, #30 and #72 feel visibly and audibly different; chord rises by scale degree as the raft grows. *Why:* Nijman's thirty tricks are an intensity ladder, not thirty features; the audio is already synthesised so pitch is free. *Effort: S.*

3. **Live rate HUD with booster attribution** — Show "fish 12.4/s (+18% boosters)" per resource, and on tile select show that tile's own contribution. *Why:* Machinations names a per-minute/per-hour readout as a core motivator, and booster tiles currently have invisible effects. *Effort: S.*

4. **"Next unlock in 4 m 12 s" bar** — Progress bar plus exact ETA on the cheapest reachable adjacent tile, since cost and rate are both known. *Why:* converts a vague fill into a reason to stay one more tile; AdVenture Capitalist's legible thresholds do the same job. *Effort: S.*

5. **Odometer counters + compact formatting** — Ease displayed totals toward their true value over ~300 ms; K/M/B/T suffixes at display time only, with a settings toggle for raw numbers. *Why:* "linear motion looks mechanical and dead"; the genre's own formatting library exists because players' notation preferences differ. Drift Away's magnitudes stay inside a JS double, so no big-number library is needed. *Effort: S.*

6. **Drifting flotsam (golden-cookie analogue)** — Every 4–12 minutes a crate/glass float drifts across the sea on a spline; click it within ~13 s for either a timed x3–x7 raft-wide buff (60–90 s) or an instant bundle worth **2–10 minutes of current production**. Ignoring it costs nothing; it simply drifts off. *Why:* directly mirrors Cookie Clicker's 300–900 s spawn / 13 s window / Frenzy-or-Lucky split, with rewards expressed in minutes-of-your-own-rate so they never need rebalancing. *Effort: M.*

7. **Two-tier crossers: slow crate vs. darting fish shoal** — Same spawner, second trajectory: a fast curved shoal that is harder to click and pays several times more. *Why:* Egg Inc's standard-vs-elite drone split adds a skill ceiling for one extra trajectory function. *Effort: S on top of #6.*

8. **Crab pots / drying nets ("harvest now")** — A tile can hang a net that diverts a small slice of its output into the net; pulling it up returns the stored amount at **x1.15**, with a cap of ~30 minutes' worth. Opt-in, and the diversion pauses while offline. *Why:* a direct reskin of wrinklers (5% CpS each, x1.1 on pop, no offline effect) — it makes being present a *timing decision* rather than a reflex, and absence is unaffected. *Effort: M.*

9. **Give gold a job: the Lighthouse** — Spend achievement gold on permanent, non-compulsory perks: flotsam drifts by more often, +1 h offline cap, net capacity, plus purely cosmetic raft decorations (lantern, flag, weather vane, gull perch). *Why:* gold is currently a dead counter, and Kittens Game makes *event frequency itself* an upgrade — an upgrade that only pays out when you're present can never feel mandatory. *Effort: M.*

10. **Day/night + weather with a light mechanical bias** — Lerp sky/fog/water/light through a ~20-minute cycle; occasional rain (one `Points` sheet + darker fog) and calm. Night slightly favours fish, storms slightly favour driftwood, calm favours crops — small percentages, no punishment. *Why:* Kittens Game's seasons work because they are visible *and* mechanically real; the whole visual side is a colour lerp on existing objects. *Effort: M.*

11. **Ambient life layer** — Per-tile bob/sway on a sine with random phase, vertex-shader wobble for kelp and crops, 3–8 instanced gulls/fish on looping paths, a second slower wave layer on the water. Gated by a reduce-motion toggle. *Why:* cheapest possible "the world is alive" signal; Egg Inc keeps its farm alive purely with entities crossing the screen. Reuses the spawner from #6. *Effort: S–M.*

12. **Message in a bottle + Voyage Log** — Rare bottles drift past carrying a one-line snippet about the sea and a small reward; every snippet found is kept in a Log screen alongside lifetime totals, best rates, session summary and tile roster. *Why:* A Dark Room solved "staring at one button" with a narrative drip, and the log doubles as the stats screen the game currently lacks — one screen, two problems. *Effort: M.*

**Suggested build order:** 1 → 3 → 5 → 4 → 2 (all Tier 1, no new save state), then 11 → 6 → 7 → 9, then 8 → 10 → 12.
