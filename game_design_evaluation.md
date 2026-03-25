# Game Design Evaluation — v3

> Post-lore-finalization assessment.

---

## 1. Progress Summary

The design has crossed a threshold. With lore finalized, the game now has a **coherent identity** — every system can be explained through the lens of the Covenant, the Ordained, and the five forces.

| Area | v2 Status | v3 Status | Change |
|------|-----------|-----------|--------|
| Lore / cosmology | 🔴 Open | ✅ Finalized | The Covenant, the Sundering, the Ordained |
| Realm identities | 🔴 Open | ✅ Finalized | Dominion, Entropy, Communion, Wrath, Memory |
| Realm energy systems | 🔴 Open | ✅ Finalized | Authority, Transformation, Connection, Force, Preservation |
| Realm merging (all combos) | 🔴 Open | ✅ Defined | 10 pairs + 10 triples + 5 quads + 1 full |
| Player identity | 🟡 Partial | ✅ Finalized | The Ordained — selfish, visible, fallen |
| Core loop | ✅ High | ✅ High | Unchanged |
| Soul economy | ✅ High | ✅ High | Now lore-grounded (soul = Covenant imprint) |
| Instruction system | 🟡 Medium | 🟡 Medium | Still needs UX prototyping |
| Religion mechanics | 🔴 Low | 🟡 Partial | Per-realm behaviour defined, core mechanics still open |
| Combat | 🔴 Low | 🔴 Low | Still undefined |
| Turn structure | 🔴 Low | 🔴 Low | Outline only |
| Personal progression | 🔴 Low | 🔴 Low | Concept only |
| Missions | 🔴 Low | 🔴 Low | Structure undefined |

**Resolved:** 18 decisions locked. **Open:** 14 questions remaining.

---

## 2. What the Lore Unlocked

### Rites Now Have Context
With five specific forces defined, rites have a natural taxonomy. Authority rites (Dominion), Transformation rites (Entropy), Connection rites (Communion), Force rites (Wrath), Preservation rites (Memory). Merge-zone rites are combinations. This means the rite design problem is now solvable — you just need to ask "what would Authority + Transformation let you do?" for each pair.

### Religion Behaviour Is Realm-Specific
The per-realm religion table (rigid in Dominion, fast-spreading in Communion, conquest-based in Wrath, etc.) gives religions genuine tactical variety. A religion in the Entropy realm plays completely differently from one in Memory. This makes the "where do I found my religion?" question interesting — not just "where's the biggest population?" but "which realm mechanics suit my needs?"

### The Merge Matrix Creates Natural Escalation
The 26-combination matrix is ambitious but works because each merge follows logically from its components. Players can intuit what Dominion + Wrath means (military hierarchy) without memorising a table. The names help — "The Furnace," "The Theocracy," "The Crusade" — each evokes the gameplay immediately.

### The Ordained Have Clear Motivation
"Never serve again. Define the new order with yourself at the centre." This is clean, universal (applies equally to all 4 players), and dark without being edgy. It's the motivation of someone who was a tool and refuses to be one again. Every action in the game maps to this: dominions = territory for your new order, religions = loyalty mechanisms, souls = authority fuel, rites = demonstrations of power.

---

## 3. Remaining Risks

### 🔴 The Merge Matrix Is Untested

26 merge combinations, each with a named effect and a unique rite. This is a LOT of design surface area. Some concerns:

- **Balance:** Higher-order merges are "strictly more powerful," but does the escalation curve feel smooth? Or does one triple merge dominate? Testing won't happen until implementation, but the conceptual design should at least identify which merges are likely overpowered.
- **Clarity:** Can a player in their first game intuit what a triple merge does? The pair merges are intuitive (two forces combined). The triples are less so (three forces — what does Entropy + Communion + Wrath mean when you're staring at the board?). The names help ("The Maelstrom") but the UI will need to surface merge effects clearly.
- **Implementation:** Each merge needs custom rule logic. 26 unique rule-sets is substantial engineering.

**Suggestion:** Consider having **merge effects compound additively** rather than each being fully unique. For example, a triple merge could grant all three pair-merge effects simultaneously (plus one additional synergy bonus), rather than having a completely novel effect. This reduces the design/engineering burden from 26 unique effects to 10 pair effects + 16 synergy bonuses — still complex but more manageable. The pair merges are the building blocks; higher merges stack them.

### 🟡 Religion Still Needs Its Mechanical Skeleton

Per-realm behaviour is defined, but the core questions remain unanswered:
- How does a player **found** a religion? (Action at a location? Cost?)
- How many **belief tags** exist and how does a player choose them?
- What determines **spread speed** concretely? (Adjacent nodes per turn? Population-based?)
- Can a player have **multiple religions**?

These are blocking questions. Without concrete religion mechanics, you cannot prototype the dominion-religion tension, which is one of the game's best design features.

**Concrete suggestion for religion founding:**
1. The Ordained visits an uncontrolled location (costs one turn of presence)
2. Chooses 2 belief tags from a pool (e.g., obedience, sacrifice, connection, defiance, remembrance, transformation, fury, communion, silence, perseverance)
3. The religion begins at that node and spreads to adjacent nodes at ~1 node per 2-3 turns
4. Spread is modified by realm energy (faster in Communion, slower in Memory)
5. A player can have **multiple religions** — each is a separate entity with its own tags and spread pattern
6. Religions do NOT require management (unlike dominions) — this is their key advantage

### 🟡 Turn Structure Needs an Action Budget

The core loop says: set instructions + personal actions + choose destination. But how many personal actions? One? Three? Unlimited?

**Suggestion: 2 action points per turn.** Setting instructions costs 1 AP. Each personal rite/ritual costs 1 AP. Using a relic costs 1 AP. Scouting costs 1 AP. Choosing your destination is free. This forces a choice: do you update your dominion's instructions AND scout? Or do you perform a rite AND found a religion? Never both. Constraint breeds strategy.

### 🟡 Combat System — Keep It Simple

Combat will happen (dominions have armies, expansion takes nodes) but it shouldn't be the focus. This is a manipulation game, not a wargame.

**Suggestion: Deterministic with realm modifiers.**
- Each army has a **strength value** based on size + realm energy bonuses
- Larger army wins; defender advantage of +20%
- Losers take casualties proportional to the strength ratio
- Realm energy modifies: Wrath gives +attack, Dominion gives +defence, Entropy causes extra casualties on both sides, Communion allows reinforcement from adjacent nodes, Memory preserves defeated units as "echoes" that fight again next turn
- No dice. No randomness. Pure positioning and resource allocation.

---

## 4. Top Priorities (Updated)

| # | Question | Why It's Blocking | Suggested Answer |
|---|---------|-------------------|-----------------|
| 1 | **Religion mechanics** | Core system, undefined | Founding = 1 turn + 2 tags. Spread = 1 node / 2-3 turns, realm-modified. Multiple allowed. |
| 2 | **Actions per turn** | Turn structure is skeletal | 2 action points. Instructions = 1 AP, rites = 1 AP, destination = free. |
| 3 | **Combat system** | Inevitable but undefined | Deterministic strength comparison with realm modifiers. |
| 4 | **Personal progression** | Player identity post-lore | Forbidden Knowledge — gain understanding of realm energies through exploration. |

These four answers would make the game **prototypable**. Everything else (missions, scouting detail, graph generation) can be designed during or after a first prototype.
