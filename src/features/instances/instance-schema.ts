import { z } from "zod";

export const instanceSortBySchema = z.enum([
  "name",
  "minimumLevel",
  "cooldownDays",
]);
export const instanceSortOrderSchema = z.enum(["asc", "desc"]);

export const instanceInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(120, "Name is too long."),
  minimumLevel: z.coerce
    .number()
    .int("Minimum level must be an integer.")
    .positive("Minimum level must be greater than zero."),
  cooldownDays: z.coerce
    .number()
    .int("Cooldown days must be an integer.")
    .min(0, "Cooldown days must be zero or greater."),
  itemIds: z
    .array(z.coerce.number().int().positive("Item ID must be a positive integer."))
    .default([])
    .superRefine((itemIds, context) => {
      if (new Set(itemIds).size !== itemIds.length) {
        context.addIssue({
          code: "custom",
          path: [],
          message: "Items cannot be repeated in the same instance.",
        });
      }
    }),
});

export const instanceQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  sortBy: instanceSortBySchema.optional().default("name"),
  sortOrder: instanceSortOrderSchema.optional().default("asc"),
});

export type InstanceInput = z.infer<typeof instanceInputSchema>;
export type InstanceQuery = z.infer<typeof instanceQuerySchema>;
export type InstanceSortBy = z.infer<typeof instanceSortBySchema>;
export type InstanceSortOrder = z.infer<typeof instanceSortOrderSchema>;

export function normalizeInstanceQuery(input: Record<string, string | undefined>) {
  return instanceQuerySchema.parse(input);
}
