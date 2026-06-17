import {
  applyMove,
  createInitialState,
  stateHash,
  validateMove,
  type GameState,
  type Move,
  type PlayerIndex,
} from "@gomokudawgs/engine";
import type {
  Address,
  ChatMessage,
  GameOverReason,
  MoveBroadcast,
  RoomSnapshot,
  ServerError,
} from "@gomokudawgs/shared";
import type { Relayer } from "./relayer.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export interface RoomEmitter {
  broadcastMove(p: MoveBroadcast): void;
  broadcastState(p: RoomSnapshot): void;
  broadcastOver(p: {
    gameId: string;
    winner: Address;
    reason: GameOverReason;
    txHash?: string;
    voucher?: string;
  }): void;
}

export type RoomActionResult = { ok: true } | { ok: false; error: ServerError };

function err(code: ServerError["code"], message: string): RoomActionResult {
  return { ok: false, error: { code, message } };
}

/**
 * One authoritative room per on-chain gameId. All gameplay flows through here:
 * the room validates that inputs come from the seated player whose turn it is,
 * runs the deterministic engine, enforces the per-move clock, and reports the
 * winner to the chain via the relayer (a signed voucher the winner redeems).
 */
export class GameRoom {
  readonly gameId: string;
  readonly seats: [Address, Address];
  private state: GameState;
  private connected = new Set<Address>();
  private clockTimer: ReturnType<typeof setTimeout> | null = null;
  private clockExpiresAt = 0;
  private over: RoomSnapshot["over"] = null;
  private settling = false;
  private messages: ChatMessage[] = [];

  constructor(
    gameId: string,
    seats: [Address, Address],
    private readonly emitter: RoomEmitter,
    private readonly relayer: Relayer,
    private readonly moveClockMs: number,
    private readonly stake: string | null = null,
    private readonly nameOf: (address: Address) => string | null = () => null
  ) {
    this.gameId = gameId;
    this.seats = seats;
    this.state = createInitialState();
    this.restartClock();
  }

  seatOf(address: Address): PlayerIndex | null {
    const idx = this.seats.findIndex((s) => s === address.toLowerCase());
    return idx === -1 ? null : (idx as PlayerIndex);
  }

  isOver(): boolean {
    return this.over !== null;
  }

  /** Per-player stake in wei (decimal string), or null for dev games. */
  stakeWei(): string | null {
    return this.stake;
  }

  /** Append a chat message to the room's history (kept so reconnecting players
   *  see it). Capped to the most recent 100. */
  addChat(msg: ChatMessage): void {
    this.messages.push(msg);
    if (this.messages.length > 100) this.messages.shift();
  }

  connect(address: Address): void {
    this.connected.add(address.toLowerCase() as Address);
    this.emitter.broadcastState(this.snapshot());
  }

  disconnect(address: Address): void {
    this.connected.delete(address.toLowerCase() as Address);
    // The move clock keeps running — disconnecting does not pause a wagered
    // game; staying away past the clock forfeits it.
    this.emitter.broadcastState(this.snapshot());
  }

  snapshot(): RoomSnapshot {
    return {
      gameId: this.gameId,
      players: this.seats.map((address, seat) => ({
        address,
        seat: seat as PlayerIndex,
        connected: this.connected.has(address),
        username: this.nameOf(address),
      })),
      stake: this.stake,
      state: this.state,
      stateHash: stateHash(this.state),
      messages: this.messages,
      clockExpiresAt: this.clockExpiresAt,
      over: this.over,
    };
  }

  handleMove(address: Address, move: Move): RoomActionResult {
    if (this.over) return err("illegal-move", "game is over");
    const seat = this.seatOf(address);
    if (seat === null) return err("not-a-player", "not seated in this game");
    if (seat !== this.state.turn) return err("not-your-turn", "wait for your turn");

    const valid = validateMove(this.state, move);
    if (!valid.ok) return err("illegal-move", valid.reason);

    const preHash = stateHash(this.state);
    const result = applyMove(this.state, move);
    this.state = result.endState;

    this.restartClock();
    this.emitter.broadcastMove({
      gameId: this.gameId,
      bySeat: seat,
      move,
      preStateHash: preHash,
      endState: result.endState,
      endStateHash: stateHash(result.endState),
      clockExpiresAt: this.clockExpiresAt,
    });

    if (result.outcome.gameOver) {
      if (result.outcome.winner !== null) void this.settle(result.outcome.winner, "win");
      else this.settleDraw();
    }
    return { ok: true };
  }

  handleResign(address: Address): RoomActionResult {
    if (this.over) return err("illegal-move", "game is over");
    const seat = this.seatOf(address);
    if (seat === null) return err("not-a-player", "not seated in this game");

    const winnerSeat = ((seat + 1) % 2) as PlayerIndex;
    void this.settle(winnerSeat, "resign");
    return { ok: true };
  }

  /** Per-move clock — enforced here, never on-chain. */
  private restartClock(): void {
    this.stopClock();
    this.clockExpiresAt = Date.now() + this.moveClockMs;
    this.clockTimer = setTimeout(() => this.onClockExpired(), this.moveClockMs);
  }

  private stopClock(): void {
    if (this.clockTimer) {
      clearTimeout(this.clockTimer);
      this.clockTimer = null;
    }
  }

  private onClockExpired(): void {
    if (this.over || this.settling) return;
    const loser = this.state.turn;
    const winnerSeat = ((loser + 1) % 2) as PlayerIndex;
    void this.settle(winnerSeat, "timeout");
  }

  private async settle(winnerSeat: PlayerIndex, reason: GameOverReason): Promise<void> {
    if (this.over || this.settling) return;
    this.settling = true;
    this.stopClock();

    const winner = this.seats[winnerSeat];
    this.state = { ...this.state, gameOver: true, winner: winnerSeat };

    // Sign the win voucher off-chain (fast, no transaction). The winner redeems
    // it via claimRewardSigned, which settles AND pays in a single winner-paid
    // tx — so there's no relayer gas and no "waiting to settle" window. If
    // signing is unavailable the game still stands; the winner can claim later
    // from their profile (which re-signs the voucher on demand).
    let voucher: string | undefined;
    try {
      voucher = (await this.relayer.signResult(this.gameId, winner)) ?? undefined;
    } catch {
      /* logged by the relayer */
    }
    this.over = { winner, reason, voucher };
    this.emitter.broadcastOver({ gameId: this.gameId, winner, reason, voucher });
    this.emitter.broadcastState(this.snapshot());
    this.settling = false;
  }

  /** Full-board draw (vanishingly rare in freestyle Gomoku): no winner, no
   *  payout voucher. Stakes remain escrowed for an owner-driven refund. */
  private settleDraw(): void {
    if (this.over) return;
    this.stopClock();
    this.over = { winner: ZERO_ADDRESS, reason: "draw" };
    this.emitter.broadcastOver({ gameId: this.gameId, winner: ZERO_ADDRESS, reason: "draw" });
    this.emitter.broadcastState(this.snapshot());
  }

  dispose(): void {
    this.stopClock();
  }
}
