import { afterEach, describe, expect, it } from "vitest";
import { io as ioc, type Socket } from "socket.io-client";
import { Wallet } from "ethers";
import {
  loginMessage,
  type Address,
  type AuthPayload,
  type ClientToServerEvents,
  type RoomSnapshot,
  type ServerToClientEvents,
} from "@gomokudawgs/shared";
import { createGomokuDawgsServer, type GomokuDawgsServer } from "./server.js";
import type { ServerConfig } from "./config.js";

type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>;

const walletA = Wallet.createRandom();
const walletB = Wallet.createRandom();

function testConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    port: 0,
    corsOrigins: ["http://localhost:3000"],
    rpcUrl: null,
    contractAddress: null,
    ownerPrivateKey: null,
    operatorPrivateKey: null,
    moveClockMs: 60_000,
    chainEnabled: false,
    dataDir: process.cwd(),
    ...overrides,
  };
}

async function makeAuth(wallet: Wallet): Promise<AuthPayload> {
  const address = wallet.address as Address;
  const ts = Date.now();
  const signature = await wallet.signMessage(loginMessage(address, ts));
  return { address, ts, signature };
}

function waitFor<E extends keyof ServerToClientEvents>(
  socket: TestClient,
  event: E
): Promise<Parameters<ServerToClientEvents[E]>[0]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${String(event)}`)), 8000);
    socket.once(event as never, ((payload: never) => {
      clearTimeout(timer);
      resolve(payload);
    }) as never);
  });
}

let server: GomokuDawgsServer | null = null;
let clients: TestClient[] = [];

async function startServer(config: ServerConfig): Promise<number> {
  server = createGomokuDawgsServer(config);
  await new Promise<void>((resolve) => server!.httpServer.listen(0, resolve));
  const addr = server.httpServer.address();
  if (typeof addr === "object" && addr) return addr.port;
  throw new Error("no port");
}

function connect(port: number): TestClient {
  const socket: TestClient = ioc(`http://127.0.0.1:${port}`, { transports: ["websocket"] });
  clients.push(socket);
  return socket;
}

afterEach(async () => {
  for (const c of clients) c.disconnect();
  clients = [];
  if (server) {
    await server.close();
    server = null;
  }
});

async function joinBoth(
  port: number,
  gameId: string
): Promise<{ a: TestClient; b: TestClient; snapshot: RoomSnapshot }> {
  const a = connect(port);
  const b = connect(port);
  a.emit("room:join", { gameId, auth: await makeAuth(walletA) });
  // Dev mode: the room forms when the second distinct wallet joins.
  await new Promise((r) => setTimeout(r, 300));
  b.emit("room:join", { gameId, auth: await makeAuth(walletB) });
  const snapshot = await waitFor(b, "room:state");
  return { a, b, snapshot };
}

describe("GomokuDawgs server (dev mode)", () => {
  it("forms a room with two authed wallets and enforces seating", async () => {
    const port = await startServer(testConfig());
    const { snapshot } = await joinBoth(port, "42");
    expect(snapshot.players).toHaveLength(2);
    expect(snapshot.players.map((p) => p.address)).toContain(walletA.address.toLowerCase());
    expect(snapshot.state.turn).toBe(0);
    expect(snapshot.state.board).toHaveLength(225);
    expect(snapshot.over).toBeNull();
  });

  it("rejects a forged signature", async () => {
    const port = await startServer(testConfig());
    const c = connect(port);
    const auth = await makeAuth(walletA);
    c.emit("room:join", {
      gameId: "1",
      auth: { ...auth, address: walletB.address as Address },
    });
    const error = await waitFor(c, "server:error");
    expect(error.code).toBe("unauthorized");
  });

  it("rejects moves out of turn and broadcasts authorized moves", async () => {
    const port = await startServer(testConfig());
    const { a, b } = await joinBoth(port, "7");

    // Seat 1 (wallet B) tries to move on seat 0's turn.
    b.emit("game:move", { gameId: "7", move: { x: 7, y: 7 } });
    const refusal = await waitFor(b, "server:error");
    expect(refusal.code).toBe("not-your-turn");

    // Seat 0 (wallet A) moves legally; both clients get the broadcast.
    const movePromise = waitFor(b, "game:move");
    a.emit("game:move", { gameId: "7", move: { x: 7, y: 7 } });
    const move = await movePromise;
    expect(move.bySeat).toBe(0);
    expect(move.endStateHash).toMatch(/^[0-9a-f]{8}$/);
    expect(move.endState.board).toHaveLength(225);
    expect(move.endState.turn).toBe(1);
  });

  it("rejects an illegal move (off the board)", async () => {
    const port = await startServer(testConfig());
    const { a } = await joinBoth(port, "8");
    a.emit("game:move", { gameId: "8", move: { x: 99, y: 0 } });
    const error = await waitFor(a, "server:error");
    expect(error.code).toBe("illegal-move");
  });

  it("resign settles the game for the opponent", async () => {
    const port = await startServer(testConfig());
    const { a, b } = await joinBoth(port, "9");
    const overPromise = waitFor(b, "game:over");
    a.emit("game:resign", { gameId: "9" });
    const over = await overPromise;
    expect(over.reason).toBe("resign");
    expect(over.winner).toBe(walletB.address.toLowerCase());
  });

  it("move-clock expiry forfeits the player on turn", async () => {
    const port = await startServer(testConfig({ moveClockMs: 1200 }));
    const { b } = await joinBoth(port, "10");
    const over = await waitFor(b, "game:over");
    expect(over.reason).toBe("timeout");
    // Seat 0 was on turn and timed out → seat 1 (wallet B) wins.
    expect(over.winner).toBe(walletB.address.toLowerCase());
  });

  it("relays chat between players", async () => {
    const port = await startServer(testConfig());
    const { a, b } = await joinBoth(port, "11");
    const msgPromise = waitFor(b, "chat:message");
    a.emit("chat:send", { gameId: "11", text: "  good luck dawg  " });
    const msg = await msgPromise;
    expect(msg.text).toBe("good luck dawg");
    expect(msg.from).toBe(walletA.address.toLowerCase());
  });
});
