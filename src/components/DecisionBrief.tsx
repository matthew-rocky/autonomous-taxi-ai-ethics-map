import { Braces, Download, FileText } from "lucide-react";
import type { ScenarioAnalysis } from "@/types";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { DecisionTracePanel } from "@/components/DecisionTracePanel";
import { PrototypeExplanationPanel } from "@/components/PrototypeExplanationPanel";

interface DecisionBriefProps {
  analysis: ScenarioAnalysis;
}

export function DecisionBrief({ analysis }: DecisionBriefProps) {
  const markdown = buildDecisionBriefMarkdown(analysis);
  const briefJson = buildDecisionBriefJson(analysis);
  const filename = analysis.scenarioName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <section className="glass-panel-strong min-w-0 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="metric-label">Decision brief</div>
          <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">Responsible AI Decision Brief</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            {analysis.destination.name} assessment generated from the uncertainty-aware recommendation engine.
          </p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            className="secondary-button w-full sm:w-auto"
            onClick={() => downloadText(`${filename || "decision-brief"}.md`, markdown, "text/markdown")}
          >
            <FileText className="size-4" aria-hidden="true" />
            Markdown
          </button>
          <button
            type="button"
            className="secondary-button w-full sm:w-auto"
            onClick={() =>
              downloadText(`${filename || "decision-brief"}.json`, JSON.stringify(briefJson, null, 2), "application/json")
            }
          >
            <Braces className="size-4" aria-hidden="true" />
            JSON
          </button>
        </div>
      </div>

      <div className="mt-6">
        <PrototypeExplanationPanel />
      </div>

      <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-white">{analysis.scenarioName}</h3>
            <ConfidenceBadge confidence={analysis.evaluation.confidence} compact />
          </div>
          <dl className="mt-5 grid gap-3 text-sm">
            <BriefMetric label="Destination" value={analysis.destination.name} />
            <BriefMetric label="Confidence" value={`${analysis.evaluation.confidence.label} - ${analysis.evaluation.confidence.status}`} />
            <BriefMetric label="Signal Pressure" value={`${analysis.evaluation.normalizedScore}/100`} />
            <BriefMetric label="Legacy Label" value={analysis.evaluation.label} />
            <BriefMetric label="Engine Decision" value={analysis.evaluation.decision} />
          </dl>
        </div>

        <div className="min-w-0 rounded-lg border border-white/10 bg-slate-950/60 p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <Download className="size-4" aria-hidden="true" />
            Brief preview
          </div>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-3 text-sm leading-6 text-slate-200 sm:max-h-[420px] sm:p-4">
            {markdown}
          </pre>
        </div>
      </div>

      <div className="mt-6">
        <DecisionTracePanel analysis={analysis} />
      </div>
    </section>
  );
}

function BriefMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-white/10 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[110px_1fr] sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</dt>
      <dd className="break-words text-slate-200">{value}</dd>
    </div>
  );
}

function buildDecisionBriefJson(analysis: ScenarioAnalysis) {
  return {
    title: "Responsible AI Decision Brief",
    scenarioName: analysis.scenarioName,
    destination: analysis.destination.name,
    confidenceLevel: analysis.evaluation.confidence.label,
    confidenceStatus: analysis.evaluation.confidence.status,
    legacyRiskLabel: analysis.evaluation.label,
    uncertaintyPressure: analysis.evaluation.normalizedScore,
    rawSignalScore: analysis.evaluation.score,
    evidenceState: analysis.evaluation.confidence.evidenceState,
    mainEthicalConcerns: analysis.evaluation.topConcerns,
    mitigationActions: analysis.evaluation.governanceChecklist.map((item) => item.detail),
    governanceRecommendation: analysis.evaluation.governanceChecklist,
    saferDropoffs: analysis.evaluation.saferDropoffs.map((dropoff) => ({
      name: dropoff.name,
      riskLabel: dropoff.riskLabel,
      walkingMinutes: dropoff.walkingMinutes,
      distanceKm: dropoff.distanceKm,
      recommendation: dropoff.recommendation,
    })),
    finalDecisionSuggestion: analysis.evaluation.finalDecision,
    accountabilityRule: analysis.evaluation.confidence.accountabilityRule,
  };
}

function buildDecisionBriefMarkdown(analysis: ScenarioAnalysis) {
  const concerns = analysis.evaluation.topConcerns.map((concern) => `- ${concern}`).join("\n");
  const mitigations = analysis.evaluation.governanceChecklist.map((item) => `- ${item.label}: ${item.detail}`).join("\n");
  const dropoffs =
    analysis.evaluation.saferDropoffs.length > 0
      ? analysis.evaluation.saferDropoffs
          .map(
            (dropoff) =>
              `- ${dropoff.name}: ${dropoff.riskLabel}, ${dropoff.walkingMinutes} min walk, ${dropoff.distanceKm} km. ${dropoff.recommendation}`,
          )
          .join("\n")
      : "- No safer drop-off recommendation is required under the current engine decision.";

  return `# Responsible AI Decision Brief

## Scenario
${analysis.scenarioName}

## Confidence Level
- ${analysis.evaluation.confidence.headline}
- Evidence state: ${analysis.evaluation.confidence.evidenceState}
- Legacy engine label: ${analysis.evaluation.label}
- Uncertainty pressure: ${analysis.evaluation.normalizedScore}/100
- Raw signal: ${analysis.evaluation.score.toFixed(2)}
- No-alert caveat: ${analysis.evaluation.confidence.noAlertMessage}

## Main Ethical Concerns
${concerns}

## Mitigation Actions
${mitigations}

## Safer Drop-Off Options
${dropoffs}

## Governance Recommendation
${analysis.evaluation.governanceChecklist.map((item) => `- ${item.status}: ${item.label}`).join("\n")}

## Final Decision Suggestion
${analysis.evaluation.finalDecision}

## Decision Trace
- Original destination: ${analysis.destination.name}
- Exact drop-off confidence: ${analysis.evaluation.confidence.level === "red" ? "Low" : analysis.evaluation.confidence.label}
- System action: ${analysis.evaluation.confidence.action}
- User explanation shown: Yes
- Override required: ${analysis.evaluation.confidence.overrideRequired ? "Yes" : "No"}
- Accountability rule applied: ${analysis.evaluation.confidence.accountabilityRule}
`;
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
