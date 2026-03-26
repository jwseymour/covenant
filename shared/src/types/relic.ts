/**
 * Relic types — persistent items of power.
 *
 * GDD §4.5: "Medium-to-high-impact persistent items. Found at locations,
 * earned from missions, obtained through sacrifice or pillage.
 * More than 5 total, not common. May have realm affinity.
 * Using a relic costs 1 AP."
 */

import type { RealmId } from './realm.js';
import type { PlayerId } from './player.js';

/** Unique identifier for a relic. */
export type RelicId = string;

/**
 * How a relic was acquired. GDD §4.5.
 */
export type RelicAcquisitionMethod =
  | 'found_at_location'  // Discovered at a relic_location node
  | 'mission_reward'     // Earned from completing a mission
  | 'sacrifice'          // Obtained through sacrifice
  | 'pillage'            // Taken from a conquered location
  | 'rite_reward';       // Earned from a rite site

/**
 * A relic — a persistent item that expands the Ordained's abilities.
 * GDD §4.5: "limited-use or persistent abilities that expand the
 * Ordained's personal action space over time."
 */
export interface Relic {
  readonly id: RelicId;
  readonly name: string;
  readonly description: string;
  /**
   * Realm affinity — the relic is more effective in this realm.
   * GDD §4.5: "May have realm affinity."
   * Null means no realm affinity.
   */
  readonly realmAffinity: RealmId | null;
  /** How many uses remain (-1 = unlimited/persistent). */
  usesRemaining: number;
  /** Maximum uses (-1 = unlimited). */
  readonly maxUses: number;
  /** The effect category of this relic. */
  readonly effectType: RelicEffectType;
  /** Current owner (null if unclaimed). */
  ownerId: PlayerId | null;
  /** How this relic was acquired. */
  acquisitionMethod: RelicAcquisitionMethod | null;
  /** Turn this relic was acquired. */
  acquiredTurn: number | null;
}

/** Categories of relic effects. */
export type RelicEffectType =
  | 'combat_modifier'      // Modifies combat strength or outcomes
  | 'dominion_modifier'    // Affects dominion control or decay
  | 'religion_modifier'    // Affects religion spread or stability
  | 'espionage'           // Reveals hidden information (GDD §4.8)
  | 'movement'            // Affects travel or positioning
  | 'soul_modifier'       // Affects soul generation or routing
  | 'confrontation'       // Modifies confrontation (bid modifiers etc.)
  | 'rite_modifier'       // Affects rite costs or effects
  | 'graph_modifier'      // Affects board topology (create/destroy edges)
  | 'special';            // Unique one-off effect
