import { Compass } from "lucide-react";

export function PrototypeExplanationPanel() {
  return (
    <section className="glass-panel-strong min-w-0 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-cyan-200/25 bg-cyan-300/10 text-cyan-100">
          <Compass className="size-5" aria-hidden="true" />
        </span>
        <div>
          <div className="metric-label">Final prototype idea</div>
          <h2 className="mt-1 text-xl font-semibold text-white">Uncertainty-Aware Navigation</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
            Uncertainty-Aware Navigation does not assume safety in the absence of information. When confidence is low,
            the system slows down, explains itself, and recommends a safer nearby drop-off.
          </p>
        </div>
      </div>
    </section>
  );
}
