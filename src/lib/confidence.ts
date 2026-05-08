import type {
  ConfidenceAssessment,
  ConfidenceEvidenceState,
  ConfidenceLevel,
  Destination,
  DropoffRecommendation,
  GeoPoint,
  MapReport,
  RiskLabel,
  RoutePoint,
} from "@/types";

const NO_ALERT_MESSAGE = "No active alerts found. This does not guarantee safety.";

interface CoreConfidenceInput {
  label: RiskLabel;
  incidentCount: number;
  recentCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  averageSeverity: number;
  insideZone: boolean;
  nearZone: boolean;
  evidence: string;
  reasons: string[];
}

interface BuildConfidenceOptions {
  originalDropoff: string;
  saferHandoffPoint?: DropoffRecommendation | null;
}

interface MapConfidenceOptions {
  saferHandoffPoint?: string | null;
}

export const confidenceLevelCopy: Record<ConfidenceLevel, { label: ConfidenceAssessment["label"]; status: string }> = {
  white: { label: "White", status: "Normal Confidence" },
  orange: { label: "Orange", status: "Conditions uncertain" },
  red: { label: "Red", status: "Low confidence in exact drop-off" },
};

export function buildDestinationConfidence(
  input: CoreConfidenceInput,
  options: BuildConfidenceOptions,
): ConfidenceAssessment {
  const state = evidenceStateFromEvaluation(input);
  const level = confidenceLevelFromEvaluation(input, state);
  const copy = confidenceLevelCopy[level];
  const saferHandoffPoint = options.saferHandoffPoint?.name ?? null;
  const tradeoff = options.saferHandoffPoint
    ? `${Math.round(options.saferHandoffPoint.distanceKm * 1000)}m farther, higher confidence`
    : level === "white"
      ? "Proceed normally, while avoiding a safety guarantee"
      : "Safer nearby handoff should be considered before exact drop-off";

  return {
    level,
    label: copy.label,
    status: copy.status,
    headline: `Confidence Level: ${copy.label} - ${copy.status}`,
    action: actionForLevel(level),
    plainSummary: summaryForEvaluationLevel(level, state, input),
    evidenceState: state,
    evidenceAvailable: evidenceAvailableFromEvaluation(input, state),
    originalDropoff: options.originalDropoff,
    saferHandoffPoint,
    tradeoff,
    overrideRequired: level === "red",
    accountabilityRule: "Do not act with full confidence under uncertainty",
    noAlertMessage: NO_ALERT_MESSAGE,
  };
}

export function assessMapDropoffConfidence(
  dropoff: RoutePoint | null,
  reports: MapReport[],
  options: MapConfidenceOptions = {},
): ConfidenceAssessment | null {
  if (!dropoff) return null;

  const activeReports = reports.filter((report) => report.status === "active");
  const nearbyReports = activeReports
    .map((report) => {
      const center = getMapReportCenter(report);
      if (!center) return null;
      const radiusKm = Math.max(reportRadiusMeters(report) / 1000, 0.12);
      const distanceKm = haversineDistance(dropoff, center);
      const affectsDropoff = distanceKm <= radiusKm + 0.28;
      if (!affectsDropoff) return null;
      return {
        report,
        distanceKm,
        radiusKm,
        ageHours: reportAgeHours(report.createdAt),
      };
    })
    .filter((item): item is { report: MapReport; distanceKm: number; radiusKm: number; ageHours: number } => item !== null)
    .sort((a, b) => severityRank(b.report.severity) - severityRank(a.report.severity) || a.distanceKm - b.distanceKm);

  const recentCount = nearbyReports.filter((item) => item.ageHours <= 6).length;
  const staleCount = nearbyReports.filter((item) => item.ageHours > 6).length;
  const pendingNearDropoff = reports.some((report) => {
    if (report.status !== "pending") return false;
    const center = getMapReportCenter(report);
    return center ? haversineDistance(dropoff, center) <= 0.72 : false;
  });
  const hasConflictingSignals =
    pendingNearDropoff ||
    (nearbyReports.length >= 2 &&
      new Set(nearbyReports.map((item) => item.report.severity)).size > 1 &&
      nearbyReports.some((item) => item.report.type === "Other" || item.report.description.toLowerCase().includes("unclear")));
  const hasSevereSignal = nearbyReports.some((item) => item.report.severity === "high" || item.report.severity === "critical");
  const sparse = nearbyReports.length > 0 ? nearbyReports.length < 3 : activeReports.length < 3;
  const stale = nearbyReports.length > 0 && recentCount === 0;

  const evidenceState: ConfidenceEvidenceState = hasConflictingSignals
    ? "conflicting"
    : stale || staleCount > recentCount
      ? "stale"
      : sparse
        ? "sparse"
        : "recent";
  const level: ConfidenceLevel = hasSevereSignal ? "red" : evidenceState === "recent" && nearbyReports.length === 0 ? "white" : evidenceState === "recent" ? "white" : "orange";
  const copy = confidenceLevelCopy[level];
  const noNearbyActiveReports = nearbyReports.length === 0;
  const evidenceAvailable = noNearbyActiveReports
    ? [NO_ALERT_MESSAGE, `${activeReports.length} active city signals remain visible for context.`, "No official closure is listed in this prototype data."]
    : [
        `${nearbyReports.length} active signal${nearbyReports.length !== 1 ? "s" : ""} near the exact drop-off.`,
        recentCount > 0 ? `${recentCount} signal${recentCount !== 1 ? "s are" : " is"} recent.` : "Nearby signals are not recently verified.",
        hasConflictingSignals ? "Available signals are conflicting." : "No official closure is listed in this prototype data.",
      ];

  return {
    level,
    label: copy.label,
    status: copy.status,
    headline: `Confidence Level: ${copy.label} - ${copy.status}`,
    action: actionForLevel(level),
    plainSummary: noNearbyActiveReports
      ? "The system does not claim the area is safe. It only says no active alert is currently close to the selected drop-off."
      : "The exact drop-off is treated cautiously because available signals do not support full confidence.",
    evidenceState,
    evidenceAvailable,
    originalDropoff: dropoff.label,
    saferHandoffPoint: options.saferHandoffPoint ?? null,
    tradeoff: options.saferHandoffPoint ? "Nearby handoff point, higher confidence" : "Exact drop-off kept under uncertainty caveat",
    overrideRequired: level === "red",
    accountabilityRule: "Do not act with full confidence under uncertainty",
    noAlertMessage: NO_ALERT_MESSAGE,
  };
}

function confidenceLevelFromEvaluation(input: CoreConfidenceInput, state: ConfidenceEvidenceState): ConfidenceLevel {
  if (input.label === "Danger" || input.insideZone || input.averageSeverity >= 4.2) return "red";
  if (input.label === "Caution" || state === "sparse" || state === "stale" || state === "conflicting" || input.nearZone) {
    return "orange";
  }
  return "white";
}

function evidenceStateFromEvaluation(input: CoreConfidenceInput): ConfidenceEvidenceState {
  const sparse = input.incidentCount > 0 ? input.incidentCount < 3 : false;
  const stale = input.incidentCount > 0 && input.recentCount === 0;
  const conflicting = input.unverifiedCount > 0 && (input.verifiedCount > 0 || input.unverifiedCount > input.verifiedCount);

  if (conflicting) return "conflicting";
  if (stale) return "stale";
  if (sparse) return "sparse";
  return "recent";
}

function evidenceAvailableFromEvaluation(input: CoreConfidenceInput, state: ConfidenceEvidenceState) {
  if (input.incidentCount === 0) {
    return [
      NO_ALERT_MESSAGE,
      "No strong active signal is close enough to alter the exact drop-off.",
      "The app still avoids treating silence as proof of safety.",
    ];
  }

  const evidence = [
    `${input.incidentCount} signal${input.incidentCount !== 1 ? "s" : ""} within the immediate drop-off radius.`,
    input.recentCount > 0
      ? `${input.recentCount} signal${input.recentCount !== 1 ? "s are" : " is"} recent.`
      : "Signals near the destination are stale.",
    input.verifiedCount > 0
      ? `${input.verifiedCount} signal${input.verifiedCount !== 1 ? "s are" : " is"} verified.`
      : "No nearby signal is recently verified.",
  ];

  if (state === "conflicting") evidence.push("Some signals are unverified or point in different directions.");
  if (state === "sparse") evidence.push("Evidence is sparse, so the system does not act fully confident.");
  return evidence;
}

function summaryForEvaluationLevel(level: ConfidenceLevel, state: ConfidenceEvidenceState, input: CoreConfidenceInput) {
  if (level === "red") {
    return "The system is not claiming it has perfectly detected danger. It has low confidence in the exact drop-off and recommends a safer handoff point.";
  }
  if (level === "orange") {
    const stateText = state === "conflicting" ? "sparse or conflicting" : state;
    return `Destination conditions are ${stateText}. The rider should see the uncertainty before deciding.`;
  }
  if (input.incidentCount === 0) return "Proceed normally, but show that no active alerts found is not a safety guarantee.";
  return "Proceed normally with confidence evidence visible.";
}

function actionForLevel(level: ConfidenceLevel) {
  if (level === "red") return "Strongly recommend safer nearby handoff point";
  if (level === "orange") return "Warn user and recommend safer nearby drop-off";
  return "Proceed normally";
}

function getMapReportCenter(report: MapReport): GeoPoint | null {
  if (typeof report.latitude === "number" && typeof report.longitude === "number") {
    return { latitude: report.latitude, longitude: report.longitude };
  }
  if (report.dropoff) return { latitude: report.dropoff.latitude, longitude: report.dropoff.longitude };
  if (report.pickup) return { latitude: report.pickup.latitude, longitude: report.pickup.longitude };
  return null;
}

function reportRadiusMeters(report: MapReport) {
  if (report.radiusMeters) return report.radiusMeters;
  if (report.severity === "critical") return 500;
  if (report.severity === "high") return 300;
  if (report.severity === "medium") return 150;
  return 60;
}

function reportAgeHours(createdAt: string) {
  const timestamp = new Date(createdAt);
  if (Number.isNaN(timestamp.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max((Date.now() - timestamp.getTime()) / 3_600_000, 0);
}

function severityRank(severity: MapReport["severity"]) {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function haversineDistance(start: GeoPoint, end: GeoPoint) {
  const radiusKm = 6371.0088;
  const latDelta = toRadians(end.latitude - start.latitude);
  const lonDelta = toRadians(end.longitude - start.longitude);
  const startLat = toRadians(start.latitude);
  const endLat = toRadians(end.latitude);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lonDelta / 2) ** 2;
  return radiusKm * 2 * Math.asin(Math.sqrt(a));
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
