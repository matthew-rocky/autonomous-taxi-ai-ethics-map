import type { GeoPoint } from "@/types";

export interface RoadSnapResult extends GeoPoint {
  distanceMeters: number;
  name: string;
}

const OSRM_BASE_URL = import.meta.env.VITE_OSRM_BASE_URL || "https://router.project-osrm.org";
const snapCache = new Map<string, RoadSnapResult | null>();
const routeAccessCache = new Map<string, boolean>();

export async function snapPointToNearestRoad(point: GeoPoint, signal?: AbortSignal): Promise<RoadSnapResult | null> {
  const cacheKey = pointCacheKey(point);
  if (snapCache.has(cacheKey)) return snapCache.get(cacheKey) ?? null;

  const params = new URLSearchParams({ number: "1" });
  const response = await fetch(
    `${OSRM_BASE_URL}/nearest/v1/driving/${point.longitude},${point.latitude}?${params.toString()}`,
    { signal },
  );
  if (!response.ok) throw new Error("OSRM nearest failed.");

  const data = (await response.json()) as {
    code?: string;
    waypoints?: Array<{
      distance?: number;
      name?: string;
      location?: [number, number];
    }>;
  };

  const waypoint = data.code === "Ok" ? data.waypoints?.[0] : null;
  const location = waypoint?.location;
  if (!location) {
    snapCache.set(cacheKey, null);
    return null;
  }

  const result = {
    latitude: location[1],
    longitude: location[0],
    distanceMeters: waypoint.distance ?? Number.POSITIVE_INFINITY,
    name: waypoint.name ?? "nearby road",
  } satisfies RoadSnapResult;

  snapCache.set(cacheKey, result);
  return result;
}

export async function hasRoadRouteBetween(start: GeoPoint, end: GeoPoint, signal?: AbortSignal) {
  const cacheKey = `${pointCacheKey(start)}:${pointCacheKey(end)}`;
  if (routeAccessCache.has(cacheKey)) return routeAccessCache.get(cacheKey) ?? false;

  const params = new URLSearchParams({
    alternatives: "false",
    geometries: "geojson",
    overview: "simplified",
    steps: "false",
  });
  const response = await fetch(
    `${OSRM_BASE_URL}/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?${params.toString()}`,
    { signal },
  );
  if (!response.ok) throw new Error("OSRM route validation failed.");

  const data = (await response.json()) as {
    code?: string;
    routes?: Array<{ distance?: number; duration?: number }>;
  };
  const route = data.code === "Ok" ? data.routes?.[0] : null;
  const valid = Boolean(route && Number.isFinite(route.distance) && Number.isFinite(route.duration));
  routeAccessCache.set(cacheKey, valid);
  return valid;
}

function pointCacheKey(point: GeoPoint) {
  return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;
}
