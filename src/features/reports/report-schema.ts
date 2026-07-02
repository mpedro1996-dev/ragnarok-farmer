import { z } from "zod";

const reportDateModeSchema = z.enum(["daily", "range"]);

const reportDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "A data deve estar no formato YYYY-MM-DD.")
  .refine(isValidReportDate, "A data informada é inválida.");

const csvIdListSchema = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return [];
  }

  return trimmedValue
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}, z.array(z.coerce.number().int().positive("Os IDs devem ser inteiros positivos.")).optional());

export const reportQuerySchema = z
  .object({
    dateMode: reportDateModeSchema.optional().default("daily"),
    day: reportDateSchema.optional(),
    startDate: reportDateSchema.optional(),
    endDate: reportDateSchema.optional(),
    characterIds: csvIdListSchema,
    instanceIds: csvIdListSchema,
  })
  .superRefine((value, context) => {
    if (value.characterIds && value.characterIds.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["characterIds"],
        message: "Selecione ao menos um personagem.",
      });
    }

    if (value.instanceIds && value.instanceIds.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["instanceIds"],
        message: "Selecione ao menos uma instância.",
      });
    }

    if (value.characterIds && new Set(value.characterIds).size !== value.characterIds.length) {
      context.addIssue({
        code: "custom",
        path: ["characterIds"],
        message: "Os personagens não podem ser repetidos no mesmo filtro.",
      });
    }

    if (value.instanceIds && new Set(value.instanceIds).size !== value.instanceIds.length) {
      context.addIssue({
        code: "custom",
        path: ["instanceIds"],
        message: "As instâncias não podem ser repetidas no mesmo filtro.",
      });
    }

    if (value.dateMode === "daily") {
      return;
    }

    if (!value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "Informe a data inicial do período.",
      });
    }

    if (!value.endDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Informe a data final do período.",
      });
    }

    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      context.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "A data inicial não pode ser maior que a data final.",
      });
    }
  });

export type ReportDateMode = z.infer<typeof reportDateModeSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;

export function normalizeReportQuery(input: Record<string, string | undefined>) {
  return reportQuerySchema.parse(input);
}

function isValidReportDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
