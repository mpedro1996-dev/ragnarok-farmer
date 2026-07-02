import { z } from "zod";

export const farmQuerySchema = z.object({
  characterId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(120).optional().default(""),
});

export const farmRunInputSchema = z.object({
  characterId: z.coerce.number().int().positive("Character ID must be a positive integer."),
  instanceId: z.coerce.number().int().positive("Instance ID must be a positive integer."),
  drops: z
    .array(
      z.object({
        itemId: z.coerce.number().int().positive("Item ID must be a positive integer."),
        quantity: z.coerce
          .number()
          .int("Quantity must be an integer.")
          .min(0, "Quantity must be zero or greater."),
      }),
    )
    .default([])
    .superRefine((drops, context) => {
      const itemIds = drops.map((drop) => drop.itemId);

      if (new Set(itemIds).size !== itemIds.length) {
        context.addIssue({
          code: "custom",
          path: [],
          message: "Items cannot be repeated in the same farm run.",
        });
      }
    }),
});

export type FarmQuery = z.infer<typeof farmQuerySchema>;
export type FarmRunInput = z.infer<typeof farmRunInputSchema>;

export function normalizeFarmQuery(input: Record<string, string | undefined>) {
  return farmQuerySchema.parse(input);
}
