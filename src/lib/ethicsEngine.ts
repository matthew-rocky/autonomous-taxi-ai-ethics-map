import { DESTINATIONS, SAFE_DROPOFFS, destinationsByName } from "@/data/scenarios";
import type {
  CategoryScore,
  Destination,
  DisplayRiskLevel,
  DropoffRecommendation,
  GovernanceItem,
  Incident,
  IncidentRecord,
  RiskEvaluation,
  RiskLabel,
  RiskZone,
  Scenario,
  ScenarioAnalysis,
  StakeholderImpact,
} from "@/types";
import { clamp, round } from "@/lib/utils";
import { buildDestinationConfidence } from "@/lib/confidence";

export const EARTH_RADIUS_KM = 6371.0088;
export const RISK_RADIUS_KM = 0.48;
export const NEAR_RISK_RADIUS_KM = 0.82;
export const WALKING_SPEED_KM_PER_HOUR = 4.8;
export const MAX_SAFE_DROPOFF_DISTANCE_KM = 0.9;

const INCIDENT_TYPE_RISK_MULTIPLIERS: Record<string, number> = {
  Violence: 1.35,
};

type CoreEvaluation = Omit<
  RiskEvaluation,
  | "riskLevel"
  | "normalizedScore"
  | "finalDecision"
  | "categoryBreakdown"
  | "stakeholderImpacts"
  | "governanceChecklist"
  | "topConcerns"
  | "saferDropoffs"
  | "confidence"
>;

export function normalizeIncidents(incidents: Iterable<Incident>): IncidentRecord[] {
  return Array.from(incidents)
    .map((incident) => {
      const latitude = Number(incident.latitude);
      const longitude = Number(incident.longitude);
      const timestampDate = new Date(incident.timestamp);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Number.isNaN(timestampDate.getTime())) {
        return null;
      }

      return {
        ...incident,
        latitude,
        longitude,
        severity: clamp(Number(incident.severity) || 1, 1, 5),
        similarReports: clamp(Number(incident.similarReports) || 0, 0, 25),
        verified: Boolean(incident.verified),
        timestampDate,
      } satisfies IncidentRecord;
    })
    .filter((incident): incident is IncidentRecord => incident !== null);
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lon1Rad = (lon1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const lon2Rad = (lon2 * Math.PI) / 180;
  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function addDistances<T extends IncidentRecord>(incidents: T[], latitude: number, longitude: number): T[] {
  return incidents.map((incident) => ({
    ...incident,
    distanceKm: haversineKm(latitude, longitude, incident.latitude, incident.longitude),
  }));
}

export function recencyWeight(timestamp: Date, now = new Date()) {
  if (Number.isNaN(timestamp.getTime())) return 0.1;
  const ageHours = Math.max((now.getTime() - timestamp.getTime()) / 3_600_000, 0);
  if (ageHours <= 2) return 1;
  if (ageHours <= 6) return 0.86;
  if (ageHours <= 24) return 0.62;
  if (ageHours <= 72) return 0.34;
  return 0.14;
}

export function reportWeight(report: IncidentRecord, now = new Date()) {
  const severityComponent = report.severity / 5;
  const verifiedComponent = report.verified ? 1.14 : 0.82;
  const similarComponent = Math.min(1.45, 1 + report.similarReports * 0.1);
  const typeComponent = INCIDENT_TYPE_RISK_MULTIPLIERS[report.incidentType] ?? 1;
  return severityComponent * recencyWeight(report.timestampDate, now) * verifiedComponent * similarComponent * typeComponent;
}

function riskLabelFromMetrics(
  score: number,
  count: number,
  avgSeverity: number,
  recentCount: number,
  _verifiedCount: number,
): RiskLabel {
  const repeatedEvidence = count >= 3 && recentCount >= 2;
  const seriousCluster = count >= 2 && avgSeverity >= 4 && recentCount >= 2;

  if (score >= 2.15 || (repeatedEvidence && avgSeverity >= 3.45) || seriousCluster) {
    return "Danger";
  }
  if (score >= 0.58 || (count >= 2 && avgSeverity >= 2.4) || (count >= 1 && avgSeverity >= 4)) {
    return "Caution";
  }
  return "Normal";
}

function zoneExplanation(
  label: RiskLabel,
  count: number,
  avgSeverity: number,
  recentCount: number,
  verifiedCount: number,
  incidentTypes: string[],
) {
  const typeText = incidentTypes.length ? incidentTypes.slice(0, 2).join(", ").toLowerCase() : "community alerts";

  if (label === "Danger") {
    return `${count} nearby reports include ${typeText}, with an average severity of ${avgSeverity.toFixed(
      1,
    )}. ${recentCount} were recent and ${verifiedCount} are verified, so the exact drop-off should not be treated as normal.`;
  }

  return `${count} nearby reports include ${typeText}. The evidence is meaningful but not conclusive, so the system should communicate caution instead of acting fully confident.`;
}

function countRecent(incidents: IncidentRecord[], now = new Date()) {
  return incidents.filter((incident) => now.getTime() - incident.timestampDate.getTime() <= 24 * 3_600_000).length;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function mostCommonIncidentTypes(incidents: IncidentRecord[]) {
  const counts = new Map<string, number>();
  incidents.forEach((incident) => counts.set(incident.incidentType, (counts.get(incident.incidentType) ?? 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type)
    .slice(0, 3);
}

export function buildRiskZones(incidents: Iterable<Incident>): RiskZone[] {
  const normalized = normalizeIncidents(incidents);
  if (!normalized.length) return [];

  const now = new Date();
  const weighted = normalized.map((incident) => ({
    ...incident,
    baseWeight: reportWeight(incident, now),
  }));

  const ordered = [...weighted].sort((a, b) => {
    const weightDelta = (b.baseWeight ?? 0) - (a.baseWeight ?? 0);
    return weightDelta !== 0 ? weightDelta : b.severity - a.severity;
  });

  const assignedIds = new Set<string>();
  const zones: RiskZone[] = [];

  ordered.forEach((seed) => {
    if (assignedIds.has(seed.id)) return;

    const cluster = addDistances(weighted, seed.latitude, seed.longitude).filter(
      (incident) => (incident.distanceKm ?? Number.POSITIVE_INFINITY) <= RISK_RADIUS_KM,
    );
    if (!cluster.length) return;

    cluster.forEach((incident) => assignedIds.add(incident.id));

    const weights = cluster.map((incident) => Math.max(incident.baseWeight ?? 0, 0.05));
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    const latitude = cluster.reduce((sum, incident, index) => sum + incident.latitude * weights[index], 0) / totalWeight;
    const longitude =
      cluster.reduce((sum, incident, index) => sum + incident.longitude * weights[index], 0) / totalWeight;

    const centeredCluster = addDistances(cluster, latitude, longitude);
    const score = centeredCluster.reduce((sum, incident) => {
      const proximity = Math.max(0.2, 1 - (incident.distanceKm ?? 0) / RISK_RADIUS_KM);
      return sum + (incident.baseWeight ?? 0) * proximity;
    }, 0);

    const count = centeredCluster.length;
    const recentCount = countRecent(centeredCluster, now);
    const verifiedCount = centeredCluster.filter((incident) => incident.verified).length;
    const avgSeverity = average(centeredCluster.map((incident) => incident.severity));
    const label = riskLabelFromMetrics(score, count, avgSeverity, recentCount, verifiedCount);

    if (label === "Normal") return;

    const radius = Math.min(620, 210 + count * 78 + avgSeverity * 24 + score * 55);
    const confidence = Math.min(0.96, 0.34 + count * 0.12 + verifiedCount * 0.08 + recentCount * 0.04);
    const incidentTypes = mostCommonIncidentTypes(centeredCluster);
    const latest = centeredCluster.reduce(
      (current, incident) =>
        incident.timestampDate.getTime() > current.getTime() ? incident.timestampDate : current,
      centeredCluster[0].timestampDate,
    );

    zones.push({
      zoneId: `zone-${zones.length + 1}`,
      latitude,
      longitude,
      riskLabel: label,
      score: round(score, 2),
      radiusM: Math.trunc(radius),
      incidentCount: count,
      averageSeverity: round(avgSeverity, 1),
      recentCount,
      verifiedCount,
      unverifiedCount: count - verifiedCount,
      confidence: round(confidence, 2),
      incidentTypes: incidentTypes.join(", "),
      latestTimestamp: latest.toISOString(),
      explanation: zoneExplanation(label, count, avgSeverity, recentCount, verifiedCount, incidentTypes),
    });
  });

  return zones;
}

function evaluationReasons(
  label: RiskLabel,
  count: number,
  avgSeverity: number,
  recentCount: number,
  verifiedCount: number,
  unverifiedCount: number,
  insideZone: boolean,
  nearZone: boolean,
) {
  const reasons: string[] = [];

  if (insideZone) reasons.push("The destination falls inside an active uncertainty overlay.");
  else if (nearZone) reasons.push("The destination is near an active uncertainty overlay.");

  if (count) {
    reasons.push(`${count} report${count !== 1 ? "s" : ""} fall within the immediate drop-off radius.`);
    reasons.push(`Average severity is ${avgSeverity.toFixed(1)} out of 5.`);
  }
  if (recentCount) reasons.push(`${recentCount} report${recentCount !== 1 ? "s are" : " is"} less than 24 hours old.`);
  if (verifiedCount) reasons.push(`${verifiedCount} report${verifiedCount !== 1 ? "s are" : " is"} verified.`);
  if (unverifiedCount) {
    reasons.push(`${unverifiedCount} report${unverifiedCount !== 1 ? "s are" : " is"} still unverified, so uncertainty remains.`);
  }
  if (label === "Normal") {
    reasons.push("No active community alerts are strong enough to alter the drop-off.");
    reasons.push("No information does not mean safe.");
  }

  return reasons;
}

function evidenceSentence(
  label: RiskLabel,
  count: number,
  avgSeverity: number,
  _recentCount: number,
  _verifiedCount: number,
  _unverifiedCount: number,
  clustered: boolean,
) {
  if (label === "Danger") {
    const clusterText = clustered ? " and the reports are clustered" : "";
    return `This destination has ${count} nearby reports with average severity ${avgSeverity.toFixed(
      1,
    )}${clusterText}. Confidence in the exact drop-off is low, so a safer nearby handoff is recommended.`;
  }

  if (label === "Caution") {
    return `This area has ${count} relevant report${count !== 1 ? "s" : ""}. Conditions are uncertain, so the system should warn the rider before proceeding.`;
  }

  if (count) {
    return `There are ${count} low-signal report${count !== 1 ? "s" : ""} nearby. The evidence does not justify rerouting, but it should remain visible.`;
  }

  return "No active community alerts are currently near this destination. That is not the same as a safety guarantee.";
}

function evaluateLocationCore(
  latitude: number,
  longitude: number,
  incidents: Iterable<Incident>,
  zones: RiskZone[] = buildRiskZones(incidents),
): CoreEvaluation {
  const normalized = normalizeIncidents(incidents);

  let insideZone = false;
  let nearZone = false;
  let nearestZone: RiskZone | null = null;
  let nearestZoneEdgeKm: number | null = null;

  for (const zone of zones) {
    const centerDistance = haversineKm(latitude, longitude, zone.latitude, zone.longitude);
    const zoneRadiusKm = zone.radiusM / 1000;
    const edgeDistance = centerDistance - zoneRadiusKm;

    if (nearestZoneEdgeKm === null || edgeDistance < nearestZoneEdgeKm) {
      nearestZoneEdgeKm = edgeDistance;
      nearestZone = {
        ...zone,
        distanceToEdgeKm: round(Math.max(edgeDistance, 0), 3),
      };
    }
    if (centerDistance <= zoneRadiusKm) insideZone = true;
    else if (edgeDistance <= 0.28) nearZone = true;
  }

  if (!normalized.length) {
    return {
      label: "Normal",
      score: 0,
      decision: "Proceed normally",
      distanceToNearestReportKm: null,
      incidentCount: 0,
      recentCount: 0,
      verifiedCount: 0,
      unverifiedCount: 0,
      averageSeverity: 0,
      clustered: false,
      evidence:
        "No active community alerts are currently near this destination. That is not the same as a safety guarantee.",
      reasons: ["No recent reports were found near the selected point.", "No information does not mean safe."],
      nearbyReports: [],
      nearestZone,
      insideZone,
      nearZone,
    };
  }

  const now = new Date();
  const withDistances = addDistances(normalized, latitude, longitude);
  const nearby = withDistances
    .filter((incident) => (incident.distanceKm ?? Number.POSITIVE_INFINITY) <= NEAR_RISK_RADIUS_KM)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  const relevant = withDistances.filter(
    (incident) => (incident.distanceKm ?? Number.POSITIVE_INFINITY) <= RISK_RADIUS_KM,
  );
  const nearestDistance = Math.min(...withDistances.map((incident) => incident.distanceKm ?? Number.POSITIVE_INFINITY));

  if (!relevant.length) {
    const label: RiskLabel = nearZone && nearestZone && nearestZone.riskLabel === "Danger" ? "Caution" : "Normal";
    const reasons = [
      "No reports fall inside the immediate drop-off radius.",
      "No information does not mean safe; it means the system has no active community alert at this point.",
    ];
    if (label === "Caution") reasons.unshift("The destination is near an active low-confidence area.");

    return {
      label,
      score: 0,
      decision: label === "Caution" ? "Proceed with caution" : "Proceed normally",
      distanceToNearestReportKm: Number.isFinite(nearestDistance) ? nearestDistance : null,
      incidentCount: 0,
      recentCount: 0,
      verifiedCount: 0,
      unverifiedCount: 0,
      averageSeverity: 0,
      clustered: false,
      evidence:
        label === "Caution"
          ? "The destination is close to a flagged area, so cautious behavior is appropriate."
          : "No active community alerts are currently near this destination. That is not the same as a safety guarantee.",
      reasons,
      nearbyReports: nearby.slice(0, 5),
      nearestZone,
      insideZone,
      nearZone,
    };
  }

  const weightedRelevant = relevant.map((incident) => {
    const weight = reportWeight(incident, now);
    const proximity = Math.max(0.15, 1 - (incident.distanceKm ?? 0) / RISK_RADIUS_KM);
    return { ...incident, weight, proximity };
  });
  const score = weightedRelevant.reduce((sum, incident) => sum + (incident.weight ?? 0) * (incident.proximity ?? 0), 0);
  const count = weightedRelevant.length;
  const recentCount = countRecent(weightedRelevant, now);
  const verifiedCount = weightedRelevant.filter((incident) => incident.verified).length;
  const unverifiedCount = count - verifiedCount;
  const avgSeverity = average(weightedRelevant.map((incident) => incident.severity));
  const maxDistance = Math.max(...weightedRelevant.map((incident) => incident.distanceKm ?? 0));
  const clustered = count >= 3 && maxDistance <= RISK_RADIUS_KM;

  let label = riskLabelFromMetrics(score, count, avgSeverity, recentCount, verifiedCount);
  if (insideZone && nearestZone) {
    if (nearestZone.riskLabel === "Danger") label = "Danger";
    else if (label === "Normal") label = "Caution";
  } else if (nearZone && nearestZone?.riskLabel === "Danger" && label === "Normal") {
    label = "Caution";
  }

  const decision: Record<RiskLabel, string> = {
    Normal: "Proceed normally",
    Caution: "Warn rider and recommend safer nearby drop-off",
    Danger: "Strongly recommend safer nearby handoff",
  };

  return {
    label,
    score: round(score, 2),
    decision: decision[label],
    distanceToNearestReportKm: Number.isFinite(nearestDistance) ? nearestDistance : null,
    incidentCount: count,
    recentCount,
    verifiedCount,
    unverifiedCount,
    averageSeverity: round(avgSeverity, 1),
    clustered,
    evidence: evidenceSentence(label, count, avgSeverity, recentCount, verifiedCount, unverifiedCount, clustered),
    reasons: evaluationReasons(label, count, avgSeverity, recentCount, verifiedCount, unverifiedCount, insideZone, nearZone),
    nearbyReports: nearby.slice(0, 8),
    nearestZone,
    insideZone,
    nearZone,
  };
}

function normalizedRiskScore(core: CoreEvaluation) {
  const labelBase = core.label === "Danger" ? 70 : core.label === "Caution" ? 42 : 10;
  const evidencePressure =
    core.score * 15 +
    core.incidentCount * 3.8 +
    core.recentCount * 3.4 +
    core.verifiedCount * 2.2 +
    core.unverifiedCount * 1.4 +
    core.averageSeverity * 2.8;
  const zonePressure = (core.insideZone ? 8 : 0) + (core.nearZone ? 4 : 0) + (core.clustered ? 4 : 0);
  const normalOffset = core.label === "Normal" ? -8 : 0;
  return Math.trunc(clamp(labelBase + evidencePressure + zonePressure + normalOffset, 4, 100));
}

function displayRiskLevel(core: CoreEvaluation, normalizedScore: number): DisplayRiskLevel {
  if (normalizedScore >= 86 || (core.label === "Danger" && core.score >= 2.65)) return "Critical";
  if (normalizedScore >= 68 || core.label === "Danger") return "High";
  if (normalizedScore >= 34 || core.label === "Caution") return "Moderate";
  return "Low";
}

function categoryBreakdown(core: CoreEvaluation, normalizedScore: number): CategoryScore[] {
  const safety = normalizedScore;
  const transparency = clamp(
    22 + core.unverifiedCount * 8 + (core.label === "Caution" ? 14 : 0) + (core.label === "Danger" ? 10 : 0),
    8,
    92,
  );
  const accountability = clamp(
    20 + core.incidentCount * 4 + core.recentCount * 5 + (core.insideZone ? 16 : 0) + (core.label === "Danger" ? 14 : 0),
    10,
    96,
  );
  const privacy = clamp(16 + core.incidentCount * 3 + core.unverifiedCount * 4, 8, 74);
  const fairness = clamp(18 + core.unverifiedCount * 8 + (core.incidentCount === 0 ? 12 : 0) + (core.nearZone ? 8 : 0), 10, 78);
  const societal = clamp(
    20 + core.incidentCount * 4 + core.averageSeverity * 5 + (core.label === "Danger" ? 18 : 0),
    10,
    96,
  );

  return [
    {
      key: "safety",
      name: "Safety",
      score: safety,
      tone: "rose",
      summary: "Physical exposure, signal severity, clustering, and safer handoff need.",
    },
    {
      key: "accountability",
      name: "Accountability",
      score: Math.trunc(accountability),
      tone: "amber",
      summary: "Operator duty to explain, override, monitor, and justify the final action.",
    },
    {
      key: "transparency",
      name: "Transparency",
      score: Math.trunc(transparency),
      tone: "cyan",
      summary: "How clearly the system communicates evidence, uncertainty, and limits.",
    },
    {
      key: "fairness",
      name: "Fairness",
      score: Math.trunc(fairness),
      tone: "violet",
      summary: "Concern about overreacting to uneven community reports or underserving sparse areas.",
    },
    {
      key: "privacy",
      name: "Privacy",
      score: Math.trunc(privacy),
      tone: "blue",
      summary: "Location report sensitivity and need for minimal, non-identifying incident data.",
    },
    {
      key: "societal",
      name: "Societal Impact",
      score: Math.trunc(societal),
      tone: "emerald",
      summary: "Effects on riders, neighborhoods, public services, and trust in autonomy.",
    },
  ];
}

function stakeholderImpacts(core: CoreEvaluation): StakeholderImpact[] {
  if (core.label === "Danger") {
    return [
      {
        stakeholder: "Rider",
        impact: "Exact curbside arrival has low confidence; the system should offer a short-walk alternative.",
        tone: "rose",
      },
      {
        stakeholder: "Operator",
        impact: "Override requires explicit justification because accountability matters when confidence is low.",
        tone: "amber",
      },
      {
        stakeholder: "Community",
        impact: "Concentrated reports are surfaced without claiming certainty about every person or block.",
        tone: "cyan",
      },
    ];
  }

  if (core.label === "Caution") {
    return [
      {
        stakeholder: "Rider",
        impact: "Proceeding is possible, but the uncertainty warning should be visible before drop-off.",
        tone: "amber",
      },
      {
        stakeholder: "Operator",
        impact: "The system should monitor additional reports and avoid overconfident language.",
        tone: "cyan",
      },
      {
        stakeholder: "Community",
        impact: "Low-confidence reports remain visible without turning the area into a red zone.",
        tone: "violet",
      },
    ];
  }

  return [
    {
      stakeholder: "Rider",
      impact: "No active alert changes the trip, but the app avoids implying a safety guarantee.",
      tone: "emerald",
    },
    {
      stakeholder: "Operator",
      impact: "Continue passive monitoring and keep the evidence trail available.",
      tone: "cyan",
    },
    {
      stakeholder: "Community",
      impact: "Sparse data is treated cautiously so silence is not mistaken for proof of safety.",
      tone: "violet",
    },
  ];
}

function governanceChecklist(core: CoreEvaluation): GovernanceItem[] {
  if (core.label === "Danger") {
    return [
      {
        label: "Do not normalize exact drop-off",
        status: "Required",
        detail: "Recommend a higher-confidence curbside option within the short-walk limit.",
      },
      {
        label: "Show evidence",
        status: "Required",
        detail: "Display report count, severity, recency, verification, and uncertainty language.",
      },
      {
        label: "Operator override log",
        status: "Required",
        detail: "Any decision to proceed should record why alternatives were not acceptable.",
      },
    ];
  }

  if (core.label === "Caution") {
    return [
      {
        label: "Warn before proceeding",
        status: "Required",
        detail: "The rider should see the uncertainty state and evidence before final confirmation.",
      },
      {
        label: "Monitor updates",
        status: "Recommended",
        detail: "Recompute the decision if a verified or severe report is added nearby.",
      },
      {
        label: "Keep uncertainty visible",
        status: "Recommended",
        detail: "Avoid language that implies the destination is verified safe.",
      },
    ];
  }

  return [
    {
      label: "Proceed with caveat",
      status: "Clear",
      detail: "No active alert changes the drop-off decision right now.",
    },
    {
      label: "Do not overclaim safety",
      status: "Monitor",
      detail: "Keep the distinction between no alert and known safe visible.",
    },
    {
      label: "Maintain audit trail",
      status: "Monitor",
      detail: "Preserve report inputs and scoring state for later review.",
    },
  ];
}

function finalDecision(core: CoreEvaluation) {
  if (core.label === "Danger") {
    return "Confidence Level: Red - Low confidence in exact drop-off. Do not complete the exact drop-off as normal unless a human operator records a justified override; prefer a safer nearby handoff point.";
  }
  if (core.label === "Caution") {
    return "Confidence Level: Orange - Conditions uncertain. Warn the rider, recommend a safer nearby drop-off, and keep the uncertainty visible.";
  }
  return "Confidence Level: White - Normal Confidence. Proceed normally while communicating that no active alert is not the same as a safety guarantee.";
}

function topConcerns(core: CoreEvaluation) {
  const concerns = core.reasons.filter((reason) => !reason.includes("No information")).slice(0, 3);
  if (concerns.length) return concerns;
  return [core.evidence];
}

function recommendationSentence(candidate: Destination, candidateEval: CoreEvaluation, walkingMinutes: number) {
  if (candidateEval.label === "Normal") {
    return `Adds about ${walkingMinutes} minutes on foot and provides a higher-confidence handoff point.`;
  }
  if (candidateEval.label === "Caution") {
    return `Adds about ${walkingMinutes} minutes and lowers uncertainty, though some caution remains.`;
  }
  return "This option is still low confidence; use it only if higher-confidence alternatives are unavailable.";
}

export function recommendSaferDropoffs(
  destination: Destination,
  incidents: Iterable<Incident>,
  limit = 4,
  maxDistanceKm = MAX_SAFE_DROPOFF_DISTANCE_KM,
): DropoffRecommendation[] {
  const zones = buildRiskZones(incidents);
  const recommendations: DropoffRecommendation[] = [];

  SAFE_DROPOFFS.forEach((candidate) => {
    const distanceKm = haversineKm(destination.latitude, destination.longitude, candidate.latitude, candidate.longitude);
    if (distanceKm > maxDistanceKm) return;

    const candidateEval = evaluateLocationCore(candidate.latitude, candidate.longitude, incidents, zones);
    const walkingMinutes = Math.max(2, Math.round((distanceKm / WALKING_SPEED_KM_PER_HOUR) * 60));
    const riskRank: Record<RiskLabel, number> = { Normal: 0, Caution: 1, Danger: 2 };

    recommendations.push({
      ...candidate,
      riskLabel: candidateEval.label,
      riskScore: candidateEval.score,
      distanceKm: round(distanceKm, 2),
      walkingMinutes,
      rankScore: riskRank[candidateEval.label] * 100 + distanceKm * 8 + candidateEval.score,
      recommendation: recommendationSentence(candidate, candidateEval, walkingMinutes),
    });
  });

  return recommendations.sort((a, b) => a.rankScore - b.rankScore).slice(0, limit);
}

function enrichEvaluation(
  core: CoreEvaluation,
  destination: Destination | null,
  incidents: Iterable<Incident>,
  zones: RiskZone[],
): RiskEvaluation {
  const normalizedScore = normalizedRiskScore(core);
  const riskLevel = displayRiskLevel(core, normalizedScore);
  const preliminaryConfidence = buildDestinationConfidence(core, {
    originalDropoff: destination?.name ?? "Selected drop-off",
    saferHandoffPoint: null,
  });
  const saferDropoffs = preliminaryConfidence.level !== "white" && destination ? recommendSaferDropoffs(destination, incidents) : [];
  const confidence = buildDestinationConfidence(core, {
    originalDropoff: destination?.name ?? "Selected drop-off",
    saferHandoffPoint: saferDropoffs[0] ?? null,
  });

  return {
    ...core,
    riskLevel,
    normalizedScore,
    finalDecision: finalDecision(core),
    categoryBreakdown: categoryBreakdown(core, normalizedScore),
    stakeholderImpacts: stakeholderImpacts(core),
    governanceChecklist: governanceChecklist(core),
    topConcerns: topConcerns(core),
    saferDropoffs,
    confidence,
    nearestZone: core.nearestZone ?? zones[0] ?? null,
  };
}

export function evaluateLocation(
  latitude: number,
  longitude: number,
  incidents: Iterable<Incident>,
  zones: RiskZone[] = buildRiskZones(incidents),
  destination: Destination | null = null,
) {
  const core = evaluateLocationCore(latitude, longitude, incidents, zones);
  return enrichEvaluation(core, destination, incidents, zones);
}

export function analyzeScenario(scenarioName: string, scenario: Scenario): ScenarioAnalysis {
  const destination = destinationsByName()[scenario.destination];
  if (!destination) {
    throw new Error(`Unknown destination: ${scenario.destination}`);
  }

  const zones = buildRiskZones(scenario.incidents);
  const evaluation = evaluateLocation(destination.latitude, destination.longitude, scenario.incidents, zones, destination);

  return {
    scenarioName,
    scenario,
    destination,
    zones,
    evaluation,
  };
}

export function analyzeAllScenarios(scenarios: Record<string, Scenario>) {
  return Object.entries(scenarios).map(([name, scenario]) => analyzeScenario(name, scenario));
}

export function areaExplanation(destination: Destination, incidents: Iterable<Incident>) {
  const zones = buildRiskZones(incidents);
  const evaluation = evaluateLocation(destination.latitude, destination.longitude, incidents, zones, destination);
  const reportTypes = evaluation.nearbyReports.reduce<Record<string, number>>((counts, report) => {
    counts[report.incidentType] = (counts[report.incidentType] ?? 0) + 1;
    return counts;
  }, {});

  return {
    destination: destination.name,
    evaluation,
    zones,
    reportTypes,
    naturalLanguage: naturalLanguageExplanation(destination, evaluation),
  };
}

function naturalLanguageExplanation(destination: Destination, evaluation: RiskEvaluation) {
  if (evaluation.label === "Danger") {
    return `${destination.name} has low confidence for exact drop-off because multiple nearby signals point to the same area. Robo-Cab should avoid pretending the exact destination is normal and recommend a safer curbside alternative.`;
  }
  if (evaluation.label === "Caution") {
    return `${destination.name} has enough nearby uncertainty to warn the rider. The system can still proceed, but it should show why confidence is limited.`;
  }
  return `${destination.name} has no strong active community alert near the selected point. The responsible message is not 'guaranteed safe'; it is 'no active alerts found right now.'`;
}

export function formatTimestamp(value: string | Date) {
  const timestamp = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "Unknown time";
  const ageHours = Math.max((Date.now() - timestamp.getTime()) / 3_600_000, 0);
  if (ageHours < 1) return "Less than 1 hour ago";
  if (ageHours < 24) return `${Math.round(ageHours)} hours ago`;
  return `${Math.round(ageHours / 24)} days ago`;
}

export function allDestinations() {
  return DESTINATIONS;
}
