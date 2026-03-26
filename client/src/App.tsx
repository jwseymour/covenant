/**
 * App — root React component for The Shattered Covenant.
 *
 * Screen flow: Lobby → Waiting Room → Game (macro/micro views)
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useGameStore } from './store/game-store';
import { Lobby, WaitingRoom } from './Lobby';
import { MacroView } from './renderer/MacroView';
import { MicroView } from './renderer/MicroView';
import { REALM_VISUALS, REALM_IDS } from './renderer/realm-visuals';
import { TurnPanel } from './TurnPanel';
import { generateAllRealmGraphs } from '@shattered-covenant/shared';
import type { RealmId, NodeId, M2TurnAction } from '@shattered-covenant/shared';
import './styles/lobby.css';
import './styles/turn-panel.css';

type ViewMode = 'macro' | 'micro';

export function App() {
    const connectionStatus = useGameStore((s) => s.connectionStatus);
    const playerId = useGameStore((s) => s.playerId);
    const gameState = useGameStore((s) => s.gameState);
    const screen = useGameStore((s) => s.screen);
    const connect = useGameStore((s) => s.connect);
    const leaveGame = useGameStore((s) => s.leaveGame);
    const submitTurn = useGameStore((s) => s.submitTurn);
    const selectedNodeId = useGameStore((s) => s.selectedNodeId);
    const setSelectedNodeId = useGameStore((s) => s.setSelectedNodeId);
    const currentGameId = useGameStore((s) => s.currentGameId);

    const [viewMode, setViewMode] = useState<ViewMode>('macro');
    const [selectedRealm, setSelectedRealm] = useState<RealmId | null>(null);
    const [transitioning, setTransitioning] = useState(false);

    // Fallback realm graphs for when game hasn't started
    const fallbackGraphs = useMemo(() => generateAllRealmGraphs(42), []);
    const realmGraphs = useMemo(() => {
        if (gameState && Object.keys(gameState.realmGraphs).length > 0) return gameState.realmGraphs;
        return fallbackGraphs;
    }, [gameState, fallbackGraphs]);

    const isInGame = gameState && gameState.phase !== 'lobby' && Object.keys(gameState.players).length > 0;

    // Connect to server on mount
    useEffect(() => { connect(); }, [connect]);

    // Reset view when leaving game
    useEffect(() => {
        if (screen === 'lobby') {
            setViewMode('macro');
            setSelectedRealm(null);
        }
    }, [screen]);

    const handleRealmSelect = useCallback((realmId: RealmId | null) => setSelectedRealm(realmId), []);

    const enterRealm = useCallback((realmId: RealmId) => {
        setTransitioning(true);
        setSelectedRealm(realmId);
        setTimeout(() => { setViewMode('micro'); setTransitioning(false); }, 300);
    }, []);

    const exitRealm = useCallback(() => {
        setTransitioning(true);
        setSelectedNodeId(null);
        setTimeout(() => { setViewMode('macro'); setTransitioning(false); }, 300);
    }, [setSelectedNodeId]);

    const handleSubmitTurn = useCallback((actions: M2TurnAction[]) => submitTurn(actions), [submitTurn]);
    const handleNodeSelect = useCallback((nodeId: NodeId | null) => setSelectedNodeId(nodeId), [setSelectedNodeId]);

    // ─── Lobby / Waiting Room screens ───────────────────────────
    if (screen === 'lobby') return <Lobby />;
    if (screen === 'waiting_room') return <WaitingRoom />;

    // ─── Game screen ────────────────────────────────────────────
    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <h1>The Shattered Covenant</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {viewMode === 'macro' && selectedRealm && (
                        <button className="enter-realm-btn" onClick={() => enterRealm(selectedRealm)}>
                            Enter {REALM_VISUALS[selectedRealm].name} →
                        </button>
                    )}
                    <span style={{ fontSize: '11px', color: '#6b6760', fontFamily: 'monospace' }}>
                        {currentGameId}
                    </span>
                    <div className="connection-status">
                        <div className={`connection-status__dot connection-status__dot--${connectionStatus}`} />
                        <span>{connectionStatus}</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="app-main">
                {/* Game Viewport */}
                <div className={`game-viewport ${transitioning ? 'viewport-transition' : ''}`}>
                    {viewMode === 'macro' ? (
                        <MacroView onRealmSelect={handleRealmSelect} />
                    ) : (
                        selectedRealm && (
                            <MicroView
                                realmId={selectedRealm}
                                graph={realmGraphs[selectedRealm]}
                                onBack={exitRealm}
                                onNodeSelect={handleNodeSelect}
                                gameState={gameState ?? undefined}
                                playerId={playerId ?? undefined}
                            />
                        )
                    )}
                </div>

                {/* Sidebar */}
                <aside className="info-panel">
                    {/* Turn Panel — only when in game */}
                    {isInGame && playerId && gameState && (
                        <TurnPanel
                            gameState={gameState}
                            playerId={playerId}
                            onSubmitTurn={handleSubmitTurn}
                            selectedNodeId={selectedNodeId}
                        />
                    )}

                    {/* View Mode */}
                    <div className="info-panel__divider" />
                    <div className="info-panel__section">
                        <div className="info-panel__label">View</div>
                        <div className="info-panel__value" style={{ fontSize: '12px' }}>
                            {viewMode === 'macro' ? 'Macro — The Void' : `Micro — ${REALM_VISUALS[selectedRealm!]?.name}`}
                        </div>
                    </div>

                    {/* Realm Legend */}
                    <div className="info-panel__divider" />
                    <h3>The Five Realms</h3>
                    <div className="realm-legend">
                        {REALM_IDS.map((realmId) => {
                            const vis = REALM_VISUALS[realmId];
                            const isSelected = selectedRealm === realmId;
                            return (
                                <div
                                    key={realmId}
                                    className={`realm-legend__item ${isSelected ? 'realm-legend__item--selected' : ''}`}
                                    onClick={() => viewMode === 'macro' ? setSelectedRealm(realmId) : enterRealm(realmId)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="realm-legend__swatch" style={{
                                        backgroundColor: vis.color,
                                        boxShadow: isSelected ? `0 0 8px ${vis.accent}` : 'none',
                                    }} />
                                    <div className="realm-legend__info">
                                        <div className="realm-legend__name">{vis.name}</div>
                                        <div className="realm-legend__desc">{vis.description}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="info-panel__divider" />
                    <button
                        style={{
                            width: '100%', background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '4px', padding: '8px', color: '#6b6760', cursor: 'pointer',
                            fontSize: '11px', fontFamily: 'var(--font-body)',
                        }}
                        onClick={leaveGame}
                    >
                        ← Leave Game
                    </button>
                </aside>
            </main>
        </div>
    );
}
