import type { MapReport } from "@/types";

const API_BASE = import.meta.env.VITE_REPORTS_API_URL?.replace(/\/$/, "");

export const reportsApiEnabled = Boolean(API_BASE);

export async function getReportsFromApi() {
  if (!API_BASE) return null;
  const response = await fetch(`${API_BASE}/api/reports`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Unable to fetch reports.");
  return (await response.json()) as MapReport[];
}

export async function postReportToApi(report: MapReport) {
  if (!API_BASE) return null;
  const response = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(report),
  });
  if (!response.ok) throw new Error("Unable to create report.");
  return (await response.json()) as MapReport;
}

export async function patchReportStatus(reportId: string, status: MapReport["status"]) {
  if (!API_BASE) return null;
  const response = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(reportId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Unable to update report.");
  return (await response.json()) as MapReport;
}
