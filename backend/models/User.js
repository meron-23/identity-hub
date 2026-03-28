const mongoose = require('mongoose');

/**
 * User Model
 * Stores enrolled users with their KYC-verified data and AI analysis.
 * userId is a UUID generated at enrollment time.
 * Enhanced for Challenge A compliance with comprehensive AI verification data.
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
    livenessScore: {
      type: Number,
      default: null,
    },
    documentAuthenticity: {
      type: Number,
      default: null,
    },
    riskScore: {
      type: Number,
      default: null,
    },
    aiAnalysis: {
      faceRecognition: { type: String, enum: ['PASS', 'FAIL'] },
      livenessDetection: { type: String, enum: ['PASS', 'FAIL'] },
      deepfakeDetection: { type: String, enum: ['PASS', 'FAIL'] },
      documentVerification: { type: String, enum: ['PASS', 'FAIL'] },
      riskFactors: [String]
    },
    idImage: {
      type: String, // base64 or reference — stored as-is from client
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
