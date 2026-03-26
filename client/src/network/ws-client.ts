/**
 * WebSocket client — manages connection to the game server.
 *
 * Handles reconnection, message parsing, and typed message dispatch.
 * Uses the shared message protocol from @shattered-covenant/shared.
 */

import { MessageType } from '@shattered-covenant/shared';
import type { ClientMessage, ServerMessage } from '@shattered-covenant/shared';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
export type MessageHandler = (message: ServerMessage) => void;

const WS_URL = `ws://${window.location.hostname}:3001`;
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export class GameWebSocket {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private messageHandlers: MessageHandler[] = [];
    private statusHandlers: ((status: ConnectionStatus) => void)[] = [];
    private _status: ConnectionStatus = 'disconnected';

    get status(): ConnectionStatus {
        return this._status;
    }

    /** Connect to the game server */
    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        this.setStatus('connecting');
        console.log(`[WS] Connecting to ${WS_URL}...`);

        try {
            this.ws = new WebSocket(WS_URL);
        } catch (err) {
            console.error('[WS] Failed to create WebSocket:', err);
            this.scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            console.log('[WS] Connected ✓');
            this.reconnectAttempts = 0;
            this.setStatus('connected');
        };

        this.ws.onmessage = (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data as string) as ServerMessage;
                this.dispatchMessage(message);
            } catch (err) {
                console.error('[WS] Failed to parse message:', err);
            }
        };

        this.ws.onclose = () => {
            console.log('[WS] Disconnected');
            this.setStatus('disconnected');
            this.scheduleReconnect();
        };

        this.ws.onerror = (err) => {
            console.error('[WS] Error:', err);
        };
    }

    /** Disconnect from the server */
    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // prevent reconnect
        this.ws?.close();
        this.ws = null;
        this.setStatus('disconnected');
    }

    /** Send a typed message to the server */
    send(message: ClientMessage): void {
        if (this.ws?.readyState !== WebSocket.OPEN) {
            console.warn('[WS] Cannot send — not connected');
            return;
        }
        this.ws.send(JSON.stringify(message));
    }

    /** Send a ping to measure latency */
    ping(): void {
        this.send({ type: MessageType.PING, timestamp: Date.now() });
    }

    /** Register a handler for incoming messages */
    onMessage(handler: MessageHandler): () => void {
        this.messageHandlers.push(handler);
        return () => {
            this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
        };
    }

    /** Register a handler for connection status changes */
    onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
        this.statusHandlers.push(handler);
        return () => {
            this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
        };
    }

    private setStatus(status: ConnectionStatus): void {
        this._status = status;
        for (const handler of this.statusHandlers) {
            handler(status);
        }
    }

    private dispatchMessage(message: ServerMessage): void {
        for (const handler of this.messageHandlers) {
            handler(message);
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log('[WS] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = RECONNECT_DELAY_MS * Math.min(this.reconnectAttempts, 5);
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }
}

/** Singleton WebSocket instance */
export const gameWs = new GameWebSocket();
