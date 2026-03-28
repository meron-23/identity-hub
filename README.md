# Identity Hub 🔐

> **AI-Powered Digital Identity, Biometric eKYC & Card Transaction Platform**
>
> Hackathon Submission — Challenges A · B · C · D · E

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-green.svg)](https://python.org)
[![Node.js 20](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org)
[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)

---

## 🌍 What is Identity Hub?

Identity Hub is a **full-stack digital identity platform** addressing all 5 challenge tracks:

| Track | Challenge | Solution |
|---|---|---|
| **A** | AI-Driven Biometric Verification | Face recognition + liveness detection + deepfake scoring + risk-triggered step-up auth |
| **B** | Intelligent eKYC Orchestration | OCR + document verification + synthetic ID detection + risk scoring + identity profiling |
| **C** | Digital Identity Infrastructure | Unique DIDs + verifiable credential JWTs + selective disclosure + consent management |
| **D** | Federated SSO | OAuth2-style SSO + partner bank redirect flow + JWT token propagation |
| **E** | Card-Based Digital Identity | AES-256-GCM tokenization + virtual card generation + 6-vector AI fraud detection |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│            React Frontend  :3000                         │
│  Enroll · Login · Dashboard · Cards · Payment · SSO      │
└─────────────────────┬────────────────────────────────────┘
                      │ REST / JSON
┌─────────────────────▼────────────────────────────────────┐
│          Node.js / Express Backend  :5000                 │
│  enrollment · auth · sso · credential · consent          │
│  card · virtual-card · transaction                        │
│                      │                                    │
│  card/ library ──────┘  (tokenization + risk engine)     │
└─────────────────────┬────────────────────────────────────┘
                      │ HTTP multipart
┌─────────────────────▼────────────────────────────────────┐
│          Python Flask AI Service  :5001                   │
│  /ekyc/verify-document  /liveness/verify                  │
│  /face/enroll  /face/verify  /face/compare                │
│  /risk/calculate  /kyc/score                              │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (30 seconds)

```powershell
# Clone the repo
git clone https://github.com/<your-org>/identity-hub.git
cd identity-hub

# Start everything (opens 3 terminal windows)
.\start.ps1
```

**Or manually:**

```bash
# Terminal 1 — AI Service
cd ai && pip install -r requirements.txt && python api.py

# Terminal 2 — Backend
cd backend && npm install && npm run dev

# Terminal 3 — Frontend
cd frontend && npm install && npm start
```

Open → **http://localhost:3000**

---

## 📂 Project Structure

```
identity-hub/
├── frontend/          # React 18 UI (Enroll, Login, Dashboard, Cards, Payment, SSO Banks)
├── backend/           # Node.js Express API + MongoDB
│   ├── api/           # Route handlers (enrollment, auth, card, transaction, etc.)
│   ├── models/        # Mongoose schemas
│   └── services/      # aiService, authService, tokenService
├── ai/                # Python Flask AI orchestration (port 5001)
│   ├── ekyc/          # OCR · doc verification · data validation · risk · profile
│   └── models/        # Liveness · Face recognition · ML risk · Continuous KYC
├── card/              # Card tokenization & AI fraud simulation
│   ├── tokenization/  # AES-256-GCM PAN tokenization + Luhn virtual card
│   └── simulation/    # 6-vector Identity Risk Engine
└── docs/              # Full documentation suite
```

---

## 📄 Documentation

| Document | Description |
|---|---|
| [Identity & Auth Model](docs/identity_model.md) | DIDs, JWT flows, biometric pipeline |
| [Card Transaction Flow](docs/card_flow.md) | Tokenization, risk engine, step-up auth |
| [AI Model Documentation](docs/ai_model_documentation.md) | OCR, liveness, face recognition, risk scoring |
| [Security & Compliance](docs/security_framework.md) | AES-256, JWT, PCI-DSS alignment |
| [Business & Deployment](docs/business_deployment.md) | Go-to-market, cloud architecture, monetization |
| [API Guide](API_GUIDE.md) | All REST endpoints with examples |
| [Integration Guide](INTEGRATION_GUIDE.md) | Cross-module integration patterns |

---

## 🎯 5 User Flows

1. **Enrollment** — Upload ID + live selfie → OCR → Face compare → Liveness → Profile stored
2. **Login** — User ID + selfie liveness check → JWT issued
3. **Card Management** — Link physical card (tokenized) or generate virtual card (Luhn-valid PAN)
4. **Secure Payment** — 6-vector risk engine → step-up biometric auth if risk > 50
5. **Federated SSO** — Partner bank redirect receives JWT → no re-KYC needed

---

## 🔐 Security Highlights

- **AES-256-GCM** card encryption (PCI-DSS aligned)
- **JWT RS256** session tokens (1h auth, 24h credential)
- **No raw PAN storage** — vault-emulated reference tokens only
- **Liveness anti-spoofing** — circle-tracking + MediaPipe face mesh
- **Continuous KYC** — real-time risk monitoring per frame

---

## 🌐 SSO Demo

| Partner Bank | URL |
|---|---|
| FirstBank Ethiopia | http://localhost:3000/bank-a |
| AfriMicro Finance | http://localhost:3000/bank-b |
| SSO Trigger | http://localhost:5000/api/sso?redirect_url=http://localhost:3000/bank-a |

---

## 👥 Team

Built for the Global Hackathon — Tracks A, B, C, D, E.

---

## 📜 License

MIT License — see [LICENSE](LICENSE).