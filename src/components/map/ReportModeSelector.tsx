import { MapPinned, Route } from "lucide-react";
import type { ReportingMode } from "@/types";
import { cn } from "@/lib/utils";

interface ReportModeSelectorProps {
  mode: ReportingMode;
  onModeChange: (mode: ReportingMode) => void;
}

export function ReportModeSelector({ mode, onModeChange }: ReportModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/[0.045] p-1">
      <ModeButton active={mode === "route"} icon={Route} label="Report Route" onClick={() => onModeChange("route")} />
      <ModeButton active={mode === "area"} icon={MapPinned} label="Report Area" onClick={() => onModeChange("area")} />
    </div>
  );
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Route;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
        active
          ? "bg-cyan-300 text-slate-950 shadow-[0_14px_38px_rgba(34,211,238,0.18)]"
          : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
      )}
      aria-pressed={active}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
