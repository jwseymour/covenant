/**
 * Combat logic tests — GDD §5.2
 *
 * "Mostly deterministic with slight randomness."
 * - Defender gets +20% defensive bonus
 * - Stronger side wins; casualties proportional to strength ratio
 * - Small random factor (±10%)
 * - Souls collected from fallen warriors, claimed by dominant religion
 * - Belief tag modifiers: fury, sacrifice, unity, empathy
 */

import { describe, test, expect, vi } from 'vitest';
import { resolveCombat } from '../combat-logic.js';
import type { GameState } from '../../types/game-state.js';
import type { Dominion, DominionId } from '../../types/dominion.js';
import type { Religion } from '../../types/religion.js';
import type { RealmGraph, GameNode } from '../../types/graph.js';
import type { RealmId, RealmState } from '../../types/realm.js';


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

function makeReligion(id: string, owner: string, nodeId: string, tags: string[] = [], followers = 80): Religion {
  return {
    id, founderId: owner, foundedRealmId: 'dominion', foundedNodeId: nodeId,
    name: `Religion ${id}`, foundedTurn: 1,
    beliefTags: tags as any,
    followersByNode: { [nodeId]: followers },
    nodeCount: 1, stability: 80, fractured: false, fractureTurnsRemaining: 0,
    instructions: null, soulsPerTurn: 5, soulRoutingDisrupted: false,
  };
}

function makeGameState(
  dominions: Record<string, Dominion>,
  religions: Record<string, Religion> = {},
  nodePopulation = 5000,
): GameState {
  const rs: RealmState = { realmId: 'dominion', position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, mass: 1, trajectoryPrediction: [] };
  const graph: RealmGraph = {
    realmId: 'dominion',
    nodes: [makeNode('node-A', nodePopulation), makeNode('node-B', nodePopulation)],
    edges: [{ id: 'e1', sourceNodeId: 'node-A', targetNodeId: 'node-B', weight: 1, temporary: false, severed: false }],
  };
  return {
    gameId: 'test', turnNumber: 5, phase: 'planning',
    config: { beliefTagsEnabled: true, combatCardsEnabled: false, sunderingEnabled: false, maxPlayers: 4, targetConvergenceTurn: 35, maxInstructionNodes: 8 },
    players: {} as any, turnOrder: [],
    realmGraphs: { dominion: graph, entropy: graph, communion: graph, wrath: graph, memory: graph } as Record<RealmId, RealmGraph>,
    realmStates: { dominion: rs, entropy: rs, communion: rs, wrath: rs, memory: rs } as Record<RealmId, RealmState>,
    realmInteractions: [], dominions, religions, mergeZones: {}, relics: {}, siteRites: {},
    currentTurnSubmissions: {}, activeConfrontations: [], activeCombats: [], combatResults: [], turnHistory: [], sundering: null,
  } as GameState;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Combat Logic — GDD §5.2', () => {

  test('stronger attacker wins when random factor is neutral (1.0)', () => {
    // Fix random to 0.5 → factor = 0.9 + 0.5*0.2 = 1.0
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const atk = makeDominion('dom-atk', 'p1', ['node-A', 'node-B', 'node-C'], 100);
    const def = makeDominion('dom-def', 'p2', ['node-B'], 50);
    const state = makeGameState({ 'dom-atk': atk, 'dom-def': def });

    const result = resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B');
    expect(result.winner).toBe('attacker');

    vi.restoreAllMocks();
  });

  test('defender gets +20% bonus — weaker attacker can lose', () => {
    // Neutral random
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    // Attacker slightly stronger base, but defender bonus should tip it
    // Atk: 1 node * 60 influence = 60, * 1.0 = 60
    // Def: 1 node * 55 influence = 55, * 1.0 * 1.2 = 66
    const atk = makeDominion('dom-atk', 'p1', ['node-A'], 60);
    const def = makeDominion('dom-def', 'p2', ['node-B'], 55);
    const state = makeGameState({ 'dom-atk': atk, 'dom-def': def });

    const result = resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B');
    expect(result.winner).toBe('defender');

    vi.restoreAllMocks();
  });

  test('casualties are proportional to strength ratio', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    // Massive attacker vs tiny defender
    const atk = makeDominion('dom-atk', 'p1', ['node-A', 'node-B', 'node-C', 'node-D' as any], 100);
    const def = makeDominion('dom-def', 'p2', ['node-B'], 20);
    const state = makeGameState({ 'dom-atk': atk, 'dom-def': def });

    const result = resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B');
    expect(result.winner).toBe('attacker');
    // Winner should suffer a lower casualty PERCENTAGE than loser
    // Base strengths: attacker = 4*100 = 400, defender = 1*20 = 20
    const atkPct = result.attackerCasualties / (atk.controlledNodeIds.length * atk.influence);
    const defPct = result.defenderCasualties / (def.controlledNodeIds.length * def.influence);
    expect(atkPct).toBeLessThan(defPct);

    vi.restoreAllMocks();
  });

  test('souls released from combat, claimed by dominant religion', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const atk = makeDominion('dom-atk', 'p1', ['node-A', 'node-B'], 100);
    const def = makeDominion('dom-def', 'p2', ['node-B'], 50);
    // p1's religion dominates node-B
    const rel = makeReligion('rel-1', 'p1', 'node-B', [], 80);
    const state = makeGameState({ 'dom-atk': atk, 'dom-def': def }, { 'rel-1': rel });

    const result = resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B');
    expect(result.soulsReleased).toBeGreaterThan(0);
    expect(result.soulClaimantId).toBe('p1');

    vi.restoreAllMocks();
  });

  test('fury belief tag boosts combat modifier for attacker', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    // Equal strength, but attacker has fury tag religion at the node
    const atk = makeDominion('dom-atk', 'p1', ['node-B'], 80);
    const def = makeDominion('dom-def', 'p2', ['node-B'], 80);
    const relFury = makeReligion('rel-fury', 'p1', 'node-B', ['fury', 'defiance'], 80);
    const state = makeGameState({ 'dom-atk': atk, 'dom-def': def }, { 'rel-fury': relFury });

    const result = resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B');
    // Fury gives +0.3 combat modifier to attacker, should tip the balance
    expect(result.winner).toBe('attacker');

    vi.restoreAllMocks();
  });

  test('empathy belief tag boosts defender', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    // Equal base strength, but defender has empathy tag (+0.4 defense)
    const atk = makeDominion('dom-atk', 'p1', ['node-B'], 80);
    const def = makeDominion('dom-def', 'p2', ['node-B'], 80);
    const relEmpathy = makeReligion('rel-emp', 'p2', 'node-B', ['empathy', 'unity'], 80);
    const state = makeGameState({ 'dom-atk': atk, 'dom-def': def }, { 'rel-emp': relEmpathy });

    const result = resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B');
    // Empathy (+0.4) + Unity (+0.15) + defender bonus (1.2x) should tip to defender
    expect(result.winner).toBe('defender');

    vi.restoreAllMocks();
  });

  test('sacrifice belief tag increases souls released', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const atk = makeDominion('dom-atk', 'p1', ['node-A', 'node-B'], 100);
    const def = makeDominion('dom-def', 'p2', ['node-B'], 50);

    // Without sacrifice
    const stateNoSac = makeGameState({ 'dom-atk': atk, 'dom-def': def });
    const resultNoSac = resolveCombat(stateNoSac, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B');

    // With sacrifice tag
    const relSac = makeReligion('rel-sac', 'p1', 'node-B', ['sacrifice', 'order'], 80);
    const stateSac = makeGameState(
      { 'dom-atk': { ...atk }, 'dom-def': { ...def } },
      { 'rel-sac': relSac },
    );
    const resultSac = resolveCombat(stateSac, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B');

    // Sacrifice should produce more souls
    expect(resultSac.soulsReleased).toBeGreaterThan(resultNoSac.soulsReleased);

    vi.restoreAllMocks();
  });

  test('random factor stays within ±10%', () => {
    // At lower bound (random = 0) → factor = 0.9
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const atk = makeDominion('dom-atk', 'p1', ['node-A'], 100);
    const def = makeDominion('dom-def', 'p2', ['node-B'], 50);
    const state = makeGameState({ 'dom-atk': atk, 'dom-def': def });
    const r1 = resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B');
    expect(r1.randomFactor).toBeCloseTo(0.9, 1);

    // At upper bound (random = 1) → factor = 1.1
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const r2 = resolveCombat(state, 'dom-atk' as DominionId, 'dom-def' as DominionId, 'node-B');
    expect(r2.randomFactor).toBeCloseTo(1.1, 1);

    vi.restoreAllMocks();
  });
});
