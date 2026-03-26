import type { GameState, PlayerId } from '@shattered-covenant/shared';

export interface ConfrontationStance {
  stance: 'confront' | 'coexist' | 'retreat';
  bid: number;
}

interface ConfrontationPanelProps {
  gameState: GameState;
  playerId: PlayerId;
  stance: ConfrontationStance | null;
  onChange: (stance: ConfrontationStance) => void;
}

export function ConfrontationPanel({ gameState, playerId, stance, onChange }: ConfrontationPanelProps) {
  const player = gameState.players[playerId];
  if (!player) return null;

  // Check for co-located players
  const coLocatedPids = Object.keys(gameState.players).filter(pid => 
    pid !== playerId && gameState.players[pid as PlayerId]?.currentNodeId === player.currentNodeId
  ) as PlayerId[];

  if (coLocatedPids.length === 0) return null;

  const handleSelectStance = (s: 'confront' | 'coexist' | 'retreat') => {
    onChange({ stance: s, bid: stance?.bid || 0 });
  };

  const handleBidChange = (bid: number) => {
    onChange({ stance: stance?.stance || 'confront', bid });
  };

  return (
    <div className="turn-panel__section" style={{ border: '2px solid #ef4444', padding: '12px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
      <div className="turn-panel__label" style={{ color: '#ef4444', fontSize: '14px', marginBottom: '8px' }}>
        ⚠️ Hostile Co-location
      </div>
      <div style={{ color: '#fca5a5', fontSize: '11px', marginBottom: '12px', lineHeight: 1.4 }}>
        You share this location with {coLocatedPids.map(id => gameState.players[id]?.name).join(', ')}. 
        You must declare a confrontation stance for this turn.
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button 
          onClick={() => handleSelectStance('confront')}
          style={{ flex: 1, padding: '8px 4px', fontSize: '12px', backgroundColor: stance?.stance === 'confront' ? '#7f1d1d' : '#450a0a', color: '#fca5a5', border: stance?.stance === 'confront' ? '1px solid #ef4444' : '1px solid #7f1d1d', borderRadius: '4px', cursor: 'pointer' }}
        >
          ⚔ Confront
        </button>
        <button 
          onClick={() => handleSelectStance('coexist')}
          style={{ flex: 1, padding: '8px 4px', fontSize: '12px', backgroundColor: stance?.stance === 'coexist' ? '#1e3a8a' : '#172554', color: '#93c5fd', border: stance?.stance === 'coexist' ? '1px solid #3b82f6' : '1px solid #1e3a8a', borderRadius: '4px', cursor: 'pointer' }}
        >
          🤝 Coexist
        </button>
        <button 
          onClick={() => handleSelectStance('retreat')}
          style={{ flex: 1, padding: '8px 4px', fontSize: '12px', backgroundColor: stance?.stance === 'retreat' ? '#4b5563' : '#1f2937', color: '#d1d5db', border: stance?.stance === 'retreat' ? '1px solid #9ca3af' : '1px solid #374151', borderRadius: '4px', cursor: 'pointer' }}
        >
          🏃 Retreat
        </button>
      </div>

      {stance?.stance === 'confront' && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '4px' }}>
            Secret Soul Bid: {stance.bid} 
            <span style={{ color: '#9ca3af', marginLeft: '8px' }}>(Balance: {player.soulLedger.balance})</span>
          </div>
          <input 
            type="range" 
            min={0} 
            max={player.soulLedger.balance} 
            value={stance.bid} 
            onChange={(e) => handleBidChange(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#ef4444' }}
          />
          <div style={{ fontSize: '10px', color: '#fca5a5', marginTop: '4px', fontStyle: 'italic' }}>
            The highest bid dominates. Losers forfeit their AP and are expelled prior to action execution.
          </div>
        </div>
      )}

      {stance?.stance === 'retreat' && (
        <div style={{ fontSize: '10px', color: '#d1d5db', fontStyle: 'italic' }}>
          You will automatically be expelled to a random adjacent node before actions trigger, losing all AP.
        </div>
      )}

      {stance?.stance === 'coexist' && (
        <div style={{ fontSize: '10px', color: '#93c5fd', fontStyle: 'italic' }}>
          Treated as a 0-bid. If other players Confront, you will lose and be expelled.
        </div>
      )}
      
      {!stance && (
        <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
          You must select a stance before submitting your turn.
        </div>
      )}
    </div>
  );
}
