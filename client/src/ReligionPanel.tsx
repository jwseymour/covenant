/**
 * ReligionPanel — UI for founding religions, setting instructions, viewing stability.
 *
 * GDD §2.4: Religions are sacred oaths — fabricated belief systems that route souls.
 * GDD §4.3: Religion instructions are simpler than dominion flowcharts.
 */

import { useState, useCallback } from 'react';
import type {
  GameState, PlayerId, NodeId,
  Religion, ReligionId, BeliefTag,
  ReligionInstructionSet,
  M2TurnAction,
} from '@shattered-covenant/shared';
import { BELIEF_TAG_DEFINITIONS } from '@shattered-covenant/shared';
import './styles/religion-panel.css';

// ─── Belief Tag Groups ──────────────────────────────────────────

const REALM_TAG_GROUPS: { realm: string; label: string; colour: string; tags: BeliefTag[] }[] = [
  { realm: 'dominion', label: 'Dominion', colour: '#8a8a8a', tags: ['obedience', 'sacrifice', 'order'] },
  { realm: 'entropy', label: 'Entropy', colour: '#8b5cf6', tags: ['renewal', 'abandon', 'adaptation'] },
  { realm: 'communion', label: 'Communion', colour: '#06b6d4', tags: ['unity', 'empathy', 'communion'] },
  { realm: 'wrath', label: 'Wrath', colour: '#ef4444', tags: ['fury', 'defiance', 'conquest'] },
  { realm: 'memory', label: 'Memory', colour: '#d4a017', tags: ['remembrance', 'wisdom', 'tradition'] },
];

const INSTRUCTION_ACTIONS: { action: string; label: string; icon: string; desc: string }[] = [
  { action: 'spread_toward', label: 'Spread', icon: '🌊', desc: 'Expand toward a target' },
  { action: 'hold', label: 'Hold', icon: '⏸', desc: 'Consolidate, stop spreading' },
  { action: 'slow_spread', label: 'Cautious', icon: '🐢', desc: 'Slow spread rate, safer' },
  { action: 'fast_spread', label: 'Aggressive', icon: '⚡', desc: 'Fast spread, stability risk' },
  { action: 'resist_suppression', label: 'Resist', icon: '🛡', desc: 'Defend against attacks' },
  { action: 'holy_war', label: 'Holy War', icon: '⚔', desc: 'Oppose a rival religion' },
  { action: 'sacred_festival', label: 'Festival', icon: '✦', desc: 'Costs souls, boosts stability' },
];

// ─── Props ──────────────────────────────────────────────────────

interface ReligionPanelProps {
  gameState: GameState;
  playerId: PlayerId;
  selectedNodeId: NodeId | null;
  addAction: (action: M2TurnAction) => void;
  apRemaining: number;
  pendingActions?: M2TurnAction[];
}

// ─── Component ──────────────────────────────────────────────────

export function ReligionPanel({
  gameState, playerId, selectedNodeId, addAction, apRemaining, pendingActions = [],
}: ReligionPanelProps) {
  const player = gameState.players[playerId];
  if (!player) return null;

  const isCurrentLocation = selectedNodeId === player.currentNodeId;

  const [showFounder, setShowFounder] = useState(false);
  const [showInstructions, setShowInstructions] = useState<ReligionId | null>(null);

  // Founding state
  const [religionName, setReligionName] = useState('');
  const [selectedTags, setSelectedTags] = useState<BeliefTag[]>([]);

  // Instructions state
  const [selectedAction, setSelectedAction] = useState<string>('spread_toward');

  const toggleTag = useCallback((tag: BeliefTag) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 2) return prev; // Max 2
      return [...prev, tag];
    });
  }, []);

  const handleFound = useCallback(() => {
    if (!selectedNodeId || selectedTags.length !== 2 || !religionName.trim()) return;
    addAction({
      kind: 'found_religion',
      nodeId: selectedNodeId,
      realmId: player.currentRealmId,
      name: religionName.trim(),
      beliefTags: selectedTags as [BeliefTag, BeliefTag],
    });
    setShowFounder(false);
    setReligionName('');
    setSelectedTags([]);
  }, [selectedNodeId, selectedTags, religionName, addAction, player.currentRealmId]);

  const handleSetInstructions = useCallback((religionId: ReligionId) => {
    const instructions: ReligionInstructionSet = {
      instructions: [{
        action: selectedAction as 'spread_toward' | 'hold' | 'slow_spread' | 'fast_spread' | 'resist_suppression' | 'holy_war' | 'sacred_festival',
        priority: 0,
        ...(selectedAction === 'spread_toward' && selectedNodeId ? { targetNodeId: selectedNodeId } : {}),
      }],
      lastModifiedTurn: gameState.turnNumber,
    };
    addAction({
      kind: 'set_religion_instructions',
      religionId,
      instructions,
    });
    setShowInstructions(null);
  }, [selectedAction, selectedNodeId, gameState.turnNumber, addAction]);

  // Get stability colour
  const stabilityColour = (s: number) =>
    s > 60 ? '#4ade80' : s > 30 ? '#fbbf24' : '#f87171';

  const playerReligions = player.religionIds
    .map((id) => gameState.religions[id])
    .filter(Boolean) as Religion[];

  const pendingFoundActions = pendingActions.filter(a => a.kind === 'found_religion') as { kind: 'found_religion'; name: string; beliefTags: [BeliefTag, BeliefTag] | [] }[];
  
  const hasReligionsToDisplay = playerReligions.length > 0 || pendingFoundActions.length > 0;

  return (
    <div className="religion-panel">
      <div className="religion-panel__label">Religions</div>

      {/* Found Religion Button */}
      {!isCurrentLocation && selectedNodeId && (
        <div style={{ color: '#ffb366', fontSize: '11px', marginBottom: '8px' }}>
          Must be at your location ({player.currentNodeId.split('-').slice(-1)}) to found religions.
        </div>
      )}

      {isCurrentLocation && apRemaining > 0 && !showFounder && !showInstructions && (
        <button
          className="religion-panel__found-btn"
          onClick={() => setShowFounder(true)}
        >
          ✦ Found Religion (1 AP)
        </button>
      )}

      {/* Founder UI */}
      {showFounder && (
        <div className="religion-panel__founder">
          <div className="religion-panel__founder-header">
            <span>Found a Religion</span>
            <button className="religion-panel__close" onClick={() => setShowFounder(false)}>✕</button>
          </div>

          <input
            type="text"
            className="religion-panel__name-input"
            placeholder="Name your religion..."
            value={religionName}
            onChange={(e) => setReligionName(e.target.value)}
            maxLength={40}
          />

          <div className="religion-panel__tag-label">
            Choose 2 Belief Tags ({selectedTags.length}/2)
          </div>

          <div className="religion-panel__tag-groups">
            {REALM_TAG_GROUPS.map((group) => (
              <div key={group.realm} className="religion-panel__tag-group">
                <div
                  className="religion-panel__tag-realm"
                  style={{ color: group.colour }}
                >
                  {group.label}
                </div>
                {group.tags.map((tag) => {
                  const def = BELIEF_TAG_DEFINITIONS[tag];
                  const isSelected = selectedTags.includes(tag);
                  const isMatchingRealm = group.realm === player.currentRealmId;
                  return (
                    <button
                      key={tag}
                      className={`religion-panel__tag-btn ${isSelected ? 'religion-panel__tag-btn--selected' : ''} ${isMatchingRealm ? 'religion-panel__tag-btn--matching' : ''}`}
                      onClick={() => toggleTag(tag)}
                      disabled={selectedTags.length >= 2 && !isSelected}
                      style={isSelected ? { borderColor: group.colour } : {}}
                    >
                      <span className="religion-panel__tag-name">{def.name}</span>
                      <span className="religion-panel__tag-desc">{def.description}</span>
                      {isMatchingRealm && <span className="religion-panel__tag-match">✦ local</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <button
            className="religion-panel__confirm-btn"
            onClick={handleFound}
            disabled={selectedTags.length !== 2 || !religionName.trim()}
          >
            ✦ Found "{religionName || '...'}" ({selectedTags.length}/2 tags)
          </button>
        </div>
      )}

      {/* Instructions UI */}
      {showInstructions && (
        <div className="religion-panel__instructions">
          <div className="religion-panel__founder-header">
            <span>Set Commandments</span>
            <button className="religion-panel__close" onClick={() => setShowInstructions(null)}>✕</button>
          </div>
          <div className="religion-panel__instr-actions">
            {INSTRUCTION_ACTIONS.map((ia) => (
              <button
                key={ia.action}
                className={`religion-panel__instr-btn ${selectedAction === ia.action ? 'religion-panel__instr-btn--selected' : ''}`}
                onClick={() => setSelectedAction(ia.action)}
              >
                <span>{ia.icon}</span>
                <span className="religion-panel__instr-label">{ia.label}</span>
                <span className="religion-panel__instr-desc">{ia.desc}</span>
              </button>
            ))}
          </div>
          <button
            className="religion-panel__confirm-btn"
            onClick={() => handleSetInstructions(showInstructions)}
          >
            📜 Set Commandments (1 AP)
          </button>
        </div>
      )}

      {/* Existing and Pending Religions */}
      {hasReligionsToDisplay && !showFounder && !showInstructions && (
        <div className="religion-panel__list">
          {playerReligions.map((rel) => (
            <div key={rel.id} className="religion-panel__religion">
              <div className="religion-panel__rel-header">
                <span className="religion-panel__rel-name">{rel.name}</span>
                <span className="religion-panel__rel-nodes">{rel.nodeCount} nodes</span>
              </div>

              {/* Tags */}
              {rel.beliefTags.length > 0 && (
                <div className="religion-panel__rel-tags">
                  {rel.beliefTags.map((tag) => (
                    <span key={tag} className="religion-panel__rel-tag">
                      {BELIEF_TAG_DEFINITIONS[tag].name}
                    </span>
                  ))}
                </div>
              )}

              {/* Stability */}
              <div className="religion-panel__stability-row">
                <span style={{ fontSize: '9px', color: '#6b6760' }}>Stability</span>
                <span style={{ fontSize: '9px', color: stabilityColour(rel.stability) }}>
                  {rel.stability.toFixed(0)}
                  {rel.fractured && ' ⚠ FRACTURED'}
                </span>
              </div>
              <div className="religion-panel__stability-bar">
                <div
                  className="religion-panel__stability-fill"
                  style={{
                    width: `${rel.stability}%`,
                    backgroundColor: stabilityColour(rel.stability),
                  }}
                />
              </div>

              {/* Souls */}
              <div className="religion-panel__stat-row">
                <span>☽ {rel.soulsPerTurn} souls/turn</span>
                {rel.soulRoutingDisrupted && <span className="religion-panel__disrupted">DISRUPTED</span>}
              </div>

              {/* Current instruction */}
              <div className="religion-panel__stat-row">
                <span style={{ fontStyle: 'italic', color: '#6b6760' }}>
                  {rel.instructions
                    ? rel.instructions.instructions[0]?.action ?? 'None'
                    : 'No commandments set'}
                </span>
              </div>

              {/* Set Instructions button */}
              {apRemaining > 0 && (
                <button
                  className="religion-panel__set-instr-btn"
                  onClick={() => setShowInstructions(rel.id)}
                >
                  📜 Set Commandments (1 AP)
                </button>
              )}
            </div>
          ))}

          {/* Pending newly founded religions */}
          {pendingFoundActions.map((pending, idx) => (
            <div key={`pending-${idx}`} className="religion-panel__religion" style={{ border: '1px dashed #fbbf24', opacity: 0.9 }}>
              <div className="religion-panel__rel-header">
                <span className="religion-panel__rel-name">{pending.name} <span style={{fontSize: '10px', color: '#fbbf24'}}>(Pending Creation)</span></span>
                <span className="religion-panel__rel-nodes">1 node</span>
              </div>

              {pending.beliefTags.length > 0 && (
                <div className="religion-panel__rel-tags">
                  {pending.beliefTags.map((tag) => (
                    <span key={tag} className="religion-panel__rel-tag" style={{ borderStyle: 'dashed' }}>
                      {BELIEF_TAG_DEFINITIONS[tag].name}
                    </span>
                  ))}
                </div>
              )}

              {apRemaining > 0 && (
                <button
                  className="religion-panel__set-instr-btn"
                  onClick={() => setShowInstructions(`PENDING_RELIGION_${pending.name}`)}
                >
                  📜 Set Commandments (1 AP)
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasReligionsToDisplay && !showFounder && (
        <div className="religion-panel__empty">
          No religions founded yet
        </div>
      )}
    </div>
  );
}
