/**
 * State filter — converts authoritative GameState into per-player PlayerView.
 *
 * GDD §4.8: "Visible: Dominion ownership, general religion spread.
 * Hidden: Instructions, missions, influence levels."
 *
 * This enforces all information asymmetry rules:
 * - Own data: fully visible
 * - Other players: location + name + colour only (no souls, missions, AP, intel)
 * - Other dominions: DominionPublicView (no instructions, no exact influence)
 * - Other religions: ReligionPublicView (no instructions, no exact followers)
 * - Scouted info: partial reveals (directive + army) or full (with special abilities)
 * - Rite of Sight: full reveal at location (already in player.intel)
 */

import type { GameState } from '../types/game-state.js';
import type { PlayerId } from '../types/player.js';
import type { PlayerView, OtherPlayerView, ScoutedInfo, SunderingPlayerView } from '../types/player-view.js';
import type { Dominion } from '../types/dominion.js';
import type { Religion } from '../types/religion.js';
import type { ReligionPublicView } from '../types/religion.js';
import type { NodeId } from '../types/graph.js';
import type { ScoutReport, DominionInstructionSet } from '../types/instruction.js';
import { createPublicView } from './dominion-logic.js';

// ─── Religion Public View ───────────────────────────────────────

function getReligionSizeCategory(rel: Religion): 'nascent' | 'growing' | 'established' | 'dominant' {
  if (rel.nodeCount >= 10) return 'dominant';
  if (rel.nodeCount >= 5) return 'established';
  if (rel.nodeCount >= 2) return 'growing';
  return 'nascent';
}

function createReligionPublicView(rel: Religion): ReligionPublicView {
  return {
    id: rel.id,
    founderId: rel.founderId,
    name: rel.name,
    visibleNodeIds: Object.keys(rel.followersByNode).filter(k => rel.followersByNode[k] > 0),
    sizeCategory: getReligionSizeCategory(rel),
    beliefTags: rel.beliefTags,
  };
}

// ─── Scout Report Delivery ──────────────────────────────────────

/**
 * Deliver mature scout reports — fill in directive + army size.
 *
 * GDD §4.8: "order your dominion to scout a target; receive results
 * on next visit. Default reveals top-level directive and army size."
 *
 * Called during turn resolution.
 */
export function deliverScoutReports(state: GameState): void {
  for (const dom of Object.values(state.dominions)) {
    for (const report of dom.scoutReports) {
      if (report.delivered) continue;
      if (state.turnNumber < report.availableTurn) continue;

      // Find what's at the target node
      const targetDominion = Object.values(state.dominions).find(
        d => d.controlledNodeIds.includes(report.targetNodeId) && d.ownerId !== dom.ownerId,
      );

      if (targetDominion) {
        // Top-level directive: the action type of the entry node
        const instructions = targetDominion.instructions;
        if (instructions) {
          const entryNode = instructions.nodes[instructions.entryNodeId];
          report.topLevelDirective = entryNode?.action?.type;

          // Check if deep scout (Wisdom belief tag)
          const player = state.players[dom.ownerId];
          if (player && hasWisdomAtNode(state, player.id, report.targetNodeId)) {
            report.fullInstructions = JSON.parse(JSON.stringify(instructions));
          }
        }
        report.armySize = targetDominion.armyStrength;
      }

      report.delivered = true;
    }
  }
}

/**
 * Perform a deep scout — reveals the full instruction flowchart.
 * Used by relics or special abilities.
 */
export function performDeepScout(
  state: GameState,
  playerId: PlayerId,
  targetNodeId: NodeId,
): ScoutReport | null {
  const targetDominion = Object.values(state.dominions).find(
    d => d.controlledNodeIds.includes(targetNodeId) && d.ownerId !== playerId,
  );

  if (!targetDominion) return null;

  const instructions = targetDominion.instructions;
  const report: ScoutReport = {
    targetNodeId,
    orderedTurn: state.turnNumber,
    availableTurn: state.turnNumber, // Immediate
    delivered: true,
    armySize: targetDominion.armyStrength,
    topLevelDirective: instructions?.nodes[instructions.entryNodeId]?.action?.type,
    fullInstructions: instructions ? JSON.parse(JSON.stringify(instructions)) : undefined,
  };

  return report;
}

/**
 * Check if a player's religion with Wisdom tag has followers at a node.
 */
function hasWisdomAtNode(state: GameState, playerId: PlayerId, nodeId: NodeId): boolean {
  for (const rel of Object.values(state.religions)) {
    if (rel.founderId !== playerId) continue;
    if (!rel.followersByNode[nodeId] || rel.followersByNode[nodeId] <= 0) continue;
    if ((rel.beliefTags as string[]).includes('wisdom')) return true;
  }
  return false;
}

// ─── Scouted Info Conversion ────────────────────────────────────

/**
 * Convert a player's intel + delivered scout reports into ScoutedInfo[].
 */
function gatherScoutedInfo(state: GameState, playerId: PlayerId): ScoutedInfo[] {
  const info: ScoutedInfo[] = [];
  const player = state.players[playerId];
  if (!player) return info;

  // From player.intel (Rite of Sight and other direct reveals)
  for (const entry of player.intel) {
    info.push({
      targetNodeId: entry.nodeId,
      revealedDirective: entry.type === 'dominion' ? describeDirective(entry.revealedInstructions) : undefined,
      revealedInstructions: entry.revealedInstructions,
      turn: entry.turn,
    });
  }

  // From delivered scout reports on owned dominions
  for (const dom of Object.values(state.dominions)) {
    if (dom.ownerId !== playerId) continue;
    for (const report of dom.scoutReports) {
      if (!report.delivered) continue;
      info.push({
        targetNodeId: report.targetNodeId,
        revealedDirective: report.topLevelDirective ?? undefined,
        revealedArmySize: report.armySize,
        revealedInstructions: report.fullInstructions,
        turn: report.orderedTurn,
      });
    }
  }

  return info;
}

/** Extract a human-readable directive string from instructions. */
function describeDirective(instructions: unknown): string | undefined {
  if (!instructions || typeof instructions !== 'object') return undefined;
  const instr = instructions as DominionInstructionSet;
  if (!instr.entryNodeId || !instr.nodes) return undefined;
  const entry = instr.nodes[instr.entryNodeId];
  return entry?.action?.type;
}

// ─── Main Filter Function ───────────────────────────────────────

/**
 * Create a PlayerView for a specific player from the full GameState.
 *
 * This is the ONLY function that should be used to send game state to clients.
 * It enforces all GDD §4.8 visibility rules.
 */
export function createPlayerView(state: GameState, playerId: PlayerId): PlayerView {
  const self = state.players[playerId];
  if (!self) throw new Error(`Player ${playerId} not found in game state`);

  // Other players — limited view
  const otherPlayers: OtherPlayerView[] = Object.values(state.players)
    .filter(p => p.id !== playerId)
    .map(p => ({
      id: p.id,
      name: p.name,
      colour: p.colour,
      currentRealmId: p.currentRealmId,
      currentNodeId: p.currentNodeId,
      dominionCount: p.dominionIds.length,
      religionCount: p.religionIds.length,
    }));

  // Own dominions — full
  const ownDominions: Dominion[] = [];
  // Other dominions — public view
  const otherDominions = [];

  for (const dom of Object.values(state.dominions)) {
    if (dom.ownerId === playerId) {
      ownDominions.push(dom);
    } else {
      otherDominions.push(createPublicView(dom));
    }
  }

  // Own religions — full
  const ownReligions: Religion[] = [];
  // Other religions — public view
  const otherReligions: ReligionPublicView[] = [];

  for (const rel of Object.values(state.religions)) {
    if (rel.founderId === playerId) {
      ownReligions.push(rel);
    } else {
      otherReligions.push(createReligionPublicView(rel));
    }
  }

  // Unclaimed relics (visible) + player's own relics
  const visibleRelics: typeof state.relics = {};
  for (const [id, relic] of Object.entries(state.relics)) {
    // Unclaimed relics are visible to all, or relics the player owns
    if (!relic.ownerId || relic.ownerId === playerId) {
      visibleRelics[id] = relic;
    }
  }

  // Combat results — show all (participants will recognise their own)
  // Confrontation results — show all public ones

  // Scouted information
  const scoutedInformation = gatherScoutedInfo(state, playerId);

  // Sundering view
  let sunderingView: SunderingPlayerView | null = null;
  if (state.sundering) {
    const s = state.sundering;
    sunderingView = {
      phase: s.revelationPhase,
      hints: s.revelationPhase === 'hidden' ? [] : s.activeCorruptionEffects.slice(0, 2),
      guiltyRealmId: (s.revelationPhase === 'revealed' || s.revelationPhase === 'corrupted') ? s.guiltyRealmId : null,
    };
  }

  return {
    gameId: state.gameId,
    turnNumber: state.turnNumber,
    phase: state.phase,
    config: state.config,
    self,
    otherPlayers,
    realmGraphs: state.realmGraphs,
    realmStates: state.realmStates,
    realmInteractions: state.realmInteractions,
    ownDominions,
    otherDominions,
    ownReligions,
    otherReligions,
    mergeZones: state.mergeZones,
    visibleRelics,
    availableSiteRites: state.siteRites,
    confrontationResults: [],
    combatResults: state.combatResults,
    scoutedInformation,
    sunderingView,
  };
}
