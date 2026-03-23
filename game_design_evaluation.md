# Game Design Evaluation

> Assessment of the Dark Fantasy Realm-Hopping Influence Game as of the current GDD state.

---

## 1. What's Working Well

### The Core Fantasy Is Strong
The pitch — "you are a singular, abstract entity orchestrating dominions across shifting realms through deceptive religions while harvesting souls" — is genuinely distinctive. It doesn't map neatly onto any existing game, which is rare. The Berserk/Souls aesthetic anchors it in something that has proven mass appeal without being derivative.

### The Core Loop Has Elegant Tension
Visit → instruct → leave → orchestrate. This is mechanically clean and creates a natural, recurring dilemma: **breadth vs. depth**. Every turn you attend one dominion, every other dominion drifts. This is the kind of tension that makes good strategy games — it's simple to understand, impossible to optimise, and always painful. It's reminiscent of the best parts of **Chaos in the Old World** (area control with limited actions) crossed with the programming mechanic from **Robo Rally** (set instructions, watch them play out).

### The Realm System Has High Potential
Two levels of interaction (access points vs. overlap), progressive merging toward endgame chaos, and complementary energy systems — this has the bones of something very rich. The macro view / micro view split is smart and necessary.

### Digital-Only Is Correctly Scoped
The design genuinely needs to be digital. Conditional instructions, hidden information enforcement, continuous realm flow, decay tracking, NPC autonomy — none of these work on a physical table. This isn't "board game but on a screen," it's a game that *requires* the medium.

---

## 2. Risks & Tensions

### 🔴 The Complexity Budget

This is the biggest risk. Let me count the systems currently in the design:

| System | Complexity |
|--------|-----------|
| Conditional instruction programming | Very High |
| Realm flow prediction | High |
| Influence decay per dominion | Medium |
| Rival subversion mechanics | High |
| Soul routing via religion | High |
| Religion creation & spread | High |
| Items with realm compatibility | Medium |
| Espionage / information networks | Medium |
| Mission/goal cards | Low |
| Realm energy systems & merging | Very High |
| Asymmetric player powers | High |
| Weighted graph traversal for troops | Medium |

That's **12 interlocking systems** for a 4-player game. For comparison:
- **Twilight Imperium** (famously complex) has ~8 core systems
- **Spirit Island** (heavy but tight) has ~6
- **Chaos in the Old World** (the closest comparison) has ~5

> [!CAUTION]
> Not all of these will survive contact with playtesting. Some will need to be cut or merged. The question isn't *whether* you'll simplify — it's *which systems are load-bearing* and which are nice-to-have.

**Suggestion:** Identify your **3 non-negotiable systems** — the ones that, if removed, would make this a different game. Everything else should be designed to be cuttable. My candidates for non-negotiable:
1. The core loop (visit → instruct → leave)
2. Realm flow and merging
3. The soul/religion economy

### 🟡 Conditional Instructions May Be a UX Nightmare

This is simultaneously the most exciting and most dangerous mechanic. Writing conditional logic is essentially **programming**, and most people — even strategy gamers — find programming un-fun when it gets complex.

Consider the spectrum:
- **Too simple:** "If attacked, defend" — barely more interesting than a directive. Why bother with conditionals?
- **Sweet spot:** "If Realm B is overlapping my territory, recruit from border cities. If my army is larger than the neighbouring faction, expand north. Otherwise, consolidate." — strategic, readable, replayable.
- **Too complex:** Compound boolean logic with nested conditions — this is a programming language, not a board game.

**Suggestion:** Design instructions as a **visual flowchart or decision tree** that the player constructs by dragging and connecting blocks, not by typing text. Think of it like a simple visual programming language (similar to Scratch or the automation in games like **Factorio** or **Opus Magnum**). Each block is a condition (from a limited, curated set) connected to an action (also from a curated set). Limit the tree to 3-5 nodes per dominion. This keeps it tactile, readable, and constrains complexity without removing expressiveness.

### 🟡 Realm Flow Legibility

"Constantly flowing, somewhat predictable" is easy to say and very hard to implement readably. If players can't intuit where realms are heading, they can't plan, and the game becomes reactive rather than strategic.

**Suggestion:** Consider giving realm flow a **rhythm** — maybe realms oscillate in predictable patterns (like orbits) but with occasional perturbations. Show projected paths 3-5 turns ahead as fading ghost outlines in the macro view. The further ahead, the more uncertain the projection. This gives skilled players something to read and plan around while keeping some volatility. Think of it like weather forecasts — accurate short-term, probabilistic long-term.

### 🟡 Soul Routing Is Undefined and Critical

Souls are the win condition but the routing mechanic doesn't exist yet. This is the engine that everything else is supposed to feed into. Without it, you can't evaluate whether religions, dominions, combat, or anything else actually matter.

Some possible models:

**Model A — Belief Tags:** Each religion has a set of "beliefs" (tags). When an inhabitant dies, their beliefs route them to the player whose soul-collection aligns with those tags. Simple, clear, gameable.

**Model B — Hierarchical Afterlife:** Each player controls an "afterlife domain." Religions teach inhabitants that the correct afterlife is the one matching certain criteria. Multiple players can claim overlapping criteria, creating contested souls. More complex, more interesting.

**Model C — Soul Flow Network:** Souls move through a network (separate from the map) and players place "attractors" via religions to pull souls toward them. The network could be influenced by realm merging. Most mechanically interesting but adds another layer of complexity.

**Suggestion:** Model A is probably the right starting point. It's clean, it connects directly to religion creation, and it can be deepened later without reworking the foundation.

### 🟡 Items Feel Like a Bolt-On

You noted this yourself — "items alone may not be enough." The issue is that items, as currently described, are a **logistics mechanic** (get thing, move thing to where it's useful) layered on top of a game that's already about logistics (move yourself to dominions, manage across realms). They don't add a new *verb* — they add more of the same verb.

**Suggestion:** Instead of portable items, consider **powers or rites tied to realm energy systems.** Each realm's energy allows certain unique actions. When realms overlap, the energy systems combine, unlocking new actions that weren't possible in either realm alone. This turns the realm merging system (which is already in the game) into the source of tactical variety, rather than adding a separate collection mechanic. Players would want to be in specific places during specific overlaps — creating temporal strategy rather than spatial logistics.

If you still want collectible things, make them **rare, high-impact relics** (3-5 in the whole game) rather than a common item economy. Think Berserk's Behelits — singular objects that reshape the game when used, not inventory management.

---

## 3. System-by-System Evaluation

### 3.1 Core Loop: Visit → Instruct → Leave
**Rating: Strong foundation, needs UX work**

The one-dominion-per-turn constraint is excellent. It creates a natural clock — you can only be in one place, so every turn is an opportunity cost. The fact that you must physically return to update instructions means dominion count has diminishing returns — more dominions = more out-of-date instructions = more vulnerability. This is elegant self-balancing.

> [!IMPORTANT]
> This mechanic naturally caps expansion. A player with 10 dominions can only refresh each one every 10 turns. This may be the catch-up mechanic you're looking for — overexpansion punishes itself.

**Concern:** What does the player *do* on their turn besides set instructions? If the only action is "visit a dominion and programme it," turns might feel thin. There should probably be something the player does *as themselves* — not through dominions. This is where the player's personal concept/powers could live.

### 3.2 Dominion Contestation
**Rating: Promising, needs guardrails**

Rivals visiting your dominion is good — it creates paranoia and incentivises regular check-ins. The three-factor effectiveness model (time since visit, player abilities, establishment method) is sensible.

**Concern:** What stops a player from just following another player around, subverting every dominion they leave behind? There needs to be friction. Some options:
- **Subversion takes multiple turns of presence** (you can't just visit and immediately flip a dominion)
- **The original player can set "traps" or defensive instructions** that make subversion costly
- **Subversion is visible** — other players can see that someone is contesting a dominion, creating political consequences
- **Player concepts might resist each other** differently (your abstract nature makes you harder/easier to subvert depending on who's doing it)

### 3.3 Religion Creation
**Rating: Underdeveloped — needs to become a primary system**

Religion is currently described as "tools of manipulation" and "determines where souls go." But it's actually the **transmission mechanism** between your dominions and your victory condition. It deserves much more thought.

**Suggestion:** Religions could work as **doctrine sets** that you compose when founding them:
- Each religion has 2-3 doctrines chosen from a larger pool
- Doctrines determine: which realm's energy the religion resonates with, what behaviours it encourages in followers, and where souls are routed
- A religion with doctrines that match the local realm's energy spreads faster
- Doctrines from overlapping realms might create hybrid religions that are powerful but unstable
- A dominion's religion could conflict with a neighbouring dominion's religion, causing friction, conversion, or war

This makes religion creation a meaningful strategic choice rather than just "stamp this dominion with my brand."

### 3.4 Realm Flow & Merging
**Rating: High potential, needs formalization**

The two-tier system (access points vs. overlap) is sound. The progressive merging toward endgame is great for pacing — early game is isolated and intimate, late game is chaotic and interconnected.

**Suggestion for the flow model:** Think of realms as bubbles in a lava lamp. They drift in slow, semi-predictable patterns. When bubbles touch, an access point forms. When they merge more deeply, overlap occurs. The key parameters would be:
- **Drift direction and speed** — visible to all, predictable 3-5 turns ahead
- **Attraction/repulsion** — some realms are drawn to each other (complementary energies), others repel. This could be fixed per game or shift based on player actions.
- **Merge depth** — how much overlap has occurred, which determines how many cross-realm edges exist and how much rule blending happens

### 3.5 Information & Espionage
**Rating: Well-scoped, needs mechanical definition**

The default visibility level (only dominion ownership is visible) is a good baseline — enough information to react, not enough to perfectly predict. The espionage layer adds a reason to invest in intelligence rather than just troops and religion.

**Suggestion:** Espionage could be tied to the player's personal presence. When you visit a dominion, you could choose to spend your turn **observing** rather than **instructing** — learning everything about that location (nearby enemy instructions, influence levels, any items present). This creates a real cost: you're burning your one turn of presence to gather intel instead of managing your own territory. Information becomes expensive, which makes it valuable.

For remote espionage (info networks), consider having it require an established dominion nearby — you can only spy on places adjacent to territory you control. This connects intelligence to expansion organically.

### 3.6 Pacing & Endgame
**Rating: Undefined — critical gap**

The progressive realm merging gives natural escalation, but there's no defined end trigger.

**Suggestions:**
- **The Convergence:** The game ends when all realms have fully merged. This is thematic (the fractured power is reassembling) and creates a natural countdown. The number of rounds is roughly determined by realm flow speed, visible to all.
- **Soul Threshold:** First player to N souls, or highest after all realms merge.
- **Epoch Structure:** The game is divided into 3 epochs (Separation → Drift → Convergence), each with different rules and scoring. This gives the long game structure and lets you tempo-shift.

---

## 4. Comparative Analysis

| Game | What It Shares | What To Learn |
|------|---------------|---------------|
| **Chaos in the Old World** | Asymmetric gods competing for area control with unique abilities and alternate win conditions | Keep the game tight: limited actions per turn, clear scoring, distinct victory paths per player concept |
| **Twilight Imperium** | Grand scope, political manipulation, hidden objectives, long play time | Agendas and political deals keep downtime interesting; every action should ripple outward |
| **Spirit Island** | Asymmetric powers, cascading effects, planning ahead through slow-to-resolve actions | "Fast powers" vs "slow powers" framework — some effects happen now, others resolve next turn. Could inform your instruction timing |
| **Cultist Simulator** | Dark, abstract theming; founding religions; managing hidden information; occult/cosmic horror tone | Mechanics as narrative — the *rules themselves* tell the story. Doctrine selection should feel like worldbuilding, not stat selection |
| **Diplomacy** | Simultaneous orders, no randomness, hidden intentions, betrayal | The power of simple simultaneous action resolution — often the most dramatic moments come from two conflicting orders hitting the same target |

---

## 5. Top Priorities (Suggested Order)

These are the decisions that will unlock the most downstream design clarity:

| Priority | Question | Why It's Blocking |
|----------|----------|-------------------|
| **1** | How does soul routing work? | It's the win condition. Everything feeds into it. Until this is defined, you can't evaluate whether other systems matter. |
| **2** | What are the 4 player concepts? | Asymmetric design requires knowing the characters before you can design their abilities, affinities, and how they interact with realms. |
| **3** | What does a turn look like end-to-end? | Without turn structure, you can't evaluate action economy, pacing, or downtime. |
| **4** | How many realms, and what are their energy systems? | This defines the board, which defines everything spatial. |
| **5** | What defines a religion mechanically? | This connects player actions to the soul economy and determines how dominions generate points. |

---

## 6. One Big Concern

The game is currently all **indirect control.** You don't do things — you tell dominions to do things, through instructions, through religions, through influence. This is thematically brilliant (you're an abstract entity, not a general) but mechanically dangerous. If the player feels like they're always programming *other things* to act and never acting *themselves*, it could feel detached and unsatisfying.

> [!WARNING]
> The player needs at least one system where they have **direct, immediate, personal agency**. Not through a dominion. Not through instructions. Something THEY do, as the entity, that resolves THIS turn.

This could be:
- **Personal powers** tied to their concept (direct intervention in one location per turn)
- **Rituals** that the player performs using their own energy (not dominion resources)
- **Direct confrontation** with another player entity when they're in the same location (an abstract battle of wills)
- **Realm manipulation** — the player can personally nudge realm flow slightly

Whatever it is, it ensures the player feels like a *being* and not just an operations manager.
