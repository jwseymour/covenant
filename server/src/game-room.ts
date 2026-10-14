/**
 * GameRoom — server-side game room that manages a single game session.
 *
 * Handles:
 * - Player join/leave
 * - Host-triggered start
 * - Turn submission collection
 * - Automatic turn resolution when all submitted
 * - Broadcasting updates
 */

import { WebSocket } from 'ws';
import {
  MessageType,
  createInitialGameState,
  resolveTurn,
  generateAllRealmGraphs,
} from '@shattered-covenant/shared';
import type {
  GameState,
  PlayerId,
  ServerMessage,
  M2TurnAction,
  M2TurnSubmission,
  RealmId,
} from '@shattered-covenant/shared';
import { createMockRealmStatesServer } from './mock-realm-states.js';

// ─── Types ──────────────────────────────────────────────────────

interface ConnectedPlayer {
  id: PlayerId;
  name: string;
  colour: string;
  ws: WebSocket;
}

const PLAYER_COLOURS = ['#5a6882', '#7a4a7a', '#3a7a5a', '#8a3a2a'];

// ─── GameRoom ───────────────────────────────────────────────────

export class GameRoom {
  readonly id: string;
  readonly hostName: string;
  readonly createdAt: number;
  private hostPlayerId: PlayerId | null = null;
  private players = new Map<PlayerId, ConnectedPlayer>();
  private state: GameState | null = null;
  private pendingSubmissions = new Map<PlayerId, M2TurnSubmission>();
  private started = false;

  constructor(id: string, hostName: string) {
    this.id = id;
    this.hostName = hostName;
    this.createdAt = Date.now();
    console.log(`[Room ${id}] Created by "${hostName}"`);
  }

  get playerCount(): number { return this.players.size; }
  get isStarted(): boolean { return this.started; }

  /** Get list of player names in this room. */
  getPlayerNames(): string[] {
    return Array.from(this.players.values()).map((p) => p.name);
  }

  // ─── Player Management ──────────────────────────────────────

  addPlayer(playerId: PlayerId, name: string, ws: WebSocket): void {
    if (this.players.size >= 4) {
      this.send(ws, { type: MessageType.ERROR, message: 'Game is full', code: 'FULL' });
      return;
    }

    const colour = PLAYER_COLOURS[this.players.size % PLAYER_COLOURS.length];
    this.players.set(playerId, { id: playerId, name, colour, ws });

    if (!this.hostPlayerId) this.hostPlayerId = playerId;

    console.log(`[Room ${this.id}] "${name}" joined (${this.players.size}/4)`);

    // Broadcast to everyone in the room
    this.broadcast({
      type: MessageType.PLAYER_JOINED,
      playerId,
      playerName: name,
    });

    // Send lobby state to the joiner
    this.send(ws, {
      type: MessageType.GAME_JOINED,
      playerId,
      gameState: this.state ?? this.createLobbyState(),
    });
  }

  removePlayer(playerId: PlayerId): void {
    this.players.delete(playerId);
    this.pendingSubmissions.delete(playerId);
    console.log(`[Room ${this.id}] ${playerId} left (${this.players.size} remaining)`);
    this.broadcast({ type: MessageType.PLAYER_LEFT, playerId });
  }

  hasPlayer(playerId: PlayerId): boolean {
    return this.players.has(playerId);
  }

  // ─── Game Lifecycle ─────────────────────────────────────────

  /** Host starts the game manually. */
  startGame(): void {
    if (this.started) return;
    if (this.players.size < 2) return;

    this.started = true;
    console.log(`[Room ${this.id}] Game started with ${this.players.size} players`);

    const realmGraphs = generateAllRealmGraphs(Date.now() % 100000);
    const realmStates = createMockRealmStatesServer();

    const playerData = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      colour: p.colour,
    }));

    this.state = createInitialGameState(playerData, realmGraphs, realmStates);

    // Broadcast game started
    for (const player of this.players.values()) {
      this.send(player.ws, {
        type: MessageType.GAME_STARTED,
        gameState: this.filterStateForPlayer(this.state, player.id),
      });
    }
  }

  // ─── Turn Submission ────────────────────────────────────────

  submitTurn(playerId: PlayerId, actions: M2TurnAction[], confrontationStance?: any): void {
    if (!this.state) return;

    const submission: M2TurnSubmission = { playerId, actions, confrontationStance };
    this.pendingSubmissions.set(playerId, submission);

    if (this.state.players[playerId]) {
      this.state.players[playerId].hasSubmittedTurn = true;
    }

    console.log(`[Room ${this.id}] ${playerId} submitted turn (${this.pendingSubmissions.size}/${this.players.size})`);

    this.broadcastFilteredState();

    if (this.pendingSubmissions.size >= this.players.size) {
      this.resolveTurn();
    }
  }

  private resolveTurn(): void {
    if (!this.state) return;

    console.log(`[Room ${this.id}] Resolving turn ${this.state.turnNumber + 1}...`);

    const submissions = Array.from(this.pendingSubmissions.values());
    const { newState, events } = resolveTurn(this.state, submissions);

    this.state = newState;
    this.pendingSubmissions.clear();

    console.log(`[Room ${this.id}] Turn ${newState.turnNumber} resolved — ${events.length} events`);
    for (const event of events) {
      console.log(`  • ${event.message}`);
    }

    for (const player of this.players.values()) {
      this.send(player.ws, {
        type: MessageType.TURN_RESOLVED,
        turnNumber: newState.turnNumber,
        gameState: this.filterStateForPlayer(this.state, player.id),
      });
    }
  }

  // ─── State Filtering ────────────────────────────────────────

  private filterStateForPlayer(state: GameState, playerId: PlayerId): GameState {
    // Enforce all GDD §4.8 visibility rules.
    // The client currently expects GameState shape — full PlayerView migration is future work.
    const filteredPlayers = { ...state.players };
    for (const [pid, player] of Object.entries(filteredPlayers)) {
      if (pid === playerId) continue;
      filteredPlayers[pid as PlayerId] = {
        ...player,
        soulLedger: {
          ...player.soulLedger,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          currentTurnIncome: [],
          history: [],
        },
        missions: [],
        intel: [],
      };
    }

    // Hide other players' dominion instructions and exact influence
    const filteredDominions = { ...state.dominions };
    for (const [did, dom] of Object.entries(filteredDominions)) {
      if (dom.ownerId === playerId) continue;
      filteredDominions[did] = {
        ...dom,
        instructions: null,
        scoutReports: [],
      };
    }

    // Hide other players' religion instructions and exact follower counts
    const filteredReligions = { ...state.religions };
    for (const [rid, rel] of Object.entries(filteredReligions)) {
      if (rel.founderId === playerId) continue;
      filteredReligions[rid] = {
        ...rel,
        instructions: null,
        stability: 0, // Hidden
        soulsPerTurn: 0, // Hidden
      };
    }

    return {
      ...state,
      players: filteredPlayers,
      dominions: filteredDominions,
      religions: filteredReligions,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private createLobbyState(): GameState {
    return {
      gameId: this.id,
      turnNumber: 0,
      phase: 'lobby',
      config: {
        beliefTagsEnabled: false,
        combatCardsEnabled: false,
        sunderingEnabled: false,
        maxPlayers: 4,
        targetConvergenceTurn: 35,
        maxInstructionNodes: 8,
      },
      players: {},
      turnOrder: [],
      realmGraphs: {} as Record<RealmId, never>,
      realmStates: {} as Record<RealmId, never>,
      realmInteractions: [],
      dominions: {},
      religions: {},
      mergeZones: {},
      relics: {},
      siteRites: {},
      currentTurnSubmissions: {},
      activeConfrontations: [],
      activeCombats: [],
      combatResults: [],
      turnHistory: [],
      sundering: null,
    };
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: ServerMessage): void {
    for (const player of this.players.values()) {
      this.send(player.ws, message);
    }
  }

  private broadcastFilteredState(): void {
    if (!this.state) return;
    for (const player of this.players.values()) {
      this.send(player.ws, {
        type: MessageType.GAME_STATE_UPDATE,
        gameState: this.filterStateForPlayer(this.state, player.id),
      });
    }
  }
}
