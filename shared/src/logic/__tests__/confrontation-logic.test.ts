/**
 * Confrontation logic tests — GDD §5.1
 *
 * "When multiple Ordained are at the same location, each chooses: confront or retreat."
 * - Retreat: displaced to adjacent node, cannot take actions this turn.
 * - Confront: soul bid, higher wins. Loser loses turn + expelled.
 * - Winner keeps their bid and acts normally.
 * - If neither confronts, they coexist and both act normally.
 */

import { describe, test, expect } from 'vitest';
import { resolveConfrontations } from '../confrontation-logic.js';
import type { GameState } from '../../types/game-state.js';
import type { Player, PlayerId } from '../../types/player.js';
import type { RealmGraph, GameNode } from '../../types/graph.js';
import type { RealmId, RealmState } from '../../types/realm.js';
import type { M2TurnSubmission } from '../turn-resolver.js';

// ─── Helpers ────────────────────────────────────────────────────

function makePlayer(id: string, nodeId: string, realmId: RealmId = 'dominion', balance = 500): Player {
  return {
    id, name: `Player ${id}`, colour: '#fff', playerIndex: 0,
    currentRealmId: realmId, currentNodeId: nodeId,
    destinationRealmId: null, destinationNodeId: null,
    actionPoints: 2, maxActionPoints: 2, turnLostToConfrontation: false,
    soulLedger: { playerId: id, balance, totalEarned: balance, totalSpent: 0, currentTurnIncome: [], history: [] },
    dominionIds: [], religionIds: [], relicIds: [], combatCards: [], missions: [], hasSubmittedTurn: false, intel: [],
  };
}

function makeNode(id: string): GameNode {
  return { id, realmId: 'dominion', type: 'city', name: id, position: { x: 0, y: 0 }, population: 100, depopulated: false, depopulationTurnsRemaining: 0 };
}

function makeGameState(players: Record<PlayerId, Player>): GameState {
  const graph: RealmGraph = {
    realmId: 'dominion',
    nodes: [makeNode('node-A'), makeNode('node-B'), makeNode('node-C')],
    edges: [
      { id: 'e1', sourceNodeId: 'node-A', targetNodeId: 'node-B', weight: 1, temporary: false, severed: false },
      { id: 'e2', sourceNodeId: 'node-B', targetNodeId: 'node-C', weight: 1, temporary: false, severed: false },
    ],
  };

  const rs: RealmState = { realmId: 'dominion', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, mass: 1, trajectoryPrediction: [] };

  return {
    gameId: 'test', turnNumber: 5, phase: 'planning',
    config: { beliefTagsEnabled: false, combatCardsEnabled: false, sunderingEnabled: false, maxPlayers: 4, targetConvergenceTurn: 35, maxInstructionNodes: 8 },
    players,
    turnOrder: Object.keys(players),
    realmGraphs: { dominion: graph, entropy: graph, communion: graph, wrath: graph, memory: graph } as Record<RealmId, RealmGraph>,
    realmStates: { dominion: rs, entropy: rs, communion: rs, wrath: rs, memory: rs } as Record<RealmId, RealmState>,
    realmInteractions: [], dominions: {}, religions: {}, mergeZones: {}, relics: {}, siteRites: {},
    currentTurnSubmissions: {}, activeConfrontations: [], activeCombats: [], combatResults: [], turnHistory: [], sundering: null,
  } as GameState;
}

function makeSub(pid: string, stance: 'confront' | 'coexist' | 'retreat', bid = 0): M2TurnSubmission {
  return { playerId: pid as PlayerId, actions: [], confrontationStance: { stance, bid } };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Confrontation Logic — GDD §5.1', () => {

  test('two coexisting players — no confrontation events', () => {
    const p1 = makePlayer('p1', 'node-A');
    const p2 = makePlayer('p2', 'node-A');
    const state = makeGameState({ p1, p2 });
    const subs: Record<PlayerId, M2TurnSubmission> = {
      p1: makeSub('p1', 'coexist'),
      p2: makeSub('p2', 'coexist'),
    };

    const events = resolveConfrontations(state, subs);
    // No one confronted or retreated, so no events
    expect(events).toHaveLength(0);
  });

  test('retreat without confrontation — player expelled, loses turn', () => {
    const p1 = makePlayer('p1', 'node-A');
    const p2 = makePlayer('p2', 'node-A');
    const state = makeGameState({ p1, p2 });
    const subs: Record<PlayerId, M2TurnSubmission> = {
      p1: makeSub('p1', 'coexist'),
      p2: makeSub('p2', 'retreat'),
    };

    const events = resolveConfrontations(state, subs);
    expect(events).toHaveLength(1);
    // p2 is expelled
    expect(events[0].losersExpelled).toHaveLength(1);
    expect(events[0].losersExpelled[0].playerId).toBe('p2');
    expect(events[0].losersExpelled[0].lostTurn).toBe(true);
  });

  test('one confronts, other retreats — confronter wins by default', () => {
    const p1 = makePlayer('p1', 'node-A');
    const p2 = makePlayer('p2', 'node-A');
    const state = makeGameState({ p1, p2 });
    const subs: Record<PlayerId, M2TurnSubmission> = {
      p1: makeSub('p1', 'confront', 100),
      p2: makeSub('p2', 'retreat'),
    };

    const events = resolveConfrontations(state, subs);
    expect(events).toHaveLength(1);
    expect(events[0].winnerId).toBe('p1');
    // Retreater is expelled
    expect(events[0].losersExpelled.some(l => l.playerId === 'p2')).toBe(true);
  });

  test('higher bid wins — loser expelled, winner keeps bid', () => {
    const p1 = makePlayer('p1', 'node-A', 'dominion', 500);
    const p2 = makePlayer('p2', 'node-A', 'dominion', 500);
    const state = makeGameState({ p1, p2 });
    const subs: Record<PlayerId, M2TurnSubmission> = {
      p1: makeSub('p1', 'confront', 100),
      p2: makeSub('p2', 'confront', 50),
    };

    const events = resolveConfrontations(state, subs);
    expect(events).toHaveLength(1);
    expect(events[0].winnerId).toBe('p1');

    // GDD §5.1: "The winner keeps their bid" — no soul deduction
    expect(state.players.p1.soulLedger.balance).toBe(500);

    // Loser forfeits their bid
    expect(state.players.p2.soulLedger.balance).toBe(450); // 500 - 50

    // Loser expelled
    expect(events[0].losersExpelled.some(l => l.playerId === 'p2')).toBe(true);
  });

  test('tied bids — both expelled, both lose bids', () => {
    const p1 = makePlayer('p1', 'node-A', 'dominion', 500);
    const p2 = makePlayer('p2', 'node-A', 'dominion', 500);
    const state = makeGameState({ p1, p2 });
    const subs: Record<PlayerId, M2TurnSubmission> = {
      p1: makeSub('p1', 'confront', 100),
      p2: makeSub('p2', 'confront', 100),
    };

    const events = resolveConfrontations(state, subs);
    expect(events).toHaveLength(1);
    expect(events[0].winnerId).toBeNull();
    // Both expelled
    expect(events[0].losersExpelled).toHaveLength(2);
    // Both lose their bid
    expect(state.players.p1.soulLedger.balance).toBe(400);
    expect(state.players.p2.soulLedger.balance).toBe(400);
  });

  test('one confronts, other coexists — confronter wins, coexister stays', () => {
    const p1 = makePlayer('p1', 'node-A', 'dominion', 500);
    const p2 = makePlayer('p2', 'node-A', 'dominion', 500);
    const state = makeGameState({ p1, p2 });
    const subs: Record<PlayerId, M2TurnSubmission> = {
      p1: makeSub('p1', 'confront', 50),
      p2: makeSub('p2', 'coexist'),
    };

    const events = resolveConfrontations(state, subs);
    expect(events).toHaveLength(1);
    expect(events[0].winnerId).toBe('p1');
    // Coexister should NOT be expelled (they didn't confront)
    expect(events[0].losersExpelled.some(l => l.playerId === 'p2')).toBe(false);
    // Winner keeps bid
    expect(state.players.p1.soulLedger.balance).toBe(500);
  });

  test('players at different nodes — no confrontation', () => {
    const p1 = makePlayer('p1', 'node-A');
    const p2 = makePlayer('p2', 'node-B');
    const state = makeGameState({ p1, p2 });
    const subs: Record<PlayerId, M2TurnSubmission> = {
      p1: makeSub('p1', 'confront', 100),
      p2: makeSub('p2', 'confront', 100),
    };

    const events = resolveConfrontations(state, subs);
    expect(events).toHaveLength(0); // Different locations
  });
});
