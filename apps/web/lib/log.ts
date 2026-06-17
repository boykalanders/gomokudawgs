// Lightweight, filterable client logging. Open the browser console and filter
// by "[GomokuDawgs]" to trace wallet, socket, gate, lobby and game-room flow.
const TAG = "[GomokuDawgs]";

export const log = {
  info: (...args: unknown[]) => console.log(TAG, ...args),
  warn: (...args: unknown[]) => console.warn(TAG, ...args),
  error: (...args: unknown[]) => console.error(TAG, ...args),
};
