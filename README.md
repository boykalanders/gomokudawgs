# GomokuDawgs ⚫⚪

Wagered **Gomoku (five-in-a-row)** for the **Deputy Dawgs** ecosystem. Stake
**$DDawgs**, line up five stones, take the pot: **80% to the winner, 10% to the
company, 10% burned**. NFT-gated — Deputy Dawgs holders only.

The game is a **deterministic engine** (`packages/engine`) that runs on **both**
the server (authoritative) and the client (rendering), so the same move always
resolves to the same board on either side. The economic system and workflow are
shared with the sibling **PoolDawgs** project — only the game itself differs.

## The game

- **15×15 board**, played on the line intersections.
- **Freestyle Gomoku** — first player to get **five (or more) in a row**
  horizontally, vertically, or diagonally wins. Overlines (six+) also win.
- **Black moves first** (seat 0); **white** is seat 1. Turn-based, one stone per
  turn, no captures.
- **1-minute move clock** per turn — run out and you forfeit.
- Win / loss only in practice; **resign = loss**, **timeout = forfeit**. A full
  board with no line is a draw (vanishingly rare in freestyle) — stakes stay
  escrowed for an owner-driven refund, no payout voucher is issued.

## Why server-authoritative

Real money is staked, so **the winner can never be decided by a player's
browser**. A trusted backend validates every move, enforces turns and the
move clock (off-chain by design — there is no on-chain timer), and signs the
win result. When a game ends the server signs an **EIP-712 voucher**; the
winner redeems it via `claimRewardSigned`, which settles the game **and** pays
the 80/10/10 split in a single winner-paid transaction (no relayer gas, no
"waiting to settle" window). The legacy owner-relayed `finishGame` path is kept
as a backstop.

## Layout

```
apps/web/           Next.js frontend — wallet gate, lobby, game view, chat,
                    practice board (local engine), leaderboard, profile
apps/server/        Authoritative game server — Socket.IO rooms, move clock,
                    chain event listener, relayer (signs win vouchers)
packages/engine/    Deterministic Gomoku engine (15×15, no variants) — shared
packages/contracts/ GomokuDawgs.sol (UUPS proxy) + Hardhat tests + deploy
packages/shared/    Types, socket event contracts, curated ABI
```

## Getting started

```bash
pnpm install
pnpm -r build          # builds engine → shared → server, compiles contracts
pnpm -r test           # engine unit tests, server integration tests, contract tests
```

### Run locally — full on-chain stack (recommended)

```bash
# Terminal 1 — local chain
pnpm --filter @gomokudawgs/contracts node:local

# Terminal 2 — deploy GomokuDawgs + mock $DDawgs/NFT, fund the test wallets
pnpm --filter @gomokudawgs/contracts deploy:local
#   → writes local-deployment.json; copy the addresses into
#     apps/server/.env and apps/web/.env.local (templates show the shape;
#     OWNER_PRIVATE_KEY = hardhat account #0 key printed by the node)

# Terminal 3 — game server (chain mode)
pnpm --filter @gomokudawgs/server dev

# Terminal 4 — web app (build AFTER the env file exists: NEXT_PUBLIC_* is baked in)
pnpm --filter @gomokudawgs/web build && pnpm --filter @gomokudawgs/web start
```

Open http://localhost:3000. To play from the browser, add the local network
to MetaMask (RPC `http://127.0.0.1:8545`, chain id `31337`) — the deploy
script funds the client wallet with local ETH, mock $DDawgs and a gate NFT,
and the mock token/NFT addresses are in `local-deployment.json`.

### Run locally (chain-less dev mode)

Leave `RPC_URL`/`CONTRACT_ADDRESS` empty in `apps/server/.env` and start the
same way — the server runs ad-hoc rooms with no settlement (the first two
distinct wallets to join a code become the players). The **Practice board**
needs no server or wallet at all (a fully local hot-seat game).

### Deploy the contract

```bash
cd packages/contracts
cp .env.example .env   # fill RPC, deployer key, token/NFT/company addresses
pnpm deploy:testnet
```

The deployer key becomes the contract owner. The server's settlement key signs
result vouchers and must match the contract's `resultSigner` (set on the
contract via `setResultSigner`, owner-only). Use a dedicated low-privilege
`operator` (via `setOperator`) for the backstop `finishGame` path. Keep keys in
a KMS / secret manager in production — the signing key only needs to sign, never
to hold gas.

### Wire up the apps

- `apps/server/.env` — `RPC_URL`, `CONTRACT_ADDRESS`, `OPERATOR_PRIVATE_KEY`
  (or `OWNER_PRIVATE_KEY`)
- `apps/web/.env.local` — `NEXT_PUBLIC_GOMOKUDAWGS_ADDRESS`,
  `NEXT_PUBLIC_DDAWGS_TOKEN_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID`,
  `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

## How to play

- **Place a stone** — on your turn, click any empty intersection. A faint ghost
  stone follows your cursor over legal spots; the last move and the winning line
  are highlighted on the board.
- **Move clock** — the countdown sits above the board and grows + pulses red
  under 10 seconds. Let it hit zero and you forfeit.
- **Resign** — in the ☰ menu (forfeits the pot).
- **Table talk** — the chat sidebar (💬) relays messages between players and
  persists across reconnects.

## Deploying the web (Vercel)

The Next.js app deploys to Vercel as-is. Set these env vars in the Vercel
project (Settings → Environment Variables), then redeploy:

| Var | Value |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` (Sepolia) or `1` (mainnet) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | a real **32-hex-char** id from [cloud.reown.com](https://cloud.reown.com) (free). Blank ⇒ injected/Coinbase wallets only — a short/placeholder value throws *"projectId must be 32 characters long"*. |
| `NEXT_PUBLIC_SERVER_URL` | public **`https://`/`wss://`** URL of the hosted game server (see below) |

**What works without the game server:** the practice board (fully local) and
all on-chain flows — wallet connect, NFT gate/mint, lobby **create/join** —
because those use the wallet's RPC, not the game server.

**Live multiplayer needs the game server hosted separately.** It's a long-lived
Socket.IO + ethers process, so it can't run on Vercel's serverless functions —
host `apps/server` on a Node host (Railway / Render / Fly / a VPS) with a
public HTTPS endpoint, set its env, and point `NEXT_PUBLIC_SERVER_URL` at it. A
browser on `https://` cannot talk to `ws://localhost`, so the default localhost
URL only works for local dev.

### Deploy the game server to Railway

The repo root has a `Dockerfile` (+ `railway.json` that forces it — otherwise
Railway's Nixpacks tries to build the whole monorepo and fails). Steps:

1. New Railway project → **Deploy from GitHub repo**, point it at this repo.
   Leave the **root directory empty** (the Dockerfile builds from the repo
   root — do NOT set it to `apps/server`, that breaks the workspace build).
2. `railway.json` makes Railway use the Dockerfile and health-check `/health`.
3. Set service **Variables**:
   ```
   RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
   CONTRACT_ADDRESS=0x…             # the deployed GomokuDawgs proxy
   OPERATOR_PRIVATE_KEY=0x…         # the result-signer / settlement key
   CORS_ORIGINS=https://gomokudawgs-web.vercel.app
   ```
   (Railway injects `PORT` automatically; the server reads it.)
4. Generate a public domain (Settings → Networking) and set the web's
   `NEXT_PUBLIC_SERVER_URL` to that `https://…` URL, then redeploy the web.

The Dockerfile installs only `@gomokudawgs/server...` (engine + shared + server)
— no Next/Hardhat — so it's small and has no native-build steps.

## Play gate (NFT auth)

A wallet may create/join games only if it holds an NFT — enforced **on-chain**
(`GomokuDawgs.ownsNFT`) and surfaced in the web `WalletGate`:

1. Holds the **GomokuDawgs membership pass** (`GomokuDawgsNFT`, free public mint,
   one per wallet) — or
2. Holds a **ChessDawgs NFT** (`0xf82E…` on mainnet) — the grandfather
   exception: existing ChessDawgs holders are in automatically, no mint needed.

If neither, the gate offers a one-tap mint of a pass. The gate is a single
`ownsNFT(address)` view that ORs both NFTs, so web, server, and contract agree.

## Networks

Dual-network by `NEXT_PUBLIC_CHAIN_ID` (web) / Hardhat network (contracts).
**Sepolia is live** (deployed 2026-06-17, mock token/NFT); mainnet is pending a
fresh deploy.

| | Sepolia (live) | Ethereum mainnet |
|---|---|---|
| GomokuDawgs proxy | `0x3d7C8E39d2515ed01299C96d8A449FD0FB649b33` | _pending deploy_ |
| $DDawgs token | `0x5B539DD02B610fb587678Ab0C8489f32a35B615A` (mock faucet) | `0x19f78a898f3e3c2f40c6E0CD2EE5545F549d5E99` |
| GomokuDawgsNFT (pass) | `0xc6Ad8ecbA8b87E8F23BD03a24e720998db305900` | _pending deploy_ |
| ChessDawgs NFT (grandfather) | `0xfabE3035bbF8E66F6037E01C3F54ABA0CBcF3934` (mock) | `0xf82E0cF5605101efE12689461c2bC9392BfDedEF` |

The deployer/owner `0x94568de5c91a5F563F674C4DE6B6400B70a6b6B2` is also the
`resultSigner` — the game server must sign win vouchers with that same key.

The web address book lives in `apps/web/lib/env.ts`; deploy with
`pnpm --filter @gomokudawgs/contracts deploy:sepolia` (or `deploy:mainnet`),
then update the registry and the server's `CONTRACT_ADDRESS`.

## Lobby & matchmaking

Matching is the ChessDawgs **create-with-an-ID / join-by-ID** model, plus a
public browse list on top:

- **Create** generates a short, shareable game code (e.g. `GD-7F3K2`) — that
  code *is* the on-chain `gameId`. The creator waits on a "share this code"
  card and is dropped into the board automatically when an opponent joins.
- **Join by code / invite link** — paste a code (or a `…/lobby?join=CODE`
  link) to challenge someone directly.
- **Public lobby** — every open table is also listed live (mirrored from chain
  events by the server), with a one-tap **Quick match** for the first open one.

There is no on-chain queue or skill-based pairing — matching is open tables +
shared codes, which is the correct shape for an escrow contract.

## How a wagered game flows

1. Player A: `approve` → `createGame(stake, code)` (escrows stake, NFT-gated).
2. Player B: `approve` → `joinGame(id)` (escrows stake → game Active).
3. Both connect to the server room (wallet-signature login) and play. Clients
   send `{x, y}` placements; the server validates with the shared engine and
   broadcasts the authoritative post-move board; both clients adopt it
   (deterministic → identical state).
4. Game ends (five in a row, resign, or move-clock timeout) → the server signs
   an **EIP-712 win voucher** for the winner.
5. Winner calls **`claimRewardSigned(id, voucher)`** → the contract verifies the
   signature is from `resultSigner`, settles the game, and pays the 80/10/10
   split in that one tx. Unclaimed wins surface on the **Profile** page to claim
   later; the owner can sweep long-unclaimed pots as a safety net.

## Ecosystem addresses (Ethereum mainnet)

| Contract | Address |
|---|---|
| ChessDawgs (implementation, interface reference) | `0x543bd22deda83bc17c5bb6bbaa98beba5bbb8dd0` |
| $DDawgs ERC-20 (`rewardToken`) | `0x19f78a898f3e3c2f40c6E0CD2EE5545F549d5E99` |
| Gate NFT — ChessDawgsNFT / CDNFT (`DDawgsNFT`) | `0xf82E0cF5605101efE12689461c2bC9392BfDedEF` |

GomokuDawgs.sol mirrors the deployed ChessDawgs interface: **string gameIds**
(client-chosen), `poolAddress` = burn destination, `companyWallet`, the
owner-relayed exit/draw flow, plus the voucher additions (`resultSigner` /
`setResultSigner`, `operator` / `setOperator`, `claimRewardSigned`).

## Known gaps / open items

- **GomokuDawgs proxy + pool/company wallet addresses** — deploy pending
  (rehearse on Sepolia with mock token/NFT, then mainnet).
- **Themed sprite assets** (Dawgs avatars, logos, board art) pending from the
  client; the app currently draws the premium emerald/gold theme in vector.
- Lobby/leaderboard stores are in-memory — swap for Postgres/Redis before
  scaling past one server instance.
- Abandoned Active games (both players vanish before any room forms) have
  no automatic refund path; handle operationally or add a contract method.
- Spectating, reconnection grace windows, and quick-match queues are
  minimal/stubbed.
