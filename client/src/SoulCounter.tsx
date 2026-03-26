/**
 * SoulCounter — always-visible soul balance display with income breakdown.
 *
 * GDD §2.5: "Win condition: Most souls at the Convergence wins."
 * "Core tension: Hoard for victory vs. spend for power."
 * lore_complete.md §5: "Each soul absorbed is a fragment of the old order's authority."
 */

import { useState, useMemo } from 'react';
import type { GameState, PlayerId } from '@shattered-covenant/shared';
import './styles/soul-counter.css';

interface SoulCounterProps {
  gameState: GameState;
  playerId: PlayerId;
}

export function SoulCounter({ gameState, playerId }: SoulCounterProps) {
  const [expanded, setExpanded] = useState(false);

  const player = gameState.players[playerId];
  if (!player) return null;

  const { soulLedger } = player;
  const totalIncome = soulLedger.currentTurnIncome.reduce((s, i) => s + i.amount, 0);

  // Group income by religion
  const incomeByReligion = useMemo(() => {
    const groups: Record<string, { name: string; amount: number; nodes: number }> = {};
    for (const income of soulLedger.currentTurnIncome) {
      if (income.source === 'religion' && income.religionId) {
        if (!groups[income.religionId]) {
          const rel = gameState.religions[income.religionId];
          groups[income.religionId] = { name: rel?.name ?? 'Unknown', amount: 0, nodes: 0 };
        }
        groups[income.religionId].amount += income.amount;
        groups[income.religionId].nodes++;
      }
    }
    return groups;
  }, [soulLedger.currentTurnIncome, gameState.religions]);

  // Win condition tracking
  const convergenceTurn = gameState.config.targetConvergenceTurn;
  const turnsLeft = Math.max(0, convergenceTurn - gameState.turnNumber);

  return (
    <div className="soul-counter">
      {/* Main balance — always visible */}
      <button
        className="soul-counter__main"
        onClick={() => setExpanded(!expanded)}
        title="Click to view soul details"
      >
        <span className="soul-counter__icon">☽</span>
        <span className="soul-counter__balance">{soulLedger.balance}</span>
        {totalIncome > 0 && (
          <span className="soul-counter__income">+{totalIncome}/turn</span>
        )}
        <span className="soul-counter__toggle">{expanded ? '▾' : '▸'}</span>
      </button>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="soul-counter__details">
          {/* Win condition */}
          <div className="soul-counter__win-row">
            <span className="soul-counter__win-label">☽ Convergence</span>
            <span className="soul-counter__win-turns">
              {turnsLeft > 0 ? `${turnsLeft} turns` : 'NOW'}
            </span>
          </div>

          {/* Statistics */}
          <div className="soul-counter__stat-grid">
            <div className="soul-counter__stat">
              <span className="soul-counter__stat-label">Balance</span>
              <span className="soul-counter__stat-value">{soulLedger.balance}</span>
            </div>
            <div className="soul-counter__stat">
              <span className="soul-counter__stat-label">Earned</span>
              <span className="soul-counter__stat-value soul-counter__stat-value--earned">{soulLedger.totalEarned}</span>
            </div>
            <div className="soul-counter__stat">
              <span className="soul-counter__stat-label">Spent</span>
              <span className="soul-counter__stat-value soul-counter__stat-value--spent">{soulLedger.totalSpent}</span>
            </div>
            <div className="soul-counter__stat">
              <span className="soul-counter__stat-label">Income</span>
              <span className="soul-counter__stat-value soul-counter__stat-value--income">+{totalIncome}</span>
            </div>
          </div>

          {/* Income breakdown by religion */}
          {Object.keys(incomeByReligion).length > 0 && (
            <div className="soul-counter__breakdown">
              <div className="soul-counter__breakdown-label">Income Sources</div>
              {Object.entries(incomeByReligion).map(([relId, data]) => (
                <div key={relId} className="soul-counter__breakdown-row">
                  <span className="soul-counter__breakdown-name">
                    ✦ {data.name}
                  </span>
                  <span className="soul-counter__breakdown-meta">
                    {data.nodes} nodes
                  </span>
                  <span className="soul-counter__breakdown-amount">
                    +{data.amount}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Ritual costs reference */}
          <div className="soul-counter__costs">
            <div className="soul-counter__costs-label">Ritual Costs</div>
            <div className="soul-counter__cost-row">
              <span>Rite of Sight</span><span>50</span>
            </div>
            <div className="soul-counter__cost-row">
              <span>Rite of Binding</span><span>150</span>
            </div>
            <div className="soul-counter__cost-row">
              <span>Rite of Severance</span><span>150</span>
            </div>
            <div className="soul-counter__cost-row">
              <span>Sacred Festival</span><span>25</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
