import type { Redis } from "ioredis";

import type { SessionStore } from "../../modules/auth/auth.ports.js";
import type { SessionState } from "../../modules/auth/auth.types.js";
import { toRoleCode } from "../../modules/auth/auth.role-code.js";

export const SESSION_KEY_PREFIX = "clario:session:";

/**
 * Fails closed: anything that cannot be parsed into a complete session state
 * is treated as an absent session rather than partially trusted state.
 */
function parseSessionState(raw: string): SessionState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (parsed === null || typeof parsed !== "object") {
    return null;
  }

  const state = parsed as Partial<SessionState>;
  if (
    typeof state.sessionId !== "string" ||
    typeof state.userId !== "string" ||
    typeof state.expiresAtUtc !== "string" ||
    typeof state.lastActivityAtUtc !== "string" ||
    typeof state.createdAtUtc !== "string" ||
    typeof state.inactivityTimeoutMinutes !== "number" ||
    !Array.isArray(state.assignedRoles) ||
    typeof state.activeRole !== "string"
  ) {
    return null;
  }

  try {
    state.activeRole = toRoleCode(state.activeRole);
  } catch {
    return null;
  }

  return state as SessionState;
}

/**
 * Redis-backed runtime session store (F-64, SEC-07). The TTL is the shorter
 * of the absolute session lifetime and the inactivity window, so an idle
 * session disappears from Redis exactly when its inactivity timeout elapses.
 */
export class RedisSessionStore implements SessionStore {
  private readonly client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  private key(sessionId: string): string {
    return `${SESSION_KEY_PREFIX}${sessionId}`;
  }

  async get(sessionId: string): Promise<SessionState | null> {
    const raw = await this.client.get(this.key(sessionId));
    if (raw === null) {
      return null;
    }
    const state = parseSessionState(raw);
    if (state === null) {
      await this.client.del(this.key(sessionId));
      return null;
    }
    return state;
  }

  async set(state: SessionState, ttlSeconds: number): Promise<void> {
    await this.client.set(
      this.key(state.sessionId),
      JSON.stringify(state),
      "EX",
      Math.max(1, Math.floor(ttlSeconds)),
    );
  }

  async delete(sessionId: string): Promise<void> {
    await this.client.del(this.key(sessionId));
  }
}
