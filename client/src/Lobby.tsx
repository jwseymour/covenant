/**
 * Lobby — game list + create/join flow.
 *
 * Shows available games, lets players create a new game or join
 * an existing one. Transitions to waiting room when in a game.
 */

import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from './store/game-store';
import type { GameLobbyInfo } from '@shattered-covenant/shared';

export function Lobby() {
  const gameList = useGameStore((s) => s.gameList);
  const playerId = useGameStore((s) => s.playerId);
  const playerName = useGameStore((s) => s.playerName);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const createGame = useGameStore((s) => s.createGame);
  const joinGame = useGameStore((s) => s.joinGame);
  const refreshGameList = useGameStore((s) => s.refreshGameList);

  const [nameInput, setNameInput] = useState(playerName);

  // Refresh game list periodically
  useEffect(() => {
    const interval = setInterval(refreshGameList, 3000);
    return () => clearInterval(interval);
  }, [refreshGameList]);

  const getName = useCallback(() => {
    const name = nameInput.trim() || `Ordained ${(playerId ?? '').slice(0, 4)}`;
    setPlayerName(name);
    return name;
  }, [nameInput, playerId, setPlayerName]);

  const handleCreate = useCallback(() => {
    createGame(getName());
  }, [createGame, getName]);

  const handleJoin = useCallback((gameId: string) => {
    joinGame(getName(), gameId);
  }, [joinGame, getName]);

  const waitingGames = gameList.filter((g) => g.status === 'waiting');
  const activeGames = gameList.filter((g) => g.status === 'in_progress');

  return (
    <div className="lobby">
      <div className="lobby__hero">
        <h1 className="lobby__title">The Shattered Covenant</h1>
        <p className="lobby__subtitle">Five realms drift through the void. The Ordained awaken.</p>
      </div>

      {/* Name Input */}
      <div className="lobby__name-section">
        <label className="lobby__label">Your Name, Ordained</label>
        <input
          type="text"
          className="lobby__name-input"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Enter your name..."
        />
      </div>

      {/* Create Game */}
      <button className="lobby__create-btn" onClick={handleCreate}>
        ✦ Create New Game
      </button>

      {/* Game List */}
      <div className="lobby__section">
        <div className="lobby__section-header">
          <h3>Available Games</h3>
          <button className="lobby__refresh-btn" onClick={refreshGameList}>↻</button>
        </div>

        {waitingGames.length === 0 && activeGames.length === 0 && (
          <div className="lobby__empty">
            No games yet. Create one to begin.
          </div>
        )}

        {waitingGames.length > 0 && (
          <div className="lobby__game-list">
            {waitingGames.map((game) => (
              <GameCard key={game.gameId} game={game} onJoin={handleJoin} />
            ))}
          </div>
        )}

        {activeGames.length > 0 && (
          <>
            <div className="lobby__label" style={{ marginTop: '16px' }}>In Progress</div>
            <div className="lobby__game-list">
              {activeGames.map((game) => (
                <GameCard key={game.gameId} game={game} onJoin={handleJoin} disabled />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Waiting room — after creating/joining a game, before it starts. */
export function WaitingRoom() {
  const currentGameId = useGameStore((s) => s.currentGameId);
  const isHost = useGameStore((s) => s.isHost);
  const waitingPlayers = useGameStore((s) => s.waitingPlayers);
  const startGame = useGameStore((s) => s.startGame);
  const leaveGame = useGameStore((s) => s.leaveGame);

  return (
    <div className="lobby">
      <div className="lobby__hero">
        <h1 className="lobby__title">The Shattered Covenant</h1>
        <p className="lobby__subtitle">Gathering the Ordained...</p>
      </div>

      <div className="waiting-room">
        <div className="waiting-room__game-id">
          <span className="lobby__label">Game ID</span>
          <span className="waiting-room__id-value">{currentGameId}</span>
        </div>

        <div className="waiting-room__players">
          <span className="lobby__label">Players ({waitingPlayers.length}/4)</span>
          {waitingPlayers.map((name, i) => (
            <div key={i} className="waiting-room__player">
              <div className="waiting-room__player-dot" style={{ backgroundColor: ['#5a6882', '#7a4a7a', '#3a7a5a', '#8a3a2a'][i] }} />
              <span>{name}</span>
              {i === 0 && <span className="waiting-room__host-badge">HOST</span>}
            </div>
          ))}
          {Array.from({ length: 4 - waitingPlayers.length }).map((_, i) => (
            <div key={`empty-${i}`} className="waiting-room__player waiting-room__player--empty">
              <div className="waiting-room__player-dot" />
              <span>Waiting...</span>
            </div>
          ))}
        </div>

        <div className="waiting-room__actions">
          {isHost && waitingPlayers.length >= 2 && (
            <button className="lobby__create-btn" onClick={startGame}>
              ⚔ Start Game ({waitingPlayers.length} players)
            </button>
          )}
          {isHost && waitingPlayers.length < 2 && (
            <div className="lobby__empty">Need at least 2 Ordained to begin</div>
          )}
          <button className="waiting-room__leave-btn" onClick={leaveGame}>
            ← Leave Game
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Game Card ──────────────────────────────────────────────────

function GameCard({ game, onJoin, disabled }: { game: GameLobbyInfo; onJoin: (id: string) => void; disabled?: boolean }) {
  const age = Math.floor((Date.now() - game.createdAt) / 1000);
  const ageLabel = age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ago`;

  return (
    <div className={`game-card ${disabled ? 'game-card--disabled' : ''}`}>
      <div className="game-card__header">
        <span className="game-card__id">{game.gameId}</span>
        <span className={`game-card__status game-card__status--${game.status}`}>
          {game.status === 'waiting' ? 'Waiting' : 'In Progress'}
        </span>
      </div>
      <div className="game-card__details">
        <span>Host: {game.hostName}</span>
        <span>{game.playerCount}/{game.maxPlayers} players</span>
        <span>{ageLabel}</span>
      </div>
      {!disabled && (
        <button className="game-card__join-btn" onClick={() => onJoin(game.gameId)}>
          Join →
        </button>
      )}
    </div>
  );
}
