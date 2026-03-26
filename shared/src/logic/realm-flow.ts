/**
 * N-Body Realm Simulation Logic
 *
 * GDD §3.2 "Realm Flow — N-Body Gravity"
 * - Realms drift like bodies in a gravitational simulation
 * - Short-term predictable, long-term chaotic
 * - Some attract (complementary), some repel (opposing)
 * - Purely environmental
 *
 * GDD §3.3 "Two Levels of Interaction"
 * - Access points (close)
 * - Overlap/Collision (touching)
 *
 * Convergence happens ~round 35 (GDD §6).
 */

import type { RealmId, RealmState, Vec3, TrajectoryPoint, RealmInteraction } from '../types/realm.js';
import { ALL_REALM_IDS } from '../types/realm.js';

// ─── Simulation Tuning Parameters ──────────────────────────────

/** Global gravity constant for the simulation. */
export const GRAVITY_G = 0.05;

/**
 * Dampening applied to velocity each turn to gradually reduce kinetic energy,
 * ensuring the realms eventually settle into a converged state rather than slingshotting forever.
 */
export const DAMPING_FACTOR = 0.96;

/**
 * The radius of a realm for interaction logic.
 * The distances are abstract, but this gives a scale.
 */
export const REALM_RADIUS = 2.0;

/** Distance threshold for an access point to form (edges bridge). */
export const ACCESS_POINT_DIST = REALM_RADIUS * 2.5;

/** Distance threshold for a full overlap/collision. */
export const OVERLAP_DIST = REALM_RADIUS * 1.5;

/** Number of turns to predict. */
export const PREDICTION_TURNS = 10;

/**
 * Pairwise relationship matrix.
 * +1 = Strong attraction (complementary)
 * -1 = Strong repulsion (opposing)
 * 0 = Neutral (only base gravity applies)
 */
export const ATTRACTION_MATRIX: Record<RealmId, Record<RealmId, number>> = {
  dominion: { dominion: 0, entropy: -1.2, communion: 0.5, wrath: 0.8, memory: 0.8 },
  entropy: { dominion: -1.2, entropy: 0, communion: 0.8, wrath: 0.5, memory: -0.8 },
  communion: { dominion: 0.5, entropy: 0.8, communion: 0, wrath: -0.5, memory: 0.5 },
  wrath: { dominion: 0.8, entropy: 0.5, communion: -0.5, wrath: 0, memory: -0.5 },
  memory: { dominion: 0.8, entropy: -0.8, communion: 0.5, wrath: -0.5, memory: 0 },
};

// ─── Vector Utilities ──────────────────────────────────────────

export function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vecSub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vecMult(v: Vec3, scalar: number): Vec3 {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
}

export function vecLength(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vecNormalize(v: Vec3): Vec3 {
  const len = vecLength(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function vecDist(a: Vec3, b: Vec3): number {
  return vecLength(vecSub(a, b));
}

// ─── Simulation Logic ──────────────────────────────────────────

/**
 * Calculate the acceleration on realm A caused by all other realms,
 * plus a convergence pull that slowly ramps up over time.
 */
export function calculateAcceleration(
  targetId: RealmId,
  states: Record<RealmId, RealmState>,
  currentTurn: number,
  targetConvergenceTurn = 35
): Vec3 {
  let totalForce: Vec3 = { x: 0, y: 0, z: 0 };
  const targetState = states[targetId];

  // Pairwise forces
  for (const otherId of ALL_REALM_IDS) {
    if (otherId === targetId) continue;
    const otherState = states[otherId];

    const relPos = vecSub(otherState.position, targetState.position);
    const dist = vecLength(relPos);
    if (dist < 0.1) continue; // Prevent singularity

    // Base gravity is attractive, modified by the specific relationship
    const relationshipMod = ATTRACTION_MATRIX[targetId][otherId] ?? 0;
    
    // G * m1 * m2 / r^2
    let forceMagnitude = (GRAVITY_G * targetState.mass * otherState.mass) / (dist * dist);
    
    // Apply relationship modifier (positive = extra attraction, negative = repulsion)
    // Even if it's -1, we want them to eventually converge, so base gravity is +1.
    const effectiveGravity = 1.0 + relationshipMod;
    forceMagnitude *= effectiveGravity;

    // F = G * m1 * m2 / r^2 * normalized_direction
    const forceVec = vecMult(vecNormalize(relPos), forceMagnitude);
    totalForce = vecAdd(totalForce, forceVec);
  }

  // Global convergence pull toward origin (0,0,0)
  // Starts weak, becomes very strong around the target convergence turn.
  // GDD §6: "Convergence at ~round 35±5"
  const turnProgress = Math.max(0, currentTurn / targetConvergenceTurn);
  // Exponential growth near convergence
  const convergencePullStrength = Math.pow(turnProgress, 3) * 0.05;
  
  const toOrigin = vecSub({ x: 0, y: 0, z: 0 }, targetState.position);
  const distToOrigin = vecLength(toOrigin);
  
  if (distToOrigin > 0.1) {
    const pullForce = vecMult(vecNormalize(toOrigin), convergencePullStrength * targetState.mass * distToOrigin);
    totalForce = vecAdd(totalForce, pullForce);
  }

  // Acceleration = Force / Mass
  return vecMult(totalForce, 1 / targetState.mass);
}

/**
 * Tick the physics simulation forward by one turn.
 */
export function tickRealmStates(
  states: Record<RealmId, RealmState>,
  currentTurn: number,
  targetConvergenceTurn = 35
): Record<RealmId, RealmState> {
  const nextStates: Record<RealmId, RealmState> = {} as Record<RealmId, RealmState>;
  const accelerations: Record<RealmId, Vec3> = {} as Record<RealmId, Vec3>;

  // 1. Calculate all forces forces from CURRENT positions (RK1 / Euler forward)
  for (const rid of ALL_REALM_IDS) {
    accelerations[rid] = calculateAcceleration(rid, states, currentTurn, targetConvergenceTurn);
  }

  // 2. Apply accelerations to update velocities and positions
  for (const rid of ALL_REALM_IDS) {
    const currentState = states[rid];
    
    // v = (v + a) * damping
    const newVel = vecMult(vecAdd(currentState.velocity, accelerations[rid]), DAMPING_FACTOR);
    
    // p = p + v
    const newPos = vecAdd(currentState.position, newVel);

    nextStates[rid] = {
      ...currentState,
      position: newPos,
      velocity: newVel,
    };
  }

  // 3. Re-calculate trajectory predictions from the new state
  return generatePredictions(nextStates, currentTurn, targetConvergenceTurn);
}

/**
 * Generate trajectory predictions by simulating physics forward without saving state.
 * Adds artificial noise/"uncertainty" to further futures.
 */
export function generatePredictions(
  states: Record<RealmId, RealmState>,
  currentTurn: number,
  targetConvergenceTurn = 35
): Record<RealmId, RealmState> {
  // Deep clone states for simulation
  let simStates = JSON.parse(JSON.stringify(states)) as Record<RealmId, RealmState>;
  
  const trajectories: Record<RealmId, TrajectoryPoint[]> = {
    dominion: [], entropy: [], communion: [], wrath: [], memory: [],
  };

  for (let step = 1; step <= PREDICTION_TURNS; step++) {
    // Tick forward
    simStates = tickRealmStatesBase(simStates, currentTurn + step, targetConvergenceTurn);

    // Save point
    for (const rid of ALL_REALM_IDS) {
      // Confidence decreases linearly
      const confidence = Math.max(0, 1.0 - (step / (PREDICTION_TURNS + 2)));
      
      // We don't actually add the "cone of uncertainty" positions here, 
      // the client will render a wider or fading line based on `confidence`.
      trajectories[rid].push({
        position: simStates[rid].position,
        turnsAhead: step,
        confidence,
      });
    }
  }

  // Return new states with trajectories attached
  const newStates: Record<RealmId, RealmState> = {} as Record<RealmId, RealmState>;
  for (const rid of ALL_REALM_IDS) {
    newStates[rid] = {
      ...states[rid],
      trajectoryPrediction: trajectories[rid],
    };
  }
  return newStates;
}

/** 
 * Base tick function without the prediction recursion.
 */
function tickRealmStatesBase(
  states: Record<RealmId, RealmState>,
  currentTurn: number,
  targetConvergenceTurn: number
): Record<RealmId, RealmState> {
  const nextStates: Record<RealmId, RealmState> = {} as Record<RealmId, RealmState>;
  const accelerations: Record<RealmId, Vec3> = {} as Record<RealmId, Vec3>;

  for (const rid of ALL_REALM_IDS) {
    accelerations[rid] = calculateAcceleration(rid, states, currentTurn, targetConvergenceTurn);
  }

  for (const rid of ALL_REALM_IDS) {
    const currentState = states[rid];
    const newVel = vecMult(vecAdd(currentState.velocity, accelerations[rid]), DAMPING_FACTOR);
    const newPos = vecAdd(currentState.position, newVel);
    nextStates[rid] = {
      ...currentState,
      position: newPos,
      velocity: newVel,
    };
  }
  return nextStates;
}

// ─── Interaction Detection ──────────────────────────────────────

/**
 * Detect Access Points and Overlaps based on realm distances.
 */
export function detectInteractions(states: Record<RealmId, RealmState>): RealmInteraction[] {
  const interactions: RealmInteraction[] = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < ALL_REALM_IDS.length; i++) {
    for (let j = i + 1; j < ALL_REALM_IDS.length; j++) {
      const realmA = ALL_REALM_IDS[i];
      const realmB = ALL_REALM_IDS[j];
      const pairId = `${realmA}-${realmB}`;

      if (processedPairs.has(pairId)) continue;
      processedPairs.add(pairId);

      const dist = vecDist(states[realmA].position, states[realmB].position);

      if (dist <= OVERLAP_DIST) {
        interactions.push({
          realmA,
             realmB,
          level: 'overlap',
          distance: dist,
        });
      } else if (dist <= ACCESS_POINT_DIST) {
        interactions.push({
          realmA,
             realmB,
          level: 'access_point',
          distance: dist,
        });
      }
    }
  }

  return interactions;
}
