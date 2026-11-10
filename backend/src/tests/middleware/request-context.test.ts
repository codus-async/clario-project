import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { CLARIO_HTTP_HEADERS } from "@clario/shared-contracts";

import { requestContextMiddleware } from "../../middleware/request-context.middleware.js";

const REQUEST_ID_HEADER = CLARIO_HTTP_HEADERS.REQUEST_ID;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function buildApp(): express.Express {
  const app = express();

  app.use(requestContextMiddleware);

  app.get("/echo-request-id", (req, res) => {
    res.status(200).json({ requestId: req.requestId });
  });

  return app;
}

describe("requestContextMiddleware", () => {
  it("generates a request id when the incoming header is missing", async () => {
    const response = await request(buildApp()).get("/echo-request-id");

    expect(response.status).toBe(200);
    expect(response.body.requestId).toMatch(REQUEST_ID_PATTERN);
    expect(response.headers[REQUEST_ID_HEADER.toLowerCase()]).toBe(
      response.body.requestId,
    );
  });

  it("propagates a valid incoming request id", async () => {
    const incomingId = "client-abc.123:xyz";

    const response = await request(buildApp())
      .get("/echo-request-id")
      .set(REQUEST_ID_HEADER, incomingId);

    expect(response.status).toBe(200);
    expect(response.body.requestId).toBe(incomingId);
    expect(response.headers[REQUEST_ID_HEADER.toLowerCase()]).toBe(
      incomingId,
    );
  });

  it("replaces an invalid incoming request id with a generated one", async () => {
    const invalidId = "bad id with spaces!";

    const response = await request(buildApp())
      .get("/echo-request-id")
      .set(REQUEST_ID_HEADER, invalidId);

    expect(response.status).toBe(200);
    expect(response.body.requestId).not.toBe(invalidId);
    expect(response.body.requestId).toMatch(REQUEST_ID_PATTERN);
    expect(response.headers[REQUEST_ID_HEADER.toLowerCase()]).toBe(
      response.body.requestId,
    );
  });

  it("sets the same request id on the response header and request context", async () => {
    const response = await request(buildApp()).get("/echo-request-id");

    const headerId = response.headers[REQUEST_ID_HEADER.toLowerCase()];

    expect(headerId).toBeTypeOf("string");
    expect(response.body.requestId).toBe(headerId);
  });
});
