from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Iterable, List, Optional

import numpy as np
import pandas as pd

from data import SAFE_DROPOFFS


EARTH_RADIUS_KM = 6371.0088
RISK_RADIUS_KM = 0.48
NEAR_RISK_RADIUS_KM = 0.82
WALKING_SPEED_KM_PER_HOUR = 4.8
MAX_SAFE_DROPOFF_DISTANCE_KM = 0.9
INCIDENT_TYPE_RISK_MULTIPLIERS = {
    "Violence": 1.35,
}


@dataclass(frozen=True)
class RiskEvaluation:
    label: str
    score: float
    decision: str
    distance_to_nearest_report_km: Optional[float]
    incident_count: int
    recent_count: int
    verified_count: int
    unverified_count: int
    average_severity: float
    clustered: bool
    evidence: str
    reasons: List[str]
    nearby_reports: List[Dict[str, object]]
    nearest_zone: Optional[Dict[str, object]]
    inside_zone: bool
    near_zone: bool


def normalize_incidents(incidents: Iterable[Dict[str, object]]) -> pd.DataFrame:
    rows = list(incidents)
    columns = [
        "id",
        "incident_type",
        "latitude",
        "longitude",
        "severity",
        "description",
        "timestamp",
        "verified",
        "similar_reports",
        "scenario_tag",
    ]
    if not rows:
        return pd.DataFrame(columns=columns)
    df = pd.DataFrame(rows)
    for column in columns:
        if column not in df.columns:
            df[column] = None
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df["severity"] = pd.to_numeric(df["severity"], errors="coerce").fillna(1).clip(1, 5)
    df["similar_reports"] = pd.to_numeric(df["similar_reports"], errors="coerce").fillna(0).clip(0, 25)
    df["verified"] = df["verified"].fillna(False).astype(bool)
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["latitude", "longitude", "timestamp"])
    return df[columns]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    d_lat = lat2_rad - lat1_rad
    d_lon = lon2_rad - lon1_rad
    a = math.sin(d_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(d_lon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def add_distances(df: pd.DataFrame, latitude: float, longitude: float) -> pd.DataFrame:
    if df.empty:
        return df.copy()
    result = df.copy()
    result["distance_km"] = result.apply(
        lambda row: haversine_km(latitude, longitude, float(row["latitude"]), float(row["longitude"])),
        axis=1,
    )
    return result


def recency_weight(timestamp: pd.Timestamp, now: Optional[pd.Timestamp] = None) -> float:
    now = now or pd.Timestamp.now()
    if pd.isna(timestamp):
        return 0.1
    age_hours = max((now - timestamp).total_seconds() / 3600, 0)
    if age_hours <= 2:
        return 1.0
    if age_hours <= 6:
        return 0.86
    if age_hours <= 24:
        return 0.62
    if age_hours <= 72:
        return 0.34
    return 0.14


def report_weight(row: pd.Series, now: Optional[pd.Timestamp] = None) -> float:
    severity_component = float(row["severity"]) / 5
    verified_component = 1.14 if bool(row["verified"]) else 0.82
    similar_component = min(1.45, 1 + (float(row.get("similar_reports", 0)) * 0.1))
    type_component = INCIDENT_TYPE_RISK_MULTIPLIERS.get(str(row.get("incident_type", "")), 1.0)
    return severity_component * recency_weight(row["timestamp"], now) * verified_component * similar_component * type_component


def _risk_label_from_metrics(score: float, count: int, avg_severity: float, recent_count: int, verified_count: int) -> str:
    repeated_evidence = count >= 3 and recent_count >= 2
    serious_cluster = count >= 2 and avg_severity >= 4 and recent_count >= 2
    if score >= 2.15 or (repeated_evidence and avg_severity >= 3.45) or serious_cluster:
        return "Danger"
    if score >= 0.58 or (count >= 2 and avg_severity >= 2.4) or (count >= 1 and avg_severity >= 4):
        return "Caution"
    return "Normal"


def build_risk_zones(incidents: Iterable[Dict[str, object]]) -> List[Dict[str, object]]:
    df = normalize_incidents(incidents)
    if df.empty:
        return []

    now = pd.Timestamp.now()
    df = df.copy()
    df["base_weight"] = df.apply(lambda row: report_weight(row, now), axis=1)
    ordered = df.sort_values(["base_weight", "severity"], ascending=False).reset_index(drop=True)

    assigned_ids: set[str] = set()
    zones: List[Dict[str, object]] = []
    for _, seed in ordered.iterrows():
        seed_id = str(seed["id"])
        if seed_id in assigned_ids:
            continue

        with_distances = add_distances(df, float(seed["latitude"]), float(seed["longitude"]))
        cluster = with_distances[with_distances["distance_km"] <= RISK_RADIUS_KM].copy()
        if cluster.empty:
            continue

        for incident_id in cluster["id"]:
            assigned_ids.add(str(incident_id))

        weights = np.maximum(cluster["base_weight"].to_numpy(dtype=float), 0.05)
        latitude = float(np.average(cluster["latitude"].to_numpy(dtype=float), weights=weights))
        longitude = float(np.average(cluster["longitude"].to_numpy(dtype=float), weights=weights))

        cluster = add_distances(cluster, latitude, longitude)
        proximity = np.maximum(0.2, 1 - (cluster["distance_km"].to_numpy(dtype=float) / RISK_RADIUS_KM))
        score = float(np.sum(cluster["base_weight"].to_numpy(dtype=float) * proximity))
        count = int(len(cluster))
        recent_count = int((pd.Timestamp.now() - cluster["timestamp"]).dt.total_seconds().le(24 * 3600).sum())
        verified_count = int(cluster["verified"].sum())
        avg_severity = float(cluster["severity"].mean())
        label = _risk_label_from_metrics(score, count, avg_severity, recent_count, verified_count)
        if label == "Normal":
            continue

        radius = min(620, 210 + (count * 78) + (avg_severity * 24) + (score * 55))
        confidence = min(0.96, 0.34 + count * 0.12 + verified_count * 0.08 + recent_count * 0.04)
        incident_types = cluster["incident_type"].value_counts().index.tolist()[:3]
        latest = cluster["timestamp"].max()

        zones.append(
            {
                "zone_id": f"zone-{len(zones) + 1}",
                "latitude": latitude,
                "longitude": longitude,
                "risk_label": label,
                "score": round(score, 2),
                "radius_m": int(radius),
                "incident_count": count,
                "average_severity": round(avg_severity, 1),
                "recent_count": recent_count,
                "verified_count": verified_count,
                "unverified_count": count - verified_count,
                "confidence": round(confidence, 2),
                "incident_types": ", ".join(incident_types),
                "latest_timestamp": latest.isoformat() if not pd.isna(latest) else "",
                "explanation": _zone_explanation(label, count, avg_severity, recent_count, verified_count, incident_types),
            }
        )
    return zones


def _zone_explanation(
    label: str,
    count: int,
    avg_severity: float,
    recent_count: int,
    verified_count: int,
    incident_types: List[str],
) -> str:
    type_text = ", ".join(incident_types[:2]).lower() if incident_types else "community alerts"
    if label == "Danger":
        return (
            f"{count} nearby reports include {type_text}, with an average severity of {avg_severity:.1f}. "
            f"{recent_count} were recent and {verified_count} are verified, so exact drop-off should be avoided."
        )
    return (
        f"{count} nearby reports include {type_text}. The evidence is meaningful but not conclusive, "
        "so the system should communicate caution instead of acting fully confident."
    )


def evaluate_location(
    latitude: float,
    longitude: float,
    incidents: Iterable[Dict[str, object]],
    zones: Optional[List[Dict[str, object]]] = None,
) -> RiskEvaluation:
    df = normalize_incidents(incidents)
    zones = zones if zones is not None else build_risk_zones(incidents)

    inside_zone = False
    near_zone = False
    nearest_zone = None
    nearest_zone_edge_km = None
    for zone in zones:
        center_distance = haversine_km(latitude, longitude, float(zone["latitude"]), float(zone["longitude"]))
        zone_radius_km = float(zone["radius_m"]) / 1000
        edge_distance = center_distance - zone_radius_km
        if nearest_zone_edge_km is None or edge_distance < nearest_zone_edge_km:
            nearest_zone_edge_km = edge_distance
            nearest_zone = {**zone, "distance_to_edge_km": round(max(edge_distance, 0), 3)}
        if center_distance <= zone_radius_km:
            inside_zone = True
        elif edge_distance <= 0.28:
            near_zone = True

    if df.empty:
        return RiskEvaluation(
            label="Normal",
            score=0,
            decision="Proceed normally",
            distance_to_nearest_report_km=None,
            incident_count=0,
            recent_count=0,
            verified_count=0,
            unverified_count=0,
            average_severity=0,
            clustered=False,
            evidence="No active community alerts are currently near this destination. That is not the same as a safety guarantee.",
            reasons=["No recent reports were found near the selected point.", "No information does not mean safe."],
            nearby_reports=[],
            nearest_zone=nearest_zone,
            inside_zone=inside_zone,
            near_zone=near_zone,
        )

    now = pd.Timestamp.now()
    with_distances = add_distances(df, latitude, longitude)
    nearby = with_distances[with_distances["distance_km"] <= NEAR_RISK_RADIUS_KM].copy()
    relevant = with_distances[with_distances["distance_km"] <= RISK_RADIUS_KM].copy()
    nearest_distance = float(with_distances["distance_km"].min()) if not with_distances.empty else None

    if relevant.empty:
        label = "Caution" if near_zone and nearest_zone and nearest_zone["risk_label"] == "Danger" else "Normal"
        reasons = [
            "No reports fall inside the immediate drop-off radius.",
            "No information does not mean safe; it means the system has no active community alert at this point.",
        ]
        if label == "Caution":
            reasons.insert(0, "The destination is near an active high-risk zone.")
        return RiskEvaluation(
            label=label,
            score=0,
            decision="Proceed with caution" if label == "Caution" else "Proceed normally",
            distance_to_nearest_report_km=nearest_distance,
            incident_count=0,
            recent_count=0,
            verified_count=0,
            unverified_count=0,
            average_severity=0,
            clustered=False,
            evidence=(
                "The destination is close to a flagged zone, so caution is appropriate."
                if label == "Caution"
                else "No active community alerts are currently near this destination. That is not the same as a safety guarantee."
            ),
            reasons=reasons,
            nearby_reports=nearby.sort_values("distance_km").head(5).to_dict("records"),
            nearest_zone=nearest_zone,
            inside_zone=inside_zone,
            near_zone=near_zone,
        )

    relevant["weight"] = relevant.apply(lambda row: report_weight(row, now), axis=1)
    relevant["proximity"] = np.maximum(0.15, 1 - (relevant["distance_km"] / RISK_RADIUS_KM))
    score = float(np.sum(relevant["weight"] * relevant["proximity"]))
    count = int(len(relevant))
    recent_count = int((now - relevant["timestamp"]).dt.total_seconds().le(24 * 3600).sum())
    verified_count = int(relevant["verified"].sum())
    unverified_count = count - verified_count
    avg_severity = float(relevant["severity"].mean())
    clustered = count >= 3 and float(relevant["distance_km"].max()) <= RISK_RADIUS_KM

    label = _risk_label_from_metrics(score, count, avg_severity, recent_count, verified_count)
    if inside_zone and nearest_zone:
        if nearest_zone["risk_label"] == "Danger":
            label = "Danger"
        elif label == "Normal":
            label = "Caution"
    elif near_zone and nearest_zone and nearest_zone["risk_label"] == "Danger" and label == "Normal":
        label = "Caution"

    decision = {
        "Normal": "Proceed normally",
        "Caution": "Proceed with caution",
        "Danger": "Recommend safer nearby drop-off",
    }[label]

    reasons = _evaluation_reasons(label, count, avg_severity, recent_count, verified_count, unverified_count, inside_zone, near_zone)
    evidence = _evidence_sentence(label, count, avg_severity, recent_count, verified_count, unverified_count, clustered)

    return RiskEvaluation(
        label=label,
        score=round(score, 2),
        decision=decision,
        distance_to_nearest_report_km=nearest_distance,
        incident_count=count,
        recent_count=recent_count,
        verified_count=verified_count,
        unverified_count=unverified_count,
        average_severity=round(avg_severity, 1),
        clustered=clustered,
        evidence=evidence,
        reasons=reasons,
        nearby_reports=nearby.sort_values("distance_km").head(8).to_dict("records"),
        nearest_zone=nearest_zone,
        inside_zone=inside_zone,
        near_zone=near_zone,
    )


def _evaluation_reasons(
    label: str,
    count: int,
    avg_severity: float,
    recent_count: int,
    verified_count: int,
    unverified_count: int,
    inside_zone: bool,
    near_zone: bool,
) -> List[str]:
    reasons: List[str] = []
    if inside_zone:
        reasons.append("The destination falls inside an active risk overlay.")
    elif near_zone:
        reasons.append("The destination is near an active risk overlay.")
    if count:
        reasons.append(f"{count} report{'s' if count != 1 else ''} fall within the immediate drop-off radius.")
        reasons.append(f"Average severity is {avg_severity:.1f} out of 5.")
    if recent_count:
        reasons.append(f"{recent_count} report{'s are' if recent_count != 1 else ' is'} less than 24 hours old.")
    if verified_count:
        reasons.append(f"{verified_count} report{'s are' if verified_count != 1 else ' is'} verified.")
    if unverified_count:
        reasons.append(f"{unverified_count} report{'s are' if unverified_count != 1 else ' is'} still unverified, so uncertainty remains.")
    if label == "Normal":
        reasons.append("No active community alerts are strong enough to alter the drop-off.")
        reasons.append("No information does not mean safe.")
    return reasons


def _evidence_sentence(
    label: str,
    count: int,
    avg_severity: float,
    recent_count: int,
    verified_count: int,
    unverified_count: int,
    clustered: bool,
) -> str:
    if label == "Danger":
        cluster_text = " and the reports are clustered" if clustered else ""
        return (
            f"This destination has {count} nearby reports with average severity {avg_severity:.1f}{cluster_text}. "
            "A safer nearby drop-off is recommended."
        )
    if label == "Caution":
        return (
            f"This area has {count} relevant report{'s' if count != 1 else ''}. "
            "Conditions are uncertain, so the system should warn the rider before proceeding."
        )
    if count:
        return (
            f"There are {count} low-signal report{'s' if count != 1 else ''} nearby. "
            "The evidence does not justify rerouting, but it should remain visible."
        )
    return "No active community alerts are currently near this destination. That is not the same as a safety guarantee."


def recommend_safer_dropoffs(
    destination: Dict[str, object],
    incidents: Iterable[Dict[str, object]],
    limit: int = 4,
    max_distance_km: float = MAX_SAFE_DROPOFF_DISTANCE_KM,
) -> List[Dict[str, object]]:
    zones = build_risk_zones(incidents)
    destination_lat = float(destination["latitude"])
    destination_lon = float(destination["longitude"])

    recommendations: List[Dict[str, object]] = []
    for candidate in SAFE_DROPOFFS:
        distance_km = haversine_km(
            destination_lat,
            destination_lon,
            float(candidate["latitude"]),
            float(candidate["longitude"]),
        )
        if distance_km > max_distance_km:
            continue

        candidate_eval = evaluate_location(float(candidate["latitude"]), float(candidate["longitude"]), incidents, zones)
        walking_minutes = max(2, int(round((distance_km / WALKING_SPEED_KM_PER_HOUR) * 60)))
        risk_rank = {"Normal": 0, "Caution": 1, "Danger": 2}[candidate_eval.label]
        explanation = _recommendation_sentence(candidate, candidate_eval, walking_minutes)
        recommendations.append(
            {
                **candidate,
                "risk_label": candidate_eval.label,
                "risk_score": candidate_eval.score,
                "distance_km": round(distance_km, 2),
                "walking_minutes": walking_minutes,
                "rank_score": (risk_rank * 100) + (distance_km * 8) + candidate_eval.score,
                "recommendation": explanation,
            }
        )

    return sorted(recommendations, key=lambda item: item["rank_score"])[:limit]


def _recommendation_sentence(candidate: Dict[str, object], candidate_eval: RiskEvaluation, walking_minutes: int) -> str:
    if candidate_eval.label == "Normal":
        return f"Adds about {walking_minutes} minutes on foot and avoids the densest active reports."
    if candidate_eval.label == "Caution":
        return f"Adds about {walking_minutes} minutes and lowers the risk level, though some uncertainty remains."
    return f"This option is still flagged; use it only if lower-risk alternatives are unavailable."


def area_explanation(
    destination: Dict[str, object],
    incidents: Iterable[Dict[str, object]],
) -> Dict[str, object]:
    zones = build_risk_zones(incidents)
    evaluation = evaluate_location(float(destination["latitude"]), float(destination["longitude"]), incidents, zones)
    report_types = {}
    for report in evaluation.nearby_reports:
        key = str(report.get("incident_type", "Other"))
        report_types[key] = report_types.get(key, 0) + 1

    return {
        "destination": destination["name"],
        "evaluation": evaluation,
        "zones": zones,
        "report_types": report_types,
        "natural_language": _natural_language_explanation(destination, evaluation),
    }


def _natural_language_explanation(destination: Dict[str, object], evaluation: RiskEvaluation) -> str:
    name = str(destination["name"])
    if evaluation.label == "Danger":
        return (
            f"{name} is currently treated as a high-risk drop-off because multiple nearby signals point to the same area. "
            "Robo-Cab should avoid pretending the exact destination is normal and recommend a safer curbside alternative."
        )
    if evaluation.label == "Caution":
        return (
            f"{name} has enough nearby uncertainty to warn the rider. "
            "The system can still proceed, but it should show why confidence is limited."
        )
    return (
        f"{name} has no strong active community alert near the selected point. "
        "The responsible message is not 'guaranteed safe'; it is 'no active alerts found right now.'"
    )


def format_timestamp(value: object) -> str:
    timestamp = pd.to_datetime(value, errors="coerce")
    if pd.isna(timestamp):
        return "Unknown time"
    age_hours = max((pd.Timestamp.now() - timestamp).total_seconds() / 3600, 0)
    if age_hours < 1:
        return "Less than 1 hour ago"
    if age_hours < 24:
        return f"{int(round(age_hours))} hours ago"
    return f"{int(round(age_hours / 24))} days ago"
