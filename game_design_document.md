# Dark Fantasy Realm-Hopping Influence Game — Design Document

> **Status:** Active design — core systems taking shape, lore pending.
> **Last updated:** 2026-03-24

---

## 1. High-Level Vision

**Genre:** Digital-only board game. Dudes-on-a-map with mutable rules, hidden information, and indirect control.

**Setting:** Dark fantasy across multiple realms of existence. Aesthetic inspiration: **Berserk** (manga), **Dark Souls**, **Bloodborne** — the lore, tone, and player identities should feel abstract, idea-based, and never generic. No standard fantasy archetypes.

**Player fantasy:** You are a singular, powerful entity — something between a parasite and a god — that moves between shifting realms, manipulating rulers, founding deceptive religions, performing forbidden rituals, and routing souls through your grasp. You are selfish. Your dominions and religions are tools. The inhabitants are resources. The other players are threats to be outmanoeuvred, sabotaged, or confronted.

**Win condition:** Point-based, with multiple scoring avenues:
- **Souls** — the primary currency. Inhabitants' beliefs at death determine whose soul pool they feed. Souls can also be **spent** as a cost for powerful actions, creating a tension between hoarding (for points) and spending (for power).
- **Missions/goals** — personal objectives that reward points on completion.
- **Possible instant win** — completing a rare, difficult, lore-related objective ends the game immediately. Details pending lore development.

**Player count:** 4

**Key design pillars:**
1. **Orchestration** — managing multiple dominions and religions simultaneously across multiple realms, through conditional instructions that play out in your absence
2. **Prediction** — reading realm flow, anticipating rivals, and writing instructions robust enough to survive the unexpected
3. **Deception & hidden information** — your plans, instructions, and missions are secret; your religions are lies; your dominions are fronts
4. **Personal agency** — your character is not just a manager; they have their own rituals, confrontations, and selfish goals

**Game length:** Long — high complexity is a goal, not something to minimise

---

## 2. Theming & Lore

### 2.1 The World

**Cosmology seed:** There was an original, singular power. It fractured into many fragments, each becoming the foundational energy of a different realm. Each realm's nature — its physics, its magic, its inhabitants — is shaped by the character of its fragment. The realms were once unified; the game tracks their slow, gravitational drift back toward each other, culminating in the Convergence.

**Separate soul system:** Souls exist as a distinct metaphysical layer, separate from the power fragments. The precise relationship between souls and the power fragments is a key lore question — see [Lore Suggestions Document](file:///Users/jseymour/jack_code/bg/lore_suggestions.md).

**Aesthetic tone:** Inspired by **Berserk, Dark Souls, Bloodborne** — abstract, conceptual, never generic fantasy. The world should feel ancient, unknowable, and slightly wrong. Religions should feel like cosmic lies. Rituals should feel transgressive. The "dark" in dark fantasy comes from the moral void at the centre of the game — the players are not heroes, they are exploiters.

**Open lore questions:**
- `[OPEN]` What caused the original power to split?
- `[OPEN]` What is the relationship between power fragments and souls?
- `[OPEN]` Are there existing histories/cultures in the realms, or are they procedurally generated at game start?
- `[OPEN]` What are the specific identities of the ~5 realms?

### 2.2 The Players

**Nature:** Souls that interacted with the original power before or during its fracture. This contact made them fundamentally different from ordinary souls — they gained awareness, will, and the ability to move between realms. They are not gods (they have no inherent worshippers), not mortals (they have no physical form), and not ghosts (they have agency). They are something in between — parasitic intelligences that latch onto civilisations and steer them.

**Movement:** Players travel **instantaneously** to any location across any realm. The cost of movement is not distance — it is **opportunity**. You can only attend one dominion or location per turn. Every turn you spend somewhere is a turn you are not spending everywhere else.

**Asymmetry:** Not a priority for initial design. The game should work with symmetric players first. Asymmetric concepts and abilities can be layered on later if the core loop supports it. This is on the ideas list.

**Personal agency — the player is NOT just a manager:**
- Players have their own **selfish motives** beyond dominion control. They use dominions and religions as tools to achieve personal goals — obtaining specific relics, performing rituals, sacrificing souls, weakening rivals.
- Players can perform **personal rituals** using their own energy/resources (not dominion resources). These are direct, immediate actions that resolve on the turn they are performed.
- When multiple players choose the same location on the same turn, **direct confrontation** can occur — an abstract battle of wills between the entities themselves.
- Players should have a **personal progression system** — gaining something individually from their manipulations, beyond just accumulating souls and territory.

**Open questions:**
- `[OPEN]` What is the personal progression system? (Power growth? Unlocking abilities? Accumulating forbidden knowledge?)
- `[OPEN]` What do personal rituals look like mechanically?
- `[OPEN]` How does direct confrontation between players work?
- `[OPEN]` Do players have a visible identity to inhabitants, or are they always hidden?

### 2.3 Dominions

**Definition:** A dominion is a group of inhabitants (a city, a nation, a settlement) that a player has established control over, primarily by influencing its ruler. Dominions are one of the two parallel systems for influencing the world (the other being religion).

**Dominion control:**
- A player establishes control over a dominion by visiting a location and influencing its ruler
- When the player is present, they have direct control — they can issue any instruction
- When the player leaves, the dominion follows its last set of conditional instructions
- There is **more land/dominions available than all players can fully control** — this is by design, creating a landscape of contested, uncontested, and neglected territories

**Influence decay:**
- When a player leaves a dominion, their influence decays **slowly over time**
- A dominion left in a stable position with minimal instructions is harder to subvert than one left mid-expansion or mid-war
- Eventually, if left too long, a dominion may become fully autonomous (uncontrolled) or vulnerable to rival takeover
- The decay is slow enough that players cannot simply follow each other around flipping dominions — a recently-visited dominion is firmly under control

**Open questions:**
- `[OPEN]` What is the exact decay curve? (Slow linear for now)
- `[OPEN]` How does a player initially establish a dominion? (Visit + influence action? Must it be uncontrolled first?)
- `[OPEN]` Are there different types of inhabitants within a dominion? (Rulers, soldiers, commoners, priests)
- `[OPEN]` What autonomous actions does an uncontrolled dominion take?

### 2.4 Religions

**Definition:** Religions are the second parallel system for influencing the world. Unlike dominions (which require direct control over a ruler), religions spread through populations based on doctrine content and are the primary mechanism for routing souls.

**Key characteristics:**
- Religions are **separate from dominions** — a religion can spread into a dominion that a player doesn't control
- A player does NOT need to set up their religion in their own dominion — existing religions may already be present, and a player's dominion may follow a different player's religion
- Religions can be **grown in the background** — a player can establish a religion in a less-contested realm and let it spread organically while focusing their attention elsewhere
- This creates a **long-term vs short-term tension**: dominions give immediate control, religions give slow-burning influence and soul routing
- **Players are lying** — every religion is a fabrication designed to route souls. The "doctrines" are engineered for mechanical advantage, not spiritual truth

**Religion and war:**
- A religion spread into enemy-controlled territory can destabilise it, creating civil unrest or divided loyalties
- This is a non-military way to undermine a rival's dominion
- Conversely, a rival spreading their religion into YOUR dominion is a threat you must manage

**Soul routing (Model A — Belief Tags):**
- Each religion has a set of **belief tags** that define its doctrine
- When an inhabitant dies, their belief tags route the soul to the player whose soul-collection aligns with those tags
- Simple, clear, and directly connected to religion creation
- Religions are NOT the only way to get souls — special actions, relics, events, and rituals may also generate or capture souls

**Open questions:**
- `[OPEN]` What defines a religion mechanically beyond belief tags? (Organisational structure? Holy sites? Clergy?)
- `[OPEN]` How fast do religions spread organically?
- `[OPEN]` Can religions evolve or splinter without player intervention?
- `[OPEN]` What are the specific belief tags and how many does a religion have?
- `[OPEN]` How are souls contested when multiple religions claim similar tags?

### 2.5 Souls

**Victory currency AND spendable resource:**
- Souls are the primary way to win the game (most souls at the Convergence)
- However, souls can also be **spent** on powerful actions — rituals, acquiring relics, activating realm-specific powers
- This creates a core tension: **hoard souls for victory vs. spend souls for power**
- The player who spends freely may fall behind on points but gain capabilities that let them earn MORE souls later
- Alternative soul acquisition: besides religion, players can gain souls through special actions, relics, realm events, and possibly confrontations

**Open questions:**
- `[OPEN]` What is the exchange rate? How many souls does a typical action cost vs. how many does a religion generate per turn?
- `[OPEN]` Are spent souls gone forever, or do they re-enter the economy?
- `[OPEN]` Can souls be stolen directly from another player?

---

## 3. Board & World Structure

### 3.1 Realms

**Count:** ~5 realms, possibly slightly more. Fixed number — this allows lore, energy systems, and abilities to be tightly designed and coherent. A possible **lite version** with a subset of realms (e.g., 3) could serve as a shorter, introductory game mode.

**Power fragments:** Each realm is powered by a different fragment of the original power. The fragment determines:
- The realm's **energy/magic system** — what kinds of actions and powers are available there
- The realm's **aesthetic and inhabitants** — how the realm looks, feels, and what civilisations exist
- How the realm **interacts with other realms** when they overlap — which energies complement, conflict, or transform each other

**Realm flow — the n-body gravity model:**
- Realms move through a shared space like bodies in a gravitational simulation
- Movement is **slow and visually smooth**, creating a flowing, organic feel
- **Short-term predictable, long-term chaotic** — the exact property of n-body gravity systems. Players can see the predicted trajectories as lines that widen and fade the further into the future they project
- Realms attract and repel each other based on their energy systems — some pairs are drawn together (complementary), others drift apart (antagonistic)
- This is NOT just circular orbits — it should look like complex gravitational interplay, with close passes, temporary captures, and eventual mergers
- The flow is **purely environmental** — players cannot move the realms themselves

**Two levels of realm interaction:**
1. **Access points** — when realms pass close to each other, limited connections form between their subgraphs. Travel between realms is possible at these points, but the energy systems remain separate. Access points are temporary and shift as realms move.
2. **Overlap / Collision** — when realms collide deeply enough, they **permanently merge** in that area. Energies blend, rules combine, new cross-realm edges form (or nodes combine). Over time, more collisions occur until the Convergence — where all realms are jumbled together.

**Visualisation:**
- **Macro view (separate perspective):** Shows all realms as floating bodies in space with their predicted trajectories. Players use this view to predict when access points will form and when collisions will occur. Select a realm to zoom in.
- **Micro view (in-realm):** Shows the graph of cities/landmarks, dominion ownership, religion spread, troop positions, and local details of a specific realm.
- Possibly **3D** to better represent the spatial relationships between realms (the n-body model naturally exists in 3D space).

**Open questions:**
- `[OPEN]` How many realms exactly? 5? 6? 7?
- `[OPEN]` What are the specific energy systems and how do they complement/conflict?
- `[OPEN]` What happens to the energy system at overlap zones? Both apply? They merge into something new?
- `[OPEN]` How fast should the simulation run relative to game turns?

### 3.2 Board Topology

**Graph structure:**
- Each realm is a **procedurally generated subgraph**
- **Nodes** = cities or key landmarks within a realm
- **Edges** = travel routes between nodes, with **weighted movement costs** for troop/army movement
- The graph should feel organic, not gridlike — varying density, hub-and-spoke patterns, natural chokepoints

**Realm merging on the graph:**
- When an access point forms: new **temporary edges** connect nodes from different realm subgraphs. Travel is possible but energies don't blend.
- When overlap/collision occurs: either nodes **combine** (two cities merge into one hybrid city, with rules from both realms) or **permanent new edges** form between nearby nodes. Both can happen depending on the specifics of the overlap.

**Key locations:**
- Some nodes are **special sites** — rite sites, relic locations, ancient landmarks
- These give reasons to expand or invade — you want control of specific nodes for their strategic value, not just territory for territory's sake

**Open questions:**
- `[OPEN]` How is the graph generated? What parameters control density, connectivity, special sites?
- `[OPEN]` What determines whether nodes combine vs gain edges during overlap?
- `[OPEN]` How many nodes per realm?

---

## 4. Core Mechanics

### 4.1 Player Presence & Instruction-Setting (Core Loop)

**The core loop:** Each turn, the player is physically present at one location. They can:
1. **Set conditional instructions** for the dominion/religion at that location
2. Perform **personal actions** (rituals, confrontations, use relics, observe)
3. Choose their **next destination** for the following turn (instant travel)

Meanwhile, all their other dominions and religions execute their previously-set conditional instructions autonomously.

**Conditional instructions — tiered complexity:**

The instruction system supports a **range of complexity**, balanced so that simpler instructions are still effective:
- **Basic tier:** Simple, high-level directives — "Defend borders," "Expand north," "Recruit soldiers," "Spread religion." These are good defaults and sufficient for many situations.
- **Advanced tier:** Conditional flowcharts — "IF borders are attacked THEN defend, ELSE expand toward [selected node]." Adds responsiveness. Provides a moderate edge.
- **Expert tier:** Multi-branch decision trees with compound conditions — "IF [realm overlap detected nearby] AND [army size > threshold] THEN advance into overlap zone, ELIF [enemy religion spreading] THEN establish counter-religion, ELSE consolidate." Provides a small additional edge, not a decisive advantage.

**The interface supports all tiers:**
- **Visual flowchart builder** — drag-and-connect blocks for conditions and actions. This is the primary interface.
- **Map interaction** — click on nodes/areas on the map to auto-populate the flowchart (e.g., click a node to set it as an expansion target). This makes spatial instructions intuitive.
- **Code mode (optional)** — for players who prefer it, raw conditional logic can be written directly. This offers maximum control but is NOT required.

**Instruction limitations:**
- When instructions become impossible or irrelevant, the dominion **idles** — it does not act autonomously or improvise
- To modify instructions, the player must **physically return** — no remote updates
- The number of instruction nodes in a flowchart may be limited (to prevent overly complex programs)

**Open questions:**
- `[OPEN]` What is the max number of flowchart nodes per dominion?
- `[OPEN]` What conditions are available? (Border status, army size, religion spread, realm proximity, resource levels?)
- `[OPEN]` What actions are available in instructions? (Move troops, recruit, defend, expand, spread religion, build, trade?)

### 4.2 Dominion Control & Contestation

**Two parallel control systems:**
The game has two fundamentally different ways to influence the world:

| | Dominion Control | Religion |
|---|---|---|
| **How it works** | Direct control of a ruler through personal presence | Spread beliefs through populations |
| **Speed** | Immediate when present | Slow, organic spread |
| **Reach** | Only where you have a dominion | Can spread into territory you don't control |
| **Persistence** | Decays without visits | Self-sustaining once established |
| **Primary use** | Military, economic, territorial | Soul routing, destabilisation, long-term influence |
| **Key tension** | Requires frequent attention | Requires initial setup, then grows on its own |

**Dominion contestation:**
- Rival players CAN visit your dominion and attempt to subvert/influence it
- Effectiveness of subversion depends on:
  - **Time since original player's last visit** — recently-visited dominions are firmly held
  - **Abilities of both players** — some players may be better at subversion or resistance
  - **How the dominion was established** — a stable, contented dominion is harder to flip than one left mid-crisis
- Decay is slow enough that **following a player and immediately flipping their dominions is not viable** — there must be meaningful neglect before subversion becomes possible

**Open questions:**
- `[OPEN]` Can a player partially subvert a dominion (e.g., corrupt some of the instructions without fully taking over)?
- `[OPEN]` Is subversion visible to the original owner?
- `[OPEN]` How many turns of neglect before a dominion becomes vulnerable?

### 4.3 Rites & Powers (Realm-Tied Actions)

**Replacing the "items" concept:** Instead of portable items as logistics, the secondary action system is **rites and powers tied to realm energy systems.** The realm you are in determines what special actions are available.

**Rites and powers:**
- Certain locations in each realm are **rite sites** — ancient landmarks or places of power where special actions can be performed
- The type of rite available depends on the **realm's energy system** — each realm offers different categories of special actions
- When realms overlap, the combined energies may **unlock new rites** that neither realm could provide alone — this is a key incentive for exploiting overlap zones
- Rites can have **costs** (souls, dominion resources, turns of presence) and **powerful effects** (realm-scale manipulation, mass religion spread, army empowerment, soul harvesting)

**Relics:**
- A smaller number of **high-impact relics** exist in the game world (more than 3-5 but not common)
- Relics are found at specific locations, earned from completing missions, obtained by sacrificing souls, or pillaged from conquered sites
- Relics provide powerful, persistent abilities
- Relics give a **concrete reason to expand** — you want to control the node that holds a relic, not just accumulate territory
- Relics may have **realm affinity** — a relic from one realm might be especially powerful when used in a compatible realm

**Open questions:**
- `[OPEN]` What specific rites does each realm offer?
- `[OPEN]` How many relics per realm?
- `[OPEN]` Can relics be traded, stolen, or destroyed?
- `[OPEN]` What does a rite site look like on the graph?

### 4.4 Realm Interaction & Rule Mutation

**Per-realm rules:**
- Different realms have different rules that affect both players and inhabitants
- These differences stem from the realm's energy system — e.g., a realm of stagnation might make armies slow but defences powerful; a realm of hunger might make expansion fast but territory unstable
- The energy system also determines what rites are available and how religions behave locally

**Overlap rule blending:**
- When realms overlap, both sets of rules apply in the overlap zone — or they merge into something hybrid
- This creates unique tactical environments that are **temporary or permanent** depending on whether it was an access point or a full collision
- Skilled players exploit these rule interactions — positioning dominions and armies to take advantage of specific overlaps

**Open questions:**
- `[OPEN]` What are the actual per-realm rule differences? These need to be defined alongside the realm identities and energy systems
- `[OPEN]` How are conflicting rules resolved in overlap zones?

### 4.5 Missions & Goals

**Personal missions:**
- Players receive missions that reward points (and possibly relics/souls) on completion
- Missions are **hidden** — other players don't know what you're working toward
- Mission scope varies — from local objectives ("Control this specific city") to realm-spanning goals ("Have your religion be the dominant faith in Realm X") to cross-realm objectives ("Control nodes in 3 different realms simultaneously")
- Missions give structure and direction without dictating strategy
- Some missions might involve **sacrificing souls** or **performing specific rites** — tying into the spend-vs-hoard tension

**Open questions:**
- `[OPEN]` How are missions acquired? Drawn at game start? Earned over time? Chosen from a selection?
- `[OPEN]` How many active missions can a player have?
- `[OPEN]` Are there shared/public objectives in addition to hidden ones?

### 4.6 Information & Espionage

**Default visibility:**
- You can see **who controls which dominions** across all realms — ownership is public
- You can see the **general spread of religions** — which areas follow which faith
- You **cannot see:**
  - What conditional instructions any player has set at any dominion
  - What missions other players hold
  - Exact influence/loyalty levels at enemy dominions

**Gaining information (simplified espionage):**
Rather than a complex information network system, espionage is handled through two lighter mechanics:

1. **Scouting instructions:** When setting instructions for your dominion, one available action is **"Scout [target]"** — ordering your dominion to gather intelligence on a nearby enemy dominion or religion. The next time you visit that dominion, you receive the scouted information (enemy instructions, influence level, etc.). This ties espionage to the core loop naturally — it costs a dominion action slot and has a delay.

2. **Abilities/relics:** Specific relics or rite-site powers may grant one-time intelligence boosts — "reveal the instructions at [target dominion]" or "reveal a player's current mission." These are limited resources, not a permanent surveillance network.

**Open questions:**
- `[OPEN]` What exactly does scouting reveal? (Full instruction flowchart? Just the general directive? Army composition?)
- `[OPEN]` Can a player detect that they've been scouted?
- `[OPEN]` Is counter-espionage possible? (Setting traps, planting false instructions?)

### 4.7 Catch-Up Mechanic

**Natural catch-up through overexpansion:** The core loop already has a built-in catch-up element — a player with many dominions can only visit one per turn, meaning most are drifting toward autonomy. The player with fewer, more tightly controlled dominions may be more efficient.

**Additional catch-up mechanisms (to be designed):**
- `[OPEN]` Should there be explicit catch-up beyond the natural one? (e.g., bonus actions, cheaper rite costs, favourable events for trailing players)

---

## 5. Turn Structure

**Simultaneous rounds:**
- All 4 players take their actions at the same time each round
- Each player, on their turn:
  1. **Reviews** the current state — realm positions, dominion status, religion spread, incoming reports from scouts
  2. **Takes personal actions** at their current location — set/update instructions for the local dominion, perform rites, use relics, perform rituals, set scouting orders
  3. **Chooses their next destination** — where they will teleport to at the start of the next round
- **All autonomous dominions and religions execute** their conditional instructions simultaneously
- **Realm flow updates** — the n-body simulation advances one tick, realms drift, access points form or dissolve, collisions occur

**Co-location:**
- If multiple players choose the same destination, they are **all present at that location** during the round
- This enables **direct confrontation** between player entities — an abstract battle of wills
- The specifics of co-location interaction are TBD but it should be mechanically interesting, not punishing (players shouldn't avoid each other out of fear)
- Co-location might also enable **negotiation, threats, or temporary pacts** (though all unenforceable — this is a game of deception)

**Simultaneous action conflict:**
- When multiple autonomous dominions issue conflicting orders (e.g., two armies advancing on the same node), conflicts are resolved through a combat system
- `[OPEN]` Combat system details — is it deterministic (strength comparison), probabilistic (weighted random), or influenced by realm energy?

**Open questions:**
- `[OPEN]` How many personal actions per turn? (One? Multiple with an action point budget?)
- `[OPEN]` How does direct confrontation between players work?
- `[OPEN]` How long is a round in-world time?
- `[OPEN]` Should there be global events between rounds?

---

## 6. Progression & Pacing

**The Convergence:**
- The game ends when all realms have **fully merged** through gravitational collision — the fractured power is reassembling
- This is visible from the start — players can see the n-body simulation trending toward merger — but the exact timing depends on the chaotic flow
- Scoring happens at the Convergence: the player with the **most souls** wins (plus mission bonuses)

**Possible instant win:**
- A rare, extremely difficult lore-related objective that, if completed, ends the game immediately with that player winning
- This should require multi-realm coordination, significant soul expenditure, relic acquisition, and long-term planning
- Its existence adds paranoia — if a player seems to be pursuing something unusual, they might be going for the instant win
- `[OPEN]` What is this objective? Must be tied to the lore (e.g., "reassemble a fragment of the original power" or "perform the Convergence rite before it happens naturally")

**Escalation:**
- **Early game:** Realms are separated. Players establish initial dominions and religions in their starting realms. Actions are local, planning is long-range.
- **Mid game:** Access points form as realms drift close. Cross-realm expansion begins. Religion spread becomes a strategic weapon. Relics become contested.
- **Late game:** Collisions cause permanent merging. The board becomes interconnected and chaotic. Every player's dominions and religions are intermixed. Rule blending creates novel tactical situations.

**Open questions:**
- `[OPEN]` Do players grow in personal power over the game? If so, how?
- `[OPEN]` How many rounds does a typical game last?
- `[OPEN]` Is the Convergence's exact timing knowable, or only approximate?

---

## 7. Digital-Only Affordances

These are mechanics that are **only possible** because this is a video game:

| Feature | Why It Requires Digital |
|---------|----------------------|
| Conditional instruction flowchart builder | Complex branching logic couldn't be tracked manually |
| N-body realm flow simulation | Real-time chaotic physics simulation with trajectory prediction |
| 3D realm visualisation with macro/micro views | Dynamic spatial representation impossible on a flat board |
| Per-realm rule variation, automatically enforced | Too many conditional rules for players to remember and enforce |
| Hidden instructions and missions | Guarantee of no cheating or accidental reveals |
| Influence decay tracking per dominion | Continuous, per-turn state tracking across all dominions |
| Autonomous dominion behaviour | NPC decision-making for unattended dominions |
| Soul routing calculations | Cross-referencing religion tags with soul destinations each turn |
| Scouting with delayed results | Async information delivery tied to player visits |
| Procedural graph generation | New board every game |

---

## 8. Open Design Questions (Summary)

> Ordered roughly by priority — earliest questions unlock the most downstream decisions.

| # | Category | Question | Status |
|---|----------|----------|--------|
| 1 | Lore | What is the specific lore/cosmology? (See lore doc) | `[OPEN]` |
| 2 | Realms | How many realms and what are their energy systems? | `[OPEN]` ~5 |
| 3 | Souls | What are the specific belief tags for soul routing? | `[OPEN]` Model A confirmed |
| 4 | Turns | What personal actions can a player take per turn? | `[OPEN]` |
| 5 | Rites | What specific rites does each realm offer? | `[OPEN]` |
| 6 | Player | What is the personal progression system? | `[OPEN]` |
| 7 | Player | How does direct confrontation work? | `[OPEN]` |
| 8 | Religion | What defines a religion mechanically beyond belief tags? | `[OPEN]` |
| 9 | Board | How is the graph procedurally generated? | `[OPEN]` |
| 10 | Combat | What is the combat system? | `[OPEN]` |
| 11 | Missions | How are missions acquired and structured? | `[OPEN]` |
| 12 | Info | What does scouting reveal specifically? | `[OPEN]` |
| 13 | Instant win | What is the instant win objective? | `[OPEN]` |
| 14 | Pacing | How many rounds in a typical game? | `[OPEN]` |
| — | Scope | Player count | ✅ 4 |
| — | Scope | Game length | ✅ Long |
| — | Board | Node/edge definition | ✅ Cities/landmarks, weighted travel routes |
| — | Core loop | Instruction format | ✅ Conditional flowcharts, tiered complexity |
| — | Core loop | Rival dominion visits | ✅ Yes, effectiveness varies with decay |
| — | Realms | Realm flow model | ✅ N-body gravity simulation |
| — | Realms | Realm count type | ✅ Fixed |
| — | Souls | Routing model | ✅ Model A (belief tags) |
| — | Souls | Spendable? | ✅ Yes, as cost for actions |
| — | Religion | Separate from dominions? | ✅ Yes, two parallel systems |
| — | Endgame | End condition | ✅ The Convergence |

---

## 9. Ideas List — Future / Optional Mechanics

> These are ideas that are interesting but may add too much complexity for the initial design. They are preserved here for potential inclusion later.

### 9.1 Dominion & Control
- **Stability-based decay resistance:** How you leave a dominion affects how hard it is to subvert. A dominion left in a stable, contented state with minimal orders is harder to flip than one left mid-crisis. Currently simplified to uniform slow decay.
- **Partial subversion:** Instead of fully flipping a dominion, a rival could corrupt specific instructions, plant misinformation, or turn a single unit rather than the whole dominion.
- **Supply chains:** Dominions could have economic production and require supply lines between cities. Would add a logistics layer but significantly increases complexity.

### 9.2 Religion
- **Doctrine system:** Instead of simple belief tags, religions could have composed doctrines (2-3 chosen from a larger pool) that affect spread speed, realm compatibility, and soul routing. Adds strategic depth to religion creation.
- **Religion evolution/splintering:** Unattended religions could mutate over time — doctrines shifting, sects forming, heresies emerging. The player would need to revisit and "reform" to keep control.
- **Holy sites:** Specific nodes that amplify a religion's spread or provide bonus souls. Worth controlling but not required.

### 9.3 Espionage & Information
- **Observing:** Instead of setting instructions at a dominion, the player can choose to spend their turn **observing** — learning everything about that location (enemy instructions, hidden units, influence levels). Costs a full turn of instruction-setting. High information but high opportunity cost.
- **Information networks:** A more permanent espionage infrastructure — placing agents in enemy dominions that provide ongoing intelligence. Expensive to set up, detectable, and can be dismantled. Provides persistent information flow rather than one-off scouting.
- **Counter-espionage:** Detecting and dismantling enemy scouts or agents. Setting traps that feed false information.
- **Misinformation:** Setting fake instructions that enemy scouts would discover, misleading rivals about your plans.

### 9.4 Player Identity
- **Asymmetric player concepts:** Each player represents a different abstract concept (Entropy, Hunger, Stillness, Severance, etc.) with unique abilities, motives, and goals. Adds replayability and thematic depth. Requires careful balancing.
- **Concept-realm affinity:** Each player concept resonates with certain realms — they are more effective there, gain bonus abilities, or have easier influence. Creates natural starting positions and preferred territories.

### 9.5 Realm & World
- **Player realm influence:** Players could have limited ability to nudge realm flow — spending souls to slightly accelerate or deflect a realm's trajectory. Would make the Convergence itself a contested event.
- **World events:** Random or triggered events that affect entire realms — plagues, wars, magical phenomena. Could provide catch-up mechanics or create crises that all players must react to.

### 9.6 Economy & Items
- **Portable items:** Instead of realm-tied rites, collectible items that can be carried between locations. Creates logistics gameplay but overlaps with existing systems.
- **Technology/knowledge:** Inhabitants in certain realms could develop unique technologies or magical knowledge that, when brought to other realms, provides advantages. A reason to expand cross-realm.
- **Soul economy depth:** Souls as a complex currency with different "flavours" based on the realm or religion of origin. Different rites require different soul types.

### 9.7 Endgame & Victory
- **Epoch structure:** The game divided into 3 phases (Separation → Drift → Convergence) with different rules and scoring per epoch. Adds structure to the long game.
- **Alternative victory conditions:** Beyond souls and instant win — territorial dominance, religious hegemony, ritual completion as separate paths to victory.
- **Model B soul routing:** Hierarchical afterlife system where multiple players can claim overlapping criteria for souls. More complex but creates interesting contestation.

### 9.8 Social & Political
- **Binding pacts:** Formal agreements between players that are mechanically enforced (for a limited time). Both players benefit, but there's a cost to breaking the pact.
- **Tribute systems:** Weaker dominions paying tribute to stronger ones in exchange for protection. Creates vassal-like relationships.
