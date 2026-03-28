# Card Transaction Flow Design

> **Identity Hub** — Challenge E (Card-Based Digital Identity)

---

## 1. Overview

The card system is a **standalone Node.js library** (`/card/`) imported directly by the backend. It provides:

- **AES-256-GCM PAN tokenization** (emulates real PCI-DSS vault architecture)
- **Luhn-valid virtual card generation** (Visa BIN 400000)
- **6-vector AI-enhanced risk engine** with biometric step-up authentication

No card numbers are ever stored in plain text.

---

## 2. System Components

```
card/
├── tokenization/tokenGenerator.js   ← PAN encryption + token format
├── simulation/paymentSimulator.js   ← IdentityRiskEngine (6 risk vectors)
└── security/encryption.js           ← VaultEmulator (AES-256-GCM)
```

---

## 3. Card Linking Flow (Physical Card)

```
User (CardManagement.jsx)
  │  Enter 16-digit card number
  │  POST /api/card/link-card { user_did, cardNumber }
  ▼
Backend (card.js)
  │  1. TokenizationEngine.generateToken(cardNumber)
  │     ├── VaultEmulator.encryptData(cardNumber)
  │     │   └── AES-256-GCM encrypt with random IV
  │     │       → produces { encrypted, iv, tag }
  │     ├── Base64-encode the vault reference
  │     └── Token format: tok_<8-char-UUID>_<base64-vault-ref>
  │  2. Save Card { user_did, card_token, status: 'active' } to MongoDB
  ▼
Response: { _id, card_token, user_did, status }

User's actual PAN:  ✅ Never stored in DB
Token:              ✅ Reversible ONLY via VaultEmulator.decryptData()
```

---

## 4. Virtual Card Generation Flow

```
User (CardManagement.jsx)
  │  Click "Generate Virtual Card"
  │  POST /api/virtual-card { user_did }
  ▼
Backend (virtual-card.js)
  │  1. TokenizationEngine.generateVirtualCardNumber()
  │     ├── BIN: 400000 (Visa test range)
  │     ├── 9 digits via crypto.randomBytes() (CSPRNG — no Math.random)
  │     └── Luhn checksum digit appended
  │  2. TokenizationEngine.generateToken(virtualNumber)
  │     └── Same AES-256-GCM path as physical card
  │  3. Save Card to MongoDB
  ▼
Response: {
  card: { _id, card_token, user_did, status: 'active' },
  virtualNumber  ← transmitted ONCE to client, never stored raw
}
```

### Luhn Algorithm Verification
```
BIN(6) + CSPRNG(9) + luhn_check(1) = 16 digits
Example (generated): 4000007348291X  (X = computed check digit)
```

---

## 5. Payment Transaction Flow

```
User (Payment.jsx)
  │  1. Select active card + enter amount
  │  2. POST /api/transaction
  │     { user_did, card_id, amount, requireFace, biometricData }
  ▼
Backend (transaction.js)
  │  3. Idempotency check (in-memory Set — prevents double-charge)
  │  4. Verify Card is active + belongs to user
  │  5. IdentityRiskEngine.processPayment(cardToken, amount, requireFace, userDid, biometricData)
  ▼
IdentityRiskEngine (paymentSimulator.js)
  │  6. Vector A: Amount thresholds
  │     > $5000 → +65pts  |  > $1000 → +40pts  |  > $500 → +15pts
  │  7. Vector B: Velocity (transaction frequency simulation) → up to +45pts
  │  8. Vector C: Geographic anomaly (random 0–20pts)
  │  9. Vector D: Biometric confidence
  │     → calls aiService.verifyLiveness(selfie) if biometricData provided
  │     → high confidence → reduces risk by 20pts
  │  10. Vector E: Document risk
  │     → calls aiService.verifyDocument(document) if provided
  │  11. Vector F: Time-of-day risk (22:00–06:00 → +10pts)
  ▼
Decision Matrix:
  riskScore > 85  → DECLINE
  riskScore > 50  → advanced_verification_required  ← step-up triggered
  riskScore ≤ 50  → APPROVE
  ▼ (if step-up triggered)
Frontend (Payment.jsx)
  │  12. BiometricCapture shown → user takes selfie
  │  13. POST /api/transaction again with requireFace=true + biometricData
  │  14. High biometric confidence overrides moderate risk → APPROVE
  ▼
Backend
  │  15. Save Transaction to MongoDB
  │      { amount, risk_score, status, user_did, risk_factors,
  │        biometric_analysis, recommendation, ai_enhanced }
  ▼
Response: Digital Receipt with full risk analysis panel
```

---

## 6. Risk Score Examples

| Scenario | Vectors Triggered | Score | Decision |
|---|---|---|---|
| $50 purchase, daytime | None | 5 | ✅ APPROVE |
| $800 purchase, known device | Amount (+15) | 20 | ✅ APPROVE |
| $2,000 purchase, 2AM | Amount (+40), Time (+10) | 55 | ⚠️ STEP-UP |
| $2,000 + biometric pass | Amount (+40), Time (+10), Biometric(-20) | 35 | ✅ APPROVE |
| $7,000 purchase, suspicious | Amount (+65), Velocity (+45) | 92 | ❌ DECLINE |

---

## 7. Card Status Management

| Action | Endpoint | Effect |
|---|---|---|
| Freeze card | `PATCH /api/card/:id/disable` | status → 'disabled' |
| Unfreeze card | `PATCH /api/card/:id/disable` | status → 'active' (toggle) |
| List cards | `GET /api/card/:did` | Returns all cards for user |

Transactions on disabled cards are rejected before the risk engine runs.

---

## 8. Token Format Reference

```
tok_<8-char-uuid>_<base64(AES-256-GCM-encrypted-PAN)>

Example:
tok_a3f7c2d1_eyJlbmNyeXB0ZWQiOiJ...

Decoding:
1. Split on '_'
2. Join parts[2..] → base64 vault reference
3. VaultEmulator.decryptData(vaultRef) → original PAN
```

---

## 9. PCI-DSS Alignment

| PCI-DSS Requirement | Implementation |
|---|---|
| Req 3 — No PAN storage | Vault tokenization (PAN never in DB) |
| Req 4 — Encrypt in transit | HTTPS + AES-256-GCM |
| Req 7 — Access control | Card-to-DID binding, JWT auth |
| Req 8 — Unique IDs | UUID per card, user_did binding |
| Req 10 — Logging | Transaction records with risk factors |
