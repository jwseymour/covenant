/**
 * State filter tests — GDD §4.8 information asymmetry.
 *
 * Tests that createPlayerView enforces all visibility rules:
 * - Own data fully visible
 * - Others' instructions, influence, missions, souls hidden
 * - Scout reports delivered at correct turn with partial info
 * - Deep scout (Wisdom tag) reveals full flowchart
 * - Rite of Sight data included in scouted info
 */

import { describe, test, expect } from 'vitest';
import {
  createPlayerView,
  deliverScoutReports,
  performDeepScout,
} from '../state-filter.js';
import { createBasicInstructions, createConditionalInstructions } from '../instruction-executor.js';
import type { GameState } from '../../types/game-state.js';
import type { Dominion, DominionId } from '../../types/dominion.js';
import type { Religion, ReligionId } from '../../types/religion.js';
import type { Player, PlayerId } from '../../types/player.js';
import type { RealmId, RealmState } from '../../types/realm.js';
import type { RealmGraph, GameNode } from '../../types/graph.js';
import type { SoulLedger } from '../../types/soul.js';

// ─── Helpers ────────────────────────────────────────────────────

function makeNode(id: string, pop = 1000): GameNode {
  return { id, realmId: 'dominion', type: 'city', name: id, position: { x: 0, y: 0 }, population: pop, depopulated: false, depopulationTurnsRemaining: 0 };
}

function makeSoulLedger(balance = 500): SoulLedger {
  return { playerId: 'test' as PlayerId, balance, totalEarned: balance, totalSpent: 0, currentTurnIncome: [], history: [] };
}

function makePlayer(id: string, name: string, nodeId = 'node-A'): Player {
  return {
    id: id as PlayerId, name, colour: '#ff0000', playerIndex: 0,
    currentRealmId: 'dominion', currentNodeId: nodeId,
    destinationRealmId: null, destinationNodeId: null,
    actionPoints: 2, maxActionPoints: 2, turnLostToConfrontation: false,
    soulLedger: makeSoulLedger(),
    dominionIds: [], religionIds: [], relicIds: [], combatCards: [],
    missions: [{ id: 'mission-secret', scope: 'realm', conditions: [], rewards: [], completed: false, rewardClaimed: false }] as any,
    hasSubmittedTurn: false,
    intel: [],
  };
}

function makeDominion(id: string, owner: string, nodeIds: string[], influence = 80): Dominion {
  return {
    id: id as DominionId, ownerId: owner, realmId: 'dominion',
    primaryNodeId: nodeIds[0], controlledNodeIds: nodeIds,
    influence, decayRate: 3.5, lastVisitedTurn: 0, establishedTurn: 0,
    armyStrength: 100, armyBaseSize: 80, troopQualityModifier: 1.0,
    instructions: createBasicInstructions({ type: 'defend' }, 1),
    scoutReports: [],
  };
}

function makeReligion(id: string, founderId: string, nodeFollowers: Record<string, number> = {}): Religion {
  return {
    id: id as ReligionId, founderId, foundedRealmId: 'dominion', foundedNodeId: 'node-A',
    name: 'Test Faith', foundedTurn: 1,
    beliefTags: [], followersByNode: nodeFollowers, nodeCount: Object.keys(nodeFollowers).length,
    stability: 80, fractured: false, fractureTurnsRemaining: 0,
    instructions: { action: 'hold', rate: 'slow' } as any,
    soulsPerTurn: 50, soulRoutingDisrupted: false,
  };
}

function makeGameState(
  players: Record<string, Player>,
  dominions: Record<string, Dominion> = {},
  religions: Record<string, Religion> = {},
): GameState {
  const rs: RealmState = { realmId: 'dominion', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, mass: 1, trajectoryPrediction: [] };
  const graph: RealmGraph = {
    realmId: 'dominion',
    nodes: [makeNode('node-A'), makeNode('node-B'), makeNode('node-C')],
    edges: [
      { id: 'e1', sourceNodeId: 'node-A', targetNodeId: 'node-B', weight: 1, temporary: false, severed: false },
    ],
  };
  return {
    gameId: 'test', turnNumber: 5, phase: 'planning',
    config: { beliefTagsEnabled: true, combatCardsEnabled: false, sunderingEnabled: false, maxPlayers: 4, targetConvergenceTurn: 35, maxInstructionNodes: 8 },
    players: players as any, turnOrder: Object.keys(players) as PlayerId[],
    realmGraphs: { dominion: graph, entropy: graph, communion: graph, wrath: graph, memory: graph } as Record<RealmId, RealmGraph>,
    realmStates: { dominion: rs, entropy: rs, communion: rs, wrath: rs, memory: rs } as Record<RealmId, RealmState>,
    realmInteractions: [], dominions: dominions as any, religions: religions as any,
    mergeZones: {}, relics: {}, siteRites: {},
    currentTurnSubmissions: {}, activeConfrontations: [], activeCombats: [], combatResults: [], turnHistory: [], sundering: null,
  } as GameState;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('State Filter — GDD §4.8 Information Asymmetry', () => {

  describe('createPlayerView', () => {

    test('self data is fully visible', () => {
      const p1 = makePlayer('p1', 'Alice');
      p1.soulLedger.balance = 1234;
      p1.missions = [{ id: 'secret-mission' }] as any;

      const state = makeGameState({ p1 });
      const view = createPlayerView(state, 'p1' as PlayerId);

      expect(view.self.soulLedger.balance).toBe(1234);
      expect(view.self.missions).toHaveLength(1);
      expect(view.self.missions[0].id).toBe('secret-mission');
    });

    test('other players soul count is hidden', () => {
      const p1 = makePlayer('p1', 'Alice');
      const p2 = makePlayer('p2', 'Bob');
      p2.soulLedger.balance = 9999;

      const state = makeGameState({ p1, p2 });
      const view = createPlayerView(state, 'p1' as PlayerId);

      // Other players' souls should NOT be visible
      const otherPlayer = view.otherPlayers.find(p => p.id === 'p2');
      expect(otherPlayer).toBeDefined();
      // OtherPlayerView doesn't include soulLedger at all
      expect((otherPlayer as any).soulLedger).toBeUndefined();
    });

    test('other players missions are hidden', () => {
      const p1 = makePlayer('p1', 'Alice');
      const p2 = makePlayer('p2', 'Bob');
      p2.missions = [{ id: 'secret' }, { id: 'secret2' }] as any;

      const state = makeGameState({ p1, p2 });
      const view = createPlayerView(state, 'p1' as PlayerId);

      const otherPlayer = view.otherPlayers.find(p => p.id === 'p2');
      expect(otherPlayer).toBeDefined();
      expect((otherPlayer as any).missions).toBeUndefined();
    });

    test('other players location IS visible', () => {
      const p1 = makePlayer('p1', 'Alice', 'node-A');
      const p2 = makePlayer('p2', 'Bob', 'node-B');

      const state = makeGameState({ p1, p2 });
      const view = createPlayerView(state, 'p1' as PlayerId);

      const otherPlayer = view.otherPlayers.find(p => p.id === 'p2');
      expect(otherPlayer?.currentNodeId).toBe('node-B');
      expect(otherPlayer?.currentRealmId).toBe('dominion');
    });

    test('own dominion instructions ARE visible', () => {
      const p1 = makePlayer('p1', 'Alice');
      p1.dominionIds = ['dom-1'];
      const dom = makeDominion('dom-1', 'p1', ['node-A']);

      const state = makeGameState({ p1 }, { 'dom-1': dom });
      const view = createPlayerView(state, 'p1' as PlayerId);

      expect(view.ownDominions).toHaveLength(1);
      expect(view.ownDominions[0].instructions).toBeDefined();
      expect(view.ownDominions[0].influence).toBe(80);
    });

    test('other dominion instructions are HIDDEN', () => {
      const p1 = makePlayer('p1', 'Alice');
      const p2 = makePlayer('p2', 'Bob');
      p2.dominionIds = ['dom-2'];
      const dom = makeDominion('dom-2', 'p2', ['node-B']);
      dom.instructions = createBasicInstructions({ type: 'expand', targetNodeId: 'node-A' }, 1);

      const state = makeGameState({ p1, p2 }, { 'dom-2': dom });
      const view = createPlayerView(state, 'p1' as PlayerId);

      expect(view.otherDominions).toHaveLength(1);
      // Should be DominionPublicView — no instructions, no exact influence
      expect((view.otherDominions[0] as any).instructions).toBeUndefined();
      expect((view.otherDominions[0] as any).influence).toBeUndefined();
      // But category IS visible
      expect(view.otherDominions[0].influenceCategory).toBe('firm');
      expect(view.otherDominions[0].armyCategory).toBeDefined();
    });

    test('other religion instructions are HIDDEN', () => {
      const p1 = makePlayer('p1', 'Alice');
      const p2 = makePlayer('p2', 'Bob');
      const rel = makeReligion('rel-1', 'p2', { 'node-B': 50 });

      const state = makeGameState({ p1, p2 }, {}, { 'rel-1': rel });
      const view = createPlayerView(state, 'p1' as PlayerId);

      expect(view.otherReligions).toHaveLength(1);
      // ReligionPublicView — no instructions, no exact follower counts
      expect((view.otherReligions[0] as any).instructions).toBeUndefined();
      expect((view.otherReligions[0] as any).followersByNode).toBeUndefined();
      expect((view.otherReligions[0] as any).stability).toBeUndefined();
      expect((view.otherReligions[0] as any).soulsPerTurn).toBeUndefined();
      // But general info IS visible
      expect(view.otherReligions[0].name).toBe('Test Faith');
      expect(view.otherReligions[0].sizeCategory).toBeDefined();
    });
  });

  describe('deliverScoutReports', () => {

    test('scout report delivered when turn >= availableTurn', () => {
      const p1 = makePlayer('p1', 'Alice');
      const dom1 = makeDominion('dom-1', 'p1', ['node-A']);
      dom1.scoutReports = [{
        targetNodeId: 'node-B',
        orderedTurn: 3,
        availableTurn: 5,
        delivered: false,
      }];

      const dom2 = makeDominion('dom-2', 'p2', ['node-B']);
      dom2.instructions = createBasicInstructions({ type: 'expand', targetNodeId: 'node-C' }, 1);
      dom2.armyStrength = 150;

      const state = makeGameState({ p1 }, { 'dom-1': dom1, 'dom-2': dom2 });
      state.turnNumber = 5;

      deliverScoutReports(state);

      expect(dom1.scoutReports[0].delivered).toBe(true);
      expect(dom1.scoutReports[0].topLevelDirective).toBe('expand');
      expect(dom1.scoutReports[0].armySize).toBe(150);
      // Full instructions should NOT be revealed (no Wisdom tag)
      expect(dom1.scoutReports[0].fullInstructions).toBeUndefined();
    });

    test('scout report NOT delivered before availableTurn', () => {
      const p1 = makePlayer('p1', 'Alice');
      const dom1 = makeDominion('dom-1', 'p1', ['node-A']);
      dom1.scoutReports = [{
        targetNodeId: 'node-B',
        orderedTurn: 3,
        availableTurn: 6,
        delivered: false,
      }];

      const state = makeGameState({ p1 }, { 'dom-1': dom1 });
      state.turnNumber = 5;

      deliverScoutReports(state);

      expect(dom1.scoutReports[0].delivered).toBe(false);
    });

    test('Wisdom tag upgrades scout to deep scout', () => {
      const p1 = makePlayer('p1', 'Alice');
      p1.religionIds = ['rel-1'];
      const dom1 = makeDominion('dom-1', 'p1', ['node-A']);
      dom1.scoutReports = [{
        targetNodeId: 'node-B',
        orderedTurn: 3,
        availableTurn: 5,
        delivered: false,
      }];

      const dom2 = makeDominion('dom-2', 'p2', ['node-B']);
      const instructions = createConditionalInstructions(
        { type: 'attacked' },
        { type: 'defend' },
        { type: 'expand', targetNodeId: 'node-C' },
        1,
      );
      dom2.instructions = instructions;
      dom2.armyStrength = 200;

      // Religion with Wisdom tag at the target node
      const rel = makeReligion('rel-1', 'p1', { 'node-B': 30 });
      rel.beliefTags = ['wisdom', 'remembrance'] as any;

      const state = makeGameState({ p1 }, { 'dom-1': dom1, 'dom-2': dom2 }, { 'rel-1': rel });
      state.turnNumber = 5;

      deliverScoutReports(state);

      expect(dom1.scoutReports[0].delivered).toBe(true);
      expect(dom1.scoutReports[0].fullInstructions).toBeDefined();
      expect(dom1.scoutReports[0].fullInstructions?.tier).toBe('advanced');
    });
  });

  describe('performDeepScout', () => {

    test('deep scout reveals full flowchart', () => {
      const dom = makeDominion('dom-enemy', 'p2', ['node-B']);
      dom.instructions = createConditionalInstructions(
        { type: 'influence_below', threshold: 50 },
        { type: 'recruit' },
        { type: 'defend' },
        1,
      );

      const state = makeGameState(
        { p1: makePlayer('p1', 'Alice'), p2: makePlayer('p2', 'Bob') },
        { 'dom-enemy': dom },
      );

      const report = performDeepScout(state, 'p1' as PlayerId, 'node-B');

      expect(report).toBeDefined();
      expect(report!.fullInstructions).toBeDefined();
      expect(report!.fullInstructions?.tier).toBe('advanced');
      expect(report!.armySize).toBe(100);
      expect(report!.delivered).toBe(true);
    });

    test('deep scout returns null if no enemy dominion at target', () => {
      const state = makeGameState({
        p1: makePlayer('p1', 'Alice'),
      });

      const report = performDeepScout(state, 'p1' as PlayerId, 'node-B');
      expect(report).toBeNull();
    });
  });

  describe('Rite of Sight integration', () => {

    test('player intel from Rite of Sight appears in scoutedInformation', () => {
      const p1 = makePlayer('p1', 'Alice');
      p1.intel = [{
        turn: 3,
        nodeId: 'node-B',
        type: 'dominion',
        targetId: 'dom-enemy',
        revealedInstructions: createBasicInstructions({ type: 'attack', targetNodeId: 'node-A' }, 1),
      }];

      const state = makeGameState({ p1 });
      const view = createPlayerView(state, 'p1' as PlayerId);

      expect(view.scoutedInformation).toHaveLength(1);
      expect(view.scoutedInformation[0].targetNodeId).toBe('node-B');
      expect(view.scoutedInformation[0].revealedInstructions).toBeDefined();
      expect(view.scoutedInformation[0].revealedDirective).toBe('attack');
    });
  });
});
