import type { GameState } from '../types/game-state.js';
import type { PlayerId } from '../types/player.js';
import type { NodeId } from '../types/graph.js';
import type { RealmId } from '../types/realm.js';
import type { M2TurnSubmission } from './turn-resolver.js';

export interface ConfrontationEvent {
  nodeId: NodeId;
  realmId: RealmId;
  playersInvolved: PlayerId[];
  winnerId: PlayerId | null; // null if tie or mutual coexistence
  losersExpelled: { playerId: PlayerId; expelledToNodeId: NodeId; lostTurn: boolean }[];
  details: string;
}

/**
 * Identify any nodes with multiple players and resolve their confrontation stances.
 */
export function resolveConfrontations(state: GameState, submissions: Record<PlayerId, M2TurnSubmission>): ConfrontationEvent[] {
  // 1. Group players by current node
  const nodesWithPlayers: Record<NodeId, { realmId: RealmId; players: PlayerId[] }> = {};
  
  for (const pid of state.turnOrder) {
    const p = state.players[pid as PlayerId];
    if (!p) continue;
    
    if (!nodesWithPlayers[p.currentNodeId]) {
      nodesWithPlayers[p.currentNodeId] = { realmId: p.currentRealmId, players: [] };
    }
    nodesWithPlayers[p.currentNodeId].players.push(pid as PlayerId);
  }

  const events: ConfrontationEvent[] = [];

  // 2. Resolve nodes with > 1 player
  for (const [nodeIdStr, group] of Object.entries(nodesWithPlayers)) {
    const nodeId = nodeIdStr as NodeId;
    if (group.players.length < 2) continue; // No confrontation

    // For prototype 4-player, we assume at most 2 players usually co-locate. 
    // If >2, we just take the highest bid among all confronters. Retreater loses auto.
    
    let maxBid = -1;
    let winners: PlayerId[] = [];
    const losers: { playerId: PlayerId; expelledToNodeId: NodeId; lostTurn: boolean }[] = [];
    const coexisters: PlayerId[] = [];
    let someoneConfronted = false;

    // Gather stances
    const stances = group.players.map(pid => {
      const sub = submissions[pid];
      // Default to coexist 0 if they failed to submit a stance
      const stance = sub?.confrontationStance?.stance || 'coexist';
      const bid = sub?.confrontationStance?.bid || 0;
      return { pid, stance, bid };
    });

    // Check if anyone confronted
    for (const playerStance of stances) {
      if (playerStance.stance === 'confront') someoneConfronted = true;
    }

    if (!someoneConfronted) {
      // Everyone coexists or retreats!
      // Anyone who chose 'retreat' still gets expelled.
      for (const playerStance of stances) {
        if (playerStance.stance === 'retreat') {
          const adj = getRandomAdjacent(state, group.realmId, nodeId);
          losers.push({ playerId: playerStance.pid, expelledToNodeId: adj || nodeId, lostTurn: true });
        } else {
          coexisters.push(playerStance.pid);
        }
      }
      if (losers.length > 0) {
         events.push({
           nodeId, realmId: group.realmId, playersInvolved: group.players, winnerId: null,
           losersExpelled: losers, details: 'Mutual avoidance.'
         });
      }
      continue;
    }

    // GDD §5.1: Someone confronted. Only 'confront' players participate in bidding.
    // 'coexist' players stay at the node and act normally — they didn't choose to fight.
    // 'retreat' players flee regardless.
    const confronters: typeof stances = [];
    
    for (const playerStance of stances) {
      if (playerStance.stance === 'retreat') {
        const adj = getRandomAdjacent(state, group.realmId, nodeId);
        losers.push({ playerId: playerStance.pid, expelledToNodeId: adj || nodeId, lostTurn: true });
      } else if (playerStance.stance === 'confront') {
        confronters.push(playerStance);
      } else {
        // 'coexist' — they stay and act normally (GDD §5.1)
        coexisters.push(playerStance.pid);
      }
    }

    // If only one confronter and no other confronters, they win by default (no bid needed)
    if (confronters.length === 1) {
      winners = [confronters[0].pid];
      // GDD §5.1: "The winner keeps their bid" — no deduction
    } else if (confronters.length > 1) {
      // Multiple confronters: highest bid wins
      for (const playerStance of confronters) {
        if (playerStance.bid > maxBid) {
          maxBid = playerStance.bid;
          winners = [playerStance.pid];
        } else if (playerStance.bid === maxBid) {
          winners.push(playerStance.pid);
        }
      }

      // Handle ties
      if (winners.length > 1) {
        // Mutual destruction/expulsion for tying confronters
        for (const t of winners) {
          const adj = getRandomAdjacent(state, group.realmId, nodeId);
          losers.push({ playerId: t, expelledToNodeId: adj || nodeId, lostTurn: true });
          
          // Tiers lose their bid
          state.players[t].soulLedger.balance -= maxBid;
          state.players[t].soulLedger.history.push({
            purpose: 'Confrontation Tie',
            amount: maxBid,
            turn: state.turnNumber
          });
        }
        winners = [];
      }
      // GDD §5.1: "The winner keeps their bid" — no deduction for the sole winner
    }

    // Losing confronters (those who confronted but lost the bid) are expelled
    for (const playerStance of confronters) {
      if (winners.length === 1 && playerStance.pid === winners[0]) continue;
      // If not winner and not already in losers array
      if (!losers.find(l => l.playerId === playerStance.pid)) {
         const adj = getRandomAdjacent(state, group.realmId, nodeId);
         losers.push({ playerId: playerStance.pid, expelledToNodeId: adj || nodeId, lostTurn: true });
         
         // Loser forfeits their bid
         if (playerStance.bid > 0) {
           state.players[playerStance.pid].soulLedger.balance -= playerStance.bid;
           state.players[playerStance.pid].soulLedger.history.push({
             purpose: 'Confrontation Loss',
             amount: playerStance.bid,
             turn: state.turnNumber
           });
         }
      }
    }

    events.push({
      nodeId, realmId: group.realmId, playersInvolved: group.players, winnerId: winners.length === 1 ? winners[0] : null,
      losersExpelled: losers,
      details: winners.length === 1 ? `${winners[0]} dominated the location.` : (confronters.length > 1 ? `Savage tie resulted in mutual expulsion.` : 'Confrontation resolved.')
    });
  }

  return events;
}

function getRandomAdjacent(state: GameState, realmId: RealmId, nodeId: NodeId): NodeId | null {
  const g = state.realmGraphs[realmId];
  if (!g) return null;
  const adjNodes: NodeId[] = [];
  for (const e of g.edges) {
    if (e.severed) continue;
    if (e.sourceNodeId === nodeId) adjNodes.push(e.targetNodeId);
    else if (e.targetNodeId === nodeId) adjNodes.push(e.sourceNodeId);
  }
  if (adjNodes.length === 0) return null;
  return adjNodes[Math.floor(Math.random() * adjNodes.length)];
}
