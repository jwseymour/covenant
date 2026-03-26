/**
 * InstructionBuilder — UI for setting dominion instructions.
 *
 * GDD §4.2: Tier 1 (basic directives) + Tier 2 (IF/THEN/ELSE).
 * "Interface: Visual flowchart builder (primary) + map-click auto-population."
 *
 * This is the simplified Tier 1/2 builder. The full visual flowchart
 * builder is planned for Milestone 7.
 */

import { useState, useCallback } from 'react';
import { createBasicInstructions, createConditionalInstructions } from '@shattered-covenant/shared';
import type {
  DominionInstructionSet,
  DominionActionType,
  ConditionType,
  DominionAction,
  InstructionCondition,
  NodeId,
} from '@shattered-covenant/shared';
import './styles/instruction-builder.css';

// ─── Constants ──────────────────────────────────────────────────

const TIER1_ACTIONS: { type: DominionActionType; label: string; icon: string; desc: string; needsTarget: boolean }[] = [
  { type: 'defend', label: 'Defend', icon: '🛡', desc: 'Fortify defences, hold territory', needsTarget: false },
  { type: 'expand', label: 'Expand', icon: '⚔', desc: 'Expand toward a target node', needsTarget: true },
  { type: 'recruit', label: 'Recruit', icon: '🏴', desc: 'Grow army strength each turn', needsTarget: false },
  { type: 'scout', label: 'Scout', icon: '👁', desc: 'Scout a target node for intel', needsTarget: true },
  { type: 'hold', label: 'Hold', icon: '⏸', desc: 'Do nothing, maintain position', needsTarget: false },
];

const CONDITIONS: { type: ConditionType; label: string; hasThreshold: boolean; defaultThreshold: number }[] = [
  { type: 'attacked', label: 'Under Attack', hasThreshold: false, defaultThreshold: 0 },
  { type: 'enemy_nearby', label: 'Enemy Nearby', hasThreshold: true, defaultThreshold: 2 },
  { type: 'influence_below', label: 'Influence Below', hasThreshold: true, defaultThreshold: 50 },
  { type: 'army_size_below', label: 'Army Below', hasThreshold: true, defaultThreshold: 15 },
];

// ─── Props ──────────────────────────────────────────────────────

interface InstructionBuilderProps {
  /** Current instructions (if editing). */
  currentInstructions: DominionInstructionSet | null;
  /** Currently selected node on the map (for targeting). */
  selectedTargetNodeId: NodeId | null;
  /** Current turn number. */
  turnNumber: number;
  /** Called when instructions are confirmed. */
  onConfirm: (instructions: DominionInstructionSet) => void;
  /** Called when the builder is closed without changes. */
  onCancel: () => void;
}

// ─── Component ──────────────────────────────────────────────────

export function InstructionBuilder({
  currentInstructions,
  selectedTargetNodeId,
  turnNumber,
  onConfirm,
  onCancel,
}: InstructionBuilderProps) {
  const [tier, setTier] = useState<1 | 2>(currentInstructions?.tier === 'advanced' ? 2 : 1);

  // Tier 1 state
  const [selectedAction, setSelectedAction] = useState<DominionActionType>(
    currentInstructions?.nodes[currentInstructions.entryNodeId]?.action.type ?? 'hold'
  );
  const [targetNodeId, setTargetNodeId] = useState<NodeId | null>(
    currentInstructions?.nodes[currentInstructions.entryNodeId]?.action.targetNodeId ?? null
  );

  // Tier 2 state
  const [condition, setCondition] = useState<ConditionType>('influence_below');
  const [threshold, setThreshold] = useState(50);
  const [thenAction, setThenAction] = useState<DominionActionType>('defend');
  const [thenTarget, setThenTarget] = useState<NodeId | null>(null);
  const [elseAction, setElseAction] = useState<DominionActionType>('expand');
  const [elseTarget, setElseTarget] = useState<NodeId | null>(null);

  // Track which target field is "listening" for map clicks
  const [listeningField, setListeningField] = useState<'tier1' | 'then' | 'else' | null>(null);

  // Apply map-click target to the listening field
  const applyMapTarget = useCallback(() => {
    if (!selectedTargetNodeId || !listeningField) return;
    switch (listeningField) {
      case 'tier1':
        setTargetNodeId(selectedTargetNodeId);
        break;
      case 'then':
        setThenTarget(selectedTargetNodeId);
        break;
      case 'else':
        setElseTarget(selectedTargetNodeId);
        break;
    }
    setListeningField(null);
  }, [selectedTargetNodeId, listeningField]);

  // Build the instruction set
  const buildInstructions = useCallback((): DominionInstructionSet => {
    if (tier === 1) {
      const action: DominionAction = { type: selectedAction };
      if (targetNodeId) action.targetNodeId = targetNodeId;
      return createBasicInstructions(action, turnNumber);
    }

    const condObj: InstructionCondition = { type: condition };
    const condDef = CONDITIONS.find((c) => c.type === condition);
    if (condDef?.hasThreshold) condObj.threshold = threshold;

    const tAction: DominionAction = { type: thenAction };
    if (thenTarget) tAction.targetNodeId = thenTarget;

    const eAction: DominionAction = { type: elseAction };
    if (elseTarget) eAction.targetNodeId = elseTarget;

    return createConditionalInstructions(condObj, tAction, eAction, turnNumber);
  }, [tier, selectedAction, targetNodeId, condition, threshold, thenAction, thenTarget, elseAction, elseTarget, turnNumber]);

  const handleConfirm = useCallback(() => {
    onConfirm(buildInstructions());
  }, [buildInstructions, onConfirm]);

  const actionNeedsTarget = (type: DominionActionType) =>
    TIER1_ACTIONS.find((a) => a.type === type)?.needsTarget ?? false;

  return (
    <div className="instr-builder">
      <div className="instr-builder__header">
        <h3>Set Instructions</h3>
        <span className="instr-builder__cost">1 AP</span>
      </div>

      {/* Tier Selector */}
      <div className="instr-builder__tier-tabs">
        <button
          className={`instr-builder__tier-tab ${tier === 1 ? 'instr-builder__tier-tab--active' : ''}`}
          onClick={() => setTier(1)}
        >
          Tier 1 — Directive
        </button>
        <button
          className={`instr-builder__tier-tab ${tier === 2 ? 'instr-builder__tier-tab--active' : ''}`}
          onClick={() => setTier(2)}
        >
          Tier 2 — Conditional
        </button>
      </div>

      {/* Tier 1: Action Buttons */}
      {tier === 1 && (
        <div className="instr-builder__tier1">
          <div className="instr-builder__actions">
            {TIER1_ACTIONS.map((a) => (
              <button
                key={a.type}
                className={`instr-builder__action-btn ${selectedAction === a.type ? 'instr-builder__action-btn--selected' : ''}`}
                onClick={() => setSelectedAction(a.type)}
              >
                <span className="instr-builder__action-icon">{a.icon}</span>
                <span className="instr-builder__action-label">{a.label}</span>
                <span className="instr-builder__action-desc">{a.desc}</span>
              </button>
            ))}
          </div>

          {/* Target selection for expand/scout */}
          {actionNeedsTarget(selectedAction) && (
            <div className="instr-builder__target">
              <span className="instr-builder__target-label">Target: </span>
              {targetNodeId ? (
                <span className="instr-builder__target-value">{targetNodeId}</span>
              ) : (
                <span className="instr-builder__target-placeholder">No target</span>
              )}
              <button
                className={`instr-builder__target-btn ${listeningField === 'tier1' ? 'instr-builder__target-btn--listening' : ''}`}
                onClick={() => {
                  if (listeningField === 'tier1') {
                    applyMapTarget();
                  } else {
                    setListeningField('tier1');
                  }
                }}
              >
                {listeningField === 'tier1' ? '⦿ Click map node...' : '🎯 Pick on map'}
              </button>
              {selectedTargetNodeId && listeningField === 'tier1' && (
                <button className="instr-builder__target-apply" onClick={applyMapTarget}>
                  Use: {selectedTargetNodeId}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tier 2: IF → THEN → ELSE */}
      {tier === 2 && (
        <div className="instr-builder__tier2">
          {/* Condition */}
          <div className="instr-builder__cond-row">
            <span className="instr-builder__flow-label">IF</span>
            <select
              className="instr-builder__select"
              value={condition}
              onChange={(e) => setCondition(e.target.value as ConditionType)}
            >
              {CONDITIONS.map((c) => (
                <option key={c.type} value={c.type}>{c.label}</option>
              ))}
            </select>
            {CONDITIONS.find((c) => c.type === condition)?.hasThreshold && (
              <input
                type="number"
                className="instr-builder__threshold"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                min={0}
                max={100}
              />
            )}
          </div>

          {/* THEN */}
          <div className="instr-builder__cond-row">
            <span className="instr-builder__flow-label">THEN</span>
            <select
              className="instr-builder__select"
              value={thenAction}
              onChange={(e) => setThenAction(e.target.value as DominionActionType)}
            >
              {TIER1_ACTIONS.map((a) => (
                <option key={a.type} value={a.type}>{a.icon} {a.label}</option>
              ))}
            </select>
            {actionNeedsTarget(thenAction) && (
              <button
                className={`instr-builder__target-btn instr-builder__target-btn--small ${listeningField === 'then' ? 'instr-builder__target-btn--listening' : ''}`}
                onClick={() => {
                  if (listeningField === 'then') applyMapTarget();
                  else setListeningField('then');
                }}
              >
                {thenTarget ?? (listeningField === 'then' ? '⦿ Click...' : '🎯')}
              </button>
            )}
          </div>

          {/* ELSE */}
          <div className="instr-builder__cond-row">
            <span className="instr-builder__flow-label">ELSE</span>
            <select
              className="instr-builder__select"
              value={elseAction}
              onChange={(e) => setElseAction(e.target.value as DominionActionType)}
            >
              {TIER1_ACTIONS.map((a) => (
                <option key={a.type} value={a.type}>{a.icon} {a.label}</option>
              ))}
            </select>
            {actionNeedsTarget(elseAction) && (
              <button
                className={`instr-builder__target-btn instr-builder__target-btn--small ${listeningField === 'else' ? 'instr-builder__target-btn--listening' : ''}`}
                onClick={() => {
                  if (listeningField === 'else') applyMapTarget();
                  else setListeningField('else');
                }}
              >
                {elseTarget ?? (listeningField === 'else' ? '⦿ Click...' : '🎯')}
              </button>
            )}
          </div>

          {/* Preview */}
          <div className="instr-builder__preview">
            IF <em>{CONDITIONS.find((c) => c.type === condition)?.label}</em>
            {CONDITIONS.find((c) => c.type === condition)?.hasThreshold && <> ({threshold})</>}
            {' '}→ <strong>{thenAction}</strong>
            {thenTarget && <> to {thenTarget}</>}
            {' '}| ELSE → <strong>{elseAction}</strong>
            {elseTarget && <> to {elseTarget}</>}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="instr-builder__footer">
        <button className="instr-builder__cancel" onClick={onCancel}>Cancel</button>
        <button className="instr-builder__confirm" onClick={handleConfirm}>
          ✦ Set Instructions (1 AP)
        </button>
      </div>
    </div>
  );
}
