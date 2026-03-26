/**
 * Dominion types — political control through rulers.
 *
 * One of the two parallel influence systems (the other being religion).
 * GDD §2.3 (establishing, decay, subversion).
 * GDD §4.3 (dominion vs religion comparison table).
 *
 * "A dominion is a settlement/nation the Ordained controls through its ruler."
 */

import type { NodeId } from './graph.js';
import type { RealmId } from './realm.js';
import type { PlayerId } from './player.js';
import type { DominionInstructionSet, ScoutReport } from './instruction.js';

/** Unique identifier for a dominion. */
export type DominionId = string;

/**
 * A dominion — a settlement/nation controlled by an Ordained through its ruler.
 * GDD §2.3, §4.3.
 */
export interface Dominion {
  readonly id: DominionId;
  /** The Ordained who controls this dominion. */
  ownerId: PlayerId;
  /** The realm this dominion is in. */
  readonly realmId: RealmId;
  /** The primary node (settlement) of this dominion. */
  readonly primaryNodeId: NodeId;
  /** All nodes this dominion controls (primary + expanded territory). */
  controlledNodeIds: NodeId[];

  // ─── Influence & Decay ──────────────────────────────────────

  /**
   * Current influence level (0–100).
   * GDD §2.3: "~3-4% per turn — firmly held for ~7 turns,
   * vulnerable after ~15, autonomous after ~25".
   */
  influence: number;
  /**
   * Decay rate per turn (percentage points).
   * Default ~3.5. Modified by realm energy and abilities.
   */
  decayRate: number;
  /** Last turn the Ordained visited this dominion. */
  lastVisitedTurn: number;
  /**
   * Turn this dominion was established. Used to calculate
   * subversion resistance (GDD §2.3 — "effectiveness depends
   * on decay, abilities, establishment method").
   */
  establishedTurn: number;

  // ─── Military ─────────────────────────────────────────────

  /**
   * Army strength. GDD §5.2 — "Each army has a strength value
   * (size + any enhancements)".
   */
  armyStrength: number;
  /** Base army size (before enhancements). */
  armyBaseSize: number;
  /** Troop quality modifier from improvements (GDD §5.2). */
  troopQualityModifier: number;

  // ─── Instructions ─────────────────────────────────────────

  /**
   * Current autonomous instructions. GDD §4.2.
   * "Direct control when present; conditional instructions when absent."
   */
  instructions: DominionInstructionSet | null;

  // ─── Intelligence ─────────────────────────────────────────

  /** Pending scout reports (GDD §4.8). */
  scoutReports: ScoutReport[];
}

/**
 * Public view of a dominion visible to all players.
 * GDD §4.8: "Visible: Dominion ownership, general religion spread."
 * Hides instructions and exact influence levels.
 */
export interface DominionPublicView {
  readonly id: DominionId;
  ownerId: PlayerId;
  readonly realmId: RealmId;
  readonly primaryNodeId: NodeId;
  controlledNodeIds: NodeId[];
  /** Approximate influence: 'firm' | 'holding' | 'vulnerable' | 'fading' */
  influenceCategory: 'firm' | 'holding' | 'vulnerable' | 'fading';
  /** Approximate army: 'small' | 'moderate' | 'large' | 'massive' */
  armyCategory: 'small' | 'moderate' | 'large' | 'massive';
}
