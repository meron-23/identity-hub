const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const TokenizationEngine = require('../../card/tokenization/tokenGenerator');

/**
 * @route POST /api/virtual-card
 * @desc Generates a secure virtual PAN and directly tokenizes it into the user's wallet.
 */
router.post('/', async (req, res) => {
  const { user_did } = req.body;
  
  if (!user_did || typeof user_did !== 'string') {
    return res.status(400).json({ error: 'Validation Error', message: 'A valid DID is required for provisioning' });
  }

  try {
    // 1. Generate raw Virtual PAN
    const virtualNumber = TokenizationEngine.generateVirtualCardNumber();
    
    // 2. Wrap it directly into the AES-256-GCM architecture
    const card_token = TokenizationEngine.generateToken(virtualNumber);
    
    // 3. Persist association
    const newCard = new Card({ user_did, card_token, status: 'active' });
    await newCard.save();
    
    res.status(201).json({ 
        message: 'Virtual Card Provisioned Successfully',
        card: {
            _id: newCard._id,
            user_did: newCard.user_did,
            card_token: newCard.card_token,
            status: newCard.status
        }, 
        virtualNumber // Transmitted once to client, never stored raw
    });
  } catch (err) {
    console.error('[VirtualCard API] Provisioning Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', message: 'Virtual issuance infrastructure failure' });
  }
});

module.exports = router;

