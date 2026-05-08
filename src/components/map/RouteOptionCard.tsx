import { AlertTriangle, CheckCircle2, Clock3, MapPinned, ShieldCheck, type LucideIcon } from "lucide-react";
import type { EstimatedRouteOption } from "@/lib/routeRisk";
import { getRouteSafetyLabel } from "@/lib/routeRisk";
import { cn } from "@/lib/utils";

interface RouteOptionCardProps {
  option: EstimatedRouteOption;
  active: boolean;
  highlighted?: boolean;
  onSelect: () => void;
  onHover?: (hovered: boolean) => void;
}

export function RouteOptionCard({ option, active, highlighted = false, onSelect, onHover }: RouteOptionCardProps) {
  const confidenceLabel = getRouteSafetyLabel(option.safetyScore);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={cn(
        "grid min-w-0 gap-3 rounded-2xl border p-3 text-left transition duration-200 md:grid-cols-[minmax(0,1fr)_auto] md:items-center",
        active
          ? "border-blue-200/45 bg-blue-400/[0.13] shadow-[0_18px_52px_rgba(37,99,235,0.22)]"
          : highlighted
            ? "border-blue-200/30 bg-blue-300/[0.10]"
            : "border-white/10 bg-slate-950/35 hover:border-blue-200/20 hover:bg-white/[0.07]",
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-white">{option.name}</h3>
          {active ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-100/30 bg-blue-300/[0.16] px-2 py-0.5 text-[0.68rem] font-bold text-blue-50">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              Selected
            </span>
          ) : null}
          <span className={cn("rounded-full border px-2 py-0.5 text-[0.68rem] font-bold", badgeTone(option.badge))}>
            {option.badge}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[0.68rem] font-bold text-slate-400">
            {option.isEstimated ? "Estimated" : option.providerLabel}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-slate-400">{option.description}</p>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs md:w-[360px]">
        <Metric icon={Clock3} label="Time" value={`${option.estimatedMinutes} min`} strong />
        <Metric icon={MapPinned} label="Distance" value={`${option.distanceKm.toFixed(2)} km`} />
        <Metric icon={ShieldCheck} label="Confidence" value={confidenceLabel} />
        <Metric icon={AlertTriangle} label="Uncertain" value={String(option.nearbyDangerZones)} />
      </div>
    </button>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  strong = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/45 p-2">
      <div className="flex min-w-0 items-center gap-1 text-slate-500">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate font-semibold uppercase tracking-[0.08em]">{label}</span>
      </div>
      <div className={cn("mt-1 truncate font-semibold", strong ? "text-blue-100" : "text-slate-100")}>{value}</div>
    </div>
  );
}

function badgeTone(badge: EstimatedRouteOption["badge"]) {
  if (badge === "Recommended") return "border-emerald-200/25 bg-emerald-300/[0.12] text-emerald-100";
  if (badge === "Avoid if possible") return "border-rose-200/[0.35] bg-rose-300/[0.15] text-rose-100";
  if (badge === "Shortest") return "border-blue-200/25 bg-blue-300/[0.12] text-blue-100";
  return "border-sky-200/25 bg-sky-300/[0.12] text-sky-100";
}
