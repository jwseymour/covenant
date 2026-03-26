/**
 * Dominion instruction types — conditional flowcharts for automated control.
 *
 * GDD §4.2 — three tiers of complexity:
 * - Basic: high-level directives ("Defend", "Expand north")
 * - Advanced: conditional flowcharts (IF attacked THEN defend ELSE expand)
 * - Expert: multi-branch decision trees with compound conditions
 *
 * GDD §4.2: "Instructions idle if impossible. Must physically return to modify."
 */

import type { NodeId } from './graph.js';
import type { RealmId } from './realm.js';
import type { PlayerId } from './player.js';

// ─── Instruction Tier ───────────────────────────────────────────

/** GDD §4.2 — tiered instruction complexity. */
export type InstructionTier = 'basic' | 'advanced' | 'expert';

// ─── Dominion Actions ───────────────────────────────────────────

/**
 * All possible dominion instruction actions. Derived from GDD §4.2,
 * §4.3, and §4.8 (scouting via dominion instructions).
 */
export type DominionActionType =
  | 'defend'            // Hold current territory
  | 'expand'            // Expand toward a target node/direction
  | 'recruit'           // Build army strength
  | 'scout'             // Scout a target for intelligence (GDD §4.8)
  | 'hold'              // Do nothing, maintain position
  | 'attack'            // Attack a specific target
  | 'suppress_religion' // Target and suppress a religion (GDD §2.4)
  | 'improve_troops';   // Enhance army quality (GDD §5.2)

/** A single dominion action with optional target. */
export interface DominionAction {
  readonly type: DominionActionType;
  /** Target node for directional actions (expand, attack, scout). */
  targetNodeId?: NodeId;
  /** Target realm for cross-realm actions. */
  targetRealmId?: RealmId;
  /** Target player for adversarial actions (suppress, attack). */
  targetPlayerId?: PlayerId;
  /** Target religion ID for suppress_religion. */
  targetReligionId?: string;
}

// ─── Conditions ─────────────────────────────────────────────────

/**
 * Conditions that can trigger instruction branches.
 * GDD §4.2 — advanced/expert tiers use conditions.
 */
export type ConditionType =
  | 'attacked'                 // This dominion is under attack
  | 'enemy_nearby'             // Enemy dominion/army within N edges
  | 'influence_below'          // Dominion influence below threshold
  | 'influence_above'          // Dominion influence above threshold
  | 'army_size_below'          // Army strength below threshold
  | 'army_size_above'          // Army strength above threshold
  | 'enemy_religion_present'   // A rival religion is in this node
  | 'population_below'         // Node population below threshold
  | 'realm_merged'             // This realm has merged with another
  | 'always';                  // Always true (default branch)

/** A condition with its parameters. */
export interface InstructionCondition {
  readonly type: ConditionType;
  /** Numeric threshold for comparison conditions. */
  threshold?: number;
  /** Target player for player-specific conditions. */
  targetPlayerId?: PlayerId;
  /** Target realm for realm-specific conditions. */
  targetRealmId?: RealmId;
}

// ─── Compound Conditions (Expert Tier) ──────────────────────────

/** Logical operators for combining conditions. Expert tier (GDD §4.2). */
export type LogicalOperator = 'and' | 'or' | 'not';

/** A compound condition combining multiple sub-conditions. */
export interface CompoundCondition {
  readonly operator: LogicalOperator;
  readonly conditions: (InstructionCondition | CompoundCondition)[];
}

// ─── Instruction Node (Flowchart) ───────────────────────────────

/** Unique identifier for an instruction node in a flowchart. */
export type InstructionNodeId = string;

/**
 * A single node in a conditional instruction flowchart.
 * GDD §4.2 — "Visual flowchart builder (primary)".
 */
export interface InstructionNode {
  readonly id: InstructionNodeId;
  /** The condition to evaluate (absent for action-only nodes). */
  condition?: InstructionCondition | CompoundCondition;
  /** The action to execute if condition is true (or if no condition). */
  action: DominionAction;
  /** Next node if condition is true. */
  trueNextId?: InstructionNodeId;
  /** Next node if condition is false (for conditional branches). */
  falseNextId?: InstructionNodeId;
}

/**
 * A complete instruction set for a dominion.
 * Can be a single directive (basic tier) or a multi-node
 * flowchart (advanced/expert tiers). GDD §4.2.
 *
 * "Flowchart node count may be limited" — maxNodes enforces this.
 */
export interface DominionInstructionSet {
  /** Which tier of complexity this instruction set uses. */
  readonly tier: InstructionTier;
  /** The entry point node of the flowchart. */
  entryNodeId: InstructionNodeId;
  /** All nodes in the flowchart. */
  nodes: Record<InstructionNodeId, InstructionNode>;
  /** Turn this instruction was last modified. */
  lastModifiedTurn: number;
}

// ─── Religion Instructions ──────────────────────────────────────

/**
 * Religion instruction actions — simpler than dominion flowcharts.
 * GDD §2.4: "more like a sacred text's commandments".
 * 6 base actions from GDD §2.4 religion instructions table.
 */
export type ReligionActionType =
  | 'spread_toward'      // Expand toward a target node/direction
  | 'hold'               // Stop spreading, consolidate
  | 'slow_spread'        // Reduce spread rate (safer)
  | 'fast_spread'        // Increase spread rate (higher collapse risk)
  | 'resist_suppression' // Defensive posture against attacks
  | 'holy_war'           // Actively oppose a rival religion or dominion
  | 'sacred_festival';   // Cost souls, boost loyalty and spread temporarily

/** A religion instruction with optional target and condition. */
export interface ReligionInstruction {
  readonly action: ReligionActionType;
  /** Target for spread_toward and holy_war. */
  targetNodeId?: NodeId;
  /** Target religion/dominion for holy_war. */
  targetReligionId?: string;
  targetPlayerId?: PlayerId;
  /**
   * Optional condition for this instruction.
   * GDD §2.4: "can be combined with conditions:
   * IF enemy religion enters our territory THEN resist suppression."
   */
  condition?: InstructionCondition;
  /** Priority order when multiple instructions apply. */
  priority: number;
}

/**
 * Complete instruction set for a religion.
 * Simpler than dominion instructions — a prioritised list of
 * commandments rather than a branching flowchart.
 */
export interface ReligionInstructionSet {
  readonly instructions: ReligionInstruction[];
  /** Turn this instruction set was last modified. */
  lastModifiedTurn: number;
}

// ─── Scout Report ───────────────────────────────────────────────

/**
 * Intelligence gathered through dominion scouting. GDD §4.8.
 *
 * "Default reveals top-level directive and army size (not full flowchart)."
 * Special abilities can reveal the full instruction flowchart.
 */
export interface ScoutReport {
  /** The node that was scouted. */
  readonly targetNodeId: NodeId;
  /** Turn the scouting was ordered. */
  readonly orderedTurn: number;
  /** Turn the results will be available (next visit). */
  readonly availableTurn: number;
  /** Whether the report has been delivered. */
  delivered: boolean;
  /** The top-level directive of the enemy dominion (always revealed). */
  topLevelDirective?: DominionActionType;
  /** Enemy army size at the target (always revealed). */
  armySize?: number;
  /** Full enemy instruction flowchart (only with special abilities). */
  fullInstructions?: DominionInstructionSet;
}
