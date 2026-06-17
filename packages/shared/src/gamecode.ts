// Short, human-shareable game codes — these ARE the on-chain gameId string.
// ChessDawgs-style: create → get a code → an opponent joins with it. The
// two-letter prefix encodes the variant (GK = Gomoku, TT = Tic-Tac-Toe), so the
// server builds the right board from the code alone.
import {
  DEFAULT_VARIANT,
  VARIANTS,
  variantByPrefix,
  type GameVariant,
} from "@rowdawgs/engine";

// Ambiguous characters (I, L, O, 0, 1) are excluded so codes read aloud / type
// cleanly.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Web Crypto is a global in both the browser and Node 18+, but the shared
// package compiles with lib: ["ES2022"] (no DOM), so reach it through a
// structurally-typed globalThis instead of the ambient `crypto` name.
function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  const webcrypto = (globalThis as {
    crypto?: { getRandomValues<T extends ArrayBufferView>(array: T): T };
  }).crypto;
  if (webcrypto?.getRandomValues) return webcrypto.getRandomValues(bytes);
  // Exotic runtime with no Web Crypto — codes aren't secrets, so a weak source
  // is acceptable here purely as a last resort.
  for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

/** Mint a fresh game code for a variant, e.g. "GK-9PQ4K" / "TT-9PQ4K". */
export function newGameCode(variant: GameVariant = DEFAULT_VARIANT): string {
  const prefix = VARIANTS[variant].prefix;
  let s = "";
  for (const b of randomBytes(5)) s += ALPHABET[b % ALPHABET.length];
  return `${prefix}-${s}`;
}

/** Which variant a gameId encodes (by its prefix); defaults to Gomoku. */
export function variantFromId(gameId: string): GameVariant {
  const m = gameId.toUpperCase().match(/^([A-Z]{2})-/);
  if (m) return variantByPrefix(m[1]) ?? DEFAULT_VARIANT;
  return DEFAULT_VARIANT;
}

/** Accept a raw code, a prefixed code, or a pasted invite link → canonical code. */
export function normalizeCode(input: string): string {
  let t = input.trim();
  const fromLink = t.match(/join=([^&\s]+)/i);
  if (fromLink) t = decodeURIComponent(fromLink[1]);
  t = t.toUpperCase().replace(/\s+/g, "");
  if (!t) return "";
  // A known variant prefix → keep it as-is.
  const m = t.match(/^([A-Z]{2})-(.+)$/);
  if (m && variantByPrefix(m[1])) return `${m[1]}-${m[2]}`;
  // Bare body or unknown prefix → assume the default variant.
  const body = t.includes("-") ? t.split("-").slice(1).join("-") : t;
  return `${VARIANTS[DEFAULT_VARIANT].prefix}-${body}`;
}
