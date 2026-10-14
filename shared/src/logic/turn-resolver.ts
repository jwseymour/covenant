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
import type { RealmGraph, GameEdge } from '../types/graph.js';
import type { Religion, ReligionId } from '../types/religion.js';
import type { BeliefTag } from '../types/religion.js';
import {
  createDominion,
  tickAllDominions,
  refreshDominion,
  attemptSubversion,
  ESTABLISH_AP_COST,
  getInitialInfluenceInfo,
} from './dominion-logic.js';
import { executeAllDominionInstructions } from './instruction-executor.js';
import { resolveCombat } from './combat-logic.js';
import { foundReligion, tickAllReligions, resolveHolyWars } from './religion-logic.js';
import { performRiteOfSight, performRiteOfBinding, performRiteOfHarvest, performRiteOfSeverance, type RitualType } from './ritual-logic.js';
import { executeSiteRite } from './rite-site-logic.js';
import { claimRelic, useRelic, INITIAL_RELICS } from './relic-logic.js';
import { executeMergeRite, getActiveRealms, type MergeRiteType } from './merge-logic.js';
import { processAllSoulIncome, spendSouls, STARTING_SOUL_BALANCE, MISSION_DISCARD_COST } from './soul-routing.js';
import { tickRealmStates, detectInteractions } from './realm-flow.js';
import { resolveConfrontations } from './confrontation-logic.js';
import { checkPlayerMissions, drawInitialMissions, drawSingleMission } from './mission-logic.js';
import { deliverScoutReports } from './state-filter.js';
import type { DominionInstructionSet, ReligionInstructionSet } from '../types/instruction.js';

// ─── Turn Action Types (simplified for Milestone 2) ─────────────

export type M2TurnAction =
  | { kind: 'establish_dominion'; nodeId: NodeId; realmId: RealmId; name: string }
  | { kind: 'set_destination'; realmId: RealmId; nodeId: NodeId }
  | { kind: 'visit_dominion'; dominionId: DominionId }
  | { kind: 'subvert_dominion'; dominionId: DominionId }
  | { kind: 'set_instructions'; dominionId: DominionId; instructions: DominionInstructionSet }
  | { kind: 'found_religion'; nodeId: NodeId; realmId: RealmId; name: string; beliefTags: [BeliefTag, BeliefTag] | [] }
  | { kind: 'set_religion_instructions'; religionId: ReligionId; instructions: ReligionInstructionSet }
  | { kind: 'perform_ritual'; ritualType: RitualType; nodeId: NodeId; target?: any } // Severance target object
  | { kind: 'perform_site_rite'; riteId: string; nodeId: NodeId }
  | { kind: 'claim_relic'; relicId: string; nodeId: NodeId }
  | { kind: 'use_relic'; relicId: string }
  | { kind: 'perform_merge_rite'; riteType: MergeRiteType; nodeId: NodeId; target?: any }
  | { kind: 'discard_mission'; missionId: string }
  | { kind: 'pass' };

export interface M2TurnSubmission {
  playerId: PlayerId;
  actions: M2TurnAction[];
  confrontationStance?: {
    stance: 'confront' | 'coexist' | 'retreat';
    bid: number;
  };
}

// ─── Turn Events ────────────────────────────────────────────────

export type TurnEvent =
  | { type: 'dominion_established'; playerId: PlayerId; dominionId: DominionId; message: string }
  | { type: 'dominion_decayed'; dominionId: DominionId; message: string }
  | { type: 'dominion_subverted'; playerId: PlayerId; dominionId: DominionId; message: string }
  | { type: 'dominion_refreshed'; playerId: PlayerId; dominionId: DominionId; message: string }
  | { type: 'player_moved'; playerId: PlayerId; message: string }
  | { type: 'subversion_failed'; playerId: PlayerId; dominionId: DominionId; message: string }
  | { type: 'ap_exceeded'; playerId: PlayerId; message: string }
  | { type: 'instructions_set'; playerId: PlayerId; dominionId: DominionId; message: string }
  | { type: 'instruction_executed'; dominionId: DominionId; message: string }
  | { type: 'religion_founded'; playerId: PlayerId; religionId: ReligionId; message: string }
  | { type: 'religion_instructions_set'; playerId: PlayerId; religionId: ReligionId; message: string }
  | { type: 'religion_tick'; religionId: ReligionId; message: string }
  | { type: 'soul_income'; playerId: PlayerId; message: string }
  | { type: 'soul_spent'; playerId: PlayerId; message: string }
  | { type: 'realm_access_point'; realmA: RealmId; realmB: RealmId; message: string }
  | { type: 'realm_collision'; realmA: RealmId; realmB: RealmId; message: string }
  | { type: 'ritual_performed'; playerId: PlayerId; message: string }
  | { type: 'site_rite_performed'; playerId: PlayerId; message: string }
  | { type: 'relic_claimed'; playerId: PlayerId; message: string }
  | { type: 'relic_used'; playerId: PlayerId; message: string }
  | { type: 'merge_rite_performed'; playerId: PlayerId; message: string }
  | { type: 'combat_resolved'; combatId: string; dominionId: DominionId; message: string }
  | { type: 'mission_discarded'; playerId: PlayerId; message: string };

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
  let players: Record<PlayerId, Player> = structuredClone(state.players);
  let dominions: Record<DominionId, Dominion> = structuredClone(state.dominions);
  let religions: Record<ReligionId, Religion> = structuredClone(state.religions);

  // Reset AP for all players
  for (const pid of Object.keys(players)) {
    players[pid as PlayerId].actionPoints = 2;
    players[pid as PlayerId].hasSubmittedTurn = false;
  }

  const workingState: GameState = { ...state, players, dominions, religions };

  // ─── Phase 0: Confrontations ─────────────────────────────────

  const subMap: Record<PlayerId, M2TurnSubmission> = {};
  for (const s of submissions) subMap[s.playerId] = s;

  const confEvents = resolveConfrontations(workingState, subMap);
  for (const cEvt of confEvents) {
    events.push({
      type: 'player_moved', // Using existing event type for client rendering
      playerId: cEvt.playersInvolved[0],
      message: `Confrontation at ${cEvt.nodeId}: ${cEvt.details}`
    });
    // Losers lose their turn AP and are expelled
    for (const loser of cEvt.losersExpelled) {
      if (players[loser.playerId]) {
        players[loser.playerId].actionPoints = 0;
        players[loser.playerId].currentNodeId = loser.expelledToNodeId;
      }
    }
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
          const activeRealms = getActiveRealms(workingState, action.realmId);
          const dom = createDominion(submission.playerId, action.nodeId, action.realmId, state.turnNumber + 1, activeRealms);
          dominions[dom.id] = dom;
          player.dominionIds.push(dom.id);
          ap -= ESTABLISH_AP_COST;
          events.push({ type: 'dominion_established', playerId: submission.playerId, dominionId: dom.id, message: `${player.name} established "${action.name}"` });
          break;
        }

        case 'visit_dominion': {
          const d = dominions[action.dominionId];
          if (!d || d.ownerId !== submission.playerId) break;
          const activeRealms = getActiveRealms(workingState, d.realmId);
          dominions[action.dominionId] = refreshDominion(d, state.turnNumber + 1, activeRealms);
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
          const activeRealms = getActiveRealms(workingState, target.realmId);
          const result = attemptSubversion(target, submission.playerId, getInitialInfluenceInfo(activeRealms).influence * 0.8, activeRealms);
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
          let target = dominions[action.dominionId];
          // Support setting instructions on a dominion established in the same turn
          if (!target && action.dominionId.startsWith('PENDING_DOMINION_')) {
            const nodeId = action.dominionId.replace('PENDING_DOMINION_', '');
            target = Object.values(dominions).find(d => d.primaryNodeId === nodeId && d.ownerId === submission.playerId) as Dominion;
          }
          if (!target || target.ownerId !== submission.playerId) {
            events.push({ type: 'ap_exceeded', playerId: submission.playerId, message: `${player.name} — not your dominion` });
            break;
          }
          dominions[target.id] = { ...target, instructions: action.instructions };
          ap -= 1;
          events.push({ type: 'instructions_set', playerId: submission.playerId, dominionId: target.id, message: `${player.name} set instructions for dominion at ${target.primaryNodeId}` });
          break;
        }

        case 'found_religion': {
          if (ap < 1) {
            events.push({ type: 'ap_exceeded', playerId: submission.playerId, message: `${player.name} — not enough AP to found religion` });
            break;
          }
          const rel = foundReligion(submission.playerId, action.nodeId, action.realmId, action.name, action.beliefTags, state.turnNumber + 1);
          religions[rel.id] = rel;
          player.religionIds.push(rel.id);
          ap -= 1;
          events.push({ type: 'religion_founded', playerId: submission.playerId, religionId: rel.id, message: `${player.name} founded "${action.name}"` });
          break;
        }

        case 'set_religion_instructions': {
          if (ap < 1) {
            events.push({ type: 'ap_exceeded', playerId: submission.playerId, message: `${player.name} — not enough AP to set religion instructions` });
            break;
          }
          let targetRel = religions[action.religionId];
          // Support setting instructions on a religion founded in the same turn
          if (!targetRel && action.religionId.startsWith('PENDING_RELIGION_')) {
             const relName = action.religionId.replace('PENDING_RELIGION_', '');
             targetRel = Object.values(religions).find(r => r.name === relName && r.founderId === submission.playerId) as Religion;
          }
          if (!targetRel || targetRel.founderId !== submission.playerId) {
            events.push({ type: 'ap_exceeded', playerId: submission.playerId, message: `${player.name} — not your religion` });
            break;
          }
          religions[targetRel.id] = { ...targetRel, instructions: action.instructions };
          ap -= 1;
          events.push({ type: 'religion_instructions_set', playerId: submission.playerId, religionId: targetRel.id, message: `${player.name} set commandments for "${targetRel.name}"` });
          break;
        }

        case 'perform_ritual': {
          let msg = '';
          if (action.ritualType === 'rite_of_sight') {
            msg = performRiteOfSight(workingState, submission.playerId, action.nodeId);
          } else if (action.ritualType === 'rite_of_binding') {
            msg = performRiteOfBinding(workingState, submission.playerId, action.nodeId);
          } else if (action.ritualType === 'rite_of_harvest') {
            msg = performRiteOfHarvest(workingState, submission.playerId, action.nodeId);
          } else if (action.ritualType === 'rite_of_severance' && action.target) {
            msg = performRiteOfSeverance(workingState, submission.playerId, action.nodeId, action.target);
          }
          events.push({ type: 'ritual_performed', playerId: submission.playerId, message: msg });
          ap = player.actionPoints; // sync deducted AP to local tracking block
          break;
        }

        case 'perform_site_rite': {
          const msg = executeSiteRite(workingState, submission.playerId, action.nodeId, action.riteId);
          events.push({ type: 'site_rite_performed', playerId: submission.playerId, message: msg });
          ap = player.actionPoints; // sync deducted AP
          break;
        }

        case 'claim_relic': {
          const msg = claimRelic(workingState, submission.playerId, action.nodeId, action.relicId);
          events.push({ type: 'relic_claimed', playerId: submission.playerId, message: msg });
          ap = player.actionPoints; // sync deducted AP
          break;
        }

        case 'use_relic': {
          const msg = useRelic(workingState, submission.playerId, action.relicId);
          events.push({ type: 'relic_used', playerId: submission.playerId, message: msg });
          ap = player.actionPoints; // sync deducted AP
          break;
        }

        case 'perform_merge_rite': {
          if (ap < 1) {
            events.push({ type: 'ap_exceeded', playerId: submission.playerId, message: `${player.name} — not enough AP to perform merge rite` });
            break;
          }
          const err = executeMergeRite(workingState, submission.playerId, action.nodeId, action.riteType, action.target);
          if (err) {
            events.push({ type: 'ap_exceeded', playerId: submission.playerId, message: err });
          } else {
            ap -= 1;
            player.actionPoints = ap;
            events.push({ type: 'merge_rite_performed', playerId: submission.playerId, message: `${player.name} performed a Merge Rite!` });
          }
          break;
        }

        case 'discard_mission': {
          // Find mission
          const mIdx = player.missions.findIndex(m => m.id === action.missionId);
          if (mIdx >= 0) {
            // Deduct cost (e.g. 50 souls)
            const cost = MISSION_DISCARD_COST;
            if (player.soulLedger.balance >= cost) {
               player.soulLedger.balance -= cost;
               player.soulLedger.history.push({ turn: state.turnNumber, purpose: 'Discarded Mission', amount: cost });
               
               // Remove old mission, draw new one
               player.missions.splice(mIdx, 1);
               const newM = drawSingleMission(player.id);
               player.missions.push(newM);
               
               events.push({ type: 'mission_discarded', playerId: submission.playerId, message: `${player.name} discarded a mission and drew a new one.` });
            }
          }
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

  dominions = tickAllDominions(dominions, state);

  for (const dom of Object.values(dominions)) {
    if (dom.influence < 5) {
      events.push({ type: 'dominion_decayed', dominionId: dom.id, message: `Dominion at "${dom.primaryNodeId}" nearly collapsed (${dom.influence.toFixed(1)})` });
    }
  }

  // ─── Phase 2.5: Execute dominion instructions ─────────────

  const instrState: GameState = { ...state, dominions, players, religions, turnNumber: state.turnNumber + 1 };
  const instrResult = executeAllDominionInstructions(dominions, instrState);
  dominions = instrResult.dominions;
  for (const evt of instrResult.events) {
    events.push({ type: 'instruction_executed', dominionId: evt.dominionId, message: evt.message });
  }

  // ─── Phase 2.5b: Execute Combat Intents ───────────────────
  
  if (instrResult.combatIntents && instrResult.combatIntents.length > 0) {
    const combatState = { ...state, dominions, players, religions, turnNumber: state.turnNumber + 1 };
    
    for (const intent of instrResult.combatIntents) {
       const result = resolveCombat(combatState, intent.attackerId, intent.defenderId, intent.targetNodeId);
       
       // Record Combat Result Event
       events.push({
         type: 'combat_resolved',
         combatId: result.combatId,
         dominionId: intent.attackerId,
         message: `Combat at ${intent.targetNodeId}! ${result.winner === 'attacker' ? 'Attacker' : 'Defender'} WON. Atk losses: ${result.attackerCasualties}. Def losses: ${result.defenderCasualties}. Souls Claimed: ${result.soulsReleased}`
       });
       
       // Process Territory Change
       if (result.winner === 'attacker') {
         // Remove from defender
         const defDom = dominions[intent.defenderId];
         if (defDom) {
            dominions[intent.defenderId] = {
               ...defDom,
               controlledNodeIds: defDom.controlledNodeIds.filter(n => n !== intent.targetNodeId)
            };
         }
         // Add to attacker
         const atkDom = dominions[intent.attackerId];
         if (atkDom && !atkDom.controlledNodeIds.includes(intent.targetNodeId)) {
            dominions[intent.attackerId] = {
               ...atkDom,
               controlledNodeIds: [...atkDom.controlledNodeIds, intent.targetNodeId]
            };
         }
       }
       
       // Process Souls
       if (result.soulsReleased > 0 && result.soulClaimantId) {
          const claimant = players[result.soulClaimantId];
          if (claimant) {
             const newLedger = {
               ...claimant.soulLedger,
               balance: claimant.soulLedger.balance + result.soulsReleased,
               history: [...claimant.soulLedger.history, { turn: state.turnNumber + 1, amount: result.soulsReleased, purpose: `Combat Souls at ${intent.targetNodeId}` }]
             };
             players[result.soulClaimantId] = { ...claimant, soulLedger: newLedger };
             
             events.push({
               type: 'soul_income',
               playerId: result.soulClaimantId,
               message: `${claimant.name} claimed ${result.soulsReleased} souls from the slaughter at ${intent.targetNodeId}`
             });
          }
       }
    }
  }

  // ─── Phase 2.6: Religion tick (spread, stability, fracture) ──

  const relTickState: GameState = { ...state, dominions, players, religions, turnNumber: state.turnNumber + 1 };
  const relResult = tickAllReligions(religions, relTickState);
  religions = relResult.religions;
  for (const relEvt of relResult.events) {
    events.push({ type: 'religion_tick', religionId: relEvt.religionId, message: relEvt.message });
  }

  // Resolve holy wars
  const holyWarResult = resolveHolyWars(religions, relTickState);
  religions = holyWarResult.religions;
  for (const hwEvt of holyWarResult.events) {
    events.push({ type: 'religion_tick', religionId: hwEvt.religionId, message: hwEvt.message });
  }

  // ─── Phase 2.7: Soul income from religions ────────────────

  players = processAllSoulIncome(players, religions, state.turnNumber + 1);
  for (const [pid, p] of Object.entries(players)) {
    const income = p.soulLedger.currentTurnIncome;
    const totalInc = income.reduce((s, i) => s + i.amount, 0);
    if (totalInc > 0) {
      events.push({
        type: 'soul_income',
        playerId: pid as PlayerId,
        message: `${p.name} gained ${totalInc} souls from religions`,
      });
    }
  }

  // Deduct sacred festival costs
  for (const [pid, cost] of Object.entries(relResult.soulCosts)) {
    if (cost > 0 && players[pid as PlayerId]) {
      const result = spendSouls(players[pid as PlayerId].soulLedger, cost, 'Sacred Festival', state.turnNumber + 1);
      if (result) {
        players[pid as PlayerId] = { ...players[pid as PlayerId], soulLedger: result };
        events.push({
          type: 'soul_spent',
          playerId: pid as PlayerId,
          message: `${players[pid as PlayerId].name} spent ${cost} souls on Sacred Festival`,
        });
      }
    }
  }

  // ─── Phase 2.8: Deliver scout reports ──────────────────────

  deliverScoutReports(workingState);

  // ─── Phase 3: Move players ────────────────────────────────

  for (const pid of Object.keys(players)) {
    const p = players[pid as PlayerId];
    if (p.destinationRealmId && p.destinationNodeId) {
      const startRealm = p.currentRealmId;
      const destRealm = p.destinationRealmId;

      // Ensure realms are internally connected via overlaps if different
      if (startRealm !== destRealm) {
        const canTravel = state.realmInteractions.some(
          (i) => (i.realmA === startRealm && i.realmB === destRealm) ||
                 (i.realmB === startRealm && i.realmA === destRealm)
        );
        if (!canTravel) {
          events.push({
            type: 'player_moved',
            playerId: pid as PlayerId,
            message: `${p.name} failed to travel: ${destRealm} is out of reach`,
          });
          p.destinationRealmId = null;
          p.destinationNodeId = null;
          continue;
        }
      }

      // Unified BFS Pathfinding — supports cross-realm jumps via temporary edges
      const visited = new Set<string>();
      const q = [{ nodeId: p.currentNodeId, realmId: startRealm }];
      let connected = false;
      
      while (q.length > 0) {
        const curr = q.shift()!;
        if (curr.nodeId === p.destinationNodeId) {
          connected = true;
          break;
        }
        if (visited.has(curr.nodeId)) continue;
        visited.add(curr.nodeId);
        
        const g = state.realmGraphs[curr.realmId];
        if (!g) continue;
        
        for (const edge of g.edges) {
          if (edge.severed) continue;
          
          if (edge.sourceNodeId === curr.nodeId) {
            const nextRealm = edge.targetNodeId.split('-')[0] as RealmId;
            q.push({ nodeId: edge.targetNodeId, realmId: nextRealm });
          } else if (edge.targetNodeId === curr.nodeId) {
            const nextRealm = edge.sourceNodeId.split('-')[0] as RealmId;
            q.push({ nodeId: edge.sourceNodeId, realmId: nextRealm });
          }
        }
      }

      if (!connected) {
        events.push({
          type: 'player_moved',
          playerId: pid as PlayerId,
          message: `${p.name} failed to travel: Path is severed or realm portal missing`,
        });
        p.destinationRealmId = null;
        p.destinationNodeId = null;
        continue;
      }

      p.currentRealmId = p.destinationRealmId;
      p.currentNodeId = p.destinationNodeId;
      events.push({ type: 'player_moved', playerId: pid as PlayerId, message: `${p.name} moved to ${p.destinationNodeId}` });
    }
    p.destinationRealmId = null;
    p.destinationNodeId = null;
  }

  // ─── Phase 4: Physics & Environment ───────────────────────

  const realmStates = tickRealmStates(state.realmStates, state.turnNumber + 1, state.config.targetConvergenceTurn);
  const realmInteractions = detectInteractions(realmStates);

  const realmGraphs: Record<RealmId, RealmGraph> = structuredClone(state.realmGraphs);
  for (const realm of Object.values(realmGraphs)) {
    realm.edges = realm.edges.filter(e => !e.temporary);
  }

  for (const interaction of realmInteractions) {
    if (interaction.level === 'overlap') {
      events.push({ type: 'realm_collision', realmA: interaction.realmA, realmB: interaction.realmB, message: `${interaction.realmA} and ${interaction.realmB} have collided` });
    } else {
      events.push({ type: 'realm_access_point', realmA: interaction.realmA, realmB: interaction.realmB, message: `Access point opened between ${interaction.realmA} and ${interaction.realmB}` });
    }

    const graphA = realmGraphs[interaction.realmA];
    const graphB = realmGraphs[interaction.realmB];

    if (graphA.nodes.length > 0 && graphB.nodes.length > 0) {
      const edge1: GameEdge = {
        id: `temp-${interaction.realmA}-${interaction.realmB}-0`,
        sourceNodeId: graphA.nodes[0].id,
        targetNodeId: graphB.nodes[0].id,
        weight: 1,
        temporary: true,
        accessPointRealms: [interaction.realmA, interaction.realmB],
        severed: false,
      };
      graphA.edges.push(edge1);
      graphB.edges.push(edge1);

      if (graphA.nodes.length > 1 && graphB.nodes.length > 1) {
        const edge2: GameEdge = {
          id: `temp-${interaction.realmA}-${interaction.realmB}-1`,
          sourceNodeId: graphA.nodes[1].id,
          targetNodeId: graphB.nodes[1].id,
          weight: 1,
          temporary: true,
          accessPointRealms: [interaction.realmA, interaction.realmB],
          severed: false,
        };
        graphA.edges.push(edge2);
        graphB.edges.push(edge2);
      }
    }
  }

  // ─── Phase 4.5: Check Missions ────────────────────────────
  
  const missionWorkingState: GameState = { ...state, players, dominions, religions };
  for (const pid in players) {
    const player = players[pid as PlayerId];
    if (!player) continue;

    const updatedMissions = checkPlayerMissions(missionWorkingState, player);
    
    // Check if any were newly completed to award them
    for (const pm of updatedMissions) {
      const oldM = player.missions.find(m => m.id === pm.id);
      if (oldM && !oldM.completed && pm.completed) {
        // Award the prize!
        for (const reward of pm.rewards) {
          if (reward.type === 'souls' && reward.soulAmount) {
             player.soulLedger.balance += reward.soulAmount;
             player.soulLedger.totalEarned += reward.soulAmount;
             events.push({ type: 'soul_income', playerId: player.id, message: `Mission Complete: ${pm.title} — rewarded ${reward.soulAmount} Souls!` });
          } else if (reward.type === 'relic' && reward.relicId) {
             player.relicIds.push(reward.relicId);
             events.push({ type: 'relic_claimed', playerId: player.id, message: `Mission Complete: ${pm.title} — found relic ${reward.relicId}!` });
          }
        }
      }
    }
    player.missions = updatedMissions;
  }

  // ─── Phase 5: New state ───────────────────────────────────

  const historyEntry: TurnHistoryEntry = {
    turnNumber: state.turnNumber + 1,
    realmPositions: Object.fromEntries(
      Object.entries(realmStates).map(([id, rs]) => [id, { x: rs.position.x, y: rs.position.y, z: rs.position.z }]),
    ) as Record<RealmId, { x: number; y: number; z: number }>,
    events: events.map((e) => e.message),
  };

  const newState: GameState = {
    ...state,
    turnNumber: state.turnNumber + 1,
    phase: 'planning' as GamePhase,
    players,
    dominions,
    religions,
    realmGraphs,
    realmStates,
    realmInteractions,
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
      soulLedger: { playerId: pd.id, balance: STARTING_SOUL_BALANCE, totalEarned: STARTING_SOUL_BALANCE, totalSpent: 0, currentTurnIncome: [], history: [] },
      dominionIds: [],
      religionIds: [],
      relicIds: [],
      combatCards: [],
      missions: drawInitialMissions(pd.id),
      hasSubmittedTurn: false,
      intel: [],
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
    relics: structuredClone(INITIAL_RELICS),
    siteRites: {},
    currentTurnSubmissions: {},
    activeConfrontations: [],
    activeCombats: [],
    combatResults: [],
    turnHistory: [],
    sundering: null,
  };
}
