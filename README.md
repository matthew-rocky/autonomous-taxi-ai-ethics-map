# AI Ethics Decision Intelligence

The project has been rebuilt as a modern React + Vite + TypeScript web application. The Streamlit prototype is preserved in `legacy_streamlit/` for reference, but the running app does not use Streamlit or a Python backend.

## What Changed

- Replaced the Streamlit UI with a dark-mode-first AI ethics dashboard.
- Ported the original Python scoring, incident clustering, risk labels, explanations, and safer drop-off recommendations to TypeScript.
- Added scenario assessment, scenario comparison, category risk breakdowns, radar/bar charts, stakeholder impacts, governance controls, and decision brief export.
- Added a new default full-screen `Live Map` tab for pickup/drop-off route reporting.
- Added polished responsive UI with Tailwind CSS, shadcn-style glass panels, Lucide icons, Framer Motion transitions, and Recharts visualizations.

## Tech Stack

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Framer Motion
- Leaflet / React Leaflet
- Recharts
- Lucide React

No FastAPI backend is required because the ethics logic is simple enough to run safely in the browser.

## Live Map Reporting

The app now opens directly to the `Live Map` tab. This is the main reporting experience:

- Interactive OpenStreetMap map with pan and zoom.
- Click-to-place pickup and drop-off pins.
- `Add Pickup Pin` / `Add Drop-off Pin` placement modes.
- Browser geolocation for setting the pickup point when permission is granted.
- Location search using OpenStreetMap Nominatim.
- Estimated route line between pickup and drop-off points.
- Active report markers with severity-based icons and popups.
- Danger-zone overlays around medium, high, and critical reports.
- Two reporting modes inside the Live Map command panel: `Report Route` and `Report Area`.
- `Report Route` preserves pickup/drop-off pins, route summary, issue type, urgency, notes, and instant route report submission.
- `Report Area` lets users click the map, search, or use current location to set an area center, choose a radius, severity, issue type, and submit an area report.
- Live selected-area preview with an animated circular radius before submission.
- Floating filters for route reports, area reports, severity, report type, status, danger zones, route visibility, and active-only reports.
- Situation summary panel with active report counts, critical reports, high-risk zone counts, and nearest report distance.
- Route-risk warning when the selected pickup/drop-off line passes near a high or critical report zone.
- Bottom `Route Preview` drawer appears after pickup and drop-off are selected.
- Expanded route preview includes route summary cards, safety score, estimated alternatives, step-by-step directions, nearby danger zones, and recommended action.
- If no routing API is configured, the app uses the selected pickup/drop-off line plus clearly estimated alternative polylines.
- Situation legend for severity, route reports, area reports, pickup, and drop-off markers.
- Floating glassmorphism report form with issue type, urgency, notes, and submit action.
- Polished confirmation summary after a report is submitted.

If no backend is configured, the map uses realistic local mock route and area reports from `src/data/reports.ts` so the live map never opens empty. Submitting a route or area report immediately adds a marker and danger zone to local state without a page refresh.

## Map API / Environment

No paid map API key is required. By default, the app uses public OpenStreetMap tiles:

```text
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

Optional tile overrides can be provided with Vite environment variables:

```bash
VITE_MAP_TILE_URL=
VITE_MAP_ATTRIBUTION=
```

Optional report API integration can be enabled with:

```bash
VITE_REPORTS_API_URL=
```

When configured, the app expects:

```text
GET /api/reports
POST /api/reports
PATCH /api/reports/:id
```

If the report API is unavailable, the app keeps using local mock/report state and shows a non-blocking warning in the map panel.

Do not hardcode secret tokens in source files. If a private tile provider is used, put the URL/token in a local `.env` file that is not committed.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Open the local URL shown by Vite. The default development URL is:

```text
http://127.0.0.1:5173
```

## Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```text
src/
  App.tsx
  main.tsx
  index.css
  components/
    AnimatedBackground.tsx
    CategoryBreakdown.tsx
    CompareScenarios.tsx
    DecisionBrief.tsx
    Hero.tsx
    Layout.tsx
    LocationSearch.tsx
    MapControls.tsx
    MapReportView.tsx
    map/
      AreaReportPanel.tsx
      DangerZoneLayer.tsx
      MapFilters.tsx
      MapLegend.tsx
      MapReportView.tsx
      ReportMarker.tsx
      ReportModeSelector.tsx
      ReportPopup.tsx
      RouteReportPanel.tsx
      RoutePreviewDrawer.tsx
      RouteOptionCard.tsx
      RouteSafetyScore.tsx
      RouteDirections.tsx
      NearbyRiskList.tsx
      RouteRiskWarning.tsx
      SituationSummary.tsx
    RecommendationPanel.tsx
    ReportForm.tsx
    RiskRadarChart.tsx
    RiskScoreCard.tsx
    ScenarioSelector.tsx
    StakeholderPanel.tsx
  data/
    scenarios.ts
  lib/
    ethicsEngine.ts
    routeRisk.ts
    utils.ts
  types.ts
legacy_streamlit/
  app.py
  data.py
  logic.py
  scenarios.py
  styles.py
  ui_components.py
```

## Ethics Engine

`src/lib/ethicsEngine.ts` ports the original Python logic:

- Normalizes incident reports and timestamps.
- Computes report weights from severity, recency, verification, similar reports, and incident type.
- Clusters nearby incidents into risk zones.
- Evaluates destinations as `Normal`, `Caution`, or `Danger`.
- Preserves the original decision outputs: proceed normally, proceed with caution, or recommend safer nearby drop-off.
- Recommends lower-risk drop-offs within the short-walk limit.

The dashboard adds a normalized 0-100 display score and ethics-category views around the preserved engine output. These UI scores do not replace the original risk label logic.
