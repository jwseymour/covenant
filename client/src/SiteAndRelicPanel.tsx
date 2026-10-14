import type { GameState, PlayerId, M2TurnAction } from '@shattered-covenant/shared';
import { SITE_RITES } from '@shattered-covenant/shared';
import './styles/ritual-panel.css'; // Reusing similar styles

interface SiteAndRelicPanelProps {
  gameState: GameState;
  playerId: PlayerId;
  addAction: (action: M2TurnAction) => void;
  apRemaining: number;
}

export function SiteAndRelicPanel({ gameState, playerId, addAction, apRemaining }: SiteAndRelicPanelProps) {
  const player = gameState.players[playerId];
  if (!player) return null;

  const currentNodeId = player.currentNodeId;

  // Find the exact node structure and realm
  let currentNode: any = null;
  for (const realm of Object.values(gameState.realmGraphs)) {
    const n = realm.nodes.find(n => n.id === currentNodeId);
    if (n) {
      currentNode = n;
      break;
    }
  }

  if (!currentNode) return null;

  const isRiteSite = currentNode.type === 'rite_site';
  const isRelicLocation = currentNode.type === 'relic_location';

  // If node is neither a rite site nor a relic location, show nothing.
  if (!isRiteSite && !isRelicLocation) return null;

  const handleRite = (riteId: string) => {
    addAction({
      kind: 'perform_site_rite',
      riteId,
      nodeId: currentNodeId,
    });
  };

  const handleClaim = (relicId: string) => {
    addAction({
      kind: 'claim_relic',
      relicId,
      nodeId: currentNodeId,
    });
  };

  return (
    <div className="ritual-panel">
      {isRiteSite && (
        <div className="ritual-panel__content" style={{ borderColor: '#f59e0b', marginBottom: '8px' }}>
          <div className="ritual-panel__header" style={{ color: '#fbbf24' }}>
            <span>☄ Rite Site</span>
          </div>
          <div className="ritual-panel__desc">
            Channel the ambient energy of this location.
          </div>
          <div className="ritual-panel__list">
            {(currentNode.availableRiteIds || []).map((id: string) => {
              const rite = SITE_RITES[id];
              if (!rite) return null;
              
              const canAfford = apRemaining >= rite.apCost && player.soulLedger.balance >= rite.soulCost;

              return (
                <button
                  key={id}
                  className={`ritual-panel__btn ${!canAfford ? 'ritual-panel__btn--disabled' : ''}`}
                  disabled={!canAfford}
                  onClick={() => handleRite(id)}
                  title={rite.description}
                >
                  <div className="ritual-panel__btn-name" style={{ color: '#fbbf24' }}>
                    {rite.name}
                  </div>
                  <div className="ritual-panel__btn-cost">
                    {rite.apCost} AP | {rite.soulCost} Souls
                  </div>
                </button>
              );
            })}
            
            {(!currentNode.availableRiteIds || currentNode.availableRiteIds.length === 0) && (
              <div className="ritual-panel__no-targets">No rites available here.</div>
            )}
          </div>
        </div>
      )}

      {isRelicLocation && currentNode.relicId && !currentNode.relicClaimed && (
        <div className="ritual-panel__content" style={{ borderColor: '#10b981' }}>
          <div className="ritual-panel__header" style={{ color: '#34d399' }}>
            <span>🗝 Relic Location</span>
          </div>
          <div className="ritual-panel__desc">
            An artifact of power lies dormant here.
          </div>
          
          <button
            className={`ritual-panel__btn ${apRemaining < 1 ? 'ritual-panel__btn--disabled' : ''}`}
            style={{ borderColor: '#059669', backgroundColor: '#064e3b' }}
            disabled={apRemaining < 1}
            onClick={() => handleClaim(currentNode.relicId)}
          >
            <div className="ritual-panel__btn-name" style={{ color: '#a7f3d0' }}>
              Claim {gameState.relics[currentNode.relicId]?.name || 'Relic'}
            </div>
            <div className="ritual-panel__btn-cost">1 AP</div>
          </button>
        </div>
      )}
      
      {isRelicLocation && currentNode.relicClaimed && (
        <div className="ritual-panel__content" style={{ opacity: 0.5 }}>
          <div className="ritual-panel__header">
            <span>🗝 Plundered Location</span>
          </div>
          <div className="ritual-panel__desc">
            The relic from this site has already been taken.
          </div>
        </div>
      )}
    </div>
  );
}
