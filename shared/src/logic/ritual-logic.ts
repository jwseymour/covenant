/**
 * Ritual Logic — Pure functions for personal Ordained rituals.
 *
 * GDD §4.6: "The Ordained's own actions — not performed through
 * dominions or religions... Each costs 1 AP + souls."
 */

import type { GameState } from '../types/game-state.js';
import type { PlayerId } from '../types/player.js';
import type { NodeId, EdgeId } from '../types/graph.js';
import { getInitialInfluenceInfo } from './dominion-logic.js';

export type RitualType = 'rite_of_sight' | 'rite_of_binding' | 'rite_of_severance' | 'rite_of_harvest';

// Costs based on GDD §4.6 (Medium/Low scale — values to be tuned)
export const RITUAL_COSTS: Record<RitualType, { ap: number; souls: number }> = {
  rite_of_sight: { ap: 1, souls: 5 },       // Low
  rite_of_binding: { ap: 1, souls: 15 },    // Medium
  rite_of_severance: { ap: 1, souls: 20 },  // Medium
  rite_of_harvest: { ap: 1, souls: 0 },     // Destructive, makes souls
};

/**
 * Validates if the player can afford and theoretically perform the ritual.
 */
export function canAffordRitual(state: GameState, playerId: PlayerId, ritualType: RitualType): boolean {
  const player = state.players[playerId];
  if (!player) return false;
  
  const cost = RITUAL_COSTS[ritualType];
  return player.actionPoints >= cost.ap && player.soulLedger.balance >= cost.souls;
}

/**
 * Deducts the cost of the ritual from the player.
 */
function payRitualCost(state: GameState, playerId: PlayerId, ritualType: RitualType) {
  const player = state.players[playerId];
  const cost = RITUAL_COSTS[ritualType];
  player.actionPoints -= cost.ap;
  player.soulLedger.balance -= cost.souls;
  player.soulLedger.totalSpent += cost.souls;
}

/**
 * Rite of Sight
 * "Reveal all instructions at your current location... Immediate intelligence."
 */
export function performRiteOfSight(state: GameState, playerId: PlayerId, nodeId: NodeId): string {
  if (!canAffordRitual(state, playerId, 'rite_of_sight')) return 'Failed: Insufficient AP or Souls for Rite of Sight.';
  payRitualCost(state, playerId, 'rite_of_sight');
  
  const player = state.players[playerId];
  let revealedSomething = false;

  // Scan for enemy dominions
  for (const dom of Object.values(state.dominions)) {
    if (dom.primaryNodeId === nodeId && dom.ownerId !== playerId) {
      player.intel.push({
        turn: state.turnNumber,
        nodeId,
        type: 'dominion',
        targetId: dom.id,
        revealedInstructions: JSON.parse(JSON.stringify(dom.instructions)),
      });
      revealedSomething = true;
    }
  }

  // Scan for enemy religions (religions present at the node but founded by others)
  // We'll reveal the religion's core instructions if it has followers here.
  for (const rel of Object.values(state.religions)) {
    if (rel.founderId !== playerId && rel.followersByNode[nodeId] && rel.followersByNode[nodeId] > 0) {
      player.intel.push({
        turn: state.turnNumber,
        nodeId,
        type: 'religion',
        targetId: rel.id,
        revealedInstructions: JSON.parse(JSON.stringify(rel.instructions)),
      });
      revealedSomething = true;
    }
  }

  if (revealedSomething) {
    return 'Rite of Sight invoked: Enemy instructions laid bare.';
  } else {
    return 'Rite of Sight invoked: Nothing hidden was found here.';
  }
}

/**
 * Rite of Binding
 * "Strengthen control at your location — reset dominion decay, reinforce against subversion, stabilise a religion's collapse risk."
 */
export function performRiteOfBinding(state: GameState, playerId: PlayerId, nodeId: NodeId): string {
  if (!canAffordRitual(state, playerId, 'rite_of_binding')) return 'Failed: Insufficient resources.';
  payRitualCost(state, playerId, 'rite_of_binding');

  let strengthened = false;

  // Reset dominion decay — GDD §4.6: "reset dominion decay, reinforce against subversion"
  for (const dom of Object.values(state.dominions)) {
    if (dom.primaryNodeId === nodeId && dom.ownerId === playerId) {
      const { influence } = getInitialInfluenceInfo(dom.realmId);
      dom.influence = influence;
      dom.lastVisitedTurn = state.turnNumber; // Reset decay timer
      strengthened = true;
    }
  }

  // Stabilise religion
  for (const rel of Object.values(state.religions)) {
    if (rel.founderId === playerId && rel.followersByNode[nodeId] && rel.followersByNode[nodeId] > 0) {
      rel.stability = Math.min(100, rel.stability + 25);
      rel.fractured = false;
      rel.soulRoutingDisrupted = false;
      strengthened = true;
    }
  }

  if (strengthened) {
    return 'Rite of Binding invoked: Your control here is fortified.';
  } else {
    return 'Rite of Binding invoked: Tracing empty air (no holdings to bind).';
  }
}

/**
 * Rite of Severance
 * "Weaken a rival — accelerate decay on enemy dominion, disrupt enemy religion spread, or sever a graph edge."
 */
export function performRiteOfSeverance(
  state: GameState, 
  playerId: PlayerId, 
  nodeId: NodeId, 
  target: { type: 'dominion'; dominionId: string } | { type: 'religion'; religionId: string } | { type: 'edge'; edgeId: EdgeId }
): string {
  if (!canAffordRitual(state, playerId, 'rite_of_severance')) return 'Failed: Insufficient resources.';
  
  if (target.type === 'dominion') {
    const dom = state.dominions[target.dominionId];
    if (dom && dom.primaryNodeId === nodeId && dom.ownerId !== playerId) {
      payRitualCost(state, playerId, 'rite_of_severance');
      dom.influence = Math.max(0, dom.influence - 30);
      return 'Rite of Severance invoked: Enemy dominion influence shattered.';
    }
  } else if (target.type === 'religion') {
    const rel = state.religions[target.religionId];
    if (rel && rel.founderId !== playerId && rel.followersByNode[nodeId] > 0) {
      payRitualCost(state, playerId, 'rite_of_severance');
      rel.stability = Math.max(0, rel.stability - 30);
      // Force a fracture check during tick phase naturally
      return 'Rite of Severance invoked: Rival dogma destabilized.';
    }
  } else if (target.type === 'edge') {
    // Find edge in the realm graph that connects to this node
    let foundEdge = false;
    for (const realm of Object.values(state.realmGraphs)) {
      const edge = realm.edges.find(e => e.id === target.edgeId && (e.sourceNodeId === nodeId || e.targetNodeId === nodeId));
      if (edge) {
        payRitualCost(state, playerId, 'rite_of_severance');
        edge.severed = true;
        foundEdge = true;
        return `Rite of Severance invoked: Path severed.`;
      }
    }
    if (!foundEdge) return 'Failed: Invalid edge for Severance.';
  }
  
  return 'Failed: Invalid target for Severance.';
}

/**
 * Rite of Harvest
 * "Sacrifice a population node to immediately collect all its souls. Node depopulated for many turns."
 */
export function performRiteOfHarvest(state: GameState, playerId: PlayerId, nodeId: NodeId): string {
  if (!canAffordRitual(state, playerId, 'rite_of_harvest')) return 'Failed: Insufficient resources.';
  
  const player = state.players[playerId];
  let harvested = false;

  // Find the node
  for (const realm of Object.values(state.realmGraphs)) {
    const node = realm.nodes.find(n => n.id === nodeId);
    if (node && !node.depopulated && node.population > 0) {
      payRitualCost(state, playerId, 'rite_of_harvest');
      
      const soulYield = Math.floor(node.population * 5); // Base inflate for "death counts" feeling
      player.soulLedger.balance += soulYield;
      player.soulLedger.totalEarned += soulYield;
      
      node.depopulated = true;
      node.population = 0;
      node.depopulationTurnsRemaining = 15; // Unusable for 15 turns
      
      harvested = true;
      return `Rite of Harvest invoked: ${soulYield} souls reaped. The node is ruined.`;
    }
  }

  if (!harvested) return 'Failed: Node is already barren.';
  return 'Failed: Node not found.';
}
