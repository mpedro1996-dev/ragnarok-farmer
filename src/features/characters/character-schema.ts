import { z } from "zod";

import { characterClasses, isCharacterClassId } from "./character-classes";

export const characterSortBySchema = z.enum(["name", "level", "classId"]);
export const characterSortOrderSchema = z.enum(["asc", "desc"]);

export const characterInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(120, "Name is too long."),
  level: z.coerce
    .number()
    .int("Level must be an integer.")
    .positive("Level must be greater than zero."),
  classId: z.coerce
    .number()
    .int("Class must be a valid option.")
    .refine(isCharacterClassId, "Class must be a valid option."),
});

export const characterQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  sortBy: characterSortBySchema.optional().default("name"),
  sortOrder: characterSortOrderSchema.optional().default("asc"),
});

export const characterClassOptions = characterClasses;

export type CharacterInput = z.infer<typeof characterInputSchema>;
export type CharacterQuery = z.infer<typeof characterQuerySchema>;
export type CharacterSortBy = z.infer<typeof characterSortBySchema>;
export type CharacterSortOrder = z.infer<typeof characterSortOrderSchema>;

export function normalizeCharacterQuery(input: Record<string, string | undefined>) {
  return characterQuerySchema.parse(input);
}
