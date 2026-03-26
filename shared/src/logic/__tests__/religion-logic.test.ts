/**
 * Unit tests for the religion system.
 *
 * Tests: founding, spread in different realms, belief tag compatibility,
 * stability/collapse, fracture, instructions.
 */

import { describe, test, expect } from 'vitest';
import {
  foundReligion,
  spreadReligion,
  updateStability,
  checkFracture,
  calculateSoulsGenerated,
  INITIAL_STABILITY,
  executeReligionInstructions,
} from '../religion-logic.js';
import type { Religion } from '../../types/religion.js';
import type { GameState } from '../../types/game-state.js';
import type { RealmGraph, GameNode, GameEdge } from '../../types/graph.js';
import type { RealmId, RealmState } from '../../types/realm.js';

// ─── Test Helpers ───────────────────────────────────────────────

function makeNode(id: string, x = 0, y = 0): GameNode {
  return {
    id, realmId: 'communion', type: 'city', name: `Node ${id}`,
    position: { x, y }, population: 100, depopulated: false, depopulationTurnsRemaining: 0,
  };
}

function makeEdge(source: string, target: string): GameEdge {
  return {
    id: `edge-${source}-${target}`, sourceNodeId: source, targetNodeId: target,
    weight: 1, temporary: false, severed: false,
  };
}

function makeGraph(realmId: RealmId, nodes: GameNode[], edges: GameEdge[]): RealmGraph {
  return { realmId, nodes: nodes.map((n) => ({ ...n, realmId })), edges };
}

function makeRealmState(): RealmState {
  return {
    realmId: 'communion', position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 }, mass: 1, trajectoryPrediction: [],
  };
}

function makeGameState(
  religions: Record<string, Religion>,
  graph: RealmGraph,
  realmId: RealmId = 'communion',
): GameState {
  const realmStates: Record<RealmId, RealmState> = {
    dominion: makeRealmState(), entropy: makeRealmState(),
    communion: makeRealmState(), wrath: makeRealmState(), memory: makeRealmState(),
  };
  return {
    gameId: 'test', turnNumber: 5, phase: 'planning',
    config: {
      beliefTagsEnabled: true, combatCardsEnabled: false, sunderingEnabled: false,
      maxPlayers: 4, targetConvergenceTurn: 35, maxInstructionNodes: 8,
    },
    players: {
      'player-1': {
        id: 'player-1', name: 'Test Player', colour: '#5a6882', playerIndex: 0,
        currentRealmId: realmId, currentNodeId: 'A',
        destinationRealmId: null, destinationNodeId: null,
        actionPoints: 2, maxActionPoints: 2, turnLostToConfrontation: false,
        soulLedger: { playerId: 'player-1', balance: 100, totalEarned: 100, totalSpent: 0, currentTurnIncome: [], history: [] },
        dominionIds: [], religionIds: Object.keys(religions),
        relicIds: [], combatCards: [], missions: [], hasSubmittedTurn: false,
        intel: [],
      },
    },
    turnOrder: ['player-1'],
    realmGraphs: { [realmId]: graph } as Record<RealmId, RealmGraph>,
    realmStates,
    realmInteractions: [],
    dominions: {},
    religions,
    mergeZones: {},
    relics: {},
    siteRites: {},
    currentTurnSubmissions: {},
    activeConfrontations: [],
    activeCombats: [],
    combatResults: [],
    turnHistory: [],
    sundering: null,
  } as GameState;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Religion System', () => {
  // Graph: A--B--C--D--E
  const nodes = [makeNode('A', 0, 0), makeNode('B', 1, 0), makeNode('C', 2, 0), makeNode('D', 3, 0), makeNode('E', 4, 0)];
  const edges = [makeEdge('A', 'B'), makeEdge('B', 'C'), makeEdge('C', 'D'), makeEdge('D', 'E')];

  describe('Founding', () => {
    test('creates religion with correct initial values', () => {
      const rel = foundReligion('player-1', 'A', 'communion', 'The Light', ['unity', 'empathy'], 1);
      expect(rel.founderId).toBe('player-1');
      expect(rel.foundedNodeId).toBe('A');
      expect(rel.foundedRealmId).toBe('communion');
      expect(rel.name).toBe('The Light');
      expect(rel.beliefTags).toEqual(['unity', 'empathy']);
      expect(rel.stability).toBe(INITIAL_STABILITY);
      expect(rel.followersByNode['A']).toBe(100);
      expect(rel.nodeCount).toBe(1);
      expect(rel.fractured).toBe(false);
    });

    test('religion with no tags is valid', () => {
      const rel = foundReligion('player-1', 'A', 'communion', 'Tagless', [], 1);
      expect(rel.beliefTags).toEqual([]);
    });
  });

  describe('Spread — Realm Differences', () => {
    test('Communion (×2.5) spreads faster than Memory (×0.3)', () => {
      // Run many trials to test statistical spread rate difference
      const communionGraph = makeGraph('communion', nodes, edges);
      const memoryGraph = makeGraph('memory', nodes, edges);

      let communionSpreads = 0;
      let memorySpreads = 0;
      const trials = 200;

      for (let i = 0; i < trials; i++) {
        const rel = foundReligion('player-1', 'A', 'communion', 'Test', ['unity', 'empathy'], 1);
        const cState = makeGameState({ [rel.id]: rel }, communionGraph, 'communion');
        const cResult = spreadReligion(rel, communionGraph, cState);
        communionSpreads += cResult.nodesGained;

        const relM = { ...rel, foundedRealmId: 'memory' as RealmId };
        const mState = makeGameState({ [relM.id]: relM }, memoryGraph, 'memory');
        const mResult = spreadReligion(relM, memoryGraph, mState);
        memorySpreads += mResult.nodesGained;
      }

      // Communion should spread significantly more than Memory
      expect(communionSpreads).toBeGreaterThan(memorySpreads * 2);
    });

    test('matching belief tags boost spread', () => {
      // Tags matching Communion realm should spread faster in Communion
      const communionGraph = makeGraph('communion', nodes, edges);
      let matchingSpreads = 0;
      let mismatchedSpreads = 0;
      const trials = 200;

      for (let i = 0; i < trials; i++) {
        // Matching: communion tags in communion realm
        const relMatch = foundReligion('player-1', 'A', 'communion', 'Match', ['unity', 'communion'], 1);
        const sMatch = makeGameState({ [relMatch.id]: relMatch }, communionGraph, 'communion');
        matchingSpreads += spreadReligion(relMatch, communionGraph, sMatch).nodesGained;

        // Mismatched: wrath tags in communion realm
        const relMiss = foundReligion('player-1', 'A', 'communion', 'Mismatch', ['fury', 'defiance'], 1);
        const sMiss = makeGameState({ [relMiss.id]: relMiss }, communionGraph, 'communion');
        mismatchedSpreads += spreadReligion(relMiss, communionGraph, sMiss).nodesGained;
      }

      expect(matchingSpreads).toBeGreaterThan(mismatchedSpreads);
    });
  });

  describe('Stability', () => {
    test('fast expansion (>2 nodes) decreases stability', () => {
      const rel = foundReligion('player-1', 'A', 'communion', 'Test', ['unity', 'empathy'], 1);
      const result = updateStability(rel, 5, 0, 'communion'); // 5 nodes gained
      // Stability should decrease: 80 - (5-2)*3/0.8 + 1*0.8 = 80 - 11.25 + 0.8 ≈ 69.55
      expect(result.religion.stability).toBeLessThan(INITIAL_STABILITY);
    });

    test('gradual growth maintains/increases stability', () => {
      const rel = foundReligion('player-1', 'A', 'communion', 'Test', ['unity', 'empathy'], 1);
      const result = updateStability(rel, 1, 0, 'communion'); // 1 node gained (under threshold)
      // Should get gradual recovery
      expect(result.religion.stability).toBeGreaterThanOrEqual(INITIAL_STABILITY);
    });

    test('hold instruction boosts stability recovery', () => {
      let rel = foundReligion('player-1', 'A', 'communion', 'Test', ['unity', 'empathy'], 1);
      rel = { ...rel, stability: 50, instructions: { instructions: [{ action: 'hold', priority: 0 }], lastModifiedTurn: 0 } };
      const result = updateStability(rel, 0, 0, 'communion');
      // Should get extra recovery
      expect(result.religion.stability).toBeGreaterThan(52);
    });

    test('low stability emits warning', () => {
      let rel = foundReligion('player-1', 'A', 'communion', 'Test', ['unity', 'empathy'], 1);
      rel = { ...rel, stability: 15 };
      const result = updateStability(rel, 0, 0, 'communion');
      expect(result.events.some((e) => e.type === 'stability_warning')).toBe(true);
    });
  });

  describe('Fracture', () => {
    test('no fracture when stability above threshold', () => {
      const communionGraph = makeGraph('communion', nodes, edges);
      const rel = foundReligion('player-1', 'A', 'communion', 'Test', ['unity', 'empathy'], 1);
      const result = checkFracture(rel, communionGraph);
      expect(result.religion.fractured).toBe(false);
    });

    test('already fractured religion recovers', () => {
      const communionGraph = makeGraph('communion', nodes, edges);
      let rel = foundReligion('player-1', 'A', 'communion', 'Test', ['unity', 'empathy'], 1);
      rel = { ...rel, fractured: true, fractureTurnsRemaining: 1, soulRoutingDisrupted: true };

      const result = checkFracture(rel, communionGraph);
      expect(result.religion.fractured).toBe(false);
      expect(result.religion.soulRoutingDisrupted).toBe(false);
    });

    test('does not spread when fractured', () => {
      const communionGraph = makeGraph('communion', nodes, edges);
      let rel = foundReligion('player-1', 'A', 'communion', 'Test', ['unity', 'empathy'], 1);
      rel = { ...rel, fractured: true, fractureTurnsRemaining: 2 };
      const state = makeGameState({ [rel.id]: rel }, communionGraph, 'communion');

      const result = spreadReligion(rel, communionGraph, state);
      expect(result.nodesGained).toBe(0);
    });
  });

  describe('Soul Generation', () => {
    test('generates souls proportional to coverage', () => {
      let rel = foundReligion('player-1', 'A', 'communion', 'Test', ['unity', 'empathy'], 1);
      // 1 node at 100% followers
      const souls1 = calculateSoulsGenerated(rel);
      expect(souls1).toBe(5); // 5 per node at 100%

      // Add more nodes
      rel = { ...rel, followersByNode: { 'A': 100, 'B': 100, 'C': 50 } };
      const souls3 = calculateSoulsGenerated(rel);
      expect(souls3).toBe(12); // 5 + 5 + 2.5 = 12.5 → 12

      // Sacrifice tag boosts yield ×1.5
      rel = { ...rel, beliefTags: ['sacrifice', 'order'] };
      const soulsSacrifice = calculateSoulsGenerated(rel);
      expect(soulsSacrifice).toBeGreaterThan(souls3);
    });

    test('disrupted soul routing generates zero', () => {
      let rel = foundReligion('player-1', 'A', 'communion', 'Test', ['unity', 'empathy'], 1);
      rel = { ...rel, soulRoutingDisrupted: true };
      expect(calculateSoulsGenerated(rel)).toBe(0);
    });
  });

  describe('Instructions', () => {
    test('hold instruction stops spread', () => {
      const communionGraph = makeGraph('communion', nodes, edges);
      let rel = foundReligion('player-1', 'A', 'communion', 'Test', ['unity', 'empathy'], 1);
      rel = { ...rel, instructions: { instructions: [{ action: 'hold', priority: 0 }], lastModifiedTurn: 0 } };
      const state = makeGameState({ [rel.id]: rel }, communionGraph, 'communion');

      const result = spreadReligion(rel, communionGraph, state);
      expect(result.nodesGained).toBe(0);
    });

    test('sacred festival instruction adds stability and costs souls', () => {
      const communionGraph = makeGraph('communion', nodes, edges);
      let rel = foundReligion('player-1', 'A', 'communion', 'Test', ['unity', 'empathy'], 1);
      rel = { ...rel, stability: 50, instructions: { instructions: [{ action: 'sacred_festival', priority: 0 }], lastModifiedTurn: 0 } };
      const state = makeGameState({ [rel.id]: rel }, communionGraph, 'communion');

      const result = executeReligionInstructions(rel, communionGraph, state);
      expect(result.religion.stability).toBe(65); // 50 + 15
      expect(result.soulCost).toBe(25);
      expect(result.events.some((e) => e.type === 'sacred_festival')).toBe(true);
    });
  });
});
