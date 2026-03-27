"""
ocr.py
------
ID document OCR module.
Tries PaddleOCR first (better accuracy on documents), falls back to pytesseract.

Functions
---------
extract_from_id(image_path)           -> dict
validate_document(text_data)          -> bool
preprocess_image(image_path)          -> np.ndarray
"""

import logging
import os
import re
from datetime import datetime

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ── OCR backend detection ─────────────────────────────────────────────────────
try:
    from paddleocr import PaddleOCR as _PaddleOCR
    _PADDLE_AVAILABLE = True
    logger.info("PaddleOCR backend available.")
except ImportError:
    _PADDLE_AVAILABLE = False

try:
    import pytesseract
    from PIL import Image as _PILImage
    _TESS_AVAILABLE = True
    # Windows: auto-detect common Tesseract install paths
    for _p in [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]:
        if os.path.isfile(_p):
            pytesseract.pytesseract.tesseract_cmd = _p
            break
    logger.info("pytesseract backend available.")
except ImportError:
    _TESS_AVAILABLE = False

if not _PADDLE_AVAILABLE and not _TESS_AVAILABLE:
    logger.warning("No OCR backend found. Install paddleocr or pytesseract.")

try:
    import cv2
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False

# ── Paddle singleton ──────────────────────────────────────────────────────────
_paddle = None

def _get_paddle():
    global _paddle
    if _paddle is None:
        _paddle = _PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    return _paddle


# ── Image helpers ─────────────────────────────────────────────────────────────

def preprocess_image(image_path) -> np.ndarray:
    """
    Load and pre-process an ID card image for better OCR accuracy.
    Steps: load → grayscale → CLAHE contrast enhance → Otsu threshold → denoise.

    Parameters
    ----------
    image_path : str | Path | np.ndarray

    Returns
    -------
    np.ndarray  Processed single-channel image.
    """
    if not _CV2_AVAILABLE:
        raise RuntimeError("OpenCV required: pip install opencv-python")

    if isinstance(image_path, np.ndarray):
        img = image_path.copy()
    else:
        img = cv2.imread(str(image_path))
        if img is None:
            raise FileNotFoundError(f"Cannot load image: {image_path}")

    # Handle edge case: empty or invalid image
    if img.size == 0:
        raise ValueError("Empty or invalid image provided")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Check if image is too dark or too light and adjust
    mean_brightness = np.mean(gray)
    if mean_brightness < 50:
        # Too dark, brighten it
        gray = cv2.convertScaleAbs(gray, alpha=1.5, beta=30)
    elif mean_brightness > 200:
        # Too bright, darken it
        gray = cv2.convertScaleAbs(gray, alpha=0.8, beta=-20)
    
    # Adaptive histogram equalisation
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    eq = clahe.apply(gray)
    
    # Otsu binarisation with fallback
    try:
        _, thresh = cv2.threshold(eq, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    except cv2.error:
        # Fallback to simple thresholding if Otsu fails
        _, thresh = cv2.threshold(eq, 127, 255, cv2.THRESH_BINARY)
    
    # Denoising with error handling
    try:
        denoised = cv2.fastNlMeansDenoising(thresh, h=10)
    except cv2.error:
        # Fallback to original threshold if denoising fails
        denoised = thresh
    
    return denoised


def _load_pil(image_path):
    """Return a PIL Image (RGB) from path or numpy array."""
    from PIL import Image
    if isinstance(image_path, np.ndarray):
        if _CV2_AVAILABLE:
            import cv2
            rgb = cv2.cvtColor(image_path, cv2.COLOR_BGR2RGB)
            return Image.fromarray(rgb)
        return Image.fromarray(image_path)
    return Image.open(str(image_path)).convert("RGB")


# ── Text extraction ───────────────────────────────────────────────────────────

def _ocr_paddle(image_path) -> tuple:
    """Returns (raw_text, avg_confidence)."""
    inp = image_path if isinstance(image_path, np.ndarray) else str(image_path)
    res = _get_paddle().ocr(inp, cls=True)
    lines, confs = [], []
    if res and res[0]:
        for line in res[0]:
            txt, conf = line[1]
            lines.append(txt)
            confs.append(float(conf))
    raw  = "\n".join(lines)
    conf = (sum(confs) / len(confs)) if confs else 0.0
    return raw, round(conf, 4)


def _ocr_tesseract(image_path) -> tuple:
    """Returns (raw_text, avg_confidence)."""
    pil  = _load_pil(image_path)
    data = pytesseract.image_to_data(pil, output_type=pytesseract.Output.DICT)
    text = pytesseract.image_to_string(pil)
    confs = [int(c) for c in data["conf"] if int(c) >= 0]
    conf  = (sum(confs) / len(confs) / 100.0) if confs else 0.0
    return text, round(conf, 4)


# ── Field parsers ─────────────────────────────────────────────────────────────

_MONTH_MAP = {
    "JAN":"01","FEB":"02","MAR":"03","APR":"04","MAY":"05","JUN":"06",
    "JUL":"07","AUG":"08","SEP":"09","OCT":"10","NOV":"11","DEC":"12",
}

def _parse_date(snippet: str) -> str | None:
    """Normalise a date snippet to YYYY-MM-DD."""
    snippet = snippet.strip()

    # YYYY-MM-DD
    m = re.fullmatch(r"(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})", snippet)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

    # DD/MM/YYYY or MM/DD/YYYY
    m = re.fullmatch(r"(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})", snippet)
    if m:
        d, mo, y = m.group(1).zfill(2), m.group(2).zfill(2), m.group(3)
        return f"{y}-{mo}-{d}"

    # DD MON YYYY
    m = re.fullmatch(r"(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})", snippet)
    if m and m.group(2).upper() in _MONTH_MAP:
        return f"{m.group(3)}-{_MONTH_MAP[m.group(2).upper()]}-{m.group(1).zfill(2)}"

    # YYMMDD (MRZ)
    m = re.fullmatch(r"(\d{2})(\d{2})(\d{2})", snippet)
    if m:
        yy = int(m.group(1))
        year = 1900 + yy if yy >= 30 else 2000 + yy
        return f"{year}-{m.group(2)}-{m.group(3)}"

    return None


def _find_dates(text: str) -> list:
    """Find all date-like strings in text and return as YYYY-MM-DD list."""
    patterns = [
        r"\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}",
        r"\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}",
        r"\d{1,2}\s+[A-Za-z]{3}\s+\d{4}",
        r"\b\d{6}\b",
    ]
    found = []
    for pat in patterns:
        for m in re.finditer(pat, text):
            parsed = _parse_date(m.group(0))
            if parsed and parsed not in found:
                found.append(parsed)
    return found


def _detect_doc_type(text: str) -> str:
    up = text.upper()
    if re.search(r"\bPASSPORT\b", up):
        return "passport"
    if re.search(r"\bDRIV(ER|ING)\b|\bDL\b|\bDLN\b", up):
        return "drivers_license"
    if re.search(r"\bNATIONAL\s+ID\b|\bID\s+CARD\b|\bNIN\b|\bNID\b|\bCITIZEN\b", up):
        return "national_id"
    if re.search(r"[A-Z0-9<]{30,}", text):   # MRZ line
        return "passport"
    return "unknown"


def _extract_name(text: str) -> str | None:
    # MRZ: P<COUNTRY SURNAME<<GIVEN<NAMES
    m = re.search(r"[A-Z]{1,3}([A-Z<]{30,})", text)
    if m:
        parts   = m.group(1).split("<<", 1)
        surname = parts[0].replace("<", " ").strip()
        given   = parts[1].replace("<", " ").strip() if len(parts) > 1 else ""
        name    = f"{given} {surname}".strip()
        if name:
            return name

    # Labeled field
    m = re.search(r"(?:name|full[\s_]name)\s*[:\-]\s*([A-Za-z ,\-']+)", text, re.IGNORECASE)
    if m:
        return m.group(1).strip()[:70]

    return None


def _extract_doc_number(text: str) -> str | None:
    # Passport / generic: 1-2 uppercase letters + 6-9 digits
    m = re.search(r"\b([A-Z]{0,2}\d{6,9})\b", text)
    return m.group(1) if m else None


# ── Public API ────────────────────────────────────────────────────────────────

def extract_from_id(image_path) -> dict:
    """
    Extract structured data from an identity document image.

    Parameters
    ----------
    image_path : str | Path | np.ndarray

    Returns
    -------
    dict
        - ``document_type``   : str
        - ``full_name``       : str | None
        - ``document_number`` : str | None
        - ``date_of_birth``   : str | None  (YYYY-MM-DD)
        - ``expiry_date``     : str | None  (YYYY-MM-DD)
        - ``confidence``      : float
        - ``raw_text``        : str
        - ``backend``         : str
        - ``error``           : str | None
    """
    empty = {
        "document_type": "unknown", "full_name": None,
        "document_number": None, "date_of_birth": None,
        "expiry_date": None, "confidence": 0.0,
        "raw_text": "", "backend": "none", "error": None,
    }

    raw_text, confidence, backend = "", 0.0, "none"

    try:
        if _PADDLE_AVAILABLE:
            raw_text, confidence = _ocr_paddle(image_path)
            backend = "paddleocr"
        elif _TESS_AVAILABLE:
            raw_text, confidence = _ocr_tesseract(image_path)
            backend = "tesseract"
        else:
            return {**empty, "error": "No OCR backend. Install paddleocr or pytesseract."}
    except Exception as exc:
        return {**empty, "error": f"OCR failed: {exc}"}

    dates = _find_dates(raw_text)

    # Keyword-guided DOB / expiry detection
    dob_m = re.search(
        r"(?:birth|dob|born)[^\n]{0,30}?(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}|\d{6}|\d{4}[\/\-]\d{2}[\/\-]\d{2})",
        raw_text, re.IGNORECASE
    )
    exp_m = re.search(
        r"(?:expir|valid until|exp|validity)[^\n]{0,30}?(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}|\d{6}|\d{4}[\/\-]\d{2}[\/\-]\d{2})",
        raw_text, re.IGNORECASE
    )

    dob = _parse_date(dob_m.group(1)) if dob_m else (dates[0] if dates else None)
    exp = _parse_date(exp_m.group(1)) if exp_m else (dates[1] if len(dates) > 1 else None)

    logger.info("OCR complete – backend=%s confidence=%.2f type=%s",
                backend, confidence, _detect_doc_type(raw_text))

    return {
        "document_type":   _detect_doc_type(raw_text),
        "full_name":       _extract_name(raw_text),
        "document_number": _extract_doc_number(raw_text),
        "date_of_birth":   dob,
        "expiry_date":     exp,
        "confidence":      confidence,
        "raw_text":        raw_text.strip(),
        "backend":         backend,
        "error":           None,
    }


def validate_document(text_data: dict) -> bool:
    """
    Sanity-check extracted document fields.

    Parameters
    ----------
    text_data : dict  Output from extract_from_id()

    Returns
    -------
    bool  True if document passes basic checks.
    """
    if not isinstance(text_data, dict):
        return False

    issues = []

    if text_data.get("document_type") == "unknown":
        issues.append("unrecognised document type")

    if (text_data.get("confidence") or 0.0) < 0.40:
        issues.append(f"low OCR confidence ({text_data.get('confidence')})")

    if not text_data.get("document_number"):
        issues.append("document number missing")

    expiry = text_data.get("expiry_date")
    if expiry:
        try:
            if datetime.strptime(expiry, "%Y-%m-%d") < datetime.now():
                issues.append(f"expired on {expiry}")
        except ValueError:
            issues.append(f"invalid expiry date: {expiry}")

    if issues:
        logger.info("Document validation FAILED: %s", "; ".join(issues))
        return False

    return True
