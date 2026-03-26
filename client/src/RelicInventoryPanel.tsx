import type { GameState, PlayerId, M2TurnAction } from '@shattered-covenant/shared';
import './styles/ritual-panel.css';

interface RelicInventoryPanelProps {
  gameState: GameState;
  playerId: PlayerId;
  addAction: (action: M2TurnAction) => void;
  apRemaining: number;
}

export function RelicInventoryPanel({ gameState, playerId, addAction, apRemaining }: RelicInventoryPanelProps) {
  const player = gameState.players[playerId];
  if (!player || player.relicIds.length === 0) return null;

  const relics = player.relicIds.map(id => gameState.relics[id]).filter(Boolean);
  if (relics.length === 0) return null;

  return (
    <div className="ritual-panel">
      <div className="turn-panel__label" style={{ marginBottom: '8px' }}>My Relics</div>
      {relics.map(relic => (
         <div key={relic.id} className="ritual-panel__content" style={{ borderColor: '#10b981', marginBottom: '8px' }}>
           <div className="ritual-panel__header" style={{ color: '#34d399' }}>
             <span>🗝 {relic.name}</span>
             {relic.maxUses > 0 && <span style={{ fontSize: '10px', opacity: 0.8 }}> ({relic.usesRemaining}/{relic.maxUses} uses)</span>}
           </div>
           <div className="ritual-panel__desc">
             {relic.description}
           </div>
           
           {/* If Active Relic */}
           {relic.maxUses > 0 && relic.usesRemaining > 0 && (
             <button
               className={`ritual-panel__btn ${apRemaining < 1 ? 'ritual-panel__btn--disabled' : ''}`}
               style={{ borderColor: '#059669', backgroundColor: '#064e3b', marginTop: '8px' }}
               disabled={apRemaining < 1}
               onClick={() => addAction({ kind: 'use_relic', relicId: relic.id })}
             >
               <div className="ritual-panel__btn-name" style={{ color: '#a7f3d0' }}>
                 Invoke Power
               </div>
               <div className="ritual-panel__btn-cost">1 AP</div>
             </button>
           )}
           {relic.maxUses > 0 && relic.usesRemaining === 0 && (
             <div className="ritual-panel__desc" style={{ color: '#ef4444', marginTop: '6px', fontSize: '10px' }}>
               Relic power depleted.
             </div>
           )}
           {relic.maxUses < 0 && (
             <div className="ritual-panel__desc" style={{ color: '#fbbf24', marginTop: '6px', fontSize: '10px' }}>
               Passive effect active.
             </div>
           )}
         </div>
      ))}
    </div>
  );
}
