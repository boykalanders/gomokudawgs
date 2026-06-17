/** Player 0 places black stones and moves first; player 1 is white. */
export type PlayerIndex = 0 | 1;

/** A stone placement at board column `x`, row `y` (both 0…BOARD_SIZE-1). */
export interface Move {
  x: number;
  y: number;
}

/**
 * Authoritative board state. The board is row-major: cell (x, y) lives at
 * index `y * BOARD_SIZE + x`, holding the owning PlayerIndex or null (empty).
 * Deterministic — the server is authoritative and the client mirrors it.
 */
export interface GameState {
  board: (PlayerIndex | null)[];
  /** Whose turn it is to place a stone. */
  turn: PlayerIndex;
  gameOver: boolean;
  /** Winner once gameOver (null on a draw / full board). */
  winner: PlayerIndex | null;
  /** The most recent stone placed (for highlight). */
  lastMove: Move | null;
  /** The 5+ cells that won, for the win highlight. */
  winningLine: Move[] | null;
  moveCount: number;
}

/** Outcome of applying a move. */
export interface MoveResolution {
  gameOver: boolean;
  winner: PlayerIndex | null;
  draw: boolean;
  /** Player to move next (== mover when the game just ended). */
  nextTurn: PlayerIndex;
}

export interface MoveResult {
  endState: GameState;
  outcome: MoveResolution;
}
