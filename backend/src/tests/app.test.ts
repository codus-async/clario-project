import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

describe("createApp", () => {
  it("initializes an Express application without throwing", () => {
    const app = createApp();

    expect(app).toBeDefined();
    expect(typeof app).toBe("function");
  });

  it("disables the x-powered-by header", async () => {
    const app = createApp();

    const response = await request(app).get("/health");

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("mounts the health route", async () => {
    const app = createApp();

    const response = await request(app).get("/health");

    expect([200, 503]).toContain(response.status);
  });
});
