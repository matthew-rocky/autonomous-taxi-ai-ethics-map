import { ArrowRight, MapPin, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { stopDomEvent } from "@/lib/leafletEvents";
import { getSeverityStyle } from "@/lib/reportUtils";
import { endpointLabel } from "@/lib/reverseGeocoding";
import type { SafePointSuggestion } from "@/lib/safePointSuggestions";
import { cn } from "@/lib/utils";

interface SafeSuggestionCalloutProps {
  suggestions: SafePointSuggestion[];
  onUseSuggestion: (suggestion: SafePointSuggestion) => void;
  onIgnoreSuggestion: (suggestionId: string) => void;
}

export function SafeSuggestionCallout({
  suggestions,
  onUseSuggestion,
  onIgnoreSuggestion,
}: SafeSuggestionCalloutProps) {
  const map = useMap();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const update = () => setFrame((current) => current + 1);
    update();
    map.on("move zoom resize viewreset", update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      map.off("move zoom resize viewreset", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [map]);

  const container = document.body;
  const mapRect = map.getContainer().getBoundingClientRect();
  const mapSize = map.getSize();

  const callouts = useMemo(
    () =>
      suggestions.map((suggestion) => {
        const point = map.latLngToContainerPoint([suggestion.point.latitude, suggestion.point.longitude]);
        return {
          suggestion,
          point: {
            x: mapRect.left + point.x,
            y: mapRect.top + point.y,
          },
          alignLeft: point.x > mapSize.x - 380,
          alignBelow: point.y < 210,
        };
      }),
    [frame, map, mapRect.left, mapRect.top, mapSize.x, mapSize.y, suggestions],
  );

  if (!suggestions.length) return null;

  return createPortal(
    <div className="safe-suggestion-callout-layer" aria-live="polite">
      {callouts.map(({ suggestion, point, alignLeft, alignBelow }) => {
        const style = getSeverityStyle(suggestion.severity);
        const endpoint = endpointLabel(suggestion.type);
        const titleEndpoint = endpoint.charAt(0).toUpperCase() + endpoint.slice(1);
        const xOffset = alignLeft ? "calc(-100% - 24px)" : "24px";
        const yOffset = alignBelow ? "18px" : "calc(-100% + 28px)";

        return (
          <article
            key={suggestion.id}
            className={cn(
              "safe-suggestion-callout",
              alignLeft ? "safe-suggestion-callout-left" : "safe-suggestion-callout-right",
              alignBelow ? "safe-suggestion-callout-below" : "safe-suggestion-callout-above",
            )}
            style={{
              left: point.x,
              top: point.y,
              transform: `translate(${xOffset}, ${yOffset})`,
            }}
            onMouseDown={stopDomEvent}
            onClick={stopDomEvent}
          >
            <span className="safe-suggestion-callout-connector" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-white">
                  <ShieldAlert className="size-4 shrink-0 text-emerald-200" aria-hidden="true" />
                  <span className="truncate">Safer {endpoint} suggested</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-300">{suggestion.reason}</p>
              </div>
              <span className={cn("shrink-0 rounded-lg border px-2 py-1 text-[0.68rem] font-bold", style.badgeClass)}>{style.label}</span>
            </div>

            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-emerald-200/20 bg-emerald-300/[0.11] px-2.5 py-1.5 text-emerald-50">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                {Math.round(suggestion.distanceAwayKm * 1000)}m away
              </span>
              <span className="min-w-0 truncate rounded-lg border border-white/10 bg-white/[0.045] px-2.5 py-1.5 text-slate-400">
                Outside low-confidence buffer
              </span>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                className="safe-suggestion-action safe-suggestion-action-primary"
                onClick={(event) => {
                  stopDomEvent(event);
                  onUseSuggestion(suggestion);
                }}
              >
                Use safer {endpoint}
                <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="safe-suggestion-action safe-suggestion-action-secondary"
                onClick={(event) => {
                  stopDomEvent(event);
                  onIgnoreSuggestion(suggestion.id);
                }}
                aria-label={`Ignore safer ${endpoint} suggestion`}
              >
                <X className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Ignore</span>
              </button>
            </div>

            <span className="sr-only">{titleEndpoint} suggestion is pinned near the safer map marker.</span>
          </article>
        );
      })}
    </div>,
    container,
  );
}
