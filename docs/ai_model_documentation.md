# AI Model Documentation

> **Identity Hub** — Challenge A (Biometric) + Challenge B (eKYC)

---

## 1. AI Architecture Overview

The AI layer is a **Python 3.11 Flask service** running on port 5001, exposing 10 REST endpoints. It is completely decoupled from the Node.js backend — all communication is via HTTP.

```
ai/
├── api.py                       ← Flask entry point (all routes)
├── ekyc/
│   ├── ocr.py                   ← EasyOCR + Tesseract text extraction
│   ├── document_verification.py ← Structural + heuristic authenticity
│   ├── data_validation.py       ← Format checks + synthetic ID detection
│   ├── risk_scoring.py          ← eKYC pipeline risk aggregation
│   └── identity_profile.py      ← Reusable digital identity profile builder
└── models/
    ├── liveness.py              ← Anti-spoofing liveness detection
    ├── face_recognition.py      ← InsightFace embedding + SQLite storage
    ├── face_detection.py        ← InsightFace detector
    ├── risk_scoring.py          ← Multi-signal ML risk engine
    └── continuous_kyc.py        ← Real-time KYC session monitoring
```

---

## 2. Liveness Detection Model

**File:** `ai/models/liveness.py`  
**Endpoint:** `POST /liveness/verify`

### Method
- **Primary:** MediaPipe Face Mesh — tracks 468 3D facial landmarks
- **Fallback:** OpenCV Haar Cascade + eye-blink ratio (if MediaPipe unavailable)

### Anti-Spoofing Techniques
| Technique | Description |
|---|---|
| Eye aspect ratio (EAR) | Detects natural eye blinking (photos can't blink) |
| Texture analysis | Distinguishes screen/print texture from skin |
| Circle-tracking challenge | User moves nose along animated circle on-screen |
| Iris detection | Presence of iris keypoints indicates real face |

### Output Schema
```json
{
  "is_live": true,
  "score": 0.92,
  "method": "mediapipe_face_mesh",
  "warning": null
}
```

### Thresholds
- `score < 0.75` → flagged as potential spoof
- `score < 0.6` → rejected at enrollment and login

---

## 3. Face Recognition Model

**File:** `ai/models/face_recognition.py`  
**Endpoints:** `/face/enroll`, `/face/verify`, `/face/compare`, `/face/users`, `/face/delete/:id`

### Model: InsightFace buffalo_l
- **Architecture:** ArcFace (ResNet50 backbone)
- **Embedding size:** 512-dimensional float32 vector
- **Training data:** MS-Celeb-1M + VGGFace2 (diverse ethnicities)
- **Detection:** RetinaFace (multi-scale anchor-free)

### Embedding Storage
```
ai/models/embeddings.db  (SQLite)
Table: embeddings
  user_id     TEXT PRIMARY KEY
  embedding   TEXT (JSON array of 512 floats)
  enrolled_at DATETIME
```

### Similarity Metric
```python
cosine_similarity(a, b) = (dot(a,b) / (|a| × |b|) + 1.0) / 2.0
# Mapped from [-1,1] → [0,1]
SIMILARITY_THRESHOLD = 0.50
```

### Enrollment Flow
1. Extract largest detected face bounding box
2. Run ArcFace to produce 512-d embedding
3. L2-normalise embedding
4. Store as JSON in SQLite under user_id

### Verification Flow
1. Extract probe embedding from input image
2. Load stored embedding from SQLite for user_id
3. Compute cosine similarity
4. Return `verified = similarity >= 0.50`

### Direct Comparison (ID vs. Selfie)
```python
compare(id_image, selfie) → float  # similarity in [0,1]
# Used during enrollment to confirm selfie matches ID document photo
```

---

## 4. eKYC OCR Pipeline

**File:** `ai/ekyc/ocr.py`  
**Endpoint:** `POST /ekyc/verify-document`  

### OCR Stack
- **Primary:** EasyOCR (deep learning — 80+ languages, handles poor quality)
- **Preprocessing:** Grayscale → CLAHE contrast enhancement → adaptive thresholding

### Extracted Fields
```
document_type:    'passport' | 'national_id' | 'driver_license' | 'unknown'
raw_text:         [list of detected strings]
confidence:       float [0,1] — mean confidence of all detections
fields:
  first_name, last_name, id_number, date_of_birth, expiry_date, nationality
mrz_data:         dict (if MRZ zone detected)
```

### Document Type Detection
Uses keyword heuristics on OCR output:
- "PASSPORT" → passport
- "NATIONAL ID" / "ID CARD" → national_id
- "DRIVER" / "LICENSE" → driver_license

---

## 5. Document Verification Model

**File:** `ai/ekyc/document_verification.py`  
**Called by:** `/ekyc/verify-document` pipeline

### Checks Performed
| Check | Method | Weight |
|---|---|---|
| Image quality | Blur detection (Laplacian variance) | 15% |
| Document dimensions | Aspect ratio ± tolerance | 10% |
| Text density | Character count relative to image area | 15% |
| Field completeness | Required fields present | 25% |
| Security features | Hologram/watermark heuristics | 20% |
| MRZ checksum | ISO 7501 check digit validation | 15% |

### Output
```json
{
  "authentic": true,
  "confidence": 0.87,
  "checks_passed": ["image_quality", "field_completeness", "mrz_valid"],
  "checks_failed": [],
  "recommendation": "APPROVE"
}
```

---

## 6. Data Validation Model

**File:** `ai/ekyc/data_validation.py`

### Validation Rules
| Rule | Implementation |
|---|---|
| ID number format | Regex per country/doc type |
| Date of birth | Valid date + age ≥ 18 years |
| Expiry date | Document not expired |
| Name consistency | OCR vs. stated name fuzzy match |
| **Synthetic identity detection** | ML heuristics: sequential IDs, implausible DOBs, mismatched fields |
| **Blacklist check** | Checks against in-memory blocklist |

### Synthetic Identity Signals
- Sequential or numerically patterned ID numbers
- Round-number dates of birth (Jan 1, Jan 15 patterns)
- Perfect OCR confidence (too clean → printed fake)
- Field values inconsistent with document country format

---

## 7. AI Risk Scoring Engine

**File:** `ai/models/risk_scoring.py`  
**Endpoint:** `POST /risk/calculate`

### Signal Weights
```python
WEIGHTS = {
    "face_match":  0.30,   # Cosine similarity from face recognition
    "liveness":    0.25,   # Anti-spoofing score
    "device_loc":  0.25,   # Device fingerprint + IP / location anomaly
    "transaction": 0.20,   # Amount relative to user average
}
```

### Risk Calculation
```python
raw_score = (face_risk × 0.30) + (liveness_risk × 0.25)
          + (devloc_risk × 0.25) + (txn_risk × 0.20)
          + time_modifier (0 or +5)

# Each signal: risk = (1 - confidence) × 100
# Haversine distance used for geographic anomaly
```

### Output
```json
{
  "score": 42,
  "level": "MEDIUM",
  "factors": ["new_device", "amount_spike"],
  "recommendation": "REQUIRE_2FA",
  "breakdown": {
    "face_match":  { "weight": 0.30, "risk": 8  },
    "liveness":    { "weight": 0.25, "risk": 5  },
    "device_loc":  { "weight": 0.25, "risk": 70 },
    "transaction": { "weight": 0.20, "risk": 65 }
  }
}
```

---

## 8. Continuous KYC Model

**File:** `ai/models/continuous_kyc.py`  
**Endpoint:** `POST /kyc/score`

A real-time session monitor that runs liveness + stability checks on live video frames. Designed for high-assurance scenarios where identity must be continuously verified (e.g., during a high-value transaction).

### States
```
CAPTURE → RECOGNITION → LIVENESS_CIRCLE → COMPLETE | FAILED
```

### Final Score
```
final_score = 20 (base)
            + 20 (if face captured)
            + 30 (if similarity ≥ 0.7 over 5 frames)
            + int(liveness_score × 30)

≥ 80 → ALLOW
≥ 50 → REVIEW
< 50 → DENY
```

---

## 9. API Endpoint Reference

| Method | Endpoint | Input | Output |
|---|---|---|---|
| POST | `/liveness/verify` | `image` (multipart) | `{ is_live, score, method }` |
| POST | `/ekyc/verify-document` | `image, country` (multipart) | `{ success, risk_score, identity_profile }` |
| POST | `/face/enroll` | `image, user_id` (multipart) | `{ success, user_id }` |
| POST | `/face/verify` | `image, user_id` (multipart) | `{ verified, similarity, threshold }` |
| POST | `/face/compare` | `id_image, selfie` (multipart) | `{ similarity, match, threshold }` |
| GET | `/face/users` | — | `{ users: [...] }` |
| DELETE | `/face/delete/:id` | — | `{ success }` |
| POST | `/risk/calculate` | JSON params | `{ score, level, factors, recommendation }` |
| GET | `/risk/factors` | — | `{ factors, thresholds, weights }` |
| POST | `/kyc/score` | `image` (multipart) | `{ kyc_score, liveness_score, recommendation }` |
| GET | `/health` | — | `{ status: "healthy" }` |

---

## 10. Fallback Strategy

All AI models implement graceful fallback:

| Model | Fallback |
|---|---|
| InsightFace unavailable | Deterministic dummy embedding (warns: not production safe) |
| MediaPipe unavailable | OpenCV Haar + eye-blink detection |
| EasyOCR unavailable | Regex-only text extraction |
| AI service down (Node side) | `aiService.js` returns mock approval with console warning |

This ensures the system **remains demonstrable at the hackathon** even without GPU/model downloads.
