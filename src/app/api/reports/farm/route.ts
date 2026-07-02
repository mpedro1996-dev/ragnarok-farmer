import { ZodError } from "zod";

import {
  getFarmReport,
  ReportCharacterFilterNotFoundError,
  ReportInstanceFilterNotFoundError,
} from "@/features/reports/report-service";
import { normalizeReportQuery } from "@/features/reports/report-schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = normalizeReportQuery({
      dateMode: searchParams.get("dateMode") ?? undefined,
      day: searchParams.get("day") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      characterIds: searchParams.get("characterIds") ?? undefined,
      instanceIds: searchParams.get("instanceIds") ?? undefined,
    });

    const report = await getFarmReport(query);

    return Response.json(report);
  } catch (error) {
    return handleRouteError(error);
  }
}

function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json(
      {
        message: "Os filtros do relatório são inválidos.",
        issues: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (
    error instanceof ReportCharacterFilterNotFoundError ||
    error instanceof ReportInstanceFilterNotFoundError
  ) {
    return Response.json({ message: error.message }, { status: 404 });
  }

  console.error(error);

  return Response.json(
    { message: "Não foi possível carregar o relatório de farm." },
    { status: 500 },
  );
}
