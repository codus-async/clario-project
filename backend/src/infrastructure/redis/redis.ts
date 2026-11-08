import { Redis, type RedisOptions } from "ioredis";

import { env } from "../../config/env.js";
import { baseLogger } from "../logging/logger.js";

const redisOptions: RedisOptions = {
  lazyConnect: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: 1,

  retryStrategy(times: number): number {
    return Math.min(times * 200, 2_000);
  },
};

export const redis = new Redis(env.REDIS_URL, redisOptions);

redis.on("connect", () => {
  baseLogger.info(
    { module: "redis" },
    "Redis connection established",
  );
});

redis.on("ready", () => {
  baseLogger.info(
    { module: "redis" },
    "Redis is ready",
  );
});

redis.on("error", (error: Error) => {
  baseLogger.error(
    { err: error, module: "redis" },
    "Redis connection error",
  );
});

redis.on("close", () => {
  baseLogger.warn(
    { module: "redis" },
    "Redis connection closed",
  );
});

export async function connectRedis(): Promise<void> {
  if (redis.status === "wait") {
    await redis.connect();
    return;
  }

  if (redis.status !== "ready") {
    await redis.ping();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis.status === "ready") {
    await redis.quit();
    return;
  }

  redis.disconnect();
}

export function createBullMQConnection(): InstanceType<typeof Redis> {
  return new Redis(env.REDIS_URL, {
    enableReadyCheck: true,
    maxRetriesPerRequest: null,

    retryStrategy(times: number): number {
      return Math.min(times * 200, 2_000);
    },
  });
}
