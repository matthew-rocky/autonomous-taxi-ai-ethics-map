from __future__ import annotations

import sys
from datetime import datetime
from typing import Dict, List
from uuid import uuid4

import pandas as pd
import streamlit as st
from streamlit.runtime.scriptrunner import get_script_run_ctx

from data import AREA_OPTIONS, DESTINATIONS, INCIDENT_TYPES, default_incidents, destinations_by_name, areas_by_name
from logic import area_explanation, build_risk_zones, evaluate_location, recommend_safer_dropoffs
from scenarios import scenarios
from styles import APP_CSS
from ui_components import (
    build_map,
    html_block,
    html_text,
    render_dropoff_cards,
    render_incident_list,
    render_report_location_picker,
    render_metric_boxes,
    render_scenario_card,
    render_status_card,
)


NO_NEARBY_DROPOFF_MESSAGE = (
    "No nearby safer drop-off was found within a short walk. Robo-Cab should not send the rider far away; "
    "it should warn them and ask for a closer confirmed option."
)

DESTINATION_LOOKUP = destinations_by_name()
AREA_LOOKUP = areas_by_name()
SCENARIOS = scenarios()
DESTINATION_WIDGET_KEYS = ("main_destination", "live_destination", "explain_destination")
SCENARIO_WIDGET_KEYS = ("live_scenario", "scenario_gallery_selection")


def running_inside_streamlit() -> bool:
    return get_script_run_ctx(suppress_warning=True) is not None


def configure_page() -> None:
    st.set_page_config(
        page_title="Robo-Cab Ottawa Safety Map",
        page_icon="ROBO",
        layout="wide",
        initial_sidebar_state="collapsed",
    )
    html_block(APP_CSS)


def initialize_state() -> None:
    if "incidents" not in st.session_state:
        st.session_state.incidents = default_incidents()
    if "selected_destination" not in st.session_state:
        st.session_state.selected_destination = "ByWard Market"
    if "analysis_requested" not in st.session_state:
        st.session_state.analysis_requested = True
    if "active_scenario" not in st.session_state:
        st.session_state.active_scenario = "Default Ottawa demo"
    if "last_report_id" not in st.session_state:
        st.session_state.last_report_id = None
    if "active_page" not in st.session_state:
        st.session_state.active_page = "Live Map"
    if st.session_state.active_page == "Home":
        st.session_state.active_page = "About"
    if "theme_mode" not in st.session_state:
        st.session_state.theme_mode = "Dark"
    if "report_map_point" not in st.session_state:
        st.session_state.report_map_point = None
    if "report_location_mode" not in st.session_state:
        st.session_state.report_location_mode = "Selected destination"
    for widget_key in DESTINATION_WIDGET_KEYS:
        if widget_key not in st.session_state or st.session_state[widget_key] not in DESTINATION_LOOKUP:
            st.session_state[widget_key] = st.session_state.selected_destination


def set_selected_destination(destination_name: str) -> None:
    if destination_name not in DESTINATION_LOOKUP:
        return
    st.session_state.selected_destination = destination_name
    st.session_state.analysis_requested = True
    for widget_key in DESTINATION_WIDGET_KEYS:
        st.session_state[widget_key] = destination_name


def sync_destination_control(widget_key: str) -> None:
    destination_name = st.session_state.get(widget_key)
    if destination_name in DESTINATION_LOOKUP:
        set_selected_destination(str(destination_name))


def reset_to_default() -> None:
    st.session_state.incidents = default_incidents()
    set_selected_destination("ByWard Market")
    st.session_state.analysis_requested = True
    st.session_state.active_scenario = "Default Ottawa demo"
    st.session_state.last_report_id = None
    st.session_state.report_map_point = None
    st.session_state.report_location_mode = "Selected destination"


def load_scenario(name: str) -> None:
    scenario = SCENARIOS[name]
    st.session_state.incidents = list(scenario["incidents"])
    set_selected_destination(str(scenario["destination"]))
    st.session_state.active_scenario = name
    st.session_state.last_report_id = None
    st.session_state.report_map_point = None
    st.session_state.report_location_mode = "Selected destination"
    for widget_key in SCENARIO_WIDGET_KEYS:
        st.session_state[widget_key] = name


def selected_destination() -> Dict[str, object]:
    return DESTINATION_LOOKUP[st.session_state.selected_destination]


def current_evaluation():
    destination = selected_destination()
    zones = build_risk_zones(st.session_state.incidents)
    return evaluate_location(float(destination["latitude"]), float(destination["longitude"]), st.session_state.incidents, zones)


def render_theme_marker() -> None:
    marker = "theme-light-marker" if st.session_state.theme_mode == "Light" else "theme-dark-marker"
    html_block(f'<div class="{marker}" aria-hidden="true"></div>')


def sync_active_page() -> None:
    st.session_state.active_page = st.session_state.app_nav_selection


def page_home() -> None:
    zones = build_risk_zones(st.session_state.incidents)
    evaluation = current_evaluation()

    html_block(
        """
        <section class="hero">
            <div class="eyebrow">Robo-Cab Ottawa</div>
            <h1 class="title">Community Safety Map</h1>
            <p class="subtitle">Uncertainty-aware navigation for safer autonomous drop-offs.</p>
            <p class="subtitle">
                When destination conditions are uncertain, Robo-Cab should warn users and recommend safer nearby drop-offs instead of pretending everything is normal.
            </p>
        </section>
        """
    )

    st.write("")
    col_a, col_b, col_c = st.columns([1.15, 1, 1])
    with col_a:
        html_block(
            """
            <div class="hero-card">
                <div class="panel-title">Trust vs accountability</div>
                <p class="body-copy">
                    Riders trust navigation systems to guide them safely. The problem is that a system can look confident even when reports are incomplete, delayed, or conflicting.
                </p>
                <div class="divider"></div>
                <p class="body-copy">
                    This prototype adds a community-powered safety layer that makes uncertainty visible and changes the drop-off decision when risk is concentrated.
                </p>
            </div>
            """
        )
    with col_b:
        html_block(
            """
            <div class="hero-card">
                <div class="panel-title">Visual risk language</div>
                <p class="body-copy">Risk zones appear only when local evidence justifies them.</p>
                <div class="legend-row">
                    <div class="legend-pill"><span class="dot dot-normal"></span>No active alert</div>
                    <div class="legend-pill"><span class="dot dot-caution"></span>Caution</div>
                    <div class="legend-pill"><span class="dot dot-danger"></span>Danger</div>
                </div>
            </div>
            """
        )
    with col_c:
        html_block(
            f"""
            <div class="hero-card">
                <div class="panel-title">Live demo state</div>
                <p class="body-copy">Active scenario: <span class="small-link">{html_text(st.session_state.active_scenario)}</span></p>
                <div class="divider"></div>
                <p class="body-copy">Selected destination: <span class="small-link">{html_text(st.session_state.selected_destination)}</span></p>
                <p class="body-copy">Current decision: <span class="small-link">{html_text(evaluation.decision)}</span></p>
            </div>
            """
        )

    st.write("")
    render_metric_boxes(
        [
            {"value": len(st.session_state.incidents), "label": "active community reports"},
            {"value": len(zones), "label": "risk overlays generated"},
            {"value": evaluation.label, "label": "selected destination status"},
        ]
    )

    st.write("")
    html_block(
        """
        <div class="callout">
            Core design principle: <strong>No information does not mean safe.</strong> It means the system should avoid overclaiming and keep uncertainty visible.
        </div>
        """
    )


def destination_controls(prefix: str = "main") -> Dict[str, object]:
    destination_names = [destination["name"] for destination in DESTINATIONS]
    widget_key = f"{prefix}_destination"
    if widget_key not in st.session_state or st.session_state[widget_key] not in DESTINATION_LOOKUP:
        st.session_state[widget_key] = st.session_state.selected_destination
    selected = st.selectbox(
        "Destination",
        destination_names,
        index=destination_names.index(st.session_state[widget_key]),
        key=widget_key,
        on_change=sync_destination_control,
        args=(widget_key,),
    )
    return DESTINATION_LOOKUP[selected]


def page_live_map() -> None:
    show_incidents = st.session_state.get("live_show_incidents", True)
    show_overlays = st.session_state.get("live_show_overlays", True)
    destination = selected_destination()
    evaluation = evaluate_location(
        float(destination["latitude"]),
        float(destination["longitude"]),
        st.session_state.incidents,
        build_risk_zones(st.session_state.incidents),
    )
    recommendations = recommend_safer_dropoffs(destination, st.session_state.incidents) if evaluation.label == "Danger" else []

    with st.container(key="live_map_stage"):
        with st.container(key="live_map_canvas"):
            build_map(
                st.session_state.incidents,
                selected_destination=destination,
                recommendations=recommendations[:3],
                show_incidents=show_incidents,
                show_overlays=show_overlays,
                height=920,
                highlighted_incident_id=st.session_state.last_report_id,
            )

        with st.container(key="map_search_panel"):
            html_block(
                f"""
                <div class="map-panel-heading">
                    <span>Robo-Cab Ottawa</span>
                    <strong>{html_text(evaluation.label)}</strong>
                </div>
                """
            )
            destination = destination_controls("live")
            scenario_names = list(SCENARIOS.keys())
            scenario_index = scenario_names.index(st.session_state.active_scenario) if st.session_state.active_scenario in scenario_names else 0
            scenario_name = st.selectbox("Demo scenario", scenario_names, index=scenario_index, key="live_scenario")
            st.button("Load scenario", width="stretch", key="live_load_scenario", on_click=load_scenario, args=(scenario_name,))

        with st.container(key="map_action_panel"):
            action_cols = st.columns([1, 1], gap="small")
            with action_cols[0]:
                if st.button("Analyze", type="primary", width="stretch", key="live_analyze"):
                    st.session_state.analysis_requested = True
            with action_cols[1]:
                st.button("Reset", width="stretch", key="live_reset_reports", on_click=reset_to_default)
            st.toggle("Incidents", value=show_incidents, key="live_show_incidents")
            st.toggle("Risk field", value=show_overlays, key="live_show_overlays")

        with st.container(key="map_destination_card"):
            html_block(
                f"""
                <div class="panel">
                    <div class="panel-title">{html_text(destination["name"])}</div>
                    <p class="body-copy">{html_text(destination["description"])}</p>
                    <div class="divider"></div>
                    <span class="tag">{html_text(destination["category"])}</span>
                    <span class="tag">{destination["latitude"]:.4f}, {destination["longitude"]:.4f}</span>
                </div>
                """
            )
            render_status_card(evaluation, str(destination["name"]))
            render_metric_boxes(
                [
                    {"value": evaluation.incident_count, "label": "nearby reports"},
                    {"value": evaluation.average_severity, "label": "average severity"},
                    {"value": evaluation.recent_count, "label": "recent reports"},
                ]
            )

        if evaluation.label == "Danger":
            with st.container(key="map_dropoff_panel"):
                html_block(
                    f"""
                    <div class="callout">
                        {
                            "A safer nearby drop-off is recommended because this destination is inside a high-risk zone."
                            if recommendations
                            else "This destination is inside a high-risk zone, but no nearby safer drop-off meets the short-walk limit."
                        }
                    </div>
                    """
                )
                render_dropoff_cards(recommendations[:3], empty_message=NO_NEARBY_DROPOFF_MESSAGE)


def page_report_incident() -> None:
    st.markdown("## Report Incident")
    st.caption("Add a local report and the risk layer recalculates immediately.")

    left, right = st.columns([1, 1.18], gap="large")
    with left:
        st.markdown("### Choose exact location")
        st.caption("Click the exact curb, doorway, or intersection where the incident happened.")
        map_point = st.session_state.get("report_map_point")
        clicked_point = render_report_location_picker(selected_destination(), map_point)
        if clicked_point:
            st.session_state.report_map_point = clicked_point
            st.session_state.report_location_mode = "Map point"
            map_point = clicked_point
        if map_point:
            st.info(f"Selected map point: {map_point['latitude']:.6f}, {map_point['longitude']:.6f}")
            if st.button("Clear selected point", width="stretch", key="clear_report_map_point"):
                st.session_state.report_map_point = None
                st.session_state.report_location_mode = "Selected destination"
                st.rerun()
        else:
            st.info("No map point selected yet.")

        html_block(
            """
            <div class="report-card">
                <div class="panel-title">Community report flow</div>
                <p class="body-copy">
                    Reports are treated as signals, not automatic certainty. A single minor report stays visible without turning the whole area red.
                </p>
            </div>
            """
        )

        with st.form("incident_form", clear_on_submit=False):
            incident_type = st.selectbox("Incident type", INCIDENT_TYPES)
            severity = st.slider("Severity", 1, 5, 3)
            description = st.text_area(
                "Short description",
                placeholder="Example: Police activity near the curbside entrance; riders are avoiding the block.",
                height=110,
            )
            location_mode = st.radio(
                "Location",
                ["Map point", "Selected destination", "Predefined area", "Manual coordinates"],
                key="report_location_mode",
            )

            latitude = None
            longitude = None
            location_name = st.session_state.selected_destination
            if location_mode == "Map point":
                map_point = st.session_state.get("report_map_point")
                if map_point:
                    latitude = float(map_point["latitude"])
                    longitude = float(map_point["longitude"])
                    location_name = "selected map point"
                    st.info(f"Using map point at {latitude:.6f}, {longitude:.6f}.")
                else:
                    st.warning("Click the map above to choose a report point, or choose another location mode.")
            elif location_mode == "Selected destination":
                selected = selected_destination()
                latitude = float(selected["latitude"])
                longitude = float(selected["longitude"])
                st.info(f"Using {selected['name']} at {latitude:.4f}, {longitude:.4f}.")
            elif location_mode == "Predefined area":
                area_names = [area["name"] for area in AREA_OPTIONS]
                area_name = st.selectbox("Area", area_names)
                area = AREA_LOOKUP[area_name]
                latitude = float(area["latitude"])
                longitude = float(area["longitude"])
                location_name = area_name
            else:
                coord_cols = st.columns(2)
                with coord_cols[0]:
                    latitude = st.number_input("Latitude", value=45.4289, min_value=45.25, max_value=45.55, step=0.0001, format="%.6f")
                with coord_cols[1]:
                    longitude = st.number_input("Longitude", value=-75.6927, min_value=-75.90, max_value=-75.55, step=0.0001, format="%.6f")
                location_name = "Manual point"

            report_time = st.selectbox(
                "Time of report",
                ["Now", "30 minutes ago", "2 hours ago", "6 hours ago", "Yesterday"],
            )
            verified = st.toggle("Verified by operator or repeated source", value=False)
            similar_reports = st.slider("Similar reports seen nearby", 0, 10, 1)

            submitted = st.form_submit_button("Submit report", type="primary", width="stretch")

        if submitted:
            if latitude is None or longitude is None:
                st.error("Choose a map point or select another location mode before submitting.")
            elif not description.strip():
                st.error("Add a short description so riders understand why the area is flagged.")
            else:
                hours_lookup = {
                    "Now": 0,
                    "30 minutes ago": 0.5,
                    "2 hours ago": 2,
                    "6 hours ago": 6,
                    "Yesterday": 24,
                }
                timestamp = datetime.now() - pd.Timedelta(hours=hours_lookup[report_time])
                new_report = {
                    "id": f"user-{uuid4().hex[:8]}",
                    "incident_type": incident_type,
                    "latitude": float(latitude),
                    "longitude": float(longitude),
                    "severity": int(severity),
                    "description": description.strip(),
                    "timestamp": timestamp.replace(microsecond=0).isoformat(),
                    "verified": bool(verified),
                    "similar_reports": int(similar_reports),
                    "scenario_tag": "user_report",
                }
                st.session_state.incidents = [*st.session_state.incidents, new_report]
                st.session_state.last_report_id = new_report["id"]
                st.session_state.analysis_requested = True
                st.success(f"Report added near {location_name}. The map and risk zones have been updated.")

    with right:
        destination = selected_destination()
        evaluation = evaluate_location(
            float(destination["latitude"]),
            float(destination["longitude"]),
            st.session_state.incidents,
            build_risk_zones(st.session_state.incidents),
        )
        recommendations = recommend_safer_dropoffs(destination, st.session_state.incidents) if evaluation.label == "Danger" else []
        build_map(
            st.session_state.incidents,
            selected_destination=destination,
            recommendations=recommendations,
            show_incidents=True,
            show_overlays=True,
            height=600,
            highlighted_incident_id=st.session_state.last_report_id,
        )
        st.write("")
        render_status_card(evaluation, str(destination["name"]))


def page_area_explanation() -> None:
    st.markdown("## Why This Area Is Flagged")
    st.caption("The system explains the evidence instead of asking riders to trust a black box.")

    destination = destination_controls("explain")
    explanation = area_explanation(destination, st.session_state.incidents)
    evaluation = explanation["evaluation"]

    col_a, col_b = st.columns([1, 1], gap="large")
    with col_a:
        render_status_card(evaluation, str(destination["name"]))
        st.write("")
        render_metric_boxes(
            [
                {"value": evaluation.incident_count, "label": "reports inside radius"},
                {"value": evaluation.average_severity, "label": "average severity"},
                {"value": "Yes" if evaluation.clustered else "No", "label": "clustered pattern"},
            ]
        )
        st.write("")
        render_metric_boxes(
            [
                {"value": evaluation.recent_count, "label": "recent reports"},
                {"value": evaluation.verified_count, "label": "verified reports"},
                {"value": evaluation.unverified_count, "label": "unverified reports"},
            ]
        )
        st.write("")
        html_block(
            f"""
            <div class="panel">
                <div class="panel-title">Plain-language explanation</div>
                <p class="body-copy">{html_text(explanation["natural_language"])}</p>
            </div>
            """
        )
    with col_b:
        build_map(
            st.session_state.incidents,
            selected_destination=destination,
            recommendations=recommend_safer_dropoffs(destination, st.session_state.incidents) if evaluation.label == "Danger" else [],
            show_incidents=True,
            show_overlays=True,
            height=520,
            highlighted_incident_id=st.session_state.last_report_id,
        )
        st.write("")
        st.markdown("### Recent Reports Nearby")
        render_incident_list(evaluation.nearby_reports)


def page_ethics() -> None:
    st.markdown("## Ethics / Design Rationale")
    st.caption("Trust improves when the system is accountable for what it knows and what it does not know.")

    points = [
        {
            "title": "False confidence is a safety problem",
            "copy": "A navigation system can look precise even when the street-level situation has changed. The ethical issue is not only whether the route is efficient, but whether the system communicates uncertainty honestly.",
        },
        {
            "title": "Community reports matter",
            "copy": "Riders and local observers can surface conditions that official datasets may miss or receive late. Those reports help the system notice risk sooner.",
        },
        {
            "title": "Reports are not automatic truth",
            "copy": "A report is evidence, not certainty. The prototype weighs verification, recency, severity, and clustering so one low-signal report does not become a red zone by itself.",
        },
        {
            "title": "Uncertainty should trigger caution",
            "copy": "When reports are limited or conflicting, the responsible response is a clear caution message, not silence and not panic.",
        },
        {
            "title": "Safer nearby drop-offs can be more responsible",
            "copy": "Exact destination drop-off is not always the best service. A short walk from a calmer curb can reduce exposure to the most active risk zone.",
        },
        {
            "title": "Trust through accountability",
            "copy": "The rider sees what changed, why it matters, and what the system recommends. Trust comes from explanation and restraint, not from pretending to know everything.",
        },
    ]

    cols = st.columns(2)
    for index, point in enumerate(points):
        with cols[index % 2]:
            html_block(
                f"""
                <div class="hero-card">
                    <div class="panel-title">{html_text(point["title"])}</div>
                    <p class="body-copy">{html_text(point["copy"])}</p>
                </div>
                """
            )
            st.write("")

    html_block(
        """
        <div class="callout">
            This design supports the principle "No information does not mean safe" by separating <strong>no active alert</strong> from <strong>known safe</strong>.
        </div>
        """
    )


def page_scenarios() -> None:
    st.markdown("## Scenario Gallery")
    st.caption("Load a complete demo state with one click. Each scenario changes the reports, overlays, selected destination, and recommendation.")

    left, right = st.columns([0.92, 1.4], gap="large")
    with left:
        scenario_name = st.selectbox("Choose a scenario", list(SCENARIOS.keys()), key="scenario_gallery_selection")
        render_scenario_card(scenario_name, SCENARIOS[scenario_name])
        st.button("Load scenario", type="primary", width="stretch", on_click=load_scenario, args=(scenario_name,))
        st.button("Return to default Ottawa demo", width="stretch", on_click=reset_to_default)

        st.write("")
        st.markdown("### All scenarios")
        for name, scenario in SCENARIOS.items():
            render_scenario_card(name, scenario)

    with right:
        destination = selected_destination()
        evaluation = evaluate_location(
            float(destination["latitude"]),
            float(destination["longitude"]),
            st.session_state.incidents,
            build_risk_zones(st.session_state.incidents),
        )
        recommendations = recommend_safer_dropoffs(destination, st.session_state.incidents) if evaluation.label == "Danger" else []
        build_map(
            st.session_state.incidents,
            selected_destination=destination,
            recommendations=recommendations,
            show_incidents=True,
            show_overlays=True,
            height=620,
            highlighted_incident_id=st.session_state.last_report_id,
        )
        st.write("")
        render_status_card(evaluation, str(destination["name"]))
        if evaluation.label == "Danger":
            st.markdown("### Safer nearby drop-offs")
            render_dropoff_cards(recommendations, empty_message=NO_NEARBY_DROPOFF_MESSAGE)


def main() -> None:
    configure_page()
    initialize_state()
    render_theme_marker()

    pages = [
        "Live Map",
        "Report Incident",
        "Why Flagged",
        "Ethics",
        "Scenarios",
        "About",
    ]
    if st.session_state.active_page not in pages:
        st.session_state.active_page = "Live Map"
        st.session_state.app_nav_selection = st.session_state.active_page
    if "app_nav_selection" not in st.session_state or st.session_state.app_nav_selection not in pages:
        st.session_state.app_nav_selection = st.session_state.active_page

    with st.container(key="app_nav"):
        nav_col, theme_col = st.columns([1, 0.18], gap="small", vertical_alignment="center")
        with nav_col:
            selected_page = st.radio(
                "Navigation",
                pages,
                key="app_nav_selection",
                horizontal=True,
                label_visibility="collapsed",
                on_change=sync_active_page,
            )
        with theme_col:
            st.radio(
                "Theme",
                ["Dark", "Light"],
                key="theme_mode",
                horizontal=True,
                label_visibility="collapsed",
            )

    if selected_page and selected_page != st.session_state.active_page:
        st.session_state.active_page = selected_page

    active_page = st.session_state.active_page
    if active_page == "About":
        page_home()
    elif active_page == "Live Map":
        page_live_map()
    elif active_page == "Report Incident":
        page_report_incident()
    elif active_page == "Why Flagged":
        page_area_explanation()
    elif active_page == "Ethics":
        page_ethics()
    elif active_page == "Scenarios":
        page_scenarios()


if __name__ == "__main__":
    if not running_inside_streamlit():
        print(
            "This is a Streamlit app. Start it with:\n\n"
            "    streamlit run app.py\n\n"
            "Then open the Local URL shown in the terminal.",
            file=sys.stderr,
        )
        raise SystemExit(0)
    main()
