/**
 * Realm types — the five shattered realms of the Covenant.
 *
 * Each realm crystallised around one of five fundamental forces freed
 * by the Sundering. GDD §3.1, lore_complete.md §4.
 */

// ─── Identifiers ────────────────────────────────────────────────

/** The five realms, matching GDD §3.1 and §8 resolved decisions. */
export type RealmId = 'dominion' | 'entropy' | 'communion' | 'wrath' | 'memory';

/** The energy type defining each realm's rules. GDD §3.1 table. */
export type RealmEnergy = 'authority' | 'transformation' | 'connection' | 'force' | 'preservation';

/** Enum for the five realms. */
export const Realm = {
  DOMINION: 'dominion' as const,
  ENTROPY: 'entropy' as const,
  COMMUNION: 'communion' as const,
  WRATH: 'wrath' as const,
  MEMORY: 'memory' as const,
};

/** Enum for energy types. */
export const Energy = {
  AUTHORITY: 'authority' as const,
  TRANSFORMATION: 'transformation' as const,
  CONNECTION: 'connection' as const,
  FORCE: 'force' as const,
  PRESERVATION: 'preservation' as const,
};

/** All realm IDs as a constant array for iteration. */
export const ALL_REALM_IDS: readonly RealmId[] = [
  'dominion', 'entropy', 'communion', 'wrath', 'memory',
] as const;

/** Mapping from realm to its energy. GDD §3.1. */
export const REALM_ENERGY_MAP: Record<RealmId, RealmEnergy> = {
  dominion: 'authority',
  entropy: 'transformation',
  communion: 'connection',
  wrath: 'force',
  memory: 'preservation',
};

// ─── Static Definition ──────────────────────────────────────────

/**
 * Immutable definition of a realm — lore identity and strategic profile.
 * See GDD §3.1 table, lore_complete.md §4.1–§4.5.
 */
export interface RealmDefinition {
  readonly id: RealmId;
  /** Display name (e.g. "The Eternal Hierarchy"). GDD §3.1. */
  readonly name: string;
  /** The fundamental force this realm embodies. */
  readonly force: string;
  /** The energy governing this realm's rules. */
  readonly energy: RealmEnergy;
  /** Lore description of landscape and character. lore_complete.md §4. */
  readonly description: string;
  /** Strategic gameplay profile. GDD §3.1 table. */
  readonly strategicProfile: string;
}

// ─── Runtime State ──────────────────────────────────────────────

/** 3D vector used for positions and velocities. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Mutable runtime state of a realm in the n-body simulation.
 * GDD §3.2 — realms drift like bodies under gravity.
 * Short-term predictable, long-term chaotic.
 */
export interface RealmState {
  readonly realmId: RealmId;
  /** Current 3D position in the void. */
  position: Vec3;
  /** Current 3D velocity vector. */
  velocity: Vec3;
  /** Gravitational mass. */
  mass: number;
  /**
   * Predicted trajectory points for visualisation.
   * Confidence decreases for later points.
   * GDD §3.2 — "trajectory lines widen and fade into the future".
   */
  trajectoryPrediction: TrajectoryPoint[];
}

/** A single point on a predicted trajectory. */
export interface TrajectoryPoint {
  /** Predicted position at this future turn. */
  position: Vec3;
  /** Turn number this prediction is for (relative to current). */
  turnsAhead: number;
  /** Confidence 0–1 (decreases for later predictions). */
  confidence: number;
}

// ─── Realm Interactions ─────────────────────────────────────────

/**
 * Interaction level between two realms. GDD §3.3.
 * - access_point: temporary cross-realm edges, energies separate
 * - overlap: permanent merge, energies blend, new rites unlock
 */
export type RealmInteractionLevel = 'none' | 'access_point' | 'overlap';

/** A pair of realms currently interacting. */
export interface RealmInteraction {
  readonly realmA: RealmId;
  readonly realmB: RealmId;
  readonly level: RealmInteractionLevel;
  /** Distance between realm centres (for determining interaction level). */
  distance: number;
}
