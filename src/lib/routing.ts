import {
  calculateRouteSafetyScore,
  getReportsNearRoute,
  type EstimatedDirection,
  type EstimatedRouteOption,
  type RouteOptionSource,
} from "@/lib/routeRisk";
import type { GeoPoint, MapReport, RoutePoint } from "@/types";

interface RawRoadRoute {
  routePath: GeoPoint[];
  distanceKm: number;
  estimatedMinutes: number;
  directions: EstimatedDirection[];
}

interface RoadRouteCandidate extends RawRoadRoute {
  safetyScore: number;
  nearbyDangerZones: number;
}

export interface RoadRoutingResult {
  options: EstimatedRouteOption[];
  source: RouteOptionSource;
  providerLabel: string;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const OPENROUTESERVICE_KEY = import.meta.env.VITE_OPENROUTESERVICE_KEY as string | undefined;
const OSRM_DEMO_DISABLED = import.meta.env.VITE_OSRM_DEMO_DISABLED === "true";

export async function fetchRoadRouteOptions(
  pickup: RoutePoint,
  dropoff: RoutePoint,
  reports: MapReport[],
  signal?: AbortSignal,
): Promise<RoadRoutingResult | null> {
  const attempts: Array<() => Promise<RoadRoutingResult | null>> = [];

  if (MAPBOX_TOKEN) {
    attempts.push(async () => {
      const rawRoutes = await fetchMapboxRoutes(pickup, dropoff, signal);
      return buildRoadRoutingResult(rawRoutes, pickup, dropoff, reports, "mapbox", "Mapbox Directions");
    });
  }

  if (OPENROUTESERVICE_KEY) {
    attempts.push(async () => {
      const rawRoutes = await fetchOpenRouteServiceRoutes(pickup, dropoff, signal);
      return buildRoadRoutingResult(rawRoutes, pickup, dropoff, reports, "openrouteservice", "OpenRouteService");
    });
  }

  if (!OSRM_DEMO_DISABLED) {
    attempts.push(async () => {
      const rawRoutes = await fetchOsrmDemoRoutes(pickup, dropoff, signal);
      return buildRoadRoutingResult(rawRoutes, pickup, dropoff, reports, "osrm-demo", "OSRM demo route");
    });
  }

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result?.options.length) return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }

  return null;
}

function buildRoadRoutingResult(
  rawRoutes: RawRoadRoute[],
  pickup: RoutePoint,
  dropoff: RoutePoint,
  reports: MapReport[],
  source: RouteOptionSource,
  providerLabel: string,
): RoadRoutingResult | null {
  if (!rawRoutes.length) return null;

  const candidates = rawRoutes.map((route) => {
    const risks = getReportsNearRoute(pickup, dropoff, reports, route.routePath);
    return {
      ...route,
      safetyScore: calculateRouteSafetyScore(risks),
      nearbyDangerZones: risks.length,
    } satisfies RoadRouteCandidate;
  });

  const fastest = pickCandidate(candidates, (a, b) => a.estimatedMinutes - b.estimatedMinutes, []);
  const safest = pickCandidate(
    candidates,
    (a, b) => b.safetyScore - a.safetyScore || a.nearbyDangerZones - b.nearbyDangerZones || a.estimatedMinutes - b.estimatedMinutes,
    [fastest],
  );
  const shortest = pickCandidate(candidates, (a, b) => a.distanceKm - b.distanceKm, [fastest, safest]);

  return {
    source,
    providerLabel,
    options: [
      toRouteOption("fastest", fastest, source, providerLabel),
      toRouteOption("safest", safest, source, providerLabel),
      toRouteOption("shortest", shortest, source, providerLabel),
    ],
  };
}

function pickCandidate(
  candidates: RoadRouteCandidate[],
  compare: (a: RoadRouteCandidate, b: RoadRouteCandidate) => number,
  used: RoadRouteCandidate[],
) {
  const sorted = [...candidates].sort(compare);
  return sorted.find((candidate) => !used.includes(candidate)) ?? sorted[0];
}

function toRouteOption(
  id: EstimatedRouteOption["id"],
  candidate: RoadRouteCandidate,
  source: RouteOptionSource,
  providerLabel: string,
): EstimatedRouteOption {
  const name = id === "fastest" ? "Fastest route" : id === "safest" ? "Highest-confidence route" : "Shortest route";
  const badge =
    id === "safest"
      ? "Recommended"
      : candidate.safetyScore < 45
        ? "Avoid if possible"
        : id === "fastest"
          ? "Fastest"
          : "Shortest";
  const description =
    id === "fastest"
      ? "Road-following route optimized for travel time."
      : id === "safest"
        ? "Road-following option with the strongest active confidence score."
        : "Road-following route with the shortest available distance.";

  return {
    id,
    name,
    badge,
    distanceKm: candidate.distanceKm,
    estimatedMinutes: candidate.estimatedMinutes,
    safetyScore: candidate.safetyScore,
    nearbyDangerZones: candidate.nearbyDangerZones,
    description,
    routePath: candidate.routePath,
    source,
    providerLabel,
    isEstimated: false,
    directions: candidate.directions,
  };
}

async function fetchMapboxRoutes(pickup: RoutePoint, dropoff: RoutePoint, signal?: AbortSignal): Promise<RawRoadRoute[]> {
  const coordinates = `${pickup.longitude},${pickup.latitude};${dropoff.longitude},${dropoff.latitude}`;
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN ?? "",
    alternatives: "true",
    geometries: "geojson",
    overview: "full",
    steps: "true",
  });
  const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?${params.toString()}`, {
    signal,
  });
  if (!response.ok) throw new Error("Mapbox routing failed.");
  const data = (await response.json()) as {
    routes?: Array<{
      distance: number;
      duration: number;
      geometry?: { coordinates?: Array<[number, number]> };
      legs?: Array<{ steps?: Array<{ distance: number; duration: number; name?: string; maneuver?: { instruction?: string } }> }>;
    }>;
  };

  return (data.routes ?? []).map((route) => ({
    routePath: coordinatesToPoints(route.geometry?.coordinates ?? []),
    distanceKm: route.distance / 1000,
    estimatedMinutes: Math.max(3, Math.round(route.duration / 60)),
    directions: mapboxDirections(route.legs ?? []),
  })).filter((route) => route.routePath.length >= 2);
}

async function fetchOpenRouteServiceRoutes(pickup: RoutePoint, dropoff: RoutePoint, signal?: AbortSignal): Promise<RawRoadRoute[]> {
  const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
    method: "POST",
    signal,
    headers: {
      Accept: "application/json, application/geo+json",
      Authorization: OPENROUTESERVICE_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: [
        [pickup.longitude, pickup.latitude],
        [dropoff.longitude, dropoff.latitude],
      ],
      instructions: true,
      alternative_routes: { target_count: 3, share_factor: 0.6, weight_factor: 1.4 },
    }),
  });
  if (!response.ok) throw new Error("OpenRouteService routing failed.");
  const data = (await response.json()) as {
    features?: Array<{
      geometry?: { coordinates?: Array<[number, number]> };
      properties?: {
        summary?: { distance?: number; duration?: number };
        segments?: Array<{ steps?: Array<{ instruction?: string; distance?: number; duration?: number }> }>;
      };
    }>;
  };

  return (data.features ?? []).map((feature) => {
    const summary = feature.properties?.summary;
    return {
      routePath: coordinatesToPoints(feature.geometry?.coordinates ?? []),
      distanceKm: (summary?.distance ?? 0) / 1000,
      estimatedMinutes: Math.max(3, Math.round((summary?.duration ?? 0) / 60)),
      directions: openRouteServiceDirections(feature.properties?.segments ?? []),
    };
  }).filter((route) => route.routePath.length >= 2 && route.distanceKm > 0);
}

async function fetchOsrmDemoRoutes(pickup: RoutePoint, dropoff: RoutePoint, signal?: AbortSignal): Promise<RawRoadRoute[]> {
  const directRoutes = await requestOsrmRoutes([pickup, dropoff], signal, true);
  if (directRoutes.length >= 3) return directRoutes.slice(0, 3);

  const viaRoutes = await Promise.all(
    createOsrmViaPoints(pickup, dropoff).map((point) =>
      requestOsrmRoutes([pickup, point, dropoff], signal, false)
        .then((routes) => routes.slice(0, 1))
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") throw error;
          return [];
        }),
    ),
  );

  return dedupeRawRoutes([...directRoutes, ...viaRoutes.flat()]).slice(0, 3);
}

async function requestOsrmRoutes(points: GeoPoint[], signal: AbortSignal | undefined, alternatives: boolean): Promise<RawRoadRoute[]> {
  const coordinates = points.map((point) => `${point.longitude},${point.latitude}`).join(";");
  const params = new URLSearchParams({
    alternatives: alternatives ? "true" : "false",
    continue_straight: "false",
    geometries: "geojson",
    overview: "full",
    steps: "true",
  });
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?${params.toString()}`, {
    signal,
  });
  if (!response.ok) throw new Error("OSRM demo routing failed.");
  const data = (await response.json()) as {
    routes?: Array<{
      distance: number;
      duration: number;
      geometry?: { coordinates?: Array<[number, number]> };
      legs?: Array<{
        steps?: Array<{ distance: number; duration: number; name?: string; maneuver?: { type?: string; modifier?: string } }>;
      }>;
    }>;
  };

  return (data.routes ?? []).map((route) => ({
    routePath: coordinatesToPoints(route.geometry?.coordinates ?? []),
    distanceKm: route.distance / 1000,
    estimatedMinutes: Math.max(3, Math.round(route.duration / 60)),
    directions: osrmDirections(route.legs ?? []),
  })).filter((route) => route.routePath.length >= 2);
}

function createOsrmViaPoints(pickup: RoutePoint, dropoff: RoutePoint): GeoPoint[] {
  return [1, -1].map((direction) => {
    const latDelta = dropoff.latitude - pickup.latitude;
    const lonDelta = dropoff.longitude - pickup.longitude;
    const length = Math.hypot(latDelta, lonDelta) || 1;
    const offsetMagnitude = Math.min(0.012, Math.max(0.0025, length * 0.22));

    return {
      latitude: (pickup.latitude + dropoff.latitude) / 2 + (-lonDelta / length) * offsetMagnitude * direction,
      longitude: (pickup.longitude + dropoff.longitude) / 2 + (latDelta / length) * offsetMagnitude * direction,
    };
  });
}

function dedupeRawRoutes(routes: RawRoadRoute[]) {
  const seen = new Set<string>();
  return routes.filter((route) => {
    const key = routeSignature(route);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function routeSignature(route: RawRoadRoute) {
  const path = route.routePath;
  const sampleIndexes = [0, Math.floor(path.length * 0.33), Math.floor(path.length * 0.66), path.length - 1];
  const geometry = sampleIndexes
    .map((index) => path[Math.max(0, Math.min(path.length - 1, index))])
    .map((point) => `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`)
    .join("|");
  return `${Math.round(route.distanceKm * 10)}:${route.estimatedMinutes}:${geometry}`;
}

function coordinatesToPoints(coordinates: Array<[number, number]>): GeoPoint[] {
  return coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
}

function mapboxDirections(
  legs: Array<{ steps?: Array<{ distance: number; duration: number; name?: string; maneuver?: { instruction?: string } }> }>,
): EstimatedDirection[] {
  const steps = legs.flatMap((leg) => leg.steps ?? []);
  return normalizeDirections(
    steps.map((step) => ({
      title: step.maneuver?.instruction || `Continue on ${step.name || "route"}`,
      detail: formatStepDetail(step.distance, step.duration),
    })),
  );
}

function openRouteServiceDirections(
  segments: Array<{ steps?: Array<{ instruction?: string; distance?: number; duration?: number }> }>,
): EstimatedDirection[] {
  const steps = segments.flatMap((segment) => segment.steps ?? []);
  return normalizeDirections(
    steps.map((step) => ({
      title: step.instruction || "Continue on route",
      detail: formatStepDetail(step.distance ?? 0, step.duration ?? 0),
    })),
  );
}

function osrmDirections(
  legs: Array<{ steps?: Array<{ distance: number; duration: number; name?: string; maneuver?: { type?: string; modifier?: string } }> }>,
): EstimatedDirection[] {
  const steps = legs.flatMap((leg) => leg.steps ?? []);
  return normalizeDirections(
    steps.map((step) => {
      const action = [step.maneuver?.type, step.maneuver?.modifier].filter(Boolean).join(" ");
      return {
        title: capitalize(action || "continue"),
        detail: `${step.name || "Continue on route"} - ${formatStepDetail(step.distance, step.duration)}`,
      };
    }),
  );
}

function normalizeDirections(directions: EstimatedDirection[]): EstimatedDirection[] {
  const useful = directions.filter((direction) => direction.title.trim());
  return useful.slice(0, 7);
}

function formatStepDetail(distanceMeters: number, durationSeconds: number) {
  const distance = distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${Math.max(20, Math.round(distanceMeters))} m`;
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${distance}, about ${minutes} min`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
