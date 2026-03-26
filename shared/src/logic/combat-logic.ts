import { v4 as uuidv4 } from 'uuid';
import type { GameState } from '../types/game-state.js';
import type { CombatResult, ArmyStats } from '../types/combat.js';
import type { DominionId } from '../types/dominion.js';
import type { NodeId } from '../types/graph.js';
import type { Religion } from '../types/religion.js';
import type { RealmId } from '../types/realm.js';

const DEFENCE_BONUS_MULTIPLIER = 1.2;

export function resolveCombat(state: GameState, attackerId: DominionId, defenderId: DominionId, targetNodeId: NodeId): CombatResult {
  const attacker = state.dominions[attackerId];
  const defender = state.dominions[defenderId];
  
  if (!attacker || !defender) throw new Error("Combat participant not found");
  
  // Calculate base strength: the sum of structural influence multiplied by territory spread
  // (Provides raw mass advantage to sprawling, tightly-gripped dominions)
  const atkBaseStrength = Math.max(1, attacker.controlledNodeIds.length * attacker.influence);
  const defBaseStrength = Math.max(1, defender.controlledNodeIds.length * defender.influence);

  // Quality multipliers (scalable via Tier-2 instructions in M7)
  const atkQuality = 1.0;
  const defQuality = 1.0;

  // ─── Process Belief Tag Influences ───
  // Locates religions actively rooted at the combat site
  const targetNodeReligions: Religion[] = Object.values(state.religions).filter(r => r.followersByNode[targetNodeId] > 0);
  
  let atkTagMod = 1.0;
  let defTagMod = 1.0;
  let sacrificeMultiplier = 1.0;
  
  let soulClaimantId = null;
  let maxFollowers = 0;

  for (const rel of targetNodeReligions) {
    if (rel.followersByNode[targetNodeId] > maxFollowers) {
      maxFollowers = rel.followersByNode[targetNodeId];
      // The religion with the most physical mass at the node claims the fallen souls
      soulClaimantId = rel.founderId;
    }
    
    // If the attacker owns a religion here, inject doctrine buffs
    const tags = rel.beliefTags as string[];
    if (rel.founderId === attacker.ownerId) {
      if (tags.includes('fury')) atkTagMod += 0.3; // Fury = high combat bonus
      if (tags.includes('sacrifice')) sacrificeMultiplier *= 1.5; // Sacrifice = harvests 50% more souls from the slaughter
      if (tags.includes('unity')) atkTagMod += 0.15; // Unity = local network support
    }
    
    // If the defender owns a religion here, inject doctrine buffs
    if (rel.founderId === defender.ownerId) {
      if (tags.includes('fury')) defTagMod += 0.3;
      if (tags.includes('sacrifice')) sacrificeMultiplier *= 1.5;
      if (tags.includes('unity')) defTagMod += 0.15;
      if (tags.includes('empathy')) defTagMod += 0.4; // Empathy = strong defense, terrible offense (ignored effectively for attackers)
    }
  }

  const atkStats: ArmyStats = {
    dominionId: attacker.id,
    ownerId: attacker.ownerId,
    baseStrength: atkBaseStrength,
    qualityModifier: atkQuality * atkTagMod,
    totalStrength: atkBaseStrength * (atkQuality * atkTagMod),
    cardsPlayed: [],
    beliefTagBonuses: {}
  };

  const defStats: ArmyStats = {
    dominionId: defender.id,
    ownerId: defender.ownerId,
    baseStrength: defBaseStrength,
    qualityModifier: defQuality * defTagMod,
    totalStrength: defBaseStrength * (defQuality * defTagMod),
    cardsPlayed: [],
    beliefTagBonuses: {}
  };

  const finalAtk = atkStats.totalStrength;
  const finalDef = defStats.totalStrength * DEFENCE_BONUS_MULTIPLIER;
  
  // Random variance between 0.9 and 1.1 (±10%)
  // Deterministic enough to respect sheer scale, random enough to prevent mathematically perfect tactical calculations.
  const randomFactor = 0.9 + (Math.random() * 0.2);
  const adjustedAtk = finalAtk * randomFactor;
  
  const attackerWins = adjustedAtk > finalDef;
  
  // Calculate relative casualty intensity. 
  // If attacker has 2x the strength, the ratio is 0.5. The defender is crushed, the attacker suffers lightly.
  const ratio = attackerWins ? (finalDef / adjustedAtk) : (adjustedAtk / finalDef);
  
  // Base casualty rate is heavily scaling on the ratio
  const loserCasualtyPct = 0.5 + (0.3 * ratio); // 50% to 80% losses
  const winnerCasualtyPct = 0.1 + (0.4 * ratio); // 10% to 50% losses
  
  let atkLossPct = attackerWins ? winnerCasualtyPct : loserCasualtyPct;
  let defLossPct = attackerWins ? loserCasualtyPct : winnerCasualtyPct;
  
  // Fury drastically increases the bloodiness of the engagement
  if (atkTagMod > 1.0 || defTagMod > 1.0) { 
     atkLossPct = Math.min(1.0, atkLossPct * 1.25); 
     defLossPct = Math.min(1.0, defLossPct * 1.25); 
  }
  
  // Translate abstract Army Strength loss percentages into actual node Population deaths
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
     // A typical baseStrength is 20-100 influence. A city pop is 2000-8000.
     // Scale the base engagement mass up drastically to hit population lines
     const totalEngagedMass = (atkBaseStrength + defBaseStrength) * 100;
     
     // Cap casualties to actual logical maximum population
     const rawCasualties = Math.floor(totalEngagedMass * ((atkLossPct + defLossPct) / 2));
     const actualCasualties = Math.min(targetNode.population, rawCasualties);
     
     targetNode.population = Math.max(0, targetNode.population - actualCasualties);
     soulsReleased = Math.floor(actualCasualties * sacrificeMultiplier);
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
