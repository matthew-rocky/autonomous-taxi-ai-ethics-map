import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Clock3,
  GitCompareArrows,
  Loader2,
  LockKeyhole,
  MapPinned,
  Navigation,
  Route,
  Send,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { MapLayerControls } from "@/components/map/MapLayerControls";
import { RouteLayerToggle } from "@/components/map/RouteLayerToggle";
import { RouteOptionCard } from "@/components/map/RouteOptionCard";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { getReportsNearRoute, getRouteSafetyLabel, type EstimatedRouteOption } from "@/lib/routeRisk";
import type { SafePointSuggestion } from "@/lib/safePointSuggestions";
import { cn } from "@/lib/utils";
import type { ConfidenceAssessment, MapReport, RoutePoint } from "@/types";

interface RoutePreviewDrawerProps {
  pickup: RoutePoint | null;
  dropoff: RoutePoint | null;
  reports: MapReport[];
  routeOptions: EstimatedRouteOption[];
  selectedOptionId: EstimatedRouteOption["id"];
  expanded: boolean;
  avoidHighRiskZones: boolean;
  showOnlyRouteRisks: boolean;
  showAllRoutes: boolean;
  hoveredOptionId: EstimatedRouteOption["id"] | null;
  routingLoading: boolean;
  routingError: string;
  providerLabel: string;
  statusMessage: string;
  pickupDisplayLabel: string;
  dropoffDisplayLabel: string;
  safePointSuggestions: SafePointSuggestion[];
  dropoffConfidence: ConfidenceAssessment | null;
  onExpandedChange: (expanded: boolean) => void;
  onSelectedOptionChange: (option: EstimatedRouteOption["id"]) => void;
  onRouteOptionSelected: (option: EstimatedRouteOption) => void;
  onRouteOptionHover: (option: EstimatedRouteOption["id"] | null) => void;
  onAvoidHighRiskZonesChange: (enabled: boolean) => void;
  onShowOnlyRouteRisksChange: (enabled: boolean) => void;
  onShowAllRoutesChange: (showAllRoutes: boolean) => void;
  onUseSafePointSuggestion: (suggestion: SafePointSuggestion) => void;
  onIgnoreSafePointSuggestion: (suggestionId: string) => void;
  onSubmitReport: () => void;
}

export function RoutePreviewDrawer({
  pickup,
  dropoff,
  reports,
  routeOptions,
  selectedOptionId,
  expanded,
  avoidHighRiskZones,
  showOnlyRouteRisks,
  showAllRoutes,
  hoveredOptionId,
  routingLoading,
  routingError,
  providerLabel,
  statusMessage,
  pickupDisplayLabel,
  dropoffDisplayLabel,
  safePointSuggestions,
  dropoffConfidence,
  onExpandedChange,
  onSelectedOptionChange,
  onRouteOptionSelected,
  onRouteOptionHover,
  onAvoidHighRiskZonesChange,
  onShowOnlyRouteRisksChange,
  onShowAllRoutesChange,
  onSubmitReport,
}: RoutePreviewDrawerProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasEndpoints = Boolean(pickup && dropoff);
  const routeReady = Boolean(hasEndpoints && routeOptions.length > 0);
  const activeOption = routeReady ? routeOptions.find((option) => option.id === selectedOptionId) ?? routeOptions[0] : null;
  const activeRisks = pickup && dropoff && activeOption ? getReportsNearRoute(pickup, dropoff, reports, activeOption.routePath) : [];
  const hasRoadRoute = Boolean(activeOption && !activeOption.isEstimated);
  const routeSourceLabel = !hasEndpoints
    ? "Route locked"
    : routingLoading
      ? "Finding route"
      : routeReady
        ? hasRoadRoute
          ? providerLabel
          : "Estimated route"
        : "Route pending";
  const emptyMessage = !pickup
    ? "Select pickup and drop-off to unlock route preview."
    : !dropoff
      ? "Pickup selected. Add drop-off to unlock confidence-aware navigation."
      : routingLoading
        ? "Finding a road-following route. Fallback stays hidden while routing is in progress."
        : "Route preview will appear when routing finishes.";
  const detailsAvailable = Boolean(dropoffConfidence || routeReady || routingError);

  const previewSafestRoute = () => {
    if (!routeReady) return;
    onAvoidHighRiskZonesChange(true);
    onSelectedOptionChange("safest");
    onShowAllRoutesChange(true);
    onExpandedChange(false);
  };

  const compareRoutes = () => {
    if (!routeReady) return;
    setDetailsOpen(false);
    onShowAllRoutesChange(true);
    onExpandedChange(true);
  };

  const toggleDetails = () => {
    if (!detailsAvailable) return;
    const nextDetailsOpen = !detailsOpen;
    setDetailsOpen(nextDetailsOpen);
    if (nextDetailsOpen) onExpandedChange(false);
  };

  const selectRouteOption = (option: EstimatedRouteOption) => {
    onSelectedOptionChange(option.id);
    onExpandedChange(false);
    onRouteOptionSelected(option);
  };

  return (
    <motion.aside
      className={cn(
        "map-dock map-dock-strong route-preview-dock pointer-events-auto mx-auto w-full max-w-[760px] overflow-hidden rounded-3xl border bg-[linear-gradient(145deg,rgba(2,6,23,0.95),rgba(15,23,42,0.9)_54%,rgba(15,47,85,0.82))] shadow-[0_18px_70px_rgba(0,0,0,0.46),0_0_0_1px_rgba(96,165,250,0.08)_inset,0_0_42px_rgba(37,99,235,0.12)] backdrop-blur-2xl",
        routeReady ? "border-blue-200/30" : "border-white/15 opacity-95",
      )}
      initial={{ y: 0, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 0, opacity: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
      aria-label="Route preview and confidence-aware navigation"
    >
      <AnimatePresence initial={false}>
        {expanded && routeReady ? (
          <motion.div
            className="max-h-[36vh] overflow-y-auto border-b border-blue-100/10 px-3 pb-3 pt-3 sm:px-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="metric-label">Compare routes</div>
                <h3 className="mt-1 text-lg font-semibold text-white">Choose a confidence-aware route</h3>
                <p className="mt-1 truncate text-xs text-slate-400">{statusMessage}</p>
              </div>
              <button type="button" className="ghost-button shrink-0" onClick={() => onExpandedChange(false)} aria-label="Close route comparison">
                <X className="size-4" aria-hidden="true" />
                Collapse
              </button>
            </div>

            <div className="mt-3 grid gap-2">
              {routeOptions.map((option) => (
                <RouteOptionCard
                  key={option.id}
                  option={option}
                  active={selectedOptionId === option.id}
                  highlighted={hoveredOptionId === option.id}
                  onSelect={() => selectRouteOption(option)}
                  onHover={(hovered) => onRouteOptionHover(hovered ? option.id : null)}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="space-y-2 px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="flex min-w-[150px] flex-1 items-baseline gap-1.5 truncate text-base font-semibold tracking-normal text-white">
              <span className="shrink-0">Directions</span>
              <span className="min-w-0 truncate text-xs font-bold text-slate-300">
                {activeOption ? activeOption.name.replace(" route", "") : "No route"}
              </span>
            </h2>
            <RouteSourceBadge routeReady={routeReady} routingLoading={routingLoading} label={routeSourceLabel} />
            {dropoffConfidence ? <ConfidenceBadge confidence={dropoffConfidence} compact className="rounded-full px-2.5 py-1" /> : null}
          </div>
          {routingError ? <p className="mt-1 truncate text-xs font-semibold text-amber-200">{routingError}</p> : null}
        </div>

        <EndpointPath pickup={pickup} dropoff={dropoff} pickupLabel={pickupDisplayLabel} dropoffLabel={dropoffDisplayLabel} />

        <CompactRouteSummary
          option={activeOption}
          dangerZoneCount={activeRisks.length}
          routeReady={routeReady}
          recommendation={dropoffConfidence?.action ?? (routeReady ? "Proceed normally" : emptyMessage)}
          detailsOpen={detailsOpen}
          detailsAvailable={detailsAvailable}
          onPreview={previewSafestRoute}
          onCompare={compareRoutes}
          onSubmit={onSubmitReport}
          onToggleDetails={toggleDetails}
        />

        <AnimatePresence initial={false}>
          {detailsOpen && detailsAvailable ? (
            <RouteDecisionDetails
              confidence={dropoffConfidence}
              suggestions={safePointSuggestions}
              routeReady={routeReady}
              showAllRoutes={showAllRoutes}
              avoidHighRiskZones={avoidHighRiskZones}
              showOnlyRouteRisks={showOnlyRouteRisks}
              onShowAllRoutesChange={onShowAllRoutesChange}
              onAvoidHighRiskZonesChange={onAvoidHighRiskZonesChange}
              onShowOnlyRouteRisksChange={onShowOnlyRouteRisksChange}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

function RouteSourceBadge({
  routeReady,
  routingLoading,
  label,
}: {
  routeReady: boolean;
  routingLoading: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
        routeReady || routingLoading ? "border-blue-200/25 bg-blue-300/[0.12] text-blue-100" : "border-white/10 bg-white/[0.045] text-slate-400",
      )}
      title={label}
    >
      {routingLoading ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
      ) : !routeReady ? (
        <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Route className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}

function EndpointPath({
  pickup,
  dropoff,
  pickupLabel,
  dropoffLabel,
}: {
  pickup: RoutePoint | null;
  dropoff: RoutePoint | null;
  pickupLabel: string;
  dropoffLabel: string;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <EndpointToken icon={MapPinned} label="Pickup" value={pickup ? pickupLabel : "Select pickup"} muted={!pickup} />
        <ArrowRight className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
        <EndpointToken icon={Navigation} label="Drop-off" value={dropoff ? dropoffLabel : "Select drop-off"} muted={!dropoff} />
      </div>
    </section>
  );
}

function EndpointToken({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  muted: boolean;
}) {
  return (
    <div className="grid min-w-0 flex-1 grid-cols-[22px_minmax(0,1fr)] items-center gap-1.5">
      <span
        className={cn(
          "flex size-[22px] items-center justify-center rounded-full border",
          muted ? "border-white/10 bg-white/[0.04] text-slate-500" : "border-blue-200/25 bg-blue-300/[0.12] text-blue-100",
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
        <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</span>
        <span className={cn("truncate text-xs font-semibold", muted ? "text-slate-500" : "text-white")} title={value}>
          {value}
        </span>
      </div>
    </div>
  );
}

function RouteDecisionDetails({
  confidence,
  suggestions,
  routeReady,
  showAllRoutes,
  avoidHighRiskZones,
  showOnlyRouteRisks,
  onShowAllRoutesChange,
  onAvoidHighRiskZonesChange,
  onShowOnlyRouteRisksChange,
}: {
  confidence: ConfidenceAssessment | null;
  suggestions: SafePointSuggestion[];
  routeReady: boolean;
  showAllRoutes: boolean;
  avoidHighRiskZones: boolean;
  showOnlyRouteRisks: boolean;
  onShowAllRoutesChange: (showAllRoutes: boolean) => void;
  onAvoidHighRiskZonesChange: (enabled: boolean) => void;
  onShowOnlyRouteRisksChange: (enabled: boolean) => void;
}) {
  const dropoffSuggestion = suggestions.find((suggestion) => suggestion.type === "dropoff");

  return (
    <motion.section
      className="max-h-[38vh] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.045] p-3"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      {confidence ? (
        <div className="space-y-2">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-slate-500">Why this route?</div>
              <p className="mt-1 text-sm font-semibold leading-5 text-white">{confidence.action}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-bold text-slate-300">
              Details
            </span>
          </div>

          <p className="text-xs leading-5 text-slate-300">{confidence.plainSummary}</p>

          <div className="grid gap-1.5 sm:grid-cols-3">
            <MiniTrace label="Original" value={confidence.originalDropoff} />
            <MiniTrace label="Evidence" value={confidence.evidenceState} />
            <MiniTrace
              label="Trade-off"
              value={
                dropoffSuggestion
                  ? `${Math.round(dropoffSuggestion.distanceAwayKm * 1000)}m farther, higher confidence`
                  : confidence.tradeoff ?? "No added walk"
              }
            />
          </div>

          {confidence.evidenceAvailable.length ? (
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {confidence.evidenceAvailable.map((item) => (
                <span
                  key={item}
                  className="max-w-full truncate rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.68rem] font-semibold text-slate-300"
                  title={item}
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          <p className="rounded-lg border border-cyan-200/20 bg-cyan-300/[0.08] p-2 text-xs font-semibold leading-5 text-cyan-50">
            Decision trace: {confidence.accountabilityRule}. Override required: {confidence.overrideRequired ? "Yes" : "No"}.
          </p>
        </div>
      ) : null}

      <div className={cn("mt-3 flex min-w-0 flex-col gap-2 border-t border-white/10 pt-3", !confidence && "mt-0 border-t-0 pt-0")}>
        <RouteLayerToggle
          showAllRoutes={showAllRoutes}
          disabled={!routeReady}
          className="min-w-0"
          onShowAllRoutesChange={onShowAllRoutesChange}
        />
        <MapLayerControls
          avoidHighRiskZones={avoidHighRiskZones}
          showOnlyRouteRisks={showOnlyRouteRisks}
          className="justify-start"
          onAvoidHighRiskZonesChange={onAvoidHighRiskZonesChange}
          onShowOnlyRouteRisksChange={onShowOnlyRouteRisksChange}
        />
      </div>
    </motion.section>
  );
}

function MiniTrace({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-slate-950/35 p-2">
      <div className="text-[0.62rem] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-1 truncate text-xs font-semibold capitalize text-slate-100" title={value}>
        {value}
      </div>
    </div>
  );
}

function CompactRouteSummary({
  option,
  dangerZoneCount,
  routeReady,
  recommendation,
  detailsOpen,
  detailsAvailable,
  onPreview,
  onCompare,
  onSubmit,
  onToggleDetails,
}: {
  option: EstimatedRouteOption | null;
  dangerZoneCount: number;
  routeReady: boolean;
  recommendation: string;
  detailsOpen: boolean;
  detailsAvailable: boolean;
  onPreview: () => void;
  onCompare: () => void;
  onSubmit: () => void;
  onToggleDetails: () => void;
}) {
  const confidenceLabel = option ? getRouteSafetyLabel(option.safetyScore) : "-";

  return (
    <section className={cn("rounded-xl border px-2.5 py-2", routeReady ? "border-blue-200/20 bg-blue-300/[0.08]" : "border-white/10 bg-white/[0.04]")}>
      <div className="flex min-w-0 flex-wrap items-stretch gap-1.5">
        <div className="flex min-w-[140px] flex-[0_0_150px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
          <ShieldCheck className={cn("size-4 shrink-0", routeReady ? "text-emerald-100" : "text-slate-500")} aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-[0.62rem] font-bold uppercase tracking-[0.08em] text-slate-500">Recommendation</div>
            <div className={cn("truncate text-xs font-semibold", routeReady ? "text-white" : "text-slate-400")} title={recommendation}>
              {recommendation}
            </div>
          </div>
        </div>

        <div className="grid min-w-[min(300px,100%)] flex-1 grid-cols-[repeat(auto-fit,minmax(68px,1fr))] gap-1.5">
          <CompactRouteFact icon={Clock3} label="Time" value={option ? `${option.estimatedMinutes} min` : "--"} />
          <CompactRouteFact icon={MapPinned} label="Distance" value={option ? `${option.distanceKm.toFixed(2)} km` : "-"} />
          <CompactRouteFact icon={ShieldCheck} label="Confidence" value={confidenceLabel} toneClass={safetyTone(option?.safetyScore ?? 100)} />
          <CompactRouteFact icon={AlertTriangle} label="Uncertainty" value={option ? String(dangerZoneCount) : "-"} />
        </div>
      </div>

      <div className="mt-1.5 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(92px,1fr))] gap-1.5">
        <RouteActionButton icon={ShieldCheck} label="Preview highest-confidence route" shortLabel="Preview" variant="primary" disabled={!routeReady} onClick={onPreview} />
        <RouteActionButton icon={GitCompareArrows} label="Compare routes" shortLabel="Compare" disabled={!routeReady} onClick={onCompare} />
        <RouteActionButton icon={Send} label="Submit route report" shortLabel="Submit" disabled={!routeReady} onClick={onSubmit} />
        <DetailsToggleButton open={detailsOpen} disabled={!detailsAvailable} onClick={onToggleDetails} />
      </div>
    </section>
  );
}

function CompactRouteFact({
  icon: Icon,
  label,
  value,
  toneClass,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  toneClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-1 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-slate-500">
        <Icon className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "mt-0.5 truncate text-xs font-semibold text-slate-100",
          toneClass && "inline-flex max-w-full rounded-full border px-1.5 py-0.5 text-[0.68rem]",
          toneClass,
        )}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function DetailsToggleButton({
  open,
  disabled,
  onClick,
}: {
  open: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex min-h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.055] px-2.5 text-xs font-bold text-slate-100 transition duration-200 hover:border-blue-200/[0.35] hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
      aria-expanded={open}
      aria-label={open ? "Hide route decision details" : "Show route decision details"}
      title={open ? "Hide route decision details" : "Show route decision details"}
      disabled={disabled}
      onClick={onClick}
    >
      <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" />
      <span className="min-w-0 truncate">{open ? "Hide" : "Details"}</span>
    </button>
  );
}

function RouteActionButton({
  icon: Icon,
  label,
  shortLabel,
  variant = "secondary",
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  shortLabel: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "border-blue-200/30 bg-blue-500 text-white shadow-[0_16px_42px_rgba(37,99,235,0.24)] hover:bg-blue-400"
          : "border-white/[0.12] bg-white/[0.055] text-slate-100 hover:border-blue-200/[0.35] hover:bg-white/[0.09]",
      )}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{shortLabel}</span>
    </button>
  );
}

function safetyTone(score: number) {
  if (score < 30) return "border-rose-200/30 bg-rose-300/[0.12] text-rose-100";
  if (score < 50) return "border-amber-200/30 bg-amber-300/[0.12] text-amber-100";
  if (score < 70) return "border-sky-200/25 bg-sky-300/[0.10] text-sky-100";
  return "border-emerald-200/25 bg-emerald-300/[0.10] text-emerald-100";
}
