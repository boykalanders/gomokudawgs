"use client";

import type { GameVariant } from "@rowdawgs/engine";

interface PlayerCardProps {
  name: string;
  /** Sub-line under the name (balance, address, …). */
  detail?: string;
  badge?: string;
  /** Portrait image (NFT art or a wallet identicon). */
  avatarSrc?: string;
  /** Which seat this player holds: 0 moves first, 1 second. */
  seat: 0 | 1;
  /** Variant decides the piece/label (stone / X-O / disc). */
  variant: GameVariant;
  isTurn: boolean;
  connected?: boolean;
  /** Mirror the layout for the right-hand player like the design. */
  flip?: boolean;
}

/** The piece glyph + label each seat plays, per variant. */
function seatToken(variant: GameVariant, seat: 0 | 1): { node: React.ReactNode; label: string } {
  if (variant === "tictactoe") {
    return seat === 0
      ? { label: "X", node: <span className="text-base font-extrabold leading-none text-[#c0202a]">✕</span> }
      : {
          label: "O",
          node: <span className="flex h-4 w-4 items-center justify-center rounded-full border-[2.5px] border-[#1f5fa8]" />,
        };
  }
  if (variant === "connect4") {
    return {
      label: seat === 0 ? "Red" : "Yellow",
      node: (
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-black/40"
          style={{
            background:
              seat === 0
                ? "radial-gradient(circle at 35% 30%, #ff6b62, #9c1714)"
                : "radial-gradient(circle at 35% 30%, #ffe88a, #b8900a)",
          }}
        />
      ),
    };
  }
  // Gomoku stones
  return {
    label: seat === 0 ? "Black" : "White",
    node: (
      <span
        className="h-4 w-4 shrink-0 rounded-full border border-black/50"
        style={{
          background:
            seat === 0
              ? "radial-gradient(circle at 35% 30%, #5a5a5a, #000)"
              : "radial-gradient(circle at 35% 30%, #fff, #c7bda4)",
        }}
      />
    ),
  };
}

/** Top-bar player cluster: framed portrait with a piece badge, name and a
 *  balance line. The player on turn gets the design's red glowing frame. */
export default function PlayerCard({
  name,
  detail,
  badge,
  avatarSrc,
  seat,
  variant,
  isTurn,
  connected = true,
  flip = false,
}: PlayerCardProps) {
  const token = seatToken(variant, seat);

  const avatar = (
    <div
      className={`relative h-16 w-[60px] shrink-0 overflow-visible rounded-lg border-2 ${
        isTurn
          ? "border-red-600 shadow-[0_0_14px_rgba(220,38,38,0.6)]"
          : "border-gold/70 shadow-gold-glow"
      }`}
    >
      <div className="h-full w-full overflow-hidden rounded-md bg-wood-grain">
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarSrc} alt={name} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl">🐶</span>
        )}
      </div>
      {badge && (
        <span
          className={`absolute -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border border-gold bg-gold-sheen px-1 text-[10px] font-bold text-mahogany-deep shadow ${
            flip ? "-left-2" : "-right-2"
          }`}
        >
          {badge}
        </span>
      )}
      {!connected && (
        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border border-mahogany-deep bg-red-500" />
      )}
    </div>
  );

  const info = (
    <div className={`min-w-0 ${flip ? "text-right" : ""}`}>
      <p className="truncate font-display text-base font-bold text-amber-50">{name}</p>
      <div className={`mt-1 flex items-center gap-1.5 ${flip ? "justify-end" : ""}`}>
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">{token.node}</span>
        <span className="text-[9px] uppercase tracking-widest text-amber-100/50">{token.label}</span>
      </div>
      {detail && (
        <p
          className={`mt-1 flex items-center gap-1 truncate text-xs font-semibold text-gold-bright ${
            flip ? "justify-end" : ""
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/token.svg" alt="" className="h-3.5 w-3.5" draggable={false} />
          {detail}
        </p>
      )}
    </div>
  );

  return (
    <div className={`flex items-center gap-3 px-1 py-1 ${flip ? "justify-end" : ""}`}>
      {flip ? (
        <>
          {info}
          {avatar}
        </>
      ) : (
        <>
          {avatar}
          {info}
        </>
      )}
    </div>
  );
}
