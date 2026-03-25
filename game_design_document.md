# Dark Fantasy Realm-Hopping Influence Game — Design Document

> **Status:** Active design — lore finalized, mechanics in progress.
> **Last updated:** 2026-03-25
> **Companion documents:** [Lore (full)](file:///Users/jseymour/jack_code/bg/lore_complete.md) • [Evaluation](file:///Users/jseymour/jack_code/bg/game_design_evaluation.md)

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

---

## 2. Theming & Lore

> Full lore in [lore_complete.md](file:///Users/jseymour/jack_code/bg/lore_complete.md). Summary below.

### 2.1 The Covenant and the Sundering

A primordial, sacred accord once held five fundamental forces in balance — not a written law but the invisible grammar of reality. The forces (Dominion, Entropy, Communion, Wrath, Memory) coexisted because the Covenant made coexistence possible. One force **broke the Covenant** — the reason is lost. Reality fractured into five realms, each dominated by one unchecked force. The realms now drift through the void, gravitationally drawn back toward each other. The game tracks their convergence.

### 2.2 The Ordained (Players)

**Nature:** Entities consecrated by the Covenant to maintain cosmic balance. When the Covenant shattered, they lost their purpose and discovered freedom. Now they seek to accumulate enough power to define reality's new order on **their own terms**.

**Key traits:**
- Travel **instantaneously** — cost is opportunity (one location per turn), not distance
- **Visible** to inhabitants — a shimmer, a pressure, an alien presence. Not in any myth or legend. Unprecedented, unexplained, clearly powerful.
- **Symmetric** for initial design — asymmetric concepts deferred to ideas list
- Have **personal rituals, selfish motives, and a progression system** (details TBD)
- Can **confront other Ordained directly** when co-located

**Open:** Personal progression system, ritual mechanics, confrontation mechanics.

### 2.3 Dominions

A dominion is a settlement/nation the Ordained controls through its ruler. One of two parallel influence systems (the other being religion).

- Established by visiting a location and influencing its ruler
- Direct control when present; conditional instructions when absent
- Influence decays **slowly** — recently-visited dominions are firmly held
- **More territory than all players can control** — by design
- Rivals can visit and attempt subversion (effectiveness depends on decay, abilities, establishment method)

**Open:** Exact decay curve, establishing method, inhabitant types, autonomous behaviour.

### 2.4 Religions

Religions are sacred oaths — fabricated belief systems that route souls. The second parallel influence system.

- **Separate from dominions** — can spread into uncontrolled territory
- **Self-sustaining** once established — grows organically without visits
- Creates **long-term vs short-term tension** with dominions
- Each religion has **belief tags** that route souls (Model A)
- Religion behaviour varies by realm energy (see §4.4)
- **Not the only source of souls** — rites, battles, relics also generate souls

**Open:** Full mechanical definition, spread speed, belief tag specifics, evolution/splintering.

### 2.5 Souls

Imprints of the old Covenant on living beings. Released at death.

- **Win condition:** Most souls at the Convergence wins
- **Spendable:** Fuel for rites — burning old-order authority to bend reality
- **Core tension:** Hoard for victory vs. spend for power
- Gained through: religions, rites, battles, relics, missions

**Open:** Exchange rate, spent soul economy, direct theft.

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

Full realm descriptions, inhabitants, and landscapes in [lore_complete.md §4](file:///Users/jseymour/jack_code/bg/lore_complete.md).

### 3.2 Realm Flow — N-Body Gravity

- Realms drift like bodies in a gravitational simulation
- **Short-term predictable, long-term chaotic** — trajectory lines widen and fade into the future
- Some realms attract (complementary forces), others repel
- Purely environmental — players cannot move realms

### 3.3 Two Levels of Interaction

1. **Access points** — temporary cross-realm edges when realms pass close. Travel possible, energies separate.
2. **Overlap / Collision** — permanent merge. Energies blend, new rites unlock, nodes combine or gain edges.

### 3.4 Realm Merging

All combinations are defined and escalate in power. See [lore_complete.md §7](file:///Users/jseymour/jack_code/bg/lore_complete.md) for the full matrix (10 pairs, 10 triples, 5 quads, 1 full).

**Key principle:** Each higher-order merge is strictly more powerful than its components. Merged zones unlock **new rites** unavailable in either realm alone, creating incentive to position around predicted overlaps.

**At the Convergence (full merge),** all energies coexist — the most complex and powerful game state. Convergence-only rites become available, including the Rite of the New Covenant (instant win).

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

### 4.1 Core Loop — Visit, Instruct, Move

Each turn:
1. **Set conditional instructions** for the dominion/religion at your location
2. **Take personal actions** — rites, rituals, relics, confrontations
3. **Choose next destination** (instant travel)

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
| **Persistence** | Decays without visits | Self-sustaining |
| **Primary use** | Military, territorial | Soul routing, destabilisation |

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

**Rites:** Realm-tied special actions at rite sites. Cost souls/resources, produce powerful effects. Merge zones unlock **new rites** unavailable in either realm alone.

**Relics:** Medium-to-high-impact persistent items. Found at locations, earned from missions, obtained through sacrifice or pillage. More than 5 total, not common. May have realm affinity.

**Open:** Specific rites per realm, relic count, relic rules.

### 4.6 Missions & Goals

Hidden personal objectives. Variable scope (local → realm-spanning → cross-realm). Reward souls/points/relics. Some require soul sacrifice or specific rites.

**Open:** Acquisition method, active mission count, public objectives.

### 4.7 Information & Espionage

**Visible:** Dominion ownership, general religion spread.
**Hidden:** Instructions, missions, influence levels.

**Espionage mechanics:**
1. **Scouting instructions** — order your dominion to scout a target; receive results on next visit. Costs an action slot + has delay.
2. **Rite/relic abilities** — one-time intelligence reveals.

**Open:** Scouting detail level, detection, counter-espionage.

### 4.8 Catch-Up

Natural catch-up through overexpansion (more dominions = more neglect = more vulnerability). Explicit catch-up TBD.

---

## 5. Turn Structure

**Simultaneous rounds.** Each player per turn:
1. Review state (realm positions, dominion status, scout reports)
2. Take personal actions at current location
3. Choose next destination

All autonomous dominions/religions execute. Realm flow advances one tick.

**Co-location:** Multiple Ordained at the same location → direct confrontation possible. Should be interesting, not punishing.

**Open:** Actions per turn, confrontation mechanics, round duration, global events, combat system.

---

## 6. Progression & Pacing

**The Convergence** — game ends when all realms fully merge. Most souls wins.

**Instant win** — Rite of the New Covenant at the Convergence zone. Massive cost, specific requirements.

**Escalation:** Early (isolated, local) → Mid (access points, cross-realm) → Late (collisions, chaos, full merge).

**Open:** Personal power growth, game length in rounds, Convergence timing predictability.

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
| 26 merge combination rite/rule tracking | Combinatorial complexity |

---

## 8. Resolved Decisions

| Decision | Resolution |
|----------|-----------|
| Player count | 4 |
| Game length | Long, high complexity |
| Lore cosmology | The Covenant / The Sundering |
| Player identity | The Ordained — fallen sacred agents, selfish |
| Player visibility | Visible to inhabitants, not in any myth |
| Realm count | 5 (fixed) |
| Realm identities | Dominion, Entropy, Communion, Wrath, Memory |
| Realm flow model | N-body gravity simulation |
| Board nodes/edges | Cities/landmarks, weighted travel routes |
| Instruction format | Conditional flowcharts, tiered complexity |
| Rival visits | Yes, effectiveness varies with decay |
| Soul routing | Model A (belief tags) |
| Souls spendable | Yes, as rite fuel |
| Religion system | Separate from dominions, two parallel systems |
| End condition | The Convergence |
| Instant win | Rite of the New Covenant |
| All merge combos | Defined (10 pairs, 10 triples, 5 quads, 1 full) |
| Tone | Dark Souls level |
| Sundering cause | Unknown in-lore |

---

## 9. Open Design Questions

| # | Category | Question |
|---|----------|----------|
| 1 | Player | Personal progression system |
| 2 | Player | Personal ritual mechanics |
| 3 | Player | Direct confrontation mechanics |
| 4 | Turns | Actions per turn / action budget |
| 5 | Rites | Specific rites per realm and merge zone |
| 6 | Religion | Full mechanical definition (spread, evolution, tags) |
| 7 | Combat | Combat system (deterministic? probabilistic?) |
| 8 | Board | Graph generation parameters |
| 9 | Missions | Acquisition, structure, count |
| 10 | Info | Scouting detail level, detection |
| 11 | Dominion | Establishing method, decay curve, inhabitant types |
| 12 | Souls | Exchange rate, spent soul economy |
| 13 | Pacing | Game length in rounds, Convergence timing |
| 14 | Catch-up | Explicit mechanic beyond natural overexpansion |

---

## 10. Ideas List — Future / Optional Mechanics

### 10.1 The Sundering Mechanic
At game start, one realm is secretly designated as the one whose force broke the Covenant. Slowly revealed through mid-game events. The guilty realm becomes **corrupted** with unique destabilising effects. Each force has a different reason and different corruption. Adds asymmetric world state per game without asymmetric players, plus a mystery subplot rewarding attentive play.

### 10.2 Sixth Realm — The Absence
A void-realm where the Covenant once resided. Not a standard realm — behaves differently (may not drift/merge like others). Energy of **Negation** — cancels other energies. Too dangerous for stable holdings, powerful for specific disruption. Could house the instant-win objective.

### 10.3 Dominion & Control
- **Stability-based decay resistance** — how you leave affects subversion difficulty
- **Partial subversion** — corrupt instructions, not full takeover
- **Supply chains** — economic production, supply lines between cities

### 10.4 Religion
- **Doctrine system** — composed doctrines (2-3 from a pool) affecting spread, compatibility, routing
- **Religion evolution/splintering** — unattended religions mutate
- **Holy sites** — nodes that amplify spread or bonus souls

### 10.5 Espionage
- **Observing** — spend a turn to learn everything about a location (high info, high opportunity cost)
- **Information networks** — permanent espionage infrastructure (expensive, detectable)
- **Counter-espionage** — detect scouts, plant false information
- **Misinformation** — fake instructions to mislead scouts

### 10.6 Player Identity
- **Asymmetric concepts** — each Ordained embodies a different abstract concept with unique abilities
- **Concept-realm affinity** — resonance with certain realms for bonus effectiveness

### 10.7 Realm & World
- **Player realm influence** — spend souls to nudge realm trajectories
- **World events** — realm-scale random/triggered events

### 10.8 Economy
- **Portable items** — carried between locations (logistics gameplay)
- **Technology/knowledge** — realm-specific advances transferable cross-realm
- **Soul flavours** — different soul types from different realms/religions

### 10.9 Endgame & Victory
- **Epoch structure** — 3 phases with different rules/scoring
- **Alternative victory conditions** — territorial dominance, religious hegemony
- **Model B soul routing** — hierarchical afterlife with contested claims

### 10.10 Social & Political
- **Binding pacts** — mechanically enforced temporary agreements
- **Tribute systems** — vassal-like dominion relationships
