/**
 * Unit tests for the instruction executor.
 *
 * Tests Tier 1 (basic directives) and Tier 2 (conditional flowcharts).
 */

import { describe, test, expect } from 'vitest';
import {
  executeDominionInstructions,
  createBasicInstructions,
  createConditionalInstructions,
} from '../instruction-executor.js';
import type { Dominion } from '../../types/dominion.js';
import type { GameState } from '../../types/game-state.js';
import type { RealmGraph, GameNode, GameEdge } from '../../types/graph.js';
import type { RealmId } from '../../types/realm.js';
import type { RealmState } from '../../types/realm.js';
import type { InstructionCondition } from '../../types/instruction.js';

// ─── Test Helpers ───────────────────────────────────────────────

function makeNode(id: string, x = 0, y = 0): GameNode {
  return {
    id,
    realmId: 'dominion',
    type: 'city',
    name: `Node ${id}`,
    position: { x, y },
    population: 100,
    depopulated: false,
    depopulationTurnsRemaining: 0,
  };
}

function makeEdge(source: string, target: string): GameEdge {
  return {
    id: `edge-${source}-${target}`,
    sourceNodeId: source,
    targetNodeId: target,
    weight: 1,
    temporary: false,
    severed: false,
  };
}

function makeGraph(nodes: GameNode[], edges: GameEdge[]): RealmGraph {
  return { realmId: 'dominion', nodes, edges };
}

function makeDominion(overrides: Partial<Dominion> = {}): Dominion {
  return {
    id: 'dom-1',
    ownerId: 'player-1',
    realmId: 'dominion',
    primaryNodeId: 'A',
    controlledNodeIds: ['A'],
    influence: 80,
    decayRate: 3.5,
    lastVisitedTurn: 0,
    establishedTurn: 0,
    armyStrength: 10,
    armyBaseSize: 10,
    troopQualityModifier: 1.0,
    instructions: null,
    scoutReports: [],
    ...overrides,
  };
}

function makeRealmState(): RealmState {
  return {
    realmId: 'dominion',
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    mass: 1,
    trajectoryPrediction: [],
  };
}

function makeGameState(
  dominions: Record<string, Dominion>,
  graph: RealmGraph,
): GameState {
  const realmStates: Record<RealmId, RealmState> = {
    dominion: makeRealmState(),
    entropy: makeRealmState(),
    communion: makeRealmState(),
    wrath: makeRealmState(),
    memory: makeRealmState(),
  };
  return {
    gameId: 'test',
    turnNumber: 5,
    phase: 'planning',
    config: {
      beliefTagsEnabled: false,
      combatCardsEnabled: false,
      sunderingEnabled: false,
      maxPlayers: 4,
      targetConvergenceTurn: 35,
      maxInstructionNodes: 8,
    },
    players: {
      'player-1': {
        id: 'player-1',
        name: 'Test Player',
        colour: '#5a6882',
        playerIndex: 0,
        currentRealmId: 'dominion',
        currentNodeId: 'A',
        destinationRealmId: null,
        destinationNodeId: null,
        actionPoints: 2,
        maxActionPoints: 2,
        turnLostToConfrontation: false,
        soulLedger: { playerId: 'player-1', balance: 0, totalEarned: 0, totalSpent: 0, currentTurnIncome: [], history: [] },
        dominionIds: ['dom-1'],
        religionIds: [],
        relicIds: [],
        combatCards: [],
        missions: [],
        hasSubmittedTurn: false,
        intel: [],
      },
    },
    turnOrder: ['player-1'],
    realmGraphs: { dominion: graph } as Record<RealmId, RealmGraph>,
    realmStates,
    realmInteractions: [],
    dominions,
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
  } as GameState;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Instruction Executor', () => {
  // Graph: A --B--C--D
  const nodes = [makeNode('A', 0, 0), makeNode('B', 1, 0), makeNode('C', 2, 0), makeNode('D', 3, 0)];
  const edges = [makeEdge('A', 'B'), makeEdge('B', 'C'), makeEdge('C', 'D')];
  const graph = makeGraph(nodes, edges);

  describe('Tier 1 — Basic Directives', () => {
    test('hold — no changes', () => {
      const dom = makeDominion({ instructions: createBasicInstructions({ type: 'hold' }, 0) });
      const state = makeGameState({ 'dom-1': dom }, graph);
      const result = executeDominionInstructions(dom, graph, state);

      expect(result.dominion.controlledNodeIds).toEqual(['A']);
      expect(result.dominion.armyBaseSize).toBe(10);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].action).toBe('hold');
    });

    test('recruit — increases army size', () => {
      const dom = makeDominion({ instructions: createBasicInstructions({ type: 'recruit' }, 0) });
      const state = makeGameState({ 'dom-1': dom }, graph);
      const result = executeDominionInstructions(dom, graph, state);

      expect(result.dominion.armyBaseSize).toBe(15); // 10 + 5
      expect(result.dominion.armyStrength).toBe(15);
      expect(result.events[0].action).toBe('recruit');
    });

    test('defend — increases troop quality', () => {
      const dom = makeDominion({ instructions: createBasicInstructions({ type: 'defend' }, 0) });
      const state = makeGameState({ 'dom-1': dom }, graph);
      const result = executeDominionInstructions(dom, graph, state);

      expect(result.dominion.troopQualityModifier).toBeCloseTo(1.15);
      expect(result.events[0].action).toBe('defend');
    });

    test('expand (undirected) — claims an adjacent node', () => {
      const dom = makeDominion({ instructions: createBasicInstructions({ type: 'expand' }, 0) });
      const state = makeGameState({ 'dom-1': dom }, graph);
      const result = executeDominionInstructions(dom, graph, state);

      // Should have expanded to B (only adjacent node)
      expect(result.dominion.controlledNodeIds).toContain('B');
      expect(result.dominion.controlledNodeIds.length).toBe(2);
      expect(result.events[0].action).toBe('expand');
    });

    test('expand (directed) toward D — claims B first', () => {
      const dom = makeDominion({
        instructions: createBasicInstructions({ type: 'expand', targetNodeId: 'D' }, 0),
      });
      const state = makeGameState({ 'dom-1': dom }, graph);
      const result = executeDominionInstructions(dom, graph, state);

      expect(result.dominion.controlledNodeIds).toContain('B');
      expect(result.events[0].action).toBe('expand');
    });

    test('expand — idles when no available nodes', () => {
      // Isolated node with no edges
      const isoGraph = makeGraph([makeNode('X')], []);
      const dom = makeDominion({
        primaryNodeId: 'X',
        controlledNodeIds: ['X'],
        instructions: createBasicInstructions({ type: 'expand' }, 0),
      });
      const state = makeGameState({ 'dom-1': dom }, isoGraph);
      const result = executeDominionInstructions(dom, isoGraph, state);

      expect(result.dominion.controlledNodeIds).toEqual(['X']);
      expect(result.events[0].action).toBe('expand_idle');
    });

    test('expand — blocked by rival dominion', () => {
      const rivalDom: Dominion = {
        ...makeDominion({ id: 'dom-2', ownerId: 'player-2', primaryNodeId: 'B', controlledNodeIds: ['B'] }),
      };
      const dom = makeDominion({
        instructions: createBasicInstructions({ type: 'expand' }, 0),
      });
      const state = makeGameState({ 'dom-1': dom, 'dom-2': rivalDom }, graph);
      const result = executeDominionInstructions(dom, graph, state);

      expect(result.dominion.controlledNodeIds).toEqual(['A']);
      expect(result.events[0].action).toBe('expand_blocked');
    });

    test('scout — creates a scout report', () => {
      const dom = makeDominion({
        instructions: createBasicInstructions({ type: 'scout', targetNodeId: 'C' }, 0),
      });
      const state = makeGameState({ 'dom-1': dom }, graph);
      const result = executeDominionInstructions(dom, graph, state);

      expect(result.dominion.scoutReports).toHaveLength(1);
      expect(result.dominion.scoutReports[0].targetNodeId).toBe('C');
      expect(result.dominion.scoutReports[0].delivered).toBe(false);
      expect(result.events[0].action).toBe('scout');
    });

    test('no instructions — no execution', () => {
      const dom = makeDominion({ instructions: null });
      const state = makeGameState({ 'dom-1': dom }, graph);
      const result = executeDominionInstructions(dom, graph, state);

      expect(result.dominion).toBe(dom); // Same object, no changes
      expect(result.events).toHaveLength(0);
    });
  });

  describe('Tier 2 — Conditional Instructions', () => {
    test('influence_below — condition TRUE → takes THEN action', () => {
      const condition: InstructionCondition = { type: 'influence_below', threshold: 90 };
      const instructions = createConditionalInstructions(
        condition,
        { type: 'defend' },
        { type: 'expand' },
        0,
      );

      // Dominion has 80% influence, which is < 90 → condition is TRUE → THEN = defend
      const dom = makeDominion({ influence: 80, instructions });
      const state = makeGameState({ 'dom-1': dom }, graph);
      const result = executeDominionInstructions(dom, graph, state);

      expect(result.events[0].action).toBe('defend');
      expect(result.dominion.troopQualityModifier).toBeCloseTo(1.15);
    });

    test('influence_below — condition FALSE → takes ELSE action', () => {
      const condition: InstructionCondition = { type: 'influence_below', threshold: 50 };
      const instructions = createConditionalInstructions(
        condition,
        { type: 'defend' },
        { type: 'expand' },
        0,
      );

      // Dominion has 80% influence, which is NOT < 50 → condition is FALSE → ELSE = expand
      const dom = makeDominion({ influence: 80, instructions });
      const state = makeGameState({ 'dom-1': dom }, graph);
      const result = executeDominionInstructions(dom, graph, state);

      expect(result.events[0].action).toBe('expand');
      expect(result.dominion.controlledNodeIds).toContain('B');
    });

    test('army_size_below — condition TRUE', () => {
      const condition: InstructionCondition = { type: 'army_size_below', threshold: 15 };
      const instructions = createConditionalInstructions(
        condition,
        { type: 'recruit' },
        { type: 'expand' },
        0,
      );

      const dom = makeDominion({ armyBaseSize: 10, instructions });
      const state = makeGameState({ 'dom-1': dom }, graph);
      const result = executeDominionInstructions(dom, graph, state);

      expect(result.events[0].action).toBe('recruit');
      expect(result.dominion.armyBaseSize).toBe(15);
    });

    test('enemy_nearby — no enemy → FALSE → takes ELSE', () => {
      const condition: InstructionCondition = { type: 'enemy_nearby', threshold: 2 };
      const instructions = createConditionalInstructions(
        condition,
        { type: 'defend' },
        { type: 'recruit' },
        0,
      );

      const dom = makeDominion({ instructions });
      const state = makeGameState({ 'dom-1': dom }, graph);
      const result = executeDominionInstructions(dom, graph, state);

      // No enemy nearby → FALSE → ELSE = recruit
      expect(result.events[0].action).toBe('recruit');
    });

    test('enemy_nearby — enemy within range → TRUE → takes THEN', () => {
      const condition: InstructionCondition = { type: 'enemy_nearby', threshold: 2 };
      const instructions = createConditionalInstructions(
        condition,
        { type: 'defend' },
        { type: 'recruit' },
        0,
      );

      const rivalDom = makeDominion({
        id: 'dom-2',
        ownerId: 'player-2',
        primaryNodeId: 'B',
        controlledNodeIds: ['B'],
        instructions: null,
      });

      const dom = makeDominion({ instructions });
      const state = makeGameState({ 'dom-1': dom, 'dom-2': rivalDom }, graph);
      const result = executeDominionInstructions(dom, graph, state);

      // Enemy at B (1 edge), within range 2 → TRUE → THEN = defend
      expect(result.events[0].action).toBe('defend');
    });
  });

  describe('Multi-turn expansion', () => {
    test('expanding over 3 turns claims 3 nodes', () => {
      let dom = makeDominion({
        instructions: createBasicInstructions({ type: 'expand', targetNodeId: 'D' }, 0),
      });

      for (let turn = 0; turn < 3; turn++) {
        const state = makeGameState({ 'dom-1': dom }, graph);
        const result = executeDominionInstructions(dom, graph, state);
        dom = { ...result.dominion, instructions: dom.instructions };
      }

      // After 3 turns: A → B → C → D
      expect(dom.controlledNodeIds).toContain('A');
      expect(dom.controlledNodeIds).toContain('B');
      expect(dom.controlledNodeIds).toContain('C');
      expect(dom.controlledNodeIds).toContain('D');
      expect(dom.controlledNodeIds.length).toBe(4);
    });
  });
});
