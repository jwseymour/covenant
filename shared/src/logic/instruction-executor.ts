/**
 * Instruction executor — autonomous dominion behaviour.
 *
 * GDD §4.2: "Instructions idle if impossible. Must physically return to modify."
 *
 * Walks a dominion's instruction flowchart each turn:
 * - Tier 1 (basic): single directive — defend, expand, recruit, scout, hold
 * - Tier 2 (advanced): IF condition THEN action ELSE action
 *
 * Pure function: (dominion, graph, gameState) → ExecutionResult
 */

import type {
  GameState,
} from '../types/game-state.js';
import type {
  Dominion,
  DominionId,
} from '../types/dominion.js';
import type {
  RealmGraph,
  NodeId,
} from '../types/graph.js';
import type {
  DominionInstructionSet,
  InstructionCondition,
  CompoundCondition,
  DominionAction,
  ScoutReport,
} from '../types/instruction.js';

// ─── Execution Result ───────────────────────────────────────────

export interface InstructionEvent {
  dominionId: DominionId;
  action: string;
  message: string;
}

export interface ExecutionResult {
  /** Updated dominion after instruction execution. */
  dominion: Dominion;
  /** Events generated during execution. */
  events: InstructionEvent[];
  /** Combat intents generated when expanding into rival territory. */
  combatIntents?: { attackerId: DominionId; defenderId: DominionId; targetNodeId: NodeId }[];
}

// ─── Constants ──────────────────────────────────────────────────

/** Army recruited per turn with the 'recruit' directive. */
const RECRUIT_AMOUNT = 5;

/** Army defence bonus from 'defend' directive. */
const DEFEND_QUALITY_BONUS = 0.15;

/** Max flowchart depth to prevent infinite loops. */
const MAX_FLOWCHART_DEPTH = 20;

// ─── Graph Helpers ──────────────────────────────────────────────

/** Get all nodes adjacent to a given node via non-severed edges. */
function getAdjacentNodeIds(nodeId: NodeId, graph: RealmGraph): NodeId[] {
  const adjacent: NodeId[] = [];
  for (const edge of graph.edges) {
    if (edge.severed) continue;
    if (edge.sourceNodeId === nodeId) adjacent.push(edge.targetNodeId);
    else if (edge.targetNodeId === nodeId) adjacent.push(edge.sourceNodeId);
  }
  return adjacent;
}

/** Get all nodes adjacent to ANY node in a set (the frontier). */
function getFrontierNodeIds(controlledIds: NodeId[], graph: RealmGraph): NodeId[] {
  const controlled = new Set(controlledIds);
  const frontier = new Set<NodeId>();
  for (const nodeId of controlledIds) {
    for (const adjId of getAdjacentNodeIds(nodeId, graph)) {
      if (!controlled.has(adjId)) frontier.add(adjId);
    }
  }
  return Array.from(frontier);
}

/**
 * BFS shortest path from any controlled node to a target.
 * Returns the first frontier node on the path, or null if unreachable.
 */
function findClosestFrontierToward(
  controlledIds: NodeId[],
  targetId: NodeId,
  graph: RealmGraph,
): NodeId | null {
  const controlled = new Set(controlledIds);

  // Build adjacency map
  const adj = new Map<NodeId, NodeId[]>();
  for (const node of graph.nodes) adj.set(node.id, []);
  for (const edge of graph.edges) {
    if (edge.severed) continue;
    adj.get(edge.sourceNodeId)?.push(edge.targetNodeId);
    adj.get(edge.targetNodeId)?.push(edge.sourceNodeId);
  }

  // BFS from target backwards toward controlled territory
  const visited = new Set<NodeId>();
  const parent = new Map<NodeId, NodeId | null>();
  const queue: NodeId[] = [targetId];
  visited.add(targetId);
  parent.set(targetId, null);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // If we reached a controlled node, trace back to find the frontier node
    if (controlled.has(current) && current !== targetId) {
      // Walk backward from current toward targetId, find the node
      // just outside controlled territory
      let node = current;
      let child = parent.get(node);
      while (child !== null && child !== undefined && controlled.has(child)) {
        node = child;
        child = parent.get(node);
      }
      // child is outside controlled, return it
      return child ?? null;
    }

    for (const neighbor of adj.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  // Target unreachable or already controlled — pick any frontier node
  const frontier = getFrontierNodeIds(controlledIds, graph);
  return frontier.length > 0 ? frontier[0] : null;
}

/** Check if any enemy dominion has a controlled node within N edges. */
function isEnemyNearby(
  dominion: Dominion,
  graph: RealmGraph,
  allDominions: Record<DominionId, Dominion>,
  range: number = 2,
): boolean {
  const controlled = new Set(dominion.controlledNodeIds);

  // BFS out from all controlled nodes up to range
  const visited = new Set<NodeId>();
  let frontier = [...dominion.controlledNodeIds];
  for (const id of frontier) visited.add(id);

  for (let depth = 0; depth < range; depth++) {
    const nextFrontier: NodeId[] = [];
    for (const nodeId of frontier) {
      for (const adjId of getAdjacentNodeIds(nodeId, graph)) {
        if (visited.has(adjId)) continue;
        visited.add(adjId);
        nextFrontier.push(adjId);
      }
    }
    frontier = nextFrontier;
  }

  // Check if any visited non-controlled node belongs to an enemy
  for (const dom of Object.values(allDominions)) {
    if (dom.id === dominion.id || dom.ownerId === dominion.ownerId) continue;
    for (const nodeId of dom.controlledNodeIds) {
      if (visited.has(nodeId) && !controlled.has(nodeId)) return true;
    }
  }
  return false;
}

// ─── Condition Evaluation ───────────────────────────────────────

/** Evaluate a single instruction condition. */
function evaluateCondition(
  condition: InstructionCondition | CompoundCondition,
  dominion: Dominion,
  graph: RealmGraph,
  state: GameState,
): boolean {
  // Compound condition (expert tier, but handle for completeness)
  if ('operator' in condition) {
    const compound = condition as CompoundCondition;
    switch (compound.operator) {
      case 'and': return compound.conditions.every((c) => evaluateCondition(c, dominion, graph, state));
      case 'or': return compound.conditions.some((c) => evaluateCondition(c, dominion, graph, state));
      case 'not': return compound.conditions.length > 0 && !evaluateCondition(compound.conditions[0], dominion, graph, state);
    }
  }

  const cond = condition as InstructionCondition;
  switch (cond.type) {
    case 'attacked': {
      // Check if any enemy dominion controls a node adjacent to ours
      // (simplified: "under pressure" = enemy within 1 edge)
      return isEnemyNearby(dominion, graph, state.dominions, 1);
    }

    case 'enemy_nearby': {
      const range = cond.threshold ?? 2;
      return isEnemyNearby(dominion, graph, state.dominions, range);
    }

    case 'influence_below': {
      return dominion.influence < (cond.threshold ?? 50);
    }

    case 'influence_above': {
      return dominion.influence > (cond.threshold ?? 50);
    }

    case 'army_size_below': {
      return dominion.armyBaseSize < (cond.threshold ?? 10);
    }

    case 'army_size_above': {
      return dominion.armyBaseSize > (cond.threshold ?? 10);
    }

    case 'enemy_religion_present': {
      // Check if any non-owned religion has followers at our primary node
      for (const rel of Object.values(state.religions)) {
        if (rel.founderId === dominion.ownerId) continue;
        if (rel.followersByNode[dominion.primaryNodeId] && rel.followersByNode[dominion.primaryNodeId] > 0) {
          return true;
        }
      }
      return false;
    }

    case 'population_below': {
      const node = graph.nodes.find((n) => n.id === dominion.primaryNodeId);
      return node ? node.population < (cond.threshold ?? 100) : false;
    }

    case 'realm_merged': {
      // Simplified: check if any merge zone exists for this realm
      return Object.keys(state.mergeZones).length > 0;
    }

    case 'always':
      return true;

    default:
      return false;
  }
}

// ─── Action Execution ───────────────────────────────────────────

/** Execute a single dominion action. Returns the updated dominion and events. */
function executeAction(
  action: DominionAction,
  dominion: Dominion,
  graph: RealmGraph,
  state: GameState,
): ExecutionResult {
  const events: InstructionEvent[] = [];
  const combatIntents: { attackerId: DominionId; defenderId: DominionId; targetNodeId: NodeId }[] = [];
  let dom = { ...dominion, controlledNodeIds: [...dominion.controlledNodeIds] };

  switch (action.type) {
    case 'defend': {
      // Boost troop quality (defence posture)
      dom = {
        ...dom,
        troopQualityModifier: dom.troopQualityModifier + DEFEND_QUALITY_BONUS,
      };
      events.push({
        dominionId: dom.id,
        action: 'defend',
        message: `Dominion at ${dom.primaryNodeId} fortified defences`,
      });
      break;
    }

    case 'expand': {
      // Find the best node to expand toward
      let targetNode: NodeId | null = null;

      if (action.targetNodeId) {
        // Directed expansion: find closest frontier node toward target
        if (dom.controlledNodeIds.includes(action.targetNodeId)) {
          // Already control target — idle
          events.push({
            dominionId: dom.id,
            action: 'expand_idle',
            message: `Dominion at ${dom.primaryNodeId} — expansion target already controlled`,
          });
          break;
        }
        targetNode = findClosestFrontierToward(dom.controlledNodeIds, action.targetNodeId, graph);
      } else {
        // Undirected expansion: pick any frontier node
        const frontier = getFrontierNodeIds(dom.controlledNodeIds, graph);
        if (frontier.length > 0) {
          targetNode = frontier[Math.floor(Math.random() * frontier.length)];
        }
      }

      if (!targetNode) {
        events.push({
          dominionId: dom.id,
          action: 'expand_idle',
          message: `Dominion at ${dom.primaryNodeId} — no available nodes to expand to`,
        });
        break;
      }

      // Check the target isn't controlled by another dominion
      const isContested = Object.values(state.dominions).some(
        (d) => d.id !== dom.id && d.controlledNodeIds.includes(targetNode!),
      );

      if (isContested) {
        events.push({
          dominionId: dom.id,
          action: 'expand_blocked',
          message: `Dominion at ${dom.primaryNodeId} — expansion blocked by rival at ${targetNode}`,
        });
        break;
      }

      dom.controlledNodeIds.push(targetNode);
      events.push({
        dominionId: dom.id,
        action: 'expand',
        message: `Dominion at ${dom.primaryNodeId} expanded to ${targetNode}`,
      });
      break;
    }

    case 'recruit': {
      dom = {
        ...dom,
        armyBaseSize: dom.armyBaseSize + RECRUIT_AMOUNT,
        armyStrength: dom.armyStrength + RECRUIT_AMOUNT,
      };
      events.push({
        dominionId: dom.id,
        action: 'recruit',
        message: `Dominion at ${dom.primaryNodeId} recruited ${RECRUIT_AMOUNT} troops (now ${dom.armyStrength})`,
      });
      break;
    }

    case 'scout': {
      const targetId = action.targetNodeId;
      if (!targetId) {
        events.push({
          dominionId: dom.id,
          action: 'scout_idle',
          message: `Dominion at ${dom.primaryNodeId} — no scout target specified`,
        });
        break;
      }

      // Check if already scouting this target
      const alreadyScouting = dom.scoutReports.some(
        (r) => r.targetNodeId === targetId && !r.delivered,
      );
      if (alreadyScouting) {
        events.push({
          dominionId: dom.id,
          action: 'scout_idle',
          message: `Dominion at ${dom.primaryNodeId} — already scouting ${targetId}`,
        });
        break;
      }

      const report: ScoutReport = {
        targetNodeId: targetId,
        orderedTurn: state.turnNumber,
        availableTurn: state.turnNumber + 2,
        delivered: false,
      };

      dom = { ...dom, scoutReports: [...dom.scoutReports, report] };
      events.push({
        dominionId: dom.id,
        action: 'scout',
        message: `Dominion at ${dom.primaryNodeId} dispatched scouts to ${targetId}`,
      });
      break;
    }

    case 'hold': {
      // Do nothing intentionally
      events.push({
        dominionId: dom.id,
        action: 'hold',
        message: `Dominion at ${dom.primaryNodeId} holding position`,
      });
      break;
    }

    case 'attack': {
      // Simplified: attack reduces enemy influence at a neighbouring contested node
      // Full combat is Milestone 6
      events.push({
        dominionId: dom.id,
        action: 'attack',
        message: `Dominion at ${dom.primaryNodeId} menacing enemy territory`,
      });
      break;
    }

    case 'suppress_religion': {
      events.push({
        dominionId: dom.id,
        action: 'suppress_religion',
        message: `Dominion at ${dom.primaryNodeId} suppressing rival religion`,
      });
      break;
    }

    case 'improve_troops': {
      dom = {
        ...dom,
        troopQualityModifier: dom.troopQualityModifier + 0.1,
      };
      events.push({
        dominionId: dom.id,
        action: 'improve_troops',
        message: `Dominion at ${dom.primaryNodeId} improved troop quality`,
      });
      break;
    }

    default: {
      events.push({
        dominionId: dom.id,
        action: 'idle',
        message: `Dominion at ${dom.primaryNodeId} idling (unknown action)`,
      });
    }
  }

  return { dominion: dom, events, combatIntents };
}

// ─── Flowchart Walker ───────────────────────────────────────────

/**
 * Walk the instruction flowchart and determine which action to execute.
 * Returns the action from the resolved leaf node.
 */
function resolveFlowchart(
  instructions: DominionInstructionSet,
  dominion: Dominion,
  graph: RealmGraph,
  state: GameState,
): DominionAction {
  let currentId = instructions.entryNodeId;
  let depth = 0;

  while (depth < MAX_FLOWCHART_DEPTH) {
    const node = instructions.nodes[currentId];
    if (!node) {
      // Broken flowchart — default to hold
      return { type: 'hold' };
    }

    if (!node.condition) {
      // Action-only node — execute immediately
      return node.action;
    }

    // Evaluate condition and follow branch
    const result = evaluateCondition(node.condition, dominion, graph, state);

    if (result && node.trueNextId) {
      currentId = node.trueNextId;
    } else if (!result && node.falseNextId) {
      currentId = node.falseNextId;
    } else {
      // No branch to follow — execute this node's action
      return node.action;
    }

    depth++;
  }

  // Exceeded max depth — safety fallback
  return { type: 'hold' };
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Execute a single dominion's instructions for one turn.
 * Pure function — returns updated dominion + events.
 */
export function executeDominionInstructions(
  dominion: Dominion,
  graph: RealmGraph,
  state: GameState,
): ExecutionResult {
  if (!dominion.instructions) {
    return { dominion, events: [], combatIntents: [] };
  }

  const action = resolveFlowchart(dominion.instructions, dominion, graph, state);
  return executeAction(action, dominion, graph, state);
}

/**
 * Execute instructions for ALL dominions in the game.
 * Returns updated dominions map + all events.
 */
export function executeAllDominionInstructions(
  dominions: Record<DominionId, Dominion>,
  state: GameState,
): { dominions: Record<DominionId, Dominion>; events: InstructionEvent[]; combatIntents: { attackerId: DominionId; defenderId: DominionId; targetNodeId: NodeId }[] } {
  const allEvents: InstructionEvent[] = [];
  const allIntents: { attackerId: DominionId; defenderId: DominionId; targetNodeId: NodeId }[] = [];
  const updated = { ...dominions };

  for (const [id, dom] of Object.entries(dominions)) {
    if (!dom.instructions) continue;

    const graph = state.realmGraphs[dom.realmId];
    if (!graph) continue;

    // Pass the current updated state so dominions see each other's results
    const stateWithUpdated = { ...state, dominions: updated };
    const result = executeDominionInstructions(dom, graph, stateWithUpdated);
    updated[id as DominionId] = result.dominion;
    allEvents.push(...result.events);
    if (result.combatIntents) {
       allIntents.push(...result.combatIntents);
    }
  }

  return { dominions: updated, events: allEvents, combatIntents: allIntents };
}

// ─── Instruction Builders (helpers for the UI) ──────────────────

/** Create a Tier 1 (basic) instruction set with a single directive. */
export function createBasicInstructions(
  action: DominionAction,
  turn: number,
): DominionInstructionSet {
  const nodeId = 'root';
  return {
    tier: 'basic',
    entryNodeId: nodeId,
    nodes: {
      [nodeId]: {
        id: nodeId,
        action,
      },
    },
    lastModifiedTurn: turn,
  };
}

/**
 * Create a Tier 2 (advanced) instruction set:
 * IF condition THEN thenAction ELSE elseAction
 */
export function createConditionalInstructions(
  condition: InstructionCondition,
  thenAction: DominionAction,
  elseAction: DominionAction,
  turn: number,
): DominionInstructionSet {
  return {
    tier: 'advanced',
    entryNodeId: 'cond',
    nodes: {
      cond: {
        id: 'cond',
        condition,
        action: thenAction, // fallback if no branches
        trueNextId: 'then',
        falseNextId: 'else',
      },
      then: {
        id: 'then',
        action: thenAction,
      },
      else: {
        id: 'else',
        action: elseAction,
      },
    },
    lastModifiedTurn: turn,
  };
}

/**
 * Create a Tier 3 (expert) instruction set — multi-node flowchart.
 * Used by FlowchartCanvas to wrap its node data into a well-formed set.
 */
export function createExpertInstructions(
  entryNodeId: string,
  nodes: Record<string, import('../types/instruction.js').InstructionNode>,
  turn: number,
): DominionInstructionSet {
  return {
    tier: 'expert',
    entryNodeId,
    nodes,
    lastModifiedTurn: turn,
  };
}

