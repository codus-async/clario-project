import type { RequestHandler, Router } from "express";

import { env } from "../../config/env.js";
import { AccountService } from "../../modules/auth/auth.account.service.js";
import { Argon2PasswordHasher } from "../../infrastructure/auth/argon2-password-hasher.js";
import { LocalCompromisedPasswordChecker } from "../../infrastructure/auth/compromised-password-checker.js";
import { PrismaAccountRepository } from "../../infrastructure/auth/prisma-account.repository.js";
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

const hasher = new Argon2PasswordHasher();
const users = new PrismaUserRepository();
const institutions = new PrismaInstitutionRepository();
const roles = new PrismaRoleAssignmentRepository();
const sessions = new PrismaSessionRepository();
const sessionStore = new RedisSessionStore(redis);

export const authService = new AuthService({
  config: authConfig,
  hasher,
  users,
  institutions,
  roles,
  sessions,
  sessionStore,
  protection: new RedisLoginProtectionStore(redis, authConfig.protection),
});

export const accountService = new AccountService({
  config: authConfig,
  hasher,
  accounts: new PrismaAccountRepository(),
  institutions,
  roles,
  sessionStore,
  compromisedPasswords: new LocalCompromisedPasswordChecker(),
});

export const authRouter: Router = createAuthRouter(
  authService,
  accountService,
  authConfig,
);

/** Session middleware for protected routes (F-64). */
export const requireSession: RequestHandler =
  createRequireSession(authService);

/**
 * Route guard that blocks full access until the MFA challenge of a
 * mandatory-MFA account has been completed (SEC-06).
 */
export const requireMfaVerified: RequestHandler =
  createRequireMfaVerified(authService);

/** Stacked after `requireSession` where SEC-06 demands a verified MFA state. */
export { createRequireMfaVerified };
