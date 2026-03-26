/**
 * Religion types — sacred oaths for soul routing.
 *
 * The second parallel influence system (alongside dominions).
 * GDD §2.4 — founding, belief tags, instructions, collapse.
 * lore_complete.md §6 — "religions are sacred oaths".
 *
 * "Every religion is a lie. The Ordained do not believe in the
 * doctrines they preach. They construct religions as soul-routing
 * mechanisms." — lore_complete.md §6
 */

import type { NodeId } from './graph.js';
import type { RealmId } from './realm.js';
import type { PlayerId } from './player.js';
import type { ReligionInstructionSet } from './instruction.js';

// ─── Belief Tags (Doctrines) ────────────────────────────────────

/**
 * The 15 belief tags (doctrines). 3 per realm. [TOGGLEABLE]
 * GDD §2.4 — each religion picks 2 at founding.
 * Tags determine: soul routing, spread compatibility,
 * AND follower behaviour (combat, politics, crisis).
 */
export type BeliefTag =
  // Dominion realm tags (GDD §2.4)
  | 'obedience'    // Loyal followers, hard to subvert
  | 'sacrifice'    // Higher soul yield, population declines faster
  | 'order'        // Religion resists mutation, stays as founded
  // Entropy realm tags
  | 'renewal'      // Religion regenerates after damage
  | 'abandon'      // Fast spread, followers don't fight well
  | 'adaptation'   // Auto-adjusts to local compatibility
  // Communion realm tags
  | 'unity'        // Followers reinforce adjacent nodes
  | 'empathy'      // Strong defence, weak attack
  | 'communion'    // Merges with local beliefs rather than displacing
  // Wrath realm tags
  | 'fury'         // Combat bonus, more casualties
  | 'defiance'     // Very hard to suppress/dismantle
  | 'conquest'     // Spreads automatically into conquered territory
  // Memory realm tags
  | 'remembrance'  // Very slow decay, nearly permanent
  | 'wisdom'       // Scouting bonus from controlled areas
  | 'tradition';   // Existing religions resist displacement

/** All belief tags as a constant array. */
export const ALL_BELIEF_TAGS: readonly BeliefTag[] = [
  'obedience', 'sacrifice', 'order',
  'renewal', 'abandon', 'adaptation',
  'unity', 'empathy', 'communion',
  'fury', 'defiance', 'conquest',
  'remembrance', 'wisdom', 'tradition',
] as const;

/**
 * Mapping from each belief tag to its source realm.
 * GDD §2.4: "Tags from the same realm as the location spread faster."
 */
export const BELIEF_TAG_REALM: Record<BeliefTag, RealmId> = {
  obedience: 'dominion', sacrifice: 'dominion', order: 'dominion',
  renewal: 'entropy', abandon: 'entropy', adaptation: 'entropy',
  unity: 'communion', empathy: 'communion', communion: 'communion',
  fury: 'wrath', defiance: 'wrath', conquest: 'wrath',
  remembrance: 'memory', wisdom: 'memory', tradition: 'memory',
};

/** Description of each belief tag's mechanical effect. */
export interface BeliefTagDefinition {
  readonly tag: BeliefTag;
  readonly realmId: RealmId;
  readonly name: string;
  readonly description: string;
  /** Combat modifier (e.g., fury gives combat bonus). GDD §5.2. */
  readonly combatModifier: number;
  /** Spread rate modifier (positive = faster). */
  readonly spreadModifier: number;
  /** Decay resistance modifier (positive = slower decay). */
  readonly decayModifier: number;
  /** Soul yield modifier (multiplier). */
  readonly soulYieldModifier: number;
}

// ─── Religion ──────────────────────────────────────────────────

/** Unique identifier for a religion. */
export type ReligionId = string;

/**
 * A religion — a fabricated belief system that routes souls.
 * GDD §2.4. Multiple religions per player allowed.
 */
export interface Religion {
  readonly id: ReligionId;
  /** The Ordained who founded this religion. */
  founderId: PlayerId;
  /** The realm where this religion was founded. */
  readonly foundedRealmId: RealmId;
  /** The node where this religion was founded. */
  readonly foundedNodeId: NodeId;
  /** Display name of this religion. */
  name: string;
  /** Turn this religion was founded. */
  readonly foundedTurn: number;

  // ─── Doctrines ─────────────────────────────────────────────

  /**
   * The two belief tags chosen at founding. [TOGGLEABLE]
   * GDD §2.4: "Each religion chooses 2 belief tags from a pool of 15."
   * When tags are toggled off, this array is empty and defaults apply.
   */
  beliefTags: [BeliefTag, BeliefTag] | [];

  // ─── Spread ────────────────────────────────────────────────

  /**
   * All nodes where this religion has followers.
   * Maps NodeId → follower count (percentage of node population).
   */
  followersByNode: Record<string, number>;
  /** Total number of follower-nodes (shorthand). */
  nodeCount: number;

  // ─── Stability ─────────────────────────────────────────────

  /**
   * Stability score (0–100, starts high). GDD §2.4 collapse mechanics.
   * Gradual growth increases it. Fast growth decreases it.
   * Being attacked decreases it.
   * Below 20 = fracture risk each turn.
   */
  stability: number;
  /**
   * Whether this religion is currently in a fractured state.
   * GDD §2.4: "losing outer nodes, tag drift, soul routing
   * disruption for several turns".
   */
  fractured: boolean;
  /** Turns remaining in fractured state (0 if not fractured). */
  fractureTurnsRemaining: number;

  // ─── Instructions ─────────────────────────────────────────

  /**
   * Religion instruction set. GDD §2.4 religion instructions.
   * Simpler than dominion flowcharts — commandment-style.
   */
  instructions: ReligionInstructionSet | null;

  // ─── Soul Routing ─────────────────────────────────────────

  /**
   * Souls generated per turn (sum across all follower nodes).
   * GDD §2.5: "proportional to coverage".
   */
  soulsPerTurn: number;
  /**
   * Whether soul routing is currently disrupted (from fracture).
   */
  soulRoutingDisrupted: boolean;
}

/**
 * Public view of a religion — visible to all players.
 * GDD §4.8: "Visible: general religion spread."
 * Hides exact follower counts and instructions.
 */
export interface ReligionPublicView {
  readonly id: ReligionId;
  founderId: PlayerId;
  name: string;
  /** Approximate spread: list of nodes with visible presence. */
  visibleNodeIds: NodeId[];
  /** General size: 'nascent' | 'growing' | 'established' | 'dominant' */
  sizeCategory: 'nascent' | 'growing' | 'established' | 'dominant';
  beliefTags: [BeliefTag, BeliefTag] | [];
}
