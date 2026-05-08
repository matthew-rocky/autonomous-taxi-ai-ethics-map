from __future__ import annotations

import math
from html import escape
from typing import Dict, Iterable, List, Optional, Union

import pandas as pd
import pydeck as pdk
import streamlit as st

try:
    import folium
    from streamlit_folium import st_folium
except ImportError:  # pragma: no cover - optional dependency fallback for local setup issues.
    folium = None
    st_folium = None

from data import DESTINATIONS, OTTAWA_CENTER
from logic import (
    RiskEvaluation,
    WALKING_SPEED_KM_PER_HOUR,
    build_risk_zones,
    format_timestamp,
    haversine_km,
    normalize_incidents,
    report_weight,
)


DARK_MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
LIGHT_MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"


def html_block(markup: str) -> None:
    """Render a complete HTML fragment without exposing markup as page text."""
    st.html(markup.strip())


def html_text(value: object) -> str:
    return escape(str(value), quote=True)


def risk_class(label: object) -> str:
    label_text = str(label)
    return label_text if label_text in {"Normal", "Caution", "Danger"} else "Normal"


def risk_color(label: str, alpha: int = 190) -> List[int]:
    if label == "Danger":
        return [237, 95, 95, alpha]
    if label == "Caution":
        return [231, 155, 69, alpha]
    return [105, 201, 152, alpha]


def render_status_card(evaluation: RiskEvaluation, destination_name: str, expanded: bool = False) -> None:
    label_class = risk_class(evaluation.label)
    html_block(
        f"""
        <div class="status-card status-{label_class}">
            <div class="status-label {label_class}">{html_text(evaluation.label)}</div>
            <div class="status-main">{html_text(evaluation.decision)}</div>
            <p class="body-copy">{html_text(evaluation.evidence)}</p>
        </div>
        """
    )
    with st.expander(f"Why {destination_name} is marked {evaluation.label.lower()}", expanded=expanded):
        for reason in evaluation.reasons:
            st.markdown(f"- {reason}")


def render_metric_boxes(metrics: List[Dict[str, object]]) -> None:
    cells = [
        f"""
            <div class="metric-box">
                <div class="metric-value">{html_text(metric["value"])}</div>
                <div class="metric-label">{html_text(metric["label"])}</div>
            </div>
            """
        for metric in metrics
    ]
    html_block(f'<div class="mini-grid">{"".join(cells)}</div>')


def _incident_dataframe(incidents: Iterable[Dict[str, object]]) -> pd.DataFrame:
    rows = list(incidents)
    if not rows:
        return pd.DataFrame(columns=["latitude", "longitude"])
    df = pd.DataFrame(rows).copy()
    df["severity"] = pd.to_numeric(df["severity"], errors="coerce").fillna(1).clip(1, 5)
    df["verified_text"] = df["verified"].map(lambda value: "Verified" if bool(value) else "Unverified")
    df["age"] = df["timestamp"].apply(format_timestamp)
    df["tooltip"] = df.apply(
        lambda row: (
            f"{row['incident_type']} | Severity {int(row['severity'])}/5 | {row['verified_text']} | {row['age']}\\n"
            f"{row['description']}"
        ),
        axis=1,
    )
    df["name"] = df["incident_type"]
    df["category"] = df["verified_text"]
    df["color"] = df["severity"].apply(lambda value: [237, 95, 95, 215] if value >= 4 else [231, 155, 69, 210])
    df["radius"] = df["severity"].apply(lambda value: 58 + (float(value) * 18))
    return df


def _heatmap_dataframe(incidents: Iterable[Dict[str, object]]) -> pd.DataFrame:
    df = normalize_incidents(incidents)
    if df.empty:
        return pd.DataFrame(columns=["latitude", "longitude", "heat_weight"])

    now = pd.Timestamp.now()
    df = df.copy()
    df["base_weight"] = df.apply(lambda row: report_weight(row, now), axis=1)
    df["severity_boost"] = 1 + (df["severity"].astype(float) / 2.6)
    df["cluster_boost"] = 1 + (df["similar_reports"].astype(float).clip(0, 8) * 0.08)
    df["heat_weight"] = (df["base_weight"] * df["severity_boost"] * df["cluster_boost"]).clip(0.08, 5.5)
    return df[["latitude", "longitude", "heat_weight"]]


def _circle_polygon(latitude: float, longitude: float, radius_m: float, steps: int = 72) -> List[List[float]]:
    lat_delta = radius_m / 111_320
    lon_delta = radius_m / (111_320 * max(0.2, math.cos(math.radians(latitude))))
    return [
        [
            longitude + (math.cos((2 * math.pi * index) / steps) * lon_delta),
            latitude + (math.sin((2 * math.pi * index) / steps) * lat_delta),
        ]
        for index in range(steps)
    ]


def _risk_field_dataframe(incidents: Iterable[Dict[str, object]]) -> pd.DataFrame:
    zones = build_risk_zones(incidents)
    rows = []
    for zone in zones:
        label = str(zone["risk_label"])
        latitude = float(zone["latitude"])
        longitude = float(zone["longitude"])
        radius_m = float(zone["radius_m"])
        base_color = [237, 95, 95] if label == "Danger" else [231, 155, 69]
        ring_specs = [
            (1.24, 24),
            (0.92, 42),
            (0.62, 68),
        ]
        for ring_index, (radius_scale, alpha) in enumerate(ring_specs):
            rows.append(
                {
                    "name": f"{label} area",
                    "category": f"{int(zone['incident_count'])} report cluster",
                    "tooltip": zone["explanation"],
                    "polygon": _circle_polygon(latitude, longitude, radius_m * radius_scale),
                    "fill_color": [*base_color, alpha],
                    "line_color": [*base_color, 0],
                    "sort_order": ring_index,
                    "longitude": longitude,
                    "latitude": latitude,
                    "label_text": label.upper() if ring_index == 2 else "",
                    "label_color": [255, 255, 255, 215] if label == "Danger" else [255, 244, 219, 220],
                }
            )
    return pd.DataFrame(rows)


def _destination_dataframe(selected_destination: Optional[Dict[str, object]]) -> pd.DataFrame:
    rows = []
    for destination in DESTINATIONS:
        selected = selected_destination and destination["name"] == selected_destination["name"]
        rows.append(
            {
                "name": destination["name"],
                "latitude": destination["latitude"],
                "longitude": destination["longitude"],
                "category": destination["category"],
                "selected": bool(selected),
                "color": [140, 199, 216, 245] if selected else [210, 220, 232, 145],
                "radius": 150 if selected else 85,
                "tooltip": "Selected destination" if selected else "Destination option",
            }
        )
    return pd.DataFrame(rows)


def _route_dataframe(
    selected_destination: Optional[Dict[str, object]],
    recommended_dropoff: Optional[Dict[str, object]],
) -> pd.DataFrame:
    if not selected_destination or not recommended_dropoff:
        return pd.DataFrame(columns=["path", "name"])
    return pd.DataFrame(
        [
            {
                "name": "Safer walking connection",
                "path": [
                    [float(recommended_dropoff["longitude"]), float(recommended_dropoff["latitude"])],
                    [float(selected_destination["longitude"]), float(selected_destination["latitude"])],
                ],
            }
        ]
    )


def build_map(
    incidents: Iterable[Dict[str, object]],
    selected_destination: Optional[Dict[str, object]] = None,
    recommendations: Optional[List[Dict[str, object]]] = None,
    show_incidents: bool = True,
    show_overlays: bool = True,
    height: Union[int, str] = 640,
    highlighted_incident_id: Optional[str] = None,
) -> None:
    incidents = list(incidents)
    incident_df = _incident_dataframe(incidents)
    highlighted_incident_df = pd.DataFrame(columns=incident_df.columns)
    if highlighted_incident_id and not incident_df.empty and "id" in incident_df.columns:
        highlighted_incident_df = incident_df[incident_df["id"].astype(str) == str(highlighted_incident_id)].copy()
    heatmap_df = _heatmap_dataframe(incidents)
    risk_field_df = _risk_field_dataframe(incidents)
    destination_df = _destination_dataframe(selected_destination)
    recommendations = recommendations or []
    recommended = recommendations[0] if recommendations else None
    route_df = _route_dataframe(selected_destination, recommended)
    dropoff_df = pd.DataFrame(recommendations)
    if not dropoff_df.empty:
        dropoff_df["color"] = dropoff_df["risk_label"].apply(lambda label: risk_color(str(label), 230))
        dropoff_df["radius"] = 95
        dropoff_df["tooltip"] = dropoff_df.apply(
            lambda row: f"{row['name']} | {row['risk_label']} | {row['walking_minutes']} min walk\\n{row['recommendation']}",
            axis=1,
        )

    layers = []
    if show_overlays and not risk_field_df.empty:
        layers.append(
            pdk.Layer(
                "PolygonLayer",
                risk_field_df,
                get_polygon="polygon",
                get_fill_color="fill_color",
                get_line_color="line_color",
                stroked=False,
                filled=True,
                pickable=True,
                auto_highlight=False,
            )
        )
        label_df = risk_field_df[risk_field_df["label_text"].astype(bool)]
        if not label_df.empty:
            layers.append(
                pdk.Layer(
                    "TextLayer",
                    label_df,
                    get_position="[longitude, latitude]",
                    get_text="label_text",
                    get_color="label_color",
                    get_size=13,
                    get_angle=0,
                    get_text_anchor='"middle"',
                    get_alignment_baseline='"center"',
                    font_family="Inter, sans-serif",
                    font_weight=800,
                    pickable=False,
                )
            )

    if show_overlays and not heatmap_df.empty:
        layers.append(
            pdk.Layer(
                "HeatmapLayer",
                heatmap_df,
                get_position="[longitude, latitude]",
                get_weight="heat_weight",
                radius_pixels=68,
                intensity=0.82,
                threshold=0.025,
                aggregation="SUM",
                color_range=[
                    [255, 218, 143],
                    [239, 181, 94],
                    [231, 155, 69],
                    [224, 92, 63],
                    [237, 95, 95],
                    [151, 34, 49],
                ],
                opacity=0.38,
            )
        )

    if not route_df.empty:
        layers.append(
            pdk.Layer(
                "PathLayer",
                route_df,
                get_path="path",
                get_color=[140, 199, 216, 220],
                width_min_pixels=4,
                rounded=True,
                pickable=True,
            )
        )

    if show_incidents and not incident_df.empty:
        layers.append(
            pdk.Layer(
                "ScatterplotLayer",
                incident_df,
                get_position="[longitude, latitude]",
                get_radius="radius",
                get_fill_color="color",
                get_line_color=[255, 255, 255, 130],
                line_width_min_pixels=1,
                stroked=True,
                filled=True,
                pickable=True,
            )
        )

    layers.append(
        pdk.Layer(
            "ScatterplotLayer",
            destination_df,
            get_position="[longitude, latitude]",
            get_radius="radius",
            get_fill_color="color",
            get_line_color=[245, 247, 251, 170],
            line_width_min_pixels=1,
            stroked=True,
            filled=True,
            pickable=True,
        )
    )

    if not dropoff_df.empty:
        layers.append(
            pdk.Layer(
                "ScatterplotLayer",
                dropoff_df,
                get_position="[longitude, latitude]",
                get_radius="radius",
                get_fill_color="color",
                get_line_color=[255, 255, 255, 200],
                line_width_min_pixels=2,
                stroked=True,
                filled=True,
                pickable=True,
            )
        )

    if not highlighted_incident_df.empty:
        layers.append(
            pdk.Layer(
                "ScatterplotLayer",
                highlighted_incident_df,
                get_position="[longitude, latitude]",
                get_radius=170,
                get_fill_color=[237, 95, 95, 62],
                get_line_color=[255, 255, 255, 245],
                line_width_min_pixels=4,
                stroked=True,
                filled=True,
                pickable=True,
            )
        )

    view_lat = OTTAWA_CENTER["latitude"]
    view_lon = OTTAWA_CENTER["longitude"]
    zoom = OTTAWA_CENTER["zoom"]
    if selected_destination:
        view_lat = float(selected_destination["latitude"])
        view_lon = float(selected_destination["longitude"])
        zoom = 13.8

    map_style = LIGHT_MAP_STYLE if st.session_state.get("theme_mode") == "Light" else DARK_MAP_STYLE

    deck = pdk.Deck(
        map_style=map_style,
        initial_view_state=pdk.ViewState(
            latitude=view_lat,
            longitude=view_lon,
            zoom=zoom,
            pitch=38,
            bearing=-14,
        ),
        layers=layers,
        tooltip={
            "html": "<b>{name}</b><br/>{tooltip}<br/>{category}",
            "style": {
                "backgroundColor": "rgba(9, 11, 15, 0.92)",
                "color": "#f5f7fb",
                "border": "1px solid rgba(255,255,255,0.16)",
                "borderRadius": "8px",
                "fontFamily": "Inter, sans-serif",
                "maxWidth": "320px",
            },
        },
    )

    st.pydeck_chart(deck, width="stretch", height=height)


def render_dropoff_cards(
    recommendations: List[Dict[str, object]],
    empty_message: str = (
        "No safer drop-off is needed for this destination right now. "
        "Robo-Cab should still communicate that this is based on current local reports."
    ),
) -> None:
    if not recommendations:
        html_block(
            f"""
            <div class="callout">
                {html_text(empty_message)}
            </div>
            """
        )
        return
    for recommendation in recommendations:
        label_class = risk_class(recommendation["risk_label"])
        html_block(
            f"""
            <div class="drop-card">
                <div class="drop-title">{html_text(recommendation["name"])}</div>
                <span class="tag {label_class}">{html_text(recommendation["risk_label"])}</span>
                <span class="tag">{html_text(recommendation["walking_minutes"])} min walk</span>
                <span class="tag">{html_text(recommendation["distance_km"])} km</span>
                <p class="body-copy">{html_text(recommendation["recommendation"])}</p>
                <p class="body-copy muted">{html_text(recommendation["explanation"])}</p>
            </div>
            """
        )


def render_report_location_picker(
    center: Dict[str, object],
    selected_point: Optional[Dict[str, float]] = None,
    height: int = 360,
    key: str = "report_location_picker",
) -> Optional[Dict[str, float]]:
    if folium is None or st_folium is None:
        st.warning("Install streamlit-folium to choose a report location on the map.")
        return None

    center_lat = float(center["latitude"])
    center_lon = float(center["longitude"])
    if selected_point:
        center_lat = float(selected_point["latitude"])
        center_lon = float(selected_point["longitude"])

    tiles = "CartoDB positron" if st.session_state.get("theme_mode") == "Light" else "CartoDB dark_matter"
    picker_map = folium.Map(
        location=[center_lat, center_lon],
        zoom_start=16,
        tiles=tiles,
        control_scale=True,
    )
    folium.CircleMarker(
        location=[float(center["latitude"]), float(center["longitude"])],
        radius=7,
        color="#8cc7d8",
        fill=True,
        fill_color="#8cc7d8",
        fill_opacity=0.82,
        tooltip="Selected destination",
    ).add_to(picker_map)

    if selected_point:
        folium.Marker(
            location=[float(selected_point["latitude"]), float(selected_point["longitude"])],
            tooltip="Selected report location",
            icon=folium.Icon(color="red", icon="exclamation-sign"),
        ).add_to(picker_map)

    result = st_folium(
        picker_map,
        key=key,
        height=height,
        width=None,
        returned_objects=["last_clicked"],
        use_container_width=True,
    )
    clicked = result.get("last_clicked") if result else None
    if not clicked:
        return None
    return {
        "latitude": float(clicked["lat"]),
        "longitude": float(clicked["lng"]),
    }


def render_incident_list(incidents: List[Dict[str, object]], limit: int = 8) -> None:
    if not incidents:
        html_block('<div class="callout">No active reports are close to the selected destination.</div>')
        return
    items = []
    for incident in incidents[:limit]:
        distance = incident.get("distance_km")
        distance_text = f"{float(distance):.2f} km away" if distance is not None else "Distance unavailable"
        verified = "Verified" if incident.get("verified") else "Unverified"
        items.append(
            f"""
            <div class="incident-item">
                <div class="drop-title">{html_text(incident.get("incident_type", "Incident"))}</div>
                <span class="tag">Severity {int(float(incident.get("severity", 1)))}/5</span>
                <span class="tag">{html_text(verified)}</span>
                <span class="tag">{html_text(distance_text)}</span>
                <span class="tag">{html_text(format_timestamp(incident.get("timestamp")))}</span>
                <p class="body-copy">{html_text(incident.get("description", "No description provided."))}</p>
            </div>
            """
        )
    html_block(f'<div class="incident-list">{"".join(items)}</div>')


def render_scenario_card(name: str, scenario: Dict[str, object]) -> None:
    expected_class = risk_class(scenario["expected"])
    html_block(
        f"""
        <div class="scenario-card">
            <div class="scenario-title">{html_text(name)}</div>
            <span class="tag {expected_class}">Expected {html_text(scenario["expected"])}</span>
            <span class="tag">{html_text(scenario["destination"])}</span>
            <p class="body-copy">{html_text(scenario["summary"])}</p>
        </div>
        """
    )


def nearby_distance_text(destination: Dict[str, object], candidate: Dict[str, object]) -> str:
    distance = haversine_km(
        float(destination["latitude"]),
        float(destination["longitude"]),
        float(candidate["latitude"]),
        float(candidate["longitude"]),
    )
    minutes = max(2, int(round((distance / WALKING_SPEED_KM_PER_HOUR) * 60)))
    return f"{distance:.2f} km | about {minutes} min walk"
