import { z } from "zod";

export const itemSortBySchema = z.enum(["name", "averageZenny"]);
export const itemSortOrderSchema = z.enum(["asc", "desc"]);

const optionalPositiveInteger = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return value;
}, z.coerce.number().int().positive().nullable());

const defaultBooleanFalse = z.preprocess((value) => {
  if (value === undefined) {
    return false;
  }

  return value;
}, z.boolean());

export const itemInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120, "Name is too long."),
  averageZenny: z.coerce
    .number()
    .int("Average zenny must be an integer.")
    .positive("Average zenny must be greater than zero."),
  divinePrideId: optionalPositiveInteger,
  isSoldToNpc: defaultBooleanFalse,
});

export const itemQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  sortBy: itemSortBySchema.optional().default("name"),
  sortOrder: itemSortOrderSchema.optional().default("asc"),
});

export type ItemInput = z.infer<typeof itemInputSchema>;
export type ItemQuery = z.infer<typeof itemQuerySchema>;
export type ItemSortBy = z.infer<typeof itemSortBySchema>;
export type ItemSortOrder = z.infer<typeof itemSortOrderSchema>;

export function normalizeItemQuery(input: Record<string, string | undefined>) {
  return itemQuerySchema.parse(input);
}

export function formatZenny(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
