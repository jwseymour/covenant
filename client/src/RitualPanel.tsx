import { useState } from 'react';
import type { GameState, PlayerId, NodeId, M2TurnAction } from '@shattered-covenant/shared';
import { RITUAL_COSTS, getAvailableMergeRites, ALL_MERGE_RITES } from '@shattered-covenant/shared';
import type { RealmId } from '@shattered-covenant/shared';
import './styles/ritual-panel.css';

interface RitualPanelProps {
  gameState: GameState;
  playerId: PlayerId;
  addAction: (action: M2TurnAction) => void;
  apRemaining: number;
  activeRealms: Set<RealmId>;
}

export function RitualPanel({ gameState, playerId, addAction, apRemaining, activeRealms }: RitualPanelProps) {
  const player = gameState.players[playerId];
  if (!player) return null;

  const [expanded, setExpanded] = useState(false);
  const [selectedSeveranceTarget, setSelectedSeveranceTarget] = useState<any>(null);
  
  const currentNodeId = player.currentNodeId;

  // Gather Severance Candidates
  const severanceCandidates: any[] = [];
  
  // 1. Enemy Dominions at current node
  for (const dom of Object.values(gameState.dominions)) {
    if (dom.primaryNodeId === currentNodeId && dom.ownerId !== playerId) {
      severanceCandidates.push({
        label: `Enemy Dominion (${dom.ownerId.split('-')[0]})`,
        target: { type: 'dominion', id: dom.id }
      });
    }
  }

  // 2. Enemy Religions at current node
  for (const rel of Object.values(gameState.religions)) {
    if (rel.founderId !== playerId && rel.followersByNode[currentNodeId] && rel.followersByNode[currentNodeId] > 0) {
      severanceCandidates.push({
        label: `Rival Faith (${rel.name})`,
        target: { type: 'religion', id: rel.id }
      });
    }
  }

  // 3. Edges
  const currentRealm = Object.values(gameState.realmGraphs).find(g => g.realmId === player.currentRealmId);
  if (currentRealm) {
    for (const edge of currentRealm.edges) {
      if ((edge.sourceNodeId === currentNodeId || edge.targetNodeId === currentNodeId) && !edge.severed) {
        const otherNodeId = edge.sourceNodeId === currentNodeId ? edge.targetNodeId : edge.sourceNodeId;
        severanceCandidates.push({
          label: `Path to ${otherNodeId.split('-').pop()}`,
          target: { type: 'edge', id: edge.id }
        });
      }
    }
  }

  const handleRitual = (ritualType: any, target?: any) => {
    addAction({
      kind: 'perform_ritual',
      ritualType,
      nodeId: currentNodeId,
      target,
    });
    setExpanded(false);
    setSelectedSeveranceTarget(null);
  };

  const renderRitualBtn = (type: any, name: string, desc: string, target?: any) => {
    const cost = RITUAL_COSTS[type as keyof typeof RITUAL_COSTS];
    const canAfford = apRemaining >= cost.ap && player.soulLedger.balance >= cost.souls;

    return (
      <button
        className={`ritual-panel__btn ${!canAfford ? 'ritual-panel__btn--disabled' : ''}`}
        disabled={!canAfford}
        onClick={() => handleRitual(type, target)}
        title={desc}
      >
        <div className="ritual-panel__btn-name">{name}</div>
        <div className="ritual-panel__btn-cost">
          {cost.ap} AP | {cost.souls} Souls
        </div>
      </button>
    );
  };

  const handleMergeRite = (riteType: any) => {
    addAction({
      kind: 'perform_merge_rite',
      riteType,
      nodeId: currentNodeId,
    });
    setExpanded(false);
  };

  const renderMergeRiteBtn = (type: any, name: string, desc: string, cost: number) => {
    const canAfford = apRemaining >= 1 && player.soulLedger.balance >= cost;
    return (
      <button
        key={type}
        className={`ritual-panel__btn ${!canAfford ? 'ritual-panel__btn--disabled' : ''}`}
        disabled={!canAfford}
        onClick={() => handleMergeRite(type)}
        title={desc}
      >
        <div className="ritual-panel__btn-name" style={{ color: '#a3a3ff' }}>★ {name}</div>
        <div className="ritual-panel__btn-cost">
          1 AP | {cost} Souls
        </div>
      </button>
    );
  };

  return (
    <div className="ritual-panel">
      {!expanded ? (
        <button
          className="ritual-panel__toggle"
          onClick={() => setExpanded(true)}
          disabled={apRemaining < 1}
        >
          <span>👁</span>
          <span>Personal Rituals</span>
        </button>
      ) : (
        <div className="ritual-panel__content">
          <div className="ritual-panel__header">
            <span>Ordained Rituals</span>
            <button className="ritual-panel__close" onClick={() => { setExpanded(false); setSelectedSeveranceTarget(null); }}>✕</button>
          </div>
          <div className="ritual-panel__desc">
            Powerful personal incantations anchored to your current location.
          </div>

          <div className="ritual-panel__list">
            {renderRitualBtn('rite_of_sight', 'Rite of Sight', 'Reveal all instructions at your current location.')}
            {renderRitualBtn('rite_of_binding', 'Rite of Binding', 'Strengthen control at your location — reset dominion decay and stabilise a religion.')}
            {renderRitualBtn('rite_of_harvest', 'Rite of Harvest', 'Sacrifice the local population to immediately collect all its souls.')}
          </div>

          <div className="ritual-panel__divider" />
          
          <div className="ritual-panel__severance">
            <div className="ritual-panel__severance-title">Rite of Severance</div>
            <div className="ritual-panel__severance-desc">Weaken a rival or sever a travel route.</div>
            
            {severanceCandidates.length > 0 ? (
              <select 
                className="ritual-panel__select"
                value={selectedSeveranceTarget ? JSON.stringify(selectedSeveranceTarget) : ''}
                onChange={(e) => setSelectedSeveranceTarget(JSON.parse(e.target.value))}
              >
                <option value="" disabled>Select target...</option>
                {severanceCandidates.map((cad, i) => (
                  <option key={i} value={JSON.stringify(cad.target)}>
                    {cad.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="ritual-panel__no-targets">No valid severance targets here.</div>
            )}
            
            {selectedSeveranceTarget && renderRitualBtn('rite_of_severance', 'Invoke Severance', 'Strike down the target.', selectedSeveranceTarget)}
          </div>

          {/* MERGE RITES */}
          {activeRealms && activeRealms.size > 1 && (
            <>
              <div className="ritual-panel__divider" />
              <div className="ritual-panel__severance-title" style={{ color: '#a3a3ff' }}>Realm Convergence</div>
              <div className="ritual-panel__severance-desc">Exotic phenomena observed in overlapping zones.</div>
              <div className="ritual-panel__list">
                {getAvailableMergeRites(activeRealms).map(rType => {
                  const def = ALL_MERGE_RITES[rType];
                  if (!def) return null;
                  return renderMergeRiteBtn(rType, def.name, def.description, def.soulCost);
                })}
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
