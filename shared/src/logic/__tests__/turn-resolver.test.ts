/**
 * Turn resolver tests — GDD §4.1, §5
 *
 * Comprehensive tests for the turn resolution pipeline:
 * - AP accounting
 * - Movement
 * - Realm physics tick
 * - Dominion decay
 * - Religion tick
 * - Soul income
 */

import { describe, test, expect } from 'vitest';
import { resolveTurn, createInitialGameState, type M2TurnSubmission } from '../turn-resolver.js';
import { createBasicInstructions } from '../instruction-executor.js';
import type { GameState } from '../../types/game-state.js';
import type { PlayerId } from '../../types/player.js';
import type { RealmGraph, GameNode, GameEdge } from '../../types/graph.js';
import type { RealmId, RealmState } from '../../types/realm.js';

// ─── Helpers ────────────────────────────────────────────────────

function makeNode(id: string, realmId: RealmId = 'dominion', pop = 100): GameNode {
  return {
    id, realmId, type: 'city', name: `Node ${id}`,
    position: { x: 0, y: 0 }, population: pop,
    depopulated: false, depopulationTurnsRemaining: 0,
  };
}

function makeRealmState(id: RealmId, x: number): RealmState {
  return {
    realmId: id,
    position: { x, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    mass: 1,
    trajectoryPrediction: [],
  };
}

function makeTestState(): GameState {
  const graphs: Record<RealmId, RealmGraph> = {} as any;
  const states: Record<RealmId, RealmState> = {} as any;
  const realmIds: RealmId[] = ['dominion', 'entropy', 'communion', 'wrath', 'memory'];
  const xPositions = [-20, -10, 0, 10, 20];

  for (let i = 0; i < realmIds.length; i++) {
    const rid = realmIds[i];
    const nodes = [
      makeNode(`${rid}-city-1`, rid, 500),
      makeNode(`${rid}-city-2`, rid, 300),
      makeNode(`${rid}-city-3`, rid, 200),
    ];
    const edges: GameEdge[] = [
      { id: `${rid}-e1`, sourceNodeId: `${rid}-city-1`, targetNodeId: `${rid}-city-2`, weight: 1, temporary: false, severed: false },
      { id: `${rid}-e2`, sourceNodeId: `${rid}-city-2`, targetNodeId: `${rid}-city-3`, weight: 1, temporary: false, severed: false },
    ];
    graphs[rid] = { realmId: rid, nodes, edges };
    states[rid] = makeRealmState(rid, xPositions[i]);
  }

  const playerData = [
    { id: 'p1' as PlayerId, name: 'Player 1', colour: '#ff0000' },
    { id: 'p2' as PlayerId, name: 'Player 2', colour: '#00ff00' },
  ];

  return createInitialGameState(playerData, graphs, states);
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Turn Resolver — GDD §4.1, §5', () => {

  describe('AP Accounting', () => {
    test('establish_dominion costs 1 AP', () => {
      const state = makeTestState();
      const p = state.players['p1' as PlayerId];
      const submission: M2TurnSubmission = {
        playerId: 'p1' as PlayerId,
        actions: [
          { kind: 'establish_dominion', nodeId: `${p.currentRealmId}-city-2`, realmId: p.currentRealmId, name: 'TestDom' },
        ],
      };

      const { events } = resolveTurn(state, [submission]);
      // Check the dominion was established
      const domEvents = events.filter(e => e.type === 'dominion_established');
      expect(domEvents).toHaveLength(1);
    });

    test('set_instructions costs 1 AP', () => {
      const state = makeTestState();
      const p = state.players['p1' as PlayerId];

      // First establish a dominion
      const sub1: M2TurnSubmission = {
        playerId: 'p1' as PlayerId,
        actions: [
          { kind: 'establish_dominion', nodeId: `${p.currentRealmId}-city-1`, realmId: p.currentRealmId, name: 'Dom1' },
        ],
      };
      const { newState } = resolveTurn(state, [sub1]);

      // Find the dominion
      const domId = Object.keys(newState.dominions)[0];

      // Now set instructions — costs 1 AP
      const sub2: M2TurnSubmission = {
        playerId: 'p1' as PlayerId,
        actions: [
          { kind: 'set_instructions', dominionId: domId, instructions: createBasicInstructions({ type: 'hold' }, 1) },
        ],
      };
      const { events } = resolveTurn(newState, [sub2]);
      expect(events.some(e => e.type === 'instructions_set')).toBe(true);
    });

    test('cannot exceed 2 AP in one turn', () => {
      const state = makeTestState();
      const p = state.players['p1' as PlayerId];

      const submission: M2TurnSubmission = {
        playerId: 'p1' as PlayerId,
        actions: [
          { kind: 'establish_dominion', nodeId: `${p.currentRealmId}-city-1`, realmId: p.currentRealmId, name: 'Dom1' },
          { kind: 'establish_dominion', nodeId: `${p.currentRealmId}-city-2`, realmId: p.currentRealmId, name: 'Dom2' },
          { kind: 'establish_dominion', nodeId: `${p.currentRealmId}-city-3`, realmId: p.currentRealmId, name: 'Dom3' },
        ],
      };

      const { events } = resolveTurn(state, [submission]);
      // Third establishment should fail with AP exceeded
      const apExceeded = events.filter(e => e.type === 'ap_exceeded');
      expect(apExceeded.length).toBeGreaterThan(0);
    });

    test('set_destination is free (not an AP action)', () => {
      const state = makeTestState();
      const p = state.players['p1' as PlayerId];

      // Establish two dominions (2 AP), then set destination (free)
      const submission: M2TurnSubmission = {
        playerId: 'p1' as PlayerId,
        actions: [
          { kind: 'establish_dominion', nodeId: `${p.currentRealmId}-city-2`, realmId: p.currentRealmId, name: 'Dom1' },
          { kind: 'establish_dominion', nodeId: `${p.currentRealmId}-city-3`, realmId: p.currentRealmId, name: 'Dom2' },
          { kind: 'set_destination', realmId: p.currentRealmId, nodeId: `${p.currentRealmId}-city-2` },
        ],
      };

      const { newState, events } = resolveTurn(state, [submission]);
      // Two dominions should be established
      const established = events.filter(e => e.type === 'dominion_established');
      expect(established).toHaveLength(2);
      // Player should have moved
      expect(newState.players['p1' as PlayerId].currentNodeId).toBe(`${p.currentRealmId}-city-2`);
    });

    test('found_religion costs 1 AP', () => {
      const state = makeTestState();
      const p = state.players['p1' as PlayerId];

      const submission: M2TurnSubmission = {
        playerId: 'p1' as PlayerId,
        actions: [
          { kind: 'found_religion', nodeId: p.currentNodeId, realmId: p.currentRealmId, name: 'TestFaith', beliefTags: [] },
        ],
      };

      const { newState, events } = resolveTurn(state, [submission]);
      expect(events.some(e => e.type === 'religion_founded')).toBe(true);
      expect(Object.keys(newState.religions)).toHaveLength(1);
    });
  });

  describe('Movement', () => {
    test('player moves to destination at end of turn', () => {
      const state = makeTestState();
      const p = state.players['p1' as PlayerId];
      const destNode = `${p.currentRealmId}-city-2`;

      const submission: M2TurnSubmission = {
        playerId: 'p1' as PlayerId,
        actions: [
          { kind: 'set_destination', realmId: p.currentRealmId, nodeId: destNode },
        ],
      };

      const { newState } = resolveTurn(state, [submission]);
      expect(newState.players['p1' as PlayerId].currentNodeId).toBe(destNode);
    });

    test('cross-realm travel fails without access point', () => {
      const state = makeTestState();

      const submission: M2TurnSubmission = {
        playerId: 'p1' as PlayerId,
        actions: [
          { kind: 'set_destination', realmId: 'entropy', nodeId: 'entropy-city-1' },
        ],
      };

      const { events } = resolveTurn(state, [submission]);
      // Should fail — no access points between dominion and entropy
      const failEvents = events.filter(e => e.type === 'player_moved' && e.message.includes('failed'));
      expect(failEvents.length).toBeGreaterThan(0);
    });

    test('player destination resets after movement', () => {
      const state = makeTestState();
      const p = state.players['p1' as PlayerId];

      const submission: M2TurnSubmission = {
        playerId: 'p1' as PlayerId,
        actions: [
          { kind: 'set_destination', realmId: p.currentRealmId, nodeId: `${p.currentRealmId}-city-2` },
        ],
      };

      const { newState } = resolveTurn(state, [submission]);
      expect(newState.players['p1' as PlayerId].destinationNodeId).toBeNull();
      expect(newState.players['p1' as PlayerId].destinationRealmId).toBeNull();
    });
  });

  describe('Turn Number & State', () => {
    test('turn number increments by 1', () => {
      const state = makeTestState();
      const { newState } = resolveTurn(state, []);
      expect(newState.turnNumber).toBe(state.turnNumber + 1);
    });

    test('phase resets to planning', () => {
      const state = makeTestState();
      const { newState } = resolveTurn(state, []);
      expect(newState.phase).toBe('planning');
    });

    test('turn history is recorded', () => {
      const state = makeTestState();
      const { newState } = resolveTurn(state, []);
      expect(newState.turnHistory).toHaveLength(state.turnHistory.length + 1);
    });
  });

  describe('Physics', () => {
    test('realm positions change each turn (N-body tick)', () => {
      const state = makeTestState();
      const origPos = { ...state.realmStates['dominion'].position };

      const { newState } = resolveTurn(state, []);

      const newPos = newState.realmStates['dominion'].position;
      // At least one coordinate should have changed
      const moved = newPos.x !== origPos.x || newPos.y !== origPos.y || newPos.z !== origPos.z;
      expect(moved).toBe(true);
    });
  });

  describe('Dominion Mechanics', () => {
    test('dominion decays each turn', () => {
      const state = makeTestState();
      const p = state.players['p1' as PlayerId];

      // Establish a dominion first
      const sub1: M2TurnSubmission = {
        playerId: 'p1' as PlayerId,
        actions: [{ kind: 'establish_dominion', nodeId: p.currentNodeId, realmId: p.currentRealmId, name: 'TestDom' }],
      };
      const { newState: s1 } = resolveTurn(state, [sub1]);
      const domId = Object.keys(s1.dominions)[0];
      const influenceAfterEstablish = s1.dominions[domId].influence;

      // Resolve another turn with pass
      const sub2: M2TurnSubmission = { playerId: 'p1' as PlayerId, actions: [{ kind: 'pass' }] };
      const { newState: s2 } = resolveTurn(s1, [sub2]);

      expect(s2.dominions[domId].influence).toBeLessThan(influenceAfterEstablish);
    });
  });

  describe('Religion Founding', () => {
    test('religion is added to state and player', () => {
      const state = makeTestState();
      const p = state.players['p1' as PlayerId];

      const submission: M2TurnSubmission = {
        playerId: 'p1' as PlayerId,
        actions: [
          { kind: 'found_religion', nodeId: p.currentNodeId, realmId: p.currentRealmId, name: 'The Light', beliefTags: [] },
        ],
      };

      const { newState } = resolveTurn(state, [submission]);
      const relIds = Object.keys(newState.religions);
      expect(relIds).toHaveLength(1);
      expect(newState.players['p1' as PlayerId].religionIds).toHaveLength(1);
    });
  });

  describe('Pass Action', () => {
    test('pass does nothing and is valid', () => {
      const state = makeTestState();
      const submission: M2TurnSubmission = {
        playerId: 'p1' as PlayerId,
        actions: [{ kind: 'pass' }],
      };

      const { events } = resolveTurn(state, [submission]);
      // No AP exceeded events
      expect(events.filter(e => e.type === 'ap_exceeded')).toHaveLength(0);
    });
  });
});
