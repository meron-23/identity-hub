# Identity Hub Integration Guide

## Complete System Flow

### 1. User Onboarding Flow
```
Frontend (/enroll) → Backend (/api/enroll) → AI Service (/ekyc/verify-document) → MongoDB
```

**Steps:**
1. User uploads ID document and selfie
2. Backend forwards to AI service for comprehensive eKYC
3. AI performs: OCR → Document Verification → Risk Scoring → Face Matching
4. User profile created with verified identity
5. Verifiable credential issued (JWT format)

### 2. Authentication & SSO Flow
```
Frontend (/) → Backend (/api/auth) → Face Verification → JWT → SSO Redirect
```

**Steps:**
1. User provides selfie for login
2. Backend verifies against stored biometric template
3. JWT token issued with user claims
4. SSO allows federated access to partner services
5. Consent management controls data sharing

### 3. Card Transaction Flow
```
Frontend (/payment) → Backend (/api/transaction) → Risk Engine → Biometric Step-up → Card Processing
```

**Steps:**
1. User initiates payment with card token
2. Risk engine evaluates transaction (amount, velocity, location)
3. High-risk transactions trigger biometric step-up
4. Successful verification processes payment
5. Transaction recorded with audit trail

### 4. Cross-Institution Identity Flow
```
Partner Service → SSO → Credential Verification → Consent Check → Data Access
```

**Steps:**
1. Partner redirects to Identity Hub SSO
2. User authenticates with biometrics
3. Verifiable credential presented to partner
4. Consent verification for requested data
5. Portable identity established across institutions

## Integration Requirements

### 1. Service Configuration
```bash
# Backend (.env)
AI_SERVICE_URL=http://localhost:5001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_secure_secret

# AI Service (ai/api.py)
app.run(host='0.0.0.0', port=5001)

# Frontend
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SSO_URL=http://localhost:5000/api/sso
```

### 2. Database Schema Integration
```javascript
// User Collection
{
  userId: String,
  name: String,
  dob: Date,
  verified: Boolean,
  faceEmbedding: Buffer,
  riskScore: Number,
  createdAt: Date,
  credentials: [String], // JWT credential IDs
  cards: [String], // Card token references
  consents: [{
    serviceName: String,
    grantedAt: Date,
    permissions: [String]
  }]
}

// Transaction Collection
{
  transactionId: String,
  userId: String,
  cardToken: String,
  amount: Number,
  riskScore: Number,
  biometricRequired: Boolean,
  status: String, // pending, completed, failed
  createdAt: Date
}
```

### 3. API Integration Points

#### AI Service Integration
```javascript
// backend/services/aiService.js
const axios = require('axios');

class AIService {
  async verifyDocument(imageBuffer, country = 'US') {
    try {
      const formData = new FormData();
      formData.append('image', imageBuffer);
      formData.append('country', country);
      
      const response = await axios.post(
        `${process.env.AI_SERVICE_URL}/ekyc/verify-document`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      return response.data;
    } catch (error) {
      // Fallback to mock response for demo
      return this.mockVerification();
    }
  }
}
```

#### Risk Engine Integration
```javascript
// backend/services/riskEngine.js
class RiskEngine {
  async evaluateTransaction(userId, amount, cardToken) {
    const user = await User.findById(userId);
    const transactions = await Transaction.find({ 
      userId, 
      createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } 
    });
    
    let riskScore = 0;
    
    // Velocity check
    if (transactions.length > 10) riskScore += 30;
    
    // Amount check
    if (amount > 1000) riskScore += 40;
    
    // User risk profile
    riskScore += user.riskScore || 0;
    
    return {
      riskScore,
      biometricRequired: riskScore > 50,
      recommendation: riskScore > 70 ? 'decline' : 'approve'
    };
  }
}
```

## Frontend Integration

### 1. Authentication Context
```javascript
// src/context/AuthContext.js
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  const login = async (selfie) => {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selfie })
    });
    
    const { token } = await response.json();
    setToken(token);
    localStorage.setItem('token', token);
  };
  
  return (
    <AuthContext.Provider value={{ user, token, login }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 2. Biometric Component
```javascript
// src/components/BiometricCapture.js
const BiometricCapture = ({ onCapture, required = false }) => {
  const [capturing, setCapturing] = useState(false);
  
  const captureFace = async () => {
    setCapturing(true);
    // WebRTC camera capture
    const image = await captureFromCamera();
    onCapture(image);
    setCapturing(false);
  };
  
  return (
    <div className="biometric-capture">
      <video ref={videoRef} autoPlay />
      <button 
        onClick={captureFace} 
        disabled={capturing}
        className={required ? 'required' : ''}
      >
        {capturing ? 'Processing...' : 'Capture Face'}
      </button>
    </div>
  );
};
```

## Deployment Integration

### 1. Development Environment
```bash
# Terminal 1: AI Service
cd ai && python api.py

# Terminal 2: Backend
cd backend && npm start

# Terminal 3: Frontend  
cd frontend && npm start

# Terminal 4: MongoDB
mongod
```

### 2. Production Considerations
- **AI Service**: Containerize with GPU support for face recognition
- **Backend**: Load balancing with Redis for session storage
- **Frontend**: CDN deployment with HTTPS enforcement
- **Database**: MongoDB Atlas with encryption at rest
- **Security**: API Gateway with rate limiting and DDoS protection

## Testing Integration

### 1. End-to-End Test Flow
```javascript
// tests/e2e/complete-flow.test.js
describe('Complete Identity Flow', () => {
  test('User enrollment → authentication → card transaction', async () => {
    // 1. Enroll user
    const enrollResponse = await request(app)
      .post('/api/enroll')
      .send({
        name: 'Test User',
        idImage: testIdImage,
        selfie: testSelfie
      });
    
    const { userId } = enrollResponse.body.user;
    
    // 2. Authenticate
    const authResponse = await request(app)
      .post('/api/auth')
      .send({ userId, selfie: testSelfie });
    
    const { token } = authResponse.body;
    
    // 3. Create virtual card
    const cardResponse = await request(app)
      .post('/api/virtual-card')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'virtual' });
    
    // 4. Process transaction
    const transactionResponse = await request(app)
      .post('/api/transaction')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cardToken: cardResponse.body.cardToken,
        amount: 100,
        merchant: 'Test Merchant'
      });
    
    expect(transactionResponse.status).toBe(200);
  });
});
```

## Monitoring & Analytics

### 1. Key Metrics
- **eKYC Success Rate**: Document verification pass rate
- **Authentication Speed**: Face recognition response time
- **Transaction Risk Score Distribution**: Risk engine effectiveness
- **SSO Adoption**: Partner service integrations
- **Consent Management**: User privacy preferences

### 2. Security Monitoring
- **Failed Authentication Attempts**: Detect brute force attacks
- **High-Risk Transactions**: Flag for manual review
- **Anomalous Behavior**: ML-based pattern detection
- **API Rate Limiting**: Prevent abuse and ensure availability

This integration guide provides the complete flow for connecting all modules into a cohesive financial infrastructure that meets the hackathon requirements.
