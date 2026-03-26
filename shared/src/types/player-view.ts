/**
 * Player view — filtered game state showing only what one player can see.
 *
 * GDD §4.8: "Visible: Dominion ownership, general religion spread.
 * Hidden: Instructions, missions, influence levels."
 *
 * The server sends this (not the full GameState) to each client.
 */

import type { RealmGraph } from './graph.js';
import type { Player, PlayerId } from './player.js';
import type { RealmId, RealmState, RealmInteraction } from './realm.js';
import type { DominionPublicView, Dominion } from './dominion.js';
import type { ReligionPublicView, Religion } from './religion.js';
import type { MergeZone, MergeZoneId } from './merge.js';
import type { Relic, RelicId } from './relic.js';
import type { SiteRite } from './rite.js';
import type { ConfrontationResult } from './confrontation.js';
import type { CombatResult } from './combat.js';
import type { GamePhase, GameConfig } from './game-state.js';

/**
 * A player's filtered view of the game state.
 * Only contains information this player is allowed to see.
 * GDD §4.8.
 */
export interface PlayerView {
  /** Unique game ID. */
  readonly gameId: string;
  /** Current turn number. */
  turnNumber: number;
  /** Game phase. */
  phase: GamePhase;
  /** Game config. */
  readonly config: GameConfig;

  // ─── This Player (full info) ───────────────────────────────

  /** This player's full state (they can see everything about themselves). */
  self: Player;

  // ─── Other Players (limited info) ──────────────────────────

  /**
   * Other players — visible: location, name, colour.
   * Hidden: souls, missions, exact AP state.
   */
  otherPlayers: OtherPlayerView[];

  // ─── Board (full — the board is visible to all) ────────────

  /** Realm graphs. */
  realmGraphs: Record<RealmId, RealmGraph>;
  /** Realm n-body states. */
  realmStates: Record<RealmId, RealmState>;
  /** Realm interactions. */
  realmInteractions: RealmInteraction[];

  // ─── Dominions (mixed visibility) ──────────────────────────

  /**
   * This player's own dominions — full detail including instructions.
   * GDD §4.8: you can see your own instructions.
   */
  ownDominions: Dominion[];
  /**
   * Other players' dominions — ownership visible, instructions hidden.
   * GDD §4.8: "Visible: Dominion ownership."
   */
  otherDominions: DominionPublicView[];

  // ─── Religions (mixed visibility) ──────────────────────────

  /** This player's own religions — full detail. */
  ownReligions: Religion[];
  /** Other players' religions — general spread visible. */
  otherReligions: ReligionPublicView[];

  // ─── Merge Zones (visible to all) ──────────────────────────

  mergeZones: Record<MergeZoneId, MergeZone>;

  // ─── Items ─────────────────────────────────────────────────

  /** Unclaimed relics visible on the board. */
  visibleRelics: Record<RelicId, Relic>;
  /** Available site rites at accessible nodes. */
  availableSiteRites: Record<string, SiteRite>;

  // ─── Turn Events ───────────────────────────────────────────

  /** Confrontation results from this turn (visible to participants). */
  confrontationResults: ConfrontationResult[];
  /** Combat results from this turn (visible to involved parties). */
  combatResults: CombatResult[];

  // ─── Scouted Information ───────────────────────────────────

  /**
   * Intel gathered through scouting. GDD §4.8.
   * Partial reveals based on scout quality.
   */
  scoutedInformation: ScoutedInfo[];

  // ─── Sundering ─────────────────────────────────────────────

  /**
   * Sundering state — only reveals what this player knows.
   * Hints and partial information in early phases;
   * full reveal in 'revealed' / 'corrupted' phases.
   */
  sunderingView: SunderingPlayerView | null;
}

/**
 * Limited view of another player. GDD §4.8.
 */
export interface OtherPlayerView {
  readonly id: PlayerId;
  readonly name: string;
  readonly colour: string;
  /** Their current realm (visible — "the shimmer"). */
  currentRealmId: RealmId;
  /** Their current node (visible). */
  currentNodeId: NodeId;
  /** Number of dominions (visible from map). */
  dominionCount: number;
  /** Number of religions (visible from map). */
  religionCount: number;
  /** Soul count is HIDDEN per GDD §4.8. Not included. */
}

// Need NodeId in scope
import type { NodeId } from './graph.js';

/** Intelligence gathered through scouting. */
export interface ScoutedInfo {
  /** What was scouted. */
  targetNodeId: NodeId;
  /** What was revealed. */
  revealedDirective?: string;
  revealedArmySize?: number;
  /** Full flowchart (only with special abilities). */
  revealedInstructions?: unknown;
  /** Turn the intel was gathered. */
  turn: number;
}

/** Player's view of the Sundering mechanic. */
export interface SunderingPlayerView {
  /** Current phase the player is aware of. */
  phase: 'hidden' | 'hints' | 'revealed' | 'corrupted';
  /** Hints received (partial info before full reveal). */
  hints: string[];
  /** The guilty realm (only populated in 'revealed' or 'corrupted' phase). */
  guiltyRealmId: RealmId | null;
}
