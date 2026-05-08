import { Send } from "lucide-react";
import type { ReactNode } from "react";
import { ISSUE_TYPES, URGENCY_LEVELS } from "@/components/ReportForm";
import type { ReportIssueType, ReportUrgency, RoutePoint } from "@/types";
import { cn } from "@/lib/utils";

interface RouteReportPanelProps {
  pickup: RoutePoint | null;
  dropoff: RoutePoint | null;
  issueType: ReportIssueType;
  urgency: ReportUrgency;
  notes: string;
  distanceKm: number | null;
  onIssueTypeChange: (issueType: ReportIssueType) => void;
  onUrgencyChange: (urgency: ReportUrgency) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
}

export function RouteReportPanel({
  pickup,
  dropoff,
  issueType,
  urgency,
  notes,
  distanceKm,
  onIssueTypeChange,
  onUrgencyChange,
  onNotesChange,
  onSubmit,
}: RouteReportPanelProps) {
  const canSubmit = Boolean(pickup && dropoff);

  return (
    <div className="grid gap-4">
      <details className="group rounded-xl border border-white/10 bg-white/[0.035] p-3" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white">
          Report details
          <span className="text-xs font-medium text-slate-500 group-open:hidden">Open</span>
        </summary>
        <div className="mt-4 grid gap-4">
          <FieldLabel label="Issue type">
            <select
              value={issueType}
              onChange={(event) => onIssueTypeChange(event.target.value as ReportIssueType)}
              className="map-input"
            >
              {ISSUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </FieldLabel>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Urgency</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {URGENCY_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onUrgencyChange(level)}
                  className={cn(
                    "min-h-9 rounded-lg border px-3 text-xs font-semibold transition",
                    urgency === level ? urgencyTone(level) : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]",
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <FieldLabel label="Notes">
            <textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Add route context, rider impact, safety notes, or delay details."
              className="map-input min-h-20 resize-none py-3"
            />
          </FieldLabel>
        </div>
      </details>

      <div className="rounded-xl border border-cyan-200/15 bg-cyan-300/[0.055] p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-white">Route summary</span>
          <span className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-xs font-semibold text-slate-300">
            {distanceKm === null ? "Pending" : `${distanceKm.toFixed(2)} km estimated`}
          </span>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-slate-400">
          <SummaryLine label="Pickup" value={pickup?.label ?? "Not selected"} />
          <SummaryLine label="Drop-off" value={dropoff?.label ?? "Not selected"} />
        </div>
      </div>

      <button type="button" className="primary-button min-h-11 w-full" onClick={onSubmit} disabled={!canSubmit}>
        <Send className="size-4" aria-hidden="true" />
        Submit Route Report
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

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-3">
      <span className="font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <span className="truncate text-slate-300">{value}</span>
    </div>
  );
}

function urgencyTone(level: ReportUrgency) {
  if (level === "High") return "border-rose-200/[0.35] bg-rose-300/[0.15] text-rose-100";
  if (level === "Medium") return "border-amber-200/30 bg-amber-300/[0.15] text-amber-100";
  return "border-emerald-200/25 bg-emerald-300/[0.12] text-emerald-100";
}
