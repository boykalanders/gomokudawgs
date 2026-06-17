import { loadConfig } from "./config.js";
import { createRowDawgsServer } from "./server.js";

const config = loadConfig();
const server = createRowDawgsServer(config);

server.httpServer.listen(config.port, () => {
  console.log(
    `RowDawgs server on :${config.port} ` +
      `(chain ${config.chainEnabled ? "enabled" : "DISABLED — dev mode"}, ` +
      `move clock ${config.moveClockMs / 1000}s)`
  );
});
