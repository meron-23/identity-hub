const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  did: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  face_embedding: { type: [Number], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
