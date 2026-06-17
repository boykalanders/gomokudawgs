"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAccountModal, useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import type { GameState, Move } from "@rowdawgs/engine";
import type { ChatMessage } from "@rowdawgs/shared";
import Chat from "@/components/Chat";
import GomokuBoard from "@/components/GomokuBoard";
import PlayerCard from "@/components/PlayerCard";
import {
  IconChat,
  IconGift,
  IconHome,
  IconMenu,
  IconSoundOff,
  IconSoundOn,
  IconTrophy,
  IconWallet,
} from "@/components/icons";

export interface ShellPlayer {
  name: string;
  detail?: string;
  badge?: string;
  avatarSrc?: string;
  connected?: boolean;
}

export interface ShellMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface GameShellProps {
  state: GameState;
  players: [ShellPlayer, ShellPlayer];
  interactive: boolean;
  mySeat?: 0 | 1 | null;
  potLabel?: string | null;
  balanceLabel?: string | null;
  clockExpiresAt?: number | null;
  statusText: string;
  banner?: string | null;
  /** Optional control pinned to the top-centre of the board (e.g. a practice
   *  variant picker). Sits where the move clock would; pages use one or other. */
  topBadge?: ReactNode;
  menuItems: ShellMenuItem[];
  onPlay: (move: Move) => void;
  chat?: {
    messages: ChatMessage[];
    myAddress: string | null;
    onSend: (text: string) => void;
  };
  overlay?: ReactNode;
}

/** Full game chrome: player frames + logo top bar, the Gomoku board, a move
 *  clock, money panels and a bottom nav. */
export default function GameShell({
  state,
  players,
  interactive,
  mySeat,
  potLabel,
  balanceLabel,
  clockExpiresAt,
  statusText,
  banner,
  topBadge,
  menuItems,
  onPlay,
  chat,
  overlay,
}: GameShellProps) {
  const [muted, setMuted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const seenCount = useRef(0);

  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { isConnected } = useAccount();

  useEffect(() => {
    const count = chat?.messages.length ?? 0;
    if (chatOpen) {
      seenCount.current = count;
      setUnread(0);
    } else if (count > seenCount.current) {
      setUnread(count - seenCount.current);
    }
  }, [chat?.messages.length, chatOpen]);

  // Open the chat sidebar by default only on screens wide enough that it sits
  // in the page margin (outside the box) rather than over the board.
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(min-width: 1900px)").matches) {
      setChatOpen(true);
    }
  }, []);

  return (
    <>
      <div className="relative mx-auto flex h-[calc(100dvh-9.5rem)] min-h-[520px] w-full max-w-[1180px] select-none flex-col rounded-3xl border border-gold-dim/40 bg-emerald-deep/85 p-3 shadow-2xl shadow-felt-inset touch:h-[calc(100dvh-2rem)] touch:min-h-0">
        {/* Logo floats over the top of the board, like the design. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/logo.svg"
          alt="Row Dawgs"
          className="pointer-events-none absolute left-1/2 top-2 z-20 h-24 w-auto -translate-x-1/2 drop-shadow-[0_6px_14px_rgba(0,0,0,0.8)] xl:h-28"
          draggable={false}
        />

        {/* ── top bar ── */}
        <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-3 px-1 pb-2">
          <div className="relative">
            <IconButton
              icon={<IconMenu />}
              active={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              title="Menu"
            />
            {menuOpen && (
              <div className="absolute left-0 top-[3.25rem] z-30 w-52 overflow-hidden rounded-xl border border-gold-dim/40 bg-emerald-panel shadow-2xl">
                <button
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-cream transition hover:bg-gold/10"
                  onClick={() => {
                    setMenuOpen(false);
                    setMuted((v) => !v);
                  }}
                >
                  {muted ? <IconSoundOff className="h-4 w-4" /> : <IconSoundOn className="h-4 w-4" />}
                  {muted ? "Sound: off" : "Sound: on"}
                </button>
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-gold/10 ${
                      item.danger ? "text-red-300 hover:bg-red-500/10" : "text-cream"
                    }`}
                    onClick={() => {
                      setMenuOpen(false);
                      item.onClick();
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <PlayerCard
            name={players[0].name}
            detail={players[0].detail}
            badge={players[0].badge}
            avatarSrc={players[0].avatarSrc}
            seat={0}
            variant={state.variant}
            isTurn={!state.gameOver && state.turn === 0}
            connected={players[0].connected ?? true}
          />

          {/* Spacer the floating logo sits over. */}
          <div className="w-40 xl:w-52" />

          <PlayerCard
            name={players[1].name}
            detail={players[1].detail}
            badge={players[1].badge}
            avatarSrc={players[1].avatarSrc}
            seat={1}
            variant={state.variant}
            isTurn={!state.gameOver && state.turn === 1}
            connected={players[1].connected ?? true}
            flip
          />

          <div className="relative justify-self-end">
            <IconButton
              icon={<IconChat />}
              active={chatOpen}
              onClick={() => setChatOpen((v) => !v)}
              disabled={!chat}
              title="Table talk"
            />
            {unread > 0 && !chatOpen && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-emerald-deep bg-burn px-1 text-[10px] font-bold text-white shadow">
                {unread}
              </span>
            )}
          </div>
        </div>

        {/* ── board ── */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <div className="relative flex aspect-square h-full max-h-full items-center justify-center">
            <GomokuBoard state={state} interactive={interactive} mySeat={mySeat} onPlay={onPlay} />

            {clockExpiresAt != null && !state.gameOver && (
              <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2">
                <MoveClock expiresAt={clockExpiresAt} />
              </div>
            )}

            {topBadge && (
              <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2">{topBadge}</div>
            )}

            {banner && (
              <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-gold/60 bg-black/80 px-4 py-1.5 text-sm text-gold-bright shadow-gold-glow">
                {banner}
              </div>
            )}

            {overlay && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/60">
                {overlay}
              </div>
            )}
          </div>
        </div>

        {/* ── bottom bar ── */}
        <div className="mt-2 flex items-center gap-3">
          <MoneyPanel title="$DDAWGS balance" value={balanceLabel ?? "—"} icon={<TokenIcon />} plus />
          <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden">
            <div
              className={`flex max-w-full items-center gap-3 rounded-xl border-2 px-6 py-1.5 text-center transition touch:gap-2 touch:px-3 ${
                interactive ? "border-gold bg-gold/15 shadow-gold-glow" : "border-gold/40 bg-black/70"
              }`}
            >
              <span className="block truncate font-display text-base font-bold tracking-widest text-gold-bright">
                {statusText}
              </span>
            </div>
          </div>
          <MoneyPanel title="Current pot" value={potLabel ?? "—"} icon={<TokenIcon />} />
        </div>

        {/* ── bottom nav: only on touch devices (the header is hidden there). ── */}
        <nav
          data-testid="shell-nav"
          className="mt-2 flex items-end justify-around border-t border-gold-dim/20 px-2 pt-2 text-[10px] uppercase tracking-[0.12em] text-cream/65 desktop:hidden"
        >
          <NavItem href="/lobby" icon={<IconHome className="h-5 w-5" />} label="Lobby" />
          <NavItem href="/leaderboard" icon={<IconTrophy className="h-5 w-5" />} label="Ranks" />
          <span className="-mt-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold bg-emerald-deep shadow-gold-glow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/token.svg" alt="" className="h-8 w-8" draggable={false} />
          </span>
          <NavItem icon={<IconGift className="h-5 w-5" />} label="Rewards" disabled title="Rewards — coming soon" />
          <NavItem
            icon={<IconWallet className="h-5 w-5" />}
            label="Wallet"
            onClick={() => (isConnected ? openAccountModal?.() : openConnectModal?.())}
          />
        </nav>
      </div>

      {/* Table Talk — a sliding sidebar OUTSIDE the game box. */}
      {chat && (
        <>
          {chatOpen && (
            <button
              aria-label="Close chat"
              onClick={() => setChatOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm desktop:hidden"
            />
          )}
          <aside
            className={`fixed right-0 top-0 bottom-0 z-50 flex w-[min(20rem,88vw)] flex-col p-2 transition-transform duration-200 ease-out desktop:top-[4.25rem] desktop:bottom-4 ${
              chatOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
            }`}
          >
            <Chat
              messages={chat.messages}
              myAddress={chat.myAddress}
              onSend={chat.onSend}
              onClose={() => setChatOpen(false)}
            />
          </aside>
        </>
      )}
    </>
  );
}

/** Per-move countdown — grows and pulses red under 10 seconds. */
function MoveClock({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    setRemaining(Math.max(0, expiresAt - Date.now()));
    const t = setInterval(() => setRemaining(Math.max(0, expiresAt - Date.now())), 200);
    return () => clearInterval(t);
  }, [expiresAt]);

  const secs = Math.ceil(remaining / 1000);
  const urgent = secs <= 10;
  const mm = Math.floor(secs / 60);
  const ss = secs % 60;
  const label = mm > 0 ? `${mm}:${ss.toString().padStart(2, "0")}` : `${ss}`;

  return (
    <div
      className={`rounded-full border bg-black/80 font-mono font-bold tabular-nums shadow transition-all ${
        urgent
          ? "animate-pulse border-red-500 px-5 py-2 text-2xl text-red-400 shadow-[0_0_16px_rgba(220,38,38,0.7)]"
          : "border-gold/60 px-3.5 py-1 text-sm text-gold-bright"
      }`}
    >
      {label}
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  href?: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const inner = (
    <span
      className={`flex flex-col items-center gap-1 px-2 transition ${
        disabled ? "cursor-not-allowed opacity-45" : "hover:text-gold-bright"
      }`}
    >
      {icon}
      {label}
    </span>
  );
  if (href && !disabled) {
    return (
      <Link href={href} className="contents">
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled} title={title}>
      {inner}
    </button>
  );
}

const railBase =
  "flex items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-40";
const railTone = (active?: boolean) =>
  active
    ? "border-gold/80 bg-gold/10 text-gold-bright shadow-gold-glow"
    : "border-gold-dim/30 bg-emerald-panel/60 text-cream/75 enabled:hover:border-gold/60 enabled:hover:bg-gold/5 enabled:hover:text-gold-bright";

function IconButton({
  icon,
  onClick,
  disabled,
  active,
  title,
}: {
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${railBase} h-11 w-11 touch:h-10 touch:w-10 ${railTone(active)}`}
    >
      {icon}
    </button>
  );
}

function TokenIcon() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/assets/token.svg" alt="" className="h-7 w-7" draggable={false} />;
}

function MoneyPanel({
  title,
  value,
  icon,
  plus,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  plus?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-gold-dim/30 bg-emerald-panel/60 px-3.5 py-2 touch:gap-1.5 touch:px-2.5 touch:py-1.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">{icon}</span>
      <div className="leading-tight">
        <p className="text-[9px] uppercase tracking-[0.14em] text-cream/45">{title}</p>
        <p className="font-mono text-sm font-semibold text-gold-bright">{value}</p>
      </div>
      {plus && (
        <button
          className="ml-0.5 flex h-6 w-6 cursor-not-allowed items-center justify-center rounded-full border border-gold-dim/50 text-gold opacity-60"
          title="Buy $DDawgs — coming soon"
        >
          +
        </button>
      )}
    </div>
  );
}
