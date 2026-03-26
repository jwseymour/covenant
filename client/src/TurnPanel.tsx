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
import type { NodeId, M2TurnAction, GameState, PlayerId, DominionInstructionSet } from '@shattered-covenant/shared';
import { REALM_VISUALS } from './renderer/realm-visuals';
import { InstructionBuilder } from './InstructionBuilder';

interface TurnPanelProps {
  gameState: GameState;
  playerId: PlayerId;
  onSubmitTurn: (actions: M2TurnAction[]) => void;
  selectedNodeId: NodeId | null;
}

export function TurnPanel({ gameState, playerId, onSubmitTurn, selectedNodeId }: TurnPanelProps) {
  const [pendingActions, setPendingActions] = useState<M2TurnAction[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showInstructionBuilder, setShowInstructionBuilder] = useState(false);
  const [instructionTargetDom, setInstructionTargetDom] = useState<string | null>(null);

  const player = gameState.players[playerId];
  if (!player) return null;

  // Reset submitted state when turn resolves
  useEffect(() => {
    setSubmitted(false);
    setPendingActions([]);
  }, [gameState.turnNumber]);

  // AP accounting — count AP-costing actions
  const apUsed = pendingActions.filter((a) =>
    a.kind === 'establish_dominion' || a.kind === 'subvert_dominion' || a.kind === 'set_instructions'
  ).length;
  const apRemaining = 2 - apUsed;

  // Check if the selected node has an existing dominion
  const nodeHasDominion = selectedNodeId
    ? Object.values(gameState.dominions).find((d) => d.primaryNodeId === selectedNodeId)
    : null;

  const currentRealm = player.currentRealmId;

  const addAction = useCallback((action: M2TurnAction) => {
    setPendingActions((prev) => [...prev, action]);
  }, []);

  const removeAction = useCallback((index: number) => {
    setPendingActions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmitTurn(pendingActions.length > 0 ? pendingActions : [{ kind: 'pass' }]);
    setSubmitted(true);
  }, [pendingActions, onSubmitTurn]);

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
      case 'pass': return 'Pass';
    }
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
            {/* Establish Dominion */}
            {selectedNodeId && !nodeHasDominion && apRemaining > 0 && (
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
            {selectedNodeId && nodeHasDominion && nodeHasDominion.ownerId === playerId && (
              <button
                className="turn-panel__action-btn"
                onClick={() => addAction({ kind: 'visit_dominion', dominionId: nodeHasDominion.id })}
              >
                ↻ Visit & Refresh Dominion
              </button>
            )}

            {/* Set Instructions for Own Dominion */}
            {selectedNodeId && nodeHasDominion && nodeHasDominion.ownerId === playerId && apRemaining > 0 && (
              <button
                className="turn-panel__action-btn turn-panel__action-btn--instructions"
                onClick={() => openInstructionBuilder(nodeHasDominion.id)}
              >
                📜 Set Instructions (1 AP)
              </button>
            )}

            {/* Subvert Enemy Dominion */}
            {selectedNodeId && nodeHasDominion && nodeHasDominion.ownerId !== playerId && apRemaining > 0 && (
              <button
                className="turn-panel__action-btn turn-panel__action-btn--hostile"
                onClick={() => addAction({ kind: 'subvert_dominion', dominionId: nodeHasDominion.id })}
              >
                ⚔ Subvert Dominion (1 AP)
              </button>
            )}

            {/* Set Destination */}
            {selectedNodeId && selectedNodeId !== player.currentNodeId && (
              <button
                className="turn-panel__action-btn turn-panel__action-btn--move"
                onClick={() => addAction({
                  kind: 'set_destination',
                  realmId: currentRealm,
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
