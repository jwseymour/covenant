/**
 * Turn action types — all possible player actions per turn.
 *
 * GDD §4.1: "Each turn, the player has 2 action points (AP)."
 * GDD §5: Turn structure — simultaneous rounds.
 *
 * Discriminated union — each action type has its own payload.
 */

import type { NodeId } from './graph.js';
import type { RealmId } from './realm.js';
import type { PlayerId } from './player.js';
import type { DominionInstructionSet, ReligionInstructionSet } from './instruction.js';
import type { BeliefTag } from './religion.js';
import type { PersonalRitualType, SeveranceTarget } from './rite.js';
import type { ConfrontationChoice } from './confrontation.js';

// ─── Turn Action (Discriminated Union) ──────────────────────────

/**
 * All possible action types a player can take.
 * Each costs 1 AP unless noted. GDD §4.1.
 */
export type TurnActionType =
  | 'establish_dominion'       // GDD §2.3: Visit uncontrolled settlement
  | 'set_dominion_instructions' // GDD §4.2: Set/update conditional instructions
  | 'set_religion_instructions' // GDD §2.4: Set religion commandments
  | 'found_religion'           // GDD §2.4: Found a new religion
  | 'perform_personal_ritual'  // GDD §4.6: Sight, Binding, Severance, Harvest
  | 'perform_site_rite'        // GDD §4.5: Rite at a rite-site node
  | 'use_relic'                // GDD §4.5: Use a relic in inventory
  | 'confrontation_choice'     // GDD §5.1: Confront/retreat (0 AP — forced)
  | 'confrontation_bid'        // GDD §5.1: Soul bid (part of confrontation)
  | 'discard_mission'          // GDD §4.7: Discard and redraw a mission
  | 'set_destination';         // GDD §4.1: Choose next destination (FREE)

// ─── Individual Action Payloads ─────────────────────────────────

/** GDD §2.3: Establish dominion at an uncontrolled settlement. 1 AP. */
export interface EstablishDominionAction {
  readonly type: 'establish_dominion';
  readonly nodeId: NodeId;
}

/** GDD §4.2: Set/update conditional instructions for a dominion. 1 AP. */
export interface SetDominionInstructionsAction {
  readonly type: 'set_dominion_instructions';
  readonly dominionId: string;
  readonly instructions: DominionInstructionSet;
}

/** GDD §2.4: Set religion commandments. 1 AP. */
export interface SetReligionInstructionsAction {
  readonly type: 'set_religion_instructions';
  readonly religionId: string;
  readonly instructions: ReligionInstructionSet;
}

/** GDD §2.4: Found a new religion. 1 AP. */
export interface FoundReligionAction {
  readonly type: 'found_religion';
  readonly nodeId: NodeId;
  readonly name: string;
  readonly beliefTags: [BeliefTag, BeliefTag] | [];
}

/** GDD §4.6: Perform a personal ritual. 1 AP + soul cost. */
export interface PerformPersonalRitualAction {
  readonly type: 'perform_personal_ritual';
  readonly ritualType: PersonalRitualType;
  /** For Rite of Severance — which sub-effect. */
  readonly severanceTarget?: SeveranceTarget;
  /** For Rite of Severance edge cut — which edge. */
  readonly targetEdgeId?: string;
  /** For Rite of Severance — target player. */
  readonly targetPlayerId?: PlayerId;
  /** For Rite of Severance — target dominion/religion. */
  readonly targetEntityId?: string;
}

/** GDD §4.5: Perform a rite at a rite-site node. 1 AP + soul cost. */
export interface PerformSiteRiteAction {
  readonly type: 'perform_site_rite';
  readonly riteId: string;
  readonly nodeId: NodeId;
}

/** GDD §4.5: Use a relic from inventory. 1 AP. */
export interface UseRelicAction {
  readonly type: 'use_relic';
  readonly relicId: string;
  /** Target for targeted relic effects. */
  readonly targetNodeId?: NodeId;
  readonly targetPlayerId?: PlayerId;
}

/** GDD §5.1: Choose confront or retreat (forced when co-located). */
export interface ConfrontationChoiceAction {
  readonly type: 'confrontation_choice';
  readonly choice: ConfrontationChoice;
}

/** GDD §5.1: Secret soul bid for confrontation. */
export interface ConfrontationBidAction {
  readonly type: 'confrontation_bid';
  readonly bidAmount: number;
}

/** GDD §4.7: Discard a mission and redraw. Costs souls. */
export interface DiscardMissionAction {
  readonly type: 'discard_mission';
  readonly missionId: string;
}

/** GDD §4.1: Choose next destination. FREE — not an AP action. */
export interface SetDestinationAction {
  readonly type: 'set_destination';
  readonly targetRealmId: RealmId;
  readonly targetNodeId: NodeId;
}

/** Union of all possible turn actions. */
export type TurnAction =
  | EstablishDominionAction
  | SetDominionInstructionsAction
  | SetReligionInstructionsAction
  | FoundReligionAction
  | PerformPersonalRitualAction
  | PerformSiteRiteAction
  | UseRelicAction
  | ConfrontationChoiceAction
  | ConfrontationBidAction
  | DiscardMissionAction
  | SetDestinationAction;

/**
 * A player's complete turn submission for one round.
 * GDD §5: "Simultaneous rounds."
 */
export interface TurnSubmission {
  readonly playerId: PlayerId;
  /** All actions taken this turn. Max 2 AP-costing actions + free actions. */
  readonly actions: TurnAction[];
  /** Destination for next turn (free, always required). */
  readonly destination: SetDestinationAction | null;
  /** Timestamp of submission. */
  readonly submittedAt: number;
}
