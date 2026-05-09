import { ChevronDown, Crosshair, MapPin, Route } from "lucide-react";
import { useState } from "react";
import { getSeverityStyle } from "@/lib/reportUtils";
import type { ReportSeverity } from "@/types";
import { cn } from "@/lib/utils";

const severities: ReportSeverity[] = ["low", "medium", "high", "critical"];

export function MapLegend() {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  return (
    <div className="map-dock pointer-events-auto rounded-2xl border border-white/[0.12] bg-slate-950/[0.72] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Legend</div>
        <button
          type="button"
          className="ghost-button min-h-11 px-2 text-xs sm:hidden"
          onClick={() => setMobileExpanded((current) => !current)}
          aria-expanded={mobileExpanded}
        >
          <ChevronDown className={cn("size-4 transition", mobileExpanded ? "rotate-180" : "")} aria-hidden="true" />
          {mobileExpanded ? "Hide" : "Show"}
        </button>
      </div>
      <div className={cn("mt-3 flex-wrap gap-2 sm:flex", mobileExpanded ? "flex" : "hidden")}>
        <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/[0.08] px-2.5 py-1.5 text-xs font-semibold text-white">
          <span className="size-2.5 rounded-full bg-white" />
          White confidence
        </span>
        <span className="inline-flex items-center gap-2 rounded-lg border border-orange-200/25 bg-orange-300/[0.10] px-2.5 py-1.5 text-xs font-semibold text-orange-100">
          <span className="size-2.5 rounded-full bg-orange-400" />
          Orange uncertain
        </span>
        <span className="inline-flex items-center gap-2 rounded-lg border border-rose-200/25 bg-rose-300/[0.10] px-2.5 py-1.5 text-xs font-semibold text-rose-100">
          <span className="size-2.5 rounded-full bg-rose-400" />
          Red low confidence
        </span>
        {severities.map((severity) => {
          const style = getSeverityStyle(severity);
          return (
            <span key={severity} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-slate-300">
              <span className={`size-2.5 rounded-full ${style.bgClass}`} />
              {style.label}
            </span>
          );
        })}
        <LegendItem icon={Route} label="Route report" />
        <LegendItem icon={MapPin} label="Area report" />
        <LegendItem icon={MapPin} label="Pickup" tone="text-cyan-100" />
        <LegendItem icon={Crosshair} label="Drop-off" tone="text-fuchsia-100" />
      </div>
    </div>
  );
}

function LegendItem({ icon: Icon, label, tone = "text-slate-300" }: { icon: typeof Route; label: string; tone?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold ${tone}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
