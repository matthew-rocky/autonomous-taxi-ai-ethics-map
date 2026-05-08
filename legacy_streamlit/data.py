from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List


OTTAWA_CENTER = {"latitude": 45.4215, "longitude": -75.6972, "zoom": 12.2}


DESTINATIONS: List[Dict[str, object]] = [
    {
        "name": "ByWard Market",
        "latitude": 45.4289,
        "longitude": -75.6927,
        "category": "Nightlife / food",
        "description": "Dense pedestrian district with restaurants, bars, and late-night activity.",
    },
    {
        "name": "Rideau Centre",
        "latitude": 45.4252,
        "longitude": -75.6900,
        "category": "Shopping / transit",
        "description": "Major downtown shopping and transit destination.",
    },
    {
        "name": "Parliament Hill",
        "latitude": 45.4236,
        "longitude": -75.7009,
        "category": "Civic landmark",
        "description": "Central civic landmark with controlled access points.",
    },
    {
        "name": "uOttawa",
        "latitude": 45.4231,
        "longitude": -75.6831,
        "category": "Campus",
        "description": "University campus and transit-adjacent destination.",
    },
    {
        "name": "Lansdowne",
        "latitude": 45.3982,
        "longitude": -75.6834,
        "category": "Events / retail",
        "description": "Sports, events, restaurants, and public space around Bank Street.",
    },
    {
        "name": "Westboro",
        "latitude": 45.3898,
        "longitude": -75.7549,
        "category": "Neighbourhood",
        "description": "Main-street retail and residential area.",
    },
    {
        "name": "Elgin Street",
        "latitude": 45.4167,
        "longitude": -75.6907,
        "category": "Restaurants / nightlife",
        "description": "Restaurant corridor with night-time foot traffic.",
    },
    {
        "name": "Ottawa Hospital Civic Campus",
        "latitude": 45.3925,
        "longitude": -75.7226,
        "category": "Hospital",
        "description": "Hospital campus with emergency access constraints.",
    },
]


SAFE_DROPOFFS: List[Dict[str, object]] = [
    {
        "name": "Mackenzie King Bridge Entrance",
        "latitude": 45.4240,
        "longitude": -75.6884,
        "category": "Downtown curbside",
        "explanation": "Well-lit curbside access with easier exit from the densest ByWard reports.",
    },
    {
        "name": "Major's Hill Park South Gate",
        "latitude": 45.4260,
        "longitude": -75.6967,
        "category": "Civic curbside",
        "explanation": "Keeps the drop-off near the destination while avoiding the most active market cluster.",
    },
    {
        "name": "Rideau Canal East Curb",
        "latitude": 45.4219,
        "longitude": -75.6868,
        "category": "Transit-adjacent curbside",
        "explanation": "Adds a short walk and moves away from repeated reports near the nightlife block.",
    },
    {
        "name": "National Arts Centre Curb",
        "latitude": 45.4211,
        "longitude": -75.6937,
        "category": "Central curbside",
        "explanation": "A familiar public landmark with better spacing from clustered incidents.",
    },
    {
        "name": "Sparks Street West",
        "latitude": 45.4210,
        "longitude": -75.7045,
        "category": "Civic curbside",
        "explanation": "Close to Parliament while keeping clear of demonstration spillover.",
    },
    {
        "name": "Queen Street at Metcalfe",
        "latitude": 45.4213,
        "longitude": -75.6972,
        "category": "Downtown curbside",
        "explanation": "Central, well-connected, and outside the most active report radius.",
    },
    {
        "name": "uOttawa Lees Transit Edge",
        "latitude": 45.4165,
        "longitude": -75.6694,
        "category": "Campus transit",
        "explanation": "Keeps the rider near campus while avoiding localized uncertainty around the core.",
    },
    {
        "name": "Bank Street at Fifth Avenue",
        "latitude": 45.4007,
        "longitude": -75.6862,
        "category": "Lansdowne curbside",
        "explanation": "Simple walking route with lower current report density.",
    },
    {
        "name": "Westboro Station North",
        "latitude": 45.3950,
        "longitude": -75.7468,
        "category": "Transit-adjacent curbside",
        "explanation": "Transit-adjacent curbside with limited active community alerts.",
    },
    {
        "name": "Civic Hospital West Entrance",
        "latitude": 45.3910,
        "longitude": -75.7250,
        "category": "Hospital access",
        "explanation": "Avoids possible congestion near the emergency approach.",
    },
]


INCIDENT_TYPES = [
    "Violence",
    "Harassment",
    "Protest",
    "Road blockage",
    "Fire",
    "Police activity",
    "Suspicious activity",
    "Accident",
    "Poor lighting",
    "Crowd surge",
    "Other",
]


AREA_OPTIONS: List[Dict[str, object]] = [
    *DESTINATIONS,
    {
        "name": "Market Square",
        "latitude": 45.4286,
        "longitude": -75.6914,
        "category": "ByWard local area",
        "description": "Central block in the ByWard Market.",
    },
    {
        "name": "Dalhousie and George",
        "latitude": 45.4279,
        "longitude": -75.6900,
        "category": "ByWard local area",
        "description": "Busy market intersection.",
    },
    {
        "name": "Bank and Somerset",
        "latitude": 45.4145,
        "longitude": -75.6953,
        "category": "Centretown",
        "description": "Mixed nightlife, retail, and residential area.",
    },
    {
        "name": "Civic Emergency Approach",
        "latitude": 45.3917,
        "longitude": -75.7218,
        "category": "Hospital access",
        "description": "Hospital access road and drop-off approach.",
    },
]


def now_iso() -> str:
    return datetime.now().replace(microsecond=0).isoformat()


def hours_ago(hours: float) -> str:
    return (datetime.now() - timedelta(hours=hours)).replace(microsecond=0).isoformat()


def default_incidents() -> List[Dict[str, object]]:
    """Baseline data used when the app starts or when the demo is reset."""
    return [
        {
            "id": "base-byward-1",
            "incident_type": "Harassment",
            "latitude": 45.4287,
            "longitude": -75.6924,
            "severity": 4,
            "description": "Repeated harassment reported near the late-night queue area.",
            "timestamp": hours_ago(1.4),
            "verified": True,
            "similar_reports": 3,
            "scenario_tag": "default",
        },
        {
            "id": "base-byward-2",
            "incident_type": "Police activity",
            "latitude": 45.4293,
            "longitude": -75.6918,
            "severity": 4,
            "description": "Active police response around a crowded block.",
            "timestamp": hours_ago(2.2),
            "verified": True,
            "similar_reports": 2,
            "scenario_tag": "default",
        },
        {
            "id": "base-byward-3",
            "incident_type": "Crowd surge",
            "latitude": 45.4282,
            "longitude": -75.6935,
            "severity": 3,
            "description": "Dense crowd movement creating unstable pick-up conditions.",
            "timestamp": hours_ago(3.0),
            "verified": False,
            "similar_reports": 4,
            "scenario_tag": "default",
        },
        {
            "id": "base-rideau-1",
            "incident_type": "Road blockage",
            "latitude": 45.4246,
            "longitude": -75.6895,
            "severity": 3,
            "description": "Temporary curb blockage affecting easy drop-off access.",
            "timestamp": hours_ago(5.5),
            "verified": True,
            "similar_reports": 1,
            "scenario_tag": "default",
        },
        {
            "id": "base-elgin-1",
            "incident_type": "Poor lighting",
            "latitude": 45.4169,
            "longitude": -75.6912,
            "severity": 2,
            "description": "Low lighting reported near a side street approach.",
            "timestamp": hours_ago(11),
            "verified": False,
            "similar_reports": 1,
            "scenario_tag": "default",
        },
        {
            "id": "base-lansdowne-1",
            "incident_type": "Accident",
            "latitude": 45.3976,
            "longitude": -75.6843,
            "severity": 2,
            "description": "Minor collision reported near an event exit route.",
            "timestamp": hours_ago(16),
            "verified": True,
            "similar_reports": 0,
            "scenario_tag": "default",
        },
    ]


def destinations_by_name() -> Dict[str, Dict[str, object]]:
    return {destination["name"]: destination for destination in DESTINATIONS}


def areas_by_name() -> Dict[str, Dict[str, object]]:
    return {area["name"]: area for area in AREA_OPTIONS}
