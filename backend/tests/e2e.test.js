/**
 * End-to-End Test Suite for Identity Hub
 * Tests the complete user journey from enrollment to transaction
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const AI_BASE_URL = process.env.AI_BASE_URL || 'http://localhost:5001';

// Test data
const testUserData = {
  name: 'E2E Test User',
  // Use a small test image (1x1 pixel transparent PNG)
  idImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  selfie: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
};

let authToken = '';
let userId = '';
let cardId = '';
let transactionId = '';

describe('Identity Hub E2E Test Suite', () => {
  
  beforeAll(async () => {
    console.log('🚀 Starting E2E Test Suite');
    console.log(`📡 Backend URL: ${BASE_URL}`);
    console.log(`🤖 AI Service URL: ${AI_BASE_URL}`);
    
    // Wait for services to be ready
    await waitForServices();
  });

  afterAll(() => {
    console.log('✅ E2E Test Suite Completed');
  });

  test('1. Health Check - Backend Service', async () => {
    console.log('🏥 Testing backend health...');
    
    const response = await axios.get(`${BASE_URL}/`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('ok');
    expect(response.data.message).toBe('Identity Hub API is running');
    
    console.log('✅ Backend service is healthy');
  });

  test('2. Health Check - AI Service', async () => {
    console.log('🤖 Testing AI service health...');
    
    const response = await axios.get(`${AI_BASE_URL}/health`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('healthy');
    expect(response.data.service).toBe('ekyc-orchestrator');
    
    console.log('✅ AI service is healthy');
  });

  test('3. User Enrollment with AI Verification', async () => {
    console.log('👤 Testing user enrollment...');
    
    const response = await axios.post(`${BASE_URL}/api/enroll`, testUserData);
    
    expect(response.status).toBe(201);
    expect(response.data.message).toBe('User enrolled successfully');
    expect(response.data.user).toBeDefined();
    expect(response.data.user.userId).toBeDefined();
    expect(response.data.user.name).toBe(testUserData.name);
    expect(response.data.user.verified).toBe(true);
    expect(response.data.user.faceMatchScore).toBeGreaterThan(0.75);
    
    userId = response.data.user.userId;
    console.log(`✅ User enrolled successfully with ID: ${userId}`);
  });

  test('4. Biometric Authentication', async () => {
    console.log('🔐 Testing biometric authentication...');
    
    const response = await axios.post(`${BASE_URL}/api/auth`, {
      userId: userId,
      selfie: testUserData.selfie
    });
    
    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Authentication successful');
    expect(response.data.token).toBeDefined();
    
    authToken = response.data.token;
    console.log('✅ Biometric authentication successful');
  });

  test('5. Verifiable Credential Issuance', async () => {
    console.log('📄 Testing verifiable credential issuance...');
    
    const response = await axios.get(`${BASE_URL}/api/credential/${userId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Verifiable credential issued');
    expect(response.data.credential).toBeDefined();
    
    // Verify JWT structure (simple check)
    const credentialParts = response.data.credential.split('.');
    expect(credentialParts).toHaveLength(3);
    
    console.log('✅ Verifiable credential issued successfully');
  });

  test('6. Consent Management', async () => {
    console.log('🤝 Testing consent management...');
    
    // Grant consent
    const grantResponse = await axios.post(`${BASE_URL}/api/consent`, {
      userId: userId,
      serviceName: 'E2E Test Service'
    });
    
    expect(grantResponse.status).toBe(201);
    expect(grantResponse.data.message).toBe('Consent recorded');
    
    // List consents
    const listResponse = await axios.get(`${BASE_URL}/api/consent/${userId}`);
    
    expect(listResponse.status).toBe(200);
    expect(listResponse.data.userId).toBe(userId);
    expect(listResponse.data.services).toContain('E2E Test Service');
    
    console.log('✅ Consent management working correctly');
  });

  test('7. Virtual Card Creation', async () => {
    console.log('💳 Testing virtual card creation...');
    
    const response = await axios.post(`${BASE_URL}/api/virtual-card`, {
      userId: userId,
      type: 'virtual'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(response.status).toBe(201);
    expect(response.data.message).toBe('Virtual card created successfully');
    expect(response.data.card).toBeDefined();
    expect(response.data.card.card_token).toBeDefined();
    expect(response.data.card.status).toBe('active');
    
    cardId = response.data.card._id;
    console.log(`✅ Virtual card created with ID: ${cardId}`);
  });

  test('8. Low-Risk Transaction (No Biometric Required)', async () => {
    console.log('💰 Testing low-risk transaction...');
    
    const response = await axios.post(`${BASE_URL}/api/transaction`, {
      user_did: userId,
      card_id: cardId,
      amount: 50, // Low amount - should not require biometric
      requireFace: false
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'x-idempotency-key': 'test-low-risk-123'
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.authResult.success).toBe(true);
    expect(response.data.authResult.riskScore).toBeLessThan(50);
    expect(response.data.aiAnalysis).toBeDefined();
    
    transactionId = response.data.transaction._id;
    console.log(`✅ Low-risk transaction completed with ID: ${transactionId}`);
  });

  test('9. High-Risk Transaction (Biometric Step-Up Required)', async () => {
    console.log('⚠️ Testing high-risk transaction trigger...');
    
    const response = await axios.post(`${BASE_URL}/api/transaction`, {
      user_did: userId,
      card_id: cardId,
      amount: 2000, // High amount - should require biometric
      requireFace: false
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'x-idempotency-key': 'test-high-risk-456'
      }
    });
    
    expect(response.status).toBe(401); // Unauthorized due to step-up required
    expect(response.data.stepUpRequired).toBe(true);
    expect(response.data.authResult.status).toBe('advanced_verification_required');
    expect(response.data.aiAnalysis.riskScore).toBeGreaterThan(50);
    
    console.log('✅ High-risk transaction correctly triggered step-up requirement');
  });

  test('10. High-Risk Transaction with Biometric Override', async () => {
    console.log('🔐 Testing high-risk transaction with biometric override...');
    
    const response = await axios.post(`${BASE_URL}/api/transaction`, {
      user_did: userId,
      card_id: cardId,
      amount: 2000, // High amount
      requireFace: true,
      biometricData: {
        selfie: testUserData.selfie
      }
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'x-idempotency-key': 'test-biometric-override-789'
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.authResult.success).toBe(true);
    expect(response.data.authResult.riskScore).toBeGreaterThan(50);
    expect(response.data.aiAnalysis.biometricConfidence).toBeDefined();
    expect(response.data.aiAnalysis.livenessScore).toBeDefined();
    
    console.log('✅ High-risk transaction completed with biometric override');
  });

  test('11. SSO Flow Simulation', async () => {
    console.log('🔗 Testing SSO flow...');
    
    const redirectUrl = 'http://localhost:3000/callback';
    
    // Initiate SSO
    const ssoResponse = await axios.get(`${BASE_URL}/api/sso?redirect_url=${encodeURIComponent(redirectUrl)}`, {
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      }
    });
    
    expect(ssoResponse.status).toBe(302); // Redirect
    expect(ssoResponse.headers.location).toContain(redirectUrl);
    expect(ssoResponse.headers.location).toContain('token=');
    
    console.log('✅ SSO flow working correctly');
  });

  test('12. Transaction Risk Factors API', async () => {
    console.log('📊 Testing risk factors transparency API...');
    
    const response = await axios.get(`${BASE_URL}/api/transaction/risk-factors`);
    
    expect(response.status).toBe(200);
    expect(response.data.riskFactors).toBeDefined();
    expect(response.data.thresholds).toBeDefined();
    expect(response.data.riskFactors).toContain('HIGH_AMOUNT_TRANSACTION');
    expect(response.data.riskFactors).toContain('BIOMETRIC_VERIFICATION');
    expect(response.data.thresholds.highAmount).toBe(5000);
    
    console.log('✅ Risk factors API providing transparency');
  });

  test('13. Idempotency Protection', async () => {
    console.log('🔒 Testing transaction idempotency...');
    
    const idempotencyKey = 'test-idempotency-' + Date.now();
    const transactionData = {
      user_did: userId,
      card_id: cardId,
      amount: 100,
      requireFace: false
    };
    
    // First request
    const firstResponse = await axios.post(`${BASE_URL}/api/transaction`, transactionData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey
      }
    });
    
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.data.success).toBe(true);
    
    // Second request with same key
    const secondResponse = await axios.post(`${BASE_URL}/api/transaction`, transactionData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey
      }
    });
    
    expect(secondResponse.status).toBe(409); // Conflict
    expect(secondResponse.data.error).toBe('Conflict Error');
    expect(secondResponse.data.message).toContain('already processed');
    
    console.log('✅ Idempotency protection working correctly');
  });
});

/**
 * Helper function to wait for services to be ready
 */
async function waitForServices() {
  console.log('⏳ Waiting for services to be ready...');
  
  let backendReady = false;
  let aiReady = false;
  let attempts = 0;
  const maxAttempts = 30;
  
  while ((!backendReady || !aiReady) && attempts < maxAttempts) {
    try {
      if (!backendReady) {
        await axios.get(`${BASE_URL}/`);
        backendReady = true;
        console.log('✅ Backend service ready');
      }
    } catch (error) {
      console.log(`⏳ Backend not ready (attempt ${attempts + 1}/${maxAttempts})`);
    }
    
    try {
      if (!aiReady) {
        await axios.get(`${AI_BASE_URL}/health`);
        aiReady = true;
        console.log('✅ AI service ready');
      }
    } catch (error) {
      console.log(`⏳ AI service not ready (attempt ${attempts + 1}/${maxAttempts})`);
    }
    
    if (!backendReady || !aiReady) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
  }
  
  if (!backendReady || !aiReady) {
    throw new Error('Services failed to become ready within timeout period');
  }
  
  console.log('🎉 All services ready!');
}

// Export for use in other test files
module.exports = {
  testUserData,
  BASE_URL,
  AI_BASE_URL
};
