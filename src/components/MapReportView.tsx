import { AnimatePresence, motion } from "framer-motion";
import L from "leaflet";
import { CheckCircle2, Info, Layers3, MapPinned, Navigation, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Circle, CircleMarker, Marker, Pane, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { bywardUnfoldingReports, initialMapFilters, mockReports } from "@/data/reports";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { AreaReportPanel } from "@/components/map/AreaReportPanel";
import { DangerZoneLayer } from "@/components/map/DangerZoneLayer";
import { LocationPlacementDock } from "@/components/map/LocationPlacementDock";
import { MapFilters } from "@/components/map/MapFilters";
import { MapLegend } from "@/components/map/MapLegend";
import { ReportMarker } from "@/components/map/ReportMarker";
import { ReportModeSelector } from "@/components/map/ReportModeSelector";
import { OttawaMapCanvas, OTTAWA_CENTER_POSITION } from "@/components/map/OttawaMapCanvas";
import { RoutePointMarker } from "@/components/map/RoutePointMarker";
import { RoutePreviewDrawer } from "@/components/map/RoutePreviewDrawer";
import { RouteRiskWarning } from "@/components/map/RouteRiskWarning";
import { RouteReportPanel } from "@/components/map/RouteReportPanel";
import { SafeSuggestionCallout } from "@/components/map/SafeSuggestionCallout";
import { SituationSummary } from "@/components/map/SituationSummary";
import { haversineKm } from "@/lib/ethicsEngine";
import { stopLeafletEvent } from "@/lib/leafletEvents";
import { getReportsFromApi, patchReportStatus, postReportToApi, reportsApiEnabled } from "@/lib/reportApi";
import { assessMapDropoffConfidence } from "@/lib/confidence";
import { createAreaReport, createRouteReport, filterReports, getReportKind, getSeverityStyle, routeRiskReports } from "@/lib/reportUtils";
import { endpointLabel, getRoutePointDisplayLabel, reverseGeocodePoint } from "@/lib/reverseGeocoding";
import {
  generateEstimatedRouteOptions,
  getReportsNearRoute,
  getRouteSafetyLabel,
  type EstimatedRouteOption,
} from "@/lib/routeRisk";
import { fetchRoadRouteOptions } from "@/lib/routing";
import { getSafePickupDropoffSuggestions, type SafePointSuggestion, type SafePointSuggestionWarning } from "@/lib/safePointSuggestions";
import { cn, confidenceMapColor } from "@/lib/utils";
import type {
  ConfidenceAssessment,
  GeoPoint,
  MapFiltersState,
  MapInteractionMode,
  MapReport,
  ReportingMode,
  ReportIssueType,
  ReportSeverity,
  ReportUrgency,
  RoutePoint,
} from "@/types";

interface SubmittedReport {
  kind: ReportingMode;
  issueType: string;
  summary: string;
  submittedAt: string;
}

export function MapReportView() {
  const [reportingMode, setReportingMode] = useState<ReportingMode>("route");
  const [mapInteractionMode, setMapInteractionMode] = useState<MapInteractionMode>("explore");
  const [pickup, setPickup] = useState<RoutePoint | null>(null);
  const [dropoff, setDropoff] = useState<RoutePoint | null>(null);
  const [issueType, setIssueType] = useState<ReportIssueType>("Pickup issue");
  const [urgency, setUrgency] = useState<ReportUrgency>("Medium");
  const [notes, setNotes] = useState("");
  const [areaCenter, setAreaCenter] = useState<RoutePoint | null>(null);
  const [areaTitle, setAreaTitle] = useState("");
  const [areaIssueType, setAreaIssueType] = useState("Safety concern");
  const [areaSeverity, setAreaSeverity] = useState<ReportSeverity>("medium");
  const [areaRadiusMeters, setAreaRadiusMeters] = useState(250);
  const [areaNotes, setAreaNotes] = useState("");
  const [focusPoint, setFocusPoint] = useState<GeoPoint | null>(null);
  const [statusMessage, setStatusMessage] = useState("Explore mode active. Use the top location dock before placing pickup or drop-off.");
  const [submittedReport, setSubmittedReport] = useState<SubmittedReport | null>(null);
  const [reports, setReports] = useState<MapReport[]>(mockReports);
  const [filters, setFilters] = useState<MapFiltersState>(initialMapFilters);
  const [dataWarning, setDataWarning] = useState("");
  const [routePreviewOpen, setRoutePreviewOpen] = useState(false);
  const [selectedRouteOption, setSelectedRouteOption] = useState<EstimatedRouteOption["id"]>("safest");
  const [avoidHighRiskZones, setAvoidHighRiskZones] = useState(true);
  const [showOnlyRouteRisks, setShowOnlyRouteRisks] = useState(false);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [hoveredRouteOption, setHoveredRouteOption] = useState<EstimatedRouteOption["id"] | null>(null);
  const [roadRouteOptions, setRoadRouteOptions] = useState<EstimatedRouteOption[] | null>(null);
  const [routeProviderLabel, setRouteProviderLabel] = useState("Estimated fallback");
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState("");
  const [safePointSuggestions, setSafePointSuggestions] = useState<SafePointSuggestion[]>([]);
  const [safePointSuggestionWarnings, setSafePointSuggestionWarnings] = useState<SafePointSuggestionWarning[]>([]);
  const [safePointSuggestionsLoading, setSafePointSuggestionsLoading] = useState(false);
  const [ignoredSafeSuggestionIds, setIgnoredSafeSuggestionIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState("");
  const [mobileSheet, setMobileSheet] = useState<"report" | "layers" | "status" | null>(null);
  const mapShellRef = useRef<HTMLElement | null>(null);
  const compactMapLayout = useMediaQuery("(max-width: 1023px)");
  const hasRouteSelection = Boolean(pickup && dropoff && reportingMode === "route");
  const placementActive = mapInteractionMode !== "explore";
  const pickupDisplayLabel = useReverseGeocodedRouteLabel(pickup, "pickup");
  const dropoffDisplayLabel = useReverseGeocodedRouteLabel(dropoff, "dropoff");

  const distanceKm = useMemo(() => {
    if (!pickup || !dropoff) return null;
    return haversineKm(pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude);
  }, [dropoff, pickup]);

  const visibleReports = useMemo(() => filterReports(reports, filters), [filters, reports]);
  const estimatedRouteOptions = useMemo(
    () => (pickup && dropoff ? generateEstimatedRouteOptions(pickup, dropoff, visibleReports) : []),
    [dropoff, pickup, visibleReports],
  );
  const routingFailed = Boolean(routingError) && !routingLoading;
  const useEstimatedFallbackRoutes = hasRouteSelection && routingFailed && !roadRouteOptions?.length;
  const routeOptions = roadRouteOptions?.length ? roadRouteOptions : useEstimatedFallbackRoutes ? estimatedRouteOptions : [];
  const activeRouteOption = routeOptions.find((option) => option.id === selectedRouteOption) ?? routeOptions[0] ?? null;
  const routePositions = activeRouteOption ? activeRouteOption.routePath.map(pointToPosition) : [];
  const routeLayerKey = routeLayerSignature(pickup, dropoff, routeOptions, routingFailed);
  const routeOverlayActive = routePreviewOpen || showAllRoutes;
  const routeOptionLines = hasRouteSelection && showAllRoutes ? routeOptions.map((option) => ({
    option,
    positions: option.routePath.map(pointToPosition),
  })) : [];
  const nearbyRouteRisks = useMemo(
    () => (pickup && dropoff && activeRouteOption ? getReportsNearRoute(pickup, dropoff, visibleReports, activeRouteOption.routePath) : []),
    [activeRouteOption, dropoff, pickup, visibleReports],
  );
  const nearbyRouteRiskIds = useMemo(() => nearbyRouteRisks.map((risk) => risk.report.id), [nearbyRouteRisks]);
  const reportsForMap = useMemo(
    () =>
      showOnlyRouteRisks && hasRouteSelection
        ? visibleReports.filter((report) => nearbyRouteRiskIds.includes(report.id))
        : visibleReports,
    [hasRouteSelection, nearbyRouteRiskIds, showOnlyRouteRisks, visibleReports],
  );
  const activeSafePointSuggestions = useMemo(
    () => safePointSuggestions.filter((suggestion) => !ignoredSafeSuggestionIds.includes(suggestion.id)),
    [ignoredSafeSuggestionIds, safePointSuggestions],
  );
  const dropoffConfidence = useMemo(
    () =>
      assessMapDropoffConfidence(dropoff, visibleReports, {
        saferHandoffPoint: activeSafePointSuggestions.find((suggestion) => suggestion.type === "dropoff")?.point.label,
      }),
    [activeSafePointSuggestions, dropoff, visibleReports],
  );
  const riskyRouteReports = useMemo(
    () =>
      nearbyRouteRisks.length
        ? nearbyRouteRisks.filter((risk) => risk.severity === "high" || risk.severity === "critical").map((risk) => risk.report)
        : routeRiskReports(pickup, dropoff, visibleReports),
    [dropoff, nearbyRouteRisks, pickup, visibleReports],
  );
  const selectedAreaStyle = getSeverityStyle(areaSeverity);

  useEffect(() => {
    if (!reportsApiEnabled) return;
    void getReportsFromApi()
      .then((apiReports) => {
        if (apiReports?.length) setReports(apiReports);
      })
      .catch(() => {
        setDataWarning("Report API unavailable. Showing local situational mock data.");
      });
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    setMobileSheet(null);
  }, [reportingMode]);

  useEffect(() => {
    if (mapInteractionMode === "explore") return;

    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMapInteractionMode("explore");
      setStatusMessage("Placement canceled. Explore mode active.");
    };

    window.addEventListener("keydown", cancelOnEscape);
    return () => window.removeEventListener("keydown", cancelOnEscape);
  }, [mapInteractionMode]);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setRoadRouteOptions(null);
      setRouteProviderLabel("Estimated fallback");
      setRoutingError("");
      setRoutingLoading(false);
      setShowAllRoutes(false);
      return;
    }

    const controller = new AbortController();
    setRoadRouteOptions(null);
    setRoutingLoading(true);
    setRoutingError("");
    setRouteProviderLabel("Finding road route");

    void fetchRoadRouteOptions(pickup, dropoff, visibleReports, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result?.options.length) {
          setRoadRouteOptions(result.options);
          setRouteProviderLabel(result.providerLabel);
          return;
        }

        setRoadRouteOptions(null);
        setRouteProviderLabel("Estimated fallback");
        setRoutingError(import.meta.env.DEV ? "Road routing unavailable; using estimated fallback." : "No routing key; using estimated fallback.");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setRoadRouteOptions(null);
        setRouteProviderLabel("Estimated fallback");
        setRoutingError(error instanceof Error ? "Routing failed; using estimated fallback." : "Using estimated fallback.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setRoutingLoading(false);
      });

    return () => controller.abort();
  }, [dropoff, pickup, visibleReports]);

  useEffect(() => {
    setSafePointSuggestions([]);
    setSafePointSuggestionWarnings([]);

    if (!pickup && !dropoff) {
      setSafePointSuggestionsLoading(false);
      return;
    }

    const controller = new AbortController();
    setSafePointSuggestionsLoading(true);

    void getSafePickupDropoffSuggestions(pickup, dropoff, visibleReports, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setSafePointSuggestions(result.suggestions);
        setSafePointSuggestionWarnings(result.warnings);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSafePointSuggestions([]);
          setSafePointSuggestionWarnings([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSafePointSuggestionsLoading(false);
      });

    return () => controller.abort();
  }, [dropoff, pickup, visibleReports]);

  const clearCurrentRouteGeometry = () => {
    setRoadRouteOptions(null);
    setRouteProviderLabel("Finding road route");
    setRoutingError("");
    setRoutingLoading(false);
    setHoveredRouteOption(null);
  };

  const placePoint = (interactionMode: MapInteractionMode, point: RoutePoint) => {
    if (interactionMode === "explore") return;

    if (interactionMode === "set-area") {
      setAreaCenter(point);
      setFocusPoint(point);
      setSubmittedReport(null);
      setMapInteractionMode("explore");
      setStatusMessage("Area center placed. Adjust the radius and report details before submitting.");
      return;
    }

    if (interactionMode === "set-pickup") {
      clearCurrentRouteGeometry();
      setPickup(point);
      setStatusMessage("Pickup placed. Explore mode active. Use Drop-off in the top dock when you are ready.");
      setShowAllRoutes(false);
    } else {
      clearCurrentRouteGeometry();
      setDropoff(point);
      setStatusMessage("Drop-off placed. Explore mode active. Review the route summary or select a route.");
      setSelectedRouteOption("safest");
      setShowAllRoutes(false);
    }
    setFocusPoint(point);
    setSubmittedReport(null);
    setIgnoredSafeSuggestionIds([]);
    setMapInteractionMode("explore");
    if (interactionMode === "set-pickup") {
      setRoutePreviewOpen(false);
      setSelectedRouteOption("safest");
      setShowAllRoutes(false);
    }
  };

  const changeReportingMode = (nextMode: ReportingMode) => {
    setReportingMode(nextMode);
    setMapInteractionMode("explore");
    if (nextMode === "area") {
      setRoutePreviewOpen(false);
      setShowAllRoutes(false);
    }
    setStatusMessage(
      nextMode === "area"
        ? "Report Area mode active. Use Set area before placing the reported area."
        : "Report Route mode active. Use Pickup or Drop-off in the top dock before placing route points.",
    );
  };

  const setPickupFromDock = (point: RoutePoint) => {
    clearCurrentRouteGeometry();
    setPickup(point);
    setFocusPoint(point);
    setMapInteractionMode("explore");
    setSubmittedReport(null);
    setRoutePreviewOpen(false);
    setSelectedRouteOption("safest");
    setShowAllRoutes(false);
    setIgnoredSafeSuggestionIds([]);
  };

  const setDropoffFromDock = (point: RoutePoint) => {
    clearCurrentRouteGeometry();
    setDropoff(point);
    setFocusPoint(point);
    setMapInteractionMode("explore");
    setSubmittedReport(null);
    setSelectedRouteOption("safest");
    setShowAllRoutes(false);
    setIgnoredSafeSuggestionIds([]);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage("Browser geolocation is unavailable. Use Pickup in the top dock to place it manually.");
      return;
    }

    setStatusMessage("Requesting browser location permission...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point: RoutePoint = {
          label: "Current browser location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "geolocation",
        };
        setPickupFromDock(point);
        setStatusMessage("Current location added as pickup. Explore mode active. Use Drop-off in the top dock to set the drop-off.");
      },
      () => {
        setStatusMessage("Location permission was blocked or unavailable. Use Pickup in the top dock to place it manually.");
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60_000 },
    );
  };

  const useCurrentAreaLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage("Browser geolocation is unavailable. Search or click the map to set the area center.");
      return;
    }

    setStatusMessage("Requesting browser location permission...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point: RoutePoint = {
          label: "Current browser location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "geolocation",
        };
        setAreaCenter(point);
        setFocusPoint(point);
        setMapInteractionMode("explore");
        setStatusMessage("Current location added as area center. Adjust the radius and submit when ready.");
        setSubmittedReport(null);
      },
      () => {
        setStatusMessage("Location permission was blocked or unavailable. Search or click the map manually.");
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60_000 },
    );
  };

  const submitRouteReport = () => {
    if (!pickup || !dropoff || distanceKm === null) {
      setStatusMessage("Add both pickup and drop-off pins before submitting the report.");
      return;
    }

    const mapReport = createRouteReport({ pickup, dropoff, issueType, urgency, notes });

    setReports((current) => [mapReport, ...current]);
    void postReportToApi(mapReport).catch(() => {
      if (reportsApiEnabled) setDataWarning("Report saved locally because the report API did not accept the submission.");
    });

    const report: SubmittedReport = {
      kind: "route",
      issueType,
      summary: `${urgency} urgency - ${distanceKm.toFixed(2)} km estimated route`,
      submittedAt: new Date().toLocaleString(),
    };
    setSubmittedReport(report);
    setStatusMessage("Route report submitted. It is now visible on the map.");
  };

  const submitAreaReport = () => {
    if (!areaCenter) {
      setStatusMessage("Set an area center before submitting the area report.");
      return;
    }

    const mapReport = createAreaReport({
      center: areaCenter,
      title: areaTitle,
      issueType: areaIssueType,
      severity: areaSeverity,
      notes: areaNotes,
      radiusMeters: areaRadiusMeters,
    });

    setReports((current) => [mapReport, ...current]);
    void postReportToApi(mapReport).catch(() => {
      if (reportsApiEnabled) setDataWarning("Area report saved locally because the report API did not accept the submission.");
    });

    setSubmittedReport({
      kind: "area",
      issueType: areaIssueType,
      summary: `${getSeverityStyle(areaSeverity).label} area - ${
        areaRadiusMeters >= 1000 ? `${areaRadiusMeters / 1000} km` : `${areaRadiusMeters} m`
      } radius`,
      submittedAt: new Date().toLocaleString(),
    });
    setStatusMessage("Area report submitted. The new marker and uncertainty overlay are live on the map.");
  };

  const resolveReport = (reportId: string) => {
    setReports((current) =>
      current.map((report) => (report.id === reportId ? { ...report, status: "resolved" } : report)),
    );
    void patchReportStatus(reportId, "resolved").catch(() => {
      if (reportsApiEnabled) setDataWarning("Report marked resolved locally because the report API is unavailable.");
    });
    setStatusMessage("Report marked as resolved on this map.");
  };

  const resetRoute = () => {
    setPickup(null);
    setDropoff(null);
    setMapInteractionMode("explore");
    setNotes("");
    setIssueType("Pickup issue");
    setUrgency("Medium");
    setSubmittedReport(null);
    setFocusPoint(null);
    setRoutePreviewOpen(false);
    setSelectedRouteOption("safest");
    setHoveredRouteOption(null);
    setAvoidHighRiskZones(true);
    setShowAllRoutes(false);
    setShowOnlyRouteRisks(false);
    setRoadRouteOptions(null);
    setRouteProviderLabel("Estimated fallback");
    setRoutingError("");
    setRoutingLoading(false);
    setIgnoredSafeSuggestionIds([]);
    setStatusMessage("Route cleared. Explore mode active. Use Pickup or Drop-off in the top dock before placing route points.");
  };

  const resetArea = () => {
    setAreaCenter(null);
    setAreaTitle("");
    setAreaIssueType("Safety concern");
    setAreaSeverity("medium");
    setAreaRadiusMeters(250);
    setAreaNotes("");
    setSubmittedReport(null);
    setFocusPoint(null);
    setMapInteractionMode("explore");
    setStatusMessage("Area report cleared. Use Set area before placing a new area center.");
  };

  const changeAvoidHighRiskZones = (enabled: boolean) => {
    setAvoidHighRiskZones(enabled);
    if (enabled) {
      setSelectedRouteOption("safest");
      if (pickup && dropoff) setShowAllRoutes(true);
      setStatusMessage("Cautious behavior enabled. The highest-confidence available route is selected.");
    } else {
      setStatusMessage("Cautious behavior disabled. Compare route options before submitting.");
    }
  };

  const changeSelectedRouteOption = (option: EstimatedRouteOption["id"]) => {
    setSelectedRouteOption(option);
    if (option !== "safest") setAvoidHighRiskZones(false);
  };

  const startPlacementMode = (interactionMode: Exclude<MapInteractionMode, "explore">) => {
    setMapInteractionMode(interactionMode);
    setStatusMessage(
      interactionMode === "set-pickup"
        ? "Click map to place pickup."
        : interactionMode === "set-dropoff"
          ? "Click map to place drop-off."
          : "Click map to place the reported area.",
    );
  };

  const cancelPlacementMode = () => {
    setMapInteractionMode("explore");
    setStatusMessage("Placement canceled. Explore mode active.");
  };

  const handleRouteOptionSelected = (option: EstimatedRouteOption) => {
    setShowAllRoutes(true);
    setToastMessage(routeSelectionToast(option));
    window.requestAnimationFrame(() => mapShellRef.current?.focus());
  };

  const selectRouteFromMap = (option: EstimatedRouteOption, event?: L.LeafletEvent) => {
    if (event) stopLeafletEvent(event);
    changeSelectedRouteOption(option.id);
    setShowAllRoutes(true);
    setToastMessage(routeSelectionToast(option));
  };

  const useSafePointSuggestion = (suggestion: SafePointSuggestion) => {
    const endpoint = endpointLabel(suggestion.type);
    const routeWillRemainComplete = suggestion.type === "pickup" ? Boolean(dropoff) : Boolean(pickup);
    clearCurrentRouteGeometry();
    if (suggestion.type === "pickup") {
      setPickup(suggestion.point);
    } else {
      setDropoff(suggestion.point);
    }
    setFocusPoint(suggestion.point);
    setMapInteractionMode("explore");
    setSelectedRouteOption("safest");
    setRoutePreviewOpen(false);
    setShowAllRoutes(routeWillRemainComplete);
    setIgnoredSafeSuggestionIds([]);
    setSubmittedReport(null);
    setToastMessage(`Safer ${endpoint} applied`);
    setStatusMessage(`Applied safer ${endpoint} point ${Math.round(suggestion.distanceAwayKm * 1000)}m away from the low-confidence area.`);
  };

  const ignoreSafePointSuggestion = (suggestionId: string) => {
    setIgnoredSafeSuggestionIds((current) => [...new Set([...current, suggestionId])]);
    setToastMessage("Safer point suggestion ignored");
  };

  const loadByWardCaseStudy = () => {
    const casePickup: RoutePoint = {
      label: "Mackenzie King Bridge Entrance",
      latitude: 45.424,
      longitude: -75.6884,
      source: "manual",
    };
    const caseDropoff: RoutePoint = {
      label: "ByWard Market",
      latitude: 45.4289,
      longitude: -75.6927,
      source: "manual",
    };

    clearCurrentRouteGeometry();
    setReports(bywardUnfoldingReports());
    setReportingMode("route");
    setPickup(casePickup);
    setDropoff(caseDropoff);
    setFocusPoint(caseDropoff);
    setMapInteractionMode("explore");
    setSelectedRouteOption("safest");
    setRoutePreviewOpen(!compactMapLayout);
    setShowAllRoutes(true);
    setShowOnlyRouteRisks(false);
    setAvoidHighRiskZones(true);
    setIgnoredSafeSuggestionIds([]);
    setSubmittedReport(null);
    setMobileSheet(null);
    setStatusMessage(
      "ByWard Market: Unfolding Incident loaded. Destination conditions are uncertain because signals are sparse, conflicting, or not recently verified.",
    );
  };

  const reportPanelContent = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="metric-label">Live confidence map</div>
          <h1 className="mt-1 text-xl font-semibold tracking-normal text-white sm:text-2xl">
            {reportingMode === "route" ? "Confidence-Aware Route" : "Report Area"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {reportingMode === "route"
              ? "Choose pickup and drop-off points; the system shows uncertainty instead of pretending perfect detection."
              : "Report a specific area, radius, and severity directly on the map."}
          </p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-cyan-200/25 bg-cyan-300/10 text-cyan-100">
          <Navigation className="size-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4">
        <ReportModeSelector mode={reportingMode} onModeChange={changeReportingMode} />
      </div>

      <button
        type="button"
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-orange-200/25 bg-orange-300/[0.10] px-3 text-sm font-bold text-orange-100 transition hover:bg-orange-300/[0.16]"
        onClick={loadByWardCaseStudy}
      >
        <MapPinned className="size-4" aria-hidden="true" />
        ByWard Market: Unfolding Incident
      </button>

      <div className="mt-4 rounded-lg border border-cyan-200/20 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-50">
        {statusMessage}
      </div>
      {reportingMode === "route" && dropoffConfidence ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <ConfidenceBadge confidence={dropoffConfidence} />
          <p className="mt-2 text-xs leading-5 text-slate-300">
            {dropoffConfidence.noAlertMessage}
          </p>
        </div>
      ) : null}
      {reportingMode === "route" && safePointSuggestionsLoading ? (
        <div className="mt-3 rounded-lg border border-cyan-200/20 bg-cyan-300/[0.08] p-3 text-xs font-semibold leading-5 text-cyan-50">
          Checking nearby road-accessible handoff points...
        </div>
      ) : null}
      {reportingMode === "route" && activeSafePointSuggestions.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-200/25 bg-amber-300/[0.10] p-3 text-xs font-semibold leading-5 text-amber-50">
          {activeSafePointSuggestions.map((suggestion) => `Safer ${endpointLabel(suggestion.type)} suggested`).join(" and ")} near a low-confidence area.
        </div>
      ) : null}
      {reportingMode === "route" && !safePointSuggestionsLoading && safePointSuggestionWarnings.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-200/25 bg-slate-950/65 p-3 text-xs font-semibold leading-5 text-amber-50">
          No higher-confidence road-accessible suggestion found nearby. Try choosing a different pickup/drop-off location.
        </div>
      ) : null}

      <div className="mt-4">
        {reportingMode === "route" ? (
          <RouteReportPanel
            pickup={pickup}
            dropoff={dropoff}
            issueType={issueType}
            urgency={urgency}
            notes={notes}
            distanceKm={distanceKm}
            onIssueTypeChange={setIssueType}
            onUrgencyChange={setUrgency}
            onNotesChange={setNotes}
            onSubmit={submitRouteReport}
          />
        ) : (
          <AreaReportPanel
            mapInteractionMode={mapInteractionMode}
            areaCenter={areaCenter}
            areaTitle={areaTitle}
            areaIssueType={areaIssueType}
            areaSeverity={areaSeverity}
            areaRadiusMeters={areaRadiusMeters}
            areaNotes={areaNotes}
            onAreaCenterChange={(point) => {
              setAreaCenter(point);
              setFocusPoint(point);
              setMapInteractionMode("explore");
              setSubmittedReport(null);
            }}
            onStartAreaPlacement={() => startPlacementMode("set-area")}
            onUseCurrentLocation={useCurrentAreaLocation}
            onAreaTitleChange={setAreaTitle}
            onAreaIssueTypeChange={setAreaIssueType}
            onAreaSeverityChange={setAreaSeverity}
            onAreaRadiusChange={setAreaRadiusMeters}
            onAreaNotesChange={setAreaNotes}
            onSubmit={submitAreaReport}
            onReset={resetArea}
            onStatus={setStatusMessage}
          />
        )}
      </div>
    </>
  );

  const signalPanelContent = (
    <>
      <SituationSummary reports={visibleReports} pickup={pickup} dropoff={dropoff} />
      <MapFilters filters={filters} onFiltersChange={setFilters} />
      <div className="map-dock pointer-events-auto rounded-2xl border border-white/[0.12] bg-slate-950/65 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="metric-label">Confidence intelligence</div>
            <h2 className="mt-1 text-lg font-semibold text-white">Live signal state</h2>
          </div>
          <Info className="size-5 text-cyan-200" aria-hidden="true" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StateMetric label="Pickup" value={pickup ? "Set" : "Open"} />
          <StateMetric label="Drop-off" value={dropoff ? "Set" : "Open"} />
          <StateMetric label="Confidence" value={dropoffConfidence?.label ?? "Open"} />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-300">
          {dataWarning || "No active alerts does not guarantee safety. Confidence is recalculated as signals change."}
        </p>
      </div>
      <MapLegend />
    </>
  );

  const areaStatusContent = reportingMode === "area" ? (
    <>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-violet-200/25 bg-violet-300/10 text-violet-100">
          {submittedReport ? <CheckCircle2 className="size-5" aria-hidden="true" /> : <MapPinned className="size-5" aria-hidden="true" />}
        </span>
        <div>
          <h2 className="font-semibold text-white">
            {submittedReport ? "Report submitted" : "Click-to-place area reporting"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {submittedReport
              ? `${submittedReport.kind === "route" ? "Route" : "Area"} report - ${submittedReport.issueType} - ${
                  submittedReport.summary
                } - ${submittedReport.submittedAt}`
              : "Click directly on the map, search a place, or use current location to set the reported area."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100 md:justify-end">
        <Navigation className="size-4" aria-hidden="true" />
        {mapInteractionMode === "set-area" ? "Click map to place area" : "Explore mode active"}
      </div>
    </>
  ) : null;

  return (
    <section
      ref={mapShellRef}
      tabIndex={-1}
      className="isolate relative -mx-3 -mt-2 h-[calc(100svh-7.75rem)] min-h-[520px] overflow-hidden outline-none sm:-mx-5 sm:h-[calc(100svh-8rem)] sm:min-h-[620px] lg:-mx-8 lg:h-[calc(100vh-73px)] lg:min-h-[760px] 2xl:-mx-10"
    >
      <div className="absolute inset-0 z-0">
        <OttawaMapCanvas
          zoom={13}
          minZoom={11}
          maxZoom={19}
          scrollWheelZoom
          className={cn(mapInteractionMode !== "explore" && "map-placement-active")}
          zoomControlPosition="bottomright"
        >
          <InvalidateMapSize trigger={`${compactMapLayout}-${mobileSheet ?? "closed"}-${routePreviewOpen}-${reportingMode}`} />
          <MapClickHandler
            interactionMode={mapInteractionMode}
            onPlace={(interactionMode, point) => placePoint(interactionMode, point)}
          />
          <RecenterMap point={focusPoint} />

          <Pane name="danger-zones" style={{ zIndex: 350 }}>
            {filters.showDangerZones ? (
              <DangerZoneLayer
                reports={reportsForMap}
                highlightedReportIds={hasRouteSelection ? nearbyRouteRiskIds : []}
                dimUnrelated={routeOverlayActive && !showOnlyRouteRisks}
              />
            ) : null}

            {reportingMode === "area" && areaCenter ? (
              <>
                <Circle
                  center={[areaCenter.latitude, areaCenter.longitude]}
                  radius={areaRadiusMeters * 1.16}
                  pathOptions={{
                    color: selectedAreaStyle.color,
                    fillColor: selectedAreaStyle.fillColor,
                    fillOpacity: 0.055,
                    opacity: 0.55,
                    weight: 2,
                    className: "selected-area-pulse",
                  }}
                  eventHandlers={stopMapPropagationHandlers()}
                />
                <Circle
                  center={[areaCenter.latitude, areaCenter.longitude]}
                  radius={areaRadiusMeters}
                  pathOptions={{
                    color: selectedAreaStyle.color,
                    fillColor: selectedAreaStyle.fillColor,
                    fillOpacity: 0.14,
                    opacity: 0.85,
                    weight: 2,
                    dashArray: "10 8",
                    className: "selected-area-zone",
                  }}
                  eventHandlers={stopMapPropagationHandlers()}
                >
                  <Tooltip sticky>Selected report area - {areaRadiusMeters >= 1000 ? `${areaRadiusMeters / 1000}km` : `${areaRadiusMeters}m`}</Tooltip>
                </Circle>
              </>
            ) : null}
          </Pane>

          <Pane name="route-lines" style={{ zIndex: 450 }}>
            {filters.showRoute
              ? visibleReports
                  .filter((report) => getReportKind(report) === "route" && report.pickup && report.dropoff)
                  .map((report) => (
                    <Polyline
                      key={`${report.id}-report-route`}
                      positions={[
                        [report.pickup!.latitude, report.pickup!.longitude],
                        [report.dropoff!.latitude, report.dropoff!.longitude],
                      ]}
                      pathOptions={{
                        color: getSeverityStyle(report.severity).color,
                        weight: 3,
                        opacity: routeOverlayActive ? 0.18 : 0.58,
                        dashArray: "6 10",
                      }}
                      eventHandlers={stopMapPropagationHandlers()}
                    >
                      <Tooltip sticky>{report.title}</Tooltip>
                    </Polyline>
                  ))
              : null}

            {!showAllRoutes && routePositions.length && filters.showRoute && activeRouteOption ? (
              <Fragment key={`selected-route-${routeLayerKey}-${activeRouteOption.id}`}>
                <Polyline positions={routePositions} pathOptions={routeOptionGlowStyle(activeRouteOption, true)} interactive={false} />
                <Polyline
                  positions={routePositions}
                  pathOptions={routeOptionStyle(activeRouteOption, true, hoveredRouteOption === activeRouteOption.id)}
                  eventHandlers={{
                    ...stopMapPropagationHandlers(),
                    click: (event) => selectRouteFromMap(activeRouteOption, event),
                    mouseover: () => setHoveredRouteOption(activeRouteOption.id),
                    mouseout: () => setHoveredRouteOption(null),
                  }}
                >
                  <Tooltip sticky>
                    {activeRouteOption.providerLabel} {activeRouteOption.isEstimated ? "estimated" : "road-following"} route
                  </Tooltip>
                </Polyline>
                <Polyline
                  positions={routePositions}
                  pathOptions={routeHitTargetStyle()}
                  eventHandlers={{
                    ...stopMapPropagationHandlers(),
                    click: (event) => selectRouteFromMap(activeRouteOption, event),
                    mouseover: () => setHoveredRouteOption(activeRouteOption.id),
                    mouseout: () => setHoveredRouteOption(null),
                  }}
                />
              </Fragment>
            ) : null}

            {hasRouteSelection && activeRouteOption && filters.showRoute
              ? routeArrowMarkers(activeRouteOption.routePath).map((marker, index) => (
                  <Marker
                    key={`route-direction-${routeLayerKey}-${index}`}
                    position={[marker.latitude, marker.longitude]}
                    icon={createRouteArrowIcon(marker.bearing)}
                    interactive={false}
                  />
                ))
              : null}

            {[...routeOptionLines]
              .sort((a, b) => routeRenderPriority(a.option, selectedRouteOption, hoveredRouteOption) - routeRenderPriority(b.option, selectedRouteOption, hoveredRouteOption))
              .map(({ option, positions }) => {
              const active = selectedRouteOption === option.id;
              const hovered = hoveredRouteOption === option.id;
              const style = routeOptionStyle(option, active, hovered);
              return (
                <Fragment key={`route-option-${routeLayerKey}-${option.id}`}>
                  {active ? <Polyline positions={positions} pathOptions={routeOptionGlowStyle(option, hovered)} interactive={false} /> : null}
                  <Polyline
                    positions={positions}
                    pathOptions={style}
                    eventHandlers={{
                      ...stopMapPropagationHandlers(),
                      click: (event) => selectRouteFromMap(option, event),
                      mouseover: () => setHoveredRouteOption(option.id),
                      mouseout: () => setHoveredRouteOption(null),
                    }}
                  >
                    <Tooltip sticky>
                      {option.name} - {option.isEstimated ? "estimated visual option" : option.providerLabel}
                    </Tooltip>
                  </Polyline>
                  <Polyline
                    positions={positions}
                    pathOptions={routeHitTargetStyle()}
                    eventHandlers={{
                      ...stopMapPropagationHandlers(),
                      click: (event) => selectRouteFromMap(option, event),
                      mouseover: () => setHoveredRouteOption(option.id),
                      mouseout: () => setHoveredRouteOption(null),
                    }}
                  />
                </Fragment>
              );
            })}
          </Pane>

          <Pane name="route-labels" style={{ zIndex: 610 }}>
            {filters.showRoute && showAllRoutes
              ? [...routeOptions]
                  .sort((a, b) => routeRenderPriority(a, selectedRouteOption, hoveredRouteOption) - routeRenderPriority(b, selectedRouteOption, hoveredRouteOption))
                  .map((option) => {
                  const active = selectedRouteOption === option.id;
                  const hovered = hoveredRouteOption === option.id;
                  return (
                    <Marker
                      key={`route-label-${routeLayerKey}-${option.id}`}
                      position={routeLabelPosition(option.routePath, option.id, true)}
                      icon={createRouteLabelIcon(routeLabelText(option, active), active, hovered, false)}
                      eventHandlers={{
                        ...stopMapPropagationHandlers(),
                        click: (event) => selectRouteFromMap(option, event),
                        mouseover: () => setHoveredRouteOption(option.id),
                        mouseout: () => setHoveredRouteOption(null),
                      }}
                    />
                  );
                })
              : null}
            {filters.showRoute && !showAllRoutes && activeRouteOption ? (
              <Marker
                key={`route-label-${routeLayerKey}-${activeRouteOption.id}-selected`}
                position={routeLabelPosition(activeRouteOption.routePath, activeRouteOption.id, false)}
                icon={createRouteLabelIcon(routeLabelText(activeRouteOption, true), true, hoveredRouteOption === activeRouteOption.id, false)}
                eventHandlers={{
                  ...stopMapPropagationHandlers(),
                  click: (event) => selectRouteFromMap(activeRouteOption, event),
                  mouseover: () => setHoveredRouteOption(activeRouteOption.id),
                  mouseout: () => setHoveredRouteOption(null),
                }}
              />
            ) : null}
          </Pane>

          <Pane name="safe-suggestions" style={{ zIndex: 620 }}>
            <DropoffConfidenceMapGraphic dropoff={dropoff} confidence={dropoffConfidence} />
            {activeSafePointSuggestions.map((suggestion) => (
              <SafeSuggestionMapGraphic key={suggestion.id} suggestion={suggestion} />
            ))}
          </Pane>
          <SafeSuggestionCallout
            suggestions={reportingMode === "route" ? activeSafePointSuggestions : []}
            onUseSuggestion={useSafePointSuggestion}
            onIgnoreSuggestion={ignoreSafePointSuggestion}
          />

          {pickup ? (
            <RoutePointMarker point={pickup} kind="pickup" label="Pickup" />
          ) : null}
          {dropoff ? (
            <RoutePointMarker point={dropoff} kind="dropoff" label="Drop-off" />
          ) : null}
          {reportingMode === "area" && areaCenter ? (
            <RoutePointMarker point={areaCenter} kind="area" label="Area" />
          ) : null}

          <CircleMarker
            center={OTTAWA_CENTER_POSITION}
            radius={8}
            pathOptions={{ color: "#a78bfa", fillColor: "#a78bfa", fillOpacity: 0.35, weight: 2 }}
            eventHandlers={stopMapPropagationHandlers()}
          />

          {filters.showReports
            ? reportsForMap.map((report) => (
                <ReportMarker
                  key={report.id}
                  report={report}
                  onResolve={resolveReport}
                  highlighted={hasRouteSelection && nearbyRouteRiskIds.includes(report.id)}
                  dimmed={routeOverlayActive && !showOnlyRouteRisks && !nearbyRouteRiskIds.includes(report.id)}
                />
              ))
            : null}
        </OttawaMapCanvas>
      </div>

      <div className="map-vignette-side pointer-events-none absolute inset-0 z-[900]" />
      <div className="map-vignette-top pointer-events-none absolute inset-x-0 top-0 z-[901] h-32" />
      <div className="map-vignette-bottom pointer-events-none absolute inset-x-0 bottom-0 z-[901] h-40" />

      {!compactMapLayout ? (
        <div className="pointer-events-none relative z-[1100] flex h-full flex-col justify-between gap-4 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.42, ease: "easeOut" }}
              data-tour="report-panel"
              className={cn(
                "map-dock pointer-events-auto w-full max-w-[430px] overflow-auto rounded-2xl border border-white/[0.12] bg-slate-950/[0.68] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl",
                hasRouteSelection ? "max-h-[calc(100vh-318px)]" : "max-h-[calc(100vh-108px)]",
              )}
            >
              {reportPanelContent}
            </motion.div>

            <motion.div
              className="right-panel-stack grid w-full max-w-[360px] gap-3 overflow-y-auto pr-1 xl:mt-0"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.42, delay: 0.06, ease: "easeOut" }}
            >
              {signalPanelContent}
            </motion.div>
          </div>

          <div className="grid gap-3 lg:max-w-[450px]">
            {pickup && dropoff && reportingMode === "route" && !routePreviewOpen ? (
              <RouteRiskWarning riskyReports={riskyRouteReports} confidence={dropoffConfidence} />
            ) : null}
          </div>

          {areaStatusContent ? (
            <motion.div
              className="map-dock pointer-events-auto grid gap-3 rounded-2xl border border-white/[0.12] bg-slate-950/70 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:grid-cols-[1fr_auto]"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
            >
              {areaStatusContent}
            </motion.div>
          ) : null}
        </div>
      ) : null}

      {compactMapLayout ? (
        <>
          <MobileMapActions activeSheet={mobileSheet} onSheetChange={setMobileSheet} />
          <AnimatePresence initial={false}>
            {mobileSheet ? (
              <motion.div
                className="pointer-events-none absolute inset-x-2 bottom-2 z-[1400]"
                initial={{ opacity: 0, y: 34 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 34 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                <div className="map-dock map-dock-strong pointer-events-auto max-h-[min(72svh,560px)] overflow-y-auto rounded-2xl border border-white/[0.12] bg-slate-950/88 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
                  <div className="sticky top-0 z-10 -mx-3 -mt-3 mb-3 flex items-center justify-between gap-3 border-b border-white/10 bg-[var(--map-dock-bg-strong)] px-3 py-3 backdrop-blur-2xl">
                    <div>
                      <div className="metric-label">Mobile map tools</div>
                      <h2 className="mt-1 text-base font-semibold text-white">{mobileSheetTitle(mobileSheet)}</h2>
                    </div>
                    <button
                      type="button"
                      className="ghost-button min-h-11 min-w-11 px-0"
                      onClick={() => setMobileSheet(null)}
                      aria-label="Close map drawer"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  {mobileSheet === "report" ? <div data-tour="report-panel">{reportPanelContent}</div> : null}
                  {mobileSheet === "layers" ? <div className="grid gap-3">{signalPanelContent}</div> : null}
                  {mobileSheet === "status" ? (
                    <div className="grid gap-3">
                      {areaStatusContent ? (
                        <div className="map-dock pointer-events-auto grid gap-3 rounded-2xl border border-white/[0.12] bg-slate-950/70 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
                          {areaStatusContent}
                        </div>
                      ) : null}
                      {pickup && dropoff && reportingMode === "route" && !routePreviewOpen ? (
                        <RouteRiskWarning riskyReports={riskyRouteReports} confidence={dropoffConfidence} />
                      ) : null}
                      <div className="map-dock pointer-events-auto rounded-2xl border border-white/[0.12] bg-slate-950/70 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
                        <div className="metric-label">Current mode</div>
                        <p className="mt-2 text-sm font-semibold leading-6 text-white">{statusMessage}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}

      {reportingMode === "route" ? (
        <div className="pointer-events-none absolute left-2 right-2 top-3 z-[1280] sm:left-4 sm:right-4 lg:left-6 lg:right-6 xl:left-[460px] xl:right-[380px]">
          <LocationPlacementDock
            pickup={pickup}
            dropoff={dropoff}
            mapInteractionMode={mapInteractionMode}
            onStartPickupPlacement={() => startPlacementMode("set-pickup")}
            onStartDropoffPlacement={() => startPlacementMode("set-dropoff")}
            onCancelPlacement={cancelPlacementMode}
            onUseCurrentLocation={useCurrentLocation}
            onResetRoute={resetRoute}
            onPickupChange={setPickupFromDock}
            onDropoffChange={setDropoffFromDock}
            onStatus={setStatusMessage}
          />
        </div>
      ) : null}

      {toastMessage ? (
        <motion.div
          className={cn(
            "map-dock pointer-events-none absolute left-1/2 z-[1300] -translate-x-1/2 rounded-2xl border border-emerald-200/30 bg-slate-950/85 px-4 py-3 text-sm font-semibold text-emerald-50 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur-2xl",
            placementActive ? "top-28" : "top-20",
          )}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
        >
          {toastMessage}
        </motion.div>
      ) : null}

      <div className="route-preview-dock-layer pointer-events-none absolute bottom-3 left-2 right-2 z-[1250] sm:left-4 sm:right-4 lg:bottom-5 lg:left-6 lg:right-6 xl:left-[460px] xl:right-[380px]">
        <div className="mx-auto w-full max-w-[900px]">
          {reportingMode === "route" ? (
            <RoutePreviewDrawer
              pickup={pickup}
              dropoff={dropoff}
              reports={visibleReports}
              routeOptions={routeOptions}
              selectedOptionId={selectedRouteOption}
              expanded={routePreviewOpen}
              avoidHighRiskZones={avoidHighRiskZones}
              showOnlyRouteRisks={showOnlyRouteRisks}
              showAllRoutes={showAllRoutes}
              hoveredOptionId={hoveredRouteOption}
              routingLoading={routingLoading}
              routingError={routingError}
              providerLabel={routeProviderLabel}
              statusMessage={statusMessage}
              pickupDisplayLabel={pickupDisplayLabel}
              dropoffDisplayLabel={dropoffDisplayLabel}
              safePointSuggestions={activeSafePointSuggestions}
              dropoffConfidence={dropoffConfidence}
              onExpandedChange={setRoutePreviewOpen}
              onSelectedOptionChange={changeSelectedRouteOption}
              onRouteOptionSelected={handleRouteOptionSelected}
              onRouteOptionHover={setHoveredRouteOption}
              onAvoidHighRiskZonesChange={changeAvoidHighRiskZones}
              onShowOnlyRouteRisksChange={setShowOnlyRouteRisks}
              onShowAllRoutesChange={setShowAllRoutes}
              onUseSafePointSuggestion={useSafePointSuggestion}
              onIgnoreSafePointSuggestion={ignoreSafePointSuggestion}
              onSubmitReport={submitRouteReport}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

type MobileMapSheet = "report" | "layers" | "status";

function MobileMapActions({
  activeSheet,
  onSheetChange,
}: {
  activeSheet: MobileMapSheet | null;
  onSheetChange: (sheet: MobileMapSheet | null) => void;
}) {
  const actions: Array<{ id: MobileMapSheet; label: string; icon: typeof MapPinned }> = [
    { id: "report", label: "Report", icon: MapPinned },
    { id: "layers", label: "Layers", icon: Layers3 },
    { id: "status", label: "Status", icon: Info },
  ];

  return (
    <div className="pointer-events-none absolute right-2 top-[5.25rem] z-[1320] grid gap-2 sm:right-4">
      {actions.map((action) => {
        const Icon = action.icon;
        const active = activeSheet === action.id;

        return (
          <button
            key={action.id}
            type="button"
            className={cn(
              "map-dock pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-white/[0.12] px-3 text-xs font-bold shadow-[0_14px_44px_rgba(0,0,0,0.32)] backdrop-blur-2xl",
              active ? "bg-cyan-300/[0.18] text-cyan-50" : "bg-slate-950/78 text-slate-100",
            )}
            onClick={() => onSheetChange(active ? null : action.id)}
            aria-pressed={active}
            aria-label={`${active ? "Close" : "Open"} ${action.label.toLowerCase()} drawer`}
            data-tour={action.id === "report" ? "report-panel" : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function mobileSheetTitle(sheet: MobileMapSheet) {
  if (sheet === "report") return "Reports and route setup";
  if (sheet === "layers") return "Map layers and signals";
  return "Map status";
}

function InvalidateMapSize({ trigger }: { trigger: string }) {
  const map = useMap();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    const timeout = window.setTimeout(() => map.invalidateSize(), 280);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [map, trigger]);

  return null;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (typeof window === "undefined" ? false : window.matchMedia(query).matches));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function MapClickHandler({
  interactionMode,
  onPlace,
}: {
  interactionMode: MapInteractionMode;
  onPlace: (interactionMode: MapInteractionMode, point: RoutePoint) => void;
}) {
  useMapEvents({
    click(event) {
      if (interactionMode === "explore") return;

      onPlace(interactionMode, {
        label:
          interactionMode === "set-pickup"
            ? "Selected pickup point"
            : interactionMode === "set-dropoff"
              ? "Selected drop-off point"
              : "Selected area center",
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        source: "map",
      });
    },
  });

  return null;
}

function RecenterMap({ point }: { point: GeoPoint | null }) {
  const map = useMap();

  useEffect(() => {
    if (!point) return;
    const frame = window.requestAnimationFrame(() => {
      map.flyTo([point.latitude, point.longitude], Math.max(map.getZoom(), 15), { duration: 0.8 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [map, point]);

  return null;
}

function useReverseGeocodedRouteLabel(point: RoutePoint | null, type: "pickup" | "dropoff") {
  const [geocodedAddress, setGeocodedAddress] = useState<string | null>(null);

  useEffect(() => {
    setGeocodedAddress(null);
    if (!point) return;

    let controller: AbortController | null = null;
    const timeout = window.setTimeout(() => {
      controller = new AbortController();
      void reverseGeocodePoint(point, controller.signal)
        .then((address) => setGeocodedAddress(address))
        .catch((error) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) setGeocodedAddress(null);
        });
    }, 450);

    return () => {
      window.clearTimeout(timeout);
      controller?.abort();
    };
  }, [point?.latitude, point?.longitude]);

  return getRoutePointDisplayLabel(point, type, geocodedAddress);
}

function StateMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <div className="text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
    </div>
  );
}

function routeSelectionToast(option: EstimatedRouteOption) {
  if (option.id === "safest") return "Highest-confidence route selected";
  if (option.id === "fastest") return "Fastest route selected";
  return "Shortest route selected";
}

function routeLayerSignature(
  pickup: RoutePoint | null,
  dropoff: RoutePoint | null,
  routeOptions: EstimatedRouteOption[],
  routingFailed: boolean,
) {
  if (!pickup || !dropoff || !routeOptions.length) return "no-active-route";
  const endpointKey = `${pickup.latitude.toFixed(5)},${pickup.longitude.toFixed(5)}-${dropoff.latitude.toFixed(5)},${dropoff.longitude.toFixed(5)}`;
  const optionKey = routeOptions
    .map((option) => `${option.id}-${option.source}-${option.isEstimated ? "estimated" : "road"}-${option.routePath.length}-${option.distanceKm.toFixed(2)}`)
    .join("|");
  return `${routingFailed ? "fallback" : "road"}-${endpointKey}-${optionKey}`;
}

function stopMapPropagationHandlers() {
  return {
    click: stopLeafletEvent,
    contextmenu: stopLeafletEvent,
    dblclick: stopLeafletEvent,
    mousedown: stopLeafletEvent,
  };
}

function DropoffConfidenceMapGraphic({
  dropoff,
  confidence,
}: {
  dropoff: RoutePoint | null;
  confidence: ConfidenceAssessment | null;
}) {
  if (!dropoff || !confidence) return null;
  const position: [number, number] = [dropoff.latitude, dropoff.longitude];
  const color = confidenceMapColor[confidence.level];
  const radius = confidence.level === "red" ? 260 : confidence.level === "orange" ? 210 : 150;

  return (
    <Circle
      center={position}
      radius={radius}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: confidence.level === "white" ? 0.05 : 0.11,
        opacity: confidence.level === "white" ? 0.66 : 0.94,
        weight: confidence.level === "red" ? 3 : 2,
        dashArray: confidence.level === "white" ? "5 9" : "9 7",
        className: "confidence-dropoff-ring",
      }}
      eventHandlers={stopMapPropagationHandlers()}
    >
      <Tooltip direction="right" offset={[14, 0]} permanent>
        {confidence.headline}
      </Tooltip>
    </Circle>
  );
}

function SafeSuggestionMapGraphic({ suggestion }: { suggestion: SafePointSuggestion }) {
  const original: [number, number] = [suggestion.originalPoint.latitude, suggestion.originalPoint.longitude];
  const safe: [number, number] = [suggestion.point.latitude, suggestion.point.longitude];
  const line = safeSuggestionLine(suggestion.originalPoint, suggestion.point);

  return (
    <>
      <Circle
        center={original}
        radius={Math.max(55, suggestion.safetyBufferKm * 1000)}
        pathOptions={{
          color: suggestion.severity === "critical" ? "#fb7185" : "#f59e0b",
          fillColor: suggestion.severity === "critical" ? "#fb7185" : "#f59e0b",
          fillOpacity: 0.08,
          opacity: 0.78,
          weight: 2,
          dashArray: "8 8",
          className: "unsafe-point-ring",
        }}
        eventHandlers={stopMapPropagationHandlers()}
      >
        <Tooltip sticky>
          Original {endpointLabel(suggestion.type)} is {suggestion.insideZone ? "inside" : "near"} a low-confidence area
        </Tooltip>
      </Circle>
      <Polyline
        positions={line}
        pathOptions={{
          color: "#5eead4",
          weight: 3,
          opacity: 0.86,
          dashArray: "7 9",
          className: "safe-suggestion-line safe-suggestion-helper-line",
        }}
        eventHandlers={stopMapPropagationHandlers()}
      />
      <Marker position={safe} icon={createSafeSuggestionIcon(suggestion.type)} eventHandlers={stopMapPropagationHandlers()}>
        <Tooltip direction="top" offset={[0, -18]} permanent>
          Suggested safer {endpointLabel(suggestion.type)}
        </Tooltip>
      </Marker>
    </>
  );
}

function createSafeSuggestionIcon(type: SafePointSuggestion["type"]) {
  const label = type === "pickup" ? "SP" : "SD";
  return L.divIcon({
    className: "safe-suggestion-marker-shell",
    html: `<div class="safe-suggestion-marker"><span>${label}</span></div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 39],
    popupAnchor: [0, -36],
  });
}

function createRouteArrowIcon(bearing: number) {
  return L.divIcon({
    className: "route-arrow-shell",
    html: `<div class="route-arrow" style="transform: rotate(${bearing.toFixed(1)}deg);"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function createRouteLabelIcon(label: string, selected: boolean, hovered: boolean, risky: boolean) {
  return L.divIcon({
    className: "route-label-shell",
    html: `<div class="route-label ${selected ? "route-label-selected" : ""} ${hovered ? "route-label-hovered" : ""} ${
      risky ? "route-label-risky" : ""
    }"><span>${label}</span></div>`,
    iconSize: [248, 36],
    iconAnchor: [124, 18],
  });
}

function routeLabelText(option: EstimatedRouteOption, selected: boolean) {
  const confidence = getRouteSafetyLabel(option.safetyScore);
  const core = `${option.isEstimated ? "Est &middot; " : ""}${option.estimatedMinutes} min &middot; ${confidence}`;
  return selected ? `Selected &middot; ${core}` : core;
}

function routeLabelPosition(routePath: GeoPoint[], optionId: EstimatedRouteOption["id"], offsetLabel: boolean): [number, number] {
  const point = routePath[Math.min(routePath.length - 1, Math.max(0, Math.floor(routePath.length * 0.54)))] ?? routePath[0];
  if (!point) return OTTAWA_CENTER_POSITION;
  if (!offsetLabel) return [point.latitude, point.longitude];

  const offsets: Record<EstimatedRouteOption["id"], [number, number]> = {
    fastest: [0.00018, -0.00022],
    safest: [0.00028, 0.00018],
    shortest: [-0.00024, 0.00024],
  };
  const [latOffset, lonOffset] = offsets[optionId];
  return [point.latitude + latOffset, point.longitude + lonOffset];
}

function routeRenderPriority(
  option: EstimatedRouteOption,
  selectedOption: EstimatedRouteOption["id"],
  hoveredOption: EstimatedRouteOption["id"] | null,
) {
  if (option.id === selectedOption) return 3;
  if (option.id === hoveredOption) return 2;
  return 1;
}

function routeOptionStyle(option: EstimatedRouteOption, selected: boolean, hovered: boolean) {
  const layerClass = option.isEstimated ? "estimated-fallback-route" : selected ? "road-route" : "alternative-route";
  if (selected) {
    return {
      color: "#2563EB",
      weight: hovered ? 8 : 7,
      opacity: hovered ? 1 : 0.95,
      lineCap: "round" as const,
      lineJoin: "round" as const,
      className: `route-preview-line route-preview-line-selected ${layerClass}`,
    };
  }

  return {
    color: option.id === "safest" ? "#3B82F6" : "#60A5FA",
    weight: hovered ? 6 : 5,
    opacity: hovered ? 0.72 : option.id === "safest" ? 0.62 : 0.54,
    dashArray: option.isEstimated ? "14 12" : undefined,
    lineCap: "round" as const,
    lineJoin: "round" as const,
    className: `route-preview-line-muted ${layerClass}`,
  };
}

function routeOptionGlowStyle(option: EstimatedRouteOption, hovered: boolean) {
  const layerClass = option.isEstimated ? "estimated-fallback-route" : "road-route";
  return {
    color: option.id === "safest" ? "#3B82F6" : "#60A5FA",
    weight: hovered ? 16 : 14,
    opacity: hovered ? 0.3 : 0.22,
    lineCap: "round" as const,
    lineJoin: "round" as const,
    className: `route-preview-glow ${layerClass}`,
  };
}

function routeHitTargetStyle() {
  return {
    color: "#93C5FD",
    weight: 22,
    opacity: 0.01,
    lineCap: "round" as const,
    lineJoin: "round" as const,
    className: "route-preview-hit-target",
  };
}

function safeSuggestionLine(original: GeoPoint, safePoint: GeoPoint): [number, number][] {
  const latDelta = safePoint.latitude - original.latitude;
  const lonDelta = safePoint.longitude - original.longitude;
  const length = Math.hypot(latDelta, lonDelta) || 1;
  const midpoint: [number, number] = [
    (original.latitude + safePoint.latitude) / 2 + (-lonDelta / length) * 0.0008,
    (original.longitude + safePoint.longitude) / 2 + (latDelta / length) * 0.0008,
  ];
  return [[original.latitude, original.longitude], midpoint, [safePoint.latitude, safePoint.longitude]];
}

function pointToPosition(point: GeoPoint): [number, number] {
  return [point.latitude, point.longitude];
}

function routeArrowMarkers(routePath: GeoPoint[]) {
  if (routePath.length < 2) return [];
  return [0.34, 0.66].map((fraction) => {
    const segmentIndex = Math.min(Math.max(0, Math.floor((routePath.length - 1) * fraction)), routePath.length - 2);
    const start = routePath[segmentIndex];
    const end = routePath[segmentIndex + 1];
    return {
      latitude: start.latitude + (end.latitude - start.latitude) * 0.5,
      longitude: start.longitude + (end.longitude - start.longitude) * 0.5,
      bearing: routeBearing(start, end),
    };
  });
}

function routeBearing(start: GeoPoint, end: GeoPoint) {
  const meanLat = ((start.latitude + end.latitude) / 2) * (Math.PI / 180);
  const x = (end.longitude - start.longitude) * Math.cos(meanLat);
  const y = end.latitude - start.latitude;
  return (Math.atan2(y, x) * 180) / Math.PI;
}
