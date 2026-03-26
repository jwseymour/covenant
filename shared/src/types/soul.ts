/**
 * Soul types — the currency and win condition of the game.
 *
 * GDD §2.5: "Imprints of the old Covenant on living beings. Released at death."
 * lore_complete.md §5: Souls as rite fuel — "burning old-order authority".
 *
 * "Win condition: Most souls at the Convergence wins."
 * "Core tension: Hoard for victory vs. spend for power."
 */

import type { RealmId } from './realm.js';
import type { PlayerId } from './player.js';
import type { NodeId } from './graph.js';

// ─── Soul Sources ───────────────────────────────────────────────

/**
 * How souls are generated. GDD §2.5:
 * "Gained through: religions, battles, rites, relics, missions."
 */
export type SoulSourceType =
  | 'religion'        // Per-turn generation from follower coverage
  | 'combat'          // Fallen warriors release souls (GDD §5.2)
  | 'rite_of_harvest'  // Sacrifice a node (GDD §4.6)
  | 'rite_site'       // Souls from performing site-specific rites
  | 'relic'           // Some relics generate or grant souls
  | 'mission_reward'  // Mission completion reward
  | 'confrontation';  // Winning a confrontation (no soul cost)

/**
 * A record of souls generated from a specific source.
 * Used for income tracking and breakdown display.
 */
export interface SoulIncome {
  readonly source: SoulSourceType;
  /** Which religion generated these souls (for religion source). */
  religionId?: string;
  /** Where the souls came from. */
  nodeId?: NodeId;
  /** Which realm. */
  realmId?: RealmId;
  /** Amount of souls generated. */
  amount: number;
  /** Turn these souls were generated. */
  turn: number;
}

/**
 * A record of souls spent.
 */
export interface SoulExpenditure {
  /** What the souls were spent on. */
  purpose: string;
  /** Amount spent. */
  amount: number;
  /** Turn the expenditure occurred. */
  turn: number;
}

/**
 * Complete soul ledger for one Ordained.
 * Tracks income and expenditure for UI display.
 */
export interface SoulLedger {
  readonly playerId: PlayerId;
  /** Current soul balance. */
  balance: number;
  /** Income this turn (breakdown by source). */
  currentTurnIncome: SoulIncome[];
  /** Total income to date (for win condition tracking). */
  totalEarned: number;
  /** Total spent to date. */
  totalSpent: number;
  /** Full history (for detailed view). */
  history: (SoulIncome | SoulExpenditure)[];
}
