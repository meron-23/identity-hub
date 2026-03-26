const mongoose = require('mongoose');

const ConsentSchema = new mongoose.Schema({
  user_did: { type: String, required: true },
  recipient: { type: String, required: true },
  data_shared: { type: [String], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Consent', ConsentSchema);
