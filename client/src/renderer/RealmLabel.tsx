/**
 * RealmLabel — floating text label above a realm body.
 * Uses drei's Html component for crisp text rendering.
 */

import { Html } from '@react-three/drei';
import type { RealmId, RealmState } from '@shattered-covenant/shared';
import { REALM_VISUALS } from './realm-visuals';

interface RealmLabelProps {
  realmId: RealmId;
  state: RealmState;
  selected: boolean;
  hovered?: boolean;
}

export function RealmLabel({ realmId, state, selected }: RealmLabelProps) {
  const config = REALM_VISUALS[realmId];

  return (
    <Html
      position={[state.position.x, state.position.y + config.scale * 2.5, state.position.z]}
      center
      distanceFactor={30}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: selected ? '14px' : '11px',
          fontWeight: selected ? '700' : '400',
          color: selected ? config.accent : 'rgba(232, 228, 221, 0.6)',
          textShadow: `0 0 8px ${config.emissive}`,
          letterSpacing: '0.1em',
          transition: 'all 0.3s ease',
          textTransform: 'uppercase',
        }}
      >
        {config.name}
      </div>
    </Html>
  );
}
