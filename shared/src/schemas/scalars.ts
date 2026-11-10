import { z } from "zod";

export const isoDateTimeUtcSchema = z.iso.datetime({
  offset: false,
  local: false,
});

export const ianaTimezoneSchema = z.string().refine(
  (value) => {
    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone: value,
      });

      return true;
    } catch {
      return false;
    }
  },
  "Must be a valid IANA timezone identifier"
);

export const koboAmountSchema = z
  .number()
  .int("Amount must be an integer number of kobo")
  .nonnegative("Amount in kobo cannot be negative");
