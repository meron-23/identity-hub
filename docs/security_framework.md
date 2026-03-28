# Security & Compliance Framework

> **Identity Hub** — Bonus Track: Security, Privacy & Compliance

---

## 1. Security Architecture Overview

Identity Hub implements a **defence-in-depth** security model across all 4 layers:

```
┌──────────────────────────────────────────────────────────┐
│ Layer 4: Frontend Security                               │
│   JWT stored in localStorage · Axios auth interceptor   │
│   No PAN displayed after initial generation             │
└─────────────────────┬────────────────────────────────────┘
                      │ HTTPS / TLS 1.3
┌─────────────────────▼────────────────────────────────────┐
│ Layer 3: API Security                                    │
│   JWT middleware · CORS whitelist · Rate limiting        │
│   Idempotency keys for transactions                      │
└─────────────────────┬────────────────────────────────────┘
                      │ Internal HTTP (localhost)
┌─────────────────────▼────────────────────────────────────┐
│ Layer 2: Data Security                                   │
│   AES-256-GCM card encryption · No plain PAN in DB      │
│   Face embeddings in isolated SQLite DB                  │
│   MongoDB Atlas encryption at rest                       │
└─────────────────────┬────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────┐
│ Layer 1: AI Security                                     │
│   Liveness anti-spoofing · Deepfake scoring              │
│   Biometric threshold enforcement                        │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Cryptography

### Card Tokenization — AES-256-GCM
```javascript
// card/security/encryption.js — VaultEmulator
const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
// Produces: { encrypted (hex), iv (hex), tag (hex) }

// Token format:
//   tok_<uuid8>_<base64(JSON({ encrypted, iv, tag }))>
// The vault reference is base64-encoded in the token itself for simulation
// In production: token → UUID → vault DB lookup (never self-contained)
```

**Properties:**
- 256-bit symmetric key
- Random 12-byte IV per encryption
- 128-bit GCM authentication tag (tamper-evident)
- PAN never stored — only vault reference in MongoDB

### JWT Tokens — HMAC-SHA256
```javascript
// backend/services/tokenService.js
jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
```
- Auth tokens: 1-hour TTL
- Credential tokens: 24-hour TTL
- Signature verification on every protected route

---

## 3. PCI-DSS Alignment

| Requirement | Status | Implementation |
|---|---|---|
| **Req 2** — No vendor defaults | ✅ | Custom encryption key via env var |
| **Req 3** — Protect stored cardholder data | ✅ | No raw PAN in any database |
| **Req 4** — Encrypt transmission | ✅ | HTTPS + AES-256-GCM |
| **Req 6** — Secure development | ✅ | Input validation on all endpoints |
| **Req 7** — Access control | ✅ | Card-to-DID binding, JWT auth |
| **Req 8** — Unique IDs per user | ✅ | UUID v4 userId, per-card tokens |
| **Req 10** — Audit logging | ✅ | Transaction records with risk factors |
| **Req 12** — Information security policy | ⚠️ | Documented, not formally audited |

---

## 4. GDPR / Privacy Compliance

### Data Minimisation
- Only: name, userId, verification scores, card tokens
- No raw biometric images stored in MongoDB (base64 at enrollment only for re-verification, then discardable)
- Face embeddings stored separately in `embeddings.db`, not in MongoDB

### Right to Deletion
```
DELETE /face/delete/:userId  → removes face embedding from SQLite
```
User data can be purged from MongoDB independently.

### Consent Management
Every third-party data share requires explicit user consent:
```
POST /api/consent { userId, serviceName }
GET  /api/consent/:userId               → audit trail
```
Selective disclosure via Verifiable Credential JWT — partner only sees what's in the token.

### Data Residency
All data remains on the user's infrastructure (self-hosted). No third-party analytics or tracking.

---

## 5. Biometric Security

### Anti-Spoofing
| Attack Type | Defence |
|---|---|
| Photo attack | Eye-blink detection (EAR) + liveness score |
| Video replay | Circle-tracking nose movement challenge |
| 3D mask | Depth heuristics via facial landmark variance |
| Deepfake | Score < 0.8 flagged; < 0.75 rejected |

### Embedding Security
- Embeddings are 512-dimensional float32 vectors — **not reversible to original face image**
- Stored in isolated SQLite DB, not exposed via any API
- `SIMILARITY_THRESHOLD = 0.50` (configurable per deployment risk profile)
- Separate DB from user identity data (principle of least privilege)

### Fairness & Bias Mitigation
- InsightFace `buffalo_l` model trained on diverse multi-ethnic datasets (MS-Celeb-1M, VGGFace2)
- Fallback dummy embeddings include explicit "NOT PRODUCTION SAFE" warnings
- Threshold adjustable without code changes for different demographic conditions

---

## 6. API Security Controls

### JWT Middleware (auth.js)
```javascript
// Every protected route:
const token = req.headers.authorization?.split(' ')[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;
```
Returns 401 if token missing, expired, or tampered.

### CORS Policy
```javascript
// backend/middleware/cors.js
Access-Control-Allow-Origin: http://localhost:3000  (production: configured domain)
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Input Validation
- All endpoints validate required fields before AI calls
- File type validation on image uploads (content-type + buffer magic bytes)
- Amount fields parsed as floats to prevent injection

### Idempotency
```javascript
// transaction.js — prevents double-charge
const processedTransactions = new Set();
if (processedTransactions.has(idempotencyKey)) return cached result;
```

---

## 7. Secret Management

All secrets via environment variables (never committed to Git):

```bash
# backend/.env
JWT_SECRET=<strong-random-256-bit-key>
MONGODB_URI=mongodb://...
AI_SERVICE_URL=http://localhost:5001
ENCRYPTION_KEY=<32-byte-hex-key>
```

```bash
# .gitignore entries
.env
*.env
ai/models/embeddings.db
node_modules/
__pycache__/
```

---

## 8. Threat Model

| Threat | Risk | Control |
|---|---|---|
| PAN theft from DB | **Critical** | Tokenization — no PAN in DB |
| JWT token theft | **High** | 1h TTL, HTTPS only |
| Biometric replay | **High** | Liveness detection + circle challenge |
| Account takeover | **High** | Biometric + liveness + doc verification combined |
| Synthetic identity fraud | **Medium** | Data validation + synthetic ID detector |
| Credential stuffing | **Low** | No passwords — biometric only |
| SQL injection | **Low** | Mongoose ORM + parameterised SQLite |
| Bot/automated fraud | **Medium** | Liveness challenge, rate limiting |
| Card cloning | **Critical** | No raw PAN stored, tokenization |
