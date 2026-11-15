import type { Request, RequestHandler } from "express";
import { z } from "zod";

import { AppError, type FieldError } from "../../errors/app-error.js";
import { ERROR_CODES } from "../../errors/error-codes.js";

const BODY_REQUIRED_DETAIL = "A JSON object request body is required.";
const MULTI_ERROR_DETAIL = "One or more request fields are invalid.";
const UNKNOWN_FIELD_MESSAGE = "Unknown field.";

type ZodIssue = z.ZodError["issues"][number];

/** Reads the raw (still untrusted) input a Zod issue was produced from. */
function valueAtPath(root: unknown, path: readonly PropertyKey[]): unknown {
  let current = root;
  for (const key of path) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}

/**
 * Maps one Zod issue onto the shared `field_errors` representation.
 *
 * Only repository-authored messages reach the response: unknown-field and
 * type issues are rephrased here, every other issue carries the custom
 * message declared on the schema. No message ever contains submitted input
 * values (F-64 §7).
 */
function fieldErrorsForIssue(issue: ZodIssue, rawBody: unknown): FieldError[] {
  if (issue.code === "unrecognized_keys") {
    return issue.keys.map((key) => ({
      field: key,
      message: UNKNOWN_FIELD_MESSAGE,
    }));
  }

  if (issue.path.length === 0) {
    return [];
  }

  const field = issue.path.map(String).join(".");

  if (issue.code === "invalid_type") {
    const value = valueAtPath(rawBody, issue.path);
    return [
      {
        field,
        message:
          value === undefined
            ? `${field} is required.`
            : `${field} must be a ${issue.expected}.`,
      },
    ];
  }

  return [{ field, message: issue.message }];
}

/**
 * Builds the typed validation error the central `errorHandler` renders as
 * the documented RFC 9457 Problem Details envelope. A non-object body maps
 * to the body-level detail with no field errors, mirroring the pre-Zod
 * controller behaviour; otherwise the detail is the single field message
 * (or the documented multi-error summary).
 */
function toValidationError(error: z.ZodError, rawBody: unknown): AppError {
  const fieldErrors: FieldError[] = [];
  let bodyLevelIssue = false;

  for (const issue of error.issues) {
    if (issue.code === "invalid_type" && issue.path.length === 0) {
      bodyLevelIssue = true;
      continue;
    }
    fieldErrors.push(...fieldErrorsForIssue(issue, rawBody));
  }

  const firstFieldError = fieldErrors[0];
  const detail = bodyLevelIssue
    ? BODY_REQUIRED_DETAIL
    : fieldErrors.length === 1 && firstFieldError !== undefined
      ? firstFieldError.message
      : MULTI_ERROR_DETAIL;

  return new AppError(
    ERROR_CODES.VALIDATION_ERROR,
    detail,
    fieldErrors.length > 0 ? fieldErrors : undefined,
  );
}

/**
 * Request-body validation middleware (F-64 §6). Parses the raw body with the
 * given strict schema and only continues to the controller on success; on
 * failure it forwards a typed `VALIDATION_ERROR` so the central error
 * middleware produces the RFC 9457 response. An absent body is normalised to
 * `{}` so bodyless commands validate against an empty strict object instead
 * of failing the type check.
 *
 * The parsed output is stored on `req.validatedBody`; the raw `req.body` is
 * never mutated.
 */
export function createBodyValidator(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const rawBody = req.body === undefined ? {} : req.body;
    const result = schema.safeParse(rawBody);

    if (!result.success) {
      next(toValidationError(result.error, rawBody));
      return;
    }

    req.validatedBody = result.data;
    next();
  };
}

/**
 * Typed accessor for the data `createBodyValidator` parsed for this request.
 * External request data stays `unknown` until this hand-off; the single cast
 * is the documented boundary where the middleware's guarantee becomes the
 * controller's static type.
 */
export function getValidatedBody<T>(req: Request): T {
  const body = req.validatedBody;
  if (body === undefined) {
    throw new Error(
      "createBodyValidator must run before the handler reads the validated body",
    );
  }
  return body as T;
}
