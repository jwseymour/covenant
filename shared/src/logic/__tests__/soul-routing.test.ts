/**
 * Unit tests for the soul economy.
 *
 * Tests: ledger creation, religion income computation, income application,
 * spending, win-condition standings.
 */

import { describe, test, expect } from 'vitest';
import {
  createSoulLedger,
  computeReligionSoulIncome,
  applyIncome,
  spendSouls,
  processAllSoulIncome,
  getSoulStandings,
  STARTING_SOUL_BALANCE,
  BASE_SOULS_PER_NODE,
} from '../soul-routing.js';
import { foundReligion } from '../religion-logic.js';
import type { Religion } from '../../types/religion.js';
import type { GameState } from '../../types/game-state.js';
import type { RealmGraph } from '../../types/graph.js';
import type { RealmId, RealmState } from '../../types/realm.js';
import type { Player, PlayerId } from '../../types/player.js';

// ─── Test Helpers ───────────────────────────────────────────────

function makePlayer(id: string, name: string, religionIds: string[] = []): Player {
  return {
    id, name, colour: '#aaa', playerIndex: 0,
    currentRealmId: 'communion', currentNodeId: 'A',
    destinationRealmId: null, destinationNodeId: null,
    actionPoints: 2, maxActionPoints: 2, turnLostToConfrontation: false,
    soulLedger: createSoulLedger(id),
    dominionIds: [], religionIds,
    relicIds: [], combatCards: [], missions: [], hasSubmittedTurn: false,
    intel: [],
  };
}

function makeMinimalGameState(
  players: Record<PlayerId, Player>,
  religions: Record<string, Religion>,
): GameState {
  return {
    gameId: 'test', turnNumber: 5, phase: 'planning',
    config: {
      beliefTagsEnabled: true, combatCardsEnabled: false, sunderingEnabled: false,
      maxPlayers: 4, targetConvergenceTurn: 35, maxInstructionNodes: 8,
    },
    players,
    turnOrder: Object.keys(players),
    realmGraphs: {} as Record<RealmId, RealmGraph>,
    realmStates: {} as Record<RealmId, RealmState>,
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

describe('Soul Economy', () => {
  describe('Ledger Creation', () => {
    test('creates ledger with starting balance', () => {
      const ledger = createSoulLedger('player-1');
      expect(ledger.balance).toBe(STARTING_SOUL_BALANCE);
      expect(ledger.totalEarned).toBe(STARTING_SOUL_BALANCE);
      expect(ledger.totalSpent).toBe(0);
      expect(ledger.currentTurnIncome).toEqual([]);
    });
  });

  describe('Religion Soul Income', () => {
    test('generates income proportional to follower coverage', () => {
      const rel = foundReligion('player-1', 'A', 'communion', 'Faith', ['unity', 'empathy'], 1);
      // 1 node at 100% → BASE_SOULS_PER_NODE
      const income = computeReligionSoulIncome({ [rel.id]: rel }, 5);
      const playerIncome = income['player-1'] ?? [];
      const total = playerIncome.reduce((s, i) => s + i.amount, 0);
      expect(total).toBe(BASE_SOULS_PER_NODE);
    });

    test('partial followers generate proportional income', () => {
      let rel = foundReligion('player-1', 'A', 'communion', 'Faith', ['unity', 'empathy'], 1);
      rel = { ...rel, followersByNode: { 'A': 50 } };

      const income = computeReligionSoulIncome({ [rel.id]: rel }, 5);
      const total = (income['player-1'] ?? []).reduce((s, i) => s + i.amount, 0);
      expect(total).toBe(Math.floor(BASE_SOULS_PER_NODE * 0.5));
    });

    test('multiple nodes generate cumulative income', () => {
      let rel = foundReligion('player-1', 'A', 'communion', 'Faith', ['unity', 'empathy'], 1);
      rel = { ...rel, followersByNode: { 'A': 100, 'B': 100, 'C': 100 } };

      const income = computeReligionSoulIncome({ [rel.id]: rel }, 5);
      const total = (income['player-1'] ?? []).reduce((s, i) => s + i.amount, 0);
      expect(total).toBe(BASE_SOULS_PER_NODE * 3);
    });

    test('disrupted soul routing generates zero', () => {
      let rel = foundReligion('player-1', 'A', 'communion', 'Faith', ['unity', 'empathy'], 1);
      rel = { ...rel, soulRoutingDisrupted: true };

      const income = computeReligionSoulIncome({ [rel.id]: rel }, 5);
      expect(income['player-1'] ?? []).toEqual([]);
    });

    test('Sacrifice tag boosts soul yield', () => {
      const relNormal = foundReligion('player-1', 'A', 'communion', 'Normal', ['unity', 'empathy'], 1);
      const relSacrifice = foundReligion('player-2', 'B', 'communion', 'Sacrifice', ['sacrifice', 'order'], 1);

      const incomeNormal = computeReligionSoulIncome({ [relNormal.id]: relNormal }, 5);
      const incomeSacrifice = computeReligionSoulIncome({ [relSacrifice.id]: relSacrifice }, 5);

      const totalNormal = (incomeNormal['player-1'] ?? []).reduce((s, i) => s + i.amount, 0);
      const totalSacrifice = (incomeSacrifice['player-2'] ?? []).reduce((s, i) => s + i.amount, 0);

      // Sacrifice should generate more souls (×1.5 modifier)
      expect(totalSacrifice).toBeGreaterThan(totalNormal);
    });
  });

  describe('Ledger Operations', () => {
    test('applyIncome adds to balance and records', () => {
      const ledger = createSoulLedger('player-1');
      const income = [
        { source: 'religion' as const, religionId: 'r1', amount: 20, turn: 5 },
        { source: 'religion' as const, religionId: 'r1', amount: 15, turn: 5 },
      ];
      const updated = applyIncome(ledger, income);
      expect(updated.balance).toBe(STARTING_SOUL_BALANCE + 35);
      expect(updated.totalEarned).toBe(STARTING_SOUL_BALANCE + 35);
      expect(updated.currentTurnIncome).toHaveLength(2);
    });

    test('spendSouls deducts from balance', () => {
      const ledger = createSoulLedger('player-1');
      const updated = spendSouls(ledger, 50, 'Rite of Sight', 5);
      expect(updated).not.toBeNull();
      expect(updated!.balance).toBe(STARTING_SOUL_BALANCE - 50);
      expect(updated!.totalSpent).toBe(50);
    });

    test('spendSouls returns null if insufficient', () => {
      const ledger = createSoulLedger('player-1');
      const updated = spendSouls(ledger, STARTING_SOUL_BALANCE + 1, 'Too expensive', 5);
      expect(updated).toBeNull();
    });
  });

  describe('processAllSoulIncome', () => {
    test('applies religion income to correct players', () => {
      const rel1 = foundReligion('p1', 'A', 'communion', 'Faith1', ['unity', 'empathy'], 1);
      const rel2 = foundReligion('p2', 'B', 'communion', 'Faith2', ['fury', 'defiance'], 1);

      const players: Record<PlayerId, Player> = {
        'p1': makePlayer('p1', 'Player1', [rel1.id]),
        'p2': makePlayer('p2', 'Player2', [rel2.id]),
      };

      const religions = { [rel1.id]: rel1, [rel2.id]: rel2 };

      const updated = processAllSoulIncome(players, religions, 5);

      // Both should have gained souls from their religions
      expect(updated['p1'].soulLedger.balance).toBeGreaterThan(STARTING_SOUL_BALANCE);
      expect(updated['p2'].soulLedger.balance).toBeGreaterThan(STARTING_SOUL_BALANCE);

      // Each should have income records
      expect(updated['p1'].soulLedger.currentTurnIncome.length).toBeGreaterThan(0);
      expect(updated['p2'].soulLedger.currentTurnIncome.length).toBeGreaterThan(0);
    });
  });

  describe('Win Condition Standings', () => {
    test('ranks players by soul balance', () => {
      const p1 = makePlayer('p1', 'Player1');
      const p2 = makePlayer('p2', 'Player2');
      p1.soulLedger.balance = 200;
      p2.soulLedger.balance = 150;

      const state = makeMinimalGameState({ 'p1': p1, 'p2': p2 }, {});
      const standings = getSoulStandings(state);

      expect(standings[0].playerId).toBe('p1');
      expect(standings[0].rank).toBe(1);
      expect(standings[1].playerId).toBe('p2');
      expect(standings[1].rank).toBe(2);
    });
  });
});
