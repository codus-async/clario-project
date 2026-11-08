import { AsyncLocalStorage } from "node:async_hooks";
import type { Logger } from "pino";

const requestLoggerStorage = new AsyncLocalStorage<Logger>();

export function runWithRequestLogger(
  requestLogger: Logger,
  callback: () => void,
): void {
  requestLoggerStorage.run(requestLogger, callback);
}

export function getRequestLogger(): Logger | undefined {
  return requestLoggerStorage.getStore();
}
