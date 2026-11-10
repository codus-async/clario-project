import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { AppError } from "../../errors/app-error.js";
import { ERROR_CODES } from "../../errors/error-codes.js";
import { errorHandler } from "../../middleware/error-handler.js";

function buildApp(): express.Express {
  const app = express();

  app.get("/app-error", () => {
    throw new AppError(
      ERROR_CODES.SERVICE_UNAVAILABLE,
      "Dependency check failed.",
    );
  });

  app.get("/unexpected", () => {
    throw new Error("unexpected boom");
  });

  app.use(errorHandler);

  return app;
}

describe("errorHandler", () => {
  it("returns the documented error structure for an AppError", async () => {
    const response = await request(buildApp()).get("/app-error");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: {
        code: "SERVICE_UNAVAILABLE",
        title: "Service Unavailable",
        status: 503,
        detail: "Dependency check failed.",
        instance: "/app-error",
        timestamp_utc: expect.any(String) as string,
        institution_timezone: expect.any(String) as string,
      },
    });
    expect(Number.isNaN(Date.parse(response.body.error.timestamp_utc))).toBe(
      false,
    );
  });

  it("returns the documented error structure for an unexpected error", async () => {
    const response = await request(buildApp()).get("/unexpected");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        title: "Internal Server Error",
        status: 500,
        detail: "An unexpected error occurred. Please try again later.",
        instance: "/unexpected",
        timestamp_utc: expect.any(String) as string,
        institution_timezone: expect.any(String) as string,
      },
    });
    expect(Number.isNaN(Date.parse(response.body.error.timestamp_utc))).toBe(
      false,
    );
  });

  it("includes field_errors when the AppError carries them", async () => {
    const app = express();

    app.get("/validation", () => {
      throw new AppError(
        ERROR_CODES.BR_05_TOPIC_REQUIRED_BEFORE_SUPERVISOR,
        "Topic proposal is required.",
        [{ field: "topicId", message: "Required" }],
      );
    });

    app.use(errorHandler);

    const response = await request(app).get("/validation");

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe(
      "BR_05_TOPIC_REQUIRED_BEFORE_SUPERVISOR",
    );
    expect(response.body.error.field_errors).toEqual([
      { field: "topicId", message: "Required" },
    ]);
    expect(response.body.error.title).toBe(
      "Topic Proposal Required Before Supervisor Assignment",
    );
  });

  it("does not leak internal error messages in the 500 detail", async () => {
    const response = await request(buildApp()).get("/unexpected");

    expect(response.status).toBe(500);
    expect(response.body.error.detail).not.toContain("unexpected boom");
    expect(JSON.stringify(response.body)).not.toContain("unexpected boom");
  });
});
