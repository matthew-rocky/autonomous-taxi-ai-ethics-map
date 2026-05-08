import { Crosshair, LocateFixed, MapPin, Navigation2, RotateCcw } from "lucide-react";
import type { MapPlacementMode, ReportIssueType, ReportUrgency, RoutePoint } from "@/types";
import { cn } from "@/lib/utils";
import { LocationSearch } from "@/components/LocationSearch";
import { ReportForm } from "@/components/ReportForm";

interface MapControlsProps {
  mode: MapPlacementMode;
  pickup: RoutePoint | null;
  dropoff: RoutePoint | null;
  issueType: ReportIssueType;
  urgency: ReportUrgency;
  notes: string;
  distanceKm: number | null;
  statusMessage: string;
  onModeChange: (mode: MapPlacementMode) => void;
  onPickupChange: (point: RoutePoint) => void;
  onDropoffChange: (point: RoutePoint) => void;
  onUseCurrentLocation: () => void;
  onIssueTypeChange: (issueType: ReportIssueType) => void;
  onUrgencyChange: (urgency: ReportUrgency) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  onStatus: (message: string) => void;
}

export function MapControls({
  mode,
  pickup,
  dropoff,
  issueType,
  urgency,
  notes,
  distanceKm,
  statusMessage,
  onModeChange,
  onPickupChange,
  onDropoffChange,
  onUseCurrentLocation,
  onIssueTypeChange,
  onUrgencyChange,
  onNotesChange,
  onSubmit,
  onReset,
  onStatus,
}: MapControlsProps) {
  return (
    <div className="pointer-events-auto w-full max-w-[430px] rounded-lg border border-white/[0.12] bg-slate-950/[0.72] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="metric-label">Live map report</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-white">Report Route</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Place pickup and drop-off pins, add report context, then submit the route for review.
          </p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-cyan-200/25 bg-cyan-300/10 text-cyan-100">
          <Navigation2 className="size-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <ModeButton active={mode === "pickup"} icon={MapPin} label="Add Pickup Pin" onClick={() => onModeChange("pickup")} />
        <ModeButton active={mode === "dropoff"} icon={Crosshair} label="Add Drop-off Pin" onClick={() => onModeChange("dropoff")} />
      </div>

      <div className="mt-5 grid gap-4">
        <LocationSearch
          id="pickup-location"
          label="Pickup location"
          placeholder="Search pickup address"
          point={pickup}
          onSelect={onPickupChange}
          onStatus={onStatus}
        />
        <LocationSearch
          id="dropoff-location"
          label="Drop-off location"
          placeholder="Search drop-off address"
          point={dropoff}
          onSelect={onDropoffChange}
          onStatus={onStatus}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="secondary-button" onClick={onUseCurrentLocation}>
          <LocateFixed className="size-4" aria-hidden="true" />
          Current Location
        </button>
        <button type="button" className="secondary-button" onClick={onReset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-cyan-200/20 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-50">
        {statusMessage}
      </div>

      <RouteSummary pickup={pickup} dropoff={dropoff} distanceKm={distanceKm} />

      <div className="mt-5 border-t border-white/10 pt-5">
        <ReportForm
          pickup={pickup}
          dropoff={dropoff}
          issueType={issueType}
          urgency={urgency}
          notes={notes}
          onIssueTypeChange={onIssueTypeChange}
          onUrgencyChange={onUrgencyChange}
          onNotesChange={onNotesChange}
          onSubmit={onSubmit}
        />
      </div>
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
  icon: typeof MapPin;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
        active
          ? "border-cyan-200/[0.35] bg-cyan-300/[0.15] text-cyan-100 shadow-[0_12px_34px_rgba(34,211,238,0.12)]"
          : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07] hover:text-white",
      )}
      aria-pressed={active}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function RouteSummary({
  pickup,
  dropoff,
  distanceKm,
}: {
  pickup: RoutePoint | null;
  dropoff: RoutePoint | null;
  distanceKm: number | null;
}) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">Report summary</h2>
        <span className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-xs font-semibold text-slate-300">
          {distanceKm === null ? "No route" : `${distanceKm.toFixed(2)} km estimated`}
        </span>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <SummaryRow label="Pickup" value={pickup?.label ?? "Click map or search to set pickup"} active={Boolean(pickup)} />
        <SummaryRow label="Drop-off" value={dropoff?.label ?? "Click map or search to set drop-off"} active={Boolean(dropoff)} />
      </div>
    </div>
  );
}

function SummaryRow({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <span className={cn("truncate", active ? "text-slate-100" : "text-slate-500")}>{value}</span>
    </div>
  );
}
