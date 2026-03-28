const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Card = require('../models/Card');
const IdentityRiskEngine = require('../../card/simulation/paymentSimulator');

// Simple in-memory Idempotency Store (Use Redis in Prod)
const idempotencyStore = new Set();

/**
 * @route POST /api/transaction
 * @desc Processes payments securely via the AI-Enhanced Identity Risk Engine & Payment Simulator
 */
router.post('/', async (req, res) => {
  const { user_did, card_id, amount, requireFace, biometricData } = req.body;
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

  // Input Validation
  if (!user_did || !card_id || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ 
      error: 'Validation Error', 
      message: 'Missing or malformed transaction fields' 
    });
  }

  // Idempotency Check (Prevents double charging)
  if (idempotencyKey) {
    if (idempotencyStore.has(idempotencyKey)) {
        return res.status(409).json({ 
          error: 'Conflict Error', 
          message: 'Transaction with this Idempotency-Key already processed' 
        });
    }
    idempotencyStore.add(idempotencyKey);
  }

  try {
    // 1. Card Verification Phase
    const card = await Card.findById(card_id);
    if (!card) return res.status(404).json({ 
      error: 'Not Found', 
      message: 'Authorized Payment Method missing' 
    });
    
    if (card.status !== 'active') {
        const failedTx = await new Transaction({ 
          amount, 
          risk_score: 100, 
          status: 'failed', 
          user_did,
          risk_factors: ['CARD_INACTIVE']
        }).save();
        return res.status(403).json({ 
          error: 'Authorization Denied', 
          message: 'Payment Method is Locked/Disabled', 
          transaction: failedTx 
        });
    }

    // 2. AI-Enhanced Risk Engine & Processing Phase
    const result = await IdentityRiskEngine.processPayment(
      card.card_token, 
      amount, 
      requireFace, 
      user_did, 
      biometricData
    );
    
    // 3. Enhanced Ledger Recording with AI insights
    const newTx = new Transaction({
      amount,
      risk_score: result.riskScore,
      status: result.status === 'completed' ? 'completed' : 'failed',
      user_did,
      risk_factors: result.riskFactors || [],
      biometric_analysis: result.biometricAnalysis,
      recommendation: result.recommendation,
      ai_enhanced: true
    });
    await newTx.save();

    // 4. Response with detailed AI analysis
    const response = {
      message: result.success ? 'Transaction Captured Successfully' : 'Transaction Declined by AI Risk Engine',
      transaction: newTx, 
      authResult: result,
      aiAnalysis: {
        riskScore: result.riskScore,
        riskFactors: result.riskFactors || [],
        recommendation: result.recommendation,
        biometricConfidence: result.biometricAnalysis?.biometricConfidence,
        livenessScore: result.biometricAnalysis?.livenessScore
      }
    };

    if (result.status === 'advanced_verification_required') {
      response.stepUpRequired = true;
      response.message = 'Biometric step-up authentication required for this transaction';
    }

    res.status(result.success ? 200 : 401).json(response);

  } catch (err) {
    console.error('[Transaction API] AI Risk Engine Failure:', err.message);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'AI-enhanced transaction gateway offline' 
    });
  }
});

/**
 * @route GET /api/transaction/risk-factors
 * @desc Returns available risk factors for transparency
 */
router.get('/risk-factors', (req, res) => {
  res.json({
    riskFactors: [
      'HIGH_AMOUNT_TRANSACTION',
      'ELEVATED_AMOUNT_TRANSACTION', 
      'MODERATE_AMOUNT_TRANSACTION',
      'HIGH_VELOCITY_PATTERN',
      'GEOGRAPHICAL_ANOMALY',
      'BIOMETRIC_ANOMALY',
      'DOCUMENT_TAMPERING',
      'UNUSUAL_TIME_TRANSACTION',
      'BIOMETRIC_OVERRIDE',
      'BIOMETRIC_VERIFICATION'
    ],
    thresholds: {
      highAmount: 5000,
      elevatedAmount: 1000,
      moderateAmount: 500,
      stepUpThreshold: 50,
      declineThreshold: 85
    }
  });
});

module.exports = router;

