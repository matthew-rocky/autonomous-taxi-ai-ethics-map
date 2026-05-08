import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  Clock3,
  Compass,
  DatabaseZap,
  Eye,
  FileText,
  Fingerprint,
  Layers3,
  LockKeyhole,
  MapPinned,
  Scale,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { CompareScenarios } from "@/components/CompareScenarios";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { DecisionTracePanel } from "@/components/DecisionTracePanel";
import { DecisionBrief } from "@/components/DecisionBrief";
import { Hero } from "@/components/Hero";
import { Layout } from "@/components/Layout";
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
import type { IncidentRecord, RiskZone, ScenarioAnalysis, ViewMode } from "@/types";

export default function App() {
  const scenarios = useMemo(() => createScenarios(), []);
  const analyses = useMemo(() => analyzeAllScenarios(scenarios), [scenarios]);
  const [activeView, setActiveView] = useState<ViewMode>("map");
  const [selectedScenario, setSelectedScenario] = useState("Default Ottawa demo");

  const selectedAnalysis = analyses.find((analysis) => analysis.scenarioName === selectedScenario) ?? analyses[0];

  return (
    <>
      <AnimatedBackground />
      <Layout activeView={activeView} onViewChange={setActiveView}>
        {activeView !== "map" ? <Hero analysis={selectedAnalysis} onViewChange={setActiveView} /> : null}

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
    <section id="assessment" className="grid min-h-[calc(100vh-104px)] gap-6 lg:grid-cols-[330px_1fr]">
      <ScenarioSelector analyses={analyses} selectedScenario={selectedScenario} onSelect={onSelectScenario} />

      <div className="grid gap-6">
        <ScenarioSummary analysis={analysis} onViewChange={onViewChange} />
        <PrototypeExplanationPanel />

        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <RiskScoreCard evaluation={analysis.evaluation} />
          <RiskField analysis={analysis} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.88fr]">
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
    <section className="glass-panel-strong p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="metric-label">Scenario assessment</div>
          <h2 className="mt-1 text-3xl font-semibold tracking-normal text-white">{analysis.scenarioName}</h2>
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

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="secondary-button" onClick={() => onViewChange("brief")}>
          <FileText className="size-4" aria-hidden="true" />
          Decision Brief
        </button>
        <button type="button" className="secondary-button" onClick={() => onViewChange("compare")}>
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
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="size-4" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-[0.08em]">{label}</span>
      </div>
      <div className="mt-3 text-lg font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{detail}</div>
    </div>
  );
}

function RiskField({ analysis }: { analysis: ScenarioAnalysis }) {
  const points = useMemo(() => layoutRiskPoints(analysis), [analysis]);

  return (
    <section className="glass-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="metric-label">Confidence field</div>
          <h2 className="mt-1 text-xl font-semibold text-white">Ottawa signal map</h2>
        </div>
        <Compass className="size-5 text-cyan-200" aria-hidden="true" />
      </div>

      <div
        className="relative mt-5 h-[310px] overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,41,59,0.56)),linear-gradient(45deg,rgba(34,211,238,0.08),rgba(168,85,247,0.08))]"
        aria-label={`Confidence field for ${analysis.destination.name}`}
      >
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:38px_38px]" />
        {points.zones.map((zone) => (
          <span
            key={zone.zoneId}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border",
              zone.riskLabel === "Danger"
                ? "border-rose-300/30 bg-rose-400/[0.15] shadow-[0_0_70px_rgba(251,113,133,0.22)]"
                : "border-amber-300/30 bg-amber-400/[0.15] shadow-[0_0_70px_rgba(251,191,36,0.20)]",
            )}
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.size}px`,
              height: `${zone.size}px`,
            }}
            title={zone.explanation}
          />
        ))}
        {points.incidents.map((point) => (
          <span
            key={point.id}
            className={cn(
              "absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80",
              point.severity >= 4 ? "bg-rose-300" : point.severity >= 3 ? "bg-amber-300" : "bg-cyan-300",
            )}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            title={`${point.incidentType}: severity ${point.severity}/5`}
          />
        ))}
        <span
          className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-cyan-100 bg-cyan-300 shadow-[0_0_36px_rgba(34,211,238,0.55)]"
          style={{ left: `${points.destination.x}%`, top: `${points.destination.y}%` }}
          title={analysis.destination.name}
        />
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
          <Legend color="bg-cyan-300" label="Destination" />
          <Legend color="bg-amber-300" label="Uncertain signal" />
          <Legend color="bg-rose-300" label="Low confidence" />
        </div>
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur">
      <span className={`size-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function EvidencePanel({ analysis }: { analysis: ScenarioAnalysis }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="glass-panel p-5">
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

      <div className="glass-panel p-5">
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
  const stakeholders = ["Tourists", "Pedestrians", "Emergency responders", "Engineers", "Tech companies"];
  const values = ["trust", "accountability", "safety", "reliability", "efficiency", "reputation", "accessibility"];

  return (
    <section className="grid gap-6">
      <PrototypeExplanationPanel />

      <div className="glass-panel-strong p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="metric-label">Design Tools</div>
            <h2 className="mt-1 text-3xl font-semibold text-white">Ethics Design Toolkit</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              The prototype reframes navigation from autopilot certainty to accountable caution. The main value tension
              is trust vs accountability.
            </p>
          </div>
          <Scale className="hidden size-7 text-cyan-200 sm:block" aria-hidden="true" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <motion.article className="glass-panel p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <span className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-300 to-sky-300">
            <Users className="size-5 text-slate-950" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-xl font-semibold text-white">Value Map</h3>
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Stakeholders</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {stakeholders.map((stakeholder) => (
                <span key={stakeholder} className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-slate-300">
                  {stakeholder}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Values</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {values.map((value) => (
                <span key={value} className="rounded-lg border border-cyan-200/20 bg-cyan-300/[0.10] px-2.5 py-1.5 text-xs font-semibold text-cyan-100">
                  {value}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-4 rounded-lg border border-amber-200/25 bg-amber-300/[0.10] p-3 text-sm font-semibold text-amber-100">
            Main value tension: Trust vs Accountability
          </p>
        </motion.article>

        <motion.article className="glass-panel p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <span className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-orange-300">
            <Compass className="size-5 text-slate-950" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-xl font-semibold text-white">Metaphor Hacking</h3>
          <div className="mt-4 grid gap-3">
            <ToolBlock label="Old metaphor" value="The map behaves like an autopilot or train on fixed tracks." />
            <ToolBlock label="New metaphor" value="The map behaves like a cautious human guide." />
          </div>
          <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-300">
            <li>Uncertainty must be visible.</li>
            <li>Low confidence triggers cautious behavior.</li>
            <li>Decisions must be explained.</li>
          </ul>
        </motion.article>

        <motion.article className="glass-panel p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <span className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-br from-rose-300 to-pink-300">
            <Shield className="size-5 text-slate-950" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-xl font-semibold text-white">Social Failure Mode Analysis</h3>
          <div className="mt-4 grid gap-3">
            <ToolBlock label="Social context" value="Autonomous public transportation in a fast-changing city environment." />
            <ToolBlock label="Failure mode" value="Norm transgression." />
            <ToolBlock label="System norm" value="Destination is normal unless explicit evidence says otherwise." />
            <ToolBlock label="User norm" value="When safety is uncertain, the system should become cautious." />
            <ToolBlock label="Harms" value="Physical harm, loss of public trust, socially unacceptable automation." />
          </div>
          <p className="mt-4 rounded-lg border border-rose-200/25 bg-rose-300/[0.10] p-3 text-sm font-semibold text-rose-100">
            This is not a convenience feature. It is an ethical correction.
          </p>
        </motion.article>
      </div>
    </section>
  );
}

function ToolBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm leading-6 text-slate-200">{value}</div>
    </div>
  );
}

function layoutRiskPoints(analysis: ScenarioAnalysis) {
  const coordinates = [
    analysis.destination,
    ...analysis.scenario.incidents,
    ...analysis.zones.map((zone) => ({ latitude: zone.latitude, longitude: zone.longitude })),
  ];
  const latitudes = coordinates.map((point) => point.latitude);
  const longitudes = coordinates.map((point) => point.longitude);
  const minLat = Math.min(...latitudes) - 0.002;
  const maxLat = Math.max(...latitudes) + 0.002;
  const minLon = Math.min(...longitudes) - 0.002;
  const maxLon = Math.max(...longitudes) + 0.002;
  const project = (latitude: number, longitude: number) => ({
    x: ((longitude - minLon) / Math.max(maxLon - minLon, 0.0001)) * 82 + 9,
    y: ((maxLat - latitude) / Math.max(maxLat - minLat, 0.0001)) * 72 + 9,
  });

  return {
    destination: project(analysis.destination.latitude, analysis.destination.longitude),
    incidents: analysis.scenario.incidents.map((incident) => ({
      ...incident,
      ...project(incident.latitude, incident.longitude),
    })),
    zones: analysis.zones.map((zone: RiskZone) => ({
      ...zone,
      ...project(zone.latitude, zone.longitude),
      size: Math.max(84, Math.min(210, zone.radiusM * 0.34)),
    })),
  };
}
