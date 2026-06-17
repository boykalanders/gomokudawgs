"use client";

import { useMemo, useState } from "react";
import { dropRow, idx, type GameState, type Move } from "@rowdawgs/engine";

interface GomokuBoardProps {
  state: GameState;
  /** True when it's this client's turn and a move may be placed. */
  interactive: boolean;
  /** Which seat the local player occupies (0 = black, 1 = white) — null = spectator. */
  mySeat?: 0 | 1 | null;
  onPlay: (move: Move) => void;
}

// The board is drawn as an SVG so it scales crisply to any size. Stones sit on
// the line intersections (Gomoku is played on intersections, not in cells).
const PAD = 0.6; // padding in cell units around the grid lines

// Star points (handicap dots) — only on the full 15×15 Gomoku board.
const STAR_POINTS: ReadonlyArray<[number, number]> = [
  [3, 3],
  [3, 11],
  [11, 3],
  [11, 11],
  [7, 7],
];

/** Server-authoritative board for any variant (Gomoku 15×15, Tic-Tac-Toe 3×3,
 *  or Connect Four 7×6 with gravity). For gravity boards, clicking a column
 *  drops a stone to the lowest empty cell; otherwise clicking an empty
 *  intersection places one. Moves are sent up and the board re-renders from the
 *  next authoritative snapshot. */
export default function GomokuBoard({ state, interactive, mySeat, onPlay }: GomokuBoardProps) {
  const [hover, setHover] = useState<Move | null>(null);

  const { cols, rows, gravity, board } = state;
  const spanX = cols - 1 + PAD * 2;
  const spanY = rows - 1 + PAD * 2;
  const showStars = state.variant === "gomoku";
  const last = state.lastMove;
  const winSet = useMemo(() => {
    const s = new Set<number>();
    if (state.winningLine) for (const c of state.winningLine) s.add(idx(c.x, c.y, cols));
    return s;
  }, [state.winningLine, cols]);

  // Where a click on cell (x, y) would actually land — the cell itself, or the
  // bottom of the column for gravity variants. Null if it isn't playable.
  const resolveTarget = (x: number, y: number): Move | null => {
    if (!interactive || state.gameOver) return null;
    if (gravity) {
      const r = dropRow(board, x, cols, rows);
      return r === null ? null : { x, y: r };
    }
    return board[idx(x, y, cols)] === null ? { x, y } : null;
  };

  // Stone fill for a seat: black plays first (seat 0), white second (seat 1).
  const stoneFill = (seat: 0 | 1) => (seat === 0 ? "url(#stone-black)" : "url(#stone-white)");

  return (
    <div className="relative flex h-full max-h-full w-full max-w-full items-center justify-center">
      <svg
        viewBox={`0 0 ${spanX} ${spanY}`}
        className="h-full w-full rounded-lg"
        role="grid"
        aria-label={`${state.variant} board`}
      >
        <defs>
          <radialGradient id="stone-black" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#5a5a5a" />
            <stop offset="45%" stopColor="#1b1b1b" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
          <radialGradient id="stone-white" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#ece6d8" />
            <stop offset="100%" stopColor="#c7bda4" />
          </radialGradient>
          <linearGradient id="board-wood" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e7b766" />
            <stop offset="100%" stopColor="#caa052" />
          </linearGradient>
        </defs>

        {/* Wood field */}
        <rect x="0" y="0" width={spanX} height={spanY} rx="0.4" fill="url(#board-wood)" />

        {/* Column highlight (gravity variants) */}
        {gravity && hover && (
          <rect
            x={PAD + hover.x - 0.5}
            y={PAD - 0.5}
            width="1"
            height={rows}
            fill="#ffffff"
            opacity="0.07"
          />
        )}

        {/* Grid lines */}
        <g stroke="#3a2a14" strokeWidth="0.04" strokeLinecap="round">
          {Array.from({ length: rows }, (_, i) => (
            <line key={`h${i}`} x1={PAD} y1={PAD + i} x2={PAD + cols - 1} y2={PAD + i} />
          ))}
          {Array.from({ length: cols }, (_, i) => (
            <line key={`v${i}`} x1={PAD + i} y1={PAD} x2={PAD + i} y2={PAD + rows - 1} />
          ))}
        </g>

        {/* Star points (Gomoku only) */}
        {showStars && (
          <g fill="#3a2a14">
            {STAR_POINTS.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={PAD + x} cy={PAD + y} r="0.1" />
            ))}
          </g>
        )}

        {/* Stones + click targets */}
        {Array.from({ length: rows }, (_, y) =>
          Array.from({ length: cols }, (_, x) => {
            const cell = board[idx(x, y, cols)];
            const cx = PAD + x;
            const cy = PAD + y;
            const isLast = last && last.x === x && last.y === y;
            const isWin = winSet.has(idx(x, y, cols));
            const target = resolveTarget(x, y);
            const playable = target !== null;
            // Ghost shows at the landing cell (this cell for placement games, or
            // the column's drop cell for gravity games).
            const isGhost =
              hover != null && target != null && target.x === hover.x && target.y === hover.y;
            return (
              <g key={`${x}-${y}`}>
                {cell !== null && (
                  <>
                    <circle cx={cx} cy={cy} r="0.42" fill="rgba(0,0,0,0.28)" transform="translate(0.02,0.03)" />
                    <circle
                      cx={cx}
                      cy={cy}
                      r="0.42"
                      fill={stoneFill(cell)}
                      stroke={isWin ? "#e8c33a" : "none"}
                      strokeWidth={isWin ? "0.1" : "0"}
                    />
                    {isLast && !state.gameOver && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="0.12"
                        fill="none"
                        stroke={cell === 0 ? "#f5efe0" : "#c0202a"}
                        strokeWidth="0.05"
                      />
                    )}
                  </>
                )}
                {/* Hover ghost stone at the landing cell */}
                {isGhost && mySeat != null && cell === null && (
                  <circle cx={cx} cy={cy} r="0.4" fill={stoneFill(mySeat)} opacity="0.4" />
                )}
                {/* Invisible hit area */}
                <rect
                  x={cx - 0.5}
                  y={cy - 0.5}
                  width="1"
                  height="1"
                  fill="transparent"
                  className={playable ? "cursor-pointer" : "cursor-default"}
                  onMouseEnter={() => setHover({ x, y })}
                  onMouseLeave={() => setHover((h) => (h && h.x === x && h.y === y ? null : h))}
                  onClick={() => target && onPlay(target)}
                />
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}
