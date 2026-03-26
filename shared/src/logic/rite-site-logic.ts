/**
 * Rite Site Logic — Pure functions for site-specific rituals.
 *
 * GDD §4.5: Rites are special actions at specific locations within realms.
 * Each rite site offers rituals tied to its realm's energy.
 */

import type { GameState } from '../types/game-state.js';
import type { PlayerId } from '../types/player.js';
import type { NodeId } from '../types/graph.js';
import type { SiteRite } from '../types/rite.js';
import { getInitialInfluenceInfo } from './dominion-logic.js';

export const SITE_RITES: Record<string, SiteRite> = {
  // Dominion (Authority, rigidity, control)
  rite_absolute_command: {
    id: 'rite_absolute_command',
    name: 'Absolute Command',
    description: 'Crush resistance. Enemy dominions at this node lose 20 influence immediately.',
    realmId: 'dominion', soulCost: 15, apCost: 1, effectType: 'dominion_control', requiredMerge: null
  },
  rite_iron_walls: {
    id: 'rite_iron_walls',
    name: 'Iron Walls',
    description: 'Fortify your hold. Grants +50 influence to your dominion at this node.',
    realmId: 'dominion', soulCost: 10, apCost: 1, effectType: 'dominion_control', requiredMerge: null
  },

  // Entropy (Decay, mutation, transformation)
  rite_accelerate_decay: {
    id: 'rite_accelerate_decay',
    name: 'Accelerate Decay',
    description: 'Halve the population of this node, instantly converting the lost population into souls.',
    realmId: 'entropy', soulCost: 0, apCost: 1, effectType: 'soul_generation', requiredMerge: null
  },
  rite_forced_mutation: {
    id: 'rite_forced_mutation',
    name: 'Forced Mutation',
    description: 'Force a violent fracture upon any enemy religion present at this node.',
    realmId: 'entropy', soulCost: 20, apCost: 1, effectType: 'religion_spread', requiredMerge: null
  },

  // Communion (Connection, empathy, sharing)
  rite_hive_mind: {
    id: 'rite_hive_mind',
    name: 'Hive Mind',
    description: 'Instil collective harmony. Add +20 stability to all religions you have founded globally.',
    realmId: 'communion', soulCost: 15, apCost: 1, effectType: 'religion_spread', requiredMerge: null
  },
  rite_mass_empathy: {
    id: 'rite_mass_empathy',
    name: 'Mass Empathy',
    description: 'Draw power from connection. Gain 10 souls for every religion you currently lead.',
    realmId: 'communion', soulCost: 0, apCost: 1, effectType: 'soul_generation', requiredMerge: null
  },

  // Wrath (Destruction, conquest, fury)
  rite_blood_sacrifice: {
    id: 'rite_blood_sacrifice',
    name: 'Blood Sacrifice',
    description: 'Sacrifice 20 population here to grant +50 army strength to your local dominion.',
    realmId: 'wrath', soulCost: 0, apCost: 1, effectType: 'combat', requiredMerge: null
  },
  rite_scorched_earth: {
    id: 'rite_scorched_earth',
    name: 'Scorched Earth',
    description: 'Unleash fury. Destroy 20 influence from all enemy dominions across this entire realm.',
    realmId: 'wrath', soulCost: 30, apCost: 1, effectType: 'dominion_control', requiredMerge: null
  },

  // Memory (Preservation, history, stasis)
  rite_perfect_recall: {
    id: 'rite_perfect_recall',
    name: 'Perfect Recall',
    description: 'Piercing insight. Reveal the current instructions of all rival dominions in this realm.',
    realmId: 'memory', soulCost: 15, apCost: 1, effectType: 'information', requiredMerge: null
  },
  rite_stasis: {
    id: 'rite_stasis',
    name: 'Stasis',
    description: 'Restore the past. Instantly reset your dominion here to its maximum establishment influence.',
    realmId: 'memory', soulCost: 10, apCost: 1, effectType: 'dominion_control', requiredMerge: null
  },
};

/**
 * Validates and executes a site-specific rite.
 */
export function executeSiteRite(state: GameState, playerId: PlayerId, nodeId: NodeId, riteId: string): string {
  const player = state.players[playerId];
  const rite = SITE_RITES[riteId];

  if (!player || !rite) return 'Failed: Invalid rite.';
  if (player.actionPoints < rite.apCost || player.soulLedger.balance < rite.soulCost) {
    return 'Failed: Insufficient AP or Souls.';
  }

  // Deduct costs
  player.actionPoints -= rite.apCost;
  player.soulLedger.balance -= rite.soulCost;
  player.soulLedger.totalSpent += rite.soulCost;

  // Find the node's realm and exact structure
  let currentRealmId = '';
  let theNode = null;
  for (const realm of Object.values(state.realmGraphs)) {
    const n = realm.nodes.find(n => n.id === nodeId);
    if (n) {
      currentRealmId = realm.realmId;
      theNode = n;
      break;
    }
  }

  if (!theNode) return 'Failed: Node missing.';

  let successMsg = `You inscribed the ${rite.name}.`;

  switch (riteId) {
    case 'rite_absolute_command': {
      let hit = false;
      for (const dom of Object.values(state.dominions)) {
        if (dom.primaryNodeId === nodeId && dom.ownerId !== playerId) {
          dom.influence = Math.max(0, dom.influence - 20);
          hit = true;
        }
      }
      if (!hit) successMsg += ' But there were no enemies to command.';
      break;
    }

    case 'rite_iron_walls': {
      let hit = false;
      for (const dom of Object.values(state.dominions)) {
        if (dom.primaryNodeId === nodeId && dom.ownerId === playerId) {
          dom.influence += 50;
          hit = true;
        }
      }
      if (!hit) successMsg += ' But you hold no dominion here to fortify.';
      break;
    }

    case 'rite_accelerate_decay': {
      if (theNode.population > 0) {
        const harvestedPop = Math.floor(theNode.population / 2);
        theNode.population -= harvestedPop;
        const soulsGained = harvestedPop * 3; // Soul inflation multiplier
        player.soulLedger.balance += soulsGained;
        player.soulLedger.totalEarned += soulsGained;
        successMsg += ` The screaming decay yielded ${soulsGained} souls.`;
      } else {
        successMsg += ' The dead city yielded nothing.';
      }
      break;
    }

    case 'rite_forced_mutation': {
      let hit = false;
      for (const rel of Object.values(state.religions)) {
        if (rel.founderId !== playerId && rel.followersByNode[nodeId] > 0) {
          // Force a fracture
          rel.fractured = true;
          rel.stability = Math.max(0, rel.stability - 40);
          hit = true;
        }
      }
      if (!hit) successMsg += ' But no rival dogma was present to twist.';
      break;
    }

    case 'rite_hive_mind': {
      for (const rel of Object.values(state.religions)) {
        if (rel.founderId === playerId) {
          rel.stability = Math.min(100, rel.stability + 20);
        }
      }
      successMsg += ' The collective sings in unison.';
      break;
    }

    case 'rite_mass_empathy': {
      const ownedCount = Object.values(state.religions).filter(r => r.founderId === playerId).length;
      const soulGain = ownedCount * 10;
      player.soulLedger.balance += soulGain;
      player.soulLedger.totalEarned += soulGain;
      successMsg += ` You drew ${soulGain} souls from the tether.`;
      break;
    }

    case 'rite_blood_sacrifice': {
      let domHit = false;
      for (const dom of Object.values(state.dominions)) {
        if (dom.primaryNodeId === nodeId && dom.ownerId === playerId) {
          domHit = true;
          if (theNode.population >= 20) {
            theNode.population -= 20;
            dom.armyStrength += 50;
            successMsg += ' The blood soaked into the soil, rearing warlords.';
          } else {
            successMsg += ' But the population was too scarce to sacrifice.';
          }
        }
      }
      if (!domHit) successMsg += ' But you hold no dominion here to militarize.';
      break;
    }

    case 'rite_scorched_earth': {
      let hits = 0;
      for (const dom of Object.values(state.dominions)) {
        if (dom.realmId === currentRealmId && dom.ownerId !== playerId) {
          dom.influence = Math.max(0, dom.influence - 20);
          hits++;
        }
      }
      successMsg += ` ${hits} enemy dominions across the realm withered.`;
      break;
    }

    case 'rite_perfect_recall': {
      let intelHits = 0;
      for (const dom of Object.values(state.dominions)) {
        if (dom.realmId === currentRealmId && dom.ownerId !== playerId) {
          player.intel.push({
            turn: state.turnNumber,
            nodeId: dom.primaryNodeId,
            type: 'dominion',
            targetId: dom.id,
            revealedInstructions: JSON.parse(JSON.stringify(dom.instructions)),
          });
          intelHits++;
        }
      }
      successMsg += ` The histories of ${intelHits} rival dominions are now known.`;
      break;
    }

    case 'rite_stasis': {
      let hit = false;
      for (const dom of Object.values(state.dominions)) {
        if (dom.primaryNodeId === nodeId && dom.ownerId === playerId) {
          const { influence } = getInitialInfluenceInfo(dom.realmId);
          dom.influence = influence;
          hit = true;
          successMsg += ' The fading walls snap back to unblemished stone.';
        }
      }
      if (!hit) successMsg += ' But there is nothing of yours here to freeze in time.';
      break;
    }
  }

  return successMsg;
}
