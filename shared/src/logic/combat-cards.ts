/**
 * Combat card library — toggleable one-time combat modifiers.
 *
 * GDD §5.2: "Special combat cards [TOGGLEABLE] — one-time effects played
 * during combat. Earned from rites, relics, or missions."
 *
 * 10 unique cards with attack/defence/casualty modifiers + special effects.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CombatCard, CombatCardType } from '../types/combat.js';

// ─── Card Definitions ───────────────────────────────────────────

export interface CombatCardDefinition {
  readonly type: CombatCardType;
  readonly name: string;
  readonly description: string;
  readonly attackModifier: number;
  readonly defenceModifier: number;
  readonly casualtyModifier: number;
  /** Rarity affects drop rate from rites/missions. */
  readonly rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

/**
 * The complete combat card library. GDD §5.2 examples + 2 additions.
 */
export const COMBAT_CARD_LIBRARY: Record<CombatCardType, CombatCardDefinition> = {
  ambush: {
    type: 'ambush',
    name: 'Ambush',
    description: 'Surprise attack — negates the defender\'s +20% bonus.',
    attackModifier: 1.0,
    defenceModifier: 1.0,
    casualtyModifier: 1.0,
    rarity: 'uncommon',
  },
  zealous_charge: {
    type: 'zealous_charge',
    name: 'Zealous Charge',
    description: 'Fanatical assault. +40% attack, but +30% casualties on both sides.',
    attackModifier: 1.4,
    defenceModifier: 0.8,
    casualtyModifier: 1.3,
    rarity: 'common',
  },
  fortify: {
    type: 'fortify',
    name: 'Fortify',
    description: 'Dig in and hold. +50% defence, -20% attack, -30% own casualties.',
    attackModifier: 0.8,
    defenceModifier: 1.5,
    casualtyModifier: 0.7,
    rarity: 'common',
  },
  feigned_retreat: {
    type: 'feigned_retreat',
    name: 'Feigned Retreat',
    description: 'Lure the enemy out, then counterattack. +25% attack.',
    attackModifier: 1.25,
    defenceModifier: 1.0,
    casualtyModifier: 1.0,
    rarity: 'uncommon',
  },
  divine_intervention: {
    type: 'divine_intervention',
    name: 'Divine Intervention',
    description: 'The gods intervene directly. +80% attack and defence, -50% casualties. Extremely rare.',
    attackModifier: 1.8,
    defenceModifier: 1.8,
    casualtyModifier: 0.5,
    rarity: 'legendary',
  },
  scorched_earth: {
    type: 'scorched_earth',
    name: 'Scorched Earth',
    description: 'If you lose, the node\'s population is devastated. +50% casualties for all.',
    attackModifier: 1.0,
    defenceModifier: 1.0,
    casualtyModifier: 1.5,
    rarity: 'uncommon',
  },
  flanking_manoeuvre: {
    type: 'flanking_manoeuvre',
    name: 'Flanking Manoeuvre',
    description: 'Strike from multiple directions. +30% attack if you control ≥2 adjacent nodes.',
    attackModifier: 1.3,
    defenceModifier: 1.0,
    casualtyModifier: 1.0,
    rarity: 'uncommon',
  },
  shield_wall: {
    type: 'shield_wall',
    name: 'Shield Wall',
    description: 'Lock shields. -10% attack, +20% defence, -40% own casualties.',
    attackModifier: 0.9,
    defenceModifier: 1.2,
    casualtyModifier: 0.6,
    rarity: 'common',
  },
};

/**
 * Extended card types beyond the 8 in the type definition.
 * These use existing type slots via casting.
 */
export const EXTENDED_CARDS: CombatCardDefinition[] = [
  {
    type: 'zealous_charge', // War Drums uses zealous_charge slot as alternate
    name: 'War Drums',
    description: 'Rally the troops. +15% attack and defence, +10% casualties.',
    attackModifier: 1.15,
    defenceModifier: 1.15,
    casualtyModifier: 1.1,
    rarity: 'common',
  },
  {
    type: 'scorched_earth', // Blood Sacrifice uses scorched_earth slot as alternate
    name: 'Blood Sacrifice',
    description: 'Offer blood to the old gods. +50% attack, -30% defence, +40% casualties. Massive soul yield.',
    attackModifier: 1.5,
    defenceModifier: 0.7,
    casualtyModifier: 1.4,
    rarity: 'rare',
  },
];

// ─── Card Creation ──────────────────────────────────────────────

/**
 * Create a new combat card instance from a card type.
 */
export function createCombatCard(type: CombatCardType): CombatCard {
  const def = COMBAT_CARD_LIBRARY[type];
  return {
    id: `card-${uuidv4().slice(0, 8)}`,
    type: def.type,
    name: def.name,
    description: def.description,
    attackModifier: def.attackModifier,
    defenceModifier: def.defenceModifier,
    casualtyModifier: def.casualtyModifier,
    used: false,
  };
}

/**
 * Grant a random combat card to a player based on rarity weights.
 * Common: 50%, Uncommon: 30%, Rare: 15%, Legendary: 5%
 */
export function grantRandomCombatCard(): CombatCard {
  const roll = Math.random();
  let targetRarity: CombatCardDefinition['rarity'];

  if (roll < 0.05) targetRarity = 'legendary';
  else if (roll < 0.20) targetRarity = 'rare';
  else if (roll < 0.50) targetRarity = 'uncommon';
  else targetRarity = 'common';

  const candidates = Object.values(COMBAT_CARD_LIBRARY).filter(c => c.rarity === targetRarity);
  if (candidates.length === 0) {
    // Fallback to any card
    const all = Object.values(COMBAT_CARD_LIBRARY);
    return createCombatCard(all[Math.floor(Math.random() * all.length)].type);
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return createCombatCard(chosen.type);
}

/**
 * Get all available (unused) cards for a player.
 */
export function getPlayableCards(cards: CombatCard[]): CombatCard[] {
  return cards.filter(c => !c.used);
}

/**
 * Check if flanking condition is met (control ≥2 adjacent nodes to target).
 */
export function checkFlankingCondition(
  controlledNodeIds: string[],
  targetNodeId: string,
  edges: { sourceNodeId: string; targetNodeId: string; severed: boolean }[],
): boolean {
  const controlled = new Set(controlledNodeIds);
  let adjacentControlled = 0;

  for (const edge of edges) {
    if (edge.severed) continue;
    if (edge.sourceNodeId === targetNodeId && controlled.has(edge.targetNodeId)) adjacentControlled++;
    else if (edge.targetNodeId === targetNodeId && controlled.has(edge.sourceNodeId)) adjacentControlled++;
  }

  return adjacentControlled >= 2;
}
