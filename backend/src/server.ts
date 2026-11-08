import { createServer, type Server } from "node:http";

import { env } from "./config/env.js";
import { createApp } from "./app.js";

import {
  connectDatabase,
  disconnectDatabase,
} from "./infrastructure/database/prisma.js";

import {
  connectRedis,
  disconnectRedis,
} from "./infrastructure/redis/redis.js";

import { baseLogger } from "./infrastructure/logging/logger.js";

const app = createApp();
const server: Server = createServer(app);

let isShuttingDown = false;

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    baseLogger.info("PostgreSQL connection established");

    await connectRedis();
    baseLogger.info("Redis connection established");

    server.listen(env.PORT, () => {
      baseLogger.info(
        {
          port: env.PORT,
          environment: env.NODE_ENV,
        },
        "Clario API server started",
      );
    });
  } catch (error) {
    baseLogger.fatal(
      { err: error },
      "Failed to start Clario API server",
    );

    await disconnectRedis().catch(() => undefined);
    await disconnectDatabase().catch(() => undefined);

    process.exitCode = 1;
  }
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  baseLogger.info(
    { signal },
    "Shutting down Clario API server",
  );

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await disconnectRedis();
    await disconnectDatabase();

    baseLogger.info("Clario API server shut down successfully");
  } catch (error) {
    baseLogger.error(
      { err: error },
      "Error during server shutdown",
    );

    process.exitCode = 1;
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startServer();
