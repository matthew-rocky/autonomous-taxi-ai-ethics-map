import type { GeoPoint, RoutePoint } from "@/types";

interface NominatimReverseResponse {
  display_name?: string;
  name?: string;
  address?: NominatimAddress;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  cycleway?: string;
  path?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country_code?: string;
  "ISO3166-2-lvl4"?: string;
  "ISO3166-2-lvl6"?: string;
}

type EndpointType = "pickup" | "dropoff";

const memoryCache = new Map<string, string | null>();
const pendingCache = new Map<string, Promise<string | null>>();
const sessionCachePrefix = "reverse-geocode:";

export async function reverseGeocodePoint(point: GeoPoint, signal?: AbortSignal) {
  const key = cacheKey(point);
  if (memoryCache.has(key)) return memoryCache.get(key) ?? null;

  const cached = readSessionCache(key);
  if (cached !== undefined) {
    memoryCache.set(key, cached);
    return cached;
  }

  const pending = pendingCache.get(key);
  if (pending) return pending;

  const request = fetchReverseGeocode(point, signal)
    .then((address) => {
      memoryCache.set(key, address);
      writeSessionCache(key, address);
      return address;
    })
    .finally(() => pendingCache.delete(key));

  pendingCache.set(key, request);
  return request;
}

export function getRoutePointDisplayLabel(point: RoutePoint | null, type: EndpointType, geocodedAddress?: string | null) {
  if (!point) return `Select ${endpointLabel(type)}`;
  if (geocodedAddress?.trim()) return geocodedAddress.trim();

  const label = point.label.trim();
  if (label && !looksLikeCoordinateLabel(label)) return label;

  return `Selected ${endpointLabel(type)} point`;
}

export function endpointLabel(type: EndpointType) {
  return type === "dropoff" ? "drop-off" : "pickup";
}

async function fetchReverseGeocode(point: GeoPoint, signal?: AbortSignal) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(point.latitude),
    lon: String(point.longitude),
    zoom: "18",
    addressdetails: "1",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) return null;

  const data = (await response.json()) as NominatimReverseResponse;
  return formatNominatimAddress(data);
}

function formatNominatimAddress(data: NominatimReverseResponse) {
  const address = data.address;
  if (!address) return fallbackDisplayName(data.display_name);

  const road = address.road ?? address.pedestrian ?? address.footway ?? address.cycleway ?? address.path;
  const street = [address.house_number, road].filter(Boolean).join(" ").trim();
  const place = street || address.neighbourhood || address.suburb || data.name || fallbackDisplayName(data.display_name);
  const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county;
  const province = provinceCode(address) ?? address.state;
  const provincePostal = [province, address.postcode].filter(Boolean).join(" ").trim();

  return uniqueParts([place, city, provincePostal]).join(", ") || fallbackDisplayName(data.display_name);
}

function provinceCode(address: NominatimAddress) {
  const isoCode = address["ISO3166-2-lvl4"] ?? address["ISO3166-2-lvl6"];
  if (isoCode?.startsWith("CA-")) return isoCode.slice(3);

  const state = address.state?.toLowerCase();
  if (state === "ontario") return "ON";
  if (state === "quebec") return "QC";
  if (state === "british columbia") return "BC";
  if (state === "alberta") return "AB";
  if (state === "manitoba") return "MB";
  if (state === "saskatchewan") return "SK";
  if (state === "nova scotia") return "NS";
  if (state === "new brunswick") return "NB";
  if (state === "newfoundland and labrador") return "NL";
  if (state === "prince edward island") return "PE";
  return null;
}

function fallbackDisplayName(displayName: string | undefined) {
  return displayName?.split(",").slice(0, 4).join(",").trim() ?? null;
}

function uniqueParts(parts: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function cacheKey(point: GeoPoint) {
  return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;
}

function readSessionCache(key: string) {
  try {
    const value = window.sessionStorage.getItem(`${sessionCachePrefix}${key}`);
    if (value === null) return undefined;
    return value || null;
  } catch {
    return undefined;
  }
}

function writeSessionCache(key: string, value: string | null) {
  try {
    window.sessionStorage.setItem(`${sessionCachePrefix}${key}`, value ?? "");
  } catch {
    // In private browsing or storage-restricted contexts, memoryCache still prevents repeat requests this session.
  }
}

function looksLikeCoordinateLabel(label: string) {
  return /pin at\s*-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/i.test(label) || /-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/.test(label);
}
