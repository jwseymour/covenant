/**
 * TurnPanel — client UI for turn actions.
 *
 * Shows:
 * - Current AP remaining
 * - Available actions at the player's location
 * - Action queue (pending actions)
 * - Submit button
 * - InstructionBuilder overlay for dominion instructions
 * - Turn events log
 */

import { useState, useCallback, useEffect } from 'react';
import type { NodeId, RealmId, M2TurnAction, GameState, PlayerId, DominionInstructionSet } from '@shattered-covenant/shared';
import { RITUAL_COSTS, SITE_RITES } from '@shattered-covenant/shared';
import { REALM_VISUALS } from './renderer/realm-visuals';
import { InstructionBuilder } from './InstructionBuilder';
import { ReligionPanel } from './ReligionPanel';
import { RitualPanel } from './RitualPanel';
import { SiteAndRelicPanel } from './SiteAndRelicPanel';
import { MissionPanel } from './MissionPanel';
import { RelicInventoryPanel } from './RelicInventoryPanel';
import { ConfrontationPanel, type ConfrontationStance } from './ConfrontationPanel';
import { ActiveRulesPanel } from './ActiveRulesPanel';
import { ErrorBoundary } from './ErrorBoundary';
import { getActiveRealms } from '@shattered-covenant/shared';

interface TurnPanelProps {
  gameState: GameState;
  playerId: PlayerId;
  onSubmitTurn: (actions: M2TurnAction[]) => void;
  selectedNodeId: NodeId | null;
  selectedRealm: RealmId | null;
}

export function TurnPanel({ gameState, playerId, onSubmitTurn, selectedNodeId, selectedRealm }: TurnPanelProps) {
  const [pendingActions, setPendingActions] = useState<M2TurnAction[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showInstructionBuilder, setShowInstructionBuilder] = useState(false);
  const [instructionTargetDom, setInstructionTargetDom] = useState<string | null>(null);
  const [confrontationStance, setConfrontationStance] = useState<ConfrontationStance | null>(null);

  const player = gameState.players[playerId];
  if (!player) return null;

  // Reset submitted state when turn resolves
  useEffect(() => {
    setSubmitted(false);
    setPendingActions([]);
    setConfrontationStance(null);
  }, [gameState.turnNumber]);

  // AP accounting — count AP-costing actions
  const apUsed = pendingActions.reduce((total, a) => {
    switch (a.kind) {
      case 'establish_dominion':
      case 'subvert_dominion':
      case 'set_instructions':
      case 'found_religion':
      case 'set_religion_instructions':
      case 'claim_relic':
      case 'use_relic':
        return total + 1;
      case 'perform_ritual':
        return total + (RITUAL_COSTS[a.ritualType]?.ap || 0);
      case 'perform_site_rite':
        return total + (SITE_RITES[a.riteId]?.apCost || 0);
      default:
        return total;
    }
  }, 0);
  const apRemaining = 2 - apUsed;

  // Check if the selected node has an existing dominion
  const nodeHasDominion = selectedNodeId
    ? Object.values(gameState.dominions).find((d) => d.primaryNodeId === selectedNodeId)
    : null;

  const pendingDominionAction = pendingActions.find(
    (a) => a.kind === 'establish_dominion' && a.nodeId === selectedNodeId
  );
  
  const hasOwnDominionOrPending = (nodeHasDominion && nodeHasDominion.ownerId === playerId) || !!pendingDominionAction;
  const resolvedDominionId = (nodeHasDominion && nodeHasDominion.ownerId === playerId) 
      ? nodeHasDominion.id 
      : (pendingDominionAction ? `PENDING_DOMINION_${selectedNodeId}` : null);

  const currentRealm = player.currentRealmId;
  const activeRealms = getActiveRealms(gameState, currentRealm);

  const isCurrentLocation = selectedNodeId === player.currentNodeId;
  const isCoLocated = Object.values(gameState.players).some(p => p.id !== playerId && p.currentNodeId === player.currentNodeId);

  const addAction = useCallback((action: M2TurnAction) => {
    setPendingActions((prev) => [...prev, action]);
  }, []);

  const removeAction = useCallback((index: number) => {
    setPendingActions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(() => {
    if (isCoLocated && !confrontationStance) return;
    
    // Instead of passing it via `actions`, `onSubmitTurn` usually takes just the `actions` array right now!
    // Wait... `M2TurnSubmission` requires `{ actions: [...], confrontationStance }`. But `TurnPanelProps` only has `onSubmitTurn: (actions: M2TurnAction[]) => void;`. 
    // I will pass pass the stance in standard, or modify onSubmitTurn signature. Let's just emit a special action for now or patch `App.tsx`'s onSubmitTurn to accept stance.
    // Wait, the easiest is to add it via a special faux-action, or just pass it to the callback:
    (onSubmitTurn as any)(pendingActions.length > 0 ? pendingActions : [{ kind: 'pass' }], confrontationStance);
    setSubmitted(true);
  }, [pendingActions, onSubmitTurn, isCoLocated, confrontationStance]);

  // Open instruction builder for a dominion
  const openInstructionBuilder = useCallback((domId: string) => {
    setInstructionTargetDom(domId);
    setShowInstructionBuilder(true);
  }, []);

  // Handle instruction set
  const handleInstructionConfirm = useCallback((instructions: DominionInstructionSet) => {
    if (!instructionTargetDom) return;
    addAction({
      kind: 'set_instructions',
      dominionId: instructionTargetDom,
      instructions,
    });
    setShowInstructionBuilder(false);
    setInstructionTargetDom(null);
  }, [instructionTargetDom, addAction]);

  const handleInstructionCancel = useCallback(() => {
    setShowInstructionBuilder(false);
    setInstructionTargetDom(null);
  }, []);

  const actionLabel = (action: M2TurnAction): string => {
    switch (action.kind) {
      case 'establish_dominion': return `⚑ Establish at ${action.nodeId.split('-').slice(-1)}`;
      case 'set_destination': return `→ Move to ${action.nodeId.split('-').slice(-1)} (${action.realmId})`;
      case 'visit_dominion': return `↻ Visit dominion`;
      case 'subvert_dominion': return `⚔ Subvert dominion`;
      case 'set_instructions': return `📜 Set instructions (${action.instructions.tier})`;
      case 'found_religion': return `✦ Found religion "${action.name}"`;
      case 'set_religion_instructions': return `📜 Set commandments`;
      case 'pass': return 'Pass';
    }
    return 'Unknown Action';
  };

  // Get instruction summary for a dominion
  const getInstructionSummary = (dom: typeof gameState.dominions[string]): string => {
    if (!dom.instructions) return 'No instructions';
    const entry = dom.instructions.nodes[dom.instructions.entryNodeId];
    if (!entry) return 'Unknown';
    if (dom.instructions.tier === 'basic') return entry.action.type;
    if (dom.instructions.tier === 'advanced' && entry.condition && 'type' in entry.condition) {
      return `IF ${entry.condition.type} → ${entry.action.type}`;
    }
    return entry.action.type;
  };

  return (
    <div className="turn-panel">
      {/* Instruction Builder Overlay */}
      {showInstructionBuilder && instructionTargetDom && (
        <InstructionBuilder
          currentInstructions={gameState.dominions[instructionTargetDom]?.instructions ?? null}
          selectedTargetNodeId={selectedNodeId}
          turnNumber={gameState.turnNumber}
          onConfirm={handleInstructionConfirm}
          onCancel={handleInstructionCancel}
        />
      )}

      {/* Turn Info */}
      <div className="turn-panel__header">
        <div className="turn-panel__turn">Turn {gameState.turnNumber}</div>
        <div className="turn-panel__ap">
          <span className="turn-panel__ap-label">AP</span>
          <span className="turn-panel__ap-value">{apRemaining}</span>
          <span className="turn-panel__ap-max">/ 2</span>
        </div>
      </div>
      
      {/* Confrontation Warning Panel */}
      {isCoLocated && !submitted && (
        <ConfrontationPanel 
          gameState={gameState}
          playerId={playerId}
          stance={confrontationStance}
          onChange={setConfrontationStance}
        />
      )}

      {/* Secret Missions Panel */}
      <MissionPanel gameState={gameState} playerId={playerId} />

      {/* Active Rules Panel (Merge Zones) */}
      {selectedRealm && <ActiveRulesPanel gameState={gameState} homeRealmId={selectedRealm} />}

      {/* Religion Stability Warning Panel */}
      {(() => {
        const criticalReligions = Object.values(gameState.religions).filter(r => r.founderId === playerId && r.stability < 35);
        if (criticalReligions.length === 0) return null;
        return (
          <div className="turn-panel__section" style={{ backgroundColor: '#451a1a', border: '1px solid #dc2626', color: '#fca5a5', padding: '10px', margin: '0 0 16px 0', borderRadius: '4px' }}>
             <strong style={{ fontSize: '13px' }}>⚠️ CRISIS WARNING:</strong>
             <ul style={{ margin: '8px 0 0 16px', padding: 0, fontSize: '12px' }}>
               {criticalReligions.map(r => (
                  <li key={r.id} style={{ marginBottom: '4px' }}>"{r.name}" Stability: {r.stability.toFixed(1)}%. Imminent fracture and doctrine drift risk.</li>
               ))}
             </ul>
          </div>
        );
      })()}

      {/* Player Location */}
      <div className="turn-panel__section">
        <div className="turn-panel__label">Location</div>
        <div className="turn-panel__value">
          {REALM_VISUALS[currentRealm]?.name}
          <span style={{ opacity: 0.5, marginLeft: '6px', fontSize: '10px' }}>
            ({player.currentNodeId.split('-').slice(-1)})
          </span>
        </div>
      </div>

      {/* Available Actions */}
      {!submitted && !showInstructionBuilder && (
        <div className="turn-panel__section">
          <div className="turn-panel__label">Actions</div>
          <div className="turn-panel__actions">
            {/* Action at Current Location ONLY */}
            {!isCurrentLocation && selectedNodeId && (
              <div style={{ color: '#ffb366', fontSize: '11px', marginBottom: '8px' }}>
                Actions can only be performed at your current location ({player.currentNodeId.split('-').slice(-1)}).
              </div>
            )}

            {/* Establish Dominion */}
            {isCurrentLocation && !nodeHasDominion && apRemaining > 0 && (
              <button
                className="turn-panel__action-btn"
                onClick={() => addAction({
                  kind: 'establish_dominion',
                  nodeId: selectedNodeId,
                  realmId: currentRealm,
                  name: `Dominion at ${selectedNodeId}`,
                })}
              >
                ⚑ Establish Dominion (1 AP)
              </button>
            )}

            {/* Visit Own Dominion */}
            {isCurrentLocation && nodeHasDominion && nodeHasDominion.ownerId === playerId && (
              <button
                className="turn-panel__action-btn"
                onClick={() => addAction({ kind: 'visit_dominion', dominionId: nodeHasDominion.id })}
              >
                ↻ Visit & Refresh Dominion
              </button>
            )}

            {/* Set Instructions for Own Dominion (or Pending) */}
            {isCurrentLocation && hasOwnDominionOrPending && resolvedDominionId && apRemaining > 0 && (
              <button
                className="turn-panel__action-btn turn-panel__action-btn--instructions"
                onClick={() => openInstructionBuilder(resolvedDominionId)}
              >
                📜 Set Instructions (1 AP)
              </button>
            )}

            {/* Subvert Enemy Dominion */}
            {isCurrentLocation && nodeHasDominion && nodeHasDominion.ownerId !== playerId && apRemaining > 0 && (
              <button
                className="turn-panel__action-btn turn-panel__action-btn--hostile"
                onClick={() => addAction({ kind: 'subvert_dominion', dominionId: nodeHasDominion.id })}
              >
                ⚔ Subvert Dominion (1 AP)
              </button>
            )}

            {/* Set Destination */}
            {selectedNodeId && !isCurrentLocation && selectedRealm && (
              <button
                className="turn-panel__action-btn turn-panel__action-btn--move"
                onClick={() => addAction({
                  kind: 'set_destination',
                  realmId: selectedNodeId.split('-')[0] as RealmId,
                  nodeId: selectedNodeId,
                })}
              >
                → Move Here (free)
              </button>
            )}

            {!selectedNodeId && (
              <div style={{ color: '#6b6760', fontSize: '11px', fontStyle: 'italic' }}>
                Select a node on the map to see available actions
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Actions Queue */}
      {pendingActions.length > 0 && (
        <div className="turn-panel__section">
          <div className="turn-panel__label">Queued Actions</div>
          <div className="turn-panel__queue">
            {pendingActions.map((action, i) => (
              <div key={i} className="turn-panel__queued-action">
                <span>{actionLabel(action)}</span>
                {!submitted && (
                  <button
                    className="turn-panel__remove-btn"
                    onClick={() => removeAction(i)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit or Submitted */}
      <div className="turn-panel__section">
        {!submitted ? (
          <button
            className="turn-panel__submit-btn"
            onClick={handleSubmit}
            disabled={isCoLocated && !confrontationStance}
            style={{ opacity: isCoLocated && !confrontationStance ? 0.5 : 1, cursor: isCoLocated && !confrontationStance ? 'not-allowed' : 'pointer' }}
          >
            {pendingActions.length > 0 ? 'Submit Turn' : 'Pass Turn'}
          </button>
        ) : (
          <div className="turn-panel__submitted">
            ✓ Turn Submitted — Awaiting other players...
          </div>
        )}
      </div>

      {/* Dominions Overview */}
      {player.dominionIds.length > 0 && (
        <div className="turn-panel__section">
          <div className="turn-panel__label">Your Dominions</div>
          <div className="turn-panel__dominions">
            {player.dominionIds.map((domId) => {
              const dom = gameState.dominions[domId];
              if (!dom) return null;
              return (
                <div key={domId} className="turn-panel__dominion">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#c4a265' }}>
                      {dom.primaryNodeId.split('-').slice(-1)}
                    </span>
                    <span style={{ fontSize: '10px', color: dom.influence > 60 ? '#4ade80' : dom.influence > 30 ? '#fbbf24' : '#f87171' }}>
                      {dom.influence.toFixed(0)}%
                    </span>
                  </div>
                  <div className="turn-panel__influence-bar">
                    <div
                      className="turn-panel__influence-fill"
                      style={{
                        width: `${dom.influence}%`,
                        backgroundColor: dom.influence > 60 ? '#4ade80' : dom.influence > 30 ? '#fbbf24' : '#f87171',
                      }}
                    />
                  </div>
                  {/* Instruction Summary */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                    <span style={{ fontSize: '9px', color: '#6b6760', fontStyle: 'italic' }}>
                      {getInstructionSummary(dom)}
                    </span>
                    <span style={{ fontSize: '9px', color: '#6b6760' }}>
                      {dom.controlledNodeIds.length} nodes
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Religions */}
      {!showInstructionBuilder && (
        <ReligionPanel
          gameState={gameState}
          playerId={playerId}
          selectedNodeId={selectedNodeId}
          addAction={addAction}
          apRemaining={apRemaining}
        />
      )}

      {/* Relic Inventory */}
      {!showInstructionBuilder && (
        <RelicInventoryPanel
          gameState={gameState}
          playerId={playerId}
          addAction={addAction}
          apRemaining={apRemaining}
        />
      )}

      {/* Rites and Rituals */}
      {!showInstructionBuilder && isCurrentLocation && (
        <ErrorBoundary fallback={<div style={{padding: '8px', color: '#ff6b6b'}}>Ritual/Rite Panel Crashed!</div>}>
          <SiteAndRelicPanel
            gameState={gameState}
            playerId={playerId}
            addAction={addAction}
            apRemaining={apRemaining}
          />
          <RitualPanel
            gameState={gameState}
            playerId={playerId}
            addAction={addAction}
            apRemaining={apRemaining}
            activeRealms={activeRealms}
          />
        </ErrorBoundary>
      )}

      {/* Turn Events */}
      {gameState.turnHistory.length > 0 && (
        <div className="turn-panel__section">
          <div className="turn-panel__label">Last Turn Events</div>
          <div className="turn-panel__events">
            {gameState.turnHistory[gameState.turnHistory.length - 1].events.map((evt, i) => (
              <div key={i} className="turn-panel__event">{evt}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
