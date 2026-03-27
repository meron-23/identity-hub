import cv2
import numpy as np
from typing import Dict, Any

def check_blur(image: np.ndarray, threshold: float = 100.0) -> Dict[str, Any]:
    """
    Check if the image is blurry using the Laplacian variance method.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    fm = cv2.Laplacian(gray, cv2.CV_64F).var()
    is_blurry = bool(fm < threshold)
    return {"score": float(fm), "is_blurry": is_blurry}

def check_glare(image: np.ndarray, threshold: float = 0.05) -> Dict[str, Any]:
    """
    Check for glare/reflections by looking for large saturated areas.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
    glare_ratio = np.sum(thresh == 255) / (image.shape[0] * image.shape[1])
    is_glary = bool(glare_ratio > threshold)
    return {"glare_ratio": float(glare_ratio), "is_glary": is_glary}

def verify_document(image: np.ndarray, doc_type: str = "unknown") -> Dict[str, Any]:
    """
    Perform a suite of authenticity and quality checks.
    """
    # 1. Quality Checks
    blur_res = check_blur(image)
    glare_res = check_glare(image)
    
    # 2. Logic for specific document types
    validity = True
    issues = []
    
    if blur_res["is_blurry"]:
        validity = False
        issues.append("Image is too blurry")
    
    if glare_res["is_glary"]:
        validity = False
        issues.append("Glare detected on document")

    # 3. Overall Authenticity Score (mock logic)
    # A real implementation would check for moiré patterns, font consistency, etc.
    base_score = 100.0
    if not validity:
        base_score -= 20.0 * len(issues)
    
    return {
        "validity": validity,
        "issues": issues,
        "score": max(0, base_score),
        "quality_metrics": {
            "blur": blur_res,
            "glare": glare_res
        }
    }
