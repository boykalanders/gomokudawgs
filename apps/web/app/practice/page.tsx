"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  applyMove,
  createInitialState,
  validateMove,
  VARIANTS,
  VARIANT_LIST,
  type GameState,
  type GameVariant,
  type Move,
} from "@rowdawgs/engine";
import GameShell from "@/components/GameShell";
import WinnerPopup from "@/components/WinnerPopup";

const PLAYERS = [
  { name: "Deputy Dawg", avatarSrc: "/assets/avatar-deputy.png" },
  { name: "Outlaw Dawg", avatarSrc: "/assets/avatar-outlaw.png" },
] as const;

/**
 * Hot-seat practice board — runs the deterministic engine locally with no
 * wallet, server, or chain. Two players alternate on one screen, mirroring the
 * client design with demo balances and pot.
 */
export default function PracticePage() {
  const router = useRouter();
  const [variant, setVariant] = useState<GameVariant>("gomoku");
  const [state, setState] = useState<GameState>(() => createInitialState("gomoku"));
  const [message, setMessage] = useState<string | null>(null);
  // Games won across resets.
  const [wins, setWins] = useState<[number, number]>([0, 0]);

  const reset = useCallback(
    (v: GameVariant = variant) => {
      setState(createInitialState(v));
      setMessage(null);
    },
    [variant]
  );

  const selectVariant = useCallback(
    (v: GameVariant) => {
      if (v === variant) return;
      setVariant(v);
      setWins([0, 0]);
      reset(v);
    },
    [variant, reset]
  );

  // Dev/design preview: /practice?preview=win shows the winner popup.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("preview") === "win") {
      setState((s) => ({ ...s, gameOver: true, winner: 0 }));
    }
  }, []);

  const play = useCallback(
    (move: Move) => {
      setState((current) => {
        if (current.gameOver) return current;
        const valid = validateMove(current, move);
        if (!valid.ok) {
          setMessage(valid.reason);
          return current;
        }
        setMessage(null);
        const result = applyMove(current, move);
        if (result.outcome.gameOver && result.outcome.winner !== null) {
          const w = result.outcome.winner;
          setWins((f) => (w === 0 ? [f[0] + 1, f[1]] : [f[0], f[1] + 1]));
        }
        return result.endState;
      });
    },
    []
  );

  // Piece word for the player on turn, per variant.
  const seatWord = (seat: 0 | 1) =>
    state.variant === "tictactoe"
      ? seat === 0
        ? "X"
        : "O"
      : state.variant === "connect4"
        ? seat === 0
          ? "red"
          : "yellow"
        : seat === 0
          ? "black"
          : "white";

  const turnLabel = state.gameOver
    ? state.winner !== null
      ? `🏆 ${PLAYERS[state.winner].name} wins!`
      : "Draw — board full"
    : `${PLAYERS[state.turn].name} to move (${seatWord(state.turn)})`;

  // Visible variant picker pinned to the top of the practice board.
  const variantPicker = (
    <div className="flex gap-1 rounded-full border border-gold-dim/40 bg-black/75 p-1 shadow">
      {VARIANT_LIST.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => selectVariant(v.key)}
          aria-pressed={variant === v.key}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            variant === v.key
              ? "bg-gold-sheen text-emerald-deep"
              : "text-cream/70 hover:text-gold-bright"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );

  return (
    <GameShell
      state={state}
      players={[
        { ...PLAYERS[0], detail: `2,450.00 $DDAWGS · 🏆 ${wins[0]}`, badge: "1" },
        { ...PLAYERS[1], detail: `1,980.50 $DDAWGS · 🏆 ${wins[1]}`, badge: "2" },
      ]}
      interactive={!state.gameOver}
      mySeat={state.turn}
      potLabel="250.00 $DDAWGS"
      balanceLabel="10,250.75"
      clockExpiresAt={null}
      statusText={turnLabel}
      banner={message}
      topBadge={variantPicker}
      menuItems={[
        { label: "New game", onClick: () => reset() },
        { label: "Exit to lobby", onClick: () => router.push("/lobby") },
      ]}
      onPlay={play}
      overlay={
        state.gameOver ? (
          state.winner !== null ? (
            <WinnerPopup
              winnerName={PLAYERS[state.winner].name}
              avatarSrc={PLAYERS[state.winner].avatarSrc}
              message={`wins (${wins[0]}–${wins[1]})`}
              amountLabel="+200.00 $DDAWGS"
              actions={
                <>
                  <button className="btn-gold" onClick={() => reset()}>
                    Play again
                  </button>
                  <button className="btn-outline" onClick={() => router.push("/lobby")}>
                    Lobby
                  </button>
                </>
              }
            />
          ) : (
            <WinnerPopup
              draw
              winnerName="Draw"
              message="No line — the board is full"
              actions={
                <>
                  <button className="btn-gold" onClick={() => reset()}>
                    Play again
                  </button>
                  <button className="btn-outline" onClick={() => router.push("/lobby")}>
                    Lobby
                  </button>
                </>
              }
            />
          )
        ) : null
      }
    />
  );
}
