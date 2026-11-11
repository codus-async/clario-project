import type { RequestHandler, Router } from "express";

import { env } from "../../config/env.js";
import { Argon2PasswordHasher } from "../../infrastructure/auth/argon2-password-hasher.js";
import {
  PrismaInstitutionRepository,
  PrismaRoleAssignmentRepository,
  PrismaUserRepository,
} from "../../infrastructure/auth/prisma-identity.repository.js";
import { PrismaSessionRepository } from "../../infrastructure/auth/prisma-session.repository.js";
import { RedisLoginProtectionStore } from "../../infrastructure/auth/redis-login-protection.store.js";
import { RedisSessionStore } from "../../infrastructure/auth/redis-session.store.js";
import { redis } from "../../infrastructure/redis/redis.js";
import { resolveAuthConfig, type AuthConfig } from "./auth.config.js";
import {
  createRequireMfaVerified,
  createRequireSession,
} from "./auth.middleware.js";
import { createAuthRouter } from "./auth.routes.js";
import { AuthService } from "./auth.service.js";

export const authConfig: AuthConfig = resolveAuthConfig(env);

export const authService = new AuthService({
  config: authConfig,
  hasher: new Argon2PasswordHasher(),
  users: new PrismaUserRepository(),
  institutions: new PrismaInstitutionRepository(),
  roles: new PrismaRoleAssignmentRepository(),
  sessions: new PrismaSessionRepository(),
  sessionStore: new RedisSessionStore(redis),
  protection: new RedisLoginProtectionStore(redis, authConfig.protection),
});

export const authRouter: Router = createAuthRouter(authService, authConfig);

/** Session middleware for protected routes (F-64). */
export const requireSession: RequestHandler =
  createRequireSession(authService);

/** Stacked after `requireSession` where SEC-06 demands a verified MFA state. */
export { createRequireMfaVerified };
