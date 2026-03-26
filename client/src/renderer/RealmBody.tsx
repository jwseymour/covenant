/**
 * RealmBody — a single realm rendered as a glowing 3D crystalline shard.
 *
 * Each realm has unique geometry, colour, rotation, and glow effects
 * matching its lore identity. Click to select.
 *
 * lore_complete.md §4: "crystallised around a fundamental force"
 */

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RealmId, RealmState } from '@shattered-covenant/shared';
import { REALM_VISUALS, type RealmVisualConfig } from './realm-visuals';

interface RealmBodyProps {
  realmId: RealmId;
  state: RealmState;
  selected: boolean;
  onSelect: (realmId: RealmId) => void;
}

/** Create the geometry for a realm based on its shape config. */
function createGeometry(config: RealmVisualConfig): THREE.BufferGeometry {
  const s = config.scale * 1.5;
  switch (config.shape) {
    case 'dodecahedron': return new THREE.DodecahedronGeometry(s, 0);
    case 'icosahedron': return new THREE.IcosahedronGeometry(s, 1);
    case 'sphere': return new THREE.SphereGeometry(s, 24, 24);
    case 'octahedron': return new THREE.OctahedronGeometry(s, 0);
    case 'box': return new THREE.BoxGeometry(s * 1.2, s * 0.8, s);
    default: return new THREE.SphereGeometry(s, 16, 16);
  }
}

export function RealmBody({ realmId, state, selected, onSelect }: RealmBodyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const config = REALM_VISUALS[realmId];

  const geometry = useMemo(() => createGeometry(config), [config]);
  const glowGeometry = useMemo(() => {
    const g = createGeometry(config);
    g.scale(1.25, 1.25, 1.25);
    return g;
  }, [config]);

  // Animate rotation and hover effects
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += config.rotationSpeed;
      meshRef.current.rotation.x += config.rotationSpeed * 0.3;

      // Smooth scale on hover/select
      const targetScale = selected ? 1.15 : hovered ? 1.08 : 1.0;
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 5,
      );
    }

    if (glowRef.current) {
      glowRef.current.rotation.y += config.rotationSpeed * 0.5;
      glowRef.current.rotation.z += config.rotationSpeed * 0.2;

      // Pulse the glow opacity
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.08 + Math.sin(Date.now() * 0.002) * 0.04 +
        (selected ? 0.08 : 0) + (hovered ? 0.04 : 0);
    }
  });

  return (
    <group position={[state.position.x, state.position.y, state.position.z]}>
      {/* Outer glow shell */}
      <mesh ref={glowRef} geometry={glowGeometry}>
        <meshBasicMaterial
          color={config.accent}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Main realm body */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={(e) => { e.stopPropagation(); onSelect(realmId); }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
      >
        <meshStandardMaterial
          color={config.color}
          emissive={config.emissive}
          emissiveIntensity={selected ? config.emissiveIntensity * 1.8 : config.emissiveIntensity}
          transparent
          opacity={config.shellOpacity}
          roughness={0.4}
          metalness={0.3}
          wireframe={false}
        />
      </mesh>

      {/* Selection ring */}
      {selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[config.scale * 1.8, config.scale * 2.0, 64]} />
          <meshBasicMaterial
            color={config.accent}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Realm label (always faces camera via drei billboard would be nice,
          but for now simple sprite text) */}
      <sprite position={[0, config.scale * 2.2, 0]} scale={[4, 1, 1]}>
        <spriteMaterial
          transparent
          opacity={hovered || selected ? 0.9 : 0.5}
          depthTest={false}
        />
      </sprite>
    </group>
  );
}
