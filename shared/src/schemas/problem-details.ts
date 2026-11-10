import { z } from "zod";

import { ianaTimezoneSchema, isoDateTimeUtcSchema } from "./scalars.js";

export const PROBLEM_DETAILS_CONTENT_TYPE = "application/problem+json";

export const fieldErrorSchema = z.object({
  field: z.string().min(1),
  message: z.string().min(1),
});

export const problemDetailsSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  status: z.number().int().min(100).max(599),
  detail: z.string(),
  instance: z.string(),
  timestamp_utc: isoDateTimeUtcSchema,
  institution_timezone: ianaTimezoneSchema,
  field_errors: z.array(fieldErrorSchema).optional(),
});

export const errorResponseSchema = z.object({
  error: problemDetailsSchema,
});

export type FieldError = z.infer<typeof fieldErrorSchema>;
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
