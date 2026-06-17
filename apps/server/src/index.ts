import { loadConfig } from "./config.js";
import { createGomokuDawgsServer } from "./server.js";

const config = loadConfig();
const server = createGomokuDawgsServer(config);

server.httpServer.listen(config.port, () => {
  console.log(
    `GomokuDawgs server on :${config.port} ` +
      `(chain ${config.chainEnabled ? "enabled" : "DISABLED — dev mode"}, ` +
      `move clock ${config.moveClockMs / 1000}s)`
  );
});
