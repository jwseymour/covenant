/**
 * Dominion logic — pure functions for dominion mechanics.
 *
 * GDD §2.3: "Influence decays ~3-4% per turn — firmly held for ~7 turns,
 * vulnerable after ~15, autonomous after ~25"
 * GDD §4.3: Dominion control & contestation table.
 */

import type { Dominion, DominionId, DominionPublicView } from '../types/dominion.js';
import type { PlayerId } from '../types/player.js';
import type { NodeId } from '../types/graph.js';
import type { RealmId } from '../types/realm.js';

// ─── Constants ──────────────────────────────────────────────────

/** Influence decay rate per turn (3.5% — midpoint of GDD's ~3-4%). */
export const DOMINION_DECAY_RATE = 0.035;

/** Initial influence when establishing a dominion. */
export const INITIAL_INFLUENCE = 100;

/** Influence threshold below which a dominion becomes vulnerable to subversion. */
export const VULNERABLE_THRESHOLD = 60; // ~15 turns of decay

/** Influence threshold below which a dominion acts autonomously. */
export const AUTONOMOUS_THRESHOLD = 30; // ~25 turns of decay

/** AP cost to establish a dominion. GDD §2.3: "1 AP". */
export const ESTABLISH_AP_COST = 1;

/** Minimum influence gap required for subversion success. */
export const SUBVERSION_MIN_INFLUENCE_GAP = 15;

// ─── Dominion Creation ──────────────────────────────────────────

let _dominionCounter = 0;

/** Generate a unique dominion ID. */
export function generateDominionId(): DominionId {
  return `dom-${Date.now()}-${_dominionCounter++}`;
}

/**
 * Create a new dominion at a node.
 * GDD §2.3: "Established by visiting an uncontrolled settlement and spending 1 AP."
 */
export function createDominion(
  ownerId: PlayerId,
  nodeId: NodeId,
  realmId: RealmId,
  currentTurn: number,
): Dominion {
  return {
    id: generateDominionId(),
    ownerId,
    realmId,
    primaryNodeId: nodeId,
    controlledNodeIds: [nodeId],
    influence: INITIAL_INFLUENCE,
    decayRate: DOMINION_DECAY_RATE * 100, // Store as percentage for readability
    lastVisitedTurn: currentTurn,
    establishedTurn: currentTurn,
    armyStrength: 100,
    armyBaseSize: 80,
    troopQualityModifier: 1.0,
    instructions: null,
    scoutReports: [],
  };
}

// ─── Influence Decay ────────────────────────────────────────────

/**
 * Get realm-specific decay multiplier.
 * - Dominion realm: slower decay (rigidity preserves control)
 * - Entropy realm: faster decay (nothing persists)
 * - Memory realm: slowest decay (everything endures)
 */
function getRealmDecayMultiplier(realmId: RealmId): number {
  switch (realmId) {
    case 'dominion': return 0.7;
    case 'entropy':  return 1.5;
    case 'memory':   return 0.5;
    case 'communion': return 1.1;
    case 'wrath':    return 1.0;
    default: return 1.0;
  }
}

/**
 * Apply influence decay to a dominion for one turn.
 * GDD §2.3: "Influence decays slowly (~3-4% per turn)"
 */
export function applyInfluenceDecay(dominion: Dominion): Dominion {
  const realmMultiplier = getRealmDecayMultiplier(dominion.realmId);
  const effectiveDecay = DOMINION_DECAY_RATE * realmMultiplier;
  const newInfluence = Math.max(0, dominion.influence * (1 - effectiveDecay));

  return {
    ...dominion,
    influence: Math.round(newInfluence * 100) / 100,
  };
}

/**
 * Reset dominion decay — called when the player visits.
 * GDD §4.6: Rite of Binding also does this.
 */
export function refreshDominion(dominion: Dominion, currentTurn: number): Dominion {
  return {
    ...dominion,
    influence: Math.min(INITIAL_INFLUENCE, dominion.influence + 20),
    lastVisitedTurn: currentTurn,
  };
}

// ─── Subversion ─────────────────────────────────────────────────

/** Check if a dominion is vulnerable to subversion. */
export function isVulnerableToSubversion(dominion: Dominion): boolean {
  return dominion.influence < VULNERABLE_THRESHOLD;
}

/** Check if a dominion is acting autonomously (ignoring instructions). */
export function isAutonomous(dominion: Dominion): boolean {
  return dominion.influence < AUTONOMOUS_THRESHOLD;
}

/**
 * Attempt to subvert a rival's dominion.
 * GDD §4.3: "Following a player to immediately flip dominions is not viable."
 */
export function attemptSubversion(
  dominion: Dominion,
  subverterId: PlayerId,
  subverterInfluence: number,
): { success: boolean; dominion: Dominion; reason: string } {
  if (dominion.ownerId === subverterId) {
    return { success: false, dominion, reason: 'Cannot subvert own dominion' };
  }

  if (!isVulnerableToSubversion(dominion)) {
    return {
      success: false, dominion,
      reason: `Influence (${dominion.influence.toFixed(0)}) too high (need below ${VULNERABLE_THRESHOLD})`,
    };
  }

  const influenceGap = subverterInfluence - dominion.influence;
  if (influenceGap < SUBVERSION_MIN_INFLUENCE_GAP) {
    return {
      success: false, dominion,
      reason: `Influence gap (${influenceGap.toFixed(0)}) too small (need ${SUBVERSION_MIN_INFLUENCE_GAP})`,
    };
  }

  return {
    success: true,
    dominion: {
      ...dominion,
      ownerId: subverterId,
      influence: subverterInfluence * 0.7,
      lastVisitedTurn: dominion.lastVisitedTurn,
    },
    reason: 'Subversion successful',
  };
}

// ─── Dominion State ─────────────────────────────────────────────

export type InfluenceCategory = 'firm' | 'holding' | 'vulnerable' | 'fading';

/** Get display influence category for a dominion. */
export function getInfluenceCategory(dominion: Dominion): InfluenceCategory {
  if (dominion.influence >= 80) return 'firm';
  if (dominion.influence >= VULNERABLE_THRESHOLD) return 'holding';
  if (dominion.influence >= AUTONOMOUS_THRESHOLD) return 'vulnerable';
  return 'fading';
}

/** Get army size category for public view. */
function getArmyCategory(army: number): 'small' | 'moderate' | 'large' | 'massive' {
  if (army >= 200) return 'massive';
  if (army >= 120) return 'large';
  if (army >= 60) return 'moderate';
  return 'small';
}

/** Create a public (filtered) view of a dominion. GDD §4.8. */
export function createPublicView(dominion: Dominion): DominionPublicView {
  return {
    id: dominion.id,
    ownerId: dominion.ownerId,
    realmId: dominion.realmId,
    primaryNodeId: dominion.primaryNodeId,
    controlledNodeIds: dominion.controlledNodeIds,
    influenceCategory: getInfluenceCategory(dominion),
    armyCategory: getArmyCategory(dominion.armyStrength),
  };
}

/** Apply all per-turn effects to all dominions. */
export function tickAllDominions(
  dominions: Record<DominionId, Dominion>,
): Record<DominionId, Dominion> {
  const updated: Record<DominionId, Dominion> = {};
  for (const [id, dominion] of Object.entries(dominions)) {
    updated[id as DominionId] = applyInfluenceDecay(dominion);
  }
  return updated;
}
