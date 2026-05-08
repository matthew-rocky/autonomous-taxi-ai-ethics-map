import { CornerDownRight, ListChecks } from "lucide-react";
import type { EstimatedDirection } from "@/lib/routeRisk";

interface RouteDirectionsProps {
  directions: EstimatedDirection[];
}

export function RouteDirections({ directions }: RouteDirectionsProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <ListChecks className="size-4 text-cyan-200" aria-hidden="true" />
          Step-by-step directions
        </div>
        <span className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-bold text-slate-300">
          Estimated
        </span>
      </div>
      <ol className="mt-4 grid gap-3">
        {directions.map((direction, index) => (
          <li key={`${direction.title}-${index}`} className="grid grid-cols-[28px_1fr] gap-3">
            <span className="flex size-7 items-center justify-center rounded-lg border border-cyan-200/20 bg-cyan-300/[0.12] text-xs font-bold text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.12)]">
              {index + 1}
            </span>
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold text-white">
                <CornerDownRight className="size-3.5 text-cyan-200" aria-hidden="true" />
                {direction.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{direction.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
