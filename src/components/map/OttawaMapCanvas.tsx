import L from "leaflet";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { useResolvedTheme, type ResolvedTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { GeoPoint } from "@/types";

export const OTTAWA_CENTER_POSITION: [number, number] = [45.4215, -75.6972];

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const TILE_ATTRIBUTION =
  import.meta.env.VITE_MAP_ATTRIBUTION ||
  (MAPBOX_TOKEN
    ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors');

function getTileUrl(theme: ResolvedTheme) {
  if (import.meta.env.VITE_MAP_TILE_URL) return import.meta.env.VITE_MAP_TILE_URL as string;
  if (!MAPBOX_TOKEN) return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const style = theme === "glass-light" ? "streets-v12" : "dark-v11";
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;
}

interface OttawaMapCanvasProps {
  children: ReactNode;
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  scrollWheelZoom?: boolean;
  className?: string;
  zoomControlPosition?: "topleft" | "topright" | "bottomleft" | "bottomright";
  showZoomControl?: boolean;
}

export function OttawaMapCanvas({
  children,
  center = OTTAWA_CENTER_POSITION,
  zoom = 13,
  minZoom = 11,
  maxZoom = 19,
  scrollWheelZoom = true,
  className,
  zoomControlPosition = "bottomright",
  showZoomControl = true,
}: OttawaMapCanvasProps) {
  const resolvedTheme = useResolvedTheme();

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      scrollWheelZoom={scrollWheelZoom}
      className={cn("h-full w-full", className)}
      zoomControl={false}
    >
      <TileLayer key={resolvedTheme} attribution={TILE_ATTRIBUTION} url={getTileUrl(resolvedTheme)} />
      {showZoomControl ? <ZoomControl position={zoomControlPosition} /> : null}
      {children}
    </MapContainer>
  );
}

interface FitMapToPointsProps {
  points: GeoPoint[];
  fallbackCenter?: [number, number];
  fallbackZoom?: number;
  maxZoom?: number;
  padding?: [number, number];
}

export function FitMapToPoints({
  points,
  fallbackCenter = OTTAWA_CENTER_POSITION,
  fallbackZoom = 13,
  maxZoom = 15,
  padding = [28, 28],
}: FitMapToPointsProps) {
  const map = useMap();
  const [paddingX, paddingY] = padding;

  useEffect(() => {
    const validPoints = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
    if (!validPoints.length) {
      map.setView(fallbackCenter, fallbackZoom, { animate: false });
      return;
    }

    if (validPoints.length === 1) {
      const [point] = validPoints;
      map.setView([point.latitude, point.longitude], maxZoom, { animate: false });
      return;
    }

    const bounds = L.latLngBounds(validPoints.map((point) => [point.latitude, point.longitude] as [number, number]));
    map.fitBounds(bounds, { animate: false, maxZoom, padding: [paddingX, paddingY] });
  }, [fallbackCenter, fallbackZoom, map, maxZoom, paddingX, paddingY, points]);

  return null;
}
