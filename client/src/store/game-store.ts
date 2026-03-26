/**
 * Zustand game store — client-side state management.
 *
 * Manages: connection, lobby, game state, UI state.
 */

import { create } from 'zustand';
import { MessageType } from '@shattered-covenant/shared';
import type { GameState, PlayerId, ServerMessage, M2TurnAction, NodeId, GameLobbyInfo } from '@shattered-covenant/shared';
import { gameWs, type ConnectionStatus } from '../network/ws-client';

export type AppScreen = 'lobby' | 'waiting_room' | 'game';

interface GameStore {
    // === Connection ===
    connectionStatus: ConnectionStatus;
    playerId: PlayerId | null;
    playerName: string;
    screen: AppScreen;

    // === Lobby ===
    gameList: GameLobbyInfo[];
    currentGameId: string | null;
    isHost: boolean;
    waitingPlayers: string[];

    // === Game State ===
    gameState: GameState | null;

    // === UI State ===
    selectedNodeId: NodeId | null;

    // === Actions ===
    connect: () => void;
    disconnect: () => void;
    createGame: (name: string) => void;
    joinGame: (name: string, gameId: string) => void;
    startGame: () => void;
    leaveGame: () => void;
    refreshGameList: () => void;
    submitTurn: (actions: M2TurnAction[]) => void;
    setSelectedNodeId: (nodeId: NodeId | null) => void;
    setPlayerName: (name: string) => void;
}

export const useGameStore = create<GameStore>((set) => {
    // Register WebSocket handlers
    gameWs.onStatusChange((status) => {
        set({ connectionStatus: status });
    });

    gameWs.onMessage((message: ServerMessage) => {
        switch (message.type) {
            case MessageType.WELCOME:
                console.log(`[Store] Welcome — assigned ID: ${message.playerId}`);
                set({ playerId: message.playerId });
                break;

            case MessageType.GAME_LIST:
                set({ gameList: message.games });
                break;

            case MessageType.GAME_CREATED:
                console.log(`[Store] Game created: ${message.gameId}`);
                set({ currentGameId: message.gameId, isHost: true, screen: 'waiting_room' });
                break;

            case MessageType.GAME_JOINED:
                console.log(`[Store] Joined game as ${message.playerId}`);
                set({
                    gameState: message.gameState,
                    currentGameId: message.gameState.gameId,
                    screen: message.gameState.phase === 'lobby' ? 'waiting_room' : 'game',
                });
                break;

            case MessageType.GAME_STARTED:
                console.log(`[Store] Game started!`);
                set({ gameState: message.gameState, screen: 'game' });
                break;

            case MessageType.GAME_STATE_UPDATE:
                set({ gameState: message.gameState });
                break;

            case MessageType.TURN_RESOLVED:
                console.log(`[Store] Turn ${message.turnNumber} resolved`);
                set({ gameState: message.gameState });
                break;

            case MessageType.PLAYER_JOINED:
                console.log(`[Store] Player joined: ${message.playerName}`);
                set((state) => ({
                    waitingPlayers: [...state.waitingPlayers.filter((n) => n !== message.playerName), message.playerName],
                }));
                break;

            case MessageType.PLAYER_LEFT:
                console.log(`[Store] Player left: ${message.playerId}`);
                break;

            case MessageType.PONG:
                console.log(`[Store] Latency: ${Date.now() - message.timestamp}ms`);
                break;

            case MessageType.ERROR:
                console.error(`[Store] Server error: ${message.message}`);
                break;
        }
    });

    return {
        // Initial state
        connectionStatus: 'disconnected',
        playerId: null,
        playerName: '',
        screen: 'lobby',
        gameList: [],
        currentGameId: null,
        isHost: false,
        waitingPlayers: [],
        gameState: null,
        selectedNodeId: null,

        // Actions
        connect: () => {
            gameWs.connect();
        },

        disconnect: () => {
            gameWs.disconnect();
            set({ playerId: null, gameState: null, screen: 'lobby' });
        },

        setPlayerName: (name: string) => {
            set({ playerName: name });
        },

        createGame: (name: string) => {
            set({ playerName: name, waitingPlayers: [name] });
            gameWs.send({ type: MessageType.CREATE_GAME, playerName: name });
        },

        joinGame: (name: string, gameId: string) => {
            set({ playerName: name, isHost: false, waitingPlayers: [name] });
            gameWs.send({ type: MessageType.JOIN_GAME, playerName: name, gameId });
        },

        startGame: () => {
            gameWs.send({ type: MessageType.START_GAME });
        },

        leaveGame: () => {
            gameWs.send({ type: MessageType.LEAVE_GAME });
            set({ currentGameId: null, gameState: null, isHost: false, waitingPlayers: [], screen: 'lobby' });
        },

        refreshGameList: () => {
            gameWs.send({ type: MessageType.LIST_GAMES });
        },

        submitTurn: (actions: M2TurnAction[]) => {
            gameWs.send({ type: MessageType.SUBMIT_TURN, actions });
        },

        setSelectedNodeId: (nodeId: NodeId | null) => {
            set({ selectedNodeId: nodeId });
        },
    };
});
