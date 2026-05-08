import { snapPointToNearestRoad, hasRoadRouteBetween, type RoadSnapResult } from "@/lib/roadSnapping";
import { getDangerRadius, getReportCenter } from "@/lib/reportUtils";
import type { GeoPoint, MapReport, ReportSeverity, RoutePoint } from "@/types";

export interface DangerZoneMatch {
  report: MapReport;
  center: GeoPoint;
  radiusKm: number;
  safetyBufferKm: number;
  distanceKm: number;
  insideZone: boolean;
}

export interface SafePointSuggestion {
  id: string;
  type: "pickup" | "dropoff";
  point: RoutePoint;
  originalPoint: RoutePoint;
  riskReport: MapReport;
  severity: ReportSeverity;
  distanceAwayKm: number;
  distanceToZoneCenterKm: number;
  safetyBufferKm: number;
  insideZone: boolean;
  reason: string;
}

export interface SafePointSuggestionWarning {
  id: string;
  type: SafePointSuggestion["type"];
  reason: string;
  riskReport: MapReport;
}

export interface SafePointSuggestionResult {
  suggestions: SafePointSuggestion[];
  warnings: SafePointSuggestionWarning[];
}

interface SafeRoadCandidate {
  point: RoutePoint;
  snappedDistanceMeters: number;
  candidateDistanceKm: number;
  distanceAwayKm: number;
  distanceToZoneCenterKm: number;
  score: number;
}

const MAX_PREFERRED_DISTANCE_KM = 0.8;
const MAX_FALLBACK_DISTANCE_KM = 1.2;
const MAX_SNAP_DISTANCE_METERS = 150;
const OUTSIDE_ZONE_EXTRA_KM = 0.025;

export function haversineDistance(start: GeoPoint, end: GeoPoint) {
  const radiusKm = 6371;
  const latDelta = toRadians(end.latitude - start.latitude);
  const lonDelta = toRadians(end.longitude - start.longitude);
  const startLat = toRadians(start.latitude);
  const endLat = toRadians(end.latitude);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lonDelta / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function destinationPoint(start: GeoPoint, bearingDegrees: number, distanceKm: number): GeoPoint {
  const radiusKm = 6371;
  const angularDistance = distanceKm / radiusKm;
  const bearing = toRadians(bearingDegrees);
  const startLat = toRadians(start.latitude);
  const startLon = toRadians(start.longitude);

  const lat = Math.asin(
    Math.sin(startLat) * Math.cos(angularDistance) +
      Math.cos(startLat) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lon =
    startLon +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(startLat),
      Math.cos(angularDistance) - Math.sin(startLat) * Math.sin(lat),
    );

  return {
    latitude: toDegrees(lat),
    longitude: normalizeLongitude(toDegrees(lon)),
  };
}

export function isPointInsideDangerZone(point: GeoPoint, report: MapReport) {
  const center = getReportCenter(report);
  if (!center || report.status !== "active" || !isSuggestionSeverity(report.severity)) return false;
  const radiusKm = getDangerRadius(report) / 1000;
  const safetyBufferKm = getSafetyBufferKm(report.severity);
  return haversineDistance(point, center) < radiusKm + safetyBufferKm;
}

export function isPointInsideAnyDangerZone(point: GeoPoint, reports: MapReport[], ignoredReportId?: string) {
  return reports.some((report) => {
    if (report.id === ignoredReportId) return false;
    return isPointInsideDangerZone(point, report);
  });
}

export function getNearestDangerZone(point: GeoPoint, reports: MapReport[]): DangerZoneMatch | null {
  const matches = reports
    .filter((report) => report.status === "active" && isSuggestionSeverity(report.severity))
    .map((report) => {
      const center = getReportCenter(report);
      if (!center) return null;
      const radiusKm = getDangerRadius(report) / 1000;
      const safetyBufferKm = getSafetyBufferKm(report.severity);
      const distanceKm = haversineDistance(point, center);
      if (distanceKm >= radiusKm + safetyBufferKm) return null;
      return {
        report,
        center,
        radiusKm,
        safetyBufferKm,
        distanceKm,
        insideZone: distanceKm < radiusKm,
      } satisfies DangerZoneMatch;
    })
    .filter((match): match is DangerZoneMatch => match !== null)
    .sort((a, b) => {
      const severityDelta = severityRank(b.report.severity) - severityRank(a.report.severity);
      if (severityDelta !== 0) return severityDelta;
      return a.distanceKm - b.distanceKm;
    });

  return matches[0] ?? null;
}

export function calculateSafePointOutsideZone(point: RoutePoint, report: MapReport): RoutePoint | null {
  const center = getReportCenter(report);
  if (!center) return null;
  const radiusKm = getDangerRadius(report) / 1000;
  const safetyBufferKm = getSafetyBufferKm(report.severity);
  const bearing = bearingFromCenter(center, point);
  const safePoint = destinationPoint(center, bearing, radiusKm + safetyBufferKm + OUTSIDE_ZONE_EXTRA_KM);

  return {
    ...safePoint,
    label: `Safer point near ${shortLocationLabel(point.label)}`,
    source: "manual",
  };
}

export async function getSafePickupDropoffSuggestions(
  pickup: RoutePoint | null,
  dropoff: RoutePoint | null,
  reports: MapReport[],
  signal?: AbortSignal,
): Promise<SafePointSuggestionResult> {
  const results = await Promise.all([
    createSuggestion("pickup", pickup, dropoff, reports, signal),
    createSuggestion("dropoff", dropoff, pickup, reports, signal),
  ]);

  return {
    suggestions: results.filter((result): result is SafePointSuggestion => result !== null && "point" in result),
    warnings: results.filter((result): result is SafePointSuggestionWarning => result !== null && "reason" in result && !("point" in result)),
  };
}

export function generateSafePointCandidates(point: RoutePoint, dangerZone: DangerZoneMatch) {
  const baseBearing = bearingFromCenter(dangerZone.center, point);
  const bearings = uniqueBearings([
    baseBearing,
    baseBearing - 30,
    baseBearing + 30,
    baseBearing - 60,
    baseBearing + 60,
    baseBearing - 90,
    baseBearing + 90,
    0,
    45,
    90,
    135,
    180,
    225,
    270,
    315,
  ]);
  const distancesKm = [
    dangerZone.radiusKm + dangerZone.safetyBufferKm + OUTSIDE_ZONE_EXTRA_KM,
    dangerZone.radiusKm + dangerZone.safetyBufferKm + 0.075,
  ];

  return distancesKm.flatMap((distanceKm) => bearings.map((bearing) => destinationPoint(dangerZone.center, bearing, distanceKm)));
}

export async function findBestSafeRoadPoint(
  type: SafePointSuggestion["type"],
  originalPoint: RoutePoint,
  partnerPoint: RoutePoint | null,
  dangerZone: DangerZoneMatch,
  reports: MapReport[],
  signal?: AbortSignal,
) {
  const candidates = generateSafePointCandidates(originalPoint, dangerZone);
  const validCandidates: SafeRoadCandidate[] = [];

  for (const candidate of candidates) {
    if (signal?.aborted) throw new DOMException("Safe point search aborted.", "AbortError");
    const snapped = await snapCandidate(candidate, signal);
    if (!snapped || snapped.distanceMeters > MAX_SNAP_DISTANCE_METERS) continue;

    const snappedPoint: GeoPoint = { latitude: snapped.latitude, longitude: snapped.longitude };
    const distanceToZoneCenterKm = haversineDistance(snappedPoint, dangerZone.center);
    const distanceAwayKm = haversineDistance(originalPoint, snappedPoint);
    const candidateDistanceKm = haversineDistance(candidate, snappedPoint);

    if (!validateRoadAccessibleSafePoint(snappedPoint, dangerZone, reports)) continue;
    if (distanceAwayKm > MAX_FALLBACK_DISTANCE_KM) continue;

    validCandidates.push({
      point: {
        latitude: snapped.latitude,
        longitude: snapped.longitude,
        label: roadSuggestionLabel(type, originalPoint, snapped),
        source: "manual",
      },
      snappedDistanceMeters: snapped.distanceMeters,
      candidateDistanceKm,
      distanceAwayKm,
      distanceToZoneCenterKm,
      score: scoreCandidate(distanceAwayKm, snapped.distanceMeters, candidateDistanceKm),
    });
  }

  const sortedCandidates = validCandidates
    .sort((a, b) => a.score - b.score);
  const preferredCandidates = sortedCandidates.filter((candidate) => candidate.distanceAwayKm <= MAX_PREFERRED_DISTANCE_KM);
  const viableCandidates = preferredCandidates.length ? preferredCandidates : sortedCandidates;

  for (const candidate of viableCandidates.slice(0, 6)) {
    if (!partnerPoint) return candidate;
    const roadRouteValid = await hasRoadRouteBetween(candidate.point, partnerPoint, signal).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      return false;
    });
    if (roadRouteValid) return candidate;
  }

  return partnerPoint ? null : viableCandidates[0] ?? null;
}

export function validateRoadAccessibleSafePoint(point: GeoPoint, dangerZone: DangerZoneMatch, reports: MapReport[]) {
  const minimumDistanceKm = dangerZone.radiusKm + dangerZone.safetyBufferKm;
  if (haversineDistance(point, dangerZone.center) <= minimumDistanceKm) return false;
  return !isPointInsideAnyDangerZone(point, reports, dangerZone.report.id);
}

async function createSuggestion(
  type: SafePointSuggestion["type"],
  point: RoutePoint | null,
  partnerPoint: RoutePoint | null,
  reports: MapReport[],
  signal?: AbortSignal,
): Promise<SafePointSuggestion | SafePointSuggestionWarning | null> {
  if (!point) return null;
  const dangerZone = getNearestDangerZone(point, reports);
  if (!dangerZone) return null;

  const safeRoadPoint = await findBestSafeRoadPoint(type, point, partnerPoint, dangerZone, reports, signal);
  if (!safeRoadPoint) {
    return {
      id: `${type}-${dangerZone.report.id}-warning`,
      type,
      riskReport: dangerZone.report,
      reason: "No nearby higher-confidence road-accessible point found. Try choosing a different pickup/drop-off location.",
    } satisfies SafePointSuggestionWarning;
  }

  const severityLabel =
    dangerZone.report.severity === "critical" || dangerZone.report.severity === "high"
      ? "low-confidence"
      : "uncertain";

  return {
    id: `${type}-${dangerZone.report.id}`,
    type,
    point: safeRoadPoint.point,
    originalPoint: point,
    riskReport: dangerZone.report,
    severity: dangerZone.report.severity,
    distanceAwayKm: safeRoadPoint.distanceAwayKm,
    distanceToZoneCenterKm: safeRoadPoint.distanceToZoneCenterKm,
    safetyBufferKm: dangerZone.safetyBufferKm,
    insideZone: dangerZone.insideZone,
    reason: `Original ${endpointLabel(type)} is ${dangerZone.insideZone ? "inside" : "too close to"} a ${severityLabel} area.`,
  } satisfies SafePointSuggestion;
}

async function snapCandidate(candidate: GeoPoint, signal?: AbortSignal) {
  try {
    return await snapPointToNearestRoad(candidate, signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}

function roadSuggestionLabel(type: SafePointSuggestion["type"], originalPoint: RoutePoint, snapped: RoadSnapResult) {
  const roadName = snapped.name && snapped.name.trim() ? snapped.name.trim() : "nearby road";
  return `Safer ${endpointLabel(type)} near ${roadName} (${shortLocationLabel(originalPoint.label)})`;
}

function scoreCandidate(distanceAwayKm: number, snappedDistanceMeters: number, candidateDistanceKm: number) {
  const distancePenalty = distanceAwayKm > MAX_PREFERRED_DISTANCE_KM ? 3000 : 0;
  return distanceAwayKm * 1000 + snappedDistanceMeters * 2 + candidateDistanceKm * 650 + distancePenalty;
}

function endpointLabel(type: SafePointSuggestion["type"]) {
  return type === "dropoff" ? "drop-off" : "pickup";
}

function getSafetyBufferKm(severity: ReportSeverity) {
  if (severity === "critical") return 0.15;
  if (severity === "high") return 0.1;
  if (severity === "medium") return 0.075;
  return 0;
}

function isSuggestionSeverity(severity: ReportSeverity) {
  return severity === "medium" || severity === "high" || severity === "critical";
}

function bearingFromCenter(center: GeoPoint, point: GeoPoint) {
  if (haversineDistance(center, point) < 0.005) return 45;
  const startLat = toRadians(center.latitude);
  const endLat = toRadians(point.latitude);
  const lonDelta = toRadians(point.longitude - center.longitude);
  const y = Math.sin(lonDelta) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(lonDelta);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function uniqueBearings(values: number[]) {
  const seen = new Set<number>();
  return values
    .map((value) => Math.round(((value % 360) + 360) % 360))
    .filter((bearing) => {
      if (seen.has(bearing)) return false;
      seen.add(bearing);
      return true;
    });
}

function severityRank(severity: ReportSeverity) {
  if (severity === "critical") return 3;
  if (severity === "high") return 2;
  if (severity === "medium") return 1;
  return 0;
}

function shortLocationLabel(label: string) {
  return label.split(",").slice(0, 2).join(",").trim() || "selected location";
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

function normalizeLongitude(longitude: number) {
  return ((longitude + 540) % 360) - 180;
}
