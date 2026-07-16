"""Counterfeit currency screening for Indian banknotes (prototype heuristic CV).

Real forensic verification needs UV/IR hardware and high-resolution optics. For a
field/demo prototype this module extracts genuine signals from an ordinary photo:

  * Dominant colour  -> denomination estimate (the Mahatma Gandhi (New) series uses
    a distinct base colour per denomination).
  * Aspect ratio     -> banknote geometry sanity check.
  * Edge/detail energy -> a proxy for microprint sharpness (blurry fakes score low).
  * Brightness        -> exposure quality.

Security features that cannot be verified from a plain RGB photo (security thread,
serial-number font, UV fibres) are marked as SIMULATED and deterministically derived
from the image hash so results are stable per image and never randomly flip.
"""
from __future__ import annotations

import hashlib
import io
from typing import List, Tuple

from PIL import Image, ImageFilter

from .schemas import FeatureCheck, ImageQuality, ScanCurrencyResponse


# denomination -> (hue_center_degrees, saturation_hint, label)
# hue on 0-360 scale; ₹500 is greyscale so handled separately via low saturation.
DENOMINATION_COLORS = [
    (18, "high", "₹10"),    # chocolate brown
    (60, "high", "₹20"),    # greenish yellow
    (205, "high", "₹50"),   # fluorescent blue
    (270, "med", "₹100"),   # lavender / violet
    (45, "high", "₹200"),   # bright yellow-orange
    (320, "high", "₹2000"), # magenta
]


def _dominant_hsv(img: Image.Image) -> Tuple[float, float, float]:
    small = img.convert("RGB").resize((48, 48))
    hsv = small.convert("HSV")
    pixels = list(hsv.getdata())
    n = len(pixels)
    h = sum(p[0] for p in pixels) / n * (360 / 255)
    s = sum(p[1] for p in pixels) / n / 255
    v = sum(p[2] for p in pixels) / n / 255
    return h, s, v


def _hue_distance(a: float, b: float) -> float:
    d = abs(a - b) % 360
    return min(d, 360 - d)


def _estimate_denomination(h: float, s: float, v: float) -> Tuple[str, float]:
    # Low saturation + mid brightness => stone-grey ₹500.
    if s < 0.18:
        return "₹500", round(0.6 + (0.18 - s), 2)
    best_label, best_dist = "₹500", 999.0
    for hue, _hint, label in DENOMINATION_COLORS:
        dist = _hue_distance(h, hue)
        if dist < best_dist:
            best_dist, best_label = dist, label
    confidence = round(max(0.35, 1 - best_dist / 90), 2)
    return best_label, min(confidence, 0.95)


def _sharpness(img: Image.Image) -> float:
    gray = img.convert("L").resize((256, 256))
    edges = gray.filter(ImageFilter.FIND_EDGES)
    data = list(edges.getdata())
    mean = sum(data) / len(data)
    variance = sum((p - mean) ** 2 for p in data) / len(data)
    return round(variance, 2)


def _brightness(img: Image.Image) -> float:
    gray = img.convert("L").resize((64, 64))
    data = list(gray.getdata())
    return round(sum(data) / len(data) / 255, 3)


def _simulated_check(seed: bytes, feature: str, offset: int) -> FeatureCheck:
    val = int(hashlib.sha256(seed + feature.encode()).hexdigest()[offset:offset + 4], 16) % 100
    if val >= 70:
        status, score, detail = "pass", 80 + val % 20, "Consistent with genuine reference pattern."
    elif val >= 40:
        status, score, detail = "warn", 45 + val % 25, "Partial match — recommend secondary inspection."
    else:
        status, score, detail = "fail", val % 40, "Deviation from genuine reference detected."
    return FeatureCheck(feature=feature, status=status, score=score,
                        detail=f"[simulated] {detail}")


def analyze_currency(image_bytes: bytes) -> ScanCurrencyResponse:
    img = Image.open(io.BytesIO(image_bytes))
    img.load()
    w, h = img.size
    aspect = round(max(w, h) / max(1, min(w, h)), 3)
    sharp = _sharpness(img)
    bright = _brightness(img)
    hue, sat, val = _dominant_hsv(img)
    denom, denom_conf = _estimate_denomination(hue, sat, val)

    checks: List[FeatureCheck] = []

    # 1) Aspect ratio — Indian notes sit roughly between 2.0 and 2.6.
    if 2.0 <= aspect <= 2.6:
        checks.append(FeatureCheck(feature="Aspect Ratio / Geometry", status="pass", score=90,
                                   detail=f"Ratio {aspect} matches banknote geometry."))
    elif 1.8 <= aspect < 2.0 or 2.6 < aspect <= 2.9:
        checks.append(FeatureCheck(feature="Aspect Ratio / Geometry", status="warn", score=55,
                                   detail=f"Ratio {aspect} is borderline; ensure the full note is framed."))
    else:
        checks.append(FeatureCheck(feature="Aspect Ratio / Geometry", status="fail", score=25,
                                   detail=f"Ratio {aspect} is inconsistent with a banknote."))

    # 2) Dominant colour vs denomination reference.
    if denom_conf >= 0.7:
        checks.append(FeatureCheck(feature="Base Colour Match", status="pass", score=int(denom_conf * 100),
                                   detail=f"Dominant colour matches {denom} reference series."))
    elif denom_conf >= 0.5:
        checks.append(FeatureCheck(feature="Base Colour Match", status="warn", score=int(denom_conf * 100),
                                   detail=f"Colour loosely matches {denom}; lighting may be affecting the reading."))
    else:
        checks.append(FeatureCheck(feature="Base Colour Match", status="fail", score=int(denom_conf * 100),
                                   detail="Colour does not clearly match any denomination reference."))

    # 3) Microprint sharpness proxy.
    if sharp >= 300:
        checks.append(FeatureCheck(feature="Microprint Sharpness", status="pass", score=88,
                                   detail="High edge detail — microprint likely intact."))
    elif sharp >= 120:
        checks.append(FeatureCheck(feature="Microprint Sharpness", status="warn", score=55,
                                   detail="Moderate detail — capture a sharper, closer image for reliable microprint reading."))
    else:
        checks.append(FeatureCheck(feature="Microprint Sharpness", status="fail", score=30,
                                   detail="Low edge detail — image is blurry or microprint is missing."))

    # 4-6) Features that need hardware — deterministic simulated checks.
    seed = hashlib.sha256(image_bytes).digest()
    checks.append(_simulated_check(seed, "Security Thread", 0))
    checks.append(_simulated_check(seed, "Serial Number Pattern", 8))
    checks.append(_simulated_check(seed, "UV Feature Response", 16))

    # Weighted authenticity score — real signals weighted higher than simulated ones.
    weights = {
        "Aspect Ratio / Geometry": 1.5,
        "Base Colour Match": 2.0,
        "Microprint Sharpness": 2.0,
        "Security Thread": 1.0,
        "Serial Number Pattern": 1.0,
        "UV Feature Response": 1.0,
    }
    total_w = sum(weights.values())
    authenticity = round(sum(c.score * weights[c.feature] for c in checks) / total_w)

    if authenticity >= 75 and not any(c.status == "fail" for c in checks):
        verdict = "LIKELY_GENUINE"
    elif authenticity < 50 or sum(c.status == "fail" for c in checks) >= 2:
        verdict = "SUSPECT"
    else:
        verdict = "INCONCLUSIVE"

    return ScanCurrencyResponse(
        denomination=denom,
        denomination_confidence=denom_conf,
        verdict=verdict,
        authenticity_score=authenticity,
        image_quality=ImageQuality(width=w, height=h, aspect_ratio=aspect,
                                   sharpness=sharp, brightness=bright),
        feature_checks=checks,
        notes=("Prototype heuristic screening. Colour, geometry and sharpness are measured "
               "from the image; security-thread, serial and UV checks are simulated and "
               "require hardware verification before any legal action."),
    )
