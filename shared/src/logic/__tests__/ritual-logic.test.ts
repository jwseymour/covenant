import { describe, it, expect } from 'vitest';
import {
  performRiteOfHarvest,
  performRiteOfSeverance,
  RITUAL_COSTS,
} from '../ritual-logic';
import type { GameState, GameConfig } from '../../types/game-state';
import type { RealmGraph, GameNode, GameEdge } from '../../types/graph';
import type { Player } from '../../types/player';

function createDummyGameState(): GameState {
  const nodeA: GameNode = { id: 'node-A', realmId: 'dominion', type: 'city', name: 'A', position: { x: 0, y: 0 }, population: 100, depopulated: false, depopulationTurnsRemaining: 0 };
  const nodeB: GameNode = { id: 'node-B', realmId: 'dominion', type: 'city', name: 'B', position: { x: 0, y: 0 }, population: 50, depopulated: false, depopulationTurnsRemaining: 0 };
  const edgeAB: GameEdge = { id: 'edge-AB', sourceNodeId: 'node-A', targetNodeId: 'node-B', weight: 1, temporary: false, severed: false };

  const graph: RealmGraph = {
    realmId: 'dominion',
    nodes: [nodeA, nodeB],
    edges: [edgeAB],
  };

  const player: Player = {
    id: 'player-1',
    name: 'Player 1',
    colour: '#fff',
    playerIndex: 0,
    currentRealmId: 'dominion',
    currentNodeId: 'node-A',
    destinationRealmId: null,
    destinationNodeId: null,
    actionPoints: 2,
    maxActionPoints: 2,
    turnLostToConfrontation: false,
    soulLedger: { playerId: 'player-1', balance: 100, totalEarned: 100, totalSpent: 0, currentTurnIncome: [], history: [] },
    dominionIds: [], religionIds: [], relicIds: [], combatCards: [], missions: [], hasSubmittedTurn: false, intel: [],
  };

  const config: GameConfig = {
    beliefTagsEnabled: false, combatCardsEnabled: false, sunderingEnabled: false, maxPlayers: 4, targetConvergenceTurn: 35, maxInstructionNodes: 8,
  };

  return {
    gameId: 'test', turnNumber: 0, phase: 'planning', config,
    players: { 'player-1': player },
    turnOrder: ['player-1'],
    realmGraphs: { 'dominion': graph } as any,
    realmStates: {} as any, realmInteractions: [],
    dominions: {}, religions: {}, mergeZones: {}, relics: {}, siteRites: {},
    currentTurnSubmissions: {}, activeConfrontations: [], activeCombats: [], combatResults: [], turnHistory: [], sundering: null,
  };
}

describe('ritual-logic', () => {
  it('Rite of Harvest depopulates node and yields souls', () => {
    const state = createDummyGameState();
    const resultMsg = performRiteOfHarvest(state, 'player-1', 'node-A');

    expect(resultMsg).toContain('ruined');
    
    // Node check
    const nodeA = state.realmGraphs['dominion'].nodes[0];
    expect(nodeA.population).toBe(0);
    expect(nodeA.depopulated).toBe(true);
    expect(nodeA.depopulationTurnsRemaining).toBe(15);

    // Player check
    const player = state.players['player-1'];
    expect(player.soulLedger.balance).toBe(100 + 500); // base 100 + (100 pop * 5)
    expect(player.actionPoints).toBe(2 - RITUAL_COSTS['rite_of_harvest'].ap);
  });

  it('Rite of Severance severs a graph edge', () => {
    const state = createDummyGameState();
    const resultMsg = performRiteOfSeverance(state, 'player-1', 'node-A', { type: 'edge', edgeId: 'edge-AB' });

    expect(resultMsg).toContain('Path severed');

    // Edge check
    const edge = state.realmGraphs['dominion'].edges[0];
    expect(edge.severed).toBe(true);

    const player = state.players['player-1'];
    expect(player.soulLedger.balance).toBe(100 - RITUAL_COSTS['rite_of_severance'].souls);
  });
});
