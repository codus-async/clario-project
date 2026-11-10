import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { redis } from "../infrastructure/redis/redis.js";

vi.mock("../infrastructure/database/prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock("../infrastructure/redis/redis.js", () => ({
  redis: {
    ping: vi.fn(),
  },
  connectRedis: vi.fn(),
  disconnectRedis: vi.fn(),
  createBullMQConnection: vi.fn(),
}));

const mockedQueryRaw = vi.mocked(prisma.$queryRaw);
const mockedPing = vi.mocked(redis.ping);

function makeApp() {
  return createApp();
}

describe("GET /health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when database and redis are healthy", async () => {
    mockedQueryRaw.mockResolvedValue([{ "?column?": 1 }] as never);
    mockedPing.mockResolvedValue("PONG" as never);

    const response = await request(makeApp()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      dependencies: {
        database: "connected",
        redis: "connected",
      },
    });
    expect(typeof response.body.timestamp_utc).toBe("string");
    expect(Number.isNaN(Date.parse(response.body.timestamp_utc))).toBe(
      false,
    );
  });

  it("returns 503 when the database is unavailable", async () => {
    mockedQueryRaw.mockRejectedValue(new Error("database down") as never);
    mockedPing.mockResolvedValue("PONG" as never);

    const response = await request(makeApp()).get("/health");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      error: {
        code: "SERVICE_UNAVAILABLE",
        title: "Service Unavailable",
        status: 503,
        detail:
          "One or more required service dependencies are unavailable.",
        instance: "/health",
      },
    });
    expect(typeof response.body.error.timestamp_utc).toBe("string");
    expect(typeof response.body.error.institution_timezone).toBe("string");
  });

  it("returns 503 when redis ping fails", async () => {
    mockedQueryRaw.mockResolvedValue([{ "?column?": 1 }] as never);
    mockedPing.mockRejectedValue(new Error("redis down") as never);

    const response = await request(makeApp()).get("/health");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(response.body.error.status).toBe(503);
  });

  it("returns 503 when redis ping does not return PONG", async () => {
    mockedQueryRaw.mockResolvedValue([{ "?column?": 1 }] as never);
    mockedPing.mockResolvedValue("NOPE" as never);

    const response = await request(makeApp()).get("/health");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("returns 503 when both dependencies fail", async () => {
    mockedQueryRaw.mockRejectedValue(new Error("database down") as never);
    mockedPing.mockRejectedValue(new Error("redis down") as never);

    const response = await request(makeApp()).get("/health");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(response.body.error.title).toBe("Service Unavailable");
  });
});
