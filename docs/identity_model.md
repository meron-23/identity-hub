# Identity & Authentication Model

> **Identity Hub** — Challenge C (Digital Identity) + Challenge A (Biometric Auth) + Challenge D (SSO)

---

## 1. Identity Model Overview

Every user in Identity Hub receives a **Decentralized Identity (DID)**-inspired unique identifier, created at enrollment time and persisted in MongoDB. This ID becomes the anchor for all subsequent authentication, credentials, card linkage, and consent operations.

```
User
├── userId          (UUID v4 — primary key across all services)
├── name            (AI-extracted from OCR or user-provided)
├── verified        (boolean — set true only after full eKYC pass)
├── faceMatchScore  (0–1 — blended ID/selfie/liveness confidence)
├── livenessScore   (0–1 — anti-spoofing liveness score)
├── documentAuthenticity (0–1 — OCR + doc-check confidence)
├── riskScore       (0–100 — composite AI risk at enrollment)
├── aiAnalysis      (JSON — per-check PASS/FAIL breakdown)
└── createdAt       (ISO timestamp)
```

---

## 2. Enrollment Flow

```
User Browser
  │  1. Capture ID photo (BiometricCapture.jsx)
  │  2. Take live selfie (LivenessCapture.jsx — circle-tracking)
  │  3. POST /api/enroll { name, idImage (base64), selfie (base64) }
  ▼
Node Backend (enrollment.js)
  │  4. AI: POST /ekyc/verify-document → OCR + authenticity + risk
  │  5. AI: POST /liveness/verify → anti-spoofing score
  │  6. AI: POST /face/compare → cosine similarity ID photo vs. selfie
  │  7. Blended score = doc(40%) + liveness(30%) + face-match(30%)
  │  8. If score < 0.75 or !is_live → 400 REJECTED
  │  9. Create User in MongoDB
  │  10. AI: POST /face/enroll → store face embedding in SQLite (async)
  ▼
Response: { userId, name, verified: true, faceMatchScore, livenessScore, ... }
```

### Rejection Conditions
| Condition | HTTP | Message |
|---|---|---|
| Missing fields | 400 | Required: name, idImage, selfie |
| Doc confidence < threshold | 400 | AI verification failed |
| Liveness failed | 400 | Spoofing detected |
| ID/selfie face mismatch | 400 | Face in selfie does not match ID |
| Overall score < 0.75 | 400 | Below threshold |

---

## 3. Authentication Flow

```
User Browser
  │  1. Enter userId + capture live selfie
  │  2. POST /api/auth { userId, selfie }
  ▼
Node Backend (auth.js)
  │  3. Lookup User in MongoDB (userId)
  │  4. AI: POST /liveness/verify → { is_live, score }
  │  5. If score < 0.75 or !is_live → 401 DENIED
  │  6. authService.generateAuthToken(userId, name)
  │     → JWT { sub: userId, name, type: 'auth', exp: 1h }
  ▼
Frontend (AuthContext.js)
  │  7. Store JWT in localStorage
  │  8. Decode payload → set user context { userId, name, verified }
  │  9. Navigate to /dashboard
```

---

## 4. JWT Token Structure

### Auth Token (session)
```json
{
  "sub": "a3f7c2d1-...",
  "name": "Abebe Girma",
  "type": "auth",
  "iat": 1711576800,
  "exp": 1711580400
}
```
- **Lifetime:** 1 hour
- **Used for:** API requests (Authorization: Bearer header via Axios interceptor)

### Verifiable Credential Token
```json
{
  "sub": "a3f7c2d1-...",
  "name": "Abebe Girma",
  "verified": true,
  "type": "credential",
  "iss": "identity-hub",
  "iat": 1711576800,
  "exp": 1711663200
}
```
- **Lifetime:** 24 hours
- **Used for:** Proof of eKYC completion — shareable with partner institutions
- **Endpoint:** `GET /api/credential/:userId` (requires Bearer auth)

---

## 5. Federated SSO Flow

```
Partner Bank (BankA / BankB)
  │  1. User clicks "Login with Identity Hub"
  │  2. Browser → GET /api/sso?redirect_url=http://localhost:3000/bank-a
  ▼
Node Backend (oauth.js)
  │  3. Retrieve enrolled user
  │  4. authService.generateAuthToken() → JWT
  │  5. Redirect → redirect_url?token=<JWT>
  ▼
Partner Bank Page (BankA.jsx / BankB.jsx)
  │  6. Extract token from URL query param
  │  7. Decode JWT payload (client-side, display only)
  │  8. Render user identity details + bank services
  │  → No re-KYC required, no password needed
```

---

## 6. Consent Management

```
POST /api/consent { userId, serviceName }
  → Validates user exists
  → Checks for duplicate consent
  → Creates Consent { userId, serviceName, createdAt }

GET /api/consent/:userId
  → Returns all consented services for this user
```

Consent records implement **selective disclosure** — a partner institution only receives the claims present in the credential JWT, not the raw identity data.

---

## 7. Biometric Security Properties

| Property | Implementation |
|---|---|
| **Liveness detection** | Circle-tracking nose movement + MediaPipe face mesh |
| **Deepfake detection** | Liveness score threshold (< 0.8 = suspicious) |
| **Face comparison** | InsightFace buffalo_l embeddings, cosine similarity |
| **Embedding storage** | SQLite (ai/models/embeddings.db), AES-encrypted at rest |
| **Bias mitigation** | InsightFace buffalo_l trained on diverse datasets |
| **Threshold** | SIMILARITY_THRESHOLD = 0.50 (configurable) |

---

## 8. Continuous KYC (Ongoing Monitoring)

Endpoint: `POST /kyc/score { image }`

Runs a lightweight liveness + confidence check on any image frame. Designed for real-time session monitoring where a second camera frame can re-verify the user mid-session.

```
kyc_score = 20 (base)
           + liveness_score × 50
           + 30 (bonus if is_live confirmed)

Recommendation:
  ≥ 80 → ALLOW
  ≥ 50 → REVIEW
  < 50 → DENY
```
