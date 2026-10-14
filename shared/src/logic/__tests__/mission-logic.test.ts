/**
 * Mission logic tests — GDD §4.7
 *
 * - 3 missions drawn at game start
 * - Missions reward souls, relics, information, or special abilities
 * - Can discard and redraw 1 mission at a soul cost
 */

import { describe, test, expect } from 'vitest';
import {
  drawInitialMissions,
  drawSingleMission,
  checkPlayerMissions,
  MISSION_LIBRARY,
} from '../mission-logic.js';
import type { GameState } from '../../types/game-state.js';
import type { Player } from '../../types/player.js';
import type { RealmId, RealmState } from '../../types/realm.js';
import type { RealmGraph, GameNode } from '../../types/graph.js';
import type { Dominion, DominionId } from '../../types/dominion.js';

// ─── Helpers ────────────────────────────────────────────────────

function makePlayer(id: string, dominionIds: string[] = [], religionIds: string[] = [], balance = 100): Player {
  return {
    id, name: `Player ${id}`, colour: '#fff', playerIndex: 0,
    currentRealmId: 'dominion', currentNodeId: 'A',
    destinationRealmId: null, destinationNodeId: null,
    actionPoints: 2, maxActionPoints: 2, turnLostToConfrontation: false,
    soulLedger: { playerId: id, balance, totalEarned: balance, totalSpent: 0, currentTurnIncome: [], history: [] },
    dominionIds, religionIds, relicIds: [], combatCards: [],
    missions: drawInitialMissions(id),
    hasSubmittedTurn: false, intel: [],
  };
}

function makeMinimalState(
  player: Player,
  dominions: Record<string, Dominion> = {},
  religions: Record<string, any> = {},
): GameState {
  const rs: RealmState = { realmId: 'dominion', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, mass: 1, trajectoryPrediction: [] };
  const node: GameNode = { id: 'A', realmId: 'dominion', type: 'city', name: 'A', position: { x: 0, y: 0 }, population: 100, depopulated: false, depopulationTurnsRemaining: 0 };
  const graph: RealmGraph = { realmId: 'dominion', nodes: [node], edges: [] };
  return {
    gameId: 'test', turnNumber: 5, phase: 'planning',
    config: { beliefTagsEnabled: false, combatCardsEnabled: false, sunderingEnabled: false, maxPlayers: 4, targetConvergenceTurn: 35, maxInstructionNodes: 8 },
    players: { [player.id]: player } as any, turnOrder: [player.id],
    realmGraphs: { dominion: graph, entropy: graph, communion: graph, wrath: graph, memory: graph } as Record<RealmId, RealmGraph>,
    realmStates: { dominion: rs, entropy: rs, communion: rs, wrath: rs, memory: rs } as Record<RealmId, RealmState>,
    realmInteractions: [], dominions, religions, mergeZones: {}, relics: {}, siteRites: {},
    currentTurnSubmissions: {}, activeConfrontations: [], activeCombats: [], combatResults: [], turnHistory: [], sundering: null,
  } as GameState;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Mission Logic — GDD §4.7', () => {

  describe('Drawing Missions', () => {
    test('drawInitialMissions returns exactly 3 missions', () => {
      const missions = drawInitialMissions('p1');
      expect(missions).toHaveLength(3);
    });

    test('each mission has required fields', () => {
      const missions = drawInitialMissions('p1');
      for (const m of missions) {
        expect(m.id).toBeTruthy();
        expect(m.assignedTo).toBe('p1');
        expect(m.title).toBeTruthy();
        expect(m.description).toBeTruthy();
        expect(m.completed).toBe(false);
        expect(m.conditions).toBeDefined();
        expect(m.rewards).toBeDefined();
      }
    });

    test('drawn missions have unique IDs', () => {
      const missions = drawInitialMissions('p1');
      const ids = missions.map(m => m.id);
      expect(new Set(ids).size).toBe(3);
    });

    test('drawSingleMission returns one valid mission', () => {
      const m = drawSingleMission('p1');
      expect(m.id).toBeTruthy();
      expect(m.assignedTo).toBe('p1');
      expect(m.completed).toBe(false);
    });
  });

  describe('Mission Library', () => {
    test('library has sufficient variety', () => {
      expect(MISSION_LIBRARY.length).toBeGreaterThanOrEqual(5);
    });

    test('missions have meaningful rewards', () => {
      for (const m of MISSION_LIBRARY) {
        expect(m.rewards.length).toBeGreaterThan(0);
        // Each reward should have a type
        for (const r of m.rewards) {
          expect(['souls', 'relic', 'ability']).toContain(r.type);
        }
      }
    });
  });

  describe('Progress Checking', () => {
    test('accumulate_souls mission tracks balance', () => {
      const player = makePlayer('p1', [], [], 1200);
      // Force a mission with accumulate_souls condition
      player.missions = [{
        id: 'test-m', title: 'Hoard', description: 'Get 1000 souls',
        scope: 'local', assignedTo: 'p1', completed: false, rewardsClaimed: false,
        conditions: [{ type: 'accumulate_souls', threshold: 1000, progress: 0, description: 'Souls' }],
        rewards: [{ type: 'souls', soulAmount: 100, description: '100 souls' }],
      }];

      const state = makeMinimalState(player);
      const updated = checkPlayerMissions(state, player);
      expect(updated[0].completed).toBe(true);
      expect(updated[0].conditions[0].progress).toBe(1000); // capped at threshold
    });

    test('conquer_nodes mission tracks dominion count', () => {
      const player = makePlayer('p1', ['dom-1', 'dom-2', 'dom-3']);
      player.missions = [{
        id: 'test-m', title: 'Empire', description: 'Control 3',
        scope: 'local', assignedTo: 'p1', completed: false, rewardsClaimed: false,
        conditions: [{ type: 'conquer_nodes', threshold: 3, progress: 0, description: 'Dominions' }],
        rewards: [{ type: 'souls', soulAmount: 100, description: '100 souls' }],
      }];

      const doms: Record<string, Dominion> = {};
      for (const id of ['dom-1', 'dom-2', 'dom-3']) {
        doms[id] = {
          id: id as DominionId, ownerId: 'p1', realmId: 'dominion',
          primaryNodeId: id, controlledNodeIds: [id],
          influence: 80, decayRate: 3.5, lastVisitedTurn: 0, establishedTurn: 0,
          armyStrength: 100, armyBaseSize: 80, troopQualityModifier: 1.0,
          instructions: null, scoutReports: [],
        };
      }

      const state = makeMinimalState(player, doms);
      const updated = checkPlayerMissions(state, player);
      expect(updated[0].completed).toBe(true);
    });

    test('already completed mission stays completed', () => {
      const player = makePlayer('p1');
      player.missions = [{
        id: 'test-m', title: 'Done', description: 'Already done',
        scope: 'local', assignedTo: 'p1', completed: true, rewardsClaimed: false,
        conditions: [{ type: 'accumulate_souls', threshold: 9999, progress: 9999, description: 'Souls' }],
        rewards: [{ type: 'souls', soulAmount: 100, description: '100 souls' }],
      }];

      const state = makeMinimalState(player);
      const updated = checkPlayerMissions(state, player);
      expect(updated[0].completed).toBe(true);
    });

    test('found_religions mission tracks religion count', () => {
      const player = makePlayer('p1', [], ['rel-1', 'rel-2', 'rel-3']);
      player.missions = [{
        id: 'test-m', title: 'Voices', description: 'Found 3 religions',
        scope: 'cross_realm', assignedTo: 'p1', completed: false, rewardsClaimed: false,
        conditions: [{ type: 'found_religions', threshold: 3, progress: 0, description: 'Religions' }],
        rewards: [{ type: 'souls', soulAmount: 250, description: '250 souls' }],
      }];

      const state = makeMinimalState(player);
      const updated = checkPlayerMissions(state, player);
      expect(updated[0].completed).toBe(true);
    });
  });
});
