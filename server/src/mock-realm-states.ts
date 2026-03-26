/**
 * Mock realm states for the server — same pentagonal layout
 * as the client mock data but using proper types.
 */

import type { RealmId, RealmState, Vec3 } from '@shattered-covenant/shared';

function generateTrajectory(
  pos: Vec3,
  vel: Vec3,
  steps: number = 20,
): { position: Vec3; turnsAhead: number; confidence: number }[] {
  const points: { position: Vec3; turnsAhead: number; confidence: number }[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i * 0.5;
    const gravityPull = 0.002 * i;
    points.push({
      position: {
        x: pos.x + vel.x * t - pos.x * gravityPull,
        y: pos.y + vel.y * t - pos.y * gravityPull,
        z: pos.z + vel.z * t - pos.z * gravityPull,
      },
      turnsAhead: i,
      confidence: Math.max(0.05, 1.0 - i * 0.045),
    });
  }
  return points;
}

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

  for (const { id, angleOffset, zOffset, vel } of realmData) {
    const pos: Vec3 = {
      x: radius * Math.cos(angleOffset),
      y: radius * Math.sin(angleOffset),
      z: zOffset,
    };
    states[id] = {
      realmId: id,
      position: pos,
      velocity: vel,
      mass: 1.0,
      trajectoryPrediction: generateTrajectory(pos, vel),
    };
  }

  return states as Record<RealmId, RealmState>;
}
