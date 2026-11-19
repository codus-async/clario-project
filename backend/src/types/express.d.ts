import "express";

import type { TenantContext } from "../infrastructure/database/tenant-transaction.js";
import type { AuthSessionContext } from "../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      /** Attached by the F-64 session middleware on authenticated requests. */
      authContext?: AuthSessionContext;
      /**
       * Attached by the F-66 Policy Enforcement Point (gate 4) once the
       * tenant/scope checks passed. Tenant-scoped handlers must run their
       * queries through `withRequestTenantTransaction`, which binds these
       * values as `SET LOCAL` RLS session variables inside the transaction.
       */
      tenantContext?: TenantContext;
      /**
       * Parsed output of the F-64 request-body schema, attached by
       * `createBodyValidator` before the controller runs. Raw `req.body` stays
       * untrusted (`unknown` until validation succeeds); controllers read the
       * validated request data from here via `getValidatedBody`.
       */
      validatedBody?: unknown;
    }
  }
}

export { };
