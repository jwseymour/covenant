/**
 * Shattered Covenant — Game Server
 *
 * Lobby-based multiplayer. Players connect → see a game list →
 * create or join a game → host starts → turns resolve.
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { MessageType } from '@shattered-covenant/shared';
import type {
    ClientMessage,
    ServerMessage,
    PlayerId,
    GameLobbyInfo,
    M2TurnAction,
} from '@shattered-covenant/shared';
import { GameRoom } from './game-room.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

// === Express Setup ===
const app = express();
app.use(express.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});
const httpServer = createServer(app);

// === WebSocket Setup ===
const wss = new WebSocketServer({ server: httpServer });

// ─── Lobby State ────────────────────────────────────────────────

/** All active game rooms. */
const gameRooms = new Map<string, GameRoom>();

/** Connected clients — maps playerId → socket + metadata. */
interface ConnectedClient {
    ws: WebSocket;
    playerId: PlayerId;
    name: string;
    currentGameId: string | null;
}
const clients = new Map<PlayerId, ConnectedClient>();

/** Generate a short, human-readable game ID. */
function generateGameId(): string {
    const adjectives = ['dark', 'void', 'sacred', 'broken', 'sundered', 'ancient', 'drifting', 'shattered'];
    const nouns = ['covenant', 'realm', 'rite', 'pact', 'throne', 'shard', 'relic', 'flame'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${adj}-${noun}-${num}`;
}

/** Build lobby info list from all rooms. */
function getGameList(): GameLobbyInfo[] {
    return Array.from(gameRooms.values()).map((room) => ({
        gameId: room.id,
        hostName: room.hostName,
        playerCount: room.playerCount,
        maxPlayers: 4,
        status: room.isStarted ? 'in_progress' as const : 'waiting' as const,
        createdAt: room.createdAt,
    }));
}

/** Send a typed message. */
function send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

/** Broadcast updated game list to all clients NOT in a game. */
function broadcastGameList(): void {
    const list = getGameList();
    for (const client of clients.values()) {
        if (!client.currentGameId) {
            send(client.ws, { type: MessageType.GAME_LIST, games: list });
        }
    }
}

// ─── WebSocket Connection ───────────────────────────────────────

wss.on('connection', (ws: WebSocket) => {
    const playerId: PlayerId = uuidv4();

    clients.set(playerId, { ws, playerId, name: '', currentGameId: null });
    console.log(`[Server] Client connected: ${playerId} (${clients.size} total)`);

    // Welcome — assigns the player their ID
    send(ws, { type: MessageType.WELCOME, playerId });

    // Send current game list immediately
    send(ws, { type: MessageType.GAME_LIST, games: getGameList() });

    ws.on('message', (data: Buffer) => {
        try {
            const message = JSON.parse(data.toString()) as ClientMessage;
            handleMessage(playerId, ws, message);
        } catch (err) {
            console.error(`[Server] Parse error from ${playerId}:`, err);
            send(ws, { type: MessageType.ERROR, message: 'Invalid message format', code: 'PARSE_ERROR' });
        }
    });

    ws.on('close', () => {
        const client = clients.get(playerId);
        if (client?.currentGameId) {
            const room = gameRooms.get(client.currentGameId);
            room?.removePlayer(playerId);
            // Clean up empty rooms
            if (room && room.playerCount === 0) {
                gameRooms.delete(room.id);
                console.log(`[Server] Room ${room.id} deleted (empty)`);
            }
        }
        clients.delete(playerId);
        console.log(`[Server] Client disconnected: ${playerId} (${clients.size} total)`);
        broadcastGameList();
    });

    ws.on('error', (err) => {
        console.error(`[Server] WS error for ${playerId}:`, err);
    });
});

// ─── Message Routing ────────────────────────────────────────────

function handleMessage(playerId: PlayerId, ws: WebSocket, message: ClientMessage): void {
    const client = clients.get(playerId);
    if (!client) return;

    switch (message.type) {
        // ── Lobby ──

        case MessageType.LIST_GAMES: {
            send(ws, { type: MessageType.GAME_LIST, games: getGameList() });
            break;
        }

        case MessageType.CREATE_GAME: {
            const gameId = generateGameId();
            const playerName = message.playerName || `Ordained ${playerId.slice(0, 4)}`;
            client.name = playerName;

            const room = new GameRoom(gameId, playerName);
            gameRooms.set(gameId, room);
            room.addPlayer(playerId, playerName, ws);
            client.currentGameId = gameId;

            console.log(`[Server] ${playerName} created game ${gameId}`);

            send(ws, { type: MessageType.GAME_CREATED, gameId, hostPlayerId: playerId });
            broadcastGameList();
            break;
        }

        case MessageType.JOIN_GAME: {
            const room = gameRooms.get(message.gameId);
            if (!room) {
                send(ws, { type: MessageType.ERROR, message: `Game "${message.gameId}" not found`, code: 'NOT_FOUND' });
                break;
            }
            if (room.isStarted) {
                send(ws, { type: MessageType.ERROR, message: 'Game already in progress', code: 'STARTED' });
                break;
            }
            if (room.playerCount >= 4) {
                send(ws, { type: MessageType.ERROR, message: 'Game is full', code: 'FULL' });
                break;
            }

            const playerName = message.playerName || `Ordained ${playerId.slice(0, 4)}`;
            client.name = playerName;
            client.currentGameId = message.gameId;
            room.addPlayer(playerId, playerName, ws);

            console.log(`[Server] ${playerName} joined game ${message.gameId}`);
            broadcastGameList();
            break;
        }

        case MessageType.LEAVE_GAME: {
            if (client.currentGameId) {
                const room = gameRooms.get(client.currentGameId);
                room?.removePlayer(playerId);
                if (room && room.playerCount === 0) {
                    gameRooms.delete(room.id);
                    console.log(`[Server] Room ${room.id} deleted (empty)`);
                }
                client.currentGameId = null;
                broadcastGameList();
                // Send them back the game list
                send(ws, { type: MessageType.GAME_LIST, games: getGameList() });
            }
            break;
        }

        // ── Game ──

        case MessageType.START_GAME: {
            if (!client.currentGameId) break;
            const room = gameRooms.get(client.currentGameId);
            if (!room) break;
            if (room.playerCount < 2) {
                send(ws, { type: MessageType.ERROR, message: 'Need at least 2 players to start', code: 'NOT_ENOUGH' });
                break;
            }
            room.startGame();
            broadcastGameList();
            break;
        }

        case MessageType.SUBMIT_TURN: {
            if (!client.currentGameId) break;
            const room = gameRooms.get(client.currentGameId);
            room?.submitTurn(playerId, message.actions as M2TurnAction[], message.confrontationStance);
            break;
        }

        case MessageType.PING: {
            send(ws, {
                type: MessageType.PONG,
                timestamp: message.timestamp,
                serverTimestamp: Date.now(),
            });
            break;
        }

        default:
            console.warn(`[Server] Unknown message type from ${playerId}`);
    }
}

// === Start Server ===
httpServer.listen(PORT, () => {
    console.log(`\n🔥 Shattered Covenant Server`);
    console.log(`   HTTP:      http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   Health:    http://localhost:${PORT}/health\n`);
});
