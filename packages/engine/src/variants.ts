/**
 * Game variants. All share one engine — place a stone, first to N-in-a-row
 * wins — differing in board shape, win length, and whether gravity applies
 * (Connect Four: a disc dropped into a column falls to the lowest empty cell).
 * The two/three-char `prefix` is embedded in the gameId so the server (and
 * lobby) know which board to build from the code alone.
 */
export type GameVariant = "gomoku" | "tictactoe" | "connect4";

export interface VariantSpec {
  key: GameVariant;
  label: string;
  /** Columns (board width in intersections). */
  cols: number;
  /** Rows (board height in intersections). */
  rows: number;
  /** Stones in a row needed to win. */
  winLength: number;
  /** Code prefix, e.g. "GK" → "GK-7F3K2". */
  prefix: string;
  /** Connect Four: a move picks a column; the stone drops to the lowest cell. */
  gravity: boolean;
  /** One-line description for the lobby. */
  blurb: string;
}

export const VARIANTS: Record<GameVariant, VariantSpec> = {
  gomoku: {
    key: "gomoku",
    label: "Gomoku",
    cols: 15,
    rows: 15,
    winLength: 5,
    prefix: "GK",
    gravity: false,
    blurb: "15×15 board · five in a row",
  },
  tictactoe: {
    key: "tictactoe",
    label: "Tic-Tac-Toe",
    cols: 3,
    rows: 3,
    winLength: 3,
    prefix: "TT",
    gravity: false,
    blurb: "3×3 board · three in a row",
  },
  connect4: {
    key: "connect4",
    label: "Connect 4",
    cols: 7,
    rows: 6,
    winLength: 4,
    prefix: "C4",
    gravity: true,
    blurb: "7×6 board · drop & connect four",
  },
};

export const DEFAULT_VARIANT: GameVariant = "gomoku";

export const VARIANT_LIST: VariantSpec[] = Object.values(VARIANTS);

/** Resolve a code prefix to a variant, or null if unknown. */
export function variantByPrefix(prefix: string): GameVariant | null {
  const p = prefix.toUpperCase();
  return VARIANT_LIST.find((v) => v.prefix === p)?.key ?? null;
}
