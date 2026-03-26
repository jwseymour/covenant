/**
 * TrajectoryLine — predicted future path for a realm.
 *
 * GDD §3.2: "trajectory lines widen and fade into the future"
 * Rendered as a line that fades from bright to transparent,
 * showing decreasing prediction confidence.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { RealmId, RealmState } from '@shattered-covenant/shared';
import { REALM_VISUALS } from './realm-visuals';

interface TrajectoryLineProps {
  realmId: RealmId;
  state: RealmState;
  visible: boolean;
}

export function TrajectoryLine({ realmId, state, visible }: TrajectoryLineProps) {
  const config = REALM_VISUALS[realmId];

  const { positions, colors } = useMemo(() => {
    const pts: number[] = [];
    const cols: number[] = [];
    const color = new THREE.Color(config.accent);

    // Start from current position
    pts.push(state.position.x, state.position.y, state.position.z);
    cols.push(color.r, color.g, color.b, 0.8);

    // Add trajectory prediction points
    for (const point of state.trajectoryPrediction) {
      pts.push(point.position.x, point.position.y, point.position.z);
      cols.push(color.r, color.g, color.b, point.confidence * 0.6);
    }

    return {
      positions: new Float32Array(pts),
      colors: new Float32Array(cols),
    };
  }, [state, config]);

  if (!visible || state.trajectoryPrediction.length === 0) return null;

  const pointCount = 1 + state.trajectoryPrediction.length;

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={pointCount}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 4]}
          count={pointCount}
        />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.7}
        linewidth={1}
        depthWrite={false}
      />
    </line>
  );
}

/**
 * TrajectoryDots — uncertainty dots along the trajectory
 * that get larger and more transparent further out.
 */
export function TrajectoryDots({ realmId, state, visible }: TrajectoryLineProps) {
  const config = REALM_VISUALS[realmId];

  if (!visible || state.trajectoryPrediction.length === 0) return null;

  // Show dots at intervals along the trajectory
  const dots = state.trajectoryPrediction.filter((_, i) => i % 3 === 2);

  return (
    <group>
      {dots.map((point, i) => (
        <mesh
          key={i}
          position={[point.position.x, point.position.y, point.position.z]}
        >
          <sphereGeometry args={[0.06 + (1 - point.confidence) * 0.15, 8, 8]} />
          <meshBasicMaterial
            color={config.accent}
            transparent
            opacity={point.confidence * 0.4}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
