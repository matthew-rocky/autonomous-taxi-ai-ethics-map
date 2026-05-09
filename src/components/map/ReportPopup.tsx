import { CalendarClock, CheckCircle2, ExternalLink, MapPinned, Route } from "lucide-react";
import type { MapReport } from "@/types";
import { stopDomEvent } from "@/lib/leafletEvents";
import { cn } from "@/lib/utils";
import { formatReportAge, getDangerRadius, getReportKind, getSeverityStyle, getStatusStyle } from "@/lib/reportUtils";

interface ReportPopupProps {
  report: MapReport;
  onResolve?: (reportId: string) => void;
}

export function ReportPopup({ report, onResolve }: ReportPopupProps) {
  const severityStyle = getSeverityStyle(report.severity);
  const kind = getReportKind(report);
  const radius = getDangerRadius(report);

  return (
    <div
      className="map-dock map-dock-strong w-80 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
      onClick={stopDomEvent}
      onMouseDown={stopDomEvent}
    >
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.18),transparent_36%),rgba(255,255,255,0.035)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-cyan-200">
              {kind === "route" ? <Route className="size-3.5" aria-hidden="true" /> : <MapPinned className="size-3.5" aria-hidden="true" />}
              {kind} report
            </div>
            <h3 className="mt-2 text-base font-semibold leading-6 text-white">{report.title}</h3>
          </div>
          <span className={cn("rounded-lg border px-2 py-1 text-xs font-bold", severityStyle.badgeClass)}>
            {severityStyle.label}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          <span className={cn("rounded-lg border px-2 py-1 text-xs font-bold capitalize", getStatusStyle(report.status))}>
            {report.status}
          </span>
          <span className="rounded-lg border border-cyan-200/20 bg-cyan-300/[0.12] px-2 py-1 text-xs font-bold text-cyan-100">
            {report.type}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-slate-300">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {formatReportAge(report.createdAt)}
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-300">{report.description}</p>

        <div className="mt-3 grid gap-2">
          {kind === "area" && radius > 0 ? (
            <DetailRow label="Radius" value={radius >= 1000 ? `${radius / 1000} km` : `${radius} m`} />
          ) : null}
          {kind === "route" && report.pickup ? <DetailRow label="Pickup" value={report.pickup.address ?? "Route pickup"} /> : null}
          {kind === "route" && report.dropoff ? <DetailRow label="Drop-off" value={report.dropoff.address ?? "Route drop-off"} /> : null}
        </div>

        <div className={cn("mt-4 grid gap-2", onResolve ? "grid-cols-2" : "grid-cols-1")}>
          <button type="button" className="secondary-button min-h-10 px-3 text-xs" onClick={stopDomEvent}>
            <ExternalLink className="size-3.5" aria-hidden="true" />
            View details
          </button>
          {onResolve && report.status !== "resolved" ? (
            <button
              type="button"
              className="primary-button min-h-10 px-3 text-xs"
              onClick={(event) => {
                stopDomEvent(event);
                onResolve(report.id);
              }}
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Resolve
            </button>
          ) : onResolve ? (
            <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 text-xs font-semibold text-emerald-100">
              Resolved
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[68px_1fr] gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs">
      <span className="font-bold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <span className="truncate text-slate-300">{value}</span>
    </div>
  );
}
