import { VARIANTS } from "./variants.js";

/** Default (Gomoku) board dimensions — kept for convenience / back-compat. */
export const BOARD_SIZE = VARIANTS.gomoku.cols;
/** Stones in a row needed to win the default (Gomoku) variant. */
export const WIN_LENGTH = VARIANTS.gomoku.winLength;
/** Total cells on the default (Gomoku) board. */
export const CELL_COUNT = VARIANTS.gomoku.cols * VARIANTS.gomoku.rows;
