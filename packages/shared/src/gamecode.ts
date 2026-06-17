// Short, human-shareable game codes — these ARE the on-chain gameId string.
// ChessDawgs-style: create → get a code → an opponent joins with it. Gomoku has
// a single mode, so codes are simply "GD-XXXXX".

// Ambiguous characters (I, L, O, 0, 1) are excluded so codes read aloud / type
// cleanly.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const PREFIX = "GD";

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

/** Mint a fresh game code, e.g. "GD-9PQ4K". */
export function newGameCode(): string {
  let s = "";
  for (const b of randomBytes(5)) s += ALPHABET[b % ALPHABET.length];
  return `${PREFIX}-${s}`;
}

/** Accept a raw code, a prefixed code, or a pasted invite link → canonical code. */
export function normalizeCode(input: string): string {
  let t = input.trim();
  const fromLink = t.match(/join=([^&\s]+)/i);
  if (fromLink) t = decodeURIComponent(fromLink[1]);
  t = t.toUpperCase().replace(/\s+/g, "");
  if (!t) return "";
  if (t.startsWith(`${PREFIX}-`)) return t;
  // Bare body or stray prefix → normalize to GD-<body>.
  const body = t.includes("-") ? t.split("-").slice(1).join("-") : t;
  return `${PREFIX}-${body}`;
}
