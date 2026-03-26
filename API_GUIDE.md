# Identity Hub — API Guide

> **Server:** `http://localhost:5000`
> **Start:** `cd backend && node server.js`
> **Requirement:** MongoDB must be running on `localhost:27017`

---

## Quickstart

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Ensure MongoDB is running
# Windows: net start MongoDB
# Or start MongoDB Compass / mongod manually

# 3. Start the server
node server.js
# → ✅ Identity Hub API running on http://localhost:5000
# → MongoDB connected: localhost
```

---

## Endpoint Reference & Demo Data

### Health Check
```
GET /
```
```bash
curl http://localhost:5000/
```
**Response:**
```json
{ "status": "ok", "message": "Identity Hub API is running" }
```

---

### 2.1 — User Enrollment

```
POST /api/enroll
Content-Type: application/json
```

```bash
curl -X POST http://localhost:5000/api/enroll \
  -H "Content-Type: application/json" \
  -d '{
    "name":    "Fikre Demo",
    "idImage": "data:image/jpeg;base64,/9j/demoIdImageBase64==",
    "selfie":  "data:image/jpeg;base64,/9j/demoSelfieBase64=="
  }'
```

**Response 201:**
```json
{
  "message": "User enrolled successfully",
  "user": {
    "userId":         "a3f1e2b4-...",
    "name":           "Fikre Demo",
    "dob":            "1990-01-01",
    "verified":       true,
    "faceMatchScore": 0.97,
    "createdAt":      "2024-01-01T00:00:00.000Z"
  }
}
```

> **Save the `userId`** — you'll need it for all subsequent requests.

---

### 2.2 — Authentication (Face Login)

```
POST /api/auth
Content-Type: application/json
```

```bash
curl -X POST http://localhost:5000/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "a3f1e2b4-...",
    "selfie": "data:image/jpeg;base64,/9j/demoSelfieBase64=="
  }'
```

**Response 200:**
```json
{
  "message": "Authentication successful",
  "token":   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> **Save the `token`** — use it as `Authorization: Bearer <token>` for protected routes.

---

### 2.3 — SSO / OAuth2 Login

#### Initiate SSO (opens redirect)

```
GET /api/sso?redirect_url=<url>
```

```bash
curl -v "http://localhost:5000/api/sso?redirect_url=http://localhost:3000/callback"
```

**Response:** `302 Redirect` to:
```
http://localhost:3000/callback?token=eyJhbGciOiJIUzI1NiIs...
```

#### SSO Callback Helper

```
GET /api/sso/callback?token=<jwt>
```

```bash
curl "http://localhost:5000/api/sso/callback?token=eyJhbGciOiJIUzI1NiIs..."
```

**Response 200:**
```json
{
  "message": "SSO callback received",
  "token":   "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### 2.4 — Verifiable Credential

```
GET /api/credential/:userId
Authorization: Bearer <token>
```

```bash
curl http://localhost:5000/api/credential/a3f1e2b4-... \
  -H ": Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response 200:**
```json
{
  "message":    "Verifiable credential issued",
  "credential": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> Decode the credential at [jwt.io](https://jwt.io). Payload contains:
> ```json
> { "sub": "userId", "name": "Fikre Demo", "verified": true,
>   "type": "credential", "iss": "identity-hub" }
> ```

---

### 2.5 — Consent Management

#### Grant Consent

```
POST /api/consent
Content-Type: application/json
```

```bash
curl -X POST http://localhost:5000/api/consent \
  -H "Content-Type: application/json" \
  -d '{
    "userId":      "a3f1e2b4-...",
    "serviceName": "BankApp"
  }'
```

**Response 201:**
```json
{
  "message": "Consent recorded",
  "consent": {
    "userId":      "a3f1e2b4-...",
    "serviceName": "BankApp",
    "createdAt":   "2024-01-01T00:00:00.000Z"
  }
}
```

#### Grant Additional Consents (demo)

```bash
curl -X POST http://localhost:5000/api/consent \
  -H "Content-Type: application/json" \
  -d '{"userId":"a3f1e2b4-...","serviceName":"InsureCo"}'

curl -X POST http://localhost:5000/api/consent \
  -H "Content-Type: application/json" \
  -d '{"userId":"a3f1e2b4-...","serviceName":"CryptoExchange"}'
```

#### List Approved Services

```
GET /api/consent/:userId
```

```bash
curl http://localhost:5000/api/consent/a3f1e2b4-...
```

**Response 200:**
```json
{
  "userId":   "a3f1e2b4-...",
  "services": ["BankApp", "InsureCo", "CryptoExchange"]
}
```

---

## Full Flow (Step-by-Step)

```bash
# Step 1: Enroll
RESPONSE=$(curl -s -X POST http://localhost:5000/api/enroll \
  -H "Content-Type: application/json" \
  -d '{"name":"Fikre Demo","idImage":"base64img","selfie":"base64selfie"}')
USER_ID=$(echo $RESPONSE | python -c "import sys,json; print(json.load(sys.stdin)['user']['userId'])")

# Step 2: Authenticate
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"selfie\":\"base64selfie\"}")
TOKEN=$(echo $TOKEN_RESPONSE | python -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Step 3: Get Credential
curl http://localhost:5000/api/credential/$USER_ID \
  -H "Authorization: Bearer $TOKEN"

# Step 4: Grant Consent
curl -X POST http://localhost:5000/api/consent \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"serviceName\":\"BankApp\"}"

# Step 5: List Consents
curl http://localhost:5000/api/consent/$USER_ID

# Step 6: SSO (browser or curl -L)
curl -L "http://localhost:5000/api/sso?redirect_url=http://localhost:3000/callback"
```

---

## Error Reference

| Code | Meaning                              |
|------|--------------------------------------|
| 400  | Missing/invalid request fields       |
| 401  | Missing or expired JWT               |
| 404  | User or resource not found           |
| 409  | Duplicate consent entry              |
| 500  | Internal server error                |

---

## Environment Variables (`backend/.env`)

| Variable       | Default                                   | Description               |
|----------------|-------------------------------------------|---------------------------|
| `PORT`         | `5000`                                    | Server port               |
| `MONGODB_URI`  | `mongodb://localhost:27017/identity-hub`  | MongoDB connection string |
| `JWT_SECRET`   | `identity_hub_secret_key_2024`            | JWT signing secret        |
| `AI_SERVICE_URL` | `http://localhost:8000/verify`          | External AI endpoint      |

> **Note:** The AI service (`localhost:8000`) is mocked — if unreachable, the server falls back to a simulated success response so all APIs work out-of-the-box.
