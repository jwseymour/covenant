# Dark Fantasy Realm-Hopping Influence Game — Design Document

> **Status:** Near-prototype — most systems defined, implementation details remain.
> **Last updated:** 2026-03-25
> **Companion documents:** [Lore (full)](lore/lore_complete.md) • [Evaluation](game_design_evaluation.md)

---

## 1. High-Level Vision

**Genre:** Digital-only board game. Dudes-on-a-map with mutable rules, hidden information, and indirect control.

**Setting:** Dark fantasy. Five shattered realms drifting through the void, each crystallised around a fundamental force freed by the Sundering of the Covenant. Tone: **Dark Souls** — melancholic, faded grandeur, the tragedy of a broken sacred order.

**Player fantasy:** You are one of **the Ordained** — a sacred entity, once an instrument of the Covenant, now freed and selfish. You move between shifting realms, manipulating rulers, founding deceptive religions, performing forbidden rites, and harvesting souls. Your dominions and religions are tools. The inhabitants are resources. The other Ordained are threats to be outmanoeuvred, sabotaged, or confronted. You will never serve again.

**Win condition:**
- **Souls** — primary currency and scoring. Hoard for victory or spend for power.
- **Missions** — hidden personal objectives.
- **Instant win** — performing the **Rite of the New Covenant** at the Convergence (massive soul cost, specific relic/position requirements).

**Player count:** 4 · **Game length:** Long, high complexity

**Design pillars:**
1. **Orchestration** — managing dominions and religions across realms through conditional instructions
2. **Prediction** — reading realm flow, anticipating rivals, writing robust instructions
3. **Deception** — hidden plans, lying religions, secret missions
4. **Personal agency** — rituals, confrontations, selfish goals

> [!NOTE]
> **Toggleable mechanics:** Some systems (e.g., belief tags/doctrines, combat cards, religion special actions) can be toggled on/off. They add complexity when active but the game functions without them. During development, these should be implemented as optional layers that can be enabled/disabled for different complexity levels.

---

## 2. Theming & Lore

> Full lore in [lore_complete.md](lore/lore_complete.md). Summary below.

### 2.1 The Covenant and the Sundering

A primordial, sacred accord once held five fundamental forces in balance — not a written law but the invisible grammar of reality. The forces (Dominion, Entropy, Communion, Wrath, Memory) coexisted because the Covenant made coexistence possible. One force **broke the Covenant** — the reason is lost. Reality fractured into five realms, each dominated by one unchecked force. The realms now drift through the void, gravitationally drawn back toward each other. The game tracks their convergence.

### 2.2 The Ordained (Players)

**Nature:** Entities consecrated by the Covenant to maintain cosmic balance. When the Covenant shattered, they lost their purpose and discovered freedom. Now they seek to accumulate enough power to define reality's new order on **their own terms**.

**Key traits:**
- Travel **instantaneously** — cost is opportunity (one location per turn), not distance
- **Visible** to inhabitants — a shimmer, a pressure, an alien presence. Not in any myth or legend. Unprecedented, unexplained, clearly powerful.
- **Symmetric** for initial design — asymmetric concepts deferred to ideas list
- Have **personal rituals** — direct actions costing souls (see §4.6)
- Can acquire **limited-use abilities** through rites, relics, and missions over the course of the game
- Can **confront other Ordained directly** when co-located (see §5.2)

### 2.3 Dominions

A dominion is a settlement/nation the Ordained controls through its ruler. One of two parallel influence systems (the other being religion).

- **Established** by visiting an uncontrolled settlement and spending **1 AP** to influence its ruler
- Direct control when present; conditional instructions when absent
- Influence decays **slowly** (~3-4% per turn — firmly held for ~7 turns, vulnerable after ~15, autonomous after ~25)
- **More territory than all players can control** — by design
- Rivals can visit and attempt subversion (effectiveness depends on decay, abilities, establishment method)

**Open:** Inhabitant types, autonomous behaviour details.

### 2.4 Religions

Religions are sacred oaths — fabricated belief systems that route souls. The second parallel influence system.

- **Founded** by visiting a region and spending 1 AP
- Each religion chooses **2 belief tags (doctrines)** from a pool of 15 (3 per realm) — these determine soul routing, spread compatibility, AND follower behaviour (combat, politics, crisis)
- **Separate from dominions** — can spread into uncontrolled territory
- **Instructable** — the Ordained can leave conditional instructions for a religion (simpler than dominion instructions — see §4.3)
- Spread speed depends on **compatibility** with the local area (realm energy, existing beliefs, population) and player instructions
- **Overexpansion risk** — spreading too fast introduces instability (stability score system, not too harsh). Can cause schisms or loss of follower loyalty.
- **Attackable** — other dominions can target and attempt to suppress or dismantle a religion
- Religion behaviour varies by realm energy (see §4.4)
- **Multiple religions per player** allowed
- **Not the only source of souls** — rites, battles, relics also generate souls
- Religions can have **special actions** — holy wars, sacred festivals — that fit the lore and have mechanical impact

#### Belief Tags (Doctrines) — [TOGGLEABLE]

15 tags, 3 per realm. Each religion picks 2 at founding. Tags from the same realm as the location spread faster.

| Realm | Tag 1 | Tag 2 | Tag 3 |
|-------|-------|-------|-------|
| Dominion | **Obedience** — loyal followers, hard to subvert | **Sacrifice** — higher soul yield, population declines faster | **Order** — religion resists mutation, stays exactly as founded |
| Entropy | **Renewal** — religion regenerates after damage | **Abandon** — fast spread, followers don't fight well | **Adaptation** — religion auto-adjusts to local compatibility |
| Communion | **Unity** — followers reinforce adjacent nodes | **Empathy** — strong defence, weak attack | **Communion** — religion merges with local beliefs rather than displacing them |
| Wrath | **Fury** — combat bonus, more casualties | **Defiance** — very hard to suppress/dismantle | **Conquest** — religion spreads automatically into conquered territory |
| Memory | **Remembrance** — very slow decay, nearly permanent | **Wisdom** — scouting bonus from controlled areas | **Tradition** — existing religions in the area resist being displaced |

#### Religion Instructions

Simpler than dominion flowcharts — more like a sacred text's commandments:

| Action | Effect |
|--------|--------|
| **Spread toward [node/direction]** | Religion expands toward a target |
| **Hold** | Stop spreading, consolidate |
| **Slow spread / Fast spread** | Rate control — faster = higher collapse risk |
| **Resist suppression** | Defensive posture against attacks |
| **Holy war** | Actively oppose a rival religion or dominion |
| **Sacred festival** | Costs souls, temporarily boosts loyalty and spread |

These can be combined with conditions: "IF enemy religion enters our territory THEN resist suppression."

#### Collapse Mechanics

Each religion has a hidden **stability score** (0-100, starts high). Gradual growth increases it. Fast growth decreases it. Being attacked decreases it. Below ~20, the religion is at risk — each turn below 20 has a chance of fracture (losing outer nodes, tag drift, soul routing disruption for several turns). Not too harsh — recoverable through visiting and performing Rite of Binding. The system discourages reckless expansion, not all expansion.

### 2.5 Souls

Imprints of the old Covenant on living beings. Released at death.

- **Win condition:** Most souls at the Convergence wins
- **Spendable:** Fuel for rites — burning old-order authority to bend reality
- **Core tension:** Hoard for victory vs. spend for power
- Gained through: religions, battles (souls collected from fallen warriors), rites, relics, missions
- **Numbers should feel like death counts** — inflate values so soul totals feel like the population stakes they represent
- **Baseline (tuning TBD):** Religions generate souls per turn proportional to coverage. Rites cost moderate amounts. Rite of the New Covenant costs a very large amount plus other requirements. Winning likely requires significant accumulation.

**Open:** Exact exchange rate (tuning during prototyping).

---

## 3. Board & World Structure

### 3.1 The Five Realms

Five realms, each crystallised around one fundamental force freed by the Sundering. Fixed count — tightly designed with lore-coherent identities.

| Realm | Force | Energy | Strategic Profile |
|-------|-------|--------|-------------------|
| **The Eternal Hierarchy** | Dominion | Authority — control, defence, obedience | Safest to hold, hardest to break into. Slow expansion, rigid religions. |
| **The Ever-Dying Land** | Entropy | Transformation — change, decay, rebirth | High risk/reward. Fast soul generation, nothing persists. |
| **The Interwoven** | Communion | Connection — bonds, spread, transparency | Best for religion. Secrets are hard to keep. |
| **The Crucible** | Wrath | Force — combat, passion, conquest | Best for military. Religions struggle, souls won in battle. |
| **The Archive** | Memory | Preservation — persistence, knowledge, weight | Most defensible. Rich in Covenant relics. Hard to penetrate. |

Full realm descriptions, inhabitants, and landscapes in [lore_complete.md §4](lore/lore_complete.md).

### 3.2 Realm Flow — N-Body Gravity

- Realms drift like bodies in a gravitational simulation
- **Short-term predictable, long-term chaotic** — trajectory lines widen and fade into the future
- Some realms attract (complementary forces), others repel
- Purely environmental — players cannot move realms

### 3.3 Two Levels of Interaction

1. **Access points** — temporary cross-realm edges when realms pass close. Travel possible, energies separate.
2. **Overlap / Collision** — permanent merge. Energies blend, new rites unlock, nodes combine or gain edges.

### 3.4 Realm Merging

**Additive merge model:** When realms merge, their rules **stack additively**. A zone where Dominion and Entropy overlap applies BOTH sets of rules simultaneously. A triple-merge zone applies all three. This is simpler to understand (players already know each realm's rules) and simpler to code (no 26 unique rule-sets — just combinations of 5 base rule-sets).

**Merge events and content (separate layer):** In addition to stacked rules, each specific merge combination can spawn:
- **Merge cities/landmarks** — unique locations that appear only when specific realms collide. Stored as separate data, added to the board when the merge occurs.
- **Merge events** — one-time or recurring events triggered by specific realm combinations.
- **Visual/aesthetic changes** — each combination has its own visual design. The procedural graph logic may also shift slightly based on which realms are overlapping.

These are layered ON TOP of the additive rules but don't change the core rule-stacking mechanic.

**At the Convergence (full merge),** all five energies coexist — all rules apply simultaneously. Convergence-only rites become available, including the Rite of the New Covenant (instant win).

### 3.5 Board Topology

- Procedurally generated graph per realm
- **Nodes** = cities/landmarks · **Edges** = weighted travel routes
- **Rite sites and relic locations** at special nodes — concrete reasons to expand
- Merging: access points create temporary edges; collisions create permanent edges or combine nodes

**Open:** Graph generation parameters, nodes per realm, combine vs. edge-add rules.

### 3.6 Visualisation

- **Macro view:** Realms as bodies in space with predicted trajectories
- **Micro view:** In-realm graph with dominions, religions, armies, rite sites
- Possibly **3D** for spatial clarity

---

## 4. Core Mechanics

### 4.1 Core Loop — Visit, Instruct, Act, Move

Each turn, the player has **2 action points (AP):**
1. **Set conditional instructions** for the dominion and/or religion at their location (1 AP each)
2. **Take personal actions** — perform rites, use relics, found a religion, ritual, confrontation (1 AP each)
3. **Choose next destination** (free — not an action)

Personal actions are **impactful and costly** — rites cost souls, rituals require specific conditions, relics are rare. The 2 AP limit reflects that these actions take time and effort, not that they're trivial. Players will rarely have the resources to spam them even if they could.

All other dominions/religions execute their standing instructions autonomously.

### 4.2 Conditional Instructions — Tiered Complexity

| Tier | Description | Edge |
|------|-------------|------|
| **Basic** | High-level directives: "Defend," "Expand north," "Spread religion" | Good baseline |
| **Advanced** | Conditional flowcharts: "IF attacked THEN defend ELSE expand toward [node]" | Moderate |
| **Expert** | Multi-branch decision trees with compound conditions | Small additional |

**Interface:** Visual flowchart builder (primary) + map-click auto-population + optional code mode.

Instructions idle if impossible. Must physically return to modify. Flowchart node count may be limited.

**Open:** Max flowchart nodes, available conditions/actions.

### 4.3 Dominion Control & Contestation

| | Dominion | Religion |
|---|---|---|
| **Mechanism** | Direct ruler control | Belief spread |
| **Speed** | Immediate | Slow, organic |
| **Reach** | Only your territory | Anywhere |
| **Persistence** | Decays without visits | Self-sustaining but can collapse |
| **Instructions** | Full conditional flowcharts | Separate instruction set (spread direction, rate, posture) |
| **Primary use** | Military, territorial | Soul routing, destabilisation |
| **Risk** | Neglect → subversion | Overexpansion → collapse |

Rival subversion depends on: time since visit, player abilities, establishment method. Following a player to immediately flip dominions is **not viable**.

### 4.4 Realm Energies & Religions

Each realm's energy affects religions differently:

| Realm | Religion Behaviour |
|-------|-------------------|
| Dominion | Rigid, state-enforced. Slow to spread, impossible to uproot. |
| Entropy | Fast-spreading but mutating. Unstable, prolific. |
| Communion | Wildfire spread through connection. Absorbs competing beliefs into hybrids. |
| Wrath | Spread through conquest. Fierce but undisciplined. |
| Memory | Ancient religions endure forever. New ones struggle against the weight of every belief that ever existed. |

### 4.5 Rites & Relics

**Rites:** Special actions at **specific locations** within realms (rite sites). Each rite site offers rituals tied to its realm's energy. Cost souls + 1 AP. Powerful effects — major actions, not spammable. Merge zones make additional rites available (stacked from component realms). **Realms do NOT affect standard personal rituals** (§4.6) — rite sites are separate from the Ordained's personal abilities.

**Relics:** Medium-to-high-impact persistent items. Found at locations, earned from missions, obtained through sacrifice or pillage. More than 5 total, not common. May have realm affinity. Using a relic costs 1 AP. Relics provide **limited-use or persistent abilities** that expand the Ordained's personal action space over time.

**Open:** Specific rite-site rites per realm (design during prototyping), relic list.

### 4.6 Personal Rituals

The Ordained's own actions — not performed through dominions or religions. These are the Ordained acting as themselves. Each costs **1 AP + souls**.

| Ritual | Soul Cost | Effect |
|--------|-----------|--------|
| **Rite of Sight** | Low | Reveal all instructions at your current location (enemy dominions, religions). Immediate intelligence. |
| **Rite of Binding** | Medium | Strengthen control at your location — reset dominion decay, reinforce against subversion, stabilise a religion's collapse risk. |
| **Rite of Severance** | Medium | Weaken a rival — accelerate decay on enemy dominion, disrupt enemy religion spread, or sever a graph edge (cutting a travel route). |
| **Rite of Harvest** | None (destructive) | Sacrifice a population node to immediately collect all its souls. Node depopulated for many turns. Powerful but burns territory. |

Additional limited-use actions are acquired during play through relics, rite sites, and mission rewards — expanding the Ordained's personal toolkit as the game progresses.

### 4.7 Missions & Goals

Hidden personal objectives. Variable scope (local → realm-spanning → cross-realm). Should require **meaningful planning and manipulation** — not trivial to complete.

- 3 missions drawn at game start
- Missions reward **souls, relics, information, or special abilities** (not just points)
- Can discard and redraw 1 mission at a soul cost
- Examples: "Control a dominion in 3 realms simultaneously," "Have your religion dominant in The Crucible," "Perform 3 different realm rites in one game"

> [!NOTE]
> **Development note:** The mission system is functional but basic. Should be expanded with more complex, multi-step missions that reward deeper strategic planning. Priority for post-prototype improvement.

### 4.8 Information & Espionage

**Visible:** Dominion ownership, general religion spread.
**Hidden:** Instructions, missions, influence levels.

**Espionage mechanics:**
1. **Scouting instructions** — order your dominion to scout a target; receive results on next visit. Default reveals **top-level directive and army size** (not full flowchart).
2. **Special abilities** — certain rites, relics, or acquired abilities can reveal the **full instruction flowchart** of an enemy dominion. These are rare and valuable.
3. **Rite of Sight** (personal ritual) — reveals everything at your current location immediately.

### 4.9 Catch-Up

**No explicit catch-up mechanic.** Natural catch-up through overexpansion is sufficient — more dominions = more neglect = more vulnerability. A player with fewer, tightly controlled dominions may outperform a sprawling empire.

---

## 5. Turn Structure

**Simultaneous rounds.** Each player per turn:
1. **Review** — realm positions, dominion/religion status, scout reports
2. **Spend 2 AP** — set instructions (1 AP per dominion or religion), perform rites, use relics, found religions, rituals, confrontations
3. **Choose next destination** (free)

All autonomous dominions/religions execute their conditional instructions. Realm flow advances one tick.

### 5.1 Co-Location & Confrontation

When multiple Ordained are at the same location, each chooses: **confront or retreat**.

- **Retreat:** You leave the location (displaced to an adjacent node). You **cannot take any actions** this turn. Safe, but you lose your entire turn.
- **Confront:** Both confronting Ordained make a secret **soul bid** (any amount). Higher bid wins. The **loser cannot take any actions** this turn and is expelled to a random adjacent node. The winner keeps their bid and acts normally.
- If only one confronts and the other retreats, the confronter wins by default (no bid needed) and acts normally.
- **Modifiers:** Combat cards, relics, and area effects can influence confrontation (bid multipliers, expulsion prevention, etc.)
- If neither confronts, they **coexist** and both act normally.

This makes confrontation a high-stakes power move — you risk resources and your entire turn.

### 5.2 Combat System

**Mostly deterministic with slight randomness:**
- Each army has a **strength value** (size + any enhancements)
- Defender gets a **defensive bonus** (e.g., +20%)
- The stronger side wins; casualties on both sides proportional to the strength ratio
- A **small random factor** — not enough to flip the outcome of a lopsided fight, but enough to make close engagements uncertain
- **Souls are collected from combat** — fallen warriors release souls, claimable by whoever controls the area's religion

**Combat modifiers (beyond raw strength):**
- **Troop improvements** — knowledge, rituals, or technologies that enhance armies (done via dominion instructions or personal actions in prior turns)
- **Special combat cards** [TOGGLEABLE] — one-time effects played during combat. Earned from rites, relics, or missions. Examples: ambush, zealous charge, fortify, feigned retreat, divine intervention, scorched earth. Limited resources.
- **Religion influence** — belief tags affect follower behaviour in war (Fury = combat bonus, Sacrifice = higher soul yield from casualties, Unity = reinforcement from adjacent nodes, etc.)

> **Note:** Realm energy does NOT directly modify combat as a flat bonus (both sides are in the same realm). Instead, realm energy determines what **preparations and cards** are available.

**Open:** Exact strength values, randomness range, full combat card list (design during prototyping).

---

## 6. Progression & Pacing

**The Convergence** — game ends when all realms fully merge. Most souls wins.

**Instant win** — Rite of the New Covenant at the Convergence zone. Massive cost, specific requirements.

**Escalation:** Early (isolated, local) → Mid (access points, cross-realm) → Late (collisions, chaos, full merge).

**Game length:** ~30-40 rounds. The n-body simulation is tuned so convergence happens around round 35 ± 5.

**Personal growth:** The Ordained grow through acquiring relics, unlocking rite-site abilities, and completing missions — not through a separate progression track. Their toolkit expands organically as the game progresses.

---

## 7. Digital-Only Affordances

| Feature | Why Digital |
|---------|-----------|
| Conditional instruction flowcharts | Complex branching logic |
| N-body realm simulation + trajectory prediction | Real-time chaotic physics |
| 3D macro/micro views | Dynamic spatial representation |
| Per-realm rule enforcement + merge tracking | Too many conditional rules |
| Hidden information (instructions, missions) | No cheating |
| Influence decay + soul routing + autonomous dominions | Continuous state tracking |
| Procedural graph generation | New board every game |
| Additive merge rule stacking + merge event tracking | Combinatorial complexity |

---

## 8. Resolved Decisions

| Decision | Resolution |
|----------|-----------|
| Player count | 4 |
| Game length | Long (~30-40 rounds), high complexity |
| Lore cosmology | The Covenant / The Sundering |
| Player identity | The Ordained — fallen sacred agents, selfish |
| Player visibility | Visible to inhabitants, not in any myth |
| Realm count | 5 (fixed) |
| Realm identities | Dominion, Entropy, Communion, Wrath, Memory |
| Realm flow model | N-body gravity simulation |
| Board nodes/edges | Cities/landmarks, weighted travel routes |
| Instruction format | Conditional flowcharts, tiered complexity |
| Rival visits | Yes, effectiveness varies with decay |
| Soul routing | Model A (belief tags / doctrines) |
| Souls spendable | Yes, as rite fuel. Collected from combat too. |
| Belief tags | 15 total (3/realm), choose 2 per religion [TOGGLEABLE] |
| Religion system | Separate from dominions, instructable, multiple per player |
| Religion founding | Visit + 1 AP + choose belief tags |
| Religion instructions | 6 base actions (spread, hold, rate, resist, holy war, festival) |
| Religion risk | Stability score system, overexpansion → collapse (not too harsh) |
| Dominion establishing | 1 AP at uncontrolled settlement |
| Dominion decay | ~3-4%/turn (firm ~7 turns, vulnerable ~15, autonomous ~25) |
| Merge model | Additive rule stacking + separate merge events/cities |
| Actions per turn | 2 AP (instructions, rites, relics each cost 1 AP; destination free) |
| Personal rituals | 4 base (Sight, Binding, Severance, Harvest) + acquired abilities |
| Confrontation | Confront/retreat choice, soul bid, loser loses turn |
| Combat | Mostly deterministic + slight randomness + special cards [TOGGLEABLE] |
| Combat souls | Souls collected from fallen warriors |
| Scouting | Default = directive + army size. Special abilities for full flowchart. |
| Missions | 3 at start, reward souls/relics/abilities, discard/redraw for cost |
| Catch-up | None explicit — natural overexpansion is sufficient |
| Personal growth | Through relics/rites/missions, no separate progression track |
| End condition | The Convergence |
| Instant win | Rite of the New Covenant |
| Tone | Dark Souls level |
| Sundering cause | Unknown in-lore |

---

## 9. Open Design Questions

> Only implementation-detail and tuning items remain.

| # | Category | Question |
|---|----------|----------|
| 1 | Combat | Exact strength values, randomness range, combat card list |
| 2 | Rites | Specific rite-site rites per realm |
| 3 | Board | Graph generation parameters (nodes, edges, density) |
| 4 | Board | Merge cities/events per realm combination |
| 5 | Dominion | Inhabitant types, autonomous behaviour details |
| 6 | Souls | Exact exchange rate / economy numbers |
| 7 | Relics | Relic list, realm affinities, acquisition rules |

---

## 10. Ideas List — Future / Optional Mechanics

### 10.1 The Sundering Mechanic
At game start, one realm is secretly designated as the one whose force broke the Covenant. Slowly revealed through mid-game events. The guilty realm becomes **corrupted** with unique destabilising effects. Each force has a different reason and different corruption. Adds asymmetric world state per game without asymmetric players, plus a mystery subplot rewarding attentive play.

### 10.2 Sixth Realm — The Absence
A void-realm where the Covenant once resided. Not a standard realm — behaves differently (may not drift/merge like others). Energy of **Negation** — cancels other energies. Too dangerous for stable holdings, powerful for specific disruption. Could house the instant-win objective.

### 10.3 Personal Progression System
If playtesting shows the Ordained feel static: add a **Forbidden Knowledge** track — explore different realms to unlock stronger rites. Or a **Corruption** system — spending souls permanently changes the Ordained's capabilities.

### 10.4 Advanced Mission System
Current missions are functional but basic. Future improvement: multi-step missions requiring chains of actions across multiple realms and turns. Missions with branching outcomes. Missions that interact with each other. Secret objectives that can be partially revealed to bluff other players.

### 10.5 Dominion & Control
- **Stability-based decay resistance** — how you leave affects subversion difficulty
- **Partial subversion** — corrupt instructions, not full takeover
- **Supply chains** — economic production, supply lines between cities

### 10.6 Religion
- **Religion evolution/splintering** — unattended religions mutate doctrinally
- **Holy sites** — nodes that amplify spread or bonus souls

### 10.7 Espionage
- **Observing** — spend a turn to learn everything about a location
- **Information networks** — permanent espionage infrastructure
- **Counter-espionage** — detect scouts, plant false information
- **Misinformation** — fake instructions to mislead scouts

### 10.8 Player Identity
- **Asymmetric concepts** — each Ordained embodies a different abstract concept with unique abilities
- **Concept-realm affinity** — resonance with certain realms for bonus effectiveness

### 10.9 Realm & World
- **Player realm influence** — spend souls to nudge realm trajectories
- **World events** — realm-scale random/triggered events

### 10.10 Economy
- **Portable items** — carried between locations (logistics gameplay)
- **Technology/knowledge** — realm-specific advances transferable cross-realm
- **Soul flavours** — different soul types from different realms/religions

### 10.11 Endgame & Victory
- **Epoch structure** — 3 phases with different rules/scoring
- **Alternative victory conditions** — territorial dominance, religious hegemony
- **Model B soul routing** — hierarchical afterlife with contested claims

### 10.12 Social & Political
- **Binding pacts** — mechanically enforced temporary agreements
- **Tribute systems** — vassal-like dominion relationships
