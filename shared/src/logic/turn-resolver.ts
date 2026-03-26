/**
 * Turn resolver — simultaneous turn resolution logic.
 *
 * GDD §5: "Simultaneous rounds. Each player per turn:
 * 1. Review realm positions, status, reports
 * 2. Spend 2 AP — set instructions, rites, relics, rituals
 * 3. Choose next destination (free)"
 */

import type {
  GameState,
  GameConfig,
  GamePhase,
  TurnHistoryEntry,
} from '../types/game-state.js';
import type { Player, PlayerId } from '../types/player.js';
import type { Dominion, DominionId } from '../types/dominion.js';
import type { NodeId } from '../types/graph.js';
import type { RealmId } from '../types/realm.js';
import type { RealmState } from '../types/realm.js';
import type { RealmGraph } from '../types/graph.js';
import {
  createDominion,
  tickAllDominions,
  refreshDominion,
  attemptSubversion,
  ESTABLISH_AP_COST,
  INITIAL_INFLUENCE,
} from './dominion-logic.js';
import { executeAllDominionInstructions } from './instruction-executor.js';
import type { DominionInstructionSet } from '../types/instruction.js';

// ─── Turn Action Types (simplified for Milestone 2) ─────────────

export type M2TurnAction =
  | { kind: 'establish_dominion'; nodeId: NodeId; realmId: RealmId; name: string }
  | { kind: 'set_destination'; realmId: RealmId; nodeId: NodeId }
  | { kind: 'visit_dominion'; dominionId: DominionId }
  | { kind: 'subvert_dominion'; dominionId: DominionId }
  | { kind: 'set_instructions'; dominionId: DominionId; instructions: DominionInstructionSet }
  | { kind: 'pass' };

export interface M2TurnSubmission {
  playerId: PlayerId;
  actions: M2TurnAction[];
}

// ─── Turn Events ────────────────────────────────────────────────

export interface TurnEvent {
  type: 'dominion_established' | 'dominion_decayed' | 'dominion_subverted'
    | 'dominion_refreshed' | 'player_moved' | 'subversion_failed' | 'ap_exceeded'
    | 'instructions_set' | 'instruction_executed';
  playerId?: PlayerId;
  dominionId?: DominionId;
  message: string;
}

// ─── Turn Resolution ────────────────────────────────────────────

/**
 * Resolve a complete turn. Pure function — input state + submissions → output state + events.
 *
 * Resolution order:
 * 1. Process player actions (establish, visit, subvert)
 * 2. Apply dominion decay
 * 3. Move players to destinations
 * 4. Advance turn counter
 */
export function resolveTurn(
  state: GameState,
  submissions: M2TurnSubmission[],
): { newState: GameState; events: TurnEvent[] } {
  const events: TurnEvent[] = [];

  // Deep clone mutable parts
  const players: Record<PlayerId, Player> = structuredClone(state.players);
  let dominions: Record<DominionId, Dominion> = structuredClone(state.dominions);

  // Reset AP for all players
  for (const pid of Object.keys(players)) {
    players[pid as PlayerId].actionPoints = 2;
    players[pid as PlayerId].hasSubmittedTurn = false;
  }

  // ─── Phase 1: Process player actions ──────────────────────

  for (const submission of submissions) {
    const player = players[submission.playerId];
    if (!player) continue;

    let ap = 2;

    for (const action of submission.actions) {
      switch (action.kind) {
        case 'establish_dominion': {
          if (ap < ESTABLISH_AP_COST) {
            events.push({ type: 'ap_exceeded', playerId: submission.playerId, message: `${player.name} — not enough AP` });
            break;
          }
          // Check node not already controlled
          const taken = Object.values(dominions).some((d) => d.primaryNodeId === action.nodeId);
          if (taken) {
            events.push({ type: 'ap_exceeded', playerId: submission.playerId, message: `${player.name} — node already controlled` });
            break;
          }
          const dom = createDominion(submission.playerId, action.nodeId, action.realmId, state.turnNumber + 1);
          dominions[dom.id] = dom;
          player.dominionIds.push(dom.id);
          ap -= ESTABLISH_AP_COST;
          events.push({ type: 'dominion_established', playerId: submission.playerId, dominionId: dom.id, message: `${player.name} established "${action.name}"` });
          break;
        }

        case 'visit_dominion': {
          const d = dominions[action.dominionId];
          if (!d || d.ownerId !== submission.playerId) break;
          dominions[action.dominionId] = refreshDominion(d, state.turnNumber + 1);
          events.push({ type: 'dominion_refreshed', playerId: submission.playerId, dominionId: action.dominionId, message: `${player.name} refreshed "${d.primaryNodeId}"` });
          break;
        }

        case 'subvert_dominion': {
          if (ap < 1) {
            events.push({ type: 'ap_exceeded', playerId: submission.playerId, message: `${player.name} — not enough AP to subvert` });
            break;
          }
          const target = dominions[action.dominionId];
          if (!target) break;
          const result = attemptSubversion(target, submission.playerId, INITIAL_INFLUENCE * 0.8);
          ap -= 1;
          if (result.success) {
            const oldOwner = players[target.ownerId];
            if (oldOwner) oldOwner.dominionIds = oldOwner.dominionIds.filter((id) => id !== action.dominionId);
            player.dominionIds.push(action.dominionId);
            dominions[action.dominionId] = result.dominion;
            events.push({ type: 'dominion_subverted', playerId: submission.playerId, dominionId: action.dominionId, message: `${player.name} subverted "${target.primaryNodeId}"` });
          } else {
            events.push({ type: 'subversion_failed', playerId: submission.playerId, dominionId: action.dominionId, message: `${player.name} failed to subvert — ${result.reason}` });
          }
          break;
        }

        case 'set_instructions': {
          if (ap < 1) {
            events.push({ type: 'ap_exceeded', playerId: submission.playerId, message: `${player.name} — not enough AP to set instructions` });
            break;
          }
          const target = dominions[action.dominionId];
          if (!target || target.ownerId !== submission.playerId) {
            events.push({ type: 'ap_exceeded', playerId: submission.playerId, message: `${player.name} — not your dominion` });
            break;
          }
          dominions[action.dominionId] = { ...target, instructions: action.instructions };
          ap -= 1;
          events.push({ type: 'instructions_set', playerId: submission.playerId, dominionId: action.dominionId, message: `${player.name} set instructions for dominion at ${target.primaryNodeId}` });
          break;
        }

        case 'set_destination':
          player.destinationRealmId = action.realmId;
          player.destinationNodeId = action.nodeId;
          break;

        case 'pass':
          break;
      }
    }

    player.actionPoints = ap;
    player.hasSubmittedTurn = true;
  }

  // ─── Phase 2: Dominion decay ──────────────────────────────

  dominions = tickAllDominions(dominions);

  for (const dom of Object.values(dominions)) {
    if (dom.influence < 5) {
      events.push({ type: 'dominion_decayed', dominionId: dom.id, message: `Dominion at "${dom.primaryNodeId}" nearly collapsed (${dom.influence.toFixed(1)})` });
    }
  }

  // ─── Phase 2.5: Execute dominion instructions ─────────────

  const instrState: GameState = { ...state, dominions, players, turnNumber: state.turnNumber + 1 };
  const instrResult = executeAllDominionInstructions(dominions, instrState);
  dominions = instrResult.dominions;
  for (const evt of instrResult.events) {
    events.push({ type: 'instruction_executed', dominionId: evt.dominionId, message: evt.message });
  }

  // ─── Phase 3: Move players ────────────────────────────────

  for (const pid of Object.keys(players)) {
    const p = players[pid as PlayerId];
    if (p.destinationRealmId && p.destinationNodeId) {
      p.currentRealmId = p.destinationRealmId;
      p.currentNodeId = p.destinationNodeId;
      events.push({ type: 'player_moved', playerId: pid as PlayerId, message: `${p.name} moved to ${p.destinationNodeId}` });
    }
    p.destinationRealmId = null;
    p.destinationNodeId = null;
  }

  // ─── Phase 4: New state ───────────────────────────────────

  const historyEntry: TurnHistoryEntry = {
    turnNumber: state.turnNumber + 1,
    realmPositions: Object.fromEntries(
      Object.entries(state.realmStates).map(([id, rs]) => [id, { x: rs.position.x, y: rs.position.y, z: rs.position.z }]),
    ) as Record<RealmId, { x: number; y: number; z: number }>,
    events: events.map((e) => e.message),
  };

  const newState: GameState = {
    ...state,
    turnNumber: state.turnNumber + 1,
    phase: 'planning' as GamePhase,
    players,
    dominions,
    turnHistory: [...state.turnHistory, historyEntry],
    currentTurnSubmissions: {},
    activeConfrontations: [],
    activeCombats: [],
    combatResults: [],
  };

  return { newState, events };
}

// ─── Game Initialisation ────────────────────────────────────────

/**
 * Create the initial game state for a new game.
 */
export function createInitialGameState(
  playerData: { id: PlayerId; name: string; colour: string }[],
  realmGraphs: Record<RealmId, RealmGraph>,
  realmStates: Record<RealmId, RealmState>,
  config?: Partial<GameConfig>,
): GameState {
  const players: Record<PlayerId, Player> = {};
  const startRealms: RealmId[] = ['dominion', 'entropy', 'communion', 'wrath', 'memory'];

  for (let i = 0; i < playerData.length; i++) {
    const pd = playerData[i];
    const startRealm = startRealms[i % startRealms.length];
    const graph = realmGraphs[startRealm];
    const startNode = graph.nodes.find((n) => n.type === 'city') ?? graph.nodes[0];

    players[pd.id] = {
      id: pd.id,
      name: pd.name,
      colour: pd.colour,
      playerIndex: i,
      currentRealmId: startRealm,
      currentNodeId: startNode.id,
      destinationRealmId: null,
      destinationNodeId: null,
      actionPoints: 2,
      maxActionPoints: 2,
      turnLostToConfrontation: false,
      soulLedger: { playerId: pd.id, balance: 0, totalEarned: 0, totalSpent: 0, currentTurnIncome: [], history: [] },
      dominionIds: [],
      religionIds: [],
      relicIds: [],
      combatCards: [],
      missions: [],
      hasSubmittedTurn: false,
    };
  }

  const gameConfig: GameConfig = {
    beliefTagsEnabled: false,
    combatCardsEnabled: false,
    sunderingEnabled: false,
    maxPlayers: 4,
    targetConvergenceTurn: 35,
    maxInstructionNodes: 8,
    ...config,
  };

  return {
    gameId: `game-${Date.now()}`,
    turnNumber: 0,
    phase: 'planning' as GamePhase,
    config: gameConfig,
    players,
    turnOrder: playerData.map((p) => p.id),
    realmGraphs,
    realmStates,
    realmInteractions: [],
    dominions: {},
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
  };
}
