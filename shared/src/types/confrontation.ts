/**
 * Confrontation types — direct Ordained-to-Ordained conflict.
 *
 * GDD §5.1: "When multiple Ordained are at the same location,
 * each chooses: confront or retreat."
 *
 * "Confrontation is a high-stakes power move — you risk resources
 * and your entire turn."
 */

import type { NodeId } from './graph.js';
import type { PlayerId } from './player.js';

/**
 * The choice each Ordained makes when co-located. GDD §5.1.
 *
 * - retreat: displaced to adjacent node, lose entire turn
 * - confront: soul bid, higher bid wins, loser loses turn + expelled
 * - coexist: if neither confronts, both act normally
 */
export type ConfrontationChoice = 'confront' | 'retreat';

/**
 * A confrontation between two co-located Ordained. GDD §5.1.
 */
export interface Confrontation {
  readonly id: string;
  /** The node where the confrontation occurs. */
  readonly nodeId: NodeId;
  /** The two Ordained involved. */
  readonly participants: [PlayerId, PlayerId];
  /** Each participant's secret choice. */
  choices: Partial<Record<PlayerId, ConfrontationChoice>>;
  /** Each confronting participant's secret soul bid. */
  bids: Partial<Record<PlayerId, number>>;
  /** Turn this confrontation occurred. */
  readonly turn: number;
  /** Whether this confrontation has been resolved. */
  resolved: boolean;
}

/**
 * Result of resolving a confrontation. GDD §5.1.
 */
export interface ConfrontationResult {
  readonly confrontationId: string;
  /**
   * Outcome scenario:
   * - both_confront: soul bid, higher wins
   * - one_confronts: confronter wins by default
   * - both_retreat: both lose their turns
   * - coexist: neither confronts, both act normally
   */
  outcome: 'both_confront' | 'one_confronts' | 'both_retreat' | 'coexist';
  /** Who won (null if coexist or both_retreat). */
  winnerId: PlayerId | null;
  /** Who lost (null if coexist or both_retreat). */
  loserId: PlayerId | null;
  /**
   * The winning bid (GDD §5.1: "The winner keeps their bid").
   * Losing bid is also kept — neither side pays souls.
   * The cost is the TURN, not the souls bid.
   */
  winningBid: number;
  /**
   * Where the loser is expelled to.
   * GDD §5.1: "expelled to a random adjacent node" for confront loser,
   * "displaced to an adjacent node" for retreat.
   */
  expelledToNodeId: NodeId | null;
  /**
   * Modifiers applied from combat cards, relics, area effects.
   * GDD §5.1: "bid multipliers, expulsion prevention, etc."
   */
  modifiersApplied: string[];
}
