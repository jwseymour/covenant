/**
 * MacroView — the 3D macro view of all realms drifting through the void.
 *
 * GDD §3.6: "Macro view: realms as bodies in space with predicted trajectories"
 * This is the primary view — realms as glowing crystalline shards
 * floating in a dark void, with trajectory predictions and
 * interaction indicators.
 *
 * Built with React Three Fiber + drei.
 */

import { useState, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { RealmId, RealmState, RealmInteraction } from '@shattered-covenant/shared';
import { RealmBody } from './RealmBody';
import { TrajectoryLine, TrajectoryDots } from './TrajectoryLine';
import { VoidBackground, VoidDust } from './VoidBackground';
import { AccessPointIndicator } from './AccessPointIndicator';
import { RealmLabel } from './RealmLabel';
import { REALM_VISUALS, REALM_IDS } from './realm-visuals';
import { createMockRealmStates, computeMockInteractions } from './mock-realm-data';

interface MacroViewProps {
  /** Override realm states (from game engine). Falls back to mock data. */
  realmStates?: Record<RealmId, RealmState>;
  /** Override interactions. Falls back to computed from states. */
  interactions?: RealmInteraction[];
  /** Callback when a realm is selected. */
  onRealmSelect?: (realmId: RealmId | null) => void;
}

/** Inner 3D scene content (must be inside Canvas). */
function MacroScene({
  realmStates,
  interactions,
  selectedRealm,
  onSelect,
}: {
  realmStates: Record<RealmId, RealmState>;
  interactions: RealmInteraction[];
  selectedRealm: RealmId | null;
  onSelect: (realmId: RealmId) => void;
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#c4a265" distance={50} />
      <directionalLight position={[20, 20, 20]} intensity={0.3} />

      {/* Void background */}
      <VoidBackground particleCount={2000} />
      <VoidDust />
      <Stars radius={200} depth={80} count={3000} factor={3} saturation={0.1} fade speed={0.3} />

      {/* Realm bodies */}
      {REALM_IDS.map((realmId) => (
        <group key={realmId}>
          <RealmBody
            realmId={realmId}
            state={realmStates[realmId]}
            selected={selectedRealm === realmId}
            onSelect={onSelect}
          />
          <TrajectoryLine
            realmId={realmId}
            state={realmStates[realmId]}
            visible={selectedRealm === realmId || selectedRealm === null}
          />
          <TrajectoryDots
            realmId={realmId}
            state={realmStates[realmId]}
            visible={selectedRealm === realmId}
          />
          <RealmLabel
            realmId={realmId}
            state={realmStates[realmId]}
            selected={selectedRealm === realmId}
          />
        </group>
      ))}

      {/* Access point & merge zone indicators */}
      {interactions.map((interaction, i) => (
        <AccessPointIndicator
          key={`${interaction.realmA}-${interaction.realmB}-${i}`}
          interaction={interaction}
          states={realmStates}
        />
      ))}

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={80}
        enablePan
        panSpeed={0.5}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />
    </>
  );
}

/**
 * MacroView — complete 3D macro view with Canvas wrapper.
 */
export function MacroView({ realmStates: externalStates, interactions: externalInteractions, onRealmSelect }: MacroViewProps) {
  const [selectedRealm, setSelectedRealm] = useState<RealmId | null>(null);

  // Use external state if provided, otherwise use mock data
  const realmStates = useMemo(
    () => externalStates ?? createMockRealmStates(),
    [externalStates],
  );

  const interactions = useMemo(
    () => externalInteractions ?? computeMockInteractions(realmStates),
    [externalInteractions, realmStates],
  );

  const handleSelect = useCallback(
    (realmId: RealmId) => {
      const newSelection = selectedRealm === realmId ? null : realmId;
      setSelectedRealm(newSelection);
      onRealmSelect?.(newSelection);
    },
    [selectedRealm, onRealmSelect],
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 15, 30], fov: 55, near: 0.1, far: 500 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: 3, // ACESFilmicToneMapping
        }}
        style={{ background: '#050508' }}
      >
        <MacroScene
          realmStates={realmStates}
          interactions={interactions}
          selectedRealm={selectedRealm}
          onSelect={handleSelect}
        />
      </Canvas>

      {/* Realm info overlay when selected */}
      {selectedRealm && (
        <div
          style={{
            position: 'absolute',
            left: '16px',
            bottom: '16px',
            background: 'rgba(10, 10, 15, 0.9)',
            border: '1px solid rgba(196, 162, 101, 0.3)',
            borderRadius: '8px',
            padding: '16px 20px',
            maxWidth: '320px',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '16px',
              fontWeight: '700',
              color: REALM_VISUALS[selectedRealm].accent,
              letterSpacing: '0.08em',
              marginBottom: '6px',
            }}
          >
            {REALM_VISUALS[selectedRealm].name}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'rgba(232, 228, 221, 0.7)',
              lineHeight: '1.5',
            }}
          >
            {REALM_VISUALS[selectedRealm].description}
          </div>
          <div
            style={{
              marginTop: '10px',
              fontSize: '11px',
              color: 'rgba(158, 154, 147, 0.8)',
              fontFamily: 'monospace',
            }}
          >
            Position: ({realmStates[selectedRealm].position.x.toFixed(1)},{' '}
            {realmStates[selectedRealm].position.y.toFixed(1)},{' '}
            {realmStates[selectedRealm].position.z.toFixed(1)})
          </div>
        </div>
      )}
    </div>
  );
}
