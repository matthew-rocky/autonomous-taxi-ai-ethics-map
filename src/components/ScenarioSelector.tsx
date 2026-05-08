import { AlertTriangle, CheckCircle2, MapPin } from "lucide-react";
import type { ScenarioAnalysis } from "@/types";
import { cn, confidenceLevelTone } from "@/lib/utils";

interface ScenarioSelectorProps {
  analyses: ScenarioAnalysis[];
  selectedScenario: string;
  onSelect: (scenarioName: string) => void;
}

export function ScenarioSelector({ analyses, selectedScenario, onSelect }: ScenarioSelectorProps) {
  return (
    <aside className="glass-panel p-4 lg:sticky lg:top-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="metric-label">Scenario library</div>
          <h2 className="mt-1 text-lg font-semibold text-white">Robo-Cab cases</h2>
        </div>
        <MapPin className="size-5 text-cyan-200" aria-hidden="true" />
      </div>

      <label htmlFor="scenario-select" className="sr-only">
        Select scenario
      </label>
      <select
        id="scenario-select"
        value={selectedScenario}
        onChange={(event) => onSelect(event.target.value)}
        className="map-input mt-4 py-3 font-medium lg:hidden"
      >
        {analyses.map((analysis) => (
          <option key={analysis.scenarioName} value={analysis.scenarioName}>
            {analysis.scenarioName}
          </option>
        ))}
      </select>

      <div className="mt-4 hidden gap-2 lg:grid">
        {analyses.map((analysis) => {
          const active = selectedScenario === analysis.scenarioName;
          const expectedMatches = analysis.evaluation.label === analysis.scenario.expected;

          return (
            <button
              key={analysis.scenarioName}
              type="button"
              onClick={() => onSelect(analysis.scenarioName)}
              className={cn(
                "rounded-lg border p-3 text-left transition duration-200",
                active
                  ? "border-cyan-200/[0.35] bg-cyan-300/[0.10]"
                  : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold leading-5 text-white">{analysis.scenarioName}</span>
                {expectedMatches ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${confidenceLevelTone[analysis.evaluation.confidence.level]}`}>
                  {analysis.evaluation.confidence.label}
                </span>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium text-slate-300">
                  {analysis.destination.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
