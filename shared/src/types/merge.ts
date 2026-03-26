/**
 * Merge zone types — realm overlap and additive rule stacking.
 *
 * GDD §3.4: "When realms merge, their rules stack additively."
 * lore_complete.md §7: All merge combinations (pairs, triples,
 * quads, full Convergence) with unique rites and capabilities.
 *
 * "At the Convergence (full merge), all five energies coexist."
 */

import type { RealmId } from './realm.js';
import type { NodeId } from './graph.js';

/** Unique identifier for a merge zone. */
export type MergeZoneId = string;

/**
 * The number of realms in a merge combination.
 * lore_complete.md §7: pairs (§7.1), triples (§7.2),
 * quads (§7.3), convergence (§7.4).
 */
export type MergeSize = 2 | 3 | 4 | 5;

/**
 * A merge zone — a region where multiple realms overlap.
 * GDD §3.4: Rules stack additively.
 */
export interface MergeZone {
  readonly id: MergeZoneId;
  /** Which realms are merged in this zone. */
  readonly realmIds: RealmId[];
  /** How many realms (2=pair, 3=triple, 4=quad, 5=convergence). */
  readonly mergeSize: MergeSize;
  /** All nodes within this merge zone. */
  nodeIds: NodeId[];
  /** Turn this merge zone formed. */
  readonly formedTurn: number;
  /**
   * Whether this is the full Convergence (all 5 realms).
   * GDD §3.4: "Convergence-only rites become available."
   */
  readonly isConvergence: boolean;
  /**
   * Unique rite IDs available only in this merge combination.
   * lore_complete.md §7: each merge has a unique "New capability" rite.
   */
  availableRiteIds: string[];
  /**
   * Merge-specific events (one-time or recurring).
   * GDD §3.4: "Merge events — one-time or recurring events."
   */
  activeEvents: MergeEvent[];
  /**
   * Merge-specific cities/landmarks. GDD §3.4:
   * "Unique locations that appear only when specific realms collide."
   */
  mergeNodeIds: NodeId[];
}

/** An event triggered by a specific realm combination. */
export interface MergeEvent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Whether this event fires once or recurs each turn. */
  readonly recurring: boolean;
  /** Whether this event has already fired (for one-time events). */
  fired: boolean;
}

// ─── Merge Combination Keys ─────────────────────────────────────

/**
 * All 10 pair combinations. lore_complete.md §7.1.
 * Used as keys for merge-specific data lookup.
 */
export type RealmPair =
  | 'dominion-entropy'
  | 'dominion-communion'
  | 'dominion-wrath'
  | 'dominion-memory'
  | 'entropy-communion'
  | 'entropy-wrath'
  | 'entropy-memory'
  | 'communion-wrath'
  | 'communion-memory'
  | 'wrath-memory';

/**
 * All 10 triple combinations. lore_complete.md §7.2.
 */
export type RealmTriple =
  | 'dominion-entropy-communion'
  | 'dominion-entropy-wrath'
  | 'dominion-entropy-memory'
  | 'dominion-communion-wrath'
  | 'dominion-communion-memory'
  | 'dominion-wrath-memory'
  | 'entropy-communion-wrath'
  | 'entropy-communion-memory'
  | 'entropy-wrath-memory'
  | 'communion-wrath-memory';

/**
 * All 5 quad combinations. lore_complete.md §7.3.
 */
export type RealmQuad =
  | 'dominion-entropy-communion-wrath'
  | 'dominion-entropy-communion-memory'
  | 'dominion-entropy-wrath-memory'
  | 'dominion-communion-wrath-memory'
  | 'entropy-communion-wrath-memory';

/** Full convergence identifier. */
export type ConvergenceCombination = 'dominion-entropy-communion-wrath-memory';

/** Any merge combination key. */
export type MergeCombinationKey = RealmPair | RealmTriple | RealmQuad | ConvergenceCombination;

/**
 * Static definition of what a specific merge combination produces.
 * lore_complete.md §7 — each combination has unique capabilities.
 */
export interface MergeCombinationDefinition {
  readonly key: MergeCombinationKey;
  readonly realmIds: RealmId[];
  readonly name: string;
  readonly themeName: string;
  readonly description: string;
  /** The unique rite/capability this merge unlocks. */
  readonly uniqueRiteId: string;
  readonly uniqueRiteName: string;
  readonly uniqueRiteDescription: string;
  /** Merge-specific cities/landmarks that appear. */
  readonly mergeLocations: string[];
}
