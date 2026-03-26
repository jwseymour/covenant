/**
 * Player (Ordained) types — the sacred entities freed by the Sundering.
 *
 * GDD §2.2: "Entities consecrated by the Covenant to maintain cosmic balance."
 * "Now they seek to accumulate enough power to define reality's new order
 * on their own terms."
 */

import type { NodeId } from './graph.js';
import type { RealmId } from './realm.js';
import type { DominionId } from './dominion.js';
import type { ReligionId } from './religion.js';
import type { RelicId } from './relic.js';
import type { Mission } from './mission.js';
import type { CombatCard } from './combat.js';
import type { SoulLedger } from './soul.js';

/** Unique identifier for a player. */
export type PlayerId = string;

/**
 * An Ordained — a player in the game.
 * GDD §2.2.
 */
export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  /** Colour for dominion/religion overlays. */
  readonly colour: string;
  /** Index (0–3) for turn order. */
  readonly playerIndex: number;

  // ─── Location ──────────────────────────────────────────────

  /**
   * Current realm. GDD §2.2: "Travel instantaneously —
   * cost is opportunity (one location per turn), not distance."
   */
  currentRealmId: RealmId;
  /** Current node within the current realm. */
  currentNodeId: NodeId;
  /** Destination realm for next turn. */
  destinationRealmId: RealmId | null;
  /** Destination node for next turn. */
  destinationNodeId: NodeId | null;

  // ─── Action Points ─────────────────────────────────────────

  /**
   * AP remaining this turn. Max 2. GDD §4.1.
   * Reduced to 0 if lost a confrontation or retreated (GDD §5.1).
   */
  actionPoints: number;
  /** Max AP per turn (2 per GDD §4.1). */
  readonly maxActionPoints: 2;
  /** Whether this player lost their turn to confrontation. GDD §5.1. */
  turnLostToConfrontation: boolean;

  // ─── Souls ─────────────────────────────────────────────────

  /**
   * Complete soul ledger — balance, income, expenditure.
   * GDD §2.5: "Win condition: Most souls at the Convergence wins."
   */
  soulLedger: SoulLedger;

  // ─── Holdings ──────────────────────────────────────────────

  /** IDs of all dominions this player controls. */
  dominionIds: DominionId[];
  /** IDs of all religions this player has founded. */
  religionIds: ReligionId[];

  // ─── Inventory ─────────────────────────────────────────────

  /**
   * Relics in possession. GDD §4.5: "Using a relic costs 1 AP."
   * GDD §6: "The Ordained grow through acquiring relics."
   */
  relicIds: RelicId[];
  /**
   * Combat cards in hand. GDD §5.2: [TOGGLEABLE]
   * "Earned from rites, relics, or missions."
   */
  combatCards: CombatCard[];

  // ─── Missions ──────────────────────────────────────────────

  /**
   * Hidden personal missions. GDD §4.7.
   * "3 missions drawn at game start."
   */
  missions: Mission[];

  // ─── Turn State ────────────────────────────────────────────

  /** Whether this player has submitted actions for the current turn. */
  hasSubmittedTurn: boolean;

  // ─── Intelligence ──────────────────────────────────────────

  /**
   * Private intelligence gathered through scouting or Rites of Sight.
   * GDD §4.8. Not public info.
   */
  intel: Array<{
    turn: number;
    nodeId: NodeId;
    type: 'dominion' | 'religion';
    targetId: string;
    revealedInstructions: unknown;
  }>;
}
