import { BOARD_SIZE, CELL_COUNT, WIN_LENGTH } from "./constants.js";
import type { GameState, Move, MoveResult, PlayerIndex } from "./types.js";

/** Row-major board index for (x, y). */
export const idx = (x: number, y: number): number => y * BOARD_SIZE + x;

export const inBounds = (x: number, y: number): boolean =>
  x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;

/** Fresh, empty board — black (player 0) to move. */
export function createInitialState(): GameState {
  return {
    board: new Array(CELL_COUNT).fill(null),
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
  if (!Number.isInteger(x) || !Number.isInteger(y) || !inBounds(x, y)) {
    return { ok: false, reason: "off the board" };
  }
  if (state.board[idx(x, y)] !== null) return { ok: false, reason: "cell already taken" };
  return { ok: true };
}

// The four line orientations: horizontal, vertical, and the two diagonals.
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

/** Returns the winning run (≥ WIN_LENGTH cells) through (x, y), or null. */
export function winningLine(
  board: readonly (PlayerIndex | null)[],
  x: number,
  y: number,
  player: PlayerIndex
): Move[] | null {
  for (const [dx, dy] of DIRECTIONS) {
    const line: Move[] = [{ x, y }];
    for (let s = 1; ; s++) {
      const nx = x + dx * s;
      const ny = y + dy * s;
      if (inBounds(nx, ny) && board[idx(nx, ny)] === player) line.push({ x: nx, y: ny });
      else break;
    }
    for (let s = 1; ; s++) {
      const nx = x - dx * s;
      const ny = y - dy * s;
      if (inBounds(nx, ny) && board[idx(nx, ny)] === player) line.unshift({ x: nx, y: ny });
      else break;
    }
    if (line.length >= WIN_LENGTH) return line;
  }
  return null;
}

/** Place the current player's stone (validateMove must have passed). */
export function applyMove(state: GameState, move: Move): MoveResult {
  const board = state.board.slice();
  const player = state.turn;
  board[idx(move.x, move.y)] = player;

  const line = winningLine(board, move.x, move.y, player);
  const moveCount = state.moveCount + 1;
  const draw = !line && moveCount >= CELL_COUNT;
  const gameOver = Boolean(line) || draw;
  const winner = line ? player : null;
  const nextTurn = (player === 0 ? 1 : 0) as PlayerIndex;

  return {
    endState: {
      board,
      turn: gameOver ? player : nextTurn,
      gameOver,
      winner,
      lastMove: move,
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
