import { Send } from "lucide-react";
import type { ReportIssueType, ReportUrgency, RoutePoint } from "@/types";
import { cn } from "@/lib/utils";

export const ISSUE_TYPES: ReportIssueType[] = [
  "Pickup issue",
  "Drop-off issue",
  "Route issue",
  "Safety concern",
  "Delay",
  "Route blocked",
  "Construction",
  "Road hazard",
  "Other",
];

export const URGENCY_LEVELS: ReportUrgency[] = ["Low", "Medium", "High"];

interface ReportFormProps {
  pickup: RoutePoint | null;
  dropoff: RoutePoint | null;
  issueType: ReportIssueType;
  urgency: ReportUrgency;
  notes: string;
  onIssueTypeChange: (issueType: ReportIssueType) => void;
  onUrgencyChange: (urgency: ReportUrgency) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
}

export function ReportForm({
  pickup,
  dropoff,
  issueType,
  urgency,
  notes,
  onIssueTypeChange,
  onUrgencyChange,
  onNotesChange,
  onSubmit,
}: ReportFormProps) {
  const canSubmit = Boolean(pickup && dropoff);

  return (
    <div className="grid gap-4">
      <div>
        <label htmlFor="issue-type" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          Issue type
        </label>
        <select
          id="issue-type"
          value={issueType}
          onChange={(event) => onIssueTypeChange(event.target.value as ReportIssueType)}
          className="map-input mt-2 min-h-11 font-medium"
        >
          {ISSUE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Urgency</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {URGENCY_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onUrgencyChange(level)}
              className={cn(
                "min-h-10 rounded-lg border px-3 text-sm font-semibold transition",
                urgency === level
                  ? urgencyTone(level)
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07] hover:text-white",
              )}
              aria-pressed={urgency === level}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="report-notes" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          Notes
        </label>
        <textarea
          id="report-notes"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Add context for the operator: curb access, safety concern, delay, or rider instructions."
          className="map-input mt-2 min-h-24 resize-none p-3 leading-6"
        />
      </div>

      <button type="button" className="primary-button w-full" onClick={onSubmit} disabled={!canSubmit}>
        <Send className="size-4" aria-hidden="true" />
        Submit Report
      </button>
    </div>
  );
}

function urgencyTone(level: ReportUrgency) {
  if (level === "High") return "border-rose-200/[0.35] bg-rose-300/[0.15] text-rose-100";
  if (level === "Medium") return "border-amber-200/30 bg-amber-300/[0.15] text-amber-100";
  return "border-emerald-200/25 bg-emerald-300/[0.12] text-emerald-100";
}
