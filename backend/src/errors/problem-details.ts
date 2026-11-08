import type { FieldError } from "./app-error.js";

export interface ProblemDetails {
  code: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp_utc: string;
  institution_timezone: string;
  field_errors?: FieldError[];
}

export interface ErrorResponse {
  error: ProblemDetails;
}
