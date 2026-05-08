import { motion } from "framer-motion";
import { Activity, Gauge, ShieldAlert } from "lucide-react";
import type { RiskEvaluation } from "@/types";
import { formatDistance, riskLabelTone, riskLevelTone } from "@/lib/utils";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

interface RiskScoreCardProps {
  evaluation: RiskEvaluation;
}

export function RiskScoreCard({ evaluation }: RiskScoreCardProps) {
  const score = evaluation.normalizedScore;

  return (
    <motion.section
      className="glass-panel-strong p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="metric-label">Confidence assessment</div>
          <h2 className="mt-1 text-xl font-semibold text-white">{evaluation.decision}</h2>
        </div>
        <Gauge className="size-5 text-cyan-200" aria-hidden="true" />
      </div>

      <div className="mt-7 grid gap-6 sm:grid-cols-[190px_1fr] sm:items-center">
        <div className="relative mx-auto size-44">
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ background: "conic-gradient(from 180deg, #22d3ee 0deg, rgba(255,255,255,0.08) 0deg)" }}
            animate={{
              background: `conic-gradient(from 180deg, #22d3ee 0deg, #a78bfa ${
                score * 1.8
              }deg, #fb7185 ${score * 3.6}deg, rgba(255,255,255,0.08) ${score * 3.6}deg)`,
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
          <div className="absolute inset-4 rounded-full border border-white/10 bg-slate-950/90 backdrop-blur-xl" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-5xl font-semibold text-white">{score}</span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">out of 100</span>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${riskLevelTone[evaluation.riskLevel]}`}>
              {evaluation.riskLevel} signal pressure
            </span>
            <span className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${riskLabelTone[evaluation.label]}`}>
              Legacy label: {evaluation.label}
            </span>
            <ConfidenceBadge confidence={evaluation.confidence} compact />
          </div>

          <p className="muted-copy">{evaluation.evidence}</p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric icon={Activity} label="Raw signal" value={evaluation.score.toFixed(2)} />
            <Metric icon={ShieldAlert} label="Reports" value={String(evaluation.incidentCount)} />
            <Metric label="Nearest signal" value={formatDistance(evaluation.distanceToNearestReportKm)} />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

interface MetricProps {
  icon?: typeof Activity;
  label: string;
  value: string;
}

function Metric({ icon: Icon, label, value }: MetricProps) {
  return (
    <div className="subtle-panel p-3">
      <div className="flex items-center gap-2 text-slate-400">
        {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
        <span className="text-xs font-medium uppercase tracking-[0.08em]">{label}</span>
      </div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
