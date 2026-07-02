import { normalizeReportQuery } from "@/features/reports/report-schema";
import { getFarmReport } from "@/features/reports/report-service";

import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const initialData = await getFarmReport(normalizeReportQuery({}));

  return <ReportsClient initialData={initialData} />;
}
