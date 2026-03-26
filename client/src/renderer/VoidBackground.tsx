/**
 * VoidBackground — particle starfield representing the void
 * between shattered realms.
 *
 * "Five shattered realms drifting through the void" — GDD §1
 * Dark, vast, with faint distant stars and motes of light.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface VoidBackgroundProps {
  particleCount?: number;
}

export function VoidBackground({ particleCount = 2000 }: VoidBackgroundProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const sz = new Float32Array(particleCount);
    const col = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Scatter in a large sphere
      const radius = 40 + Math.random() * 160;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      sz[i] = 0.3 + Math.random() * 1.2;

      // Muted colours — faint whites, blues, ambers
      const colorChoice = Math.random();
      if (colorChoice < 0.6) {
        // Cool white/blue
        col[i * 3] = 0.7 + Math.random() * 0.3;
        col[i * 3 + 1] = 0.7 + Math.random() * 0.3;
        col[i * 3 + 2] = 0.8 + Math.random() * 0.2;
      } else if (colorChoice < 0.85) {
        // Warm amber (Covenant residue)
        col[i * 3] = 0.8 + Math.random() * 0.2;
        col[i * 3 + 1] = 0.6 + Math.random() * 0.2;
        col[i * 3 + 2] = 0.3 + Math.random() * 0.2;
      } else {
        // Faint purple (void energy)
        col[i * 3] = 0.5 + Math.random() * 0.3;
        col[i * 3 + 1] = 0.3 + Math.random() * 0.2;
        col[i * 3 + 2] = 0.7 + Math.random() * 0.3;
      }
    }

    return { positions: pos, sizes: sz, colors: col };
  }, [particleCount]);

  // Slow rotation of the entire starfield
  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.005;
      pointsRef.current.rotation.x += delta * 0.002;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={particleCount}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={particleCount}
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.3}
        sizeAttenuation
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * VoidDust — subtle ambient particles closer to the realms,
 * drifting slowly to give a sense of the void's emptiness.
 */
export function VoidDust() {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 500;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={500}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#c4a265"
        size={0.08}
        sizeAttenuation
        transparent
        opacity={0.15}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
