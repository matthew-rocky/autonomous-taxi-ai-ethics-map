import { AlertTriangle, CheckCircle2, Navigation, Route } from "lucide-react";
import type { ScenarioAnalysis } from "@/types";
import { confidenceLevelTone, riskLabelTone } from "@/lib/utils";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

interface RecommendationPanelProps {
  analysis: ScenarioAnalysis;
}

export function RecommendationPanel({ analysis }: RecommendationPanelProps) {
  const { evaluation } = analysis;
  const recommendations = evaluation.saferDropoffs;
  const requiresHandoff = evaluation.confidence.level !== "white";

  return (
    <section className="glass-panel min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="metric-label">Accountable recommendation</div>
          <h2 className="mt-1 text-xl font-semibold text-white">{evaluation.decision}</h2>
        </div>
        {evaluation.confidence.level === "red" ? (
          <AlertTriangle className="size-5 text-rose-300" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="size-5 text-emerald-300" aria-hidden="true" />
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ConfidenceBadge confidence={evaluation.confidence} />
        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-300">
          Accountable recommendation
        </span>
      </div>

      <p className="mt-4 muted-copy">{evaluation.finalDecision}</p>
      <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-slate-300">
        The system is not perfectly detecting danger. It is detecting uncertainty and acting responsibly.
      </p>

      <div className="mt-5 grid gap-3">
        {requiresHandoff && recommendations.length === 0 ? (
          <div className="rounded-lg border border-amber-200/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
            No nearby safer handoff point was found within a short walk. Robo-Cab should warn the rider and ask
            for a closer higher-confidence option.
          </div>
        ) : null}

        {recommendations.map((dropoff, index) => (
          <article key={dropoff.name} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
                  {index === 0 ? <Navigation className="size-4" aria-hidden="true" /> : <Route className="size-4" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white">{dropoff.name}</h3>
                  <p className="mt-1 text-xs text-slate-400">{dropoff.category}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${riskLabelTone[dropoff.riskLabel]}`}>
                  Handoff confidence: {dropoff.riskLabel}
                </span>
                <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${confidenceLevelTone.white}`}>
                  Safer handoff point
                </span>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-slate-300">
                  {dropoff.walkingMinutes} min walk
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{dropoff.recommendation}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{dropoff.explanation}</p>
          </article>
        ))}

        {!requiresHandoff ? (
          <div className="rounded-lg border border-emerald-200/20 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100">
            No alternate handoff is required right now. Evidence and uncertainty remain visible to the rider.
          </div>
        ) : null}
      </div>
    </section>
  );
}
