"""Pydantic request/response models for the CyberGuard API."""
from typing import List, Optional
from pydantic import BaseModel, Field


# ---------- Scam detection ----------

class AnalyzeCallRequest(BaseModel):
    text: str = Field(..., description="Call transcript, SMS or message content to analyse")
    channel: str = Field(default="unknown", description="call | sms | whatsapp | email | unknown")


class ScamIndicator(BaseModel):
    category: str
    severity: str  # low | medium | high
    weight: int
    matches: List[str]
    explanation: str


class MhaAlert(BaseModel):
    alert_id: str
    priority: str
    scam_category: str
    channel: str
    recommended_routing: str
    generated_at: str
    summary: str


class AnalyzeCallResponse(BaseModel):
    risk_score: int
    risk_level: str  # SAFE | LOW | SUSPICIOUS | HIGH | CRITICAL
    scam_category: str
    confidence: float
    summary: str
    indicators: List[ScamIndicator]
    recommended_actions: List[str]
    mha_alert: Optional[MhaAlert]
    analysis_engine: str


# ---------- Currency detection ----------

class FeatureCheck(BaseModel):
    feature: str
    status: str  # pass | warn | fail
    score: int
    detail: str


class ImageQuality(BaseModel):
    width: int
    height: int
    aspect_ratio: float
    sharpness: float
    brightness: float


class ScanCurrencyResponse(BaseModel):
    denomination: str
    denomination_confidence: float
    verdict: str  # LIKELY_GENUINE | SUSPECT | INCONCLUSIVE
    authenticity_score: int
    image_quality: ImageQuality
    feature_checks: List[FeatureCheck]
    notes: str


# ---------- Fraud network graph ----------

class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # scammer | mule | victim | account | device | phone
    ring: int
    risk: int
    amount: float
    jurisdiction: str


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str  # call | transaction | owns | uses
    amount: Optional[float] = None
    weight: int


class RingPackage(BaseModel):
    ring_id: int
    label: str
    node_count: int
    victim_count: int
    mule_count: int
    total_defrauded: float
    jurisdictions: List[str]
    cross_jurisdiction: bool
    kingpins: List[str]
    lead_time_days: int
    evidence_hash: str
    summary: str


class FraudNetworkResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    rings: List[RingPackage]
    stats: dict


# ---------- Geospatial intelligence ----------

class GeoIncident(BaseModel):
    id: str
    city: str
    state: str
    lat: float
    lng: float
    type: str  # digital_arrest | counterfeit | phishing | mule_account
    severity: str  # low | medium | high
    count: int


class GeoHotspot(BaseModel):
    city: str
    state: str
    lat: float
    lng: float
    total_incidents: int
    dominant_type: str
    risk_score: int
    patrol_priority: int


class GeoIntelResponse(BaseModel):
    incidents: List[GeoIncident]
    hotspots: List[GeoHotspot]
    stats: dict

