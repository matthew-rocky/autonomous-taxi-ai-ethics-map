import { Eye, Route, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapLayerControlsProps {
  avoidHighRiskZones: boolean;
  showOnlyRouteRisks: boolean;
  className?: string;
  onAvoidHighRiskZonesChange: (enabled: boolean) => void;
  onShowOnlyRouteRisksChange: (enabled: boolean) => void;
}

export function MapLayerControls({
  avoidHighRiskZones,
  showOnlyRouteRisks,
  className,
  onAvoidHighRiskZonesChange,
  onShowOnlyRouteRisksChange,
}: MapLayerControlsProps) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
      <LayerPill
        icon={Shield}
        label="Cautious behavior"
        active={avoidHighRiskZones}
        onClick={() => onAvoidHighRiskZonesChange(!avoidHighRiskZones)}
      />
      <LayerPill
        icon={Eye}
        label="Show route uncertainty"
        active={showOnlyRouteRisks}
        onClick={() => onShowOnlyRouteRisksChange(!showOnlyRouteRisks)}
      />
    </div>
  );
}

function LayerPill({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Route;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 min-w-0 max-w-full items-center gap-2 rounded-lg border px-3 text-xs font-bold transition",
        active
          ? "border-emerald-200/30 bg-emerald-300/[0.13] text-emerald-100 shadow-[0_0_28px_rgba(52,211,153,0.12)]"
          : "border-white/10 bg-white/[0.045] text-slate-400 hover:border-cyan-200/20 hover:text-white",
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  );
}
