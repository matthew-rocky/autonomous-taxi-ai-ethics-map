import { haversineKm } from "@/lib/ethicsEngine";
import { distancePointToSegmentKm, getDangerRadius, getReportCenter } from "@/lib/reportUtils";
import type { GeoPoint, MapReport, ReportSeverity, RoutePoint } from "@/types";

export interface NearbyRouteRisk {
  report: MapReport;
  distanceKm: number;
  radiusKm: number;
  severity: ReportSeverity;
}

export type RouteOptionSource = "estimated" | "mapbox" | "openrouteservice" | "osrm-demo";

export interface EstimatedRouteOption {
  id: "fastest" | "safest" | "shortest";
  name: string;
  badge: "Fastest" | "Recommended" | "Shortest" | "Avoid if possible";
  distanceKm: number;
  estimatedMinutes: number;
  safetyScore: number;
  nearbyDangerZones: number;
  description: string;
  routePath: GeoPoint[];
  source: RouteOptionSource;
  providerLabel: string;
  isEstimated: boolean;
  directions?: EstimatedDirection[];
}

export interface EstimatedDirection {
  title: string;
  detail: string;
}

export interface RouteSafetyMessage {
  tone: "safe" | "caution" | "warning" | "danger";
  title: string;
  detail: string;
}

export interface SafePointSuggestion {
  id: string;
  type: "pickup" | "dropoff";
  point: RoutePoint;
  originalPoint: RoutePoint;
  riskReport: MapReport;
  severity: ReportSeverity;
  distanceAwayKm: number;
  reason: string;
}

export function calculateRouteDistance(pickup: RoutePoint, dropoff: RoutePoint) {
  return haversineKm(pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude);
}

export function calculatePolylineDistance(points: GeoPoint[]) {
  return points.reduce((total, point, index) => {
    const next = points[index + 1];
    if (!next) return total;
    return total + haversineKm(point.latitude, point.longitude, next.latitude, next.longitude);
  }, 0);
}

export function estimateTravelTime(distanceKm: number) {
  const downtownAverageKph = 24;
  return Math.max(3, Math.round((distanceKm / downtownAverageKph) * 60));
}

export function getReportsNearRoute(
  pickup: RoutePoint,
  dropoff: RoutePoint,
  reports: MapReport[],
  routePath: GeoPoint[] = [pickup, dropoff],
) {
  const path = routePath.length >= 2 ? routePath : [pickup, dropoff];

  return reports
    .filter((report) => report.status !== "resolved")
    .map((report) => {
      const center = getReportCenter(report);
      if (!center) return null;
      const radiusKm = Math.max(getDangerRadius(report) / 1000, 0.08);
      const distanceKm = distancePointToRouteKm(center, path);
      const thresholdKm = radiusKm + 0.14;
      if (distanceKm > thresholdKm) return null;
      return {
        report,
        distanceKm,
        radiusKm,
        severity: report.severity,
      } satisfies NearbyRouteRisk;
    })
    .filter((risk): risk is NearbyRouteRisk => risk !== null)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.distanceKm - b.distanceKm);
}

export function calculateRouteSafetyScore(nearbyRisks: NearbyRouteRisk[]) {
  const penalty = nearbyRisks.reduce((sum, risk) => {
    if (risk.severity === "critical") return sum + 35;
    if (risk.severity === "high") return sum + 25;
    if (risk.severity === "medium") return sum + 12;
    return sum + 5;
  }, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function getRouteSafetyLabel(score: number) {
  if (score >= 85) return "High confidence";
  if (score >= 70) return "Normal confidence";
  if (score >= 50) return "Uncertain";
  if (score >= 30) return "Low confidence";
  return "Avoid exact path";
}

export function getRouteSafetyMessage(nearbyRisks: NearbyRouteRisk[], safetyScore: number): RouteSafetyMessage {
  const criticalCount = nearbyRisks.filter((risk) => risk.severity === "critical").length;
  const highCount = nearbyRisks.filter((risk) => risk.severity === "high").length;
  const mediumCount = nearbyRisks.filter((risk) => risk.severity === "medium").length;

  if (criticalCount > 0) {
    return {
      tone: "danger",
      title: "This route passes near a low-confidence area.",
      detail: "A safer handoff or higher-confidence route may be recommended before dispatching this route.",
    };
  }

  if (highCount > 0 || safetyScore < 50) {
    return {
      tone: "warning",
      title: "This route passes near uncertain destination signals.",
      detail: "Preview the highest-confidence option and avoid the highlighted corridor if conditions are active.",
    };
  }

  if (mediumCount > 0 || safetyScore < 70) {
    return {
      tone: "caution",
      title: "Use cautious behavior on this route.",
      detail: "There are active medium-confidence signals close enough to affect pickup or navigation quality.",
    };
  }

  return {
    tone: "safe",
    title: "No major active reports near this route.",
    detail: "No active alerts found. This does not guarantee safety.",
  };
}

export function generateEstimatedRouteOptions(pickup: RoutePoint, dropoff: RoutePoint, reports: MapReport[]) {
  const fastestPath = routePointsFromPolyline(generateAlternativePolyline(pickup, dropoff, "fastest"));
  const safestPath = routePointsFromPolyline(generateAlternativePolyline(pickup, dropoff, "safest"));
  const shortestPath = routePointsFromPolyline(generateAlternativePolyline(pickup, dropoff, "shortest"));
  const estimatedDirections = generateEstimatedDirections(pickup, dropoff);

  const fastestRisks = getReportsNearRoute(pickup, dropoff, reports, fastestPath);
  const safestRisks = getReportsNearRoute(pickup, dropoff, reports, safestPath);
  const shortestRisks = getReportsNearRoute(pickup, dropoff, reports, shortestPath);

  const fastestDistance = calculatePolylineDistance(fastestPath);
  const safestDistance = calculatePolylineDistance(safestPath) * 1.08;
  const shortestDistance = calculatePolylineDistance(shortestPath);

  const fastestScore = calculateRouteSafetyScore(fastestRisks);
  const safestScore = Math.min(100, calculateRouteSafetyScore(safestRisks) + (safestRisks.length < fastestRisks.length ? 6 : 2));
  const shortestScore = calculateRouteSafetyScore(shortestRisks);

  return [
    {
      id: "fastest",
      name: "Fastest route",
      badge: fastestScore < 50 ? "Avoid if possible" : "Fastest",
      distanceKm: fastestDistance,
      estimatedMinutes: Math.max(3, estimateTravelTime(fastestDistance) - 1),
      safetyScore: fastestScore,
      nearbyDangerZones: fastestRisks.length,
      description: "Estimated direct corridor optimized for arrival time.",
      routePath: fastestPath,
      source: "estimated",
      providerLabel: "Estimated fallback",
      isEstimated: true,
      directions: estimatedDirections,
    },
    {
      id: "safest",
      name: "Highest-confidence route",
      badge: "Recommended",
      distanceKm: safestDistance,
      estimatedMinutes: estimateTravelTime(safestDistance) + 2,
      safetyScore: safestScore,
      nearbyDangerZones: safestRisks.length,
      description: "Estimated detour that biases toward higher-confidence handoff.",
      routePath: safestPath,
      source: "estimated",
      providerLabel: "Estimated fallback",
      isEstimated: true,
      directions: estimatedDirections,
    },
    {
      id: "shortest",
      name: "Shortest route",
      badge: shortestScore < 45 ? "Avoid if possible" : "Shortest",
      distanceKm: shortestDistance,
      estimatedMinutes: estimateTravelTime(shortestDistance) + 1,
      safetyScore: shortestScore,
      nearbyDangerZones: shortestRisks.length,
      description: "Estimated shortest line-of-travel option; may be less confidence-aware.",
      routePath: shortestPath,
      source: "estimated",
      providerLabel: "Estimated fallback",
      isEstimated: true,
      directions: estimatedDirections,
    },
  ] satisfies EstimatedRouteOption[];
}

export function generateEstimatedDirections(pickup: RoutePoint, dropoff: RoutePoint) {
  return [
    {
      title: "Start at pickup",
      detail: pickup.label,
    },
    {
      title: "Enter selected route corridor",
      detail: "Follow the highlighted estimated route while monitoring nearby uncertainty overlays.",
    },
    {
      title: "Continue toward drop-off",
      detail: "Stay clear of low-confidence areas where possible.",
    },
    {
      title: "Arrive at drop-off",
      detail: dropoff.label,
    },
  ] satisfies EstimatedDirection[];
}

export function generateAlternativePolyline(
  pickup: RoutePoint,
  dropoff: RoutePoint,
  optionId: EstimatedRouteOption["id"],
) {
  const start: [number, number] = [pickup.latitude, pickup.longitude];
  const end: [number, number] = [dropoff.latitude, dropoff.longitude];
  const latDelta = dropoff.latitude - pickup.latitude;
  const lonDelta = dropoff.longitude - pickup.longitude;
  const length = Math.hypot(latDelta, lonDelta) || 1;
  const offsetScale = optionId === "safest" ? 0.26 : optionId === "shortest" ? -0.18 : 0.08;
  const offsetMagnitude = Math.min(0.008, Math.max(0.0012, length * 0.18));
  const perpendicularLat = -lonDelta / length;
  const perpendicularLon = latDelta / length;

  const pointAt = (fraction: number, waveScale = 1): [number, number] => {
    const wave = Math.sin(Math.PI * fraction) * offsetMagnitude * offsetScale * waveScale;
    return [
      pickup.latitude + latDelta * fraction + perpendicularLat * wave,
      pickup.longitude + lonDelta * fraction + perpendicularLon * wave,
    ];
  };

  return [start, pointAt(0.28, 0.7), pointAt(0.52, 1), pointAt(0.76, 0.64), end];
}

export function generateSafePointSuggestions(
  pickup: RoutePoint | null,
  dropoff: RoutePoint | null,
  reports: MapReport[],
) {
  const suggestions: SafePointSuggestion[] = [];
  const severeReports = reports.filter((report) => {
    if (report.status === "resolved") return false;
    return report.severity === "high" || report.severity === "critical";
  });

  const addSuggestion = (type: SafePointSuggestion["type"], point: RoutePoint | null) => {
    if (!point) return;
    const nearbyRisk = severeReports
      .map((report) => {
        const center = getReportCenter(report);
        if (!center) return null;
        const radiusKm = Math.max(getDangerRadius(report) / 1000, 0.22);
        const distanceKm = haversineKm(point.latitude, point.longitude, center.latitude, center.longitude);
        if (distanceKm > radiusKm + 0.22) return null;
        return { report, center, radiusKm, distanceKm };
      })
      .filter((risk): risk is { report: MapReport; center: GeoPoint; radiusKm: number; distanceKm: number } => risk !== null)
      .sort((a, b) => severityRank(b.report.severity) - severityRank(a.report.severity) || a.distanceKm - b.distanceKm)[0];

    if (!nearbyRisk) return;

    const saferPoint = movePointAwayFromRisk(point, nearbyRisk.center, nearbyRisk.radiusKm + 0.28);
    const distanceAwayKm = haversineKm(point.latitude, point.longitude, saferPoint.latitude, saferPoint.longitude);
    suggestions.push({
      id: `${type}-${nearbyRisk.report.id}`,
      type,
      originalPoint: point,
      point: {
        ...saferPoint,
        label: `Safer ${type} point near ${shortLocationLabel(point.label)}`,
        source: "manual",
      },
      riskReport: nearbyRisk.report,
      severity: nearbyRisk.report.severity,
      distanceAwayKm,
      reason: `${type === "pickup" ? "Pickup" : "Drop-off"} is close to ${nearbyRisk.report.title}. Move outside the low-confidence area.`,
    });
  };

  addSuggestion("pickup", pickup);
  addSuggestion("dropoff", dropoff);

  return suggestions;
}

function distancePointToRouteKm(point: GeoPoint, routePath: GeoPoint[]) {
  if (routePath.length < 2) return 0;
  return routePath.reduce((closest, current, index) => {
    const next = routePath[index + 1];
    if (!next) return closest;
    return Math.min(closest, distancePointToSegmentKm(point, current, next));
  }, Number.POSITIVE_INFINITY);
}

function routePointsFromPolyline(polyline: [number, number][]): GeoPoint[] {
  return polyline.map(([latitude, longitude]) => ({ latitude, longitude }));
}

function movePointAwayFromRisk(point: GeoPoint, riskCenter: GeoPoint, safeDistanceKm: number): GeoPoint {
  const meanLat = ((point.latitude + riskCenter.latitude) / 2) * (Math.PI / 180);
  let dx = (point.longitude - riskCenter.longitude) * 111.32 * Math.cos(meanLat);
  let dy = (point.latitude - riskCenter.latitude) * 110.574;
  const length = Math.hypot(dx, dy);

  if (length < 0.001) {
    dx = 0.55;
    dy = 0.85;
  }

  const normalizedLength = Math.hypot(dx, dy);
  const targetX = (dx / normalizedLength) * safeDistanceKm;
  const targetY = (dy / normalizedLength) * safeDistanceKm;

  return {
    latitude: riskCenter.latitude + targetY / 110.574,
    longitude: riskCenter.longitude + targetX / (111.32 * Math.cos(meanLat)),
  };
}

function shortLocationLabel(label: string) {
  return label.split(",").slice(0, 2).join(",").trim() || "selected location";
}

function severityRank(severity: ReportSeverity) {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}
