from __future__ import annotations


APP_CSS = """
<style>
:root {
    --bg: #090b0f;
    --panel: rgba(17, 21, 29, 0.82);
    --panel-strong: rgba(24, 30, 41, 0.94);
    --line: rgba(255, 255, 255, 0.12);
    --muted: #9ba8b8;
    --text: #f5f7fb;
    --soft: #d8dee8;
    --orange: #e79b45;
    --orange-bg: rgba(231, 155, 69, 0.15);
    --red: #ed5f5f;
    --red-bg: rgba(237, 95, 95, 0.15);
    --green: #69c998;
    --green-bg: rgba(105, 201, 152, 0.13);
    --cyan: #8cc7d8;
}

html, body, [class*="css"] {
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.stApp {
    background:
        radial-gradient(circle at 18% 0%, rgba(140, 199, 216, 0.12), transparent 27rem),
        radial-gradient(circle at 90% 15%, rgba(237, 95, 95, 0.08), transparent 24rem),
        linear-gradient(135deg, #090b0f 0%, #10131a 48%, #090b0f 100%);
    color: var(--text);
}

.theme-light-marker,
.theme-dark-marker {
    display: none;
}

.stApp:has(.theme-light-marker) {
    --bg: #edf3f8;
    --panel: rgba(255, 255, 255, 0.82);
    --panel-strong: rgba(255, 255, 255, 0.94);
    --line: rgba(15, 23, 42, 0.14);
    --muted: #5d6b7c;
    --text: #111827;
    --soft: #2d3748;
    --orange-bg: rgba(203, 117, 43, 0.13);
    --red-bg: rgba(220, 63, 73, 0.12);
    --green-bg: rgba(42, 148, 96, 0.12);
    background:
        radial-gradient(circle at 18% 0%, rgba(93, 159, 184, 0.20), transparent 27rem),
        radial-gradient(circle at 92% 10%, rgba(220, 63, 73, 0.10), transparent 24rem),
        linear-gradient(135deg, #edf3f8 0%, #f8fbff 48%, #e8eef5 100%);
}

.stApp:has(.theme-light-marker),
.stApp:has(.theme-light-marker) label,
.stApp:has(.theme-light-marker) p,
.stApp:has(.theme-light-marker) .stMarkdown,
.stApp:has(.theme-light-marker) .stCaption,
.stApp:has(.theme-light-marker) [data-testid="stMarkdownContainer"],
.stApp:has(.theme-light-marker) [data-testid="stMarkdownContainer"] p {
    color: var(--soft);
}

.stApp:has(.theme-light-marker) h1,
.stApp:has(.theme-light-marker) h2,
.stApp:has(.theme-light-marker) h3,
.stApp:has(.theme-light-marker) .panel-title,
.stApp:has(.theme-light-marker) .status-main,
.stApp:has(.theme-light-marker) .drop-title,
.stApp:has(.theme-light-marker) .scenario-title,
.stApp:has(.theme-light-marker) .metric-value {
    color: var(--text);
}

.stApp:has(.theme-light-marker) .body-copy,
.stApp:has(.theme-light-marker) .metric-label,
.stApp:has(.theme-light-marker) .muted {
    color: var(--soft);
}

.stApp:has(.theme-light-marker) .status-label.Normal,
.stApp:has(.theme-light-marker) .tag.Normal {
    color: #23865a;
}

.stApp:has(.theme-light-marker) .status-label.Caution,
.stApp:has(.theme-light-marker) .tag.Caution {
    color: #a45f19;
}

.stApp:has(.theme-light-marker) .status-label.Danger,
.stApp:has(.theme-light-marker) .tag.Danger {
    color: #c93443;
}

.stApp:has(.theme-light-marker) div[data-baseweb="select"] > div,
.stApp:has(.theme-light-marker) div[data-baseweb="input"] > div,
.stApp:has(.theme-light-marker) textarea,
.stApp:has(.theme-light-marker) .stTextInput input,
.stApp:has(.theme-light-marker) .stNumberInput input {
    background: rgba(255,255,255,0.78) !important;
    border-color: rgba(15,23,42,0.16) !important;
    color: var(--text) !important;
}

.stApp:has(.theme-light-marker) div[data-baseweb="select"] *,
.stApp:has(.theme-light-marker) div[data-baseweb="input"] *,
.stApp:has(.theme-light-marker) textarea,
.stApp:has(.theme-light-marker) input {
    color: var(--text) !important;
}

header[data-testid="stHeader"] {
    background: transparent;
    height: 0;
    pointer-events: none;
}

.block-container {
    padding-top: 0.35rem;
    padding-bottom: 0;
    padding-left: clamp(0.4rem, 0.9vw, 1rem);
    padding-right: clamp(0.4rem, 0.9vw, 1rem);
    max-width: none;
}

div[data-testid="stSidebar"] {
    background: rgba(9, 11, 15, 0.92);
    border-right: 1px solid var(--line);
}

div[data-testid="stSidebar"] * {
    color: var(--soft);
}

.stButton > button,
.stDownloadButton > button {
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: linear-gradient(180deg, rgba(245,247,251,0.13), rgba(245,247,251,0.07));
    color: var(--text);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.25);
    font-weight: 700;
}

.stButton > button:hover {
    border-color: rgba(140, 199, 216, 0.55);
    color: #ffffff;
    background: linear-gradient(180deg, rgba(140,199,216,0.2), rgba(245,247,251,0.08));
}

.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #f0a85a, #d95656);
    border: 0;
    color: #160e0d;
}

div[data-baseweb="select"] > div,
div[data-baseweb="input"] > div,
textarea,
.stTextInput input,
.stNumberInput input {
    background: rgba(255,255,255,0.06) !important;
    border-color: rgba(255,255,255,0.14) !important;
    color: var(--text) !important;
    border-radius: 8px !important;
}

label, .stMarkdown, .stCaption, p {
    color: var(--soft);
}

h1, h2, h3 {
    color: var(--text);
    letter-spacing: 0;
}

[data-testid="stMetricValue"] {
    color: var(--text);
}

[data-testid="stMetricLabel"] {
    color: var(--muted);
}

.hero {
    border: 1px solid rgba(255,255,255,0.13);
    background:
        linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.035)),
        linear-gradient(135deg, rgba(140,199,216,0.12), rgba(237,95,95,0.08));
    border-radius: 8px;
    padding: clamp(1.4rem, 4vw, 3rem);
    box-shadow: 0 28px 90px rgba(0,0,0,0.38);
    position: relative;
    overflow: hidden;
}

.hero::after {
    content: "";
    position: absolute;
    inset: auto -12% -35% 35%;
    height: 18rem;
    background: linear-gradient(90deg, transparent, rgba(231,155,69,0.12), rgba(237,95,95,0.12), transparent);
    transform: rotate(-8deg);
}

.eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--cyan);
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.8rem;
}

.title {
    font-size: clamp(2.2rem, 5vw, 5rem);
    line-height: 0.95;
    font-weight: 850;
    max-width: 980px;
    color: #ffffff;
    margin: 0 0 0.7rem;
}

.subtitle {
    font-size: clamp(1rem, 2vw, 1.35rem);
    color: #c8d0dc;
    max-width: 820px;
    line-height: 1.55;
}

.panel,
.hero-card,
.status-card,
.scenario-card,
.report-card,
.drop-card {
    border: 1px solid var(--line);
    background: var(--panel);
    backdrop-filter: blur(18px);
    border-radius: 8px;
    box-shadow: 0 18px 55px rgba(0,0,0,0.28);
}

.panel,
.hero-card,
.report-card {
    padding: 1.25rem;
}

.hero-card {
    min-height: 100%;
    background: var(--panel-strong);
}

.panel-title {
    font-size: 1rem;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 0.45rem;
}

.body-copy {
    color: var(--soft);
    line-height: 1.55;
    margin: 0;
}

.muted {
    color: var(--muted);
}

.legend-row {
    display: flex;
    gap: 0.8rem;
    flex-wrap: wrap;
    margin-top: 1rem;
}

.legend-pill {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0.65rem 0.8rem;
    background: rgba(255,255,255,0.045);
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    color: var(--soft);
    font-weight: 700;
}

.dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    display: inline-block;
}

.dot-normal { background: var(--green); box-shadow: 0 0 18px rgba(105,201,152,0.5); }
.dot-caution { background: var(--orange); box-shadow: 0 0 18px rgba(231,155,69,0.52); }
.dot-danger { background: var(--red); box-shadow: 0 0 18px rgba(237,95,95,0.52); }

.map-shell {
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 28px 80px rgba(0,0,0,0.4);
    background: #080a0e;
    padding: 0.35rem;
}

.status-card {
    padding: 1rem;
    border-left: 4px solid rgba(255,255,255,0.2);
}

.status-Normal { border-left-color: var(--green); background: linear-gradient(135deg, var(--green-bg), rgba(255,255,255,0.04)); }
.status-Caution { border-left-color: var(--orange); background: linear-gradient(135deg, var(--orange-bg), rgba(255,255,255,0.04)); }
.status-Danger { border-left-color: var(--red); background: linear-gradient(135deg, var(--red-bg), rgba(255,255,255,0.04)); }

.status-label {
    font-size: 0.78rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.status-label.Normal { color: var(--green); }
.status-label.Caution { color: var(--orange); }
.status-label.Danger { color: var(--red); }

.status-main {
    color: var(--text);
    font-size: 1.35rem;
    font-weight: 850;
    margin: 0.2rem 0 0.25rem;
}

.mini-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.7rem;
}

.metric-box {
    border: 1px solid var(--line);
    background: rgba(255,255,255,0.045);
    border-radius: 8px;
    padding: 0.8rem;
}

.metric-value {
    color: var(--text);
    font-size: 1.45rem;
    font-weight: 850;
}

.metric-label {
    color: var(--muted);
    font-size: 0.76rem;
    margin-top: 0.1rem;
}

.drop-card,
.scenario-card {
    padding: 1rem;
    margin-bottom: 0.85rem;
}

.drop-title,
.scenario-title {
    color: var(--text);
    font-weight: 850;
    font-size: 1.05rem;
    margin-bottom: 0.3rem;
}

.tag {
    display: inline-flex;
    align-items: center;
    border-radius: 8px;
    padding: 0.28rem 0.55rem;
    border: 1px solid var(--line);
    background: rgba(255,255,255,0.055);
    color: var(--soft);
    font-size: 0.74rem;
    font-weight: 800;
    margin-right: 0.3rem;
    margin-bottom: 0.35rem;
}

.tag.Normal { color: var(--green); border-color: rgba(105,201,152,0.32); background: var(--green-bg); }
.tag.Caution { color: var(--orange); border-color: rgba(231,155,69,0.34); background: var(--orange-bg); }
.tag.Danger { color: var(--red); border-color: rgba(237,95,95,0.34); background: var(--red-bg); }

.divider {
    height: 1px;
    background: var(--line);
    margin: 1rem 0;
}

.callout {
    border: 1px solid rgba(140,199,216,0.22);
    background: rgba(140,199,216,0.08);
    border-radius: 8px;
    padding: 1rem;
    color: var(--soft);
}

.incident-list {
    display: grid;
    gap: 0.7rem;
}

.incident-item {
    border: 1px solid var(--line);
    background: rgba(255,255,255,0.04);
    border-radius: 8px;
    padding: 0.8rem;
}

.small-link {
    color: var(--cyan);
    font-weight: 750;
}

.map-kicker {
    color: var(--cyan);
    font-size: 0.76rem;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 0.2rem;
}

.live-title-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.65rem;
}

.live-title {
    color: var(--text);
    font-size: clamp(1.7rem, 2.7vw, 3rem);
    font-weight: 850;
    line-height: 1;
    margin: 0;
}

.live-subtitle {
    color: var(--muted);
    margin: 0.35rem 0 0;
}

.map-meta {
    text-align: right;
    color: var(--soft);
    font-weight: 750;
}

.st-key-app_nav {
    position: relative;
    z-index: 10000;
    isolation: isolate;
    margin-bottom: 0.45rem;
    padding: 0.24rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--line);
    border-radius: 8px;
    pointer-events: auto;
}

.st-key-app_nav * {
    pointer-events: auto;
}

.st-key-app_nav [data-testid="stHorizontalBlock"] {
    align-items: center;
}

.st-key-app_nav [data-testid="stRadio"] {
    width: 100%;
}

.st-key-app_nav [role="radiogroup"] {
    display: flex;
    width: 100%;
    gap: 0.25rem;
}

.st-key-app_nav [role="radiogroup"] > label,
.st-key-app_nav [data-testid="stRadio"] label {
    position: relative;
    display: flex !important;
    flex: 1 1 0;
    width: 100%;
    justify-content: center;
    align-items: center;
    min-height: 2.15rem;
    padding: 0.35rem 0.65rem;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    font-weight: 800;
    cursor: pointer;
}

.st-key-app_nav [data-testid="stRadio"] label * {
    pointer-events: none;
}

.st-key-app_nav [data-testid="stRadio"] label:has(input:checked) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.1);
    color: var(--text);
}

.st-key-app_nav [data-testid="stRadio"] label:has(input:checked) [data-testid="stMarkdownContainer"] p {
    color: var(--text) !important;
}

.st-key-app_nav [data-testid="stRadio"] label:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.14);
    color: var(--text);
}

.st-key-app_nav [data-testid="stRadio"] label:hover [data-testid="stMarkdownContainer"] p {
    color: var(--text) !important;
}

.st-key-app_nav [data-testid="stRadio"] label > div:first-child {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    inset: 0;
}

.st-key-app_nav [data-testid="stRadio"] label > div:last-child {
    width: 100%;
    text-align: center;
}

.st-key-app_nav [data-testid="stRadio"] [data-testid="stMarkdownContainer"] p {
    color: inherit !important;
    font-size: 0.78rem;
    font-weight: 800;
    white-space: nowrap;
    text-align: center;
}

.st-key-app_nav [data-testid="stButtonGroup"] {
    width: 100%;
}

.st-key-app_nav [data-baseweb="button-group"] {
    width: 100%;
}

.st-key-app_nav button[data-testid^="stBaseButton-segmented_control"] {
    flex: 1 1 0;
    min-height: 2.15rem;
    padding: 0.35rem 0.65rem;
    box-shadow: none;
    background: transparent;
    border-color: transparent;
    color: var(--muted);
    border-radius: 8px;
    font-weight: 800;
}

.st-key-app_nav button[data-testid="stBaseButton-segmented_controlActive"] {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text);
}

.st-key-app_nav button[data-testid^="stBaseButton-segmented_control"]:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.14);
    color: var(--text);
}

.stApp:has(.st-key-live_map_stage) .block-container {
    height: 100vh;
    overflow: hidden;
}

.st-key-live_map_stage {
    --live-map-height: calc(100vh - 4.55rem);
    position: relative;
    z-index: 1;
    height: var(--live-map-height) !important;
    min-height: var(--live-map-height) !important;
    max-height: var(--live-map-height) !important;
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 28px 90px rgba(0,0,0,0.42);
    background: #080a0e;
}

.st-key-live_map_canvas {
    position: absolute;
    inset: 0;
    z-index: 1;
    height: 100% !important;
    min-height: 100% !important;
}

.st-key-live_map_canvas [data-testid="stVerticalBlock"],
.st-key-live_map_canvas [data-testid="stElementContainer"] {
    height: 100% !important;
    min-height: 100% !important;
}

.st-key-live_map_stage [data-testid="stDeckGlJsonChart"],
.st-key-live_map_stage [data-testid="stDeckGlJsonChart"] > div,
.st-key-live_map_stage [data-testid="stDeckGlJsonChart"] > div > div,
.st-key-live_map_stage .deckgl-wrapper,
.st-key-live_map_stage .mapboxgl-map,
.st-key-live_map_stage .maplibregl-map,
.st-key-live_map_stage iframe,
.st-key-live_map_stage canvas,
.st-key-live_map_canvas [data-testid="stDeckGlJsonChart"],
.st-key-live_map_canvas [data-testid="stDeckGlJsonChart"] > div,
.st-key-live_map_canvas [data-testid="stDeckGlJsonChart"] > div > div,
.st-key-live_map_canvas .deckgl-wrapper,
.st-key-live_map_canvas .mapboxgl-map,
.st-key-live_map_canvas .maplibregl-map,
.st-key-live_map_canvas iframe,
.st-key-live_map_canvas canvas {
    width: 100% !important;
    height: 100% !important;
    min-height: 100% !important;
}

.st-key-live_map_stage [data-testid="stDeckGlJsonChart"],
.st-key-live_map_canvas [data-testid="stDeckGlJsonChart"] {
    position: absolute !important;
    inset: 0 !important;
}

.st-key-map_search_panel,
.st-key-map_action_panel,
.st-key-map_destination_card,
.st-key-map_alert_panel,
.st-key-map_dropoff_panel {
    position: absolute;
    z-index: 30;
    border: 1px solid rgba(255,255,255,0.14);
    background: linear-gradient(145deg, rgba(9,11,15,0.88), rgba(20,26,35,0.68));
    backdrop-filter: blur(18px);
    border-radius: 8px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.38);
    padding: 0.9rem;
    pointer-events: auto;
}

.stApp:has(.theme-light-marker) .st-key-app_nav,
.stApp:has(.theme-light-marker) .st-key-map_search_panel,
.stApp:has(.theme-light-marker) .st-key-map_action_panel,
.stApp:has(.theme-light-marker) .st-key-map_dropoff_panel {
    background: linear-gradient(145deg, rgba(255,255,255,0.9), rgba(239,246,255,0.72));
    box-shadow: 0 24px 80px rgba(36, 48, 65, 0.18);
}

.stApp:has(.theme-light-marker) .panel,
.stApp:has(.theme-light-marker) .status-card,
.stApp:has(.theme-light-marker) .metric-box,
.stApp:has(.theme-light-marker) .drop-card,
.stApp:has(.theme-light-marker) .scenario-card,
.stApp:has(.theme-light-marker) .report-card,
.stApp:has(.theme-light-marker) .hero-card {
    box-shadow: 0 18px 55px rgba(36,48,65,0.14);
}

.stApp:has(.theme-light-marker) .st-key-app_nav [data-testid="stRadio"] label:has(input:checked) {
    background: rgba(17, 24, 39, 0.08);
    border-color: rgba(17, 24, 39, 0.10);
}

.stApp:has(.theme-light-marker) .st-key-app_nav [data-testid="stRadio"] label:hover {
    background: rgba(17, 24, 39, 0.06);
    border-color: rgba(17, 24, 39, 0.12);
}

.st-key-map_search_panel {
    top: 1rem;
    left: 1rem;
    width: min(370px, calc(100% - 2rem));
}

.st-key-map_action_panel {
    top: 1rem;
    right: 1rem;
    width: 315px;
}

.st-key-map_destination_card {
    left: 1rem;
    bottom: 1rem;
    width: min(365px, calc(100% - 2rem));
    padding: 0;
    background: transparent;
    border: 0;
    box-shadow: none;
    max-height: calc(100% - 2rem);
    overflow: auto;
}

.st-key-map_destination_card .status-card,
.st-key-map_destination_card .mini-grid {
    margin-top: 0.7rem;
}

.st-key-map_destination_card .mini-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.45rem;
}

.st-key-map_destination_card .metric-box {
    padding: 0.55rem;
}

.st-key-map_destination_card .metric-value {
    font-size: 1rem;
}

.st-key-map_destination_card .metric-label {
    font-size: 0.66rem;
}

.st-key-map_dropoff_panel {
    right: 1.25rem;
    bottom: 1.25rem;
    width: min(360px, calc(100% - 2.5rem));
    max-height: 48vh;
    overflow: auto;
}

.st-key-map_dropoff_panel .callout {
    margin-bottom: 0.7rem;
}

.st-key-map_dropoff_panel .drop-card:last-child {
    margin-bottom: 0;
}

.map-panel-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 850;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 0.65rem;
}

.map-panel-heading strong {
    color: var(--text);
    letter-spacing: 0;
}

.st-key-map_search_panel label,
.st-key-map_action_panel label {
    font-size: 0.78rem;
    font-weight: 760;
    color: var(--muted);
}

.st-key-map_search_panel [data-testid="stVerticalBlock"],
.st-key-map_action_panel [data-testid="stVerticalBlock"] {
    gap: 0.55rem;
}

.hud-recommendation {
    margin-top: 0.75rem;
}

@media (max-width: 1180px) {
    .mini-grid {
        grid-template-columns: 1fr;
    }
    .title {
        font-size: 2.3rem;
    }
    .live-title-row {
        display: block;
    }
    .map-meta {
        margin-top: 0.45rem;
        text-align: left;
    }
    .st-key-live_map_stage {
        height: auto;
        min-height: 0;
        max-height: none;
        overflow: visible;
        border: 0;
        background: transparent;
        box-shadow: none;
    }
    .st-key-live_map_canvas,
    .st-key-map_search_panel,
    .st-key-map_action_panel,
    .st-key-map_destination_card,
    .st-key-map_alert_panel,
    .st-key-map_dropoff_panel {
        position: relative;
        inset: auto;
        left: auto;
        right: auto;
        bottom: auto;
        top: auto;
        width: 100%;
        max-height: none;
        overflow: visible;
        transform: none;
        margin-bottom: 0.8rem;
    }
    .st-key-live_map_canvas {
        height: min(62vh, 540px);
        min-height: 420px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.16);
        border-radius: 8px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.34);
    }
}
</style>
"""
