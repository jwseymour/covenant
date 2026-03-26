/**
 * Religion logic — the second core parallel influence system.
 *
 * GDD §2.4: Religions are sacred oaths — fabricated belief systems
 * that route souls. Founded by visiting a region and spending 1 AP.
 *
 * GDD §4.4: Each realm's energy affects religion behaviour differently.
 * lore_complete.md §6: "Every religion is a lie."
 */

import type {
  Religion,
  ReligionId,
  BeliefTag,
  BeliefTagDefinition,
} from '../types/religion.js';
import { ALL_BELIEF_TAGS, BELIEF_TAG_REALM } from '../types/religion.js';
import type {
  ReligionInstruction,
} from '../types/instruction.js';
import type { GameState } from '../types/game-state.js';
import type { RealmGraph, NodeId } from '../types/graph.js';
import type { RealmId } from '../types/realm.js';
import type { PlayerId } from '../types/player.js';
import { getActiveRealms } from './merge-logic.js';

// ─── Constants ──────────────────────────────────────────────────

/** Initial stability when founding a religion. */
export const INITIAL_STABILITY = 80;

/** Initial follower percentage at founding node. */
export const INITIAL_FOLLOWER_PCT = 100;

/** Base spread rate per tick (per adjacent node). */
const BASE_SPREAD_RATE = 0.12;

/** Spread amount per successful spread (% of target population). */
const BASE_SPREAD_AMOUNT = 10;

/** Stability recovered per turn from gradual/hold growth. */
const STABILITY_RECOVERY = 1;

/** Stability lost per node gained when fast-expanding. */
const STABILITY_LOSS_PER_NODE = 3;

/** Threshold for nodes gained that triggers stability loss. */
const FAST_EXPANSION_THRESHOLD = 2;

/** Stability lost per attacked node per turn. */
const STABILITY_LOSS_PER_ATTACK = 5;

/** Fracture threshold — below this, risk of fracture. */
export const FRACTURE_THRESHOLD = 20;

/** Fracture probability per turn when below threshold. */
const FRACTURE_CHANCE = 0.3;

/** Percentage of outer nodes lost on fracture. */
const FRACTURE_NODE_LOSS_PCT = 0.3;

/** Turns of soul routing disruption after fracture. */
const FRACTURE_DISRUPTION_TURNS = 3;

/** Soul generation per follower-node per turn. */
const SOULS_PER_NODE = 5;

/** Sacred festival soul cost. */
export const SACRED_FESTIVAL_COST = 25;

/** Sacred festival stability boost. */
const SACRED_FESTIVAL_STABILITY_BOOST = 15;

/** Sacred festival spread multiplier (for 1 turn). */
const SACRED_FESTIVAL_SPREAD_MULT = 1.5;

// ─── Realm Spread Multipliers (GDD §4.4) ───────────────────────

/**
 * How each realm's energy affects religion spread.
 */
export function getRealmSpreadMultiplier(activeRealms: Set<RealmId> | RealmId): number {
  const realms = typeof activeRealms === 'string' ? new Set([activeRealms]) : activeRealms;
  let mult = 1.0;
  if (realms.has('communion')) mult *= 2.5;
  if (realms.has('entropy')) mult *= 1.8;
  if (realms.has('dominion')) mult *= 0.5;
  if (realms.has('memory')) mult *= 0.3;
  if (realms.has('wrath')) mult *= 0.2;
  return mult;
}

/** Realm-specific stability modifier (Entropy = less stable). */
export function getRealmStabilityModifier(activeRealms: Set<RealmId> | RealmId): number {
  const realms = typeof activeRealms === 'string' ? new Set([activeRealms]) : activeRealms;
  let mult = 1.0;
  if (realms.has('dominion')) mult *= 2.5;
  if (realms.has('memory')) mult *= 2.0;
  if (realms.has('entropy')) mult *= 0.4;
  if (realms.has('wrath')) mult *= 0.7;
  if (realms.has('communion')) mult *= 0.8;
  return mult;
}

/** Realm-specific decay resistance (Memory = very slow decay). */
export function getRealmDecayResistance(activeRealms: Set<RealmId> | RealmId): number {
  const realms = typeof activeRealms === 'string' ? new Set([activeRealms]) : activeRealms;
  let res = 0.04; // base
  if (realms.has('memory')) res -= 0.03; // almost none
  if (realms.has('dominion')) res -= 0.02;
  if (realms.has('entropy')) res += 0.04;
  if (realms.has('wrath')) res += 0.02;
  return Math.max(0, res);
}

// ─── Belief Tag Definitions (GDD §2.4 full table) ──────────────

export const BELIEF_TAG_DEFINITIONS: Record<BeliefTag, BeliefTagDefinition> = {
  // ── Dominion ──
  obedience: {
    tag: 'obedience', realmId: 'dominion', name: 'Obedience',
    description: 'Loyal followers, hard to subvert',
    combatModifier: 0, spreadModifier: -0.1, decayModifier: 0.2, soulYieldModifier: 1.0,
  },
  sacrifice: {
    tag: 'sacrifice', realmId: 'dominion', name: 'Sacrifice',
    description: 'Higher soul yield, population declines faster',
    combatModifier: 0, spreadModifier: 0, decayModifier: 0, soulYieldModifier: 1.5,
  },
  order: {
    tag: 'order', realmId: 'dominion', name: 'Order',
    description: 'Religion resists mutation, stays exactly as founded',
    combatModifier: 0, spreadModifier: -0.1, decayModifier: 0.3, soulYieldModifier: 1.0,
  },
  // ── Entropy ──
  renewal: {
    tag: 'renewal', realmId: 'entropy', name: 'Renewal',
    description: 'Religion regenerates after damage',
    combatModifier: 0, spreadModifier: 0, decayModifier: 0.15, soulYieldModifier: 1.0,
  },
  abandon: {
    tag: 'abandon', realmId: 'entropy', name: 'Abandon',
    description: 'Fast spread, followers don\'t fight well',
    combatModifier: -0.2, spreadModifier: 0.3, decayModifier: -0.1, soulYieldModifier: 1.0,
  },
  adaptation: {
    tag: 'adaptation', realmId: 'entropy', name: 'Adaptation',
    description: 'Auto-adjusts to local compatibility',
    combatModifier: 0, spreadModifier: 0.15, decayModifier: 0, soulYieldModifier: 1.0,
  },
  // ── Communion ──
  unity: {
    tag: 'unity', realmId: 'communion', name: 'Unity',
    description: 'Followers reinforce adjacent nodes',
    combatModifier: 0, spreadModifier: 0.1, decayModifier: 0.1, soulYieldModifier: 1.0,
  },
  empathy: {
    tag: 'empathy', realmId: 'communion', name: 'Empathy',
    description: 'Strong defence, weak attack',
    combatModifier: -0.15, spreadModifier: 0.05, decayModifier: 0.2, soulYieldModifier: 1.0,
  },
  communion: {
    tag: 'communion', realmId: 'communion', name: 'Communion',
    description: 'Merges with local beliefs rather than displacing them',
    combatModifier: 0, spreadModifier: 0.2, decayModifier: 0, soulYieldModifier: 0.9,
  },
  // ── Wrath ──
  fury: {
    tag: 'fury', realmId: 'wrath', name: 'Fury',
    description: 'Combat bonus, more casualties',
    combatModifier: 0.3, spreadModifier: 0, decayModifier: -0.1, soulYieldModifier: 1.2,
  },
  defiance: {
    tag: 'defiance', realmId: 'wrath', name: 'Defiance',
    description: 'Very hard to suppress/dismantle',
    combatModifier: 0.1, spreadModifier: -0.05, decayModifier: 0.3, soulYieldModifier: 1.0,
  },
  conquest: {
    tag: 'conquest', realmId: 'wrath', name: 'Conquest',
    description: 'Spreads automatically into conquered territory',
    combatModifier: 0.1, spreadModifier: 0.15, decayModifier: 0, soulYieldModifier: 1.1,
  },
  // ── Memory ──
  remembrance: {
    tag: 'remembrance', realmId: 'memory', name: 'Remembrance',
    description: 'Very slow decay, nearly permanent',
    combatModifier: 0, spreadModifier: -0.15, decayModifier: 0.5, soulYieldModifier: 1.0,
  },
  wisdom: {
    tag: 'wisdom', realmId: 'memory', name: 'Wisdom',
    description: 'Scouting bonus from controlled areas',
    combatModifier: 0, spreadModifier: 0, decayModifier: 0.1, soulYieldModifier: 1.0,
  },
  tradition: {
    tag: 'tradition', realmId: 'memory', name: 'Tradition',
    description: 'Existing religions in the area resist being displaced',
    combatModifier: 0, spreadModifier: -0.2, decayModifier: 0.4, soulYieldModifier: 1.0,
  },
};

// ─── Religion Event Types ───────────────────────────────────────

export interface ReligionEvent {
  religionId: ReligionId;
  type: 'founded' | 'spread' | 'decay' | 'fracture' | 'instruction_executed'
    | 'holy_war' | 'sacred_festival' | 'stability_warning' | 'suppressed';
  message: string;
}

// ─── Graph Helpers ──────────────────────────────────────────────

function getAdjacentNodeIds(nodeId: NodeId, graph: RealmGraph): NodeId[] {
  const adjacent: NodeId[] = [];
  for (const edge of graph.edges) {
    if (edge.severed) continue;
    if (edge.sourceNodeId === nodeId) adjacent.push(edge.targetNodeId);
    else if (edge.targetNodeId === nodeId) adjacent.push(edge.sourceNodeId);
  }
  return adjacent;
}

// ─── Founding ───────────────────────────────────────────────────

let religionCounter = 0;

export function generateReligionId(): ReligionId {
  return `rel-${Date.now()}-${++religionCounter}`;
}

/**
 * Found a new religion at a node. GDD §2.4: costs 1 AP.
 */
export function foundReligion(
  playerId: PlayerId,
  nodeId: NodeId,
  realmId: RealmId,
  name: string,
  beliefTags: [BeliefTag, BeliefTag] | [],
  turn: number,
): Religion {
  return {
    id: generateReligionId(),
    founderId: playerId,
    foundedRealmId: realmId,
    foundedNodeId: nodeId,
    name,
    foundedTurn: turn,
    beliefTags,
    followersByNode: { [nodeId]: INITIAL_FOLLOWER_PCT },
    nodeCount: 1,
    stability: INITIAL_STABILITY,
    fractured: false,
    fractureTurnsRemaining: 0,
    instructions: null,
    soulsPerTurn: SOULS_PER_NODE,
    soulRoutingDisrupted: false,
  };
}

// ─── Spread Compatibility ───────────────────────────────────────

/**
 * Compute spread compatibility score for a religion at a given node.
 * Tags matching the local realm → bonus. Tags clashing → penalty.
 */
function computeCompatibility(
  religion: Religion,
  targetRealmId: RealmId,
): number {
  if (religion.beliefTags.length === 0) return 1.0; // No tags = neutral

  let score = 1.0;
  for (const tag of religion.beliefTags) {
    const tagRealm = BELIEF_TAG_DEFINITIONS[tag].realmId;
    if (tagRealm === targetRealmId) {
      score += 0.5; // Tag matches local realm
    } else {
      score -= 0.15; // Tag doesn't match
    }
  }
  return Math.max(0.1, score);
}

/**
 * Get total spread modifier from belief tags.
 */
function getTagSpreadModifier(religion: Religion): number {
  if (religion.beliefTags.length === 0) return 0;
  return religion.beliefTags.reduce(
    (sum, tag) => sum + BELIEF_TAG_DEFINITIONS[tag].spreadModifier, 0
  );
}

/**
 * Get total decay modifier from belief tags.
 */
function getTagDecayModifier(religion: Religion): number {
  if (religion.beliefTags.length === 0) return 0;
  return religion.beliefTags.reduce(
    (sum, tag) => sum + BELIEF_TAG_DEFINITIONS[tag].decayModifier, 0
  );
}

/**
 * Get soul yield modifier from belief tags.
 */
export function getSoulYieldModifier(religion: Religion): number {
  if (religion.beliefTags.length === 0) return 1.0;
  return religion.beliefTags.reduce(
    (mult, tag) => mult * BELIEF_TAG_DEFINITIONS[tag].soulYieldModifier, 1.0
  );
}

// ─── Religion Spread ────────────────────────────────────────────

/**
 * Compute how many rival religions have presence at a node.
 */
function countRivalReligionsAtNode(
  nodeId: NodeId,
  thisReligionId: ReligionId,
  religions: Record<ReligionId, Religion>,
): number {
  let count = 0;
  for (const rel of Object.values(religions)) {
    if (rel.id === thisReligionId) continue;
    if (rel.followersByNode[nodeId] && rel.followersByNode[nodeId] > 0) {
      count++;
    }
  }
  return count;
}

interface SpreadResult {
  religion: Religion;
  nodesGained: number;
  events: ReligionEvent[];
}

/**
 * Spread a religion for one tick.
 * Attempts to expand into adjacent unoccupied nodes.
 */
export function spreadReligion(
  religion: Religion,
  graph: RealmGraph,
  state: GameState,
  rateMultiplier: number = 1.0,
  activeRealms?: Set<RealmId>,
): SpreadResult {
  const events: ReligionEvent[] = [];
  const newFollowers = { ...religion.followersByNode };
  let nodesGained = 0;

  // Don't spread if fractured
  if (religion.fractured) {
    return { religion, nodesGained: 0, events };
  }

  const realmsToUse = activeRealms ?? new Set([graph.realmId]);
  const realmMultiplier = getRealmSpreadMultiplier(realmsToUse);
  const tagModifier = 1.0 + getTagSpreadModifier(religion);

  // Get instruction rate modifier
  let instrMultiplier = 1.0;
  if (religion.instructions) {
    const activeInstruction = getActiveInstruction(religion);
    if (activeInstruction) {
      switch (activeInstruction.action) {
        case 'hold': return { religion, nodesGained: 0, events }; // No spread
        case 'slow_spread': instrMultiplier = 0.5; break;
        case 'fast_spread': instrMultiplier = 2.0; break;
        default: break;
      }
    }
  }

  const effectiveRate = BASE_SPREAD_RATE * realmMultiplier * tagModifier * instrMultiplier * rateMultiplier;

  // For each node with followers, try to spread to adjacent nodes
  const currentNodes = Object.keys(newFollowers);
  for (const nodeId of currentNodes) {
    if (newFollowers[nodeId] <= 0) continue;

    const adjacentIds = getAdjacentNodeIds(nodeId, graph);
    for (const adjId of adjacentIds) {
      // Skip if already has followers here
      if (newFollowers[adjId] && newFollowers[adjId] > 0) continue;

      // Compute spread probability
      const compatibility = computeCompatibility(religion, graph.realmId);
      const rivalCount = countRivalReligionsAtNode(adjId, religion.id, state.religions);
      
      // GDD §4.4: Communion naturally absorbs competing beliefs (bonus instead of penalty)
      let rivalPenalty = Math.max(0.1, 1.0 - rivalCount * 0.3);
      if (graph.realmId === 'communion') {
        rivalPenalty = 1.0 + rivalCount * 0.5;
      }

      const node = graph.nodes.find((n) => n.id === adjId);
      const popFactor = node ? Math.min(1.5, node.population / 100) : 1.0;

      const spreadChance = effectiveRate * compatibility * rivalPenalty * popFactor;

      if (Math.random() < spreadChance) {
        newFollowers[adjId] = Math.min(100, BASE_SPREAD_AMOUNT + Math.random() * 5);
        nodesGained++;
        events.push({
          religionId: religion.id,
          type: 'spread',
          message: `"${religion.name}" spread to ${adjId}`,
        });
      }
    }

    // Also grow followers at existing nodes (consolidation)
    if (newFollowers[nodeId] < 100) {
      const growthAmount = 3 + Math.random() * 5;
      newFollowers[nodeId] = Math.min(100, newFollowers[nodeId] + growthAmount);
    }
  }

  // Apply follower decay at very low presence nodes
  const decayResistance = getRealmDecayResistance(realmsToUse);
  const tagDecay = getTagDecayModifier(religion);
  const effectiveDecay = Math.max(0, decayResistance - tagDecay * 0.02);

  for (const nodeId of Object.keys(newFollowers)) {
    if (nodeId === religion.foundedNodeId) continue; // Don't decay at founding node
    if (newFollowers[nodeId] <= 30) {
      newFollowers[nodeId] -= effectiveDecay * 100;
      if (newFollowers[nodeId] <= 0) {
        delete newFollowers[nodeId];
        events.push({
          religionId: religion.id,
          type: 'decay',
          message: `"${religion.name}" lost followers at ${nodeId}`,
        });
      }
    }
  }

  const nodeCount = Object.keys(newFollowers).length;

  return {
    religion: { ...religion, followersByNode: newFollowers, nodeCount },
    nodesGained,
    events,
  };
}

// ─── Stability ──────────────────────────────────────────────────

/**
 * Update stability based on growth rate and attacks.
 * GDD §2.4 collapse mechanics.
 */
export function updateStability(
  religion: Religion,
  nodesGained: number,
  nodesAttacked: number,
  realmId: RealmId,
  activeRealms?: Set<RealmId>,
): { religion: Religion; events: ReligionEvent[] } {
  const events: ReligionEvent[] = [];
  let stability = religion.stability;

  const realmsToUse = activeRealms ?? new Set([realmId]);
  const realmStabilityMod = getRealmStabilityModifier(realmsToUse);

  // Fast expansion penalty
  if (nodesGained > FAST_EXPANSION_THRESHOLD) {
    const penalty = (nodesGained - FAST_EXPANSION_THRESHOLD) * STABILITY_LOSS_PER_NODE;
    stability -= penalty / realmStabilityMod;
  }

  // Attack penalty
  if (nodesAttacked > 0) {
    stability -= nodesAttacked * STABILITY_LOSS_PER_ATTACK;
  }

  // Gradual recovery
  stability += STABILITY_RECOVERY * realmStabilityMod;

  // Hold instruction bonus
  if (religion.instructions) {
    const activeInstr = getActiveInstruction(religion);
    if (activeInstr?.action === 'hold') {
      stability += 2 * realmStabilityMod;
    }
  }

  // Clamp
  stability = Math.max(0, Math.min(100, stability));

  // Warning
  if (stability < FRACTURE_THRESHOLD && stability > 0) {
    events.push({
      religionId: religion.id,
      type: 'stability_warning',
      message: `"${religion.name}" stability critical (${stability.toFixed(0)})`,
    });
  }

  return {
    religion: { ...religion, stability },
    events,
  };
}

/**
 * Check for fracture and apply if triggered.
 * GDD §2.4: Below 20, each turn has a chance of fracture.
 */
export function checkFracture(
  religion: Religion,
  graph: RealmGraph,
): { religion: Religion; events: ReligionEvent[] } {
  const events: ReligionEvent[] = [];

  if (religion.fractured) {
    // Already fractured — tick down recovery
    const turnsRemaining = religion.fractureTurnsRemaining - 1;
    if (turnsRemaining <= 0) {
      return {
        religion: {
          ...religion,
          fractured: false,
          fractureTurnsRemaining: 0,
          soulRoutingDisrupted: false,
        },
        events: [{
          religionId: religion.id,
          type: 'fracture',
          message: `"${religion.name}" recovered from fracture`,
        }],
      };
    }
    return {
      religion: { ...religion, fractureTurnsRemaining: turnsRemaining },
      events,
    };
  }

  if (religion.stability >= FRACTURE_THRESHOLD) {
    return { religion, events };
  }

  // Fracture check
  // GDD §4.4: Entropy is highly unstable, fracture chance triples.
  const checkChance = graph.realmId === 'entropy' ? FRACTURE_CHANCE * 3.0 : FRACTURE_CHANCE;
  if (Math.random() >= checkChance) {
    return { religion, events }; // Lucky — no fracture
  }

  // FRACTURE! Lose outermost nodes
  const nodeIds = Object.keys(religion.followersByNode);
  if (nodeIds.length <= 1) {
    return { religion, events }; // Can't fracture a single-node religion
  }

  // Find "outer" nodes — those furthest from the founding node via BFS
  const distances = bfsDistances(religion.foundedNodeId, graph);
  const sortedByDist = nodeIds
    .filter((id) => id !== religion.foundedNodeId)
    .sort((a, b) => (distances.get(b) ?? 999) - (distances.get(a) ?? 999));

  const nodesToLose = Math.max(1, Math.floor(sortedByDist.length * FRACTURE_NODE_LOSS_PCT));
  const lostNodes = sortedByDist.slice(0, nodesToLose);

  const newFollowers = { ...religion.followersByNode };
  for (const nodeId of lostNodes) {
    delete newFollowers[nodeId];
  }

  // Tag drift: mutate one of the Belief Tags based on the local realm energy
  let driftMsg = '';
  let newBeliefTags: [BeliefTag, BeliefTag] | [] = [...religion.beliefTags] as typeof religion.beliefTags;
  
  if (religion.beliefTags.length === 2) {
      const realmTags = ALL_BELIEF_TAGS.filter(tag => BELIEF_TAG_REALM[tag] === graph.realmId);
      const newTag = realmTags[Math.floor(Math.random() * realmTags.length)];
      const driftIndex = Math.floor(Math.random() * 2);
      const oldTag = religion.beliefTags[driftIndex];
      
      if (oldTag !== newTag && !religion.beliefTags.includes(newTag)) {
         const mutated = [...religion.beliefTags] as [BeliefTag, BeliefTag];
         mutated[driftIndex] = newTag;
         newBeliefTags = mutated;
         driftMsg = ` Tag Drift: Doctrine altered from "${oldTag}" to "${newTag}".`;
      }
  }

  events.push({
    religionId: religion.id,
    type: 'fracture',
    message: `"${religion.name}" fractured! Lost ${lostNodes.length} nodes. Soul routing disrupted.${driftMsg}`,
  });

  return {
    religion: {
      ...religion,
      beliefTags: newBeliefTags,
      followersByNode: newFollowers,
      nodeCount: Object.keys(newFollowers).length,
      fractured: true,
      fractureTurnsRemaining: FRACTURE_DISRUPTION_TURNS,
      soulRoutingDisrupted: true,
    },
    events,
  };
}

function bfsDistances(startId: NodeId, graph: RealmGraph): Map<NodeId, number> {
  const distances = new Map<NodeId, number>();
  distances.set(startId, 0);
  const queue = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = distances.get(current)!;
    for (const adjId of getAdjacentNodeIds(current, graph)) {
      if (!distances.has(adjId)) {
        distances.set(adjId, currentDist + 1);
        queue.push(adjId);
      }
    }
  }
  return distances;
}

// ─── Religion Instructions ──────────────────────────────────────

/**
 * Get the highest-priority active instruction for a religion.
 */
function getActiveInstruction(religion: Religion): ReligionInstruction | null {
  if (!religion.instructions) return null;
  const sorted = [...religion.instructions.instructions].sort((a, b) => a.priority - b.priority);
  return sorted[0] || null;
}

/**
 * Execute religion instructions for one tick.
 * GDD §2.4: 6 base actions.
 */
export function executeReligionInstructions(
  religion: Religion,
  _graph: RealmGraph,
  state: GameState,
): { religion: Religion; events: ReligionEvent[]; soulCost: number } {
  const events: ReligionEvent[] = [];
  let rel = { ...religion };
  let soulCost = 0;

  if (!religion.instructions) return { religion: rel, events, soulCost };

  for (const instr of religion.instructions.instructions) {
    switch (instr.action) {
      case 'spread_toward': {
        // Handled by spread rate — just log
        events.push({
          religionId: rel.id,
          type: 'instruction_executed',
          message: `"${rel.name}" spreading toward ${instr.targetNodeId ?? 'unknown'}`,
        });
        break;
      }

      case 'hold': {
        events.push({
          religionId: rel.id,
          type: 'instruction_executed',
          message: `"${rel.name}" holding — consolidating faith`,
        });
        break;
      }

      case 'slow_spread':
      case 'fast_spread': {
        events.push({
          religionId: rel.id,
          type: 'instruction_executed',
          message: `"${rel.name}" ${instr.action === 'fast_spread' ? 'aggressively spreading' : 'spreading cautiously'}`,
        });
        break;
      }

      case 'resist_suppression': {
        events.push({
          religionId: rel.id,
          type: 'instruction_executed',
          message: `"${rel.name}" resisting suppression`,
        });
        break;
      }

      case 'holy_war': {
        // Reduce rival religion followers at contested nodes
        if (instr.targetReligionId) {
          const rival = state.religions[instr.targetReligionId];
          if (rival) {
            events.push({
              religionId: rel.id,
              type: 'holy_war',
              message: `"${rel.name}" waging holy war against "${rival.name}"`,
            });
          }
        }
        break;
      }

      case 'sacred_festival': {
        // Costs souls, boosts stability and spread
        soulCost = SACRED_FESTIVAL_COST;
        rel = {
          ...rel,
          stability: Math.min(100, rel.stability + SACRED_FESTIVAL_STABILITY_BOOST),
        };
        events.push({
          religionId: rel.id,
          type: 'sacred_festival',
          message: `"${rel.name}" held sacred festival (−${SACRED_FESTIVAL_COST} souls, +${SACRED_FESTIVAL_STABILITY_BOOST} stability)`,
        });
        break;
      }
    }
  }

  return { religion: rel, events, soulCost };
}

// ─── Soul Generation ────────────────────────────────────────────

/**
 * Calculate souls generated by a religion this turn.
 * GDD §2.5: "proportional to coverage".
 */
export function calculateSoulsGenerated(religion: Religion): number {
  if (religion.soulRoutingDisrupted) return 0;

  const yieldMod = getSoulYieldModifier(religion);
  let total = 0;

  for (const [_nodeId, followerPct] of Object.entries(religion.followersByNode)) {
    total += SOULS_PER_NODE * (followerPct / 100) * yieldMod;
  }

  return Math.floor(total);
}

// ─── Full Religion Tick ─────────────────────────────────────────

export interface ReligionTickResult {
  religion: Religion;
  events: ReligionEvent[];
  soulsGenerated: number;
  soulCost: number;
}

/**
 * Process one full tick for a religion:
 * 1. Execute instructions
 * 2. Spread
 * 3. Update stability
 * 4. Check fracture
 * 5. Calculate soul generation
 */
export function tickReligion(
  religion: Religion,
  graph: RealmGraph,
  state: GameState,
): ReligionTickResult {
  const allEvents: ReligionEvent[] = [];
  let rel = { ...religion };
  const activeRealms = getActiveRealms(state, graph.realmId);

  // 1. Execute instructions
  const instrResult = executeReligionInstructions(rel, graph, state);
  rel = instrResult.religion;
  allEvents.push(...instrResult.events);

  // 2. Spread
  const festivalActive = instrResult.events.some((e) => e.type === 'sacred_festival');
  const spreadMult = festivalActive ? SACRED_FESTIVAL_SPREAD_MULT : 1.0;
  const spreadResult = spreadReligion(rel, graph, state, spreadMult, activeRealms);
  rel = spreadResult.religion;
  allEvents.push(...spreadResult.events);

  // 3. Update stability
  // Count nodes attacked by enemy dominions
  let nodesAttacked = 0;
  for (const dom of Object.values(state.dominions)) {
    if (dom.ownerId === rel.founderId) continue;
    // Check if dominion is instructed to suppress this religion
    if (dom.instructions) {
      const entry = dom.instructions.nodes[dom.instructions.entryNodeId];
      if (entry?.action.type === 'suppress_religion' && entry.action.targetReligionId === rel.id) {
        nodesAttacked += dom.controlledNodeIds.filter((nid) => rel.followersByNode[nid]).length;
      }
    }
  }

  const stabResult = updateStability(rel, spreadResult.nodesGained, nodesAttacked, graph.realmId, activeRealms);
  rel = stabResult.religion;
  allEvents.push(...stabResult.events);

  // 4. Check fracture
  const fractureResult = checkFracture(rel, graph);
  rel = fractureResult.religion;
  allEvents.push(...fractureResult.events);

  // 5. Calculate soul generation
  const soulsGenerated = calculateSoulsGenerated(rel);
  rel = { ...rel, soulsPerTurn: soulsGenerated };

  return {
    religion: rel,
    events: allEvents,
    soulsGenerated,
    soulCost: instrResult.soulCost,
  };
}

/**
 * Tick ALL religions in the game. Returns updated religions + events + soul income.
 */
export function tickAllReligions(
  religions: Record<ReligionId, Religion>,
  state: GameState,
): {
  religions: Record<ReligionId, Religion>;
  events: ReligionEvent[];
  soulIncome: Record<PlayerId, number>;
  soulCosts: Record<PlayerId, number>;
} {
  const allEvents: ReligionEvent[] = [];
  const updated: Record<ReligionId, Religion> = {};
  const soulIncome: Record<PlayerId, number> = {};
  const soulCosts: Record<PlayerId, number> = {};

  for (const [id, rel] of Object.entries(religions)) {
    const graph = state.realmGraphs[rel.foundedRealmId];
    if (!graph) {
      updated[id] = rel;
      continue;
    }

    const stateWithUpdated = { ...state, religions: { ...religions, ...updated } };
    const result = tickReligion(rel, graph, stateWithUpdated);
    updated[id] = result.religion;
    allEvents.push(...result.events);

    // Accumulate soul income and costs per player
    soulIncome[rel.founderId] = (soulIncome[rel.founderId] ?? 0) + result.soulsGenerated;
    soulCosts[rel.founderId] = (soulCosts[rel.founderId] ?? 0) + result.soulCost;
  }

  return { religions: updated, events: allEvents, soulIncome, soulCosts };
}

// ─── Holy War Resolution ────────────────────────────────────────

/**
 * Resolve holy war effects — reduce rival religion followers at contested nodes.
 */
export function resolveHolyWars(
  religions: Record<ReligionId, Religion>,
  _state: GameState,
): { religions: Record<ReligionId, Religion>; events: ReligionEvent[] } {
  const events: ReligionEvent[] = [];
  const updated = { ...religions };

  for (const rel of Object.values(religions)) {
    if (!rel.instructions) continue;
    for (const instr of rel.instructions.instructions) {
      if (instr.action !== 'holy_war' || !instr.targetReligionId) continue;

      const rival = updated[instr.targetReligionId];
      if (!rival) continue;

      // Find contested nodes (where both religions have followers)
      const contestedNodes = Object.keys(rel.followersByNode)
        .filter((nodeId) => rival.followersByNode[nodeId] && rival.followersByNode[nodeId] > 0);

      if (contestedNodes.length === 0) continue;

      const rivalFollowers = { ...rival.followersByNode };
      for (const nodeId of contestedNodes) {
        // Reduce rival followers by 10-20%
        const reduction = 10 + Math.random() * 10;
        rivalFollowers[nodeId] = Math.max(0, (rivalFollowers[nodeId] ?? 0) - reduction);
        if (rivalFollowers[nodeId] <= 0) {
          delete rivalFollowers[nodeId];
        }
      }

      updated[instr.targetReligionId] = {
        ...rival,
        followersByNode: rivalFollowers,
        nodeCount: Object.keys(rivalFollowers).length,
      };

      events.push({
        religionId: rel.id,
        type: 'holy_war',
        message: `"${rel.name}" waged holy war — "${rival.name}" lost followers at ${contestedNodes.length} nodes`,
      });
    }
  }

  return { religions: updated, events };
}
