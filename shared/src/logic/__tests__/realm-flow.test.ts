/**
 * Unit tests for N-Body physics engine.
 *
 * Simulates realm flow, gravity, prediction cones, and interactions.
 */

import { describe, test, expect } from 'vitest';
import {
  tickRealmStates,
  detectInteractions,
  generatePredictions,
  ACCESS_POINT_DIST,
  OVERLAP_DIST,
} from '../realm-flow.js';
import type { RealmState, RealmId, Vec3 } from '../../types/realm.js';

// ─── Test Helpers ───────────────────────────────────────────────

function makeState(id: RealmId, pos: Vec3, vel: Vec3 = {x: 0, y:0, z:0}, mass: number = 1.0): RealmState {
  return {
    realmId: id,
    position: pos,
    velocity: vel,
    mass,
    trajectoryPrediction: [],
  };
}

function dist(a: Vec3, b: Vec3): number {
  return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2 + (a.z - b.z)**2);
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Realm Flow — N-Body Simulation', () => {

  test('Complementary realms attract', () => {
    // Dominion vs Memory mapping check matrix: it is 0.8 attraction.
    const states = {
      dominion: makeState('dominion', {x: -10, y: 0, z: 0}),
      memory: makeState('memory', {x: 10, y: 0, z: 0}),
      entropy: makeState('entropy', {x: 0, y: 100, z: 0}), // far away
      communion: makeState('communion', {x: 0, y: -100, z: 0}),
      wrath: makeState('wrath', {x: 0, y: 0, z: 100}),
    };

    const initialDist = dist(states.dominion.position, states.memory.position);
    const nextStates = tickRealmStates(states, 1, 35);
    const newDist = dist(nextStates.dominion.position, nextStates.memory.position);

    expect(newDist).toBeLessThan(initialDist); // they moved closer
  });

  test('Opposing realms repel but are drawn inwards by convergence', () => {
    // Dominion vs Entropy -> strong repulsion
    const states = {
      dominion: makeState('dominion', {x: -2, y: 0, z: 0}),
      entropy: makeState('entropy', {x: 2, y: 0, z: 0}),
      memory: makeState('memory', {x: 0, y: 100, z: 0}), 
      communion: makeState('communion', {x: 0, y: -100, z: 0}),
      wrath: makeState('wrath', {x: 0, y: 0, z: 100}),
    };

    const initialDist = dist(states.dominion.position, states.entropy.position);
    // simulate at early turn = no strong convergence
    const nextStatesEarly = tickRealmStates(states, 1, 35);
    const newDistEarly = dist(nextStatesEarly.dominion.position, nextStatesEarly.entropy.position);

    // they should push each other apart since they are very close and convergence is weak
    expect(newDistEarly).toBeGreaterThan(initialDist);

    // simulate at turn 35 (convergence point)
    const nextStatesLate = tickRealmStates(states, 35, 35);
    
    // We expect the inward pull to be so massive that they are slammed toward the origin (0,0) resulting in closure.
    const newDistLate = dist(nextStatesLate.dominion.position, nextStatesLate.entropy.position);
    expect(newDistLate).toBeLessThan(newDistEarly);
  });

  test('Interaction states are mapped correctly', () => {
    const states = {
      dominion: makeState('dominion', {x: 0, y: 0, z: 0}),
      entropy: makeState('entropy', {x: OVERLAP_DIST - 0.1, y: 0, z: 0}),
      memory: makeState('memory', {x: ACCESS_POINT_DIST - 0.1, y: 0, z: 0}), 
      communion: makeState('communion', {x: ACCESS_POINT_DIST + 1.0, y: 0, z: 0}),
      wrath: makeState('wrath', {x: 100, y: 0, z: 0}),
    };

    const ints = detectInteractions(states);
    
    // Dominion vs Entropy = Overlap
    const overlapMatch = ints.find(i => 
      (i.realmA === 'dominion' && i.realmB === 'entropy') || 
      (i.realmB === 'dominion' && i.realmA === 'entropy')
    );
    expect(overlapMatch).toBeDefined();
    expect(overlapMatch!.level).toBe('overlap');

    // Dominion vs Memory = Access Point
    const apMatch = ints.find(i => 
      (i.realmA === 'dominion' && i.realmB === 'memory') || 
      (i.realmB === 'dominion' && i.realmA === 'memory')
    );
    expect(apMatch).toBeDefined();
    expect(apMatch!.level).toBe('access_point');

    // Communion vs Dominion = None
    const noneMatch = ints.find(i => 
      (i.realmA === 'dominion' && i.realmB === 'communion') || 
      (i.realmB === 'dominion' && i.realmA === 'communion')
    );
    expect(noneMatch).toBeUndefined();
  });

  test('trajectoryPrediction generates 10 forward points with diminishing confidence', () => {
    const states = {
      dominion: makeState('dominion', {x: 10, y: 0, z: 0}, {x: -1, y: 0, z: 0}),
      entropy: makeState('entropy', {x: -10, y: 0, z: 0}),
      memory: makeState('memory', {x: 0, y: 10, z: 0}), 
      communion: makeState('communion', {x: 0, y: -10, z: 0}),
      wrath: makeState('wrath', {x: 0, y: 0, z: 10}),
    };

    const preds = generatePredictions(states, 5, 35);
    const domTrj = preds['dominion'].trajectoryPrediction;

    expect(domTrj).toHaveLength(10);
    expect(domTrj[0].turnsAhead).toBe(1);
    expect(domTrj[9].turnsAhead).toBe(10);
    
    // Confidence drops over time
    expect(domTrj[0].confidence).toBeGreaterThan(domTrj[9].confidence);
  });
});
