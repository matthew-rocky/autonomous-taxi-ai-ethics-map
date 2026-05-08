import { Activity, Clock3 } from "lucide-react";
import type { NearbyRouteRisk } from "@/lib/routeRisk";
import { formatReportAge, getSeverityStyle } from "@/lib/reportUtils";
import { cn } from "@/lib/utils";

interface IncidentTimelineProps {
  risks: NearbyRouteRisk[];
}

export function IncidentTimeline({ risks }: IncidentTimelineProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Activity className="size-4 text-cyan-200" aria-hidden="true" />
          Nearby signal timeline
        </div>
        <span className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-bold text-slate-300">
          Live
        </span>
      </div>

      {risks.length === 0 ? (
        <p className="mt-4 rounded-lg border border-emerald-200/20 bg-emerald-300/[0.09] p-3 text-sm leading-6 text-emerald-50">
          No active route-adjacent signals are currently in the selected corridor. This does not guarantee safety.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {risks.slice(0, 4).map((risk) => {
            const style = getSeverityStyle(risk.severity);
            return (
              <article key={risk.report.id} className="grid grid-cols-[14px_1fr] gap-3">
                <span className={cn("mt-1.5 size-3 rounded-full shadow-[0_0_20px_currentColor]", style.bgClass)} />
                <div className="min-w-0 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-white">{risk.report.title}</h3>
                    <span className={cn("rounded-lg border px-2 py-1 text-xs font-bold", style.badgeClass)}>{style.label}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    {formatReportAge(risk.report.createdAt)}
                    <span>{Math.round(risk.distanceKm * 1000)}m from route</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
