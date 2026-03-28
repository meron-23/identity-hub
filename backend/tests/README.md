# Identity Hub End-to-End Tests

This directory contains comprehensive E2E tests that validate the complete integration of all Identity Hub modules.

## Test Coverage

The E2E test suite covers the complete user journey:

### 🔐 Authentication & Identity
- ✅ Backend health check
- ✅ AI service health check  
- ✅ User enrollment with AI verification
- ✅ Biometric authentication
- ✅ JWT token management

### 📄 Credentials & Consents
- ✅ Verifiable credential issuance
- ✅ Consent management (grant/list)
- ✅ SSO flow simulation

### 💳 Card & Transaction System
- ✅ Virtual card creation
- ✅ Low-risk transactions (no biometric required)
- ✅ High-risk transactions (biometric step-up required)
- ✅ High-risk transactions with biometric override
- ✅ AI-enhanced risk analysis
- ✅ Transaction idempotency protection

### 🔒 Security & Compliance
- ✅ Risk factors transparency API
- ✅ PCI-compliant tokenization
- ✅ Biometric confidence scoring
- ✅ Liveness detection

## Prerequisites

Before running the E2E tests, ensure all services are running:

### 1. Start MongoDB
```bash
# Windows
net start MongoDB

# Or use MongoDB Compass
mongod
```

### 2. Start AI Service
```bash
cd ai
python api.py
# Service runs on http://localhost:5001
```

### 3. Start Backend API
```bash
cd backend
npm start
# API runs on http://localhost:5000
```

### 4. Verify Services
- Backend: http://localhost:5000/
- AI Service: http://localhost:5001/health

## Running Tests

### Quick Start
```bash
cd backend
npm run test:e2e
```

### Manual Test Execution
```bash
cd backend
npx jest tests/e2e.test.js --verbose
```

### With Custom URLs
```bash
TEST_BASE_URL=http://localhost:5000 AI_BASE_URL=http://localhost:5001 npm run test:e2e
```

## Test Scenarios

### 🧪 Test 1: User Enrollment
- Creates new user with AI-verified identity
- Validates face matching and document verification
- Ensures user is properly stored in MongoDB

### 🧪 Test 2: Biometric Authentication  
- Tests face-based login
- Validates JWT token issuance
- Ensures proper session management

### 🧪 Test 3: Credential System
- Issues verifiable credentials
- Validates JWT structure and claims
- Tests credential portability

### 🧪 Test 4: Transaction Risk Engine
- **Low Risk**: $50 transaction → Approved immediately
- **High Risk**: $2000 transaction → Step-up required
- **Biometric Override**: High risk + face verification → Approved
- Validates AI risk scoring and biometric confidence

### 🧪 Test 5: Security Features
- Tests idempotency (prevents double charging)
- Validates SSO redirect flow
- Tests consent management
- Verifies risk factor transparency

## Expected Output

Successful test run:
```
🚀 Identity Hub E2E Test Runner
=====================================

📋 Test Configuration:
   Backend URL: http://localhost:5000
   AI Service URL: http://localhost:5001
   Environment: test

⏳ Waiting for services to be ready...
✅ Backend service ready
✅ AI service ready
🎉 All services ready!

 PASS tests/e2e.test.js
   ✅ Backend health check
   ✅ AI service health check
   ✅ User enrollment with AI verification
   ✅ Biometric authentication
   ✅ Verifiable credential issuance
   ✅ Consent management
   ✅ Virtual card creation
   ✅ Low-risk transaction
   ✅ High-risk transaction trigger
   ✅ High-risk transaction with biometric override
   ✅ SSO flow simulation
   ✅ Risk factors API
   ✅ Idempotency protection

🎉 All E2E tests passed successfully!
✅ Identity Hub integration is working correctly!
```

## Troubleshooting

### Common Issues

**❌ "Services failed to become ready"**
- Ensure MongoDB is running on localhost:27017
- Check if AI service is running on port 5001
- Verify backend is running on port 5000

**❌ "AI service unavailable"**
- Start the AI service: `cd ai && python api.py`
- Check Python dependencies: `pip install -r requirements.txt`

**❌ "MongoDB connection failed"**
- Start MongoDB service
- Check connection string in .env file
- Verify MongoDB is accessible on localhost:27017

**❌ "Test timeout"**
- Increase test timeout in jest.config.js
- Check for hanging requests or slow AI processing
- Ensure all services are responsive

### Debug Mode

For detailed debugging:
```bash
DEBUG=* npm run test:e2e
```

### Individual Test Execution

Run specific test cases:
```bash
npx jest tests/e2e.test.js -t "User Enrollment"
```

## Integration Validation

The E2E tests validate that all hackathon requirements are working:

✅ **Trusted Digital Identity** - AI-verified enrollment and authentication  
✅ **Secure Biometric Authentication** - Face matching with liveness detection  
✅ **Federated SSO** - OAuth2-style redirect flow  
✅ **Portable eKYC** - Cross-institution credential verification  
✅ **Card-Linked Transactions** - Tokenized payments with risk analysis  
✅ **Fraud Resistance** - AI-enhanced risk engine with step-up authentication  
✅ **Financial Inclusion** - Consent management and data portability  

## Performance Metrics

The tests also validate:
- ⚡ Response times (< 2 seconds for most operations)
- 🔐 Security thresholds (risk scoring accuracy)
- 📊 System reliability (error handling and fallbacks)
- 🔄 Idempotency (no duplicate transactions)

## Next Steps

After successful E2E test completion:
1. 🚀 Deploy to staging environment
2. 🔧 Configure production databases
3. 📈 Set up monitoring and logging
4. 🔒 Enable production security features
5. 📊 Configure analytics and metrics
