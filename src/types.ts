export type RiskLabel = "Normal" | "Caution" | "Danger";
export type DisplayRiskLevel = "Low" | "Moderate" | "High" | "Critical";
export type ConfidenceLevel = "white" | "orange" | "red";
export type ConfidenceEvidenceState = "recent" | "sparse" | "stale" | "conflicting";

export interface ConfidenceAssessment {
  level: ConfidenceLevel;
  label: "White" | "Orange" | "Red";
  status: string;
  headline: string;
  action: string;
  plainSummary: string;
  evidenceState: ConfidenceEvidenceState;
  evidenceAvailable: string[];
  originalDropoff: string;
  saferHandoffPoint: string | null;
  tradeoff: string | null;
  overrideRequired: boolean;
  accountabilityRule: string;
  noAlertMessage: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type LocationSource = "map" | "search" | "geolocation" | "manual";

export interface RoutePoint extends GeoPoint {
  label: string;
  source: LocationSource;
}

export type MapPlacementMode = "pickup" | "dropoff" | "area";
export type MapInteractionMode = "explore" | "set-pickup" | "set-dropoff" | "set-area";
export type ReportIssueType =
  | "Pickup issue"
  | "Drop-off issue"
  | "Route issue"
  | "Safety concern"
  | "Delay"
  | "Route blocked"
  | "Construction"
  | "Road hazard"
  | "Other";
export type ReportUrgency = "Low" | "Medium" | "High";

export type ReportSeverity = "low" | "medium" | "high" | "critical";
export type ReportStatus = "active" | "pending" | "resolved";
export type ReportKind = "route" | "area";
export type ReportingMode = "route" | "area";

export interface MapReport {
  id: string;
  kind?: ReportKind;
  type: string;
  title: string;
  description: string;
  severity: ReportSeverity;
  status: ReportStatus;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  pickup?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  dropoff?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface MapFiltersState {
  severities: ReportSeverity[];
  types: string[];
  statuses: ReportStatus[];
  kinds: ReportKind[];
  showReports: boolean;
  showDangerZones: boolean;
  showRoute: boolean;
  onlyActive: boolean;
}

export interface Destination extends GeoPoint {
  name: string;
  category: string;
  description: string;
}

export interface SafeDropoff extends Destination {
  explanation: string;
}

export interface Incident extends GeoPoint {
  id: string;
  incidentType: string;
  severity: number;
  description: string;
  timestamp: string;
  verified: boolean;
  similarReports: number;
  scenarioTag: string;
}

export interface IncidentRecord extends Incident {
  timestampDate: Date;
  distanceKm?: number;
  baseWeight?: number;
  weight?: number;
  proximity?: number;
}

export interface Scenario {
  destination: string;
  summary: string;
  expected: RiskLabel;
  incidents: Incident[];
}

export interface RiskZone extends GeoPoint {
  zoneId: string;
  riskLabel: RiskLabel;
  score: number;
  radiusM: number;
  incidentCount: number;
  averageSeverity: number;
  recentCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  confidence: number;
  incidentTypes: string;
  latestTimestamp: string;
  explanation: string;
  distanceToEdgeKm?: number;
}

export interface CategoryScore {
  key: "fairness" | "privacy" | "transparency" | "accountability" | "safety" | "societal";
  name: string;
  score: number;
  tone: "violet" | "cyan" | "emerald" | "amber" | "rose" | "blue";
  summary: string;
}

export interface StakeholderImpact {
  stakeholder: string;
  impact: string;
  tone: "emerald" | "amber" | "rose" | "cyan" | "violet";
}

export interface GovernanceItem {
  label: string;
  status: "Required" | "Recommended" | "Monitor" | "Clear";
  detail: string;
}

export interface DropoffRecommendation extends SafeDropoff {
  riskLabel: RiskLabel;
  riskScore: number;
  distanceKm: number;
  walkingMinutes: number;
  rankScore: number;
  recommendation: string;
}

export interface RiskEvaluation {
  label: RiskLabel;
  riskLevel: DisplayRiskLevel;
  score: number;
  normalizedScore: number;
  decision: string;
  finalDecision: string;
  distanceToNearestReportKm: number | null;
  incidentCount: number;
  recentCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  averageSeverity: number;
  clustered: boolean;
  evidence: string;
  reasons: string[];
  nearbyReports: IncidentRecord[];
  nearestZone: RiskZone | null;
  insideZone: boolean;
  nearZone: boolean;
  categoryBreakdown: CategoryScore[];
  stakeholderImpacts: StakeholderImpact[];
  governanceChecklist: GovernanceItem[];
  topConcerns: string[];
  saferDropoffs: DropoffRecommendation[];
  confidence: ConfidenceAssessment;
}

export interface ScenarioAnalysis {
  scenarioName: string;
  scenario: Scenario;
  destination: Destination;
  zones: RiskZone[];
  evaluation: RiskEvaluation;
}

export type ViewMode = "map" | "assessment" | "compare" | "brief" | "framework";
