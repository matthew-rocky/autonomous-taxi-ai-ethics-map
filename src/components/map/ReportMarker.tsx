import { AlertTriangle, Clock, Construction, MapPin, Navigation, ShieldAlert, Siren } from "lucide-react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import type { MapReport, ReportSeverity } from "@/types";
import { stopLeafletEvent } from "@/lib/leafletEvents";
import { getReportCenter, getReportKind, getSeverityStyle } from "@/lib/reportUtils";
import { ReportPopup } from "@/components/map/ReportPopup";

interface ReportMarkerProps {
  report: MapReport;
  onResolve: (reportId: string) => void;
  highlighted?: boolean;
  dimmed?: boolean;
}

export function ReportMarker({ report, onResolve, highlighted = false, dimmed = false }: ReportMarkerProps) {
  const center = getReportCenter(report);
  if (!center) return null;

  return (
    <Marker
      position={[center.latitude, center.longitude]}
      icon={createReportIcon(report, highlighted, dimmed)}
      opacity={dimmed ? 0.48 : 1}
      eventHandlers={stopMapPropagationHandlers()}
    >
      <Popup closeButton={false} className="report-popup" eventHandlers={stopMapPropagationHandlers()}>
        <ReportPopup report={report} onResolve={onResolve} />
      </Popup>
    </Marker>
  );
}

function stopMapPropagationHandlers() {
  return {
    click: stopLeafletEvent,
    contextmenu: stopLeafletEvent,
    dblclick: stopLeafletEvent,
    mousedown: stopLeafletEvent,
  };
}

function createReportIcon(report: MapReport, highlighted: boolean, dimmed: boolean) {
  const severityStyle = getSeverityStyle(report.severity);
  const Icon = reportIcon(report.type, report.severity);
  const kind = getReportKind(report);
  const markup = renderToStaticMarkup(
    <div
      className={`report-marker report-marker-${report.severity} report-marker-${kind} ${
        highlighted ? "report-marker-highlighted" : ""
      } ${dimmed ? "report-marker-dimmed" : ""} ${severityStyle.glowClass}`}
    >
      <span className="report-marker-core" style={{ background: severityStyle.fillColor }}>
        <Icon size={18} strokeWidth={2.5} />
      </span>
    </div>,
  );

  return L.divIcon({
    className: "report-marker-shell",
    html: markup,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -24],
  });
}

function reportIcon(type: string, severity: ReportSeverity) {
  if (severity === "critical") return Siren;
  if (type === "Construction") return Construction;
  if (type === "Delay") return Clock;
  if (type === "Route blocked" || type === "Road hazard") return AlertTriangle;
  if (type === "Safety concern") return ShieldAlert;
  if (type === "Pickup issue" || type === "Drop-off issue") return MapPin;
  return Navigation;
}
