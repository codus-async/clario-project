import { CLARIO_HTTP_HEADERS } from "@clario/shared-contracts";
import type { RequestHandler } from "express";

import { env } from "../config/env.js";

/**
 * Writes the institution timezone response header (REST contract §1.1).
 *
 * The header is *always* returned, so the platform default is written
 * up-front and the auth module overwrites it with the resolved tenant's
 * authoritative IANA timezone as soon as the tenant is known — on login and
 * on every authenticated tenant route. Clients evaluate deadlines and due
 * dates in that timezone (BR-NEW-01) while all timestamps stay UTC.
 */
export const institutionTimezoneMiddleware: RequestHandler = (
  _req,
  res,
  next,
) => {
  res.setHeader(CLARIO_HTTP_HEADERS.INSTITUTION_TIMEZONE, env.APP_TIMEZONE);
  next();
};
