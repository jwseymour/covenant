/**
 * Relic Logic — Pure functions for claiming and managing Relics.
 *
 * GDD §4.5: Relics are persistent items found at locations.
 * Using a relic costs 1 AP.
 */

import type { GameState } from '../types/game-state.js';
import type { PlayerId } from '../types/player.js';
import type { RelicId, Relic } from '../types/relic.js';
import type { NodeId } from '../types/graph.js';

/**
 * 6 Initial Artifacts.
 * GDD targets ~5-8 core relics. These are seeded dynamically via graph generation,
 * or placed directly into the initial GameState.
 */
export const INITIAL_RELICS: Record<RelicId, Relic> = {
  'relic_crown_of_authority': {
    id: 'relic_crown_of_authority',
    name: 'Crown of Authority',
    description: 'Passive: Your dominions established while holding this relic start with +20 influence.',
    realmAffinity: 'dominion',
    usesRemaining: -1, // Passive/Unlimited
    maxUses: -1,
    effectType: 'dominion_modifier',
    ownerId: null,
    acquisitionMethod: null,
    acquiredTurn: null,
  },
  'relic_chalice_of_entropy': {
    id: 'relic_chalice_of_entropy',
    name: 'Chalice of Entropy',
    description: 'Active: Force a 30% node population drop in any node in your realm to harvest its soul yield instantly.',
    realmAffinity: 'entropy',
    usesRemaining: 3,
    maxUses: 3,
    effectType: 'soul_modifier',
    ownerId: null,
    acquisitionMethod: null,
    acquiredTurn: null,
  },
  'relic_woven_strand': {
    id: 'relic_woven_strand',
    name: 'The Woven Strand',
    description: 'Passive: Reduces the cost of the mass empathy rite site action to 0 souls.',
    realmAffinity: 'communion',
    usesRemaining: -1,
    maxUses: -1,
    effectType: 'rite_modifier',
    ownerId: null,
    acquisitionMethod: null,
    acquiredTurn: null,
  },
  'relic_blade_of_wrath': {
    id: 'relic_blade_of_wrath',
    name: 'Blade of Wrath',
    description: 'Active: Immediately increase your army strength by +50 at your current node.',
    realmAffinity: 'wrath',
    usesRemaining: 2,
    maxUses: 2,
    effectType: 'combat_modifier',
    ownerId: null,
    acquisitionMethod: null,
    acquiredTurn: null,
  },
  'relic_tome_of_memory': {
    id: 'relic_tome_of_memory',
    name: 'Tome of Memory',
    description: 'Active: Perform a free Rite of Sight without spending AP or Souls.',
    realmAffinity: 'memory',
    usesRemaining: 5,
    maxUses: 5,
    effectType: 'espionage',
    ownerId: null,
    acquisitionMethod: null,
    acquiredTurn: null,
  },
  'relic_neutral_gem': {
    id: 'relic_neutral_gem',
    name: 'Void Gem',
    description: 'Active: Instantly gain 30 souls.',
    realmAffinity: null,
    usesRemaining: 1,
    maxUses: 1,
    effectType: 'soul_modifier',
    ownerId: null,
    acquisitionMethod: null,
    acquiredTurn: null,
  }
};

/**
 * Validates and permits the Ordained to pick up an unclaimed relic.
 */
export function claimRelic(state: GameState, playerId: PlayerId, nodeId: NodeId, relicId: RelicId): string {
  const player = state.players[playerId];
  if (!player) return 'Failed: Invalid player.';

  if (player.actionPoints < 1) {
    return 'Failed: Claiming a relic costs 1 AP.';
  }

  // Ensure node actually has this relic and it's unclaimed
  let found = false;
  for (const realm of Object.values(state.realmGraphs)) {
    const n = realm.nodes.find(node => node.id === nodeId);
    if (n && n.relicId === relicId && !n.relicClaimed) {
      n.relicClaimed = true;
      found = true;
      break;
    }
  }

  if (!found) return 'Failed: Relic is not here or already claimed.';

  const relic = state.relics[relicId];
  if (!relic || relic.ownerId) {
    return 'Failed: Relic does not exist or is already bound to someone else.';
  }

  // Bind the relic
  player.actionPoints -= 1;
  relic.ownerId = playerId;
  relic.acquisitionMethod = 'found_at_location';
  relic.acquiredTurn = state.turnNumber;
  player.relicIds.push(relicId);

  return `Claimed relic: ${relic.name}`;
}

/**
 * Uses an active relic ability.
 */
export function useRelic(state: GameState, playerId: PlayerId, relicId: RelicId): string {
  const player = state.players[playerId];
  if (!player) return 'Failed.';
  if (player.actionPoints < 1) return 'Failed: Active relics cost 1 AP.';

  const relic = state.relics[relicId];
  if (!relic || relic.ownerId !== playerId) return 'Failed: You do not own this relic.';
  
  if (relic.usesRemaining === 0) return 'Failed: This relic is depleted.';

  player.actionPoints -= 1;
  if (relic.usesRemaining > 0) relic.usesRemaining -= 1;

  switch (relicId) {
    case 'relic_chalice_of_entropy': {
      // Find a random node in current realm and drain 30% pop
      let harvested = 0;
      const g = Object.values(state.realmGraphs).find(g => g.realmId === player.currentRealmId);
      if (g) {
        const n = g.nodes[Math.floor(Math.random() * g.nodes.length)];
        harvested = Math.floor(n.population * 0.3);
        n.population -= harvested;
        const souls = harvested * 4;
        player.soulLedger.balance += souls;
        player.soulLedger.totalEarned += souls;
        return `Used Chalice of Entropy: drained ${harvested} population for ${souls} souls.`;
      }
      return 'Used Chalice of Entropy, but found no life to drain.';
    }
    case 'relic_blade_of_wrath': {
      let hit = false;
      for (const dom of Object.values(state.dominions)) {
        if (dom.primaryNodeId === player.currentNodeId && dom.ownerId === playerId) {
          dom.armyStrength += 50;
          hit = true;
        }
      }
      if (hit) return 'Used Blade of Wrath: Granted +50 army strength locally.';
      return 'Used Blade of Wrath, but you have no dominion here.';
    }
    case 'relic_tome_of_memory': {
      // Give them an AP and Souls temporarily to spoof the check, or we refactor ritual-logic to allow free invocations.
      // Wait, let's just do it inline here to avoid cyclic dependence or bad requires.
      let revealed = false;
      for (const dom of Object.values(state.dominions)) {
        if (dom.primaryNodeId === player.currentNodeId && dom.ownerId !== playerId) {
            player.intel.push({ turn: state.turnNumber, nodeId: dom.primaryNodeId, type: 'dominion', targetId: dom.id, revealedInstructions: JSON.parse(JSON.stringify(dom.instructions)) });
            revealed = true;
        }
      }
      return revealed ? 'Used Tome of Memory: Enemy secrets exposed.' : 'Used Tome of Memory: No secrets to expose here.';
    }
    case 'relic_neutral_gem': {
      player.soulLedger.balance += 30;
      player.soulLedger.totalEarned += 30;
      return 'Used Void Gem: Gained 30 souls.';
    }
    default:
      return `Failed: ${relic.name} is passive and cannot be "used" actively.`;
  }
}
