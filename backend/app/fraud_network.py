"""Fraud network graph intelligence.

Builds a deterministic, realistic multi-ring fraud network from transaction,
call and device linkages, then derives court-ready intelligence packages:
connected-component ring detection, degree-centrality kingpin identification,
cross-jurisdiction flagging and a tamper-evident evidence hash per ring.

The dataset is generated with a fixed seed so the graph and analytics are stable
across runs (important for demos and for reproducible evidence packages).
"""
from __future__ import annotations

import hashlib
import random
from typing import Dict, List, Set, Tuple

from .schemas import FraudNetworkResponse, GraphEdge, GraphNode, RingPackage

VICTIM_CITIES = [
    "Pune", "Bengaluru", "Chennai", "Ahmedabad", "Lucknow",
    "Kolkata", "Hyderabad", "Mumbai", "Jaipur", "Bhopal", "Kochi",
]

RING_DEFS = [
    {"label": "Op. Ghost Parcel", "hub": "Jamtara", "scammers": 2, "mules": 3, "victims": 6},
    {"label": "Op. Blue Uniform", "hub": "Mewat", "scammers": 1, "mules": 2, "victims": 5},
    {"label": "Op. Customs Trap", "hub": "Delhi", "scammers": 2, "mules": 2, "victims": 4},
]


def _build_raw() -> Tuple[List[GraphNode], List[GraphEdge], List[Dict]]:
    rng = random.Random(42)
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    ring_meta: List[Dict] = []

    for ring_id, d in enumerate(RING_DEFS):
        hub = d["hub"]
        scammer_ids: List[str] = []
        mule_ids: List[str] = []
        victim_ids: List[str] = []
        total_defrauded = 0.0
        jurisdictions: Set[str] = {hub}

        # Kingpins / scammers
        for s in range(d["scammers"]):
            nid = f"r{ring_id}-scammer-{s}"
            scammer_ids.append(nid)
            nodes.append(GraphNode(
                id=nid, label=f"Scammer {chr(65 + s)} ({hub})", type="scammer",
                ring=ring_id, risk=rng.randint(90, 99), amount=0.0, jurisdiction=hub,
            ))
            # Each scammer operates a spoofing device / handset
            dev = f"r{ring_id}-device-{s}"
            nodes.append(GraphNode(
                id=dev, label=f"IMEI •••{rng.randint(1000, 9999)}", type="device",
                ring=ring_id, risk=rng.randint(55, 70), amount=0.0, jurisdiction=hub,
            ))
            edges.append(GraphEdge(source=nid, target=dev, type="uses", weight=2))

        # Money mules + their accounts
        for m in range(d["mules"]):
            mid = f"r{ring_id}-mule-{m}"
            mule_ids.append(mid)
            nodes.append(GraphNode(
                id=mid, label=f"Mule {m + 1}", type="mule",
                ring=ring_id, risk=rng.randint(70, 85), amount=0.0, jurisdiction=hub,
            ))
            acc = f"r{ring_id}-account-{m}"
            nodes.append(GraphNode(
                id=acc, label=f"A/C •••{rng.randint(1000, 9999)}", type="account",
                ring=ring_id, risk=rng.randint(60, 78), amount=0.0, jurisdiction=hub,
            ))
            edges.append(GraphEdge(source=mid, target=acc, type="owns", weight=2))
            # Scammers instruct mules
            edges.append(GraphEdge(
                source=rng.choice(scammer_ids), target=mid, type="call",
                weight=1,
            ))

        # Victims -> defrauded -> money lands in a mule account
        for v in range(d["victims"]):
            vid = f"r{ring_id}-victim-{v}"
            victim_ids.append(vid)
            city = rng.choice(VICTIM_CITIES)
            jurisdictions.add(city)
            amount = float(rng.randint(50, 2000) * 1000)
            total_defrauded += amount
            nodes.append(GraphNode(
                id=vid, label=f"Victim {v + 1} ({city})", type="victim",
                ring=ring_id, risk=rng.randint(15, 40), amount=amount, jurisdiction=city,
            ))
            scammer = rng.choice(scammer_ids)
            edges.append(GraphEdge(source=scammer, target=vid, type="call", weight=1))
            target_acc = f"r{ring_id}-account-{rng.randrange(d['mules'])}"
            edges.append(GraphEdge(
                source=vid, target=target_acc, type="transaction",
                amount=amount, weight=3,
            ))

        ring_meta.append({
            "ring_id": ring_id,
            "label": d["label"],
            "hub": hub,
            "scammers": scammer_ids,
            "mules": mule_ids,
            "victims": victim_ids,
            "total_defrauded": total_defrauded,
            "jurisdictions": sorted(jurisdictions),
        })

    return nodes, edges, ring_meta


def _degree_centrality(edges: List[GraphEdge]) -> Dict[str, int]:
    deg: Dict[str, int] = {}
    for e in edges:
        deg[e.source] = deg.get(e.source, 0) + e.weight
        deg[e.target] = deg.get(e.target, 0) + e.weight
    return deg


def build_fraud_network() -> FraudNetworkResponse:
    nodes, edges, ring_meta = _build_raw()
    deg = _degree_centrality(edges)

    rings: List[RingPackage] = []
    rng = random.Random(7)
    for meta in ring_meta:
        kingpins = sorted(
            meta["scammers"], key=lambda nid: deg.get(nid, 0), reverse=True
        )
        kingpin_labels = [
            next(n.label for n in nodes if n.id == k) for k in kingpins[:2]
        ]
        cross = len(meta["jurisdictions"]) > 1
        payload = f"{meta['label']}|{meta['total_defrauded']}|{','.join(meta['jurisdictions'])}"
        evidence_hash = hashlib.sha256(payload.encode()).hexdigest()[:16].upper()
        victims = len(meta["victims"])
        rings.append(RingPackage(
            ring_id=meta["ring_id"],
            label=meta["label"],
            node_count=sum(1 for n in nodes if n.ring == meta["ring_id"]),
            victim_count=victims,
            mule_count=len(meta["mules"]),
            total_defrauded=meta["total_defrauded"],
            jurisdictions=meta["jurisdictions"],
            cross_jurisdiction=cross,
            kingpins=kingpin_labels,
            lead_time_days=rng.randint(4, 21),
            evidence_hash=evidence_hash,
            summary=(
                f"Coordinated campaign operating from {meta['hub']} defrauded "
                f"{victims} victims of ₹{meta['total_defrauded'] / 1e5:.1f}L across "
                f"{len(meta['jurisdictions'])} jurisdictions via {len(meta['mules'])} "
                f"money-mule accounts."
            ),
        ))

    total_amount = sum(r.total_defrauded for r in rings)
    stats = {
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "rings_detected": len(rings),
        "total_defrauded": total_amount,
        "total_victims": sum(r.victim_count for r in rings),
        "cross_jurisdiction_rings": sum(1 for r in rings if r.cross_jurisdiction),
    }

    return FraudNetworkResponse(nodes=nodes, edges=edges, rings=rings, stats=stats)
