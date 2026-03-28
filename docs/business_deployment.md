# Business & Deployment Model

> **Identity Hub** — Go-to-Market, Monetization & Cloud Architecture

---

## 1. Value Proposition

Identity Hub solves a **$7.5 trillion annual problem**: financial fraud, identity theft, and exclusion from financial services due to inability to prove identity.

### Target Market

| Segment | Problem Solved | Addressable Market |
|---|---|---|
| **Banks & Fintechs** | Costly manual KYC (avg $30/user) → automated in seconds | $2.4B KYC market |
| **Micro-Finance** | Rural unbanked users lack formal ID → AI extracts identity from alternative docs | 1.4B unbanked globally |
| **Healthcare** | Patient misidentification → biometric-bound medical ID | $5.6B patient ID market |
| **Government e-Services** | Citizens authenticate to portals securely without passwords | 190+ countries |
| **Telecom / SaaS** | KYC for SIM registration, account verification | Universal |

---

## 2. Business Model

### SaaS API Pricing

| Tier | Volume | Price | Includes |
|---|---|---|---|
| **Starter** | Up to 500 verifications/mo | Free | eKYC + liveness |
| **Growth** | Up to 10,000/mo | $0.15/verification | + Face recognition + credentials |
| **Enterprise** | Unlimited | Custom | + On-premise, SLA, white-label |
| **Card Issuing** | Per tokenization | $0.05/token | PCI-DSS tokenization + risk engine |

### Revenue Streams
1. **API-as-a-Service** — per-verification billing (primary)
2. **White-label Identity Hub** — licence fee for bank branding
3. **SSO Federation Fees** — per cross-institution token issuance
4. **Compliance Reporting** — subscription for audit dashboards
5. **Hardware Edge Tier** — edge device licence for offline KYC

---

## 3. Competitive Advantages

| Feature | Identity Hub | Onfido | Jumio | Veriff |
|---|---|---|---|---|
| Open source core | ✅ | ❌ | ❌ | ❌ |
| Biometric step-up auth | ✅ | Partial | Partial | ✅ |
| Card tokenization built-in | ✅ | ❌ | ❌ | ❌ |
| Federated SSO included | ✅ | ❌ | ❌ | ❌ |
| Africa-specific doc support | ✅ | Partial | Partial | Partial |
| Edge / offline mode | ✅ | ❌ | ❌ | ❌ |
| Verifiable credentials (JWT) | ✅ | ❌ | ❌ | Partial |

---

## 4. Cloud Deployment Architecture (Production)

```
┌──────────────────────────────────────────────────────────┐
│                  AWS / GCP / Azure                       │
│                                                          │
│  CloudFront CDN                                          │
│       │                                                  │
│  S3 / GCS (React static build)                           │
│       │                                                  │
│  API Gateway / Load Balancer                             │
│       │                                                  │
│  ┌────▼───────────┐   ┌──────────────────────────────┐  │
│  │ Node.js Backend │   │  Python AI Service           │  │
│  │ ECS / Cloud Run │   │  GPU-enabled VM or           │  │
│  │ (auto-scale)    │   │  Vertex AI / SageMaker       │  │
│  └────┬────────────┘   └──────────────────────────────┘  │
│       │                                                  │
│  ┌────▼──────────┐   ┌──────────────────────────────┐   │
│  │  MongoDB Atlas │   │  Redis (session cache +      │   │
│  │  (multi-region)│   │   idempotency store)         │   │
│  └───────────────┘   └──────────────────────────────┘   │
│                                                          │
│  Secrets: AWS Secrets Manager / GCP Secret Manager      │
│  Monitoring: Datadog / CloudWatch                        │
│  Logs: ELK Stack / Cloud Logging                         │
└──────────────────────────────────────────────────────────┘
```

### Kubernetes Deployment (Helm Chart)
```yaml
# 3 containers per namespace:
services:
  frontend:     nginx:alpine (React build)
  backend:      node:20-alpine (Express)
  ai-service:   python:3.11-slim (Flask + models)

# Scaling:
backend:     HPA 2–20 replicas (CPU threshold 70%)
ai-service:  HPA 1–10 replicas (GPU threshold 80%)
```

---

## 5. Edge Deployment (Offline / Low-Connectivity)

For rural Africa deployments without reliable internet:

```
Raspberry Pi 4 / Jetson Nano
  ├── Flask AI service (TFLite / ONNX quantised models)
  ├── Local SQLite for face embeddings
  ├── Local queue for upstream sync when connectivity resumes
  └── Physical card reader integration (NFC/SPI)
```

Models optimised for edge:
- MediaPipe Face Mesh: 2MB model, 30fps on CPU
- MobileNet-based OCR: 8MB vs 100MB EasyOCR
- InsightFace ONNX: GPU → CPU inference

---

## 6. Go-to-Market Strategy

### Phase 1 — Hackathon → Pilot (0–3 months)
- Open-source release on GitHub
- Partner with 2–3 Ethiopian banks for pilot KYC integration
- Deploy to 100 test users in Addis Ababa

### Phase 2 — East Africa Expansion (3–12 months)
- Regulatory engagement with National Bank of Ethiopia, CBK (Kenya)
- ISO 27001 certification pursuit
- Mobile agent app for field KYC officers

### Phase 3 — Pan-Africa Platform (12–24 months)
- 50+ financial institution integrations
- W3C Verifiable Credentials standard compliance
- Cross-border identity portability (AU Digital Identity Framework)

---

## 7. Regulatory Compliance Roadmap

| Regulation | Region | Timeline |
|---|---|---|
| PDPA (Personal Data) | Ethiopia | Q2 2026 |
| PCI-DSS Level 2 | Global (cards) | Q3 2026 |
| ISO 27001 | Global | Q4 2026 |
| GDPR | EU operations | Q1 2027 |
| eIDAS 2.0 | EU | Q2 2027 |
| W3C DID/VC | Global standard | Q2 2026 (partial) |

---

## 8. Key Metrics (Target — Year 1)

| Metric | Target |
|---|---|
| Verified users processed | 50,000 |
| KYC completion rate | > 85% |
| False rejection rate (FRR) | < 3% |
| False acceptance rate (FAR) | < 0.1% |
| Average verification time | < 45 seconds |
| API uptime SLA | 99.9% |
| Monthly recurring revenue | $50,000 ARR |
