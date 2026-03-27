from typing import Dict, Any, List, cast

def calculate_risk_score(
    ocr_results: Dict[str, Any],
    doc_verification_results: Dict[str, Any],
    data_validation_results: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Weighted risk scoring engine to aggregate all eKYC signals.
    Returns a score from 0 (Safe) to 100 (High Risk).
    """
    
    # 1. OCR Confidence (0-100, where 100 is high confidence)
    # We invert this for risk: higher confidence = lower risk
    ocr_conf: float = ocr_results.get("mean_confidence", 0.0) * 100
    ocr_risk: float = 100 - ocr_conf
    
    # 2. Document Authenticity Score (0-100, where 100 is high validity)
    doc_validity_score: float = doc_verification_results.get("score", 0.0)
    doc_risk: float = 100 - doc_validity_score
    
    # 3. Data Validation Risk
    # We take the synthetic_risk (0-1.0) and scale it
    data_valid: bool = data_validation_results.get("is_valid", False)
    synthetic_risk: float = data_validation_results.get("synthetic_risk", 0.0) * 100
    
    # If data is fundamentally invalid (e.g. format or blacklist), we spike the risk
    data_risk: float = synthetic_risk
    if not data_valid:
        data_risk = max(data_risk, 80.0)

    # 4. Weighted Aggregation
    weights = {
        "ocr": 0.20,
        "document": 0.40,
        "data": 0.40
    }
    
    final_score: float = (
        (ocr_risk * weights["ocr"]) +
        (doc_risk * weights["document"]) +
        (data_risk * weights["data"])
    )

    # 4.5. Additional Penalties for Unrecognizable Documents
    # If we can't identify the document type, it's a major risk factor
    doc_type: str = ocr_results.get("document_type", "unknown")
    if doc_type == "unknown":
        final_score = max(final_score, 45.0) # Force at least MANUAL_REVIEW
        final_score += 10.0
    
    # If OCR confidence is exceptionally low, it might not be a document at all
    if ocr_conf < 5.0:
        final_score = max(final_score, 60.0)
        final_score += 15.0
    
    # 5. Recommendation Logic
    recommendation = "APPROVE"
    if final_score > 70:
        recommendation = "REJECT"
    elif final_score > 30:
        recommendation = "MANUAL_REVIEW"
        
    return {
        "final_risk_score": round(cast(float, final_score) * 100) / 100.0,
        "recommendation": recommendation,
        "component_risks": {
            "ocr": round(cast(float, ocr_risk) * 100) / 100.0,
            "document": round(cast(float, doc_risk) * 100) / 100.0,
            "data": round(cast(float, data_risk) * 100) / 100.0
        },
        "is_flagged": cast(float, final_score) > 30
    }
