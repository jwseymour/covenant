/**
 * Combat resolution engine — GDD §5.2.
 *
 * "Mostly deterministic with slight randomness."
 * Integrates combat cards [TOGGLEABLE], belief tag modifiers,
 * and defensive bonuses.
 */

import { v4 as uuidv4 } from 'uuid';
import type { GameState } from '../types/game-state.js';
import type { CombatResult, ArmyStats, CombatCard } from '../types/combat.js';
import type { DominionId } from '../types/dominion.js';
import type { NodeId } from '../types/graph.js';
import type { Religion } from '../types/religion.js';
import type { RealmId } from '../types/realm.js';
import { checkFlankingCondition } from './combat-cards.js';

const DEFENCE_BONUS_MULTIPLIER = 1.2;

/**
 * Resolve combat between two dominions at a node.
 *
 * @param atkCards - Cards played by attacker (only applied if combatCardsEnabled)
 * @param defCards - Cards played by defender (only applied if combatCardsEnabled)
 */
export function resolveCombat(
  state: GameState,
  attackerId: DominionId,
  defenderId: DominionId,
  targetNodeId: NodeId,
  atkCards: CombatCard[] = [],
  defCards: CombatCard[] = [],
): CombatResult {
  const attacker = state.dominions[attackerId];
  const defender = state.dominions[defenderId];
  
  if (!attacker || !defender) throw new Error("Combat participant not found");
  
  // Calculate base strength: structural influence × territory spread
  const atkBaseStrength = Math.max(1, attacker.controlledNodeIds.length * attacker.influence);
  const defBaseStrength = Math.max(1, defender.controlledNodeIds.length * defender.influence);

  // Quality multipliers
  const atkQuality = attacker.troopQualityModifier ?? 1.0;
  const defQuality = defender.troopQualityModifier ?? 1.0;

  // ─── Process Belief Tag Influences ───
  const targetNodeReligions: Religion[] = Object.values(state.religions).filter(r => r.followersByNode[targetNodeId] > 0);
  
  let atkTagMod = 1.0;
  let defTagMod = 1.0;
  let sacrificeMultiplier = 1.0;
  
  let soulClaimantId = null;
  let maxFollowers = 0;

  for (const rel of targetNodeReligions) {
    if (rel.followersByNode[targetNodeId] > maxFollowers) {
      maxFollowers = rel.followersByNode[targetNodeId];
      soulClaimantId = rel.founderId;
    }
    
    const tags = rel.beliefTags as string[];
    if (rel.founderId === attacker.ownerId) {
      if (tags.includes('fury')) atkTagMod += 0.3;
      if (tags.includes('sacrifice')) sacrificeMultiplier *= 1.5;
      if (tags.includes('unity')) atkTagMod += 0.15;
    }
    
    if (rel.founderId === defender.ownerId) {
      if (tags.includes('fury')) defTagMod += 0.3;
      if (tags.includes('sacrifice')) sacrificeMultiplier *= 1.5;
      if (tags.includes('unity')) defTagMod += 0.15;
      if (tags.includes('empathy')) defTagMod += 0.4;
    }
  }

  // ─── Combat Card Modifiers [TOGGLEABLE] ───
  const cardsEnabled = state.config.combatCardsEnabled;
  let atkCardMod = 1.0;
  let defCardMod = 1.0;
  let atkCasualtyCardMod = 1.0;
  let defCasualtyCardMod = 1.0;
  let ambushNegatesDefence = false;
  let scorchedEarthActive = false;
  let scorchedEarthPlayerId: string | null = null;
  let bloodSacrificeActive = false;

  if (cardsEnabled) {
    for (const card of atkCards) {
      if (card.used) continue;
      card.used = true;

      atkCardMod *= card.attackModifier;
      // Attacker's defence modifier doesn't help defence, it reduces enemy defence impact
      atkCasualtyCardMod *= card.casualtyModifier;

      // Special: Ambush negates defender bonus
      if (card.type === 'ambush') ambushNegatesDefence = true;

      // Special: Scorched Earth
      if (card.type === 'scorched_earth') {
        scorchedEarthActive = true;
        scorchedEarthPlayerId = attacker.ownerId;
      }

      // Special: Flanking — only applies if condition met
      if (card.type === 'flanking_manoeuvre') {
        const graph = state.realmGraphs[attacker.realmId];
        if (graph && !checkFlankingCondition(attacker.controlledNodeIds, targetNodeId, graph.edges)) {
          // Flanking condition not met — negate the attack bonus
          atkCardMod /= card.attackModifier;
        }
      }

      // Blood sacrifice (uses scorched_earth type but name differs)
      if (card.name === 'Blood Sacrifice') bloodSacrificeActive = true;
    }

    for (const card of defCards) {
      if (card.used) continue;
      card.used = true;

      defCardMod *= card.defenceModifier;
      defCasualtyCardMod *= card.casualtyModifier;

      if (card.type === 'scorched_earth') {
        scorchedEarthActive = true;
        scorchedEarthPlayerId = defender.ownerId;
      }
      if (card.name === 'Blood Sacrifice') bloodSacrificeActive = true;
    }
  }

  const atkStats: ArmyStats = {
    dominionId: attacker.id,
    ownerId: attacker.ownerId,
    baseStrength: atkBaseStrength,
    qualityModifier: atkQuality * atkTagMod * atkCardMod,
    totalStrength: atkBaseStrength * (atkQuality * atkTagMod * atkCardMod),
    cardsPlayed: cardsEnabled ? atkCards.filter(c => c.used) : [],
    beliefTagBonuses: {}
  };

  const defStats: ArmyStats = {
    dominionId: defender.id,
    ownerId: defender.ownerId,
    baseStrength: defBaseStrength,
    qualityModifier: defQuality * defTagMod * defCardMod,
    totalStrength: defBaseStrength * (defQuality * defTagMod * defCardMod),
    cardsPlayed: cardsEnabled ? defCards.filter(c => c.used) : [],
    beliefTagBonuses: {}
  };

  // Apply defence bonus (negated by Ambush card)
  const effectiveDefenceBonus = ambushNegatesDefence ? 1.0 : DEFENCE_BONUS_MULTIPLIER;

  const finalAtk = atkStats.totalStrength;
  const finalDef = defStats.totalStrength * effectiveDefenceBonus;
  
  // Random variance ±10%
  const randomFactor = 0.9 + (Math.random() * 0.2);
  const adjustedAtk = finalAtk * randomFactor;
  
  const attackerWins = adjustedAtk > finalDef;
  
  const ratio = attackerWins ? (finalDef / adjustedAtk) : (adjustedAtk / finalDef);
  
  const loserCasualtyPct = 0.5 + (0.3 * ratio);
  const winnerCasualtyPct = 0.1 + (0.4 * ratio);
  
  let atkLossPct = attackerWins ? winnerCasualtyPct : loserCasualtyPct;
  let defLossPct = attackerWins ? loserCasualtyPct : winnerCasualtyPct;
  
  // Fury increases bloodiness
  if (atkTagMod > 1.0 || defTagMod > 1.0) { 
     atkLossPct = Math.min(1.0, atkLossPct * 1.25); 
     defLossPct = Math.min(1.0, defLossPct * 1.25); 
  }

  // Apply card casualty modifiers
  if (cardsEnabled) {
    atkLossPct = Math.min(1.0, atkLossPct * atkCasualtyCardMod);
    defLossPct = Math.min(1.0, defLossPct * defCasualtyCardMod);
  }
  
  // Translate to node population deaths
  let targetNode = null;
  for (const rId of Object.keys(state.realmGraphs)) {
    const realmId = rId as RealmId;
    const node = state.realmGraphs[realmId].nodes.find(n => n.id === targetNodeId);
    if (node) {
       targetNode = node;
       break;
    }
  }
  
  let soulsReleased = 0;
  if (targetNode) {
     const totalEngagedMass = (atkBaseStrength + defBaseStrength) * 100;
     const rawCasualties = Math.floor(totalEngagedMass * ((atkLossPct + defLossPct) / 2));
     const actualCasualties = Math.min(targetNode.population, rawCasualties);
     
     targetNode.population = Math.max(0, targetNode.population - actualCasualties);
     
     let soulMult = sacrificeMultiplier;
     if (bloodSacrificeActive) soulMult *= 1.5;
     soulsReleased = Math.floor(actualCasualties * soulMult);

     // Scorched Earth: if the card player loses, devastate the node
     if (scorchedEarthActive && targetNode.population > 0) {
       const scorchedPlayerIsAttacker = scorchedEarthPlayerId === attacker.ownerId;
       const scorchedPlayerLost = (scorchedPlayerIsAttacker && !attackerWins) || (!scorchedPlayerIsAttacker && attackerWins);
       if (scorchedPlayerLost) {
         const devastation = Math.floor(targetNode.population * 0.7);
         targetNode.population = Math.max(0, targetNode.population - devastation);
         soulsReleased += Math.floor(devastation * soulMult);
       }
     }
  }

  return {
    combatId: uuidv4(),
    winner: attackerWins ? 'attacker' : 'defender',
    attackerCasualties: Math.floor(atkBaseStrength * atkLossPct),
    defenderCasualties: Math.floor(defBaseStrength * defLossPct),
    soulsReleased,
    soulClaimantId,
    randomFactor
  };
}
