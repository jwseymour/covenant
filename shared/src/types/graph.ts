/**
 * Graph types — board topology for each realm.
 *
 * Procedurally generated graph per realm. GDD §3.5.
 * Nodes = cities/landmarks/rite sites/relic locations.
 * Edges = weighted travel routes.
 */

import type { RealmId } from './realm.js';

// ─── Identifiers ────────────────────────────────────────────────

/** Unique identifier for a node within a realm graph. */
export type NodeId = string;

/** Unique identifier for an edge. */
export type EdgeId = string;

// ─── Node Types ─────────────────────────────────────────────────

/**
 * Types of nodes in the realm graph. GDD §3.5.
 * - city: standard settlement, can host dominions and religions
 * - landmark: notable location, may have special effects
 * - rite_site: offers realm-specific rites (GDD §4.5)
 * - relic_location: contains a discoverable relic (GDD §4.5)
 */
export type NodeType = 'city' | 'landmark' | 'rite_site' | 'relic_location';

/**
 * A node on the realm graph — a location that can be visited,
 * controlled, or interacted with. GDD §3.5.
 */
export interface GameNode {
  readonly id: NodeId;
  readonly realmId: RealmId;
  readonly type: NodeType;
  readonly name: string;
  /** Position for 2D rendering in the micro view. */
  position: { x: number; y: number };
  /**
   * Population at this node. Affects soul generation (GDD §2.5)
   * and religion spread (GDD §2.4).
   */
  population: number;
  /**
   * Whether this node has been depopulated by Rite of Harvest (GDD §4.6).
   * Depopulated nodes produce no souls and have reduced strategic value.
   */
  depopulated: boolean;
  /** Turns remaining until repopulation (0 if not depopulated). */
  depopulationTurnsRemaining: number;
  /**
   * For rite_site nodes: which rites are available here.
   * Rites are tied to the realm's energy (GDD §4.5).
   * Merge zones add additional rites from component realms.
   */
  availableRiteIds?: string[];
  /**
   * For relic_location nodes: which relic is here (if not yet claimed).
   */
  relicId?: string;
  /** Whether a relic at this location has already been claimed. */
  relicClaimed?: boolean;
}

/**
 * A weighted edge connecting two nodes — a travel route. GDD §3.5.
 */
export interface GameEdge {
  readonly id: EdgeId;
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
  /** Travel cost / weight along this edge (higher = slower). */
  weight: number;
  /**
   * Whether this edge is temporary (access point) or permanent.
   * Temporary edges appear/disappear as realms drift (GDD §3.3).
   * Permanent edges are within-realm or from realm collisions.
   */
  temporary: boolean;
  /**
   * If temporary, which realm pair created this access point.
   * Absent for permanent intra-realm edges.
   */
  accessPointRealms?: [RealmId, RealmId];
  /**
   * Whether this edge has been severed by Rite of Severance (GDD §4.6).
   * Severed edges are impassable until restored.
   */
  severed: boolean;
}

/**
 * The complete graph for a single realm. GDD §3.5.
 */
export interface RealmGraph {
  readonly realmId: RealmId;
  nodes: GameNode[];
  edges: GameEdge[];
}
