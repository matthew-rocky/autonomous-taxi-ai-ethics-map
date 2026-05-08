import { ShieldCheck, ShieldAlert } from "lucide-react";
import { getRouteSafetyLabel } from "@/lib/routeRisk";
import { cn } from "@/lib/utils";

interface RouteSafetyScoreProps {
  score: number;
}

export function RouteSafetyScore({ score }: RouteSafetyScoreProps) {
  const label = getRouteSafetyLabel(score);
  const risky = score < 70;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {risky ? (
            <ShieldAlert className="size-4 text-amber-200" aria-hidden="true" />
          ) : (
            <ShieldCheck className="size-4 text-emerald-200" aria-hidden="true" />
          )}
          <span className="text-sm font-semibold text-white">Route confidence</span>
        </div>
        <span className={cn("rounded-lg border px-2 py-1 text-xs font-bold", scoreTone(score))}>{label}</span>
      </div>
      <div className="mt-4 flex items-end gap-3">
        <span className="text-4xl font-semibold text-white">{score}</span>
        <span className="pb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">out of 100</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full", barTone(score))} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function scoreTone(score: number) {
  if (score >= 85) return "border-emerald-200/25 bg-emerald-300/[0.12] text-emerald-100";
  if (score >= 70) return "border-cyan-200/25 bg-cyan-300/[0.12] text-cyan-100";
  if (score >= 50) return "border-amber-200/30 bg-amber-300/[0.15] text-amber-100";
  if (score >= 30) return "border-orange-200/30 bg-orange-300/[0.15] text-orange-100";
  return "border-rose-200/[0.35] bg-rose-300/[0.15] text-rose-100";
}

function barTone(score: number) {
  if (score >= 85) return "bg-gradient-to-r from-emerald-300 to-cyan-300";
  if (score >= 70) return "bg-gradient-to-r from-cyan-300 to-sky-300";
  if (score >= 50) return "bg-gradient-to-r from-amber-300 to-orange-300";
  return "bg-gradient-to-r from-orange-300 to-rose-300";
}
