import { Circle, Tooltip } from "react-leaflet";
import { Fragment } from "react";
import type { MapReport } from "@/types";
import { stopLeafletEvent } from "@/lib/leafletEvents";
import { getDangerRadius, getReportCenter, getSeverityStyle } from "@/lib/reportUtils";

interface DangerZoneLayerProps {
  reports: MapReport[];
  highlightedReportIds?: string[];
  dimUnrelated?: boolean;
}

export function DangerZoneLayer({ reports, highlightedReportIds = [], dimUnrelated = false }: DangerZoneLayerProps) {
  return (
    <>
      {reports.map((report) => {
        const center = getReportCenter(report);
        const radius = getDangerRadius(report);
        if (!center) return null;
        if (!radius || report.status === "resolved") return null;
        const style = getSeverityStyle(report.severity);
        const isSevere = report.severity === "high" || report.severity === "critical";
        const isCritical = report.severity === "critical";
        const isHighlighted = highlightedReportIds.includes(report.id);
        const dimmed = dimUnrelated && !isHighlighted;
        const position: [number, number] = [center.latitude, center.longitude];

        return (
          <Fragment key={`${report.id}-zone`}>
            {isSevere ? (
              <Circle
                center={position}
                radius={radius * (isCritical ? 1.76 : 1.48)}
                pathOptions={{
                  color: style.color,
                  fillColor: style.fillColor,
                  fillOpacity: dimmed ? 0.012 : isHighlighted ? 0.08 : isCritical ? 0.045 : 0.028,
                  opacity: dimmed ? 0.1 : isHighlighted ? 0.62 : isCritical ? 0.38 : 0.24,
                  weight: isHighlighted ? 2 : 1,
                  className: isCritical ? "danger-zone-aura-critical" : "danger-zone-aura-high",
                }}
                eventHandlers={stopMapPropagationHandlers()}
              />
            ) : null}
            <Circle
              center={position}
              radius={radius * 1.22}
              pathOptions={{
                color: style.color,
                fillColor: style.fillColor,
                fillOpacity: dimmed ? 0.018 : isHighlighted ? 0.13 : isCritical ? 0.075 : report.severity === "medium" ? 0.055 : 0.025,
                opacity: dimmed ? 0.16 : isHighlighted ? 0.78 : isSevere ? 0.48 : 0.22,
                weight: isHighlighted ? 3 : isSevere ? 2 : 1,
                className: isHighlighted
                  ? "danger-zone-pulse route-risk-zone"
                  : isSevere
                    ? "danger-zone-pulse danger-zone-outer"
                    : "danger-zone-outer",
              }}
              eventHandlers={stopMapPropagationHandlers()}
            />
            <Circle
              center={position}
              radius={radius}
              pathOptions={{
                color: style.color,
                fillColor: style.fillColor,
                fillOpacity: dimmed ? 0.032 : isHighlighted ? 0.28 : isCritical ? 0.2 : report.severity === "high" ? 0.15 : 0.085,
                opacity: dimmed ? 0.24 : isHighlighted ? 0.98 : isSevere ? 0.78 : 0.52,
                weight: isHighlighted ? 3 : isSevere ? 2 : 1,
                dashArray: report.severity === "medium" || report.severity === "low" ? "8 10" : undefined,
                className: isHighlighted ? "route-risk-zone" : isSevere ? "danger-zone-glow" : "danger-zone",
              }}
              eventHandlers={stopMapPropagationHandlers()}
            >
              <Tooltip sticky>
                {isHighlighted ? "Near selected route - " : ""}
                {style.label} uncertainty overlay - {radius}m
              </Tooltip>
            </Circle>
            {isSevere ? (
              <Circle
                center={position}
                radius={Math.max(42, radius * 0.34)}
                pathOptions={{
                  color: style.color,
                  fillColor: style.fillColor,
                  fillOpacity: dimmed ? 0.06 : isHighlighted ? 0.36 : isCritical ? 0.3 : 0.21,
                  opacity: dimmed ? 0.32 : isHighlighted ? 0.98 : 0.86,
                  weight: isCritical ? 2 : 1,
                  className: isHighlighted ? "route-risk-zone" : "danger-zone-inner",
                }}
                eventHandlers={stopMapPropagationHandlers()}
              />
            ) : null}
          </Fragment>
        );
      })}
    </>
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
