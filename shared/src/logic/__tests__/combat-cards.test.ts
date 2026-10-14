/**
 * Combat card tests — GDD §5.2 [TOGGLEABLE]
 *
 * Tests card library, combat integration, toggle system, special effects.
 */

import { describe, test, expect, vi } from 'vitest';
import {
  COMBAT_CARD_LIBRARY,
  createCombatCard,
  grantRandomCombatCard,
  getPlayableCards,
  checkFlankingCondition,
} from '../combat-cards.js';
import { resolveCombat } from '../combat-logic.js';
import type { CombatCardType } from '../../types/combat.js';
import type { GameState } from '../../types/game-state.js';
import type { Dominion, DominionId } from '../../types/dominion.js';
import type { RealmId, RealmState } from '../../types/realm.js';
import type { RealmGraph, GameNode } from '../../types/graph.js';

// ─── Helpers ────────────────────────────────────────────────────

function makeNode(id: string, pop = 5000): GameNode {
  return { id, realmId: 'dominion', type: 'city', name: id, position: { x: 0, y: 0 }, population: pop, depopulated: false, depopulationTurnsRemaining: 0 };
}

function makeDominion(id: string, owner: string, nodeIds: string[], influence = 80): Dominion {
  return {
    id: id as DominionId, ownerId: owner, realmId: 'dominion',
    primaryNodeId: nodeIds[0], controlledNodeIds: nodeIds,
    influence, decayRate: 3.5, lastVisitedTurn: 0, establishedTurn: 0,
    armyStrength: 100, armyBaseSize: 80, troopQualityModifier: 1.0, instructions: null, scoutReports: [],
  };
}

function makeGameState(
  dominions: Record<string, Dominion>,
  cardsEnabled = true,
  nodePopulation = 5000,
): GameState {
  const rs: RealmState = { realmId: 'dominion', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, mass: 1, trajectoryPrediction: [] };
  const graph: RealmGraph = {
    realmId: 'dominion',
    nodes: [makeNode('node-A', nodePopulation), makeNode('node-B', nodePopulation), makeNode('node-C', nodePopulation)],
    edges: [
      { id: 'e1', sourceNodeId: 'node-A', targetNodeId: 'node-B', weight: 1, temporary: false, severed: false },
      { id: 'e2', sourceNodeId: 'node-B', targetNodeId: 'node-C', weight: 1, temporary: false, severed: false },
      { id: 'e3', sourceNodeId: 'node-A', targetNodeId: 'node-C', weight: 1, temporary: false, severed: false },
    ],
  };
  return {
    gameId: 'test', turnNumber: 5, phase: 'planning',
    config: { beliefTagsEnabled: true, combatCardsEnabled: cardsEnabled, sunderingEnabled: false, maxPlayers: 4, targetConvergenceTurn: 35, maxInstructionNodes: 8 },
    players: {} as any, turnOrder: [],
    realmGraphs: { dominion: graph, entropy: graph, communion: graph, wrath: graph, memory: graph } as Record<RealmId, RealmGraph>,
    realmStates: { dominion: rs, entropy: rs, communion: rs, wrath: rs, memory: rs } as Record<RealmId, RealmState>,
    realmInteractions: [], dominions, religions: {}, mergeZones: {}, relics: {}, siteRites: {},
    currentTurnSubmissions: {}, activeConfrontations: [], activeCombats: [], combatResults: [], turnHistory: [], sundering: null,
  } as GameState;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Combat Cards — GDD §5.2 [TOGGLEABLE]', () => {

  describe('Card Library', () => {
    test('library contains all 8 card types', () => {
      const types: CombatCardType[] = ['ambush', 'zealous_charge', 'fortify', 'feigned_retreat', 'divine_intervention', 'scorched_earth', 'flanking_manoeuvre', 'shield_wall'];
      for (const t of types) {
        expect(COMBAT_CARD_LIBRARY[t]).toBeDefined();
        expect(COMBAT_CARD_LIBRARY[t].name).toBeTruthy();
      }
    });

    test('each card has valid modifiers', () => {
      for (const card of Object.values(COMBAT_CARD_LIBRARY)) {
        expect(card.attackModifier).toBeGreaterThan(0);
        expect(card.defenceModifier).toBeGreaterThan(0);
        expect(card.casualtyModifier).toBeGreaterThan(0);
        expect(['common', 'uncommon', 'rare', 'legendary']).toContain(card.rarity);
      }
    });
  });

  describe('Card Creation & Management', () => {
    test('createCombatCard creates a valid card', () => {
      const card = createCombatCard('ambush');
      expect(card.id).toBeTruthy();
      expect(card.type).toBe('ambush');
      expect(card.used).toBe(false);
    });

    test('grantRandomCombatCard returns a valid card', () => {
      const card = grantRandomCombatCard();
      expect(card.id).toBeTruthy();
      expect(card.used).toBe(false);
      expect(Object.keys(COMBAT_CARD_LIBRARY)).toContain(card.type);
    });

    test('getPlayableCards filters used cards', () => {
      const cards = [
        createCombatCard('ambush'),
        createCombatCard('fortify'),
        createCombatCard('shield_wall'),
      ];
      cards[1].used = true;
      expect(getPlayableCards(cards)).toHaveLength(2);
    });
  });

  describe('Combat Integration', () => {
    test('cards ignored when combatCardsEnabled is false', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const atk = makeDominion('dom-atk', 'p1', ['node-A'], 80);
      const def = makeDominion('dom-def', 'p2', ['node-B'], 80);
      const stateOff = makeGameState({ 'dom-atk': atk, 'dom-def': def }, false);

      const card = createCombatCard('divine_intervention'); // Massive boost
      const r1 = resolveCombat(stateOff, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B', [card]);

      // Card should be ignored — equal strength, defender wins with bonus
      expect(r1.winner).toBe('defender');
      expect(card.used).toBe(false); // Not consumed

      vi.restoreAllMocks();
    });

    test('ambush negates defensive bonus', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const atk = makeDominion('dom-atk', 'p1', ['node-A'], 82);
      const def = makeDominion('dom-def', 'p2', ['node-B'], 80);
      const state = makeGameState({ 'dom-atk': atk, 'dom-def': def }, true);

      // Without ambush: atk=82, def=80*1.2=96 → defender wins
      const r1 = resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B');
      expect(r1.winner).toBe('defender');

      // With ambush: atk=82, def=80*1.0=80 → attacker wins
      const card = createCombatCard('ambush');
      const state2 = makeGameState(
        { 'dom-atk': makeDominion('dom-atk', 'p1', ['node-A'], 82), 'dom-def': makeDominion('dom-def', 'p2', ['node-B'], 80) },
        true
      );
      const r2 = resolveCombat(state2, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B', [card]);
      expect(r2.winner).toBe('attacker');
      expect(card.used).toBe(true);

      vi.restoreAllMocks();
    });

    test('fortify card boosts defence', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      // Equal strength — defender already wins with base bonus
      // With fortify: defence *= 1.5 — should be an even more decisive defence win
      const atk = makeDominion('dom-atk', 'p1', ['node-A'], 100);
      const def = makeDominion('dom-def', 'p2', ['node-B'], 60);
      const state = makeGameState({ 'dom-atk': atk, 'dom-def': def }, true);
      
      const card = createCombatCard('fortify');
      const result = resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B', [], [card]);
      
      // def = 60 * 1.5(fortify) * 1.2(defence bonus) = 108 vs atk = 100
      expect(result.winner).toBe('defender');

      vi.restoreAllMocks();
    });

    test('zealous charge increases attack strength', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const atk = makeDominion('dom-atk', 'p1', ['node-A'], 75);
      const def = makeDominion('dom-def', 'p2', ['node-B'], 80);
      const state = makeGameState({ 'dom-atk': atk, 'dom-def': def }, true);

      // Without card: atk=75, def=80*1.2=96 → defender wins
      // With zealous charge: atk=75*1.4=105, def=80*0.8*1.2=76.8 → attacker wins
      const card = createCombatCard('zealous_charge');
      const result = resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B', [card]);
      expect(result.winner).toBe('attacker');

      vi.restoreAllMocks();
    });

    test('card is one-time use — marked used after combat', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const atk = makeDominion('dom-atk', 'p1', ['node-A'], 80);
      const def = makeDominion('dom-def', 'p2', ['node-B'], 80);
      const state = makeGameState({ 'dom-atk': atk, 'dom-def': def }, true);

      const card = createCombatCard('ambush');
      expect(card.used).toBe(false);
      resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B', [card]);
      expect(card.used).toBe(true);

      vi.restoreAllMocks();
    });

    test('already used card has no effect', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const atk = makeDominion('dom-atk', 'p1', ['node-A'], 82);
      const def = makeDominion('dom-def', 'p2', ['node-B'], 80);
      const state = makeGameState({ 'dom-atk': atk, 'dom-def': def }, true);

      const card = createCombatCard('ambush');
      card.used = true; // Pre-used

      const result = resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B', [card]);
      // Ambush should NOT negate defence — card is already used
      expect(result.winner).toBe('defender');

      vi.restoreAllMocks();
    });
  });

  describe('Flanking', () => {
    test('flanking condition met with 2+ adjacent controlled nodes', () => {
      const edges = [
        { sourceNodeId: 'node-A', targetNodeId: 'node-B', severed: false },
        { sourceNodeId: 'node-B', targetNodeId: 'node-C', severed: false },
        { sourceNodeId: 'node-A', targetNodeId: 'node-C', severed: false },
      ];
      // Attack node-B. control A and C (both adjacent to B)
      expect(checkFlankingCondition(['node-A', 'node-C'], 'node-B', edges)).toBe(true);
    });

    test('flanking condition fails with only 1 adjacent controlled node', () => {
      const edges = [
        { sourceNodeId: 'node-A', targetNodeId: 'node-B', severed: false },
        { sourceNodeId: 'node-B', targetNodeId: 'node-C', severed: false },
      ];
      expect(checkFlankingCondition(['node-A'], 'node-B', edges)).toBe(false);
    });

    test('severed edges don\'t count for flanking', () => {
      const edges = [
        { sourceNodeId: 'node-A', targetNodeId: 'node-B', severed: false },
        { sourceNodeId: 'node-B', targetNodeId: 'node-C', severed: true }, // severed
      ];
      expect(checkFlankingCondition(['node-A', 'node-C'], 'node-B', edges)).toBe(false);
    });
  });

  describe('Scorched Earth', () => {
    test('scorched earth devastates node when card player loses', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const atk = makeDominion('dom-atk', 'p1', ['node-A'], 50);
      const def = makeDominion('dom-def', 'p2', ['node-B'], 100);
      const state = makeGameState({ 'dom-atk': atk, 'dom-def': def }, true, 5000);

      const card = createCombatCard('scorched_earth');
      resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B', [card]);

      // Attacker loses with scorched earth — node should be devastated
      const node = state.realmGraphs['dominion'].nodes.find(n => n.id === 'node-B')!;
      expect(node.population).toBeLessThan(2000); // Significantly reduced from 5000

      vi.restoreAllMocks();
    });
  });
});
