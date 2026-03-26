/**
 * Mission types — hidden personal objectives for the Ordained.
 *
 * GDD §4.7: "Hidden personal objectives. Variable scope."
 * 3 missions drawn at game start. Rewards: souls, relics,
 * information, or special abilities (not just points).
 */

import type { RealmId } from './realm.js';
import type { PlayerId } from './player.js';

/** Unique identifier for a mission. */
export type MissionId = string;

/**
 * Scope of a mission — how far-reaching the objective is.
 * GDD §4.7: "Variable scope (local → realm-spanning → cross-realm)."
 */
export type MissionScope = 'local' | 'realm' | 'cross_realm';

/**
 * What kind of condition must be met to complete the mission.
 */
export type MissionConditionType =
  | 'control_dominions_in_realms'    // "Control a dominion in 3 realms simultaneously"
  | 'religion_dominant_in_realm'     // "Have your religion dominant in The Crucible"
  | 'perform_realm_rites'           // "Perform 3 different realm rites in one game"
  | 'accumulate_souls'              // Reach a soul threshold
  | 'conquer_nodes'                 // Control N nodes
  | 'found_religions'               // Found N religions
  | 'win_combats'                   // Win N combats
  | 'visit_realms'                  // Visit all 5 realms
  | 'complete_rites_at_sites'       // Perform rites at specific sites
  | 'survive_confrontation'         // Win a confrontation with specific conditions
  | 'custom';                       // Custom mission condition

/** A mission condition with parameters. */
export interface MissionCondition {
  readonly type: MissionConditionType;
  /** Target realm(s) for realm-specific missions. */
  targetRealmIds?: RealmId[];
  /** Numeric threshold (e.g., "3 realms", "5 combats"). */
  threshold?: number;
  /** Current progress toward the threshold. */
  progress: number;
  /** Human-readable description. */
  description: string;
}

/**
 * Reward types for completing a mission.
 * GDD §4.7: "Rewards: souls, relics, information, or special abilities."
 */
export type MissionRewardType = 'souls' | 'relic' | 'information' | 'ability';

/** A specific mission reward. */
export interface MissionReward {
  readonly type: MissionRewardType;
  /** Soul amount for soul rewards. */
  soulAmount?: number;
  /** Relic ID for relic rewards. */
  relicId?: string;
  /** Description of information or ability reward. */
  description: string;
}

/**
 * A hidden personal mission for an Ordained.
 * GDD §4.7: "Should require meaningful planning and manipulation."
 */
export interface Mission {
  readonly id: MissionId;
  /** The Ordained this mission belongs to (hidden from others). */
  readonly assignedTo: PlayerId;
  /** Display title. */
  readonly title: string;
  /** Flavour text / description. */
  readonly description: string;
  /** How far-reaching this mission is. */
  readonly scope: MissionScope;
  /** The conditions to complete this mission. */
  conditions: MissionCondition[];
  /** Whether all conditions are met. */
  completed: boolean;
  /** Turn completed (if completed). */
  completedTurn?: number;
  /** Rewards upon completion. */
  readonly rewards: MissionReward[];
  /** Whether rewards have been claimed. */
  rewardsClaimed: boolean;
}
