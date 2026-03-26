/**
 * AccessPointIndicator — visual indicator for realm interactions.
 *
 * GDD §3.3: Two levels of interaction:
 * - Access points: temporary cross-realm edges (pulsing dashed line)
 * - Overlap/collision: permanent merge (glowing zone)
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { RealmInteraction, RealmState, RealmId } from '@shattered-covenant/shared';

interface AccessPointIndicatorProps {
  interaction: RealmInteraction;
  states: Record<RealmId, RealmState>;
}

export function AccessPointIndicator({ interaction, states }: AccessPointIndicatorProps) {
  const stateA = states[interaction.realmA];
  const stateB = states[interaction.realmB];

  const positions = useMemo(() => {
    return new Float32Array([
      stateA.position.x, stateA.position.y, stateA.position.z,
      stateB.position.x, stateB.position.y, stateB.position.z,
    ]);
  }, [stateA, stateB]);

  const isOverlap = interaction.level === 'overlap';

  // Midpoint for the merge zone indicator
  const midpoint: [number, number, number] = [
    (stateA.position.x + stateB.position.x) / 2,
    (stateA.position.y + stateB.position.y) / 2,
    (stateA.position.z + stateB.position.z) / 2,
  ];

  return (
    <group>
      {/* Connection line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={2}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={isOverlap ? '#ffaa44' : '#66aaff'}
          transparent
          opacity={isOverlap ? 0.5 : 0.25}
          depthWrite={false}
        />
      </line>

      {/* Merge zone glow for overlaps */}
      {isOverlap && (
        <mesh position={midpoint}>
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshBasicMaterial
            color="#ffaa44"
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}
