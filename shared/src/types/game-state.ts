/**
 * Complete game state — the authoritative state held by the server.
 *
 * GDD §5: Simultaneous rounds.
 * GDD §6: Turn count, convergence at ~round 35±5.
 * GDD §7: Digital-only — all state tracked computationally.
 */

import type { RealmGraph } from './graph.js';
import type { Player, PlayerId } from './player.js';
import type { RealmId, RealmState, RealmInteraction } from './realm.js';
import type { Dominion, DominionId } from './dominion.js';
import type { Religion, ReligionId } from './religion.js';
import type { MergeZone, MergeZoneId } from './merge.js';
import type { Confrontation } from './confrontation.js';
import type { Combat, CombatResult } from './combat.js';
import type { Relic, RelicId } from './relic.js';
import type { SiteRite } from './rite.js';
import type { TurnSubmission } from './turn-action.js';

// ─── Game Phase ─────────────────────────────────────────────────

/**
 * Current phase of the game. GDD §5.
 */
export type GamePhase =
  | 'lobby'       // Waiting for players to join (4 required)
  | 'setup'       // Game initialisation (graph generation, placement)
  | 'planning'    // Players reviewing state and submitting actions
  | 'resolving'   // Server resolving the turn (simultaneous)
  | 'animating'   // Clients animating turn results
  | 'finished';   // Game over — Convergence reached

// ─── Game Configuration ─────────────────────────────────────────

/**
 * Toggleable features. GDD §1 note:
 * "Some systems can be toggled on/off. They add complexity
 * when active but the game functions without them."
 */
export interface GameConfig {
  /** Whether belief tags (doctrines) are active. GDD §2.4 [TOGGLEABLE]. */
  beliefTagsEnabled: boolean;
  /** Whether combat cards are active. GDD §5.2 [TOGGLEABLE]. */
  combatCardsEnabled: boolean;
  /** Whether the Sundering mechanic is active. GDD §10.1 [TOGGLEABLE]. */
  sunderingEnabled: boolean;
  /** Max players (always 4 per GDD §8). */
  readonly maxPlayers: 4;
  /** Target convergence turn. GDD §6: ~35±5. */
  readonly targetConvergenceTurn: number;
  /** Max instruction flowchart nodes. GDD §4.2: "may be limited". */
  readonly maxInstructionNodes: number;
}

// ─── Sundering State ────────────────────────────────────────────

/**
 * State of the Sundering mechanic. GDD §10.1 [TOGGLEABLE].
 * lore_refinement.md §2.
 * "At game start, one realm is secretly the one that broke the Covenant."
 */
export interface SunderingState {
  /** The realm that broke the Covenant (hidden until late game). */
  readonly guiltyRealmId: RealmId;
  /** Current revelation phase. */
  revelationPhase: 'hidden' | 'hints' | 'revealed' | 'corrupted';
  /** Corruption effects active (empty until 'corrupted' phase). */
  activeCorruptionEffects: string[];
}

// ─── Complete Game State ────────────────────────────────────────

/**
 * The complete, authoritative game state.
 * Held on the server. Clients receive filtered views (PlayerView).
 */
export interface GameState {
  /** Unique game ID. */
  readonly gameId: string;
  /** Current turn number (1-indexed). GDD §6: ends at Convergence. */
  turnNumber: number;
  /** Game phase. */
  phase: GamePhase;
  /** Game configuration (toggleable features). */
  readonly config: GameConfig;

  // ─── Players ───────────────────────────────────────────────

  /** All players in the game (keyed by PlayerId). */
  players: Record<PlayerId, Player>;
  /** Turn order (player IDs in order). */
  turnOrder: PlayerId[];

  // ─── Board ─────────────────────────────────────────────────

  /** The graph for each realm (keyed by RealmId). GDD §3.5. */
  realmGraphs: Record<RealmId, RealmGraph>;
  /** N-body simulation state for each realm. GDD §3.2. */
  realmStates: Record<RealmId, RealmState>;
  /** Current realm interactions (access points, overlaps). GDD §3.3. */
  realmInteractions: RealmInteraction[];

  // ─── Influence Systems ─────────────────────────────────────

  /** All dominions in the game (keyed by DominionId). GDD §2.3. */
  dominions: Record<DominionId, Dominion>;
  /** All religions in the game (keyed by ReligionId). GDD §2.4. */
  religions: Record<ReligionId, Religion>;

  // ─── Merge Zones ───────────────────────────────────────────

  /** Active merge zones. GDD §3.4. */
  mergeZones: Record<MergeZoneId, MergeZone>;

  // ─── Items ─────────────────────────────────────────────────

  /** All relics in the game (both claimed and unclaimed). GDD §4.5. */
  relics: Record<RelicId, Relic>;
  /** All site-specific rites (static definitions). GDD §4.5. */
  siteRites: Record<string, SiteRite>;

  // ─── Turn Resolution ──────────────────────────────────────

  /** Submitted turns for the current round. */
  currentTurnSubmissions: Record<PlayerId, TurnSubmission>;
  /** Active confrontations this turn. GDD §5.1. */
  activeConfrontations: Confrontation[];
  /** Active combats this turn. GDD §5.2. */
  activeCombats: Combat[];
  /** Combat results from this turn (for animation). */
  combatResults: CombatResult[];

  // ─── History ───────────────────────────────────────────────

  /** Turn-by-turn history for replay and debugging. */
  turnHistory: TurnHistoryEntry[];

  // ─── Sundering ─────────────────────────────────────────────

  /** Sundering mechanic state (if enabled). */
  sundering: SunderingState | null;
}

/** A single entry in the turn history log. */
export interface TurnHistoryEntry {
  readonly turnNumber: number;
  /** Realm positions at this turn. */
  readonly realmPositions: Record<RealmId, { x: number; y: number; z: number }>;
  /** Summary of what happened this turn. */
  readonly events: string[];
}
