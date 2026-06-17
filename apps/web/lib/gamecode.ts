// The code convention lives in @rowdawgs/shared so the server reads the exact
// same prefixes the web mints. Re-exported here for local imports.
export { newGameCode, normalizeCode, variantFromId } from "@rowdawgs/shared";
export { VARIANTS, VARIANT_LIST, DEFAULT_VARIANT, type GameVariant } from "@rowdawgs/engine";

/** Invite link an opponent can open to land on the prefilled join box. */
export function inviteLink(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/lobby?join=${encodeURIComponent(code)}`;
}
