# Dark Fantasy Realm-Hopping Influence Game — Design Document

> **Status:** Early design — capturing ideas, identifying open questions.
> This document will be iterated on until every section is thoroughly defined before implementation begins.

---

## 1. High-Level Vision

**Genre:** Digital-only board game. Dudes-on-a-map with mutable rules and hidden information.

**Setting:** Dark fantasy. Multiple realms of existence. Aesthetic inspiration: **Berserk** (manga), **Dark Souls**, **Bloodborne** — the lore should feel abstract, idea-based, and never generic.

**Player fantasy:** You are a powerful being that moves between realms, manipulating rulers, founding deceptive religions, and routing souls through your domain — all while the fabric of reality shifts around you.

**Win condition:** Point-based. The primary currency is **souls** — the beliefs of inhabitants at death determine where their soul goes, and players want to amass the most. Additional points from completed missions/goals.

**Player count:** 4

**Key design pillars:**
- Orchestrating multiple dominions simultaneously across multiple realms
- Prediction — of other players, of realm shifts, of your own dominions' autonomous behaviour
- Managing hidden information and deception

**Game length:** Long — high complexity is a goal, not something to minimise

---

## 2. Theming & Lore

### 2.1 The World
- **Lore seed:** There was an original, singular power that was split into many fragments. Each fragment became the background power of a different realm, determining how that realm was formed, its abilities, and how it interacts with other realms.
- There is a separate system related to souls (details TBD)
- Aesthetic tone: inspired by **Berserk, Dark Souls, Bloodborne** — abstract, conceptual, never generic fantasy
- `[OPEN]` Are there existing histories/cultures in the realms, or are they generated?
- `[OPEN]` What caused the original power to split? Was it deliberate, accidental, or inevitable?
- `[OPEN]` What is the relationship between the power fragments and the soul system?

### 2.2 The Players
- Players are **souls that interacted with the original power** before/during the split
- Players can travel to any realm/dominion **instantaneously** — movement cost is not distance but **opportunity** (you can only attend one dominion per turn)
- **Asymmetric** — each player represents a different **abstract concept or idea**, not a generic archetype. Should feel like concepts from Berserk's God Hand or Dark Souls' Lords — things like Entropy, Hunger, Stillness, Severance — not "fire mage" or "warrior"
- Each player has unique abilities, motives, and goals tied to their concept
- `[OPEN]` What are the 4 player concepts specifically?
- `[OPEN]` Do players have a visible identity to inhabitants, or are they always hidden?
- `[OPEN]` Do players have an affinity for certain power fragments / realms?

### 2.3 Dominions
- **Dominions** are the groups of inhabitants that a player controls
- Inhabitants exist in the realms and can be influenced
- Rulers can be directly manipulated when a player is present
- `[OPEN]` How intelligent/autonomous are inhabitants? Do they have personalities, desires?
- `[OPEN]` Are there different types (rulers, priests, soldiers, commoners)?
- `[OPEN]` How does a player acquire a new dominion? Conquer? Convert? Found?

### 2.4 Souls
- Souls are the primary victory currency
- What inhabitants believe at death determines where their soul goes
- `[OPEN]` What does "where the soul goes" mean mechanically?
- `[OPEN]` Can souls be contested, stolen, redirected after death?

---

## 3. Board & World Structure

### 3.1 Realms
- Multiple realms of existence, each powered by a different **fragment of the original power**
- **Fixed number of realms** — allows lore and abilities to be tightly designed and coherent
- Possible future: a **lite version** with a subset of realms for a shorter/easier game
- Each realm has a distinct **magic/energy system** derived from its power fragment
- Energy systems can **complement each other** when realms are close — creating strategic windows
- Realms are **constantly flowing** — slow, somewhat predictable movement
- Over time, realms progressively **merge together** until they are all jumbled at the endgame
- When realms overlap, both are permanently altered
- **Two levels of realm interaction:**
  1. **Access points** — limited connections where travel between realms is possible, but powers don't blend
  2. **Overlap** — deeper merging where the powers/rules of each realm blend and more of the map is connected
- Players can observe realm movement from a **separate viewing perspective** (macro view) to predict flow, then select a realm for detailed information
- Could be visualised in **3D** to better represent the spatial relationships between realms
- `[OPEN]` How many realms specifically?
- `[OPEN]` What are the distinct magic/energy systems? How do they complement each other?
- `[OPEN]` How are merged rules resolved when realms overlap?
- `[OPEN]` Is realm flow purely environmental or can players influence it?

### 3.2 Board Topology
- Procedurally graph-based — should feel "flowy"
- Each realm is its own subgraph
- Access points = edges connecting nodes across realm subgraphs
- Overlap = larger regions where subgraphs merge and rules blend
- Board changes continuously as realms flow
- Not necessarily 2D — 3D representation may better convey realm relationships
- **Nodes** = cities or key landmarks
- **Edges** = travel routes, with **weighted movement costs** for troop movement
- When realms merge: nodes can **combine** (merging locations) OR **gain new edges** between them — both happen depending on the situation
- `[OPEN]` How is the graph generated? What parameters control it?
- `[OPEN]` What determines whether nodes combine vs. gain edges during overlap?

---

## 4. Core Mechanics

### 4.1 Player Presence & Instruction-Setting (Core Loop)
- A player can only be in one place at a time — they are a single entity
- **Instant travel** — the player can teleport to any dominion, but can only attend **one dominion per turn**
- **Core loop:** Visit a dominion → set **conditional instructions** → move on next turn → orchestrate all simultaneously
- **Conditional instructions:** "If X happens, do Y; otherwise, do Z" — the most expressive instruction format
- If instructions become impossible or irrelevant, the dominion **idles**
- Influence decays **gradually** when the player is absent (not quickly)
- The challenge: managing multiple dominions across multiple realms, predicting realm shifts and rival actions, writing robust conditional instructions
- To modify instructions, the player must **physically return** — no remote updates
- **Rival players CAN visit your dominion** and attempt to subvert/override control
- How effective a rival's subversion is depends on a combination of:
  - How long since the original player last visited
  - Abilities of both the original and the rival player
  - How the original player first established control over the dominion
- `[OPEN]` How many conditional instructions can you set at once?
- `[OPEN]` What is the decay curve? Linear? Exponential? Stepped?
- `[OPEN]` At what point does a dominion become fully autonomous / uncontrolled?
- `[OPEN]` What specifically can a rival do when visiting your dominion? (Full takeover? Partial sabotage? Plant misinformation?)

### 4.2 Influence & Control
- Players manipulate rulers and establish religions
- Players can create contradictory religions across (or within) realms
- `[OPEN]` How is "influence" tracked? A numeric value? A loyalty state?
- `[OPEN]` What can an influenced ruler actually do for you?
- `[OPEN]` What happens when two players contest the same ruler/location?

### 4.3 Religion Creation
- Players can found religions with specific doctrines
- Religions determine where souls go at death
- Players are "lying" — religions are tools of manipulation
- `[OPEN]` What defines a religion mechanically? (A set of doctrines/beliefs?)
- `[OPEN]` Can religions spread organically without player intervention?
- `[OPEN]` Can religions evolve or splinter over time?

### 4.4 Realm Interaction & Rule Mutation
- Different realms have different rules for both players and inhabitants
- When realms overlap, rules change permanently
- `[OPEN]` What kinds of rules differ? (Combat? Movement? Influence strength? Available actions?)
- `[OPEN]` How are merged rules resolved? Player choice? Deterministic merge logic?

### 4.5 Items & Powers (Secondary Mechanics)
- Beyond movement and instruction-setting, players collect **items and powers** as they move through the world
- Items/powers can be **found, earned, or acquired** from specific locations — giving a reason to expand into certain areas
- Items have **realm compatibility** — an item found in one realm might be especially powerful when brought to a different, compatible realm
- Items/powers can be used for:
  - Special actions for dominions
  - Combat or conflicts
  - Enhancing player abilities in specific realms
- This creates a **logistics layer**: expand to get an item → bring it to where it's most useful
- There should be more depth here — items alone may not be enough
- `[OPEN]` How are items acquired? Tied to locations? Events? Dominion actions?
- `[OPEN]` How do items interact with realm energy systems specifically?
- `[OPEN]` Is combat item-based, deterministic, or dice-based?
- `[OPEN]` What other secondary mechanics should exist beyond items?

### 4.6 Missions & Goals
- Players receive missions/cards that reward points for achieving objectives
- `[OPEN]` Are missions public or hidden?
- `[OPEN]` Are missions drawn randomly, chosen, or assigned?
- `[OPEN]` What is the scope of a mission?

### 4.7 Information & Espionage
- **Default visibility:** You can see who currently controls which dominions. That's it.
- You **cannot** see what instructions other players have set, or what missions they hold
- **Information networks:** You can invest in setting up espionage to learn the preset instructions other players have left at specific dominions
- `[OPEN]` What does "setting up an information network" cost? Is it an action? A resource?
- `[OPEN]` Can information networks be detected and dismantled by the target player?
- `[OPEN]` What other intel can you gain beyond instructions? (Player location? Missions? Influence levels?)
- `[OPEN]` Is there counter-espionage? Misinformation?

### 4.8 Catch-Up Mechanic
- There should be a mechanic to help players who fall behind
- `[OPEN]` What form does this take? (Bonus actions? Cheaper costs? Event cards?)

---

## 5. Turn Structure

- **Simultaneous rounds** — all players take actions at the same time in a given round
- Previously-set instructions for unattended groups also execute during the round
- Realms flow continuously — realm state updates each round
- `[OPEN]` What actions can a player take in a round? (Move + one action? Multiple actions? Action points?)
- `[OPEN]` How is simultaneous action conflict resolved? (Priority? Simultaneous resolution with clashes?)
- `[OPEN]` Are there global events between rounds?
- `[OPEN]` Does the player take actions for their attended group AND set instructions? Or is setting instructions the action?
- `[OPEN]` How long is a round meant to represent in-world?

---

## 6. Progression & Pacing

- `[OPEN]` How does the game escalate over time?
- `[OPEN]` Is there an endgame trigger or a fixed number of rounds?
- `[OPEN]` Do players grow in power? If so, how?
- `[OPEN]` How do you prevent runaway leaders?

---

## 7. Digital-Only Affordances

These are mechanics that are **only possible** because this is a video game:
- Complex NPC decision-making for unattended dominions
- Procedural graph-based board generation and continuous realm flow
- 3D visualisation of realm spatial relationships
- Macro/micro view switching (realm flow overview ↔ individual realm detail)
- Per-realm rule variation, automatically enforced
- Conditional instruction execution and evaluation
- Hidden information without cheating risk
- Complex state tracking (influence decay, soul routing, multiple religions)
- `[OPEN]` Anything else that should exploit the digital medium?

---

## 8. Open Design Questions (Summary)

> These are the highest-priority questions that need answers before design can be considered complete.

| # | Category | Question | Status |
|---|----------|----------|--------|
| 1 | Scope | How many players? | ✅ 4 |
| 2 | Scope | Approximate game length? | ✅ Long |
| 3 | Identity | What are the player-beings? | ✅ Souls that interacted with the original power |
| 4 | Asymmetry | Are players asymmetric or symmetric? | ✅ Asymmetric — abstract concepts |
| 5 | Lore | What are the 4 player concepts? | `[OPEN]` |
| 6 | Realms | How many realms specifically? | `[OPEN]` |
| 7 | Realms | What are the distinct energy systems per realm? | `[OPEN]` |
| 8 | Realms | Can players influence realm flow? | `[OPEN]` |
| 9 | Board | How is the graph generated? | `[OPEN]` |
| 10 | Board | What determines node-combine vs edge-add during overlap? | `[OPEN]` |
| 11 | Turns | What actions can a player take per round? | `[OPEN]` |
| 12 | Items | How are items acquired and what else beyond items? | `[OPEN]` |
| 13 | Influence | How is influence tracked and contested? | `[OPEN]` |
| 14 | Religion | What defines a religion mechanically? | `[OPEN]` |
| 15 | Souls | How does soul routing work? | `[OPEN]` |
| 16 | Lore | Relationship between power fragments and souls? | `[OPEN]` |
| 17 | Lore | What caused the original power to split? | `[OPEN]` |
| 18 | Info | What does setting up an info network cost? | `[OPEN]` |
| 19 | Pacing | What triggers the end of the game? | `[OPEN]` |
| — | Naming | Term for controlled groups? | ✅ Dominions |
| — | Board | What are nodes and edges? | ✅ Cities/landmarks, weighted travel routes |
| — | Core loop | Can rivals visit your dominions? | ✅ Yes, effectiveness varies |
