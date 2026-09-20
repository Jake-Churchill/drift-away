# Cozy Tile-Placement, Island/Raft, Farming and City-Builder Games: Lessons for a Hex-Tile Idle Game

Evidence quality labels used throughout: **[Strong]** = primary source (developer talk/interview, official docs, published research with method disclosed); **[Moderate]** = reputable secondary journalism, detailed wiki/review, or industry research seen only in search snippet; **[Weak]** = blog/aggregator with no named author or no method.

---

## Q1. What makes Dorfromantik, Islanders, Townscaper, Terra Nil, Raft, Stardew Valley, Animal Crossing and cozy idle games sticky? Which specific mechanics drive "one more turn"?

### Takeaway
Across these games the "one more turn" feeling comes from a *short, legible, always-available micro-decision* whose payoff is both numeric and visual, wrapped in an explicit promise of safety (no fail state, no punishment). Dorfromantik and Cookie Clicker show the two ends of the same trick: a small placement/purchase that immediately (a) moves a number, (b) changes the picture, and (c) sometimes gives you *another* one for free.

### Cited Findings

**Coziness as a design target (the theoretical frame)**
- Coziness in games is defined by Tanya X. Short and the Project Horseshoe design group (2017) as "the fantasy of safety, abundance, and softness" — safety = physical/emotional/social risk minimised; abundance = lower-level needs met, nothing lacking or pressing; softness = gentle, comforting stimuli. **[Strong]** — [Game Developer, "Designing for Coziness"](https://www.gamedeveloper.com/design/designing-for-coziness)
- The same source prescribes: intrinsic satisfaction through *opt-in* activities (fishing, collecting, tidying, crafting); avoid extrinsic rewards that undermine the experience; warm low-contrast colour, enclosed intimate spaces, natural materials, clear refuge from outside danger — with "windows to the outside world" for contrast. **[Strong]** — [Game Developer, "Designing for Coziness"](https://www.gamedeveloper.com/design/designing-for-coziness)
- Survey research on cozy players reports the top reasons for playing: switching off from everyday stress/anxiety (53%), getting lost in a world you play at your own pace (52%), feeling calmer / improved mood (51%). **[Moderate — industry survey seen in search snippet, methodology page not fetched]** — [Bryter, "Cozy games: Why comfort-first play is becoming a major force"](https://www.bryter-global.com/blog/the-rise-of-cozy-gaming)

**Dorfromantik (Toukana Interactive, 2021/2022) — the closest mechanical cousin**
- Core loop: place hex tiles, match terrain edges. 10 points per matching edge. When *all six* edges match it becomes a "perfect tile" worth 60 points **plus a bonus free tile**. **[Moderate — detailed review, Morgan Shaver, 3 May 2022]** — [Shacknews review](https://www.shacknews.com/article/130138/dorfromantik-review-peaceful-puzzler-that-makes-you-feel-right-at-home)
- Quests: villages/houses issue missions in two flavours — "plus quests" (exceed a minimum) and "exact quests" (hit a precise number). Completing = 100 points; closing = 50 more. **[Moderate]** — [Shacknews review](https://www.shacknews.com/article/130138/dorfromantik-review-peaceful-puzzler-that-makes-you-feel-right-at-home)
- Placement rules are deliberately lax: terrain does not have to match tile-to-tile, only railroads and rivers must connect — the developers' stated commitment to a relaxing experience. **[Moderate]** — [Shacknews review](https://www.shacknews.com/article/130138/dorfromantik-review-peaceful-puzzler-that-makes-you-feel-right-at-home)
- Meta-progression is a challenge/reward ladder: ~85 challenge levels as of April 2023; completing tiers of the "Landscaper" challenge unlocks new biomes; other challenges are unlocked by *finding white-outlined hexagons on the field* — placing a tile adjacent to one reveals it and spawns a "crown quest", whose completion unlocks a new challenge. Milestones tracked include tiles placed, quests completed, biomes unlocked, and rewards include new tile types, landscapes and visual effects. **[Moderate — community wiki + guide aggregation]** — [TheGamer biome guide](https://www.thegamer.com/dorfromantik-biomes-all-unlock-how-get-choose-guide/); [Dorfromantik Wiki: Challenges](https://dorfromantik.fandom.com/wiki/Challenges)
- Developer intent: four German/Swiss students founded Toukana explicitly to make a peaceful, minimalist game with a *low barrier to entry*, reasoning that people with stressful lives cannot invest hundreds of hours, so lower complexity creates more relaxed experiences. **[Moderate — developer interview]** — [Digital Trends interview](https://www.digitaltrends.com/gaming/dorfromantik-interview/)
- Sessions run ~30–40 minutes and "melt away" because of the "hypnotic", "almost-tactile" loop. **[Moderate]** — [Shacknews review](https://www.shacknews.com/article/130138/dorfromantik-review-peaceful-puzzler-that-makes-you-feel-right-at-home)

**Townscaper (Oskar Stålberg, 2020/2021) — the "toy" end of the spectrum**
- Stålberg frames Townscaper as a *toy*, not a game: no explicit objectives, no fail states, no win conditions. The player has minimal control — place/remove a block, pick a colour — and that constraint is what enables creative freedom. **[Strong — Game Developer feature by Tommy Thompson, 6 April 2022, built on Stålberg's own talks]** — [How Townscaper Works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)
- Engagement is sustained by *visual delight and emergent detail*: procedurally placed windows, chimneys, and hidden architectural "recipes" that reward discovery. The muted Scandinavian palette (Copenhagen/Stockholm) gives coherence without overwhelming detail at distance. **[Strong]** — [How Townscaper Works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)
- Technical spine: irregular (relaxed quadrilateral) grid, Wave Function Collapse for module adjacency with per-module *priority* (so e.g. gardens only appear under specific conditions), marching cubes for corner geometry. The system "fails silently" when constraints can't be satisfied rather than restarting. **[Strong]** — [How Townscaper Works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)
- Stålberg has publicly characterised the approach as "radically casual" design that a wave of low-stress builders is now adapting. **[Moderate — PC Gamer headline/claim; article body could not be fetched]** — [PC Gamer](https://www.pcgamer.com/townscapers-developer-on-how-its-radically-casual-design-is-inspiring-a-new-wave-of-low-stress-builders-to-adapt-the-blueprint/)

**Islanders (GrizzlyGames, 2019)**
- Built by three people in four months as a university project (HTW Berlin); each prototype was limited to one day of development. Simplicity was "born out of necessity" but became "one of the core pillars of our philosophy" (Friedemann Allmenröder). **[Strong — developer interview, 14 June 2019]** — [Game World Observer](https://gameworldobserver.com/2019/06/14/islanders)
- Simplification anecdote worth copying: they cut a day-cycle progression system entirely and "just… give you more buildings for more points", simplifying the game further. **[Strong]** — [Game World Observer](https://gameworldobserver.com/2019/06/14/islanders)
- Procedural island generation kept mechanics simple while providing enough variety for repeat sessions. **[Moderate]** — [Game World Observer summary](https://medium.com/game-world-observer/strategic-minimalism-behind-indie-hit-islanders-e45180827514)
- Design goal of short sessions that deliver "value" without requiring "40 hours to get value". **[Strong]** — [Game World Observer](https://gameworldobserver.com/2019/06/14/islanders)

**Terra Nil (Free Lives, 2023)**
- Originated in a Ludum Dare jam on the theme "start with nothing"; designer Sam Alfred's stated thesis is that nature "is not valuable for what it can give you, it is valuable because of its very existence" — i.e. the reward is the *state of the world*, not an accumulating score. **[Moderate — Game Developer design feature]** — [Why a recycling mechanic saved Terra Nil's climate cleanup design](https://www.gamedeveloper.com/design/why-a-recycling-mechanic-saved-terra-nil-s-climate-cleanup-mechanics)
- Ending design problem and fix: early builds always ended with "too many buildings"; the epiphany was "if we have too many buildings, we've got to take the buildings away" — the final act is recycling your own infrastructure into an airship and leaving no trace. **[Moderate]** — [Game Developer](https://www.gamedeveloper.com/design/why-a-recycling-mechanic-saved-terra-nil-s-climate-cleanup-mechanics)

**Animal Crossing (Nintendo) — the retention pattern**
- Players form affective attachment *because of* repeated daily sessions that the temporal design promotes; time spent designing islands "corresponds to and reinforces their affective attachment to them". **[Strong — peer-reviewed CHI PLAY paper on ACNH temporal design]** — [ACM DL: Essential Escapism through Progress Simulation](https://dl.acm.org/doi/fullHtml/10.1145/3641237.3691689)
- The daily-task set (fishing, insects, gardening, neighbour relationships) is simple, repetitive and non-threatening, providing structured routine and encouraging return "every day — even just for a little bit". **[Moderate — academic/analysis sources]** — [Journal of Intercultural Studies](https://www.tandfonline.com/doi/full/10.1080/07256868.2022.2134318)

**Idle/incremental games (Cookie Clicker, Kittens Game and the genre)**
- Genre definition: incremental accumulation of resources and gradual, often exponential progression through repetitive actions or automation; a soft currency rises even when not playing, and is spent on upgrades that raise the accumulation rate. **[Strong — encyclopedic]** — [Wikipedia: Incremental game](https://en.wikipedia.org/wiki/Incremental_game)
- Offline earnings are the genre's defining innovation: on return the player gets immediate evidence that "your earlier decisions were still working even while you were away". **[Weak — unattributed design blog]** — [Missions Zanx: Idle Game Design](https://missionszanx.com/guides/idle-game-design-systems-mechanics-and-progression)
- Prestige (resetting for permanent bonuses) is described as "the retention engine" — without it players hit a wall and quit. **[Weak — unattributed design blog]** — [Missions Zanx](https://missionszanx.com/guides/idle-game-design-systems-mechanics-and-progression)
- Check-in behaviour is attributed to operant conditioning / variable reward schedules, which drive *session frequency*, not session length. **[Weak — popular-psychology blogs, no study cited]** — [Dinogame, Psychology of Idle Games](https://dinogame.gg/blog/psychology-of-idle-games/)
- Cookie Clicker turns achievements into a *production multiplier*: 622 achievements, each granting +1% "milk", which the "Kitten" upgrade line converts into a large CpS multiplier. "Shadow achievements" (deemed too unfair/difficult) are excluded from that multiplier. **[Moderate — detailed game wiki]** — [Cookie Clicker Wiki: Achievement](https://cookieclicker.fandom.com/wiki/Achievement)
- Because the core loop is thin, idle games need a *meta* loop of multiple interacting mechanics introduced gradually so players keep changing strategy. **[Moderate — design-tooling company article]** — [Machinations: How to design idle games](https://machinations.io/articles/idle-games-and-how-to-design-them)

**Player motivation data**
- Quantic Foundry's Gamer Motivation Model is built on 400,000+ gamers (a later cohort cites 466,000+ aged 13–64, Jan 2023–Apr 2025, unincentivised). The relevant motivations: **Design** (expression and deep customisation) and **Discovery** (explore, tinker, experiment) form the *Creativity* pair; **Completion** (finish every mission, get every collectible, find every hidden thing) sits in the Achievement cluster. **[Strong]** — [Quantic Foundry, Gamer Motivation Model](https://quanticfoundry.com/gamer-motivation-model/); [Model reference sheets PDF](https://quanticfoundry.com/wp-content/uploads/2019/04/Gamer-Motivation-Model-Reference.pdf)

### Inferences
- The single highest-leverage "one more" mechanic in Dorfromantik is the **perfect tile → free tile** rule: a well-judged action literally hands you the resource for the next action, so the loop never stalls. Drift Away has a direct analogue available (a great unlock refunds part of its cost, or grants a token toward the next unlock) that costs almost nothing to implement.
- Drift Away currently has the idle genre's *accumulation* but arguably not its *meta loop*. Dorfromantik's challenge ladder and Cookie Clicker's achievement→multiplier conversion are both cheap ways to add a second progression axis on top of 72 tile unlocks without adding new simulation.
- Townscaper and Islanders converge on the same lesson: a hobbyist-scale team wins by *removing* systems and putting the saved effort into the visual payoff of a single action. Islanders literally deleted its day-cycle to simplify. That argues against adding several of the ideas below at once.
- Terra Nil's "the world-state is the reward" and Animal Crossing's "attachment scales with time spent shaping" both point the same way for Drift Away: attachment will come from the raft looking like *the player's* raft, which is the thing the fixed layout currently prevents.

### Gaps
- I could not verify Islanders' actual proximity/adjacency scoring numbers: the developer interview explicitly does **not** explain the placement scoring system, proximity bonuses/penalties, or island score thresholds, and I found no primary source for them in this pass. Treat any specific Islanders adjacency numbers as unverified.
- I found no developer postmortem or interview for **Raft** (Redbeet Interactive) in this pass, so no citable claims about why its raft-expansion loop is sticky.
- No primary Stardew Valley design interview surfaced that discusses the "one more day" loop mechanically; the interviews found (Nintendo Life, IGN, PC Gamer) are retrospective/career interviews. No citable Eric Barone quote on loop design.
- Quantic Foundry has no publicly indexed genre profile specifically for farming sims that I could retrieve; the motivation definitions are solid but the genre-to-motivation mapping is behind their Insight Report.

---

## Q2. How do these games create spatial puzzles or player expression? What would adjacency or choice add to a fixed-layout raft, and how have idle games added them without breaking idleness?

### Takeaway
Every game in this set gives the player a *choice with a visible consequence*: Dorfromantik chooses rotation and location, Townscaper chooses shape and colour, Islanders chooses proximity. Drift Away currently offers order-of-unlock only, which is a choice about *sequence* rather than *arrangement* — and the cheapest fixes are (a) rotation/orientation of otherwise-fixed tiles and (b) a small hand of offered tile types per slot, both of which preserve idleness because they are decided once at unlock time and then run themselves.

### Cited Findings
- **Design** (expression/deep customisation) and **Discovery** (explore, tinker, experiment) are a distinct motivational pair in Quantic Foundry's model, separate from Achievement — meaning a game that only serves numeric progression is leaving a whole motivational cluster unserved. **[Strong]** — [Quantic Foundry](https://quanticfoundry.com/gamer-motivation-model/)
- Self-expression is repeatedly identified as the mechanism by which cozy games hold players — "cozy games provide a powerful and accessible outlet for it by giving players tools to shape the world around them". **[Moderate — trade/analysis writing, no study]** — [Bryter](https://www.bryter-global.com/blog/the-rise-of-cozy-gaming)
- Townscaper proves the *minimum viable expression set*: place block, remove block, choose colour — nothing else. That is the whole verb list, and it was enough to sustain a hit. **[Strong]** — [How Townscaper Works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)
- Townscaper's hidden "recipes" — specific architectural sequences that produce special structures — are an explicit reward for tinkering, i.e. Discovery layered on top of Design. **[Strong]** — [How Townscaper Works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)
- Dorfromantik's constraint is deliberately soft: only rivers and railroads *must* connect; terrain matching is optional and merely scores. This makes layout a scoring opportunity rather than a failure condition. **[Moderate]** — [Shacknews](https://www.shacknews.com/article/130138/dorfromantik-review-peaceful-puzzler-that-makes-you-feel-right-at-home)
- Idle games *have* adopted grid adjacency: **Idle Grid** (Steam, 2024) is built on "placing upgrades matters — adjacent bonuses and tile synergy add a new layer of challenge", i.e. arranging upgrades on a grid to optimise adjacency and resource flow rather than only buying them. **[Moderate — store/devlog description, no postmortem]** — [Idle Grid on Steam](https://store.steampowered.com/app/2940220/Idle_Grid/); [developer devlog](https://laophy.itch.io/idle-grid/devlog/865958/releasing-my-first-steam-game-idle-grid-a-new-incremental-with-grid-based-strategy)
- **WorldShaper Idle** uses a "surround to specialise" rule: village types are determined by which tiles surround them, unlocking unique production bonuses. **[Moderate — itch.io project page]** — [WorldShaper Idle](https://flori9.itch.io/worldshaper-idle)
- The generic guidance for idle meta-design is not to rely on one mechanic but on "multiple interacting mechanics that players are slowly introduced to… encourage them to constantly change their strategies". **[Moderate]** — [Machinations](https://machinations.io/articles/idle-games-and-how-to-design-them)
- Townscaper's WFC implementation assigns *priority* to modules so decorative elements appear only under specific conditions — a pattern directly reusable for "this prop only appears when neighbours qualify". **[Strong]** — [How Townscaper Works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)

### Inferences
- Adjacency bonuses are *idle-compatible* because they are evaluated once on state change, not per frame: a raft-wide recompute of 72 tiles on unlock/level-up is trivially cheap, and offline accrual just uses the stored total rate. Nothing about adjacency forces active play.
- The two lowest-risk ways to add real choice to a fixed layout, in order of cost:
  1. **Rotation/facing.** Keep tile identity and position fixed, but let the player rotate the hex. Give each tile one "outflow" edge (a rope bridge, a net line, a current) that grants a bonus to whichever neighbour it points at. This adds a genuine spatial decision, is reversible (so it is low-stakes and cozy-safe), needs one integer per tile in the save, and is visually self-explaining because the prop physically points somewhere.
  2. **A hand of offerings per slot.** Instead of each slot having one predetermined identity, offer 2–3 candidate tile types when a slot is unlocked (Dorfromantik's "you get the tile you get, but you choose where/how" inverted into "you choose what"). Determinism is preserved by seeding the offer from the slot index, so layouts stay authored and balanced.
- A third, cheaper-than-both option is **decoration as a separate layer**: cosmetic props with zero mechanical effect that the player earns and places anywhere. Townscaper's colour picker is proof that a purely cosmetic verb carries real weight. This is the only option that adds zero balance risk.
- Townscaper's "recipes" translate cleanly to a raft: certain *combinations* of adjacent tiles at level 3 spawn a unique, un-hinted structure (a gull-covered mast, a wind-chime buoy). Discovery content at the cost of a lookup table.

### Gaps
- I found no developer postmortem for any idle game that *added* adjacency after launch, so there is no citable evidence about how existing players reacted to that change. Idle Grid and WorldShaper Idle shipped with it.
- No source quantifies how much adjacency complexity is "too much" for a cozy audience; the Islanders and Townscaper evidence is directional (less is more) but not measured.

---

## Q3. Which ambient-life and reactive-world features most improve attachment, and what is the cheapest way to build them in Three.js?

### Takeaway
The cozy literature is explicit that ambience is not decoration — "softness" (gentle stimuli) is one of three named pillars of coziness, and cozy design specifically recommends enclosed, safe space with "windows to the outside world" for contrast. For a raft on an open sea that maps directly onto seabirds, fish schools and weather. In Three.js all of it is affordable via `InstancedMesh` plus a single shared time uniform; Three ships an official flocking example you can crib.

### Cited Findings
- The Project Horseshoe cozy pillars include **softness** — "stimuli remain gentle and comforting, reducing stress" — and the recommended aesthetic includes "natural materials" and "windows to the outside world for contrast". **[Strong]** — [Game Developer, "Designing for Coziness"](https://www.gamedeveloper.com/design/designing-for-coziness)
- Cozy players' stated top motivations are calming/mood (51%) and pace-setting immersion (52%) — both served by ambience rather than systems. **[Moderate — search snippet]** — [Bryter](https://www.bryter-global.com/blog/the-rise-of-cozy-gaming)
- Animal Crossing's attachment is produced by *temporal* design — repeated daily sessions with simple non-threatening tasks — not by systemic depth. **[Strong]** — [ACM DL, ACNH temporal design](https://dl.acm.org/doi/fullHtml/10.1145/3641237.3691689)
- Townscaper's sustained engagement is explicitly attributed to "visual delight" and emergent procedural detail (windows, chimneys) rather than to mechanics. **[Strong]** — [How Townscaper Works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)
- Islanders *removed* its day cycle to simplify the game — a caution that a day/night cycle is only worth it if it pays off aesthetically rather than mechanically. **[Strong]** — [Game World Observer](https://gameworldobserver.com/2019/06/14/islanders)
- `InstancedMesh` is the Three.js primitive for "a large number of objects with the same geometry and material but different world transformations", and it reduces draw calls. **[Strong — official docs]** — [three.js InstancedMesh docs](https://threejs.org/docs/pages/InstancedMesh.html)
- Three.js ships an official GPGPU flocking/birds example (WebGL and WebGPU variants) with low-poly bird geometry, where flocking logic runs on the GPU. **[Strong — official example]** — [three.js webgl gpgpu flocking](https://threejs.org/examples/webgl_gpgpu_birds.html); [webgpu compute flocking](https://threejs.org/examples/webgpu_compute_birds.html)
- CPU-side flocking is made viable with a spatial acceleration grid — checking each bird only against birds in its own cell and 7 neighbouring cells instead of all others. **[Moderate — open-source implementation]** — [dannygelman1/Wings](https://github.com/dannygelman1/Wings); [jdlennoxs/boids](https://github.com/jdlennoxs/boids)
- General Three.js performance guidance recommends `InstancedMesh` for repeated objects such as trees, particles and props. **[Weak — unattributed best-practice listicle]** — [utsubo, 100 Three.js tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)

### Inferences
- **Cheapest credible ambient life, ranked by effort-to-charm:**
  1. *Fish schools under the water plane.* One `InstancedMesh` of a 6-triangle fish, positions driven in the vertex shader from `instanceMatrix` plus a `uTime` uniform and a per-instance phase attribute (circular/lissajous path + sine tail wiggle). No CPU per-frame work at all, one draw call, and it reads as life. Bind the school count/location to unlocked fish tiles so it doubles as progress feedback.
  2. *Seabirds.* Same trick above the water: 8–20 instanced gulls on slow, offset elliptical paths with a sine-driven wing fold. Full boids are unnecessary — the Three.js GPGPU example exists if the naive version ever looks too regular, but for 20 birds it is over-engineering.
  3. *Day/night as a colour ramp, not a simulation.* One normalised time-of-day scalar (real-time or a long game clock) lerping fog colour, hemisphere/directional light colour+intensity, water tint and sky gradient. No new geometry, no shadow re-bakes. Add lit windows/lantern emissives at night on level-3 props for a free "my raft at night" moment. Islanders' cut day-cycle is the warning: keep it purely aesthetic, never mechanical.
  4. *Weather as material parameters.* Rain = existing cloud system darkened + one instanced streak sprite sheet + higher water choppiness uniform; fog bank = raise the exponential fog density and desaturate. Reuse the Frozen Reach fog shader rather than writing a weather system.
  5. *A single recurring "character".* One drifting boat/buoy/whale that surfaces occasionally is cheaper than an NPC system and buys most of the attachment. Animal Crossing's evidence is that the *return ritual* matters more than the fidelity of the character.
- Ambient features should be *tied to progression* to pay double: birds appear once kelp tiles exist, a whale passes once the raft is 50% unlocked, aurora only over Frozen Reach. Otherwise they are wallpaper and stop being noticed.

### Gaps
- No source measured the retention impact of ambient life specifically; all the evidence here is either design theory (Project Horseshoe), inference from ACNH's temporal-design paper, or Townscaper's qualitative attribution. Treat "ambient life improves attachment" as well-supported in direction, unquantified in magnitude.
- I found no Three.js-specific benchmark for instanced ambient props on low-end hardware in this pass; the docs establish the technique, not the budget.

---

## Q4. How do cozy games use collections and discovery for long-term engagement?

### Takeaway
Collections work because a *visible incomplete set* is a self-renewing motivation (Zeigarnik effect), and because Completion is a first-class motivation in its own right in the Quantic Foundry model. The cheap, non-manipulative version is a codex whose entries are earned by playing normally — and Cookie Clicker shows how to make the codex feed back into production so it is not a dead-end side panel.

### Cited Findings
- **Completion** is a named motivation: "gamers with high Completion scores want to finish everything the game has to offer, trying to complete every mission, find every collectible, and discover every hidden location". **[Strong]** — [Quantic Foundry Gamer Motivation Model](https://quanticfoundry.com/gamer-motivation-model/)
- Collection sets exploit the **Zeigarnik effect** — unfinished tasks occupy mental space until completed — so "an 11-of-12 collection is more motivating than a 0-of-12". **[Moderate — gamification practitioner, Yu-kai Chou]** — [Collection Sets in Gamification](https://yukaichou.com/advanced-gamification/game-design-technique-collection-sets/)
- Animal Crossing: New Horizons shows collection *progress* clearly (museum specimens, furniture sets) alongside limited-time seasonal items. **[Moderate]** — [Psychology of collecting analysis](https://en.wikipedia.org/wiki/Psychology_of_collecting)
- Collecting's appeal includes "having one's personal museum, taking on the role of a curator; handpicking what to display and sharing this with like-minded others" — i.e. curation and display, not just acquisition. **[Moderate]** — [Psychology of collecting](https://en.wikipedia.org/wiki/Psychology_of_collecting)
- Cookie Clicker converts completion into power: 622 achievements, each +1% milk, which the Kitten upgrade line turns into a large CpS multiplier — so the collection *is* an economy system. Deliberately unfair achievements are quarantined as "shadow achievements" excluded from the multiplier. **[Moderate — game wiki]** — [Cookie Clicker Wiki: Achievement](https://cookieclicker.fandom.com/wiki/Achievement)
- Dorfromantik gates *content* behind discovery: white-outlined hexagons must be found on the field and adjoined to reveal a crown quest, which unlocks a new challenge, which unlocks new tile types, landscapes and visual effects. **[Moderate]** — [TheGamer](https://www.thegamer.com/dorfromantik-challenges-tiles-special-unique-unlock-how/); [Dorfromantik Wiki](https://dorfromantik.fandom.com/wiki/Challenges)
- Townscaper rewards experimentation with hidden "recipes" — unadvertised sequences that produce special structures. **[Strong]** — [How Townscaper Works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)
- Cozy design guidance specifically endorses collecting as one of the *opt-in intrinsically satisfying* activities, while warning against extrinsic rewards that undermine the experience. **[Strong]** — [Game Developer, Designing for Coziness](https://www.gamedeveloper.com/design/designing-for-coziness)

### Inferences
- A fish/flotsam codex is the highest value-per-line feature available to Drift Away: entries can be generated by the *existing* production loop (every N fish produced rolls a species by rarity weight), need no new simulation, and produce a visible n-of-N counter that self-motivates.
- The "curator" finding argues for a **display** step, not just a list: a preserved specimen visible on the raft (a rack, a jar shelf on a level-3 tile) converts a menu into part of the world, which is also the thing that makes it screenshot-worthy.
- Cookie Clicker's milk pattern is the ethical version of "collections that matter": tiny, transparent, compounding bonuses per discovery (+0.5% to the matching resource family) mean the codex feeds the idle economy instead of competing with it. It also gives boosters a second dimension without touching the fixed layout.
- Dorfromantik's "find the outlined hexagon" is a free retrofit for Drift Away: a few slots on the 6x6 grid could be marked as *mystery* slots whose identity is unknown until the moment of unlock, converting a known unlock into a reveal.

### Gaps
- No source quantifies codex/collection contribution to retention in a cozy or idle title specifically; Yu-kai Chou's Zeigarnik framing is practitioner theory rather than measured game data.
- I found no primary source on photo mode's effect on retention or sharing in cozy games; treat photo-mode claims as untested here.

---

## Q5. What are the "sense of place" and "sense of growth" techniques, and how do they support retention?

### Takeaway
The recurring technique is making the *world-state itself* the trophy — Terra Nil's reward is the restored landscape, Townscaper's is the town, Dorfromantik's is the emergent village, ACNH's attachment scales with hours spent shaping the island. Retention follows from the player being able to *see* the distance travelled, which argues for explicit before/after, reveal ceremonies, and return summaries rather than more numbers.

### Cited Findings
- Terra Nil's design thesis is that the world-state, not accumulation, is the value: nature "is valuable because of its very existence", and the game deliberately ends by removing the player's infrastructure so only the restored landscape remains. **[Moderate]** — [Game Developer, Terra Nil](https://www.gamedeveloper.com/design/why-a-recycling-mechanic-saved-terra-nil-s-climate-cleanup-mechanics)
- Dorfromantik's pull is described as watching the world emerge: "piece by piece, a beautiful, romantic village emerges", which is what compels "one more" session. **[Moderate]** — [Shacknews](https://www.shacknews.com/article/130138/dorfromantik-review-peaceful-puzzler-that-makes-you-feel-right-at-home)
- Dorfromantik ties *visual* rewards to milestones explicitly: completing challenges unlocks new tile types, landscapes and visual effects, and progression tracks tiles placed / quests completed / biomes unlocked. **[Moderate]** — [TheGamer](https://www.thegamer.com/dorfromantik-biomes-all-unlock-how-get-choose-guide/)
- ACNH: time spent designing the island "corresponds to and reinforces… affective attachment" to it — attachment is manufactured by accumulated authorship. **[Strong]** — [ACM DL](https://dl.acm.org/doi/fullHtml/10.1145/3641237.3691689)
- ACNH also commits "relentlessly" to its metaphor, down to putting the Settings menu inside a conversation with Tom Nook — coherent framing is part of sense of place. **[Moderate — design analysis]** — [What Animal Crossing Taught Me About Data and Interaction Design](https://medium.com/swlh/what-animal-crossing-taught-me-about-data-and-interaction-design-c5c1c5babb82)
- Townscaper's coherent muted palette is credited with holding the whole image together "without overwhelming detail at distance" — sense of place from restraint. **[Strong]** — [How Townscaper Works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)
- Idle games' return moment is designed as evidence of past decisions still paying off while away. **[Weak]** — [Missions Zanx](https://missionszanx.com/guides/idle-game-design-systems-mechanics-and-progression)
- Cozy design recommends "clear refuge from external dangers" with "windows to the outside world for contrast" — which is literally the raft/open-sea relationship. **[Strong]** — [Designing for Coziness](https://www.gamedeveloper.com/design/designing-for-coziness)

### Inferences
- Drift Away's Frozen Reach fog is its single strongest untapped asset: a *reveal* is the one moment where "sense of growth" is felt rather than counted. Making the fog part a deliberate ceremony (camera pull-back, fog dissolving over several seconds, palette shift, a one-line title card) converts an unlock into a memory, at pure presentation cost.
- The raft already grows physically; what is missing is a way to *compare*. Storing a low-res render (or just the unlock bitmask + a deterministic replay) at milestones gives before/after for free, since the scene is fully reconstructable from the save.
- The safety/refuge framing suggests keeping the empty sea genuinely empty and slightly vast — the contrast is what makes the raft feel cozy. Filling the horizon would weaken the effect.
- The open-sea theme offers a cozy-safe alternative to prestige: instead of a reset, "drifting" to a new current (a new zone) preserves everything and reframes the same raft against a new sky. That avoids the one idle convention (progress wipe) that conflicts with attachment-by-authorship.

### Gaps
- No source measures the retention effect of reveal moments, before/after comparisons, or return summaries in cozy games; these are inferences from design commentary rather than data.
- I could not find any Raft (2018/2022) developer commentary on raft-growth-as-reward, which would have been the closest thematic match.

---

## Concrete Idea Candidates for Drift Away

Ordered roughly by value-per-effort. Effort: **S** = an evening or two; **M** = a weekend or a few sessions; **L** = a multi-week feature. Every item is vanilla JS + Three.js with procedural art, no backend, no monetisation.

**Player choice in the layout (≥2 required — items 1 and 2, with 3 as a cosmetic-only fallback)**

1. **Tile facing / "the current runs this way"** — *S/M.* Keep every tile's slot and identity fixed, but let the player rotate each hex freely. Each tile has one outflow edge (a rope, net line, or plank walkway that visibly points at a neighbour) granting a bonus to whatever sits there; rotation is free and reversible. *Why it works:* it adds a genuine spatial decision with a visible, self-explaining consequence — the Dorfromantik/Islanders "where does this point" decision — while keeping the authored layout, the balance, and the idle nature intact (recompute on change only). Reversibility keeps it cozy-safe per the Project Horseshoe "safety" pillar. Cost: one rotation int per tile in the save, one recompute function, one prop that points.

2. **Offered hand at unlock** — *M.* When a slot becomes unlockable, present 2–3 candidate tile types (seeded deterministically from the slot index so layouts stay authored) and let the player pick. *Why it works:* this is Dorfromantik's core tension inverted — there you're given a tile and choose the place; here you're given the place and choose the tile. It turns 72 sequencing decisions into 72 *design* decisions, serving the Design motivation Quantic Foundry identifies as entirely unserved by pure accumulation, with no change to the grid or the economy shape.

3. **Cosmetic prop layer** — *M.* Earn decorative props (lanterns, wind chimes, buoys, a hammock, flags) from milestones and place/recolour them freely on any unlocked tile; zero mechanical effect. *Why it works:* Townscaper sustained a hit on "place block, remove block, pick colour". Purely cosmetic expression carries real weight and carries zero balance risk. Also the thing that makes a raft feel like *the player's* raft, which is what ACNH research links to attachment.

**Ambient life (≥2 required — items 4 and 5, with 6 as the reactive-world companion)**

4. **Instanced fish schools and seabirds** — *S.* One `InstancedMesh` per species; motion entirely in the vertex shader from `uTime` plus a per-instance phase attribute (elliptical drift + sine tail/wing). Schools appear under the water near fish tiles; gulls circle once kelp/crops exist. *Why it works:* `InstancedMesh` is the documented Three.js answer for many copies of one mesh in one draw call, GPU-driven motion costs no per-frame CPU, and tying spawns to unlocked tiles makes ambience double as progress feedback. Boids are unnecessary at this scale (the official GPGPU flocking example is the upgrade path if it ever looks too regular).

5. **Day/night as a colour ramp** — *S/M.* A single normalised time-of-day scalar lerping sky gradient, fog colour, hemisphere/directional light, and water tint, with emissive lanterns and lit windows on level-3 props at night. Purely aesthetic — no production changes. *Why it works:* it gives the same raft several distinct looks for near-zero geometry cost, and it creates a reason to open the game at a different hour. Islanders' cut day-cycle is the explicit warning to keep it cosmetic and never mechanical.

6. **Weather moods and a passing visitor** — *M.* Reuse the existing cloud/fog systems as parameterised "moods" (clear, rain with a choppier water uniform, fog bank, and an aurora reserved for Frozen Reach), plus one rare recurring visitor — a whale surfacing, a drifting bottle, a distant sail. *Why it works:* softness is a named cozy pillar, and a rare visitor is the cheapest possible substitute for an NPC system while still creating the "look what I saw today" moment that drives ACNH-style daily return.

**Collections and discovery**

7. **Fish and flotsam codex** — *M.* Every N units produced rolls a species/find against rarity weights; new entries enter an illustrated log (procedural silhouettes, no new art pipeline) with a visible n-of-N counter. Each discovery grants a small, transparent, permanent bonus to its resource family (the Cookie Clicker milk pattern, scaled down). *Why it works:* Completion is a first-class motivation, an incomplete visible set is self-renewing motivation (Zeigarnik), and routing the bonus back into production means the codex strengthens the idle economy rather than sitting beside it.

8. **Curated display, not just a list** — *S* (on top of 7). Let the player pin a handful of discoveries to a physical rack/shelf/jar prop on the raft. *Why it works:* the collecting literature identifies curation and display — "handpicking what to display" — as the actual satisfaction, not acquisition; it also makes the raft more screenshot-worthy without a photo mode.

9. **Mystery slots and hidden recipes** — *S/M.* Mark a handful of the 72 slots as unknown until unlocked (Dorfromantik's white-outlined hexes), and add a lookup table of unadvertised adjacency combinations at level 3 that spawn a unique structure (a gull-covered mast, a chiming buoy, a kelp arch). *Why it works:* Dorfromantik gates content behind on-field discovery and Townscaper rewards tinkering with hidden recipes; both convert a known unlock into a reveal at almost no systems cost.

**Sense of place and growth**

10. **Frozen Reach reveal ceremony** — *S.* When the first Frozen Reach tile unlocks, take the camera, dissolve the fog over several seconds, shift the palette (colder light, aurora), and show a single line of text. *Why it works:* this is already the game's biggest structural moment and currently the biggest untapped emotional beat — a reveal is where growth is *felt* rather than counted. Pure presentation cost, no new systems.

11. **Drift log / return summary with flotsam** — *S/M.* On return, show a short, calm summary of what accrued while away, plus 1–3 pieces of physical flotsam that drifted onto the raft to be collected with a tap. *Why it works:* the idle genre's return moment is evidence that past decisions kept paying off, and ACNH's retention comes from a small, positive, non-threatening daily ritual. The flotsam gives the return a *physical* act instead of a dismissible number popup. Keep it non-punitive: nothing expires, nothing is lost by not returning.

12. **Before/after postcards at milestones** — *M.* At fixed milestones (first 6 tiles, one zone complete, all 72), capture the raft to a small canvas snapshot stored in localStorage and offer a side-by-side comparison plus a download. *Why it works:* growth only registers when it can be compared; the raft is fully reconstructable from the save, so this is cheap, and a downloadable image is the honest, non-manipulative version of "show off your creation". Watch the localStorage budget — store few, small, and JPEG-encoded.

**Optional / riskier**

13. **"Catch the current" instead of prestige** — *L, and questionable.* A soft reset is the one idle convention that fights everything else here: attachment is built from accumulated authorship, and wiping it works against that. If more long-game content is needed, prefer a third zone or a slow second progression axis (codex, challenges) over a reset. Flagged because prestige is widely described as the genre's retention engine — but that claim came only from unattributed design blogs, not from a primary source.

**A note on restraint.** Islanders deleted its day-cycle system to simplify, and Townscaper's whole verb list is three actions. The strongest evidence in this research is that small teams win by shipping *one* of these well rather than several thinly. Items 1 (facing), 4 (instanced life) and 10 (reveal ceremony) are the highest charm-per-line of the set and do not interact with each other.
