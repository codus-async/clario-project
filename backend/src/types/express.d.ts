import "express";

import type { AuthSessionContext } from "../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      /** Attached by the F-64 session middleware on authenticated requests. */
      authContext?: AuthSessionContext;
    }
  }
}

export { };
