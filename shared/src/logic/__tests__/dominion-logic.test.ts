/**
 * Dominion logic tests — GDD §2.3, §4.3
 *
 * - Influence decays ~3-4% per turn
 * - Realm-specific decay modifiers
 * - Subversion only works below VULNERABLE_THRESHOLD (60)
 * - refreshDominion updates influence + lastVisitedTurn
 * - Influence categories
 */

import { describe, test, expect } from 'vitest';
import {
  createDominion,
  applyInfluenceDecay,
  refreshDominion,
  attemptSubversion,
  getInfluenceCategory,
  tickAllDominions,
  DOMINION_DECAY_RATE,
  VULNERABLE_THRESHOLD,
  ESTABLISH_AP_COST,
  getInitialInfluenceInfo,
} from '../dominion-logic.js';
import type { Dominion } from '../../types/dominion.js';
import type { GameState } from '../../types/game-state.js';
import type { RealmId, RealmState } from '../../types/realm.js';

// ─── Helpers ────────────────────────────────────────────────────

function makeDominion(overrides: Partial<Dominion> = {}): Dominion {
  return {
    id: 'dom-1', ownerId: 'player-1', realmId: 'dominion',
    primaryNodeId: 'A', controlledNodeIds: ['A'],
    influence: 100, decayRate: 3.5, lastVisitedTurn: 0, establishedTurn: 0,
    armyStrength: 100, armyBaseSize: 80, troopQualityModifier: 1.0,
    instructions: null, scoutReports: [],
    ...overrides,
  };
}

function makeMinimalState(
  dominions: Record<string, Dominion> = {},
  realmOverrides?: Partial<Record<RealmId, RealmState>>,
): GameState {
  const rs: RealmState = { realmId: 'dominion', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, mass: 1, trajectoryPrediction: [] };
  return {
    gameId: 'test', turnNumber: 5, phase: 'planning',
    config: { beliefTagsEnabled: false, combatCardsEnabled: false, sunderingEnabled: false, maxPlayers: 4, targetConvergenceTurn: 35, maxInstructionNodes: 8 },
    players: {} as any, turnOrder: [],
    realmGraphs: {} as any,
    realmStates: { dominion: rs, entropy: rs, communion: rs, wrath: rs, memory: rs, ...realmOverrides } as any,
    realmInteractions: [], dominions, religions: {}, mergeZones: {}, relics: {}, siteRites: {},
    currentTurnSubmissions: {}, activeConfrontations: [], activeCombats: [], combatResults: [], turnHistory: [], sundering: null,
  } as GameState;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Dominion Logic — GDD §2.3, §4.3', () => {

  describe('Creation', () => {
    test('establish costs 1 AP per GDD', () => {
      expect(ESTABLISH_AP_COST).toBe(1);
    });

    test('createDominion sets full initial influence', () => {
      const dom = createDominion('p1', 'node-A', 'dominion', 1, new Set(['dominion']));
      expect(dom.ownerId).toBe('p1');
      expect(dom.primaryNodeId).toBe('node-A');
      expect(dom.influence).toBeGreaterThanOrEqual(80);
      expect(dom.controlledNodeIds).toEqual(['node-A']);
    });
  });

  describe('Decay', () => {
    test('base decay rate is ~3.5% per GDD', () => {
      expect(DOMINION_DECAY_RATE).toBeCloseTo(0.035, 3);
    });

    test('one turn of decay reduces influence by ~3.5%', () => {
      const dom = makeDominion({ influence: 100 });
      const decayed = applyInfluenceDecay(dom, new Set(['dominion']));
      // Dominion realm multiplier = 0.7, so effective = 0.035 * 0.7 = 0.0245
      // 100 * (1 - 0.0245) = 97.55
      expect(decayed.influence).toBeLessThan(100);
      expect(decayed.influence).toBeGreaterThan(90);
    });

    test('Entropy realm decays faster', () => {
      const dom = makeDominion({ influence: 100 });
      const decayedDominion = applyInfluenceDecay(dom, new Set(['dominion']));
      const decayedEntropy = applyInfluenceDecay(dom, new Set(['entropy']));
      // Entropy multiplier = 1.5, Dominion = 0.7
      expect(decayedEntropy.influence).toBeLessThan(decayedDominion.influence);
    });

    test('Memory realm decays slowest', () => {
      const dom = makeDominion({ influence: 100 });
      const decayedMemory = applyInfluenceDecay(dom, new Set(['memory']));
      const decayedWrath = applyInfluenceDecay(dom, new Set(['wrath']));
      // Memory multiplier = 0.5, Wrath = 1.0
      expect(decayedMemory.influence).toBeGreaterThan(decayedWrath.influence);
    });

    test('firm for ~7 turns, vulnerable after ~15 at base rate', () => {
      let dom = makeDominion({ influence: 100 });
      // Simulate with neutral realm (mult=1.0) — use wrath which has no modifier
      // Actually wrath has 1.0 at base, so use plain set with just generic
      for (let i = 0; i < 7; i++) {
        dom = applyInfluenceDecay(dom, new Set(['wrath']));
      }
      // After 7 turns: 100 * (1 - 0.035)^7 ≈ 78.5
      expect(dom.influence).toBeGreaterThan(VULNERABLE_THRESHOLD);

      for (let i = 0; i < 10; i++) {
        dom = applyInfluenceDecay(dom, new Set(['wrath']));
      }
      // After 17 total turns: 100 * (1 - 0.035)^17 ≈ 54.3
      expect(dom.influence).toBeLessThan(VULNERABLE_THRESHOLD);
    });

    test('influence never goes below 0', () => {
      let dom = makeDominion({ influence: 1 });
      dom = applyInfluenceDecay(dom, new Set(['entropy']));
      expect(dom.influence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Refresh', () => {
    test('refreshDominion boosts influence and updates lastVisitedTurn', () => {
      const dom = makeDominion({ influence: 60, lastVisitedTurn: 3 });
      const refreshed = refreshDominion(dom, 10, new Set(['dominion']));
      expect(refreshed.influence).toBeGreaterThan(60);
      expect(refreshed.lastVisitedTurn).toBe(10);
    });

    test('refreshDominion caps at max influence for realm', () => {
      const dom = makeDominion({ influence: 95 });
      const refreshed = refreshDominion(dom, 10, new Set(['dominion']));
      const maxInfluence = getInitialInfluenceInfo(new Set(['dominion'])).influence;
      expect(refreshed.influence).toBeLessThanOrEqual(maxInfluence);
    });
  });

  describe('Subversion', () => {
    test('subversion fails on fresh dominion (high influence)', () => {
      const dom = makeDominion({ influence: 100 });
      const result = attemptSubversion(dom, 'player-2', 80, new Set(['dominion']));
      expect(result.success).toBe(false);
      expect(result.reason).toContain('too high');
    });

    test('subversion fails on own dominion', () => {
      const dom = makeDominion({ influence: 30, ownerId: 'player-1' });
      const result = attemptSubversion(dom, 'player-1', 80, new Set(['dominion']));
      expect(result.success).toBe(false);
    });

    test('subversion succeeds when influence below threshold with sufficient gap', () => {
      const dom = makeDominion({ influence: 40 }); // Below VULNERABLE_THRESHOLD (60)
      // Need gap >= 15 (base) + 10 (dominion realm) = 25
      const result = attemptSubversion(dom, 'player-2', 80, new Set(['dominion']));
      expect(result.success).toBe(true);
      expect(result.dominion.ownerId).toBe('player-2');
    });

    test('subversion is harder in Memory realm (higher gap required)', () => {
      const dom = makeDominion({ influence: 40, realmId: 'memory' });
      // Memory adds 15 to gap, so need >= 15 + 15 = 30
      const result = attemptSubversion(dom, 'player-2', 60, new Set(['memory']));
      expect(result.success).toBe(false); // Gap = 20, need 30
    });
  });

  describe('Categories', () => {
    test('firm when influence >= 80', () => {
      expect(getInfluenceCategory(makeDominion({ influence: 85 }))).toBe('firm');
    });

    test('holding when 60 <= influence < 80', () => {
      expect(getInfluenceCategory(makeDominion({ influence: 65 }))).toBe('holding');
    });

    test('vulnerable when 30 <= influence < 60', () => {
      expect(getInfluenceCategory(makeDominion({ influence: 45 }))).toBe('vulnerable');
    });

    test('fading when influence < 30', () => {
      expect(getInfluenceCategory(makeDominion({ influence: 20 }))).toBe('fading');
    });
  });

  describe('tickAllDominions', () => {
    test('decays all dominions', () => {
      const dom1 = makeDominion({ id: 'dom-1', influence: 100 });
      const dom2 = makeDominion({ id: 'dom-2', influence: 80 });
      const state = makeMinimalState({ 'dom-1': dom1, 'dom-2': dom2 });

      const result = tickAllDominions({ 'dom-1': dom1, 'dom-2': dom2 }, state);
      expect(result['dom-1'].influence).toBeLessThan(100);
      expect(result['dom-2'].influence).toBeLessThan(80);
    });
  });
});
