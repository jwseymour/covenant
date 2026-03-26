/**
 * WebSocket message protocol — defines all messages between client and server.
 *
 * Every message has a 'type' discriminant for routing.
 */

import type { PlayerId } from './player.js';
import type { GameState } from './game-state.js';

/** All message type discriminants */
export const MessageType = {
    // Client → Server
    CREATE_GAME: 'create_game',
    LIST_GAMES: 'list_games',
    JOIN_GAME: 'join_game',
    LEAVE_GAME: 'leave_game',
    START_GAME: 'start_game',
    SUBMIT_TURN: 'submit_turn',
    PING: 'ping',

    // Server → Client
    WELCOME: 'welcome',
    GAME_LIST: 'game_list',
    GAME_CREATED: 'game_created',
    GAME_JOINED: 'game_joined',
    GAME_STARTED: 'game_started',
    PLAYER_JOINED: 'player_joined',
    PLAYER_LEFT: 'player_left',
    GAME_STATE_UPDATE: 'game_state_update',
    TURN_RESOLVED: 'turn_resolved',
    ERROR: 'error',
    PONG: 'pong',
} as const;

// ─── Lobby Types ────────────────────────────────────────────────

/** Summary of a game visible in the lobby. */
export interface GameLobbyInfo {
    gameId: string;
    hostName: string;
    playerCount: number;
    maxPlayers: number;
    status: 'waiting' | 'in_progress' | 'finished';
    createdAt: number;
}

// === Client → Server messages ===

export interface CreateGameMessage {
    type: typeof MessageType.CREATE_GAME;
    playerName: string;
}

export interface ListGamesMessage {
    type: typeof MessageType.LIST_GAMES;
}

export interface JoinGameMessage {
    type: typeof MessageType.JOIN_GAME;
    playerName: string;
    gameId: string;
}

export interface LeaveGameMessage {
    type: typeof MessageType.LEAVE_GAME;
}

export interface StartGameMessage {
    type: typeof MessageType.START_GAME;
}

export interface SubmitTurnMessage {
    type: typeof MessageType.SUBMIT_TURN;
    actions: unknown[];
    confrontationStance?: { stance: 'confront' | 'coexist' | 'retreat'; bid: number };
}

export interface PingMessage {
    type: typeof MessageType.PING;
    timestamp: number;
}

export type ClientMessage =
    | CreateGameMessage
    | ListGamesMessage
    | JoinGameMessage
    | LeaveGameMessage
    | StartGameMessage
    | SubmitTurnMessage
    | PingMessage;

// === Server → Client messages ===

export interface WelcomeMessage {
    type: typeof MessageType.WELCOME;
    playerId: PlayerId;
}

export interface GameListMessage {
    type: typeof MessageType.GAME_LIST;
    games: GameLobbyInfo[];
}

export interface GameCreatedMessage {
    type: typeof MessageType.GAME_CREATED;
    gameId: string;
    hostPlayerId: PlayerId;
}

export interface GameJoinedMessage {
    type: typeof MessageType.GAME_JOINED;
    playerId: PlayerId;
    gameState: GameState;
}

export interface GameStartedMessage {
    type: typeof MessageType.GAME_STARTED;
    gameState: GameState;
}

export interface PlayerJoinedMessage {
    type: typeof MessageType.PLAYER_JOINED;
    playerId: PlayerId;
    playerName: string;
}

export interface PlayerLeftMessage {
    type: typeof MessageType.PLAYER_LEFT;
    playerId: PlayerId;
}

export interface GameStateUpdateMessage {
    type: typeof MessageType.GAME_STATE_UPDATE;
    gameState: GameState;
}

export interface TurnResolvedMessage {
    type: typeof MessageType.TURN_RESOLVED;
    turnNumber: number;
    gameState: GameState;
}

export interface ErrorMessage {
    type: typeof MessageType.ERROR;
    message: string;
    code?: string;
}

export interface PongMessage {
    type: typeof MessageType.PONG;
    timestamp: number;
    serverTimestamp: number;
}

export type ServerMessage =
    | WelcomeMessage
    | GameListMessage
    | GameCreatedMessage
    | GameJoinedMessage
    | GameStartedMessage
    | PlayerJoinedMessage
    | PlayerLeftMessage
    | GameStateUpdateMessage
    | TurnResolvedMessage
    | ErrorMessage
    | PongMessage;

/** Union of all WebSocket messages */
export type WebSocketMessage = ClientMessage | ServerMessage;
