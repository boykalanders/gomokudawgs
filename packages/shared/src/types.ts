import type { GameState, Move, PlayerIndex } from "@gomokudawgs/engine";

export type Address = `0x${string}`;

export type LobbyGameStatus = "open" | "active" | "finished" | "cancelled";

/** A game as listed in the lobby — mirrors on-chain state via the event listener. */
export interface LobbyGame {
  gameId: string;
  playerOne: Address;
  playerTwo: Address | null;
  /** Stake per player, as a decimal string of wei. */
  stake: string;
  status: LobbyGameStatus;
  createdAt: number;
  /** Display name of playerOne, if they've set one (decorated at emit time). */
  playerOneName?: string | null;
}

/** How a game ended. */
export type GameOverReason = "win" | "resign" | "timeout" | "draw";

export interface RoomPlayer {
  address: Address;
  seat: PlayerIndex;
  connected: boolean;
  /** Display name, if the player has set one. */
  username?: string | null;
}

/** Authoritative room snapshot pushed to clients on join and on every move. */
export interface RoomSnapshot {
  gameId: string;
  players: RoomPlayer[];
  /** Per-player stake in wei (decimal string); null for chain-less dev games. */
  stake: string | null;
  state: GameState;
  /** Server hash of `state` for desync detection. */
  stateHash: string;
  /** Chat history for the room, so a reconnecting player sees past messages. */
  messages: ChatMessage[];
  /** Epoch ms when the current player's move clock expires. */
  clockExpiresAt: number;
  /** Set when the game ends. `voucher` is the backend's EIP-712 signature the
   *  winner submits to claimRewardSigned; `txHash` is set only on the legacy
   *  owner-settled path. */
  over: { winner: Address; reason: GameOverReason; txHash?: string; voucher?: string } | null;
}

/** Broadcast after the server has validated and applied a move. Clients apply
 *  the same deterministic move to stay in sync. */
export interface MoveBroadcast {
  gameId: string;
  bySeat: PlayerIndex;
  move: Move;
  /** Hash of the state the move was applied FROM (clients verify sync). */
  preStateHash: string;
  /** Authoritative post-move state — clients adopt it. */
  endState: GameState;
  endStateHash: string;
  clockExpiresAt: number;
}

export interface ChatMessage {
  gameId: string;
  from: Address;
  text: string;
  ts: number;
}

export interface LeaderboardEntry {
  address: Address;
  wins: number;
  losses: number;
  /** Total winnings in wei (decimal string). */
  wonAmount: string;
}

/** Platform-wide totals shown on the leaderboard. */
export interface PlatformStats {
  /** Number of finished games. */
  games: number;
  /** Total $DDAWGS burned (10% of every pot), wei decimal string. */
  totalBurned: string;
  /** Total staked across all finished games (both players' stakes), wei. */
  totalWagered: string;
}

/** A game the player won — the client checks each one's on-chain `rewardClaimed`
 *  flag to surface the still-claimable ones. */
export interface WonGame {
  gameId: string;
  /** Winner's payout in wei (80% of the 2-stake pot), decimal string. */
  reward: string;
  /** Backend EIP-712 voucher to redeem via claimRewardSigned (when available). */
  voucher?: string | null;
}

/** Per-wallet profile served on demand: editable name + stats + claimable wins. */
export interface PlayerProfile {
  address: Address;
  username: string | null;
  wins: number;
  losses: number;
  /** Total winnings in wei (decimal string). */
  wonAmount: string;
  /** Games this wallet has won (newest first). */
  wonGames: WonGame[];
}

/** Per-move clock, enforced off-chain by the server (never on-chain). Run out
 *  of time on your turn and you forfeit. */
export const MOVE_CLOCK_MS = 60 * 1000;

export const MAX_CHAT_LENGTH = 280;

export const MAX_USERNAME_LENGTH = 24;
