import { HelpCircle } from "lucide-react";
import type { ScenarioAnalysis } from "@/types";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

interface WhyRecommendationPanelProps {
  analysis: ScenarioAnalysis;
}

export function WhyRecommendationPanel({ analysis }: WhyRecommendationPanelProps) {
  const { confidence } = analysis.evaluation;

  return (
    <section className="glass-panel min-w-0 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="metric-label">Plain-English rationale</div>
          <h2 className="mt-1 text-xl font-semibold text-white">Why this recommendation?</h2>
        </div>
        <ConfidenceBadge confidence={confidence} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ReasonItem label="Original drop-off" value={confidence.originalDropoff} />
        <ReasonItem label="Evidence state" value={sentenceCase(confidence.evidenceState)} />
        <ReasonItem label="Safer handoff" value={confidence.saferHandoffPoint ?? "No alternate required right now"} />
        <ReasonItem label="Trade-off" value={confidence.tradeoff ?? "No added walk"} />
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
          <HelpCircle className="size-4" aria-hidden="true" />
          Explanation shown to rider
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-300">{confidence.plainSummary}</p>
        <ul className="mt-3 grid gap-2">
          {confidence.evidenceAvailable.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-6 text-slate-300">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ReasonItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-2 break-words text-sm font-semibold leading-6 text-white">{value}</div>
    </div>
  );
}

function sentenceCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
