/**
 * Soul routing engine — the currency that is the win condition.
 *
 * GDD §2.5: "Win condition: Most souls at the Convergence wins"
 * GDD §2.5: "Numbers should feel like death counts — inflate values"
 * lore_complete.md §5: "Each soul absorbed is a fragment of the old order's authority"
 *
 * Souls flow from religions → founding player's ledger.
 * Souls are spent on rites (Sight, Binding, Severance, Harvest).
 * Soul balance is hidden from other players (GDD §4.8).
 */

import type { PlayerId } from '../types/player.js';
import type { Player } from '../types/player.js';
import type { Religion, ReligionId } from '../types/religion.js';
import type { SoulIncome, SoulExpenditure, SoulLedger } from '../types/soul.js';
import type { GameState } from '../types/game-state.js';
import { getSoulYieldModifier } from './religion-logic.js';

// ─── Tuning Constants ───────────────────────────────────────────
// GDD §2.5: "Baseline (tuning TBD) — these will be adjusted during playtesting"

/** Starting soul balance. */
export const STARTING_SOUL_BALANCE = 100;

/**
 * Base souls generated per node per turn by a religion.
 * GDD §2.5: "~5-15 per node per turn (adjusted by belief tag modifiers)"
 * Inflated to feel like death counts.
 */
export const BASE_SOULS_PER_NODE = 8;

/**
 * Multiplied by follower percentage (0-100) to compute actual yield.
 * Full control (100%) → 8 souls/node/turn.
 * Partial (50%) → 4 souls/node/turn.
 */

// ─── Ritual Costs ───────────────────────────────────────────────

/** Rite of Sight — reveals everything at current location. GDD §4.8. */
export const RITE_OF_SIGHT_COST = 50;

/** Rite of Binding — bind a relic or entity. GDD §4.6. */
export const RITE_OF_BINDING_COST = 150;

/** Rite of Severance — sever an edge or connection. GDD §4.6. */
export const RITE_OF_SEVERANCE_COST = 150;

/** Rite of Harvest — sacrifice a node for all its souls. GDD §4.6. */
export const RITE_OF_HARVEST_COST = 0; // Free, but yields souls = node population

/** Sacred festival (religion instruction). */
export const SACRED_FESTIVAL_SOUL_COST = 25;

/** Combat soul yield per unit killed. GDD §5.2: "souls of fallen warriors". */
export const SOULS_PER_COMBAT_CASUALTY = 3;

/** Mission discard soul cost. GDD §4.7: "Can discard at a soul cost". */
export const MISSION_DISCARD_COST = 30;

// ─── Soul Routing ───────────────────────────────────────────────

/**
 * Compute soul income from all religions, creating detailed SoulIncome records.
 * GDD §2.5: "Religions generate souls per turn proportional to coverage."
 *
 * Returns a map of PlayerId → SoulIncome[].
 */
export function computeReligionSoulIncome(
  religions: Record<ReligionId, Religion>,
  turn: number,
): Record<PlayerId, SoulIncome[]> {
  const incomeByPlayer: Record<PlayerId, SoulIncome[]> = {};

  for (const rel of Object.values(religions)) {
    if (rel.soulRoutingDisrupted) continue; // Fractured religions don't generate

    const yieldMod = getSoulYieldModifier(rel);

    for (const [nodeId, followerPct] of Object.entries(rel.followersByNode)) {
      const amount = Math.floor(BASE_SOULS_PER_NODE * (followerPct / 100) * yieldMod);
      if (amount <= 0) continue;

      const income: SoulIncome = {
        source: 'religion',
        religionId: rel.id,
        nodeId,
        realmId: rel.foundedRealmId,
        amount,
        turn,
      };

      if (!incomeByPlayer[rel.founderId]) {
        incomeByPlayer[rel.founderId] = [];
      }
      incomeByPlayer[rel.founderId].push(income);
    }
  }

  return incomeByPlayer;
}

/**
 * Compute combat soul yield for the area's religion controller.
 * GDD §2.5: "Gained through battles (souls collected from fallen warriors)."
 * lore_complete.md §6: "When a believer dies, their soul follows the religion's path."
 */
export function computeCombatSoulIncome(
  casualties: number,
  nodeId: string,
  religions: Record<ReligionId, Religion>,
  turn: number,
): SoulIncome | null {
  if (casualties <= 0) return null;

  // Find the dominant religion at this node
  let maxFollowers = 0;
  let dominantReligion: Religion | null = null;

  for (const rel of Object.values(religions)) {
    const followers = rel.followersByNode[nodeId] ?? 0;
    if (followers > maxFollowers) {
      maxFollowers = followers;
      dominantReligion = rel;
    }
  }

  if (!dominantReligion || maxFollowers <= 0) return null;

  const amount = Math.floor(casualties * SOULS_PER_COMBAT_CASUALTY);
  if (amount <= 0) return null;

  return {
    source: 'combat',
    religionId: dominantReligion.id,
    nodeId,
    realmId: dominantReligion.foundedRealmId,
    amount,
    turn,
  };
}

// ─── Ledger Operations ──────────────────────────────────────────

/**
 * Create a fresh soul ledger with starting balance.
 */
export function createSoulLedger(playerId: PlayerId): SoulLedger {
  return {
    playerId,
    balance: STARTING_SOUL_BALANCE,
    currentTurnIncome: [],
    totalEarned: STARTING_SOUL_BALANCE,
    totalSpent: 0,
    history: [],
  };
}

/**
 * Apply religion soul income to a player's ledger for a turn.
 * Returns updated ledger.
 */
export function applyIncome(
  ledger: SoulLedger,
  income: SoulIncome[],
): SoulLedger {
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  return {
    ...ledger,
    balance: ledger.balance + totalIncome,
    totalEarned: ledger.totalEarned + totalIncome,
    currentTurnIncome: income,
    history: [...ledger.history, ...income],
  };
}

/**
 * Spend souls from a player's ledger.
 * Returns updated ledger or null if insufficient balance.
 */
export function spendSouls(
  ledger: SoulLedger,
  amount: number,
  purpose: string,
  turn: number,
): SoulLedger | null {
  if (ledger.balance < amount) return null;

  const expenditure: SoulExpenditure = { purpose, amount, turn };
  return {
    ...ledger,
    balance: ledger.balance - amount,
    totalSpent: ledger.totalSpent + amount,
    history: [...ledger.history, expenditure],
  };
}

/**
 * Process all soul income for all players at end of turn.
 * This is the main entry point called from the turn resolver.
 */
export function processAllSoulIncome(
  players: Record<PlayerId, Player>,
  religions: Record<ReligionId, Religion>,
  turn: number,
): Record<PlayerId, Player> {
  const updated = { ...players };
  const religionIncome = computeReligionSoulIncome(religions, turn);

  for (const [pid, player] of Object.entries(updated)) {
    const income = religionIncome[pid as PlayerId] ?? [];
    updated[pid as PlayerId] = {
      ...player,
      soulLedger: applyIncome(player.soulLedger, income),
    };
  }

  return updated;
}

// ─── Win Condition ──────────────────────────────────────────────

export interface SoulStanding {
  playerId: PlayerId;
  playerName: string;
  balance: number;
  totalEarned: number;
  rank: number;
}

/**
 * Get soul standings for win-condition tracking.
 * GDD §2.5: "Most souls at the Convergence wins."
 */
export function getSoulStandings(
  state: GameState,
): SoulStanding[] {
  const standings: SoulStanding[] = Object.values(state.players).map((p) => ({
    playerId: p.id,
    playerName: p.name,
    balance: p.soulLedger.balance,
    totalEarned: p.soulLedger.totalEarned,
    rank: 0,
  }));

  // Sort by balance descending
  standings.sort((a, b) => b.balance - a.balance);
  standings.forEach((s, i) => { s.rank = i + 1; });

  return standings;
}
