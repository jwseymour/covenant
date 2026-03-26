import type { RealmId, GameState } from '@shattered-covenant/shared';
import { getActiveRealms } from '@shattered-covenant/shared';
import { REALM_VISUALS } from './renderer/realm-visuals';

interface ActiveRulesPanelProps {
  gameState: GameState;
  homeRealmId: RealmId;
}

export function ActiveRulesPanel({ gameState, homeRealmId }: ActiveRulesPanelProps) {
  const activeRealms = Array.from(getActiveRealms(gameState, homeRealmId)) as RealmId[];

  if (activeRealms.length <= 1) return null;

  return (
    <div style={{
      background: 'rgba(20, 20, 25, 0.9)',
      border: '1px solid #ff00ff',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '16px',
      boxShadow: '0 0 10px rgba(255, 0, 255, 0.2)'
    }}>
      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        ⚠️ Realm Convergence Zone
      </div>
      <div style={{ color: '#aaa', fontSize: '11px', lineHeight: '1.4' }}>
        Multiple reality rules are currently active in this airspace. Religions and Dominions here invoke mixed modifiers.
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        {activeRealms.map(rId => (
          <div key={rId} style={{ 
            background: REALM_VISUALS[rId as RealmId]?.color || '#fff', 
            color: '#000', 
            padding: '2px 6px', 
            borderRadius: '4px', 
            fontSize: '10px', 
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            {REALM_VISUALS[rId as RealmId]?.name || rId}
          </div>
        ))}
      </div>
    </div>
  );
}
