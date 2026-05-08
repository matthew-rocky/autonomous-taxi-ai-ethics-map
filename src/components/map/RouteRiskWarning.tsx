import { AlertTriangle, ShieldCheck } from "lucide-react";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import type { ConfidenceAssessment, MapReport } from "@/types";

interface RouteRiskWarningProps {
  riskyReports: MapReport[];
  confidence: ConfidenceAssessment | null;
}

export function RouteRiskWarning({ riskyReports, confidence }: RouteRiskWarningProps) {
  const lowConfidence = confidence?.level === "red" || riskyReports.length > 0;
  const uncertain = confidence?.level === "orange";

  return (
    <div
      className={`route-risk-warning pointer-events-auto rounded-lg border p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl ${
        lowConfidence
          ? "border-rose-200/30 bg-rose-950/70 text-rose-50"
          : uncertain
            ? "border-orange-200/30 bg-orange-950/70 text-orange-50"
          : "border-emerald-200/20 bg-emerald-950/[0.55] text-emerald-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border ${
            lowConfidence
              ? "border-rose-200/25 bg-rose-300/[0.15]"
              : uncertain
                ? "border-orange-200/25 bg-orange-300/[0.15]"
                : "border-emerald-200/20 bg-emerald-300/[0.12]"
          }`}
        >
          {lowConfidence || uncertain ? <AlertTriangle className="size-4" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-white">
              {confidence ? confidence.headline : "Drop-off confidence pending"}
            </h2>
            {confidence ? <ConfidenceBadge confidence={confidence} compact /> : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {lowConfidence
              ? `${Math.max(riskyReports.length, 1)} low-confidence signal area intersects the selected route or exact drop-off.`
              : confidence?.noAlertMessage ?? "No active alerts found. This does not guarantee safety."}
          </p>
        </div>
      </div>
    </div>
  );
}
