import { haversineKm } from "@/lib/ethicsEngine";
import type {
  GeoPoint,
  MapFiltersState,
  MapReport,
  ReportIssueType,
  ReportKind,
  ReportSeverity,
  ReportStatus,
  ReportUrgency,
  RoutePoint,
} from "@/types";

export const getReportKind = (report: MapReport): ReportKind => report.kind ?? "area";

export const getReportCenter = (report: MapReport): GeoPoint | null => {
  if (typeof report.latitude === "number" && typeof report.longitude === "number") {
    return { latitude: report.latitude, longitude: report.longitude };
  }
  if (report.kind === "route" && report.dropoff) {
    return { latitude: report.dropoff.latitude, longitude: report.dropoff.longitude };
  }
  if (report.pickup) {
    return { latitude: report.pickup.latitude, longitude: report.pickup.longitude };
  }
  return null;
};

export const getDangerRadius = (input: ReportSeverity | MapReport) => {
  if (typeof input !== "string" && input.radiusMeters) return input.radiusMeters;
  const severity = typeof input === "string" ? input : input.severity;
  if (severity === "critical") return 500;
  if (severity === "high") return 300;
  if (severity === "medium") return 150;
  return 0;
};

export const getSeverityStyle = (severity: ReportSeverity) => {
  if (severity === "critical") {
    return {
      color: "#fb3457",
      fillColor: "#c026d3",
      bgClass: "bg-fuchsia-400",
      badgeClass: "border-fuchsia-200/[0.35] bg-fuchsia-300/[0.15] text-fuchsia-100",
      glowClass: "shadow-[0_0_54px_rgba(244,63,94,0.42),0_0_34px_rgba(192,38,211,0.38)]",
      label: "Critical",
    };
  }
  if (severity === "high") {
    return {
      color: "#f04444",
      fillColor: "#fb7c2e",
      bgClass: "bg-red-400",
      badgeClass: "border-red-200/[0.35] bg-red-300/[0.15] text-red-100",
      glowClass: "shadow-[0_0_44px_rgba(248,113,113,0.38),0_0_24px_rgba(251,146,60,0.32)]",
      label: "High",
    };
  }
  if (severity === "medium") {
    return {
      color: "#f59e0b",
      fillColor: "#fbbf24",
      bgClass: "bg-amber-300",
      badgeClass: "border-amber-200/30 bg-amber-300/[0.15] text-amber-100",
      glowClass: "shadow-[0_0_26px_rgba(251,191,36,0.32)]",
      label: "Medium",
    };
  }
  return {
    color: "#22d3ee",
    fillColor: "#34d399",
    bgClass: "bg-emerald-300",
    badgeClass: "border-emerald-200/25 bg-emerald-300/[0.12] text-emerald-100",
    glowClass: "shadow-[0_0_24px_rgba(52,211,153,0.26)]",
    label: "Low",
  };
};

export const getStatusStyle = (status: ReportStatus) => {
  if (status === "resolved") return "border-emerald-200/25 bg-emerald-300/[0.12] text-emerald-100";
  if (status === "pending") return "border-amber-200/30 bg-amber-300/[0.15] text-amber-100";
  return "border-cyan-200/25 bg-cyan-300/[0.12] text-cyan-100";
};

export const isReportVisibleByFilters = (report: MapReport, filters: MapFiltersState) => {
  if (filters.onlyActive && report.status !== "active") return false;
  return (
    filters.severities.includes(report.severity) &&
    filters.types.includes(report.type) &&
    filters.statuses.includes(report.status) &&
    filters.kinds.includes(getReportKind(report))
  );
};

export const filterReports = (reports: MapReport[], filters: MapFiltersState) =>
  reports.filter((report) => isReportVisibleByFilters(report, filters));

export const urgencyToSeverity = (urgency: ReportUrgency, type: string): ReportSeverity => {
  if (urgency === "High" && type === "Safety concern") return "critical";
  if (urgency === "High") return "high";
  if (urgency === "Medium") return "medium";
  return "low";
};

export const distanceToNearestReport = (point: GeoPoint | null, reports: MapReport[]) => {
  if (!point || reports.length === 0) return null;
  const distances = reports
    .map((report) => getReportCenter(report))
    .filter((center): center is GeoPoint => center !== null)
    .map((center) => haversineKm(point.latitude, point.longitude, center.latitude, center.longitude));
  if (!distances.length) return null;
  return Math.min(...distances);
};

export const nearestReportLabel = (pickup: RoutePoint | null, dropoff: RoutePoint | null, reports: MapReport[]) => {
  const pickupDistance = distanceToNearestReport(pickup, reports);
  const dropoffDistance = distanceToNearestReport(dropoff, reports);
  const distances = [pickupDistance, dropoffDistance].filter((value): value is number => value !== null);
  if (!distances.length) return "Select a route";
  const nearest = Math.min(...distances);
  return nearest < 1 ? `${Math.round(nearest * 1000)} m` : `${nearest.toFixed(2)} km`;
};

export const routeRiskReports = (pickup: RoutePoint | null, dropoff: RoutePoint | null, reports: MapReport[]) => {
  if (!pickup || !dropoff) return [];
  return reports.filter((report) => {
    if (report.status === "resolved" || !["high", "critical"].includes(report.severity)) return false;
    const center = getReportCenter(report);
    if (!center) return false;
    const radiusKm = Math.max(getDangerRadius(report) / 1000, 0.22);
    const distanceKm = distancePointToSegmentKm(center, pickup, dropoff);
    return distanceKm <= radiusKm + 0.08;
  });
};

export const distancePointToSegmentKm = (point: GeoPoint, start: GeoPoint, end: GeoPoint) => {
  const meanLat = ((start.latitude + end.latitude + point.latitude) / 3) * (Math.PI / 180);
  const project = (target: GeoPoint) => ({
    x: target.longitude * 111.32 * Math.cos(meanLat),
    y: target.latitude * 110.574,
  });
  const p = project(point);
  const a = project(start);
  const b = project(end);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return haversineKm(point.latitude, point.longitude, start.latitude, start.longitude);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  const closest = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(p.x - closest.x, p.y - closest.y);
};

export const distanceToDangerZone = (point: GeoPoint, report: MapReport) => {
  const center = getReportCenter(report);
  if (!center) return null;
  const edgeDistance = haversineKm(point.latitude, point.longitude, center.latitude, center.longitude) - getDangerRadius(report) / 1000;
  return Math.max(0, edgeDistance);
};

export const formatReportAge = (createdAt: string) => {
  const timestamp = new Date(createdAt);
  if (Number.isNaN(timestamp.getTime())) return "Unknown";
  const hours = Math.max((Date.now() - timestamp.getTime()) / 3_600_000, 0);
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min ago`;
  if (hours < 24) return `${Math.round(hours)} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
};

export const createRouteReport = ({
  pickup,
  dropoff,
  issueType,
  urgency,
  notes,
}: {
  pickup: RoutePoint;
  dropoff: RoutePoint;
  issueType: ReportIssueType;
  urgency: ReportUrgency;
  notes: string;
}): MapReport => {
  const severity = urgencyToSeverity(urgency, issueType);
  return {
    id: `route-${Date.now()}`,
    kind: "route",
    type: issueType === "Route issue" ? "Route blocked" : issueType,
    title: `${issueType} reported`,
    description:
      notes.trim() ||
      `User submitted a ${urgency.toLowerCase()} urgency ${issueType.toLowerCase()} between pickup and drop-off.`,
    severity,
    status: "active",
    createdAt: new Date().toISOString(),
    pickup: {
      latitude: pickup.latitude,
      longitude: pickup.longitude,
      address: pickup.label,
    },
    dropoff: {
      latitude: dropoff.latitude,
      longitude: dropoff.longitude,
      address: dropoff.label,
    },
    latitude: dropoff.latitude,
    longitude: dropoff.longitude,
    radiusMeters: getDangerRadius(severity),
  };
};

export const createAreaReport = ({
  center,
  title,
  issueType,
  severity,
  notes,
  radiusMeters,
}: {
  center: RoutePoint;
  title: string;
  issueType: string;
  severity: ReportSeverity;
  notes: string;
  radiusMeters: number;
}): MapReport => ({
  id: `area-${Date.now()}`,
  kind: "area",
  type: issueType,
  title: title.trim() || `${issueType} area reported`,
  description: notes.trim() || `User reported a ${severity} ${issueType.toLowerCase()} zone.`,
  latitude: center.latitude,
  longitude: center.longitude,
  radiusMeters,
  severity,
  status: "active",
  createdAt: new Date().toISOString(),
});
