/**
 * Rite types — site-specific and personal rituals.
 *
 * GDD §4.5: Site-specific rites at rite sites, tied to realm energy.
 * GDD §4.6: Personal rituals (Sight, Binding, Severance, Harvest).
 *
 * "Rites are special actions at specific locations within realms."
 * "Personal rituals are the Ordained's own actions."
 */

import type { NodeId } from './graph.js';
import type { RealmId } from './realm.js';
import type { PlayerId } from './player.js';

// ─── Personal Rituals ───────────────────────────────────────────

/**
 * The four base personal rituals available to all Ordained.
 * GDD §4.6. Each costs 1 AP + souls.
 */
export type PersonalRitualType =
  | 'rite_of_sight'      // Reveal all instructions at current location
  | 'rite_of_binding'    // Reset decay, reinforce, stabilise religion
  | 'rite_of_severance'  // Accelerate enemy decay, disrupt, or sever edge
  | 'rite_of_harvest';   // Sacrifice node for all its souls

/**
 * Soul cost levels for personal rituals. GDD §4.6 table.
 */
export type RitualCostLevel = 'none' | 'low' | 'medium' | 'high' | 'massive';

/** Definition of a personal ritual. */
export interface PersonalRitualDefinition {
  readonly type: PersonalRitualType;
  readonly name: string;
  readonly description: string;
  /** Soul cost (GDD §4.6: Sight=Low, Binding=Medium, Severance=Medium, Harvest=None). */
  readonly costLevel: RitualCostLevel;
  /** Exact soul cost (tuning value). */
  readonly soulCost: number;
  /** AP cost (always 1 per GDD §4.6). */
  readonly apCost: 1;
}

/**
 * Sub-action choices for personal rituals that have multiple effects.
 * GDD §4.6: Rite of Severance can accelerate decay, disrupt spread, or sever edge.
 */
export type SeveranceTarget =
  | 'accelerate_enemy_decay'    // Accelerate decay on enemy dominion
  | 'disrupt_enemy_religion'    // Disrupt enemy religion spread
  | 'sever_edge';               // Cut a graph edge (travel route)

// ─── Site-Specific Rites ────────────────────────────────────────

/** Unique identifier for a rite-site rite. */
export type RiteId = string;

/**
 * A rite available at a specific rite site. GDD §4.5.
 * Tied to the site's realm energy. Merge zones stack rites
 * from component realms.
 */
export interface SiteRite {
  readonly id: RiteId;
  readonly name: string;
  readonly description: string;
  /** Which realm this rite is tied to. */
  readonly realmId: RealmId;
  /** Soul cost to perform. */
  readonly soulCost: number;
  /** AP cost (always 1 per GDD §4.5). */
  readonly apCost: 1;
  /** Effect category. */
  readonly effectType: SiteRiteEffectType;
  /**
   * Required merge combination (for merge-zone rites).
   * Null = available in single-realm rite sites.
   * lore_complete.md §7 — each merge has a unique rite.
   */
  readonly requiredMerge: RealmId[] | null;
}

/** Categories of site-specific rite effects. */
export type SiteRiteEffectType =
  | 'dominion_control'     // Affects dominion state
  | 'religion_spread'      // Affects religion behaviour
  | 'combat'               // Military effects
  | 'soul_generation'      // Direct soul gain
  | 'information'          // Reveals hidden game state
  | 'graph_modification'   // Changes board topology
  | 'state_manipulation'   // Alters game state (freeze, undo, etc.)
  | 'convergence';         // Convergence-only rites (GDD §3.4)

// ─── Convergence Rites ──────────────────────────────────────────

/**
 * Convergence-only rites. lore_complete.md §7.4.
 * Available only when all 5 realms have fully merged.
 */
export type ConvergenceRiteType =
  | 'rite_of_new_covenant'   // Instant win (GDD §1, §6, lore §7.4)
  | 'rite_of_supremacy'      // Contest all unattended dominions
  | 'rite_of_reckoning';     // Force immediate soul scoring check

/**
 * Requirements for the Rite of the New Covenant (instant win).
 * GDD §1: "massive soul cost, specific relic/position requirements."
 * lore_complete.md §7.4.
 */
export interface NewCovenantRequirements {
  /** Minimum souls required. */
  readonly minSouls: number;
  /** Required relic IDs. */
  readonly requiredRelicIds: RelicId[];
  /** Required position (must be in Convergence zone). */
  readonly requiresConvergence: true;
  /** Other conditions (e.g., control key positions). */
  readonly additionalConditions: string[];
}

// Re-export for convenience
type RelicId = string;

// ─── Rite Execution Record ──────────────────────────────────────

/** Record of a rite being performed (for game history). */
export interface RiteExecution {
  /** The rite performed (personal ritual type or site rite ID). */
  riteId: string;
  /** The Ordained who performed it. */
  performerId: PlayerId;
  /** Where it was performed. */
  nodeId: NodeId;
  /** Turn it was performed. */
  turn: number;
  /** Souls spent. */
  soulCost: number;
}
