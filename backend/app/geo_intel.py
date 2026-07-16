"""Geospatial crime pattern intelligence.

Aggregates fraud complaints, counterfeit-currency seizures and cybercrime reports
across Indian cities into hotspots with a computed risk score and patrol-priority
ranking for a command-centre view. Deterministic dataset (fixed seed) so the map
and rankings are stable for demos.
"""
from __future__ import annotations

import random
from typing import Dict, List

from .schemas import GeoHotspot, GeoIncident, GeoIntelResponse

# city -> (state, lat, lng, weight) ; weight biases incident volume (known hubs higher)
CITIES: Dict[str, tuple] = {
    "Delhi": ("Delhi", 28.61, 77.21, 5),
    "Mumbai": ("Maharashtra", 19.08, 72.88, 4),
    "Jamtara": ("Jharkhand", 23.96, 86.80, 5),
    "Mewat": ("Haryana", 28.10, 77.00, 5),
    "Bharatpur": ("Rajasthan", 27.22, 77.49, 4),
    "Bengaluru": ("Karnataka", 12.97, 77.59, 4),
    "Hyderabad": ("Telangana", 17.39, 78.49, 3),
    "Chennai": ("Tamil Nadu", 13.08, 80.27, 3),
    "Kolkata": ("West Bengal", 22.57, 88.36, 3),
    "Pune": ("Maharashtra", 18.52, 73.86, 3),
    "Jaipur": ("Rajasthan", 26.91, 75.79, 3),
    "Ahmedabad": ("Gujarat", 23.03, 72.58, 2),
    "Lucknow": ("Uttar Pradesh", 26.85, 80.95, 3),
    "Patna": ("Bihar", 25.59, 85.14, 3),
    "Bhopal": ("Madhya Pradesh", 23.26, 77.41, 2),
    "Nagpur": ("Maharashtra", 21.15, 79.09, 2),
    "Guwahati": ("Assam", 26.14, 91.74, 2),
    "Kochi": ("Kerala", 9.93, 76.27, 2),
    "Visakhapatnam": ("Andhra Pradesh", 17.69, 83.22, 2),
    "Gurugram": ("Haryana", 28.46, 77.03, 4),
}

TYPES = ["digital_arrest", "phishing", "counterfeit", "mule_account"]
SEVERITY_SCORE = {"low": 1, "medium": 2, "high": 3}


def _severity(count: int) -> str:
    if count >= 40:
        return "high"
    if count >= 18:
        return "medium"
    return "low"


def build_geo_intel() -> GeoIntelResponse:
    rng = random.Random(2024)
    incidents: List[GeoIncident] = []
    hotspots: List[GeoHotspot] = []

    for city, (state, lat, lng, weight) in CITIES.items():
        type_counts: Dict[str, int] = {}
        total = 0
        # 2-4 incident categories per city
        active_types = rng.sample(TYPES, k=rng.randint(2, 4))
        for t in active_types:
            count = rng.randint(5, 20) * weight
            type_counts[t] = count
            total += count
            # slight jitter so co-located markers don't perfectly overlap
            jlat = lat + rng.uniform(-0.15, 0.15)
            jlng = lng + rng.uniform(-0.15, 0.15)
            incidents.append(GeoIncident(
                id=f"{city}-{t}", city=city, state=state,
                lat=round(jlat, 4), lng=round(jlng, 4),
                type=t, severity=_severity(count), count=count,
            ))

        dominant = max(type_counts, key=type_counts.get)
        # Risk score blends volume and category severity mix.
        sev_mix = sum(SEVERITY_SCORE[_severity(c)] * c for c in type_counts.values())
        risk = min(100, round(total / 4 + sev_mix / 8))
        hotspots.append(GeoHotspot(
            city=city, state=state, lat=lat, lng=lng,
            total_incidents=total, dominant_type=dominant,
            risk_score=risk, patrol_priority=0,
        ))

    # Rank patrol priority by risk score (1 = highest priority).
    hotspots.sort(key=lambda h: h.risk_score, reverse=True)
    for i, h in enumerate(hotspots):
        h.patrol_priority = i + 1

    stats = {
        "total_incidents": sum(i.count for i in incidents),
        "cities_monitored": len(CITIES),
        "high_risk_zones": sum(1 for h in hotspots if h.risk_score >= 60),
        "top_hotspot": hotspots[0].city if hotspots else None,
    }

    return GeoIntelResponse(incidents=incidents, hotspots=hotspots, stats=stats)
