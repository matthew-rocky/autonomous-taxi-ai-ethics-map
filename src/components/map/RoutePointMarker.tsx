import L from "leaflet";
import { Marker, Tooltip } from "react-leaflet";
import { stopLeafletEvent } from "@/lib/leafletEvents";
import type { GeoPoint } from "@/types";

export type RoutePointMarkerKind = "pickup" | "dropoff" | "area" | "destination";

interface RoutePointMarkerProps {
  point: GeoPoint;
  kind: RoutePointMarkerKind;
  label: string;
  permanentTooltip?: boolean;
}

export function RoutePointMarker({ point, kind, label, permanentTooltip = true }: RoutePointMarkerProps) {
  return (
    <Marker
      position={[point.latitude, point.longitude]}
      icon={createRoutePointIcon(kind)}
      eventHandlers={stopMapPropagationHandlers()}
    >
      <Tooltip direction="top" offset={[0, -18]} permanent={permanentTooltip}>
        {label}
      </Tooltip>
    </Marker>
  );
}

function createRoutePointIcon(kind: RoutePointMarkerKind) {
  const className =
    kind === "pickup"
      ? "route-marker route-marker-pickup"
      : kind === "dropoff"
        ? "route-marker route-marker-dropoff"
        : kind === "destination"
          ? "route-marker route-marker-destination"
          : "route-marker route-marker-area";
  const label = kind === "pickup" ? "P" : kind === "area" ? "A" : "D";

  return L.divIcon({
    className: "route-marker-shell",
    html: `<div class="${className}"><span>${label}</span></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 38],
    popupAnchor: [0, -34],
  });
}

function stopMapPropagationHandlers() {
  return {
    click: stopLeafletEvent,
    contextmenu: stopLeafletEvent,
    dblclick: stopLeafletEvent,
    mousedown: stopLeafletEvent,
  };
}
