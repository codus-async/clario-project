import { randomUUID } from "node:crypto";

import type { Redis } from "ioredis";

import type {
  LoginProtectionStore,
  ProtectionCheckResult,
} from "../../modules/auth/auth.ports.js";
import type { LoginProtectionConfig } from "../../modules/auth/auth.config.js";

const FAIL_IP_PREFIX = "clario:login:fail:ip:";
const FAIL_IDENTIFIER_PREFIX = "clario:login:fail:id:";
const LOCK_IP_PREFIX = "clario:login:lock:ip:";
const LOCK_IDENTIFIER_PREFIX = "clario:login:lock:";
const LEVEL_IP_PREFIX = "clario:login:locklevel:ip:";
const LEVEL_IDENTIFIER_PREFIX = "clario:login:locklevel:";

/**
 * Redis sliding-window login protection (SEC-04, SEC-05).
 *
 * Both dimensions — client IP and login identifier — keep a ZSET of failure
 * timestamps inside the documented window (default 5 failures / 15 minutes).
 * When a dimension crosses the threshold it is locked for an escalating
 * cooldown (15 → 30 → 60 minutes, capped by configuration). Counters are
 * incremented even for identifiers that do not exist, so lockout behaviour
 * cannot be used as an account-enumeration oracle, and a successful login
 * clears both dimensions.
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
    const ip = normalizeIp(input.ip);
    await this.client.del(
      this.failIpKey(ip),
      this.failIdentifierKey(input.identifier),
      this.lockIpKey(ip),
      this.lockIdentifierKey(input.identifier),
      this.levelIpKey(ip),
      this.levelIdentifierKey(input.identifier),
    );
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
