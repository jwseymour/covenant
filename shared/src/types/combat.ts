/**
 * Combat types — military conflict resolution.
 *
 * GDD §5.2 — "Mostly deterministic with slight randomness."
 * Includes army strength, defensive bonus, combat cards,
 * religion influence on combat, and soul collection from fallen.
 */

import type { NodeId } from './graph.js';
import type { PlayerId } from './player.js';
import type { BeliefTag } from './religion.js';
import type { DominionId } from './dominion.js';

// ─── Combat Cards [TOGGLEABLE] ─────────────────────────────────

/**
 * Combat card types. GDD §5.2 — one-time effects played during combat.
 * Earned from rites, relics, or missions. [TOGGLEABLE]
 */
export type CombatCardType =
  | 'ambush'             // Surprise attack — negates defensive bonus
  | 'zealous_charge'     // Extra attack strength, higher casualties
  | 'fortify'            // Extra defensive bonus
  | 'feigned_retreat'    // Lure enemy into unfavourable position
  | 'divine_intervention'// Massive boost, rare
  | 'scorched_earth'     // Destroy the node if you lose
  | 'flanking_manoeuvre'  // Bonus if attacking from multiple adjacent nodes
  | 'shield_wall';       // Reduce casualties on your side

/** A combat card instance. */
export interface CombatCard {
  readonly id: string;
  readonly type: CombatCardType;
  readonly name: string;
  readonly description: string;
  /** Effect on attack strength (multiplier, e.g., 1.2 = +20%). */
  readonly attackModifier: number;
  /** Effect on defence strength (multiplier). */
  readonly defenceModifier: number;
  /** Effect on casualties (multiplier, lower = fewer casualties). */
  readonly casualtyModifier: number;
  /** Whether this card has been used (one-time use). */
  used: boolean;
}

// ─── Army ───────────────────────────────────────────────────────

/**
 * Computed army statistics for a combat participant.
 * GDD §5.2: "strength value (size + any enhancements)".
 */
export interface ArmyStats {
  readonly dominionId: DominionId;
  readonly ownerId: PlayerId;
  /** Raw army size. */
  baseStrength: number;
  /** Quality modifier from troop improvements (GDD §5.2). */
  qualityModifier: number;
  /** Total strength = baseStrength × qualityModifier. */
  totalStrength: number;
  /** Combat cards played for this engagement. */
  cardsPlayed: CombatCard[];
  /**
   * Religion influence on combat from belief tags. GDD §5.2:
   * "Fury = combat bonus, Sacrifice = higher soul yield,
   * Unity = reinforcement from adjacent nodes."
   */
  beliefTagBonuses: Partial<Record<BeliefTag, number>>;
}

// ─── Combat Resolution ──────────────────────────────────────────

/**
 * A combat engagement between two armies at a node.
 * GDD §5.2.
 */
export interface Combat {
  readonly id: string;
  /** Where the combat is happening. */
  readonly nodeId: NodeId;
  /** The attacking army. */
  attacker: ArmyStats;
  /** The defending army. */
  defender: ArmyStats;
  /**
   * Defensive bonus applied to the defender.
   * GDD §5.2: "Defender gets a defensive bonus (e.g., +20%)".
   */
  defensiveBonus: number;
  /** Turn this combat occurred on. */
  readonly turn: number;
}

/**
 * Result of resolving a combat engagement.
 */
export interface CombatResult {
  readonly combatId: string;
  /** Which side won. */
  winner: 'attacker' | 'defender';
  /** Casualties suffered by the attacker. */
  attackerCasualties: number;
  /** Casualties suffered by the defender. */
  defenderCasualties: number;
  /**
   * Souls released from fallen warriors. GDD §5.2:
   * "fallen warriors release souls, claimable by whoever
   * controls the area's religion."
   */
  soulsReleased: number;
  /**
   * Who claims the released souls (the player controlling
   * the area's dominant religion).
   */
  soulClaimantId: PlayerId | null;
  /**
   * The random factor that was applied. GDD §5.2:
   * "not enough to flip a lopsided fight, but enough to
   * make close engagements uncertain."
   */
  randomFactor: number;
}
