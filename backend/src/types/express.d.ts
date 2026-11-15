import "express";

import type { AuthSessionContext } from "../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      /** Attached by the F-64 session middleware on authenticated requests. */
      authContext?: AuthSessionContext;
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
