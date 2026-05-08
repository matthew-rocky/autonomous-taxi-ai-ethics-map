import { LocateFixed, MapPinned, RotateCcw, Send } from "lucide-react";
import type { ReactNode } from "react";
import { LocationSearch } from "@/components/LocationSearch";
import type { MapInteractionMode, ReportSeverity, RoutePoint } from "@/types";
import { cn } from "@/lib/utils";
import { getSeverityStyle } from "@/lib/reportUtils";

export const AREA_ISSUE_TYPES = [
  "Safety concern",
  "Road hazard",
  "Crowd surge",
  "Blocked pickup area",
  "Construction",
  "Delay zone",
  "Police/emergency activity",
  "Other",
];

export const AREA_RADII = [
  { label: "50m", value: 50 },
  { label: "100m", value: 100 },
  { label: "250m", value: 250 },
  { label: "500m", value: 500 },
  { label: "1km", value: 1000 },
];

const AREA_SEVERITIES: ReportSeverity[] = ["low", "medium", "high", "critical"];

interface AreaReportPanelProps {
  mapInteractionMode: MapInteractionMode;
  areaCenter: RoutePoint | null;
  areaTitle: string;
  areaIssueType: string;
  areaSeverity: ReportSeverity;
  areaRadiusMeters: number;
  areaNotes: string;
  onAreaCenterChange: (point: RoutePoint) => void;
  onStartAreaPlacement: () => void;
  onUseCurrentLocation: () => void;
  onAreaTitleChange: (value: string) => void;
  onAreaIssueTypeChange: (value: string) => void;
  onAreaSeverityChange: (value: ReportSeverity) => void;
  onAreaRadiusChange: (value: number) => void;
  onAreaNotesChange: (value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  onStatus: (message: string) => void;
}

export function AreaReportPanel({
  mapInteractionMode,
  areaCenter,
  areaTitle,
  areaIssueType,
  areaSeverity,
  areaRadiusMeters,
  areaNotes,
  onAreaCenterChange,
  onStartAreaPlacement,
  onUseCurrentLocation,
  onAreaTitleChange,
  onAreaIssueTypeChange,
  onAreaSeverityChange,
  onAreaRadiusChange,
  onAreaNotesChange,
  onSubmit,
  onReset,
  onStatus,
}: AreaReportPanelProps) {
  const canSubmit = Boolean(areaCenter);
  const placingArea = mapInteractionMode === "set-area";

  return (
    <div className="grid gap-4">
      <details className="group rounded-xl border border-white/10 bg-white/[0.035] p-3" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white">
          Location
          <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-100">
            <MapPinned className="size-3.5" aria-hidden="true" />
            Set Area
          </span>
        </summary>
        <div className="mt-4 grid gap-4">
          <button
            type="button"
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition",
              placingArea
                ? "border-cyan-200/[0.45] bg-cyan-300/[0.18] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]",
            )}
            onClick={onStartAreaPlacement}
          >
            <MapPinned className="size-4" aria-hidden="true" />
            {areaCenter ? "Move area" : "Set area"}
          </button>
          {placingArea ? (
            <p className="rounded-lg border border-cyan-200/20 bg-cyan-300/[0.08] px-3 py-2 text-xs font-semibold text-cyan-50">
              Click on the map to place the reported area.
            </p>
          ) : null}

          <LocationSearch
            id="area-location"
            label="Location / address"
            placeholder="Search area center"
            point={areaCenter}
            onSelect={onAreaCenterChange}
            onStatus={onStatus}
          />

          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="secondary-button min-h-10 px-3 text-xs" onClick={onUseCurrentLocation}>
              <LocateFixed className="size-4" aria-hidden="true" />
              Current
            </button>
            <button type="button" className="secondary-button min-h-10 px-3 text-xs" onClick={onReset}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>
      </details>

      <details className="group rounded-xl border border-white/10 bg-white/[0.035] p-3" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white">
          Report details
          <span className="text-xs font-medium text-slate-500 group-open:hidden">Open</span>
        </summary>
        <div className="mt-4 grid gap-4">
          <FieldLabel label="Area title">
            <input
              value={areaTitle}
              onChange={(event) => onAreaTitleChange(event.target.value)}
              placeholder="Example: unsafe curbside queue"
              className="map-input"
            />
          </FieldLabel>

          <FieldLabel label="Issue type">
            <select value={areaIssueType} onChange={(event) => onAreaIssueTypeChange(event.target.value)} className="map-input">
              {AREA_ISSUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </FieldLabel>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Area radius</div>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {AREA_RADII.map((radius) => (
                <button
                  key={radius.value}
                  type="button"
                  onClick={() => onAreaRadiusChange(radius.value)}
                  className={cn(
                    "min-h-9 rounded-lg border px-2 text-xs font-semibold transition",
                    areaRadiusMeters === radius.value
                      ? "border-cyan-200/30 bg-cyan-300/[0.12] text-cyan-100"
                      : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07]",
                  )}
                >
                  {radius.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Severity</div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {AREA_SEVERITIES.map((severity) => {
                const style = getSeverityStyle(severity);
                return (
                  <button
                    key={severity}
                    type="button"
                    onClick={() => onAreaSeverityChange(severity)}
                    className={cn(
                      "min-h-9 rounded-lg border px-2 text-xs font-bold transition",
                      areaSeverity === severity ? style.badgeClass : "border-white/10 bg-white/[0.04] text-slate-500 hover:bg-white/[0.07]",
                    )}
                  >
                    {style.label}
                  </button>
                );
              })}
            </div>
          </div>

          <FieldLabel label="Notes">
            <textarea
              value={areaNotes}
              onChange={(event) => onAreaNotesChange(event.target.value)}
              placeholder="Describe what is happening in this area and what operators should know."
              className="map-input min-h-20 resize-none py-3"
            />
          </FieldLabel>
        </div>
      </details>

      <div className="rounded-xl border border-cyan-200/15 bg-cyan-300/[0.055] p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-white">Area summary</span>
          <span className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-xs font-semibold text-slate-300">
            {areaRadiusMeters >= 1000 ? `${areaRadiusMeters / 1000} km` : `${areaRadiusMeters} m`}
          </span>
        </div>
        <p className="mt-2 truncate text-xs text-slate-400">{areaCenter?.label ?? "Use Set area or search to choose an area center"}</p>
      </div>

      <button type="button" className="primary-button min-h-11 w-full" onClick={onSubmit} disabled={!canSubmit}>
        <Send className="size-4" aria-hidden="true" />
        Submit Area Report
      </button>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
