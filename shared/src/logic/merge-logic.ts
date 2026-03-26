/**
 * Logic for Realm Merging, Rule Stacking, and Convergence.
 *
 * GDD §3.4: Additive rule stacking when realms overlap.
 * Lore §7: 29 unique merge combination rites.
 */

import type { GameState } from '../types/game-state.js';
import type { RealmId } from '../types/realm.js';
import type { PlayerId } from '../types/player.js';
import type { NodeId } from '../types/graph.js';

/** New Rites introduced by merging realms. */
export type MergeRiteType =
  // Pair Merges (10)
  | 'rite_of_succession' // Dom + Ent
  | 'rite_of_mandate' // Dom + Com
  | 'rite_of_subjugation' // Dom + Wra
  | 'rite_of_permanence' // Dom + Mem
  | 'rite_of_pandemic' // Ent + Com
  | 'rite_of_the_phoenix' // Ent + Wra
  | 'rite_of_revision' // Ent + Mem
  | 'rite_of_holy_war' // Com + Wra
  | 'rite_of_omniscience' // Com + Mem
  | 'rite_of_vengeance' // Wra + Mem
  // Triple Merges (10)
  | 'rite_of_adaptive_doctrine' // D+E+C
  | 'rite_of_blitzkrieg' // D+E+W
  | 'rite_of_precedent' // D+E+M
  | 'rite_of_ordained_march' // D+C+W
  | 'rite_of_orthodoxy' // D+C+M
  | 'rite_of_legacy' // D+W+M
  | 'rite_of_cataclysm' // E+C+W
  | 'rite_of_prophecy' // E+C+M
  | 'rite_of_the_wound' // E+W+M
  | 'rite_of_the_epic' // C+W+M
  // Quad Merges (5)
  | 'rite_of_genesis' // All but D
  | 'rite_of_the_absolute' // All but E
  | 'rite_of_isolation' // All but C
  | 'rite_of_assimilation' // All but W
  | 'rite_of_amnesia' // All but M
  // Convergence (3)
  | 'rite_of_the_new_covenant'
  | 'rite_of_supremacy'
  | 'rite_of_reckoning';

export const ALL_MERGE_RITES: Record<MergeRiteType, { name: string; soulCost: number; description: string; requiredRealms: RealmId[] }> = {
  // Pairs
  rite_of_succession: { name: 'Rite of Succession', soulCost: 30, description: 'Force a leadership change at any dominion, triggering a burst of activity.', requiredRealms: ['dominion', 'entropy'] },
  rite_of_mandate: { name: 'Rite of Mandate', soulCost: 40, description: 'Establish a state religion that spreads political control with every new convert.', requiredRealms: ['dominion', 'communion'] },
  rite_of_subjugation: { name: 'Rite of Subjugation', soulCost: 50, description: 'Conquered nodes immediately become fully controlled dominions.', requiredRealms: ['dominion', 'wrath'] },
  rite_of_permanence: { name: 'Rite of Permanence', soulCost: 40, description: 'Lock any game state permanently within this zone.', requiredRealms: ['dominion', 'memory'] },
  rite_of_pandemic: { name: 'Rite of Pandemic', soulCost: 40, description: 'Trigger a belief-storm that rapidly converts large areas to your religion.', requiredRealms: ['entropy', 'communion'] },
  rite_of_the_phoenix: { name: 'Rite of the Phoenix', soulCost: 60, description: 'Destroy one of your dominions to create a vastly more powerful one from its ashes.', requiredRealms: ['entropy', 'wrath'] },
  rite_of_revision: { name: 'Rite of Revision', soulCost: 50, description: 'Undo a recent physical game event.', requiredRealms: ['entropy', 'memory'] },
  rite_of_holy_war: { name: 'Rite of Holy War', soulCost: 40, description: 'Army strength multiplied by adjacent nodes following your religion.', requiredRealms: ['communion', 'wrath'] },
  rite_of_omniscience: { name: 'Rite of Omniscience', soulCost: 30, description: 'See the full game state of all connected realms.', requiredRealms: ['communion', 'memory'] },
  rite_of_vengeance: { name: 'Rite of Vengeance', soulCost: 50, description: 'Losing a battle permanently strengthens your next army here.', requiredRealms: ['wrath', 'memory'] },
  // Triples
  rite_of_adaptive_doctrine: { name: 'Rite of Adaptive Doctrine', soulCost: 80, description: 'Religion automatically mutates to be maximally effective.', requiredRealms: ['dominion', 'entropy', 'communion'] },
  rite_of_blitzkrieg: { name: 'Rite of Blitzkrieg', soulCost: 100, description: 'Conquer a chain of connected nodes in a single turn. They begin decaying immediately.', requiredRealms: ['dominion', 'entropy', 'wrath'] },
  rite_of_precedent: { name: 'Rite of Precedent', soulCost: 80, description: 'Invoke a past game state as justification for a current action.', requiredRealms: ['dominion', 'entropy', 'memory'] },
  rite_of_ordained_march: { name: 'Rite of the Ordained March', soulCost: 100, description: 'Every connected network node contributes military strength.', requiredRealms: ['dominion', 'communion', 'wrath'] },
  rite_of_orthodoxy: { name: 'Rite of Orthodoxy', soulCost: 90, description: 'Declare eternal truth. Dominant religion becomes immune to mutation/subversion.', requiredRealms: ['dominion', 'communion', 'memory'] },
  rite_of_legacy: { name: 'Rite of Legacy', soulCost: 100, description: 'Every battle won here permanently increases your base strength.', requiredRealms: ['dominion', 'wrath', 'memory'] },
  rite_of_cataclysm: { name: 'Rite of Cataclysm', soulCost: 120, description: 'Scramble all dominion ownership, religion affiliations, and armies in the zone.', requiredRealms: ['entropy', 'communion', 'wrath'] },
  rite_of_prophecy: { name: 'Rite of Prophecy', soulCost: 60, description: 'Simulate and view probable states 5 turns into the future.', requiredRealms: ['entropy', 'communion', 'memory'] },
  rite_of_the_wound: { name: 'Rite of the Wound', soulCost: 80, description: 'Each soul lost here generates a scar enhancing future rites.', requiredRealms: ['entropy', 'wrath', 'memory'] },
  rite_of_the_epic: { name: 'Rite of the Epic', soulCost: 70, description: 'Recent battles generate sagas spreading through communion, yielding passive souls.', requiredRealms: ['communion', 'wrath', 'memory'] },
  // Quads
  rite_of_genesis: { name: 'Rite of Genesis', soulCost: 200, description: 'Create a completely new node, edge, or religion property out of chaos.', requiredRealms: ['entropy', 'communion', 'wrath', 'memory'] },
  rite_of_the_absolute: { name: 'Rite of the Absolute', soulCost: 150, description: 'Declare a condition/instruction as inviolable law across the zone.', requiredRealms: ['dominion', 'communion', 'wrath', 'memory'] },
  rite_of_isolation: { name: 'Rite of Isolation', soulCost: 140, description: 'Sever all edges connecting a node to the wider graph, isolating it completely.', requiredRealms: ['dominion', 'entropy', 'wrath', 'memory'] },
  rite_of_assimilation: { name: 'Rite of Assimilation', soulCost: 160, description: 'Absorb a rival dominion into your own without military conflict.', requiredRealms: ['dominion', 'entropy', 'communion', 'memory'] },
  rite_of_amnesia: { name: 'Rite of Amnesia', soulCost: 180, description: 'Erase all accumulated effects, bonuses, and entrenchments from a node.', requiredRealms: ['dominion', 'entropy', 'communion', 'wrath'] },
  // Quint (Convergence)
  rite_of_the_new_covenant: { name: 'Rite of the New Covenant', soulCost: 1000, description: 'The instant-win objective. Re-write the Covenant and rule reality.', requiredRealms: ['dominion', 'entropy', 'communion', 'wrath', 'memory'] },
  rite_of_supremacy: { name: 'Rite of Supremacy', soulCost: 300, description: 'Declare yourself dominant; all unattended enemy dominions become contested.', requiredRealms: ['dominion', 'entropy', 'communion', 'wrath', 'memory'] },
  rite_of_reckoning: { name: 'Rite of Reckoning', soulCost: 250, description: 'Force an immediate scoring check; all religions settle soul debts instantly.', requiredRealms: ['dominion', 'entropy', 'communion', 'wrath', 'memory'] },
};

/**
 * Returns a set of all realms that are currently governing the given node.
 * This includes the node's home realm, PLUS any realms that are overlapping
 * the home realm in the current N-Body simulation (GDD §3.4 Additive Rule Stacking).
 */
export function getActiveRealms(state: GameState, homeRealmId: RealmId): Set<RealmId> {
  const active = new Set<RealmId>();
  active.add(homeRealmId);

  // Check state.realmInteractions for any level: "overlap" involving homeRealmId.
  for (const interact of state.realmInteractions) {
    if (interact.level === 'overlap') {
      if (interact.realmA === homeRealmId) active.add(interact.realmB);
      if (interact.realmB === homeRealmId) active.add(interact.realmA);
    }
  }

  return active;
}

/**
 * Identify exactly which Merge Rites are available given a set of active realms.
 */
export function getAvailableMergeRites(activeRealms: Set<RealmId>): MergeRiteType[] {
  const available: MergeRiteType[] = [];
  
  if (activeRealms.size < 2) return available; // No merges.

  for (const [riteKey, riteDef] of Object.entries(ALL_MERGE_RITES)) {
    // Only return the exact match. A 5-realm convergence doesn't give you the 4-realm rites 
    // unless you want it to array-flatten? "All rites from all realms and merges are available"
    // GDD §7.4: "All rites from all individual realms and merges are available"
    // So if it requires 2 realms, and we have those 2 realms (even if we have 3), it's available!
    
    let hasAllRequirements = true;
    for (const req of riteDef.requiredRealms) {
      if (!activeRealms.has(req)) {
        hasAllRequirements = false;
        break;
      }
    }

    if (hasAllRequirements) {
      available.push(riteKey as MergeRiteType);
    }
  }

  return available;
}

/**
 * Execute a Merge rite (returns undefined if successful, or an error string).
 */
export function executeMergeRite(
  state: GameState,
  playerId: PlayerId,
  nodeId: NodeId,
  riteType: MergeRiteType,
  _targetId?: string
): string | undefined {
  const player = state.players[playerId];
  if (!player) return 'Player not found';

  const def = ALL_MERGE_RITES[riteType];
  const homeRealmId = Object.keys(state.realmGraphs).find((rId) => state.realmGraphs[rId as RealmId].nodes.some(n => n.id === nodeId)) as RealmId;
  const activeRealms = getActiveRealms(state, homeRealmId);

  for (const req of def.requiredRealms) {
    if (!activeRealms.has(req)) return `Missing required realm energy: ${req}`;
  }

  if (player.soulLedger.balance < def.soulCost) {
    return `Insufficient souls. Requires ${def.soulCost}.`;
  }

  // Deduct cost
  player.soulLedger.balance -= def.soulCost;
  player.soulLedger.totalSpent += def.soulCost;

  // Implementation of actual effects (Placeholder pending combat system/events)
  if (riteType === 'rite_of_the_new_covenant') {
    // Instant win condition!
    // Since GameState doesn't have an explicit 'winner' field yet, we could just log it heavily.
    return undefined;
  }
  
  if (riteType === 'rite_of_isolation') {
    // Isolate graph node
    for (const realm of Object.values(state.realmGraphs)) {
      realm.edges = realm.edges.filter(e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId);
    }
    return undefined;
  }

  // TODO: Add branching implementations for other 27 merge rites over time.
  // For now, they consume AP/Souls successfully so players can test them.
  return undefined;
}
