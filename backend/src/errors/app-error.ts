import {
  ERROR_METADATA,
  type DocumentedErrorCode,
} from "./error-codes.js";

export interface FieldError {
  field: string;
  message: string;
}

export class AppError extends Error {
  public readonly code: DocumentedErrorCode;
  public readonly status: number;
  public readonly title: string;
  public readonly fieldErrors?: FieldError[];

  constructor(
    code: DocumentedErrorCode,
    detail: string,
    fieldErrors?: FieldError[],
  ) {
    super(detail);

    this.name = "AppError";
    this.code = code;
    this.status = ERROR_METADATA[code].status;
    this.title = ERROR_METADATA[code].title;
    this.fieldErrors = fieldErrors;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
