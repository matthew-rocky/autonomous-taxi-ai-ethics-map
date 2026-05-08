import { Layers3, Route } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteLayerToggleProps {
  showAllRoutes: boolean;
  disabled?: boolean;
  className?: string;
  onShowAllRoutesChange: (showAllRoutes: boolean) => void;
}

export function RouteLayerToggle({
  showAllRoutes,
  disabled = false,
  className,
  onShowAllRoutesChange,
}: RouteLayerToggleProps) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.045] p-1",
        disabled && "opacity-55",
        className,
      )}
      aria-label="Route layer visibility"
    >
      <button
        type="button"
        className={cn(
          "inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition disabled:cursor-not-allowed",
          showAllRoutes
            ? "bg-blue-500 text-white shadow-[0_0_28px_rgba(37,99,235,0.22)]"
            : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
        )}
        disabled={disabled}
        aria-pressed={showAllRoutes}
        onClick={() => onShowAllRoutesChange(true)}
      >
        <Layers3 className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">All routes</span>
      </button>
      <button
        type="button"
        className={cn(
          "inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition disabled:cursor-not-allowed",
          !showAllRoutes
            ? "bg-blue-500 text-white shadow-[0_0_28px_rgba(37,99,235,0.22)]"
            : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
        )}
        disabled={disabled}
        aria-pressed={!showAllRoutes}
        onClick={() => onShowAllRoutesChange(false)}
      >
        <Route className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">Selected only</span>
      </button>
    </div>
  );
}
