const mongoose = require('mongoose');

/**
 * User Model
 * Stores enrolled users with their KYC-verified data.
 * userId is a UUID generated at enrollment time.
 */
const UserSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: String, // returned by AI service as a string (e.g. "1990-01-15")
      default: null,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    faceMatchScore: {
      type: Number,
      default: null,
    },
    idImage: {
      type: String, // base64 or reference — stored as-is from client
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
