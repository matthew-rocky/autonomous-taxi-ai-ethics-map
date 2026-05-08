import { ArrowRight, MapPin, ShieldCheck, X } from "lucide-react";
import type { SafePointSuggestion } from "@/lib/safePointSuggestions";
import { getSeverityStyle } from "@/lib/reportUtils";
import { cn } from "@/lib/utils";

interface SafePointSuggestionsProps {
  suggestions: SafePointSuggestion[];
  onUseSuggestion: (suggestion: SafePointSuggestion) => void;
  onIgnoreSuggestion: (suggestionId: string) => void;
}

export function SafePointSuggestions({ suggestions, onUseSuggestion, onIgnoreSuggestion }: SafePointSuggestionsProps) {
  if (suggestions.length === 0) {
    return (
      <section className="rounded-xl border border-emerald-200/20 bg-emerald-300/[0.09] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-200" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-white">Pickup and drop-off points can proceed with the visible caveat.</h3>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              No active alerts found. This does not guarantee safety.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-cyan-200/20 bg-cyan-300/[0.08] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <ShieldCheck className="size-4 text-emerald-200" aria-hidden="true" />
        Safer pickup/drop-off suggestion
      </div>
      <div className="mt-4 grid gap-3">
        {suggestions.map((suggestion) => {
          const style = getSeverityStyle(suggestion.severity);
          return (
            <article key={suggestion.id} className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold capitalize text-white">
                    <MapPin className="size-4 text-cyan-200" aria-hidden="true" />
                    Safer {suggestion.type} point
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {suggestion.reason} Suggested point is outside the low-confidence buffer.
                  </p>
                </div>
                <span className={cn("rounded-lg border px-2 py-1 text-xs font-bold", style.badgeClass)}>{style.label}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-lg border border-white/10 bg-white/[0.045] px-2.5 py-1.5 text-xs font-semibold text-slate-300">
                  {Math.round(suggestion.distanceAwayKm * 1000)}m away
                </span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="secondary-button min-h-9 px-3 text-xs" onClick={() => onIgnoreSuggestion(suggestion.id)}>
                    <X className="size-3.5" aria-hidden="true" />
                    Ignore
                  </button>
                  <button type="button" className="primary-button min-h-9 px-3 text-xs" onClick={() => onUseSuggestion(suggestion)}>
                    Use safer {suggestion.type}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
