import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, FileBarChart, ShieldCheck } from "lucide-react";
import type { ScenarioAnalysis, ViewMode } from "@/types";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

interface HeroProps {
  analysis: ScenarioAnalysis;
  onViewChange: (view: ViewMode) => void;
}

export function Hero({ analysis, onViewChange }: HeroProps) {
  return (
    <section className="grid gap-8 py-10 md:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-3xl"
      >
        <div className="eyebrow mb-4 inline-flex items-center gap-2">
          <BrainCircuit className="size-4" aria-hidden="true" />
          Responsible autonomy prototype
        </div>
        <h1 className="text-5xl font-semibold tracking-normal text-white sm:text-6xl lg:text-7xl">
          Uncertainty-Aware Navigation
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          Robo-Cab Ottawa does not try to perfectly detect danger. It detects uncertainty, makes confidence visible,
          and acts responsibly when confidence is low.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" className="primary-button" onClick={() => onViewChange("assessment")}>
            Start Assessment
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="secondary-button" onClick={() => onViewChange("framework")}>
            <ShieldCheck className="size-4" aria-hidden="true" />
            Design Tools
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.12, ease: "easeOut" }}
        className="glass-panel-strong overflow-hidden p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="metric-label">Live scenario</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">{analysis.scenarioName}</h2>
          </div>
          <ConfidenceBadge confidence={analysis.evaluation.confidence} compact />
        </div>

        <div className="mt-7 grid grid-cols-3 gap-3">
          {[
            ["Score", `${analysis.evaluation.normalizedScore}`],
            ["Reports", `${analysis.evaluation.incidentCount}`],
            ["Confidence", analysis.evaluation.confidence.label],
          ].map(([label, value]) => (
            <div key={label} className="subtle-panel p-4">
              <div className="text-2xl font-semibold text-white">{value}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <FileBarChart className="size-4" aria-hidden="true" />
            Current recommendation
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{analysis.evaluation.finalDecision}</p>
        </div>

        <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-300 to-rose-300"
            initial={{ width: 0 }}
            animate={{ width: `${analysis.evaluation.normalizedScore}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
          <div className="absolute inset-y-0 w-1/3 bg-white/20 blur-md" />
        </div>
      </motion.div>
    </section>
  );
}
