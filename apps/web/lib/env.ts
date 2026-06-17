import type { Address } from "@rowdawgs/shared";

// Tolerate a SERVER_URL set without a scheme (e.g. "host.up.railway.app"):
// socket.io copes, but `fetch(SERVER_URL + "/…")` would treat it as a relative
// path. Prepend https:// when no scheme is present so both work.
const rawServerUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";
export const SERVER_URL = /^https?:\/\//i.test(rawServerUrl)
  ? rawServerUrl
  : `https://${rawServerUrl}`;

// A real WalletConnect/Reown project id is 32 hex chars. Empty by default so
// the app falls back to injected wallets instead of throwing.
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

/** Active chain: Sepolia by default; set NEXT_PUBLIC_CHAIN_ID=1 for mainnet. */
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 11155111;

interface NetworkContracts {
  name: string;
  rowDawgs: Address | null;
  ddawgsToken: Address | null;
  /** Mintable RowDawgs membership pass (the mint target). */
  rowDawgsNFT: Address | null;
  /** Grandfathered ChessDawgs NFT (informational; the gate ORs it in-contract). */
  chessDawgsNFT: Address | null;
}

/**
 * Dual-network address book. Sepolia is live (deployed by
 * `pnpm --filter @rowdawgs/contracts deploy:sepolia`). Mainnet knows the
 * existing $DDawgs token and ChessDawgs NFT; the RowDawgs proxy and the new
 * membership NFT are filled in once deployed there. Env vars override per key.
 */
const NETWORKS: Record<number, NetworkContracts> = {
  11155111: {
    name: "Sepolia",
    // RowDawgs escrow (voucher model + draw flow, redeployed 2026-06-17 under the
    // RowDawgs EIP-712 domain). Server CONTRACT_ADDRESS must match. resultSigner
    // = owner 0x9456…6B2 (signs win AND draw vouchers).
    rowDawgs: "0xcd3e8536500D0A07A2350190Fd9c03FEa5b7a89a",
    ddawgsToken: "0x5180f2F2A227859671A401E6C54020edB8b0ff2F",
    rowDawgsNFT: "0x09cD7b6a6d56D8cA0207a09CD33Bc4Ba4F8d6815",
    // Mock stand-in for ChessDawgs NFT (grandfather path) on testnet.
    chessDawgsNFT: "0x06799C5BaE41B575e6b42e6c03e9C8aB590bA878",
  },
  1: {
    name: "Ethereum",
    rowDawgs: null, // not deployed on mainnet yet
    ddawgsToken: "0x19f78a898f3e3c2f40c6E0CD2EE5545F549d5E99",
    rowDawgsNFT: null,
    chessDawgsNFT: "0xf82E0cF5605101efE12689461c2bC9392BfDedEF",
  },
};

const active = NETWORKS[CHAIN_ID] ?? NETWORKS[11155111];

const envAddr = (key: string, fallback: Address | null): Address | null =>
  (process.env[key] as Address | undefined) || fallback;

export const NETWORK_NAME = active.name;
export const ROWDAWGS_ADDRESS = envAddr("NEXT_PUBLIC_ROWDAWGS_ADDRESS", active.rowDawgs);
export const DDAWGS_TOKEN_ADDRESS = envAddr(
  "NEXT_PUBLIC_DDAWGS_TOKEN_ADDRESS",
  active.ddawgsToken
);
export const ROWDAWGS_NFT_ADDRESS = envAddr(
  "NEXT_PUBLIC_ROWDAWGS_NFT_ADDRESS",
  active.rowDawgsNFT
);
export const CHESS_NFT_ADDRESS = envAddr("NEXT_PUBLIC_CHESS_NFT_ADDRESS", active.chessDawgsNFT);

/** True when the game proxy + token are known for the active network. */
export const CONTRACTS_CONFIGURED = Boolean(ROWDAWGS_ADDRESS && DDAWGS_TOKEN_ADDRESS);

/** Testnet (anything but Ethereum mainnet) — enables the public $DDawgs faucet. */
export const IS_TESTNET = CHAIN_ID !== 1;
