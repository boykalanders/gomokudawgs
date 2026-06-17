import { DEFAULT_VARIANT, VARIANTS, type GameVariant } from "./variants.js";
import type { GameState, Move, MoveResult, PlayerIndex } from "./types.js";

/** Row-major board index for (x, y) on a board `cols` wide. */
export const idx = (x: number, y: number, cols: number): number => y * cols + x;

export const inBounds = (x: number, y: number, cols: number, rows: number): boolean =>
  x >= 0 && x < cols && y >= 0 && y < rows;

/** Lowest empty row in column `x` (gravity), or null if the column is full.
 *  Row `rows-1` is the floor; discs stack upward from there. */
export function dropRow(
  board: readonly (PlayerIndex | null)[],
  x: number,
  cols: number,
  rows: number
): number | null {
  for (let y = rows - 1; y >= 0; y--) {
    if (board[idx(x, y, cols)] === null) return y;
  }
  return null;
}

/** Fresh, empty board for `variant` — black (player 0) to move. */
export function createInitialState(variant: GameVariant = DEFAULT_VARIANT): GameState {
  const spec = VARIANTS[variant];
  return {
    variant,
    cols: spec.cols,
    rows: spec.rows,
    winLength: spec.winLength,
    gravity: spec.gravity,
    board: new Array(spec.cols * spec.rows).fill(null),
    turn: 0,
    gameOver: false,
    winner: null,
    lastMove: null,
    winningLine: null,
    moveCount: 0,
  };
}

export function validateMove(
  state: GameState,
  move: Move
): { ok: true } | { ok: false; reason: string } {
  if (state.gameOver) return { ok: false, reason: "game is over" };
  const { x, y } = move;
  if (state.gravity) {
    // Only the column matters; the row is resolved by gravity.
    if (!Number.isInteger(x) || x < 0 || x >= state.cols) {
      return { ok: false, reason: "off the board" };
    }
    if (dropRow(state.board, x, state.cols, state.rows) === null) {
      return { ok: false, reason: "column is full" };
    }
    return { ok: true };
  }
  if (!Number.isInteger(x) || !Number.isInteger(y) || !inBounds(x, y, state.cols, state.rows)) {
    return { ok: false, reason: "off the board" };
  }
  if (state.board[idx(x, y, state.cols)] !== null) {
    return { ok: false, reason: "cell already taken" };
  }
  return { ok: true };
}

// The four line orientations: horizontal, vertical, and the two diagonals.
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

/** Returns the winning run (≥ winLength cells) through (x, y), or null. */
export function winningLine(
  board: readonly (PlayerIndex | null)[],
  x: number,
  y: number,
  player: PlayerIndex,
  cols: number,
  rows: number,
  winLength: number
): Move[] | null {
  for (const [dx, dy] of DIRECTIONS) {
    const line: Move[] = [{ x, y }];
    for (let s = 1; ; s++) {
      const nx = x + dx * s;
      const ny = y + dy * s;
      if (inBounds(nx, ny, cols, rows) && board[idx(nx, ny, cols)] === player) {
        line.push({ x: nx, y: ny });
      } else break;
    }
    for (let s = 1; ; s++) {
      const nx = x - dx * s;
      const ny = y - dy * s;
      if (inBounds(nx, ny, cols, rows) && board[idx(nx, ny, cols)] === player) {
        line.unshift({ x: nx, y: ny });
      } else break;
    }
    if (line.length >= winLength) return line;
  }
  return null;
}

/** Place the current player's stone (validateMove must have passed). For
 *  gravity variants the move's column is used and the row is resolved here. */
export function applyMove(state: GameState, move: Move): MoveResult {
  const { cols, rows } = state;
  const board = state.board.slice();
  const player = state.turn;

  const px = move.x;
  const py = state.gravity ? (dropRow(board, move.x, cols, rows) as number) : move.y;
  board[idx(px, py, cols)] = player;

  const line = winningLine(board, px, py, player, cols, rows, state.winLength);
  const moveCount = state.moveCount + 1;
  const draw = !line && moveCount >= cols * rows;
  const gameOver = Boolean(line) || draw;
  const winner = line ? player : null;
  const nextTurn = (player === 0 ? 1 : 0) as PlayerIndex;

  return {
    endState: {
      variant: state.variant,
      cols,
      rows,
      winLength: state.winLength,
      gravity: state.gravity,
      board,
      turn: gameOver ? player : nextTurn,
      gameOver,
      winner,
      lastMove: { x: px, y: py },
      winningLine: line,
      moveCount,
    },
    outcome: { gameOver, winner, draw, nextTurn },
  };
}

/** Deterministic state fingerprint (FNV-1a over board + turn) for desync checks. */
export function stateHash(state: GameState): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < state.board.length; i++) {
    const cell = state.board[i];
    h ^= cell === null ? 0 : cell === 0 ? 1 : 2;
    h = Math.imul(h, 0x01000193);
  }
  h ^= state.turn;
  h = Math.imul(h, 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}
