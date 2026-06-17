import { describe, it, expect } from "vitest";
import {
  BOARD_SIZE,
  applyMove,
  createInitialState,
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
