import { z } from "zod";

import {
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  CLARIO_SYSTEM_CONSTANTS,
} from "../enums/contracts.js";

export const MAX_UPLOAD_FILE_SIZE_BYTES =
  CLARIO_SYSTEM_CONSTANTS.MAX_UPLOAD_FILE_SIZE_BYTES;

export const allowedFileExtensionSchema = z.enum(ALLOWED_FILE_EXTENSIONS);

export const allowedMimeTypeSchema = z.enum(ALLOWED_MIME_TYPES);

export const fileSizeBytesSchema = z
  .number()
  .int("File size must be an integer number of bytes")
  .positive("File size must be greater than zero")
  .max(
    MAX_UPLOAD_FILE_SIZE_BYTES,
    "File size exceeds the 50 MB (52,428,800 bytes) upload limit"
  );
