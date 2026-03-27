# Identity Verification Module

A self-contained Python module for biometric identity verification. All code lives inside `ai/models/`.

## Modules

| File | Purpose |
|---|---|
| `face_detection.py` | Detect faces → bounding boxes + landmarks |
| `face_recognition.py` | Enroll / verify / compare faces (SQLite backed) |
| `liveness.py` | Passive & interactive anti-spoofing |
| `ocr.py` | Extract structured fields from ID documents |
| `risk_scoring.py` | Unified risk score (0-100) from all signals |
| `test.py` | End-to-end test suite |

---

## Prerequisites

### Python
**Python 3.8 or higher** is required.

### Tesseract OCR (for pytesseract backend)

| OS | Command |
|---|---|
| **Windows** | Download installer from https://github.com/UB-Mannheim/tesseract/wiki |
| **macOS** | `brew install tesseract` |
| **Ubuntu/Debian** | `sudo apt-get install tesseract-ocr` |
| **Fedora/RHEL** | `sudo dnf install tesseract` |

> **Note:** PaddleOCR (`paddleocr`) is installed automatically via pip and does **not** require a separate system install.

---

## Installation

```bash
# From the ai/models/ directory:
pip install -r requirements.txt
```

---

## Model Download

InspireFace models are downloaded **automatically** the first time `test.py` runs:

```bash
python test.py
```

Models are saved to `ai/models/inspireface_models/Pikachu/`.

---

## Running Tests

```bash
cd ai/models
python test.py
```

Expected output — all lines should show ✅.

---

## API Reference

### face_detection

```python
from face_detection import detect_faces

faces = detect_faces("photo.jpg")
# [{"bbox": [x, y, w, h], "landmarks": {...}, "confidence": 0.98}]
```

### face_recognition

```python
from face_recognition import enroll, verify, compare

enroll("alice", "alice_photo.jpg")             # -> True
result = verify("alice", "new_photo.jpg")      # -> {"verified": True, "similarity": 0.87, ...}
score  = compare("photo1.jpg", "photo2.jpg")   # -> 0.92
```

### liveness

```python
from liveness import check_liveness, interactive_liveness

result = check_liveness("selfie.jpg")          # -> {"is_live": True, "score": 0.91, "method": "rgb"}
result = interactive_liveness()                # mock mode (no camera)
```

### ocr

```python
from ocr import extract_from_id, validate_document

data  = extract_from_id("passport.jpg")
valid = validate_document(data)                # -> True / False
```

### risk_scoring

```python
from risk_scoring import calculate_risk

result = calculate_risk({
    "face_match_score":   0.92,
    "liveness_score":     0.88,
    "ocr_confidence":     0.75,
    "transaction_amount": 500,
    "device_info":        {"ip": "192.168.1.1", "user_agent": "Mozilla/5.0"},
    "location":           {"lat": 40.7128, "lon": -74.0060},
    "time_of_day":        14,
    "user_history":       {"avg_amount": 300, "known_devices": [], "known_locations": []},
})
# {"score": 28, "level": "LOW", "recommendation": "ALLOW", "factors": [...]}
```

---

## Database

Face embeddings are stored in **`ai/models/embeddings.db`** (SQLite, created automatically on first enrolment).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `InspireFace not found` | `pip install inspireface` |
| `Model pack not found` | Run `python test.py` to auto-download |
| `Tesseract not found` | Install Tesseract and ensure it is on your PATH |
| `No face detected` | Ensure face is clearly visible, well-lit, and facing forward |
| Camera not accessible | Check OS camera permissions; use `interactive_liveness(None)` for mock mode |
