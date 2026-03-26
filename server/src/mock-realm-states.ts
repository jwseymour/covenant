/**
 * Mock realm states for the server — same pentagonal layout
 * as the client mock data but using proper types.
 */

import { generatePredictions } from '@shattered-covenant/shared';
import type { RealmId, RealmState, Vec3 } from '@shattered-covenant/shared';

export function createMockRealmStatesServer(): Record<RealmId, RealmState> {
  const radius = 12;
  const realmData: { id: RealmId; angleOffset: number; zOffset: number; vel: Vec3 }[] = [
    { id: 'dominion', angleOffset: 0, zOffset: 2, vel: { x: -0.05, y: -0.02, z: -0.03 } },
    { id: 'entropy', angleOffset: (2 * Math.PI) / 5, zOffset: -1.5, vel: { x: 0.04, y: -0.06, z: 0.02 } },
    { id: 'communion', angleOffset: (4 * Math.PI) / 5, zOffset: 0.5, vel: { x: -0.02, y: 0.05, z: -0.01 } },
    { id: 'wrath', angleOffset: (6 * Math.PI) / 5, zOffset: -2, vel: { x: 0.06, y: 0.01, z: 0.04 } },
    { id: 'memory', angleOffset: (8 * Math.PI) / 5, zOffset: 1.0, vel: { x: -0.03, y: 0.03, z: -0.02 } },
  ];

  const states: Partial<Record<RealmId, RealmState>> = {};

  for (const { id, angleOffset, zOffset } of realmData) {
    const pos: Vec3 = {
      x: radius * Math.cos(angleOffset),
      y: radius * Math.sin(angleOffset),
      z: zOffset,
    };
    
    // Quasi-random chaotic initial velocity
    const randomVel: Vec3 = {
      x: (Math.random() - 0.5) * 1.2, 
      y: (Math.random() - 0.5) * 1.2,
      z: (Math.random() - 0.5) * 0.6,
    };

    states[id] = {
      realmId: id,
      position: pos,
      velocity: randomVel,
      mass: 1.0,
      trajectoryPrediction: [],
    };
  }

  // Generate physics-accurate trajectories starting from turn 0
  return generatePredictions(states as Record<RealmId, RealmState>, 0, 35);
}
