import type { Move } from "@gomokudawgs/engine";
import type {
  Address,
  ChatMessage,
  GameOverReason,
  LobbyGame,
  MoveBroadcast,
  PlayerProfile,
  RoomSnapshot,
} from "./types.js";

/** Wallet-signature auth payload. The client signs `loginMessage(address, ts)`
 *  and the server verifies it; valid for AUTH_TTL_MS. */
export interface AuthPayload {
  address: Address;
  /** Epoch ms used in the signed message. */
  ts: number;
  signature: string;
}

export const AUTH_TTL_MS = 5 * 60 * 1000;

export function loginMessage(address: Address, ts: number): string {
  return `GomokuDawgs login\naddress: ${address.toLowerCase()}\nts: ${ts}`;
}

export interface ServerError {
  code:
    | "unauthorized"
    | "not-your-turn"
    | "illegal-move"
    | "unknown-game"
    | "not-a-player"
    | "chat-rejected"
    | "internal";
  message: string;
}

/** Events the client may emit. */
export interface ClientToServerEvents {
  "lobby:subscribe": () => void;
  "lobby:unsubscribe": () => void;
  "room:join": (p: { gameId: string; auth: AuthPayload }) => void;
  "room:leave": (p: { gameId: string }) => void;
  "game:move": (p: { gameId: string; move: Move }) => void;
  "game:resign": (p: { gameId: string }) => void;
  "chat:send": (p: { gameId: string; text: string }) => void;
  /** Fetch a wallet's profile (name, stats, claimable wins). */
  "profile:get": (p: { address: Address }) => void;
  /** Set your own display name (authenticated with a wallet signature). */
  "profile:set": (p: { auth: AuthPayload; username: string }) => void;
}

/** Events the server may emit. */
export interface ServerToClientEvents {
  "lobby:state": (p: { games: LobbyGame[] }) => void;
  "room:state": (p: RoomSnapshot) => void;
  "game:move": (p: MoveBroadcast) => void;
  "game:over": (p: {
    gameId: string;
    winner: Address;
    reason: GameOverReason;
    txHash?: string;
    /** Backend voucher the winner redeems via claimRewardSigned. */
    voucher?: string;
  }) => void;
  "chat:message": (p: ChatMessage) => void;
  "profile:state": (p: PlayerProfile) => void;
  "server:error": (p: ServerError) => void;
}
