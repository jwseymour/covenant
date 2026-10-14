/**
 * CombatCardPanel — displays player's combat card hand.
 *
 * GDD §5.2: "Special combat cards [TOGGLEABLE] — one-time effects
 * played during combat. Earned from rites, relics, or missions."
 */

import { useState } from 'react';
import type { CombatCard, GameState, PlayerId } from '@shattered-covenant/shared';
import './styles/combat-cards.css';

interface CombatCardPanelProps {
  gameState: GameState;
  playerId: PlayerId;
  onPlayCard?: (card: CombatCard) => void;
}

const CARD_ICONS: Record<string, string> = {
  ambush: '🗡',
  zealous_charge: '⚡',
  fortify: '🏰',
  feigned_retreat: '🎭',
  divine_intervention: '✦',
  scorched_earth: '🔥',
  flanking_manoeuvre: '🔱',
  shield_wall: '🛡',
};

export function CombatCardPanel({ gameState, playerId, onPlayCard }: CombatCardPanelProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  if (!gameState.config.combatCardsEnabled) return null;

  const player = gameState.players[playerId];
  if (!player) return null;

  const cards = player.combatCards ?? [];
  const playable = cards.filter(c => !c.used);
  const used = cards.filter(c => c.used);

  if (cards.length === 0) {
    return (
      <div className="combat-cards">
        <div className="combat-cards__header">
          <h4>Combat Cards</h4>
          <span className="combat-cards__badge">0</span>
        </div>
        <div className="combat-cards__empty">
          No cards yet. Earn cards from rites, relics, or missions.
        </div>
      </div>
    );
  }

  return (
    <div className="combat-cards">
      <div className="combat-cards__header">
        <h4>Combat Cards</h4>
        <span className="combat-cards__badge">{playable.length}</span>
      </div>

      <div className="combat-cards__hand">
        {playable.map((card) => (
          <div
            key={card.id}
            className={`combat-cards__card ${selectedCard === card.id ? 'combat-cards__card--selected' : ''}`}
            onClick={() => setSelectedCard(selectedCard === card.id ? null : card.id)}
          >
            <div className="combat-cards__card-header">
              <span className="combat-cards__card-icon">{CARD_ICONS[card.type] ?? '⚔'}</span>
              <span className="combat-cards__card-name">{card.name}</span>
            </div>
            <div className="combat-cards__card-desc">{card.description}</div>
            <div className="combat-cards__card-stats">
              {card.attackModifier !== 1.0 && (
                <span className={`combat-cards__stat ${card.attackModifier > 1 ? 'combat-cards__stat--buff' : 'combat-cards__stat--debuff'}`}>
                  ATK {card.attackModifier > 1 ? '+' : ''}{Math.round((card.attackModifier - 1) * 100)}%
                </span>
              )}
              {card.defenceModifier !== 1.0 && (
                <span className={`combat-cards__stat ${card.defenceModifier > 1 ? 'combat-cards__stat--buff' : 'combat-cards__stat--debuff'}`}>
                  DEF {card.defenceModifier > 1 ? '+' : ''}{Math.round((card.defenceModifier - 1) * 100)}%
                </span>
              )}
              {card.casualtyModifier !== 1.0 && (
                <span className={`combat-cards__stat ${card.casualtyModifier < 1 ? 'combat-cards__stat--buff' : 'combat-cards__stat--debuff'}`}>
                  CAS {card.casualtyModifier < 1 ? '' : '+'}{Math.round((card.casualtyModifier - 1) * 100)}%
                </span>
              )}
            </div>
            {selectedCard === card.id && onPlayCard && (
              <button
                className="combat-cards__play-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayCard(card);
                  setSelectedCard(null);
                }}
              >
                ⚔ Play Card
              </button>
            )}
          </div>
        ))}
      </div>

      {used.length > 0 && (
        <div className="combat-cards__used">
          <div className="combat-cards__used-label">Used ({used.length})</div>
          <div className="combat-cards__used-list">
            {used.map((card) => (
              <span key={card.id} className="combat-cards__used-card">
                {CARD_ICONS[card.type] ?? '⚔'} {card.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
