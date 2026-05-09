import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, GitCompareArrows, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { ScenarioAnalysis } from "@/types";
import { cn, confidenceLevelTone } from "@/lib/utils";

interface CompareScenariosProps {
  analyses: ScenarioAnalysis[];
}

export function CompareScenarios({ analyses }: CompareScenariosProps) {
  const [selected, setSelected] = useState(() => analyses.slice(0, 4).map((analysis) => analysis.scenarioName));
  const selectedAnalyses = useMemo(
    () => analyses.filter((analysis) => selected.includes(analysis.scenarioName)),
    [analyses, selected],
  );

  const chartData = selectedAnalyses.map((analysis) => ({
    scenario: compactName(analysis.scenarioName),
    score: analysis.evaluation.normalizedScore,
    level: analysis.evaluation.riskLevel,
  }));

  const toggleScenario = (scenarioName: string) => {
    setSelected((current) =>
      current.includes(scenarioName) ? current.filter((item) => item !== scenarioName) : [...current, scenarioName],
    );
  };

  return (
    <section className="grid min-w-0 gap-4 md:gap-6">
      <div className="glass-panel-strong min-w-0 p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="metric-label">Comparison view</div>
            <h2 className="mt-1 text-2xl font-semibold text-white">Scenario confidence comparison</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Compare destination confidence, evidence quality, top concerns, and accountability status.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100">
            <GitCompareArrows className="size-4" aria-hidden="true" />
            {selectedAnalyses.length} selected
          </span>
        </div>

        <div className="mt-5 flex min-w-0 flex-wrap gap-2">
          {analyses.map((analysis) => {
            const isSelected = selected.includes(analysis.scenarioName);
            return (
              <button
                key={analysis.scenarioName}
                type="button"
                onClick={() => toggleScenario(analysis.scenarioName)}
                className={cn(
                  "inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition sm:min-h-10",
                  isSelected
                    ? "border-cyan-200/30 bg-cyan-300/[0.12] text-cyan-100"
                    : "border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.065]",
                )}
                aria-pressed={isSelected}
              >
                {isSelected ? <Minus className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                <span className="min-w-0 truncate">{analysis.scenarioName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedAnalyses.length === 0 ? (
        <div className="glass-panel p-8 text-center text-slate-300">Select at least one scenario to compare.</div>
      ) : (
        <>
          <div className="glass-panel min-w-0 overflow-hidden p-4 sm:p-5">
            <div className="h-[260px] w-full sm:h-[320px]">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 12, right: 4, left: -28, bottom: 12 }}>
                  <CartesianGrid vertical={false} stroke="var(--subtle-border)" />
                  <XAxis dataKey="scenario" tick={{ fill: "var(--muted-text)", fontSize: 12 }} interval={0} />
                  <YAxis tick={{ fill: "var(--soft-text)", fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--panel-bg-strong)",
                      border: "1px solid var(--panel-border)",
                      borderRadius: 8,
                      color: "var(--panel-text)",
                    }}
                  />
                  <Bar dataKey="score" name="Uncertainty pressure" fill="var(--accent)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {selectedAnalyses.map((analysis, index) => (
              <motion.article
                key={analysis.scenarioName}
                className="glass-panel card-hover min-w-0 p-4 sm:p-5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold leading-6 text-white">{analysis.scenarioName}</h3>
                  <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${confidenceLevelTone[analysis.evaluation.confidence.level]}`}>
                    {analysis.evaluation.confidence.label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                  <MiniMetric label="Score" value={`${analysis.evaluation.normalizedScore}`} />
                  <MiniMetric label="Reports" value={`${analysis.evaluation.incidentCount}`} />
                  <MiniMetric label="Confidence" value={analysis.evaluation.confidence.label} />
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Top concerns</div>
                  <ul className="mt-3 grid gap-2">
                    {analysis.evaluation.topConcerns.slice(0, 3).map((concern) => (
                      <li key={concern} className="flex gap-2 text-sm leading-6 text-slate-300">
                        <Check className="mt-1 size-4 shrink-0 text-cyan-200" aria-hidden="true" />
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm font-semibold text-slate-200">
                  {recommendationStatus(analysis)}
                </div>
              </motion.article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{label}</div>
    </div>
  );
}

function recommendationStatus(analysis: ScenarioAnalysis) {
  if (analysis.evaluation.label === "Danger") {
    return analysis.evaluation.saferDropoffs.length
      ? `Safer handoff required: ${analysis.evaluation.saferDropoffs[0].name}`
      : "Safer handoff required: no short-walk option found";
  }
  if (analysis.evaluation.label === "Caution") return "Warning and safer handoff recommendation required";
  return "Proceed with no-active-alert caveat";
}

function compactName(name: string) {
  return name
    .replace("Default Ottawa demo", "Default")
    .replace("Normal daytime trip to ", "")
    .replace("Late-night uncertainty near ", "Late night ")
    .replace("Multiple recent reports around a ", "")
    .replace("High-severity cluster with red zone", "High severity")
    .replace("Conflicting low-confidence situation with orange zone", "Low confidence")
    .replace("One low-severity report only", "Low severity");
}
