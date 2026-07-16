"""Digital-arrest / cyber-fraud scam detection.

Hybrid engine: a deterministic weighted-heuristic classifier that always works
offline, with an optional LLM refinement pass when a GEMINI_API_KEY is present.
The heuristics are tuned for Indian "digital arrest" scam patterns reported by
the MHA / I4C (impersonation of CBI, ED, Customs, TRAI; parcel / money-laundering
narratives; isolation and coercion tactics; urgent fund transfer demands).
"""
from __future__ import annotations

import os
import re
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Tuple

from .schemas import (
    AnalyzeCallResponse,
    MhaAlert,
    ScamIndicator,
)


# Each category: (severity, weight, [regex patterns], explanation)
INDICATOR_RULES: Dict[str, Tuple[str, int, List[str], str]] = {
    "Authority Impersonation": (
        "high",
        22,
        [
            r"\bC\.?B\.?I\b", r"\bE\.?D\b", r"enforcement directorate", r"\bcustoms\b",
            r"\bTRAI\b", r"\bnarcotics\b", r"\bNCB\b", r"cyber\s*cell", r"\bpolice\b",
            r"\bCBI officer\b", r"income\s*tax department", r"\binterpol\b",
            r"reserve bank", r"\bRBI\b",
        ],
        "Caller claims to represent a law-enforcement or government authority.",
    ),
    "Digital Arrest / Isolation": (
        "high",
        26,
        [
            r"digital\s*arrest", r"do not (disconnect|hang up|cut the call)",
            r"stay on (the )?(call|line|video)", r"don'?t tell (anyone|your family)",
            r"under (surveillance|investigation)", r"video call", r"skype",
            r"keep (this )?confidential", r"house arrest", r"you cannot leave",
        ],
        "Coercion to remain on a video/voice call and stay isolated from family — a hallmark of digital-arrest scams.",
    ),
    "Threat / Coercion": (
        "high",
        20,
        [
            r"arrest warrant", r"\bwarrant\b", r"you will be arrested", r"\bjail\b",
            r"non[- ]?bailable", r"legal action", r"case (has been )?registered",
            r"\bFIR\b", r"court", r"summon", r"money laundering", r"drug traffick",
        ],
        "Threat of arrest, legal case or imprisonment used to create fear.",
    ),
    "Financial Pressure": (
        "high",
        22,
        [
            r"transfer (the )?(money|funds|amount)", r"\bRTGS\b", r"\bNEFT\b",
            r"secure account", r"verification (deposit|amount)", r"refundable",
            r"pay (the )?(fine|penalty|bail)", r"security deposit", r"clear your name",
            r"government account", r"\bUPI\b", r"share (your )?(OTP|otp)", r"\bOTP\b",
        ],
        "Demand to move money or share payment credentials/OTP to a 'safe' account.",
    ),
    "Urgency": (
        "medium",
        12,
        [
            r"immediately", r"right now", r"within (\d+ )?(minutes|hours)",
            r"last warning", r"final notice", r"act now", r"time is running out",
        ],
        "Artificial time pressure to prevent the victim from verifying.",
    ),
    "Identity Harvesting": (
        "medium",
        10,
        [
            r"aadhaar", r"\bPAN\b", r"bank (account )?(number|details)",
            r"date of birth", r"card number", r"\bCVV\b", r"parcel", r"courier",
            r"illegal (items|goods|package)",
        ],
        "Attempt to collect identity, banking or 'seized parcel' details.",
    ),
}

RISK_BANDS = [
    (85, "CRITICAL"),
    (65, "HIGH"),
    (40, "SUSPICIOUS"),
    (15, "LOW"),
    (0, "SAFE"),
]

CATEGORY_ACTIONS = {
    "digital_arrest": [
        "Do NOT transfer any money — no genuine agency demands funds over a call.",
        "Disconnect the call immediately; real officers never conduct 'digital arrests'.",
        "Report on the National Cyber Crime Helpline 1930 or cybercrime.gov.in.",
        "Inform a family member — isolation is the scammer's main weapon.",
    ],
    "phishing_financial": [
        "Never share OTP, CVV, UPI PIN or bank credentials with anyone.",
        "Independently verify by calling the institution's official number.",
        "Report to 1930 and your bank's fraud desk immediately.",
    ],
    "suspicious": [
        "Do not share personal or financial information.",
        "Verify the caller's identity through official channels before acting.",
    ],
    "likely_safe": [
        "No strong scam indicators detected. Stay alert and never share OTPs.",
    ],
}


def _band(score: int) -> str:
    for threshold, label in RISK_BANDS:
        if score >= threshold:
            return label
    return "SAFE"


def _classify_category(indicators: List[ScamIndicator], score: int) -> str:
    cats = {i.category for i in indicators}
    if score >= 40 and ("Digital Arrest / Isolation" in cats or "Authority Impersonation" in cats):
        return "digital_arrest"
    if score >= 40 and "Financial Pressure" in cats:
        return "phishing_financial"
    if score >= 15:
        return "suspicious"
    return "likely_safe"


def _run_heuristics(text: str) -> Tuple[int, List[ScamIndicator]]:
    indicators: List[ScamIndicator] = []
    raw_score = 0
    for category, (severity, weight, patterns, explanation) in INDICATOR_RULES.items():
        matches: List[str] = []
        for pat in patterns:
            for m in re.finditer(pat, text, flags=re.IGNORECASE):
                snippet = m.group(0).strip()
                if snippet and snippet.lower() not in (x.lower() for x in matches):
                    matches.append(snippet)
        if matches:
            # Diminishing returns: first hit full weight, extra hits add less.
            contribution = weight + min(len(matches) - 1, 3) * (weight // 6)
            raw_score += contribution
            indicators.append(
                ScamIndicator(
                    category=category,
                    severity=severity,
                    weight=contribution,
                    matches=matches[:6],
                    explanation=explanation,
                )
            )
    # Cross-signal amplifier: authority + threat + money together is the classic combo.
    cats = {i.category for i in indicators}
    if {"Authority Impersonation", "Threat / Coercion", "Financial Pressure"}.issubset(cats):
        raw_score += 15
    score = max(0, min(100, raw_score))
    return score, indicators


def _build_mha_alert(category: str, level: str, channel: str, summary: str) -> MhaAlert:
    return MhaAlert(
        alert_id=f"I4C-{uuid.uuid4().hex[:10].upper()}",
        priority="P1" if level == "CRITICAL" else "P2",
        scam_category=category,
        channel=channel,
        recommended_routing="I4C / MHA National Cyber Crime Reporting Portal (1930)",
        generated_at=datetime.now(timezone.utc).isoformat(),
        summary=summary,
    )


def _maybe_llm_refine(text: str, base: AnalyzeCallResponse) -> AnalyzeCallResponse:
    """Optional LLM pass. Silently returns the heuristic result if unavailable."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return base
    try:
        from pydantic import BaseModel as _BM
        from langchain_google_genai import ChatGoogleGenerativeAI

        class _LLMVerdict(_BM):
            adjusted_risk_score: int
            scam_category: str
            one_line_summary: str

        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key, temperature=0)
        prompt = (
            "You are a fraud analyst for Indian law enforcement. Paraphrase, do not copy. "
            "Given this message, return a risk score 0-100 and scam category "
            "(digital_arrest, phishing_financial, suspicious, likely_safe) and a one-line summary.\n\n"
            f"Heuristic score was {base.risk_score}. Message:\n{text[:2000]}"
        )
        verdict = llm.with_structured_output(_LLMVerdict).invoke(prompt)
        blended = round(0.6 * base.risk_score + 0.4 * max(0, min(100, verdict.adjusted_risk_score)))
        return base.model_copy(
            update={
                "risk_score": blended,
                "risk_level": _band(blended),
                "scam_category": verdict.scam_category or base.scam_category,
                "summary": verdict.one_line_summary or base.summary,
                "confidence": min(0.98, base.confidence + 0.08),
                "analysis_engine": "heuristic+llm",
            }
        )
    except Exception:
        return base


def analyze_scam(text: str, channel: str = "unknown") -> AnalyzeCallResponse:
    text = (text or "").strip()
    if not text:
        return AnalyzeCallResponse(
            risk_score=0, risk_level="SAFE", scam_category="likely_safe",
            confidence=0.0, summary="No content provided to analyse.",
            indicators=[], recommended_actions=CATEGORY_ACTIONS["likely_safe"],
            mha_alert=None, analysis_engine="heuristic",
        )

    score, indicators = _run_heuristics(text)
    level = _band(score)
    category = _classify_category(indicators, score)
    confidence = round(min(0.95, 0.45 + score / 200 + 0.05 * len(indicators)), 2)

    if category == "digital_arrest":
        summary = "High-confidence digital-arrest scam pattern: authority impersonation combined with coercion and fund-transfer demands."
    elif category == "phishing_financial":
        summary = "Financial phishing pattern detected: attempts to extract funds or payment credentials."
    elif category == "suspicious":
        summary = "Some scam-like signals present; treat the contact with caution and verify independently."
    else:
        summary = "No significant scam indicators detected in the provided content."

    actions = CATEGORY_ACTIONS.get(category, CATEGORY_ACTIONS["suspicious"])
    mha_alert = None
    if level in ("HIGH", "CRITICAL"):
        mha_alert = _build_mha_alert(category, level, channel, summary)

    result = AnalyzeCallResponse(
        risk_score=score,
        risk_level=level,
        scam_category=category,
        confidence=confidence,
        summary=summary,
        indicators=indicators,
        recommended_actions=actions,
        mha_alert=mha_alert,
        analysis_engine="heuristic",
    )
    return _maybe_llm_refine(text, result)
