import { z } from "zod";

export const CURSOR_PAGINATION_DEFAULT_LIMIT = 25;
export const CURSOR_PAGINATION_MAX_LIMIT = 100;

export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce
    .number()
    .int("limit must be an integer")
    .min(1, "limit must be at least 1")
    .max(CURSOR_PAGINATION_MAX_LIMIT, "limit exceeds the maximum page size")
    .default(CURSOR_PAGINATION_DEFAULT_LIMIT),
});

export const cursorPaginationMetaSchema = z.object({
  nextCursor: z.string().min(1).nullable(),
  hasMore: z.boolean(),
  limit: z.number().int().min(1).max(CURSOR_PAGINATION_MAX_LIMIT),
});

export const createCursorPaginatedListSchema = <T extends z.ZodType>(
  itemSchema: T
) =>
  z.object({
    items: z.array(itemSchema),
    ...cursorPaginationMetaSchema.shape,
  });

export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;
export type CursorPaginationMeta = z.infer<typeof cursorPaginationMetaSchema>;

export interface CursorPaginatedList<T> extends CursorPaginationMeta {
  items: T[];
}
