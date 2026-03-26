import { useState } from 'react';
import type { GameState, PlayerId } from '@shattered-covenant/shared';

interface MissionPanelProps {
  gameState: GameState;
  playerId: PlayerId;
}

export function MissionPanel({ gameState, playerId }: MissionPanelProps) {
  const player = gameState.players[playerId];
  if (!player) return null;

  const [expanded, setExpanded] = useState(false);
  const activeMissions = player.missions.filter(m => !m.completed);
  const completedMissions = player.missions.filter(m => m.completed);

  return (
    <div className="turn-panel__section" style={{ border: '1px solid #6366f1', padding: '8px', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.05)' }}>
      <div 
        className="turn-panel__label" 
        style={{ color: '#818cf8', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', margin: 0 }}
        onClick={() => setExpanded(!expanded)}
      >
        <span>📜 Secret Missions ({activeMissions.length} Active)</span>
        <span>{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {activeMissions.length === 0 && (
            <div style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>No active missions.</div>
          )}

          {activeMissions.map(m => (
            <div key={m.id} style={{ border: '1px solid #4f46e5', backgroundColor: '#312e81', padding: '8px', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#a5b4fc', marginBottom: '4px' }}>{m.title}</div>
              <div style={{ fontSize: '11px', color: '#c7d2fe', marginBottom: '8px' }}>{m.description}</div>
              
              <div style={{ fontSize: '10px', color: '#818cf8', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {m.conditions.map((c, i) => (
                   <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <span>{c.description}</span>
                     <span>{c.progress} {c.threshold ? `/ ${c.threshold}` : ''}</span>
                   </div>
                ))}
              </div>

              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #4f46e5', fontSize: '10px', color: '#fbbf24' }}>
                Reward: {m.rewards.map(r => r.description).join(' + ')}
              </div>
            </div>
          ))}

          {completedMissions.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Completed Missions:</div>
              {completedMissions.map(m => (
                <div key={m.id} style={{ fontSize: '10px', color: '#4ade80', marginBottom: '2px' }}>
                  ✓ {m.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
