/**
 * FlowchartCanvas — visual flowchart builder for expert-tier instructions.
 *
 * GDD §4.2: "Visual flowchart builder (primary) + map-click auto-population
 * + optional code mode."
 *
 * Features:
 * - Click to add condition/action nodes
 * - Click-to-connect: click output port → click target node
 * - Compound conditions (AND/OR/NOT) for expert tier
 * - Node count limit (configurable)
 * - Code mode toggle for raw JSON editing
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type {
  InstructionNodeId,
  InstructionNode,
  DominionInstructionSet,
  DominionActionType,
  ConditionType,
  InstructionCondition,
  CompoundCondition,
  LogicalOperator,
  NodeId,
} from '@shattered-covenant/shared';
import './styles/flowchart-builder.css';

// ─── Constants ──────────────────────────────────────────────────

const ALL_CONDITIONS: { type: ConditionType; label: string; hasThreshold: boolean; defaultThreshold: number }[] = [
  { type: 'attacked', label: 'Under Attack', hasThreshold: false, defaultThreshold: 0 },
  { type: 'enemy_nearby', label: 'Enemy Nearby', hasThreshold: true, defaultThreshold: 2 },
  { type: 'influence_below', label: 'Influence Below', hasThreshold: true, defaultThreshold: 50 },
  { type: 'influence_above', label: 'Influence Above', hasThreshold: true, defaultThreshold: 80 },
  { type: 'army_size_below', label: 'Army Below', hasThreshold: true, defaultThreshold: 15 },
  { type: 'army_size_above', label: 'Army Above', hasThreshold: true, defaultThreshold: 50 },
  { type: 'enemy_religion_present', label: 'Enemy Religion Present', hasThreshold: false, defaultThreshold: 0 },
  { type: 'population_below', label: 'Population Below', hasThreshold: true, defaultThreshold: 500 },
  { type: 'realm_merged', label: 'Realm Merged', hasThreshold: false, defaultThreshold: 0 },
  { type: 'always', label: 'Always (default)', hasThreshold: false, defaultThreshold: 0 },
];

const ALL_ACTIONS: { type: DominionActionType; label: string; icon: string; needsTarget: boolean }[] = [
  { type: 'defend', label: 'Defend', icon: '🛡', needsTarget: false },
  { type: 'expand', label: 'Expand', icon: '⚔', needsTarget: true },
  { type: 'recruit', label: 'Recruit', icon: '🏴', needsTarget: false },
  { type: 'scout', label: 'Scout', icon: '👁', needsTarget: true },
  { type: 'hold', label: 'Hold', icon: '⏸', needsTarget: false },
  { type: 'attack', label: 'Attack', icon: '⚡', needsTarget: true },
  { type: 'suppress_religion', label: 'Suppress Religion', icon: '✕', needsTarget: false },
  { type: 'improve_troops', label: 'Improve Troops', icon: '⬆', needsTarget: false },
];

// ─── Visual node position ───────────────────────────────────────

interface VisualNode {
  id: InstructionNodeId;
  x: number;
  y: number;
  nodeType: 'condition' | 'action';
}

// ─── Props ──────────────────────────────────────────────────────

interface FlowchartCanvasProps {
  instructions: DominionInstructionSet;
  maxNodes: number;
  selectedTargetNodeId: NodeId | null;
  onChange: (instructions: DominionInstructionSet) => void;
}

// ─── Component ──────────────────────────────────────────────────

let nodeCounter = 0;
function generateNodeId(): InstructionNodeId {
  return `fn-${++nodeCounter}-${Date.now().toString(36)}`;
}

export function FlowchartCanvas({
  instructions,
  maxNodes,
  selectedTargetNodeId,
  onChange,
}: FlowchartCanvasProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<InstructionNodeId | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: InstructionNodeId; port: 'true' | 'false' } | null>(null);
  const [codeMode, setCodeMode] = useState(false);
  const [codeText, setCodeText] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [listeningNodeId, setListeningNodeId] = useState<InstructionNodeId | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const nodes = instructions.nodes;
  const nodeIds = Object.keys(nodes);
  const atLimit = nodeIds.length >= maxNodes;

  // Auto-layout: position nodes in a tree-like arrangement
  const visualNodes: VisualNode[] = useMemo(() => {
    const result: VisualNode[] = [];
    const visited = new Set<string>();
    const xSpacing = 180;
    const ySpacing = 100;

    function layout(id: InstructionNodeId, depth: number, offset: number): number {
      if (visited.has(id) || !nodes[id]) return offset;
      visited.add(id);

      const node = nodes[id];
      const hasCondition = !!node.condition;

      result.push({
        id,
        x: 20 + offset * xSpacing,
        y: 30 + depth * ySpacing,
        nodeType: hasCondition ? 'condition' : 'action',
      });

      let nextOffset = offset;
      if (node.trueNextId) nextOffset = layout(node.trueNextId, depth + 1, nextOffset);
      if (node.falseNextId) nextOffset = layout(node.falseNextId, depth + 1, nextOffset + 1);
      if (!node.trueNextId && !node.falseNextId) nextOffset++;

      return nextOffset;
    }

    layout(instructions.entryNodeId, 0, 0);

    // Layout orphan nodes not reachable from entry
    for (const id of nodeIds) {
      if (!visited.has(id)) {
        result.push({
          id,
          x: 20 + result.length * xSpacing,
          y: 30 + 3 * ySpacing,
          nodeType: nodes[id].condition ? 'condition' : 'action',
        });
      }
    }

    return result;
  }, [nodes, nodeIds, instructions.entryNodeId]);

  // SVG edges
  const edges: { fromX: number; fromY: number; toX: number; toY: number; port: 'true' | 'false' }[] = useMemo(() => {
    const result: typeof edges = [];
    const posMap = new Map(visualNodes.map(v => [v.id, v]));

    for (const vn of visualNodes) {
      const node = nodes[vn.id];
      if (node.trueNextId && posMap.has(node.trueNextId)) {
        const target = posMap.get(node.trueNextId)!;
        result.push({ fromX: vn.x + 75, fromY: vn.y + 52, toX: target.x + 75, toY: target.y, port: 'true' });
      }
      if (node.falseNextId && posMap.has(node.falseNextId)) {
        const target = posMap.get(node.falseNextId)!;
        result.push({ fromX: vn.x + 75, fromY: vn.y + 52, toX: target.x + 75, toY: target.y, port: 'false' });
      }
    }

    return result;
  }, [visualNodes, nodes]);

  const canvasWidth = Math.max(400, ...visualNodes.map(v => v.x + 200));
  const canvasHeight = Math.max(300, ...visualNodes.map(v => v.y + 100));

  // ─── Handlers ───────────────────────────────────────────────

  const addNode = useCallback((nodeType: 'condition' | 'action') => {
    if (atLimit) return;

    const id = generateNodeId();
    const newNode: InstructionNode = {
      id,
      action: { type: 'hold' },
    };

    if (nodeType === 'condition') {
      newNode.condition = { type: 'attacked' };
    }

    const updated = { ...instructions, nodes: { ...instructions.nodes, [id]: newNode } };
    onChange(updated);
    setSelectedNodeId(id);
  }, [instructions, onChange, atLimit]);

  const updateNode = useCallback((id: InstructionNodeId, patch: Partial<InstructionNode>) => {
    const updated = {
      ...instructions,
      nodes: {
        ...instructions.nodes,
        [id]: { ...instructions.nodes[id], ...patch },
      },
    };
    onChange(updated);
  }, [instructions, onChange]);

  const deleteNode = useCallback((id: InstructionNodeId) => {
    if (id === instructions.entryNodeId) return; // Can't delete entry
    const { [id]: _, ...rest } = instructions.nodes;
    // Clean up references
    for (const nid of Object.keys(rest)) {
      if (rest[nid].trueNextId === id) rest[nid] = { ...rest[nid], trueNextId: undefined };
      if (rest[nid].falseNextId === id) rest[nid] = { ...rest[nid], falseNextId: undefined };
    }
    onChange({ ...instructions, nodes: rest });
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [instructions, onChange, selectedNodeId]);

  const connectNodes = useCallback((targetId: InstructionNodeId) => {
    if (!connectingFrom) return;
    const { nodeId, port } = connectingFrom;
    if (nodeId === targetId) { setConnectingFrom(null); return; }

    const patch = port === 'true' ? { trueNextId: targetId } : { falseNextId: targetId };
    updateNode(nodeId, patch);
    setConnectingFrom(null);
  }, [connectingFrom, updateNode]);

  const setEntryNode = useCallback((id: InstructionNodeId) => {
    onChange({ ...instructions, entryNodeId: id });
  }, [instructions, onChange]);

  // Apply map-click target
  const applyMapTarget = useCallback(() => {
    if (!listeningNodeId || !selectedTargetNodeId) return;
    const node = instructions.nodes[listeningNodeId];
    if (node) {
      updateNode(listeningNodeId, { action: { ...node.action, targetNodeId: selectedTargetNodeId } });
    }
    setListeningNodeId(null);
  }, [listeningNodeId, selectedTargetNodeId, instructions, updateNode]);

  // Code mode toggle
  const enterCodeMode = useCallback(() => {
    setCodeText(JSON.stringify(instructions, null, 2));
    setCodeError(null);
    setCodeMode(true);
  }, [instructions]);

  const applyCodeMode = useCallback(() => {
    try {
      const parsed = JSON.parse(codeText) as DominionInstructionSet;
      if (!parsed.entryNodeId || !parsed.nodes) throw new Error('Missing entryNodeId or nodes');
      onChange(parsed);
      setCodeMode(false);
      setCodeError(null);
    } catch (e: any) {
      setCodeError(e.message);
    }
  }, [codeText, onChange]);

  // ─── Code Mode ────────────────────────────────────────────────

  if (codeMode) {
    return (
      <div className="flowchart">
        <div className="flowchart__toolbar">
          <span className="flowchart__title">Code Mode</span>
          <button className="flowchart__btn" onClick={() => setCodeMode(false)}>← Visual</button>
          <button className="flowchart__btn flowchart__btn--confirm" onClick={applyCodeMode}>Apply JSON</button>
        </div>
        {codeError && <div className="flowchart__error">{codeError}</div>}
        <textarea
          className="flowchart__code"
          value={codeText}
          onChange={(e) => setCodeText(e.target.value)}
          rows={20}
          spellCheck={false}
        />
      </div>
    );
  }

  // ─── Selected node editor ────────────────────────────────────

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

  return (
    <div className="flowchart">
      {/* Toolbar */}
      <div className="flowchart__toolbar">
        <span className="flowchart__title">Expert Flowchart</span>
        <span className="flowchart__count">{nodeIds.length}/{maxNodes} nodes</span>
        <button className="flowchart__btn" onClick={() => addNode('condition')} disabled={atLimit} title="Add Condition">
          ◆ Condition
        </button>
        <button className="flowchart__btn" onClick={() => addNode('action')} disabled={atLimit} title="Add Action">
          ■ Action
        </button>
        <button className="flowchart__btn flowchart__btn--code" onClick={enterCodeMode} title="Code Mode">
          {'</>'}
        </button>
      </div>

      {atLimit && (
        <div className="flowchart__warning">
          Node limit reached ({maxNodes}). Delete a node to add more.
        </div>
      )}

      {connectingFrom && (
        <div className="flowchart__connecting">
          Connecting from <strong>{connectingFrom.nodeId}</strong> ({connectingFrom.port}) — click a target node
          <button className="flowchart__btn flowchart__btn--cancel" onClick={() => setConnectingFrom(null)}>Cancel</button>
        </div>
      )}

      {/* Canvas */}
      <div className="flowchart__canvas" ref={canvasRef} style={{ width: canvasWidth, height: canvasHeight }}>
        {/* SVG Edges */}
        <svg className="flowchart__edges" width={canvasWidth} height={canvasHeight}>
          <defs>
            <marker id="arrow-true" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#4ade80" />
            </marker>
            <marker id="arrow-false" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#f87171" />
            </marker>
          </defs>
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.fromX} y1={e.fromY}
              x2={e.toX} y2={e.toY}
              className={`flowchart__edge flowchart__edge--${e.port}`}
              markerEnd={`url(#arrow-${e.port})`}
            />
          ))}
        </svg>

        {/* Nodes */}
        {visualNodes.map((vn) => {
          const node = nodes[vn.id];
          if (!node) return null;
          const isEntry = vn.id === instructions.entryNodeId;
          const isSelected = vn.id === selectedNodeId;

          return (
            <div
              key={vn.id}
              className={`flowchart__node flowchart__node--${vn.nodeType} ${isEntry ? 'flowchart__node--entry' : ''} ${isSelected ? 'flowchart__node--selected' : ''}`}
              style={{ left: vn.x, top: vn.y }}
              onClick={() => {
                if (connectingFrom) {
                  connectNodes(vn.id);
                } else {
                  setSelectedNodeId(isSelected ? null : vn.id);
                }
              }}
            >
              {isEntry && <span className="flowchart__entry-badge">START</span>}
              <div className="flowchart__node-type">
                {vn.nodeType === 'condition' ? '◆' : '■'}
              </div>
              <div className="flowchart__node-label">
                {vn.nodeType === 'condition' && node.condition && 'type' in node.condition
                  ? ALL_CONDITIONS.find(c => c.type === (node.condition as InstructionCondition).type)?.label ?? node.condition.type
                  : `${ALL_ACTIONS.find(a => a.type === node.action.type)?.icon ?? ''} ${node.action.type}`
                }
              </div>
              {/* Connection Ports */}
              {vn.nodeType === 'condition' && (
                <div className="flowchart__ports">
                  <button
                    className="flowchart__port flowchart__port--true"
                    onClick={(e) => { e.stopPropagation(); setConnectingFrom({ nodeId: vn.id, port: 'true' }); }}
                    title="Connect TRUE branch"
                  >T</button>
                  <button
                    className="flowchart__port flowchart__port--false"
                    onClick={(e) => { e.stopPropagation(); setConnectingFrom({ nodeId: vn.id, port: 'false' }); }}
                    title="Connect FALSE branch"
                  >F</button>
                </div>
              )}
              {vn.nodeType === 'action' && (
                <div className="flowchart__ports">
                  <button
                    className="flowchart__port flowchart__port--true"
                    onClick={(e) => { e.stopPropagation(); setConnectingFrom({ nodeId: vn.id, port: 'true' }); }}
                    title="Connect NEXT"
                  >→</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Node Editor Panel */}
      {selectedNode && selectedNodeId && (
        <div className="flowchart__editor">
          <div className="flowchart__editor-header">
            <strong>Edit: {selectedNodeId.slice(0, 12)}</strong>
            {selectedNodeId !== instructions.entryNodeId && (
              <button className="flowchart__btn flowchart__btn--delete" onClick={() => deleteNode(selectedNodeId)}>
                🗑 Delete
              </button>
            )}
            {selectedNodeId !== instructions.entryNodeId && (
              <button className="flowchart__btn" onClick={() => setEntryNode(selectedNodeId)}>
                Set as Entry
              </button>
            )}
          </div>

          {/* Condition Editor */}
          {selectedNode.condition && 'type' in selectedNode.condition && (
            <div className="flowchart__editor-section">
              <label className="flowchart__editor-label">Condition</label>
              <select
                className="flowchart__editor-select"
                value={(selectedNode.condition as InstructionCondition).type}
                onChange={(e) => {
                  const condDef = ALL_CONDITIONS.find(c => c.type === e.target.value)!;
                  const cond: InstructionCondition = { type: e.target.value as ConditionType };
                  if (condDef.hasThreshold) cond.threshold = condDef.defaultThreshold;
                  updateNode(selectedNodeId, { condition: cond });
                }}
              >
                {ALL_CONDITIONS.map(c => (
                  <option key={c.type} value={c.type}>{c.label}</option>
                ))}
              </select>
              {ALL_CONDITIONS.find(c => c.type === (selectedNode.condition as InstructionCondition).type)?.hasThreshold && (
                <input
                  className="flowchart__editor-input"
                  type="number"
                  value={(selectedNode.condition as InstructionCondition).threshold ?? 0}
                  onChange={(e) => {
                    updateNode(selectedNodeId, {
                      condition: { ...(selectedNode.condition as InstructionCondition), threshold: Number(e.target.value) },
                    });
                  }}
                  min={0} max={10000}
                />
              )}

              {/* Compound condition toggle */}
              <button
                className="flowchart__btn flowchart__btn--small"
                onClick={() => {
                  const compound: CompoundCondition = {
                    operator: 'and',
                    conditions: [selectedNode.condition as InstructionCondition, { type: 'always' }],
                  };
                  updateNode(selectedNodeId, { condition: compound });
                }}
              >
                + Compound (AND/OR)
              </button>
            </div>
          )}

          {/* Compound condition editor */}
          {selectedNode.condition && 'operator' in selectedNode.condition && (
            <div className="flowchart__editor-section">
              <label className="flowchart__editor-label">Compound Condition</label>
              <select
                className="flowchart__editor-select"
                value={(selectedNode.condition as CompoundCondition).operator}
                onChange={(e) => {
                  updateNode(selectedNodeId, {
                    condition: { ...(selectedNode.condition as CompoundCondition), operator: e.target.value as LogicalOperator },
                  });
                }}
              >
                <option value="and">AND — all must be true</option>
                <option value="or">OR — any must be true</option>
                <option value="not">NOT — inverts result</option>
              </select>
              <div className="flowchart__compound-list">
                {(selectedNode.condition as CompoundCondition).conditions.map((sub, i) => (
                  <div key={i} className="flowchart__compound-item">
                    {'type' in sub && (
                      <select
                        className="flowchart__editor-select"
                        value={sub.type}
                        onChange={(e) => {
                          const compound = selectedNode.condition as CompoundCondition;
                          const newConds = [...compound.conditions];
                          newConds[i] = { type: e.target.value as ConditionType };
                          updateNode(selectedNodeId, { condition: { ...compound, conditions: newConds } });
                        }}
                      >
                        {ALL_CONDITIONS.map(c => (
                          <option key={c.type} value={c.type}>{c.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
                <button
                  className="flowchart__btn flowchart__btn--small"
                  onClick={() => {
                    const compound = selectedNode.condition as CompoundCondition;
                    updateNode(selectedNodeId, {
                      condition: { ...compound, conditions: [...compound.conditions, { type: 'always' }] },
                    });
                  }}
                >
                  + Add Sub-Condition
                </button>
              </div>
            </div>
          )}

          {/* Action Editor */}
          <div className="flowchart__editor-section">
            <label className="flowchart__editor-label">Action</label>
            <select
              className="flowchart__editor-select"
              value={selectedNode.action.type}
              onChange={(e) => {
                updateNode(selectedNodeId, { action: { type: e.target.value as DominionActionType } });
              }}
            >
              {ALL_ACTIONS.map(a => (
                <option key={a.type} value={a.type}>{a.icon} {a.label}</option>
              ))}
            </select>

            {/* Target selector with map-click */}
            {ALL_ACTIONS.find(a => a.type === selectedNode.action.type)?.needsTarget && (
              <div className="flowchart__target-row">
                <span className="flowchart__target-label">Target:</span>
                <span className="flowchart__target-value">{selectedNode.action.targetNodeId ?? 'None'}</span>
                <button
                  className={`flowchart__btn flowchart__btn--small ${listeningNodeId === selectedNodeId ? 'flowchart__btn--listening' : ''}`}
                  onClick={() => {
                    if (listeningNodeId === selectedNodeId && selectedTargetNodeId) {
                      applyMapTarget();
                    } else {
                      setListeningNodeId(selectedNodeId);
                    }
                  }}
                >
                  {listeningNodeId === selectedNodeId ? '⦿ Click map...' : '🎯 Pick'}
                </button>
              </div>
            )}
          </div>

          {/* Connection Info */}
          <div className="flowchart__editor-section">
            <label className="flowchart__editor-label">Connections</label>
            <div className="flowchart__connection-info">
              <span>TRUE → {selectedNode.trueNextId ?? 'none'}</span>
              {selectedNode.trueNextId && (
                <button className="flowchart__btn flowchart__btn--small flowchart__btn--delete"
                  onClick={() => updateNode(selectedNodeId, { trueNextId: undefined })}>✕</button>
              )}
            </div>
            {selectedNode.condition && (
              <div className="flowchart__connection-info">
                <span>FALSE → {selectedNode.falseNextId ?? 'none'}</span>
                {selectedNode.falseNextId && (
                  <button className="flowchart__btn flowchart__btn--small flowchart__btn--delete"
                    onClick={() => updateNode(selectedNodeId, { falseNextId: undefined })}>✕</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
