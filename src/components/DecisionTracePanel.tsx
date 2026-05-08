import { ClipboardList } from "lucide-react";
import type { ScenarioAnalysis } from "@/types";

interface DecisionTracePanelProps {
  analysis: ScenarioAnalysis;
}

export function DecisionTracePanel({ analysis }: DecisionTracePanelProps) {
  const { confidence } = analysis.evaluation;
  const rows = [
    ["Original destination", analysis.destination.name],
    ["Exact drop-off confidence", confidence.level === "red" ? "Low" : confidence.label],
    ["Main reason", mainReason(confidence.evidenceState)],
    ["System action", confidence.action],
    ["User explanation shown", "Yes"],
    ["Override required", confidence.overrideRequired ? "Yes" : "No"],
    ["Accountability rule applied", confidence.accountabilityRule],
  ];

  return (
    <section className="glass-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="metric-label">Accountability</div>
          <h2 className="mt-1 text-xl font-semibold text-white">Decision Trace</h2>
        </div>
        <ClipboardList className="size-5 text-amber-200" aria-hidden="true" />
      </div>

      <div className="mt-5 grid gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-[190px_1fr]">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
            <div className="text-sm font-semibold leading-6 text-slate-100">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function mainReason(state: string) {
  if (state === "conflicting") return "Sparse or conflicting destination signals";
  if (state === "stale") return "Destination signals are stale";
  if (state === "sparse") return "Sparse destination signals";
  return "Recent signals support the displayed confidence level";
}
