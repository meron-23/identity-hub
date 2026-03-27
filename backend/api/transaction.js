const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Card = require('../models/Card');
const IdentityRiskEngine = require('../../card/simulation/paymentSimulator');

// Simple in-memory Idempotency Store (Use Redis in Prod)
const idempotencyStore = new Set();

/**
 * @route POST /api/transaction
 * @desc Processes payments securely via the Identity Risk Engine & Payment Simulator
 */
router.post('/', async (req, res) => {
  const { user_did, card_id, amount, requireFace } = req.body;
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

  // Input Validation
  if (!user_did || !card_id || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Validation Error', message: 'Missing or malformed transaction fields' });
  }

  // Idempotency Check (Prevents double charging)
  if (idempotencyKey) {
    if (idempotencyStore.has(idempotencyKey)) {
        return res.status(409).json({ error: 'Conflict Error', message: 'Transaction with this Idempotency-Key already processed' });
    }
    idempotencyStore.add(idempotencyKey);
  }

  try {
    // 1. Card Verification Phase
    const card = await Card.findById(card_id);
    if (!card) return res.status(404).json({ error: 'Not Found', message: 'Authorized Payment Method missing' });
    
    if (card.status !== 'active') {
        const failedTx = await new Transaction({ amount, risk_score: 100, status: 'failed', user_did }).save();
        return res.status(403).json({ error: 'Authorization Denied', message: 'Payment Method is Locked/Disabled', transaction: failedTx });
    }

    // 2. Risk Engine & Processing Phase
    const result = IdentityRiskEngine.processPayment(card.card_token, amount, requireFace, user_did);
    
    // 3. Ledger Recording
    const newTx = new Transaction({
      amount,
      risk_score: result.riskScore,
      status: result.status === 'completed' ? 'completed' : 'failed',
      user_did
    });
    await newTx.save();

    res.status(200).json({ 
        message: result.success ? 'Transaction Captured Successfully' : 'Transaction Declined by Risk Engine',
        transaction: newTx, 
        authResult: result 
    });

  } catch (err) {
    console.error('[Transaction API] Engine Failure:', err.message);
    res.status(500).json({ error: 'Internal Server Error', message: 'Transaction gateway offline' });
  }
});

module.exports = router;

