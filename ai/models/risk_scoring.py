"""
risk_scoring.py
---------------
AI risk-scoring engine.
Combines face-match, liveness, OCR, device, location, time, and transaction
signals into a single 0-100 risk score with an actionable recommendation.

Functions
---------
calculate_risk(params)                     -> dict
get_risk_factors(params)                   -> list[str]
assess_device_risk(device_info, history)   -> int
assess_location_risk(location, history)    -> int
assess_amount_risk(amount, avg_amount)     -> int
"""

import logging
import math
from datetime import datetime, timezone
from typing import Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Thresholds ────────────────────────────────────────────────────────────────
HIGH_RISK   = 65   # score >= HIGH_RISK   -> BLOCK
MEDIUM_RISK = 35   # score >= MEDIUM_RISK -> REQUIRE_2FA

# ── Signal weights (must sum to 1.0) ─────────────────────────────────────────
WEIGHTS = {
    "face_match":  0.30,
    "liveness":    0.25,
    "device_loc":  0.25,
    "transaction": 0.20,
}


# ── Utility helpers ───────────────────────────────────────────────────────────

def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _sigmoid(x: float, center: float = 0.0, scale: float = 1.0) -> float:
    return 1.0 / (1.0 + math.exp(-scale * (x - center)))


def _get(d: Any, *keys, default=None) -> Any:
    """Safe nested dict access."""
    for k in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(k, default)
    return d


# ── Individual risk assessors ─────────────────────────────────────────────────

def assess_device_risk(device_info: dict, user_history: dict) -> int:
    """
    Rate device risk 0–100.
    Checks unknown IP and suspicious user-agent strings.
    """
    if not device_info:
        logger.debug("assess_device_risk: no device_info – returning 30.")
        return 30

    known_devices = _get(user_history, "known_devices") or []
    known_ips     = [
        d.get("ip") for d in known_devices if isinstance(d, dict) and d.get("ip")
    ]

    risk = 0
    ip = device_info.get("ip", "")
    ua = device_info.get("user_agent", "").lower()

    if ip and ip not in known_ips:
        risk += 50
        logger.debug("Unknown IP: %s", ip)

    suspicious = any(kw in ua for kw in ("python", "curl", "wget", "selenium", "headless", "scrapy"))
    if suspicious:
        risk += 40
        logger.debug("Suspicious UA: %s", ua)

    score = min(100, risk)
    logger.debug("assess_device_risk -> %d", score)
    return score


def assess_location_risk(location: dict | None, user_history: dict) -> int:
    """
    Rate location risk 0–100 using Haversine distance from known locations.
    """
    if not location:
        logger.debug("assess_location_risk: no location – returning 20.")
        return 20

    lat = float(location.get("lat", 0))
    lon = float(location.get("lon", 0))
    known_locs = _get(user_history, "known_locations") or []

    if not known_locs:
        logger.debug("assess_location_risk: no history – returning 25.")
        return 25

    def _haversine(la1, lo1, la2, lo2) -> float:
        R = 6371.0
        dlat = math.radians(la2 - la1)
        dlon = math.radians(lo2 - lo1)
        a = (math.sin(dlat / 2) ** 2
             + math.cos(math.radians(la1))
             * math.cos(math.radians(la2))
             * math.sin(dlon / 2) ** 2)
        return R * 2 * math.asin(math.sqrt(a))

    min_km = min(_haversine(lat, lon, loc[0], loc[1]) for loc in known_locs)
    # sigmoid centred at 500 km
    risk = int(_sigmoid(min_km, center=500, scale=0.005) * 100)
    logger.debug("assess_location_risk: min_dist=%.0f km -> risk=%d", min_km, risk)
    return min(100, risk)


def assess_amount_risk(amount: float, avg_amount: float) -> int:
    """
    Rate transaction-amount risk 0–100 based on deviation from user average.
    """
    amount     = float(amount or 0)
    avg_amount = float(avg_amount or 0)

    if avg_amount <= 0 or amount <= 0:
        logger.debug("assess_amount_risk: insufficient history – returning 30.")
        return 30

    ratio = amount / avg_amount
    # sigmoid centred at 3× average
    risk  = int(_sigmoid(ratio, center=3.0, scale=0.8) * 100)
    logger.debug("assess_amount_risk: ratio=%.2f -> risk=%d", ratio, risk)
    return min(100, risk)


# ── Risk factor discovery ─────────────────────────────────────────────────────

def get_risk_factors(params: dict) -> list:
    """
    Identify specific risk labels present in *params*.

    Returns
    -------
    list[str]  Subset of:
        "low_face_match", "low_liveness", "new_device",
        "unusual_location", "unusual_time", "amount_spike"
    """
    factors = []
    history = params.get("user_history") or {}

    face_score = float(params.get("face_match_score") or 0)
    if face_score < 0.60:
        factors.append("low_face_match")

    live_score = float(params.get("liveness_score") or 0)
    if live_score < 0.60:
        factors.append("low_liveness")

    device_risk = assess_device_risk(params.get("device_info") or {}, history)
    if device_risk >= 50:
        factors.append("new_device")

    loc_risk = assess_location_risk(params.get("location"), history)
    if loc_risk >= 50:
        factors.append("unusual_location")

    hour = int(params.get("time_of_day") or datetime.now(timezone.utc).hour)
    if 1 <= hour % 24 <= 5:
        factors.append("unusual_time")

    amount    = float(params.get("transaction_amount") or 0)
    avg       = float(_get(history, "avg_amount") or 0)
    amt_risk  = assess_amount_risk(amount, avg)
    if amt_risk >= 60:
        factors.append("amount_spike")

    return factors


# ── Main public function ──────────────────────────────────────────────────────

def calculate_risk(params: dict) -> dict:
    """
    Compute a unified risk score from multiple verification signals.

    Parameters
    ----------
    params : dict
        face_match_score    float [0,1]
        liveness_score      float [0,1]
        ocr_confidence      float [0,1]
        transaction_amount  float
        device_info         dict {ip, user_agent, device_id}
        location            dict {lat, lon, country} | None
        time_of_day         int  0-23
        user_history        dict {avg_amount, known_devices, known_locations}

    Returns
    -------
    dict
        score          int   0-100
        level          "LOW" | "MEDIUM" | "HIGH"
        factors        list[str]
        recommendation "ALLOW" | "REQUIRE_2FA" | "BLOCK"
        breakdown      dict  per-signal contributions
    """
    history = params.get("user_history") or {}

    # ── Signal risk values (0-100 each) ──────────────────────────────────────

    # Face match: invert similarity
    face_raw  = _clamp(float(params.get("face_match_score") or 0))
    face_risk = int((1.0 - face_raw) * 100)

    # Liveness: invert confidence
    live_raw  = _clamp(float(params.get("liveness_score") or 0))
    live_risk = int((1.0 - live_raw) * 100)

    # Device + location (combined for the 25% bucket)
    dev_risk  = assess_device_risk(params.get("device_info") or {}, history)
    loc_risk  = assess_location_risk(params.get("location"), history)
    devloc_risk = int(0.5 * dev_risk + 0.5 * loc_risk)

    # Transaction
    amount    = float(params.get("transaction_amount") or 0)
    avg       = float(_get(history, "avg_amount") or 0)
    txn_risk  = assess_amount_risk(amount, avg)

    # Optional: OCR confidence influences transaction bucket slightly
    ocr_conf  = _clamp(float(params.get("ocr_confidence") or 0.5))
    txn_risk  = int(_clamp(txn_risk / 100 + 0.1 * (1.0 - ocr_conf)) * 100)

    # Time-of-day modifier (+5 if unusual hour)
    hour = int(params.get("time_of_day") or datetime.now(timezone.utc).hour) % 24
    time_mod = 5 if 1 <= hour <= 5 else 0

    # ── Weighted aggregate ────────────────────────────────────────────────────
    raw_score = (
        WEIGHTS["face_match"]  * face_risk
        + WEIGHTS["liveness"]  * live_risk
        + WEIGHTS["device_loc"] * devloc_risk
        + WEIGHTS["transaction"] * txn_risk
        + time_mod
    )
    score = int(_clamp(raw_score, 0, 100))

    if score >= HIGH_RISK:
        level, recommendation = "HIGH",   "BLOCK"
    elif score >= MEDIUM_RISK:
        level, recommendation = "MEDIUM", "REQUIRE_2FA"
    else:
        level, recommendation = "LOW",    "ALLOW"

    factors = get_risk_factors(params)

    logger.info("calculate_risk -> score=%d level=%s recommendation=%s factors=%s",
                score, level, recommendation, factors)

    return {
        "score":          score,
        "level":          level,
        "factors":        factors,
        "recommendation": recommendation,
        "breakdown": {
            "face_match":  {"weight": WEIGHTS["face_match"],   "risk": face_risk},
            "liveness":    {"weight": WEIGHTS["liveness"],     "risk": live_risk},
            "device_loc":  {"weight": WEIGHTS["device_loc"],   "risk": devloc_risk},
            "transaction": {"weight": WEIGHTS["transaction"],  "risk": txn_risk},
            "time_mod":    {"weight": 0.0,                     "risk": time_mod},
        },
    }
