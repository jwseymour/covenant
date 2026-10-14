/**
 * @shattered-covenant/shared
 *
 * The core game engine for the Dark Fantasy Realm-Hopping Influence Game.
 * Contains all type definitions, game logic, and validation used by
 * both the server and client.
 *
 * @see game_design_document.md for the full design specification
 * @see lore_complete.md for world lore and realm descriptions
 */

// ═══════════════════════════════════════════════════════════════
// REALM TYPES — GDD §3.1, §3.2, §3.3
// ═══════════════════════════════════════════════════════════════

export type {
  RealmId,
  RealmEnergy,
  Vec3,
  RealmDefinition,
  RealmState,
  TrajectoryPoint,
  RealmInteractionLevel,
  RealmInteraction,
} from './types/realm.js';

export {
  Realm,
  Energy,
  ALL_REALM_IDS,
  REALM_ENERGY_MAP,
} from './types/realm.js';

// ═══════════════════════════════════════════════════════════════
// GRAPH TYPES — GDD §3.5
// ═══════════════════════════════════════════════════════════════

export type {
  NodeId,
  EdgeId,
  NodeType,
  GameNode,
  GameEdge,
  RealmGraph,
} from './types/graph.js';

// ═══════════════════════════════════════════════════════════════
// PLAYER TYPES — GDD §2.2
// ═══════════════════════════════════════════════════════════════

export type {
  PlayerId,
  Player,
} from './types/player.js';

// ═══════════════════════════════════════════════════════════════
// DOMINION TYPES — GDD §2.3, §4.3
// ═══════════════════════════════════════════════════════════════

export type {
  DominionId,
  Dominion,
  DominionPublicView,
} from './types/dominion.js';

// ═══════════════════════════════════════════════════════════════
// INSTRUCTION TYPES — GDD §4.2, §2.4, §4.8
// ═══════════════════════════════════════════════════════════════

export type {
  InstructionTier,
  DominionActionType,
  DominionAction,
  ConditionType,
  InstructionCondition,
  LogicalOperator,
  CompoundCondition,
  InstructionNodeId,
  InstructionNode,
  DominionInstructionSet,
  ReligionActionType,
  ReligionInstruction,
  ReligionInstructionSet,
  ScoutReport,
} from './types/instruction.js';

// ═══════════════════════════════════════════════════════════════
// RELIGION TYPES — GDD §2.4, §4.4
// ═══════════════════════════════════════════════════════════════

export type {
  BeliefTag,
  BeliefTagDefinition,
  ReligionId,
  Religion,
  ReligionPublicView,
} from './types/religion.js';

export {
  ALL_BELIEF_TAGS,
  BELIEF_TAG_REALM,
} from './types/religion.js';

// ═══════════════════════════════════════════════════════════════
// COMBAT TYPES — GDD §5.2
// ═══════════════════════════════════════════════════════════════

export type {
  CombatCardType,
  CombatCard,
  ArmyStats,
  Combat,
  CombatResult,
} from './types/combat.js';

// ═══════════════════════════════════════════════════════════════
// SOUL TYPES — GDD §2.5, lore §5
// ═══════════════════════════════════════════════════════════════

export type {
  SoulSourceType,
  SoulIncome,
  SoulExpenditure,
  SoulLedger,
} from './types/soul.js';

// ═══════════════════════════════════════════════════════════════
// MISSION TYPES — GDD §4.7
// ═══════════════════════════════════════════════════════════════

export type {
  MissionId,
  MissionScope,
  MissionConditionType,
  MissionCondition,
  MissionRewardType,
  MissionReward,
  Mission,
} from './types/mission.js';

// ═══════════════════════════════════════════════════════════════
// RELIC TYPES — GDD §4.5
// ═══════════════════════════════════════════════════════════════

export type {
  RelicId,
  RelicAcquisitionMethod,
  Relic,
  RelicEffectType,
} from './types/relic.js';

// ═══════════════════════════════════════════════════════════════
// RITE TYPES — GDD §4.5, §4.6
// ═══════════════════════════════════════════════════════════════

export type {
  PersonalRitualType,
  RitualCostLevel,
  PersonalRitualDefinition,
  SeveranceTarget,
  RiteId,
  SiteRite,
  SiteRiteEffectType,
  ConvergenceRiteType,
  NewCovenantRequirements,
  RiteExecution,
} from './types/rite.js';

// ═══════════════════════════════════════════════════════════════
// CONFRONTATION TYPES — GDD §5.1
// ═══════════════════════════════════════════════════════════════

export type {
  ConfrontationChoice,
  Confrontation,
  ConfrontationResult,
} from './types/confrontation.js';

// ═══════════════════════════════════════════════════════════════
// MERGE TYPES — GDD §3.4, lore §7
// ═══════════════════════════════════════════════════════════════

export type {
  MergeZoneId,
  MergeSize,
  MergeZone,
  MergeEvent,
  RealmPair,
  RealmTriple,
  RealmQuad,
  ConvergenceCombination,
  MergeCombinationKey,
  MergeCombinationDefinition,
} from './types/merge.js';

// ═══════════════════════════════════════════════════════════════
// TURN ACTION TYPES — GDD §4.1, §5
// ═══════════════════════════════════════════════════════════════

export type {
  TurnActionType,
  EstablishDominionAction,
  SetDominionInstructionsAction,
  SetReligionInstructionsAction,
  FoundReligionAction,
  PerformPersonalRitualAction,
  PerformSiteRiteAction,
  UseRelicAction,
  ConfrontationChoiceAction,
  ConfrontationBidAction,
  DiscardMissionAction,
  SetDestinationAction,
  TurnAction,
  TurnSubmission,
} from './types/turn-action.js';

// ═══════════════════════════════════════════════════════════════
// GAME STATE — GDD §5, §6, §7
// ═══════════════════════════════════════════════════════════════

export type {
  GamePhase,
  GameConfig,
  SunderingState,
  GameState,
  TurnHistoryEntry,
} from './types/game-state.js';

// ═══════════════════════════════════════════════════════════════
// PLAYER VIEW — GDD §4.8 (filtered state)
// ═══════════════════════════════════════════════════════════════

export type {
  PlayerView,
  OtherPlayerView,
  ScoutedInfo,
  SunderingPlayerView,
} from './types/player-view.js';

// ═══════════════════════════════════════════════════════════════
// WEBSOCKET MESSAGES
// ═══════════════════════════════════════════════════════════════

export type {
  WebSocketMessage,
  ClientMessage,
  ServerMessage,
  GameLobbyInfo,
} from './types/messages.js';

export { MessageType } from './types/messages.js';

// ═══════════════════════════════════════════════════════════════
// LOGIC — Game Engine Functions
// ═══════════════════════════════════════════════════════════════

export {
  generateRealmGraph,
  generateAllRealmGraphs,
  computeAverageConnectivity,
  isGraphConnected,
} from './logic/graph-generator.js';

export {
  createDominion,
  applyInfluenceDecay,
  refreshDominion,
  isVulnerableToSubversion,
  isAutonomous,
  attemptSubversion,
  getInfluenceCategory,
  createPublicView,
  tickAllDominions,
  generateDominionId,
  DOMINION_DECAY_RATE,
  getInitialInfluenceInfo,
  getSubversionMinGap,
  VULNERABLE_THRESHOLD,
  AUTONOMOUS_THRESHOLD,
  ESTABLISH_AP_COST,
} from './logic/dominion-logic.js';

export {
  resolveTurn,
  createInitialGameState,
} from './logic/turn-resolver.js';

export type {
  M2TurnAction,
  M2TurnSubmission,
  TurnEvent,
} from './logic/turn-resolver.js';

export {
  executeDominionInstructions,
  executeAllDominionInstructions,
  createBasicInstructions,
  createConditionalInstructions,
  createExpertInstructions,
} from './logic/instruction-executor.js';

export {
  RITUAL_COSTS,
  canAffordRitual,
  performRiteOfSight,
  performRiteOfBinding,
  performRiteOfSeverance,
  performRiteOfHarvest,
} from './logic/ritual-logic.js';

export {
  SITE_RITES,
  executeSiteRite,
} from './logic/rite-site-logic.js';

export {
  INITIAL_RELICS,
  claimRelic,
  useRelic,
} from './logic/relic-logic.js';

export type {
  InstructionEvent,
  ExecutionResult,
} from './logic/instruction-executor.js';

export {
  foundReligion,
  tickReligion,
  tickAllReligions,
  spreadReligion,
  updateStability,
  checkFracture,
  calculateSoulsGenerated,
  getSoulYieldModifier,
  executeReligionInstructions,
  resolveHolyWars,
  generateReligionId,
  BELIEF_TAG_DEFINITIONS,
  getRealmSpreadMultiplier,
  getRealmStabilityModifier,
  getRealmDecayResistance,
  INITIAL_STABILITY,
  FRACTURE_THRESHOLD,
  SACRED_FESTIVAL_COST,
} from './logic/religion-logic.js';

export type {
  ReligionEvent,
  ReligionTickResult,
} from './logic/religion-logic.js';

export {
  computeReligionSoulIncome,
  computeCombatSoulIncome,
  createSoulLedger,
  applyIncome,
  spendSouls,
  processAllSoulIncome,
  getSoulStandings,
  STARTING_SOUL_BALANCE,
  BASE_SOULS_PER_NODE,
  RITE_OF_SIGHT_COST,
  RITE_OF_BINDING_COST,
  RITE_OF_SEVERANCE_COST,
  RITE_OF_HARVEST_COST,
  SACRED_FESTIVAL_SOUL_COST,
  SOULS_PER_COMBAT_CASUALTY,
  MISSION_DISCARD_COST,
} from './logic/soul-routing.js';

export {
  tickRealmStates,
  generatePredictions,
  detectInteractions,
  calculateAcceleration,
  GRAVITY_G,
  DAMPING_FACTOR,
  REALM_RADIUS,
  ACCESS_POINT_DIST,
  OVERLAP_DIST,
  PREDICTION_TURNS,
  ATTRACTION_MATRIX,
  vecAdd,
  vecSub,
  vecMult,
  vecLength,
  vecNormalize,
  vecDist,
} from './logic/realm-flow.js';

export type {
  SoulStanding,
} from './logic/soul-routing.js';

export {
  resolveConfrontations,
} from './logic/confrontation-logic.js';

export type {
  ConfrontationEvent,
} from './logic/confrontation-logic.js';

export {
  drawInitialMissions,
  drawSingleMission,
  checkPlayerMissions,
  generateMissionId,
  MISSION_LIBRARY,
} from './logic/mission-logic.js';

export * from './logic/merge-logic.js';
export * from './logic/combat-logic.js';

export {
  createPlayerView,
  deliverScoutReports,
  performDeepScout,
} from './logic/state-filter.js';

export {
  COMBAT_CARD_LIBRARY,
  createCombatCard,
  grantRandomCombatCard,
  getPlayableCards,
  checkFlankingCondition,
} from './logic/combat-cards.js';

export type {
  CombatCardDefinition,
} from './logic/combat-cards.js';
