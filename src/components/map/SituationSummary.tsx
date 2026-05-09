import { Activity, AlertTriangle, ChevronDown, LocateFixed, Radar } from "lucide-react";
import { useState } from "react";
import type { MapReport, RoutePoint } from "@/types";
import { getDangerRadius, nearestReportLabel } from "@/lib/reportUtils";
import { cn } from "@/lib/utils";

interface SituationSummaryProps {
  reports: MapReport[];
  pickup: RoutePoint | null;
  dropoff: RoutePoint | null;
}

export function SituationSummary({ reports, pickup, dropoff }: SituationSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const activeReports = reports.filter((report) => report.status === "active");
  const criticalReports = activeReports.filter((report) => report.severity === "critical");
  const highRiskZones = activeReports.filter((report) => getDangerRadius(report) >= 300);

  return (
    <div className="map-dock pointer-events-auto w-full max-w-[360px] rounded-2xl border border-white/[0.12] bg-slate-950/[0.68] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="metric-label">Situation summary</div>
          <h2 className="mt-1 text-lg font-semibold text-white">Live confidence status</h2>
        </div>
        <button
          type="button"
          className="ghost-button min-h-11 px-2 sm:min-h-9"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          <Radar className="size-4 text-cyan-200" aria-hidden="true" />
          <ChevronDown className={cn("size-4 transition", expanded ? "rotate-180" : "")} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <SummaryMetric icon={Activity} label="Active" value={String(activeReports.length)} tone="text-cyan-100" />
        <SummaryMetric icon={AlertTriangle} label="Critical" value={String(criticalReports.length)} tone="text-fuchsia-100" />
        <SummaryMetric icon={Radar} label="Low-confidence areas" value={String(highRiskZones.length)} tone="text-rose-100" />
        <SummaryMetric icon={LocateFixed} label="Nearest report" value={nearestReportLabel(pickup, dropoff, activeReports)} tone="text-emerald-100" />
      </div>

      {expanded ? (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-slate-300">
          {highRiskZones.length > 0
            ? "Low-confidence overlays are active near reported signals. Review the route preview before submitting."
            : "No active alerts found. This does not guarantee safety."}
        </p>
      ) : null}
    </div>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <div className={`flex items-center gap-2 text-lg font-semibold ${tone}`}>
        <Icon className="size-4" aria-hidden="true" />
        {value}
      </div>
      <div className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
    </div>
  );
}
