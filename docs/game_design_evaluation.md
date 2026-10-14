# Game Design Evaluation — v5 (Prototype-Ready)

---

## 1. Status: Prototype-Ready

**35 decisions resolved. 7 open questions remain — all implementation-level tuning.**

The design has reached the point where further theoretical work gives diminishing returns. Every system is defined. Every system connects to the others. What remains is content lists and number tuning — work that requires a playable prototype to do well.

---

## 2. Completeness by System

| System | Status | What's Defined | What Remains |
|--------|--------|---------------|-------------|
| **Lore** | ✅ Done | Covenant, Sundering, Ordained, 5 realms, soul nature | Nothing |
| **Core loop** | ✅ Done | Visit → instruct → act → move, 2 AP, free destination | Nothing |
| **Dominions** | ✅ Done | Establishing (1 AP), decay (~3-4%/turn), subversion, instructions | Inhabitant types, autonomous AI |
| **Religions** | ✅ Done | Founding, 15 belief tags, 6 instructions, stability/collapse, overexpansion risk, per-realm behaviour | Fine-tuning collapse sensitivity |
| **Souls** | ✅ Done | Win condition + spendable, combat souls, religion routing, inflated numbers | Exact exchange rate |
| **Realm flow** | ✅ Done | N-body gravity, access points, overlap/collision, additive merge model | — |
| **Merging** | ✅ Done | Additive rules + separate event/city layer, visual design per combo | Event/city content lists |
| **Personal rituals** | ✅ Done | 4 base (Sight, Binding, Severance, Harvest) + acquired abilities | — |
| **Confrontation** | ✅ Done | Confront/retreat, soul bid, loser loses turn, modifiers from cards/relics | — |
| **Combat** | 🟡 Framework | Deterministic + slight randomness, cards [TOGGLEABLE], religion influence, combat souls | Exact numbers, card list |
| **Missions** | 🟡 Functional | 3 at start, variable rewards, discard/redraw | Needs post-prototype expansion |
| **Espionage** | ✅ Done | Scouting (directive + size), special abilities for full flowchart, Rite of Sight | — |
| **Rites (site-specific)** | 🟡 Framework | Architecture exists, rite sites on graph, merge stacking | Per-realm rite lists |
| **Relics** | 🔴 List needed | Architecture exists (AP cost, limited-use, realm affinity) | Actual relic list |
| **Board generation** | 🟡 Framework | Procedural graph, nodes/edges, rite sites, relic nodes | Parameters and algorithm |
| **Progression** | ✅ Done | Through relics/rites/missions, no separate track | — |
| **Catch-up** | ✅ Done | None explicit — natural overexpansion | — |
| **Pacing** | ✅ Done | ~30-40 rounds, Convergence ±5 variance | — |

---

## 3. The 7 Remaining Opens

All are tuning/content items — none are structural questions.

| # | Item | Type | When to Resolve |
|---|------|------|----------------|
| 1 | Combat numbers (strength values, randomness range) | Tuning | During prototype playtesting |
| 2 | Combat card list | Content | During prototype — start with 5-6, expand |
| 3 | Rite-site rites per realm | Content | During prototype — start with 2 per realm |
| 4 | Relic list and acquisition rules | Content | During prototype — start with 5-8 |
| 5 | Graph generation algorithm | Engineering | During implementation |
| 6 | Merge event/city content per pair | Content | During or after prototype |
| 7 | Soul economy numbers | Tuning | During prototype playtesting |

---

## 4. Strengths of the Final Design

### The Four Tensions Are Rock-Solid
Each tension is now mechanically supported by multiple interlocking systems:

| Tension | Mechanical Support |
|---------|-------------------|
| **Hoard vs spend** | Souls = win condition AND rite fuel AND confrontation bid AND festival cost |
| **Breadth vs depth** | 2 AP + decay + subversion + religion collapse risk |
| **Short vs long term** | Dominions (instant, decaying) vs religions (slow, self-sustaining) |
| **Act vs prepare** | Personal rituals (immediate) vs flowchart instructions (autonomous) |

### Toggleable Complexity Is Smart for Development
Belief tags, combat cards, and religion special actions can be toggled. This means:
- A minimal prototype needs only: dominions + religions (without tags) + souls + realm flow
- Tags layer on strategic depth when ready
- Cards layer on tactical depth when ready
- Each toggle-on can be tested independently

### The Instruction System Has Two Flavours
Dominions get full conditional flowcharts (complex, deep, expressive). Religions get a simpler commandment-style system (6 actions, conditions possible but lighter). This differentiation is excellent — it makes the two systems feel genuinely different to manage, not just "instructions but for religion."

### Confrontation Is Elegant
Confront-or-retreat with soul bidding is:
- Simple (one decision, one number)
- Lore-fitting (souls = authority = power in a contest of wills)
- Strategically interesting (do you confront and risk your turn, retreat and waste it, or hope they don't confront?)
- Expandable (cards/relics/area effects can modify without changing the core mechanic)

---

## 5. Watch-Points for Prototyping

### Religion Stability Tuning
The stability system (0-100, fracture risk below 20) is the right shape. But the sensitivity needs careful tuning:
- Too harsh → players never expand religions → soul routing is weak → game stalls
- Too lenient → players always fast-expand → no tension → boring

**Recommendation:** Start lenient. Let players spam expansions, observe what happens, then tighten.

### The 2 AP Budget
2 AP is elegant but tight. In late-game (many dominions, religions, merge events, rites available), players may feel stuck. Monitor whether 2 AP still feels good at round 30+. If not, consider:
- 3 AP in late game (when 3+ realms have merged)
- Free instruction updates for dominions visited within the last 3 turns

### Additive Merging at Scale
When all 5 realms merge at the Convergence, all 5 rule-sets apply simultaneously. Is this overwhelming? In theory, additive stacking is easier to understand than 26 unique systems. In practice, 5 rule-sets at once might still be a lot. The UI will need to surface "active rules here" clearly.

### Soul Inflation
"Numbers should feel like death counts" is thematic but needs care. If a religion generates 50 souls/turn late-game and rites cost 500, the numbers are manageable. If they're generating 5000 and rites cost 50000, UI clutter becomes an issue. Pick a scale and stick with it.

---

## 6. Implementation Priority

If you were to start building a prototype, this is the order that gives you a playable game fastest:

1. **Board generation** — procedural graph for one realm
2. **Dominion system** — establish, instruct, decay
3. **Turn loop** — 2 AP, destination, simultaneous resolution
4. **Religion system** — found, spread, instructions (WITHOUT belief tags initially)
5. **Soul economy** — basic generation and routing
6. **Realm flow** — n-body simulation for 5 realms, access points, merging
7. **Combat** — deterministic strength comparison
8. **Toggle on:** Belief tags, combat cards, religion special actions
9. **Content:** Rites, relics, merge events, missions
