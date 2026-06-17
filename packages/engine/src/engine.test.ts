import { describe, it, expect } from "vitest";
import {
  BOARD_SIZE,
  applyMove,
  createInitialState,
  dropRow,
  idx,
  stateHash,
  validateMove,
  type GameState,
  type Move,
} from "./index.js";

/** Play a sequence of moves, alternating turns via the engine. */
function play(moves: Move[]): GameState {
  let s = createInitialState();
  for (const m of moves) {
    expect(validateMove(s, m).ok).toBe(true);
    s = applyMove(s, m).endState;
  }
  return s;
}

describe("gomoku engine", () => {
  it("starts empty with black (player 0) to move", () => {
    const s = createInitialState();
    expect(s.board).toHaveLength(BOARD_SIZE * BOARD_SIZE);
    expect(s.board.every((c) => c === null)).toBe(true);
    expect(s.turn).toBe(0);
    expect(s.gameOver).toBe(false);
  });

  it("alternates turns and records the last move", () => {
    let s = createInitialState();
    s = applyMove(s, { x: 7, y: 7 }).endState;
    expect(s.turn).toBe(1);
    expect(s.lastMove).toEqual({ x: 7, y: 7 });
    s = applyMove(s, { x: 0, y: 0 }).endState;
    expect(s.turn).toBe(0);
  });

  it("rejects out-of-bounds and occupied cells", () => {
    let s = createInitialState();
    expect(validateMove(s, { x: -1, y: 0 }).ok).toBe(false);
    expect(validateMove(s, { x: BOARD_SIZE, y: 0 }).ok).toBe(false);
    s = applyMove(s, { x: 5, y: 5 }).endState;
    expect(validateMove(s, { x: 5, y: 5 }).ok).toBe(false);
  });

  it("detects a horizontal five-in-a-row", () => {
    // black: (0,0)(1,0)(2,0)(3,0)(4,0); white plays elsewhere between.
    const s = play([
      { x: 0, y: 0 }, { x: 0, y: 1 },
      { x: 1, y: 0 }, { x: 1, y: 1 },
      { x: 2, y: 0 }, { x: 2, y: 1 },
      { x: 3, y: 0 }, { x: 3, y: 1 },
      { x: 4, y: 0 },
    ]);
    expect(s.gameOver).toBe(true);
    expect(s.winner).toBe(0);
    expect(s.winningLine).toHaveLength(5);
  });

  it("detects a diagonal five-in-a-row", () => {
    const s = play([
      { x: 0, y: 0 }, { x: 1, y: 0 },
      { x: 1, y: 1 }, { x: 2, y: 0 },
      { x: 2, y: 2 }, { x: 3, y: 0 },
      { x: 3, y: 3 }, { x: 4, y: 0 },
      { x: 4, y: 4 },
    ]);
    expect(s.gameOver).toBe(true);
    expect(s.winner).toBe(0);
  });

  it("does not declare a win for four in a row", () => {
    const s = play([
      { x: 0, y: 0 }, { x: 0, y: 1 },
      { x: 1, y: 0 }, { x: 1, y: 1 },
      { x: 2, y: 0 }, { x: 2, y: 1 },
      { x: 3, y: 0 },
    ]);
    expect(s.gameOver).toBe(false);
    expect(s.winner).toBe(null);
  });

  it("produces a stable, move-sensitive hash", () => {
    const a = applyMove(createInitialState(), { x: 7, y: 7 }).endState;
    const b = applyMove(createInitialState(), { x: 7, y: 7 }).endState;
    const c = applyMove(createInitialState(), { x: 8, y: 7 }).endState;
    expect(stateHash(a)).toBe(stateHash(b));
    expect(stateHash(a)).not.toBe(stateHash(c));
  });
});

describe("tic-tac-toe variant", () => {
  function playTTT(moves: Move[]): GameState {
    let s = createInitialState("tictactoe");
    for (const m of moves) {
      expect(validateMove(s, m).ok).toBe(true);
      s = applyMove(s, m).endState;
    }
    return s;
  }

  it("builds a 3×3 board with a win length of three", () => {
    const s = createInitialState("tictactoe");
    expect(s.variant).toBe("tictactoe");
    expect(s.cols).toBe(3);
    expect(s.rows).toBe(3);
    expect(s.winLength).toBe(3);
    expect(s.gravity).toBe(false);
    expect(s.board).toHaveLength(9);
  });

  it("rejects moves off the 3×3 board", () => {
    const s = createInitialState("tictactoe");
    expect(validateMove(s, { x: 3, y: 0 }).ok).toBe(false);
    expect(validateMove(s, { x: 2, y: 2 }).ok).toBe(true);
  });

  it("wins on three in a row (not five)", () => {
    // black takes the top row; white plays the row below.
    const s = playTTT([
      { x: 0, y: 0 }, { x: 0, y: 1 },
      { x: 1, y: 0 }, { x: 1, y: 1 },
      { x: 2, y: 0 },
    ]);
    expect(s.gameOver).toBe(true);
    expect(s.winner).toBe(0);
    expect(s.winningLine).toHaveLength(3);
  });

  it("detects a full-board draw", () => {
    // X O X / X O O / O X X — no three in a row.
    const s = playTTT([
      { x: 0, y: 0 }, { x: 1, y: 0 },
      { x: 2, y: 0 }, { x: 1, y: 1 },
      { x: 0, y: 1 }, { x: 2, y: 1 },
      { x: 1, y: 2 }, { x: 0, y: 2 },
      { x: 2, y: 2 },
    ]);
    expect(s.gameOver).toBe(true);
    expect(s.winner).toBe(null);
    expect(s.moveCount).toBe(9);
  });
});

describe("connect-four variant", () => {
  // Moves only carry a column; the row is resolved by gravity.
  function drop(cols: number[]): GameState {
    let s = createInitialState("connect4");
    for (const x of cols) {
      expect(validateMove(s, { x, y: 0 }).ok).toBe(true);
      s = applyMove(s, { x, y: 0 }).endState;
    }
    return s;
  }

  it("builds a 7×6 gravity board", () => {
    const s = createInitialState("connect4");
    expect(s.cols).toBe(7);
    expect(s.rows).toBe(6);
    expect(s.winLength).toBe(4);
    expect(s.gravity).toBe(true);
    expect(s.board).toHaveLength(42);
  });

  it("drops a stone to the floor regardless of the y sent", () => {
    const s = applyMove(createInitialState("connect4"), { x: 3, y: 0 }).endState;
    expect(s.lastMove).toEqual({ x: 3, y: 5 }); // bottom row
    expect(s.board[idx(3, 5, 7)]).toBe(0);
    // The next disc in the same column stacks on top.
    const s2 = applyMove(s, { x: 3, y: 0 }).endState;
    expect(s2.lastMove).toEqual({ x: 3, y: 4 });
  });

  it("wins on four stacked vertically", () => {
    // Black keeps dropping col 0; white answers in col 1.
    const s = drop([0, 1, 0, 1, 0, 1, 0]);
    expect(s.gameOver).toBe(true);
    expect(s.winner).toBe(0);
    expect(s.winningLine).toHaveLength(4);
  });

  it("rejects a move into a full column", () => {
    const s = drop([0, 0, 0, 0, 0, 0]); // 6 high — column 0 now full
    expect(dropRow(s.board, 0, 7, 6)).toBe(null);
    expect(validateMove(s, { x: 0, y: 0 }).ok).toBe(false);
    expect(validateMove(s, { x: 1, y: 0 }).ok).toBe(true);
  });
});
