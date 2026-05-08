import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { NearbyRouteRisk } from "@/lib/routeRisk";
import { formatReportAge, getSeverityStyle } from "@/lib/reportUtils";
import { cn } from "@/lib/utils";

interface NearbyRiskListProps {
  risks: NearbyRouteRisk[];
}

export function NearbyRiskList({ risks }: NearbyRiskListProps) {
  if (risks.length === 0) {
    return (
      <section className="rounded-xl border border-emerald-200/20 bg-emerald-300/[0.10] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-200" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-white">No major active reports near this route.</h3>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              No active alerts found. This does not guarantee safety.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <AlertTriangle className="size-4 text-amber-200" aria-hidden="true" />
          Nearby uncertainty signals
        </div>
        <span className="rounded-lg border border-amber-200/25 bg-amber-300/[0.12] px-2.5 py-1 text-xs font-bold text-amber-100">
          {risks.length} near route
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {risks.slice(0, 5).map((risk) => {
          const style = getSeverityStyle(risk.severity);
          return (
            <article key={risk.report.id} className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{risk.report.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{formatReportAge(risk.report.createdAt)}</p>
                </div>
                <span className={cn("rounded-lg border px-2 py-1 text-xs font-bold", style.badgeClass)}>
                  {style.label}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {Math.round(risk.distanceKm * 1000)}m from route corridor, confidence buffer {Math.round(risk.radiusKm * 1000)}m.
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
