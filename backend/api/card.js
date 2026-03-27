const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const TokenizationEngine = require('../../card/tokenization/tokenGenerator');

/**
 * @route GET /api/card/:did
 * @desc Retrieves all card tokens linked to a user's Decentralized Identifier (DID)
 */
router.get('/:did', async (req, res) => {
  try {
    const { did } = req.params;
    if (!did) return res.status(400).json({ error: 'Validation Error', message: 'DID is required' });

    const cards = await Card.find({ user_did: did }).select('-__v').lean();
    res.json(cards);
  } catch (err) {
    console.error(`[Card API] Fetch Error for DID ${req.params.did}:`, err.message);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve card data' });
  }
});

/**
 * @route POST /api/card/link-card
 * @desc Tokenizes and links a new payment method safely to a DID.
 */
router.post('/link-card', async (req, res) => {
  const { user_did, cardNumber } = req.body;
  if (!user_did || !cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
    return res.status(400).json({ error: 'Validation Error', message: 'Invalid DID or Card Number format' });
  }
  
  try {
    // 1. Generate secure vault token
    const card_token = TokenizationEngine.generateToken(cardNumber);
    
    // 2. Persist stateless token mapping to MongoDB
    const newCard = new Card({ user_did, card_token });
    await newCard.save();
    
    res.status(201).json({
      message: 'Card linked successfully via Secure Token Vault',
      card: {
         _id: newCard._id,
        user_did: newCard.user_did,
        card_token: newCard.card_token,
        status: newCard.status,
        createdAt: newCard.createdAt
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Conflict Object', message: 'This card token already exists' });
    }
    console.error('[Card API] Link Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to provision card token' });
  }
});

/**
 * @route PATCH /api/card/:id/disable
 * @desc Instantly toggles a card's authorization status.
 */
router.patch('/:id/disable', async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Not Found', message: 'Card reference does not exist' });
    
    card.status = card.status === 'active' ? 'disabled' : 'active';
    await card.save();
    
    console.log(`[Card API] Card ${card._id} status transitioned to: ${card.status}`);
    
    res.json({
        message: 'Card status updated successfully',
        card: { _id: card._id, status: card.status }
    });
  } catch (err) {
    console.error(`[Card API] Toggle Error for ID ${req.params.id}:`, err.message);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to toggle card status' });
  }
});

module.exports = router;

