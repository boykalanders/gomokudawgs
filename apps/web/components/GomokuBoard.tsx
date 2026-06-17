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

// Pieces sit at integer grid points; cell (x,y) renders at (PAD+x, PAD+y).
const PAD = 0.6;

// Star points (handicap dots) — only on the full 15×15 Gomoku board.
const STAR_POINTS: ReadonlyArray<[number, number]> = [
  [3, 3],
  [3, 11],
  [11, 3],
  [11, 11],
  [7, 7],
];

/** Server-authoritative board, themed per variant:
 *  • Gomoku — honey-wood board, black/white stones on intersections.
 *  • Tic-Tac-Toe — parchment board, classic X / O marks.
 *  • Connect 4 — blue board with circular slots; drop red/yellow discs (gravity).
 *  All share the same click/hover/resolve logic; only the look differs. */
export default function GomokuBoard({ state, interactive, mySeat, onPlay }: GomokuBoardProps) {
  const [hover, setHover] = useState<Move | null>(null);

  const { cols, rows, gravity, board, variant } = state;
  const isTTT = variant === "tictactoe";
  const isC4 = variant === "connect4";
  const isGomoku = variant === "gomoku";

  const spanX = cols - 1 + PAD * 2;
  const spanY = rows - 1 + PAD * 2;
  const last = state.lastMove;
  const winSet = useMemo(() => {
    const s = new Set<number>();
    if (state.winningLine) for (const c of state.winningLine) s.add(idx(c.x, c.y, cols));
    return s;
  }, [state.winningLine, cols]);

  // Where a click on cell (x, y) would land — the cell itself, or the bottom of
  // the column for gravity variants. Null if not playable.
  const resolveTarget = (x: number, y: number): Move | null => {
    if (!interactive || state.gameOver) return null;
    if (gravity) {
      const r = dropRow(board, x, cols, rows);
      return r === null ? null : { x, y: r };
    }
    return board[idx(x, y, cols)] === null ? { x, y } : null;
  };

  // Render a placed piece (or a translucent ghost) for the given seat.
  const piece = (seat: 0 | 1, cx: number, cy: number, opts: { ghost?: boolean; win?: boolean }) => {
    const op = opts.ghost ? 0.4 : 1;
    if (isTTT) {
      const r = 0.3;
      const winHalo = opts.win ? <circle cx={cx} cy={cy} r="0.44" fill="rgba(232,197,71,0.3)" /> : null;
      return seat === 0 ? (
        <g opacity={op}>
          {winHalo}
          <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} stroke="#b5202a" strokeWidth="0.14" strokeLinecap="round" />
          <line x1={cx - r} y1={cy + r} x2={cx + r} y2={cy - r} stroke="#b5202a" strokeWidth="0.14" strokeLinecap="round" />
        </g>
      ) : (
        <g opacity={op}>
          {winHalo}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1f5fa8" strokeWidth="0.14" />
        </g>
      );
    }
    if (isC4) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r="0.4"
          fill={seat === 0 ? "url(#disc-red)" : "url(#disc-yellow)"}
          stroke={opts.win ? "#e8c33a" : "rgba(0,0,0,0.25)"}
          strokeWidth={opts.win ? "0.1" : "0.03"}
          opacity={op}
        />
      );
    }
    // Gomoku stones
    return (
      <g opacity={op}>
        {!opts.ghost && (
          <circle cx={cx} cy={cy} r="0.42" fill="rgba(0,0,0,0.28)" transform="translate(0.02,0.03)" />
        )}
        <circle
          cx={cx}
          cy={cy}
          r="0.42"
          fill={seat === 0 ? "url(#stone-black)" : "url(#stone-white)"}
          stroke={opts.win ? "#e8c33a" : "none"}
          strokeWidth={opts.win ? "0.1" : "0"}
        />
      </g>
    );
  };

  return (
    <div className="relative flex h-full max-h-full w-full max-w-full items-center justify-center">
      <svg
        viewBox={`0 0 ${spanX} ${spanY}`}
        className="h-full w-full rounded-lg"
        role="grid"
        aria-label={`${variant} board`}
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
          <radialGradient id="disc-red" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ff6b62" />
            <stop offset="55%" stopColor="#d9302d" />
            <stop offset="100%" stopColor="#9c1714" />
          </radialGradient>
          <radialGradient id="disc-yellow" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ffe88a" />
            <stop offset="55%" stopColor="#f1c40f" />
            <stop offset="100%" stopColor="#b8900a" />
          </radialGradient>
          <linearGradient id="board-wood" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e7b766" />
            <stop offset="100%" stopColor="#caa052" />
          </linearGradient>
          <linearGradient id="board-parchment" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f4ead0" />
            <stop offset="100%" stopColor="#e4d2a6" />
          </linearGradient>
          <linearGradient id="board-blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c5be0" />
            <stop offset="100%" stopColor="#16379c" />
          </linearGradient>
        </defs>

        {/* Board field */}
        <rect
          x="0"
          y="0"
          width={spanX}
          height={spanY}
          rx="0.4"
          fill={isTTT ? "url(#board-parchment)" : isC4 ? "url(#board-blue)" : "url(#board-wood)"}
        />

        {/* Column highlight (gravity variants) */}
        {gravity && hover && (
          <rect x={PAD + hover.x - 0.5} y={PAD - 0.5} width="1" height={rows} fill="#ffffff" opacity="0.1" />
        )}

        {/* Grid */}
        {isGomoku && (
          <>
            <g stroke="#3a2a14" strokeWidth="0.04" strokeLinecap="round">
              {Array.from({ length: rows }, (_, i) => (
                <line key={`h${i}`} x1={PAD} y1={PAD + i} x2={PAD + cols - 1} y2={PAD + i} />
              ))}
              {Array.from({ length: cols }, (_, i) => (
                <line key={`v${i}`} x1={PAD + i} y1={PAD} x2={PAD + i} y2={PAD + rows - 1} />
              ))}
            </g>
            <g fill="#3a2a14">
              {STAR_POINTS.map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={PAD + x} cy={PAD + y} r="0.1" />
              ))}
            </g>
          </>
        )}
        {isTTT && (
          // Classic noughts-and-crosses grid: inner lines only, no outer border.
          <g stroke="#5a4a2a" strokeWidth="0.07" strokeLinecap="round">
            {Array.from({ length: cols - 1 }, (_, i) => (
              <line key={`v${i}`} x1={PAD + i + 0.5} y1={PAD - 0.4} x2={PAD + i + 0.5} y2={PAD + rows - 0.6} />
            ))}
            {Array.from({ length: rows - 1 }, (_, i) => (
              <line key={`h${i}`} x1={PAD - 0.4} y1={PAD + i + 0.5} x2={PAD + cols - 0.6} y2={PAD + i + 0.5} />
            ))}
          </g>
        )}

        {/* Pieces + click targets */}
        {Array.from({ length: rows }, (_, y) =>
          Array.from({ length: cols }, (_, x) => {
            const cell = board[idx(x, y, cols)];
            const cx = PAD + x;
            const cy = PAD + y;
            const isLast = last && last.x === x && last.y === y;
            const isWin = winSet.has(idx(x, y, cols));
            const target = resolveTarget(x, y);
            const playable = target !== null;
            const isGhost =
              hover != null && target != null && target.x === hover.x && target.y === hover.y;
            return (
              <g key={`${x}-${y}`}>
                {/* Connect 4: empty slot punched in the blue board */}
                {isC4 && cell === null && <circle cx={cx} cy={cy} r="0.4" fill="#0f1733" />}

                {cell !== null && (
                  <>
                    {piece(cell, cx, cy, { win: isWin })}
                    {isLast && !state.gameOver && !isTTT && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="0.12"
                        fill="none"
                        stroke={cell === 0 ? "#f5efe0" : isC4 ? "#101010" : "#c0202a"}
                        strokeWidth="0.05"
                      />
                    )}
                  </>
                )}

                {/* Hover ghost at the landing cell */}
                {isGhost && mySeat != null && cell === null && piece(mySeat, cx, cy, { ghost: true })}

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
