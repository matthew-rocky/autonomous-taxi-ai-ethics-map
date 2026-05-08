import { ClipboardList, UserRoundCheck, UsersRound } from "lucide-react";
import type { RiskEvaluation } from "@/types";
import { cn } from "@/lib/utils";

const impactTone = {
  emerald: "border-emerald-200/20 bg-emerald-300/10 text-emerald-100",
  amber: "border-amber-200/20 bg-amber-300/10 text-amber-100",
  rose: "border-rose-200/25 bg-rose-300/10 text-rose-100",
  cyan: "border-cyan-200/20 bg-cyan-300/10 text-cyan-100",
  violet: "border-violet-200/20 bg-violet-300/10 text-violet-100",
} as const;

const governanceTone = {
  Required: "border-rose-200/25 bg-rose-300/10 text-rose-100",
  Recommended: "border-amber-200/20 bg-amber-300/10 text-amber-100",
  Monitor: "border-cyan-200/20 bg-cyan-300/10 text-cyan-100",
  Clear: "border-emerald-200/20 bg-emerald-300/10 text-emerald-100",
} as const;

interface StakeholderPanelProps {
  evaluation: RiskEvaluation;
}

export function StakeholderPanel({ evaluation }: StakeholderPanelProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="metric-label">Stakeholder impact</div>
            <h2 className="mt-1 text-xl font-semibold text-white">Affected parties</h2>
          </div>
          <UsersRound className="size-5 text-violet-200" aria-hidden="true" />
        </div>

        <div className="mt-5 grid gap-3">
          {evaluation.stakeholderImpacts.map((impact) => (
            <article key={impact.stakeholder} className={cn("rounded-lg border p-4", impactTone[impact.tone])}>
              <div className="flex items-start gap-3">
                <UserRoundCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-white">{impact.stakeholder}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{impact.impact}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="glass-panel p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="metric-label">Governance checklist</div>
            <h2 className="mt-1 text-xl font-semibold text-white">Required controls</h2>
          </div>
          <ClipboardList className="size-5 text-cyan-200" aria-hidden="true" />
        </div>

        <div className="mt-5 grid gap-3">
          {evaluation.governanceChecklist.map((item) => (
            <article key={item.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-white">{item.label}</h3>
                <span className={cn("rounded-lg border px-2 py-1 text-xs font-bold", governanceTone[item.status])}>
                  {item.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
