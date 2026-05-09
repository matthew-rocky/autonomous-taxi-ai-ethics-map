import { useMemo } from "react";
import { Pane } from "react-leaflet";
import { DangerZoneLayer } from "@/components/map/DangerZoneLayer";
import { FitMapToPoints, OttawaMapCanvas } from "@/components/map/OttawaMapCanvas";
import { ReportMarker } from "@/components/map/ReportMarker";
import { RoutePointMarker } from "@/components/map/RoutePointMarker";
import type { GeoPoint, Incident, MapReport, ReportSeverity, RiskZone, ScenarioAnalysis } from "@/types";

interface AssessmentSignalMapProps {
  analysis: ScenarioAnalysis;
}

const ASSESSMENT_MAP_PADDING: [number, number] = [34, 34];

export function AssessmentSignalMap({ analysis }: AssessmentSignalMapProps) {
  const { reportMarkers, zoneReports, fitPoints } = useMemo(() => buildAssessmentMapData(analysis), [analysis]);

  return (
    <div
      className="relative mt-5 h-[260px] overflow-hidden rounded-lg border border-white/10 bg-slate-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:h-[310px]"
      aria-label={`Ottawa signal map for ${analysis.destination.name}`}
    >
      <OttawaMapCanvas zoom={13} minZoom={11} maxZoom={18} scrollWheelZoom={false} className="assessment-signal-leaflet">
        <FitMapToPoints points={fitPoints} maxZoom={15} padding={ASSESSMENT_MAP_PADDING} />

        <Pane name="assessment-signal-zones" style={{ zIndex: 350 }}>
          <DangerZoneLayer reports={zoneReports} highlightedReportIds={zoneReports.map((report) => report.id)} />
        </Pane>

        <Pane name="assessment-signal-markers" style={{ zIndex: 620 }}>
          {reportMarkers.map((report) => (
            <ReportMarker key={report.id} report={report} highlighted={report.severity === "high" || report.severity === "critical"} />
          ))}
          <RoutePointMarker point={analysis.destination} kind="destination" label={analysis.destination.name} />
        </Pane>
      </OttawaMapCanvas>

      <div className="map-vignette-side pointer-events-none absolute inset-0" />
      <div className="map-vignette-bottom pointer-events-none absolute inset-x-0 bottom-0 h-24" />

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
        <LegendPill color="bg-cyan-300" label="Destination" />
        <LegendPill color="bg-amber-300" label="Uncertainty overlay" />
        <LegendPill color="bg-rose-300" label="Low-confidence report" />
        <LegendPill color="bg-fuchsia-300" label="Critical signal" />
      </div>
    </div>
  );
}

function buildAssessmentMapData(analysis: ScenarioAnalysis) {
  const reportMarkers = analysis.scenario.incidents.map(incidentToMapReport);
  const zoneReports = analysis.zones.map(zoneToMapReport);
  const fitPoints: GeoPoint[] = [
    analysis.destination,
    ...analysis.scenario.incidents,
    ...analysis.zones.map((zone) => ({ latitude: zone.latitude, longitude: zone.longitude })),
  ];

  return { reportMarkers, zoneReports, fitPoints };
}

function incidentToMapReport(incident: Incident): MapReport {
  const severity = incidentSeverity(incident.severity);
  const verifiedText = incident.verified ? "verified" : "unverified";

  return {
    id: `assessment-${incident.id}`,
    kind: "area",
    type: incident.incidentType,
    title: incident.incidentType,
    description: `${incident.description} ${incident.similarReports} similar report${incident.similarReports === 1 ? "" : "s"}; ${verifiedText}.`,
    severity,
    status: "active",
    createdAt: toIsoTimestamp(incident.timestamp),
    latitude: incident.latitude,
    longitude: incident.longitude,
    radiusMeters: severity === "critical" ? 220 : severity === "high" ? 170 : severity === "medium" ? 120 : 0,
  };
}

function zoneToMapReport(zone: RiskZone): MapReport {
  const severity = zoneSeverity(zone);

  return {
    id: `assessment-${zone.zoneId}`,
    kind: "area",
    type: zone.riskLabel === "Danger" ? "Low-confidence area" : "Uncertain signal area",
    title: `${zone.riskLabel} uncertainty overlay`,
    description: zone.explanation,
    severity,
    status: "active",
    createdAt: toIsoTimestamp(zone.latestTimestamp),
    latitude: zone.latitude,
    longitude: zone.longitude,
    radiusMeters: zone.radiusM,
  };
}

function incidentSeverity(severity: number): ReportSeverity {
  if (severity >= 5) return "critical";
  if (severity >= 4) return "high";
  if (severity >= 3) return "medium";
  return "low";
}

function zoneSeverity(zone: RiskZone): ReportSeverity {
  if (zone.riskLabel === "Danger" && (zone.averageSeverity >= 4.5 || zone.incidentCount >= 4)) return "critical";
  if (zone.riskLabel === "Danger") return "high";
  if (zone.riskLabel === "Caution") return "medium";
  return "low";
}

function toIsoTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/72 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur">
      <span className={`size-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
