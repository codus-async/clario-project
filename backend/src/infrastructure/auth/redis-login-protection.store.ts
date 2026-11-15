import { randomUUID } from "node:crypto";

import type { Redis } from "ioredis";

import type {
  LoginProtectionStore,
  ProtectionCheckResult,
  VerificationSlot,
} from "../../modules/auth/auth.ports.js";
import type { LoginProtectionConfig } from "../../modules/auth/auth.config.js";

const FAIL_IP_PREFIX = "clario:login:fail:ip:";
const FAIL_IDENTIFIER_PREFIX = "clario:login:fail:id:";
// Identifier namespaces must be disjoint from the `ip:` namespaces: an
// identifier is an arbitrary user-supplied string, so an identifier such as
// `ip:203.0.113.7` must never be able to write the IP's own keys.
const LOCK_IP_PREFIX = "clario:login:lock:ip:";
const LOCK_IDENTIFIER_PREFIX = "clario:login:lock:id:";
const LEVEL_IP_PREFIX = "clario:login:locklevel:ip:";
const LEVEL_IDENTIFIER_PREFIX = "clario:login:locklevel:id:";
const CONC_IP_PREFIX = "clario:login:conc:ip:";
const CONC_IDENTIFIER_PREFIX = "clario:login:conc:id:";
const CONC_GLOBAL_KEY = "clario:login:conc:global";

/**
 * Lifetime of one verification slot. Generous enough to cover an Argon2id
 * verification (plus a few queries) and short enough that a crashed process
 * cannot pin slots for long: tokens score their deadline and are pruned on
 * the next acquire.
 */
const VERIFICATION_SLOT_TTL_MS = 30_000;

/**
 * Atomically reserves one verification slot in each of the three dimensions
 * (per-IP, per-identifier, process-wide). Returns 0 when any dimension is at
 * capacity, 1 when the reservation succeeded.
 *
 * KEYS[1] = per-IP key, KEYS[2] = per-identifier key, KEYS[3] = global key.
 * ARGV    = now, deadline, per-dimension max, global max, token, pttl.
 */
const ACQUIRE_VERIFICATION_SLOT_LUA = `
local now = tonumber(ARGV[1])
local deadline = tonumber(ARGV[2])
local dimensionMax = tonumber(ARGV[3])
local globalMax = tonumber(ARGV[4])
local token = ARGV[5]
local pttl = tonumber(ARGV[6])

for i = 1, #KEYS do
  redis.call('ZREMRANGEBYSCORE', KEYS[i], '-inf', now)
end

for i = 1, 2 do
  if redis.call('ZCARD', KEYS[i]) >= dimensionMax then
    return 0
  end
end
if redis.call('ZCARD', KEYS[3]) >= globalMax then
  return 0
end

for i = 1, #KEYS do
  redis.call('ZADD', KEYS[i], deadline, token)
  redis.call('PEXPIRE', KEYS[i], pttl)
end
return 1
`;

/** Best-effort release: removes the token from every dimension. */
const RELEASE_VERIFICATION_SLOT_LUA = `
for i = 1, #KEYS do
  redis.call('ZREM', KEYS[i], ARGV[1])
end
return 1
`;

/**
 * Redis sliding-window login protection (SEC-04, SEC-05).
 *
 * Both dimensions — client IP and login identifier — keep a ZSET of failure
 * timestamps inside the documented window (default 5 failures / 15 minutes).
 * When a dimension crosses the threshold it is locked for an escalating
 * cooldown (15 → 30 → 60 minutes, capped by configuration). Counters are
 * incremented even for identifiers that do not exist, so lockout behaviour
 * cannot be used as an account-enumeration oracle. A successful login clears
 * the identifier dimension only: the IP window is shared by every account
 * behind the same client, so resetting it on success would let an attacker
 * with one valid credential wipe the cross-account spray counter at will; IP
 * counters decay with their own sliding window instead.
 */
export class RedisLoginProtectionStore implements LoginProtectionStore {
  private readonly client: Redis;
  private readonly config: LoginProtectionConfig;
  private readonly windowMs: number;
  private readonly windowSeconds: number;

  constructor(client: Redis, config: LoginProtectionConfig) {
    this.client = client;
    this.config = config;
    this.windowMs = config.failureWindowMinutes * 60_000;
    this.windowSeconds = config.failureWindowMinutes * 60;
  }

  async check(input: {
    ip: string;
    identifier: string;
  }): Promise<ProtectionCheckResult> {
    const ip = normalizeIp(input.ip);

    const identifierLockTtl = await this.client.ttl(
      this.lockIdentifierKey(input.identifier),
    );
    if (identifierLockTtl > 0) {
      return { locked: true, retryAfterSeconds: identifierLockTtl };
    }

    const ipLockTtl = await this.client.ttl(this.lockIpKey(ip));
    if (ipLockTtl > 0) {
      return { locked: true, retryAfterSeconds: ipLockTtl };
    }

    // The lock may have expired or been evicted while the failure window is
    // still hot; re-derive the lock from the counters themselves.
    if (await this.aboveThreshold(this.failIdentifierKey(input.identifier))) {
      const retryAfterSeconds = await this.acquireLock(
        this.lockIdentifierKey(input.identifier),
        this.levelIdentifierKey(input.identifier),
      );
      return { locked: true, retryAfterSeconds };
    }

    if (await this.aboveThreshold(this.failIpKey(ip))) {
      const retryAfterSeconds = await this.acquireLock(
        this.lockIpKey(ip),
        this.levelIpKey(ip),
      );
      return { locked: true, retryAfterSeconds };
    }

    return { locked: false, retryAfterSeconds: null };
  }

  async recordFailure(input: { ip: string; identifier: string }): Promise<void> {
    const now = Date.now();
    await this.pushFailure(this.failIpKey(normalizeIp(input.ip)), now);
    await this.pushFailure(this.failIdentifierKey(input.identifier), now);
  }

  async recordSuccess(input: { ip: string; identifier: string }): Promise<void> {
    // Only the identifier dimension is reset. Clearing the shared IP window
    // here would allow an attacker who owns one valid account to spray other
    // accounts from the same IP, log in to their own account between waves,
    // and keep the IP counter below the threshold indefinitely.
    await this.client.del(
      this.failIdentifierKey(input.identifier),
      this.lockIdentifierKey(input.identifier),
      this.levelIdentifierKey(input.identifier),
    );
  }

  async acquireVerificationSlot(input: {
    ip: string;
    identifier: string;
  }): Promise<VerificationSlot | null> {
    const token = randomUUID();
    const now = Date.now();
    const keys = this.verificationSlotKeys(input);
    const outcome = await this.client.eval(
      ACQUIRE_VERIFICATION_SLOT_LUA,
      keys.length,
      ...keys,
      String(now),
      String(now + VERIFICATION_SLOT_TTL_MS),
      String(this.config.maxConcurrentVerifications),
      String(this.config.maxConcurrentVerificationsGlobal),
      token,
      String(VERIFICATION_SLOT_TTL_MS + 5_000),
    );
    return Number(outcome) === 1 ? { token } : null;
  }

  async releaseVerificationSlot(
    input: { ip: string; identifier: string },
    slot: VerificationSlot,
  ): Promise<void> {
    const keys = this.verificationSlotKeys(input);
    try {
      await this.client.eval(
        RELEASE_VERIFICATION_SLOT_LUA,
        keys.length,
        ...keys,
        slot.token,
      );
    } catch {
      // The slot expires on its own (scored deadline); a failed release only
      // holds capacity for the remainder of the TTL.
    }
  }

  private verificationSlotKeys(input: { ip: string; identifier: string }): string[] {
    return [
      `${CONC_IP_PREFIX}${normalizeIp(input.ip)}`,
      `${CONC_IDENTIFIER_PREFIX}${input.identifier}`,
      CONC_GLOBAL_KEY,
    ];
  }

  private failIpKey(ip: string): string {
    return `${FAIL_IP_PREFIX}${ip}`;
  }

  private failIdentifierKey(identifier: string): string {
    return `${FAIL_IDENTIFIER_PREFIX}${identifier}`;
  }

  private lockIpKey(ip: string): string {
    return `${LOCK_IP_PREFIX}${ip}`;
  }

  private lockIdentifierKey(identifier: string): string {
    return `${LOCK_IDENTIFIER_PREFIX}${identifier}`;
  }

  private levelIpKey(ip: string): string {
    return `${LEVEL_IP_PREFIX}${ip}`;
  }

  private levelIdentifierKey(identifier: string): string {
    return `${LEVEL_IDENTIFIER_PREFIX}${identifier}`;
  }

  private async pushFailure(key: string, now: number): Promise<void> {
    await this.client
      .multi()
      .zremrangebyscore(key, 0, `(${now - this.windowMs}`)
      .zadd(key, now, `${String(now)}:${randomUUID()}`)
      .pexpire(key, this.windowMs + 1_000)
      .exec();
  }

  private async aboveThreshold(key: string): Promise<boolean> {
    const now = Date.now();
    await this.client.zremrangebyscore(key, 0, `(${now - this.windowMs}`);
    const failures = await this.client.zcard(key);
    return failures >= this.config.maxFailedAttempts;
  }

  /**
   * Acquires the cooldown lock for one dimension and returns the effective
   * cooldown in seconds. The level key remembers how many lockouts the
   * identifier/IP has already served so the cooldown escalates
   * base → base×multiplier → … up to the configured maximum.
   */
  private async acquireLock(
    lockKey: string,
    levelKey: string,
  ): Promise<number> {
    const level = await this.readLevel(levelKey);
    const cooldownSeconds = this.cooldownSecondsFor(level);
    const nextLevel = level + 1;

    const acquired = await this.client.set(
      lockKey,
      String(nextLevel),
      "EX",
      cooldownSeconds,
      "NX",
    );
    if (acquired !== "OK") {
      const existingTtl = await this.client.ttl(lockKey);
      return existingTtl > 0 ? existingTtl : cooldownSeconds;
    }

    await this.client.set(
      levelKey,
      String(nextLevel),
      "EX",
      cooldownSeconds + this.windowSeconds,
    );
    return cooldownSeconds;
  }

  private async readLevel(levelKey: string): Promise<number> {
    const raw = await this.client.get(levelKey);
    if (raw === null) {
      return 0;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  private cooldownSecondsFor(completedLockouts: number): number {
    const minutes = Math.min(
      this.config.baseCooldownMinutes *
        Math.pow(this.config.cooldownMultiplier, completedLockouts),
      this.config.maxCooldownMinutes,
    );
    return Math.round(minutes * 60);
  }
}

function normalizeIp(ip: string): string {
  return ip.trim().length > 0 ? ip.trim() : "unknown";
}
