import { prisma } from "../../infrastructure/database/prisma.js";
import { redis } from "../../infrastructure/redis/redis.js";

export type DependencyStatus = "connected" | "disconnected";

export interface HealthCheckResult {
  status: "ok" | "error";
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
  };
  timestamp_utc: string;
}

export async function checkHealth(): Promise<HealthCheckResult> {
  const [databaseResult, redisResult] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);

  const database: DependencyStatus =
    databaseResult.status === "fulfilled"
      ? "connected"
      : "disconnected";

  const redisStatus: DependencyStatus =
    redisResult.status === "fulfilled" && redisResult.value === "PONG"
      ? "connected"
      : "disconnected";

  const isHealthy =
    database === "connected" && redisStatus === "connected";

  return {
    status: isHealthy ? "ok" : "error",
    dependencies: {
      database,
      redis: redisStatus,
    },
    timestamp_utc: new Date().toISOString(),
  };
}
