const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({
  card_token: { type: String, required: true, unique: true },
  user_did: { type: String, required: true },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Card', CardSchema);
