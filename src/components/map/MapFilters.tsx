import { ChevronDown, Filter, Layers } from "lucide-react";
import { useState } from "react";
import { REPORT_SEVERITIES, REPORT_STATUSES, REPORT_TYPES } from "@/data/reports";
import type { MapFiltersState, ReportKind, ReportSeverity, ReportStatus } from "@/types";
import { cn } from "@/lib/utils";
import { getSeverityStyle, getStatusStyle } from "@/lib/reportUtils";

interface MapFiltersProps {
  filters: MapFiltersState;
  onFiltersChange: (filters: MapFiltersState) => void;
}

export function MapFilters({ filters, onFiltersChange }: MapFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleSeverity = (severity: ReportSeverity) => {
    const severities = filters.severities.includes(severity)
      ? filters.severities.filter((item) => item !== severity)
      : [...filters.severities, severity];
    onFiltersChange({ ...filters, severities });
  };

  const toggleStatus = (status: ReportStatus) => {
    const statuses = filters.statuses.includes(status)
      ? filters.statuses.filter((item) => item !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses });
  };

  const toggleType = (type: string) => {
    const types = filters.types.includes(type)
      ? filters.types.filter((item) => item !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types });
  };

  const toggleKind = (kind: ReportKind) => {
    const kinds = filters.kinds.includes(kind)
      ? filters.kinds.filter((item) => item !== kind)
      : [...filters.kinds, kind];
    onFiltersChange({ ...filters, kinds });
  };

  return (
    <div className="map-dock pointer-events-auto w-full max-w-[360px] rounded-2xl border border-white/[0.12] bg-slate-950/[0.68] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="metric-label">Situation filters</div>
          <h2 className="mt-1 text-lg font-semibold text-white">Map layers</h2>
        </div>
        <button
          type="button"
          className="ghost-button min-h-9 px-2"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          <Filter className="size-4 text-cyan-200" aria-hidden="true" />
          <ChevronDown className={cn("size-4 transition", expanded ? "rotate-180" : "")} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <LayerToggle label="Route reports" active={filters.kinds.includes("route")} onClick={() => toggleKind("route")} />
        <LayerToggle label="Area reports" active={filters.kinds.includes("area")} onClick={() => toggleKind("area")} />
        <LayerToggle label="Markers" active={filters.showReports} onClick={() => onFiltersChange({ ...filters, showReports: !filters.showReports })} />
        <LayerToggle
          label="Uncertainty overlays"
          active={filters.showDangerZones}
          onClick={() => onFiltersChange({ ...filters, showDangerZones: !filters.showDangerZones })}
        />
        <LayerToggle label="Route" active={filters.showRoute} onClick={() => onFiltersChange({ ...filters, showRoute: !filters.showRoute })} />
        <LayerToggle label="Active only" active={filters.onlyActive} onClick={() => onFiltersChange({ ...filters, onlyActive: !filters.onlyActive })} />
      </div>

      {expanded ? (
        <>
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Severity</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {REPORT_SEVERITIES.map((severity) => {
                const active = filters.severities.includes(severity);
                const style = getSeverityStyle(severity);
                return (
                  <button
                    key={severity}
                    type="button"
                    onClick={() => toggleSeverity(severity)}
                    className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-bold transition", active ? style.badgeClass : "border-white/10 bg-white/[0.04] text-slate-500")}
                  >
                    {style.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Status</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {REPORT_STATUSES.map((status) => {
                const active = filters.statuses.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleStatus(status)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-xs font-bold capitalize transition",
                      active ? getStatusStyle(status) : "border-white/10 bg-white/[0.04] text-slate-500",
                    )}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Report type</div>
            <div className="mt-2 flex max-h-28 flex-wrap gap-2 overflow-auto pr-1">
              {REPORT_TYPES.map((type) => {
                const active = filters.types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                      active ? "border-cyan-200/25 bg-cyan-300/[0.12] text-cyan-100" : "border-white/10 bg-white/[0.04] text-slate-500",
                    )}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function LayerToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition",
        active ? "border-cyan-200/25 bg-cyan-300/[0.12] text-cyan-100" : "border-white/10 bg-white/[0.04] text-slate-500",
      )}
      aria-pressed={active}
    >
      <Layers className="size-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
