import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  Clock3,
  Compass,
  FileText,
  Layers3,
  MapPinned,
  UserCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { CompareScenarios } from "@/components/CompareScenarios";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { DecisionTracePanel } from "@/components/DecisionTracePanel";
import { DecisionBrief } from "@/components/DecisionBrief";
import { EthicsToolkit } from "@/components/EthicsToolkit";
import { GUIDED_TOUR_STORAGE_KEY, GuidedTour } from "@/components/GuidedTour";
import { Hero } from "@/components/Hero";
import { Layout } from "@/components/Layout";
import { AssessmentSignalMap } from "@/components/map/AssessmentSignalMap";
import { MapReportView } from "@/components/map/MapReportView";
import { PrototypeExplanationPanel } from "@/components/PrototypeExplanationPanel";
import { RecommendationPanel } from "@/components/RecommendationPanel";
import { RiskRadarChart } from "@/components/RiskRadarChart";
import { RiskScoreCard } from "@/components/RiskScoreCard";
import { ScenarioSelector } from "@/components/ScenarioSelector";
import { StakeholderPanel } from "@/components/StakeholderPanel";
import { WhyRecommendationPanel } from "@/components/WhyRecommendationPanel";
import { createScenarios } from "@/data/scenarios";
import { analyzeAllScenarios, formatTimestamp } from "@/lib/ethicsEngine";
import { cn, riskLevelTone } from "@/lib/utils";
import type { IncidentRecord, ScenarioAnalysis, ViewMode } from "@/types";

export default function App() {
  const scenarios = useMemo(() => createScenarios(), []);
  const analyses = useMemo(() => analyzeAllScenarios(scenarios), [scenarios]);
  const [activeView, setActiveView] = useState<ViewMode>("map");
  const [selectedScenario, setSelectedScenario] = useState("Default Ottawa demo");
  const [tourOpen, setTourOpen] = useState(false);

  const selectedAnalysis = analyses.find((analysis) => analysis.scenarioName === selectedScenario) ?? analyses[0];

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(GUIDED_TOUR_STORAGE_KEY)) {
        const timeout = window.setTimeout(() => setTourOpen(true), 650);
        return () => window.clearTimeout(timeout);
      }
    } catch {
      const timeout = window.setTimeout(() => setTourOpen(true), 650);
      return () => window.clearTimeout(timeout);
    }
  }, []);

  return (
    <>
      <AnimatedBackground />
      <Layout activeView={activeView} onViewChange={setActiveView} onReplayTour={() => setTourOpen(true)}>
        {activeView !== "map" && activeView !== "framework" ? <Hero analysis={selectedAnalysis} onViewChange={setActiveView} /> : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {activeView === "map" ? <MapReportView /> : null}
            {activeView === "assessment" ? (
              <AssessmentView
                analyses={analyses}
                selectedScenario={selectedScenario}
                onSelectScenario={setSelectedScenario}
                analysis={selectedAnalysis}
                onViewChange={setActiveView}
              />
            ) : null}
            {activeView === "compare" ? <CompareScenarios analyses={analyses} /> : null}
            {activeView === "brief" ? <DecisionBrief analysis={selectedAnalysis} /> : null}
            {activeView === "framework" ? <FrameworkView /> : null}
          </motion.div>
        </AnimatePresence>
      </Layout>
      <GuidedTour open={tourOpen} activeView={activeView} onOpenChange={setTourOpen} onViewChange={setActiveView} />
    </>
  );
}

interface AssessmentViewProps {
  analyses: ScenarioAnalysis[];
  selectedScenario: string;
  onSelectScenario: (scenarioName: string) => void;
  analysis: ScenarioAnalysis;
  onViewChange: (view: ViewMode) => void;
}

function AssessmentView({
  analyses,
  selectedScenario,
  onSelectScenario,
  analysis,
  onViewChange,
}: AssessmentViewProps) {
  return (
    <section id="assessment" className="grid min-h-[calc(100vh-104px)] min-w-0 gap-4 md:gap-6 lg:grid-cols-[330px_1fr]">
      <ScenarioSelector analyses={analyses} selectedScenario={selectedScenario} onSelect={onSelectScenario} />

      <div className="grid min-w-0 gap-4 md:gap-6">
        <ScenarioSummary analysis={analysis} onViewChange={onViewChange} />
        <PrototypeExplanationPanel />

        <div className="grid min-w-0 gap-4 md:gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <RiskScoreCard evaluation={analysis.evaluation} />
          <RiskField analysis={analysis} />
        </div>

        <div className="grid min-w-0 gap-4 md:gap-6 xl:grid-cols-[1fr_0.88fr]">
          <CategoryBreakdown categories={analysis.evaluation.categoryBreakdown} />
          <RiskRadarChart categories={analysis.evaluation.categoryBreakdown} />
        </div>

        <RecommendationPanel analysis={analysis} />
        <WhyRecommendationPanel analysis={analysis} />
        <DecisionTracePanel analysis={analysis} />
        <StakeholderPanel evaluation={analysis.evaluation} />
        <EvidencePanel analysis={analysis} />
      </div>
    </section>
  );
}

function ScenarioSummary({ analysis, onViewChange }: { analysis: ScenarioAnalysis; onViewChange: (view: ViewMode) => void }) {
  const expectedMatches = analysis.evaluation.label === analysis.scenario.expected;

  return (
    <section className="glass-panel-strong min-w-0 p-4 sm:p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="metric-label">Scenario assessment</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal text-white sm:text-3xl">{analysis.scenarioName}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{analysis.scenario.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${riskLevelTone[analysis.evaluation.riskLevel]}`}>
            {analysis.evaluation.riskLevel} signal pressure
          </span>
          <ConfidenceBadge confidence={analysis.evaluation.confidence} />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric icon={MapPinned} label="Destination" value={analysis.destination.name} detail={analysis.destination.category} />
        <SummaryMetric
          icon={Layers3}
          label="Uncertainty overlays"
          value={String(analysis.zones.length)}
          detail={analysis.evaluation.insideZone ? "Inside active overlay" : analysis.evaluation.nearZone ? "Near active overlay" : "No active overlay"}
        />
        <SummaryMetric
          icon={Clock3}
          label="Recent reports"
          value={String(analysis.evaluation.recentCount)}
          detail={`${analysis.evaluation.verifiedCount} verified`}
        />
        <SummaryMetric
          icon={expectedMatches ? UserCheck : AlertCircle}
          label="Confidence"
          value={analysis.evaluation.confidence.label}
          detail={analysis.evaluation.confidence.status}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
        <button type="button" className="secondary-button w-full sm:w-auto" onClick={() => onViewChange("brief")}>
          <FileText className="size-4" aria-hidden="true" />
          Decision Brief
        </button>
        <button type="button" className="secondary-button w-full sm:w-auto" onClick={() => onViewChange("compare")}>
          <ArrowUpRight className="size-4" aria-hidden="true" />
          Compare Scenarios
        </button>
      </div>
    </section>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof MapPinned;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="size-4" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-[0.08em]">{label}</span>
      </div>
      <div className="mt-3 break-words text-lg font-semibold text-white">{value}</div>
      <div className="mt-1 break-words text-xs leading-5 text-slate-500">{detail}</div>
    </div>
  );
}

function RiskField({ analysis }: { analysis: ScenarioAnalysis }) {
  return (
    <section className="glass-panel min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="metric-label">Confidence field</div>
          <h2 className="mt-1 text-xl font-semibold text-white">Ottawa signal map</h2>
        </div>
        <Compass className="size-5 text-cyan-200" aria-hidden="true" />
      </div>

      <AssessmentSignalMap analysis={analysis} />
    </section>
  );
}

function EvidencePanel({ analysis }: { analysis: ScenarioAnalysis }) {
  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="glass-panel min-w-0 p-4 sm:p-5">
          <div className="metric-label">Evidence trail</div>
          <h2 className="mt-1 text-xl font-semibold text-white">Why this decision was made</h2>
        <ul className="mt-5 grid gap-3">
          {analysis.evaluation.reasons.map((reason) => (
            <li key={reason} className="flex gap-3 text-sm leading-6 text-slate-300">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan-300" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-panel min-w-0 p-4 sm:p-5">
        <div className="metric-label">Nearby reports</div>
        <h2 className="mt-1 text-xl font-semibold text-white">Community signals</h2>
        {analysis.evaluation.nearbyReports.length === 0 ? (
          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            No active alerts found. This does not guarantee safety.
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {analysis.evaluation.nearbyReports.slice(0, 5).map((report) => (
              <ReportRow key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ReportRow({ report }: { report: IncidentRecord }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-white">{report.incidentType}</h3>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-slate-300">
            Severity {report.severity}/5
          </span>
          <span
            className={cn(
              "rounded-lg border px-2 py-1 text-xs font-semibold",
              report.verified
                ? "border-emerald-200/20 bg-emerald-300/10 text-emerald-100"
                : "border-amber-200/20 bg-amber-300/10 text-amber-100",
            )}
          >
            {report.verified ? "Verified" : "Unverified"}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-300">{report.description}</p>
      <div className="mt-3 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
        {formatTimestamp(report.timestampDate)} {report.distanceKm !== undefined ? `- ${report.distanceKm.toFixed(2)} km away` : ""}
      </div>
    </article>
  );
}

function FrameworkView() {
  return <EthicsToolkit />;
}
